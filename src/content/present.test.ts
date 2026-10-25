import { expect, it } from "vitest";
import { presentEvent } from "./present";
import { presentIssue } from "./issues.en";
import { issue } from "../domain/types";
import { emptyDocument } from "../app/controller";
import { fixture } from "../../tests/fixtures/networks";
import { createSimulator } from "../simulation/engine";
import { collectOperation } from "../../tests/helpers/engine";
it("explains why a packet uses the next hop with only the active protocols", () => {
  const doc = emptyDocument();
  doc.network = fixture("routed");
  doc.layout.a = { name: "Host A", x: 0, z: 0 };
  const events = collectOperation(createSimulator(doc.network), {
    kind: "ping",
    sourceId: "a",
    destination: "192.168.2.10",
  });
  const route = events.find((e) => e.kind === "route.selected")!;
  const shown = presentEvent(route, doc);
  expect(shown.summary).toContain("192.168.1.1");
  expect(shown.protocolIds).toEqual(["ipv4"]);
  expect(presentIssue(issue("NO_GATEWAY", ["a"]), doc)).toBe(
    "Host A cannot reach a network outside its own subnet because no default gateway is configured.",
  );
});
