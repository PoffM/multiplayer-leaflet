import { clsx } from "clsx";
import { FaSolidHand, FaSolidHandBackFist } from "solid-icons/fa";
import { USER_COLORS } from "../../ColorPicker";
import { MultiplayerLeafletAwareness } from "./MultiplayerLeafletAwareness";

export function CursorIcon(props: {
  state: MultiplayerLeafletAwareness | undefined;
  hideHand: boolean;
}) {
  return (
    <div class="relative">
      <div class="absolute -left-1 -top-1">
        <div class="space-y-1">
          {props.state?.mousePressed ? (
            <FaSolidHandBackFist
              size="20px"
              // @ts-expect-error
              fill={USER_COLORS[props.state?.userColor]}
              class={clsx(props.hideHand && "invisible")} />
          ) : (
            <FaSolidHand
              size="20px"
              // @ts-expect-error
              fill={USER_COLORS[props.state?.userColor]}
              class={clsx(props.hideHand && "invisible")} />
          )}
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
