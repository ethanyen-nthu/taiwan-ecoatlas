"use client";
import Link from "next/link";
import type { L } from "@/content/lesson-index";
import type { OutlineMapData } from "@/lib/outline-map";
import { useLanguage } from "../providers";

/** A small, quiet map drawn from simplified county outlines: no tiles, no
 *  script, nothing to load. Dots are public reference points, so they are
 *  drawn small and never as areas. */
export function OutlineMap({
  data,
  label,
  legend,
}: {
  data: OutlineMapData;
  label: L;
  legend: { kind: "self" | "same" | "other"; text: L }[];
}) {
  const { language } = useLanguage();
  const tl = (text: L) => (language === "en" ? text.en : text.zh);
  const r = data.radius;
  const order = { other: 0, same: 1, self: 2 } as const;
  const dots = [...data.dots].sort((a, b) => order[a.kind] - order[b.kind]);
  return (
    <figure className="cp-map">
      <svg
        viewBox={`0 0 ${data.width} ${data.height}`}
        role="group"
        aria-label={tl(label)}
        focusable="false"
      >
        {data.shapes.map((shape) => (
          <path
            key={shape.code}
            d={shape.d}
            className={shape.focus ? "cp-shape cp-shape-focus" : "cp-shape"}
          />
        ))}
        {dots.map((dot) => {
          const name = tl(dot.label);
          const mark = (
            <circle
              cx={dot.x}
              cy={dot.y}
              r={dot.kind === "self" ? r * 1.9 : r}
              className={`cp-dot cp-dot-${dot.kind}`}
            />
          );
          return dot.href ? (
            <Link
              key={dot.id}
              href={dot.href}
              aria-label={name}
              className="cp-dot-link"
            >
              <title>{name}</title>
              {mark}
            </Link>
          ) : (
            <g key={dot.id}>
              <title>{name}</title>
              {mark}
            </g>
          );
        })}
      </svg>
      <figcaption>
        <ul className="cp-legend">
          {legend.map((item) => (
            <li key={item.kind}>
              <i className={`cp-key cp-key-${item.kind}`} aria-hidden="true" />
              {tl(item.text)}
            </li>
          ))}
        </ul>
      </figcaption>
    </figure>
  );
}
