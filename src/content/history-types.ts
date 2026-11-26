import type { Language, Localized } from "@/lib/types";

/** A document that one of the "over time" pages took a number from. The page
 *  lists these at the bottom, and a test checks that every figure cites one. */
export interface HistorySource {
  id: string;
  title: Localized;
  publisher: string;
  url: string;
  used: Localized;
}

export function sourceLookup(sources: HistorySource[]) {
  return new Map(sources.map((source) => [source.id, source]));
}

/** Whole-percent change, rounded the way the pages print it. */
export function percentChange(from: number, to: number) {
  return Math.round(((to - from) / from) * 100);
}

/** The shape the shared page layout prints, in the reader's language. */
export function localiseSources(sources: HistorySource[], language: Language) {
  return sources.map((source) => ({
    id: source.id,
    title: source.title[language],
    publisher: source.publisher,
    url: source.url,
    used: source.used[language],
  }));
}
