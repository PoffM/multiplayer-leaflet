import "leaflet/dist/leaflet.css";
import {
  Accessor,
  createEffect,
  createSignal,
  from,
  onCleanup,
  onMount,
} from "solid-js";
import { reconcile } from "solid-js/store";
import { Room, WebrtcProvider } from "y-webrtc";
import * as Y from "yjs";
import { isEqual, matchesProperty } from "lodash";
import { LeafletMouseEvent, Map } from "leaflet";
import { Awareness } from "y-protocols/awareness";

/** Create a solidjs signal from a yjs type */
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

function signalFromAwareness(awareness: Awareness) {
  return from((set) => {
    set(awareness.getStates());
    function observer(_: unknown, room: Room | "local") {
      if (typeof room === "string") return;
      set(reconcile(room.awareness.getStates()));
    }
    awareness.on("update", observer);
    return () => awareness.off("update", observer);
  });
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

    createEffect(() => console.log(awareness()))

    bindMyMapCursorToAwareness(provider, map);

    syncMapView(map, yState, stateSignal);
  });

  return <div class="w-full h-full" ref={div} />;
}

/** Two-way syncing of the Leaflet Map view with Yjs state. */
function syncMapView(
  map: Map,
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
function bindMyMapCursorToAwareness(provider: WebrtcProvider, map: Map) {
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
