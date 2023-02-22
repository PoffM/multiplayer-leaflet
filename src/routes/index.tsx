import { nanoid } from "nanoid";
import { createEffect, lazy, onCleanup, onMount, Show } from "solid-js";
import { createStore } from "solid-js/store";
import { useLocation, useNavigate } from "solid-start";
import {
  adjectives,
  animals,
  colors,
  uniqueNamesGenerator,
} from "unique-names-generator";
import { ColorPicker, USER_COLORS } from "~/components/ColorPicker";
import { CopyButton } from "~/components/CopyButton";
import { createSharedLeafletState } from "~/components/shared-leaflet/createSharedLeafletState";
import {
  MultiplayerLeafletAwareness,
  zLeafletAwarenessSchema,
} from "~/components/shared-leaflet/live-cursors/MultiplayerLeafletAwareness";

/** Lazy-loaded map component because Leaflet can't be imported during SSR. */
const MultiplayerLeaflet = lazy(async () => {
  const { MultiplayerLeaflet } = await import(
    "~/components/shared-leaflet/MultiplayerLeaflet"
  );

  return { default: MultiplayerLeaflet };
});

export default function Home() {
  const location = useLocation();
  const navigate = useNavigate();

  const [store, setStore] = createStore({
    roomId: location.query.roomId as string | undefined,
    shareLink: undefined as string | undefined,
  });

  function updateLink() {
    setTimeout(() => {
      setStore({
        roomId: location.query.roomId,
        shareLink: window.location.href,
      });
    }, 0);
  }

  onMount(() => {
    // Create a new random room ID if there isn't one:
    if (!store.roomId) {
      navigate(`/?roomId=${nanoid()}`);
    }

    updateLink();
    window.addEventListener("popstate", updateLink);
  });

  onCleanup(() => window.removeEventListener("popstate", updateLink));

  return (
    <Show when={store.roomId && store.shareLink} keyed>
      {() =>
        store.roomId &&
        store.shareLink && (
          <LeafletRoom roomName={store.roomId} shareLink={store.shareLink} />
        )
      }
    </Show>
  );
}

function LeafletRoom(props: { roomName: string; shareLink: string }) {
  const state = createSharedLeafletState({ roomName: props.roomName });

  createEffect(() => {
    const username = state.myAwareness()?.username;
    if (!username) return;
    localStorage.setItem("username", username);
  });
  createEffect(() => {
    const userColor = state.myAwareness()?.userColor;
    if (!userColor) return;
    localStorage.setItem("userColor", userColor);
  });

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

    state.provider.awareness.setLocalState(
      zLeafletAwarenessSchema.parse(initialAwareness)
    );
  });

  return (
    <div class="fixed inset-0 flex items-center justify-center">
      <main class="space-y-4">
        <h1 class="font-extrabold text-4xl text-center">Multiplayer Leaflet</h1>
        {props.shareLink && (
          <div class="flex flex-col items-center gap-1">
            <div>Share this link with someone to share a synchronized map:</div>
            <div class="input-group flex items-center justify-center w-auto border rounded-lg border-gray-500">
              <div class="px-4">{props.shareLink}</div>
              <CopyButton textToCopy={props.shareLink} />
            </div>
          </div>
        )}
        {state.myAwareness()?.userColor && (
          <MultiplayerLeaflet roomName={props.roomName} state={state} />
        )}
        <div class="flex justify-center gap-4">
          <label class="form-control flex-row gap-1 w-[400px]">
            <div class="label">
              <span class="label-text font-bold whitespace-nowrap">
                Your Username
              </span>
            </div>
            <input
              type="text"
              placeholder="Type here"
              class="input input-bordered w-full max-w-xs"
              value={state.myAwareness()?.username}
              onInput={(e) =>
                state.provider.awareness.setLocalStateField(
                  "username",
                  // @ts-expect-error should always work:
                  e.target.value
                )
              }
            />
          </label>
          <label class="form-control flex-row gap-1">
            <div class="label">
              <span class="label-text font-bold whitespace-nowrap">
                Your Color
              </span>
            </div>
            <ColorPicker
              color={state.myAwareness()?.userColor}
              onChange={(newColor) =>
                state.provider.awareness.setLocalStateField(
                  "userColor",
                  newColor
                )
              }
            />
          </label>
        </div>
      </main>
    </div>
  );
}
