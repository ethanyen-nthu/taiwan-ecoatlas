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
    [
      "Are all layers current and nationwide?",
      "所有圖層都是即時且涵蓋全國嗎？",
      "Each source keeps its own period and coverage. River samples are collected monthly and published later. Land cover is a 2023 research classification with offshore gaps. Wildlife is a limited historical subset; park and tree inventories cover Taipei. A survey record does not prove a tree is still present.",
      "各來源保留自身年代與範圍。河川按月採樣後延後發布；土地覆蓋為 2023 研究分類，離島有缺口；野生動物是有限歷史子集；公園與樹木清冊僅涵蓋臺北市。調查紀錄不代表該樹目前仍存在。",
    ],
    [
      "How should I read counts and comparisons?",
      "如何理解筆數與比較？",
      "Counts show published records and reporting effort, not animal abundance or population exposure. County means describe the loaded stations or samples and their dates; they do not establish matched monitoring effort or a risk ranking. Missing values stay missing, and rainfall reports retain their daily accumulation meaning.",
      "筆數呈現公開紀錄與通報投入，不代表動物數量或人口暴露。縣市平均描述已載入測站或樣本及其日期，未保證監測投入一致，也非風險排名。缺值保持缺值；雨量保留當日累積意義。",
    ],
    [
      "Why are wildlife locations generalized?",
      "為何野生動物位置經過概化？",
      "Every public wildlife point is a 10 km grid-cell centre. Exact locations, observer details and individual occurrence links are withheld. County assignment uses the original private location before generalization, so a displayed centre may lie outside that county. Profiles retain only aggregate evidence and dataset attribution.",
      "每個公開野生動物點皆為 10 公里網格中心，不公開精確位置、觀察者與個別紀錄連結。縣市由概化前的私有原始位置判定，公開中心可能在該縣市外。簡介保留彙整依據與資料集出處。",
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
