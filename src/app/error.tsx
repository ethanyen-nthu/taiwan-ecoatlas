"use client";
import { useLanguage } from "@/components/providers";
import { useOnline } from "@/components/pwa/use-online";

export default function ErrorPage({ reset }: { reset: () => void }) {
  const { t } = useLanguage();
  // With no connection the likely cause is a file this device never saved, not
  // a data source being down, and the page should say which.
  const online = useOnline();
  return (
    <main id="main" className="document-page">
      <h1>{t("This view could not be loaded.", "無法載入此頁面。")}</h1>
      <p>
        {online
          ? t(
              "The data sources may be temporarily unavailable.",
              "資料來源可能暫時無法使用。",
            )
          : t(
              "There is no connection, and this page needs a file that is not saved on this device yet. Reconnect, then try again.",
              "目前沒有網路連線，而此頁面需要的檔案尚未儲存在這部裝置上。請連線後再重試。",
            )}
      </p>
      <button className="button" onClick={reset}>
        {t("Try again", "重試")}
      </button>
    </main>
  );
}
