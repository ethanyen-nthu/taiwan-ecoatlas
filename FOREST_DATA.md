# Verified land-cover integration

## Source and licence

The forest section uses Chen, Yi-Ying; Huang, Wei; Wang, Wei-Hong; Juang, Jehn-Yih; Kato, Tomomichi; and Luyssaert, Sebastiaan, **Taiwan land cover data, version 3**, published 4 November 2024. DOI: [10.5281/zenodo.14033363](https://zenodo.org/records/14033363). The public Zenodo API records **CC BY 4.0**. The processed maps, county summaries and overview images are adaptations with source attribution retained.

The publisher's `2023_all_grid_wgs84.zip` is 216,135,113 bytes; its published MD5 is `9336e79e7f903f46c940746faac0eb70`. The import verified it before use. SHA-256 values for the archive and source TIFF are recorded in `public/data/atlas/landcover-2023.statistics.json`.

The archive contains **`2023_all_grid_wgs84.tif` and `2015_all_grid_wgs84.tif`**, despite a description mentioning 2013/2023. The source TIFF has EPSG:4326, one int8 band, 36,502 columns × 64,719 rows, and no-data -128. No class labels or acquisition dates are embedded in its tags.

## Class labels and uncertainty

Class identifiers follow the authors' [linked PCM demonstration](https://github.com/ychenatsinca/PCM_demo/blob/main/classificationdemo_Taoyuan_withponddetection.R): 1 forest; 2 built-up; 3 water; 4 agriculture; 5 unresolved built-up/agriculture; 6 grassland/shrubs. The demonstration also documents 7 unclassified; none occurred within the processed county coverage. Zero and -128 are not treated as forest or a measured zero. Class 5 remains explicitly unresolved.

The [associated methodology paper](https://link.springer.com/article/10.1007/s10661-024-12424-5) describes remote-sensing classification. Classification error, seasonal differences and source coverage matter. A class change, reduced vegetation signal or an apparent urban/forest conversion **does not by itself establish deforestation or its cause**.

## Geographic and statistical processing

`scripts/import_landcover.py` reads the original TIFF in 256-row windows; the complete source is not loaded into memory. County assignment uses the existing official 2025-03-18 NLSC county polygons and original-pixel centre inclusion (`all_touched=false`). Each pixel's area is computed on the WGS84 ellipsoid, using its latitude-row boundaries; no degree-square or Web Mercator area is used for statistics.

The import validated **1,011,497,706 mapped original pixels** inside county polygons. There are **19 covered county/city summaries**, totalling **36,383.637 km² mapped area**, including **21,258.103 km² classified forest**. These are research classification outputs, not a legal or inventory estimate. Individual areas are rounded to 0.001 km², for consistent totals rather than a claim to that positional accuracy.

`forestShareMappedPct` divides class-1 area by mapped classes 1–6 inside the county, **including unresolved class 5**. It does not divide by total legal county area. `mappedCoveragePct` reports the mapped footprint relative to the official county geometry. Lienchiang, Kinmen and Penghu have **null forest statistics**, not zero forest. Some mainland county areas also lack source pixels, including some offshore islands and coastal edges.

The `landcover-2023-counties.geojson` points are derived county representative points used for selecting a summary. They are not forest plot observations. Their `date="2023"` and `datePrecision="year"` preserve the classification year without inventing a sampling day.

## Display assets

- `landcover-2023.png`: full class overview, 2048 pixels high, ~556 KB.
- `forest-cover-2023.png`: transparent forest-only overview, ~228 KB.
- `landcover-2023-counties.geojson`: 19 lightweight summary points.
- `landcover-2023.statistics.json`: all 22 counties, class areas, null coverage, provenance, hashes and processing method.
- `forests.metadata.json`: shared AtlasManifest for the forest map, forest-only layer and explicit unavailable 2013 baseline.

The overview images are nearest-neighbour reprojected to EPSG:3857 and clipped to official county polygons. Their four WGS84 corners are included in the manifest for MapLibre image sources. Use `raster-resampling: nearest`. Overview pixel colours are generalized for web use; county statistics use original source resolution.

## Historical comparison and Sentinel-2

No 2013 raster or 2013→2023 change statistic is fabricated. The 2015-labelled file is not renamed as 2013. The paper's Data Availability section says the 2013–2022 classification results are available by request from the corresponding author. The newer Zenodo v4 contains **future LUH2 SSP projections**; these are not substituted for historical observations.

The section provides the official [Copernicus Browser](https://browser.dataspace.copernicus.eu/) and [STAC documentation](https://documentation.dataspace.copernicus.eu/APIs/STAC.html) for Sentinel-2 scene exploration. Sentinel-2 acquisition dates, cloud cover and processing levels are distinct from the 2023 classification year. Imagery and processing services may require a Copernicus account. No invented live satellite image or deforestation detection is displayed.

## Reproduce

Download the exact archive recorded above into ignored `data/raw/landcover/`, then:

```sh
.venv/bin/python -m pip install rasterio==1.5.0 Pillow==12.0.0
.venv/bin/python scripts/import_landcover.py data/raw/landcover/2023_all_grid_wgs84.zip
```

The importer refuses an unexpected checksum, CRS, band count, no-data code, invalid county collection or unknown class codes. It does not need API keys. The original archive and extracted multi-gigabyte TIFF stay out of Git and deployment files.
