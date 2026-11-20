"use client";
import { useEffect, useRef, useState } from "react";
import { Check, Copy } from "lucide-react";

/** Copies text, with a fallback for pages where the clipboard API is blocked. */
export async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const box = document.createElement("textarea");
    box.value = text;
    box.setAttribute("readonly", "");
    box.style.cssText = "position:fixed;opacity:0;pointer-events:none";
    document.body.appendChild(box);
    box.select();
    try {
      document.execCommand("copy");
    } catch {
      /* The text stays on screen to copy by hand. */
    }
    box.remove();
  }
}

export function CopyButton({
  text,
  label,
  done,
  className = "teach-copy",
}: {
  text: string;
  label: string;
  done: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | null>(null);
  useEffect(
    () => () => {
      if (timer.current) window.clearTimeout(timer.current);
    },
    [],
  );
  return (
    <button
      type="button"
      className={className}
      onClick={async () => {
        await copyText(text);
        setCopied(true);
        if (timer.current) window.clearTimeout(timer.current);
        timer.current = window.setTimeout(() => setCopied(false), 2400);
      }}
    >
      {copied ? <Check size={15} /> : <Copy size={15} />}
      {copied ? done : label}
    </button>
  );
}
