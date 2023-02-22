import type { LeafletEvent, Map as LeafletMap } from "leaflet";
import { debounce, isEqual, throttle } from "lodash";
import { createEffect } from "solid-js";
import * as Y from "yjs";
import { signalFromY } from "~/solid-yjs/signalFromY";

/** Two-way syncing of the Leaflet Map view with Yjs state, using solid js signals. */
export function syncMapView(map: LeafletMap, yState: Y.Map<any>) {
  /** Propagates Map UI events to Y state updates: */
  function updateYState() {
    const zoom = map.getZoom();
    const center = [map.getCenter().lat, map.getCenter().lng];

    const newPosition = { zoom, center };

    // Push the new state if it changed:
    if (!isEqual(newPosition, yState.get("position"))) {
      yState.set("position", newPosition);
    }
  }

  function handleMove(e: LeafletEvent) {
    /** True when the local user is dragging the map. */
    // @ts-expect-error Uses a private field on the leaflet event
    const draggedByLocalUser = !!e.originalEvent;

    /** True when the leaflet map is doing an animated inertia drift after the user flicks the map. */
    const isDrifting = e.target._panAnim?._inProgress;

    if (draggedByLocalUser || isDrifting || e.type === "zoomend") {
      updateYState();
    }
  }

  // Update the shared Y state:
  // Whlie the user drags the map:
  const moveUpdatesPerSecond = 60;
  map.on("move", throttle(handleMove, 1000 / moveUpdatesPerSecond));
  map.on("move", debounce(handleMove, 1000 / moveUpdatesPerSecond));
  // After a zoom:
  map.on("moveend", handleMove);
  // After the user stops moving the map:
  map.on("zoomend", handleMove);

  const stateSignal = signalFromY(yState);

  // Propagate Y state updates to Map UI state:
  createEffect(() => {
    const newPosition = stateSignal()?.get("position");

    if (!newPosition) return;

    const currentCenter = map.getCenter();
    const currentPosition = {
      center: [currentCenter.lat, currentCenter.lng],
      zoom: map.getZoom(),
    };

    if (currentPosition.zoom !== newPosition.zoom) {
      map.setView(newPosition.center, newPosition.zoom);
    } else if (!isEqual(currentPosition, newPosition)) {
      map.setView(newPosition.center, undefined, {
        animate: false,
        duration: 0,
      });
    }
  });
}
