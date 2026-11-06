import { useState } from "react";
import type { AppController } from "../../app/types";
import { NetworkFlow } from "./flow/NetworkFlow";

/** The topology canvas. Devices are selected and dragged directly on the
 * canvas; dragging empty space pans the view and the wheel zooms. Arrow
 * keys move the focused and selected device. */
export function NetworkScene({
  controller,
  onContextLost,
}: {
  controller: AppController;
  onContextLost: (cause?: unknown) => void;
}) {
  const [ready, setReady] = useState(false);
  return (
    <section
      className="network-stage"
      aria-label="Network topology workspace"
      data-scene-ready={ready}
    >
      <div className="scene-canvas">
        <NetworkFlow controller={controller} onReady={() => setReady(true)} onError={onContextLost} />
      </div>
    </section>
  );
}
