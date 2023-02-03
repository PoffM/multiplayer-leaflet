import "leaflet/dist/leaflet.css";
import { createEffect, from, onMount } from "solid-js";
import { reconcile } from "solid-js/store";
import { WebrtcProvider } from "y-webrtc";
import * as Y from "yjs";
import { isEqual } from "lodash";

/** Create a solidjs signal from a yjs type */
function signalFromY<T extends Y.AbstractType<any>>(y: T) {
  return from<ReturnType<T["toJSON"]>>((set) => {
    set(y.toJSON());
    function observer(a: Y.YEvent<Y.AbstractType<T>>) {
      set(reconcile(a.target.toJSON()));
    }
    y.observe(observer);
    return () => y.unobserve(observer);
  });
}

export function MultiplayerLeaflet() {
  let div: HTMLDivElement | undefined = undefined;

  const ydoc = new Y.Doc();

  const yState = ydoc.getMap("leafletState");
  const stateSignal = signalFromY(yState);

  onMount(async () => {
    if (!div) {
      return;
    }

    // Setup the Leaflet map:
    const L = await import("leaflet");
    const map = L.map(div).setView([51.505, -0.09], 13);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);

    // clients connected to the same room-name share document updates
    const provider = new WebrtcProvider("your-room-name", ydoc, {
      password: "password",
    });

    // Propagate Map UI events to Y state updates:
    const updateMapView = () => {
      const zoom = map.getZoom();
      const center = [map.getCenter().lat, map.getCenter().lng];

      const newPosition = { zoom, center };

      if (!isEqual(newPosition, yState.get("position"))) {
        yState.set("position", newPosition);
      }
    };
    map.on("moveend", updateMapView);
    updateMapView();

    // Propagate Y state updates to Map UI state:
    createEffect(() => {
      const newPosition = stateSignal()?.position;
      map.setView(newPosition.center, newPosition.zoom);
    });
  });

  return <div class="w-full h-full" ref={div} />;
}
