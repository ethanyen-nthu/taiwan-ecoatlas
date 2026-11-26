# Source registry and licences

The agency registry is `src/lib/sources.ts`; imported editions also have bilingual manifests under `public/data/atlas/`. `/api/atlas` joins these with API adapter metadata. `/sources` and `/data` expose actual licences, source IDs, dates, coverage limits and processed downloads. Cache intervals are application policy, not source publication promises. Launch checks quoted below are dated historical evidence, not proof that the expanded release is deployed.

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
- The live MOENV response is a station array; the adapter also accepts a `records` wrapper. Both forms undergo identical validation. An authenticated production request on 2026-11-15 returned 84 valid real observations; a public map popup was verified. See `LAUNCH_AUDIT.md` for the recorded check.

## Hand-compiled long-run PM2.5 record (`/environment/air-over-time`)

- File: `src/content/air-history.ts`. It is the only air-quality history on the site: the live adapter above keeps no archive, so the long view is compiled by hand from published figures, each with a source id that resolves to a link in `airSources` (a test fails if a figure cites an unknown source or a source is not an https link).
- Series: national annual-average PM2.5 (µg/m³, ministry standard method, 31 stations) for 2013–2019 and 2022–2025, and a central-and-southern-Taiwan average for 2016, 2019 and 2025 only. Reference lines: the former (15) and current (12, since 30 September 2024) Taiwan annual standards and the WHO 2021 guideline (5).
- **2020 and 2021 are deliberately not plotted.** Preliminary and final figures for those years disagreed across the sources found, and conflicting figures are never averaged or picked. The page says so and draws a labelled gap. Add them once final annual values are confirmed against a ministry release.
- Not live and not county-level: the page states this. Annual ministry averages (12.8 in 2025) differ from IQAir's (13.3) because the methods differ; the page tells students not to mix them on one axis.
- To extend it: add a point to `nationalPm25` with its `sources`, update `yearSpan` and `gapYears`, and run `npm test`. The MOENV datasets that would allow a proper archive (AQI overview `89029`, pollutant concentrations `89030`) were not reachable from the build environment; persisting hourly snapshots from `AQX_P_432` going forward is the other route.

## Other "compared with before" pages

All of these live in `src/content/` and `src/components/trends/`. Hand-copied figures carry source ids that resolve to a link in the module's source list (`tests/history-data.test.ts` fails if a source is not a unique https link, a figure cites an unknown source, or the arithmetic no longer matches the published percentages). Figures counted from the atlas's own files are stored in `src/content/year-summaries.json`, produced by `node scripts/build-year-summaries.mjs`; `tests/year-summaries.test.ts` recounts them from the data files and fails on any drift.

- **Rivers (`/environment/rivers-over-time`, `river-history.ts`).** Severely polluted monitoring stations: 66 of 293 (2002), 7 of 303 (2024) and 2 (2025, network size not given); severely polluted share of river length 14% (2002) and 1.9% (2025). From Ministry of Environment statements reported by UDN, the Executive Yuan and PTS. Station counts of different network sizes are never turned into shares. Years between are not drawn.
- **Forests (`/forests/over-time`, `forest-history.ts`).** Forestry Bureau 3rd (completed 1995, 58.53% of 3,591,500 ha) and 4th (completed 2015, 60.71%, including Kinmen and Lienchiang) national inventories, forest per person (0.199 ha in 1957 to 0.092 ha), plantation change (−66,000 ha) and forest-type shares. The atlas's own 2023 land-cover map (58.4% of the 36,384 km² mapped in 19 counties, computed from `landcover-2023.statistics.json`) is drawn apart as a hatched bar because its method and denominator differ; the page says it is not a third point. A raster comparison of 2015 and 2023 was not attempted.
- **Wildlife (`/wildlife/year-by-year`).** Counts of the screened roadkill subset (10,841 records, 2014–2017) by year, county, animal group and month. Records measure reporting effort as well as roadkill: 1,157 of the 5,013 records in 2017 are from Lienchiang County (12 in 2016), so the rise without it is 71%, not 121%. No records exist for November and December 2014, drawn as gaps.
- **Population (`/culture/population`, `population-history.ts`).** Registered Indigenous people at three year-ends only: 519,984 (2011) and 576,792 (2020) from the national row of Taichung City's statistical bulletin 110-03-01 (Ministry of the Interior data), and 629,456 (2025) from the Ministry of the Interior's week 8 of 2026 bulletin, with the 2025 breakdown by people, county and median age. The registry counts people registered with Indigenous status; registration of the 10 Plains peoples waits on recognition under the law promulgated 23 October 2025. The years between are at data.gov.tw dataset 9605 and are not copied here.
- **Parks (`/urban/over-time`).** Taipei parks, squares and green spaces (data.gov.tw 128366) by decade of recorded construction year: 777 of 812 have a year. Counts show parks that exist today, the 2020s cover only 2020–2025, and Taipei only.
- **Tree surveys (`/plants/surveys`).** Park-tree (85,177 records, 481 undated) and riverside-tree (10,735 records, 2 undated, one survey spanning 2016-11-04 to 2017-06-16) records counted by survey year. The date is a survey date, not a planting date or a count of trees that existed; 2017–2021 have no park-tree records and are drawn as gaps.
- **Not built, and why:** a temperature page (the Central Weather Administration's six-station and 11-station series are not comparable) and county-level histories (no traceable published series).

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
- Authenticated production requests to both networks were verified on 2026-11-15: 874 valid station observations after validation/deduplication, with a real public map popup. Counts vary as the providers update; see `LAUNCH_AUDIT.md`.

## Integrated adapters: WRA reservoir storage (`/environment/reservoirs`)

Two Water Resources Agency datasets under the Open Government Data License 1.0, read server-side from `https://opendata.wra.gov.tw/api/v2/<id>` (no API key; `page` and `size`, at most 1,000 rows per page) and cached for 30 minutes:

- `2be9044c-6e44-4856-aad5-dd108c2e6679` (data.gov.tw 45501, 水庫水情資料): latest storage and water level, hourly for automatic reservoirs or once a day for hand-read ones. Fields used: `reservoiridentifier`, `observationtime`, `effectivewaterstoragecapacity` (萬 m³), `waterlevel` (m), `accumulaterainfallincatchment` (mm). On 26 Nov 2026 it returned 449 rows (about the last 24 hours) for 58 reservoirs.
- `51023e88-4c76-4dbc-bbb9-470da690d539` (data.gov.tw 41568, 水庫每日營運狀況): `reservoirname`, `capacity` (effective capacity, 萬 m³) and `nwlmax` (full water level). 68 reservoirs on 26 Nov 2026.

The feeds return a bare array of rows with every value a string and every gap an empty string; gaps stay null, never zero. Neither feed carries a storage percentage or a name next to the storage figure, so the atlas joins them on the reservoir number and computes percent full as storage ÷ effective capacity, unrounded and never capped (a reservoir can exceed 100% when the two figures are not from the same moment or the listed capacity is out of date; the page hatches and labels those above 100.0% after rounding). Storage is shown in million m³ (萬 m³ ÷ 100). The data page labels `nwlmax`'s unit as 萬 m³, but the values are elevations (Shihmen's is 245), so it is read as metres; "below full level" is `nwlmax` minus `waterlevel`. The first two digits of the reservoir number give the region (10 north, 20 central, 30 south, 40 east, 50 offshore islands). For each reservoir the newest reading that has a storage figure is used; its own reading time is shown. Three reservoirs have no name and two have no capacity in the daily list; they appear with dashes. Large means 10 million m³ of effective capacity or more.

No history is kept or shown: the feed holds only about a day, so there is no "compared with before" page for reservoirs, and none is estimated. English names are given for 15 well-known reservoirs; the rest keep the published name.

## Weather page (`/environment/weather`)

Uses the CWA station readings described below, with no new source. Each county is summarised by its middle station (median) with the coolest and warmest station beside it; humidity is the middle station's; rain and wind are the highest at any station in the county. Rain is the running total so far today. Nothing is interpolated or stored, and there is no comparison with normals because the atlas holds none.

## Integrated river sample adapter

- MOENV [WQX_P_01](https://data.moenv.gov.tw/en/dataset/detail/WQX_P_01), **Open Government Data License 1.0**, using server-side `MOENV_API_KEY`.
- Monthly field sampling with publication lag. The adapter requests at most **10,000 indicator rows**, not the complete archive; caches in process for six hours; it is not part of persistent snapshot/history ingestion.
- Public verification on 2026-11-16 returned **1,000 indicator rows**, grouped into 39 dated samples across six counties in the checked response. Counts can vary between provider responses and server instances. The actual row count is displayed, and Chinese/English metadata schemas are both supported.
- Rows group by original station ID and sampling date. Repeated indicators are deduplicated. DO, BOD, suspended solids and ammonia nitrogen require recognized mg/L units. RPI is retained only when source-reported, not invented from replacement values.
- Sampling and retrieval dates remain distinct. Publication dates are null when not separately supplied. Raw strings/notes preserve censored or unsupported values; missing numeric measurements are not zero.
- Geographic TWD97 `twd97lon`/`twd97lat` use the explicit EPSG:3824→4326 operation EPSG:1549 (stated 1 m accuracy, numerically unchanged). Projected XY is not relabelled as longitude/latitude. Unknown source county attribution remains null.
- `/api/atlas/river-quality` provides actual request counts/status. Catalogue `recordCount=0` is a runtime placeholder, not a verified count of samples or a claim that none exist. County averages describe the loaded samples; they are not pollution rankings or matched-effort comparisons. Current production verification belongs in `FULL_PLATFORM_REPORT.md`.

## Imported 2023 land cover

- Chen et al., _Taiwan land cover data_, version 3, [Zenodo 14033363](https://zenodo.org/records/14033363), published **2024-11-04**, **CC BY 4.0**. Source archive checksum, class interpretation and method are recorded in [FOREST_DATA.md](FOREST_DATA.md) and `landcover-2023.statistics.json`.
- The verified archive contains **2023- and 2015-labelled TIFFs**. A description mentioning 2013 does not establish a 2013 baseline. No 2013→2023 change statistic is fabricated; the associated paper says 2013–2022 results require author request.
- The 2023 source is EPSG:4326. Areas use original-pixel inclusion and WGS84 ellipsoid pixel areas, not degree squares or Web Mercator area. Class 5 remains unresolved built-up/agriculture; no-data remains missing.
- **19 mapped county summaries** and an all-22-county statistical JSON. Kinmen, Lienchiang and Penghu have null forest statistics; mainland/coastal gaps also remain visible.
- **1,011,497,706** accepted original pixels yield **36,383.637 km² mapped area**, including **21,258.103 km² class-1 forest**. These are research-classification outputs, not a legal forest inventory. Forest share uses mapped classes 1–6 as denominator, not total legal county area.
- Two rendered PNGs are generalized web overviews. GeoJSON summary points are not forest plots or raw satellite pixels. Dates retain classification-year precision, not invented sampling days. A classification change alone does not establish deforestation or its cause.

## Imported privacy-screened roadkill subset

- Lin T (2026), Taiwan Biodiversity Research Institute, _The Taiwan Roadkill Observation Network Data Set_, version 1.11, DOI [10.15468/cidkqi](https://doi.org/10.15468/cidkqi), [GBIF source](https://www.gbif.org/dataset/db09684b-0fd1-431e-b5fa-4c1532fbdb14), **CC BY 4.0**.
- Source archive: **46,416 records**, 2011–December 2017. Current public edition: **10,841 records, 99 taxa**, **2014-01-02–2017-12-31**. It is a limited screened subset, not the whole archive.
- Conservation metadata checked for **15,600 of 18,147 GBIF Least Concern records**, explicitly incomplete. Only eligible Least Concern species/subspecies outside conservative exclusions are published. Both the [official terrestrial list](https://www.forest.gov.tw/0008324) and [official marine list](https://www.forest.gov.tw/0008329) inform protection screening. Marine turtle/mammal/seabird families, sea-snake genera and all bats are conservatively excluded; original/interpreted species identities must agree without fuzzy taxon matches. This intentionally over-excludes some taxa and is not a legal status determination.
- Original private coordinates assign counties with official NLSC polygons. All public positions are **10 km EPSG:3826 grid-cell centres**, transformed to WGS84. County assignment remains pre-generalization, so a centre can fall outside that county. The 7.1 km radius describes the grid, not source positional accuracy.
- Exact coordinates, observer identifiers, localities, media URLs and individual occurrence/source links are withheld. Original observation IDs, scientific names, validated dates, source and licence remain. Species profiles provide aggregate frequency and a whole-dataset source link.
- Counts reflect reporting effort and screening, not abundance, current distribution or corrected roadkill risk. No photographer assets are copied without verified attribution/licence. See [WILDLIFE_DATA.md](WILDLIFE_DATA.md) and `wildlife.provenance.json`.

## Imported cultural geography and historical trails

| Official source                                                                              |                                     Accepted records | Licence and period                                                  |
| -------------------------------------------------------------------------------------------- | ---------------------------------------------------: | ------------------------------------------------------------------- |
| [CIP village catalogue 156632](https://data.gov.tw/dataset/156632), `A53000000A-111027-001`  |                                            730 / 739 | Open Government Data License 1.0; catalogue updated 2026-08-25      |
| [CIP historical studies 166817](https://data.gov.tw/dataset/166817), `A53000000A-112072-001` |                            Eight nonspatial profiles | Open Government Data License 1.0; study 2011, listing 2023-12-19    |
| [Tourism Administration trails 41653](https://data.gov.tw/dataset/41653)                     | 24 public historical routes selected from 229 trails | Open Government Data License 1.0; release 2026-11-15T14:30:30+08:00 |

Village Chinese names, traditional romanization, groups, townships, original IDs
and public reference points are source-provided. EPSG:3826 coordinates use the
official non-ballpark 1 m transform; geographic columns cross-check within
300 m and accepted points must lie in the source county. Nine invalid,
conflicting or mismatched records are excluded. Points do not define traditional
territories or access rights; listing dates are not founding dates.

The eight CIP profiles preserve full original Chinese history, communities,
study conditions and attribution. They contain no coordinates: `geometry=null`.
English readers see an untranslated notice. Historical terminology and recorded
conditions are source material, not current hiking guidance.

Actual tourism route geometry is WGS84 WKT with elevation removed for display.
Selection requires `古道` in the name, `IsPublicAccess=1`, `ServiceStatus=1`;
two closed/nonpublic historical routes are excluded. This is a public historical
trail selection, not an exhaustive Indigenous trail inventory. Cross-county
routes retain `intersectingCountyCodes`; closures and community restrictions
take precedence over release status.

Official [族語 E 樂園](https://web.klokah.tw/) and
[Indigenous dictionaries](https://e-dictionary.ilrdf.org.tw/) are linked, not
copied or relicensed. No names, translations, history or photos are invented.
See [CULTURE_DATA.md](CULTURE_DATA.md).

## Imported Taipei urban inventories

All three municipal sources use **Open Government Data License 1.0**. Coverage
is Taipei, not a nationwide tree/park inventory.

| Source                                                                                              | Accepted records | Actual source period / limit                                                      |
| --------------------------------------------------------------------------------------------------- | ---------------: | --------------------------------------------------------------------------------- |
| [Parks, squares and green spaces 128366](https://data.gov.tw/dataset/128366)                        |        812 / 813 | Catalogue 2026-10-13; reference points, not park polygons or national green cover |
| [Public park trees](https://data.taipei/dataset/detail?id=7a49d00c-a5ff-4a6b-be9e-aaa6dc1ff7e8)     |  85,177 / 85,181 | Survey 2016-06-02–2026-10-02; latest row update 2026-11-13                        |
| [Riverside tree survey](https://data.taipei/dataset/detail?id=34800b67-b5a5-4ce9-9892-eb0945b82644) |  10,735 / 10,921 | One-time survey 2016-11-04–2017-06-16; file update 2023-07-05, not a new survey   |

Source tree IDs, species, dimensions and survey dates are retained. Projected
TWD97 coordinates use the verified transform; geographic/projected riverside
columns cross-check. All accepted points lie in the official Taipei polygon.
**481 park-tree dates and two riverside dates** remain null where missing or
invalid, including spreadsheet 1899 defaults. Inventory records do not prove
current survival, planting dates or canopy change. See the city's
[tree-platform notice](https://pwd.gov.taipei/News_Content.aspx?n=74082687FC0B1094&s=A181C1BB75726C09),
[URBAN_DATA.md](URBAN_DATA.md) and `urban.provenance.json`.

## Linked resources, not imported measurement layers

- [USGS Landsat surface temperature](https://www.usgs.gov/landsat-missions/landsat-collection-2-surface-temperature): official documentation only. No validated Taiwan thermal scene or urban heat-island estimate is imported. CWA station air temperature must not be relabelled as satellite land-surface temperature.
- [Copernicus Browser](https://browser.dataspace.copernicus.eu/) and [STAC documentation](https://documentation.dataspace.copernicus.eu/APIs/STAC.html): official scene-discovery resources. There is no integrated scene-ingestion or live satellite-analysis pipeline. Services may require an account; Sentinel-2 has no thermal sensor.
- Persistent AQI/weather history, a complete river archive and sampling-effort-adjusted county rankings are not provided by current snapshot ingestion.

## Basemap attribution

Default style: https://tiles.openfreemap.org/styles/liberty

OpenFreeMap uses OpenMapTiles/OpenStreetMap-derived geography. MapLibre renders the provider's attribution and an explicit OpenFreeMap/© OpenStreetMap/NLSC attribution. See https://openfreemap.org/quick_start/ and https://www.openstreetmap.org/copyright. This basemap supplies context; official county selection uses dataset 7442 alone.
