import { expect, test } from "@playwright/test";
import {
  buildRouted,
  selectDevice,
  configureHost,
  finishOperation,
} from "../helpers/ui";
import { openComposer } from "../helpers/ui";
test("shows PAT transformations and a reversible translation table", async ({
  page,
}) => {
  test.setTimeout(60000);
  await page.goto("/");
  await buildRouted(page);
  await configureHost(page, "Host 2", "203.0.113.10");
  await selectDevice(page, "Router 1");
  await page
    .getByLabel("IPv4 address eth1", { exact: true })
    .fill("203.0.113.1");
  await page
    .getByRole("button", { name: "Apply settings", exact: true })
    .click();
  await page.getByRole("button", { name: "Enable NAT", exact: true }).click();
  await page.getByLabel("NAT internal interface eth0", { exact: true }).check();
  await page
    .getByLabel("NAT source networks", { exact: true })
    .fill("192.168.1.0/24");
  await page
    .getByRole("button", { name: "Apply NAT settings", exact: true })
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
  await selectDevice(page, "Host 1");
  await page
    .getByRole("button", { name: "Automatic (DHCP)", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Apply settings", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Request network configuration", exact: true })
    .click();
  expect(await finishOperation(page)).toBe("completed");
  await openComposer(page);
  await page
    .getByLabel("Destination IPv4", { exact: true })
    .fill("203.0.113.10");
  await page.getByRole("button", { name: "Start ping", exact: true }).click();
  expect(await finishOperation(page)).toBe("completed");
  const frontier = await page
    .getByRole("slider", { name: "Known events" })
    .inputValue();
  await selectDevice(page, "Host 1");
  await page.getByLabel("Device name", { exact: true }).fill("Renamed client");
  await page
    .getByRole("button", { name: "Apply settings", exact: true })
    .click();
  await expect(page.getByRole("slider", { name: "Known events" })).toHaveValue(
    frontier,
  );
  await expect(
    page.getByText("Assigned IPv4: 192.168.1.100", { exact: true }),
  ).toBeVisible();
  await selectDevice(page, "Router 1");
  await page.getByRole("button", { name: "Tables", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "NAT translations", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("203.0.113.1", { exact: true }).first(),
  ).toBeVisible();
});
