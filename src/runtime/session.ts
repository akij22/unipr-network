import { fail, issue, ok, type NetworkConfig } from "../domain/types";
import type { Journal } from "../storage/journal";
import type { WorkerRequest, Projection } from "./messages";
import type { Result } from "../domain/types";
import { createSimulator } from "../simulation/engine";
import { createHistory } from "./history";
import { copy } from "../simulation/state";
export interface Session {
  handle(request: WorkerRequest): Promise<Result<Projection>>;
}
export function createSession(
  config: NetworkConfig,
  revision: number,
  journal: Journal,
): Session {
  let engine = createSimulator(config),
    history: ReturnType<typeof createHistory> | null = null,
    lastRequest = 0,
    generation = 0,
    busy: number | null = null;
  const empty = (): Projection => ({
    revision,
    operationId: null,
    cursor: 0,
    frontier: 0,
    total: null,
    status: "idle",
    event: null,
    state: engine.snapshot(),
  });
  let projection = empty();
  return {
    async handle(request) {
      const { command, operationId } = request;
      if (
        request.revision < revision ||
        (command.type !== "load" && request.revision !== revision)
      )
        return fail(issue("STALE_REVISION", [], {}, "resource"));
      if (request.requestId <= lastRequest)
        return fail(issue("STALE_REQUEST", [], {}, "resource"));
      lastRequest = request.requestId;
      if (
        !["load", "start", "reset", "cancel"].includes(command.type) &&
        operationId !== projection.operationId
      )
        return fail(issue("STALE_OPERATION", [], {}, "resource"));
      if (
        command.type === "load" ||
        command.type === "reset" ||
        command.type === "cancel"
      ) {
        generation++;
        busy = null;
        const old = history;
        history = null;
        if (command.type === "load") {
          config = command.network;
          revision = request.revision;
          engine = createSimulator(config);
        } else if (command.type === "cancel") engine.cancel();
        else engine.reset();
        projection = empty();
        if (old)
          try {
            await old.clear();
          } catch (cause) {
            console.error("Temporary history cleanup failed", cause);
          }
        return ok(copy(projection));
      }
      if (busy !== null) return fail(issue("OPERATION_BUSY", [], {}, "input"));
      const token = generation;
      busy = token;
      try {
        if (command.type === "start") {
          if (projection.cursor !== projection.frontier)
            return fail(issue("HISTORY_NOT_AT_FRONTIER", [], {}, "input"));
          if (projection.status === "active")
            return fail(issue("OPERATION_ACTIVE", [], {}, "input"));
          if (!operationId)
            return fail(issue("MISSING_OPERATION_ID", [], {}, "input"));
          const started = engine.start(command.operation, operationId);
          if (!started.ok) return started;
          const initialState = engine.snapshot(),
            previousHistory = history;
          if (previousHistory) await previousHistory.clear();
          if (token !== generation)
            return fail(issue("STALE_REVISION", [], {}, "resource"));
          const nextHistory = createHistory(journal, operationId);
          await nextHistory.initialize(initialState);
          if (token !== generation) {
            await nextHistory.clear();
            return fail(issue("STALE_REVISION", [], {}, "resource"));
          }
          history = nextHistory;
          projection = { ...empty(), operationId, status: "active" };
        } else if (command.type === "seek") {
          if (
            !Number.isInteger(command.index) ||
            command.index < 0 ||
            command.index > projection.frontier
          )
            return fail(issue("HISTORY_OUT_OF_RANGE", [], {}, "input"));
          if (history) {
            const restored = await history.at(command.index);
            if (token !== generation)
              return fail(issue("STALE_REVISION", [], {}, "resource"));
            projection = { ...projection, cursor: command.index, ...restored };
          }
        } else if (command.type === "next") {
          if (projection.cursor < projection.frontier && history) {
            const index = projection.cursor + 1;
            const restored = await history.at(index);
            if (token !== generation)
              return fail(issue("STALE_REVISION", [], {}, "resource"));
            projection = { ...projection, cursor: index, ...restored };
          } else if (projection.status === "active" && history) {
            let result = engine.advance(128);
            while (result.kind === "yield") {
              await new Promise((resolve) => setTimeout(resolve, 0));
              if (token !== generation)
                return fail(issue("STALE_REVISION", [], {}, "resource"));
              result = engine.advance(128);
            }
            if (result.kind === "event") {
              await history.append(result.event, result.state);
              if (token !== generation)
                return fail(issue("STALE_REVISION", [], {}, "resource"));
              const terminal =
                result.event.kind === "operation.completed" ||
                result.event.kind === "operation.failed";
              projection = {
                ...projection,
                state: result.state,
                event: result.event,
                cursor: result.event.index,
                frontier: result.event.index,
                total: terminal ? result.event.index : null,
                status: terminal
                  ? result.event.kind === "operation.completed"
                    ? "completed"
                    : "failed"
                  : "active",
              };
            }
          }
        }
        if (token !== generation)
          return fail(issue("STALE_REVISION", [], {}, "resource"));
        return ok(copy(projection));
      } catch (cause) {
        console.error("Simulation history failed", cause);
        if (token !== generation)
          return fail(issue("STALE_REVISION", [], {}, "resource"));
        projection = {
          ...projection,
          status: "resource-error",
          state: {
            ...projection.state,
            problem: issue("HISTORY_STORAGE_FAILED", [], {}, "resource"),
          },
        };
        return ok(copy(projection));
      } finally {
        if (busy === token) busy = null;
      }
    },
  };
}
