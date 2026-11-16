import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { afterEach, expect, it, vi } from "vitest";
import { Providers } from "@/components/providers";
import { AtlasSourceLibrary } from "@/components/atlas-source-library";
import { DataPage } from "@/components/topic-page";
import { SourceRegistry } from "@/components/source-registry";

const state = vi.hoisted(() => ({
  data: undefined as unknown,
  error: null as unknown,
  isLoading: false,
  mutate: vi.fn(),
}));
vi.mock("@/components/atlas-hooks", () => ({ useAtlasCatalogue: () => state }));
const render = () =>
  renderToStaticMarkup(
    createElement(Providers, null, createElement(AtlasSourceLibrary)),
  );
afterEach(() => {
  state.data = undefined;
  state.error = null;
  state.isLoading = false;
});

it("renders source identities, coverage, dates, licences and available transformations", () => {
  const sections = ["forests", "wildlife", "culture", "urban"].map((section) =>
    JSON.parse(
      readFileSync(`public/data/atlas/${section}.metadata.json`, "utf8"),
    ),
  );
  state.data = {
    datasets: sections.flatMap((s) => s.datasets),
    resources: sections.flatMap((s) => s.resources),
  };
  const html = render();
  expect(html).toContain("A53000000A-111027-001");
  expect(html).toContain("Taipei City only");
  expect(html).toContain("2016-06-02 – 2026-10-02");
  expect(html).toContain("Open Government Data License 1.0");
  expect(html).toContain("CC BY 4.0");
  expect(html).toContain('href="/data/atlas/taipei-parks.geojson"');
  expect(html).toContain("Processed GeoJSON");
  expect(html).toContain('href="/data/atlas/wildlife.species.json"');
  expect(html).toContain("Statistical summary");
  expect(html).toContain("county summaries are not raw satellite pixels");
  expect(html).not.toContain('href="/data/atlas/landcover-2013.geojson"');
});

it("provides an explicit source-load failure and retry control", () => {
  state.error = new Error("unavailable");
  const html = render();
  expect(html).toContain('role="alert"');
  expect(html).toContain("could not be loaded");
  expect(html).toContain("Try again");
  expect(html).not.toContain("Processed GeoJSON");
});

it("announces the catalogue loading state without claiming imports", () => {
  state.isLoading = true;
  const html = render();
  expect(html).toContain('role="status"');
  expect(html).toContain("Loading source catalogue");
  expect(html).not.toContain("Imported edition");
});

it("does not present catalogue placeholder counts as real river observations", () => {
  const { datasets } = JSON.parse(
    readFileSync("public/data/atlas/culture.metadata.json", "utf8"),
  );
  state.data = {
    datasets: [
      {
        ...datasets[0],
        id: "river-quality",
        section: "environment",
        sourceId: "WQX_P_01",
        title: { en: "River samples", zh: "河川採樣" },
        file: null,
        recordCount: 0,
      },
    ],
    resources: [],
  };
  const html = render();
  expect(html).toContain("API adapter");
  expect(html).toContain("Determined by source query");
  expect(html).not.toContain("Imported edition");
  expect(html).not.toContain("Processed GeoJSON");
});

it("integrates the actual imported library into both public data pages", () => {
  const manifest = JSON.parse(
    readFileSync("public/data/atlas/urban.metadata.json", "utf8"),
  );
  state.data = { datasets: manifest.datasets, resources: manifest.resources };
  for (const Component of [DataPage, SourceRegistry]) {
    const html = renderToStaticMarkup(
      createElement(Providers, null, createElement(Component)),
    );
    expect(html).toContain('id="atlas-source-library"');
    expect(html).toContain('href="/data/atlas/taipei-park-trees.geojson"');
    expect(html).toMatch(/one-time 2016/i);
    expect(html).not.toContain("Historical downloads will follow");
    expect(html).not.toContain("Not imported");
    expect(html).not.toContain("Milestone 3.");
  }
});
