import type { AppController } from "../../app/types";
import type { Device, IPv4Address, NetworkConfig, Route } from "../../domain/types";
import { parseIPv4 } from "../../domain/ipv4";
import { copy } from "../../simulation/state";

export type DeviceEditablePatch =
  | {
      kind: "host";
      portAddresses: Record<string, IPv4Address | null>;
      addressing: { mode: "manual"; gateway: string | null } | { mode: "dhcp" };
    }
  | {
      kind: "router";
      portAddresses: Record<string, IPv4Address | null>;
      routes: Route[];
    };

type PendingDeviceEdit = {
  viewEpoch: number;
  patch: DeviceEditablePatch;
};

type QueueState = {
  pending: Map<string, PendingDeviceEdit>;
  inFlightDeviceId: string | null;
  draining: boolean;
  listeners: Set<() => void>;
};

const queues = new WeakMap<AppController, QueueState>();

function getQueue(controller: AppController): QueueState {
  let queue = queues.get(controller);
  if (!queue) {
    queue = {
      pending: new Map(),
      inFlightDeviceId: null,
      draining: false,
      listeners: new Set(),
    };
    queues.set(controller, queue);
  }
  return queue;
}

function notify(queue: QueueState) {
  for (const listener of queue.listeners) listener();
}

export function ipv4Error(value: string): string | undefined {
  return value.trim() !== "" && !parseIPv4(value.trim()).ok
    ? "Enter an IPv4 address such as 192.168.1.10."
    : undefined;
}

export function requiredIpv4Error(value: string): string | undefined {
  return value.trim() === "" || !parseIPv4(value.trim()).ok
    ? "Enter an IPv4 address such as 0.0.0.0."
    : undefined;
}

export function prefixError(prefix: number): string | undefined {
  return Number.isInteger(prefix) && prefix >= 0 && prefix <= 32
    ? undefined
    : "Enter a prefix length from 0 to 32.";
}

export function nameError(value: string): string | undefined {
  return value.trim() === "" ? "Enter a device name." : undefined;
}

export function hasInvalidInput(device: Device): boolean {
  const gateway =
    device.kind === "host" && device.addressing.mode === "manual"
      ? device.addressing.gateway
      : null;
  return Boolean(
    (gateway && ipv4Error(gateway)) ||
      device.ports.some(
        (port) =>
          port.address !== null &&
          (ipv4Error(port.address.ip) || prefixError(port.address.prefix)),
      ) ||
      (device.kind === "router" &&
        device.routes.some(
          (route) =>
            requiredIpv4Error(route.destination.ip) ||
            prefixError(route.destination.prefix) ||
            (route.nextHop && ipv4Error(route.nextHop)),
        )),
  );
}

function normalizePortAddress(address: IPv4Address | null): IPv4Address | null {
  if (!address) return null;
  const ip = address.ip.trim();
  if (!ip) return null;
  return { ip, prefix: address.prefix };
}

export function extractDevicePatch(draft: Device): DeviceEditablePatch | null {
  if (draft.kind === "host") {
    return {
      kind: "host",
      portAddresses: Object.fromEntries(
        draft.ports.map((p) => [p.id, normalizePortAddress(p.address)]),
      ),
      addressing:
        draft.addressing.mode === "manual"
          ? { mode: "manual", gateway: draft.addressing.gateway?.trim() || null }
          : { mode: "dhcp" },
    };
  }
  if (draft.kind === "router") {
    return {
      kind: "router",
      portAddresses: Object.fromEntries(
        draft.ports.map((p) => [p.id, normalizePortAddress(p.address)]),
      ),
      routes: draft.routes.map((r) => ({
        ...r,
        destination: {
          ip: r.destination.ip.trim(),
          prefix: r.destination.prefix,
        },
        nextHop: r.nextHop?.trim() || null,
      })),
    };
  }
  return null;
}

export function applyDevicePatch(
  latestDevice: Device,
  patch: DeviceEditablePatch,
): Device {
  if (latestDevice.kind !== patch.kind) return latestDevice;
  const ports = latestDevice.ports.map((port) =>
    Object.prototype.hasOwnProperty.call(patch.portAddresses, port.id)
      ? { ...port, address: patch.portAddresses[port.id] }
      : port,
  );
  if (patch.kind === "host" && latestDevice.kind === "host") {
    return {
      ...latestDevice,
      ports,
      addressing: copy(patch.addressing),
    };
  }
  if (patch.kind === "router" && latestDevice.kind === "router") {
    const portIds = new Set(ports.map((p) => p.id));
    return {
      ...latestDevice,
      ports,
      routes: copy(patch.routes).filter((r) => portIds.has(r.outPortId)),
    };
  }
  return latestDevice;
}

export function syncDraftWithExternalDevice(
  draft: Device,
  external: Device,
): Device {
  if (draft.kind !== external.kind) return copy(external);
  const draftPorts = new Map(draft.ports.map((p) => [p.id, p]));
  const ports = external.ports.map((p) => {
    const existing = draftPorts.get(p.id);
    return existing ? { ...p, address: existing.address } : copy(p);
  });
  if (draft.kind === "router" && external.kind === "router") {
    const portIds = new Set(ports.map((p) => p.id));
    return {
      ...external,
      ports,
      routes: draft.routes.filter((r) => portIds.has(r.outPortId)),
    };
  }
  if (draft.kind === "host" && external.kind === "host") {
    return {
      ...external,
      ports,
      addressing: draft.addressing,
    };
  }
  return { ...external, ports };
}

export function hasPendingNetworkDiff(draft: Device, committed: Device): boolean {
  const patch = extractDevicePatch(draft);
  if (!patch) return false;
  const projected = applyDevicePatch(committed, patch);
  return JSON.stringify(projected) !== JSON.stringify(committed);
}

export function getInitialDraft(
  controller: AppController,
  device: Device,
  viewEpoch: number,
): Device {
  const pending = getQueue(controller).pending.get(device.id);
  if (pending?.viewEpoch === viewEpoch) {
    return copy(applyDevicePatch(device, pending.patch));
  }
  return copy(device);
}

export function isDeviceApplying(
  controller: AppController,
  deviceId: string,
): boolean {
  const queue = getQueue(controller);
  return queue.inFlightDeviceId === deviceId || queue.pending.has(deviceId);
}

export function subscribeDeviceQueue(
  controller: AppController,
  listener: () => void,
): () => void {
  const queue = getQueue(controller);
  queue.listeners.add(listener);
  return () => queue.listeners.delete(listener);
}

function waitUntilIdle(controller: AppController): Promise<void> {
  return new Promise((resolve) => {
    const unsubscribe = controller.subscribe(() => {
      if (controller.getSnapshot().busy) return;
      unsubscribe();
      // A document open can finish adopting its configuration after its worker returns.
      setTimeout(resolve, 0);
    });
  });
}

async function drainQueue(controller: AppController, queue: QueueState) {
  if (queue.draining) return;
  queue.draining = true;
  try {
    while (queue.pending.size > 0) {
      const snapshot = controller.getSnapshot();
      if (snapshot.busy) {
        await waitUntilIdle(controller);
        continue;
      }
      const next = queue.pending.entries().next().value as
        | [string, PendingDeviceEdit]
        | undefined;
      if (!next) break;
      const [deviceId, entry] = next;
      queue.pending.delete(deviceId);
      if (snapshot.viewEpoch !== entry.viewEpoch) continue;
      const latestDevice = snapshot.document.network.devices.find(
        (d) => d.id === deviceId,
      );
      if (!latestDevice) continue;
      const updatedDevice = applyDevicePatch(latestDevice, entry.patch);
      const changed =
        JSON.stringify(updatedDevice) !== JSON.stringify(latestDevice);
      if (
        !changed &&
        !(snapshot.issue?.category === "input" && snapshot.issue.deviceIds.includes(deviceId))
      ) continue;
      const network: NetworkConfig = {
        ...snapshot.document.network,
        devices: snapshot.document.network.devices.map((d) =>
          d.id === deviceId ? updatedDevice : d,
        ),
      };
      queue.inFlightDeviceId = deviceId;
      notify(queue);
      try {
        await controller.dispatch({ type: "config.apply", network });
      } finally {
        queue.inFlightDeviceId = null;
        notify(queue);
      }
    }
  } finally {
    queue.draining = false;
    queue.inFlightDeviceId = null;
    notify(queue);
  }
}

export function enqueueDeviceEdit(
  controller: AppController,
  device: Device,
  viewEpoch: number,
): void {
  if (hasInvalidInput(device)) return;
  const patch = extractDevicePatch(device);
  if (!patch) return;
  const queue = getQueue(controller);
  queue.pending.set(device.id, { viewEpoch, patch });
  notify(queue);
  void drainQueue(controller, queue);
}
