import { useEffect, useRef, useState } from "react";
import type { AppController } from "../../app/types";
import { useApp } from "../../app/use-app";
export function PingComposer({ controller, initiallyOpen = false, onClose }: {
  controller: AppController;
  initiallyOpen?: boolean;
  onClose?: () => void;
}) {
  const s = useApp(controller),
    p = s.projection,
    [source, setSource] = useState(""),
    [destination, setDestination] = useState("");
  const composer = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    if (initiallyOpen) composer.current?.querySelector<HTMLSelectElement>("select")?.focus({ preventScroll: true });
  }, [initiallyOpen]);
  const hosts = s.document.network.devices.filter((d) => d.kind === "host");
  const activeSource =
    hosts.find((h) => h.id === source)?.id ?? hosts[0]?.id ?? "";
  const blocked =
    s.busy ||
    (s.runtimeReady && (p.status === "active" || p.cursor !== p.frontier));
  return (
    <details ref={composer} className="ping-composer" open={initiallyOpen || undefined}
      onToggle={(event) => { if (!event.currentTarget.open) onClose?.(); }}
      onKeyDown={(event) => {
        if (event.key === "Escape" && onClose) { event.stopPropagation(); onClose(); }
      }}>
      <summary>Send a packet</summary>
      <form
        className="ping-form"
        onSubmit={async (e) => {
          e.preventDefault();
          const previous = controller.getSnapshot().projection.operationId;
          await controller.dispatch({
            type: "simulation.start",
            operation: {
              kind: "ping",
              sourceId: activeSource,
              destination,
            },
          });
          const current = controller.getSnapshot();
          if (current.runtimeReady && current.projection.operationId !== previous && composer.current) {
            composer.current.open = false;
            onClose?.();
            document.querySelector<HTMLButtonElement>('[aria-label="Next step"]')?.focus({ preventScroll: true });
          }
        }}
      >
        <label>
          Source host
          <select
            aria-label="Source host"
            value={activeSource}
            onChange={(e) => setSource(e.target.value)}
            disabled={!hosts.length}
          >
            {!hosts.length && <option value="">Add a host first</option>}
            {hosts.map((d) => (
              <option key={d.id} value={d.id}>
                {s.document.layout[d.id]?.name ?? d.id}
              </option>
            ))}
          </select>
        </label>
        <span className="ping-arrow" aria-hidden="true">
          →
        </span>
        <label>
          Destination IPv4
          <input
            inputMode="decimal"
            placeholder="192.168.2.10"
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            autoComplete="off"
            spellCheck={false}
          />
        </label>
        <button
          className="primary"
          type="submit"
          disabled={blocked || !hosts.length}
        >
          Start ping
        </button>
        {onClose && <button type="button" onClick={onClose}>Close packet composer</button>}
      </form>
    </details>
  );
}
export function SimulationControls({
  controller,
}: {
  controller: AppController;
}) {
  const s = useApp(controller),
    p = s.projection;
  return (
    <nav className="simulation-dock" aria-label="Simulation controls">
      <div className="playback-buttons">
        <button
          aria-label="Previous step"
          disabled={!s.runtimeReady || s.busy || p.cursor === 0}
          onClick={() =>
            void controller.dispatch({ type: "simulation.previous" })
          }
        >
          ← <span>Previous</span>
        </button>
        <button
          aria-label={s.playing ? "Pause simulation" : "Play simulation"}
          disabled={
            !s.runtimeReady ||
            (s.busy && !s.playing) ||
            (p.status !== "active" && p.cursor === p.frontier)
          }
          onClick={() =>
            void controller.dispatch({
              type: "simulation.play",
              enabled: !s.playing,
            })
          }
        >
          {s.playing ? "Pause" : "Play"}
        </button>
        <button
          className="primary"
          aria-label="Next step"
          disabled={
            !s.runtimeReady ||
            s.busy ||
            (p.status !== "active" && p.cursor === p.frontier)
          }
          onClick={() => void controller.dispatch({ type: "simulation.next" })}
        >
          Next →
        </button>
      </div>
      <div className="timeline">
        <label className="timeline-label" htmlFor="known-events">
          {!s.runtimeReady
            ? "Simulation unavailable"
            : p.total !== null
              ? `Step ${p.cursor} of ${p.total}`
              : p.status === "active"
                ? `Step ${p.cursor} · simulation in progress`
                : "Ready to simulate"}
        </label>
        <input
          id="known-events"
          aria-label="Known events"
          type="range"
          min="0"
          max={s.runtimeReady ? Math.max(1, p.frontier) : 1}
          value={s.runtimeReady ? p.cursor : 0}
          disabled={!s.runtimeReady || !p.frontier || s.busy}
          onChange={(e) =>
            void controller.dispatch({
              type: "simulation.seek",
              index: Number(e.target.value),
            })
          }
        />
      </div>
      <div className="reset-buttons">
        <button
          aria-label="Cancel operation"
          disabled={!s.runtimeReady || (!s.busy && p.status === "idle")}
          onClick={() =>
            void controller.dispatch({ type: "simulation.cancel" })
          }
        >
          Cancel
        </button>
        <button
          aria-label="Reset network state"
          disabled={!s.runtimeReady}
          onClick={() => void controller.dispatch({ type: "simulation.reset" })}
        >
          Reset network
        </button>
      </div>
    </nav>
  );
}
