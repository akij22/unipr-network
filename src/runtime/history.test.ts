import "fake-indexeddb/auto";
import { expect, it } from "vitest";
import { openDatabase } from "../storage/database";
import { createJournal } from "../storage/journal";
import { createHistory } from "./history";
import { createSimulator } from "../simulation/engine";
import { fixture } from "../../tests/fixtures/networks";
it("restores earlier events from IndexedDB after the memory window is evicted", async () => {
  const db = await openDatabase("history-test"),
    history = createHistory(createJournal(db), "large", 2);
  const engine = createSimulator(fixture("routed"));
  engine.start(
    { kind: "ping", sourceId: "a", destination: "192.168.2.10" },
    "large",
  );
  await history.initialize(engine.snapshot());
  let first: ReturnType<typeof engine.snapshot> | null = null;
  for (let i = 0; i < 10000; i++) {
    const next = engine.advance(128);
    if (next.kind === "done") break;
    if (next.kind === "event") {
      if (!first) first = next.state;
      await history.append(next.event, next.state);
    }
  }
  const restored = await history.at(1);
  expect(restored.state).toEqual(first);
  expect(restored.event?.index).toBe(1);
  await history.clear();
  db.close();
});
it("restores a cold checkpoint beyond step fifty including a pending broadcast", async () => {
  const { fanoutNetwork } = await import("../../tests/fixtures/networks");
  const db = await openDatabase("checkpoint-history"),
    history = createHistory(createJournal(db), "checkpoint", 2),
    engine = createSimulator(fanoutNetwork(100));
  engine.start(
    { kind: "ping", sourceId: "h0", destination: "10.0.0.2" },
    "checkpoint",
  );
  await history.initialize(engine.snapshot());
  let expected: ReturnType<typeof engine.snapshot> | null = null;
  for (let i = 0; i < 1000; i++) {
    const next = engine.advance(128);
    if (next.kind === "done") break;
    if (next.kind === "event") {
      if (next.event.index === 51) expected = next.state;
      await history.append(next.event, next.state);
    }
  }
  expect(expected).not.toBeNull();
  const restored = await history.at(51);
  expect(restored.state).toEqual(expected);
  expect(restored.event?.index).toBe(51);
  await history.clear();
  db.close();
});
