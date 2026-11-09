import type { AppController } from "../../app/types";
import { useApp } from "../../app/use-app";
export function ConnectionBuilder({
  controller,
}: {
  controller: AppController;
}) {
  const state = useApp(controller);
  if (!state.connection) return null;
  return (
    <section className="connection-guide" aria-live="polite">
      <span className="eyebrow">
        CONNECTION GUIDE · STEP {state.connection.from ? 2 : 1}/2
      </span>
      <strong>
        {state.connection.from
          ? "Choose the destination port"
          : "Choose a port to connect"}
      </strong>
      <p>
        Drag between orange dots, or tap two dots, to use free ports
        automatically. For a manual choice, select an available port in each
        device's inspector.{" "}
        {state.connection.from &&
          `Starting at ${state.document.layout[state.connection.from.deviceId]?.name} · ${state.connection.from.portId}.`}
      </p>
      <button
        onClick={() => void controller.dispatch({ type: "connection.cancel" })}
      >
        Cancel connection
      </button>
    </section>
  );
}
