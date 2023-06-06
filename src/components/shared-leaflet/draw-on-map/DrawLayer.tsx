import * as L from "leaflet";
import { createEffect, onCleanup, onMount } from "solid-js";
import { SharedLeafletState } from "../createSharedLeafletState";
import { addDrawButtonsControlToMap } from "./DrawButtonsControl";
import { addStrokeToMap } from "./addStrokeToMap";
import { setupDrawingWithMouse } from "./setupDrawingWithMouse";

export interface DrawLayerProps {
  map: L.Map;
  state: SharedLeafletState;
}

export function DrawLayer(props: DrawLayerProps) {
  const { store } = props.state;

  let drawDiv: HTMLDivElement | undefined = undefined;

  const { startDrawing } = setupDrawingWithMouse({
    drawDiv: () => drawDiv,
    map: props.map,
    state: props.state,
  });

  const cleanupFns: (() => void)[] = [];

  // Draw any strokes your peers drew before you connected:
  onMount(() => {
    for (const stroke of store.strokes ?? []) {
      const cleanup = addStrokeToMap({
        stroke,
        map: props.map,
      });
      cleanupFns.push(cleanup);
    }
  });

  // Listen for new strokes to be drawn, and add them to the map using Leaflet Markers:
  // TODO maybe find a faster way to react to array changes than just looping through the whole array
  const renderedStrokes = new Set<string>();
  createEffect(() => {
    for (const stroke of store.strokes ?? []) {
      if (renderedStrokes.has(stroke.id)) {
        continue;
      }

      renderedStrokes.add(stroke.id);

      const cleanup = addStrokeToMap({
        stroke,
        map: props.map,
      });
      cleanupFns.push(cleanup);
    }
  });

  onCleanup(() => cleanupFns.forEach((fn) => fn()));

  addDrawButtonsControlToMap(props.map, {
    state: props.state,
  });

  function forwardMouseMoveToMap(e: MouseEvent) {
    const containerPoint: [number, number] = [e.offsetX, e.offsetY];

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
          ref={(node) => (drawDiv = node)}
          onMouseDown={startDrawing}
          onMouseMove={forwardMouseMoveToMap}
        />
      )}
    </>
  );
}
