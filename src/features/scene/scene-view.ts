import type { NetworkDocument, AppState } from "../../app/types";
import type { Projection } from "../../runtime/messages";
import { addressOf } from "../../simulation/ipv4";
import type { DeviceKind } from "../../domain/types";
export type SceneDevice = {
  id: string;
  kind: DeviceKind;
  name: string;
  x: number;
  z: number;
  selected: boolean;
  ip: string;
  ports: number;
};
export type SceneLink = {
  id: string;
  from: [number, number, number];
  to: [number, number, number];
  active: boolean;
  selected: boolean;
  reverse: boolean;
};
export type SceneView = {
  devices: SceneDevice[];
  links: SceneLink[];
  packets: { id: string; rootId: string; linkId: string }[];
};
export function buildSceneView(
  document: NetworkDocument,
  projection: Projection | null,
  selection: AppState["selection"],
): SceneView {
  const devices = document.network.devices.map((d) => ({
    id: d.id,
    kind: d.kind,
    name: document.layout[d.id]?.name ?? d.id,
    x: document.layout[d.id]?.x ?? 0,
    z: document.layout[d.id]?.z ?? 0,
    selected: selection?.kind === "device" && selection.id === d.id,
    ip: d.ports
      .map((p) => addressOf(d, p, projection?.state)?.ip)
      .filter(Boolean)
      .join(" · "),
    ports: d.ports.length,
  }));
  const links = document.network.links.flatMap((l) => {
    const a = devices.find((d) => d.id === l.ends[0].deviceId),
      b = devices.find((d) => d.id === l.ends[1].deviceId);
    return a && b
      ? [
          {
            id: l.id,
            from: [a.x, 0.18, a.z] as [number, number, number],
            to: [b.x, 0.18, b.z] as [number, number, number],
            active: projection?.event?.linkIds.includes(l.id) ?? false,
            selected: selection?.kind === "link" && selection.id === l.id,
            reverse: projection?.event?.deviceIds[0] === b.id,
          },
        ]
      : [];
  });
  const packets = (projection?.event?.after ?? []).flatMap((f, i) => {
    const linkId =
      projection?.event?.linkIds[i] ?? projection?.event?.linkIds[0];
    return linkId ? [{ id: f.id, rootId: f.rootId, linkId }] : [];
  });
  return { devices, links, packets };
}
