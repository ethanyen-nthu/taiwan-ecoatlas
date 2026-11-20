import photoRows from "../../public/data/atlas/photos.index.json";
import type { WikiPhoto } from "./wikimedia";

/**
 * A fixed list of freely licensed Wikimedia Commons photos, one for each animal
 * and tree that has one: [file path, photographer, licence, width, height] of
 * the 250 px version. Having it in the page means a picture can appear at once
 * (and in lists) instead of waiting for several live lookups; the full
 * Wikipedia summary and any further photos still load live.
 *
 * Keys are scientific names for animals and Chinese names for trees. Ten
 * crabs, skinks and trees have no free photo on Commons and are left out.
 */
type Row = [
  path: string,
  artist: string,
  license: string,
  w: number,
  h: number,
];
const index = photoRows as unknown as Record<string, Row>;

/** Sizes Wikimedia serves for any file; other sizes are refused. */
export type PhotoWidth = 250 | 500 | 960;

const creative = /^CC (BY(?:-SA)?) (\d\.\d)$/;
/** Link to the licence text, when the licence has a standard page. */
export function licenseLink(license: string): string | null {
  const match = creative.exec(license);
  if (match)
    return `https://creativecommons.org/licenses/${match[1].toLowerCase()}/${match[2]}/`;
  if (license === "CC0")
    return "https://creativecommons.org/publicdomain/zero/1.0/";
  return null;
}

export function hasIndexedPhoto(key: string | null | undefined): boolean {
  return !!key && Object.hasOwn(index, key);
}

/** The photo for an animal (scientific name) or tree (Chinese name), at one of
 *  the standard widths, with its credit and licence. */
export function indexedPhoto(
  key: string | null | undefined,
  width: PhotoWidth = 960,
): WikiPhoto | null {
  if (!key || !Object.hasOwn(index, key)) return null;
  const [path, artist, license, w, h] = index[key];
  const file = path.slice(path.lastIndexOf("/") + 1);
  return {
    src: `https://upload.wikimedia.org/wikipedia/commons/thumb/${path}/${width}px-${file}`,
    width,
    height: Math.round((h * width) / w),
    page: `https://commons.wikimedia.org/wiki/File:${file}`,
    artist,
    license,
    licenseUrl: licenseLink(license),
    name: decodeURIComponent(file)
      .replace(/\.[a-z0-9]+$/i, "")
      .replace(/_/g, " "),
  };
}

/** The same picture at a smaller size, for strips of thumbnails. */
export function smallerPhoto(src: string, width: PhotoWidth = 250): string {
  return src.replace(/\/\d{3,4}px-/, `/${width}px-`);
}

/** Two names for one file differ in spaces, case and punctuation. */
export const samePhoto = (a: string, b: string) =>
  a.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "") ===
  b.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
