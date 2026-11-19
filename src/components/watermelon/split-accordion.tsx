"use client";

// Adapted from Watermelon UI Card Split Accordian (MIT), with native controls.
// Demo icons, prose, measurement and Motion dependencies are intentionally removed.
import { useId, useState, type ReactNode } from "react";
import { Plus, Minus } from "lucide-react";

export interface AtlasAccordionItem {
  id: string;
  title: string;
  subtitle: string;
  icon: ReactNode;
  content: ReactNode;
  status?: ReactNode;
}
export function SplitAccordion({ items }: { items: AtlasAccordionItem[] }) {
  const [openId, setOpenId] = useState<string | null>(items[0]?.id || null);
  const id = useId();
  return (
    <div className="wm-split-accordion">
      {items.map((item, index) => {
        const open = openId === item.id;
        return (
          <article
            className={`wm-split-item ${open ? "is-open" : ""}`}
            data-tone={item.id}
            key={item.id}
          >
            <h3>
              <button
                type="button"
                aria-expanded={open}
                aria-controls={`${id}-${item.id}`}
                onClick={() => setOpenId(open ? null : item.id)}
              >
                <span className="wm-item-number">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="wm-item-icon" aria-hidden="true">
                  {item.icon}
                </span>
                <span className="wm-item-heading">
                  <span>{item.title}</span>
                  <small>{item.subtitle}</small>
                </span>
                <span className="wm-accordion-toggle" aria-hidden="true">
                  {open ? <Minus size={18} /> : <Plus size={18} />}
                </span>
              </button>
            </h3>
            <div
              id={`${id}-${item.id}`}
              className="wm-split-content"
              hidden={!open}
            >
              {item.status && (
                <div className="wm-item-status">{item.status}</div>
              )}
              {item.content}
            </div>
          </article>
        );
      })}
    </div>
  );
}
