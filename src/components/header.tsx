"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUpRight, Leaf, Menu, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useLanguage } from "./providers";
const navigation = [
  ["/", "Overview", "總覽"],
  ["/explore", "Explore map", "探索地圖"],
  ["/environment", "Environment", "環境"],
  ["/forests", "Forests", "森林"],
  ["/wildlife", "Wildlife", "野生動物"],
  ["/culture", "Culture", "文化"],
  ["/urban", "Urban", "都市"],
];
export function Header() {
  const path = usePathname(),
    { language, setLanguage, t } = useLanguage();
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        trigger.current?.focus();
      }
    };
    document.addEventListener("keydown", escape);
    return () => document.removeEventListener("keydown", escape);
  }, [open]);
  return (
    <header className="site-header">
      <Link className="brand" href="/" aria-label="Taiwan EcoAtlas home">
        <span className="brand-icon">
          <Leaf size={24} strokeWidth={1.6} />
        </span>
        <span>
          Taiwan <b>EcoAtlas</b>
          <small>臺灣環境與文化地圖</small>
        </span>
      </Link>
      <nav
        className={open ? "primary-nav open" : "primary-nav"}
        aria-label={t("Main navigation", "主選單")}
      >
        {navigation.map(([href, en, zh]) => (
          <Link
            key={href}
            href={href}
            onClick={() => setOpen(false)}
            aria-current={path === href ? "page" : undefined}
          >
            {t(en, zh)}
          </Link>
        ))}
        <Link
          className="mobile-source"
          href="/sources"
          onClick={() => setOpen(false)}
        >
          {t("Data sources", "資料來源")}
        </Link>
      </nav>
      <div className="header-actions">
        <div className="language-switch" aria-label={t("Language", "語言")}>
          <button
            onClick={() => setLanguage("en")}
            aria-pressed={language === "en"}
          >
            EN
          </button>
          <span>/</span>
          <button
            onClick={() => setLanguage("zh")}
            aria-pressed={language === "zh"}
          >
            繁中
          </button>
        </div>
        <Link className="source-link" href="/sources">
          {t("Our sources", "資料來源")}
          <ArrowUpRight size={14} />
        </Link>
        <button
          ref={trigger}
          className="menu-button icon-button"
          onClick={() => setOpen(!open)}
          aria-label={t("Toggle navigation", "切換選單")}
          aria-expanded={open}
        >
          {open ? <X /> : <Menu />}
        </button>
      </div>
    </header>
  );
}
