import type { LeafletEvent, Map as LeafletMap } from "leaflet";
import { debounce, isEqual, throttle } from "lodash";
import { createEffect } from "solid-js";
import { z } from "zod";
import { SharedLeafletState } from "./createSharedLeafletState";

const zPosition = z.object({
  center: z.tuple([z.number(), z.number()]),
  zoom: z.number(),
});

/** Two-way syncing of the Leaflet Map view with Yjs state, using solid js signals. */
export function syncMapView(map: LeafletMap, state: SharedLeafletState) {
  const { mapState } = state.store;

  /** Propagates Map UI events to Y state updates: */
  function updateYState() {
    const zoom = map.getZoom();
    const center = [map.getCenter().lat, map.getCenter().lng] as [
      number,
      number
    ];

    const newPosition = { zoom, center };

    // Push the new state if it changed:
    if (!isEqual(newPosition, mapState.position)) {
      mapState.position = newPosition;
    }
  }

  function handleMove(e: LeafletEvent) {
    /** True when the local user is dragging the map. */
    // @ts-expect-error Uses a private field on the leaflet event
    const draggedByLocalUser = !!e.originalEvent;

    /** True when the leaflet map is doing an animated inertia drift after the user flicks the map. */
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    const isDrifting = e.target._panAnim?._inProgress;

    if (draggedByLocalUser || isDrifting || e.type === "zoomend") {
      updateYState();
    }
  }

  // Update the shared YJS state:
  // Whlie the user drags the map:
  const moveUpdatesPerSecond = 60;
  map.on("move", throttle(handleMove, 1000 / moveUpdatesPerSecond));
  map.on("move", debounce(handleMove, 1000 / moveUpdatesPerSecond));
  // After a zoom:
  map.on("moveend", handleMove);
  // After the user stops moving the map:
  map.on("zoomend", handleMove);

  // Propagate YJS state updates to Map UI state:
  createEffect(() => {
    const parsedPos = zPosition.safeParse(mapState.position);
    const newPosition = parsedPos.success && parsedPos.data;

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
