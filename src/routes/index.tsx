import { nanoid } from "nanoid";
import {
  createEffect,
  createMemo,
  createSignal,
  onCleanup,
  onMount,
  Show,
} from "solid-js";
import { createStore } from "solid-js/store";
import { useLocation, useNavigate } from "solid-start";
import { CopyButton } from "~/components/CopyButton";
import { MultiplayerLeaflet } from "~/components/MultiplayerLeaflet";

export default function Home() {
  const location = useLocation();
  const navigate = useNavigate();

  const [store, setStore] = createStore({
    roomId: location.query.roomId as string | undefined,
    shareLink: undefined as string | undefined,
  });

  onMount(() => {
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
            <MultiplayerLeaflet roomName={store.roomId} />
          </div>
        )}
      </main>
    </div>
  );
}
