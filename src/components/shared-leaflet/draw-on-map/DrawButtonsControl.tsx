import * as L from "leaflet";
import { FaSolidHand, FaSolidPen } from "solid-icons/fa";
import { onCleanup } from "solid-js";
import { render } from "solid-js/web";
import { USER_COLORS } from "../../ColorPicker";
import { SharedLeafletState } from "../createSharedLeafletState";
import { MultiplayerLeafletAwareness } from "../live-cursors/MultiplayerLeafletAwareness";

export interface DrawButtonControlProps {
  state: SharedLeafletState;
}

export function DrawButtonControl(props: DrawButtonControlProps) {
  function isSelected(tool: MultiplayerLeafletAwareness["tool"]) {
    return props.state.myAwareness()?.tool === tool;
  }

  function toggleToolOnPressSpace(e: KeyboardEvent): void {
    if (e.key === " ") {
      e.preventDefault();
      const tool = props.state.myAwareness()?.tool;
      props.state.setAwarenessField("tool", tool === "DRAW" ? "MOVE" : "DRAW");
    }
  }

  window.addEventListener("keydown", toggleToolOnPressSpace);
  onCleanup(() => {
    window.removeEventListener("keydown", toggleToolOnPressSpace);
  });

  return (
    <div class="select-none space-y-1">
      <div class="flex w-fit flex-col divide-y-2 divide-neutral-400 rounded border-2 border-neutral-400 bg-white text-black">
        <button
          class="h-[34px] px-2 hover:bg-neutral-100"
          onClick={() => props.state.setAwarenessField("tool", "MOVE")}
          title="Move Mode"
          style={{
            color: isSelected("MOVE")
              ? USER_COLORS[props.state.myAwareness()?.userColor ?? "Green"]
              : "black",
          }}
        >
          <FaSolidHand size="20px" />
        </button>
        <button
          class="h-[34px] px-2 hover:bg-neutral-100"
          onClick={() => props.state.setAwarenessField("tool", "DRAW")}
          title="Draw Mode"
          style={{
            color: isSelected("DRAW")
              ? USER_COLORS[props.state.myAwareness()?.userColor ?? "Green"]
              : "black",
          }}
        >
          <FaSolidPen size="20px" />
        </button>
      </div>
      <div class="max-w-[90px] rounded border-2 border-neutral-400 bg-white px-1 text-center text-black">
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
    () => <DrawButtonControl {...props} />,
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
