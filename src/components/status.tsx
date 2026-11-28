"use client";
import { useLanguage } from "./providers";
import type { Freshness } from "@/lib/types";
export function Status({
  status,
  loading = false,
  saved = false,
}: {
  status?: Freshness;
  loading?: boolean;
  /** The reading is the copy saved on this device, not a live answer. */
  saved?: boolean;
}) {
  const { t } = useLanguage();
  const label = loading
    ? t("Checking", "檢查中")
    : saved && status === "stale"
      ? t("Saved copy", "離線副本")
      : {
          fresh: t("Fresh", "最新"),
          stale: t("Stale", "已過期"),
          unavailable: t("Unavailable", "無法取得"),
          "not-configured": t("Not configured", "尚未設定"),
          "historical-only": t("Historical only", "僅歷史資料"),
        }[status || "unavailable"];
  return (
    <span
      className={`status status-${loading ? "loading" : status || "unavailable"}`}
    >
      <span />
      {label}
    </span>
  );
}
export function useFormatTime() {
  const { language, t } = useLanguage();
  return (time: string | null | undefined) =>
    time
      ? new Intl.DateTimeFormat(language === "en" ? "en-GB" : "zh-TW", {
          timeZone: "Asia/Taipei",
          dateStyle: "medium",
          timeStyle: "short",
        }).format(new Date(time))
      : t("Not available", "無資料");
}
