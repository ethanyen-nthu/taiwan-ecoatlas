import type { CSSProperties } from "react";

export interface HeatRow {
  key: string;
  label: string;
  sub?: string;
  /** One value per column; null is a labelled gap, never a zero. */
  values: (number | null)[];
}

/**
 * A table of counts whose cells are tinted by size, with every number
 * printed in its cell. The tint helps the eye find the change; the numbers
 * carry the meaning, so nothing depends on colour.
 *
 * scale "row": each row is tinted against its own largest value, which shows
 * how that row changed across the columns. scale "table": one scale for all.
 */
export function HeatTable({
  caption,
  corner,
  columns,
  rows,
  scale = "row",
  totalLabel,
  empty,
}: {
  caption: string;
  corner: string;
  columns: string[];
  rows: HeatRow[];
  scale?: "row" | "table";
  /** When given, adds a final column with each row's sum, left untinted. */
  totalLabel?: string;
  empty: string;
}) {
  const numbers = (values: (number | null)[]) =>
    values.filter((value): value is number => value !== null);
  const tableMax = Math.max(1, ...rows.flatMap((row) => numbers(row.values)));
  return (
    <div className="heat-wrap" role="region" tabIndex={0} aria-label={caption}>
      <table className="heat">
        <caption>{caption}</caption>
        <thead>
          <tr>
            <th scope="col">{corner}</th>
            {columns.map((column) => (
              <th key={column} scope="col">
                {column}
              </th>
            ))}
            {totalLabel && <th scope="col">{totalLabel}</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const rowMax = Math.max(1, ...numbers(row.values));
            const top = scale === "row" ? rowMax : tableMax;
            return (
              <tr key={row.key}>
                <th scope="row">
                  {row.label}
                  {row.sub && <small>{row.sub}</small>}
                </th>
                {row.values.map((value, index) =>
                  value === null ? (
                    <td key={columns[index]} data-empty="true">
                      <span aria-hidden="true">—</span>
                      <span className="tp-sr">{empty}</span>
                    </td>
                  ) : (
                    <td
                      key={columns[index]}
                      style={{ "--h": value / top } as CSSProperties}
                    >
                      {value.toLocaleString("en-US")}
                    </td>
                  ),
                )}
                {totalLabel && (
                  <td data-total="true">
                    {numbers(row.values)
                      .reduce((sum, value) => sum + value, 0)
                      .toLocaleString("en-US")}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
