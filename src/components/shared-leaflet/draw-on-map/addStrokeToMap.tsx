import * as L from "leaflet";
import getStroke from "perfect-freehand";
import { createEffect, createMemo, createSignal } from "solid-js";
import { render } from "solid-js/web";
import { USER_COLORS } from "../../ColorPicker";
import { StrokeData } from "../createSharedLeafletState";
import { getSvgPathFromStroke } from "./svg-utils";

export interface AddStrokeToMapParams {
  stroke: StrokeData;
  map: L.Map;
}

/**
 * Mounts a stroke to the map as an SVG overlay.
 * The stroke is automatically redrawn as more points are added to it.
 */
export function addStrokeToMap({ stroke, map }: AddStrokeToMapParams) {
  const color = createMemo(
    () => USER_COLORS[(stroke.color ?? "Black") as keyof typeof USER_COLORS]
  );

  // Re-draw the stroke when new points are added:
  const [svgPath, setSvgPath] = createSignal<string>("");
  // De-proxy the points and store them in a plain array, then calculate the SVG path:
  {
    const points: [number, number][] = [];
    createEffect(() => {
      if (!points.length) {
        // Initialize the points array when the stroke is first added to the map:
        for (const point of stroke.points ?? []) {
          points.push([point[0], point[1]]);
        }
      } else {
        // Otherwise just add the newest point:
        const newPoint = stroke.points?.at(-1);

        if (!newPoint) return;

        points.push([newPoint[0], newPoint[1]]);
      }

      const outlinePoints = getStroke(points, { size: 8 }) as [
        number,
        number
      ][];

      setSvgPath(getSvgPathFromStroke(outlinePoints));
    });
  }

  const { x: mapWidth, y: mapHeight } = map.getSize();

  const svgElement = (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`0 0 ${mapWidth} ${mapHeight}`}
    />
  ) as SVGElement;

  const disposeSolid = render(
    () => <path fill={color()} d={svgPath()} />,
    svgElement
  );

  const svgOverlay = L.svgOverlay(
    svgElement,
    new L.LatLngBounds(...stroke.bounds)
  ).addTo(map);

  return function cleanup() {
    disposeSolid();
    svgOverlay.remove();
  };
}
