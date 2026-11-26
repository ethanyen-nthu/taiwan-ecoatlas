import { describe, expect, it } from "vitest";
import {
  composeFeedback,
  mailtoLink,
  mailtoSoftLimit,
  safeFrom,
} from "@/lib/feedback";
import { contactEmail } from "@/lib/site";

describe("safeFrom", () => {
  it("keeps a plain path on this site", () => {
    expect(safeFrom("/environment/weather")).toBe("/environment/weather");
    expect(safeFrom("/county/63000?x=1")).toBe("/county/63000?x=1");
  });
  it("drops anything that is not a path on this site", () => {
    for (const bad of [
      "https://evil.example/x",
      "//evil.example",
      "javascript:alert(1)",
      "environment",
      "/a b",
      '/"><script>',
      "",
      null,
      undefined,
    ])
      expect(safeFrom(bad as string)).toBe("");
  });
});

describe("composeFeedback", () => {
  const base = {
    kind: "bug" as const,
    message: "  The map is blank\non my phone  ",
    page: "/explore",
    details: ["Screen: 390 × 844"],
    language: "en" as const,
  };
  it("builds a subject that names the type and starts the message", () => {
    const { subject } = composeFeedback(base);
    expect(subject).toBe("[EcoAtlas bug] The map is blank on my phone");
  });
  it("shortens a long first line in the subject only", () => {
    const long = "word ".repeat(40).trim();
    const { subject, body } = composeFeedback({ ...base, message: long });
    expect(subject.length).toBeLessThan(90);
    expect(subject.endsWith("…")).toBe(true);
    expect(body.startsWith(long)).toBe(true);
  });
  it("puts the page, language and details under a rule", () => {
    const { body } = composeFeedback(base);
    expect(body).toBe(
      "The map is blank\non my phone\n\n---\nType: Bug\nPage: https://taiwan-ecoatlas.vercel.app/explore\nSite language: English\nScreen: 390 × 844",
    );
  });
  it("keeps a page the visitor described in words", () => {
    const { body } = composeFeedback({ ...base, page: "the village map" });
    expect(body).toContain("Page: the village map");
  });
  it("leaves out the page and details when there are none", () => {
    const { body } = composeFeedback({ ...base, page: "", details: [] });
    expect(body).not.toContain("Page:");
    expect(body).not.toContain("Screen:");
    expect(body).toContain("Type: Bug");
  });
});

describe("mailtoLink", () => {
  it("addresses the project owner and encodes subject and body", () => {
    const link = mailtoLink("[EcoAtlas bug] a & b", "line 1\nline 2 ?=&");
    expect(link.startsWith(`mailto:${contactEmail}?subject=`)).toBe(true);
    const query = new URLSearchParams(link.split("?")[1]);
    expect(query.get("subject")).toBe("[EcoAtlas bug] a & b");
    expect(query.get("body")).toBe("line 1\r\nline 2 ?=&");
  });
  it("round-trips Chinese text", () => {
    const link = mailtoLink("建議", "水庫頁很實用");
    const query = new URLSearchParams(link.split("?")[1]);
    expect(query.get("body")).toBe("水庫頁很實用");
  });
  it("has a sensible soft limit", () => {
    expect(mailtoSoftLimit).toBeGreaterThan(1000);
  });
});

describe("the address", () => {
  it("is the one the project owner gave", () => {
    expect(contactEmail).toBe("ethanyen@gapp.nthu.edu.tw");
  });
});
