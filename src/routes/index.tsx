import { nanoid } from "nanoid";
import {
  createEffect,
  createMemo,
  createSignal,
  onCleanup,
  onMount,
  Show,
} from "solid-js";
import { useLocation, useNavigate } from "solid-start";
import { CopyButton } from "~/components/CopyButton";
import { MultiplayerLeaflet } from "~/components/MultiplayerLeaflet";

export default function Home() {
  const location = useLocation();
  const navigate = useNavigate();

  const [roomId, setRoomId] = createSignal<string | undefined>(
    location.query.roomId
  );
  const [shareLink, setShareLink] = createSignal<string | undefined>();

  onMount(() => {
    // Create a new random room ID if there isn't one:
    if (!roomId()) {
      navigate(`/?roomId=${nanoid()}`);
    }

    function updateLink() {
      setTimeout(() => {
        setRoomId(location.query.roomId);
        setShareLink(window.location.href);
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
        <Show when={shareLink()} keyed>
          {(link) => (
            <div class="flex flex-col items-center gap-1">
              <div>
                Share this link with someone to share a synchronized map:
              </div>
              <div class="input-group flex items-center justify-center w-auto border rounded-lg border-gray-500">
                <div class="px-4">{link}</div>
                <CopyButton textToCopy={() => link} />
              </div>
            </div>
          )}
        </Show>
        <Show when={roomId()} keyed>
          {(id) => (
            <div class="w-[700px] h-[700px]">
              <MultiplayerLeaflet roomName={id} />
            </div>
          )}
        </Show>
      </main>
    </div>
  );
}
