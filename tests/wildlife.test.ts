import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import type { AtlasCollection, AtlasManifest } from "../src/lib/atlas-types";
import {
  validSpeciesId,
  wildlifeTaxonUrl,
  type WildlifeSpecies,
} from "../src/lib/wildlife";

const bytes = readFileSync("public/data/atlas/wildlife.geojson");
const data = JSON.parse(bytes.toString()) as AtlasCollection;
const manifest = JSON.parse(
  readFileSync("public/data/atlas/wildlife.metadata.json", "utf8"),
) as AtlasManifest;
const provenance = JSON.parse(
  readFileSync("public/data/atlas/wildlife.provenance.json", "utf8"),
);
const species = JSON.parse(
  readFileSync("public/data/atlas/wildlife.species.json", "utf8"),
).species as WildlifeSpecies[];

describe("released, privacy-preserving wildlife archive", () => {
  it("matches its source provenance, public checksum, unique identifiers and real species totals", () => {
    expect(createHash("sha256").update(bytes).digest("hex")).toBe(
      provenance.publicSha256,
    );
    expect(provenance.sourceRecords).toBe(46416);
    expect(data.features.length).toBe(manifest.datasets[0].recordCount);
    expect(
      new Set(data.features.map((f) => f.properties.observationId)).size,
    ).toBe(data.features.length);
    expect(species.reduce((total, taxon) => total + taxon.count, 0)).toBe(
      data.features.length,
    );
    expect(species.every((taxon) => validSpeciesId(taxon.id))).toBe(true);
    expect(
      data.features.every((feature) =>
        species.some((taxon) => taxon.id === feature.properties.speciesId),
      ),
    ).toBe(true);
  });

  it("publishes only generalized centres and allowlisted non-sensitive properties", () => {
    const allowed = new Set([
      "id",
      "sourceId",
      "title",
      "titleZh",
      "countyCode",
      "date",
      "category",
      "species",
      "scientificName",
      "speciesId",
      "family",
      "taxonKey",
      "observationId",
      "gbifId",
      "individualCount",
      "gridId",
      "coordinateUncertaintyM",
      "generalizationRadiusM",
      "precision",
      "licence",
      "iucnCategory",
    ]);
    const grids = new Map<string, string>();
    for (const feature of data.features) {
      expect(feature.geometry.type).toBe("Point");
      expect(
        Object.keys(feature.properties).every((key) => allowed.has(key)),
      ).toBe(true);
      expect(feature.properties.iucnCategory).toBe("LC");
      expect(feature.properties.coordinateUncertaintyM).toBeNull();
      expect(feature.properties.generalizationRadiusM).toBe(7100);
      expect(feature.properties.precision).toContain("not sighting location");
      expect(feature.properties.date).toMatch(/^201[1-7]-\d{2}-\d{2}$/);
      expect(feature.properties.licence).toBe("CC BY 4.0");
      const key = String(feature.properties.gridId),
        point = JSON.stringify(feature.geometry.coordinates);
      if (grids.has(key)) expect(point).toBe(grids.get(key));
      grids.set(key, point);
    }
    expect(grids.size).toBeLessThan(data.features.length);
    expect(bytes.toString()).not.toMatch(
      /decimalLatitude|decimalLongitude|recordedBy|informationWithheld|locality|mediaURL|roadkill\.tw\/observation/,
    );
  });

  it("links taxonomic information without linking back to exact occurrence coordinates", () => {
    expect(wildlifeTaxonUrl({ taxonKey: 123 })).toBe(
      "https://www.gbif.org/species/123",
    );
    expect(wildlifeTaxonUrl({ taxonKey: null })).toBeNull();
    expect(validSpeciesId("../../private")).toBe(false);
  });

  it("withholds marine protected taxa, uncertain sensitive groups and fuzzy taxonomic matches", () => {
    const withheldFamilies = new Set([
      "Cheloniidae",
      "Dermochelyidae",
      "Delphinidae",
      "Laridae",
      "Vespertilionidae",
      "Rhinolophidae",
    ]);
    const unsafeNames = /^(Chelonia|Lagenodelphis|Hydrophis|Laticauda)\b/;
    expect(
      species.every(
        (taxon) =>
          taxon.name.toLowerCase() === taxon.acceptedName?.toLowerCase(),
      ),
    ).toBe(true);
    expect(
      species.every(
        (taxon) =>
          !withheldFamilies.has(taxon.family || "") &&
          !unsafeNames.test(taxon.name),
      ),
    ).toBe(true);
    expect(species.some((taxon) => taxon.name === "Ptyas mucosus")).toBe(false);
    expect(provenance.marineProtectedListUrl).toBe(
      "https://www.forest.gov.tw/file/74850",
    );
    expect(provenance.marineProtectedListSha256).toMatch(/^[a-f0-9]{64}$/);
    expect(
      provenance.rejectedFromLeastConcern.taxon_name_mismatch_or_fuzzy_match,
    ).toBeGreaterThan(0);
    expect(provenance.publicTaxa).toBe(species.length);
  });
});
