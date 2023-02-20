import type { Map as LeafletMap } from "leaflet";
import * as L from "leaflet";
import { createEffect } from "solid-js";
import { render } from "solid-js/web";
import { WebrtcProvider } from "y-webrtc";
import {
  AwarenessChanges,
  AwarenessMapSignal,
} from "../../../solid-yjs/signalFromAwareness";
import { CursorIcon } from "./CursorIcon";
import { MultiplayerLeafletAwareness } from "./MultiplayerLeafletAwareness";

export function displayUserCursors(
  map: LeafletMap,
  provider: WebrtcProvider,
  awarenessMap: AwarenessMapSignal<MultiplayerLeafletAwareness>
) {
  const cleanupFunctions = new Map<number, () => void>();

  // Add the user's own cursor to the map, hiding the hand icon:
  const cleanupMyCursor = addCursorMarkerToMap(
    awarenessMap,
    provider.awareness.clientID,
    map
  );
  cleanupFunctions.set(provider.awareness.clientID, cleanupMyCursor);

  provider.awareness.on("update", (changes: AwarenessChanges) => {
    for (const clientId of changes.added) {
      const cleanup = addCursorMarkerToMap(awarenessMap, clientId, map);
      cleanupFunctions.set(clientId, cleanup);
    }

    for (const clientId of changes.removed) {
      cleanupFunctions.get(clientId)?.();
      cleanupFunctions.delete(clientId);
    }
  });
}

function addCursorMarkerToMap(
  awarenessMap: AwarenessMapSignal<MultiplayerLeafletAwareness>,
  clientId: number,
  map: LeafletMap
) {
  const iconRoot = (<div />) as HTMLElement;

  const initialState = awarenessMap[clientId];

  const marker = L.marker(initialState?.mouseLatLng ?? [0, 0], {
    icon: L.divIcon({
      html: iconRoot,
      className: ""
    }),
  }).addTo(map);

  createEffect(() => {
    const state = awarenessMap[clientId];
    if (!state) return;

    marker.setLatLng(state.mouseLatLng);
  });

  const disposeSolid = render(
    () => <CursorIcon state={awarenessMap[clientId]} />,
    iconRoot
  );

  return () => {
    disposeSolid();
    marker.remove();
  };
}
