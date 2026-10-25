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
