"use client";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import useSWR from "swr";
import {
  groupHits,
  kindLabels,
  noteOf,
  queryTokens,
  search,
  type SearchKind,
  type SearchRow,
} from "@/lib/search";
import { useLanguage } from "../providers";
import { Footer } from "../footer";
import "../teach/teach.css";
import "./search.css";

const perGroup = 8;
const examples: [string, string][] = [
  ["PM2.5", "PM2.5"],
  ["Taitung", "臺東"],
  ["Amis", "阿美族"],
  ["reservoir", "水庫"],
  ["warming", "暖化"],
  ["banyan", "榕樹"],
];

async function loadIndex(url: string): Promise<SearchRow[]> {
  const response = await fetch(url);
  if (!response.ok) throw new Error("The search list did not load");
  return response.json();
}

export function SearchView() {
  const { language, t } = useLanguage();
  const start = useSearchParams().get("q") ?? "";
  const [query, setQuery] = useState(start);
  const [open, setOpen] = useState<Set<SearchKind>>(new Set());
  const input = useRef<HTMLInputElement>(null);
  const inputId = useId();
  const { data, error } = useSWR("/search-index.json", loadIndex, {
    revalidateOnFocus: false,
    shouldRetryOnError: false,
  });

  useEffect(() => {
    input.current?.focus();
  }, []);

  const change = (value: string) => {
    setQuery(value);
    setOpen(new Set());
    const next = value.trim()
      ? `/search?q=${encodeURIComponent(value.trim())}`
      : "/search";
    window.history.replaceState(null, "", next);
  };

  const hits = useMemo(() => (data ? search(data, query) : []), [data, query]);
  const groups = useMemo(() => groupHits(hits), [hits]);
  const asked = queryTokens(query).length > 0;
  const name = (row: SearchRow) => (language === "en" ? row[1] : row[2]);
  const other = (row: SearchRow) => {
    const second = language === "en" ? row[2] : row[1];
    return second === name(row) ? "" : second;
  };

  let status = "";
  if (asked && data) {
    status = hits.length
      ? t(
          `${hits.length} ${hits.length === 1 ? "result" : "results"}`,
          `找到 ${hits.length} 筆`,
        )
      : t("No results", "沒有結果");
  }

  return (
    <main id="main" className="document-page teach search">
      <p className="teach-crumb">
        <Link href="/">{t("Overview", "總覽")}</Link>
        <span aria-hidden="true"> / </span>
        {t("Search", "搜尋")}
      </p>
      <header className="teach-head" data-neutral="">
        <div className="teach-head-copy">
          <h1>{t("Search the atlas", "搜尋平台")}</h1>
          <p>
            {t(
              "Find a page, a county, one of the sixteen peoples, a lesson, a glossary word, an animal, a tree or a village. Type in English or Traditional Chinese; 台 and 臺 are the same here.",
              "尋找頁面、縣市、十六個族群、課程、名詞、動物、樹木或部落。可輸入英文或繁體中文；這裡的「台」與「臺」視為同一個字。",
            )}
          </p>
        </div>
        <span className="teach-stripe" aria-hidden="true" />
      </header>

      <div className="sr-box">
        <label htmlFor={inputId}>{t("Search for", "搜尋")}</label>
        <div className="sr-field">
          <Search size={20} aria-hidden="true" />
          <input
            id={inputId}
            ref={input}
            data-search-box=""
            aria-keyshortcuts="Control+K Meta+K"
            type="search"
            value={query}
            autoComplete="off"
            spellCheck={false}
            placeholder={t(
              "e.g. Taitung, PM2.5, 榕樹",
              "例如 臺東、PM2.5、榕樹",
            )}
            onChange={(event) => change(event.target.value)}
          />
        </div>
        <p className="sr-status" role="status">
          {status}
        </p>
        <p className="sr-hint">
          {t(
            "Tip: press Ctrl+K (⌘K on a Mac) on any page to search.",
            "小技巧：在任何頁面按 Ctrl+K（Mac 為 ⌘K）即可搜尋。",
          )}
        </p>
      </div>

      {error && (
        <p className="sr-note">
          {t(
            "The list to search did not load. Check your connection and reload the page.",
            "要搜尋的清單沒有載入。請檢查網路連線後重新整理。",
          )}
        </p>
      )}
      {!data && !error && (
        <p className="sr-note">{t("Loading the list…", "正在載入清單…")}</p>
      )}

      {!asked && data && (
        <section className="sr-try" aria-labelledby="sr-try-title">
          <h2 id="sr-try-title">{t("Try", "試試看")}</h2>
          <ul>
            {examples.map(([en, zh]) => (
              <li key={en}>
                <button
                  type="button"
                  onClick={() => change(language === "en" ? en : zh)}
                >
                  {language === "en" ? en : zh}
                </button>
              </li>
            ))}
          </ul>
          <p className="sr-note">
            {t(
              `${data.length.toLocaleString("en-US")} things can be found here: every page, the 22 counties and cities, the sixteen peoples, lessons and glossary words, the animals and trees in the guides, and the listed villages.`,
              `這裡可以找到 ${data.length.toLocaleString("en-US")} 項內容：所有頁面、22 個縣市、十六個族群、課程與名詞、指南中的動物與樹木，以及列載的部落。`,
            )}
          </p>
        </section>
      )}

      {asked && data && hits.length === 0 && (
        <section className="sr-empty">
          <p>
            {t(
              `Nothing matches “${query.trim()}”. Try a shorter word, or the same word in the other language.`,
              `沒有符合「${query.trim()}」的內容。請試試更短的字，或用另一種語言輸入。`,
            )}
          </p>
          <p>
            <Link href={`/feedback?from=${encodeURIComponent("/search")}`}>
              {t("Tell me what you were looking for", "告訴我你想找什麼")}
            </Link>
          </p>
        </section>
      )}

      {groups.map((group) => {
        const shown = open.has(group.kind)
          ? group.hits
          : group.hits.slice(0, perGroup);
        const label = kindLabels[group.kind][language];
        return (
          <section
            key={group.kind}
            className="sr-group"
            aria-labelledby={`sr-${group.kind}`}
          >
            <h2 id={`sr-${group.kind}`}>
              {label} <span>{group.hits.length}</span>
            </h2>
            <ul>
              {shown.map(({ row }) => (
                <li key={`${row[0]}${row[3]}`}>
                  <Link href={row[3]}>
                    <span className="sr-title">
                      {name(row)}
                      {other(row) && <small>{other(row)}</small>}
                    </span>
                    {noteOf(row, language) && (
                      <span
                        className="sr-sub"
                        data-sci={
                          row[0] === "animal" || row[0] === "tree"
                            ? ""
                            : undefined
                        }
                      >
                        {noteOf(row, language)}
                      </span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
            {group.hits.length > perGroup && !open.has(group.kind) && (
              <button
                type="button"
                className="sr-more"
                onClick={() => setOpen(new Set(open).add(group.kind))}
              >
                {t(
                  `Show all ${group.hits.length} ${label.toLowerCase()}`,
                  `顯示全部 ${group.hits.length} 筆${label}`,
                )}
              </button>
            )}
          </section>
        );
      })}
      <Footer />
    </main>
  );
}
