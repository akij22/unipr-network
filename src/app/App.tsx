import { useState, type ReactNode } from "react";
import { useWorkspaceActions, type WorkspaceActions } from "./use-workspace-actions";
import { WorkspaceMenu } from "./WorkspaceMenu";
import type { AppController } from "./types";
import { useApp } from "./use-app";
import { DeviceCatalog } from "../features/editor/DeviceCatalog";
import { DeviceInspector } from "../features/editor/DeviceInspector";
import { ConnectionBuilder } from "../features/editor/ConnectionBuilder";
import { presentIssue } from "../content/issues.en";
import { SceneRecovery } from "../features/scene/SceneRecovery";
import {
  SimulationControls,
  PingComposer,
} from "../features/simulation/SimulationControls";
import { EventSummary } from "../features/simulation/EventSummary";
import { PacketInspector } from "../features/simulation/PacketInspector";
import { SaveNetwork } from "../features/saved-networks/SaveNetwork";
import { SavedNetworks } from "../features/saved-networks/SavedNetworks";

function restoreMenuFocus() {
  requestAnimationFrame(() => {
    // Preserve focus already moved to playback or another surviving control.
    if (document.activeElement !== document.body &&
      !document.activeElement?.closest(".catalog, .ping-composer")) return;
    const menu = document.querySelector<HTMLElement>(".workspace-menu");
    menu?.querySelector<HTMLButtonElement>(menu.dataset.open === "true"
      ? "nav button" : ".workspace-menu-toggle")?.focus({ preventScroll: true });
  });
}

export function App({ controller, renderActions }: {
  controller: AppController;
  renderActions?: (actions: WorkspaceActions) => ReactNode;
}) {
  const state = useApp(controller);
  const actions = useWorkspaceActions(controller);
  const { catalog, save, networks, ping, setCatalog, setSave, setNetworks } = actions;
  const [inspecting, setInspecting] = useState<"packet" | "device">("device");
  const packetActive = state.projection.operationId !== null,
    deviceActive = state.selection !== null;
  return (
    <div className="app canvas-app">
      {renderActions ? renderActions(actions) : <WorkspaceMenu controller={controller} actions={actions} />}
      {state.issue && !save && !networks && (
        <div role="alert" className="alert">
          <div>
            <strong>
              {state.issue.category === "network"
                ? "Communication stopped"
                : state.issue.category === "input"
                  ? "Check your configuration"
                  : "Action needs attention"}
            </strong>
            <p>{presentIssue(state.issue, state.document)}</p>
          </div>
          <button
            onClick={() => void controller.dispatch({ type: "issue.clear" })}
          >
            Dismiss
          </button>
        </div>
      )}
      {state.notice && !save && !networks && (
        <div role="status" className="notice">
          {state.notice}
        </div>
      )}
      {save && (
        <SaveNetwork controller={controller} onClose={() => setSave(false)} />
      )}{" "}
      {networks && (
        <SavedNetworks
          controller={controller}
          onClose={() => setNetworks(false)}
        />
      )}
      <main
        id="workspace"
        className={`workspace${state.selection ? " has-selection" : ""}`}
      >
        <div className="lab">
          {ping && <PingComposer controller={controller} initiallyOpen onClose={() => {
            actions.setPing(false);
            restoreMenuFocus();
          }} />}
          {catalog && (
            <DeviceCatalog
              controller={controller}
              onClose={() => {
                setCatalog(false);
                restoreMenuFocus();
              }}
            />
          )}
          <ConnectionBuilder controller={controller} />
          <div className="network-focus">
            <SceneRecovery controller={controller} />
            <EventSummary controller={controller} />
          </div>
          <div className="network-tools">
            <div className="device-strip" aria-label="Network devices">
              {state.document.network.devices.map((d) => (
                <button
                  key={d.id}
                  data-device-id={d.id}
                  aria-label={`Select ${state.document.layout[d.id]?.name ?? d.id}`}
                  aria-pressed={state.selection?.id === d.id}
                  onClick={() =>
                    void controller.dispatch({
                      type: "selection.set",
                      selection: { kind: "device", id: d.id },
                    })
                  }
                >
                  <strong>{state.document.layout[d.id]?.name ?? d.id}</strong>
                  <span>{d.kind}</span>
                </button>
              ))}
            </div>
            <details className="connections-list">
              <summary>Connections ({state.document.network.links.length})</summary>
              <div className="link-list">
                {state.document.network.links.map((l, i) => (
                  <button
                    key={l.id}
                    onClick={() =>
                      void controller.dispatch({
                        type: "selection.set",
                        selection: { kind: "link", id: l.id },
                      })
                    }
                  >
                    Link {i + 1}:{" "}
                    {l.ends
                      .map(
                        (e) =>
                          `${state.document.layout[e.deviceId].name} · ${e.portId}`,
                      )
                      .join(" ↔ ")}
                  </button>
                ))}
              </div>
            </details>
          </div>
          <div className="inspection-overlay">
            {packetActive && deviceActive ? (
              <>
                <div
                  className="panel-switch segmented"
                  role="group"
                  aria-label="Inspection focus"
                >
                  <button
                    aria-pressed={inspecting === "packet"}
                    onClick={() => setInspecting("packet")}
                  >
                    Packet
                  </button>
                  <button
                    aria-pressed={inspecting === "device"}
                    onClick={() => setInspecting("device")}
                  >
                    Device
                  </button>
                </div>
                {inspecting === "packet" ? (
                  <PacketInspector controller={controller} />
                ) : (
                  <DeviceInspector controller={controller} />
                )}
              </>
            ) : packetActive ? (
              <PacketInspector controller={controller} />
            ) : deviceActive ? (
              <DeviceInspector controller={controller} />
            ) : null}
          </div>
        </div>
      </main>
      <div className="simulation-overlay">
        <div className="simulation-surface">
          <SimulationControls controller={controller} />
          <footer className="statusbar">
            <span>
              {state.document.network.devices.length} devices ·{" "}
              {state.document.network.links.length} links
            </span>
            <span>{state.busy ? "Updating network…" : "Ready to explore"}</span>
            <span>Ethernet · IPv4</span>
          </footer>
        </div>
      </div>
    </div>
  );
}
