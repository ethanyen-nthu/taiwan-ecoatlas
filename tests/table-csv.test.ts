import { describe, expect, it } from "vitest";
import { cleanCell, csvField, pathSlug, toCsv } from "@/lib/table-csv";

describe("cleanCell", () => {
  it("keeps gaps empty, never zero", () => {
    for (const dash of ["—", "–", "-", "", "  "])
      expect(cleanCell(dash)).toBe("");
    expect(cleanCell("0")).toBe("0");
    expect(cleanCell("0.0")).toBe("0.0");
  });
  it("drops thousands commas from numbers only", () => {
    expect(cleanCell("1,667.1")).toBe("1667.1");
    expect(cleanCell("-12,345")).toBe("-12345");
    expect(cleanCell("85,177")).toBe("85177");
    expect(cleanCell("Taipei, Taiwan")).toBe("Taipei, Taiwan");
    expect(cleanCell("1,66")).toBe("1,66");
  });
  it("turns a typographic minus into a plain one", () => {
    expect(cleanCell("−3.2")).toBe("-3.2");
    expect(cleanCell("−")).toBe("");
  });
  it("collapses line breaks and spaces", () => {
    expect(cleanCell("  石門水庫 \n  編號  ")).toBe("石門水庫 編號");
  });
});

describe("toCsv", () => {
  it("starts with a byte-order mark and ends with a line break", () => {
    const csv = toCsv(["a", "b"], [["1", "2"]]);
    expect(csv.startsWith("﻿")).toBe(true);
    expect(csv.endsWith("\r\n")).toBe(true);
    expect(csv).toBe("﻿a,b\r\n1,2\r\n");
  });
  it("quotes fields with commas, quotes or line breaks", () => {
    expect(csvField("a,b")).toBe('"a,b"');
    expect(csvField('say "hi"')).toBe('"say ""hi"""');
    expect(csvField("plain")).toBe("plain");
    expect(toCsv(["x"], [["a\nb"]])).toBe('﻿x\r\n"a\nb"\r\n');
  });
  it("keeps empty fields so columns stay aligned", () => {
    expect(toCsv(["a", "b", "c"], [["1", "", "3"]])).toBe("﻿a,b,c\r\n1,,3\r\n");
  });
  it("adds source lines after a blank line when asked", () => {
    const csv = toCsv(["a"], [["1"]], [["Source", "Taiwan EcoAtlas, a page"]]);
    expect(csv).toBe('﻿a\r\n1\r\n\r\nSource,"Taiwan EcoAtlas, a page"\r\n');
  });
});

describe("pathSlug", () => {
  it("makes a short file-name stem", () => {
    expect(pathSlug("/environment/reservoirs")).toBe("environment-reservoirs");
    expect(pathSlug("/wildlife/year-by-year/")).toBe("wildlife-year-by-year");
    expect(pathSlug("/")).toBe("home");
  });
});
