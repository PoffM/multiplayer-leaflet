import { MultiplayerLeaflet } from "~/components/MultiplayerLeaflet";

export default function Home() {
  return (
    <div class="fixed inset-0 flex items-center justify-center">
      <main class="space-y-4">
        <div class="flex justify-center">
          <h1 class="font-extrabold text-4xl">Multiplayer Leaflet</h1>
        </div>
        <div class="w-[700px] h-[700px]">
          <MultiplayerLeaflet />
        </div>
      </main>
    </div>
  );
}
