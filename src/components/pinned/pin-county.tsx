"use client";
import { Check, MapPin } from "lucide-react";
import { useLanguage } from "../providers";
import { usePinnedCounty } from "./use-pinned";
import "./pin-county.css";

/** One button to make a county "mine". The label stays the same and the
 *  button's pressed state carries the change, as a toggle should. */
export function PinCountyButton({ code }: { code: string }) {
  const { t } = useLanguage();
  const { code: pinned, pin } = usePinnedCounty();
  const mine = pinned === code;
  return (
    <div className="pin-county">
      <button
        type="button"
        aria-pressed={mine}
        onClick={() => pin(mine ? null : code)}
      >
        {mine ? (
          <Check size={16} aria-hidden="true" />
        ) : (
          <MapPin size={16} aria-hidden="true" />
        )}
        {t("My county", "我的縣市")}
      </button>
      <p role="status">
        {mine
          ? t(
              "Pinned. It now leads the Today strip and the weather page, and opens first on the home page. Saved on this device only.",
              "已設定。今日列與天氣頁會先顯示這個縣市，首頁也會先開啟它。僅儲存在這台裝置。",
            )
          : t(
              "Pin it to see its readings first, on this device only.",
              "設定後會優先顯示這個縣市的讀數，僅儲存在這台裝置。",
            )}
      </p>
    </div>
  );
}
