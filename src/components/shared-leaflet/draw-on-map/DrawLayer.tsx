import * as L from "leaflet";
import { from, onCleanup } from "solid-js";
import { Awareness } from "y-protocols/awareness";
import * as Y from "yjs";
import { AwarenessMapSignal } from "~/solid-yjs/signalFromAwareness";
import { MultiplayerLeafletAwareness } from "../live-cursors/MultiplayerLeafletAwareness";
import { addStrokeToMap } from "./addStrokeToMap";
import { addDrawButtonsControlToMap } from "./DrawButtonsControl";
import { setupDrawingWithMouse } from "./setupDrawingWithMouse";

export interface DrawLayerProps {
  map: L.Map;
  yStrokes: Y.Array<Y.Map<any>>;
  awareness: Awareness;
  awarenessMap: AwarenessMapSignal<MultiplayerLeafletAwareness>;
}

export function DrawLayer(props: DrawLayerProps) {
  let drawDiv: HTMLDivElement | undefined = undefined;

  const { startDrawing } = setupDrawingWithMouse({
    awareness: props.awareness,
    drawDiv: () => drawDiv,
    yStrokes: props.yStrokes,
  });

  const zoom = from<number>((set) => {
    const updateZoom = () => set(props.map.getZoom());
    updateZoom();
    props.map.on("zoom", updateZoom);
    return () => props.map.removeEventListener("zoom", updateZoom);
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
            zoom: () => zoom() ?? 0,
          });
          cleanupFns.push(cleanup);
        }
      }
    }
  }
  props.yStrokes.observe(strokesObserver);
  onCleanup(() => {
    props.yStrokes.unobserve(strokesObserver);
    cleanupFns.forEach((fn) => fn());
  });

  addDrawButtonsControlToMap(props.map, {
    awareness: props.awareness,
    awarenessMap: props.awarenessMap,
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
      {props.awarenessMap[props.awareness.clientID]?.tool === "DRAW" && (
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
