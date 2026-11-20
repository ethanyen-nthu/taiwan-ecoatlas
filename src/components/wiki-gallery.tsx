"use client";
import { type ReactNode, useState } from "react";
import useSWRImmutable from "swr/immutable";
import { ArrowUpRight, ImageOff } from "lucide-react";
import { useLanguage } from "./providers";
import {
  loadWikimedia,
  type WikiPhoto,
  type WikiResult,
} from "@/lib/wikimedia";
import { indexedPhoto, samePhoto, smallerPhoto } from "@/lib/photo-index";
import "./wiki-gallery.css";

export interface WikiGalleryProps {
  /** Scientific name; Wikipedia redirects most binomials to the article. */
  latin: string;
  /** Key of the stored photo (scientific name for animals, Chinese name for
   *  trees); it shows straight away while the live lookup runs. */
  photoKey?: string | null;
  /** Local (Chinese) name, tried first on Chinese Wikipedia. */
  zhName?: string | null;
  enName?: string | null;
  /** Links shown when no photo could be loaded. */
  searchTerm?: string;
  /** Our own text, shown above the Wikipedia summary. */
  lead?: ReactNode;
}

async function load([, language, latin, zhName, enName]: [
  string,
  "en" | "zh",
  string,
  string,
  string,
]): Promise<WikiResult | null> {
  const first =
    language === "zh"
      ? await loadWikimedia("zh", [zhName, latin].filter(Boolean))
      : await loadWikimedia("en", [latin, enName].filter(Boolean));
  if (first && first.photos.length && first.extract) return first;
  // The other language often has the photos or the text this one lacks.
  const other =
    language === "zh"
      ? await loadWikimedia("en", [latin])
      : await loadWikimedia("zh", [zhName, latin].filter(Boolean));
  if (!first) return other;
  if (!other) return first;
  return {
    ...first,
    extract: first.extract || other.extract,
    photos: first.photos.length ? first.photos : other.photos,
  };
}

export function WikiGallery({
  latin,
  photoKey,
  zhName,
  enName,
  searchTerm,
  lead,
}: WikiGalleryProps) {
  const { t, language } = useLanguage();
  const [chosen, setChosen] = useState(0);
  const { data, error, isLoading } = useSWRImmutable(
    ["wiki", language, latin, zhName || "", enName || ""],
    load,
    { shouldRetryOnError: false },
  );
  const term = encodeURIComponent(searchTerm || latin);
  // The stored photo comes first, so there is a picture before anything has
  // loaded and still one if Wikipedia cannot be reached. Live photos follow,
  // minus the one already shown.
  const first = indexedPhoto(photoKey ?? latin, 960);
  const photos: WikiPhoto[] = [
    ...(first ? [first] : []),
    ...(data?.photos ?? []).filter(
      (item) => !first || !samePhoto(item.name, first.name),
    ),
  ];
  const photo = photos[Math.min(chosen, photos.length - 1)];
  const waiting = isLoading && !photo;
  return (
    <section
      className="wiki-gallery"
      aria-label={t("Photos and description", "照片與介紹")}
      aria-busy={isLoading}
      data-state={waiting ? "loading" : photo ? "photos" : "none"}
    >
      <div className="wiki-gallery-stage">
        {waiting && (
          <div className="wiki-gallery-skeleton" role="status">
            <span>{t("Loading photos…", "載入照片中…")}</span>
          </div>
        )}
        {photo && (
          <figure>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photo.src}
              width={photo.width}
              height={photo.height}
              alt={`${zhName || enName || latin} — ${photo.name}`}
              decoding="async"
            />
            <figcaption>
              {t("Photo: ", "照片：")}
              {photo.artist} ·{" "}
              {photo.licenseUrl ? (
                <a href={photo.licenseUrl} target="_blank" rel="noreferrer">
                  {photo.license}
                </a>
              ) : (
                photo.license
              )}{" "}
              ·{" "}
              <a href={photo.page} target="_blank" rel="noreferrer">
                Wikimedia Commons
              </a>
            </figcaption>
          </figure>
        )}
        {!isLoading && !photo && (
          <div className="wiki-gallery-empty">
            <ImageOff size={28} strokeWidth={1.4} aria-hidden="true" />
            <p>
              {error
                ? t(
                    "Photos could not be loaded right now. They come live from Wikimedia Commons.",
                    "目前無法載入照片；照片即時取自維基共享資源。",
                  )
                : t(
                    "No freely licensed photo was found for this one.",
                    "目前找不到可自由使用的照片。",
                  )}
            </p>
          </div>
        )}
        {photos.length > 1 && (
          <ul
            className="wiki-gallery-thumbs"
            aria-label={t("More photos", "更多照片")}
          >
            {photos.map((item, index) => (
              <li key={item.src}>
                <button
                  type="button"
                  aria-pressed={index === chosen}
                  aria-label={`${t("Photo", "照片")} ${index + 1}`}
                  onClick={() => setChosen(index)}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={smallerPhoto(item.src)}
                    alt=""
                    width={72}
                    height={72}
                    loading="lazy"
                    decoding="async"
                  />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="wiki-gallery-text">
        {lead}
        {data?.extract ? (
          <>
            <p lang={data.lang === "zh" ? "zh-TW" : "en"}>{data.extract}</p>
            <p className="wiki-gallery-source">
              {t(
                "Summary from Wikipedia, CC BY-SA 4.0. ",
                "摘要取自維基百科，CC BY-SA 4.0。",
              )}
              <a href={data.url} target="_blank" rel="noreferrer">
                {t("Read the full article", "閱讀完整條目")}
                <ArrowUpRight size={13} />
              </a>
            </p>
          </>
        ) : (
          !isLoading && (
            <p className="wiki-gallery-source">
              {t(
                "No Wikipedia summary was found. Try these instead:",
                "找不到維基百科摘要，可改看：",
              )}
            </p>
          )
        )}
        <p className="wiki-gallery-links">
          <a
            href={`https://commons.wikimedia.org/w/index.php?search=${term}&ns6=1`}
            target="_blank"
            rel="noreferrer"
          >
            {t("More photos on Commons", "共享資源的更多照片")}
            <ArrowUpRight size={13} />
          </a>
          <a
            href={`https://www.inaturalist.org/taxa/search?q=${term}`}
            target="_blank"
            rel="noreferrer"
          >
            iNaturalist
            <ArrowUpRight size={13} />
          </a>
        </p>
      </div>
    </section>
  );
}
