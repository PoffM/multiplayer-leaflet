import * as L from "leaflet";
import { FaSolidHand, FaSolidPen } from "solid-icons/fa";
import { onCleanup } from "solid-js";
import { render } from "solid-js/web";
import { Awareness } from "y-protocols/awareness";
import { AwarenessMapSignal } from "~/solid-yjs/signalFromAwareness";
import { USER_COLORS } from "../../ColorPicker";
import { MultiplayerLeafletAwareness } from "../live-cursors/MultiplayerLeafletAwareness";

export interface DrawButtonControlProps {
  awareness: Awareness;
  awarenessMap: AwarenessMapSignal<MultiplayerLeafletAwareness>;
}

export function DrawButtonControl(props: DrawButtonControlProps) {
  function isSelected(tool: MultiplayerLeafletAwareness["tool"]) {
    return props.awarenessMap[props.awareness.clientID]?.tool === tool;
  }

  function toggleToolOnPressSpace(e: KeyboardEvent): void {
    if (e.key === " ") {
      e.preventDefault();
      const tool = props.awarenessMap[props.awareness.clientID]?.tool;
      props.awareness.setLocalStateField(
        "tool",
        tool === "DRAW" ? "MOVE" : "DRAW"
      );
    }
  }

  window.addEventListener("keydown", toggleToolOnPressSpace);
  onCleanup(() => {
    window.removeEventListener("keydown", toggleToolOnPressSpace);
  });

  return (
    <div class="space-y-1">
      <div class="w-fit flex flex-col bg-white border-2 rounded border-neutral-400 text-black divide-y-2 divide-neutral-400">
        <button
          class="h-[34px] px-2 hover:bg-neutral-100"
          onClick={() => props.awareness.setLocalStateField("tool", "MOVE")}
          title="Move Mode"
          style={{
            color: isSelected("MOVE")
              ? USER_COLORS[
                  props.awarenessMap[props.awareness.clientID]?.userColor ??
                    "Green"
                ]
              : "black",
          }}
        >
          <FaSolidHand size="20px" />
        </button>
        <button
          class="h-[34px] px-2 hover:bg-neutral-100"
          onClick={() => props.awareness.setLocalStateField("tool", "DRAW")}
          title="Draw Mode"
          style={{
            color: isSelected("DRAW")
              ? USER_COLORS[
                  props.awarenessMap[props.awareness.clientID]?.userColor ??
                    "Green"
                ]
              : "black",
          }}
        >
          <FaSolidPen size="20px" />
        </button>
      </div>
      <div class="bg-white border-2 rounded border-neutral-400 text-black text-center px-1 max-w-[90px]">
        Press space to switch tools
      </div>
    </div>
  );
}

export function addDrawButtonsControlToMap(
  map: L.Map,
  props: DrawButtonControlProps
) {
  const controlDiv = (<div />) as HTMLElement;
  const disposeSolidControl = render(
    () => (
      <DrawButtonControl
        awareness={props.awareness}
        awarenessMap={props.awarenessMap}
      />
    ),
    controlDiv
  );

  class DrawControl extends L.Control {
    onAdd(): HTMLElement {
      return controlDiv;
    }
  }

  const control = new DrawControl({ position: "topleft" }).addTo(map);

  onCleanup(() => {
    disposeSolidControl();
    control.remove();
  });
}
