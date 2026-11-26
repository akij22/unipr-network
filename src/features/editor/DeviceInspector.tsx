import { useEffect, useId, useState, useSyncExternalStore } from "react";
import type { AppController } from "../../app/types";
import type { Device } from "../../domain/types";
import { useApp } from "../../app/use-app";
import { Tutorial } from "./Tutorial";
import { DeviceTables } from "../simulation/DeviceTables";
import { PrefixExplorer } from "../learning/PrefixExplorer";
import { presentEvent } from "../../content/present";
import { DhcpSettings } from "../services/DhcpSettings";
import { DhcpClient } from "../services/DhcpClient";
import { NatSettings } from "../services/NatSettings";
import {
  enqueueDeviceEdit,
  getInitialDraft,
  hasInvalidInput,
  hasPendingNetworkDiff,
  ipv4Error,
  isDeviceApplying,
  nameError,
  prefixError,
  requiredIpv4Error,
  subscribeDeviceQueue,
  syncDraftWithExternalDevice,
} from "./device-autosave";
export function DeviceInspector({ controller }: { controller: AppController }) {
  const state = useApp(controller),
    selected = state.selection,
    [tab, setTab] = useState("configure");
  if (selected?.kind !== "device") return null;
  const device = state.document.network.devices.find(
    (d) => d.id === selected.id,
  );
  if (!device) return null;
  return (
    <div className="inspector-stack">
      <header className="device-inspector-header">
        <small>Device inspector</small>
        <h2>{state.document.layout[device.id].name}</h2>
        <small className="device-class">{device.kind} / {device.kind === "host" ? "Endpoint" : device.kind === "router" ? "Layer 3" : device.kind === "hub" ? "Layer 1" : "Layer 2"}</small>
        <button
          type="button"
          aria-label="Close inspector"
          title="Close inspector"
          onClick={() => {
            void controller.dispatch({
              type: "selection.set",
              selection: null,
            });
            requestAnimationFrame(() =>
              document
                .querySelector<HTMLElement>(
                  `.react-flow__node[data-id="${CSS.escape(device.id)}"]`,
                )
                ?.focus({ preventScroll: true }),
            );
          }}
        >
          <svg
            aria-hidden="true"
            width="16"
            height="16"
            viewBox="0 0 14 14"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          >
            <path d="m3 3 8 8m0-8-8 8" />
          </svg>
        </button>
      </header>
      <nav className="inspector-tabs" aria-label="Device inspection">
        {(
          [
            ["configure", "Configure", "Ports, addressing and routing"],
            ["tables", "Tables", "Live device state at this step"],
            ["activity", "Activity", "What this device is doing now"],
          ] as const
        ).map(([value, label, hint]) => (
          <button
            key={value}
            aria-pressed={tab === value}
            title={hint}
            onClick={() => setTab(value)}
          >
            {label}
          </button>
        ))}
      </nav>
      <div hidden={tab !== "configure"}>
        <DeviceForm
          key={`${state.viewEpoch}:${device.id}`}
          controller={controller}
          device={device}
        />
      </div>
      <div hidden={tab !== "tables"}>
        <DeviceTables controller={controller} />
      </div>
      <div hidden={tab !== "activity"}>
        <aside className="inspector">
          <h2>At this step</h2>
          <p>
            {state.runtimeReady &&
            state.projection.event?.deviceIds.includes(device.id)
              ? presentEvent(state.projection.event, state.document).summary
              : "This device is not processing the current event. Select its ports or tables to inspect the state at this step."}
          </p>
        </aside>
      </div>
    </div>
  );
}
function DeviceForm({
  controller,
  device,
}: {
  controller: AppController;
  device: Device;
}) {
  const state = useApp(controller),
    meta = state.document.layout[device.id],
    [draft, setDraft] = useState(() =>
      getInitialDraft(controller, device, state.viewEpoch),
    ),
    [name, setName] = useState(meta.name),
    [openPorts, setOpenPorts] = useState<Record<string, boolean>>(() =>
      Object.fromEntries(device.ports.map((p) => [p.id, device.kind === "host" || !p.address?.ip])),
    );
  const applying = useSyncExternalStore(
    (listener) => subscribeDeviceQueue(controller, listener),
    () => isDeviceApplying(controller, device.id),
  );
  const portSignature = device.ports.map((p) => p.id).join(",");
  useEffect(() => {
    setDraft((current) => {
      const synced = syncDraftWithExternalDevice(current, device);
      return JSON.stringify(synced) === JSON.stringify(current)
        ? current
        : synced;
    });
    setOpenPorts((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const port of device.ports) {
        if (!(port.id in next)) {
          next[port.id] = device.kind === "host" || !port.address?.ip;
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [device.id, portSignature]);
  const update = (next: Device) => {
    setDraft(next);
    enqueueDeviceEdit(controller, next, state.viewEpoch);
  };
  const updateName = (nextName: string) => {
    setName(nextName);
    const normalizedName = nextName.trim();
    if (normalizedName && normalizedName !== meta.name) {
      void controller.dispatch({
        type: "device.rename",
        id: device.id,
        name: normalizedName,
      });
    }
  };
  const uid = useId(),
    nameMessage = nameError(name),
    fieldInvalid = Boolean(nameMessage) || hasInvalidInput(draft),
    networkDirty = hasPendingNetworkDiff(draft, device),
    rejected = !fieldInvalid && !applying && networkDirty,
    statusState =
      fieldInvalid || rejected
        ? "invalid"
        : applying
          ? "saving"
          : "clean",
    statusText = fieldInvalid
      ? "Fix highlighted fields — previous settings remain active"
      : rejected
        ? "Configuration needs attention — previous settings remain active"
        : statusState === "saving"
          ? "Applying changes…"
          : "All changes applied",
    gatewayMessage =
      draft.kind === "host" && draft.addressing.mode === "manual"
        ? ipv4Error(draft.addressing.gateway ?? "")
        : undefined;
  return (
    <aside className="inspector" aria-label="Device inspector">
      <section className="inspector-group" aria-label="Identity">

        <label>
          Device name
          <input
            value={name}
            aria-invalid={nameMessage ? true : undefined}
            aria-describedby={nameMessage ? `${uid}-name-error` : undefined}
            onChange={(e) => updateName(e.target.value)}
          />
        </label>
        <FieldError id={`${uid}-name-error`} message={nameMessage} />
      </section>
      <section className="inspector-group" aria-label="Ports">
        <div className="group-head">
          <h3 className="group-label">{device.kind === "host" ? "Network interface" : "Ports"}</h3>
          {device.kind !== "host" && device.kind !== "bridge" && (
            <button
              onClick={() =>
                void controller.dispatch({
                  type: "port.add",
                  deviceId: device.id,
                })
              }
            >
              Add port
            </button>
          )}
        </div>
        {draft.ports.map((port, i) => {
          const link = state.document.network.links.find((l) =>
            l.ends.some((e) => e.deviceId === device.id && e.portId === port.id),
          );
          const peer = link?.ends.find(e => e.deviceId !== device.id || e.portId !== port.id);
          const connected = Boolean(link);
          const addressSummary =
            draft.kind === "host" && draft.addressing.mode === "dhcp"
              ? "Address from DHCP"
              : draft.kind === "router" || draft.kind === "host"
                ? port.address?.ip
                  ? `${port.address.ip}/${port.address.prefix}`
                  : "No address set"
                : "Layer 2 only";
          const ipMessage = ipv4Error(port.address?.ip ?? ""),
            prefixMessage = port.address
              ? prefixError(port.address.prefix)
              : undefined;
          return (
            <details
              className="interface port-card"
              key={port.id}
              open={
                state.connection ? true : (openPorts[port.id] ?? true)
              }
              onToggle={(e) => {
                const open = e.currentTarget.open;
                setOpenPorts((prev) => ({ ...prev, [port.id]: open }));
              }}
            >
              <summary>
                <code className="port-label">{port.id}</code>
                <span className="port-address">{addressSummary}</span>
                <span
                  className="port-status"
                  data-connected={connected ? "true" : "false"}
                >
                  {peer ? `Connected to ${state.document.layout[peer.deviceId]?.name ?? peer.deviceId} · ${peer.portId}` : "Available"}
                </span>
              </summary>
            {draft.kind === "host" && <>
              <p className="assignment-label">Address assignment</p>
                <div className="segmented">
                  <button
                    aria-pressed={draft.addressing.mode === "manual"}
                    onClick={() =>
                      update({
                        ...draft,
                        addressing: { mode: "manual", gateway: null },
                      })
                    }
                  >
                    Manual
                  </button>
                  <button
                    aria-pressed={draft.addressing.mode === "dhcp"}
                    onClick={() =>
                      update({
                        ...draft,
                        ports: draft.ports.map((p) => ({ ...p, address: null })),
                        addressing: { mode: "dhcp" },
                      })
                    }
                  >
                    Automatic (DHCP)
                  </button>
                </div>
            </>}
            {(draft.kind === "router" ||
              (draft.kind === "host" &&
                draft.addressing.mode === "manual")) && (
              <div className="address-row">
                <label>
                  {draft.kind === "host"
                    ? "IPv4 address"
                    : `IPv4 address ${port.id}`}
                  <input
                    autoComplete="off"
                    inputMode="decimal"
                    spellCheck={false}
                    value={port.address?.ip ?? ""}
                    placeholder="192.168.1.10"
                    aria-invalid={ipMessage ? true : undefined}
                    aria-describedby={ipMessage ? `${uid}-${i}-ip-error` : undefined}
                    onChange={(e) =>
                      update({
                        ...draft,
                        ports: draft.ports.map((p, j) =>
                          i === j
                            ? {
                                ...p,
                                address: e.target.value
                                  ? {
                                      ip: e.target.value,
                                      prefix: p.address?.prefix ?? 24,
                                    }
                                  : null,
                              }
                            : p,
                        ),
                      })
                    }
                  />
                </label>
                <label>
                  Prefix {port.id}
                  <input
                    type="number"
                    min="0"
                    max="32"
                    value={Number.isNaN(port.address?.prefix) ? "" : port.address?.prefix ?? 24}
                    aria-invalid={prefixMessage ? true : undefined}
                    aria-describedby={
                      prefixMessage ? `${uid}-${i}-prefix-error` : undefined
                    }
                    onChange={(e) =>
                      update({
                        ...draft,
                        ports: draft.ports.map((p, j) =>
                          i === j
                            ? {
                                ...p,
                                address: {
                                  ip: p.address?.ip ?? "",
                                  prefix: e.target.valueAsNumber,
                                },
                              }
                            : p,
                        ),
                      })
                    }
                  />
                </label>
              </div>
            )}
          {draft.kind === "host" && draft.addressing.mode === "manual" && (
            <>
              <label>
                Default gateway
                <input
                  placeholder="192.168.1.1"
                  autoComplete="off"
                  inputMode="decimal"
                  spellCheck={false}
                  aria-invalid={gatewayMessage ? true : undefined}
                  aria-describedby={
                    gatewayMessage
                      ? `${uid}-gateway-hint ${uid}-gateway-error`
                      : `${uid}-gateway-hint`
                  }
                  value={draft.addressing.gateway ?? ""}
                  onChange={(e) =>
                    update({
                      ...draft,
                      addressing: {
                        mode: "manual",
                        gateway: e.target.value || null,
                      },
                    })
                  }
                />
              </label>
              <FieldError id={`${uid}-gateway-error`} message={gatewayMessage} />
              <p id={`${uid}-gateway-hint`} className="field-hint">
                Used for traffic to other networks. It must be on this host&apos;s link.
              </p>
            </>
          )}
            <FieldError id={`${uid}-${i}-ip-error`} message={ipMessage} />
            <FieldError
              id={`${uid}-${i}-prefix-error`}
              message={prefixMessage}
            />
            {port.mac && (
              <div className="field-row small">
                <span>MAC address</span>
                <code>{port.mac}</code>
              </div>
            )}
            {state.connection && (
              <button
                disabled={connected}
                onClick={() =>
                  void controller.dispatch({
                    type: "connection.choosePort",
                    port: { deviceId: device.id, portId: port.id },
                  })
                }
              >
                Choose {port.id}
              </button>
            )}
            {device.kind !== "host" && device.kind !== "bridge" && (
              <button
                className="text-button"
                onClick={() =>
                  void controller.dispatch({
                    type: "port.remove",
                    deviceId: device.id,
                    portId: port.id,
                  })
                }
              >
                Remove {port.id}
              </button>
            )}
          </details>
        );
        })}
      </section>
      {draft.kind === "router" && (
        <section className="inspector-group" aria-label="Routing">
          <div className="group-head">
            <h3 className="group-label">Static routes</h3>
            <button
              onClick={() =>
                update({
                  ...draft,
                  routes: [
                    ...draft.routes,
                    {
                      id: crypto.randomUUID(),
                      destination: { ip: "0.0.0.0", prefix: 0 },
                      nextHop: null,
                      outPortId: draft.ports[0]?.id ?? "",
                    },
                  ],
                })
              }
            >
              Add route
            </button>
          </div>
          {draft.routes.map((route, i) => (
            <div className="interface" key={route.id}>
              <label>
                Route {i + 1} destination
                <input
                  value={route.destination.ip}
                  inputMode="decimal"
                  spellCheck={false}
                  aria-invalid={requiredIpv4Error(route.destination.ip) ? true : undefined}
                  aria-describedby={
                    requiredIpv4Error(route.destination.ip)
                      ? `${uid}-route-${i}-destination-error`
                      : undefined
                  }
                  onChange={(e) =>
                    update({
                      ...draft,
                      routes: draft.routes.map((r, j) =>
                        i === j
                          ? {
                              ...r,
                              destination: {
                                ...r.destination,
                                ip: e.target.value,
                              },
                            }
                          : r,
                      ),
                    })
                  }
                />
              </label>
              <FieldError
                id={`${uid}-route-${i}-destination-error`}
                message={requiredIpv4Error(route.destination.ip)}
              />
              <label>
                Route {i + 1} prefix
                <input
                  type="number"
                  min="0"
                  max="32"
                  value={Number.isNaN(route.destination.prefix) ? "" : route.destination.prefix}
                  aria-invalid={prefixError(route.destination.prefix) ? true : undefined}
                  aria-describedby={
                    prefixError(route.destination.prefix)
                      ? `${uid}-route-${i}-prefix-error`
                      : undefined
                  }
                  onChange={(e) =>
                    update({
                      ...draft,
                      routes: draft.routes.map((r, j) =>
                        i === j
                          ? {
                              ...r,
                              destination: {
                                ...r.destination,
                                prefix: e.target.valueAsNumber,
                              },
                            }
                          : r,
                      ),
                    })
                  }
                />
              </label>
              <FieldError
                id={`${uid}-route-${i}-prefix-error`}
                message={prefixError(route.destination.prefix)}
              />
              <label>
                Route {i + 1} next hop
                <input
                  value={route.nextHop ?? ""}
                  inputMode="decimal"
                  spellCheck={false}
                  aria-invalid={ipv4Error(route.nextHop ?? "") ? true : undefined}
                  aria-describedby={
                    ipv4Error(route.nextHop ?? "")
                      ? `${uid}-route-${i}-next-hop-error`
                      : undefined
                  }
                  onChange={(e) =>
                    update({
                      ...draft,
                      routes: draft.routes.map((r, j) =>
                        i === j ? { ...r, nextHop: e.target.value || null } : r,
                      ),
                    })
                  }
                />
              </label>
              <FieldError
                id={`${uid}-route-${i}-next-hop-error`}
                message={ipv4Error(route.nextHop ?? "")}
              />
              <label>
                Route {i + 1} outgoing interface
                <select
                  value={route.outPortId}
                  onChange={(e) =>
                    update({
                      ...draft,
                      routes: draft.routes.map((r, j) =>
                        i === j ? { ...r, outPortId: e.target.value } : r,
                      ),
                    })
                  }
                >
                  {draft.ports.map((p) => (
                    <option key={p.id}>{p.id}</option>
                  ))}
                </select>
              </label>
              <button
                onClick={() =>
                  update({
                    ...draft,
                    routes: draft.routes.filter((r) => r.id !== route.id),
                  })
                }
              >
                Remove route {i + 1}
              </button>
            </div>
          ))}
        </section>
      )}
      {(draft.kind === "host" || draft.kind === "router") && (
        <details>
          <summary>Explore IPv4 prefix</summary>
          <PrefixExplorer
            initialIp={draft.ports[0]?.address?.ip}
            initialPrefix={draft.ports[0]?.address?.prefix}
          />
        </details>
      )}
      {((device.kind === "host" && device.addressing.mode === "dhcp") || device.kind === "router") && (
        <section className="inspector-group" aria-label="Services">
          <h3 className="group-label">Services</h3>
          {device.kind === "host" && device.addressing.mode === "dhcp" && (
            <DhcpClient controller={controller} deviceId={device.id} />
          )}
          {device.kind === "router" && (
            <>
              <DhcpSettings
                key={JSON.stringify([device.ports, device.dhcpScopes])}
                controller={controller}
                deviceId={device.id}
              />
              <NatSettings
                key={JSON.stringify([portSignature, device.nat])}
                controller={controller}
                deviceId={device.id}
              />
            </>
          )}
        </section>
      )}
      {state.tutorial && <Tutorial kind={device.kind} />}
      <footer className="inspector-footer">
        <span
          className="apply-status"
          data-state={statusState}
          role="status"
        >
          {statusText}
        </span>
      </footer>
    </aside>
  );
}
function FieldError({ id, message }: { id: string; message?: string }) {
  return message ? (
    <p id={id} className="field-error" aria-live="polite">
      {message}
    </p>
  ) : null;
}
