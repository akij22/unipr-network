import { expect, test } from "@playwright/test";
import { addDevice, menuAction, selectDevice } from "../helpers/ui";

test("adds and configures a host automatically without an Apply settings button", async ({
  page,
}) => {
  await page.goto("/");
  await menuAction(page, "Add device");
  await page.getByRole("button", { name: "Add host", exact: true }).click();
  await selectDevice(page, "Host 1");
  await expect(
    page.getByRole("heading", { name: "Host 1", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Apply settings", exact: true }),
  ).toHaveCount(0);
  const ipInput = page.getByLabel("IPv4 address", { exact: true });
  await expect(ipInput).toHaveValue("");
  await ipInput.fill("192.168.1.10");
  await expect(page.locator('.apply-status[data-state="clean"]')).toBeVisible();
  await expect(ipInput).toHaveValue("192.168.1.10");
  await expect(
    page.locator('[data-device-node="host-1"] .flow-device-details'),
  ).toContainText("192.168.1.10/24");
  await page.getByLabel("Device name", { exact: true }).fill("Lab PC");
  await expect(page.getByRole("heading", { name: "Lab PC", exact: true })).toBeVisible();
  await expect(
    page.locator('[data-device-node="host-1"] .flow-device-name'),
  ).toHaveText("Lab PC");
});

test("keeps invalid input visible with last valid config active until corrected without losing focus", async ({
  page,
}) => {
  await page.goto("/");
  await addDevice(page, "host");
  await selectDevice(page, "Host 1");
  const ipInput = page.getByLabel("IPv4 address", { exact: true });
  await ipInput.fill("192.168.1.10");
  await expect(page.locator('.apply-status[data-state="clean"]')).toBeVisible();
  await expect(
    page.locator('[data-device-node="host-1"] .flow-device-details'),
  ).toContainText("192.168.1.10/24");

  // Type an incomplete address: input stays focused and visible, last valid IP remains on canvas.
  await ipInput.focus();
  await ipInput.fill("192.168.1.");
  await expect(ipInput).toBeFocused();
  await expect(ipInput).toHaveValue("192.168.1.");
  await expect(ipInput).toHaveAttribute("aria-invalid", "true");
  await expect(page.locator('.apply-status[data-state="invalid"]')).toBeVisible();
  await expect(
    page.locator('[data-device-node="host-1"] .flow-device-details'),
  ).toContainText("192.168.1.10/24");

  // Finish typing a valid address: auto-applies while keeping focus in the input.
  await page.keyboard.type("25");
  await expect(ipInput).toBeFocused();
  await expect(ipInput).toHaveValue("192.168.1.25");
  await expect(page.locator('.apply-status[data-state="clean"]')).toBeVisible();
  await expect(
    page.locator('[data-device-node="host-1"] .flow-device-details'),
  ).toContainText("192.168.1.25/24");

  const prefixInput = page.getByLabel("Prefix eth0", { exact: true });
  await prefixInput.clear();
  await expect(prefixInput).toHaveValue("");
  await expect(prefixInput).toHaveAttribute("aria-invalid", "true");
  await expect(
    page.locator('[data-device-node="host-1"] .flow-device-details'),
  ).toContainText("192.168.1.25/24");
  await prefixInput.fill("25");
  await expect(
    page.locator('[data-device-node="host-1"] .flow-device-details'),
  ).toContainText("192.168.1.25/25");
});

test("preserves rapid valid edits when closing the inspector or switching devices", async ({
  page,
}) => {
  await page.goto("/");
  await addDevice(page, "host");
  await addDevice(page, "router");
  await addDevice(page, "switch");

  // Canvas details show compact summaries for each device type.
  await expect(
    page.locator('[data-device-node="switch-1"] .flow-device-details'),
  ).toContainText("4 ports");
  await expect(
    page.locator('[data-device-node="router-1"] .flow-device-details'),
  ).toContainText("2 ports");

  // Rapidly edit Host 1 IP and gateway, then immediately close inspector.
  await selectDevice(page, "Host 1");
  await page.getByLabel("IPv4 address", { exact: true }).fill("10.0.0.10");
  await page.getByLabel("Default gateway", { exact: true }).fill("10.0.0.1");
  await page.getByRole("button", { name: "Close inspector", exact: true }).click();

  // Reopen Host 1 and confirm both edits persisted.
  await selectDevice(page, "Host 1");
  await expect(page.getByLabel("IPv4 address", { exact: true })).toHaveValue(
    "10.0.0.10",
  );
  await expect(page.getByLabel("Default gateway", { exact: true })).toHaveValue(
    "10.0.0.1",
  );

  // Rapidly edit Router 1 interfaces and immediately switch back to Host 1.
  await selectDevice(page, "Router 1");
  await page.getByLabel("IPv4 address eth0", { exact: true }).fill("10.0.0.1");
  await page.getByLabel("IPv4 address eth1", { exact: true }).fill("10.0.1.1");
  await selectDevice(page, "Host 1");

  await expect(
    page.locator('[data-device-node="router-1"] .flow-device-details'),
  ).toContainText("eth0 10.0.0.1/24");
  await expect(
    page.locator('[data-device-node="router-1"] .flow-device-details'),
  ).toContainText("eth1 10.0.1.1/24");
});
