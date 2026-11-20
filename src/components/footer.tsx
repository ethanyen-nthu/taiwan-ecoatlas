"use client";
import Link from "next/link";
import { ArrowUpRight, Leaf } from "lucide-react";
import { useLanguage } from "./providers";
export function Footer() {
  const { t, language } = useLanguage();
  return (
    <footer className="site-footer">
      <span>
        <Leaf size={17} />
        Taiwan EcoAtlas <span className="footer-divider">/</span>
        <span>
          {t("An open window into our island.", "看見我們島嶼的開放之窗。")}
        </span>
      </span>
      <nav aria-label={t("Project links", "專案連結")}>
        <Link href="/teach">{t("Teach with the atlas", "教學")}</Link>
        <Link href="/culture/peoples">
          {t("Sixteen peoples", "十六個族群")}
        </Link>
        <Link href="/data">{t("Open data", "開放資料")}</Link>
        <Link href="/sources">{t("Sources & licences", "來源與授權")}</Link>
        <Link href="/about">
          {t("About the project", "關於專案")}
          <ArrowUpRight size={13} />
        </Link>
      </nav>
      <p className="footer-credit">
        {language === "zh" ? (
          <>
            製作：<b lang="zh-Hant">顏名宣</b> Ethan Yen
          </>
        ) : (
          <>
            Built by <b>Ethan Yen</b> <span lang="zh-Hant">顏名宣</span>
          </>
        )}
        <span className="footer-divider">·</span>
        <span>
          {t("National Tsing Hua University (NTHU)", "國立清華大學（NTHU）")}
        </span>
      </p>
    </footer>
  );
}
