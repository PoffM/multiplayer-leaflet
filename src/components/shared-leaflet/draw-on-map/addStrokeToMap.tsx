import * as L from "leaflet";
import getStroke from "perfect-freehand";
import { createMemo } from "solid-js";
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
  const outlineSvgPath = createMemo(() => {
    if (!stroke.points) return;

    const outlinePoints = getStroke(stroke.points, { size: 8 }) as [
      number,
      number
    ][];

    return getSvgPathFromStroke(outlinePoints);
  });

  const { x: mapWidth, y: mapHeight } = map.getSize();

  const svgElement = (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`0 0 ${mapWidth} ${mapHeight}`}
    />
  ) as SVGElement;

  const disposeSolid = render(
    () => <path fill={color()} d={outlineSvgPath()} />,
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
