import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { NetworkState, SimEvent } from "../simulation/types";
export type StoredDocument = {
  id: string;
  name: string;
  normalName: string;
  updatedAt: number;
  schema: number;
  document: unknown;
};
interface Schema extends DBSchema {
  documents: {
    key: string;
    value: StoredDocument;
    indexes: { normalName: string };
  };
  journalEvents: {
    key: [string, number];
    value: { operationId: string; index: number; event: SimEvent };
  };
  journalCheckpoints: {
    key: [string, number];
    value: { operationId: string; index: number; state: NetworkState };
  };
}
export type AppDatabase = IDBPDatabase<Schema>;
export function openDatabase(name = "uniprnetwork-v1"): Promise<AppDatabase> {
  return new Promise((resolve, reject) => {
    let blocked = false,
      connection: AppDatabase | undefined;
    openDB<Schema>(name, 1, {
      upgrade(db) {
        db.createObjectStore("documents", { keyPath: "id" }).createIndex(
          "normalName",
          "normalName",
          { unique: true },
        );
        db.createObjectStore("journalEvents", {
          keyPath: ["operationId", "index"],
        });
        db.createObjectStore("journalCheckpoints", {
          keyPath: ["operationId", "index"],
        });
      },
      blocked() {
        blocked = true;
        reject(new Error("DATABASE_BLOCKED"));
      },
      blocking() {
        connection?.close();
      },
    }).then((db) => {
      connection = db;
      if (blocked) db.close();
      else resolve(db);
    }, reject);
  });
}
