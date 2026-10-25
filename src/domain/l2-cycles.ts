import type { NetworkConfig } from "./types";
export function findL2Cycles(config: NetworkConfig): string[][] {
  const devices = new Map(config.devices.map((d) => [d.id, d]));
  const node = (ref: { deviceId: string; portId: string }) => {
    const d = devices.get(ref.deviceId);
    return d && ["switch", "bridge", "hub"].includes(d.kind)
      ? d.id
      : `${ref.deviceId}/${ref.portId}`;
  };
  const parent = new Map<string, string>(),
    forest = new Map<string, { to: string; id: string }[]>(),
    cycles: string[][] = [];
  const root = (id: string): string => {
    while (parent.has(id) && parent.get(id) !== id) id = parent.get(id)!;
    return id;
  };
  for (const link of config.links) {
    const a = node(link.ends[0]),
      b = node(link.ends[1]);
    if (root(a) !== root(b)) {
      parent.set(root(a), root(b));
      forest.set(a, [...(forest.get(a) ?? []), { to: b, id: link.id }]);
      forest.set(b, [...(forest.get(b) ?? []), { to: a, id: link.id }]);
    } else {
      const stack = [{ at: a, path: [] as string[] }],
        seen = new Set<string>();
      while (stack.length) {
        const current = stack.pop()!;
        if (current.at === b) {
          cycles.push([...current.path, link.id]);
          break;
        }
        if (seen.has(current.at)) continue;
        seen.add(current.at);
        for (const edge of forest.get(current.at) ?? [])
          stack.push({ at: edge.to, path: [...current.path, edge.id] });
      }
    }
  }
  return cycles;
}
