import type { DeviceKind, NetworkConfig, PortRef } from "../domain/types";
import type { AppState, NetworkDocument } from "./types";
import type { Operation } from "../simulation/types";
export type SimulationAction =
  | { type: "simulation.start"; operation: Operation }
  | { type: "simulation.next" }
  | { type: "simulation.previous" }
  | { type: "simulation.seek"; index: number }
  | { type: "simulation.play"; enabled: boolean }
  | { type: "simulation.cancel" }
  | { type: "simulation.reset" };
export type DocumentAction =
  | { type: "document.save"; name: string; overwriteId?: string }
  | { type: "document.open"; id: string; discardChanges?: boolean }
  | { type: "document.list" };
export type AppAction =
  | DocumentAction
  | SimulationAction
  | { type: "device.add"; kind: DeviceKind }
  | { type: "device.move"; id: string; x: number; z: number }
  | { type: "device.rename"; id: string; name: string }
  | { type: "device.remove"; id: string }
  | { type: "port.add"; deviceId: string }
  | { type: "port.remove"; deviceId: string; portId: string }
  | { type: "config.apply"; network: NetworkConfig }
  | { type: "selection.set"; selection: AppState["selection"] }
  | { type: "connection.start" }
  | { type: "connection.choosePort"; port: PortRef }
  | { type: "connection.cancel" }
  | { type: "link.remove"; id: string }
  | { type: "tutorial.set"; enabled: boolean }
  | { type: "view.set"; view: NetworkDocument["view"] }
  | { type: "issue.clear" }
  | { type: "document.name"; name: string };
