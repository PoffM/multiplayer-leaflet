import type { LeafletMouseEvent, Map as LeafletMap } from "leaflet";
import { batch, createEffect, onCleanup } from "solid-js";
import { createMutable } from "solid-js/store";
import { SharedLeafletState } from "../createSharedLeafletState";
import { MultiplayerLeafletAwareness } from "./MultiplayerLeafletAwareness";

/** Forward user's cursor position and pressed state to Yjs Awareness. */
export function shareMyCursor(state: SharedLeafletState, map: LeafletMap) {
  const localCursorStateStore = createMutable<
    Pick<MultiplayerLeafletAwareness, "mouseContainerPoint" | "mousePressed">
  >({
    mousePressed: false,
    mouseContainerPoint: [0, 0],
  });

  function updateMyPointer(e: LeafletMouseEvent) {
    batch(() => {
      if (e.type === "mousedown") {
        localCursorStateStore.mousePressed = true;
      }
      if (e.type === "mouseup") {
        localCursorStateStore.mousePressed = false;
      }

      if (!e.latlng) return;
      localCursorStateStore.mouseContainerPoint = [
        e.containerPoint.x,
        e.containerPoint.y,
      ];
    });
  }

  map.on("mousemove", updateMyPointer);
  map.on("mousedown", updateMyPointer);
  map.on("mouseup", updateMyPointer);

  // Make sure leaflet knows the mouse button is released when the cursor isn't on the map element:
  const fireMapMouseUpEvent = () => map.fireEvent("mouseup");
  window.addEventListener("mouseup", fireMapMouseUpEvent);
  window.addEventListener("blur", fireMapMouseUpEvent);
  onCleanup(() => {
    window.removeEventListener("mouseup", fireMapMouseUpEvent);
    window.removeEventListener("blur", fireMapMouseUpEvent);
  });

  createEffect(() =>
    state.setAwarenessField("mousePressed", localCursorStateStore.mousePressed)
  );
  createEffect(() =>
    state.setAwarenessField(
      "mouseContainerPoint",
      localCursorStateStore.mouseContainerPoint
    )
  );
}
