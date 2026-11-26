import type { CSSProperties } from "react";

export interface BarSeries {
  key: string;
  label: string;
  /** accent: the subject colour; soft: the earlier of two editions;
   *  hatched: a figure from a different method, never to be read as a trend. */
  tone: "accent" | "soft" | "ink" | "hatched";
}
export interface BarGroup {
  key: string;
  label: string;
  sub?: string;
  /** Overrides the series tone for every bar in this group. */
  tone?: BarSeries["tone"];
  /** One value per series; null draws a labelled gap, never a zero. */
  values: (number | null)[];
}

/**
 * Plain bars with the number written on each one, so nothing depends on
 * hovering or colour. The figure carries a spoken summary of every value,
 * and the page puts the same numbers in a table below.
 */
export function BarChart({
  label,
  series,
  groups,
  format = (value) => value.toLocaleString("en-US"),
  empty,
  max,
  tall = false,
  legend,
}: {
  label: string;
  series: BarSeries[];
  groups: BarGroup[];
  format?: (value: number) => string;
  empty: string;
  max?: number;
  tall?: boolean;
  /** Replaces the series legend, for charts whose colours mean something per group. */
  legend?: { tone: BarSeries["tone"]; label: string }[];
}) {
  const keys =
    legend ??
    (series.length > 1
      ? series.map(({ tone, label }) => ({ tone, label }))
      : []);
  const top =
    max ??
    Math.max(
      1,
      ...groups.flatMap((group) =>
        group.values.filter((value): value is number => value !== null),
      ),
    );
  const spoken = groups
    .map((group) => {
      const parts = group.values.map((value, index) => {
        const text = value === null ? empty : format(value);
        return series.length > 1 ? `${series[index].label} ${text}` : text;
      });
      return `${group.label}: ${parts.join(", ")}`;
    })
    .join("; ");
  return (
    <figure className="bars" data-tall={tall ? "true" : undefined}>
      {keys.length > 0 && (
        <ul className="bars-legend">
          {keys.map((item) => (
            <li key={item.label}>
              <span className="bars-swatch" data-tone={item.tone} />
              {item.label}
            </li>
          ))}
        </ul>
      )}
      <div role="img" aria-label={`${label}. ${spoken}`}>
        <ol className="bars-groups" aria-hidden="true">
          {groups.map((group) => (
            <li key={group.key} className="bars-group">
              <div className="bars-cols">
                {group.values.map((value, index) => (
                  <div
                    key={series[index].key}
                    className="bars-col"
                    data-empty={value === null ? "true" : undefined}
                  >
                    <span className="bars-val">
                      {value === null ? "—" : format(value)}
                    </span>
                    <span
                      className="bars-bar"
                      data-tone={group.tone ?? series[index].tone}
                      style={
                        {
                          "--v": value === null ? 0 : value / top,
                        } as CSSProperties
                      }
                    />
                  </div>
                ))}
              </div>
              <p className="bars-label">{group.label}</p>
              {group.sub && <p className="bars-sub">{group.sub}</p>}
            </li>
          ))}
        </ol>
      </div>
    </figure>
  );
}
