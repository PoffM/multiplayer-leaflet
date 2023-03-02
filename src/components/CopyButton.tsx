import { clsx } from "clsx";
import { createSignal } from "solid-js";

export interface CopyButtonProps {
  textToCopy: string;
}

export function CopyButton(props: CopyButtonProps) {
  const [showCopiedMessage, setShowCopiedMessage] = createSignal(false);

  let timeout: NodeJS.Timeout;
  async function copyText() {
    clearTimeout(timeout);
    await navigator.clipboard.writeText(props.textToCopy);
    setShowCopiedMessage(true);
    timeout = setTimeout(() => setShowCopiedMessage(false), 2000);
  }

  return (
    <button
      class={clsx("btn w-[90px]", showCopiedMessage() && "btn-success")}
      onClick={() => void copyText()}
    >
      {showCopiedMessage() ? "Copied!" : "Copy"}
    </button>
  );
}
