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
    items = tips[kind];
  return (
    <section className="tutorial">
      <span className="eyebrow">
        GUIDED SETUP · {step + 1}/{items.length}
      </span>
      <p>{items[Math.min(step, items.length - 1)]}</p>
      <div className="row">
        <button disabled={step === 0} onClick={() => setStep(step - 1)}>
          Previous tip
        </button>
        <button
          disabled={step === items.length - 1}
          onClick={() => setStep(step + 1)}
        >
          Next tip
        </button>
      </div>
    </section>
  );
}
