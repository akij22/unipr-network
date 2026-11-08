import { expect, test } from "@playwright/test";

test("fills the viewport on resize and confines overlays to their controls", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator('[data-scene-ready="true"]')).toBeVisible();
  // Topology editing shows no playback row: no controls and no reserved space.
  await expect(page.locator('[data-simulation-visible="false"]')).toBeAttached();
  await expect(page.getByRole("navigation", { name: "Simulation controls" })).toHaveCount(0);
  for (const [width, height] of [[1440, 900], [768, 1024], [390, 844], [320, 568], [844, 390]]) {
    await page.setViewportSize({ width, height });
    await expect.poll(async () => {
      const box = await page.locator(".react-flow").boundingBox();
      return box && [box.x, box.y, box.width, box.height];
    }).toEqual([0, 0, width, height]);
    expect(await page.evaluate(() => ({
      width: document.documentElement.scrollWidth,
      height: document.documentElement.scrollHeight,
      target: document.elementFromPoint(innerWidth / 2, innerHeight / 2)?.className,
    }))).toEqual({
      width,
      height,
      target: expect.stringContaining("react-flow"),
    });
  }
  // Canvas still fills the viewport, and adding devices never reveals playback.
  const { addDevice, configureHost, openComposer } = await import("../helpers/ui");
  await page.setViewportSize({ width: 1280, height: 800 });
  await addDevice(page, "host");
  await expect(page.getByRole("navigation", { name: "Simulation controls" })).toHaveCount(0);
  await configureHost(page, "Host 1", "10.0.0.1");
  await openComposer(page);
  await page.getByLabel("Destination IPv4", { exact: true }).fill("10.0.0.2");
  await page.getByRole("button", { name: "Start ping", exact: true }).click();
  // The playback row mounts with the new operation and stays within the viewport.
  await expect(page.locator('[data-simulation-visible="true"]')).toBeAttached();
  for (const [width, height] of [[1440, 900], [768, 1024], [390, 844], [320, 568], [844, 390]]) {
    await page.setViewportSize({ width, height });
    const controls = await page.getByRole("navigation", { name: "Simulation controls" }).boundingBox();
    expect(controls!.y).toBeGreaterThan(0);
    expect(controls!.y + controls!.height).toBeLessThanOrEqual(height);
  }
  await page.getByRole("button", { name: "Reset network state" }).click();
  await expect(page.locator('[data-simulation-visible="false"]')).toBeAttached();
  await expect(page.getByRole("navigation", { name: "Simulation controls" })).toHaveCount(0);
  await expect(page.locator(".lab-toolbar, .scene-hud, .scene-empty, .camera-toolbar, .scene-help, .workspace-menu, .statusbar")).toHaveCount(0);
  await expect(page.locator(".topbar")).toBeVisible();
  await expect(page.getByRole("button", { name: "Topology", exact: true })).toBeVisible();
});

// Expose the existing controller only in this intercepted test response, never in the app.
test("keeps packet inspection floating during an operation", async ({ page }) => {
  await page.route("**/src/main.tsx*", async (route) => {
    const response = await route.fetch();
    const body = (await response.text()).replace("document.addEventListener", "window.__testController = controller; document.addEventListener");
    await route.fulfill({ response, body });
  });
  await page.goto("/");
  await expect(page.locator('[data-scene-ready="true"]')).toBeVisible();
  await page.evaluate(async () => {
    const controller = (window as unknown as { __testController: import("../../src/app/types").AppController }).__testController;
    await controller.dispatch({ type: "device.add", kind: "host" });
    const state = controller.getSnapshot();
    const network = structuredClone(state.document.network);
    const host = network.devices[0];
    if (host.kind !== "host") throw new Error("Expected host fixture");
    host.ports[0].address = { ip: "10.0.0.1", prefix: 24 };
    await controller.dispatch({ type: "config.apply", network });
    await controller.dispatch({ type: "selection.set", selection: null });
    await controller.dispatch({ type: "simulation.start", operation: { kind: "ping", sourceId: host.id, destination: "10.0.0.2" } });
  });
  await page.getByRole("button", { name: "Next step", exact: true }).click();
  await expect(page.getByRole("slider", { name: "Known events" })).toHaveValue("1");
  for (const [width, height] of [[1440, 900], [390, 844], [844, 390]]) {
    await page.setViewportSize({ width, height });
    await expect(page.locator(".packet-inspector")).toBeInViewport();
    const packet = await page.locator(".packet-inspector").boundingBox();
    const dock = await page.locator(".device-dock-pill").boundingBox();
    expect(packet!.y + packet!.height).toBeLessThanOrEqual(dock!.y);
    await expect.poll(async () => (await page.locator(".react-flow").boundingBox())?.height).toBe(height);
    await page.screenshot({ path: `.taste-skill/packet-${width}.png` });
  }
});
