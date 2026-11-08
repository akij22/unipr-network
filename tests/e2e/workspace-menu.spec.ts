import { expect, test, type Page } from "@playwright/test";
import { selectDevice } from "../helpers/ui";

async function openTopMenu(page: Page, menu: string) {
  const trigger = page.getByRole("button", { name: menu, exact: true });
  if (await trigger.getAttribute("aria-expanded") !== "true") await trigger.click();
  await expect(trigger).toHaveAttribute("aria-expanded", "true");
}

test("runs the top-menu actions and reaches the retained actions", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator('[data-scene-ready="true"]')).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Workspace menus", exact: true }).getByRole("button"))
    .toHaveCount(4);
  await expect(page.getByRole("button", { name: "Toggle network menu" })).toHaveCount(0);
  await expect(page.locator(".workspace-menu, aside")).toHaveCount(0);
  await openTopMenu(page, "Topology");
  await expect(page.getByRole("button", { name: "Connect ports", exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "Add device", exact: true }).click();
  await expect(page.getByRole("button", { name: "Topology", exact: true })).toHaveAttribute("aria-expanded", "false");
  await expect(page.getByRole("button", { name: "Add host", exact: true })).toBeFocused();
  await page.getByRole("button", { name: "Add host", exact: true }).click();
  await expect(page.getByRole("button", { name: "Close inspector", exact: true })).toBeHidden();
  await selectDevice(page, "Host 1");
  await openTopMenu(page, "Topology");
  await page.getByRole("button", { name: "Add device", exact: true }).click();
  await page.getByRole("button", { name: "Add host", exact: true }).click();
  await expect(page.getByRole("button", { name: "Close inspector", exact: true })).toBeHidden();
  await openTopMenu(page, "Topology");
  await page.getByRole("button", { name: "Connect ports", exact: true }).click();
  await expect(page.getByText("Choose the first port", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Cancel connection", exact: true }).click();
  for (let i = 0; i < 2; i++) {
    await openTopMenu(page, "Simulation");
    await page.getByRole("button", { name: "Send a packet", exact: true }).click();
    await expect(page.getByLabel("Destination IPv4", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Close packet composer", exact: true }).click();
  }
  // Opening the Simulation menu or its composer starts no operation, so the
  // playback row stays hidden until a ping really starts.
  await expect(page.locator('[data-simulation-visible="false"]')).toBeAttached();
  await expect(page.getByRole("navigation", { name: "Simulation controls", exact: true })).toHaveCount(0);
  await selectDevice(page, "Host 1");
  await page.getByLabel("IPv4 address", { exact: true }).fill("10.0.0.1");
  await page.getByRole("button", { name: "Apply settings", exact: true }).click();
  await openTopMenu(page, "Simulation");
  await page.getByRole("button", { name: "Send a packet", exact: true }).click();
  await page.getByLabel("Destination IPv4", { exact: true }).fill("10.0.0.2");
  await page.getByRole("button", { name: "Start ping", exact: true }).click();
  await expect(page.locator(".ping-composer")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Next step", exact: true })).toBeFocused();
  await page.getByRole("button", { name: "Next step", exact: true }).click();
  await expect(page.getByRole("slider", { name: "Known events" })).toHaveValue("1");
  await openTopMenu(page, "File");
  await page.getByRole("button", { name: "Save network", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Save network", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Close save dialog", exact: true }).click();
  await openTopMenu(page, "File");
  await page.getByRole("button", { name: "My networks", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "Close networks", exact: true }).click();
  await openTopMenu(page, "Help");
  const tutorial = page.getByRole("switch", { name: "Tutorial mode", exact: true });
  await expect(tutorial).toHaveAttribute("aria-checked", "true");
  await tutorial.click();
  await openTopMenu(page, "Help");
  await expect(tutorial).toHaveAttribute("aria-checked", "false");
});

test("opens a top menu from the keyboard and restores focus with Escape", async ({ page }) => {
  await page.goto("/");
  const topology = page.getByRole("button", { name: "Topology", exact: true });
  await topology.focus();
  await page.keyboard.press("Enter");
  await expect(topology).toHaveAttribute("aria-expanded", "true");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "Add device", exact: true })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(topology).toBeFocused();
  await expect(topology).toHaveAttribute("aria-expanded", "false");
  await expect(page.getByRole("button", { name: "Add device", exact: true })).toBeHidden();
  await page.keyboard.press("Space");
  await page.getByRole("button", { name: "Add device", exact: true }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("button", { name: "Add host", exact: true })).toBeFocused();
});

test("closes an open top menu on an outside click without moving the canvas", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator('[data-scene-ready="true"]')).toBeVisible();
  const simulation = page.getByRole("button", { name: "Simulation", exact: true });
  await simulation.click();
  await expect(simulation).toHaveAttribute("aria-expanded", "true");
  await page.locator(".react-flow__pane").click({ position: { x: 150, y: 400 } });
  await expect(simulation).toHaveAttribute("aria-expanded", "false");
  await expect(page.getByRole("button", { name: "Send a packet", exact: true })).toBeHidden();
});

test("opens top menus by touch on a phone", async ({ page, isMobile }) => {
  test.skip(!isMobile, "touch is exercised on the mobile project");
  await page.goto("/");
  const help = page.getByRole("button", { name: "Help", exact: true });
  await help.tap();
  await expect(help).toHaveAttribute("aria-expanded", "true");
  await page.getByRole("switch", { name: "Tutorial mode", exact: true }).tap();
  await expect(help).toHaveAttribute("aria-expanded", "false");
  await help.tap();
  await expect(page.getByRole("switch", { name: "Tutorial mode", exact: true })).toHaveAttribute("aria-checked", "false");
});

test("keeps the top menus inside a 320px screen", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await page.goto("/");
  await expect(page.locator('[data-scene-ready="true"]')).toBeVisible();
  for (const menu of ["File", "Topology", "Simulation", "Help"]) {
    const trigger = page.getByRole("button", { name: menu, exact: true });
    const box = await trigger.boundingBox();
    expect(box!.height).toBeGreaterThanOrEqual(44);
    expect(box!.x + box!.width).toBeLessThanOrEqual(320);
    await trigger.click();
    const popover = page.locator(`#topbar-${menu.toLowerCase()}`);
    const panel = await popover.boundingBox();
    expect(panel!.x).toBeGreaterThanOrEqual(0);
    expect(panel!.x + panel!.width).toBeLessThanOrEqual(320);
    await trigger.click();
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
