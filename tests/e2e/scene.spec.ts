import { expect, test, type Page } from "@playwright/test";
import { menuAction, openComposer } from "../helpers/ui";

/** A point on the canvas that no overlay panel covers. The placement guide
 * and the device strip float over the canvas, so a fixed coordinate would
 * depend on which panels are open. */
async function freeCanvasPoint(page: Page, ratio = { x: 0.62, y: 0.66 }) {
  const box = await page.locator(".react-flow__pane").boundingBox();
  if (!box) throw new Error("Canvas pane has no bounds");
  const point = await page.evaluate(
    ({ box, ratio }) => {
      for (let step = 0; step < 40; step++) {
        const x = Math.round(box.x + box.width * (ratio.x + step * 0.03));
        const y = Math.round(box.y + box.height * (ratio.y - step * 0.02));
        const el = document.elementFromPoint(x, y);
        if (el?.classList?.contains("react-flow__pane")) return { x, y };
      }
      return null;
    },
    { box, ratio },
  );
  if (!point) throw new Error("No unobstructed canvas point was found");
  return point;
}

test("renders a real topology canvas and exposes view and device selection", async ({
  page,
}) => {
  await page.goto("/");
  await menuAction(page, "Add device");
  await page.getByRole("button", { name: "Add host", exact: true }).click();
  await expect(page.locator('[data-scene-ready="true"]')).toBeVisible();
  await expect(page.locator(".react-flow__pane")).toBeVisible();
  // The canvas is SVG, not a WebGL surface.
  await expect(page.locator("canvas")).toHaveCount(0);
  await page.getByRole("button", { name: "Zoom in", exact: true }).click();
  await page.getByRole("button", { name: "Fit view", exact: true }).click();
  await expect(page.locator("[data-device-node]")).toHaveCount(1);
  await expect(
    page.getByRole("heading", { name: "Host 1", exact: true }),
  ).toBeVisible();
});

test("drags a device to a new position and keeps simulation history", async ({
  page, isMobile,
}) => {
  await page.goto("/");
  await menuAction(page, "Add device");
  await page.getByRole("button", { name: "Add host", exact: true }).click();
  await expect(page.locator('[data-scene-ready="true"]')).toBeVisible();
  await page.getByLabel("IPv4 address", { exact: true }).fill("10.0.0.1");
  await page.getByRole("button", { name: "Apply settings", exact: true }).click();
  await openComposer(page);
  await page.getByLabel("Destination IPv4", { exact: true }).fill("10.0.0.2");
  await page.getByRole("button", { name: "Start ping", exact: true }).click();
  await page.getByRole("button", { name: "Next step", exact: true }).click();
  await page.getByRole("button", { name: "Close inspector", exact: true }).click();
  const node = page.locator("[data-device-node]");
  const before = await node.boundingBox();
  // Drag the device itself across the canvas. The device snaps to the layout
  // grid, so the gesture has to cross a grid cell for the move to register.
  await dragCanvas(page, isMobile,
    { x: before!.x + before!.width / 2, y: before!.y + before!.height / 2 },
    { x: before!.x + before!.width / 2 - 90, y: before!.y + before!.height / 2 + 70 });
  await expect
    .poll(async () => {
      const after = await node.boundingBox();
      return Math.abs(after!.x - before!.x) + Math.abs(after!.y - before!.y);
    })
    .toBeGreaterThan(8);
  // The drag moved the device without resetting the simulation history.
  await expect(page.getByRole("slider", { name: "Known events" })).toHaveValue("1");
});

test("moves a selected device with the keyboard and preserves history", async ({
  page,
}) => {
  await page.goto("/");
  await menuAction(page, "Add device");
  await page.getByRole("button", { name: "Add host", exact: true }).click();
  await expect(page.locator('[data-scene-ready="true"]')).toBeVisible();
  const node = page.locator("[data-device-node]");
  const before = await node.boundingBox();
  await page.getByRole("button", { name: "Position device", exact: true }).click();
  await expect(page.locator("[data-placement-active]")).toHaveAttribute(
    "data-placement-active",
    "true",
  );
  await page.getByRole("button", { name: "Right", exact: true }).focus();
  await page.keyboard.press("Enter");
  await expect.poll(async () => (await node.boundingBox())!.x).not.toBe(before!.x);
  await page.keyboard.press("Escape");
  await expect(page.locator("[data-placement-active]")).toHaveAttribute(
    "data-placement-active",
    "false",
  );
  await expect(page.getByRole("slider", { name: "Known events" })).toHaveValue("0");
});

test("places a device by tapping the canvas while positioning", async ({
  page,
  isMobile,
}) => {
  await page.goto("/");
  await menuAction(page, "Add device");
  await page.getByRole("button", { name: "Add host", exact: true }).click();
  await expect(page.locator('[data-scene-ready="true"]')).toBeVisible();
  const node = page.locator("[data-device-node]");
  const before = await node.boundingBox();
  await page.getByRole("button", { name: "Position device", exact: true }).click();
  const point = await freeCanvasPoint(page);
  if (isMobile) await page.touchscreen.tap(point.x, point.y);
  else await page.mouse.click(point.x, point.y);
  await expect(page.locator("[data-placement-active]")).toHaveAttribute(
    "data-placement-active",
    "false",
  );
  await expect.poll(async () => {
    const after = await node.boundingBox();
    return Math.abs(after!.x - before!.x) + Math.abs(after!.y - before!.y);
  }).toBeGreaterThan(20);
});

test("dismisses the device catalog with Escape and returns focus", async ({ page, isMobile }) => {
  await page.goto("/");
  const add = page.getByRole("button", { name: "Add device", exact: true });
  await menuAction(page, "Add device");
  await expect(page.getByRole("button", { name: "Add host", exact: true })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("region", { name: "Device catalog" })).not.toBeVisible();
  await expect(isMobile ? page.getByRole("button", { name: "Toggle network menu" }) : add).toBeFocused();
});

async function dragCanvas(page: Page, touch: boolean, from: { x: number; y: number }, to: { x: number; y: number }) {
  if (touch) {
    const session = await page.context().newCDPSession(page);
    await session.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [from] });
    for (let i = 1; i <= 12; i++) {
      await session.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{
        x: from.x + (to.x - from.x) * i / 12,
        y: from.y + (to.y - from.y) * i / 12,
      }] });
    }
    await session.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await session.detach();
  } else {
    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    await page.mouse.move(to.x, to.y, { steps: 12 });
    await page.mouse.up();
  }
}

test("pans blank space without moving devices", async ({ page, isMobile }) => {
  await page.goto("/");
  await menuAction(page, "Add device");
  await page.getByRole("button", { name: "Add host", exact: true }).click();
  await page.getByRole("button", { name: "Close inspector", exact: true }).click();
  await expect(page.locator(".react-flow__node")).toBeVisible();
  const nodePosition = await page.locator(".react-flow__node").getAttribute("style");
  const viewport = await page.locator(".react-flow__viewport").getAttribute("style");
  const start = await freeCanvasPoint(page, { x: 0.65, y: 0.4 });
  await dragCanvas(page, isMobile, start, { x: start.x - 70, y: start.y + 60 });
  await expect(page.locator(".react-flow__viewport")).not.toHaveAttribute("style", viewport!);
  await expect(page.locator(".react-flow__node")).toHaveAttribute("style", nodePosition!);
});
