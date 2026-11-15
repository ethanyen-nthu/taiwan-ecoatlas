"use client";

// Adapted from Watermelon UI FAQ 6 (MIT). Native details/summary preserve the
// numbered editorial composition without adding a second accordion dependency.
import { Plus } from "lucide-react";
import { useLanguage } from "../providers";

export function MethodologyFaq() {
  const { t } = useLanguage();
  const entries = [
    [
      "Are the observations live?",
      "觀測資料是即時的嗎？",
      "AQI and weather show the latest reports supplied by their agencies when credentials are configured. Each report retains its own timestamp. A recent retrieval does not make an old observation current.",
      "設定金鑰後，空品與氣象呈現機關提供的最新報告，每筆資料保留各自的時間。最近擷取到的舊觀測，不會被當作現在的觀測。",
    ],
    [
      "What happens when a source fails?",
      "資料來源失效時會怎樣？",
      "A previous valid result is retained and marked stale. Without a valid result, the layer says unavailable. Without provider credentials, it says not configured. Missing measurements are never filled in.",
      "先前的有效結果會保留並標示已過期；沒有有效結果時標示無法取得；沒有來源金鑰時標示尚未設定。不會填造缺少的測值。",
    ],
    [
      "Where do the county boundaries come from?",
      "縣市界線來自哪裡？",
      "The 22 official geometries come from NLSC dataset 7442. The original TWD97 coordinates are transformed to WGS84, with original vertices retained. Download the geometry and processing record from the Data page.",
      "22 個官方縣市幾何取自國土測繪中心 7442 資料集，由 TWD97 轉為 WGS84 並保留原始節點。可在開放資料頁下載幾何與處理紀錄。",
    ],
  ];
  return (
    <section className="wm-methodology">
      <div>
        <span className="eyebrow">
          {t("READING THE ATLAS", "如何閱讀這份地圖")}
        </span>
        <h2>
          {t(
            "A little context.\nA clearer picture.",
            "保留脈絡，\n看得更清楚。",
          )}
        </h2>
      </div>
      <div className="wm-faq-list">
        {entries.map(([question, zhQuestion, answer, zhAnswer], index) => (
          <details key={question} name="methodology">
            <summary>
              <span className="wm-item-number">0{index + 1}</span>
              <span>{t(question, zhQuestion)}</span>
              <Plus size={18} aria-hidden="true" />
            </summary>
            <p>{t(answer, zhAnswer)}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
