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
  function parseState(rawState: unknown) {
    const parsed = stateSchema.safeParse(rawState);
    return parsed.success ? parsed.data : undefined;
  }

  const store = createMutable<{ [clientId: number]: T | undefined }>({
    [awareness.clientID]: parseState(awareness.getLocalState()),
  });

  function observer(changes: AwarenessChanges, room: Room | "local") {
    batch(() => {
      // Skip re-storing your own awareness data:
      if (room === "local") {
        store[awareness.clientID] = parseState(awareness.getLocalState());
        return;
      }

      for (const clientId of [...changes.added, ...changes.updated]) {
        store[clientId] = parseState(room.awareness.getStates().get(clientId));
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
