import { onCleanup } from "solid-js";
import { WebrtcProvider } from "y-webrtc";
import * as Y from "yjs";
import { signalFromAwareness } from "~/solid-yjs/signalFromAwareness";
import { zLeafletAwarenessSchema } from "./live-cursors/MultiplayerLeafletAwareness";

export interface SharedLeafletStateParams {
  roomName: string;
}

export function createSharedLeafletState({
  roomName,
}: SharedLeafletStateParams) {
  const ydoc = new Y.Doc();

  // clients connected to the same room-name share document updates
  const provider = new WebrtcProvider(`shared-leaflet-${roomName}`, ydoc, {
    password: "password",
  });

  const yLeafletState = ydoc.getMap("leafletState");

  onCleanup(() => {
    provider.disconnect();
    provider.destroy();
  });

  const awarenessStore = signalFromAwareness(
    provider.awareness,
    zLeafletAwarenessSchema
  );

  function myAwareness() {
    return awarenessStore[provider.awareness.clientID];
  }

  return {
    provider,
    ydoc,
    yLeafletState,
    awarenessStore,
    myAwareness,
  };
}

export type SharedLeafletState = ReturnType<typeof createSharedLeafletState>;
