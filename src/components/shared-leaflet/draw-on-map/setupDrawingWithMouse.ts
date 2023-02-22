import * as L from "leaflet";
import { createEffect, onCleanup } from "solid-js";
import { createMutable } from "solid-js/store";
import { Awareness } from "y-protocols/awareness";
import * as Y from "yjs";

export interface DrawWithMouseParams {
  yStrokes: Y.Array<Y.Map<any>>;
  yState: Y.Map<any>;
  awareness: Awareness;
  drawDiv: () => HTMLDivElement | undefined;
  map: L.Map;
}

export function setupDrawingWithMouse(params: DrawWithMouseParams) {
  const store = createMutable({
    drawing: false,
  });

  let currentStroke: Y.Map<any> | null = null;

  function startDrawing(e: MouseEvent) {
    store.drawing = true;

    // @ts-expect-error layerX/Y should exist:
    const containerStartPoint = [e.layerX, e.layerY] as [number, number];

    currentStroke = new Y.Map();
    currentStroke.set("bounds", [
      params.map.getBounds().getSouthWest(),
      params.map.getBounds().getNorthEast(),
    ]);
    currentStroke.set("color", params.awareness.getLocalState()?.userColor);
    currentStroke.set("seed", Math.random() * 1000);

    const points = new Y.Array<[number, number]>();
    points.push([containerStartPoint]);
    currentStroke.set("points", new Y.Array<[number, number]>());

    params.yStrokes.push([currentStroke]);
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

  createEffect(() =>
    store.drawing
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
