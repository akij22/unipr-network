import { useEffect, useRef, useState, type ReactNode } from "react";
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

function restoreFocus(target: () => HTMLElement | null | undefined) {
  requestAnimationFrame(() => {
    // Preserve focus already moved to playback or another surviving control.
    if (document.activeElement !== document.body &&
      !document.activeElement?.closest(".device-dock, .ping-composer")) return;
    target()?.focus({ preventScroll: true });
  });
}

function restoreMenuFocus(menu: "topology" | "simulation") {
  restoreFocus(() => document.querySelector<HTMLElement>(`[data-menu="${menu}"]`));
}

function restoreDockFocus() {
  restoreFocus(() => document.querySelector<HTMLElement>(".device-dock-toggle"));
}

export function App({ controller, renderActions }: {
  controller: AppController;
  renderActions?: (actions: WorkspaceActions) => ReactNode;
}) {
  const state = useApp(controller);
  const actions = useWorkspaceActions(controller);
  const { catalog, save, networks, ping, setCatalog, setSave, setNetworks } = actions;
  const [inspecting, setInspecting] = useState<"packet" | "device">("device");
  const catalogFromDock = useRef(false);
  useEffect(() => {
    if (!catalog) catalogFromDock.current = false;
  }, [catalog]);
  const toggleDock = () => {
    const closing = catalog;
    catalogFromDock.current = !closing;
    actions.toggleCatalog();
    if (closing) restoreDockFocus();
  };
  const closeCatalog = () => {
    const fromDock = catalogFromDock.current;
    setCatalog(false);
    if (fromDock) restoreDockFocus();
    else restoreMenuFocus("topology");
  };
  const packetActive = state.projection.operationId !== null,
    deviceActive = state.selection?.kind === "device";
  // Plain Backspace/Delete deletes the currently selected device or cable.
  // The controller owns removal (device removal also drops attached cables);
  // React Flow's own delete key stays disabled (deleteKeyCode={null}).
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Backspace" && event.key !== "Delete") return;
      if (
        event.defaultPrevented ||
        event.isComposing ||
        event.repeat ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey
      )
        return;
      const target = event.target;
      // Never intercept keys aimed at text entry or editable UI.
      if (
        target instanceof Element &&
        target.closest(
          "input, textarea, select, [contenteditable]:not([contenteditable='false']), [role='textbox'], dialog, [role='dialog']",
        )
      )
        return;
      const snapshot = controller.getSnapshot();
      if (save || networks) return;
      // Reserve these keys on the canvas even without a selection: WebKit
      // otherwise treats Backspace as browser history navigation.
      event.preventDefault();
      const selection = snapshot.selection;
      if (snapshot.busy || !selection) return;
      if (selection.kind === "device")
        void controller.dispatch({ type: "device.remove", id: selection.id });
      else
        void controller.dispatch({ type: "link.remove", id: selection.id });
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [controller, save, networks]);
  return (
    <div
      className="app canvas-app"
      data-simulation-visible={String(packetActive)}
    >
      <div className="top-chrome">
        {renderActions ? renderActions(actions) : <WorkspaceMenu controller={controller} actions={actions} />}
        {/* The playback row belongs to a started operation: a running or
          retained simulation history shows it; topology editing does not. */}
        {packetActive && <SimulationControls controller={controller} />}
      </div>
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
            restoreMenuFocus("simulation");
          }} />}
          <DeviceCatalog
            controller={controller}
            open={catalog}
            onToggle={toggleDock}
            onClose={closeCatalog}
          />
          <ConnectionBuilder controller={controller} />
          <div className="network-focus">
            <SceneRecovery controller={controller} />
            <EventSummary controller={controller} />
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
    </div>
  );
}
