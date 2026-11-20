"use client";
import {
  type CSSProperties,
  type ElementType,
  type ReactNode,
  useEffect,
  useRef,
} from "react";
import "./reveal.css";

/**
 * Content is visible in the server HTML. After hydration, anything still below
 * the fold is hidden and eased in when it scrolls into view. Nothing hides if
 * scripting fails or the person prefers reduced motion.
 */
export function Reveal({
  as: Tag = "div",
  delay = 0,
  className,
  id,
  children,
}: {
  as?: ElementType;
  delay?: number;
  className?: string;
  id?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (
      typeof IntersectionObserver === "undefined" ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    )
      return;
    if (node.getBoundingClientRect().top < window.innerHeight * 0.9) return;
    node.dataset.reveal = "pending";
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          node.dataset.reveal = "done";
          observer.disconnect();
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.05 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  return (
    <Tag
      ref={ref}
      id={id}
      className={className}
      style={{ "--reveal-delay": `${delay}ms` } as CSSProperties}
    >
      {children}
    </Tag>
  );
}
