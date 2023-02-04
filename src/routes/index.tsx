import { nanoid } from "nanoid";
import { createSignal } from "solid-js";
import { useNavigate } from "solid-start";

export default function Home() {
  const navigate = useNavigate();

  const [roomName, setRoomName] = createSignal("");

  function goToRoom(id: string = nanoid()) {
    navigate(`/room?id=${id}`, {});
  }

  return (
    <div class="fixed inset-0 flex items-center justify-center">
      <main class="w-[400px] space-y-4">
        <h1 class="font-extrabold text-4xl text-center">Multiplayer Leaflet</h1>
        <div class="card p-6 bg-base-200 space-y-4">
          <div class="flex justify-center">
            <button class="btn btn-primary" onClick={() => goToRoom()}>
              Create a New Room
            </button>
          </div>
          <div class="font-bold text-center">OR</div>
          <form
            class="flex justify-center"
            onSubmit={(e) => {
              e.preventDefault();
              goToRoom(roomName());
            }}
          >
            <div class="form-control">
              <div class="input-group">
                <input
                  type="text"
                  class="input input-bordered"
                  placeholder="Enter a Room Name"
                  value={roomName()}
                  // @ts-expect-error "value" isn't on target for some reason, should work anyway:
                  onInput={(e) => setRoomName(e.target.value)}
                />
                <button
                  type="submit"
                  class="btn btn-secondary"
                  disabled={!roomName()}
                >
                  Join
                </button>
              </div>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
