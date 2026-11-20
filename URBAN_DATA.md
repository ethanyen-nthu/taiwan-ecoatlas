# Urban ecology data

This release contains **Taipei municipal datasets**, not nationwide tree or park
coverage. All imported inventories use the
[Open Government Data License 1.0](https://data.gov.tw/license).

| Source                                                                                                     | Artifact                         | Accepted records | Time meaning                                                           |
| ---------------------------------------------------------------------------------------------------------- | -------------------------------- | ---------------: | ---------------------------------------------------------------------- |
| [Taipei parks, squares and green spaces, 128366](https://data.gov.tw/dataset/128366)                       | `taipei-parks.geojson`           |        812 / 813 | Catalogue updated 2026-10-13; not an observation series                |
| [Taipei public park trees](https://data.taipei/dataset/detail?id=7a49d00c-a5ff-4a6b-be9e-aaa6dc1ff7e8)     | `taipei-park-trees.geojson`      |  85,177 / 85,181 | Valid survey dates 2016-06-02–2026-10-02; latest row update 2026-11-13 |
| [Taipei riverside tree survey](https://data.taipei/dataset/detail?id=34800b67-b5a5-4ce9-9892-eb0945b82644) | `taipei-riverside-trees.geojson` |  10,735 / 10,921 | One-time historical survey, valid dates 2016-11-04–2017-06-16          |

All artifacts are under `public/data/atlas/`. Source identifiers, source-listed
species, dimensions and park names are retained. No English species names are
invented. Park reference points are not boundary polygons, and source public
land area does not establish national green cover or canopy cover. Tree records
do not establish current survival, planting date, population change or canopy
change. The city explains its ongoing removal/relocation reconciliation in an
[official tree-platform notice](https://pwd.gov.taipei/News_Content.aspx?n=74082687FC0B1094&s=A181C1BB75726C09).

Park trees use source TWD97 / TM2 zone 121 coordinates (EPSG:3826), converted to
WGS84 with the official non-ballpark transform of reported 1 m accuracy. Park
and riverside points use their geographic source coordinates; riverside
projected coordinates are also checked for agreement. Every accepted point is
inside the official Taipei county polygon. No points are snapped across a
boundary. One park and four park-tree records are excluded by geographic
validation. The riverside import excludes 179 county mismatches, three invalid
coordinates and four duplicate/missing identifiers.

Invalid survey dates, including spreadsheet defaults in 1899, remain null:
481 park-tree dates and two riverside dates are missing/invalid. The riverside
source explicitly says it was a one-time survey with no later inventory
updates. Its file update of 2023-07-05 is not a new survey, and subsequent
catalogue metadata changes do not change its observation dates. Dates are
normalized from source civil/ISO forms; measurements are not invented.

The park-tree artifact is about 38.9 MB. Shared licence text belongs in the
manifest instead of every tree. The map should request viewport/grid payloads
from the server rather than load the full inventory on every client.

The urban manifest links the official
[USGS Landsat surface-temperature documentation](https://www.usgs.gov/landsat-missions/landsat-collection-2-surface-temperature).
No validated Taiwan thermal scene is imported in this release. Satellite land
surface temperature and CWA station air temperature are different measurements;
the station layer must not be relabeled as satellite heat or an urban heat-island
index. Sentinel-2 has no thermal sensor and is not used to fabricate temperature.

Reproduce using official endpoints in `scripts/download_culture_urban.py`:

```sh
.venv/bin/python -m pip install -r scripts/requirements-atlas.txt
.venv/bin/python scripts/download_culture_urban.py
.venv/bin/python scripts/import_urban.py
```

Raw files are ignored under `data/raw/`. The importer needs Shapely/PyProj and
the existing official county GeoJSON. `urban.provenance.json` records source and
output SHA-256, exclusion counts and the coordinate operation;
`urban.metadata.json` is the bilingual web manifest. Review changed upstream
counts and provenance before publishing a refreshed inventory.

## Plants index

`node scripts/build_plants_index.mjs` reads the two published tree files (`taipei-park-trees.geojson`, `taipei-riverside-trees.geojson`) and writes `public/data/atlas/plants.index.json`: one row per Chinese tree name with counts (park and riverside), median and 90th-percentile height, median trunk diameter, the commonest districts and parks, and the source's own scientific name and family where the riverside survey gave one. Medians are used because a few heights are obvious entry errors. 55 rows with no usable name are skipped and counted in the file.

`src/content/plants.ts` adds a scientific name, family, growth type, origin and a short bilingual note for the 76 commonest kinds (about 87% of trees); family names follow the Taiwan Flora grouping, which differs from APG IV for a few families. `tests/plants.test.ts` checks that every described kind exists in the inventories and that the commonest 30 are all described.

## Why only Taipei

Parks and trees are Taipei City open data only. Other cities publish their own lists in different formats, dates and licences, and none has been checked or imported yet; the city page says so and links the cities' own portals. Live temperature stations are island-wide.
