# Taiwan EcoAtlas / 臺灣環境與文化地圖

A bilingual environmental and cultural geography explorer. **Milestone 1** provides a working official county map, source registry, AQI/CWA adapters, explicit data availability states, and a deployable Next.js foundation. No measurements are fabricated. Later datasets have documented empty states.

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

| Variable | Purpose | Browser exposure |
| --- | --- | --- |
| `MOENV_API_KEY` | AQX_P_432 observations | Never |
| `CWA_API_KEY` | O-A0003-001 and O-A0001-001 | Never |
| `NEXT_PUBLIC_BASEMAP_STYLE` | Configurable MapLibre style URL; defaults to OpenFreeMap Liberty | Public, build time |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project HTTPS URL | Safe public project identifier |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Reserved for later read-only clients; unused by Milestone 1 | Safe only with RLS |
| `SUPABASE_SERVICE_ROLE_KEY` | Optional durable snapshots and sync logging | Never |
| `CRON_SECRET` | Bearer authentication for POST `/api/ingest` | Never |

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

Historical observation tables are prepared but **not populated by Milestone 1**. Persistent observation history is Milestone 2, distinct from the latest-snapshot cache.

## Official geography

See [DATA_SOURCES.md](DATA_SOURCES.md). The checked-in GeoJSON comes directly from [official dataset 7442](https://data.gov.tw/en/datasets/7442), edition 2025-03-18. Reproduce it with Python 3.12:

```sh
python3 -m venv .venv
.venv/bin/python -m pip install -r scripts/requirements.txt
# Download the official ZIP URL recorded in public/data/counties.metadata.json.
.venv/bin/python scripts/import_counties.py /path/to/official-counties.zip
.venv/bin/python scripts/validate_counties.py
```

The import refuses missing CRS, invalid geometry, duplicate county codes and ballpark transformations. It records SHA-256 checksums, source WKT and the 1-metre-accuracy TWD97→WGS84 operation. Original vertices are retained, rounded to seven decimal places; no topology simplification is applied. Raw ZIPs belong outside Git. GeoJSON is ~8.2 MB uncompressed, deliberately preserving official detail; vector tiles are a future optimization.

## GitHub and Vercel

The public repository is [ethanyen-nthu/taiwan-ecoatlas](https://github.com/ethanyen-nthu/taiwan-ecoatlas), with production branch `main`. Public deployment verification is recorded in [LAUNCH_AUDIT.md](LAUNCH_AUDIT.md).

1. Create an empty GitHub repository in your account, then connect it as `origin`.
2. Review files and run the checks above. Commit and push `main`.
3. In Vercel, import that GitHub repository, select **Next.js**, Node.js **24**, install command `pnpm install --frozen-lockfile`, and build command `pnpm build`. Leave the output directory at its Next.js default.
4. Set MOENV/CWA variables for Production and the intended Preview environments. Add Supabase/cron variables only when those services are configured. Public variables require rebuilding when changed.
5. Set the production branch to `main`. Connected pushes build production; pull requests create previews.
6. Verify the returned deployment URL: open `/explore`, inspect `/sources`, and check `/api/status`. A successful local build is not evidence of a live deployment.

CI validates types, lint, unit tests, production build, browser behavior and geographic integrity. Browser tests deliberately run without real keys. For locally installed Chrome, set `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` to its executable instead of downloading Playwright Chromium.

The separate release suite makes real, read-only requests without mocking APIs or starting a local server:

```sh
ECOATLAS_BASE_URL=https://your-public-production-domain pnpm test:production
```

It checks all routes and language switching at desktop, tablet and mobile widths, all 22 county selections, the downloaded boundary checksum, private-file exclusions, and actual fresh AQI/weather reports in map popups. Missing keys, unavailable/stale providers and authentication-protected URLs fail this suite. Do not substitute the no-key browser suite for public release verification. Use `--grep 'public|private'` only for presentation checks while credentials are pending, and report the live-provider checks separately.

In the Vercel project's **Settings → Environment Variables**, add `MOENV_API_KEY` and `CWA_API_KEY` as **Secret** variables targeting **Production**. Add Preview only if those deployments should also access the providers. Enter values directly in Vercel; do not paste them into chat, GitHub, client code or variables beginning `NEXT_PUBLIC_`. Redeploy after saving because environment changes apply to new deployments. Verify `/api/status`, both observation endpoints and the complete release suite afterward. Neither a variable's presence nor a green build establishes that the provider accepted its value.

See [LAUNCH_AUDIT.md](LAUNCH_AUDIT.md) for the current launch audit; the original milestone report records an earlier local-only verification.

## Optional hourly snapshot refresh

The GitHub Actions refresh workflow is disabled until repository variable `ECOATLAS_INGEST_ENABLED=true`. Before enabling, configure a deployed HTTPS `ECOATLAS_ORIGIN`, the matching GitHub/Vercel `CRON_SECRET`, both provider keys, and Supabase migration/seed. The hourly workflow POSTs to `/api/ingest`, which uses the same validated adapters, cache and write controls. Failed or stale refreshes fail the job; sync logs retain generic error codes without credentials. Schedules may be delayed by GitHub and do not guarantee exact collection times.

This refresh saves the **latest snapshot**, not a complete time series. Do not enable it expecting historical ingestion yet. No Vercel Hobby hourly cron is used.

## Routes and scope

`/` overview; `/explore` interactive atlas; `/environment` AQI/weather status; `/forests`, `/wildlife`, `/culture`, `/urban` documented theme pages; `/data` real geography downloads and JSON endpoints; `/sources` metadata and live synchronization status; `/about` methodology.

County names are bilingual from official attributes. Original station names and reported AQI categories are preserved; verified translations are used only where available. Search covers counties and loaded station names, not a third-party address geocoder. Date filters apply to the latest loaded AQI/weather reports, not an unimplemented historical archive. Forest, wildlife, cultural and urban inventories are not imported in this milestone.

See [ARCHITECTURE.md](ARCHITECTURE.md), [DATA_QUALITY.md](DATA_QUALITY.md) and [MILESTONE_1.md](MILESTONE_1.md).

The interface refresh follows [DESIGN.md](DESIGN.md). Watermelon UI tabs, split-accordion and methodology-disclosure source are adapted to the existing stack; source links and the MIT notice are in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md). Browser checks include keyboard operation, mobile reflow, 200% text resizing and automated accessibility checks.
