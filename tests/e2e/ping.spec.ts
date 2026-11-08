import { expect, test } from "@playwright/test";
import { buildRouted, finishOperation } from "../helpers/ui";
import { openComposer } from "../helpers/ui";
test("runs a routed ping through the real worker and replays history", async ({
  page,
}) => {
  test.setTimeout(60000);
  await page.goto("/");
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
  await page.getByRole("slider", { name: "Known events" }).fill("0");
  await expect(page.getByRole("slider", { name: "Known events" })).toHaveValue(
    "0",
  );
  await page.getByRole("button", { name: "Next step", exact: true }).click();
  await expect(page.getByRole("slider", { name: "Known events" })).toHaveValue(
    "1",
  );
  await page
    .getByRole("slider", { name: "Known events" })
    .fill(
      (await page
        .getByRole("slider", { name: "Known events" })
        .getAttribute("max")) ?? "0",
    );
  await page
    .getByRole("button", { name: "Previous step", exact: true })
    .click();
  await openComposer(page);
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
  // Reset clears the operation, so the playback row disappears again.
  await expect(page.locator('[data-simulation-visible="false"]')).toBeAttached();
  await expect(page.getByRole("navigation", { name: "Simulation controls", exact: true })).toHaveCount(0);
});
