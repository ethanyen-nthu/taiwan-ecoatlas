"use client";
import { useLanguage } from "@/components/providers";
export default function ErrorPage({ reset }: { reset: () => void }) {
  const { t } = useLanguage();
  return (
    <main id="main" className="document-page">
      <h1>{t("This view could not be loaded.", "無法載入此頁面。")}</h1>
      <p>
        {t(
          "The data sources may be temporarily unavailable.",
          "資料來源可能暫時無法使用。",
        )}
      </p>
      <button className="button" onClick={reset}>
        {t("Try again", "重試")}
      </button>
    </main>
  );
}
