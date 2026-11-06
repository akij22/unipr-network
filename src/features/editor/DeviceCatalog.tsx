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
      <p className="catalog-hint">Choose a device to add it. Then drag it on the canvas to choose its location.</p>
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
            <img className="catalog-device-icon" src={`/device-icons/${kind}.png`} alt="" aria-hidden="true" draggable={false} />
            <strong>{label}</strong>
            <span>{description}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
