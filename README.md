# Taiwan EcoAtlas / 臺灣環境與文化地圖

A bilingual environmental and cultural geography platform with five source-backed sections: environmental observations, historical land cover, a privacy-screened wildlife archive, public cultural geography and Taipei urban inventories. The shared atlas provides filters, map layers, descriptive charts, source records and exports. No environmental measurements or missing historical baselines are fabricated.

Verified public website: [taiwan-ecoatlas.vercel.app](https://taiwan-ecoatlas.vercel.app). Repository: [ethanyen-nthu/taiwan-ecoatlas](https://github.com/ethanyen-nthu/taiwan-ecoatlas). The five-section release was deployed and tested on 16 November 2026: 131 unit/API tests, 27 local browser cases and 23 public production cases passed. [FULL_PLATFORM_REPORT.md](FULL_PLATFORM_REPORT.md) records the tested application revisions, dataset coverage, live provider counts and remaining limits; [LAUNCH_AUDIT.md](LAUNCH_AUDIT.md) preserves the earlier launch history.

## Current data coverage

| Section     | Available data                                                                                                                                                                                 | Limits                                                                                                                                                                                                                                                         |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Environment | MOENV AQI/PM2.5; both CWA station networks; MOENV river sample adapter; modelled yearly, summer and winter temperature for 20 of 22 counties, 1950–2025 (Open-Meteo, ERA5-Land)                | Latest station reports, not persistent observation history. River queries are bounded and monthly sampling has publication lag. Temperature history is a model on a 10 km grid, not station records; Penghu and Lienchiang have no values.                     |
| Forests     | Verified 2023 research classification, two overview images and original-pixel county statistics                                                                                                | 19 mapped counties; offshore gaps and unresolved class 5. No verified 2013 baseline or 2013 change statistic.                                                                                                                                                  |
| Wildlife    | 10,841 screened observations, 99 taxa, 2014-01-02–2017-12-31                                                                                                                                   | A limited subset of the 46,416-row archive. All public locations are generalized 10 km grid centres; counts reflect reporting effort.                                                                                                                          |
| Culture     | 730 village reference points, 24 public historical-trail routes, eight nonspatial historical study profiles                                                                                    | Source names and narratives preserved. Points do not establish traditional territories or access rights.                                                                                                                                                       |
| Plants      | 496 kinds of tree from the Taipei park and riverside inventories (95,857 trees); 76 kinds, about 87% of trees, have a written guide entry with scientific name, family, growth type and origin | Taipei only, and not street trees. Counts say a tree was surveyed, not that it stands today. Each kind has a stored Commons photo with credit and licence; summaries and extra photos load live from Wikipedia and Wikimedia Commons in the visitor's browser. |
| Urban       | 812 Taipei park locations, 85,177 park-tree records, 10,735 historical riverside-tree records                                                                                                  | Taipei municipal coverage, not nationwide trees. Inventory dates do not establish current survival or canopy change. No imported satellite temperature scene.                                                                                                  |

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

`/tour` "Taiwan in five minutes", a scrolling tour where one county map recolours through six findings (air, warming, forests, roadkill reports, the sixteen peoples, Taipei's trees) and ends at the visitor's own county; each stop's figures are counted from the site's own data files in `src/lib/tour.ts` and each states what its data cannot tell you; `/` overview, ending in a "your county, side by side" section (`src/components/county-snapshot.tsx`: pick one of the 22 counties and see the current figure for each of the six subjects, with a dash, never a zero, where the atlas has no data); `/explore` interactive atlas; `/environment`, `/forests`, `/wildlife`, `/culture`, `/urban` section workbenches, each with a visible tab strip (`src/content/section-tabs.ts`) that also leads to its "compared with before" page: `/environment/air-over-time` (PM2.5, 2013–2025, plus a county map for 2021–2025 from the ministry's county table), `/environment/weather` (latest CWA station readings by county, sortable), `/environment/temperature-over-time` (modelled yearly, summer and winter temperature by county since 1950, with a year-by-year map you can play and a then-and-now comparison), `/environment/reservoirs` (WRA reservoir storage now, with `/api/reservoirs`) and `/environment/rivers-over-time`, `/forests/over-time` (two national forest inventories), `/wildlife/year-by-year` (2014–2017 records by county, animal group and month), `/culture/population` (registered Indigenous people at three year-ends), `/urban/over-time` (Taipei parks by decade built) and `/plants/surveys` (tree records by survey year); each ending in a "Cite this page and take the numbers" block (copy-ready citation, print, and a CSV of every table on the page, `src/components/trends/cite-download.tsx`); each opening with a short "what this shows / what you can learn / what it cannot tell you" guide (`src/content/section-guides.ts`); `/plants` and `/plants/[slug]` a guide to every kind of tree in the Taipei inventories (tabs: tree kinds, counted year by year); `/culture/places/[id]` a village reading page (map, people, nearby villages, source) or a source-backed trail/study profile; `/culture/peoples` and `/culture/peoples/[slug]` bilingual guides to the sixteen peoples; `/wildlife/species/[id]` an animal's Chinese and English names, photos, description, and historical subset frequency and county evidence; `/teach` seven bilingual lessons with a print and student view (`/teach/[slug]`) and a glossary (`/teach/glossary`); `/county` and `/county/[code]` side-by-side county profiles across the datasets, each with a picture for link previews (`/county/[code]/opengraph-image`: what LINE, Messenger and Slack show under a pasted link, with the county's outline and its air, warming, forest and roadkill figures, a dash where the atlas has none) and `/county/[code]/card`, a one-page report card to print or save as PDF, with all six findings and each one's limit and source (`src/lib/county-card.ts`, `src/components/county-card/`); every other page shares one atlas picture (`/opengraph-image`); a visitor can pin one county as "My county" (a button on the county profile and in the home page's county section; saved only in that browser, `src/components/pinned/`), and it then leads the Today strip with its own air and temperature (the middle of its stations, from `/api/today`'s `counties`), opens first on the home page and sits first, marked, in the weather table; **Ctrl+K** (⌘K on a Mac) opens search from any page; the "Cite this page" block on each history page also offers every chart as a PNG or SVG picture with its title, key and a source line baked in (`src/lib/chart-export.ts`, `src/components/trends/chart-picture.ts`); the atlas can be installed as an app (`src/app/manifest.ts`, icons in `public/` drawn by `scripts/make-app-icons.py`) and a service worker (`public/sw.js`) keeps the last copy of each live feed on the device, so a page that was opened before still opens with no connection and says plainly that its readings are a saved copy and from when (`src/lib/offline-copy.ts`; the home page's source list also shows each feed's own latest-reading time); `/feedback` suggestions and bug reports (opens the visitor's own email app addressed to the maker, shows the exact email first, and also links the public GitHub issues page; the footer on every page links here with the page it came from); `/search` finds any page, county, people, lesson, glossary word, animal, tree or village by English or Traditional Chinese (台 and 臺 are treated as one character; the header's magnifier links to it, and `?q=` makes a search shareable); the list it searches is `/search-index.json`, built once from the same data the pages use (`src/server/search-index.ts`), and the matching runs in the visitor's browser (`src/lib/search.ts`), so nothing typed is sent anywhere; `/api/today` a small summary (air, temperature, rain, reservoirs) behind the "Today" strip under the header and the "Today in Taiwan" panel beside the home-page map; `/api/hazards` the Central Weather Administration's felt earthquakes and tropical cyclone tracks, read server-side with `CWA_API_KEY`, cached 3 and 10 minutes, and honest about a feed that is down, unreadable or not configured (two optional explorer layers, `/explore?layers=typhoon,earthquakes`, and a place in the Today strip; a map of published data, not a warning; see `DATA_SOURCES.md`); `/data` actual processed downloads and JSON endpoints; `/sources` metadata, licences, limitations and station status; `/about` methodology.

County names are bilingual from official attributes. Original station names, cultural names and scientific names are preserved; translations are used only where available. CIP historical narratives remain original Traditional Chinese with an untranslated notice in English. No third-party address geocoder is implemented. Date filters operate on the selected dataset's actual records; they do not create missing observations or fetch a complete historical station archive.

`GET /api/atlas/{dataset}` supports county/date/category/species/search filters, pagination and descriptive county/time summaries. `format=csv` exports at most 5,000 matching records. `GET /api/atlas/map` returns viewport-filtered map collections with aggregation for large point inventories; grouped features carry their cell bounds (`x0..y1`, `cellKm`, `split`) and the top members, which the map draws as squares. Static files are cached per server instance and scanned in memory; these are not database spatial-index queries. Downloading the processed GeoJSON intentionally provides the full published static edition, including already generalized wildlife positions. Never deploy `data/raw/`.

County charts describe loaded station/sample coverage and unweighted means. They do not establish causal differences or an exposure/risk ranking, and the current minimum-measurement threshold does not guarantee matched sampling effort. Rainfall remains source-reported daily accumulation; it must not be summed across successive reports as independent rain.

See [ARCHITECTURE.md](ARCHITECTURE.md), [DATA_QUALITY.md](DATA_QUALITY.md), [DATA_SOURCES.md](DATA_SOURCES.md) and [FULL_PLATFORM_REPORT.md](FULL_PLATFORM_REPORT.md). [MILESTONE_1.md](MILESTONE_1.md) and [LAUNCH_AUDIT.md](LAUNCH_AUDIT.md) remain historical records of earlier work.

The interface refresh follows [DESIGN.md](DESIGN.md). Watermelon UI tabs, split-accordion and methodology-disclosure source are adapted to the existing stack; source links and the MIT notice are in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md). Browser checks include keyboard operation, mobile reflow, 200% text resizing and automated accessibility checks.

Animal names (`src/content/species-info.ts`) are resolved at display time from the scientific name, so the hash-checked public wildlife data is never edited. Seven names are marked provisional and one taxon has no confirmed Chinese name; `tests/species-info.test.ts` pins both lists. Animal and tree pages lead with a photo from `public/data/atlas/photos.index.json` (a list of Commons file paths, photographers and licences, not the image files; `tests/photo-index.test.ts` checks it), and the summary and further photos are fetched in the visitor's browser from Wikipedia and Wikimedia Commons, each with its photographer's credit and licence; no image is stored in this repository.
