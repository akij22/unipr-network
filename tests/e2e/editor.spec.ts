import { expect, test } from "@playwright/test";
import { menuAction } from "../helpers/ui";
test("adds and configures a host explicitly", async ({ page }) => {
  await page.goto("/");
  await menuAction(page, "Add device");
  await page.getByRole("button", { name: "Add host", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Host 1", exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel("IPv4 address", { exact: true })).toHaveValue(
    "",
  );
  await page.getByLabel("IPv4 address", { exact: true }).fill("192.168.1.10");
  await page
    .getByRole("button", { name: "Apply settings", exact: true })
    .click();
  await expect(page.getByLabel("IPv4 address", { exact: true })).toHaveValue(
    "192.168.1.10",
  );
});
