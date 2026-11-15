# Architecture — Milestone 1

## Application boundaries

Next.js App Router, TypeScript, React, Tailwind 4 and Lucide form a single Vercel-compatible application. Custom CSS defines the scientific explorer design system. Heavy map/chart modules load dynamically in client components. Recharts displays counts only when real AQI observations are available. No FastAPI service is needed for this milestone; GeoPandas/Shapely/PyProj run offline.

```text
Browser / explorer controls
 ├─ local official county GeoJSON → one MapLibre instance
 ├─ OpenFreeMap Liberty / configurable public style
 └─ same-origin Next.js observation API
      ├─ input validation / cache / concurrent request coalescing / backoff
      ├─ server-only MOENV + CWA adapters → validation + UTC normalization
      └─ optional Supabase REST (service role, never in browser)
           ├─ latest valid source snapshot
           ├─ source metadata status/timestamps
           └─ source synchronization audit log
```

## Code ownership

- `src/app`: all ten routes, metadata, route handlers, global styles, error/404 boundaries.
- `src/components/map`: responsive explorer UI and lifecycle-isolated MapLibre renderer.
- `src/components/providers.tsx`: language preference and deduplicated SWR requests. Components use `t(en, zh)`; original source proper names remain unaltered.
- `src/lib/sources.ts`, `layers.ts`: typed source and eleven-layer registry, bilingual descriptions, legends/colour metadata, temporal applicability, availability flags.
- `src/lib/transform.ts`, `geo.ts`, `freshness.ts`: pure validation, normalization, source-reported classifications, coordinate/county checks, configurable freshness thresholds.
- `src/server`: `server-only` network adapters, retries/timeouts, cache, durable snapshots and sync logs.
- `scripts`: reproducible official-boundary conversion/validation and optional idempotent database seed.
- `tests`: explicitly synthetic, source-shaped fixtures; independent geographic, adapter, retry, freshness and browser checks.

## Map lifecycle

The dynamically loaded renderer initializes once per mount and destroys the map, workers, event handlers and resize observer on unmount. React effects update existing sources, visibility and selection filters. Layer toggles do not recreate the map. County hover uses feature state; selection uses official county codes. Geometry always uses longitude, latitude / EPSG:4326. `fitBounds` includes the required offshore islands; full geometry is retained even outside that starting extent.

Station GeoJSON sources cluster at low zoom; clicking a cluster expands it. Point popups use DOM text content rather than unsanitized HTML. Point sources retain source IDs, values and timestamps. County filters use exact point-in-official-polygon tests rather than name guesses. Date filters use Taiwan calendar days and only affect actual temporal observation layers. They do not fetch historical data. County names and loaded station names are searchable; address geocoding is not implemented.

If a style request fails, a plain-background style plus official county geometries remains usable. Tile failures show a visible warning. WebGL failure gets its own accessible empty state. No invented geometry is used as fallback.

For the bounded AQI/CWA station networks, the client loads the current station set. `GET /api/observations/{aqi|weather}?bbox=west,south,east,north` offers validated viewport response filtering, but still fetches/caches each provider's full current network. Future large wildlife/tree inventories must use indexed database viewport queries and pagination; they must not reuse an all-record download approach. Full-detail county GeoJSON is ~8.2 MB before HTTP compression; preserving boundary detail is an explicit first-milestone tradeoff.

## Data lifecycle

Public route → validate dataset and optional bbox → check credential presence → in-process cache → optional durable snapshot → upstream request → schema/coordinate/time validation → per-station deduplication → atomically replace last-valid dataset → optional durable snapshot and sync-log write → response with source/status/exclusion counts/timestamps.

AQI caches for 30 minutes; weather for 10 minutes. A per-source in-flight promise coalesces simultaneous refreshes. A failed refresh backs off for 60 seconds, retains last-valid observations, preserves the successful retrieval timestamp and marks the result stale. Empty failures remain unavailable. Cached records age according to **observation** time. Both weather networks validate before replacing a complete weather snapshot. Retries cover transient errors; authorization/client errors are not retried. Network calls have timeouts; logs contain generic events and source IDs, never raw errors with credential-bearing URLs.

The application uses refresh-on-read with stale-on-failure, rather than an untracked background refresh that Vercel could terminate. SWR retains prior client results on application-network errors and marks them stale. Without Supabase there is no durable cache and no global rate limiter across serverless instances; cache/backoff/coalescing constrain traffic within an instance only. A distributed limiter may be appropriate before high-traffic public operation.

`POST /api/ingest` requires a constant-time-checked Bearer cron secret. It refreshes via the same cache policy; it does not bypass source validation or store a historical time series. GitHub Actions hourly scheduling is explicitly opt-in, separate from Vercel Hobby Cron.

## Database

Migration uses PostgreSQL/PostGIS with the extension in `extensions` and UTC `timestamptz` fields. RLS permits only published reads by `anon`/`authenticated`. No client mutation policy exists. Trusted service-role calls alone write imports, snapshots and logs.

| Table | Milestone 1 role |
| --- | --- |
| `environmental_sources` | Canonical identity, agency, source URL, licence, policy and runtime sync metadata |
| `source_sync_runs` | Generic success/failure audit, accepted/excluded/duplicate counts |
| `counties` | Official `MultiPolygon,4326`, bilingual names, source, edition; GiST index |
| `source_snapshots` | Private latest-valid JSON dataset per source; no public select |
| `aqi_observations` | Prepared future history schema; `Point,4326`, nullable pollutants, unique source/station/time, spatial/time indexes |
| `weather_observations` | Prepared future history schema; `Point,4326`, explicit daily rainfall and originating dataset, unique source/station/time, spatial/time indexes |

Future migrations will add `river_monitoring_stations`, `river_samples`, `roadkill_observations`, `indigenous_villages`, `landcover_county_summaries`, `urban_green_spaces`, and `tree_locations` alongside their verified ingestion workflows. They are intentionally not implemented ahead of their milestone. Projected area calculation, rasters, STAC and heavy satellite processing belong in separate offline/background jobs, not request handlers.

## Deployment

Next.js builds without credentials, network fonts or remote build-time data. Public style variables are read at build time; secret credentials are read by server modules at runtime. No hardcoded deployment origin is used by the frontend. A GitHub main branch can connect to Vercel production; PRs can use previews. Only `.env.example` is tracked. No deployment/account credentials were provided or fabricated.
