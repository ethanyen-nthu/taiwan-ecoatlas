/**
 * Turns the text of a table on the page into a CSV that opens correctly in
 * Excel (a byte-order mark, so Chinese names survive) and in Python or R.
 *
 * Gaps stay empty. A dash on the page means the source gave no number, and an
 * empty field says the same thing in a file; it is never written as 0.
 */

const gapMarks = new Set(["", "—", "–", "‒", "-"]);
const withThousands = /^-?\d{1,3}(,\d{3})+(\.\d+)?$/;

/** The text of one table cell as it should appear in the file. */
export function cleanCell(raw: string): string {
  const text = raw
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^−(?=\d|$)/, "-");
  if (gapMarks.has(text)) return "";
  // "1,667.1" is a number; a comma inside it would split or mislead a reader.
  return withThousands.test(text) ? text.replace(/,/g, "") : text;
}

/** Quotes a field only when it has to be quoted. */
export function csvField(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

/**
 * The file text: a header row, the rows, and (optionally) a blank line then
 * "name,value" lines saying where the numbers came from.
 */
export function toCsv(
  head: string[],
  rows: string[][],
  provenance: [string, string][] = [],
): string {
  const lines = [head, ...rows].map((row) => row.map(csvField).join(","));
  if (provenance.length > 0) {
    lines.push("");
    for (const [name, value] of provenance)
      lines.push(`${csvField(name)},${csvField(value)}`);
  }
  return `﻿${lines.join("\r\n")}\r\n`;
}

/** A file-name stem from a page path: "/environment/reservoirs" becomes
 *  "environment-reservoirs". */
export function pathSlug(pathname: string): string {
  const slug = pathname
    .replace(/^\/+|\/+$/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
  return slug || "home";
}
