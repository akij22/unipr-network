import type { Device, NetworkConfig, Port } from "../../src/domain/types";
const mac = (n: number) =>
  `02:00:00:00:${Math.floor(n / 256)
    .toString(16)
    .padStart(2, "0")}:${(n % 256).toString(16).padStart(2, "0")}`;
export function host(
  id: string,
  ip: string | null,
  n: number,
  gateway: string | null = null,
): Device {
  return {
    id,
    kind: "host",
    ports: [
      { id: "eth0", mac: mac(n), address: ip ? { ip, prefix: 24 } : null },
    ],
    addressing: { mode: "manual", gateway },
  };
}
export function router(
  id: string,
  ips: string[],
  n = 10,
): Extract<Device, { kind: "router" }> {
  return {
    id,
    kind: "router",
    ports: ips.map((ip, i) => ({
      id: `eth${i}`,
      mac: mac(n + i),
      address: { ip, prefix: 24 },
    })),
    routes: [],
    dhcpScopes: [],
    nat: null,
  };
}
export const fabric = (
  id: string,
  kind: "switch" | "hub" | "bridge",
  count = 4,
): Device => ({
  id,
  kind,
  ports: Array.from(
    { length: count },
    (_, i): Port => ({ id: `p${i + 1}`, mac: null, address: null }),
  ),
});
export function link(
  id: string,
  a: string,
  ap: string,
  b: string,
  bp: string,
): NetworkConfig["links"][number] {
  return {
    id,
    ends: [
      { deviceId: a, portId: ap },
      { deviceId: b, portId: bp },
    ],
  };
}
export type FixtureName =
  | "lan"
  | "routed"
  | "l2Loop"
  | "l3Ring"
  | "router31"
  | "duplicateIp"
  | "dhcp"
  | "dhcpNoServer"
  | "dhcpExhausted"
  | "dhcpMultipleServers"
  | "pat"
  | "doubleNat";
export function fixture(name: FixtureName): NetworkConfig {
  if (name === "lan" || name === "duplicateIp")
    return {
      devices: [
        host("a", "192.168.1.10", 1),
        host("b", name === "duplicateIp" ? "192.168.1.10" : "192.168.1.20", 2),
        fabric("s1", "switch"),
      ],
      links: [
        link("l1", "a", "eth0", "s1", "p1"),
        link("l2", "s1", "p2", "b", "eth0"),
      ],
    };
  if (name === "l2Loop")
    return {
      devices: [fabric("s1", "switch"), fabric("s2", "switch")],
      links: [
        link("l1", "s1", "p1", "s2", "p1"),
        link("l2", "s1", "p2", "s2", "p2"),
      ],
    };
  if (name === "l3Ring")
    return {
      devices: [
        router("r1", ["10.0.1.1", "10.0.3.1"], 10),
        router("r2", ["10.0.1.2", "10.0.2.1"], 20),
        router("r3", ["10.0.2.2", "10.0.3.2"], 30),
      ],
      links: [
        link("x", "r1", "eth0", "r2", "eth0"),
        link("y", "r2", "eth1", "r3", "eth0"),
        link("z", "r3", "eth1", "r1", "eth1"),
      ],
    };
  if (name === "router31") {
    const a = router("r1", ["10.0.0.0"], 10),
      b = router("r2", ["10.0.0.1"], 20);
    a.ports[0].address!.prefix = 31;
    b.ports[0].address!.prefix = 31;
    return { devices: [a, b], links: [link("l1", "r1", "eth0", "r2", "eth0")] };
  }
  const r = router("r1", [
    "192.168.1.1",
    name === "pat" || name === "doubleNat" ? "203.0.113.1" : "192.168.2.1",
  ]);
  if (name === "pat" || name === "doubleNat") {
    r.nat = {
      enabled: true,
      insidePortIds: ["eth0"],
      outsidePortId: "eth1",
      sourceNetworks: [{ ip: "192.168.1.0", prefix: 24 }],
    };
    return {
      devices: [
        host("a", "192.168.1.10", 1, "192.168.1.1"),
        host("b", "192.168.1.11", 2, "192.168.1.1"),
        fabric("s1", "switch"),
        r,
        host("remote", "203.0.113.10", 3, "203.0.113.1"),
      ],
      links: [
        link("l1", "a", "eth0", "s1", "p1"),
        link("l2", "b", "eth0", "s1", "p2"),
        link("l3", "s1", "p3", "r1", "eth0"),
        link("l4", "r1", "eth1", "remote", "eth0"),
      ],
    };
  }
  if (name.startsWith("dhcp")) {
    r.dhcpScopes = [
      {
        id: "scope1",
        portId: "eth0",
        enabled: name !== "dhcpNoServer",
        first: "192.168.1.100",
        last: name === "dhcpExhausted" ? "192.168.1.100" : "192.168.1.110",
        gateway: "192.168.1.1",
      },
    ];
    const a = host("a", null, 1),
      b = host("b", null, 2);
    if (a.kind === "host") a.addressing = { mode: "dhcp" };
    if (b.kind === "host") b.addressing = { mode: "dhcp" };
    return {
      devices: [a, b, fabric("s1", "switch"), r],
      links: [
        link("l1", "a", "eth0", "s1", "p1"),
        link("l2", "b", "eth0", "s1", "p2"),
        link("l3", "s1", "p3", "r1", "eth0"),
      ],
    };
  }
  return {
    devices: [
      host("a", "192.168.1.10", 1, "192.168.1.1"),
      fabric("s1", "switch"),
      r,
      host("b", "192.168.2.10", 2, "192.168.2.1"),
    ],
    links: [
      link("l1", "a", "eth0", "s1", "p1"),
      link("l2", "s1", "p2", "r1", "eth0"),
      link("l3", "r1", "eth1", "b", "eth0"),
    ],
  };
}
export function fanoutNetwork(hostCount: number): NetworkConfig {
  const s = fabric("s1", "switch", hostCount);
  return {
    devices: [
      s,
      ...Array.from({ length: hostCount }, (_, i) =>
        host(
          `h${i}`,
          `10.${Math.floor(i / 65000)}.${Math.floor(i / 250) % 250}.${(i % 250) + 1}`,
          i + 1,
        ),
      ),
    ],
    links: Array.from({ length: hostCount }, (_, i) =>
      link(`l${i}`, `h${i}`, "eth0", "s1", `p${i + 1}`),
    ),
  };
}
