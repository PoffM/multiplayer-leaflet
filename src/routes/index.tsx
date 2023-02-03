import { MultiplayerLeaflet } from "~/components/MultiplayerLeaflet";

export default function Home() {
  return (
    <div class="fixed inset-0 flex items-center justify-center">
      <main class="space-y-4">
        <h1>Multiplayer Leaflet</h1>
        <div class="w-[700px] h-[700px]">
          <MultiplayerLeaflet />
        </div>
      </main>
    </div>
  );
}
