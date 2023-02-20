import clsx from "clsx";
import * as L from "leaflet";
import rough from "roughjs";
import { FaSolidHand, FaSolidPen } from "solid-icons/fa";
import { createEffect, createMemo, from, onCleanup } from "solid-js";
import { createMutable } from "solid-js/store";
import { render } from "solid-js/web";
import { Awareness } from "y-protocols/awareness";
import * as Y from "yjs";
import { AwarenessMapSignal } from "~/solid-yjs/signalFromAwareness";
import { signalFromY } from "~/solid-yjs/signalFromY";
import { USER_COLORS } from "../ColorPicker";
import { MultiplayerLeafletAwareness } from "./live-cursors/MultiplayerLeafletAwareness";

export interface DrawLayerProps {
  map: L.Map;
  yStrokes: Y.Array<Y.Map<any>>;
  awareness: Awareness;
  awarenessMap: AwarenessMapSignal<MultiplayerLeafletAwareness>;
}

export function DrawLayer(props: DrawLayerProps) {
  const store = createMutable({
    drawing: false,
  });

  let drawDiv: HTMLDivElement | undefined = undefined;

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
    currentStroke.set("clientId", props.awareness.clientID);
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

  function strokesObserver(event: Y.YArrayEvent<Y.Map<any>>) {
    if (event.changes.added) {
      for (const item of event.changes.added) {
        for (const stroke of item.content.getContent() as Y.Map<any>[]) {
          addStrokeToMap(stroke);
        }
      }
    }
  }
  props.yStrokes.observe(strokesObserver);
  onCleanup(() => props.yStrokes.unobserve(strokesObserver));

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

      const color = createMemo(
        () =>
          USER_COLORS[
            props.awarenessMap[strokeSignal().get("clientId")]?.userColor ??
              "Black"
          ]
      );

      createEffect(() => {
        const points = pointsSignal();
        if (!points) return;

        const start = points.get(0);
        const pointsOnMap = points.map<[number, number]>((coord) => [
          coord[0] - start[0] + canvasRadius,
          coord[1] - start[1] + canvasRadius,
        ]);

        // const svgPath = getSvgPathFromStroke(pointsOnMap);

        ctx?.clearRect(0, 0, canvas.width, canvas.height);
        rc.linearPath(pointsOnMap, {
          stroke: color(),
          seed: stroke.get("seed"),
        });
      });
    }

    const canvasRadius = 700;
    const disposeSolid = render(
      () => (
        <canvas
          class="cursor-none"
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
      ? drawDiv?.addEventListener("mousemove", addPointToPath)
      : drawDiv?.removeEventListener("mousemove", addPointToPath)
  );

  window.addEventListener("mouseup", finishDrawing);
  window.addEventListener("blur", finishDrawing);
  onCleanup(() => {
    window.removeEventListener("mouseup", finishDrawing);
    window.removeEventListener("blur", finishDrawing);
  });

  function isSelected(tool: MultiplayerLeafletAwareness["tool"]) {
    return props.awarenessMap[props.awareness.clientID]?.tool === tool;
  }

  const controlDiv = (<div />) as HTMLElement;
  const disposeSolidControl = render(
    () => (
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
        <div class="bg-white border-2 rounded border-neutral-400 text-black text-center px-1">
          Press space to switch
        </div>
      </div>
    ),
    controlDiv
  );

  class DrawControl extends L.Control {
    onAdd(): HTMLElement {
      return controlDiv;
    }
  }

  const control = new DrawControl({ position: "topleft" }).addTo(props.map);

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
    control.remove();
    disposeSolidControl();
    window.removeEventListener("keydown", toggleToolOnPressSpace);
  });

  function forwardMouseMoveToMap(e: MouseEvent) {
    // @ts-expect-error layerX/Y should exist:
    const containerPoint: [number, number] = [e.layerX, e.layerY];

    const leafletEvent: L.LeafletMouseEvent = {
      type: "mousemove",
      latlng: props.map.containerPointToLatLng(containerPoint),
      target: e.target,
      originalEvent: e,
      containerPoint: new L.Point(...containerPoint),
      layerPoint: props.map.containerPointToLayerPoint(containerPoint),

      popup: null,
      propagatedFrom: null,
      sourceTarget: null,
      layer: null,
    };

    props.map.fireEvent("mousemove", leafletEvent);
  }

  return (
    <>
      {props.awarenessMap[props.awareness.clientID]?.tool === "DRAW" && (
        <div
          class="absolute inset-0 z-[700] cursor-none"
          ref={drawDiv}
          onMouseDown={startDraw}
          onMouseMove={forwardMouseMoveToMap}
        />
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
