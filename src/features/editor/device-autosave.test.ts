import { describe, expect, it } from "vitest";
import { createAppController } from "../../app/controller";
import { createInitialState } from "../../simulation/state";
import type { Projection, SimulationClient, WorkerRequest } from "../../runtime/messages";
import type { Device, Result } from "../../domain/types";
import {
  applyDevicePatch,
  enqueueDeviceEdit,
  extractDevicePatch,
  getInitialDraft,
  hasInvalidInput,
  hasPendingNetworkDiff,
  isDeviceApplying,
  syncDraftWithExternalDevice,
} from "./device-autosave";

type HostDevice = Extract<Device, { kind: "host" }>;
type RouterDevice = Extract<Device, { kind: "router" }>;

function createDeferredClient() {
  const pending: {
    request: WorkerRequest;
    resolve: (response: Result<Projection>) => void;
  }[] = [];
  const client: SimulationClient = {
    request(request) {
      return new Promise<Result<Projection>>((resolve) => {
        pending.push({ request, resolve });
      });
    },
    dispose() {
      pending.length = 0;
    },
  };
  const flushNext = async () => {
    const item = pending.shift();
    if (!item) return;
    const network =
      item.request.command.type === "load"
        ? item.request.command.network
        : { devices: [], links: [] };
    item.resolve({
      ok: true,
      value: {
        revision: item.request.revision,
        operationId: null,
        cursor: 0,
        frontier: 0,
        total: null,
        status: "idle",
        event: null,
        state: createInitialState(network),
      },
    });
    await new Promise((resolve) => setTimeout(resolve, 0));
  };
  const flushAll = async () => {
    while (pending.length > 0) {
      await flushNext();
    }
  };
  return { client, pending, flushNext, flushAll };
}

describe("device-autosave", () => {
  it("rejects incomplete/invalid inputs without enqueueing a network apply", () => {
    const host: HostDevice = {
      id: "host-1",
      kind: "host",
      ports: [{ id: "eth0", mac: "02:00:00:00:00:01", address: { ip: "192.168.1.", prefix: 24 } }],
      addressing: { mode: "manual", gateway: null },
    };
    expect(hasInvalidInput(host)).toBe(true);

    const routerWithEmptyRouteDest: RouterDevice = {
      id: "router-1",
      kind: "router",
      ports: [{ id: "eth0", mac: "02:00:00:00:00:02", address: null }],
      routes: [{ id: "r1", destination: { ip: "", prefix: 0 }, nextHop: null, outPortId: "eth0" }],
      dhcpScopes: [],
      nat: null,
    };
    expect(hasInvalidInput(routerWithEmptyRouteDest)).toBe(true);
  });

  it("preserves router DHCP scopes and NAT config when applying port/route patches", () => {
    const latestRouter: RouterDevice = {
      id: "router-1",
      kind: "router",
      ports: [
        { id: "eth0", mac: "02:00:00:00:00:01", address: { ip: "192.168.1.1", prefix: 24 } },
        { id: "eth1", mac: "02:00:00:00:00:02", address: { ip: "203.0.113.1", prefix: 24 } },
      ],
      routes: [],
      dhcpScopes: [
        {
          id: "dhcp-eth0",
          portId: "eth0",
          enabled: true,
          first: "192.168.1.100",
          last: "192.168.1.110",
          gateway: "192.168.1.1",
        },
      ],
      nat: {
        enabled: true,
        insidePortIds: ["eth0"],
        outsidePortId: "eth1",
        sourceNetworks: [{ ip: "192.168.1.0", prefix: 24 }],
      },
    };
    const staleDraft: RouterDevice = {
      ...latestRouter,
      ports: [
        { id: "eth0", mac: "02:00:00:00:00:01", address: { ip: "192.168.1.1", prefix: 24 } },
        { id: "eth1", mac: "02:00:00:00:00:02", address: { ip: "203.0.113.2", prefix: 24 } },
      ],
      dhcpScopes: [],
      nat: null,
    };
    const patch = extractDevicePatch(staleDraft)!;
    const merged = applyDevicePatch(latestRouter, patch) as RouterDevice;
    expect(merged.ports[1].address).toEqual({ ip: "203.0.113.2", prefix: 24 });
    expect(merged.dhcpScopes).toEqual(latestRouter.dhcpScopes);
    expect(merged.nat).toEqual(latestRouter.nat);
  });

  it("coalesces rapid edits while worker load is in flight and keeps unrelated device edits", async () => {
    const deferred = createDeferredClient();
    const controller = createAppController(deferred.client);

    const addHost1 = controller.dispatch({ type: "device.add", kind: "host" });
    await deferred.flushAll();
    await addHost1;

    const addHost2 = controller.dispatch({ type: "device.add", kind: "host" });
    await deferred.flushAll();
    await addHost2;

    const snap = controller.getSnapshot();
    const host1 = snap.document.network.devices[0] as HostDevice;
    const host2 = snap.document.network.devices[1] as HostDevice;

    // Rapid sequence on host-1: .1 starts in-flight, .10 and .100 coalesce while in-flight.
    enqueueDeviceEdit(
      controller,
      { ...host1, ports: [{ ...host1.ports[0], address: { ip: "192.168.1.1", prefix: 24 } }] },
      snap.viewEpoch,
    );
    enqueueDeviceEdit(
      controller,
      { ...host1, ports: [{ ...host1.ports[0], address: { ip: "192.168.1.10", prefix: 24 } }] },
      snap.viewEpoch,
    );
    enqueueDeviceEdit(
      controller,
      {
        ...host1,
        ports: [{ ...host1.ports[0], address: { ip: "192.168.1.100", prefix: 24 } }],
        addressing: { mode: "manual", gateway: "192.168.1.1" },
      },
      snap.viewEpoch,
    );
    // Edit host-2 while host-1 is still in-flight (simulates quick switch to another device).
    enqueueDeviceEdit(
      controller,
      { ...host2, ports: [{ ...host2.ports[0], address: { ip: "192.168.1.200", prefix: 24 } }] },
      snap.viewEpoch,
    );

    expect(isDeviceApplying(controller, "host-1")).toBe(true);
    // Reopening host-1 before drain finishes sees the queued latest patch.
    const reopened = getInitialDraft(
      controller,
      controller.getSnapshot().document.network.devices[0],
      snap.viewEpoch,
    ) as HostDevice;
    expect(reopened.ports[0].address?.ip).toBe("192.168.1.100");
    // Only 1 load request is in-flight right now (coalesced, not 4 concurrent loads).
    expect(deferred.pending).toHaveLength(1);

    await deferred.flushAll();

    const finalDevices = controller.getSnapshot().document.network.devices as HostDevice[];
    expect(finalDevices[0].ports[0].address).toEqual({ ip: "192.168.1.100", prefix: 24 });
    expect(finalDevices[0].addressing).toEqual({ mode: "manual", gateway: "192.168.1.1" });
    expect(finalDevices[1].ports[0].address).toEqual({ ip: "192.168.1.200", prefix: 24 });
    expect(isDeviceApplying(controller, "host-1")).toBe(false);
    expect(isDeviceApplying(controller, "host-2")).toBe(false);
  });

  it("syncs externally added/removed ports without wiping local draft edits", () => {
    const draft: RouterDevice = {
      id: "router-1",
      kind: "router",
      ports: [{ id: "eth0", mac: "02:00:00:00:00:01", address: { ip: "10.0.", prefix: 24 } }],
      routes: [],
      dhcpScopes: [],
      nat: null,
    };
    const external: RouterDevice = {
      ...draft,
      ports: [
        { id: "eth0", mac: "02:00:00:00:00:01", address: null },
        { id: "eth1", mac: "02:00:00:00:00:02", address: null },
      ],
    };
    const synced = syncDraftWithExternalDevice(draft, external) as RouterDevice;
    expect(synced.ports.map((p) => p.id)).toEqual(["eth0", "eth1"]);
    expect(synced.ports[0].address).toEqual({ ip: "10.0.", prefix: 24 });
    expect(hasPendingNetworkDiff(draft, external)).toBe(true);
  });

  it("waits for unrelated worker work before applying queued edits", async () => {
    const deferred = createDeferredClient();
    const controller = createAppController(deferred.client);
    const addingHost = controller.dispatch({ type: "device.add", kind: "host" });
    const { document, viewEpoch } = controller.getSnapshot();
    const host = document.network.devices[0] as HostDevice;
    enqueueDeviceEdit(
      controller,
      { ...host, ports: [{ ...host.ports[0], address: { ip: "10.0.0.1", prefix: 24 } }] },
      viewEpoch,
    );

    expect(deferred.pending).toHaveLength(1);
    expect(controller.getSnapshot().document.network.devices[0].ports[0].address).toBeNull();
    await deferred.flushNext();
    await addingHost;
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(deferred.pending).toHaveLength(1);
    await deferred.flushAll();
    expect(controller.getSnapshot().document.network.devices[0].ports[0].address)
      .toEqual({ ip: "10.0.0.1", prefix: 24 });
  });
});
