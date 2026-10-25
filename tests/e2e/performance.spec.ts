import { test, expect } from "@playwright/test";
import { fanoutNetwork } from "../fixtures/networks";
import { createSimulator } from "../../src/simulation/engine";
import {
  createInitialState,
  diffState,
  applyChanges,
} from "../../src/simulation/state";
import type { NetworkDocument } from "../../src/app/types";
import { openComposer } from "../helpers/ui";
import { writeFile, mkdir } from "node:fs/promises";
for (const count of [10, 50, 100, 250]) {
  test(`measures ${count} devices without a product limit`, async ({
    page,
    browser,
  }) => {
    const network = fanoutNetwork(count - 1),
      networkDocument: NetworkDocument = {
        schema: 1,
        id: "benchmark",
        name: "Measured topology",
        network,
        layout: Object.fromEntries(
          network.devices.map((d, i) => [
            d.id,
            { name: d.id, x: ((i % 16) - 7.5) * 4, z: Math.floor(i / 16) * 4 },
          ]),
        ),
        view: { cameraPosition: [12, 24, 28], target: [0, 0, 0], depth: "ip" },
      };
    await page.addInitScript(() => {
      const stats = { calls: 0, frames: 0 };
      Object.assign(window, { __gpuStats: stats });
      for (const prototype of [
        WebGLRenderingContext.prototype,
        WebGL2RenderingContext.prototype,
      ])
        for (const name of [
          "clear",
          "drawArrays",
          "drawElements",
          "drawArraysInstanced",
          "drawElementsInstanced",
        ] as const) {
          const original = prototype[name as keyof typeof prototype];
          if (typeof original !== "function") continue;
          Object.defineProperty(prototype, name, {
            value: function (...args: unknown[]) {
              if (name === "clear") stats.frames++;
              else stats.calls++;
              return Reflect.apply(original, this, args);
            },
          });
        }
    });
    await page.goto("/");
    await page.evaluate(
      async ({ doc, modulePath }) => {
        const { openDatabase } = await import(modulePath);
        const db = await openDatabase();
        await db.put("documents", {
          id: doc.id,
          name: doc.name,
          normalName: doc.name.toLowerCase(),
          schema: 1,
          updatedAt: Date.now(),
          document: doc,
        });
        db.close();
      },
      { doc: networkDocument, modulePath: "/src/storage/database.ts" },
    );
    await page
      .getByRole("button", { name: "My networks", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Open Measured topology", exact: true })
      .click();
    await expect(page.locator("[data-scene-ready=true]")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Select h0", exact: true }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Reset view", exact: true }).click();
    const gpu = await page.evaluate(async () => {
      const stats = (
        window as unknown as { __gpuStats: { calls: number; frames: number } }
      ).__gpuStats;
      let frames = 0;
      const start = performance.now(),
        calls = stats.calls,
        initialFrames = stats.frames;
      while (performance.now() - start < 1200) {
        await new Promise(requestAnimationFrame);
        (
          document.querySelector(
            '[aria-label="Orbit right"]',
          ) as HTMLButtonElement
        ).click();
        frames++;
      }
      const canvas = document.querySelector("canvas")!,
        gl = canvas.getContext("webgl2")!,
        debug = gl.getExtension("WEBGL_debug_renderer_info");
      return {
        fps:
          ((stats.frames - initialFrames) * 1000) / (performance.now() - start),
        drawCallsPerFrame:
          (stats.calls - calls) / Math.max(1, stats.frames - initialFrames),
        renderer: debug
          ? gl.getParameter(debug.UNMASKED_RENDERER_WEBGL)
          : gl.getParameter(gl.RENDERER),
        userAgent: navigator.userAgent,
        heap:
          (performance as Performance & { memory?: { usedJSHeapSize: number } })
            .memory?.usedJSHeapSize ?? null,
      };
    });
    await openComposer(page);
    await page.getByLabel("Destination IPv4", { exact: true }).fill("10.0.0.2");
    const start = Date.now();
    await page.getByRole("button", { name: "Start ping", exact: true }).click();
    await expect(page.locator("[data-sim-status]")).toHaveAttribute(
      "data-sim-status",
      "active",
    );
    const startMs = Date.now() - start;
    const next = Date.now();
    await page.getByRole("button", { name: "Next step", exact: true }).click();
    await expect(
      page.getByRole("slider", { name: "Known events" }),
    ).toHaveValue("1");
    const nextMs = Date.now() - next;
    // Advance into broadcast fan-out, then cancel through the real UI.
    for (let i = 0; i < 5; i++) {
      await page
        .getByRole("button", { name: "Next step", exact: true })
        .click();
      await expect(page.locator("[data-sim-status]")).toHaveAttribute(
        "aria-busy",
        "false",
      );
    }
    await page
      .getByRole("button", { name: "Play simulation", exact: true })
      .click();
    const animationFps = await page.evaluate(async () => {
      const stats = (window as unknown as { __gpuStats: { frames: number } })
          .__gpuStats,
        start = performance.now(),
        first = stats.frames;
      while (performance.now() - start < 1000)
        await new Promise(requestAnimationFrame);
      return ((stats.frames - first) * 1000) / (performance.now() - start);
    });
    await page
      .getByRole("button", { name: "Pause simulation", exact: true })
      .click();
    const seek = Date.now();
    await page
      .getByRole("button", { name: "Previous step", exact: true })
      .click();
    await expect(page.locator("[data-sim-status]")).toHaveAttribute(
      "aria-busy",
      "false",
    );
    const seekMs = Date.now() - seek;
    const cancel = Date.now();
    await page
      .getByRole("button", { name: "Cancel operation", exact: true })
      .click();
    await expect(page.locator("[data-sim-status]")).toHaveAttribute(
      "data-sim-status",
      "idle",
    );
    const cancelMs = Date.now() - cancel;
    const storage = await page.evaluate(async () =>
      navigator.storage?.estimate(),
    );
    const engine = createSimulator(network);
    engine.start(
      { kind: "ping", sourceId: "h0", destination: "10.0.0.2" },
      "bench",
    );
    let state = engine.snapshot(),
      bytes = 0,
      events = 0;
    const run = performance.now();
    for (let i = 0; i < 10000; i++) {
      const result = engine.advance(128);
      if (result.kind === "done") break;
      if (result.kind === "event") {
        const delta = diffState(state, result.state);
        expect(applyChanges(state, delta)).toEqual(result.state);
        state = result.state;
        bytes += JSON.stringify(result.event).length;
        events++;
      }
    }
    const report = {
      count,
      browser: browser.version(),
      ...gpu,
      animationFps,
      startMs,
      nextMs,
      seekMs,
      cancelMs,
      engineMs: performance.now() - run,
      events,
      journalBytes: bytes,
      storage,
    };
    await mkdir("docs/verification/measurements", { recursive: true });
    await writeFile(
      `docs/verification/measurements/${count}.json`,
      JSON.stringify(report, null, 2),
    );
    console.log(JSON.stringify(report));
    expect(state.result).toBe("succeeded");
  });
}
