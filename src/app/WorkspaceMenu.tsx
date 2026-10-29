import { useEffect, useRef, useState, type ReactNode } from "react";
import type { AppController } from "./types";
import type { WorkspaceActions } from "./use-workspace-actions";
import { useApp } from "./use-app";

const icon = (path: string) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d={path} /></svg>
);

const ICONS = {
  add: icon("M12 5v14M5 12h14"),
  connect: icon("M4 12h5M15 12h5M9 8h6v8H9z"),
  send: icon("M4 12h12M12 6l6 6-6 6"),
  save: icon("M5 4h11l3 3v13H5zM8 4v5h7V4M8 20v-6h8v6"),
  library: icon("M4 6h16M4 12h16M4 18h10"),
  network: icon("M12 4v5M12 9l-6 6M12 9l6 6M6 15v5M18 15v5"),
} as const;

function Group({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="workspace-menu-group" role="group" aria-label={label}>
      <span className="workspace-menu-group-label" aria-hidden="true">{label}</span>
      {children}
    </div>
  );
}

export function WorkspaceMenu({ controller, actions }: {
  controller: AppController;
  actions: WorkspaceActions;
}) {
  const state = useApp(controller);
  const [open, setOpen] = useState(() => matchMedia("(min-width: 70rem)").matches);
  const toggle = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const media = matchMedia("(min-width: 70rem)");
    const resize = () => setOpen(media.matches);
    media.addEventListener("change", resize);
    return () => media.removeEventListener("change", resize);
  }, []);
  const run = (action: () => unknown) => {
    void action();
    if (!matchMedia("(min-width: 70rem)").matches) {
      setOpen(false);
      toggle.current?.focus({ preventScroll: true });
    }
  };
  const devices = state.document.network.devices.length;
  const links = state.document.network.links.length;
  return (
    <aside className="workspace-menu" data-open={open} aria-label="Network tools"
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          setOpen(false);
          toggle.current?.focus({ preventScroll: true });
        }
      }}>
      <button ref={toggle} className="workspace-menu-toggle" aria-label="Toggle network menu"
        aria-expanded={open} aria-controls="workspace-menu-actions" onClick={() => setOpen(!open)}>
        <span className="workspace-menu-badge">{ICONS.network}</span>
        <span className="workspace-menu-heading">
          <span className="workspace-menu-title">Network tools</span>
          <span className="workspace-menu-meta">{devices} devices · {links} links</span>
        </span>
        <svg className="workspace-menu-chevron" viewBox="0 0 20 20" aria-hidden="true">
          <path d={open ? "m6 12 4-4 4 4" : "m6 8 4 4 4-4"} />
        </svg>
      </button>
      <nav id="workspace-menu-actions" aria-label="Network actions" hidden={!open}>
        <Group label="Build">
          <button className="primary" disabled={state.busy} aria-expanded={actions.catalog}
            onClick={() => run(actions.toggleCatalog)}>{ICONS.add}<span>Add device</span></button>
          <button disabled={state.busy || devices < 2}
            aria-pressed={!!state.connection} onClick={() => run(actions.startConnection)}>
            {ICONS.connect}<span>Connect ports</span></button>
        </Group>
        <Group label="Test">
          <button disabled={state.busy || !state.runtimeReady} aria-expanded={actions.ping}
            onClick={() => run(actions.openPing)}>{ICONS.send}<span>Send a packet</span></button>
        </Group>
        <Group label="Library">
          <button disabled={state.busy} aria-label="Save network" onClick={() => run(actions.openSave)}>
            {ICONS.save}<span>Save network</span></button>
          <button onClick={() => run(actions.openNetworks)}>{ICONS.library}<span>My networks</span></button>
        </Group>
        <button role="switch" className="workspace-menu-switch" aria-label="Tutorial mode"
          aria-checked={state.tutorial} onClick={() => run(actions.toggleTutorial)}>
          <span className="workspace-menu-switch-label">Tutorial</span>
          <span className="workspace-menu-state">{state.tutorial ? "On" : "Off"}</span>
          <span className="workspace-menu-track" data-on={state.tutorial} aria-hidden="true" />
        </button>
      </nav>
    </aside>
  );
}
