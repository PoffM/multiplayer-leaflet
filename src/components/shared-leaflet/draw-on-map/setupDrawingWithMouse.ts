import * as L from "leaflet";
import { createEffect, createMemo, onCleanup } from "solid-js";
import * as Y from "yjs";
import { SharedLeafletState } from "../createSharedLeafletState";

export interface DrawWithMouseParams {
  state: SharedLeafletState;
  drawDiv: () => HTMLDivElement | undefined;
  map: L.Map;
}

export function setupDrawingWithMouse(params: DrawWithMouseParams) {
  let currentPoints: Y.Array<[number, number]> | null = null;

  const isDrawing = createMemo(() => params.state.myAwareness()?.mousePressed);

  function startDrawing(e: MouseEvent) {
    params.state.setAwarenessField("mousePressed", true);

    const containerStartPoint: [number, number] = [e.offsetX, e.offsetY];

    const currentStroke = new Y.Map();
    currentStroke.set("bounds", [
      params.map.getBounds().getSouthWest(),
      params.map.getBounds().getNorthEast(),
    ]);
    currentStroke.set("color", params.state.myAwareness()?.userColor);
    currentStroke.set("seed", Math.random() * 1000);

    currentPoints = new Y.Array<[number, number]>();
    currentPoints.push([containerStartPoint]);
    currentStroke.set("points", currentPoints);

    params.state.ydoc.getArray("strokes").push([currentStroke]);
  }

  function addPointToPath(e: MouseEvent) {
    currentPoints?.push([[e.offsetX, e.offsetY]]);
  }

  function finishDrawing() {
    params.state.setAwarenessField("mousePressed", false);
    currentPoints = null;
  }

  createEffect(() =>
    isDrawing()
      ? params.drawDiv()?.addEventListener("mousemove", addPointToPath)
      : params.drawDiv()?.removeEventListener("mousemove", addPointToPath)
  );

  window.addEventListener("mouseup", finishDrawing);
  window.addEventListener("blur", finishDrawing);
  onCleanup(() => {
    window.removeEventListener("mouseup", finishDrawing);
    window.removeEventListener("blur", finishDrawing);
  });

  return { startDrawing };
}
