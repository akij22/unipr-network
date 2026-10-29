import { useEffect, useRef } from "react";
import { useApp } from "../../app/use-app";
import type { AppController } from "../../app/types";
import type { DeviceKind } from "../../domain/types";
const choices: [DeviceKind, string, string][] = [
  ["host", "Host", "Send and receive packets"],
  ["router", "Router", "Connect IP networks"],
  ["switch", "Switch", "Learn and forward frames"],
  ["bridge", "Bridge", "Connect two Ethernet segments"],
  ["hub", "Hub", "Repeat on every other port"],
];
export function DeviceCatalog({
  controller,
  onClose,
}: {
  controller: AppController;
  onClose: () => void;
}) {
  const state = useApp(controller);
  const first = useRef<HTMLButtonElement>(null);
  useEffect(() => { first.current?.focus(); }, []);
  return (
    <section className="catalog" aria-label="Device catalog" onKeyDown={(e) => {
      if (e.key === "Escape") { e.stopPropagation(); onClose(); }
    }}>
      <div className="section-head">
        <h2>Add to your network</h2>
        <button onClick={onClose}>Close</button>
      </div>
      <p className="catalog-hint">Choose a device to add it to the grid. Then use <strong>Position device</strong> to choose its location.</p>
      <div className="catalog-grid">
        {choices.map(([kind, label, description]) => (
          <button
            key={kind}
            ref={kind === "host" ? first : undefined}
            disabled={state.busy}
            className="catalog-choice"
            aria-label={`Add ${kind}`}
            onClick={() => {
              void controller.dispatch({ type: "device.add", kind });
              onClose();
            }}
          >
            <svg viewBox="0 0 48 40" aria-hidden="true">
              {kind === "host" ? <><rect x="8" y="4" width="32" height="23" rx="2" /><path d="M24 27v7M15 35h18" /></> :
                <><rect x="4" y="10" width="40" height="22" rx="3" /><path d="M10 25h4m4 0h4m4 0h4m4 0h4" />
                {kind === "router" ? <path d="M15 17h18m-4-4 4 4-4 4M19 13l-4 4 4 4" /> : <path d="M10 17h5m4 0h5m4 0h5" />}</>}
            </svg>
            <strong>{label}</strong>
            <span>{description}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
