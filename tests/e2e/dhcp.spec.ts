import { expect, test } from "@playwright/test";
import {
  addDevice,
  connect,
  selectDevice,
  finishOperation,
} from "../helpers/ui";
test("keeps DHCP acquisition explicit and displays the assigned address", async ({
  page,
}) => {
  await page.goto("/");
  await addDevice(page, "host");
  await addDevice(page, "router");
  await selectDevice(page, "Router 1");
  await page
    .getByLabel("IPv4 address eth0", { exact: true })
    .fill("192.168.1.1");
  await page
    .getByRole("button", { name: "Apply settings", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Enable DHCP on eth0", exact: true })
    .click();
  await page
    .getByLabel("DHCP first address eth0", { exact: true })
    .fill("192.168.1.100");
  await page
    .getByLabel("DHCP last address eth0", { exact: true })
    .fill("192.168.1.110");
  await page
    .getByRole("button", { name: "Apply DHCP settings", exact: true })
    .click();
  await connect(page, "Host 1", "eth0", "Router 1", "eth0");
  await selectDevice(page, "Host 1");
  await page
    .getByRole("button", { name: "Automatic (DHCP)", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Apply settings", exact: true })
    .click();
  await expect(
    page.getByText("No address assigned", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Request network configuration", exact: true })
    .click();
  expect(await finishOperation(page)).toBe("completed");
  await expect(
    page.getByText("Assigned IPv4: 192.168.1.100", { exact: true }),
  ).toBeVisible();
});
