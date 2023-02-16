import { from } from "solid-js";
import * as Y from "yjs";

/** Create a solidjs signal from a Yjs Type */
export function signalFromY<T extends Y.AbstractType<any>>(y: T) {
  return from<T>((set) => {
    set(() => y);
    function observer() {
      set(() => y);
    }
    y.observe(observer);
    return () => y.unobserve(observer);
  });
}
