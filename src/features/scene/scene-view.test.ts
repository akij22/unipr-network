import { expect, it } from "vitest";
import { buildSceneView } from "./scene-view";
import { emptyDocument } from "../../app/controller";
import { fixture } from "../../../tests/fixtures/networks";
import { createInitialState } from "../../simulation/state";
import type { Projection } from "../../runtime/messages";
it("projects selection and frame copies without inventing a single broadcast path", () => {
  const document = emptyDocument();
  document.network = fixture("lan");
  document.layout = {
    a: { name: "Host A", x: -4, z: 0 },
    b: { name: "Host B", x: 4, z: 0 },
    s1: { name: "Switch 1", x: 0, z: 0 },
  };
  const projection: Projection = {
    revision: 1,
    operationId: null,
    cursor: 0,
    frontier: 0,
    total: null,
    status: "idle",
    event: null,
    state: createInitialState(document.network),
  };
  const view = buildSceneView(document, projection, {
    kind: "device",
    id: "a",
  });
  expect(view.devices).toHaveLength(3);
  expect(view.devices.find((d) => d.id === "a")?.selected).toBe(true);
  expect(view.links).toHaveLength(2);
});
it("highlights exactly the connections identified by an L2-loop failure", () => {
  const doc = emptyDocument();
  doc.network = fixture("lan");
  doc.layout = Object.fromEntries(
    doc.network.devices.map((d, i) => [d.id, { name: d.id, x: i * 3, z: 0 }]),
  );
  const problem = {
    code: "L2_LOOP",
    category: "model" as const,
    deviceIds: [],
    linkIds: ["l2"],
    params: {},
  };
  const view = buildSceneView(doc, null, null, problem);
  expect(view.links.filter((l) => l.active).map((l) => l.id)).toEqual(["l2"]);
});
