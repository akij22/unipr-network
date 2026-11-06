import { test, expect } from "@playwright/test";
import { fanoutNetwork } from "../fixtures/networks";
import { createSimulator } from "../../src/simulation/engine";
import {
  createInitialState,
  diffState,
  applyChanges,
} from "../../src/simulation/state";
import type { NetworkDocument } from "../../src/app/types";
import { menuAction, openComposer } from "../helpers/ui";
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
      // The topology canvas is SVG, so there is no WebGL draw call to count.
      // The measured signals are the number of rendered elements and the
      // frame rate while the viewport changes.
      const stats = { calls: 0 };
      Object.assign(window, { __gpuStats: stats });
      const observer = new MutationObserver((records) => {
        for (const record of records)
          stats.calls += record.addedNodes.length + record.removedNodes.length;
      });
      observer.observe(document.documentElement, {
        childList: true,
        subtree: true,
      });
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
    await menuAction(page, "My networks");
    await page
      .getByRole("button", { name: "Open Measured topology", exact: true })
      .click();
    await expect(page.locator("[data-scene-ready=true]")).toBeVisible();
    await expect(
      page.locator('.react-flow__node[aria-label="h0"]'),
    ).toBeVisible();
    const gpu = await page.evaluate(async () => {
      const stats = (
        window as unknown as { __gpuStats: { calls: number } }
      ).__gpuStats;
      let frames = 0;
      const start = performance.now(),
        calls = stats.calls;
      const pane = document.querySelector(".react-flow__pane"),
        wheel = () =>
          pane?.dispatchEvent(
            new WheelEvent("wheel", {
              deltaY: -120,
              bubbles: true,
              cancelable: true,
            }),
          );
      while (performance.now() - start < 1200) {
        await new Promise(requestAnimationFrame);
        frames++;
        wheel();
      }
      const elapsed = performance.now() - start;
      return {
        fps: (frames * 1000) / elapsed,
        drawCallsPerFrame: (stats.calls - calls) / Math.max(1, frames),
        renderer: "none (SVG topology canvas)",
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
      let frames = 0;
      const start = performance.now();
      while (performance.now() - start < 1000) {
        await new Promise(requestAnimationFrame);
        frames++;
      }
      return (frames * 1000) / (performance.now() - start);
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
