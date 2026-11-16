# Architecture

This document describes the expanded implementation in the working tree. It is
separate from deployment evidence in `LAUNCH_AUDIT.md`; the current release
verification is recorded in `FULL_PLATFORM_REPORT.md`.

## Application boundaries

Next.js App Router, TypeScript, React, Tailwind 4, MapLibre, Recharts and Lucide
form one Vercel-compatible application. The existing Watermelon-derived tabs,
split accordion and methodology disclosures remain part of the shared design.
Map/chart modules load on the client; credentials, provider requests and static
atlas collection reads belong to server modules. GeoPandas, Shapely, PyProj and
Rasterio processing runs offline, not in request handlers. No FastAPI service
or online satellite classifier is required.

```text
Browser: bilingual explorer, section workbenches, profiles, source library
 ├─ official county GeoJSON + OpenFreeMap basemap
 ├─ GET /api/observations/{aqi|weather}
 │    └─ server validation/cache → MOENV/CWA → optional private snapshots
 ├─ GET /api/atlas: server catalogue + checked-in bilingual manifests
 ├─ GET /api/atlas/{dataset}: filters, pagination, summaries, bounded CSV
 ├─ GET /api/atlas/map: viewport map payloads and point aggregation
 │    ├─ latest validated station reports
 │    ├─ MOENV bounded river sample query
 │    └─ per-instance cached public GeoJSON collections
 └─ processed public files, raster overview PNGs and statistical JSON

Offline import scripts → reviewed public artifacts + provenance/checksums
                      └─ ignored data/raw/ holds original/restricted inputs
```

## Code and data ownership

- `src/app`: public pages, two dynamic profile routes, metadata, API handlers,
  error/404 boundaries and global styles.
- `src/components/map`: one MapLibre renderer per mount, explorer controls,
  official county selection, station/atlas sources, raster/line overlays.
- `section-page.tsx`, `section-workbench.tsx`, `atlas-charts.tsx`: shared section
  controls, filters, records and descriptive charts.
- `atlas-hooks.ts`: SWR catalogue and viewport overlay requests;
  `providers.tsx`: persisted language preference, county and observation hooks.
- `atlas-profile.tsx`: client bilingual source facts, original cultural study
  narratives, species-level aggregate evidence and attribution. Profile pages
  read only fixed public file paths and look up the requested ID; unknown IDs
  call `notFound()`.
- `atlas-source-library.tsx`: actual catalogue licences, source IDs, dates,
  limits and downloads. API metadata placeholder counts are not represented as
  observed totals.
- `src/lib/atlas-types.ts`: shared manifest, feature, collection and query-result
  contracts. `atlas-query.ts`: pure filters, geometry bounds, grouping,
  descriptive summaries and CSV serialization. `river.ts`: source-specific
  sample/date/unit validation. `wildlife.ts`: public subset conventions.
- `src/lib/sources.ts` and `layers.ts`: typed source/layer provenance and display
  metadata; source identifiers remain separate from UI dataset IDs.
- `src/server`: server-only observation adapters, network retries, snapshots,
  river querying and atlas catalogue/collection loading.
- `public/data/atlas`: publishable processed static artifacts and source
  manifests. Original precise wildlife records remain in ignored `data/raw/`.
- `scripts`: reproducible imports, geographic validation, seed and secret audit.

Offline processing dependencies are pinned in `scripts/requirements-atlas.txt`
(including the base geographic requirements). They are optional for application
runtime; install with `.venv/bin/python -m pip install -r
scripts/requirements-atlas.txt` before reproducing atlas imports.

## Map and query lifecycle

The renderer initializes once per mount and destroys map workers, handlers and
resize observers on unmount. React updates existing sources and layer filters.
County hover/selection uses official county codes. Public geometry uses
longitude/latitude WGS84; fit bounds include Taiwan and required offshore
islands. Missing WebGL and basemap failures have explicit states. Plain-map
fallbacks retain real county geometry; no replacement geography is invented.

The bounded station networks use current validated reports. Atlas inventories
are loaded/cached as full server-side GeoJSON collections, then filtered in
memory. `GET /api/atlas/{dataset}` validates dataset and query inputs, supports
county, search, category, species and date filters, and returns at most 100
record rows per page. Map output uses geometry-bounds intersection with the
viewport. Trails also retain intersecting county codes so cross-county routes
remain discoverable.

Point map payloads combine identical positions and aggregate dense collections
into viewport-scaled cells when there are more than 3,000 unique positions.
Aggregation centroids describe grouped records, not additional observations.
At most 3,000 nonpoint shapes are included in the generic map payload. The
current inventories remain in memory per server instance; this is not a
PostGIS-backed spatial index or a global cache. Cold starts and repeated scans
are material limits for the 85,177-record Taipei park-tree inventory.

Filtered county/timeline summaries describe matching records before viewport
clipping. Tables use visible-record pagination. Numeric county means require
at least two measurements except the precomputed forest summaries; nulls stay
missing. This threshold does not establish comparable monitoring schedules or
sampling effort. Wind direction is not linearly averaged. Monthly/day/year
series group records that actually exist, and do not create a historical feed.
Forest classification dates retain year precision; village listing dates are
not treated as founding dates. CSV exports escape formula-like strings and
are capped at 5,000 matching records.

Wildlife map positions are already generalized 10 km grid centres. Original
county assignment was done before generalization, so a public centre can lie
outside its county. Heatmaps/clusters describe reports, not animal abundance,
current locations or corrected roadkill risk. Precise locations, observer
identifiers and per-occurrence source links are not client properties.

Forest PNGs are georeferenced, nearest-neighbour web overviews. Original-pixel
statistics are separate JSON/summary-point artifacts; summary points and
rendered pixels must not be described as original satellite observations.

## Live data and failure handling

AQI caches for 30 minutes; weather for 10 minutes. Validation normalizes source
schemas, coordinates, station IDs, missing values and timestamps. Both weather
networks must validate before replacing the complete weather result. Per-source
promises coalesce refreshes. Failure backs off for 60 seconds, retains the last
valid result with its successful retrieval time, and marks it stale. An empty
failure is unavailable; missing credentials are not configured. Observation
age, not retrieval time, determines freshness. Logs use generic event codes,
not raw credential-bearing URLs.

Optional Supabase storage persists latest valid AQI/weather snapshots and sync
runs. Otherwise cache/backoff state disappears on instance restart. Client SWR
retains and marks prior results stale on request failure. There is no global
rate limiter or shared cache across all instances.

The river adapter queries `WQX_P_01` with the server MOENV key, requesting up to
10,000 indicator rows. Production verification returned 1,000; the API/UI expose
the actual upstream row count rather than assuming the requested cap was met.
Both official Chinese and English station/county/river metadata schemas are
supported. It groups by station/sampling date, deduplicates repeated
indicators, preserves raw/censored values separately from numeric nulls, checks
units and retains source-reported RPI rather than inventing it. Source TWD97
geographic coordinates use the explicit EPSG:1549 transformation convention;
no projected XY is relabelled as longitude/latitude. Sampling date is separate
from retrieval and unknown publication dates remain null. River results cache
in process for six hours with request coalescing/backoff. They are not persisted
by the existing snapshot or ingestion path. Monthly field samples with release
lag are historical samples, not live river conditions or a complete archive.

## Persistence and scheduling

The existing foundation migration uses PostgreSQL/PostGIS, the `extensions`
schema and UTC timestamps. RLS allows only published reads for public source,
county and prepared observation tables; browser mutation policies are absent.
Snapshots and sync runs have no public access. Trusted server service-role
requests write snapshots and logs; credentials never enter client components.

| Existing table                             | Actual current role                                                                                    |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------ |
| `environmental_sources`                    | Canonical provenance and runtime sync metadata                                                         |
| `source_sync_runs`                         | Optional generic success/failure audit                                                                 |
| `counties`                                 | Optional seeded official MultiPolygon geometry, spatial index                                          |
| `source_snapshots`                         | Optional private latest-valid station result                                                           |
| `aqi_observations`, `weather_observations` | Prepared history schema and uniqueness/time/spatial indexes; current ingestion does not append records |

There are no migrations or import writers for river history, static inventories
or cultural profiles. The static collections do not imply database persistence.
A configured Supabase variable alone does not establish that a migration has
run or that database writes succeed.

`POST /api/ingest` checks a Bearer secret in constant time and refreshes AQI and
weather through the same validated cache policy. The opt-in GitHub Actions job
runs at minute 7 hourly when `ECOATLAS_INGEST_ENABLED=true`; it stores latest
snapshots only when optional persistence works. It does not preserve a full
station time series, refresh river data or run offline static imports. GitHub
schedule delays are possible. No Vercel Hobby hourly cron is used.

## Deployment

Node 24 and pnpm 11.25.0 are pinned. Build/dev use Webpack explicitly. Provider
keys are runtime server settings; no remote data or font downloads are needed
for the build. Public map-style settings are build-time browser values.
`next.config.ts` supplies file-tracing includes for atlas APIs and profile
routes. `.gitignore` and `.vercelignore` exclude local secrets, original raw
inputs, virtual environments and private deployment metadata.

The earlier launch connected `ethanyen-nthu/taiwan-ecoatlas` to Vercel project
`nthu1/taiwan-ecoatlas`, production branch `main`. The dated launch audit remains
unchanged. An expanded release must separately verify all section APIs, bundled
files, profiles, language controls and mobile layouts at its actual public
URL. Local tests and a build do not establish deployment success.
