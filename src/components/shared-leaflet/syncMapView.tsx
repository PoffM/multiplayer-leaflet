import { LeafletEvent, Map as LeafletMap } from "leaflet";
import { debounce, isEqual, throttle } from "lodash";
import { Accessor, createEffect } from "solid-js";
import * as Y from "yjs";

/** Two-way syncing of the Leaflet Map view with Yjs state, using solid js signals. */
export function syncMapView(
  map: LeafletMap,
  yState: Y.Map<unknown>,
  stateSignal: Accessor<{ [x: string]: any } | undefined>
) {
  /** Propagates Map UI events to Y state updates: */
  function updateYState() {
    const zoom = map.getZoom();
    const center = [map.getCenter().lat, map.getCenter().lng];

    const newPosition = { zoom, center };

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

    if (draggedByLocalUser || isDrifting) {
      updateYState();
    }
  }

  // Update the shared Y state when the user moves the map:
  const moveUpdatesPerSecond = 60;
  map.on("move", throttle(handleMove, 1000 / moveUpdatesPerSecond));
  map.on("move", debounce(handleMove, 1000 / moveUpdatesPerSecond));
  // Update Y state when the user stops moving the map:
  map.on("moveend", updateYState);

  // Propagate Y state updates to Map UI state:
  createEffect(() => {
    const newPosition = stateSignal()?.position;

    if (!newPosition) return;

    const currentCenter = map.getCenter();
    const currentPosition = {
      center: [currentCenter.lat, currentCenter.lng],
      zoom: map.getZoom(),
    };

    if (!isEqual(currentPosition, newPosition)) {
      map.setView(newPosition.center, newPosition.zoom, {
        animate: false,
        duration: 0,
      });
    }
  });
}
