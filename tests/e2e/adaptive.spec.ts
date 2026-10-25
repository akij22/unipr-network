import { expect, test } from "@playwright/test";
import { addDevice, configureHost, openComposer } from "../helpers/ui";
for (const [width, height] of [
  [320, 568],
  [360, 640],
  [375, 667],
  [390, 844],
  [414, 896],
  [768, 1024],
  [844, 390],
  [1280, 800],
]) {
  test(`keeps a useful network beside playback at ${width}x${height}`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height });
    await page.goto("/");
    await addDevice(page, "host");
    await configureHost(page, "Host 1", "10.0.0.1");
    await openComposer(page);
    await page.getByLabel("Destination IPv4", { exact: true }).fill("10.0.0.2");
    await page.getByRole("button", { name: "Start ping", exact: true }).click();
    for (let n = 1; n <= 3; n++) {
      await page
        .getByRole("button", { name: "Next step", exact: true })
        .click();
      await expect(
        page.getByRole("slider", { name: "Known events" }),
      ).toHaveValue(String(n));
    }
    await page
      .locator(".network-focus")
      .evaluate((el) =>
        window.scrollTo(
          0,
          Math.floor(el.getBoundingClientRect().top + scrollY),
        ),
      );
    const controls = await page
      .getByRole("navigation", { name: "Simulation controls" })
      .boundingBox();
    const scene = await page
      .getByRole("region", { name: "3D network workspace" })
      .boundingBox();
    expect(controls).not.toBeNull();
    expect(scene).not.toBeNull();
    expect(controls!.y).toBeGreaterThanOrEqual(0);
    expect(controls!.y + controls!.height).toBeLessThanOrEqual(height);
    expect(scene!.height).toBeGreaterThanOrEqual(160);
    expect(scene!.y + 160).toBeLessThanOrEqual(height);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    for (const name of ["Next step", "Orbit left", "Zoom in"]) {
      const b = await page
        .getByRole("button", { name, exact: true })
        .boundingBox();
      expect(b!.height).toBeGreaterThanOrEqual(44);
      expect(b!.width).toBeGreaterThanOrEqual(44);
    }
  });
}
test("supports keyboard controls and reduced motion without losing focus", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await addDevice(page, "host");
  const orbit = page.getByRole("button", { name: "Orbit right", exact: true });
  await orbit.focus();
  await page.keyboard.press("Enter");
  await expect(orbit).toBeFocused();
  await page.getByLabel("Device name", { exact: true }).focus();
  await page.keyboard.press("ControlOrMeta+A");
  await page.keyboard.type("My computer");
  await expect(page.getByLabel("Device name", { exact: true })).toHaveValue(
    "My computer",
  );
});
test("returns keyboard focus after closing the device inspector", async ({
  page,
}) => {
  await page.goto("/");
  await addDevice(page, "host");
  await page
    .getByRole("button", { name: "Close inspector", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Select Host 1", exact: true }),
  ).toBeFocused();
});
test("keeps input actions reachable after a keyboard-sized viewport and rotation", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await addDevice(page, "host");
  await page.getByLabel("IPv4 address", { exact: true }).focus();
  await page.setViewportSize({ width: 390, height: 340 });
  await page.getByLabel("IPv4 address", { exact: true }).fill("10.0.0.1");
  await page
    .getByRole("button", { name: "Apply settings", exact: true })
    .click();
  await page.setViewportSize({ width: 844, height: 390 });
  await openComposer(page);
  await page.getByLabel("Destination IPv4", { exact: true }).fill("10.0.0.2");
  await page.getByRole("button", { name: "Start ping", exact: true }).click();
  await page.getByRole("button", { name: "Next step", exact: true }).click();
  await expect(page.getByRole("slider", { name: "Known events" })).toHaveValue(
    "1",
  );

  const scene = await page
    .getByRole("region", { name: "3D network workspace" })
    .boundingBox();
  expect(scene!.height).toBeGreaterThanOrEqual(160);
  expect(scene!.y + 160).toBeLessThanOrEqual(390);
});
