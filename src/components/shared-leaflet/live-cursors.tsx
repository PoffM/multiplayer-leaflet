import type { Map as LeafletMap } from "leaflet";
import { LeafletMouseEvent } from "leaflet";
import { FaSolidHand, FaSolidHandBackFist } from "solid-icons/fa";
import { createEffect } from "solid-js";
import { render } from "solid-js/web";
import { WebrtcProvider } from "y-webrtc";
import { z } from "zod";
import {
  AwarenessChanges,
  signalFromAwareness,
} from "../../solid-yjs/signalFromAwareness";

export const zLeafletAwarenessSchema = z.object({
  username: z.string().max(50),
  mouseLatLng: z.tuple([z.number(), z.number()]),
  mousePressed: z.boolean(),
});

/** Forward user's cursor position and pressed state to Yjs Awareness. */
export function bindMyMapCursorToAwareness(
  provider: WebrtcProvider,
  map: LeafletMap,
  username: string
) {
  let mousePressed = false;
  function updateMyPointer(e: LeafletMouseEvent) {
    if (e.type === "mousedown") {
      mousePressed = true;
    }
    if (e.type === "mouseup") {
      mousePressed = false;
    }

    if (!e.latlng) return;

    const myAwarenessState: typeof zLeafletAwarenessSchema["_output"] = {
      username,
      mouseLatLng: [e.latlng.lat, e.latlng.lng],
      mousePressed,
    };

    provider.awareness.setLocalState(myAwarenessState);
  }

  map.on("mousemove", updateMyPointer);
  map.on("mousedown", updateMyPointer);
  map.on("mouseup", updateMyPointer);
}

export async function displayPeerCursors(
  provider: WebrtcProvider,
  map: LeafletMap
) {
  const L = await import("leaflet");

  const awarenessMap = signalFromAwareness(
    provider.awareness,
    zLeafletAwarenessSchema
  );

  const cleanupFunctions = new Map<number, () => void>();
  provider.awareness.on("update", (changes: AwarenessChanges) => {
    for (const clientId of changes.added) {
      const iconRoot = (<div />) as HTMLElement;

      const initialState = awarenessMap[clientId];
      if (!initialState) return;

      const marker = L.marker(initialState.mouseLatLng, {
        icon: L.divIcon({ html: iconRoot }),
      }).addTo(map);

      function Icon(props: {
        state: () => typeof zLeafletAwarenessSchema["_output"] | undefined;
      }) {
        return (
          <div>
            {props.state()?.mousePressed ? (
              <FaSolidHandBackFist size="20px" fill="green" />
            ) : (
              <FaSolidHand size="20px" fill="green" />
            )}
          </div>
        );
      }

      createEffect(() =>
        marker.setLatLng(awarenessMap[clientId]?.mouseLatLng ?? [0, 0])
      );

      const disposeSolid = render(
        () => <Icon state={() => awarenessMap[clientId]} />,
        iconRoot
      );

      cleanupFunctions.set(clientId, () => {
        disposeSolid();
        marker.remove();
      });
    }

    for (const clientId of changes.removed) {
      cleanupFunctions.get(clientId)?.();
      cleanupFunctions.delete(clientId);
    }
  });
}
