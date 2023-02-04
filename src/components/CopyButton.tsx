import { clsx } from "clsx";
import { createSignal } from "solid-js";

export interface CopyButtonProps {
  textToCopy: () => string;
}

export function CopyButton({ textToCopy }: CopyButtonProps) {
  const [showCopiedMessage, setShowCopiedMessage] = createSignal(false);

  let timeout: NodeJS.Timeout;
  function copyText() {
    clearTimeout(timeout);
    navigator.clipboard.writeText(textToCopy());
    setShowCopiedMessage(true);
    timeout = setTimeout(() => setShowCopiedMessage(false), 2000);
  }

  return (
    <button
      class={clsx("btn w-[90px]", showCopiedMessage() && "btn-success")}
      onClick={copyText}
    >
      {showCopiedMessage() ? "Copied!" : "Copy"}
    </button>
  );
}
