import * as L from "leaflet";
import { onCleanup, onMount } from "solid-js";
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

  const renderedStrokes = new Set<string>();

  // Listen for new strokes to be drawn, and add them to the map using Leaflet Markers:
  // TODO maybe find a faster way to react to array changes than just looping through the whole array
  onMount(() => {
    for (const stroke of store.strokes.map((it) => it)) {
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
