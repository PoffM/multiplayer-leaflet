import { batch, onCleanup } from "solid-js";
import { createMutable } from "solid-js/store";
import { Awareness } from "y-protocols/awareness";
import { Room } from "y-webrtc";
import { ZodSchema } from "zod";

export interface AwarenessChanges {
  added: number[];
  updated: number[];
  removed: number[];
}

/** Create a solidjs signal from a Yjs Awareness */
export function signalFromAwareness<T>(
  awareness: Awareness,
  stateSchema: ZodSchema<T>
) {
  const store = createMutable<{ [clientId: number]: T | undefined }>({});

  function observer(changes: AwarenessChanges, room: Room | "local") {
    batch(() => {
      // Skip re-storing your own awareness data:
      if (room === "local") {
        return;
      }

      for (const clientId of [...changes.added, ...changes.updated]) {
        const newState = stateSchema.safeParse(
          room.awareness.getStates().get(clientId)
        );
        if (!newState.success) continue;
        store[clientId] = newState.data;
      }
      for (const clientId of changes.removed) {
        delete store[clientId];
      }
    });
  }

  awareness.on("update", observer);
  onCleanup(() => awareness.off("update", observer));

  return store;
}
