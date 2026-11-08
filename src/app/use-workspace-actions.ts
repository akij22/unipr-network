import { useState } from "react";
import type { AppController } from "./types";

/** Shared state/actions for the top menus and custom App.renderActions entry points. */
export function useWorkspaceActions(controller: AppController) {
  const [catalog, setCatalog] = useState(false);
  const [save, setSave] = useState(false);
  const [networks, setNetworks] = useState(false);
  const [ping, setPing] = useState(false);
  return {
    catalog, save, networks, ping, setCatalog, setSave, setNetworks, setPing,
    toggleCatalog: () => {
      setPing(false);
      void controller.dispatch({ type: "connection.cancel" });
      setCatalog((open) => !open);
    },
    openCatalog: () => {
      setPing(false);
      void controller.dispatch({ type: "connection.cancel" });
      setCatalog(true);
    },
    startConnection: () => {
      setCatalog(false);
      setPing(false);
      return controller.dispatch({ type: "connection.start" });
    },
    openPing: () => {
      setCatalog(false);
      void controller.dispatch({ type: "connection.cancel" });
      setPing(true);
    },
    openSave: () => {
      setCatalog(false);
      void controller.dispatch({ type: "issue.clear" });
      void controller.dispatch({ type: "simulation.play", enabled: false });
      setSave(true);
    },
    openNetworks: () => {
      setCatalog(false);
      void controller.dispatch({ type: "simulation.play", enabled: false });
      setNetworks(true);
    },
    toggleTutorial: () => controller.dispatch({
      type: "tutorial.set", enabled: !controller.getSnapshot().tutorial,
    }),
  };
}

export type WorkspaceActions = ReturnType<typeof useWorkspaceActions>;
