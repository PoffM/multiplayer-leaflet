import * as L from "leaflet";
import { uniqueId } from "lodash";
import { createEffect, createMemo, onCleanup } from "solid-js";
import { SharedLeafletState, StrokeData } from "../createSharedLeafletState";

export interface DrawWithMouseParams {
  state: SharedLeafletState;
  drawDiv: () => HTMLDivElement | undefined;
  map: L.Map;
}

export function setupDrawingWithMouse(params: DrawWithMouseParams) {
  const { store } = params.state;

  let currentStroke: StrokeData | null = null;

  const isDrawing = createMemo(() => params.state.myAwareness()?.mousePressed);

  function startDrawing(e: MouseEvent) {
    params.state.setAwarenessField("mousePressed", true);

    const containerStartPoint: [number, number] = [e.offsetX, e.offsetY];

    store.strokes.push({
      bounds: [
        { ...params.map.getBounds().getSouthWest() },
        { ...params.map.getBounds().getNorthEast() },
      ],
      color: params.state.myAwareness()?.userColor,
      id: uniqueId(),
      points: [containerStartPoint],
    });

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    currentStroke = store.strokes.at(-1)!;
  }

  function addPointToPath(e: MouseEvent) {
    currentStroke?.points?.push([e.offsetX, e.offsetY]);
  }

  function finishDrawing() {
    params.state.setAwarenessField("mousePressed", false);
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
