import * as L from "leaflet";
import rough from "roughjs";
import { createEffect, createMemo, onCleanup, onMount } from "solid-js";
import { createMutable } from "solid-js/store";

export interface DrawLayerProps {
  map: L.Map;
}

export function DrawLayer(props: DrawLayerProps) {
  const store = createMutable({
    tool: "MOVE" as "DRAW" | "MOVE",
    canvas: undefined as HTMLCanvasElement | undefined,
    drawing: false,
    drawPath: [] as [number, number][],
  });

  const roughCanvas = createMemo(() =>
    store.canvas ? rough.canvas(store.canvas, { options: {} }) : undefined
  );

  function startDraw(e: MouseEvent) {
    store.drawing = true;
    addPointToPath(e);
  }

  function addPointToPath(e: MouseEvent) {
    store.drawPath.push([e.layerX, e.layerY]);

    const c = store.canvas;
    const rc = roughCanvas();
    if (!c || !rc) return;

    // rc.path(getSvgPathFromStroke(store.drawPath));
    // roughCanvas()?.rectangle(e.layerX / 2, e.layerY / 4, 100, 50);

    roughCanvas()?.linearPath(store.drawPath);
  }

  function finishDrawing() {
    store.drawing = false;
    store.canvas?.removeEventListener("mousemove", addPointToPath);
    console.log(store.drawPath);
    store.drawPath = [];

    roughCanvas()?.rectangle(50, 25, 50, 25);
  }

  createEffect(() =>
    store.drawing
      ? store.canvas?.addEventListener("mousemove", addPointToPath)
      : store.canvas?.removeEventListener("mousemove", addPointToPath)
  );

  window.addEventListener("mouseup", finishDrawing);
  window.addEventListener("blur", finishDrawing);
  onCleanup(() => {
    window.removeEventListener("mouseup", finishDrawing);
    window.removeEventListener("blur", finishDrawing);
  });

  class DrawControl extends L.Control {
    onAdd(map: L.Map): HTMLElement {
      return (
        <div class="flex flex-col bg-white border-2 rounded border-neutral-400 text-black divide-y-2 divide-neutral-400">
          <button
            class="h-[34px] px-2 hover:bg-neutral-100"
            onClick={() => (store.tool = "MOVE")}
          >
            move
          </button>
          <button
            class="h-[34px] px-2 hover:bg-neutral-100"
            onClick={() => (store.tool = "DRAW")}
          >
            draw
          </button>
        </div>
      ) as HTMLElement;
    }
  }

  const control = new DrawControl({ position: "topleft" });

  control.addTo(props.map);
  onCleanup(() => control.remove());

  return (
    <>
      {store.tool === "DRAW" && (
        <div class="absolute inset-0 cursor-pointer z-[700]">
          <canvas
            ref={(it) => (store.canvas = it)}
            onMouseDown={startDraw}
            class="w-full h-full"
            width={700}
            height={700}
          />
        </div>
      )}
    </>
  );
}

function med(A: number[], B: number[]) {
  return [(A[0] + B[0]) / 2, (A[1] + B[1]) / 2];
}

// Trim SVG path data so number are each two decimal points. This
// improves SVG exports, and prevents rendering errors on points
// with long decimals.
const TO_FIXED_PRECISION = /(\s?[A-Z]?,?-?[0-9]*\.[0-9]{0,2})(([0-9]|e|-)*)/g;

function getSvgPathFromStroke(points: number[][]): string {
  if (!points.length) {
    return "";
  }

  const max = points.length - 1;

  return points
    .reduce(
      (acc, point, i, arr) => {
        if (i === max) {
          acc.push(point, med(point, arr[0]), "L", arr[0], "Z");
        } else {
          acc.push(point, med(point, arr[i + 1]));
        }
        return acc;
      },
      ["M", points[0], "Q"]
    )
    .join(" ")
    .replace(TO_FIXED_PRECISION, "$1");
}
