import type { LeafletMouseEvent, Map as LeafletMap, Marker } from "leaflet";
import "leaflet/dist/leaflet.css";
import { isEqual } from "lodash";
import { Accessor, createEffect, from, onCleanup, onMount } from "solid-js";
import { reconcile } from "solid-js/store";
import { Awareness } from "y-protocols/awareness";
import { Room, WebrtcProvider } from "y-webrtc";
import * as Y from "yjs";

/** Create a solidjs signal from a Yjs Type */
function signalFromY<T extends Y.AbstractType<any>>(y: T) {
  return from<ReturnType<T["toJSON"]>>((set) => {
    set(y.toJSON());
    function observer(a: Y.YEvent<Y.AbstractType<T>>) {
      set(reconcile(a.target.toJSON()));
    }
    y.observe(observer);
    return () => y.unobserve(observer);
  });
}

/** Create a solidjs signal from a Yjs Awareness */
function signalFromAwareness(awareness: Awareness) {
  return from<Map<number, {}>>(
    (set) => {
      set(awareness.getStates());
      function observer(_: unknown, room: Room | "local") {
        if (typeof room === "string") return;
        set(reconcile(room.awareness.getStates()));
      }
      awareness.on("update", observer);
      return () => awareness.off("update", observer);
    }
  );
}

export interface MultiplayerLeafletProps {
  roomName: string;
}

export function MultiplayerLeaflet({ roomName }: MultiplayerLeafletProps) {
  let div: HTMLDivElement | undefined = undefined;

  const ydoc = new Y.Doc();

  const yState = ydoc.getMap("leafletState");
  const stateSignal = signalFromY(yState);

  onMount(async () => {
    if (!div) {
      return;
    }

    // Setup the Leaflet map:
    const L = await import("leaflet");
    const map = L.map(div).setView([51.505, -0.09], 13);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);

    // clients connected to the same room-name share document updates
    const provider = new WebrtcProvider(`shared-leaflet-${roomName}`, ydoc, {
      password: "password",
    });

    onCleanup(() => {
      provider.disconnect();
      provider.destroy();
    });

    const awareness = signalFromAwareness(provider.awareness);

    const localMarkers = new Map<number, Marker<any>>();
    createEffect(() => {
      const awarenessMap = awareness();
      if (!awarenessMap) return;

      console.log({ awarenessMap });

      const myClientId = provider.awareness.clientID;
      for (const [clientId, state] of awarenessMap.entries() ?? []) {
        if (clientId === myClientId) continue;

        if (localMarkers.has(clientId)) {
          const markerToUpdate = localMarkers.get(clientId);
          markerToUpdate?.setLatLng(state.mouseLatLng);
        } else {
          const newMarker = L.marker(state.mouseLatLng).addTo(map);
          localMarkers.set(clientId, newMarker);
        }
      }

      // Delete a marker from the map when the cursor info is removed from awareness:
      for (const [localClientId, marker] of localMarkers.entries()) {
        if (!awarenessMap.has(localClientId)) {
          marker.remove();
          localMarkers.delete(localClientId);
        }
      }
    });

    bindMyMapCursorToAwareness(provider, map);

    syncMapView(map, yState, stateSignal);
  });

  return <div class="w-full h-full" ref={div} />;
}

/** Two-way syncing of the Leaflet Map view with Yjs state. */
function syncMapView(
  map: LeafletMap,
  yState: Y.Map<unknown>,
  stateSignal: Accessor<{ [x: string]: any } | undefined>
) {
  // Propagate Map UI events to Y state updates:
  const updateMapView = () => {
    const zoom = map.getZoom();
    const center = [map.getCenter().lat, map.getCenter().lng];

    const newPosition = { zoom, center };

    if (!isEqual(newPosition, yState.get("position"))) {
      yState.set("position", newPosition);
    }
  };
  map.on("moveend", updateMapView);
  updateMapView();

  // Propagate Y state updates to Map UI state:
  createEffect(() => {
    const newPosition = stateSignal()?.position;
    map.setView(newPosition.center, newPosition.zoom);
  });
}

/** Forward user's cursor position and pressed state to Yjs Awareness. */
function bindMyMapCursorToAwareness(provider: WebrtcProvider, map: LeafletMap) {
  let mousePressed = false;
  function updateMyPointer(e: LeafletMouseEvent) {
    if (e.type === "mousedown") {
      mousePressed = true;
    }
    if (e.type === "mouseup") {
      mousePressed = false;
    }

    const mouseLatLng = [e.latlng.lat, e.latlng.lng] as const;
    provider.awareness.setLocalState({ mouseLatLng, mousePressed });
  }

  map.on("mousemove", updateMyPointer);
  map.on("mousedown", updateMyPointer);
  map.on("mouseup", updateMyPointer);
}
