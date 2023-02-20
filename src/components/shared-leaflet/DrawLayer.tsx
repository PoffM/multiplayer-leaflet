import * as L from "leaflet";
import rough from "roughjs";
import { createEffect, createMemo, from, onCleanup } from "solid-js";
import { createMutable } from "solid-js/store";
import { render } from "solid-js/web";
import * as Y from "yjs";
import { AwarenessMapSignal } from "~/solid-yjs/signalFromAwareness";
import { signalFromY } from "~/solid-yjs/signalFromY";
import { MultiplayerLeafletAwareness } from "./live-cursors/MultiplayerLeafletAwareness";
import { USER_COLORS } from "../ColorPicker";

export interface DrawLayerProps {
  map: L.Map;
  yStrokes: Y.Array<Y.Map<any>>;
  clientId: number;
  awarenessMap: AwarenessMapSignal<MultiplayerLeafletAwareness>;
}

export function DrawLayer(props: DrawLayerProps) {
  const store = createMutable({
    tool: "MOVE" as "DRAW" | "MOVE",
    canvas: undefined as HTMLCanvasElement | undefined,

    drawing: false,
  });

  const zoom = from<number>((set) => {
    const updateZoom = () => set(props.map.getZoom());
    updateZoom();
    props.map.on("zoom", updateZoom);
    return () => props.map.removeEventListener("zoom", updateZoom);
  });

  let currentStroke: Y.Map<any> | null = null;

  function startDraw(e: MouseEvent) {
    store.drawing = true;

    currentStroke = new Y.Map();
    currentStroke.set("clientId", props.clientId);
    currentStroke.set("seed", Math.random() * 1000);

    const points = new Y.Array<[number, number]>();
    // @ts-expect-error layerX/Y should exist:
    points.push([[e.layerX, e.layerY]]);
    currentStroke.set("points", new Y.Array<[number, number]>());

    props.yStrokes.push([currentStroke]);
  }

  function addPointToPath(e: MouseEvent) {
    const points = currentStroke?.get("points");

    // @ts-expect-error layerX/Y should exist:
    points.push([[e.layerX, e.layerY]]);
  }

  function finishDrawing() {
    store.drawing = false;
    currentStroke = null;
  }

  props.yStrokes.observe((event) => {
    if (event.changes.added) {
      for (const item of event.changes.added) {
        for (const stroke of item.content.getContent() as Y.Map<any>[]) {
          addStrokeToMap(stroke);
        }
      }
    }
  });

  function addStrokeToMap(stroke: Y.Map<any>) {
    const iconRoot = (<div />) as HTMLElement;

    const strokeSignal = signalFromY(stroke);

    const pointsSignal = signalFromY<Y.Array<[number, number]>>(
      stroke.get("points")
    );

    const startPoint = createMemo(() => pointsSignal().get(0));

    const marker = createMemo(() =>
      startPoint()
        ? L.marker(props.map.containerPointToLatLng(startPoint()), {
            icon: L.divIcon({
              html: iconRoot,
              className: "[cursor:inherit!important]",
              iconSize: [0, 0],
            }),
          }).addTo(props.map)
        : undefined
    );
    marker();

    const origZoom = zoom()!;

    const zoomDiff = () => zoom()! - origZoom;
    const zoomOffset = () => -50 * Math.pow(2, -zoomDiff()!);

    function setupCanvas(canvas: HTMLCanvasElement) {
      const rc = rough.canvas(canvas);
      const ctx = canvas.getContext("2d");

      createEffect(() => {
        const points = pointsSignal();
        if (!points) return;

        const start = points.get(0);
        const pointsOnMap = points.map<[number, number]>((coord) => [
          coord[0] - start[0] + canvasRadius,
          coord[1] - start[1] + canvasRadius,
        ]);

        const svgPath = getSvgPathFromStroke(pointsOnMap);

        const color =
          USER_COLORS[
            props.awarenessMap[strokeSignal().get("clientId")]?.userColor ??
              "Black"
          ];

        ctx?.clearRect(0, 0, canvas.width, canvas.height);
        rc.linearPath(pointsOnMap, { stroke: color, seed: stroke.get("seed") });
      });
    }

    const canvasRadius = 700;
    const disposeSolid = render(
      () => (
        <canvas
          width={canvasRadius * 2}
          height={canvasRadius * 2}
          style={{
            transform: `translate(${zoomOffset()}%, ${zoomOffset()}%)`,
            scale: Math.pow(2, zoomDiff()),
          }}
          ref={setupCanvas}
        />
      ),
      iconRoot
    );

    function cleanup() {
      marker()?.remove();
      disposeSolid();
    }
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
