import { expect, test } from "@playwright/test";
import { addDevice } from "../helpers/ui";
test("recovers from a canvas failure and preserves the network", async ({
  page,
}) => {
  // The topology canvas is SVG, so there is no WebGL context to lose. A
  // failure inside the canvas is reported through the error boundary, which
  // offers a retry and keeps the document intact.
  await page.route("**/NetworkFlow.tsx*", async (route) => {
    const response = await route.fetch();
    const body = (await response.text()).replace(
      "const state = useApp(controller);",
      'if (window.__canvasBroken) throw new Error("canvas failure"); const state = useApp(controller);',
    );
    await route.fulfill({ response, body });
  });
  await page.addInitScript(() => {
    (window as unknown as { __canvasBroken: boolean }).__canvasBroken = true;
  });
  await page.goto("/");
  await addDevice(page, "host");
  await expect(
    page.getByRole("button", { name: "Retry canvas", exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "Host 1", exact: true })).toBeVisible();
  await page.evaluate(() => {
    (window as unknown as { __canvasBroken: boolean }).__canvasBroken = false;
  });
  await page
    .getByRole("button", { name: "Retry canvas", exact: true })
    .click();
  await expect(page.locator("[data-scene-ready=true]")).toBeVisible();
  await expect(page.locator('.react-flow__node[aria-label="Host 1"]')).toBeVisible();
  // The canvas never asks the browser for a WebGL context.
  await expect(page.locator("canvas")).toHaveCount(0);
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
