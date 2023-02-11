import { staticIntegration } from "@solidjs/router";
import type { Map as LeafletMap } from "leaflet";
import { LeafletMouseEvent } from "leaflet";
import { FaSolidHand, FaSolidHandBackFist } from "solid-icons/fa";
import { batch, createEffect } from "solid-js";
import { createMutable } from "solid-js/store";
import { render } from "solid-js/web";
import { WebrtcProvider } from "y-webrtc";
import { z } from "zod";
import {
  AwarenessChanges,
  signalFromAwareness,
} from "../../solid-yjs/signalFromAwareness";
import { USER_COLORS } from "../ColorPicker";

export const zLeafletAwarenessSchema = z.object({
  username: z.string().max(50),
  userColor: z
    .string()
    .max(20)
    .refine((str) => str in USER_COLORS),
  mouseLatLng: z.tuple([z.number(), z.number()]),
  mousePressed: z.boolean(),
});

/** Forward user's cursor position and pressed state to Yjs Awareness. */
export function bindMyMapCursorToAwareness(
  provider: WebrtcProvider,
  map: LeafletMap,
  username: () => string,
  userColor: () => string
) {
  const localAwarenessStore = createMutable<
    Pick<
      typeof zLeafletAwarenessSchema["_output"],
      "mouseLatLng" | "mousePressed"
    >
  >({
    mousePressed: false,
    mouseLatLng: [0, 0],
  });

  function updateMyPointer(e: LeafletMouseEvent) {
    batch(() => {
      if (e.type === "mousedown") {
        localAwarenessStore.mousePressed = true;
      }
      if (e.type === "mouseup") {
        localAwarenessStore.mousePressed = false;
      }

      if (!e.latlng) return;
      localAwarenessStore.mouseLatLng = [e.latlng.lat, e.latlng.lng];
    });
  }

  map.on("mousemove", updateMyPointer);
  map.on("mousedown", updateMyPointer);
  map.on("mouseup", updateMyPointer);

  createEffect(() => {
    provider.awareness.setLocalState({
      ...localAwarenessStore,
      userColor: userColor(),
      username: username(),
    });
  });
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

      const markerElement = marker.getElement();
      if (markerElement) {
        markerElement.style.border = "none";
        markerElement.style.backgroundColor = "transparent";
      }

      createEffect(() =>
        marker.setLatLng(awarenessMap[clientId]?.mouseLatLng ?? [0, 0])
      );

      const disposeSolid = render(
        () => <CursorIcon state={() => awarenessMap[clientId]} />,
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

function CursorIcon(props: {
  state: () => typeof zLeafletAwarenessSchema["_output"] | undefined;
}) {
  return (
    <div class="relative">
      <div class="absolute">
        <div class="space-y-1">
          {props.state()?.mousePressed ? (
            <FaSolidHandBackFist
              size="20px"
              // @ts-expect-error
              fill={USER_COLORS[props.state()?.userColor]}
            />
          ) : (
            <FaSolidHand
              size="20px"
              // @ts-expect-error
              fill={USER_COLORS[props.state()?.userColor]}
            />
          )}
          <div
            class="text-gray-200 py-1 px-2 rounded-md font-bold whitespace-nowrap"
            style={{
              // @ts-expect-error
              "background-color": USER_COLORS[props.state()?.userColor],
            }}
          >
            <span>{props.state()?.username}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
