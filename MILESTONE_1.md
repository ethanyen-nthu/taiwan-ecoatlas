# Milestone 1 completion report

This is the original **pre-launch local verification snapshot**. The subsequent public launch, live API verification and current test results are documented in [LAUNCH_AUDIT.md](LAUNCH_AUDIT.md).

Verified locally on **15 November 2026 (Asia/Taipei)**. Scope is Milestone 1 only. No public deployment is claimed.

## Implemented and working

- Next.js App Router, strict TypeScript, React, Tailwind, Lucide and lazy-loaded MapLibre/Recharts.
- English / Traditional Chinese navigation, language preference persistence, responsive homepage, explorer and all ten requested routes. Later theme pages disclose their unimported dependencies rather than showing demonstration data.
- OpenFreeMap Liberty basemap, configurable public style URL, visible attribution and a plain-background fallback retaining the official county layer.
- **22 official NLSC county/city geometries**, bilingual original names, hover/selection/highlighting, exact spatial county filtering, search by county or loaded station, zoom, reset and fullscreen controls.
- Initial `fitBounds` includes Taiwan, Penghu, Kinmen, Matsu, Green Island and Orchid Island. The initial desktop map accounts for the regional panel. All original county geometry is retained, including distant islands outside that initial view.
- Central eleven-layer catalogue, working county/AQI/weather toggles, legends, unavailable states for future datasets, temporal filters confined to actual latest observation reports.
- Server-only MOENV AQX_P_432 and both CWA observation adapters; validated values/coordinates/timestamps, deduplication, source-reported AQI categories with verified MOENV swatches, point clustering and provenance popups.
- Source registry with agency, original URL, ID, licence, expected updates, observation/publication/retrieval times and synchronization state.
- No-key startup, source timeouts/retries, per-instance request coalescing and backoff, last-valid stale fallback, optional Supabase durable snapshots/sync audit, protected ingestion endpoint.
- PostGIS foundation migration with spatial indexes, unique observation constraints, RLS and read-only published access. Latest snapshots are separate from historical observation tables.
- Reproducible boundary conversion/validation, optional idempotent Supabase seed, CI workflow and opt-in hourly refresh workflow.
- Local Git initialized on **main**; lockfile and deployment instructions prepared. No remote is configured, and no commits were made.

## Files created

| Location | Contents |
| --- | --- |
| `src/app/` | Ten page routes, API routes, layout/metadata, design system, icon and error/404 handling |
| `src/components/` | Bilingual providers, navigation/footer, homepage, explorer/MapLibre lifecycle, source registry, topic pages and conditional observation chart |
| `src/lib/` | Source/layer registries, types, geographical filters, transformations, official AQI colours and freshness rules |
| `src/server/` | Credential-isolated HTTP adapter, observation cache, Supabase snapshots and sync logging |
| `public/data/` | Official derived county GeoJSON and processing/provenance/checksum metadata |
| `scripts/` | Geospatial requirements, boundary conversion/validation and database seed |
| `supabase/migrations/202611150001_foundation.sql` | Counties, sources, sync runs, snapshots and prepared AQI/weather history schemas; PostGIS/RLS/indexes |
| `tests/` | Clearly synthetic test fixtures, unit/API/geography checks and six browser scenarios |
| `.github/workflows/` | CI and explicitly opt-in snapshot refresh |
| Root configuration | `package.json`, `pnpm-lock.yaml`, strict TS/Next/PostCSS/ESLint/Vitest/Playwright configuration, `.gitignore`, `.env.example` |
| Root documentation | `README.md`, `DATA_SOURCES.md`, `ARCHITECTURE.md`, `DATA_QUALITY.md`, this report |

## Verification performed

| Check | Result |
| --- | --- |
| TypeScript type checking | Passed; script generates Next route types first for clean checkouts |
| ESLint | Passed, zero warnings |
| Vitest | **49 passed**, covering real official geometry, coordinate reversal, offshore islands, missing values, explicit WGS84 selection, duplicates, report freshness, future timestamps, retry behavior, last-valid retention/cold-start restoration, preservation of last-success sync timestamps, bbox validation and ingestion authorization |
| Python geographic validation | Passed: checksum, EPSG:4326, 22 unique valid/nonempty county geometries and all required offshore reference points |
| Production build | Passed; all ten pages and API handlers generated without credentials |
| Chrome browser tests | **6 passed**: real county-source readiness; toggles preserve the map canvas; county selection/reset; bilingual controls; no-key/invalid API calls; mobile panel/navigation; failed basemap fallback; date filtering; source/last-retrieval/licence in popup; all routes and homepage layouts |
| Visual inspection | Desktop homepage/explorer and mobile explorer screenshots inspected; actual basemap and county vectors are visible |
| Dependency compatibility | `pnpm peers check` passed; exact package versions and lockfile retained |
| Frozen offline install | Passed with the final resolved package lockfile |
| Production fixture isolation | No synthetic fixture station names or browser test IDs found in built client assets |
| Authenticated government API calls | **Not verified: keys not supplied** |
| Supabase migration/RLS/REST integration | **Not verified against a live database: credentials not supplied** |
| GitHub Actions on hosted runner | Prepared, **not executed on GitHub** |
| Public deployment | **Not created or verified** |

The default MapLibre 6 worker URL did not survive the initial bundling. It was corrected with an explicit emitted module-worker asset, and readiness now waits for the official county source instead of treating control initialization as successful vector rendering. Both real basemap rendering and failure fallback passed afterward.

Turbopack's internal subprocess port was blocked by the desktop sandbox, including the attempted expanded-permission run. Next.js's supported Webpack build passed and is explicitly configured. This is a local tooling workaround, not a framework change. ESLint 9 / TypeScript 6 are pinned to satisfy the installed Next lint plugins' peer ranges; update them when those plugins support newer major versions.

## Configuration still needed

1. **Live station observations:** put real `MOENV_API_KEY` and `CWA_API_KEY` in `.env.local` or Vercel's server environment. Restart/redeploy, inspect `/sources`, then verify authenticated records and exclusion counts.
2. **Durable snapshots:** create/link Supabase, apply the migration, configure `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`, run the documented seed, then verify a successful snapshot write and subsequent restore. The browser anon key is reserved but unused in this milestone.
3. **Publication:** create/select a GitHub remote, review/commit/push `main`, import it into Vercel and configure production/preview environments. Verify the actual deployment URL before calling it deployed.
4. **Optional hourly refresh:** only after the deployed endpoint and database are verified, set matching `CRON_SECRET`, `ECOATLAS_ORIGIN` and opt-in `ECOATLAS_INGEST_ENABLED=true` as documented. This updates latest snapshots, not historical time series.

Exact commands, account setup and environment-variable purposes are in `README.md`.

## Known limits and next milestone

The app works locally without any provider or Supabase credentials. In that state the official county map and navigation work; observation layers explicitly say not configured. Cache durability across restarts requires Supabase. Date filtering is limited to the latest loaded reports. Full-detail geography is ~8.2 MB before compression. Source station proper names are retained rather than inventing translations. Search is county/loaded-station search, not an address geocoder. No historical forest, roadkill, village, park, tree or satellite data has been silently substituted or imported.

**Next: Milestone 2**, adding verified river sampling data, persistent environmental observation history, county comparisons and expanded source synchronization. It has not been started.
