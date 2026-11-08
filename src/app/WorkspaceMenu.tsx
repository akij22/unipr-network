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

type MenuId = "file" | "topology" | "simulation" | "help";

const MENU_LABELS: Record<MenuId, string> = {
  file: "File",
  topology: "Topology",
  simulation: "Simulation",
  help: "Help",
};

/** Top menus for the workspace. Each menu is a disclosure: a native button
 * toggles a popover of plain buttons, so Tab, Enter and Space behave as usual. */
export function WorkspaceMenu({ controller, actions }: {
  controller: AppController;
  actions: WorkspaceActions;
}) {
  const state = useApp(controller);
  const [openMenu, setOpenMenu] = useState<MenuId | null>(null);
  const bar = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!openMenu) return;
    const dismiss = (event: PointerEvent) => {
      if (!bar.current?.contains(event.target as Node)) setOpenMenu(null);
    };
    document.addEventListener("pointerdown", dismiss);
    return () => document.removeEventListener("pointerdown", dismiss);
  }, [openMenu]);
  const trigger = (id: MenuId) =>
    bar.current?.querySelector<HTMLButtonElement>(`[data-menu="${id}"]`);
  const choose = (id: MenuId, action: () => unknown) => {
    setOpenMenu(null);
    trigger(id)?.focus({ preventScroll: true });
    void action();
  };
  const menu = (id: MenuId, items: ReactNode) => (
    <div
      className="topbar-menu"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null))
          setOpenMenu((current) => (current === id ? null : current));
      }}
    >
      <button
        type="button"
        className="topbar-trigger"
        data-menu={id}
        aria-expanded={openMenu === id}
        aria-controls={`topbar-${id}`}
        onClick={() => setOpenMenu(openMenu === id ? null : id)}
      >
        {MENU_LABELS[id]}
      </button>
      <div id={`topbar-${id}`} className="topbar-popover" role="group" aria-label={MENU_LABELS[id]} hidden={openMenu !== id}>
        {items}
      </div>
    </div>
  );
  const devices = state.document.network.devices.length;
  const links = state.document.network.links.length;
  const count = (n: number, noun: string) => `${n} ${noun}${n === 1 ? "" : "s"}`;
  return (
    <header className="topbar" ref={bar}>
      <div className="topbar-brand">
        <span className="topbar-mark" aria-hidden="true">{ICONS.network}</span>
        <span className="topbar-brand-name">UniPRNet</span>
      </div>
      <nav
        className="topbar-menus"
        aria-label="Workspace menus"
        onKeyDown={(event) => {
          if (event.key !== "Escape" || !openMenu) return;
          const id = openMenu;
          setOpenMenu(null);
          trigger(id)?.focus({ preventScroll: true });
        }}
      >
        {menu("file", <>
          <button type="button" className="topbar-item" disabled={state.busy}
            onClick={() => choose("file", actions.openSave)}>{ICONS.save}<span>Save network</span></button>
          <button type="button" className="topbar-item"
            onClick={() => choose("file", actions.openNetworks)}>{ICONS.library}<span>My networks</span></button>
        </>)}
        {menu("topology", <>
          <button type="button" className="topbar-item" disabled={state.busy}
            onClick={() => choose("topology", actions.openCatalog)}>{ICONS.add}<span>Add device</span></button>
          <button type="button" className="topbar-item" disabled={state.busy || devices < 2}
            aria-pressed={!!state.connection} onClick={() => choose("topology", actions.startConnection)}>
            {ICONS.connect}<span>Connect ports</span></button>
        </>)}
        {menu("simulation", <>
          <button type="button" className="topbar-item" disabled={state.busy || !state.runtimeReady}
            onClick={() => choose("simulation", actions.openPing)}>{ICONS.send}<span>Send a packet</span></button>
        </>)}
        {menu("help", <>
          <button type="button" role="switch" className="topbar-item topbar-switch" aria-label="Tutorial mode"
            aria-checked={state.tutorial} onClick={() => choose("help", actions.toggleTutorial)}>
            <span className="topbar-switch-label">Tutorial mode</span>
            <span className="topbar-switch-state">{state.tutorial ? "On" : "Off"}</span>
            <span className="topbar-track" data-on={state.tutorial} aria-hidden="true" />
          </button>
        </>)}
      </nav>
      <p className="topbar-status">
        {count(devices, "device")} · {count(links, "link")}{state.busy ? " · Updating network…" : ""}
      </p>
    </header>
  );
}
