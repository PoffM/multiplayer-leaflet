import type { LeafletMouseEvent, Map as LeafletMap } from "leaflet";
import { batch, onCleanup } from "solid-js";
import { SharedLeafletState } from "../createSharedLeafletState";

/** Forward user's cursor position and pressed state to Yjs Awareness. */
export function shareMyCursor(state: SharedLeafletState, map: LeafletMap) {
  function updateMyPointer(e: LeafletMouseEvent) {
    batch(() => {
      if (e.type === "mousedown") {
        state.setAwarenessField("mousePressed", true);
      }
      if (e.type === "mouseup") {
        state.setAwarenessField("mousePressed", false);
      }

      if (!e.latlng) return;
      state.setAwarenessField("mouseContainerPoint", [
        e.containerPoint.x,
        e.containerPoint.y,
      ]);
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
}
