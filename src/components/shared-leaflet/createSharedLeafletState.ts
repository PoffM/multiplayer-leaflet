import { createEffect, onCleanup, onMount } from "solid-js";
import {
  adjectives,
  animals,
  colors,
  uniqueNamesGenerator,
} from "unique-names-generator";
import { WebrtcProvider } from "y-webrtc";
import * as Y from "yjs";
import { USER_COLORS } from "~/components/ColorPicker";
import { MultiplayerLeafletAwareness } from "~/components/shared-leaflet/live-cursors/MultiplayerLeafletAwareness";
import { signalFromAwareness } from "~/solid-yjs/signalFromAwareness";
import { zSharedLeafletAwareness } from "./live-cursors/MultiplayerLeafletAwareness";

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
    signaling: import.meta.env.VITE_SIGNALING
      ? import.meta.env.VITE_SIGNALING?.split(",")
      : undefined,
  });
  onCleanup(() => {
    provider.disconnect();
    provider.destroy();
  });

  const yLeafletState = ydoc.getMap("leafletState");

  const awarenessStore = signalFromAwareness(
    provider.awareness,
    zSharedLeafletAwareness
  );

  onMount(() => {
    const initialAwareness: MultiplayerLeafletAwareness = {
      // Get the stored username, otherwise generate a random one:
      username:
        localStorage.getItem("username") ||
        uniqueNamesGenerator({
          dictionaries: [adjectives, colors, animals],
          length: 3,
          separator: "-",
        }),
      // Get the stored userColor, otherwise generate a random one:
      // @ts-expect-error a valid key should always be used:
      userColor:
        localStorage.getItem("userColor") ||
        Object.keys(USER_COLORS)[
          Math.floor(Math.random() * Object.keys(USER_COLORS).length)
        ],
      mouseContainerPoint: [0, 0],
      mousePressed: false,
    };

    provider.awareness.setLocalState(
      zSharedLeafletAwareness.parse(initialAwareness)
    );
  });

  createEffect(() => {
    const username = myAwareness()?.username;
    if (!username) return;
    localStorage.setItem("username", username);
  });
  createEffect(() => {
    const userColor = myAwareness()?.userColor;
    if (!userColor) return;
    localStorage.setItem("userColor", userColor);
  });

  function myAwareness() {
    return awarenessStore[provider.awareness.clientID];
  }

  function setAwarenessField<TField extends keyof MultiplayerLeafletAwareness>(
    field: TField,
    val: MultiplayerLeafletAwareness[TField]
  ) {
    provider.awareness.setLocalStateField(field, val);
  }

  return {
    provider,
    ydoc,
    yLeafletState,
    awarenessStore,
    myAwareness,
    setAwarenessField,
  };
}

export type SharedLeafletState = ReturnType<typeof createSharedLeafletState>;
