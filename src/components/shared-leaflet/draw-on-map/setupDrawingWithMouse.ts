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
  let currentStroke: Y.Map<any> | null = null;

  const isDrawing = createMemo(() => params.state.myAwareness()?.mousePressed);

  function startDrawing(e: MouseEvent) {
    params.state.provider.awareness.setLocalStateField("mousePressed", true);

    // @ts-expect-error layerX/Y should exist:
    const containerStartPoint = [e.layerX, e.layerY] as [number, number];

    currentStroke = new Y.Map();
    currentStroke.set("bounds", [
      params.map.getBounds().getSouthWest(),
      params.map.getBounds().getNorthEast(),
    ]);
    currentStroke.set("color", params.state.myAwareness()?.userColor);
    currentStroke.set("seed", Math.random() * 1000);

    const points = new Y.Array<[number, number]>();
    points.push([containerStartPoint]);
    currentStroke.set("points", new Y.Array<[number, number]>());

    params.state.ydoc.getArray("strokes").push([currentStroke]);
  }

  function addPointToPath(e: MouseEvent) {
    const points = currentStroke?.get("points");

    // @ts-expect-error layerX/Y should exist:
    points.push([[e.layerX, e.layerY]]);
  }

  function finishDrawing() {
    params.state.provider.awareness.setLocalStateField("mousePressed", false);
    currentStroke = null;
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
