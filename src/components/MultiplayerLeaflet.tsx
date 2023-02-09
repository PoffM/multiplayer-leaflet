import type { LeafletMouseEvent, Map as LeafletMap, Marker } from "leaflet";
import "leaflet/dist/leaflet.css";
import { debounce, isEqual, throttle } from "lodash";
import { FaSolidHand, FaSolidHandBackFist } from "solid-icons/fa";
import { Accessor, createEffect, from, onCleanup, onMount } from "solid-js";
import { reconcile } from "solid-js/store";
import { Awareness } from "y-protocols/awareness";
import { Room, WebrtcProvider } from "y-webrtc";
import * as Y from "yjs";
import { z } from "zod";

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
  return from<Map<number, {}>>((set) => {
    function observer(_: unknown, room: Room | "local") {
      if (typeof room === "string") return;
      set(reconcile(room.awareness.getStates()));
    }
    awareness.on("update", observer);
    return () => awareness.off("update", observer);
  });
}

const zLeafletAwarenessSchema = z.object({
  username: z.string().max(50),
  mouseLatLng: z.tuple([z.number(), z.number()]),
  mousePressed: z.boolean(),
});

export interface MultiplayerLeafletProps {
  roomName: string;
  username: string;
}

export function MultiplayerLeaflet(props: MultiplayerLeafletProps) {
  const div = (<div class="w-full h-full rounded-md" />) as HTMLDivElement;

  const ydoc = new Y.Doc();

  const yState = ydoc.getMap("leafletState");
  const stateSignal = signalFromY(yState);

  onMount(async () => {
    // Setup the Leaflet map:
    const L = await import("leaflet");
    const map = L.map(div).setView([51.505, -0.09], 13);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);
    const fireMapMouseUpEvent = () => map.fireEvent("mouseup");
    window.addEventListener("mouseup", fireMapMouseUpEvent);
    window.addEventListener("blur", fireMapMouseUpEvent);

    // clients connected to the same room-name share document updates
    const provider = new WebrtcProvider(
      `shared-leaflet-${props.roomName}`,
      ydoc,
      { password: "password" }
    );

    onCleanup(() => {
      window.removeEventListener("mouseup", fireMapMouseUpEvent);
      provider.disconnect();
      provider.destroy();
    });

    await displayMarkersForPeerCursors(provider, map);

    bindMyMapCursorToAwareness(provider, map, props.username);

    syncMapView(map, yState, stateSignal);
  });

  return div;
}

async function displayMarkersForPeerCursors(
  provider: WebrtcProvider,
  map: LeafletMap
) {
  const L = await import("leaflet");

  const markerIcons = {
    grabbing: L.divIcon({
      html: (<FaSolidHandBackFist size="20px" fill="green" />) as HTMLElement,
    }),
    default: L.divIcon({
      html: (<FaSolidHand size="20px" fill="green" />) as HTMLElement,
    }),
  };

  const awareness = signalFromAwareness(provider.awareness);

  const localMarkers = new Map<number, Marker<any>>();
  createEffect(() => {
    const awarenessMap = awareness();
    if (!awarenessMap) return;

    const myClientId = provider.awareness.clientID;
    for (const [clientId, rawState] of awarenessMap.entries() ?? []) {
      if (clientId === myClientId) continue;

      const state = zLeafletAwarenessSchema.parse(rawState);

      if (localMarkers.has(clientId)) {
        const markerToUpdate = localMarkers.get(clientId);
        markerToUpdate?.setLatLng(state.mouseLatLng);

        markerToUpdate?.setIcon(
          state.mousePressed ? markerIcons.grabbing : markerIcons.default
        );
      } else {
        const newMarker = L.marker(state.mouseLatLng, {
          icon: markerIcons.default,
        }).addTo(map);
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
}

/** Two-way syncing of the Leaflet Map view with Yjs state, using solid js signals. */
function syncMapView(
  map: LeafletMap,
  yState: Y.Map<unknown>,
  stateSignal: Accessor<{ [x: string]: any } | undefined>
) {
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
    if (!mousedown) {
      map.setView(newPosition.center, newPosition.zoom);
    }
  });
}

/** Forward user's cursor position and pressed state to Yjs Awareness. */
function bindMyMapCursorToAwareness(
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
