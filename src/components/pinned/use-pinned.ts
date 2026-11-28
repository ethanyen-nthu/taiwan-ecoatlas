"use client";
import { useCallback, useSyncExternalStore } from "react";
import { parsePinned, pinnedEvent, pinnedKey } from "@/lib/pinned-county";

/** Kept in memory too, for a browser that refuses storage: the pin then lasts
 *  until the page is closed instead of silently doing nothing. */
let memory: string | null = null;

function read(): string | null {
  try {
    return parsePinned(localStorage.getItem(pinnedKey));
  } catch {
    return memory;
  }
}
function subscribe(callback: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key === null || event.key === pinnedKey) callback();
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(pinnedEvent, callback);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(pinnedEvent, callback);
  };
}

/** The pinned county's code, or null. Always null on the server and on the
 *  first client render, so the page and its markup agree; the pin appears a
 *  moment later. Pinning in one tab updates the others. */
export function usePinnedCounty() {
  const code = useSyncExternalStore(subscribe, read, () => null);
  const pin = useCallback((next: string | null) => {
    memory = parsePinned(next);
    try {
      if (memory) localStorage.setItem(pinnedKey, memory);
      else localStorage.removeItem(pinnedKey);
    } catch {
      /* Storage is off: the in-memory pin above still works. */
    }
    window.dispatchEvent(new Event(pinnedEvent));
  }, []);
  return { code, pin };
}
