"use client";
import { Component, type ReactNode } from "react";
import { isChunkError } from "@/lib/chunk-error";
import { useLanguage } from "../providers";
import { useOnline } from "./use-online";
import "./pwa.css";

/**
 * Wraps a part of a page that is loaded on demand (the map, the charts). If
 * its file cannot be fetched, which is what happens offline for code this
 * device never opened, that part says so and the rest of the page, including
 * the saved readings, carries on. Any other error is a bug and is passed up to
 * the page's own error screen as before.
 */
export class LazyBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { error: unknown }
> {
  state: { error: unknown } = { error: null };
  static getDerivedStateFromError(error: unknown) {
    return { error: error ?? new Error("unknown") };
  }
  render() {
    const { error } = this.state;
    if (error === null) return this.props.children;
    if (!isChunkError(error)) throw error;
    return this.props.fallback;
  }
}

/** The stand-in for a map or a block of charts that could not be loaded. */
export function MissingPiece({ kind }: { kind: "map" | "block" }) {
  const { t } = useLanguage();
  const online = useOnline();
  const body = (
    <>
      <p>
        {online
          ? t(
              "Part of this page could not be loaded. Check the connection and try again.",
              "此頁面有一部分無法載入，請檢查網路連線後再試。",
            )
          : t(
              "There is no connection, and this part needs a file that is not saved on this device yet.",
              "目前沒有網路連線，而這部分需要的檔案尚未儲存在這部裝置上。",
            )}
      </p>
      <button
        className="button secondary"
        type="button"
        onClick={() => window.location.reload()}
      >
        {t("Reload the page", "重新載入頁面")}
      </button>
    </>
  );
  return kind === "map" ? (
    <div className="map-loading" role="status" data-missing-piece>
      {body}
    </div>
  ) : (
    <div className="lazy-missing" role="status" data-missing-piece>
      {body}
    </div>
  );
}
