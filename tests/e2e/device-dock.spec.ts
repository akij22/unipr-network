import { expect, test } from "@playwright/test";
import { addDevice, selectDevice } from "../helpers/ui";

const kinds = [
  { kind: "host", name: "Host 1" },
  { kind: "router", name: "Router 1" },
  { kind: "switch", name: "Switch 1" },
  { kind: "bridge", name: "Bridge 1" },
  { kind: "hub", name: "Hub 1" },
];

test("expands the device dock from the plus trigger and adds each device", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator('[data-scene-ready="true"]')).toBeVisible();
  const toggle = page.getByRole("button", { name: "Toggle device dock", exact: true });
  const region = page.getByRole("region", { name: "Device catalog", exact: true });
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await expect(toggle).toHaveAttribute("aria-controls", "device-dock-choices");
  await expect(region).not.toBeVisible();
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await expect(region).toBeVisible();
  await expect(page.getByRole("button", { name: "Add host", exact: true })).toBeFocused();
  await expect.poll(async () => (await page.locator(".device-dock-choices").boundingBox())!.width).toBeGreaterThanOrEqual(228);

  const boxes = await Promise.all(kinds.map(({ kind }) =>
    page.getByRole("button", { name: `Add ${kind}`, exact: true }).boundingBox()));
  const tops = new Set(boxes.map((box) => Math.round(box!.y)));
  expect(tops.size).toBe(1);
  for (let i = 1; i < boxes.length; i++) expect(boxes[i]!.x).toBeGreaterThan(boxes[i - 1]!.x);
  for (const box of boxes) {
    expect(box!.width).toBeGreaterThanOrEqual(44);
    expect(box!.height).toBeGreaterThanOrEqual(44);
  }

  await toggle.click();
  await expect(region).not.toBeVisible();

  for (const { kind, name } of kinds) {
    await toggle.click();
    await page.getByRole("button", { name: `Add ${kind}`, exact: true }).click();
    await expect(region).not.toBeVisible();
    await expect(page.getByRole("button", { name: "Close inspector", exact: true })).toBeHidden();
    await expect(page.locator(`.react-flow__node[aria-label="${name}"]`)).toBeAttached();
  }
});

test("collapses the dock with Escape and returns focus to the trigger", async ({ page }) => {
  await page.goto("/");
  const toggle = page.getByRole("button", { name: "Toggle device dock", exact: true });
  await toggle.click();
  await expect(page.getByRole("button", { name: "Add host", exact: true })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await expect(page.getByRole("region", { name: "Device catalog", exact: true })).not.toBeVisible();
  await expect(toggle).toBeFocused();
  await expect(page.getByRole("button", { name: "Add host", exact: true })).toBeHidden();
});

test("fits the dock and its five device targets on a 320px screen", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await page.goto("/");
  const toggle = page.getByRole("button", { name: "Toggle device dock", exact: true });
  await toggle.click();
  await expect(page.getByRole("region", { name: "Device catalog", exact: true })).toBeVisible();
  await expect(page.locator(".device-dock-caption")).toBeVisible();
  await expect.poll(async () => (await page.locator(".device-dock-choices").boundingBox())!.width).toBeGreaterThanOrEqual(228);
  const targets = [toggle, ...kinds.map(({ kind }) => page.getByRole("button", { name: `Add ${kind}`, exact: true }))];
  for (const target of targets) {
    const box = await target.boundingBox();
    expect(box!.width).toBeGreaterThanOrEqual(44);
    expect(box!.height).toBeGreaterThanOrEqual(44);
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(320);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("centres the dock on the bottom edge and keeps the top bar free of it", async ({ page }) => {
  for (const [width, height] of [[1440, 900], [844, 390], [390, 844], [320, 568]]) {
    await page.setViewportSize({ width, height });
    await page.goto("/");
    await expect(page.locator('[data-scene-ready="true"]')).toBeVisible();
    const toggle = page.getByRole("button", { name: "Toggle device dock", exact: true });
    const pill = page.locator(".device-dock-pill");
    const centre = async () => {
      const box = await pill.boundingBox();
      return box!.x + box!.width / 2;
    };
    expect(Math.abs(await centre() - width / 2)).toBeLessThanOrEqual(1);
    await toggle.click();
    await expect(page.getByRole("region", { name: "Device catalog", exact: true })).toBeVisible();
    expect(Math.abs(await centre() - width / 2)).toBeLessThanOrEqual(1);
    const dock = await pill.boundingBox();
    expect(dock!.y + dock!.height).toBeLessThanOrEqual(height);
    expect(dock!.y).toBeGreaterThan(height / 2);
    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
  }
  await expect(page.locator(".statusbar")).toHaveCount(0);
  const topbar = await page.locator(".topbar").boundingBox();
  expect(topbar!.y).toBe(0);
  // Topology editing shows no playback row: it belongs to started operations.
  await expect(page.locator('[data-simulation-visible="false"]')).toBeAttached();
  await expect(page.getByRole("navigation", { name: "Simulation controls", exact: true })).toHaveCount(0);
});

test("skips dock motion when reduced motion is requested", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const toggle = page.getByRole("button", { name: "Toggle device dock", exact: true });
  await toggle.click();
  const region = page.getByRole("region", { name: "Device catalog", exact: true });
  await expect(region).toBeVisible();
  expect(await region.evaluate((el) => getComputedStyle(el).transitionDuration)).toBe("0s");
});


test("opens the inspector only after explicit canvas selection", async ({ page, isMobile }) => {
  await page.goto("/");
  const close = page.getByRole("button", { name: "Close inspector", exact: true });
  const toggle = page.getByRole("button", { name: "Toggle device dock", exact: true });
  await toggle.click();
  await page.getByRole("button", { name: "Add host", exact: true }).click();
  await expect(toggle).toBeEnabled();
  await expect(close).toBeHidden();
  const node = page.getByRole("group", { name: "Host 1", exact: true });
  if (isMobile) await node.tap();
  else await node.click();
  await expect(page.getByRole("heading", { name: "Host 1", exact: true })).toBeVisible();

  // Topology insertion also clears a previously opened device inspector.
  await addDevice(page, "switch");
  await expect(close).toBeHidden();
  await expect(page.locator("[data-device-node]")).toHaveCount(2);
  await selectDevice(page, "Host 1");
  await close.click();
  await expect(close).toBeHidden();

  await toggle.click();
  await page.getByRole("button", { name: "Add router", exact: true }).click();
  await expect(toggle).toBeEnabled();
  await expect(close).toBeHidden();
  await expect(page.locator("[data-device-node]")).toHaveCount(3);
  // Enter is the keyboard alternative to clicking or tapping a device.
  await selectDevice(page, "Router 1");
  await expect(page.getByRole("heading", { name: "Router 1", exact: true })).toBeVisible();
});
