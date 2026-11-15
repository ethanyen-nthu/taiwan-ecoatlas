# Data quality and scientific limitations

## Implemented checks

1. **Provenance**: official source URL, dataset identifier, agency, licence, original IDs, successful retrieval time and observation/publication time where supplied.
2. **Coordinates**: require finite numeric coordinates in the Taiwan station domain (117–125°E, 20–27°N); reject reversed axes, absent coordinates, zero coordinates and out-of-domain points. Do not silently swap coordinates. This domain deliberately excludes distant CWA stations outside the requested Taiwan/offshore extent. Excluded counts are reported.
3. **County geometry**: official download only; inspect CRS; require all 22 unique units with valid nonempty geometry. Explicit non-ballpark TWD97→WGS84 conversion with longitude/latitude axis order. Retain all vertices at seven decimal places. Validate offshore reference points and output checksums. Precision is not positional accuracy; the selected operation states 1 m accuracy.
4. **Missingness**: missing/empty/non-numeric pollutant values remain null. AQI/pollutants/rainfall/wind speed cannot be negative; humidity 0–100%; temperature -50–60°C; wind direction 0–360°. CWA sentinels X/T/-99/-98/990 are never used as numeric measurements. Zero is valid. Special trace/variable/sensor-failure semantics are not yet separately exposed after normalization.
5. **Identity and duplicates**: preserve station identifiers; collapse duplicate station reports to the newest UTC timestamp, report duplicate count. Database history uniqueness is source + station + observation time. No invented IDs are substituted for missing source IDs.
6. **Time**: normalize local AQI report times as UTC+8; accept CWA ISO timestamps. Reject unparseable dates and reports >5 minutes in the future. Compare freshness to observation time; render Taiwan dates in Asia/Taipei. CWA publication time is absent, not inferred from retrieval.
7. **Atomic validation**: reject an empty/unrecognized/all-invalid upstream dataset. Do not overwrite a successful snapshot with malformed or incomplete network data. In the current implementation, a partly invalid station array publishes its valid rows and reports exclusions; schema drift should be investigated when exclusions increase.
8. **Failures**: no-key → not-configured; no valid snapshot + failed source → unavailable; valid previous snapshot + failed refresh → stale. Do not change successful retrieval times on failure. Retain last-valid data across restarts only with configured, migrated, reachable Supabase.

## Freshness interpretation

AQI cache = 30 minutes; CWA cache = 10 minutes. A station report more than two hours old is stale. These are initial application policies, not a statement that all government stations update at the same cadence. Dataset status describes the newest valid report and does not imply every station is fresh. Point popups separately inspect each station timestamp; layer panels disclose this distinction. Historical-only is a separate supported status reserved for imported archives in later milestones; no unimported archive is presented as available.

`AQX_P_432.publishtime` is the source-reported report time, used as observation/report time as well as publication time. A separate pollutant measurement interval is not available through this adapter. Air temperature is measured at a station; no nationwide interpolation, street-level heat or shade estimate is produced.

## Known first-milestone gaps

- No MOENV/CWA keys were provided. Adapters are tested against explicit synthetic, documented-shape fixtures; successful authenticated provider calls require actual configuration and remain unverified.
- No Supabase credentials were provided. SQL migrations, seeding, RLS and REST persistence code are prepared but not applied or integration-tested against a live database.
- Snapshot persistence is not historical data storage. Prepared observation tables are not populated yet. Date controls filter only latest loaded reports; historical dates typically yield zero points, not synthesized records.
- County filtering is spatial. An offshore/marine station outside a county polygon can be omitted even if the provider assigns a county name; both original county and coordinates are retained.
- County geometry includes distant administered islands as supplied by NLSC. Initial fit targets the requested Taiwan/offshore view, not every far-away polygon. Selecting a county may zoom out to include its distant islands.
- Full-detail county geometry is a deliberately preserved ~8.2 MB GeoJSON. No lossy simplified substitute is silently shown. First-load performance on slow mobile links can be improved with future vector tiling.
- Browser geocoding is county/loaded-station search, without an external address service.
- Source labels/descriptions/navigation are bilingual. Official station proper names and untranslated source categories are preserved instead of inventing translations. Source licence names and dataset codes may remain in their canonical language.
- Basemap tiles/fonts/sprites depend on OpenFreeMap availability. Plain-background official geometry is the fallback. WebGL support is necessary for the interactive map.
- In-memory request coalescing/backoff is not a distributed API quota guarantee. Review upstream quotas before large public traffic.
- Future land cover, roadkill, village, park, tree and satellite datasets are not downloaded or licence-verified yet. Their UI explicitly says not imported. The roadkill archive dates in the brief are provisional until independently inspected.

## Constraints carried into later milestones

River samples must retain sample dates and lab/publication dates separately. Forest class codes and no-data values must come from the actual codebook; area must use a suitable projected CRS (EPSG:3826 only where appropriate, not automatically for Kinmen/Matsu). Citizen roadkill density is subject to sampling bias, not direct risk. Sensitive wildlife/cultural coordinates require source/community restrictions to be honoured. Village points do not establish territories. Municipal inventories are not nationwide coverage. Satellite land-surface temperature is not air temperature. Cloud cover and processing delays constrain satellite availability. No future capability is represented as current.

Tests use clearly named synthetic fixtures **only inside tests**. No app route, download, chart or production empty state imports those fixtures.
