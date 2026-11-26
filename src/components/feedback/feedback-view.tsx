"use client";
import { useId, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowUpRight, Mail } from "lucide-react";
import {
  composeFeedback,
  mailtoLink,
  mailtoSoftLimit,
  safeFrom,
  type FeedbackKind,
} from "@/lib/feedback";
import { contactEmail, issuesUrl } from "@/lib/site";
import { useLanguage } from "../providers";
import { CopyButton } from "../copy-button";
import { Footer } from "../footer";
import "../teach/teach.css";
import "./feedback.css";

const noSubscription = () => () => {};
/** The screen and browser, read in the browser only. */
function technicalDetails(): string {
  return `Screen: ${window.innerWidth} × ${window.innerHeight}\nBrowser: ${navigator.userAgent}`;
}

export function FeedbackView() {
  const { language, t } = useLanguage();
  const from = safeFrom(useSearchParams().get("from"));
  const [kind, setKind] = useState<FeedbackKind>("suggestion");
  const [page, setPage] = useState(from);
  const [message, setMessage] = useState("");
  const [withDetails, setWithDetails] = useState(true);
  const ids = { page: useId(), message: useId(), hint: useId() };
  const detailText = useSyncExternalStore(
    noSubscription,
    technicalDetails,
    () => "",
  );

  const kinds: { value: FeedbackKind; label: string; hint: string }[] = [
    {
      value: "suggestion",
      label: t("A suggestion", "建議"),
      hint: t(
        "A page, a chart, a dataset or a word you would like to see added or changed.",
        "你希望新增或修改的頁面、圖表、資料集或用詞。",
      ),
    },
    {
      value: "bug",
      label: t("Something is broken", "發現問題（程式錯誤）"),
      hint: t(
        "Say what you did, what you expected and what happened instead. A map that stays blank, a button that does nothing, a page that overflows.",
        "請說明你做了什麼、預期會怎樣、實際發生什麼，例如地圖一片空白、按鈕沒反應、頁面超出畫面。",
      ),
    },
    {
      value: "data",
      label: t("A figure or source looks wrong", "數字或來源看起來有誤"),
      hint: t(
        "Name the page and the figure, and the source you compared it with if you have one.",
        "請寫明頁面與數字，若有你比對過的來源也請附上。",
      ),
    },
    {
      value: "other",
      label: t("Something else", "其他"),
      hint: t(
        "Questions, corrections for a lesson, a class you used the atlas in.",
        "問題、課程內容的更正，或你在課堂上使用本平台的經驗。",
      ),
    },
  ];
  const current = kinds.find((item) => item.value === kind)!;

  const ready = message.trim().length > 0;
  const { subject, body } = composeFeedback({
    kind,
    message,
    page,
    details: withDetails && detailText ? detailText.split("\n") : [],
    language,
  });
  const link = mailtoLink(subject, body);

  return (
    <main id="main" className="document-page teach feedback">
      <p className="teach-crumb">
        <Link href="/about">{t("About", "關於")}</Link>
        <span aria-hidden="true"> / </span>
        {t("Suggestions and bug reports", "建議與錯誤回報")}
      </p>
      <header className="teach-head" data-neutral="">
        <div className="teach-head-copy">
          <h1>{t("Tell me what to fix or add", "告訴我該修正或新增什麼")}</h1>
          <p>
            {t(
              "The atlas is made by one student, and it gets better when people tell him what they ran into. A suggestion, a bug or a figure that looks off all help.",
              "這個平台由一位學生製作，大家告訴他遇到了什麼，它才會變得更好。建議、程式錯誤、或看起來不對的數字，都很有幫助。",
            )}
          </p>
        </div>
        <span className="teach-stripe" aria-hidden="true" />
      </header>

      <div className="fb-layout">
        <form className="fb-form" onSubmit={(event) => event.preventDefault()}>
          <fieldset className="fb-kinds">
            <legend>{t("What is it about?", "是關於什麼？")}</legend>
            {kinds.map((item) => (
              <label key={item.value} className="fb-kind">
                <input
                  type="radio"
                  name="kind"
                  value={item.value}
                  checked={kind === item.value}
                  onChange={() => setKind(item.value)}
                />
                <span>{item.label}</span>
              </label>
            ))}
          </fieldset>

          <div className="fb-field">
            <label htmlFor={ids.message}>{t("Your message", "你的訊息")}</label>
            <p id={ids.hint} className="fb-hint">
              {current.hint}
            </p>
            <textarea
              id={ids.message}
              aria-describedby={ids.hint}
              rows={7}
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              required
            />
          </div>

          <div className="fb-field">
            <label htmlFor={ids.page}>
              {t("Which page? (optional)", "哪一頁？（選填）")}
            </label>
            <input
              id={ids.page}
              type="text"
              inputMode="url"
              autoComplete="off"
              placeholder="/environment/weather"
              value={page}
              onChange={(event) => setPage(event.target.value)}
            />
          </div>

          <label className="fb-check">
            <input
              type="checkbox"
              checked={withDetails}
              onChange={(event) => setWithDetails(event.target.checked)}
            />
            {t(
              "Add my screen size and browser, which helps me reproduce a bug",
              "附上我的螢幕大小與瀏覽器，方便我重現問題",
            )}
          </label>

          <section className="fb-preview" aria-labelledby="fb-preview-title">
            <h2 id="fb-preview-title">
              {t("What your email will say", "你的電子郵件內容")}
            </h2>
            <p className="fb-hint">
              {t(
                "Nothing is sent from this page. Your own email app opens with this text, and you press send from your own address.",
                "本頁不會送出任何東西。你的電子郵件程式會帶著這段文字開啟，由你用自己的信箱按下寄出。",
              )}
            </p>
            <pre data-testid="fb-preview">{`To: ${contactEmail}\nSubject: ${subject}\n\n${body}`}</pre>
          </section>

          <div className="fb-actions">
            <a
              className="button fb-send"
              href={ready ? link : undefined}
              aria-disabled={!ready}
              role={ready ? undefined : "link"}
              onClick={(event) => {
                if (!ready) event.preventDefault();
              }}
            >
              <Mail size={18} aria-hidden="true" />
              {t("Open in my email app", "用我的郵件程式開啟")}
            </a>
            {ready && (
              <CopyButton
                text={`${subject}\n\n${body}`}
                label={t("Copy the message", "複製訊息")}
                done={t("Message copied", "已複製訊息")}
              />
            )}
          </div>
          {!ready && (
            <p className="fb-hint" role="status">
              {t(
                "Write a message first and the button turns on.",
                "先寫下訊息，按鈕就會啟用。",
              )}
            </p>
          )}
          {ready && link.length > mailtoSoftLimit && (
            <p className="fb-warn" role="status">
              {t(
                "This is long, and some email apps cut a long link short. If yours does, use “Copy the message” and paste it into a new email.",
                "訊息很長，有些郵件程式會截斷過長的連結。若發生這種情況，請用「複製訊息」，再貼到新郵件。",
              )}
            </p>
          )}
        </form>

        <aside className="fb-side" aria-labelledby="fb-side-title">
          <h2 id="fb-side-title">
            {t("Other ways to reach me", "其他聯絡方式")}
          </h2>
          <p>
            {t("Write to ", "直接寫信到 ")}
            <a href={`mailto:${contactEmail}`}>{contactEmail}</a>
          </p>
          <CopyButton
            text={contactEmail}
            label={t("Copy the address", "複製信箱")}
            done={t("Address copied", "已複製信箱")}
          />
          <p>
            {t(
              "Or report it in the open, where others can see it and add to it. This needs a free GitHub account.",
              "也可以公開回報，讓其他人看到並補充。需要免費的 GitHub 帳號。",
            )}
          </p>
          <a
            className="fb-issue"
            href={issuesUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            {t("Open a GitHub issue", "開啟 GitHub issue")}
            <ArrowUpRight size={16} aria-hidden="true" />
          </a>
          <h2>{t("What happens to it", "訊息會怎麼處理")}</h2>
          <p>
            {t(
              "The atlas keeps no account, no cookie and no copy of what you type here. Your message reaches me only through your own email, so I can reply to you there.",
              "平台沒有帳號、不用 cookie，也不保存你在這裡輸入的內容。你的訊息只會透過你自己的電子郵件送到我這裡，我也能在那裡回覆你。",
            )}
          </p>
        </aside>
      </div>
      <Footer />
    </main>
  );
}
