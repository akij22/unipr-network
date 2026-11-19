import { expect, test } from "@playwright/test";
import { addDevice, configureHost, selectDevice } from "../helpers/ui";

test("opens the PC terminal only from the bottom bar and closes it from its tab", async ({ page, isMobile }) => {
  if (!isMobile) await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  const open = page.getByRole("button", { name: "Open terminal" });
  const close = page.getByRole("button", { name: "Close terminal", exact: true });
  const terminals = page.getByRole("region", { name: "Terminals" });
  await addDevice(page, "host");

  const pc = page.getByRole("group", { name: "Host 1", exact: true });
  if (isMobile) await pc.tap();
  else await pc.click();
  const input = terminals.getByRole("textbox", { name: "Host 1 terminal command" });
  await expect(terminals).toBeHidden();
  const status = (await page.locator(".terminal-status").boundingBox())!;
  expect(status.x).toBe(0);
  expect(status.width).toBe(page.viewportSize()!.width);
  expect(status.y + status.height).toBe(page.viewportSize()!.height);
  const sidebar = page.getByRole("complementary", { name: "Device inspector" });
  if (!isMobile) {
    const inspector = (await sidebar.boundingBox())!;
    expect(inspector.y + inspector.height).toBeCloseTo(status.y, 0);
  }
  if (isMobile) await open.tap();
  else await open.press("Enter");
  await expect(open).toHaveAttribute("aria-expanded", "true");
  await expect(input).toBeVisible();
  await expect(close).toBeFocused();
  const panel = (await terminals.boundingBox())!;
  const canvas = (await page.locator(".flow-surface").boundingBox())!;
  const dock = (await page.locator(".device-dock-pill").boundingBox())!;
  expect(Math.abs(panel.y - canvas.y - canvas.height)).toBeLessThanOrEqual(1);
  expect(dock.y + dock.height).toBeLessThan(panel.y);
  if (!isMobile) {
    const inspector = (await page.locator(".inspection-overlay").boundingBox())!;
    expect(panel.x + panel.width).toBe(inspector.x);
    const card = (await sidebar.boundingBox())!;
    expect(card.y + card.height).toBeCloseTo(status.y, 0);
    const footer = (await sidebar.locator(".inspector-footer").boundingBox())!;
    expect(card.y + card.height - footer.y - footer.height).toBeLessThanOrEqual(2);
    await page.setViewportSize({ width: 1000, height: 844 });
    const narrowerPanel = (await terminals.boundingBox())!;
    const narrowerInspector = (await page.locator(".inspection-overlay").boundingBox())!;
    expect(narrowerPanel.x + narrowerPanel.width).toBe(narrowerInspector.x);
  } else {
    expect(panel.width).toBe(page.viewportSize()!.width);
  }

  await input.fill("help");
  await expect(terminals.getByRole("button", { name: "Run", exact: true })).toHaveCount(0);
  await input.press("Enter");
  const firstLog = terminals.getByRole("log", { name: "Host 1 terminal output" });
  await expect(firstLog).toContainText("Show available commands");
  await firstLog.press("Backspace");
  await expect(pc).toBeAttached();
  const closeInspector = page.getByRole("button", { name: "Close inspector", exact: true });
  await closeInspector.click();
  await expect(sidebar).toBeHidden();
  await expect(firstLog).toContainText("Show available commands");
  const fullPanel = (await terminals.boundingBox())!;
  expect(fullPanel.width).toBe(page.viewportSize()!.width);
  const centeredDock = (await page.locator(".device-dock-pill").boundingBox())!;
  expect(centeredDock.x + centeredDock.width / 2).toBeCloseTo(fullPanel.width / 2, 0);
  await expect(pc).toBeFocused();
  await pc.press("Enter");
  if (!isMobile) {
    const restoredPanel = (await terminals.boundingBox())!;
    const restoredInspector = (await sidebar.boundingBox())!;
    expect(restoredPanel.x + restoredPanel.width).toBe(restoredInspector.x);
  }
  await close.click();
  await expect(open).toBeFocused();
  await expect(input).toBeHidden();
  await pc.press("Enter");
  await expect(input).toBeHidden();
  await open.click();
  await expect(firstLog).toContainText("Show available commands");

  await addDevice(page, "host");
  await selectDevice(page, "Host 2");
  await expect(terminals.getByRole("log", { name: "Host 2 terminal output" })).not.toContainText("Show available commands");
  await selectDevice(page, "Host 1");
  await expect(firstLog).toContainText("Show available commands");
});

test("reads the selected host configuration and routes ping through playback", async ({ page }) => {
  await page.goto("/");
  await addDevice(page, "host");
  await configureHost(page, "Host 1", "10.0.0.1");
  await page.getByRole("button", { name: "Open terminal" }).click();
  const input = page.getByRole("textbox", { name: "Host 1 terminal command" });
  const log = page.getByRole("log", { name: "Host 1 terminal output" });
  await input.fill("ipconfig");
  await input.press("Enter");
  await expect(log).toContainText("eth0: 10.0.0.1/24");
  await input.fill("ping invalid");
  await input.press("Enter");
  await expect(log).toContainText("Enter ping followed by a destination IPv4 address");
  await expect(page.getByRole("navigation", { name: "Simulation controls" })).toBeHidden();
  await input.fill("ping 10.0.0.2");
  await input.press("Enter");
  await expect(log).toContainText("Ping to 10.0.0.2 started.");
  await page.getByRole("button", { name: "Next step" }).click();
  await expect(page.getByRole("slider", { name: "Known events" })).toHaveValue("1");
});
