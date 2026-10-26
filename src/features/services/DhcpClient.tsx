import type { AppController } from "../../app/types";
import { useApp } from "../../app/use-app";
export function DhcpClient({
  controller,
  deviceId,
}: {
  controller: AppController;
  deviceId: string;
}) {
  const s = useApp(controller),
    lease = s.runtimeReady ? s.projection.state.dhcpClients[deviceId] : null;
  return (
    <section className="tutorial">
      <span className="eyebrow">DHCP CLIENT</span>
      <p>
        {lease
          ? `Assigned IPv4: ${lease.ip}`
          : s.runtimeReady
            ? "No address assigned"
            : "Simulation state unavailable. Request a configuration to reconnect."}
      </p>
      {lease && (
        <p className="small">
          /{lease.prefix} · Gateway {lease.gateway} · No expiration
        </p>
      )}
      <button
        disabled={
          s.busy ||
          (s.runtimeReady &&
            (s.projection.status === "active" ||
              s.projection.cursor !== s.projection.frontier))
        }
        onClick={() =>
          void controller.dispatch({
            type: "simulation.start",
            operation: { kind: "dhcp", hostId: deviceId },
          })
        }
      >
        Request network configuration
      </button>
    </section>
  );
}
