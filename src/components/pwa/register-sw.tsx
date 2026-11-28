"use client";
import { useEffect } from "react";

/** Registers the service worker (public/sw.js) once the page has loaded, so
 *  it never competes with the page for the network. Only in a production
 *  build: during development a worker would serve stale files. */
export function RegisterServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;
    const register = () => {
      navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
        /* Not available here (private window, blocked): the site works as before. */
      });
    };
    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, { once: true });
    return () => window.removeEventListener("load", register);
  }, []);
  return null;
}
