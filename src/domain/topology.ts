import {
  fail,
  issue,
  ok,
  type NetworkConfig,
  type PortRef,
  type Result,
} from "./types";
export const portKey = (ref: PortRef) => `${ref.deviceId}/${ref.portId}`;
export function connectedEndpoints(
  config: NetworkConfig,
  start: PortRef,
): PortRef[] {
  const endpoints: PortRef[] = [],
    pending = [start],
    seen = new Set<string>(),
    devices = new Map(config.devices.map((d) => [d.id, d]));
  while (pending.length) {
    const ref = pending.pop()!;
    if (seen.has(portKey(ref))) continue;
    seen.add(portKey(ref));
    const d = devices.get(ref.deviceId);
    if (!d) continue;
    if (d.kind === "host" || d.kind === "router") endpoints.push(ref);
    else
      for (const p of d.ports)
        if (p.id !== ref.portId) pending.push({ deviceId: d.id, portId: p.id });
    for (const link of config.links) {
      const i = link.ends.findIndex((end) => portKey(end) === portKey(ref));
      if (i >= 0) pending.push(link.ends[1 - i]);
    }
  }
  return endpoints;
}
export function connectPorts(
  config: NetworkConfig,
  from: PortRef,
  to: PortRef,
  id: string,
): Result<NetworkConfig> {
  if (from.deviceId === to.deviceId)
    return fail(issue("SELF_CONNECTION", [from.deviceId], {}, "input"));
  for (const ref of [from, to]) {
    if (
      !config.devices
        .find((d) => d.id === ref.deviceId)
        ?.ports.some((p) => p.id === ref.portId)
    )
      return fail(issue("PORT_NOT_FOUND", [ref.deviceId], {}, "input"));
    if (
      config.links.some((l) =>
        l.ends.some((end) => portKey(end) === portKey(ref)),
      )
    )
      return fail(issue("PORT_OCCUPIED", [ref.deviceId], {}, "input"));
  }
  if (config.links.some((l) => l.id === id))
    return fail(issue("DUPLICATE_ID", [], {}, "input"));
  return ok({ ...config, links: [...config.links, { id, ends: [from, to] }] });
}

export function connectDevices(
  config: NetworkConfig,
  sourceId: string,
  targetId: string,
  id: string,
): Result<NetworkConfig> {
  if (sourceId === targetId)
    return fail(issue("SELF_CONNECTION", [sourceId], {}, "input"));
  const source = config.devices.find((device) => device.id === sourceId),
    target = config.devices.find((device) => device.id === targetId);
  if (!source || !target)
    return fail(issue("PORT_NOT_FOUND", [!source ? sourceId : targetId], {}, "input"));
  const occupied = new Set(config.links.flatMap((link) => link.ends.map(portKey)));
  const from = source.ports.find(
    (port) => !occupied.has(portKey({ deviceId: sourceId, portId: port.id })),
  ),
    to = target.ports.find(
      (port) => !occupied.has(portKey({ deviceId: targetId, portId: port.id })),
    );
  if (!from || !to)
    return fail(issue("PORT_OCCUPIED", [!from ? sourceId : targetId], {}, "input"));
  return connectPorts(
    config,
    { deviceId: sourceId, portId: from.id },
    { deviceId: targetId, portId: to.id },
    id,
  );
}
