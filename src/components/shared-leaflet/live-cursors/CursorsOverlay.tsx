import { For } from "solid-js";
import { SharedLeafletState } from "../createSharedLeafletState";
import { CursorIcon } from "./CursorIcon";

export function CursorsOverlay(props: { state: SharedLeafletState }) {
  return (
    <div class="absolute inset-0 pointer-events-none">
      <div class="relative w-full h-full">
        <For each={Object.entries(props.state.awarenessStore)}>
          {([_, awareness]) => {
            const point = () => awareness?.mouseContainerPoint;

            return (
              <div
                class="absolute z-[700]"
                style={{
                  left: `${point()?.[0]}px`,
                  top: `${point()?.[1]}px`,
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
