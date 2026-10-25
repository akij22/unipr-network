import { useState } from "react";
import type { AppController } from "../../app/types";
import type { Device, NetworkConfig } from "../../domain/types";
import { useApp } from "../../app/use-app";
import { copy } from "../../simulation/state";
import { Tutorial } from "./Tutorial";
import { DeviceTables } from "../simulation/DeviceTables";
import { PrefixExplorer } from "../learning/PrefixExplorer";
import { presentEvent } from "../../content/present";
import { DhcpSettings } from "../services/DhcpSettings";
import { DhcpClient } from "../services/DhcpClient";
import { NatSettings } from "../services/NatSettings";
export function DeviceInspector({ controller }: { controller: AppController }) {
  const state = useApp(controller),
    selected = state.selection,
    [tab, setTab] = useState("configure");
  if (selected?.kind === "link") {
    const link = state.document.network.links.find((l) => l.id === selected.id);
    return (
      <aside className="inspector">
        <h2>Ethernet connection</h2>
        {link?.ends.map((end) => (
          <p key={end.deviceId}>
            {state.document.layout[end.deviceId]?.name} ·{" "}
            <code>{end.portId}</code>
          </p>
        ))}
        <p>
          Frames carry the next-hop MAC address on this link. Select an event to
          inspect its actual frame.
        </p>
        <button
          onClick={() =>
            void controller.dispatch({ type: "link.remove", id: selected.id })
          }
        >
          Disconnect cable
        </button>
      </aside>
    );
  }
  const device = state.document.network.devices.find(
    (d) => d.id === selected?.id,
  );
  if (!device)
    return (
      <aside className="inspector empty-inspector">
        <span className="eyebrow">DEVICE INSPECTOR</span>
        <h2>
          Build a network.
          <br />
          See why it works.
        </h2>
        <p>
          Add a host, connect it to another device and configure its network.
          Select any device to inspect its interfaces.
        </p>
        <ol>
          <li>Add your devices</li>
          <li>Connect available ports</li>
          <li>Configure and send a packet</li>
        </ol>
      </aside>
    );
  return (
    <div className="inspector-stack">
      <nav className="inspector-tabs" aria-label="Device inspection">
        {["configure", "tables", "activity"].map((value) => (
          <button
            key={value}
            aria-pressed={tab === value}
            onClick={() => setTab(value)}
          >
            {value[0].toUpperCase() + value.slice(1)}
          </button>
        ))}
      </nav>
      <div hidden={tab !== "configure"}>
        <DeviceForm
          key={`${device.id}:${state.projection.revision}`}
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
    [draft, setDraft] = useState(copy(device)),
    [name, setName] = useState(meta.name);
  const update = (next: Device) => setDraft(next);
  const apply = async () => {
    await controller.dispatch({ type: "device.rename", id: device.id, name });
    const network: NetworkConfig = {
      ...state.document.network,
      devices: state.document.network.devices.map((d) =>
        d.id === device.id ? draft : d,
      ),
    };
    await controller.dispatch({ type: "config.apply", network });
  };
  return (
    <aside className="inspector" aria-label="Device inspector">
      <div className="section-head">
        <div>
          <span className="eyebrow">
            {device.kind.toUpperCase()} ·{" "}
            {device.kind === "router"
              ? "LAYER 3"
              : device.kind === "hub"
                ? "LAYER 1"
                : device.kind === "host"
                  ? "ENDPOINT"
                  : "LAYER 2"}
          </span>
          <h2>{meta.name}</h2>
        </div>
        <button
          aria-label="Close inspector"
          onClick={() => {
            void controller.dispatch({
              type: "selection.set",
              selection: null,
            });
            requestAnimationFrame(() =>
              document
                .querySelector<HTMLButtonElement>(
                  `[data-device-id="${CSS.escape(device.id)}"]`,
                )
                ?.focus(),
            );
          }}
        >
          Close
        </button>
      </div>
      {state.tutorial && <Tutorial kind={device.kind} />}
      <label>
        Device name
        <input value={name} onChange={(e) => setName(e.target.value)} />
      </label>
      {draft.kind === "host" && (
        <fieldset>
          <legend>Address configuration</legend>
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
        </fieldset>
      )}
      {draft.ports.map((port, i) => {
        const connected = state.document.network.links.some((l) =>
          l.ends.some((e) => e.deviceId === device.id && e.portId === port.id),
        );
        return (
          <section className="interface" key={port.id}>
            <div className="section-head">
              <code className="port-label">{port.id}</code>
              <span className="muted small">
                {connected ? "Connected" : "Available"}
              </span>
            </div>
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
                    value={port.address?.prefix ?? 24}
                    onChange={(e) =>
                      update({
                        ...draft,
                        ports: draft.ports.map((p, j) =>
                          i === j
                            ? {
                                ...p,
                                address: {
                                  ip: p.address?.ip ?? "",
                                  prefix: Number(e.target.value),
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
          </section>
        );
      })}
      {draft.kind === "host" && draft.addressing.mode === "manual" && (
        <label>
          Default gateway
          <input
            placeholder="192.168.1.1"
            value={draft.addressing.gateway ?? ""}
            onChange={(e) =>
              update({
                ...draft,
                addressing: { mode: "manual", gateway: e.target.value || null },
              })
            }
          />
        </label>
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
      {draft.kind === "router" && (
        <section>
          <h3>Static routes</h3>
          {draft.routes.map((route, i) => (
            <div className="interface" key={route.id}>
              <label>
                Route {i + 1} destination
                <input
                  value={route.destination.ip}
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
              <label>
                Route {i + 1} prefix
                <input
                  type="number"
                  min="0"
                  max="32"
                  value={route.destination.prefix}
                  onChange={(e) =>
                    update({
                      ...draft,
                      routes: draft.routes.map((r, j) =>
                        i === j
                          ? {
                              ...r,
                              destination: {
                                ...r.destination,
                                prefix: Number(e.target.value),
                              },
                            }
                          : r,
                      ),
                    })
                  }
                />
              </label>
              <label>
                Route {i + 1} next hop
                <input
                  value={route.nextHop ?? ""}
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
            Add static route
          </button>
        </section>
      )}
      <div className="inspector-actions">
        <button
          className="primary"
          disabled={state.busy}
          onClick={() => void apply()}
        >
          Apply settings
        </button>
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
      {device.kind === "host" && device.addressing.mode === "dhcp" && (
        <DhcpClient controller={controller} deviceId={device.id} />
      )}
      {device.kind === "router" && (
        <>
          <DhcpSettings controller={controller} deviceId={device.id} />
          <NatSettings controller={controller} deviceId={device.id} />
        </>
      )}
      <details>
        <summary>Position and removal</summary>
        <div className="row">
          {[
            ["Move left", -2, 0],
            ["Move right", 2, 0],
            ["Move forward", 0, -2],
            ["Move back", 0, 2],
          ].map(([label, dx, dz]) => (
            <button
              key={String(label)}
              onClick={() =>
                void controller.dispatch({
                  type: "device.move",
                  id: device.id,
                  x: meta.x + Number(dx),
                  z: meta.z + Number(dz),
                })
              }
            >
              {label}
            </button>
          ))}
        </div>
        <button
          className="danger"
          onClick={() =>
            void controller.dispatch({ type: "device.remove", id: device.id })
          }
        >
          Remove device
        </button>
      </details>
    </aside>
  );
}
