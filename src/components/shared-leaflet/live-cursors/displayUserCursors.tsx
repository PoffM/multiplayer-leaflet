import type { Map as LeafletMap } from "leaflet";
import * as L from "leaflet";
import { createEffect } from "solid-js";
import { render } from "solid-js/web";
import { WebrtcProvider } from "y-webrtc";
import {
  AwarenessChanges,
  signalFromAwareness,
} from "../../../solid-yjs/signalFromAwareness";
import { CursorIcon } from "./CursorIcon";
import {
  MultiplayerLeafletAwareness,
  zLeafletAwarenessSchema,
} from "./MultiplayerLeafletAwareness";

export function displayUserCursors(provider: WebrtcProvider, map: LeafletMap) {
  const awarenessMap = signalFromAwareness(
    provider.awareness,
    zLeafletAwarenessSchema
  );

  const cleanupFunctions = new Map<number, () => void>();

  // Add the user's own cursor to the map, hiding the hand icon:
  const cleanupMyCursor = addCursorMarkerToMap(
    awarenessMap,
    provider.awareness.clientID,
    map,
    true
  );
  cleanupFunctions.set(provider.awareness.clientID, cleanupMyCursor);

  provider.awareness.on("update", (changes: AwarenessChanges) => {
    for (const clientId of changes.added) {
      const cleanup = addCursorMarkerToMap(awarenessMap, clientId, map, false);
      cleanupFunctions.set(clientId, cleanup);
    }

    for (const clientId of changes.removed) {
      cleanupFunctions.get(clientId)?.();
      cleanupFunctions.delete(clientId);
    }
  });
}

function addCursorMarkerToMap(
  awarenessMap: {
    [key: number]: MultiplayerLeafletAwareness | undefined;
  },
  clientId: number,
  map: LeafletMap,
  hideHand: boolean
) {
  const iconRoot = (<div />) as HTMLElement;

  const initialState = awarenessMap[clientId];

  const marker = L.marker(initialState?.mouseLatLng ?? [0, 0], {
    icon: L.divIcon({
      html: iconRoot,
      className: "",
    }),
  }).addTo(map);

  createEffect(() => {
    const state = awarenessMap[clientId];
    if (!state) return;

    marker.setLatLng(state.mouseLatLng);
  });

  const disposeSolid = render(
    () => <CursorIcon state={awarenessMap[clientId]} hideHand={hideHand} />,
    iconRoot
  );

  return () => {
    disposeSolid();
    marker.remove();
  };
}
