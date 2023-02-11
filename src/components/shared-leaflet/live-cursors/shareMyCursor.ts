import { Map as LeafletMap } from "leaflet";
import { LeafletMouseEvent } from "leaflet";
import { batch, createEffect } from "solid-js";
import { createMutable } from "solid-js/store";
import { WebrtcProvider } from "y-webrtc";
import { MultiplayerLeafletAwareness } from "./MultiplayerLeafletAwareness";

/** Forward user's cursor position and pressed state to Yjs Awareness. */
export function shareMyCursor(
  provider: WebrtcProvider,
  map: LeafletMap,
  username: () => string,
  userColor: () => string
) {
  const localCursorStateStore = createMutable<
    Pick<MultiplayerLeafletAwareness, "mouseLatLng" | "mousePressed">
  >({
    mousePressed: false,
    mouseLatLng: [0, 0],
  });

  function updateMyPointer(e: LeafletMouseEvent) {
    batch(() => {
      if (e.type === "mousedown") {
        localCursorStateStore.mousePressed = true;
      }
      if (e.type === "mouseup") {
        localCursorStateStore.mousePressed = false;
      }

      if (!e.latlng)
        return;
      localCursorStateStore.mouseLatLng = [e.latlng.lat, e.latlng.lng];
    });
  }

  map.on("mousemove", updateMyPointer);
  map.on("mousedown", updateMyPointer);
  map.on("mouseup", updateMyPointer);

  createEffect(() => {
    provider.awareness.setLocalState({
      ...localCursorStateStore,
      userColor: userColor(),
      username: username(),
    });
  });
}
