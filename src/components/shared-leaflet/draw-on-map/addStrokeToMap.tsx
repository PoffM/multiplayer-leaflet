import * as L from "leaflet";
import getStroke from "perfect-freehand";
import { Accessor, createMemo } from "solid-js";
import { render } from "solid-js/web";
import * as Y from "yjs";
import { signalFromY } from "~/solid-yjs/signalFromY";
import { USER_COLORS } from "../../ColorPicker";
import { getSvgPathFromStroke } from "./svg-utils";

export interface AddStrokeToMapParams {
  stroke: Y.Map<unknown>;
  map: L.Map;
}

/**
 * Mounts a stroke to the map as an SVG overlay.
 * The stroke is automatically redrawn as more points are added to it.
 */
export function addStrokeToMap({ stroke, map }: AddStrokeToMapParams) {
  const strokeSignal = signalFromY(stroke);

  // @ts-expect-error Assume the right type here:
  const pointsSignal = signalFromY(stroke.get("points")) as Accessor<
    Y.Array<[number, number]>
  >;
  const color = createMemo(
    () =>
      USER_COLORS[
        (strokeSignal().get("color") ?? "Black") as keyof typeof USER_COLORS
      ]
  );

  // Re-draw the stroke when new points are added:
  const outlineSvgPath = createMemo(() => {
    const points = pointsSignal();
    if (!points) return;

    const outlinePoints = getStroke(points.toArray(), { size: 8 }) as [
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

  const bounds = strokeSignal().get("bounds") as [
    L.LatLngExpression,
    L.LatLngExpression
  ];

  const svgOverlay = L.svgOverlay(
    svgElement,
    new L.LatLngBounds(...bounds)
  ).addTo(map);

  return function cleanup() {
    disposeSolid();
    svgOverlay.remove();
  };
}
