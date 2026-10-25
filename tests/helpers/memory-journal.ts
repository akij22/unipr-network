import type { Journal } from "../../src/storage/journal";
import type { NetworkState, SimEvent } from "../../src/simulation/types";
import { copy } from "../../src/simulation/state";
export function memoryJournal(): Journal {
  const events = new Map<string, SimEvent[]>(),
    checkpoints = new Map<string, { index: number; state: NetworkState }[]>();
  return {
    async initialize(id, state) {
      events.set(id, []);
      checkpoints.set(id, [{ index: 0, state: copy(state) }]);
    },
    async append(id, event, state) {
      events.get(id)!.push(copy(event));
      if (state)
        checkpoints.get(id)!.push({ index: event.index, state: copy(state) });
    },
    async read(id, from, to) {
      const checkpoint = checkpoints
        .get(id)!
        .filter((c) => c.index <= from)
        .at(-1)!;
      return copy({
        checkpoint,
        events: events
          .get(id)!
          .filter((e) => e.index > checkpoint.index && e.index <= to),
      });
    },
    async clear(id) {
      events.delete(id);
      checkpoints.delete(id);
    },
  };
}
