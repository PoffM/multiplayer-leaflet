import { createSignal, For, onCleanup } from "solid-js";

export const USER_COLORS = {
  Black: "#000000",
  Red: "#991b1b",
  Pink: "#9d174d",
  Violet: "#5b21b6",
  Indigo: "#3730a3",
  Blue: "#1e40af",
  Cyan: "#155e75",
  Teal: "#115e59",
  Green: "#166534",
  Lime: "#3f6212",
  Yellow: "#854d0e",
  Orange: "#9a3412",
} as const;

export interface ColorPickerProps {
  color?: keyof typeof USER_COLORS;
  onChange: (color: keyof typeof USER_COLORS) => void;
}

export function ColorPicker(props: ColorPickerProps) {
  const [colorPickerOpen, setColorPickerOpen] = createSignal(false);

  function closeOnClickOutside(el: HTMLDivElement) {
    const onClick = (e: MouseEvent) =>
      // @ts-expect-error "target" should be the correct type
      !el.contains(e.target) && setColorPickerOpen(false);
    document.body.addEventListener("click", onClick);

    onCleanup(() => document.body.removeEventListener("click", onClick));
  }

  return (
    <div class="relative aspect-square h-[3rem]">
      <button
        class="absolute h-full w-full rounded-md border border-base-content border-opacity-20"
        style={{ "background-color": USER_COLORS[props.color ?? "Black"] }}
        onClick={() => setColorPickerOpen((it) => !it)}
      />
      {colorPickerOpen() && (
        <div class="absolute top-3/4 right-0">
          <div
            class="grid gap-2 rounded-md bg-base-300 p-4"
            style={{ "grid-template-columns": "repeat(4, auto)" }}
            ref={closeOnClickOutside}
          >
            <For each={Object.entries(USER_COLORS)}>
              {([colorName, hex]) => (
                <button
                  class="aspect-square w-[2rem] rounded-md"
                  style={{ "background-color": hex }}
                  title={colorName}
                  onClick={(e) => {
                    e.preventDefault();
                    // @ts-expect-error color should always be one of the object keys:
                    props.onChange(colorName);
                    setColorPickerOpen(false);
                  }}
                />
              )}
            </For>
          </div>
        </div>
      )}
    </div>
  );
}
