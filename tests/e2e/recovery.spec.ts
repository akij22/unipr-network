import { expect, test } from "@playwright/test";
import { addDevice } from "../helpers/ui";
test("recreates a lost WebGL context and preserves the network", async ({
  page,
}) => {
  await page.goto("/");
  await addDevice(page, "host");
  await expect(page.locator("[data-scene-ready=true]")).toBeVisible();
  await page
    .locator("canvas")
    .evaluate((canvas) =>
      canvas.dispatchEvent(new Event("webglcontextlost", { cancelable: true })),
    );
  await expect(
    page.getByRole("button", { name: "Retry 3D view", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Select Host 1", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Retry 3D view", exact: true })
    .click();
  await expect(page.locator("[data-scene-ready=true]")).toBeVisible();
  await expect(page.locator("canvas")).toHaveCount(1);
  await expect(
    page.getByRole("button", { name: "Select Host 1", exact: true }),
  ).toBeVisible();
});
test("pauses playback when the page reports that it has been backgrounded", async ({
  page,
}) => {
  const { configureHost, openComposer } = await import("../helpers/ui");
  await page.goto("/");
  await addDevice(page, "host");
  await configureHost(page, "Host 1", "10.0.0.1");
  await openComposer(page);
  await page.getByLabel("Destination IPv4", { exact: true }).fill("10.0.0.2");
  await page.getByRole("button", { name: "Start ping", exact: true }).click();
  await page
    .getByRole("button", { name: "Play simulation", exact: true })
    .click();
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", {
      value: true,
      configurable: true,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect(
    page.getByRole("button", { name: "Play simulation", exact: true }),
  ).toBeVisible();
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", {
      value: false,
      configurable: true,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect(
    page.getByRole("button", { name: "Play simulation", exact: true }),
  ).toBeVisible();
});
