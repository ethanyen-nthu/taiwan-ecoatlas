"use client";
import Link from "next/link";
import { ArrowUpRight, Leaf } from "lucide-react";
import { useLanguage } from "./providers";
export function Footer() {
  const { t } = useLanguage();
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
        <Link href="/data">{t("Open data", "開放資料")}</Link>
        <Link href="/sources">{t("Sources & licences", "來源與授權")}</Link>
        <Link href="/about">
          {t("About the project", "關於專案")}
          <ArrowUpRight size={13} />
        </Link>
      </nav>
    </footer>
  );
}
