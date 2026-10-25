import { useState } from "react";
import type { AppController } from "../../app/types";
import { useApp } from "../../app/use-app";
import type { ProtocolId } from "../../simulation/types";
import type { EthernetFrame } from "../../simulation/packets";
import { ProtocolDetails } from "../learning/ProtocolDetails";
function rows(frame: EthernetFrame, layer: ProtocolId): [string, string][] {
  const p = frame.payload;
  if (layer === "ethernet")
    return [
      ["Source MAC", frame.srcMac],
      ["Destination MAC", frame.dstMac],
      ["EtherType", p.kind === "arp" ? "0x0806 · ARP" : "0x0800 · IPv4"],
    ];
  if (p.kind === "arp")
    return [
      ["Opcode", p.opcode],
      ["Sender IPv4", p.senderIp],
      ["Sender MAC", p.senderMac],
      ["Target IPv4", p.targetIp],
      ["Target MAC", p.targetMac],
    ];
  if (layer === "ipv4")
    return [
      ["Source IPv4", p.src],
      ["Destination IPv4", p.dst],
      ["TTL", String(p.ttl)],
      ["Header checksum", `0x${p.checksum.toString(16).padStart(4, "0")}`],
      ["Protocol", p.payload.kind === "icmp" ? "1 · ICMP" : "17 · UDP"],
    ];
  const inner = p.payload;
  if (inner.kind === "icmp")
    return [
      [
        "Type",
        `${inner.type} · ${inner.type === 8 ? "Echo Request" : inner.type === 0 ? "Echo Reply" : inner.type === 11 ? "Time Exceeded" : "Destination Unreachable"}`,
      ],
      ...(inner.type === 0 || inner.type === 8
        ? ([
            ["Identifier", String(inner.identifier)],
            ["Sequence", String(inner.sequence)],
          ] as [string, string][])
        : ([["Code", String(inner.code)]] as [string, string][])),
      ["Checksum", `0x${inner.checksum.toString(16).padStart(4, "0")}`],
      ...(inner.quote
        ? ([
            ["Quoted source", inner.quote.src],
            ["Quoted destination", inner.quote.dst],
          ] as [string, string][])
        : []),
    ];
  if (layer === "udp")
    return [
      ["Client / server ports", `${inner.srcPort} → ${inner.dstPort}`],
      ["UDP checksum", String(inner.checksum)],
    ];
  const dhcp = inner.payload;
  return [
    ["Message", dhcp.message.toUpperCase()],
    ["Transaction", String(dhcp.transaction)],
    ["Client MAC", dhcp.clientMac],
    ["Offered address", dhcp.offer?.ip ?? "Not assigned"],
    ["Gateway", dhcp.offer?.gateway ?? "Not assigned"],
    ["Lease", dhcp.offer ? "No expiration" : "Not assigned"],
  ];
}
export function PacketInspector({ controller }: { controller: AppController }) {
  const s = useApp(controller),
    event = s.runtimeReady ? s.projection.event : null,
    [protocol, setProtocol] = useState<ProtocolId | null>(null);
  const after = event?.after[0] ?? event?.before[0],
    before = event?.before[0],
    depth = s.document.view.depth;
  const layers: ProtocolId[] = after
    ? [
        "ethernet",
        ...(depth !== "ethernet"
          ? [
              after.payload.kind === "arp"
                ? ("arp" as const)
                : ("ipv4" as const),
            ]
          : []),
        ...(depth === "full" && after.payload.kind === "ipv4"
          ? after.payload.payload.kind === "icmp"
            ? ["icmp" as const]
            : ["udp" as const, "dhcp" as const]
          : []),
      ]
    : [];
  return (
    <section className="packet-inspector">
      <div className="section-head">
        <div>
          <span className="eyebrow">INSIDE THE PACKET</span>
          <h2>Fields in context</h2>
        </div>
        <div className="segmented" aria-label="Packet detail level">
          {(["ethernet", "ip", "full"] as const).map((value, i) => (
            <button
              key={value}
              aria-pressed={depth === value}
              onClick={() =>
                void controller.dispatch({
                  type: "view.set",
                  view: { ...s.document.view, depth: value },
                })
              }
            >
              {["Ethernet", "Ethernet + IP", "Full packet"][i]}
            </button>
          ))}
        </div>
      </div>
      {!after ? (
        <p className="muted">
          A frame will appear when the selected event sends or processes one.
        </p>
      ) : (
        <>
          <div className="packet-cards">
            {layers.map((layer) => (
              <div className="packet-card" key={layer}>
                <button
                  className="packet-card-title"
                  onClick={() => {
                    void controller.dispatch({
                      type: "simulation.play",
                      enabled: false,
                    });
                    setProtocol(layer);
                  }}
                >
                  {layer === "ethernet"
                    ? "L2 · ETHERNET"
                    : layer === "ipv4"
                      ? "L3 · IPv4"
                      : layer === "icmp"
                        ? "L3 · ICMP"
                        : layer.toUpperCase()}{" "}
                  ↗
                </button>
                {rows(after, layer).map(([name, value]) => {
                  const old = before
                    ? rows(before, layer).find((r) => r[0] === name)?.[1]
                    : null;
                  return (
                    <div className="field-row" key={name}>
                      <span>{name}</span>
                      <code>
                        {old && old !== value ? (
                          <>
                            <del>{old}</del> <mark>{value}</mark>
                          </>
                        ) : (
                          value
                        )}
                      </code>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
          <p className="packet-note">
            Frame {after.id} · Message {after.rootId}.{" "}
            {event?.after.length && event.after.length > 1
              ? `${event.after.length} copies are associated with this event.`
              : "Select a highlighted link to inspect where this frame travels."}
          </p>
        </>
      )}
      {protocol && (
        <ProtocolDetails
          protocol={protocol}
          onClose={() => setProtocol(null)}
        />
      )}
    </section>
  );
}
