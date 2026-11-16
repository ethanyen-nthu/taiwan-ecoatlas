# Wildlife archive: source, processing and privacy

The source is **Lin T (2026), The Taiwan Roadkill Observation Network Data Set**, version 1.11, published by the Taiwan Biodiversity Research Institute through TaiBIF and GBIF, DOI [10.15468/cidkqi](https://doi.org/10.15468/cidkqi). The [official GBIF record](https://www.gbif.org/dataset/db09684b-0fd1-431e-b5fa-4c1532fbdb14) identifies the released archive as 46,416 georeferenced records from 2011–December 2017, licensed **CC BY 4.0**. It documents expert review, reporting-effort bias and restrictions on protected-species locations. The original 46,416-row Darwin Core Archive was downloaded from the exact endpoint listed by GBIF: `https://ipt.taibif.tw/archive.do?r=tw_roadkill_data`.

## What this release publishes

This is an explicitly bounded, conservatively screened **subset**, not the full archive. The current counts, actual public date range, source/archive checksums and conservation-metadata coverage are recorded in `public/data/atlas/wildlife.provenance.json` and `wildlife.metadata.json`. The website must display the manifest's actual date range and limitation rather than imply every historical record is present.

The current release contains **10,841 observations across 99 reported taxa**, dated **2014-01-02–2017-12-31**. Conservation metadata was checked for 15,600 of 18,147 source records returned by GBIF's LC filter; this incomplete coverage is disclosed rather than replaced with invented observations.

- Only GBIF-interpreted **Least Concern (LC)** records with species/subspecies-level identification are eligible. Unassessed, Data Deficient, Near Threatened and threatened taxa are excluded. LC is the GBIF-reported global category, not Taiwan's legal protection status.
- Original `occurrenceID` joins directly to the released archive. Its reported scientific name must exactly match GBIF's interpreted species name (case-insensitive); all fuzzy matches are omitted. This conservatively excludes 787 cached records, including four historical spelling/gender variants, rather than assuming their conservation mappings are interchangeable.
- Both the official [terrestrial protected-species list](https://www.forest.gov.tw/0008324), PDF `https://www.forest.gov.tw/file/203699` (published 7 February 2025), and [marine protected-species list](https://www.forest.gov.tw/0008329), PDF `https://www.forest.gov.tw/file/74850` (effective 1 June 2020 and still linked by the current official page), are additional exclusion screens. Every genus mentioned anywhere in these documents, including synonyms and references, is conservatively excluded, together with recognized blanket protected higher groups.
- Marine turtle and marine mammal families, seabird families, sea snake genera and all bats are also withheld as broad sensitivity precautions. These deliberate omissions include some unprotected species and do **not** represent a legal status determination. The exact group policy and both protected-list checksums are preserved in provenance.
- Any GBIF record marked with withheld/generalized data or invalid-coordinate flags is excluded. Original year/month/day must form a real date within 2011–2017. Ambiguous text such as `8/2/11` is not reinterpreted when numeric date parts exist.
- Original coordinates are used privately to assign an official county through the verified NLSC boundaries. Records outside those geometries are omitted; no nearest county is invented.
- **Every public point is a 10 km EPSG:3826 grid-cell centre**, transformed back to WGS84. It is not a sighting coordinate. Multiple observations can share a centre. County filtering uses the original pre-generalization county, so a centre can lie outside that county or offshore.
- The approximately 7.1 km `generalizationRadiusM` describes the grid's half-diagonal only. Original coordinate accuracy is not supplied; `coordinateUncertaintyM` remains null.
- Precise source coordinates, observer identifiers, verbatim localities, media URLs and individual occurrence/source links are not published. Original `observationId`, additional `gbifId`, scientific names, validated dates and the licence are preserved.

No images are copied from the observation network: the archive does not contain the individual photographers' attribution/licence fields required to reuse them reliably. Species pages may link to **taxonomic** GBIF pages using `taxonKey`, and every view must retain the dataset attribution. New reports should use the official [TaiRON website](https://roadkill.tw/); this release does not claim to collect user submissions.

## Files and contracts

- `wildlife.geojson`: `AtlasCollection`, dataset ID `wildlife`, source ID `roadkill`. `speciesId` joins the species index. `category` and `family` preserve the archive's reported fields; these historical fields may differ from current taxonomic classifications. Scientific names preserve original spelling only where they exactly match the screened interpreted species.
- `wildlife.species.json`: `{ "species": [...] }`; each entry includes stable `id`, original `name`/`scientificName`, GBIF `acceptedName` and `taxonKey` where supplied, `count`, `category`, `family`, `firstDate`/`lastDate`, `yearCounts`, `countyCounts`, source URL and licence. Counts refer only to the published subset.
- `wildlife.metadata.json`: `AtlasManifest`, including bilingual limitations and official resource links.
- `wildlife.provenance.json`: source/public SHA-256 checksums, counts, exclusions and processing method. It contains no original location records.

Clustering and heatmaps should aggregate generalized centres and weight them by actual report count. Histograms show **reported observations**, not animal abundance or a corrected mortality rate. Privacy exclusions, unequal observer effort and incomplete conservation metadata prevent a valid population/risk ranking.

## Reproduce

Use the existing GeoPandas/PyProj environment; install `pypdf==6.1.1` for processing the official protected list. Then:

```sh
.venv/bin/python scripts/import_wildlife.py --download
```

All original archives, precise locations, GBIF cache pages and both protected-list PDFs/text remain under ignored `data/raw/wildlife/`. They must not be committed or deployed. The importer refuses a changed source-record count, duplicate/incomplete GBIF pages and malformed identifiers. `--allow-partial` deliberately publishes only cached conservation-checked pages and records that incompleteness in both the public manifest and provenance; it is never an unlabelled fallback.

The TBN v2.5 API documentation was examined as another source of domestic sensitivity metadata, but its public query endpoints returned HTTP 404 during verification. No unavailable TBN values were invented or substituted.
