import { contactEmail, siteUrl } from "./site";

export type FeedbackKind = "suggestion" | "bug" | "data" | "other";

/** English names go into the email, which is read by one person. */
export const kindNames: Record<FeedbackKind, string> = {
  suggestion: "Suggestion",
  bug: "Bug",
  data: "Data issue",
  other: "Other",
};

/** A path from the address bar, kept only if it is a plain path on this site
 *  (so a link cannot make the form say another address). */
export function safeFrom(value: string | null | undefined): string {
  if (!value) return "";
  const text = value.trim();
  if (!/^\/[A-Za-z0-9\-._~\/%?=&+#,:@]*$/.test(text) || text.startsWith("//"))
    return "";
  return text.slice(0, 200);
}

export interface FeedbackInput {
  kind: FeedbackKind;
  message: string;
  /** A path on this site (made into a full address), other text as typed, or "" for none. */
  page: string;
  /** "Screen: 1440 × 900", "Browser: …" and so on, or [] to leave out. */
  details: string[];
  language: "en" | "zh";
}

/** The subject and body exactly as the email will have them. */
export function composeFeedback(input: FeedbackInput) {
  const message = input.message.trim();
  const flat = message.replace(/\s+/g, " ");
  const subject = `[EcoAtlas ${kindNames[input.kind].toLowerCase()}] ${
    flat.length > 60 ? `${flat.slice(0, 57)}…` : flat || "(no message yet)"
  }`;
  const lines = [message, "", "---", `Type: ${kindNames[input.kind]}`];
  const page = input.page.trim();
  if (page) {
    const path = safeFrom(page);
    lines.push(`Page: ${path ? `${siteUrl}${path}` : page}`);
  }
  lines.push(`Site language: ${input.language === "zh" ? "中文" : "English"}`);
  lines.push(...input.details);
  return { subject, body: lines.join("\n") };
}

/** A mailto: link. Line breaks are written as CRLF, which mail programs
 *  expect inside a body. */
export function mailtoLink(subject: string, body: string): string {
  const encode = (text: string) =>
    encodeURIComponent(text.replace(/\r?\n/g, "\r\n"));
  return `mailto:${contactEmail}?subject=${encode(subject)}&body=${encode(body)}`;
}

/** Some mail programs cut a very long link. Past this the page says so. */
export const mailtoSoftLimit = 1800;
