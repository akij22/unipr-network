import type { NetworkState, SimEvent } from "../simulation/types";
import type { AppDatabase } from "./database";
export type JournalSlice = {
  checkpoint: { index: number; state: NetworkState };
  events: SimEvent[];
};
export interface Journal {
  initialize(operationId: string, state: NetworkState): Promise<void>;
  append(
    operationId: string,
    event: SimEvent,
    checkpoint?: NetworkState,
  ): Promise<void>;
  read(operationId: string, from: number, to: number): Promise<JournalSlice>;
  clear(operationId: string): Promise<void>;
}
const range = (id: string, to = Number.MAX_SAFE_INTEGER) =>
  IDBKeyRange.bound([id, 0], [id, to]);
const lockName = (id: string) => `uniprnetwork-history:${id}`;
export function createJournal(db: AppDatabase): Journal {
  const held = new Map<
      string,
      { release: () => void; done: Promise<unknown> }
    >(),
    locks = typeof navigator !== "undefined" ? navigator.locks : undefined;
  const release = async (id: string) => {
    const heldLock = held.get(id);
    if (heldLock) {
      held.delete(id);
      heldLock.release();
      await heldLock.done;
    }
  };
  return {
    async initialize(operationId, state) {
      if (locks)
        await new Promise<void>((resolve, reject) => {
          let done: Promise<unknown>;
          done = locks.request(
            lockName(operationId),
            { ifAvailable: true },
            (lock) => {
              if (!lock) {
                reject(
                  new Error("History is already active in another worker"),
                );
                return;
              }
              return new Promise<void>((unlock) => {
                held.set(operationId, { release: unlock, done });
                resolve();
              });
            },
          );
          void done.catch(reject);
        });
      try {
        await db.put("journalCheckpoints", { operationId, index: 0, state });
      } catch (cause) {
        await release(operationId);
        throw cause;
      }
    },
    async append(operationId, event, state) {
      const tx = db.transaction(
        ["journalEvents", "journalCheckpoints"],
        "readwrite",
      );
      await tx
        .objectStore("journalEvents")
        .put({ operationId, index: event.index, event });
      if (state)
        await tx
          .objectStore("journalCheckpoints")
          .put({ operationId, index: event.index, state });
      await tx.done;
    },
    async read(operationId, from, to) {
      const tx = db.transaction(["journalEvents", "journalCheckpoints"]);
      const checkpoints = await tx
        .objectStore("journalCheckpoints")
        .getAll(range(operationId, from));
      const checkpoint = checkpoints.at(-1);
      if (!checkpoint) throw new Error("HISTORY_CHECKPOINT_MISSING");
      const rows = await tx
        .objectStore("journalEvents")
        .getAll(
          IDBKeyRange.bound(
            [operationId, checkpoint.index],
            [operationId, to],
            true,
          ),
        );
      return {
        checkpoint: { index: checkpoint.index, state: checkpoint.state },
        events: rows.map((r) => r.event),
      };
    },
    async clear(operationId) {
      try {
        const tx = db.transaction(
          ["journalEvents", "journalCheckpoints"],
          "readwrite",
        );
        await Promise.all([
          tx.objectStore("journalEvents").delete(range(operationId)),
          tx.objectStore("journalCheckpoints").delete(range(operationId)),
        ]);
        await tx.done;
      } finally {
        await release(operationId);
      }
    },
  };
}
export async function cleanupAbandonedJournals(db: AppDatabase): Promise<void> {
  const locks = typeof navigator !== "undefined" ? navigator.locks : undefined;
  if (!locks) return;
  const keys = await db.getAllKeys("journalCheckpoints"),
    ids = new Set(keys.map((key) => key[0]));
  for (const id of ids)
    await locks.request(lockName(id), { ifAvailable: true }, async (lock) => {
      if (lock) await createJournal(db).clear(id);
    });
}
