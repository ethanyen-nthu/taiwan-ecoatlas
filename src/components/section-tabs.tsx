"use client";
import Link from "next/link";
import { BookOpen, ChartNoAxesColumn, MapPin, Users } from "lucide-react";
import { sectionTabs, type SectionKey } from "@/content/section-tabs";
import { useLanguage } from "./providers";
import "./section-tabs.css";

const icons = {
  map: MapPin,
  trend: ChartNoAxesColumn,
  people: Users,
  guide: BookOpen,
};

/** The visible tab strip at the top of each subject. Tabs are links to real
 *  pages, so the current one is marked with aria-current rather than a
 *  tab-panel pattern. */
export function SectionTabs({
  section,
  current,
}: {
  section: SectionKey;
  current: string;
}) {
  const { language, t } = useLanguage();
  const tabs = sectionTabs[section];
  return (
    <nav
      className="section-tabs"
      data-subject={section}
      aria-label={t("Pages in this subject", "這個專題的頁面")}
    >
      <ul>
        {tabs.map((tab) => {
          const Icon = icons[tab.icon];
          const active = tab.key === current;
          return (
            <li key={tab.key}>
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
                data-active={active ? "true" : undefined}
              >
                <Icon size={18} aria-hidden="true" />
                <span className="section-tabs-text">
                  <strong>{tab.label[language]}</strong>
                  <small>{tab.hint[language]}</small>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
