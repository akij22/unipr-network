import { useState } from "react";
import type { DeviceKind } from "../../domain/types";
const tips: Record<DeviceKind, string[]> = {
  host: [
    "Choose Manual to enter an address, or Automatic (DHCP) to request one explicitly.",
    "The prefix decides which destinations are on the same network.",
    "A default gateway is needed to reach other networks. Its address must be reachable on this link.",
  ],
  router: [
    "Configure each connected interface with an address and prefix.",
    "Directly connected networks become routes automatically. Add static routes for more distant networks.",
    "DHCP assigns configuration to hosts. NAT shares the external interface address. These are independent services.",
  ],
  switch: [
    "Connect hosts or routers using available ports.",
    "The switch learns source MAC addresses as frames arrive.",
    "Unknown destinations and broadcasts are forwarded to the other ports.",
  ],
  bridge: [
    "A bridge connects two Ethernet segments.",
    "It learns MAC addresses, like a switch with two ports.",
  ],
  hub: [
    "A hub repeats incoming traffic on all its other ports.",
    "It does not learn MAC addresses or make routing decisions.",
  ],
};
export function Tutorial({ kind }: { kind: DeviceKind }) {
  const [step, setStep] = useState(0),
    items = tips[kind],
    current = Math.min(step, items.length - 1);
  return (
    <details className="guide" open>
      <summary>
        <span className="eyebrow">Guided setup</span>
        <span className="guide-progress">
          {current + 1}/{items.length}
        </span>
      </summary>
      <p>{items[current]}</p>
      <div className="guide-controls">
        <button
          className="text-button"
          disabled={current === 0}
          onClick={() => setStep(current - 1)}
        >
          Previous tip
        </button>
        <button
          className="text-button"
          disabled={current === items.length - 1}
          onClick={() => setStep(current + 1)}
        >
          Next tip
        </button>
      </div>
    </details>
  );
}
