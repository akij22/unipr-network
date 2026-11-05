import { expect, it } from "vitest";
import {
  buildFlowView,
  canvasToLayout,
  layoutToCanvas,
  packetPosition,
  viewToViewport,
  viewportToView,
  FLOW_SCALE,
} from "./flow-view";
import { emptyDocument } from "../../../app/controller";
import { fixture } from "../../../../tests/fixtures/networks";
import { createInitialState } from "../../../simulation/state";
import type { Projection } from "../../../runtime/messages";

const idleProjection = (network: ReturnType<typeof fixture>): Projection => ({
  revision: 1,
  operationId: null,
  cursor: 0,
  frontier: 0,
  total: null,
  status: "idle",
  event: null,
  state: createInitialState(network),
});

it("maps a legacy x/z layout onto the canvas x/y plane", () => {
  expect(layoutToCanvas(-4, 2)).toEqual({ x: -4 * FLOW_SCALE, y: 2 * FLOW_SCALE });
  expect(canvasToLayout(-4 * FLOW_SCALE, 2 * FLOW_SCALE)).toEqual({ x: -4, z: 2 });
});

it("round-trips a dragged canvas position back to the layout grid", () => {
  const dragged = canvasToLayout(1.56 * FLOW_SCALE, -0.51 * FLOW_SCALE);
  expect(dragged).toEqual({ x: 2, z: -1 });
});

it("projects selection and real links without inventing connections", () => {
  const document = emptyDocument();
  document.network = fixture("lan");
  document.layout = {
    a: { name: "Host A", x: -4, z: 0 },
    b: { name: "Host B", x: 4, z: 0 },
    s1: { name: "Switch 1", x: 0, z: 0 },
  };
  const view = buildFlowView(document, idleProjection(document.network), {
    kind: "device",
    id: "a",
  });
  expect(view.devices).toHaveLength(3);
  expect(view.devices.find((d) => d.id === "a")?.selected).toBe(true);
  expect(view.links).toHaveLength(2);
  expect(view.links.map((l) => [l.source, l.target])).toEqual([
    ["a", "s1"],
    ["s1", "b"],
  ]);
});

it("keeps a stored device on its saved grid position", () => {
  const document = emptyDocument();
  document.network = fixture("lan");
  document.layout = {
    a: { name: "Host A", x: -4, z: 0 },
    b: { name: "Host B", x: 4, z: 0 },
    s1: { name: "Switch 1", x: 0, z: 0 },
  };
  const view = buildFlowView(document, null, null);
  const host = view.devices.find((d) => d.id === "a");
  expect(host?.layoutX).toBe(-4);
  expect(host?.layoutY).toBe(0);
  expect(host?.x).toBe(-4 * FLOW_SCALE);
  expect(host?.y).toBe(0);
});

it("highlights exactly the connections identified by an L2-loop failure", () => {
  const document = emptyDocument();
  document.network = fixture("lan");
  document.layout = Object.fromEntries(
    document.network.devices.map((d, i) => [
      d.id,
      { name: d.id, x: i * 3, z: 0 },
    ]),
  );
  const problem = {
    code: "L2_LOOP",
    category: "model" as const,
    deviceIds: [],
    linkIds: ["l2"],
    params: {},
  };
  const view = buildFlowView(document, null, null, problem);
  expect(view.links.filter((l) => l.faulty).map((l) => l.id)).toEqual(["l2"]);
  expect(view.links.filter((l) => l.active)).toHaveLength(0);
});

it("keeps legacy camera poses distinct from a saved canvas viewport", () => {
  const legacy = emptyDocument().view;
  expect(viewToViewport(legacy)).toBeNull();
  expect(viewToViewport({ ...legacy, cameraPosition: [12, 14, 0.5] })).toBeNull();
  const viewport = { x: 240, y: -80, zoom: 0.5 };
  const saved = viewportToView(viewport, legacy);
  expect(saved.cameraPosition).toEqual(legacy.cameraPosition);
  expect(saved.target).toEqual(legacy.target);
  expect(viewToViewport(saved)).toEqual(viewport);
});

it("places a packet on the link and flips it when the event is reversed", () => {
  const link = {
    id: "l1",
    source: "a",
    target: "b",
    active: true,
    faulty: false,
    selected: false,
    reverse: false,
  };
  const packet = { id: "p1", rootId: "r1", linkId: "l1", at: 0.25 };
  const forward = packetPosition(link, packet, { x: 0, y: 0 }, { x: 100, y: 0 });
  expect(forward).toEqual({ x: 25, y: 0 });
  const reversed = packetPosition(
    { ...link, reverse: true },
    packet,
    { x: 0, y: 0 },
    { x: 100, y: 0 },
  );
  expect(reversed).toEqual({ x: 75, y: 0 });
});
