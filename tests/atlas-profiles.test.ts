import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import CulturalPage from "@/app/culture/places/[id]/page";
import SpeciesPage from "@/app/wildlife/species/[id]/page";
import {
  AtlasProfile,
  type AtlasProfileData,
} from "@/components/atlas-profile";
import { Providers } from "@/components/providers";

const readJson = (name: string) =>
  JSON.parse(readFileSync(`public/data/atlas/${name}`, "utf8"));
const render = (profile: AtlasProfileData) =>
  renderToStaticMarkup(
    createElement(Providers, null, createElement(AtlasProfile, { profile })),
  );

it("resolves a source village without supplying invented history", async () => {
  const page = await CulturalPage({
    params: Promise.resolve({ id: "village-1" }),
  });
  const profile = page.props.profile as Extract<
    AtlasProfileData,
    { kind: "culture" }
  >;
  expect(profile.kind).toBe("culture");
  expect(profile.properties).toMatchObject({
    traditionalName: "Tampya",
    group: "泰雅族",
    date: null,
  });
  const html = render(profile);
  expect(html).toContain("Tampya");
  expect(html).toContain("not founding date");
  expect(html).toContain("https://data.gov.tw/dataset/156632");
});

it("resolves genuine public route records by original source id", async () => {
  const feature = readJson("public-historic-trails.geojson").features[0];
  const page = await CulturalPage({
    params: Promise.resolve({ id: feature.properties.id }),
  });
  expect(page.props.profile).toMatchObject({
    kind: "culture",
    properties: {
      sourceRecordId: feature.properties.sourceRecordId,
      publicAccess: true,
    },
  });
});

it("renders full original historical studies with their year and no invented route", async () => {
  const original = readJson("cultural-trails.json")[0];
  const page = await CulturalPage({
    params: Promise.resolve({ id: original.id }),
  });
  const profile = page.props.profile as Extract<
    AtlasProfileData,
    { kind: "study" }
  >;
  expect(profile.study.geometry).toBeNull();
  expect(profile.study.descriptionZh).toBe(original.descriptionZh);
  const html = render(profile);
  expect(html).toContain("2011");
  expect(html).toContain("have not been translated into English");
  expect(html).toContain('lang="zh-Hant"');
  expect(html).toContain(original.descriptionZh.slice(0, 30));
  expect(html).toContain("https://data.gov.tw/dataset/166817");
});

it("resolves species aggregates with county labels and no precise observation data", async () => {
  const original = readJson("wildlife.species.json").species[0];
  const page = await SpeciesPage({
    params: Promise.resolve({ id: original.id }),
  });
  const profile = page.props.profile as Extract<
    AtlasProfileData,
    { kind: "species" }
  >;
  expect(profile.species.count).toBe(original.count);
  expect(
    Object.values(profile.species.yearCounts).reduce((a, b) => a + b, 0),
  ).toBe(original.count);
  expect(
    Object.values(profile.species.countyCounts).reduce((a, b) => a + b, 0),
  ).toBe(original.count);
  expect(profile.counties).toHaveLength(22);
  expect(profile.species).not.toHaveProperty("coordinates");
  expect(profile.species).not.toHaveProperty("occurrences");
  const html = render(profile);
  expect(html).toContain(original.name);
  expect(html).toContain("Recorded frequency by year");
  expect(html).toContain("not a population trend");
  expect(html).toContain("Taipei City");
  expect(html).not.toContain("/occurrence/");
  expect(html).toContain(original.sourceUrl);
});

it.each(["not-a-source-record", "../wildlife.geojson", "%2e%2e%2fsecret"])(
  "rejects unknown profile ids safely: %s",
  async (id) => {
    await expect(
      CulturalPage({ params: Promise.resolve({ id }) }),
    ).rejects.toThrow("NEXT_HTTP_ERROR_FALLBACK;404");
    await expect(
      SpeciesPage({ params: Promise.resolve({ id }) }),
    ).rejects.toThrow("NEXT_HTTP_ERROR_FALLBACK;404");
  },
);
