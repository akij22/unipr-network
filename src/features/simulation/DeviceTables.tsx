import { analyzePrefix } from "../../domain/ipv4";
import type { AppController } from "../../app/types";
import { useApp } from "../../app/use-app";
import { addressOf } from "../../simulation/ipv4";
import { NatTable } from "../services/NatTable";
function networkLabel(ip: string, prefix: number) {
  const result = analyzePrefix(ip, prefix);
  return result.ok ? result.value.network : ip;
}
export function DeviceTables({ controller }: { controller: AppController }) {
  const s = useApp(controller),
    id = s.selection?.id,
    device = s.document.network.devices.find((d) => d.id === id),
    runtime = s.projection.state;
  if (!device) return null;
  if (!s.runtimeReady)
    return (
      <aside className="inspector">
        <h2>Simulation state unavailable</h2>
        <p>
          Your edited configuration is kept. Start a new operation to retry the
          simulator, or save the network before reloading.
        </p>
      </aside>
    );
  const detail = s.projection.event?.detail;
  const isSwitch = device.kind === "switch" || device.kind === "bridge";
  const learnedCount = Object.entries(isSwitch ? runtime.mac : runtime.arp).filter(
    ([key]) => key.startsWith(device.id + "/"),
  ).length;
  const leaseCount = Object.values(runtime.dhcpLeases).filter((l) =>
    l.scopeId.startsWith(device.id + "/"),
  ).length;
  const plural = (n: number, noun: string) => `${n} ${noun}${n === 1 ? "" : "s"}`;
  const summaryParts: string[] = [];
  if (device.kind === "router")
    summaryParts.push(
      plural(
        device.ports.filter((p) => addressOf(device, p, runtime)).length +
          device.routes.length,
        "route",
      ),
      plural(leaseCount, "DHCP lease"),
    );
  if (device.kind !== "hub")
    summaryParts.push(plural(learnedCount, isSwitch ? "MAC entry" : "ARP entry"));
  summaryParts.push(`observed at step ${s.projection.cursor}`);

  return (
    <aside className="inspector">
      <h2>{s.document.layout[device.id]?.name} · Tables</h2>
      <p className="muted small table-summary">
        {summaryParts.join(" · ")}
      </p>
      {device.kind === "router" && (
        <>
          <h3>Routing table</h3>
          <table>
            <thead>
              <tr>
                <th>Destination</th>
                <th>Next hop</th>
                <th>Interface</th>
              </tr>
            </thead>
            <tbody>
              {device.ports.map((p) => {
                const a = addressOf(device, p, runtime);
                return a ? (
                  <tr
                    key={p.id}
                    className={
                      detail?.kind === "route" &&
                      s.projection.event?.deviceIds.includes(device.id) &&
                      detail.routeId === `connected:${device.id}:${p.id}`
                        ? "used-route"
                        : ""
                    }
                  >
                    <td>
                      <code>
                        {networkLabel(a.ip, a.prefix)}/{a.prefix}
                      </code>
                      <small>Connected</small>
                    </td>
                    <td>On-link</td>
                    <td>
                      <code>{p.id}</code>
                    </td>
                  </tr>
                ) : null;
              })}
              {device.routes.map((r) => (
                <tr
                  key={r.id}
                  className={
                    detail?.kind === "route" && detail.routeId === r.id
                      ? "used-route"
                      : ""
                  }
                >
                  <td>
                    <code>
                      {networkLabel(r.destination.ip, r.destination.prefix)}/
                      {r.destination.prefix}
                    </code>
                    <small>Static</small>
                  </td>
                  <td>
                    <code>{r.nextHop ?? "On-link"}</code>
                  </td>
                  <td>
                    <code>{r.outPortId}</code>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
      {device.kind !== "hub" && (
        <>
          <h3>
            {device.kind === "switch" || device.kind === "bridge"
              ? "MAC address table"
              : "ARP cache"}
          </h3>
          {Object.entries(
            device.kind === "switch" || device.kind === "bridge"
              ? runtime.mac
              : runtime.arp,
          ).filter(([key]) => key.startsWith(device.id + "/")).length === 0 ? (
            <p className="muted">No entries learned yet.</p>
          ) : (
            <dl className="state-entries">
              {Object.entries(
                device.kind === "switch" || device.kind === "bridge"
                  ? runtime.mac
                  : runtime.arp,
              )
                .filter(([key]) => key.startsWith(device.id + "/"))
                .map(([key, value]) => (
                  <div key={key}>
                    <dt>
                      <code>{key.slice(device.id.length + 1)}</code>
                    </dt>
                    <dd>
                      <code>{value}</code>
                    </dd>
                  </div>
                ))}
            </dl>
          )}
        </>
      )}
      {device.kind === "hub" && (
        <p>
          Hubs do not learn MAC addresses or maintain a routing table. They
          repeat incoming signals on the other ports.
        </p>
      )}
      {device.kind === "router" && (
        <>
          <NatTable controller={controller} deviceId={device.id} />
          <h3>DHCP leases</h3>
          {Object.values(runtime.dhcpLeases)
            .filter((l) => l.scopeId.startsWith(device.id + "/"))
            .map((l) => (
              <div className="field-row small" key={l.clientMac}>
                <code>{l.ip}</code>
                <code>{l.clientMac}</code>
              </div>
            ))}
        </>
      )}
    </aside>
  );
}
