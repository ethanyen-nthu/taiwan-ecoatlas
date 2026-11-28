import { countyByCode } from "./county-list";

/** The county a visitor has pinned as theirs. It lives only in this browser's
 *  storage: nothing about it is sent anywhere, and clearing site data clears
 *  it. */
export const pinnedKey = "ecoatlas-county";
export const pinnedEvent = "ecoatlas-county-change";

/** A stored value is used only if it is one of the 22 official codes. */
export function parsePinned(raw: string | null | undefined): string | null {
  return countyByCode(raw)?.code ?? null;
}
