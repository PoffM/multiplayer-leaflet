import * as L from "leaflet";
import { onCleanup } from "solid-js";
import * as Y from "yjs";
import { SharedLeafletState } from "../createSharedLeafletState";
import { addStrokeToMap } from "./addStrokeToMap";
import { addDrawButtonsControlToMap } from "./DrawButtonsControl";
import { setupDrawingWithMouse } from "./setupDrawingWithMouse";

export interface DrawLayerProps {
  map: L.Map;
  state: SharedLeafletState;
}

export function DrawLayer(props: DrawLayerProps) {
  let drawDiv: HTMLDivElement | undefined = undefined;

  const { startDrawing } = setupDrawingWithMouse({
    drawDiv: () => drawDiv,
    map: props.map,
    state: props.state,
  });

  // Listen for new strokes to be drawn, and add them to the map using Leaflet Markers:
  const cleanupFns = [] as (() => void)[];
  function strokesObserver(event: Y.YArrayEvent<Y.Map<any>>) {
    if (event.changes.added) {
      for (const item of event.changes.added) {
        for (const stroke of item.content.getContent() as Y.Map<any>[]) {
          const cleanup = addStrokeToMap({
            stroke,
            map: props.map,
          });
          cleanupFns.push(cleanup);
        }
      }
    }
  }
  const yStrokes = props.state.ydoc.getArray<any>("strokes");

  yStrokes.observe(strokesObserver);
  onCleanup(() => {
    yStrokes.unobserve(strokesObserver);
    cleanupFns.forEach((fn) => fn());
  });

  addDrawButtonsControlToMap(props.map, {
    state: props.state,
  });

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
      {props.state.myAwareness()?.tool === "DRAW" && (
        <div
          class="absolute inset-0 z-[700] cursor-none"
          ref={drawDiv}
          onMouseDown={startDrawing}
          onMouseMove={forwardMouseMoveToMap}
        />
      )}
    </>
  );
}
