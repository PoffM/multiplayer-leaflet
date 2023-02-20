import * as L from "leaflet";
import rough from "roughjs";
import { createEffect, createMemo } from "solid-js";
import { render } from "solid-js/web";
import * as Y from "yjs";
import { AwarenessMapSignal } from "~/solid-yjs/signalFromAwareness";
import { signalFromY } from "~/solid-yjs/signalFromY";
import { USER_COLORS } from "../../ColorPicker";
import { MultiplayerLeafletAwareness } from "../live-cursors/MultiplayerLeafletAwareness";

export interface AddStrokeToMapParams {
  stroke: Y.Map<any>;
  map: L.Map;
  awarenessMap: AwarenessMapSignal<MultiplayerLeafletAwareness>;
  zoom: () => number;
}

/**
 * Mounts a stroke to the map as a canvas.
 * The stroke is automatically redrawn as more points are added to it.
 */
export function addStrokeToMap({
  stroke,
  map,
  awarenessMap,
  zoom,
}: AddStrokeToMapParams) {
  const iconRoot = (<div />) as HTMLElement;

  const strokeSignal = signalFromY(stroke);

  const pointsSignal = signalFromY<Y.Array<[number, number]>>(
    stroke.get("points")
  );

  const startPoint = createMemo(() => pointsSignal().get(0));

  const marker = createMemo(() =>
    startPoint()
      ? L.marker(map.containerPointToLatLng(startPoint()), {
          icon: L.divIcon({
            html: iconRoot,
            iconSize: [0, 0],
          }),
        }).addTo(map)
      : undefined
  );
  marker();

  const origZoom = zoom();

  const zoomDiff = () => zoom()! - origZoom;
  const zoomOffset = () => -50 * Math.pow(2, -zoomDiff()!);

  function setupCanvas(canvas: HTMLCanvasElement) {
    const rc = rough.canvas(canvas);
    const ctx = canvas.getContext("2d");

    const color = createMemo(
      () =>
        USER_COLORS[
          awarenessMap[strokeSignal().get("clientId")]?.userColor ?? "Black"
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

  return cleanup;
}
