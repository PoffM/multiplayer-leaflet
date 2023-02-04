import { createSignal, onMount, Show, onCleanup } from "solid-js";
import { useLocation, useRouteData } from "solid-start";
import { CopyButton } from "~/components/CopyButton";
import { MultiplayerLeaflet } from "~/components/MultiplayerLeaflet";

export default function RoomPage() {
  const location = useLocation();

  const [shareLink, setShareLink] = createSignal("");

  onMount(() => {
    function updateLink() {
      setTimeout(() => setShareLink(window.location.href), 0);
    }
    updateLink();

    window.addEventListener("popstate", updateLink);
    onCleanup(() => window.removeEventListener("popstate", updateLink));
  });

  return (
    <div class="fixed inset-0 flex items-center justify-center">
      <main class="space-y-4">
        <h1 class="font-extrabold text-4xl text-center">Multiplayer Leaflet</h1>
        <Show when={shareLink()}>
          <div class="flex flex-col items-center gap-1">
            <div>Share this link with someone to share a synchronized map:</div>
            <div class="input-group flex gap-2 items-center justify-center w-auto border rounded-lg pl-2 border-gray-500">
              <div class="">{shareLink()}</div>
              <CopyButton textToCopy={shareLink} />
            </div>
          </div>
        </Show>
        <div class="w-[700px] h-[700px]">
          <MultiplayerLeaflet roomName={() => location.query.id} />
        </div>
      </main>
    </div>
  );
}
