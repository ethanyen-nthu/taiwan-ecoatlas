# Taiwan EcoAtlas / 臺灣環境與文化地圖

A bilingual environmental and cultural geography platform with five source-backed sections: environmental observations, historical land cover, a privacy-screened wildlife archive, public cultural geography and Taipei urban inventories. The shared atlas provides filters, map layers, descriptive charts, source records and exports. No environmental measurements or missing historical baselines are fabricated.

Verified public website: [taiwan-ecoatlas.vercel.app](https://taiwan-ecoatlas.vercel.app). Repository: [ethanyen-nthu/taiwan-ecoatlas](https://github.com/ethanyen-nthu/taiwan-ecoatlas). The five-section release was deployed and tested on 16 November 2026: 131 unit/API tests, 27 local browser cases and 23 public production cases passed. [FULL_PLATFORM_REPORT.md](FULL_PLATFORM_REPORT.md) records the tested application revisions, dataset coverage, live provider counts and remaining limits; [LAUNCH_AUDIT.md](LAUNCH_AUDIT.md) preserves the earlier launch history.

## Current data coverage

| Section     | Available data                                                                                              | Limits                                                                                                                                                        |
| ----------- | ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Environment | MOENV AQI/PM2.5; both CWA station networks; MOENV river sample adapter                                      | Latest station reports, not persistent observation history. River queries are bounded and monthly sampling has publication lag.                               |
| Forests     | Verified 2023 research classification, two overview images and original-pixel county statistics             | 19 mapped counties; offshore gaps and unresolved class 5. No verified 2013 baseline or 2013 change statistic.                                                 |
| Wildlife    | 10,841 screened observations, 99 taxa, 2014-01-02–2017-12-31                                                | A limited subset of the 46,416-row archive. All public locations are generalized 10 km grid centres; counts reflect reporting effort.                         |
| Culture     | 730 village reference points, 24 public historical-trail routes, eight nonspatial historical study profiles | Source names and narratives preserved. Points do not establish traditional territories or access rights.                                                      |
| Urban       | 812 Taipei park locations, 85,177 park-tree records, 10,735 historical riverside-tree records               | Taipei municipal coverage, not nationwide trees. Inventory dates do not establish current survival or canopy change. No imported satellite temperature scene. |

Counts describe the checked-in editions, not live provider totals. The manifest catalogue at `/api/atlas` exposes actual imported periods, licences and limitations; query endpoints provide current request counts. Source-specific processing details are in [FOREST_DATA.md](FOREST_DATA.md), [WILDLIFE_DATA.md](WILDLIFE_DATA.md), [CULTURE_DATA.md](CULTURE_DATA.md) and [URBAN_DATA.md](URBAN_DATA.md).

## Run locally

Requirements: Node.js **24.x**, pnpm **11.25.0**, a modern browser with WebGL. The Node major is pinned so Vercel uses the same runtime as CI. Install pnpm with `npm install --global pnpm@11.25.0` if needed.

```sh
pnpm install --frozen-lockfile
cp .env.example .env.local
pnpm dev
```

Open the local URL printed by Next.js. No keys or database are required for the county map or bilingual pages. Restart the server after changing `.env.local`. The initial extent includes Taiwan, Penghu, Kinmen, Matsu, Green Island and Orchid Island. All 22 official geometries are bundled; none are approximations.

```sh
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm start
pnpm exec playwright install chromium
pnpm test:browser
pnpm audit:secrets
```

Build/dev explicitly use Next.js's supported Webpack bundler because the desktop sandbox prevented Turbopack's PostCSS subprocess from opening an internal port. The production build works without network access or credentials. The map basemap requires internet access; if it fails, the verified local county layer remains available on a plain background.

On this session's machine, Node/pnpm/Git were absent from PATH or blocked by Xcode setup. Codex's bundled runtimes were used for verification. A normal terminal needs the requirements above; accepting Xcode's licence is not needed for this app if Git is installed separately.

## Environment

| Variable                        | Purpose                                                           | Browser exposure               |
| ------------------------------- | ----------------------------------------------------------------- | ------------------------------ |
| `MOENV_API_KEY`                 | AQX_P_432 observations and WQX_P_01 river sample queries          | Never                          |
| `CWA_API_KEY`                   | O-A0003-001 and O-A0001-001                                       | Never                          |
| `NEXT_PUBLIC_BASEMAP_STYLE`     | Configurable MapLibre style URL; defaults to OpenFreeMap Positron | Public, build time             |
| `NEXT_PUBLIC_SUPABASE_URL`      | Supabase project HTTPS URL                                        | Safe public project identifier |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Reserved for later read-only clients; currently unused            | Safe only with RLS             |
| `SUPABASE_SERVICE_ROLE_KEY`     | Optional durable snapshots and sync logging                       | Never                          |
| `CRON_SECRET`                   | Bearer authentication for POST `/api/ingest`                      | Never                          |

Get MOENV credentials from [MOENV Open Data](https://data.moenv.gov.tw/) and CWA credentials from [CWA Open Data](https://opendata.cwa.gov.tw/). Keep keys in server environment settings. Do not paste them into client code, commit them, or give them `NEXT_PUBLIC_` names.

## Optional Supabase persistence

1. Create a Supabase project.
2. Apply `supabase/migrations/202611150001_foundation.sql` in the SQL editor (or with a linked Supabase CLI). PostGIS must be in `extensions`; an existing installation in another schema needs administrator review before migration.
3. Set the Supabase HTTPS URL and service-role key in `.env.local`.
4. Seed the canonical source metadata and official counties:

```sh
node --env-file=.env.local --experimental-strip-types scripts/seed_database.mjs
```

The seed is idempotent and inserts no observations. Migrations enable RLS: public visitors may read published source/county/observation rows; they cannot write. Snapshot and sync-run tables have no public access. The service role alone imports records. Latest validated snapshots and sync results persist when configured; without Supabase, cache and failure backoff are per-process and disappear on restart. A configured URL/key does not prove the migration is applied or the database reachable. Check server sync logs and the snapshot table after enabling real data.

Historical AQI/weather tables are prepared but **not populated by the current ingestion code**. Persistent observation history is distinct from both the latest-snapshot cache and the bundled historical datasets. Static forest, wildlife, cultural and urban files do not require a database and are not silently imported into these tables.

## Official geography

See [DATA_SOURCES.md](DATA_SOURCES.md). The checked-in GeoJSON comes directly from [official dataset 7442](https://data.gov.tw/en/datasets/7442), edition 2025-03-18. Reproduce it with Python 3.12:

```sh
python3 -m venv .venv
.venv/bin/python -m pip install -r scripts/requirements.txt
# Download the official ZIP URL recorded in public/data/counties.metadata.json.
.venv/bin/python scripts/import_counties.py /path/to/official-counties.zip
.venv/bin/python scripts/validate_counties.py
```

The optional atlas import tools additionally use pinned Rasterio, NumPy, Pillow
and PDF parsing dependencies. Install them only when reproducing offline
datasets; running the Next.js application does not need Python:

```sh
.venv/bin/python -m pip install -r scripts/requirements-atlas.txt
.venv/bin/python scripts/download_culture_urban.py
.venv/bin/python scripts/import_culture.py
.venv/bin/python scripts/import_urban.py
```

Forest and wildlife imports require the exact archives and privacy checks in
their source-specific documentation. Their raw inputs remain outside Git and
deployment files.

The import refuses missing CRS, invalid geometry, duplicate county codes and ballpark transformations. It records SHA-256 checksums, source WKT and the 1-metre-accuracy TWD97→WGS84 operation. Original vertices are retained, rounded to seven decimal places; no topology simplification is applied. Raw ZIPs belong outside Git. GeoJSON is ~8.2 MB uncompressed, deliberately preserving official detail; vector tiles are a future optimization.

## GitHub and Vercel

The public repository is [ethanyen-nthu/taiwan-ecoatlas](https://github.com/ethanyen-nthu/taiwan-ecoatlas), with production branch `main`. Public deployment verification is recorded in [LAUNCH_AUDIT.md](LAUNCH_AUDIT.md).

1. Reuse the existing repository and Vercel project. Check `git remote -v` points to `ethanyen-nthu/taiwan-ecoatlas`; inspect remote `main` before integrating local changes. Do not create a replacement repository, overwrite remote history or force-push.
2. Review changes and run the checks above. Integrate remote changes as needed, commit the completed work, then push `main` through the existing connection.
3. Confirm the connected Vercel project's framework is **Next.js**, Node.js **24**, install command `pnpm install --frozen-lockfile`, and build command `pnpm build`. Keep the default Next.js output directory. A successful build alone is not public release verification.
4. Set MOENV/CWA variables for Production and the intended Preview environments. Add Supabase/cron variables only when those services are configured. Public variables require rebuilding when changed.
5. Set the production branch to `main`. Connected pushes build production; pull requests create previews.
6. Verify the returned deployment URL: open `/explore`, inspect `/sources`, and check `/api/status`. A successful local build is not evidence of a live deployment.

CI validates types, lint, unit tests, production build, browser behavior and geographic integrity. Browser tests deliberately run without real keys. For locally installed Chrome, set `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` to its executable instead of downloading Playwright Chromium.

The separate release suite makes real, read-only requests without mocking APIs or starting a local server:

```sh
ECOATLAS_BASE_URL=https://your-public-production-domain pnpm test:production
ECOATLAS_BASE_URL=https://your-public-production-domain pnpm test:platform:production
```

It checks routes and language switching at desktop, tablet and mobile widths, all 22 county selections, the downloaded boundary checksum, private-file exclusions, actual fresh AQI/weather reports in map popups, and real historical river samples with separate sampling/publication timestamps in record details. Missing keys, unavailable/stale providers and authentication-protected URLs fail the relevant provider checks. Do not substitute the no-key browser suite for public release verification. Use `--grep 'public|private'` only for presentation checks while credentials are pending, and report the provider checks separately.

In the Vercel project's **Settings → Environment Variables**, add `MOENV_API_KEY` and `CWA_API_KEY` as **Secret** variables targeting **Production**. Add Preview only if those deployments should also access the providers. Enter values directly in Vercel; do not paste them into chat, GitHub, client code or variables beginning `NEXT_PUBLIC_`. Redeploy after saving because environment changes apply to new deployments. Verify `/api/status`, both observation endpoints and the complete release suite afterward. Neither a variable's presence nor a green build establishes that the provider accepted its value.

Both provider credentials are already configured and verified in the existing production project. See [FULL_PLATFORM_REPORT.md](FULL_PLATFORM_REPORT.md) for this release and [LAUNCH_AUDIT.md](LAUNCH_AUDIT.md) for earlier launch evidence.

## Optional hourly snapshot refresh

The GitHub Actions refresh workflow is disabled until repository variable `ECOATLAS_INGEST_ENABLED=true`. Before enabling, configure a deployed HTTPS `ECOATLAS_ORIGIN`, the matching GitHub/Vercel `CRON_SECRET`, both provider keys, and Supabase migration/seed. The hourly workflow POSTs to `/api/ingest`, which uses the same validated adapters, cache and write controls. Failed or stale refreshes fail the job; sync logs retain generic error codes without credentials. Schedules may be delayed by GitHub and do not guarantee exact collection times.

This refresh saves the **latest snapshot**, not a complete time series. Do not enable it expecting historical ingestion yet. No Vercel Hobby hourly cron is used.

## Routes and scope

`/` overview; `/explore` interactive atlas; `/environment`, `/forests`, `/wildlife`, `/culture`, `/urban` section workbenches; `/culture/places/[id]` source-backed village/trail/study profiles; `/wildlife/species/[id]` historical subset frequency and county evidence; `/data` actual processed downloads and JSON endpoints; `/sources` metadata, licences, limitations and station status; `/about` methodology.

County names are bilingual from official attributes. Original station names, cultural names and scientific names are preserved; translations are used only where available. CIP historical narratives remain original Traditional Chinese with an untranslated notice in English. No third-party address geocoder is implemented. Date filters operate on the selected dataset's actual records; they do not create missing observations or fetch a complete historical station archive.

`GET /api/atlas/{dataset}` supports county/date/category/species/search filters, pagination and descriptive county/time summaries. `format=csv` exports at most 5,000 matching records. `GET /api/atlas/map` returns viewport-filtered map collections with aggregation for large point inventories. Static files are cached per server instance and scanned in memory; these are not database spatial-index queries. Downloading the processed GeoJSON intentionally provides the full published static edition, including already generalized wildlife positions. Never deploy `data/raw/`.

County charts describe loaded station/sample coverage and unweighted means. They do not establish causal differences or an exposure/risk ranking, and the current minimum-measurement threshold does not guarantee matched sampling effort. Rainfall remains source-reported daily accumulation; it must not be summed across successive reports as independent rain.

See [ARCHITECTURE.md](ARCHITECTURE.md), [DATA_QUALITY.md](DATA_QUALITY.md), [DATA_SOURCES.md](DATA_SOURCES.md) and [FULL_PLATFORM_REPORT.md](FULL_PLATFORM_REPORT.md). [MILESTONE_1.md](MILESTONE_1.md) and [LAUNCH_AUDIT.md](LAUNCH_AUDIT.md) remain historical records of earlier work.

The interface refresh follows [DESIGN.md](DESIGN.md). Watermelon UI tabs, split-accordion and methodology-disclosure source are adapted to the existing stack; source links and the MIT notice are in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md). Browser checks include keyboard operation, mobile reflow, 200% text resizing and automated accessibility checks.
