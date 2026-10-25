import { createSession } from "./session";
import { openDatabase } from "../storage/database";
import { createJournal, cleanupAbandonedJournals } from "../storage/journal";
import { fail, issue } from "../domain/types";
import type { WorkerRequest, WorkerResponse } from "./messages";
const scope = self as unknown as DedicatedWorkerGlobalScope;
const ready = openDatabase().then(async (db) => {
  await cleanupAbandonedJournals(db);
  return createSession({ devices: [], links: [] }, 0, createJournal(db));
});
scope.onmessage = async (e: MessageEvent<WorkerRequest>) => {
  const request = e.data;
  try {
    const session = await ready;
    const result = await session.handle(request);
    scope.postMessage({
      requestId: request.requestId,
      revision: request.revision,
      operationId: request.operationId,
      result,
    } satisfies WorkerResponse);
  } catch (cause) {
    console.error("Worker initialization failed", cause);
    scope.postMessage({
      requestId: request.requestId,
      revision: request.revision,
      operationId: request.operationId,
      result: fail(issue("WORKER_STORAGE_FAILED", [], {}, "resource")),
    } satisfies WorkerResponse);
  }
};
