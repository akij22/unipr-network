import type { NetworkConfig, PortRef, Issue } from "../domain/types";
import type { SavedNetworkSummary } from "../storage/documents";
import type { Projection } from "../runtime/messages";
import type { AppAction } from "./actions";
export type NetworkDocument = {
  schema: 1;
  id: string;
  name: string;
  network: NetworkConfig;
  layout: Record<string, { name: string; x: number; z: number }>;
  view: {
    cameraPosition: [number, number, number];
    target: [number, number, number];
    depth: "ethernet" | "ip" | "full";
  };
};
export type AppState = {
  document: NetworkDocument;
  projection: Projection;
  selection: { kind: "device" | "link"; id: string } | null;
  tutorial: boolean;
  playing: boolean;
  busy: boolean;
  dirty: boolean;
  runtimeReady: boolean;
  issue: Issue | null;
  connection: { from: PortRef | null } | null;
  notice: string | null;
  savedNetworks: SavedNetworkSummary[];
  savesLoading: boolean;
};
export interface AppController {
  getSnapshot(): AppState;
  subscribe(listener: () => void): () => void;
  dispatch(action: AppAction): Promise<void>;
  dispose(): void;
}
