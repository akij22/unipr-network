import { useState } from "react";
import type { AppController } from "../../app/types";
import { useApp } from "../../app/use-app";
import type { DhcpScope } from "../../domain/types";
export function DhcpSettings({
  controller,
  deviceId,
}: {
  controller: AppController;
  deviceId: string;
}) {
  const s = useApp(controller),
    device = s.document.network.devices.find((d) => d.id === deviceId);
  const [scopes, setScopes] = useState<DhcpScope[]>(
    device?.kind === "router"
      ? device.ports.map(
          (p) =>
            device.dhcpScopes.find((sc) => sc.portId === p.id) ?? {
              id: `dhcp-${p.id}`,
              portId: p.id,
              enabled: false,
              first: "",
              last: "",
              gateway: p.address?.ip ?? "",
            },
        )
      : [],
  );
  if (device?.kind !== "router") return null;
  const update = (index: number, patch: Partial<DhcpScope>) =>
    setScopes(scopes.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  return (
    <section className="service-settings">
      <h3>DHCP service</h3>
      <p className="muted small">
        Assign addresses on directly connected networks. Acquisition is
        explicit; leases do not expire in this lab.
      </p>
      {scopes.map((scope, i) => {
        const p = device.ports.find((p) => p.id === scope.portId);
        return (
          <section className="interface" key={scope.id}>
            <div className="section-head">
              <code>{scope.portId}</code>
              <button
                aria-label={`${scope.enabled ? "Disable" : "Enable"} DHCP on ${scope.portId}`}
                aria-pressed={scope.enabled}
                disabled={!p?.address}
                onClick={() => update(i, { enabled: !scope.enabled })}
              >
                {scope.enabled ? "Enabled" : "Enable DHCP"}
              </button>
            </div>
            {!p?.address && (
              <p className="small muted">
                Apply an IPv4 address to this interface first.
              </p>
            )}
            {scope.enabled && (
              <>
                <label>
                  DHCP first address {scope.portId}
                  <input
                    value={scope.first}
                    placeholder="192.168.1.100"
                    onChange={(e) => update(i, { first: e.target.value })}
                    inputMode="decimal"
                  />
                </label>
                <label>
                  DHCP last address {scope.portId}
                  <input
                    value={scope.last}
                    placeholder="192.168.1.110"
                    onChange={(e) => update(i, { last: e.target.value })}
                    inputMode="decimal"
                  />
                </label>
                <label>
                  DHCP gateway {scope.portId}
                  <input
                    value={scope.gateway}
                    onChange={(e) => update(i, { gateway: e.target.value })}
                    inputMode="decimal"
                  />
                </label>
              </>
            )}
          </section>
        );
      })}
      <button
        disabled={s.busy}
        onClick={() =>
          void controller.dispatch({
            type: "config.apply",
            network: {
              ...s.document.network,
              devices: s.document.network.devices.map((d) =>
                d.id === deviceId ? { ...device, dhcpScopes: scopes } : d,
              ),
            },
          })
        }
      >
        Apply DHCP settings
      </button>
    </section>
  );
}
