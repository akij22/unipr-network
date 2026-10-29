import { expect, test, type Page } from "@playwright/test";

async function openMenu(page: Page) {
  const toggle = page.getByRole("button", { name: "Toggle network menu" });
  if (await toggle.getAttribute("aria-expanded") !== "true") await toggle.click();
}

test("uses the side menu to add devices and reach the retained actions", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator('[data-scene-ready="true"]')).toBeVisible();
  await openMenu(page);
  await expect(page.getByRole("button", { name: "Connect ports", exact: true })).toBeDisabled();
  const tutorial = page.getByRole("switch", { name: "Tutorial mode" });
  await expect(tutorial).toHaveAttribute("aria-checked", "true");
  await tutorial.click();
  await openMenu(page);
  await expect(tutorial).toHaveAttribute("aria-checked", "false");
  for (let i = 1; i <= 2; i++) {
    await openMenu(page);
    await page.getByRole("button", { name: "Add device", exact: true }).click();
    await expect(page.getByRole("button", { name: "Add host", exact: true })).toBeFocused();
    await page.getByRole("button", { name: "Add host", exact: true }).click();
    await expect(page.getByRole("heading", { name: `Host ${i}`, exact: true })).toBeVisible();
  }
  await openMenu(page);
  await page.getByRole("button", { name: "Connect ports", exact: true }).click();
  await expect(page.getByText("Choose the first port", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Cancel connection", exact: true }).click();
  for (let i = 0; i < 2; i++) {
    await openMenu(page);
    await page.getByRole("button", { name: "Send a packet", exact: true }).click();
    await expect(page.getByLabel("Destination IPv4", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Close packet composer", exact: true }).click();
  }
  await page.getByLabel("IPv4 address", { exact: true }).fill("10.0.0.1");
  await page.getByRole("button", { name: "Apply settings", exact: true }).click();
  await openMenu(page);
  await page.getByRole("button", { name: "Send a packet", exact: true }).click();
  await page.getByLabel("Destination IPv4", { exact: true }).fill("10.0.0.2");
  await page.getByRole("button", { name: "Start ping", exact: true }).click();
  await expect(page.locator(".ping-composer")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Next step", exact: true })).toBeFocused();
  await page.getByRole("button", { name: "Next step", exact: true }).click();
  await expect(page.getByRole("slider", { name: "Known events" })).toHaveValue("1");
  // A modeled network failure must not obscure the menu on a narrow screen.
  await openMenu(page);
  await page.getByRole("button", { name: "Save network", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Save network", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Close save dialog", exact: true }).click();
  await openMenu(page);
  await page.getByRole("button", { name: "My networks", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
});

test("collapses on a phone and restores focus when dismissed with the keyboard", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const toggle = page.getByRole("button", { name: "Toggle network menu" });
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await toggle.focus();
  await page.keyboard.press("Enter");
  await page.getByRole("button", { name: "Add device", exact: true }).focus();
  await page.keyboard.press("Escape");
  await expect(toggle).toBeFocused();
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await toggle.click();
  await page.getByRole("button", { name: "Add device", exact: true }).click();
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await page.keyboard.press("Escape");
  await expect(toggle).toBeFocused();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
