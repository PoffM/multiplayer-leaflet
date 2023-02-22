import { nanoid } from "nanoid";
import { lazy, onCleanup, onMount, Show } from "solid-js";
import { createStore } from "solid-js/store";
import { useLocation, useNavigate } from "solid-start";
import { ColorPicker } from "~/components/ColorPicker";
import { CopyButton } from "~/components/CopyButton";
import { createSharedLeafletState } from "~/components/shared-leaflet/createSharedLeafletState";

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
    <Show when={store.roomId} keyed>
      {(rId) => {
        const state = createSharedLeafletState({ roomName: rId });

        return (
          <div class="fixed inset-0 flex items-center justify-center">
            <main class="space-y-4">
              <h1 class="font-extrabold text-4xl text-center">
                Multiplayer Leaflet
              </h1>
              {store.shareLink && (
                <div class="flex flex-col items-center gap-1">
                  <div>
                    Share this link with someone to share a synchronized map:
                  </div>
                  <div class="input-group flex items-center justify-center w-auto border rounded-lg border-gray-500">
                    <div class="px-4">{store.shareLink}</div>
                    <CopyButton textToCopy={store.shareLink} />
                  </div>
                </div>
              )}
              {state.myAwareness()?.userColor && (
                <MultiplayerLeaflet roomName={rId} state={state} />
              )}
              {state.myAwareness()?.username !== undefined && (
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
                        state.setAwarenessField(
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
                        state.setAwarenessField("userColor", newColor)
                      }
                    />
                  </label>
                </div>
              )}
            </main>
          </div>
        );
      }}
    </Show>
  );
}
