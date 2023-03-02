import { For } from "solid-js";
import { SharedLeafletState } from "../createSharedLeafletState";
import { CursorIcon } from "./CursorIcon";

export function CursorsOverlay(props: { state: SharedLeafletState }) {
  return (
    <div class="pointer-events-none absolute inset-0">
      <div class="relative h-full w-full">
        <For each={Object.entries(props.state.awarenessStore)}>
          {([, awareness]) => {
            const point = () => awareness?.mouseContainerPoint;

            return (
              <div
                class="absolute z-[700]"
                style={{
                  left: `${point()?.[0] ?? 0}px`,
                  top: `${point()?.[1] ?? 0}px`,
                }}
              >
                <CursorIcon state={awareness} />
              </div>
            );
          }}
        </For>
      </div>
    </div>
  );
}
