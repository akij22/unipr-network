export type DeviceKind = "host" | "router" | "switch" | "bridge" | "hub";
export type IPv4Address = { ip: string; prefix: number };
export type PortRef = { deviceId: string; portId: string };
export type Port = {
  id: string;
  mac: string | null;
  address: IPv4Address | null;
};
export type Route = {
  id: string;
  destination: IPv4Address;
  nextHop: string | null;
  outPortId: string;
};
export type DhcpScope = {
  id: string;
  portId: string;
  enabled: boolean;
  first: string;
  last: string;
  gateway: string;
};
export type NatConfig = {
  enabled: boolean;
  insidePortIds: string[];
  outsidePortId: string;
  sourceNetworks: IPv4Address[];
};
export type Device = { id: string; ports: Port[] } & (
  | {
      kind: "host";
      addressing: { mode: "manual"; gateway: string | null } | { mode: "dhcp" };
    }
  | {
      kind: "router";
      routes: Route[];
      dhcpScopes: DhcpScope[];
      nat: NatConfig | null;
    }
  | { kind: "switch" | "bridge" | "hub" }
);
export type NetworkConfig = {
  devices: Device[];
  links: { id: string; ends: [PortRef, PortRef] }[];
};
export type Issue = {
  code: string;
  category: "input" | "model" | "network" | "resource";
  deviceIds: string[];
  linkIds: string[];
  params: Record<string, string | number>;
};
export type Result<T> = { ok: true; value: T } | { ok: false; issue: Issue };
export function issue(
  code: string,
  deviceIds: string[] = [],
  params: Issue["params"] = {},
  category: Issue["category"] = "network",
  linkIds: string[] = [],
): Issue {
  return { code, category, deviceIds, linkIds, params };
}
export const ok = <T>(value: T): Result<T> => ({ ok: true, value });
export const fail = <T = never>(problem: Issue): Result<T> => ({
  ok: false,
  issue: problem,
});
