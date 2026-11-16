import { expect, it } from "vitest";
import { parseRiver, sampleDate } from "@/lib/river";
// Synthetic validation cases only; never imported by application routes.
const row = {
  siteid: "TEST",
  siteengname: "Test river station",
  countyen: "Taipei City",
  riveren: "Test river",
  sampledate: "2026/09/01",
  twd97lon: "121.5",
  twd97lat: "25.0",
  itemengabbreviation: "DO",
  itemvalue: "5.2",
  itemunit: "mg/L",
};
it("preserves sampling dates and reported indicators without inventing publication dates", () => {
  const result = parseRiver(
    [
      row,
      { ...row, itemengabbreviation: "RPI", itemvalue: "3.25", itemunit: "" },
    ],
    () => "63000",
  );
  expect(result.collection.features).toHaveLength(1);
  expect(result.collection.features[0].properties).toMatchObject({
    date: "2026-09-01",
    do: 5.2,
    rpi: 3.25,
    publishedAt: null,
    sourceCrs: "EPSG:3824",
    countyCode: "63000",
  });
});
it("does not convert censored, unsupported-unit or missing samples into zero", () => {
  const result = parseRiver([
    row,
    { ...row, itemengabbreviation: "NH3-N", itemvalue: "<0.01" },
    { ...row, itemengabbreviation: "SS", itemunit: "%", itemvalue: "12" },
  ]);
  expect(result.collection.features[0].properties).toMatchObject({
    nh3n: null,
    nh3nRaw: "<0.01",
    ss: null,
  });
});
it("rejects reversed coordinates and impossible sample dates", () => {
  expect(() =>
    parseRiver([{ ...row, twd97lon: "25", twd97lat: "121" }]),
  ).toThrow();
  expect(sampleDate("2026-02-30")).toBeNull();
});
it("preserves the first reported value rather than overwriting duplicate source samples", () => {
  const result = parseRiver([row, { ...row, itemvalue: "9" }]);
  expect(result.duplicates).toBe(1);
  expect(result.collection.features[0].properties.do).toBe(5.2);
});
it("retains station, river and county metadata from the official Chinese schema", () => {
  const {
    siteengname: _site,
    countyen: _county,
    riveren: _river,
    ...shared
  } = row;
  void _site;
  void _county;
  void _river;
  const result = parseRiver(
    [
      {
        ...shared,
        sitename: "測試橋",
        county: "臺北市",
        river: "測試溪",
        basin: "測試流域",
        note: "來源備註",
      },
    ],
    (name) => (name === "臺北市" ? "63000" : null),
  );
  expect(result.collection.features[0].properties).toMatchObject({
    title: "測試橋",
    titleZh: "測試橋",
    countyCode: "63000",
    river: "測試溪",
    basin: "測試流域",
    doNote: "來源備註",
  });
});
