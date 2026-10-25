import type { SimulationClient, SessionCommand } from "../runtime/messages";
import { issue, type Device, type NetworkConfig } from "../domain/types";
import { connectPorts } from "../domain/topology";
import { validateConfiguration } from "../domain/configuration";
import { createInitialState, copy } from "../simulation/state";
import type { AppController, AppState, NetworkDocument } from "./types";
import { openDatabase } from "../storage/database";
import {
  createDocumentRepository,
  type DocumentRepository,
} from "../storage/documents";
export function emptyDocument(): NetworkDocument {
  return {
    schema: 1,
    id: crypto.randomUUID(),
    name: "Untitled network",
    network: { devices: [], links: [] },
    layout: {},
    view: { cameraPosition: [12, 14, 18], target: [0, 0, 0], depth: "ip" },
  };
}
export function createAppController(
  client: SimulationClient,
  getRepository: () => Promise<DocumentRepository> = () =>
    openDatabase().then(createDocumentRepository),
): AppController {
  const document = emptyDocument();
  let revision = 0,
    requestId = 0;
  let state: AppState = {
    document,
    projection: {
      revision: 0,
      operationId: null,
      cursor: 0,
      frontier: 0,
      total: null,
      status: "idle",
      event: null,
      state: createInitialState(document.network),
    },
    selection: null,
    tutorial: true,
    playing: false,
    busy: false,
    dirty: false,
    runtimeReady: true,
    issue: null,
    connection: null,
    notice: null,
    savedNetworks: [],
    savesLoading: false,
  };
  const listeners = new Set<() => void>();
  let timer: ReturnType<typeof setTimeout> | null = null,
    savedId: string | null = null;
  const set = (patch: Partial<AppState>) => {
    state = { ...state, ...patch };
    for (const listener of listeners) listener();
  };
  const send = async (
    command: SessionCommand,
    operationId: string | null = null,
  ) => {
    const sentRevision = revision;
    set({ busy: true, issue: null });
    try {
      const result = await client.request({
        requestId: ++requestId,
        revision: sentRevision,
        operationId,
        command,
      });
      if (sentRevision !== revision) return;
      if (result.ok)
        set({
          projection: result.value,
          runtimeReady: true,
          issue:
            result.value.status === "resource-error" ||
            result.value.status === "failed"
              ? result.value.state.problem
              : null,
        });
      else set({ issue: result.issue });
    } catch (cause) {
      console.error("App operation failed", cause);
      if (sentRevision === revision)
        set({ issue: issue("WORKER_FAILURE", [], {}, "resource") });
    } finally {
      if (sentRevision === revision) set({ busy: false });
    }
  };
  const apply = async (network: NetworkConfig) => {
    const problem = validateConfiguration(network)[0];
    if (problem) {
      set({ issue: problem });
      return;
    }
    revision++;
    set({
      document: { ...state.document, network },
      runtimeReady: false,
      dirty: true,
      playing: false,
      issue: null,
      notice: null,
    });
    await send({ type: "load", network });
  };
  const pause = () => {
    if (timer !== null) clearTimeout(timer);
    timer = null;
    set({ playing: false });
  };
  const play = async () => {
    if (!state.playing) return;
    if (state.busy) {
      timer = setTimeout(() => void play(), 40);
      return;
    }
    await send({ type: "next" }, state.projection.operationId);
    if (
      state.playing &&
      (state.projection.status === "active" ||
        state.projection.cursor < state.projection.frontier)
    )
      timer = setTimeout(() => void play(), 700);
    else pause();
  };
  return {
    getSnapshot: () => state,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    dispose() {
      if (timer !== null) clearTimeout(timer);
      client.dispose();
      listeners.clear();
    },
    async dispatch(action) {
      switch (action.type) {
        case "document.list": {
          set({ savesLoading: true, issue: null });
          try {
            const savedNetworks = await (await getRepository()).list();
            set({ savedNetworks });
          } catch (cause) {
            console.error("List saved networks failed", cause);
            set({
              issue: issue(
                "SAVE_STORAGE_FAILED",
                [],
                { action: "list" },
                "resource",
              ),
            });
          } finally {
            set({ savesLoading: false });
          }
          return;
        }
        case "document.save": {
          if (state.busy) return;
          const original = state.document;
          set({ busy: true, issue: null, notice: null });
          try {
            const result = await (
              await getRepository()
            ).save(
              { ...original, name: action.name },
              action.overwriteId ?? savedId ?? undefined,
            );
            if (!result.ok) {
              set({ issue: result.issue });
              return;
            }
            if (state.document.id === original.id) {
              savedId = result.value;
              set({
                document: {
                  ...state.document,
                  id: result.value,
                  name: action.name.trim(),
                },
                dirty:
                  state.document.network !== original.network ||
                  state.document.layout !== original.layout,
                notice: "Network configuration saved in this browser.",
              });
            }
          } catch (cause) {
            console.error("Save action failed", cause);
            set({
              issue: issue(
                "SAVE_STORAGE_FAILED",
                [],
                { action: "save" },
                "resource",
              ),
            });
          } finally {
            set({ busy: false });
          }
          return;
        }
        case "document.open": {
          if (state.dirty && !action.discardChanges) {
            set({
              issue: issue("UNSAVED_CHANGES", [], { id: action.id }, "input"),
            });
            return;
          }
          pause();
          set({ busy: true, issue: null });
          try {
            const loaded = await (await getRepository()).load(action.id);
            if (!loaded.ok) {
              set({ issue: loaded.issue });
              return;
            }
            revision++;
            await send({ type: "load", network: loaded.value.network });
            if (!state.issue) {
              savedId = loaded.value.id;
              set({
                document: loaded.value,
                selection: null,
                connection: null,
                dirty: false,
                notice: "Network opened with clean simulation state.",
              });
            }
          } catch (cause) {
            console.error("Open saved network failed", cause);
            set({
              issue: issue(
                "SAVE_STORAGE_FAILED",
                [],
                { action: "open" },
                "resource",
              ),
            });
          } finally {
            set({ busy: false });
          }
          return;
        }
        case "simulation.start":
          pause();
          if (!state.busy && !state.runtimeReady) {
            await send({ type: "load", network: state.document.network });
            if (!state.runtimeReady) return;
          }
          if (state.busy) {
            set({ issue: issue("OPERATION_BUSY", [], {}, "input") });
            return;
          }
          await send(
            { type: "start", operation: action.operation },
            crypto.randomUUID(),
          );
          return;
        case "simulation.next":
          pause();
          await send({ type: "next" }, state.projection.operationId);
          return;
        case "simulation.previous":
          pause();
          await send(
            { type: "seek", index: Math.max(0, state.projection.cursor - 1) },
            state.projection.operationId,
          );
          return;
        case "simulation.seek":
          pause();
          await send(
            { type: "seek", index: action.index },
            state.projection.operationId,
          );
          return;
        case "simulation.play":
          if (!action.enabled) {
            pause();
            return;
          }
          set({ playing: true });
          void play();
          return;
        case "simulation.cancel":
          pause();
          await send({ type: "cancel" }, state.projection.operationId);
          return;
        case "simulation.reset":
          pause();
          await send({ type: "reset" }, state.projection.operationId);
          return;
        case "issue.clear":
          set({ issue: null, notice: null });
          return;
        case "document.name":
          set({
            document: { ...state.document, name: action.name },
            dirty: true,
          });
          return;
        case "tutorial.set":
          set({ tutorial: action.enabled });
          return;
        case "selection.set":
          set({ selection: action.selection });
          return;
        case "view.set":
          set({ document: { ...state.document, view: action.view } });
          return;
        case "device.move": {
          const old = state.document.layout[action.id];
          if (!old) return;
          set({
            document: {
              ...state.document,
              layout: {
                ...state.document.layout,
                [action.id]: { ...old, x: action.x, z: action.z },
              },
            },
            dirty: true,
          });
          return;
        }
        case "device.rename": {
          const old = state.document.layout[action.id];
          if (!old || !action.name.trim()) return;
          set({
            document: {
              ...state.document,
              layout: {
                ...state.document.layout,
                [action.id]: { ...old, name: action.name.trim() },
              },
            },
            dirty: true,
          });
          return;
        }
        case "device.add": {
          let n = 1;
          while (
            state.document.network.devices.some(
              (d) => d.id === `${action.kind}-${n}`,
            )
          )
            n++;
          const id = `${action.kind}-${n}`;
          let serial = 1;
          const used = new Set(
            state.document.network.devices.flatMap((d) =>
              d.ports.map((p) => p.mac),
            ),
          );
          const nextMac = () => {
            let value: string;
            do {
              value =
                `02:00:${Math.floor(serial / 16777216) % 256}:${Math.floor(serial / 65536) % 256}:${Math.floor(serial / 256) % 256}:${serial % 256}`
                  .split(":")
                  .map((p, i) =>
                    i < 2 ? p : Number(p).toString(16).padStart(2, "0"),
                  )
                  .join(":");
              serial++;
            } while (used.has(value));
            used.add(value);
            return value;
          };
          const count =
            action.kind === "host"
              ? 1
              : action.kind === "router" || action.kind === "bridge"
                ? 2
                : 4;
          const ports = Array.from({ length: count }, (_, i) => ({
            id:
              action.kind === "host" || action.kind === "router"
                ? `eth${i}`
                : `p${i + 1}`,
            mac:
              action.kind === "host" || action.kind === "router"
                ? nextMac()
                : null,
            address: null,
          }));
          const device: Device =
            action.kind === "host"
              ? {
                  id,
                  kind: "host",
                  ports,
                  addressing: { mode: "manual", gateway: null },
                }
              : action.kind === "router"
                ? {
                    id,
                    kind: "router",
                    ports,
                    routes: [],
                    dhcpScopes: [],
                    nat: null,
                  }
                : { id, kind: action.kind, ports };
          const index = state.document.network.devices.length;
          const label =
            action.kind[0].toUpperCase() + action.kind.slice(1) + ` ${n}`;
          set({
            document: {
              ...state.document,
              layout: {
                ...state.document.layout,
                [id]: {
                  name: label,
                  x: ((index % 4) - 1.5) * 4,
                  z: Math.floor(index / 4) * 4,
                },
              },
            },
            selection: { kind: "device", id },
          });
          await apply({
            ...state.document.network,
            devices: [...state.document.network.devices, device],
          });
          return;
        }
        case "config.apply":
          await apply(action.network);
          return;
        case "device.remove": {
          const layout = { ...state.document.layout };
          delete layout[action.id];
          set({ document: { ...state.document, layout }, selection: null });
          await apply({
            devices: state.document.network.devices.filter(
              (d) => d.id !== action.id,
            ),
            links: state.document.network.links.filter(
              (l) => !l.ends.some((e) => e.deviceId === action.id),
            ),
          });
          return;
        }
        case "port.add": {
          const config = copy(state.document.network),
            device = config.devices.find((d) => d.id === action.deviceId);
          if (!device || device.kind === "host" || device.kind === "bridge")
            return;
          let n = device.kind === "router" ? 0 : 1;
          const prefix = device.kind === "router" ? "eth" : "p";
          while (device.ports.some((p) => p.id === prefix + n)) n++;
          const mac =
            device.kind === "router"
              ? `02:${crypto
                  .getRandomValues(new Uint8Array(5))
                  .reduce(
                    (s, v) => s + v.toString(16).padStart(2, "0") + ":",
                    "",
                  )
                  .slice(0, -1)}`
              : null;
          device.ports.push({ id: prefix + n, mac, address: null });
          await apply(config);
          return;
        }
        case "port.remove": {
          const config = copy(state.document.network),
            device = config.devices.find((d) => d.id === action.deviceId);
          if (!device || device.kind === "host" || device.kind === "bridge")
            return;
          device.ports = device.ports.filter((p) => p.id !== action.portId);
          config.links = config.links.filter(
            (l) =>
              !l.ends.some(
                (e) =>
                  e.deviceId === action.deviceId && e.portId === action.portId,
              ),
          );
          if (device.kind === "router") {
            device.routes = device.routes.filter(
              (r) => r.outPortId !== action.portId,
            );
            device.dhcpScopes = device.dhcpScopes.filter(
              (s) => s.portId !== action.portId,
            );
            if (
              device.nat?.insidePortIds.includes(action.portId) ||
              device.nat?.outsidePortId === action.portId
            )
              device.nat = null;
          }
          await apply(config);
          return;
        }
        case "connection.start":
          set({ connection: { from: null }, playing: false });
          return;
        case "connection.cancel":
          set({ connection: null });
          return;
        case "connection.choosePort": {
          if (!state.connection) return;
          if (!state.connection.from) {
            set({ connection: { from: action.port } });
            return;
          }
          const result = connectPorts(
            state.document.network,
            state.connection.from,
            action.port,
            crypto.randomUUID(),
          );
          if (!result.ok) {
            set({ issue: result.issue });
            return;
          }
          set({ connection: null });
          await apply(result.value);
          return;
        }
        case "link.remove":
          set({ selection: null });
          await apply({
            ...state.document.network,
            links: state.document.network.links.filter(
              (l) => l.id !== action.id,
            ),
          });
          return;
      }
    },
  };
}
