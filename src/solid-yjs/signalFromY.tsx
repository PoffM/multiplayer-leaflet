import { Accessor, from } from "solid-js";
import * as Y from "yjs";

/** Create a solidjs signal from a Yjs Type */
export function signalFromY<T extends Y.Map<unknown> | Y.Array<unknown>>(y: T) {
  return from<T>((set) => {
    function observer() {
      set(() => y);
    }
    observer();
    y.observe(observer);
    return () => y.unobserve(observer);
  }) as Accessor<T>;
}
