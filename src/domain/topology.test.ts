import { fixture } from "../../tests/fixtures/networks";
import { expect, it } from "vitest";
import { connectPorts } from "./topology";
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
