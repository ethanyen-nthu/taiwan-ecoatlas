# Taiwan EcoAtlas — full platform implementation report

Working-tree audit date: **2026-11-16, Asia/Taipei**. This report distinguishes
implemented code and imported artifacts from verified deployment. It does not
supersede or rewrite the dated [LAUNCH_AUDIT.md](LAUNCH_AUDIT.md) or
[MILESTONE_1.md](MILESTONE_1.md).

## Release status

The existing repository is
[ethanyen-nthu/taiwan-ecoatlas](https://github.com/ethanyen-nthu/taiwan-ecoatlas),
and the verified public URL is
[taiwan-ecoatlas.vercel.app](https://taiwan-ecoatlas.vercel.app).
The expanded platform was published in `ddeb7eb`; production river metadata
was corrected in application revision `4cfa4e8`. Vercel marked
[the application deployment](https://taiwan-ecoatlas-1tp287agj-nthu1.vercel.app)
READY, and the actual public alias was tested on 2026-11-16.

The expanded implementation passes the local production build, TypeScript,
ESLint, 131 unit/API tests, official county validation and repository/client
secret-boundary audit. All 27 local browser cases and 23 actual public
production cases passed, including the river correction. The production
checks used real providers without route interception or substitute data.

## Implemented breadth

The five sections share the existing Watermelon design language, English and
Traditional Chinese controls, official 22-county geography and MapLibre
rendering. They now use a common catalogue/query contract instead of documenting
all nonstation datasets as future work.

| Area          | Implemented code and artifacts                                                                                                                     | Practical limit                                                                                             |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Environment   | AQI/PM2.5 and both CWA networks; MOENV river adapter; county/date/metric inspection and descriptive charts                                         | Current station reports and bounded river extract, not persistent station history or complete river archive |
| Forests       | Actual 2023 class raster overview, forest-only overview, original-pixel county statistics                                                          | No verified 2013 raster; 19 mapped counties and offshore gaps; class 5 unresolved                           |
| Wildlife      | Conservative historical public subset, species/county/date filters, generalized map points, species evidence pages                                 | Incomplete conservation screening; limited subset, not corrected risk or abundance                          |
| Culture       | Public village names/groups/reference points, actual public trail geometry, eight historical study profiles and official language resources        | No inferred territories/access rights, invented history, translated names or geocoded narrative routes      |
| Urban         | Taipei parks, public park trees, historical riverside tree survey, separate measured CWA air temperature                                           | Taipei coverage only; no imported satellite thermal scene or nationwide canopy estimate                     |
| Shared access | `/api/atlas` catalogue, filtered/paginated dataset APIs, viewport map collections, charts, bounded CSV, processed static downloads, source library | In-memory scans and per-instance caches; current sampling thresholds do not establish comparable effort     |

Dynamic information routes are `/culture/places/[id]` and
`/wildlife/species/[id]`. Unknown identifiers return `notFound()`. Cultural
studies preserve original Traditional Chinese narratives, study year, listing
date, attribution and explicit missing geometry. English readers see that the
narratives have not been translated. Species pages expose aggregate counts,
year/county evidence and the whole-dataset source, without precise observation
locations or per-occurrence links. No photos are fabricated or reused without
verified attribution and licence.

## Imported editions

Counts below were checked against the actual public manifests and provenance
files. API response totals vary and are deliberately not invented here.

| Artifact / dataset                     | Count and actual period                                              | Source and licence                                                  |
| -------------------------------------- | -------------------------------------------------------------------- | ------------------------------------------------------------------- |
| Official counties                      | 22, edition 2025-03-18                                               | NLSC 7442; Open Government Data License 1.0                         |
| 2023 land cover / forest overview      | 19 mapped county summaries; classification year 2023                 | Chen et al., Zenodo 14033363 v3; CC BY 4.0                          |
| Public wildlife subset                 | 10,841 records, 99 taxa; 2014-01-02–2017-12-31                       | TaiRON/TBRI/TaiBIF/GBIF v1.11; CC BY 4.0                            |
| Village reference points               | 730 accepted / 739 source rows; listing dates preserved separately   | CIP A53000000A-111027-001; Open Government Data License 1.0         |
| Public historical-trail routes         | 24 open/public historical routes selected from 229 trails            | Tourism Administration 41653; Open Government Data License 1.0      |
| Historical-trail study profiles        | Eight, study 2011, listed 2023-12-19; no geometry                    | CIP A53000000A-112072-001; Open Government Data License 1.0         |
| Taipei parks, squares and green spaces | 812 accepted / 813 rows; catalogue updated 2026-10-13                | Taipei 128366; Open Government Data License 1.0                     |
| Taipei park trees                      | 85,177 accepted / 85,181 rows; survey 2016-06-02–2026-10-02          | Taipei public park-tree inventory; Open Government Data License 1.0 |
| Taipei riverside trees                 | 10,735 accepted / 10,921 rows; one-time survey 2016-11-04–2017-06-16 | Taipei riverside inventory; Open Government Data License 1.0        |

The two forest layers use the same county summary collection; they are not two
independent samples. Original-pixel processing classified 1,011,497,706 mapped
pixels inside official county polygons, yielding 36,383.637 km² mapped area and
21,258.103 km² class-1 forest. These are research classification statistics,
not legal forest inventory values. Kinmen, Lienchiang and Penghu have null
statistics, not zero forest. The archive has 2015- and 2023-labelled TIFFs; the
2015 file is not renamed as a 2013 baseline.

The wildlife source archive has 46,416 rows from 2011–2017. The public edition
uses only conservation-checked eligible Least Concern records outside
conservative protected-taxon exclusions. Metadata has been checked for 15,600
of 18,147 Least Concern records, so completeness is explicitly false. All
public coordinates are 10 km grid centres. Private originals, observers,
localities, media links and individual occurrence links remain out of public
artifacts. County assignment was performed before generalization.
Terrestrial and marine official protected lists are both considered. Additional
conservative marine-group/bat exclusions and strict original/interpreted
species identity checks omit uncertain or fuzzy matches; this is deliberately
more restrictive than a legal status classification.

The village import excludes nine invalid/conflicting/county-mismatched rows.
Tourism trails require source open/public flags and actual route geometry;
two closed/nonpublic historical trails are excluded. The eight separate CIP
study narratives do not gain invented coordinates. Public source locations
do not grant access or override community restrictions.

All accepted urban points lie inside the official Taipei polygon. Source
dates remain missing where invalid: 481 park-tree dates and two riverside
dates, including spreadsheet defaults. A tree record does not establish
current survival or canopy change; the riverside source explicitly records a
one-time survey with no subsequent updates.

## APIs, comparisons and exports

`GET /api/observations/aqi` and `/weather` retain validation, freshness status,
exclusion counts and original timestamps. API keys remain in server modules.
AQI caches for 30 minutes and weather for 10 minutes, with coalescing,
backoff and last-valid failure handling.

The river adapter queries up to 10,000 `WQX_P_01` indicator rows, groups by
station/sampling date, deduplicates indicators, validates units and retains
source-reported DO/BOD/SS/ammonia/RPI. Censored or missing values remain null
with source strings/notes retained. Monthly sampling has publication lag.
Sampling and retrieval dates are distinct; unprovided publication dates stay
null. Its six-hour cache is per instance and has no current durable writer.

`GET /api/atlas/{dataset}` supports county, date, category, species and text
filters with record pagination and descriptive summaries. CSV exports cap at
5,000 rows and escape formula-like strings. Static GeoJSON downloads contain
the full published edition; wildlife positions remain generalized. The map API
filters to viewports and aggregates dense point payloads instead of sending
the complete tree file with each map response. It does not implement a
database spatial index or distributed cache.

County/timeline charts describe loaded records and measurement coverage. A
minimum numeric count is not proof of matched time periods, station placement
or observation effort. No causal pollution, population exposure or wildlife
risk ranking is established. Wind direction is not linearly averaged. Source
daily accumulated rain must not be summed across repeated hourly reports.
Missing data and unavailable historical baselines remain visible.

## Persistence and collection

The existing foundation migration creates `environmental_sources`,
`source_sync_runs`, `counties`, `source_snapshots`, `aqi_observations` and
`weather_observations`, with PostGIS/indexes and Row Level Security. This
expansion does **not** add new database tables for its static data or river
samples. Optional server service-role access persists latest valid station
snapshots and sync logs; prepared AQI/weather history tables are not appended
by current ingestion. Configured secrets alone do not verify database writes.

The existing GitHub Actions refresh is opt-in through
`ECOATLAS_INGEST_ENABLED=true`, scheduled at minute 7 each hour. It calls the
authenticated `/api/ingest` endpoint for AQI/weather through the same cache
rules. It does not collect complete history, refresh river data or rerun static
imports. GitHub schedules can be delayed. No Vercel Hobby hourly cron is used.

Static editions are built offline using `import_landcover.py`,
`import_wildlife.py`, `import_culture.py` and `import_urban.py`, with source
checksums and explicit exclusions. Culture/urban official downloads are
reproducible through `download_culture_urban.py`. Raw archives and private
locations remain under ignored `data/raw/`, excluded from deployment.
The optional pinned processing environment is installed with
`.venv/bin/python -m pip install -r scripts/requirements-atlas.txt`; these
Python dependencies are not required to run the Next.js application.

## Validation evidence

Completed during the culture/urban/profile/source-library work:

- Six culture/urban tests: source identities/counts/dates, geographic samples,
  cultural semantics, real public line geometry, missing dates and checksums.
- Seven profile tests: real village/route/study/species lookup, rendered source
  and privacy context, and unknown/path-like ID rejection.
- Five source-library tests: actual metadata/downloads, load failures/loading,
  runtime-count placeholders and integration into `/data` and `/sources`.
- These **18 focused tests passed**, scoped ESLint passed, and Python import
  scripts compiled. Earlier profile-route TypeScript checks passed before
  subsequent shared work; this is not a substitute for the final whole-tree run.

Focused local Chrome review subsequently verified village, public-trail,
historical-study, species, source and data routes: all six returned HTTP 200;
English/Traditional Chinese switching worked; the original historical Chinese
text matched its source. Desktop and fresh 390 px mobile screenshots were
inspected with no horizontal overflow or browser page errors. All 13 distinct
source-library download destinations returned HTTP 200. These local checks do
not establish public deployment or complete dashboard accessibility coverage.

Other current test suites cover geography, adapters, HTTP retries, snapshots,
river parsing, atlas queries/APIs, forest statistics and wildlife privacy.
Their final aggregate results below come from executed commands and browser runs.
The new production-only river test makes real API/UI requests, requires actual
historical samples and verifies sampling dates separately from missing
publication dates. It passed against the corrected public deployment.

| Final release check              | Executed evidence                                                                                                                           |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| TypeScript / ESLint / unit tests | Passed; 131 tests across 14 files                                                                                                           |
| Geography                        | Passed official checksums, WGS84, all 22 valid counties and offshore islands                                                                |
| Install/build/secrets            | Frozen lockfile install, production build and repository/client secret-boundary scan passed; .env.local and .vercel excluded                |
| Local Playwright                 | 27 passed: 10 baseline, 5 central map, 12 platform; desktop/tablet/mobile, keyboard, axe and actual screenshot review                       |
| GitHub                           | Normal main pushes to existing repository; application revisions ddeb7eb and 4cfa4e8; no force push                                         |
| Vercel                           | Existing nthu1/taiwan-ecoatlas project; Next.js/Node24/default output; automatic Git production deployments verified                        |
| Public platform                  | 17/17 passed on ddeb7eb: all five dashboards, source-backed layers, dates, charts, profiles, language, accessibility and responsive layouts |
| Public release/provider flow     | 6/6 passed on 4cfa4e8: routes, 22 county selections, fresh AQI/weather popups, private-file exclusion and actual river record details       |
| Public assets                    | All 11 unique catalogue download/raster/statistics URLs returned HTTP200                                                                    |

At 00:47 UTC on 2026-11-16, actual production reports contained **84 AQI**
and **874 weather** stations, both fresh. The corrected river request returned
**39 station/date samples across six counties**, dated **2026-09-02–2026-09-21**,
with **147 numeric indicator values** across DO, BOD, suspended solids, ammonia
nitrogen and reported RPI. These are observed request counts, not fixed totals.
Every checked sample retained its source station/river name and valid county.
Sampling dates and unknown publication dates were verified in the actual UI.

The river provider returned **1,000 indicator rows despite the requested
10,000-row cap**. The API and interface disclose the actual extract size.
Different per-instance responses can contain different partial subsets; no
complete archive or matched county monitoring coverage is claimed. Historical
river samples are loaded on demand and are not durably imported into a database.
The initial production test caught missing Chinese-schema station/county fields;
the corrected bilingual parser and regression test passed before closeout.

Initial accessibility testing also found and fixed an invisible Recharts sizing
constraint and an unnamed-role scroll region. Affected checks were rerun and
passed. No test failure remains unresolved.

Source/private-value audit scope: no MOENV/CWA values were read back locally;
pattern and client-boundary scans passed, server-only imports remain enforced,
and actual private-file HTTP checks passed. This is not a claim that a scanner
can recognize unknown secrets from arbitrary strings.

Reproduce the public checks with the production URL and installed Playwright
browser:

```sh
ECOATLAS_BASE_URL=https://taiwan-ecoatlas.vercel.app pnpm test:production
ECOATLAS_BASE_URL=https://taiwan-ecoatlas.vercel.app pnpm test:platform:production
```

## Remaining limits

No verified 2013 baseline, complete wildlife archive, national tree inventory,
imported satellite surface-temperature scene, live Sentinel-2 analysis,
automated deforestation detection, public report submission, continuous
environmental history ingestion or sampling-effort-corrected ranking is claimed.
Original cultural narrative translation and licensed photography remain
source-limited. Server memory/cold-start costs and optional database operations
still require production assessment. API configuration or a successful local
build alone must never be reported as a verified deployment.

Detailed reproducibility and limitations:
[DATA_SOURCES.md](DATA_SOURCES.md), [ARCHITECTURE.md](ARCHITECTURE.md),
[FOREST_DATA.md](FOREST_DATA.md), [WILDLIFE_DATA.md](WILDLIFE_DATA.md),
[CULTURE_DATA.md](CULTURE_DATA.md), [URBAN_DATA.md](URBAN_DATA.md).
