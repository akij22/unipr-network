import { expect, test } from "@playwright/test";
test("renders a real 3D scene and exposes camera and device selection", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Add device", exact: true }).click();
  await page.getByRole("button", { name: "Add host", exact: true }).click();
  await expect(page.locator('[data-scene-ready="true"] canvas')).toBeVisible();
  await page.getByRole("button", { name: "Orbit left", exact: true }).click();
  await page.getByRole("button", { name: "Reset view", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Host 1", exact: true }),
  ).toBeVisible();
});

test("positions a device on the grid and keeps simulation history", async ({ page, isMobile }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Add device", exact: true }).click();
  await page.getByRole("button", { name: "Add host", exact: true }).click();
  await expect(page.locator('[data-scene-ready="true"]')).toBeVisible();
  await page.getByLabel("IPv4 address", { exact: true }).fill("10.0.0.1");
  await page.getByRole("button", { name: "Apply settings", exact: true }).click();
  await page.locator(".ping-composer summary").click();
  await page.getByLabel("Destination IPv4", { exact: true }).fill("10.0.0.2");
  await page.getByRole("button", { name: "Start ping", exact: true }).click();
  await expect(page.locator(".ping-composer")).not.toHaveAttribute("open");
  await page.getByRole("button", { name: "Next step", exact: true }).click();
  const label = page.locator(".scene-label").filter({ hasText: "Host 1" });
  const before = await label.boundingBox();
  await page.getByRole("button", { name: "Position device", exact: true }).click();
  const canvas = page.locator("canvas");
  const box = await canvas.boundingBox();
  const position = { x: box!.width * 0.55, y: box!.height * 0.7 };
  if (isMobile) await canvas.tap({ position });
  else await canvas.click({ position });
  await expect(page.locator("[data-placement-active]")).toHaveAttribute("data-placement-active", "false");
  await expect.poll(async () => {
    const after = await label.boundingBox();
    return Math.abs(after!.x - before!.x) + Math.abs(after!.y - before!.y);
  }).toBeGreaterThan(20);
  await expect(page.getByRole("slider", { name: "Known events" })).toHaveValue("1");
  await expect(page.getByRole("button", { name: "Position device", exact: true })).toBeFocused();

  await page.getByRole("button", { name: "Position device", exact: true }).click();
  const placed = await label.boundingBox();
  await page.getByRole("button", { name: "Right", exact: true }).focus();
  await page.keyboard.press("Enter");
  await expect.poll(async () => (await label.boundingBox())!.x).not.toBe(placed!.x);
  await page.keyboard.press("Escape");
  await expect(page.locator("[data-placement-active]")).toHaveAttribute("data-placement-active", "false");
  await expect(page.getByRole("slider", { name: "Known events" })).toHaveValue("1");
});

test("dismisses the device catalog with Escape and returns focus", async ({ page }) => {
  await page.goto("/");
  const add = page.getByRole("button", { name: "Add device", exact: true });
  await add.click();
  await expect(page.getByRole("button", { name: "Add host", exact: true })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("region", { name: "Device catalog" })).not.toBeVisible();
  await expect(add).toBeFocused();
});
