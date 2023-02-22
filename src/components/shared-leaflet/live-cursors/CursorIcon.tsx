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
      class: "cursor-none"
    };
  }

  return (
    <div class="relative cursor-none">
      <div class="absolute -left-1 -top-1">
        <div
          class="space-y-1"
          style={{
            transform:
              props.state?.tool === "DRAW" ? "translate(10px, -10px)" : "",
          }}
        >
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
              // @ts-expect-error
              "background-color": USER_COLORS[props.state?.userColor],
            }}
          >
            <span>{props.state?.username}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
