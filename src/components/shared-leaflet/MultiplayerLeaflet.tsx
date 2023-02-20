import * as L from "leaflet";
import "leaflet/dist/leaflet.css";
import { onCleanup, onMount } from "solid-js";
import { WebrtcProvider } from "y-webrtc";
import * as Y from "yjs";
import { signalFromAwareness } from "~/solid-yjs/signalFromAwareness";
import { USER_COLORS } from "../ColorPicker";
import { DrawLayer } from "./DrawLayer";
import { displayUserCursors } from "./live-cursors/displayUserCursors";
import { zLeafletAwarenessSchema } from "./live-cursors/MultiplayerLeafletAwareness";
import { shareMyCursor } from "./live-cursors/shareMyCursor";
import { syncMapView } from "./syncMapView";

export interface MultiplayerLeafletProps {
  roomName: string;
  username: string;
  userColor: keyof typeof USER_COLORS;
}

export function MultiplayerLeaflet(props: MultiplayerLeafletProps) {
  const leafletDiv = (
    <div class="absolute rounded-md w-[700px] h-[700px]" />
  ) as HTMLDivElement;

  const ydoc = new Y.Doc();

  const yState = ydoc.getMap("leafletState");

  // Setup the Leaflet map:
  const map = L.map(leafletDiv).setView([51.505, -0.09], 13);
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  }).addTo(map);
  onMount(() => map.invalidateSize());
  onCleanup(() => map.remove());

  // Make sure leaflet knows the mouse button is released when the cursor isn't on the map element:
  const fireMapMouseUpEvent = () => map.fireEvent("mouseup");
  window.addEventListener("mouseup", fireMapMouseUpEvent);
  window.addEventListener("blur", fireMapMouseUpEvent);
  onCleanup(() => {
    window.removeEventListener("mouseup", fireMapMouseUpEvent);
    window.removeEventListener("blur", fireMapMouseUpEvent);
  });

  // clients connected to the same room-name share document updates
  const provider = new WebrtcProvider(
    `shared-leaflet-${props.roomName}`,
    ydoc,
    { password: "password" }
  );
  onCleanup(() => {
    provider.disconnect();
    provider.destroy();
  });

  const awarenessMap = signalFromAwareness(
    provider.awareness,
    zLeafletAwarenessSchema
  );

  // Add my custom features to the map:
  shareMyCursor(
    provider,
    map,
    () => props.username,
    () => props.userColor
  );
  displayUserCursors(map, provider, awarenessMap);
  syncMapView(map, yState);

  return (
    <div class="relative">
      {leafletDiv}
      <DrawLayer
        map={map}
        yStrokes={ydoc.getArray("strokes")}
        clientId={provider.awareness.clientID}
        awarenessMap={awarenessMap}
      />
    </div>
  );
}
