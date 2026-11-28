"use client";
import { useEffect } from "react";

/** While a feed is showing the copy saved on this device, ask for a live one
 *  the moment the connection returns, without waiting for the next refresh. */
export function useRefreshWhenOnline(saved: unknown, refresh: () => void) {
  useEffect(() => {
    if (!saved) return;
    window.addEventListener("online", refresh);
    return () => window.removeEventListener("online", refresh);
  }, [saved, refresh]);
}
