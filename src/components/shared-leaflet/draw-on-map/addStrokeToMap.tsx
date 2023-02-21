import * as L from "leaflet";
import getStroke from "perfect-freehand";
import { createEffect, createMemo } from "solid-js";
import { render } from "solid-js/web";
import * as Y from "yjs";
import { signalFromY } from "~/solid-yjs/signalFromY";
import { USER_COLORS } from "../../ColorPicker";
import { getSvgPathFromStroke } from "./svg-utils";

export interface AddStrokeToMapParams {
  stroke: Y.Map<any>;
  map: L.Map;
  zoom: () => number;
}

/**
 * Mounts a stroke to the map as a canvas.
 * The stroke is automatically redrawn as more points are added to it.
 */
export function addStrokeToMap({ stroke, map, zoom }: AddStrokeToMapParams) {
  const iconRoot = (<div />) as HTMLElement;
  const marker = L.marker([0, 0], {
    icon: L.divIcon({
      html: iconRoot,
      iconSize: [0, 0],
    }),
  }).addTo(map);

  const disposeSolid = render(() => {
    const strokeSignal = signalFromY(stroke);

    const pointsSignal = signalFromY<Y.Array<[number, number]>>(
      stroke.get("points")
    );

    const startPoint = createMemo(() => pointsSignal().get(0));
    createEffect(() => {
      if (startPoint()) {
        marker.setLatLng(map.containerPointToLatLng(startPoint()));
      }
    });

    const color = createMemo(
      () =>
        USER_COLORS[
          (strokeSignal().get("color") ?? "Black") as keyof typeof USER_COLORS
        ]
    );

    const origZoom = zoom();

    const zoomDiff = () => zoom()! - origZoom;
    const zoomOffset = () => -50 * Math.pow(2, -zoomDiff()!);

    const canvasRadius = 700;
    const canvas = (
      <canvas
        class="cursor-none"
        width={canvasRadius * 2}
        height={canvasRadius * 2}
        style={{
          transform: `translate(${zoomOffset()}%, ${zoomOffset()}%)`,
          scale: Math.pow(2, zoomDiff()),
        }}
      />
    ) as HTMLCanvasElement;

    const ctx = canvas.getContext("2d");

    createEffect(() => {
      const points = pointsSignal();
      if (!points) return;

      const start = points.get(0);
      const pointsOnMap = points.map<[number, number]>((coord) => [
        coord[0] - start[0] + canvasRadius,
        coord[1] - start[1] + canvasRadius,
      ]);

      const outlinePoints = getStroke(pointsOnMap, { size: 8 }) as [
        number,
        number
      ][];

      const outlineSvgPath = getSvgPathFromStroke(outlinePoints);

      const path = new Path2D(outlineSvgPath);

      if (!ctx) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = color();
      ctx.fill(path);
    });

    return canvas;
  }, iconRoot);

  return function cleanup() {
    marker.remove();
    disposeSolid();
  };
}
