import * as L from "leaflet";
import rough from "roughjs";
import { createEffect, createMemo, from, onCleanup } from "solid-js";
import { createMutable } from "solid-js/store";
import { render } from "solid-js/web";

export interface DrawLayerProps {
  map: L.Map;
}

export function DrawLayer(props: DrawLayerProps) {
  const store = createMutable({
    tool: "MOVE" as "DRAW" | "MOVE",
    canvas: undefined as HTMLCanvasElement | undefined,

    pathSeed: Math.random() * 1000,
    drawing: false,
    drawPath: [] as [number, number][],
  });

  const roughCanvas = createMemo(() =>
    store.canvas ? rough.canvas(store.canvas, { options: {} }) : undefined
  );

  const zoom = from<number>((set) => {
    const updateZoom = () => set(props.map.getZoom());
    updateZoom();
    props.map.on("zoom", updateZoom);
    return () => props.map.removeEventListener("zoom", updateZoom);
  });

  function startDraw(e: MouseEvent) {
    store.pathSeed = Math.random() * 1000;
    store.drawing = true;
    addPointToPath(e);
  }

  function addPointToPath(e: MouseEvent) {
    store.drawPath.push([e.layerX, e.layerY]);

    const c = store.canvas;
    const rc = roughCanvas();
    if (!c || !rc) return;

    c.getContext("2d")?.clearRect(0, 0, c.width, c.height);
    roughCanvas()?.linearPath(store.drawPath, { seed: store.pathSeed });
  }

  function finishDrawing() {
    store.drawing = false;

    const iconRoot = (<div />) as HTMLElement;

    const marker = L.marker(
      props.map.containerPointToLatLng(store.drawPath[0]),
      {
        icon: L.divIcon({
          html: iconRoot,
          className: "[cursor:inherit!important]",
          iconSize: [0, 0],
        }),
      }
    ).addTo(props.map);

    const canvasRadius = 700;
    const disposeSolid = render(() => {
      const origZoom = zoom()!;

      const zoomDiff = () => zoom()! - origZoom;

      const zoomOffset = () => -50 * Math.pow(2, -zoomDiff()!);

      return (
        <canvas
          width={canvasRadius * 2}
          height={canvasRadius * 2}
          style={{
            transform: `translate(${zoomOffset()}%, ${zoomOffset()}%)`,
            scale: Math.pow(2, zoomDiff()),
          }}
          ref={(canvas) => {
            rough.canvas(canvas).linearPath(
              store.drawPath.map((coord) => {
                const start = store.drawPath[0];
                return [
                  coord[0] - start[0] + canvasRadius,
                  coord[1] - start[1] + canvasRadius,
                ];
              })
            );
          }}
        />
      );
    }, iconRoot);

    store.drawPath = [];
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
