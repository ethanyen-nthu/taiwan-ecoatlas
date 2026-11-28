/**
 * Pure helpers for the year-by-year county maps. A value that is missing stays
 * null: it is drawn as "no data" and never averaged in as zero.
 */
import { classOf, type MapScale } from "./county-shapes";

/** The mean of the values for the years from..to, or null if the years are not
 *  all there or any of them has no value. */
export function periodMean(
  years: number[],
  values: (number | null)[],
  from: number,
  to: number,
): number | null {
  let sum = 0;
  let count = 0;
  for (let year = from; year <= to; year += 1) {
    const index = years.indexOf(year);
    const value = index === -1 ? null : values[index];
    if (value === null || value === undefined) return null;
    sum += value;
    count += 1;
  }
  return count === 0 ? null : sum / count;
}

/** The first and last colour classes any value in the set falls in, so a
 *  legend can leave out the classes nothing reaches. Null if there are no
 *  values at all. */
export function usedClassRange(
  rows: Iterable<(number | null)[]>,
  scale: MapScale,
): [number, number] | null {
  let low = Infinity;
  let high = -Infinity;
  for (const row of rows) {
    for (const value of row) {
      if (value === null || !Number.isFinite(value)) continue;
      const index = classOf(value, scale);
      if (index < low) low = index;
      if (index > high) high = index;
    }
  }
  return low === Infinity ? null : [low, high];
}

/** Runs of years that start on multiples of `size` (the 1950s, the 1960s...),
 *  cut to the years there are: a record that starts in 1951 gives 1951–1959
 *  first, and one that ends in 2025 gives 2020–2025 last. */
export function yearRuns(
  first: number,
  last: number,
  size: number,
): { from: number; to: number }[] {
  const runs: { from: number; to: number }[] = [];
  for (
    let start = Math.floor(first / size) * size;
    start <= last;
    start += size
  ) {
    runs.push({
      from: Math.max(start, first),
      to: Math.min(start + size - 1, last),
    });
  }
  return runs;
}
