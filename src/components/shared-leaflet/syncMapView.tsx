import { Map as LeafletMap } from "leaflet";
import { debounce, isEqual, throttle } from "lodash";
import { Accessor, createEffect } from "solid-js";
import * as Y from "yjs";

/** Two-way syncing of the Leaflet Map view with Yjs state, using solid js signals. */
export function syncMapView(
  map: LeafletMap,
  yState: Y.Map<unknown>,
  stateSignal: Accessor<{ [x: string]: any; } | undefined>) {
  let mousedown = false;
  map.on("mousedown", () => (mousedown = true));
  map.on("mouseup", () => (mousedown = false));

  /** Propagates Map UI events to Y state updates: */
  function updateYState() {
    const zoom = map.getZoom();
    const center = [map.getCenter().lat, map.getCenter().lng];

    const newPosition = { zoom, center };

    if (!isEqual(newPosition, yState.get("position"))) {
      yState.set("position", newPosition);
    }
  }

  // Update Y state when the user stops moving the map:
  map.on("moveend", updateYState);

  // Update the Y state while the user's mouse moves the map (throttled):
  const moveUpdatesPerSecond = 60;
  map.on(
    "move",
    throttle(() => mousedown && updateYState(), 1000 / moveUpdatesPerSecond)
  );
  map.on(
    "move",
    debounce(() => mousedown && updateYState(), 1000 / moveUpdatesPerSecond, {
      leading: false,
      trailing: true,
    })
  );

  // Propagate Y state updates to Map UI state:
  createEffect(() => {
    const newPosition = stateSignal()?.position;
    if (!mousedown && newPosition) {
      map.setView(newPosition.center, newPosition.zoom);
    }
  });
}
