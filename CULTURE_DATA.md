# Cultural data

This release uses official public reference data. It does not infer Indigenous
territories, add coordinates to narrative histories, or translate traditional
names into invented English names. All three imported sources use the
[Open Government Data License 1.0](https://data.gov.tw/license).

| Source                                                                                                     | Published artifact                                 |                         Accepted records |
| ---------------------------------------------------------------------------------------------------------- | -------------------------------------------------- | ---------------------------------------: |
| [CIP village reference points, 156632](https://data.gov.tw/dataset/156632), resource A53000000A-111027-001 | `public/data/atlas/villages.geojson`               |                                730 / 739 |
| [CIP historical trail studies, 166817](https://data.gov.tw/dataset/166817), resource A53000000A-112072-001 | `public/data/atlas/cultural-trails.json`           |                                    8 / 8 |
| [Tourism Administration national trails, 41653](https://data.gov.tw/dataset/41653)                         | `public/data/atlas/public-historic-trails.geojson` | 24 public historical trails / 229 trails |

The village source preserves original row IDs, Chinese names, traditional
romanization, source-listed groups, township and public reference-point names.
Its TWD97 / TM2 zone 121 coordinates (EPSG:3826) are transformed to WGS84 with
the official non-ballpark operation of reported 1 m accuracy. The
[CIP village gazetteer](https://www.cip.gov.tw/data/news/202107/T-34932586.pdf?c=60B90646E1DF20818E3A8F31907130D8&fn=B106B2173396970D1C716EAF9360DB98142A0F270CEC80B2C97454BE1E8E3A4A&s=C747B0F76D4432B8)
identifies projected TWD97 and WGS84 geographic columns. Projected and geographic
values must agree within 300 m; each point must fall inside its source county in
the official county boundaries. Three invalid, three conflicting and three
county-mismatched records are excluded rather than repaired by guessing.
Catalogue listing dates are `listedAt`; they are not village founding dates.
Public reference points do not establish access permission or traditional
territory. Local community restrictions still apply.

The eight CIP profiles preserve the source Traditional Chinese introduction,
historical context, communities, construction history, recorded conditions and
attribution. They are from a **2011 study**, listed **2023-12-19**. `geometry` is
explicitly null: the source contains no routes. Original historical wording can
include colonial terminology, and its historical condition assessment is not
current hiking guidance. No source photos with separately verified attribution
were imported. English interface labels accompany the original Chinese text;
an English translation of the historical narratives is not claimed.

The 24 actual route geometries come from a separate Tourism Administration
release updated **2026-11-15T14:30:30+08:00**. Selection requires `古道` in the
source name, `IsPublicAccess=1` and `ServiceStatus=1`; two closed/nonpublic
historical routes are excluded. Geometry is source WGS84 WKT, with elevation
removed for the web map. These are public historical trails and are **not an
exhaustive Indigenous trail inventory**. Source open status is a snapshot;
check the linked official route website and community restrictions before
visiting. The
[Tourism Data Standard V2.1](https://media.taiwan.net.tw/Upload/觀光資料標準V2.1.pdf)
defines WGS84 geometry and the access/status flags. Cross-county routes retain
all intersected official codes in `intersectingCountyCodes`; `countyCode` alone
must not be used to omit their other counties.

Official language learning and dictionary links are included in
`culture.metadata.json`: [族語 E 樂園](https://web.klokah.tw/) and
[原住民族語線上辭典](https://e-dictionary.ilrdf.org.tw/). Their content is linked,
not copied or relicensed.

Reproduce from official public endpoints:

```sh
.venv/bin/python -m pip install -r scripts/requirements-atlas.txt
.venv/bin/python scripts/download_culture_urban.py
.venv/bin/python scripts/import_culture.py
```

Raw downloads remain in ignored `data/raw/`. The import requires GeoPandas's
Shapely/PyProj dependencies and the existing official county GeoJSON. Output
SHA-256 checksums, source checksums, coordinate operation and exclusion counts
are recorded in `public/data/atlas/culture.provenance.json`. The web manifest is
`culture.metadata.json`. Refreshing upstream data can legitimately change
record counts; inspect provenance and rerun validation before publication.
