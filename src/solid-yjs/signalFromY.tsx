import { from } from "solid-js";
import { reconcile } from "solid-js/store";
import * as Y from "yjs";

/** Create a solidjs signal from a Yjs Type */
export function signalFromY<T extends Y.AbstractType<any>>(y: T) {
  return from<ReturnType<T["toJSON"]>>((set) => {
    set(y.toJSON());
    function observer(a: Y.YEvent<Y.AbstractType<T>>) {
      set(reconcile(a.target.toJSON()));
    }
    y.observe(observer);
    return () => y.unobserve(observer);
  });
}
