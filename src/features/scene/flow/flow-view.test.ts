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

it("builds compact canvas details for hosts, DHCP states, routers, and L2 devices", () => {
  const document = emptyDocument();
  document.network = {
    devices: [
      {
        id: "h-manual",
        kind: "host",
        ports: [{ id: "eth0", mac: "02:00:00:00:00:01", address: { ip: "192.168.1.10", prefix: 24 } }],
        addressing: { mode: "manual", gateway: null },
      },
      {
        id: "h-empty",
        kind: "host",
        ports: [{ id: "eth0", mac: "02:00:00:00:00:02", address: null }],
        addressing: { mode: "manual", gateway: null },
      },
      {
        id: "h-dhcp-pending",
        kind: "host",
        ports: [{ id: "eth0", mac: "02:00:00:00:00:03", address: null }],
        addressing: { mode: "dhcp" },
      },
      {
        id: "h-dhcp-leased",
        kind: "host",
        ports: [{ id: "eth0", mac: "02:00:00:00:00:04", address: null }],
        addressing: { mode: "dhcp" },
      },
      {
        id: "r-empty",
        kind: "router",
        ports: [
          { id: "eth0", mac: "02:00:00:00:00:05", address: null },
          { id: "eth1", mac: "02:00:00:00:00:06", address: null },
        ],
        routes: [],
        dhcpScopes: [],
        nat: null,
      },
      {
        id: "r-configured",
        kind: "router",
        ports: [
          { id: "eth0", mac: "02:00:00:00:00:07", address: { ip: "192.168.1.1", prefix: 24 } },
          { id: "eth1", mac: "02:00:00:00:00:08", address: { ip: "192.168.2.1", prefix: 24 } },
        ],
        routes: [],
        dhcpScopes: [],
        nat: null,
      },
      {
        id: "r-many",
        kind: "router",
        ports: [
          { id: "eth0", mac: "02:00:00:00:00:09", address: { ip: "10.0.0.1", prefix: 24 } },
          { id: "eth1", mac: "02:00:00:00:00:0a", address: { ip: "10.0.1.1", prefix: 24 } },
          { id: "eth2", mac: "02:00:00:00:00:0b", address: { ip: "10.0.2.1", prefix: 24 } },
        ],
        routes: [],
        dhcpScopes: [],
        nat: null,
      },
      {
        id: "sw-1",
        kind: "switch",
        ports: [
          { id: "p1", mac: null, address: null },
          { id: "p2", mac: null, address: null },
          { id: "p3", mac: null, address: null },
          { id: "p4", mac: null, address: null },
        ],
      },
    ],
    links: [],
  };
  document.layout = Object.fromEntries(
    document.network.devices.map((d, i) => [d.id, { name: d.id, x: i * 4, z: 0 }]),
  );
  const projection = idleProjection(document.network);
  projection.state.dhcpClients["h-dhcp-leased"] = {
    clientMac: "02:00:00:00:00:04",
    ip: "192.168.1.100",
    prefix: 24,
    gateway: "192.168.1.1",
    scopeId: "dhcp-eth0",
    leaseSeconds: 4294967295,
  };
  const view = buildFlowView(document, projection, null);
  const detailsOf = (id: string) => view.devices.find((d) => d.id === id)?.details;

  expect(detailsOf("h-manual")).toEqual(["192.168.1.10/24"]);
  expect(detailsOf("h-empty")).toEqual(["No IPv4"]);
  expect(detailsOf("h-dhcp-pending")).toEqual(["DHCP pending"]);
  expect(detailsOf("h-dhcp-leased")).toEqual(["192.168.1.100/24 · DHCP"]);
  expect(detailsOf("r-empty")).toEqual(["2 ports"]);
  expect(detailsOf("r-configured")).toEqual([
    "eth0 192.168.1.1/24",
    "eth1 192.168.2.1/24",
  ]);
  expect(detailsOf("r-many")).toEqual(["eth0 10.0.0.1/24", "+2 more · 3 ports"]);
  expect(detailsOf("sw-1")).toEqual(["4 ports"]);
});
