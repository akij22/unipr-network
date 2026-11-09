import { expect, it, vi } from "vitest";
import { createAppController, emptyDocument } from "./controller";
import { createSession } from "../runtime/session";
import { memoryJournal } from "../../tests/helpers/memory-journal";
import { fixture } from "../../tests/fixtures/networks";
function make() {
  const session = createSession({ devices: [], links: [] }, 0, memoryJournal());
  return createAppController({
    request: (r) => session.handle(r),
    dispose() {},
  });
}
it("adds five device types and preserves network state through visual edits", async () => {
  const app = make();
  for (const kind of ["host", "router", "switch", "bridge", "hub"] as const)
    await app.dispatch({ type: "device.add", kind });
  expect(app.getSnapshot().document.network.devices).toHaveLength(5);
  const revision = app.getSnapshot().projection.revision,
    mac = app.getSnapshot().document.network.devices[0].ports[0].mac;
  await app.dispatch({ type: "device.move", id: "host-1", x: 4, z: 2 });
  await app.dispatch({ type: "device.rename", id: "host-1", name: "My host" });
  expect(app.getSnapshot().projection.revision).toBe(revision);
  expect(app.getSnapshot().document.network.devices[0].ports[0].mac).toBe(mac);
});
it("leaves the inspector closed when adding the first device", async () => {
  const app = make();
  await app.dispatch({ type: "device.add", kind: "host" });
  expect(app.getSnapshot().selection).toBeNull();
  expect(app.getSnapshot().document.network.devices.map((d) => d.id)).toEqual(["host-1"]);
});
it("clears an explicitly selected device when adding another device", async () => {
  const app = make();
  await app.dispatch({ type: "device.add", kind: "host" });
  await app.dispatch({ type: "selection.set", selection: { kind: "device", id: "host-1" } });
  expect(app.getSnapshot().selection).toEqual({ kind: "device", id: "host-1" });
  const first = structuredClone(app.getSnapshot().document.network.devices[0]);
  await app.dispatch({ type: "device.add", kind: "switch" });
  expect(app.getSnapshot().selection).toBeNull();
  expect(app.getSnapshot().document.network.devices).toHaveLength(2);
  expect(app.getSnapshot().document.network.devices[0]).toEqual(first);
  expect(app.getSnapshot().document.network.devices[1].id).toBe("switch-1");
});
it("creates a cable using two explicit port selections", async () => {
  const app = make();
  await app.dispatch({ type: "device.add", kind: "host" });
  await app.dispatch({ type: "device.add", kind: "switch" });
  await app.dispatch({ type: "connection.start" });
  await app.dispatch({
    type: "connection.choosePort",
    port: { deviceId: "host-1", portId: "eth0" },
  });
  await app.dispatch({
    type: "connection.choosePort",
    port: { deviceId: "switch-1", portId: "p1" },
  });
  expect(app.getSnapshot().document.network.links).toHaveLength(1);
  expect(app.getSnapshot().connection).toBeNull();
});
it("turning off tutorial does not assign or erase network parameters", async () => {
  const app = make();
  await app.dispatch({ type: "device.add", kind: "host" });
  await app.dispatch({ type: "tutorial.set", enabled: false });
  expect(
    app.getSnapshot().document.network.devices[0].ports[0].address,
  ).toBeNull();
});
it("runs a ping with the same historical projection in every view", async () => {
  const app = make();
  await app.dispatch({ type: "config.apply", network: fixture("lan") });
  await app.dispatch({
    type: "simulation.start",
    operation: { kind: "ping", sourceId: "a", destination: "192.168.1.20" },
  });
  expect(app.getSnapshot().projection.status).toBe("active");
  for (
    let n = 0;
    n < 100 && app.getSnapshot().projection.status === "active";
    n++
  )
    await app.dispatch({ type: "simulation.next" });
  expect(app.getSnapshot().projection.status).toBe("completed");
  const frontier = app.getSnapshot().projection.frontier;
  await app.dispatch({ type: "simulation.previous" });
  expect(app.getSnapshot().projection.cursor).toBe(frontier - 1);
  await app.dispatch({ type: "simulation.reset" });
  expect(app.getSnapshot().projection.state.arp).toEqual({});
});
it("does not expose or advance an old projection when loading an edited network fails", async () => {
  const session = createSession({ devices: [], links: [] }, 0, memoryJournal());
  let refuse = false,
    starts = 0;
  const app = createAppController({
    request: async (r) => {
      if (r.command.type === "load" && refuse)
        return {
          ok: false as const,
          issue: {
            code: "WORKER_FAILURE",
            category: "resource" as const,
            deviceIds: [],
            linkIds: [],
            params: {},
          },
        };
      if (r.command.type === "start") starts++;
      return session.handle(r);
    },
    dispose() {},
  });
  await app.dispatch({ type: "config.apply", network: fixture("lan") });
  refuse = true;
  await app.dispatch({ type: "config.apply", network: fixture("routed") });
  expect(app.getSnapshot()).toMatchObject({ runtimeReady: false, dirty: true });
  await app.dispatch({
    type: "simulation.start",
    operation: { kind: "ping", sourceId: "a", destination: "192.168.2.10" },
  });
  expect(starts).toBe(0);
  refuse = false;
  await app.dispatch({
    type: "simulation.start",
    operation: { kind: "ping", sourceId: "a", destination: "192.168.2.10" },
  });
  expect(app.getSnapshot()).toMatchObject({
    runtimeReady: true,
    projection: { status: "active" },
  });
});
it("preserves learned state and history when an unchanged configuration is applied after a visual rename", async () => {
  const app = make();
  await app.dispatch({ type: "device.add", kind: "host" });
  const document = app.getSnapshot().document;
  const n = fixture("lan");
  await app.dispatch({ type: "config.apply", network: n });
  await app.dispatch({
    type: "simulation.start",
    operation: { kind: "ping", sourceId: "a", destination: "192.168.1.20" },
  });
  while (app.getSnapshot().projection.status === "active")
    await app.dispatch({ type: "simulation.next" });
  const before = app.getSnapshot().projection;
  await app.dispatch({
    type: "device.rename",
    id: document.network.devices[0].id,
    name: "Renamed",
  });
  await app.dispatch({ type: "config.apply", network: structuredClone(n) });
  expect(app.getSnapshot().projection).toEqual(before);
  const invalid = structuredClone(n);
  invalid.devices[1].ports[0].address = { ip: "192.168.1.0", prefix: 24 };
  await app.dispatch({ type: "config.apply", network: invalid });
  expect(app.getSnapshot().issue?.code).toBe("INVALID_ENDPOINT_ADDRESS");
  await app.dispatch({ type: "config.apply", network: structuredClone(n) });
  expect(app.getSnapshot().issue).toBeNull();
});
it("ignores a delayed advancement response after cancellation in the same revision", async () => {
  const session = createSession({ devices: [], links: [] }, 0, memoryJournal());
  let release!: () => void,
    hold = false;
  const app = createAppController({
    request: async (r) => {
      const result = await session.handle(r);
      if (hold && r.command.type === "next")
        await new Promise<void>((resolve) => (release = resolve));
      return result;
    },
    dispose() {},
  });
  await app.dispatch({ type: "config.apply", network: fixture("lan") });
  await app.dispatch({
    type: "simulation.start",
    operation: { kind: "ping", sourceId: "a", destination: "192.168.1.20" },
  });
  hold = true;
  const pending = app.dispatch({ type: "simulation.next" });
  for (let i = 0; i < 10 && !release; i++) await Promise.resolve();
  await app.dispatch({ type: "simulation.cancel" });
  expect(app.getSnapshot().projection.status).toBe("idle");
  release();
  await pending;
  expect(app.getSnapshot().projection).toMatchObject({
    status: "idle",
    cursor: 0,
    frontier: 0,
  });
});
it("does not revive an old playback loop after cancel and restart while its response was pending", async () => {
  vi.useFakeTimers();
  const session = createSession({ devices: [], links: [] }, 0, memoryJournal());
  let release!: () => void,
    holdNext = true;
  const app = createAppController({
    request: async (r) => {
      const result = await session.handle(r);
      if (holdNext && r.command.type === "next") {
        holdNext = false;
        await new Promise<void>((resolve) => (release = resolve));
      }
      return result;
    },
    dispose() {},
  });
  try {
    await app.dispatch({ type: "config.apply", network: fixture("lan") });
    await app.dispatch({
      type: "simulation.start",
      operation: { kind: "ping", sourceId: "a", destination: "192.168.1.20" },
    });
    await app.dispatch({ type: "simulation.play", enabled: true });
    for (let i = 0; i < 20 && !release; i++) await Promise.resolve();
    await app.dispatch({ type: "simulation.cancel" });
    await app.dispatch({
      type: "simulation.start",
      operation: { kind: "ping", sourceId: "a", destination: "192.168.1.20" },
    });
    await app.dispatch({ type: "simulation.play", enabled: true });
    await vi.advanceTimersByTimeAsync(10);
    expect(app.getSnapshot().projection.cursor).toBe(1);
    release();
    await vi.advanceTimersByTimeAsync(750);
    expect(app.getSnapshot().projection.cursor).toBe(2);
  } finally {
    app.dispose();
    vi.useRealTimers();
  }
});
it("withholds observations and retries the retained network if reopening fails at the worker load", async () => {
  const session = createSession({ devices: [], links: [] }, 0, memoryJournal());
  let refuse = false;
  const loaded = emptyDocument();
  loaded.network = fixture("routed");
  loaded.layout = Object.fromEntries(
    loaded.network.devices.map((d, i) => [
      d.id,
      { name: d.id, x: i * 3, z: 0 },
    ]),
  );
  const app = createAppController(
    {
      request: (r) =>
        refuse && r.command.type === "load"
          ? Promise.resolve({
              ok: false as const,
              issue: {
                code: "WORKER_FAILURE",
                category: "resource" as const,
                deviceIds: [],
                linkIds: [],
                params: {},
              },
            })
          : session.handle(r),
      dispose() {},
    },
    async () => ({
      list: async () => [],
      load: async () => ({ ok: true as const, value: loaded }),
      save: async () => ({ ok: true as const, value: loaded.id }),
    }),
  );
  const current = fixture("lan");
  await app.dispatch({ type: "config.apply", network: current });
  refuse = true;
  await app.dispatch({
    type: "document.open",
    id: loaded.id,
    discardChanges: true,
  });
  expect(app.getSnapshot().document.network).toEqual(current);
  expect(app.getSnapshot().runtimeReady).toBe(false);
  refuse = false;
  await app.dispatch({
    type: "simulation.start",
    operation: { kind: "ping", sourceId: "a", destination: "192.168.1.20" },
  });
  expect(app.getSnapshot()).toMatchObject({
    runtimeReady: true,
    projection: { status: "active" },
  });
});

it("automatically connects physical endpoints with one revision and resets learned history", async () => {
  const app = make();
  const network = fixture("pat");
  network.links = network.links.filter((link) => link.id !== "l4");
  await app.dispatch({ type: "config.apply", network });
  await app.dispatch({ type: "simulation.start", operation: { kind: "ping", sourceId: "a", destination: "192.168.1.11" } });
  while (app.getSnapshot().projection.status === "active")
    await app.dispatch({ type: "simulation.next" });
  await app.dispatch({ type: "simulation.previous" });
  expect(app.getSnapshot().projection.frontier).toBeGreaterThan(0);
  expect(app.getSnapshot().projection.state.arp).not.toEqual({});
  await app.dispatch({ type: "connection.start" });
  const before = structuredClone(app.getSnapshot());
  await app.dispatch({ type: "connection.connectDevices", sourceId: "r1", targetId: "remote" });
  const after = app.getSnapshot();
  expect(after.issue).toBeNull();
  expect(after.connection).toBeNull();
  expect(after.document.network.devices).toEqual(before.document.network.devices);
  expect(after.document.network.links.slice(0, -1)).toEqual(before.document.network.links);
  const cable = after.document.network.links.at(-1)!;
  expect(cable.ends).toEqual([{ deviceId: "r1", portId: "eth1" }, { deviceId: "remote", portId: "eth0" }]);
  expect(cable.id).toBeTruthy();
  expect(before.document.network.links.some((link) => link.id === cable.id)).toBe(false);
  expect(after.projection).toMatchObject({ revision: before.projection.revision + 1, cursor: 0, frontier: 0, operationId: null, status: "idle" });
  expect(after.projection.state.arp).toEqual({});
  expect(after).toMatchObject({ dirty: true, runtimeReady: true, playing: false });
});
it.each([
  ["missing", "s1", "PORT_NOT_FOUND"],
  ["s1", "missing", "PORT_NOT_FOUND"],
  ["s1", "s1", "SELF_CONNECTION"],
  ["a", "s1", "PORT_OCCUPIED"],
  ["s1", "b", "PORT_OCCUPIED"],
])("rejects automatic connection %s to %s without changing configuration or history", async (sourceId, targetId, code) => {
  const app = make();
  await app.dispatch({ type: "config.apply", network: fixture("lan") });
  await app.dispatch({ type: "simulation.start", operation: { kind: "ping", sourceId: "a", destination: "192.168.1.20" } });
  await app.dispatch({ type: "simulation.next" });
  await app.dispatch({ type: "connection.start" });
  await app.dispatch({ type: "connection.choosePort", port: { deviceId: "s1", portId: "p3" } });
  const before = app.getSnapshot();
  await app.dispatch({ type: "connection.connectDevices", sourceId, targetId });
  expect(app.getSnapshot().issue).toMatchObject({ code, category: "input" });
  expect(app.getSnapshot()).toEqual({ ...before, issue: app.getSnapshot().issue });
  expect(app.getSnapshot().document).toBe(before.document);
  expect(app.getSnapshot().projection).toBe(before.projection);
});
it("connects unconfigured devices without assigning IP settings or requiring connection mode", async () => {
  const app = make();
  await app.dispatch({ type: "device.add", kind: "host" });
  await app.dispatch({ type: "device.add", kind: "switch" });
  const devices = structuredClone(app.getSnapshot().document.network.devices);
  await app.dispatch({ type: "connection.connectDevices", sourceId: "host-1", targetId: "switch-1" });
  expect(app.getSnapshot().document.network.devices).toEqual(devices);
  expect(app.getSnapshot().document.network.links).toHaveLength(1);
  expect(app.getSnapshot().issue).toBeNull();
});

it("preserves pending endpoint selection when automatic cable configuration is rejected", async () => {
  const app = make();
  const network = fixture("router31");
  network.links = [];
  await app.dispatch({ type: "config.apply", network });
  await app.dispatch({ type: "device.add", kind: "switch" });
  await app.dispatch({ type: "connection.start" });
  await app.dispatch({
    type: "connection.choosePort",
    port: { deviceId: "switch-1", portId: "p1" },
  });
  const before = app.getSnapshot();
  await app.dispatch({
    type: "connection.connectDevices", sourceId: "r1", targetId: "switch-1",
  });
  expect(app.getSnapshot().issue?.code).toBe("UNSUPPORTED_31_LINK");
  expect(app.getSnapshot()).toEqual({ ...before, issue: app.getSnapshot().issue });
});
