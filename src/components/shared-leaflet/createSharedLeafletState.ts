import syncedStore, {
  enableMobxBindings,
  getYjsValue,
} from "@syncedstore/core";
import * as mobx from "mobx";
import {
  createEffect,
  enableExternalSource,
  onCleanup,
  onMount,
} from "solid-js";
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

export interface MapState {
  position?: {
    zoom?: number;
    center?: [number, number];
  };
}

export interface StrokeData {
  color?: string;
  points?: [number, number][];
  bounds: [L.LatLngExpression, L.LatLngExpression];
  id: string;
}

enableMobxBindings(mobx);

// register MobX as an external source for solid-js
let id = 0;
enableExternalSource((fn, trigger) => {
  const reaction = new mobx.Reaction(`externalSource@${++id}`, trigger);
  return {
    track: (x) => {
      let next;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      reaction.track(() => (next = fn(x)));
      return next;
    },
    dispose: () => reaction.dispose(),
  };
});

export function createSharedLeafletState({
  roomName,
}: SharedLeafletStateParams) {
  const signalUrls = import.meta.env.VITE_SIGNALING as string | undefined;

  const store = syncedStore<{ mapState: MapState; strokes: StrokeData[] }>({
    mapState: {},
    strokes: [],
  });

  // clients connected to the same room-name share document updates
  const provider = new WebrtcProvider(
    `shared-leaflet-${roomName}`,
    getYjsValue(store) as Y.Doc,
    {
      password: "password",
      signaling: signalUrls?.split(",") || undefined,
    }
  );
  onCleanup(() => {
    provider.disconnect();
    provider.destroy();
  });

  const awarenessStore = signalFromAwareness(
    provider.awareness,
    zSharedLeafletAwareness
  );

  onMount(() => {
    const storedColor = localStorage.getItem("userColor");

    const initialAwareness: MultiplayerLeafletAwareness = {
      tool: "MOVE",
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
        String(storedColor) in USER_COLORS
          ? storedColor
          : Object.keys(USER_COLORS)[
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
    store,
    awarenessStore,
    myAwareness,
    setAwarenessField,
  };
}

export type SharedLeafletState = ReturnType<typeof createSharedLeafletState>;
