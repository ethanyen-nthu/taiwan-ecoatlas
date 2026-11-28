"use client";
import Link from "next/link";
import { wantedPage } from "@/lib/offline-copy";
import { useLanguage } from "../providers";
import "./pwa.css";

/** Shown by the service worker in place of a page this device has never
 *  opened while there is no connection. */
export function OfflineNotice() {
  const { t } = useLanguage();
  return (
    <main id="main" className="document-page">
      <div className="page-intro">
        <div>
          <h1>
            {t(
              "This page is not saved on this device.",
              "此頁面尚未儲存在這部裝置上。",
            )}
          </h1>
          <p>
            {t(
              "There is no connection right now, and you have not opened this page here before. Pages you have opened still open without a connection. The live readings on them show the last copy saved on this device, marked with the time it was saved, and are not live.",
              "目前沒有網路連線，而且你還沒有在這部裝置上開過這個頁面。開過的頁面在沒有網路時仍能開啟，頁面上的即時讀數會顯示本機最後儲存的副本，並標明儲存時間，並非即時。",
            )}
          </p>
          <p className="offline-actions">
            <button
              className="button"
              type="button"
              onClick={() =>
                window.location.assign(wantedPage(window.location.search))
              }
            >
              {t("Try again", "重試")}
            </button>
            <Link className="text-link" href="/">
              {t("Go to the home page", "回到首頁")}
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
