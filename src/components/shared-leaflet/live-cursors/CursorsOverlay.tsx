import { For } from "solid-js";
import { AwarenessMapSignal } from "../../../solid-yjs/signalFromAwareness";
import { CursorIcon } from "./CursorIcon";
import { MultiplayerLeafletAwareness } from "./MultiplayerLeafletAwareness";

export interface CursorsOverlayProps {
  awarenessMap: AwarenessMapSignal<MultiplayerLeafletAwareness>;
}

export function CursorsOverlay(props: CursorsOverlayProps) {
  return (
    <div class="absolute inset-0 pointer-events-none">
      <div class="relative w-full h-full">
        <For each={Object.entries(props.awarenessMap)}>
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
