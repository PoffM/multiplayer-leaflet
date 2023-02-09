import { nanoid } from "nanoid";
import { createEffect, onCleanup, onMount } from "solid-js";
import { createStore } from "solid-js/store";
import { useLocation, useNavigate } from "solid-start";
import {
  adjectives,
  animals,
  colors,
  uniqueNamesGenerator,
} from "unique-names-generator";
import { CopyButton } from "~/components/CopyButton";
import { MultiplayerLeaflet } from "~/components/shared-leaflet/MultiplayerLeaflet";

export default function Home() {
  const location = useLocation();
  const navigate = useNavigate();

  const [store, setStore] = createStore({
    roomId: location.query.roomId as string | undefined,
    username: "",
    shareLink: undefined as string | undefined,
  });

  createEffect(
    () => store.username && localStorage.setItem("username", store.username)
  );

  onMount(() => {
    // Get the stored username, otherwise generate a random one:
    setStore({
      username:
        localStorage.getItem("username") ||
        uniqueNamesGenerator({
          dictionaries: [adjectives, colors, animals],
          length: 3,
          separator: "-",
        }),
    });

    // Create a new random room ID if there isn't one:
    if (!store.roomId) {
      navigate(`/?roomId=${nanoid()}`);
    }

    function updateLink() {
      setTimeout(() => {
        setStore({
          roomId: location.query.roomId,
          shareLink: window.location.href,
        });
      }, 0);
    }
    updateLink();

    window.addEventListener("popstate", updateLink);
    onCleanup(() => window.removeEventListener("popstate", updateLink));
  });

  return (
    <div class="fixed inset-0 flex items-center justify-center">
      <main class="space-y-4">
        <h1 class="font-extrabold text-4xl text-center">Multiplayer Leaflet</h1>
        {store.shareLink && (
          <div class="flex flex-col items-center gap-1">
            <div>Share this link with someone to share a synchronized map:</div>
            <div class="input-group flex items-center justify-center w-auto border rounded-lg border-gray-500">
              <div class="px-4">{store.shareLink}</div>
              <CopyButton textToCopy={store.shareLink} />
            </div>
          </div>
        )}
        {store.roomId && (
          <div class="w-[700px] h-[700px]">
            <MultiplayerLeaflet
              roomName={store.roomId}
              username={store.username}
            />
          </div>
        )}
        <div class="flex justify-center">
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
              value={store.username}
              // @ts-expect-error should always work:
              onInput={(e) => setStore({ username: e.target.value })}
            />
          </label>
        </div>
      </main>
    </div>
  );
}
