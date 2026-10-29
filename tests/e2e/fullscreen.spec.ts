import { expect, test } from "@playwright/test";

test("fills the viewport on resize and confines overlays to their controls", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator('[data-scene-ready="true"] canvas')).toBeVisible();
  for (const [width, height] of [[1440, 900], [768, 1024], [390, 844], [320, 568], [844, 390]]) {
    await page.setViewportSize({ width, height });
    await expect.poll(async () => {
      const box = await page.locator("canvas").boundingBox();
      return box && [box.x, box.y, box.width, box.height];
    }).toEqual([0, 0, width, height]);
    await expect.poll(() => page.locator("canvas").evaluate((canvas) => {
      if (!(canvas instanceof HTMLCanvasElement)) return false;
      const ratio = Math.min(1.5, devicePixelRatio);
      return Math.abs(canvas.width / ratio - innerWidth) <= 1 &&
        Math.abs(canvas.height / ratio - innerHeight) <= 1;
    })).toBe(true);
    expect(await page.evaluate(() => ({
      width: document.documentElement.scrollWidth,
      height: document.documentElement.scrollHeight,
      target: document.elementFromPoint(innerWidth / 2, innerHeight / 2)?.tagName,
    }))).toEqual({ width, height, target: "CANVAS" });
    const controls = await page.getByRole("navigation", { name: "Simulation controls" }).boundingBox();
    expect(controls!.y).toBeGreaterThan(0);
    expect(controls!.y + controls!.height).toBeLessThanOrEqual(height);
    const reset = page.getByRole("button", { name: "Reset network state" });
    await expect(reset).toBeInViewport();
    await reset.click();
  }
  await expect(page.locator(".topbar, .lab-toolbar, .scene-hud, .scene-empty, .camera-toolbar, .scene-help")).toHaveCount(0);
  for (const name of ["Zoom in", "Reset view"]) {
    await expect(page.getByRole("button", { name, exact: true })).toHaveCount(0);
  }
  await expect(page.getByRole("button", { name: "Toggle network menu" })).toBeVisible();
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
    const dock = await page.locator(".simulation-surface").boundingBox();
    expect(packet!.y + packet!.height).toBeLessThanOrEqual(dock!.y);
    await expect.poll(async () => (await page.locator("canvas").boundingBox())?.height).toBe(height);
    await page.screenshot({ path: `.taste-skill/packet-${width}.png` });
  }
});
