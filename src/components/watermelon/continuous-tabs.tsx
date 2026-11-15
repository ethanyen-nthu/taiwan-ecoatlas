"use client";

// Adapted from Watermelon UI Continuous Tabs (MIT). See THIRD_PARTY_NOTICES.md.
// Controlled state, keyboard semantics and native CSS replace demo state/Motion.
import { useRef, type CSSProperties, type ReactNode } from "react";

export function ContinuousTabs<T extends string>({
  id,
  label,
  items,
  value,
  onChange,
}: {
  id: string;
  label: string;
  items: { value: T; label: ReactNode }[];
  value: T;
  onChange: (value: T) => void;
}) {
  const root = useRef<HTMLDivElement>(null);
  const activeIndex = Math.max(
    0,
    items.findIndex((item) => item.value === value),
  );
  return (
    <div
      ref={root}
      className="wm-tabs"
      role="tablist"
      aria-label={label}
      style={
        {
          "--tab-count": items.length,
          "--active-index": activeIndex,
        } as CSSProperties
      }
    >
      <span className="wm-tabs-indicator" aria-hidden="true" />
      {items.map((item, index) => (
        <button
          key={item.value}
          type="button"
          role="tab"
          id={`${id}-${item.value}-tab`}
          aria-controls={`${id}-${item.value}-panel`}
          aria-selected={value === item.value}
          tabIndex={value === item.value ? 0 : -1}
          onClick={() => onChange(item.value)}
          onKeyDown={(event) => {
            let next = index;
            if (event.key === "ArrowRight") next = (index + 1) % items.length;
            else if (event.key === "ArrowLeft")
              next = (index - 1 + items.length) % items.length;
            else if (event.key === "Home") next = 0;
            else if (event.key === "End") next = items.length - 1;
            else return;
            event.preventDefault();
            onChange(items[next].value);
            root.current
              ?.querySelectorAll<HTMLButtonElement>("[role=tab]")
              [next]?.focus();
          }}
        >
          <span className="wm-tab-label">{item.label}</span>
        </button>
      ))}
    </div>
  );
}
