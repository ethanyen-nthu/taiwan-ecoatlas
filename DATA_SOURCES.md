# Source registry and licences

The canonical typed registry is `src/lib/sources.ts`; the bilingual `/sources` view joins it with runtime observation/retrieval timestamps and status. Source identifiers are retained in records and database metadata. Cache intervals below are application policy, not promises of source publication frequency.

## Imported: official county boundaries

- Agency: Ministry of the Interior, National Land Surveying and Mapping Center (NLSC).
- Catalogue: https://data.gov.tw/en/datasets/7442
- Dataset: `7442`, archive `COUNTY_MOI_1140318`, edition **2025-03-18**.
- Official download URL, actual retrieval timestamp, archive/output SHA-256 and CRS WKT: `public/data/counties.metadata.json`.
- Licence: **Open Government Data License 1.0**, verified against the catalogue: https://data.gov.tw/license
- Updates: irregular; pinned to a reviewed edition, not silently refreshed.
- 22 units with original `COUNTYCODE`, `COUNTYNAME`, `COUNTYENG`. All polygons and islands retained, including features outside the default Taiwan/offshore view. Selection can therefore fit a county's distant administered islands.
- Source CRS: GCS_TWD97[2020] geographic, GRS80. Explicit PROJ operation `TWD97 to WGS 84 (1)` with 1 m stated accuracy, always longitude/latitude axis order. Output EPSG:4326, seven decimal places, no polygon simplification. This does not imply centimetre positional accuracy or establish legal boundaries.

## Integrated adapters: AQI

- Agency: Taiwan Ministry of Environment.
- Catalogue: https://data.moenv.gov.tw/en/dataset/detail/AQX_P_432
- Dataset: `AQX_P_432`; server key: `MOENV_API_KEY`.
- Licence: Open Government Data License 1.0, verified against the source catalogue.
- Source updates: hourly; application cache: 30 minutes. Observation timestamps more than two hours old are stale.
- Fields: station ID/name, county, longitude/latitude, reported AQI/status, PM2.5/PM10 (µg/m³), O3/NO2/SO2 (ppb), CO (ppm), `publishtime`.
- The source offers a report/publication time rather than a separate pollutant sampling time. The app uses `publishtime` as the reported observation time **and** publication time; these are not represented as independently measured timestamps. `ImportDate` is used only for upstream ordering.
- Official categorical status determines colour. Unknown status is grey; categories are never inferred from an AQI value. Cluster colour is a grouping cue, not a regional AQI estimate.
- Category swatches match the MOENV [official AQI indicator page](https://airtw.moenv.gov.tw/CHT/Information/Standard/AirQualityIndicatorNew.aspx) and its [published stylesheet](https://airtw.moenv.gov.tw/css/git_articlesFix.css): good `#009865`, moderate `#fffb26`, sensitive groups `#ff9835`, unhealthy `#ca0034`, very unhealthy `#670099`, hazardous `#7e0123` (checked 2026-11-15). Marker labels/popups carry text as well as colour.
- Requires a real key for end-to-end provider verification; fixtures test the documented schema only.

## Integrated adapters: CWA weather

- Agency: Central Weather Administration (中央氣象署).
- Documentation: https://opendata.cwa.gov.tw/devManual/description
- Official schema PDF inspected: https://opendata.cwa.gov.tw/opendatadoc/Observation/O-A0003-001.pdf (v1.05, shared O-A0001/O-A0003 standard).
- Catalogues: https://data.gov.tw/dataset/9178 and https://data.gov.tw/dataset/9176
- Datasets: `O-A0003-001` ten-minute synoptic observations, `O-A0001-001` hourly station observations. The governmental catalogues list ten-minute and hourly updates respectively; CWA platform metadata may describe release refreshes differently. Do not confuse refreshes with observation timestamps.
- Licence: Open Government Data License 1.0 verified in both government catalogues; additional CWA platform usage rules: https://opendata.cwa.gov.tw/about/rules
- Server key: `CWA_API_KEY`; application cache: 10 minutes; >2-hour observations are stale, individually assessed at each station.
- Explicitly select `CoordinateName=WGS84`. Never relabel TWD67 as WGS84. Merge by original station ID, keep the newest timestamp and originating dataset ID.
- Temperature °C, daily accumulated precipitation mm (`WeatherElement.Now.Precipitation`), relative humidity % (already percentage, **not** a fraction), wind m/s and degrees.
- Codes `X`, `T`, -99, -98 and variable wind direction 990 remain null in the numeric representation; “trace” rainfall is not converted to zero. Legitimate subzero air temperatures are retained. Future enhancement: preserve special-code semantics alongside numeric nulls.
- Observation time is from `ObsTime.DateTime`; publication time is **not supplied** by this adapter. Retrieval time is separately recorded. No continuous temperature surface or shade estimate is generated.
- Both network requests must validate before replacing a complete weather snapshot; partial upstream failure retains the previous complete snapshot as stale.
- Authenticated live provider results remain unverified until a real key is configured.

## Planned, not downloaded or verified in Milestone 1

These are explicit dependencies for later milestones. Supplied licence/coverage claims are recorded as provisional; no associated measurements, coordinates, classes, or derived statistics are shown.

| Source | Original source / dataset | Licence and coverage to verify | Milestone |
| --- | --- | --- | --- |
| River quality, MOENV | https://data.moenv.gov.tw/en/dataset/detail/WQX_P_01 · `WQX_P_01` | Verify source metadata/licence and release frequency. Physical sampling, not live sensors. Keep sampling/publication dates separate. Proposed cache 7 days. | 2 |
| Historical land cover | https://zenodo.org/records/14033363 | Verify licence, actual 2013/2023 files, class codebook, CRS, no-data masks and projection suitability before calculating any areas. Version-based refresh. | 3 |
| Taiwan Roadkill Observation Network | https://portal.taibif.tw/en/dataset/046bcff5-591c-41d7-99d2-a0e7b54ea3c8 · https://www.gbif.org/dataset/db09684b-0fd1-431e-b5fa-4c1532fbdb14 | Brief specifies CC BY 4.0, 46,416 records, 2011–December 2017; independently verify the published archive before import. Historical only. Refresh by published version. | 3 |
| Indigenous village GIS, CIP | https://data.cip.gov.tw/API/v1/dump/datastore/A53000000A-111027-001 · https://data.gov.tw/dataset/156632 | Brief specifies Open Government Data License, annual updates; verify latest metadata, record dates, public-coordinate restrictions and naming fields. Proposed cache 30 days. | 4 |
| Green spaces/public trees | Municipal sources not selected | No national coverage asserted. Must select exact catalogues and verify licences and completeness. No substitute dataset is imported. | 4 |
| Satellite land-surface temperature | Source not selected | Must verify measurement, acquisition dates, quality masks, spatial resolution and licence. Kept separate from air temperature. | 4+ |
| Sentinel-2 Level-2A | https://stac.dataspace.copernicus.eu/v1/ · `sentinel-2-l2a` | Future integration only; inspect STAC metadata/licence/cloud coverage. A revisit is not a guarantee of a clear usable image. | 5 |

## Basemap attribution

Default style: https://tiles.openfreemap.org/styles/liberty

OpenFreeMap uses OpenMapTiles/OpenStreetMap-derived geography. MapLibre renders the provider's attribution and an explicit OpenFreeMap/© OpenStreetMap/NLSC attribution. See https://openfreemap.org/quick_start/ and https://www.openstreetmap.org/copyright. This basemap supplies context; official county selection uses dataset 7442 alone.
