import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { AppController } from "../../app/types";
import { useApp } from "../../app/use-app";
import { NetworkFlow } from "./flow/NetworkFlow";
import { canvasToLayout } from "./flow/flow-view";

/** The topology canvas. Devices are dragged directly on the canvas; dragging
 * empty space pans the view. The lab keeps its selection, inspector and
 * simulation behaviour; only the workspace surface changed. */
export function NetworkScene({
  controller,
  onContextLost,
}: {
  controller: AppController;
  onContextLost: (cause?: unknown) => void;
}) {
  const state = useApp(controller),
    [ready, setReady] = useState(false),
    [placing, setPlacing] = useState<string | null>(null);
  const positionButton = useRef<HTMLButtonElement>(null);
  const selected = state.selection?.kind === "device" ? state.selection.id : null;
  const moving = placing === selected && selected !== null && !!state.document.layout[selected];
  useEffect(() => { setPlacing(null); }, [selected, state.viewEpoch]);
  const stopPlacing = () => {
    setPlacing(null);
    positionButton.current?.focus({ preventScroll: true });
  };
  const place = useCallback(
    (x: number, y: number) => {
      if (!moving || !selected) return;
      const layout = canvasToLayout(x, y);
      void controller.dispatch({
        type: "device.move",
        id: selected,
        x: layout.x,
        z: layout.z,
      });
      stopPlacing();
    },
    [controller, moving, selected],
  );
  const nudge = useCallback(
    (dx: number, dz: number) => {
      if (!selected) return;
      const current = controller.getSnapshot().document.layout[selected];
      if (!current) return;
      void controller.dispatch({
        type: "device.move",
        id: selected,
        x: current.x + dx,
        z: current.z + dz,
      });
    },
    [controller, selected],
  );
  const placement = useMemo(
    () => (selected ? state.document.layout[selected] : undefined),
    [selected, state.document.layout],
  );
  return (
    <section
      className="network-stage"
      aria-label="Network topology workspace"
      data-scene-ready={ready}
      data-placement-active={moving}
      onKeyDown={(e) => {
        if (e.key === "Escape" && moving) { e.stopPropagation(); stopPlacing(); }
      }}
    >
      <div className="scene-canvas">
        <NetworkFlow
          controller={controller}
          onReady={() => setReady(true)}
          onError={onContextLost}
          placing={moving}
          onPlace={place}
        />
      </div>
      {selected && (
        <div className="placement-tools">
          <button
            ref={positionButton}
            aria-pressed={moving}
            onClick={() => setPlacing(moving ? null : selected)}
          >
            {moving ? "Cancel positioning" : "Position device"}
          </button>
          {!moving && (
            <button
              className="configure-in-scene"
              onClick={() => {
                const inspector = document.querySelector<HTMLElement>(".inspector-stack");
                inspector?.scrollIntoView({ block: "start" });
                inspector?.querySelector<HTMLButtonElement>("button")?.focus({ preventScroll: true });
              }}
            >
              Configure device
            </button>
          )}
          {moving && (
            <div className="placement-guide" role="status">
              <strong>Place {placement?.name}</strong>
              <p>
                Tap an empty spot on the canvas, or drag the device itself.
                Use the arrow buttons for a precise move. Escape to cancel.
              </p>
              <div className="row" aria-label="Move selected device">
                {(
                  [
                    ["Left", -2, 0],
                    ["Right", 2, 0],
                    ["Forward", 0, -2],
                    ["Back", 0, 2],
                  ] as const
                ).map(([label, dx, dz]) => (
                  <button key={label} onClick={() => nudge(dx, dz)}>
                    {label}
                  </button>
                ))}
                <button onClick={stopPlacing}>Done</button>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
