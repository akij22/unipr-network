import { useEffect, useRef, useState } from "react";
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
  open,
  onToggle,
  onClose,
}: {
  controller: AppController;
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
}) {
  const state = useApp(controller);
  const first = useRef<HTMLButtonElement>(null);
  const [active, setActive] = useState<number | null>(null);
  useEffect(() => {
    if (open) first.current?.focus({ preventScroll: true });
  }, [open]);
  const focused = active === null ? null : choices[active];
  return (
    <div
      className="device-dock"
      data-open={open}
      onKeyDown={(event) => {
        if (open && event.key === "Escape") {
          event.stopPropagation();
          onClose();
        }
      }}
    >
      <p className="device-dock-caption">
        {focused
          ? `${focused[1]}: ${focused[2]}`
          : "Choose a device to add it to the canvas."}
      </p>
      <div className="device-dock-pill">
        <button
          type="button"
          className="device-dock-toggle"
          disabled={state.busy}
          aria-label="Toggle device dock"
          aria-expanded={open}
          aria-controls="device-dock-choices"
          onClick={onToggle}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </button>
        <section id="device-dock-choices" className="device-dock-choices" aria-label="Device catalog">
          {choices.map(([kind], index) => (
            <button
              key={kind}
              ref={kind === "host" ? first : undefined}
              type="button"
              disabled={state.busy}
              className="device-dock-choice"
              aria-label={`Add ${kind}`}
              onClick={() => {
                void controller.dispatch({ type: "device.add", kind });
                onClose();
              }}
              onPointerEnter={() => setActive(index)}
              onPointerLeave={() => setActive(null)}
              onFocus={() => setActive(index)}
              onBlur={() => setActive(null)}
            >
              <img className="device-dock-icon" src={`/device-icons/${kind}.png`} alt="" aria-hidden="true" draggable={false} />
            </button>
          ))}
        </section>
      </div>
    </div>
  );
}
