import { expect, test, type Page } from "@playwright/test";
import { addDevice, connect, menuAction, selectDevice } from "../helpers/ui";

async function linkedDevices(page: Page) {
  await page.goto("/");
  await addDevice(page, "host");
  await addDevice(page, "switch");
  await connect(page, "Host 1", "eth0", "Switch 1", "p1");
  await expect(page.locator(".react-flow__edge")).toHaveCount(1);
  await page.getByRole("button", { name: "Close inspector", exact: true }).click();
}

for (const key of ["Backspace", "Delete"]) {
  test(`${key} removes the selected cable without opening the removed panels`, async ({ page }) => {
    await linkedDevices(page);
    await expect(page.locator(".connections-list")).toHaveCount(0);
    const edge = page.locator(".react-flow__edge");
    const point = await page.locator('.react-flow__edge-interaction').evaluate(el => {
      const path = el as SVGPathElement;
      const point = path.getPointAtLength(path.getTotalLength() / 2).matrixTransform(path.getScreenCTM()!);
      return { x: point.x, y: point.y };
    });
    await page.mouse.click(point.x, point.y);
    await expect(page.locator(".flow-edge-selected")).toHaveCount(1);
    await expect(page.getByRole("heading", { name: "Ethernet connection", exact: true })).toHaveCount(0);
    await page.keyboard.press(key);
    await expect(page.locator(".react-flow__edge")).toHaveCount(0);
    await expect(page.locator("[data-device-node]")).toHaveCount(2);
    // The freed port is available for another physical cable.
    await connect(page, "Host 1", "eth0", "Switch 1", "p1");
    await expect(page.locator(".react-flow__edge")).toHaveCount(1);
  });

  test(`${key} removes a selected device and its attached cables`, async ({ page }) => {
    await linkedDevices(page);
    const host = page.getByRole("group", { name: "Host 1", exact: true });
    await host.focus();
    await host.press("Enter");
    await expect(page.locator('[data-device-node="host-1"]')).toHaveAttribute("data-selected", "true");
    await host.press(key);
    await expect(page.locator('[data-device-node="host-1"]')).toHaveCount(0);
    await expect(page.locator('[data-device-node="switch-1"]')).toHaveCount(1);
    await expect(page.locator(".react-flow__edge")).toHaveCount(0);
  });
}

test("deletion keys edit fields and leave topology intact", async ({ page }) => {
  await linkedDevices(page);
  await selectDevice(page, "Host 1");
  const name = page.getByLabel("Device name", { exact: true });
  await name.fill("ABCDE");
  await name.press("Backspace");
  await expect(name).toHaveValue("ABCD");
  for (let i = 0; i < 4; i++) await name.press("ArrowLeft");
  await name.press("Delete");
  await expect(name).toHaveValue("BCD");
  await expect(page.locator("[data-device-node]")).toHaveCount(2);
  await expect(page.locator(".react-flow__edge")).toHaveCount(1);
});

test("modified shortcuts, dialogs and an unselected canvas do not delete devices", async ({ page }) => {
  await page.goto("/");
  await addDevice(page, "host");
  await page.locator(".react-flow__pane").click({ position: { x: 15, y: 200 } });
  await expect(page.locator("[data-device-node]")).toHaveAttribute("data-selected", "false");
  await page.keyboard.press("Backspace");
  await expect(page).toHaveURL(/127\.0\.0\.1/);
  await page.keyboard.press("Delete");
  await expect(page.locator("[data-device-node]")).toHaveCount(1);
  const host = page.getByRole("group", { name: "Host 1", exact: true });
  await host.focus();
  await host.press("Enter");
  await host.press("Control+Delete");
  await host.press("Meta+Backspace");
  await expect(page.locator("[data-device-node]")).toHaveCount(1);
  await menuAction(page, "Save network");
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Close save dialog", exact: true }).focus();
  await page.keyboard.press("Delete");
  await expect(page.locator("[data-device-node]")).toHaveCount(1);
});
