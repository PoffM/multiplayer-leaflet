import * as L from "leaflet";
import rough from "roughjs";
import { createEffect, createMemo, from, onCleanup } from "solid-js";
import { createMutable } from "solid-js/store";
import { render } from "solid-js/web";
import { Awareness } from "y-protocols/awareness";
import * as Y from "yjs";
import { AwarenessMapSignal } from "~/solid-yjs/signalFromAwareness";
import { signalFromY } from "~/solid-yjs/signalFromY";
import { USER_COLORS } from "../../ColorPicker";
import { MultiplayerLeafletAwareness } from "../live-cursors/MultiplayerLeafletAwareness";
import { addDrawButtonsControlToMap } from "./DrawButtonsControl";

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
  
  addDrawButtonsControlToMap(props.map, {
    awareness: props.awareness,
    awarenessMap: props.awarenessMap
  })

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
