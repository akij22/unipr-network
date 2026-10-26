import { expect, it } from "vitest";
import { fixture, router, link } from "../../tests/fixtures/networks";
import { collectOperation } from "../../tests/helpers/engine";
import { createSimulator } from "./engine";
import { validateConfiguration } from "../domain/configuration";
it("acquires a configuration explicitly through DORA over UDP", () => {
  const engine = createSimulator(fixture("dhcp"));
  expect(engine.snapshot().dhcpClients.a).toBeNull();
  const events = collectOperation(engine, { kind: "dhcp", hostId: "a" });
  expect(
    events.filter((e) => e.kind.startsWith("dhcp.")).map((e) => e.kind),
  ).toEqual(["dhcp.discover", "dhcp.offer", "dhcp.request", "dhcp.ack"]);
  expect(engine.snapshot().dhcpClients.a).toMatchObject({
    ip: "192.168.1.100",
    prefix: 24,
    gateway: "192.168.1.1",
    leaseSeconds: 4294967295,
  });
  expect(events.at(-1)?.kind).toBe("operation.completed");
  const wire = events.find((e) => e.kind === "dhcp.discover")?.after[0];
  expect(wire?.payload).toMatchObject({
    src: "0.0.0.0",
    dst: "255.255.255.255",
    payload: { kind: "udp", srcPort: 68, dstPort: 67 },
  });
});
it("assigns different addresses and reuses the lease for a known client", () => {
  const engine = createSimulator(fixture("dhcp"));
  collectOperation(engine, { kind: "dhcp", hostId: "a" });
  collectOperation(engine, { kind: "dhcp", hostId: "b" });
  expect(engine.snapshot().dhcpClients.b?.ip).toBe("192.168.1.101");
  collectOperation(engine, { kind: "dhcp", hostId: "a" });
  expect(engine.snapshot().dhcpClients.a?.ip).toBe("192.168.1.100");
});
it("distinguishes an absent server from an exhausted pool", () => {
  const absent = collectOperation(createSimulator(fixture("dhcpNoServer")), {
    kind: "dhcp",
    hostId: "a",
  });
  expect(absent.at(-1)).toMatchObject({
    kind: "operation.failed",
    detail: { issue: { code: "DHCP_NO_SERVER" } },
  });
  const e = createSimulator(fixture("dhcpExhausted"));
  collectOperation(e, { kind: "dhcp", hostId: "a" });
  const full = collectOperation(e, { kind: "dhcp", hostId: "b" });
  expect(full.at(-1)).toMatchObject({
    kind: "operation.failed",
    detail: { issue: { code: "DHCP_POOL_EXHAUSTED" } },
  });
});
it("handles multiple server offers deterministically and frees unused reservations", () => {
  const n = fixture("dhcp"),
    r = router("r2", ["192.168.1.2"], 20);
  r.dhcpScopes = [
    {
      id: "other",
      portId: "eth0",
      enabled: true,
      first: "192.168.1.200",
      last: "192.168.1.210",
      gateway: "192.168.1.2",
    },
  ];
  n.devices.push(r);
  n.links.push(link("l4", "s1", "p4", "r2", "eth0"));
  const e = createSimulator(n),
    events = collectOperation(e, { kind: "dhcp", hostId: "a" });
  expect(events.filter((e) => e.kind === "dhcp.offer")).toHaveLength(2);
  expect(e.snapshot().dhcpClients.a?.ip).toBe("192.168.1.100");
  expect(e.snapshot().offers).toEqual({});
});
it("rejects DHCP scopes covering reserved addresses or point-to-point /31", () => {
  const n = fixture("dhcp"),
    r = n.devices.find((d) => d.kind === "router");
  if (r?.kind === "router") r.dhcpScopes[0].first = "192.168.1.0";
  expect(
    validateConfiguration(n).some((i) => i.code === "INVALID_DHCP_POOL"),
  ).toBe(true);
  if (r?.kind === "router") {
    r.dhcpScopes[0].first = "192.168.1.1";
    r.dhcpScopes[0].last = "192.168.1.2";
    r.ports[0].address!.prefix = 31;
  }
  expect(
    validateConfiguration(n).some((i) => i.code === "INVALID_DHCP_POOL"),
  ).toBe(true);
});
it("uses the acquired configuration for ping and does not relay broadcasts", () => {
  const engine = createSimulator(fixture("dhcp"));
  collectOperation(engine, { kind: "dhcp", hostId: "a" });
  collectOperation(engine, { kind: "dhcp", hostId: "b" });
  expect(
    collectOperation(engine, {
      kind: "ping",
      sourceId: "a",
      destination: "192.168.1.101",
    }).at(-1)?.kind,
  ).toBe("operation.completed");
  const n = fixture("dhcp");
  const r = n.devices.find((d) => d.kind === "router");
  if (r?.kind === "router") {
    r.dhcpScopes[0].portId = "eth1";
    r.dhcpScopes[0].first = "192.168.2.100";
    r.dhcpScopes[0].last = "192.168.2.110";
    r.dhcpScopes[0].gateway = "192.168.2.1";
  }
  const unreachable = collectOperation(createSimulator(n), {
    kind: "dhcp",
    hostId: "a",
  });
  expect(unreachable.at(-1)).toMatchObject({
    kind: "operation.failed",
    detail: { issue: { code: "DHCP_NO_SERVER" } },
  });
});
it("allows overlapping pools on isolated Ethernet domains", () => {
  const n = fixture("dhcpExhausted"),
    second = fixture("dhcpExhausted");
  // Give the disconnected copy new device identities and endpoint MAC addresses.
  for (const d of second.devices) {
    d.id += "-other";
    for (const p of d.ports)
      if (p.mac) p.mac = p.mac.replace("02:00:", "02:01:");
  }
  for (const l of second.links) {
    l.id += "-other";
    for (const end of l.ends) end.deviceId += "-other";
  }
  n.devices.push(...second.devices);
  n.links.push(...second.links);
  const engine = createSimulator(n);
  expect(
    collectOperation(engine, { kind: "dhcp", hostId: "a" }).at(-1)?.kind,
  ).toBe("operation.completed");
  expect(
    collectOperation(engine, { kind: "dhcp", hostId: "a-other" }).at(-1)?.kind,
  ).toBe("operation.completed");
  expect(engine.snapshot().dhcpClients["a-other"]?.ip).toBe("192.168.1.100");
});
it("reports duplicate participating DHCP server addresses instead of completing acquisition", () => {
  const n = fixture("dhcp"),
    other = router("r2", ["192.168.1.1"], 30);
  other.dhcpScopes = [
    {
      id: "scope",
      portId: "eth0",
      enabled: true,
      first: "192.168.1.120",
      last: "192.168.1.130",
      gateway: "192.168.1.1",
    },
  ];
  n.devices.push(other);
  n.links.push(link("other-server", "r2", "eth0", "s1", "p4"));
  const events = collectOperation(createSimulator(n), {
    kind: "dhcp",
    hostId: "a",
  });
  expect(events.at(-1)).toMatchObject({
    kind: "operation.failed",
    detail: { issue: { code: "DUPLICATE_IPV4" } },
  });
});
