import clsx from "clsx";
import { FaSolidHand, FaSolidHandBackFist, FaSolidPen } from "solid-icons/fa";
import { USER_COLORS } from "../../ColorPicker";
import { MultiplayerLeafletAwareness } from "./MultiplayerLeafletAwareness";

export function CursorIcon(props: {
  state: MultiplayerLeafletAwareness | undefined;
}) {
  function iconProps() {
    return {
      size: "20px",
      fill: USER_COLORS[props.state?.userColor ?? "Black"],
      class: "",
    };
  }

  return (
    <div class="relative">
      <div
        class={clsx(
          "absolute",
          props.state?.tool === "DRAW" && "-top-5",
          props.state?.tool === "MOVE" && "-top-3 -left-3"
        )}
      >
        <div class="space-y-1">
          {props.state?.tool === "MOVE" &&
            (props.state?.mousePressed ? (
              <FaSolidHandBackFist {...iconProps()} />
            ) : (
              <FaSolidHand {...iconProps()} />
            ))}
          {props.state?.tool === "DRAW" && <FaSolidPen {...iconProps()} />}
          <div
            class="text-gray-200 py-1 px-2 rounded-md font-bold whitespace-nowrap"
            style={{
              "background-color":
                USER_COLORS[props.state?.userColor ?? "Black"],
            }}
          >
            <span>{props.state?.username}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
