import * as L from "leaflet";
import "leaflet/dist/leaflet.css";
import { onCleanup, onMount } from "solid-js";
import { SharedLeafletState } from "./createSharedLeafletState";
import { DrawLayer } from "./draw-on-map/DrawLayer";
import { CursorsOverlay } from "./live-cursors/CursorsOverlay";
import { shareMyCursor } from "./live-cursors/shareMyCursor";
import { syncMapView } from "./syncMapView";

export interface MultiplayerLeafletProps {
  roomName: string;
  state: SharedLeafletState;
}

export function MultiplayerLeaflet(props: MultiplayerLeafletProps) {
  const leafletDiv = (
    <div class="absolute h-[700px] w-[700px] rounded-md [cursor:none!important]" />
  ) as HTMLDivElement;

  // Setup the Leaflet map:
  const map = L.map(leafletDiv).setView([51.505, -0.09], 13);
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  }).addTo(map);
  onMount(() => map.invalidateSize());
  onCleanup(() => map.remove());

  // Add my custom features to the map:
  shareMyCursor(map, props.state);
  syncMapView(map, props.state);

  return (
    <div class="relative">
      {leafletDiv}
      <DrawLayer map={map} state={props.state} />
      <CursorsOverlay state={props.state} />
    </div>
  );
}
