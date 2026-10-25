import { useState } from "react";
import type { AppController } from "../../app/types";
import { useApp } from "../../app/use-app";
import { presentEvent } from "../../content/present";
import { protocols } from "../../content/protocols.en";
import type { ProtocolId } from "../../simulation/types";
import { ProtocolDetails } from "../learning/ProtocolDetails";
export function EventSummary({ controller }: { controller: AppController }) {
  const s = useApp(controller),
    event = s.runtimeReady ? s.projection.event : null,
    shown = event ? presentEvent(event, s.document) : null,
    [protocol, setProtocol] = useState<ProtocolId | null>(null);
  return (
    <section
      className="event-summary"
      data-sim-status={s.runtimeReady ? s.projection.status : "resource-error"}
      aria-busy={s.busy}
      aria-label="Current simulation event"
    >
      <div className="event-heading">
        <span className="step-badge">
          {event ? `EVENT ${event.index}` : "OBSERVE & UNDERSTAND"}
        </span>
        <h2>
          {!s.runtimeReady
            ? "Simulation needs to reconnect"
            : (shown?.title ??
              (s.projection.status === "active"
                ? "Operation queued"
                : "Follow every decision"))}
        </h2>
      </div>
      <p aria-live="polite">
        {!s.runtimeReady
          ? "Your configuration is kept. Start a new operation to retry, or save before reloading."
          : (shown?.summary ??
            (s.projection.status === "active"
              ? "Use Next or Play to generate the first event."
              : "Configure your network and start a ping or an explicit DHCP request. Every event explains what happened and why."))}
      </p>
      {shown && (
        <div className="protocol-row">
          <span className="eyebrow">INVOLVED NOW</span>
          {shown.protocolIds.map((id) => (
            <button
              className="protocol-chip"
              key={id}
              onClick={() => {
                void controller.dispatch({
                  type: "simulation.play",
                  enabled: false,
                });
                setProtocol(id);
              }}
            >
              {protocols[id].name}
            </button>
          ))}
          <span className="muted small">Virtual time {event?.time} ms</span>
        </div>
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
