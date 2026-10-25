import { expect, test } from "@playwright/test";
import { buildRouted, finishOperation } from "../helpers/ui";
import { openComposer } from "../helpers/ui";
test("runs a routed ping through the real worker and replays history", async ({
  page,
}) => {
  test.setTimeout(60000);
  await page.goto("/");
  await expect(page.locator(".ping-composer")).toBeVisible({ timeout: 1000 });
  await buildRouted(page);
  await openComposer(page);
  await page.getByLabel("Source host", { exact: true }).selectOption("host-1");
  await page
    .getByLabel("Destination IPv4", { exact: true })
    .fill("192.168.2.10");
  await page.getByRole("button", { name: "Start ping", exact: true }).click();
  expect(await finishOperation(page)).toBe("completed");
  await expect(
    page.getByText("Communication complete", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Previous step", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Start ping", exact: true }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Next step", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Start ping", exact: true }),
  ).toBeEnabled();
  await page
    .getByRole("button", { name: "Reset network state", exact: true })
    .click();
  await expect(page.locator("[data-sim-status]")).toHaveAttribute(
    "data-sim-status",
    "idle",
  );
});
