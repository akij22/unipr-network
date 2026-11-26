import type { NetworkDocument, AppState } from "../../../app/types";
import type { Projection } from "../../../runtime/messages";
import { addressOf } from "../../../simulation/ipv4";
import type { Device, DeviceKind } from "../../../domain/types";

/** Canvas units per layout unit. The stored layout uses small integers
 * (x/z) that were grid steps in the 3D lab; the canvas uses 48 pixels per
 * grid step so a legacy document keeps its relative geometry. */
export const FLOW_SCALE = 48;

export type FlowDevice = {
  id: string;
  kind: DeviceKind;
  name: string;
  /** Canvas position (React Flow units). Derived from the stored layout x/z. */
  x: number;
  y: number;
  /** Stored layout position, kept for exact round-tripping on drag. */
  layoutX: number;
  layoutY: number;
  selected: boolean;
  /** Compact visible summary lines shown below the device icon on the canvas. */
  details: string[];
};

export type FlowLink = {
  id: string;
  source: string;
  target: string;
  /** The link carries traffic in the current event. */
  active: boolean;
  /** The link is named by the current failure. */
  faulty: boolean;
  selected: boolean;
  /** The current event travels from target back to source. */
  reverse: boolean;
};

export type FlowPacket = {
  id: string;
  rootId: string;
  linkId: string;
  /** Fraction along the link where the packet sits, 0 = source end. */
  at: number;
};

export type FlowView = {
  devices: FlowDevice[];
  links: FlowLink[];
  packets: FlowPacket[];
};

/** Map a stored layout position onto the canvas. The legacy document stores
 * x and z; the canvas uses x and y, so z becomes y. */
export function layoutToCanvas(x: number, z: number) {
  return { x: x * FLOW_SCALE, y: z * FLOW_SCALE };
}

/** Map a canvas position back onto the stored layout grid. */
export function canvasToLayout(x: number, y: number) {
  return {
    x: Math.round(x / FLOW_SCALE),
    z: Math.round(y / FLOW_SCALE),
  };
}

function portCountLabel(count: number): string {
  return `${count} ${count === 1 ? "port" : "ports"}`;
}

export function deviceDetails(
  device: Device,
  projection: Projection | null,
): string[] {
  if (device.kind === "host") {
    const port = device.ports[0];
    const addr = port ? addressOf(device, port, projection?.state) : null;
    if (device.addressing.mode === "dhcp") {
      return [addr ? `${addr.ip}/${addr.prefix} · DHCP` : "DHCP pending"];
    }
    return [addr ? `${addr.ip}/${addr.prefix}` : "No IPv4"];
  }
  if (device.kind === "router") {
    const configured = device.ports
      .map((p) => ({ portId: p.id, addr: addressOf(device, p, projection?.state) }))
      .filter(
        (entry): entry is { portId: string; addr: NonNullable<typeof entry.addr> } =>
          entry.addr !== null,
      );
    if (configured.length === 0) return [portCountLabel(device.ports.length)];
    if (configured.length <= 2) {
      return configured.map(
        ({ portId, addr }) => `${portId} ${addr.ip}/${addr.prefix}`,
      );
    }
    const first = configured[0];
    return [
      `${first.portId} ${first.addr.ip}/${first.addr.prefix}`,
      `+${configured.length - 1} more · ${portCountLabel(device.ports.length)}`,
    ];
  }
  return [portCountLabel(device.ports.length)];
}

export function buildFlowView(
  document: NetworkDocument,
  projection: Projection | null,
  selection: AppState["selection"],
  problem: AppState["issue"] = null,
): FlowView {
  const devices: FlowDevice[] = document.network.devices.map((d) => {
    const placed = document.layout[d.id];
    const layoutX = placed?.x ?? 0;
    const layoutY = placed?.z ?? 0;
    const position = layoutToCanvas(layoutX, layoutY);
    return {
      id: d.id,
      kind: d.kind,
      name: placed?.name ?? d.id,
      x: position.x,
      y: position.y,
      layoutX,
      layoutY,
      selected: selection?.kind === "device" && selection.id === d.id,
      details: deviceDetails(d, projection),
    };
  });
  const byId = new Map(devices.map((d) => [d.id, d]));
  const links: FlowLink[] = [];
  for (const l of document.network.links) {
    const source = byId.get(l.ends[0].deviceId);
    const target = byId.get(l.ends[1].deviceId);
    if (!source || !target) continue;
    links.push({
      id: l.id,
      source: source.id,
      target: target.id,
      active: (projection?.event?.linkIds.includes(l.id) ?? false) && !problem?.linkIds.includes(l.id),
      faulty: !!problem?.linkIds.includes(l.id),
      selected: selection?.kind === "link" && selection.id === l.id,
      reverse: projection?.event?.deviceIds[0] === target.id,
    });
  }
  const packets: FlowPacket[] = (projection?.event?.after ?? []).flatMap(
    (f, i) => {
      const linkId =
        projection?.event?.linkIds[i] ?? projection?.event?.linkIds[0];
      return linkId
        ? [{ id: f.id, rootId: f.rootId, linkId, at: 0.55 }]
        : [];
    },
  );
  return { devices, links, packets };
}

/** Legacy camera fields stay intact. A missing viewport requests an initial
 * fit of the topology instead of interpreting a 3D camera as canvas pixels. */
export type FlowViewport = { x: number; y: number; zoom: number };
export const MIN_ZOOM = 0.2;
export const MAX_ZOOM = 2.5;

export function viewToViewport(view: NetworkDocument["view"]): FlowViewport | null {
  return view.viewport ?? null;
}

export function viewportToView(
  viewport: FlowViewport,
  current: NetworkDocument["view"],
): NetworkDocument["view"] {
  return { ...current, viewport: { ...viewport } };
}

/** A link's packet markers are laid out along the edge in canvas space. The
 * direction follows the current event: reversed links travel the other way. */
export function packetPosition(
  link: FlowLink,
  packet: FlowPacket,
  source: { x: number; y: number },
  target: { x: number; y: number },
) {
  const at = link.reverse ? 1 - packet.at : packet.at;
  return {
    x: source.x + (target.x - source.x) * at,
    y: source.y + (target.y - source.y) * at,
  };
}
