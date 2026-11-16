"""Build reproducible, bounded-memory 2023 land-cover assets from Zenodo v3.

Requires rasterio==1.5.0, Pillow==12.0.0 plus scripts/requirements.txt.
No 2013 data is inferred from the archive's inconsistently described 2015 file.
Run: .venv/bin/python scripts/import_landcover.py data/raw/landcover/2023_all_grid_wgs84.zip
"""
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path
import zipfile
import warnings

import geopandas as gpd
import numpy as np
from PIL import Image
from pyproj import Geod, Transformer
import rasterio
from rasterio.features import rasterize
from rasterio.transform import from_bounds
from rasterio.warp import reproject, Resampling
from rasterio.windows import Window, bounds as window_bounds
from shapely.geometry import mapping
from shapely import orient_polygons

warnings.filterwarnings("ignore", message="Setting the shape on a NumPy array has been deprecated.*", category=DeprecationWarning)

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "public/data/atlas"
EXPECTED_MD5 = "9336e79e7f903f46c940746faac0eb70"
SOURCE = "https://zenodo.org/records/14033363"
LEGEND_SOURCE = "https://github.com/ychenatsinca/PCM_demo/blob/main/classificationdemo_Taoyuan_withponddetection.R"
CLASSES = [
    {"code": 1, "key": "forest", "label": {"en": "Forest", "zh": "森林"}, "color": "#439c6e"},
    {"code": 2, "key": "builtUp", "label": {"en": "Built-up land", "zh": "建成地"}, "color": "#e86d5f"},
    {"code": 3, "key": "water", "label": {"en": "Water", "zh": "水域"}, "color": "#8bd2e8"},
    {"code": 4, "key": "agriculture", "label": {"en": "Agricultural land", "zh": "農業用地"}, "color": "#f0d86e"},
    {"code": 5, "key": "unresolved", "label": {"en": "Unresolved built-up / agriculture", "zh": "未區分之建成地／農地"}, "color": "#999999"},
    {"code": 6, "key": "grassland", "label": {"en": "Grassland / shrubs", "zh": "草地／灌叢"}, "color": "#99ad50"},
]


def checksum(path: Path, algorithm: str = "sha256") -> str:
    digest = hashlib.new(algorithm)
    with path.open("rb") as stream:
        while chunk := stream.read(1024 * 1024):
            digest.update(chunk)
    return digest.hexdigest()


def write_json(path: Path, value: object) -> None:
    path.write_text(json.dumps(value, ensure_ascii=False, separators=(",", ":")), encoding="utf8")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("archive", type=Path)
    args = parser.parse_args()
    archive = args.archive.resolve()
    if checksum(archive, "md5") != EXPECTED_MD5:
        raise ValueError("Research ZIP does not match the publisher checksum")
    OUTPUT.mkdir(parents=True, exist_ok=True)
    tif = archive.parent / "2023_all_grid_wgs84.tif"
    with zipfile.ZipFile(archive) as zipped:
        members = zipped.namelist()
        if "2023_all_grid_wgs84.tif" not in members:
            raise ValueError("Verified 2023 raster is absent")
        if not tif.exists():
            zipped.extract("2023_all_grid_wgs84.tif", archive.parent)
    counties = gpd.read_file(ROOT / "public/data/counties.geojson")
    if counties.crs.to_epsg() != 4326 or len(counties) != 22 or not counties.is_valid.all():
        raise ValueError("Expected 22 valid official WGS84 counties")
    geod = Geod(ellps="WGS84")
    geometries = list(counties.geometry)
    envelopes = [geometry.bounds for geometry in geometries]
    areas = np.zeros((23, 8), dtype=np.float64)
    counts = np.zeros((23, 8), dtype=np.int64)
    invalid_pixels = 0
    with rasterio.open(tif) as src:
        if src.crs.to_epsg() != 4326 or src.count != 1 or src.nodata != -128:
            raise ValueError("Unexpected source CRS, bands or no-data code")
        # Longitude spacing is constant. On the WGS84 ellipsoid, the area of a
        # pixel in a given latitude row is independent of its longitude.
        row_areas = np.empty(src.height, dtype=np.float64)
        for row in range(src.height):
            north = src.transform.f + row * src.transform.e
            south = north + src.transform.e
            west = src.transform.c
            east = west + src.transform.a
            row_areas[row] = abs(geod.polygon_area_perimeter([west, east, east, west], [north, north, south, south])[0])
        for start in range(0, src.height, 256):
            window = Window(0, start, src.width, min(256, src.height - start))
            values = src.read(1, window=window)
            left, bottom, right, top = window_bounds(window, src.transform)
            shapes = [(mapping(geometry), index + 1) for index, (geometry, box) in enumerate(zip(geometries, envelopes))
                      if box[0] <= right and box[2] >= left and box[1] <= top and box[3] >= bottom]
            if not shapes:
                continue
            labels = rasterize(shapes, out_shape=values.shape, transform=src.window_transform(window), dtype="uint8", fill=0, all_touched=False)
            valid = (labels > 0) & (values >= 1) & (values <= 6)
            invalid_pixels += int(((labels > 0) & ~np.isin(values, [-128, 0, 1, 2, 3, 4, 5, 6])).sum())
            combined = labels[valid].astype(np.int32) * 8 + values[valid]
            weights = np.broadcast_to(row_areas[start:start + values.shape[0], None], values.shape)[valid]
            areas += np.bincount(combined, weights=weights, minlength=23 * 8).reshape(23, 8)
            counts += np.bincount(combined, minlength=23 * 8).reshape(23, 8)
            if start % (256 * 32) == 0:
                print(f"Validated source rows {start}/{src.height}", flush=True)
        if invalid_pixels:
            raise ValueError(f"Unrecognized source classes within counties: {invalid_pixels}")
        # Nearest-neighbour overview. The PNG is in Web Mercator, so its four
        # geographic corners line up with MapLibre's projected image source.
        to_mercator = Transformer.from_crs(4326, 3857, always_xy=True)
        west, south = to_mercator.transform(src.bounds.left, src.bounds.bottom)
        east, north = to_mercator.transform(src.bounds.right, src.bounds.top)
        height = 2048
        width = round(height * (east - west) / (north - south))
        transform = from_bounds(west, south, east, north, width, height)
        overview = np.zeros((height, width), dtype=np.int8)
        reproject(source=rasterio.band(src, 1), destination=overview,
                  src_transform=src.transform, src_crs=src.crs, src_nodata=-128,
                  dst_transform=transform, dst_crs=3857, dst_nodata=0,
                  resampling=Resampling.nearest, warp_mem_limit=128, num_threads=2)
        mercator_counties = counties.to_crs(3857)
        overview_mask = rasterize([(mapping(geom), 1) for geom in mercator_counties.geometry], out_shape=overview.shape,
                                  transform=transform, fill=0, dtype="uint8", all_touched=False)
        overview[overview_mask == 0] = 0
        for forest_only, filename in [(False, "landcover-2023.png"), (True, "forest-cover-2023.png")]:
            image = np.zeros((height, width, 4), dtype=np.uint8)
            for item in CLASSES:
                if forest_only and item["code"] != 1:
                    continue
                color = tuple(bytes.fromhex(item["color"][1:]))
                image[overview == item["code"]] = (*color, 220)
            Image.fromarray(image).save(OUTPUT / filename, optimize=True)
        bounds = list(src.bounds)
        source_info = {"crs": str(src.crs), "width": src.width, "height": src.height,
                       "transform": list(src.transform), "nodata": src.nodata,
                       "sourcePixelCount": int(counts.sum()), "overviewWidth": width, "overviewHeight": height}
    county_stats = []
    features = []
    for index, (_, county) in enumerate(counties.iterrows(), start=1):
        code = county.COUNTYCODE
        county_area = abs(geod.geometry_area_perimeter(orient_polygons(county.geometry))[0]) / 1e6
        mapped_area = float(areas[index].sum()) / 1e6
        values = {item["key"] + "AreaKm2": round(float(areas[index, item["code"]]) / 1e6, 3) for item in CLASSES}
        forest_area = float(areas[index, 1]) / 1e6
        entry = {"countyCode": code, "name": {"en": county.COUNTYENG, "zh": county.COUNTYNAME},
                 "year": 2023, "countyAreaKm2": round(county_area, 3), "mappedAreaKm2": round(mapped_area, 3),
                 "mappedCoveragePct": round(100 * mapped_area / county_area, 2) if county_area else None,
                 "forestShareMappedPct": round(100 * forest_area / mapped_area, 2) if mapped_area else None,
                 "classAreasKm2": values if mapped_area else None,
                 "sourcePixelCount": int(counts[index].sum()), "available": bool(mapped_area)}
        county_stats.append(entry)
        if mapped_area:
            point = county.geometry.representative_point()
            features.append({"type": "Feature", "id": f"landcover-2023-{code}",
                             "geometry": {"type": "Point", "coordinates": [round(point.x, 7), round(point.y, 7)]},
                             "properties": {"id": f"landcover-2023-{code}", "sourceId": "landcover", "title": county.COUNTYENG,
                                            "titleZh": county.COUNTYNAME, "countyCode": code, "date": "2023", "datePrecision": "year",
                                            "year": 2023, "category": "County land-cover summary", "licence": "CC BY 4.0",
                                            "sourceUrl": SOURCE, "mappedAreaKm2": entry["mappedAreaKm2"],
                                            "mappedCoveragePct": entry["mappedCoveragePct"], "forestShareMappedPct": entry["forestShareMappedPct"], **values}})
    stats = {"year": 2023, "sourceId": "landcover", "sourceUrl": SOURCE, "licence": "CC BY 4.0",
             "legendSource": LEGEND_SOURCE, "classes": CLASSES, "countyStatistics": county_stats,
             "countyByCode": {row["countyCode"]: row for row in county_stats},
             "source": {"archive": archive.name, "archiveMd5": EXPECTED_MD5, "archiveSha256": checksum(archive),
                        "tif": tif.name, "tifSha256": checksum(tif), "members": members, **source_info},
             "methodology": {"area": "WGS84 geodesic area of each original pixel; official county polygons use pixel-centre inclusion (all_touched=false).",
                             "percentage": "Forest class 1 divided by all mapped classes 1–6 within each county, including unresolved class 5; not total legal county area.",
                             "overview": "Nearest-neighbour Web Mercator overview clipped to official counties. Summary points mark county representative points, not forest observations.",
                             "historical": "No 2013 comparison is computed. The archive contains files labelled 2015 and 2023 despite its 2013/2023 description; the paper says 2013–2022 classifications require author request.",
                             "coverage": "Source raster covers Taiwan main island and any classified pixels inside its footprint. Offshore counties with no mapped pixels have null statistics, never zero forest."}}
    write_json(OUTPUT / "landcover-2023.statistics.json", stats)
    write_json(OUTPUT / "landcover-2023-counties.geojson", {"type": "FeatureCollection", "features": features})
    corners = [[bounds[0], bounds[3]], [bounds[2], bounds[3]], [bounds[2], bounds[1]], [bounds[0], bounds[1]]]
    limitation = {"en": "2023 research classification, not a legal forest inventory. Statistics use original pixels; the overview is generalized. Class 5 is unresolved. Offshore coverage is incomplete. A vegetation-class change alone does not prove deforestation.",
                  "zh": "2023 年研究分類，並非法定森林清查。統計採原始像元，概覽圖已概化；類別 5 尚未區分，離島涵蓋不完整。植被分類改變不等於已證實砍伐。"}
    fields = [{"key": "forestAreaKm2", "label": {"en": "Mapped forest area", "zh": "已繪製森林面積"}, "unit": "km²"},
              {"key": "forestShareMappedPct", "label": {"en": "Forest share of mapped area", "zh": "森林占已繪製區比例"}, "unit": "%"},
              {"key": "mappedCoveragePct", "label": {"en": "Mapped county coverage", "zh": "縣市資料涵蓋率"}, "unit": "%"}]
    datasets = []
    for id, title, filename, legend in [
        ("landcover-2023", {"en": "2023 land-cover classes", "zh": "2023 土地覆蓋分類"}, "landcover-2023.png", CLASSES),
        ("forest-cover-2023", {"en": "2023 mapped forest", "zh": "2023 已繪製森林"}, "forest-cover-2023.png", CLASSES[:1]),
    ]:
        datasets.append({"id": id, "section": "forests", "title": title,
                         "description": {"en": "Source-backed research raster and county summaries. Map colours represent land-cover classes; dates represent classification year.", "zh": "研究來源柵格與縣市摘要；地圖顏色呈現土地覆蓋類別，日期指分類年度。"},
                         "sourceId": "landcover", "sourceUrl": SOURCE, "licence": "CC BY 4.0", "licenceUrl": "https://creativecommons.org/licenses/by/4.0/",
                         "status": "available", "file": "data/atlas/landcover-2023-counties.geojson", "recordCount": len(features),
                         "dateRange": ["2023-01-01", "2023-12-31"], "updatedAt": "2024-11-04", "limitation": limitation,
                         "fields": fields, "statisticsFile": "/data/atlas/landcover-2023.statistics.json",
                         "raster": {"url": "/data/atlas/" + filename, "coordinates": corners,
                                    "legend": [{"label": item["label"], "color": item["color"]} for item in legend]}})
    datasets.append({"id": "landcover-2013", "section": "forests", "title": {"en": "2013 comparison — source unavailable", "zh": "2013 比較：來源尚未公開"},
                     "description": {"en": "The requested 2013 raster was not present in the verified public archive.", "zh": "經確認的公開壓縮檔未含所需的 2013 柵格。"},
                     "sourceId": "landcover", "sourceUrl": SOURCE, "licence": "CC BY 4.0", "licenceUrl": "https://creativecommons.org/licenses/by/4.0/",
                     "status": "unavailable", "file": None, "recordCount": 0, "dateRange": None, "updatedAt": "2024-11-04",
                     "limitation": {"en": "The description mentions 2013/2023, but the archive contains 2015- and 2023-labelled TIFFs. We do not rename 2015 as 2013 or invent a change statistic. The linked paper says its 2013–2022 classifications are available by author request.",
                                    "zh": "描述提及 2013／2023，但壓縮檔只有標示 2015、2023 的 TIFF；本平臺不將 2015 改稱 2013，也不虛構變遷統計。相關論文指出 2013–2022 分類需向作者申請。"}, "fields": []})
    write_json(OUTPUT / "forests.metadata.json", {"section": "forests", "datasets": datasets, "resources": [
        {"title": {"en": "Research dataset and attribution", "zh": "研究資料與引用"}, "url": SOURCE,
         "description": {"en": "Chen et al., Taiwan land cover data, v3. Archive checksum verified; CC BY 4.0.", "zh": "Chen 等人，Taiwan land cover data v3；已驗證壓縮檔校驗碼，CC BY 4.0。"}},
        {"title": {"en": "Methodology and 2013 data availability", "zh": "方法與 2013 資料取得說明"}, "url": "https://link.springer.com/article/10.1007/s10661-024-12424-5",
         "description": {"en": "The authors distinguish forest, built-up, water, agriculture and grassland/shrub classes; classification changes are not proof of a particular land-use cause.", "zh": "作者區分森林、建成地、水域、農地及草地／灌叢；分類變化無法單獨證明特定土地利用原因。"}},
        {"title": {"en": "Explore Sentinel-2 in Copernicus Browser", "zh": "於 Copernicus Browser 探索 Sentinel-2"}, "url": "https://browser.dataspace.copernicus.eu/",
         "description": {"en": "Official interactive scene browser. Acquisition date, cloud coverage and processing level must be checked; imagery is distinct from this research classification. Some imagery services require a Copernicus account.", "zh": "官方互動影像瀏覽器；請確認拍攝時間、雲量與處理等級。影像與本研究分類不同；部分影像服務需 Copernicus 帳戶。"}},
    ]})
    print(json.dumps({"countySummaries": len(features), "sourcePixels": int(counts.sum()), "assets": [p.name for p in OUTPUT.glob("*2023*")]}, ensure_ascii=False), flush=True)


if __name__ == "__main__":
    main()
