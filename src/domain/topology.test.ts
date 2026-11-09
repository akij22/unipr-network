import { fixture } from "../../tests/fixtures/networks";
import { expect, it } from "vitest";
import { connectDevices, connectPorts } from "./topology";
import { validateConfiguration } from "./configuration";
import type { NetworkConfig } from "./types";
const network: NetworkConfig = {
  devices: [
    {
      id: "s",
      kind: "switch",
      ports: [
        { id: "p1", mac: null, address: null },
        { id: "p2", mac: null, address: null },
      ],
    },
    { id: "h", kind: "hub", ports: [{ id: "p1", mac: null, address: null }] },
  ],
  links: [],
};
it("connects available ports without mutating the input", () => {
  const linked = connectPorts(
    network,
    { deviceId: "s", portId: "p1" },
    { deviceId: "h", portId: "p1" },
    "l",
  );
  expect(linked.ok && linked.value.links).toHaveLength(1);
  expect(network.links).toHaveLength(0);
  if (linked.ok)
    expect(
      connectPorts(
        linked.value,
        { deviceId: "s", portId: "p2" },
        { deviceId: "h", portId: "p1" },
        "l2",
      ).ok,
    ).toBe(false);
});
it("rejects invalid ports and self connections", () => {
  expect(
    connectPorts(
      network,
      { deviceId: "s", portId: "missing" },
      { deviceId: "h", portId: "p1" },
      "x",
    ).ok,
  ).toBe(false);
  expect(
    connectPorts(
      network,
      { deviceId: "s", portId: "p1" },
      { deviceId: "s", portId: "p2" },
      "x",
    ).ok,
  ).toBe(false);
});
it("does not reject an unconfigured host as malformed input", () => {
  expect(
    validateConfiguration({
      devices: [
        {
          id: "a",
          kind: "host",
          ports: [{ id: "eth0", mac: "02:00:00:00:00:01", address: null }],
          addressing: { mode: "manual", gateway: null },
        },
      ],
      links: [],
    }),
  ).toEqual([]);
});
it("rejects duplicate cable identities and cables between ports of the same device", () => {
  const net = fixture("lan");
  net.links[1].id = net.links[0].id;
  expect(
    validateConfiguration(net).some((e) => e.code === "DUPLICATE_ID"),
  ).toBe(true);
  const loop = fixture("lan");
  loop.links = [
    {
      id: "self",
      ends: [
        { deviceId: "s1", portId: "p1" },
        { deviceId: "s1", portId: "p2" },
      ],
    },
  ];
  expect(
    validateConfiguration(loop).some((e) => e.code === "SELF_CONNECTION"),
  ).toBe(true);
});
it("rejects reserved manual endpoint addresses and switched /31 hosts, preserving direct router /31 links", () => {
  for (const ip of ["192.168.1.0", "192.168.1.255"]) {
    const n = fixture("lan");
    n.devices[1].ports[0].address = { ip, prefix: 24 };
    expect(
      validateConfiguration(n).some(
        (e) => e.code === "INVALID_ENDPOINT_ADDRESS",
      ),
    ).toBe(true);
  }
  const switched = fixture("lan");
  switched.devices[0].ports[0].address = { ip: "10.0.0.0", prefix: 31 };
  switched.devices[1].ports[0].address = { ip: "10.0.0.1", prefix: 31 };
  expect(
    validateConfiguration(switched).some(
      (e) => e.code === "UNSUPPORTED_31_LINK",
    ),
  ).toBe(true);
  expect(validateConfiguration(fixture("router31"))).toEqual([]);
});

it("automatically connects the first free existing ports in stored order", () => {
  const config: NetworkConfig = {
    devices: [
      { id: "s", kind: "switch", ports: ["z", "b", "a"].map((id) => ({ id, mac: null, address: null })) },
      { id: "t", kind: "switch", ports: ["z", "c", "a"].map((id) => ({ id, mac: null, address: null })) },
    ],
    links: [{ id: "existing", ends: [{ deviceId: "t", portId: "z" }, { deviceId: "s", portId: "z" }] }],
  };
  const before = structuredClone(config);
  const result = connectDevices(config, "s", "t", "new");
  expect(result).toEqual({ ok: true, value: { ...before, links: [...before.links, {
    id: "new", ends: [{ deviceId: "s", portId: "b" }, { deviceId: "t", portId: "c" }],
  }] } });
  expect(config).toEqual(before);
});
it.each([
  ["missing", "h", "PORT_NOT_FOUND", "missing"],
  ["s", "missing", "PORT_NOT_FOUND", "missing"],
  ["s", "s", "SELF_CONNECTION", "s"],
  ["h", "s", "PORT_OCCUPIED", "h"],
  ["s", "h", "PORT_OCCUPIED", "h"],
])("rejects automatic connection %s to %s atomically", (source, target, code, deviceId) => {
  const config = structuredClone(network);
  config.links = [{ id: "existing", ends: [{ deviceId: "s", portId: "p1" }, { deviceId: "h", portId: "p1" }] }];
  const before = structuredClone(config);
  expect(connectDevices(config, source, target, "new")).toMatchObject({
    ok: false, issue: { code, category: "input", deviceIds: [deviceId] },
  });
  expect(config).toEqual(before);
});
it("does not create a port on a device without ports", () => {
  const config = structuredClone(network);
  config.devices[1].ports = [];
  expect(connectDevices(config, "s", "h", "new")).toMatchObject({
    ok: false, issue: { code: "PORT_OCCUPIED", category: "input" },
  });
  expect(config.devices[1].ports).toEqual([]);
});
it("retains connectPorts duplicate cable validation for automatic connections", () => {
  const config = fixture("l2Loop");
  expect(connectDevices(config, "s1", "s2", "l1")).toMatchObject({
    ok: false, issue: { code: "DUPLICATE_ID", category: "input" },
  });
});
