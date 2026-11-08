import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { createAppController } from "../../app/controller";
import { createSession } from "../../runtime/session";
import { memoryJournal } from "../../../tests/helpers/memory-journal";
import { EventSummary } from "./EventSummary";

it("does not show a reconnect panel while loading an added device", async () => {
  const session = createSession({ devices: [], links: [] }, 0, memoryJournal());
  let release!: () => void;
  const gate = new Promise<void>((resolve) => { release = resolve; });
  const app = createAppController({
    async request(request) {
      await gate;
      return session.handle(request);
    },
    dispose() {},
  });
  const addition = app.dispatch({ type: "device.add", kind: "host" });
  expect(app.getSnapshot().busy).toBe(true);
  const markup = renderToStaticMarkup(createElement(EventSummary, { controller: app }));
  release();
  await addition;
  app.dispose();
  expect(markup).toContain('data-sim-status="idle"');
  expect(markup).not.toContain("Simulation needs to reconnect");
});

it("still shows recovery feedback when loading the configuration fails", async () => {
  const app = createAppController({
    async request() {
      return {
        ok: false as const,
        issue: { code: "WORKER_FAILURE", category: "resource" as const, deviceIds: [], linkIds: [], params: {} },
      };
    },
    dispose() {},
  });
  await app.dispatch({ type: "device.add", kind: "host" });
  const markup = renderToStaticMarkup(createElement(EventSummary, { controller: app }));
  app.dispose();
  expect(markup).toContain('data-sim-status="resource-error"');
  expect(markup).toContain("Simulation needs to reconnect");
});
