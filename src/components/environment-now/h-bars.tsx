import type { CSSProperties } from "react";

export interface HBarRow {
  key: string;
  label: string;
  sub?: string;
  /** null draws a labelled gap, never a bar of zero length that reads as zero. */
  value: number | null;
  /** The number as printed beside the bar. */
  text: string;
  /** A short caution printed under the number, e.g. "above 100%". */
  flag?: string;
}

/**
 * Horizontal bars with the number written beside each one. The bars start at
 * zero and share one scale; a bar that would pass the end of the track is
 * drawn full and marked, never cut short without saying so. The list is plain
 * text, so nothing depends on colour or hovering.
 */
export function HBars({
  label,
  rows,
  max,
  empty,
}: {
  label: string;
  rows: HBarRow[];
  max: number;
  empty: string;
}) {
  return (
    <ol className="hb" aria-label={label}>
      {rows.map((row) => (
        <li
          key={row.key}
          className="hb-row"
          data-over={row.flag ? "true" : undefined}
        >
          <span className="hb-name">
            {row.label}
            {row.sub && <small>{row.sub}</small>}
          </span>
          <span className="hb-track" aria-hidden="true">
            <span
              className="hb-fill"
              style={
                {
                  "--v":
                    row.value === null
                      ? 0
                      : Math.max(0, Math.min(1, row.value / max)),
                } as CSSProperties
              }
            />
          </span>
          <span className="hb-val">
            {row.value === null ? (
              <>
                <span aria-hidden="true">—</span>
                <span className="tp-sr">{empty}</span>
              </>
            ) : (
              row.text
            )}
            {row.flag && <small>{row.flag}</small>}
          </span>
        </li>
      ))}
    </ol>
  );
}
