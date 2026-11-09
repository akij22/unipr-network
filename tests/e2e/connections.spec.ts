import { expect, test, type Locator, type Page } from "@playwright/test";
import { addDevice, menuAction, selectDevice } from "../helpers/ui";

/** A cable dot on a device: the single visible connect handle. */
function cableDot(page: Page, deviceName: string): Locator {
  return page
    .locator(`.react-flow__node[aria-label="${deviceName}"]`)
    .locator(".react-flow__handle");
}

async function dotCenter(dot: Locator) {
  const box = await dot.boundingBox();
  if (!box) throw new Error("Cable dot has no bounds");
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

/** Drags from one cable dot to another; touch is distributed through CDP so
 * the gesture is identical to the one a Pixel emulation finger produces. */
async function dragDot(
  page: Page,
  touch: boolean,
  from: Locator,
  to: Locator,
) {
  await showDots(page, [from, to]);
  const start = await dotCenter(from);
  const end = await dotCenter(to);
  await dragPoints(page, touch, start, end);
}

async function dragPoints(page: Page, touch: boolean,
  start: { x: number; y: number }, end: { x: number; y: number }) {
  if (touch) {
    const session = await page.context().newCDPSession(page);
    await session.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [start],
    });
    for (let i = 1; i <= 12; i++) {
      await session.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [
          {
            x: start.x + ((end.x - start.x) * i) / 12,
            y: start.y + ((end.y - start.y) * i) / 12,
          },
        ],
      });
    }
    await session.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await session.detach();
  } else {
    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    await page.mouse.move(end.x, end.y, { steps: 12 });
    await page.mouse.up();
  }
}

/** Zoom the canvas through its normal wheel gesture when added nodes are
 * beyond the narrow viewport; DOM visibility alone includes offscreen nodes. */
async function showDots(page: Page, dots: Locator[]) {
  for (let attempt = 0; attempt < 8; attempt++) {
    const points = await Promise.all(dots.map(dotCenter));
    const visible = await page.evaluate((points) => points.every(({x, y}) =>
      document.elementFromPoint(x, y)?.closest('.flow-cable-dot')), points);
    if (visible) return;
    const box = (await page.locator('.react-flow__pane').boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.wheel(0, 350);
    // React Flow smooths wheel zoom over 150 ms; let the gesture settle.
    await page.waitForTimeout(200);
  }
  throw new Error('Cable dots are not reachable in the canvas viewport');
}

const firstCard = (page: Page, deviceHeading: string) =>
  page
    .locator(".inspector")
    .filter({ has: page.getByRole("heading", { name: deviceHeading }) })
    .locator(".interface.port-card")
    .first();

test("dragging a cable dot draws a persisted link shown on both inspectors", async ({
  page,
  isMobile,
}, testInfo) => {
  await page.goto("/");
  await addDevice(page, "host");
  await addDevice(page, "switch");
  await expect(
    page.locator(`.react-flow__node[aria-label="Host 1"]`),
  ).toBeVisible();
  const host = cableDot(page, "Host 1");
  const target = cableDot(page, "Switch 1");
  await expect(host).toBeVisible();
  await dragDot(page, isMobile, host, target);
  await expect(page.locator(".react-flow__edge")).toHaveCount(1);
  const attachment = await page.locator('.flow-edge').evaluate(el => {
    const path = el as SVGPathElement;
    const start = path.getPointAtLength(0).matrixTransform(path.getScreenCTM()!);
    const connector = document.querySelector<HTMLElement>('[data-device-node="host-1"] .flow-cable-dot')!;
    const handle = connector.getBoundingClientRect();
    const radius = parseFloat(getComputedStyle(connector, "::after").width) / 2 * handle.width / connector.offsetWidth;
    return { distance: Math.hypot(start.x - handle.x - handle.width / 2, start.y - handle.y - handle.height / 2), radius };
  });
  expect(attachment.distance).toBeLessThanOrEqual(attachment.radius + 3);
  await expect(page.getByRole('button', { name: 'Toggle device dock', exact: true })).toBeEnabled();
  await page.screenshot({ path: `.hallmark/connections-${testInfo.project.name}.png` });
  await selectDevice(page, "Host 1");
  await expect(
    firstCard(page, "Host 1").locator(".port-status[data-connected='true']"),
  ).toBeVisible();
  await selectDevice(page, "Switch 1");
  await expect(
    firstCard(page, "Switch 1").locator(".port-status[data-connected='true']"),
  ).toBeVisible();
});

test("a second host lands on the next free switch port", async ({ page, isMobile }) => {
  await page.goto("/");
  await addDevice(page, "host");
  await addDevice(page, "switch");
  await addDevice(page, "host");
  await dragDot(page, isMobile, cableDot(page, "Host 1"), cableDot(page, "Switch 1"));
  await dragDot(page, isMobile, cableDot(page, "Host 2"), cableDot(page, "Switch 1"));
  await expect(page.locator(".react-flow__edge")).toHaveCount(2);
  await selectDevice(page, "Switch 1");
  const connected = page
    .locator(".inspector")
    .filter({ has: page.getByRole("heading", { name: "Switch 1" }) })
    .locator(".port-card:has(.port-status[data-connected='true']) .port-label");
  const labels = await connected.allTextContents();
  expect(labels).toHaveLength(2);
  expect(new Set(labels).size).toBe(2);
});

test("tapping dots connects in the reverse direction", async ({ page, isMobile }) => {
  await page.goto("/");
  await addDevice(page, "host");
  await addDevice(page, "switch");
  await showDots(page, [cableDot(page, "Switch 1"), cableDot(page, "Host 1")]);
  // Start from the switch (would be the "target" in a host-to-switch drag).
  if (isMobile) {
    await cableDot(page, "Switch 1").tap();
    await cableDot(page, "Host 1").tap();
  } else {
    await cableDot(page, "Switch 1").click();
    await cableDot(page, "Host 1").click();
  }
  await expect(page.locator("[data-device-node][data-selected=true]")).toHaveCount(0);
  await expect(page.locator(".react-flow__edge")).toHaveCount(1);
});

test("an unsuccessful drop changes nothing", async ({ page, isMobile }) => {
  await page.goto("/");
  await addDevice(page, "host");
  await addDevice(page, "switch");
  const host = cableDot(page, "Host 1");
  await showDots(page, [host]);
  await dragPoints(page, isMobile, await dotCenter(host), { x: 60, y: 300 });
  await expect(page.locator(".react-flow__edge")).toHaveCount(0);
  await expect(page.locator(".react-flow__handle")).toHaveCount(2);
  // The dot never started a device drag or a selection on its own.
  await expect(
    page.locator(`[data-device-node="host-1"][data-selected='true']`),
  ).toHaveCount(0);
});

test("a full endpoint reports a friendly issue and adds no cable", async ({
  page, isMobile,
}) => {
  await page.goto("/");
  await addDevice(page, "host");
  await addDevice(page, "switch");
  await addDevice(page, "switch");
  await dragDot(page, isMobile, cableDot(page, "Host 1"), cableDot(page, "Switch 1"));
  await expect(page.locator(".react-flow__edge")).toHaveCount(1);
  await dragDot(page, isMobile, cableDot(page, "Host 1"), cableDot(page, "Switch 2"));
  // The host's only port is taken: the controller reports a friendly issue.
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(page.locator(".react-flow__edge")).toHaveCount(1);
});

test("the manual menu alternative still connects two explicit ports", async ({
  page,
  isMobile,
}) => {
  await page.goto("/");
  await addDevice(page, "host");
  await addDevice(page, "switch");
  await selectDevice(page, "Host 1");
  await menuAction(page, "Connect ports");
  await firstCard(page, "Host 1")
    .getByRole("button", { name: /Choose / })
    .click();
  await selectDevice(page, "Switch 1");
  await firstCard(page, "Switch 1")
    .getByRole("button", { name: /Choose / })
    .click();
  await expect(page.locator(".react-flow__edge")).toHaveCount(1);
});

test("keyboard connector activation creates a cable without selecting a device", async ({ page }) => {
  await page.goto('/');
  await addDevice(page, 'host');
  await addDevice(page, 'switch');
  const host = cableDot(page, 'Host 1');
  const target = cableDot(page, 'Switch 1');
  await showDots(page, [host, target]);
  await host.focus();
  await host.press('Enter');
  await target.focus();
  await target.press('Space');
  await expect(page.locator('.react-flow__edge')).toHaveCount(1);
  await expect(page.locator('[data-device-node][data-selected=true]')).toHaveCount(0);
});

test("connector dots are visible in the accent color without hover", async ({ page }) => {
  await page.goto('/');
  await addDevice(page, 'host');
  const fill = await cableDot(page, 'Host 1').evaluate(el => getComputedStyle(el, '::after').backgroundColor);
  expect(fill).toBe('rgb(250, 125, 0)');
});

test("the expanded touch target around a dot can start a cable", async ({ page, isMobile }) => {
  await page.goto('/');
  await addDevice(page, 'host');
  await addDevice(page, 'switch');
  const host = cableDot(page, 'Host 1');
  const target = cableDot(page, 'Switch 1');
  await showDots(page, [host, target]);
  const start = await dotCenter(host);
  const scale = await host.evaluate(el => el.getBoundingClientRect().width / (el as HTMLElement).offsetWidth);
  start.x += 16 * scale;
  await dragPoints(page, isMobile, start, await dotCenter(target));
  await expect(page.locator('.react-flow__edge')).toHaveCount(1);
});
