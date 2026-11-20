"use client";
import type { L } from "@/content/lesson-index";
import { useLanguage } from "../providers";

interface Facts {
  recognised: number | null;
  population: number;
  official?: boolean;
  where: L;
  villages?: number;
}

export function useFactText() {
  const { language, t } = useLanguage();
  const tl = (text: L) => (language === "en" ? text.en : text.zh);
  const locale = language === "zh" ? "zh-TW" : "en";
  return {
    recognition: (people: Pick<Facts, "recognised">) =>
      people.recognised
        ? t(`Recognised in ${people.recognised}`, `${people.recognised} 年正名`)
        : t("One of the original nine", "原本九族之一"),
    population: (people: Pick<Facts, "population" | "official">) =>
      people.official
        ? people.population.toLocaleString(locale)
        : t(
            `about ${people.population.toLocaleString(locale)}`,
            `約 ${people.population.toLocaleString(locale)}`,
          ),
    where: (people: Pick<Facts, "where">) => tl(people.where),
  };
}

/** Four short facts about a people, used wherever a people is introduced. */
export function PeopleFacts({ people }: { people: Facts }) {
  const { t } = useLanguage();
  const text = useFactText();
  return (
    <ul className="cp-chips">
      <li>
        <span>{t("Recognised", "正名")}</span>
        {people.recognised
          ? String(people.recognised)
          : t("Original nine", "原本九族")}
      </li>
      <li>
        <span>{t("Registered people", "登記人口")}</span>
        {text.population(people)}
      </li>
      <li>
        <span>{t("Mainly in", "主要分布")}</span>
        {text.where(people)}
      </li>
      {people.villages !== undefined && (
        <li>
          <span>{t("Villages in this atlas", "本地圖列載部落")}</span>
          {people.villages.toLocaleString()}
        </li>
      )}
    </ul>
  );
}
