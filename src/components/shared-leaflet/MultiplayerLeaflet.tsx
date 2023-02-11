import "leaflet/dist/leaflet.css";
import { onCleanup, onMount } from "solid-js";
import { WebrtcProvider } from "y-webrtc";
import * as Y from "yjs";
import { signalFromY } from "../../solid-yjs/signalFromY";
import { USER_COLORS } from "../ColorPicker";
import { displayUserCursors } from "./live-cursors/displayUserCursors";
import { shareMyCursor } from "./live-cursors/shareMyCursor";
import { syncMapView } from "./syncMapView";

export interface MultiplayerLeafletProps {
  roomName: string;
  username: string;
  userColor: keyof typeof USER_COLORS;
}

export function MultiplayerLeaflet(props: MultiplayerLeafletProps) {
  const div = (<div class="w-full h-full rounded-md" />) as HTMLDivElement;

  const ydoc = new Y.Doc();

  const yState = ydoc.getMap("leafletState");
  const stateSignal = signalFromY(yState);

  let fireMapMouseUpEvent: () => void;
  let provider: WebrtcProvider;

  onMount(async () => {
    // Setup the Leaflet map:
    const L = await import("leaflet");
    const map = L.map(div).setView([51.505, -0.09], 13);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);
    fireMapMouseUpEvent = () => map.fireEvent("mouseup");
    window.addEventListener("mouseup", fireMapMouseUpEvent);
    window.addEventListener("blur", fireMapMouseUpEvent);

    // clients connected to the same room-name share document updates
    provider = new WebrtcProvider(`shared-leaflet-${props.roomName}`, ydoc, {
      password: "password",
    });

    shareMyCursor(
      provider,
      map,
      () => props.username,
      () => props.userColor
    );
    await displayUserCursors(provider, map);

    syncMapView(map, yState, stateSignal);
  });

  onCleanup(() => {
    window.removeEventListener("mouseup", fireMapMouseUpEvent);
    provider.disconnect();
    provider.destroy();
  });

  return div;
}