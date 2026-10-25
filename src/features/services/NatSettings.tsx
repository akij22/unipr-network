import { useState } from "react";
import type { AppController } from "../../app/types";
import { useApp } from "../../app/use-app";
import type { NatConfig } from "../../domain/types";
export function NatSettings({
  controller,
  deviceId,
}: {
  controller: AppController;
  deviceId: string;
}) {
  const s = useApp(controller),
    device = s.document.network.devices.find((d) => d.id === deviceId);
  const initial = device?.kind === "router" ? device.nat : null;
  const [draft, setDraft] = useState<NatConfig>(
      initial ?? {
        enabled: false,
        insidePortIds: [],
        outsidePortId: device?.ports.at(-1)?.id ?? "",
        sourceNetworks: [],
      },
    ),
    [networks, setNetworks] = useState(
      initial?.sourceNetworks.map((n) => `${n.ip}/${n.prefix}`).join(", ") ??
        "",
    );
  if (device?.kind !== "router") return null;
  return (
    <section className="service-settings">
      <div className="section-head">
        <h3>NAT / PAT service</h3>
        <button
          aria-label={draft.enabled ? "Disable NAT" : "Enable NAT"}
          aria-pressed={draft.enabled}
          onClick={() => setDraft({ ...draft, enabled: !draft.enabled })}
        >
          {draft.enabled ? "Enabled" : "Enable NAT"}
        </button>
      </div>
      <p className="muted small">
        Share the external interface address using ICMP identifiers. This lab
        keeps translations until reset.
      </p>
      {draft.enabled && (
        <>
          <label>
            External interface
            <select
              aria-label="NAT external interface"
              value={draft.outsidePortId}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  outsidePortId: e.target.value,
                  insidePortIds: draft.insidePortIds.filter(
                    (id) => id !== e.target.value,
                  ),
                })
              }
            >
              {device.ports.map((p) => (
                <option value={p.id} key={p.id}>
                  {p.id} · {p.address?.ip ?? "No address"}
                </option>
              ))}
            </select>
          </label>
          <fieldset>
            <legend>Internal interfaces</legend>
            {device.ports.map((p) => (
              <label className="checkbox-row" key={p.id}>
                <input
                  aria-label={`NAT internal interface ${p.id}`}
                  type="checkbox"
                  checked={draft.insidePortIds.includes(p.id)}
                  disabled={p.id === draft.outsidePortId}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      insidePortIds: e.target.checked
                        ? [...draft.insidePortIds, p.id]
                        : draft.insidePortIds.filter((id) => id !== p.id),
                    })
                  }
                />
                {p.id} · {p.address?.ip ?? "No address"}
              </label>
            ))}
          </fieldset>
          <label>
            NAT source networks
            <input
              value={networks}
              onChange={(e) => setNetworks(e.target.value)}
              placeholder="192.168.1.0/24, 192.168.2.0/24"
            />
          </label>
        </>
      )}
      <button
        disabled={s.busy}
        onClick={() => {
          const sourceNetworks = networks
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
            .map((s) => {
              const parts = s.split("/");
              return {
                ip: parts[0],
                prefix:
                  parts.length === 2 && /^\d+$/.test(parts[1])
                    ? Number(parts[1])
                    : -1,
              };
            });
          void controller.dispatch({
            type: "config.apply",
            network: {
              ...s.document.network,
              devices: s.document.network.devices.map((d) =>
                d.id === deviceId
                  ? { ...device, nat: { ...draft, sourceNetworks } }
                  : d,
              ),
            },
          });
        }}
      >
        Apply NAT settings
      </button>
    </section>
  );
}
