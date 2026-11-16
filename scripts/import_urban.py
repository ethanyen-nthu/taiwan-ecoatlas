"""Normalize official Taipei parks and public tree inventories; never extrapolate nationwide."""
from __future__ import annotations

import csv
import html
import json
import math
import re
from collections import Counter

from culture_urban_common import (
    RAW, LICENCE, LICENCE_URL, TRANSFORM, collection, date_range,
    feature, number, point, record_date, save, source_hash, text,
)

PARK_SOURCE = "https://data.gov.tw/dataset/128366"
TREE_SOURCE = "https://data.taipei/dataset/detail?id=7a49d00c-a5ff-4a6b-be9e-aaa6dc1ff7e8"
RIVER_TREE_SOURCE = "https://data.taipei/dataset/detail?id=34800b67-b5a5-4ce9-9892-eb0945b82644"


def plain(value):
    value = re.sub(r"\\u([0-9a-fA-F]{4})", lambda m: chr(int(m[1], 16)), text(value))
    value = value.replace("\\r\\n", "\n").replace("\\n", "\n")
    return html.unescape(re.sub(r"<[^>]*>", " ", value)).strip()


def parks():
    rows = json.loads((RAW / "taipei-parks.json").read_text())
    features, excluded, seen = [], Counter(), set()
    for r in rows:
        original_id = text(r.get("SeqNo"))
        if not original_id or original_id in seen:
            excluded["missing_or_duplicate_id"] += 1
            continue
        seen.add(original_id)
        geometry = point(r.get("pm_Longitude"), r.get("pm_Latitude"), "63000")
        if geometry is None:
            excluded["invalid_or_outside_taipei_coordinates"] += 1
            continue
        name, english = text(r.get("pm_name")), text(r.get("pm_name_eng"))
        year = number(r.get("pm_const_year"), 1800, 2026)
        features.append(feature(f"park-{original_id}", geometry, {
            "sourceId": "taipei-128366", "sourceRecordId": original_id,
            "title": english or name, "titleZh": name, "countyCode": "63000",
            "date": None, "category": text(r.get("pm_type")) or None,
            "district": text(r.get("pm_regions")), "address": text(r.get("pm_location")),
            "areaM2": number(r.get("pm_LandPublicArea")),
            "constructionYear": int(year) if year is not None else None,
            "descriptionZh": plain(r.get("pm_overview"))[:900] or None,
            "openingFrom": text(r.get("pm_opening_stime")), "openingUntil": text(r.get("pm_opening_etime")),
            "sportsFacilities": plain(r.get("pm_sports"))[:180] or None,
            "recreationFacilities": plain(r.get("pm_recreation"))[:180] or None,
        }))
    artifact = save("taipei-parks.geojson", collection(features))
    return features, {"inputRecords": len(rows), "outputRecords": len(features), "excluded": dict(excluded), "sourceSha256": source_hash("taipei-parks.json"), **artifact}


def park_trees():
    rows = json.loads((RAW / "taipei-park-trees.json").read_text())
    features, excluded, seen, missing_dates = [], Counter(), set(), 0
    for r in rows:
        original_id = text(r.get("TreeID"))
        if not original_id or original_id in seen:
            excluded["missing_or_duplicate_id"] += 1
            continue
        seen.add(original_id)
        x, y = number(r.get("TWD97X"), 100000, 400000), number(r.get("TWD97Y"), 2300000, 2900000)
        if x is None or y is None:
            excluded["invalid_projected_coordinates"] += 1
            continue
        lon, lat = TRANSFORM.transform(x, y)
        geometry = point(lon, lat, "63000")
        if geometry is None:
            excluded["outside_taipei_boundary"] += 1
            continue
        surveyed = record_date(r.get("SurveyDate"))
        if surveyed is None:
            missing_dates += 1
        species = text(r.get("TreeType"))
        features.append(feature(f"park-tree-{original_id}", geometry, {
            "sourceId": "taipei-park-tree-inventory", "sourceRecordId": original_id,
            "title": species or original_id, "countyCode": "63000", "date": surveyed,
            "category": species or None, "species": species or None,
            "district": text(r.get("Dist")), "park": text(r.get("ParkName")),
            "heightM": number(r.get("TreeHeight")), "diameterCm": number(r.get("Diameter")),
            "sourceUpdatedAt": text(r.get("UpdDate")) or None,
        }))
    artifact = save("taipei-park-trees.geojson", collection(features))
    return features, {"inputRecords": len(rows), "outputRecords": len(features), "excluded": dict(excluded), "missingOrInvalidSurveyDates": missing_dates, "sourceSha256": source_hash("taipei-park-trees.json"), **artifact}


def riverside_trees():
    rows = list(csv.DictReader((RAW / "taipei-riverside-trees.csv").read_text(encoding="utf-8-sig").splitlines()))
    features, excluded, seen, missing_dates = [], Counter(), set(), 0
    # Stable latest survey selection for the three duplicate source identifiers.
    rows.sort(key=lambda r: (text(r.get("樹籍編碼")), record_date(r.get("資料日期")) or ""), reverse=True)
    for r in rows:
        original_id = text(r.get("樹籍編碼"))
        if not original_id or original_id in seen:
            excluded["missing_or_duplicate_id"] += 1
            continue
        seen.add(original_id)
        lon, lat = number(r.get("經度_WGS84"), 117, 125), number(r.get("緯度_WGS84"), 20, 27)
        x, y = number(r.get("經度_TWD97"), 100000, 400000), number(r.get("緯度_TWD97"), 2300000, 2900000)
        if None in (lon, lat, x, y):
            excluded["invalid_coordinates"] += 1
            continue
        tx, ty = TRANSFORM.transform(x, y)
        if math.hypot((lon - tx) * 100000, (lat - ty) * 110000) > 300:
            excluded["conflicting_coordinate_fields"] += 1
            continue
        geometry = point(lon, lat, "63000")
        if geometry is None:
            excluded["outside_taipei_boundary"] += 1
            continue
        surveyed = record_date(r.get("資料日期"))
        if surveyed is None:
            missing_dates += 1
        species = text(r.get("樹種"))
        features.append(feature(f"riverside-tree-{original_id}", geometry, {
            "sourceId": "taipei-riverside-tree-inventory", "sourceRecordId": original_id,
            "title": species or original_id, "countyCode": "63000", "date": surveyed,
            "category": species or None, "species": species or None,
            "scientificName": text(r.get("學名")) or None, "family": text(r.get("科別")) or None,
            "park": text(r.get("河濱公園")), "heightM": number(r.get("樹高_m")),
            "diameterCm": number(r.get("胸高直徑_cm")),
        }))
    artifact = save("taipei-riverside-trees.geojson", collection(features))
    return features, {"inputRecords": len(rows), "outputRecords": len(features), "excluded": dict(excluded), "missingOrInvalidSurveyDates": missing_dates, "sourceSha256": source_hash("taipei-riverside-trees.csv"), **artifact}


def main():
    ps, pa = parks()
    ts, ta = park_trees()
    rs, ra = riverside_trees()
    save("urban.provenance.json", {"parks": pa, "parkTrees": ta, "riversideTrees": ra, "coordinateOperation": TRANSFORM.description, "coordinateAccuracyMetres": TRANSFORM.accuracy})
    tree_fields = [{"key": "species", "label": {"en": "Source-listed species", "zh": "來源樹種"}}, {"key": "park", "label": {"en": "Park", "zh": "公園"}}, {"key": "heightM", "label": {"en": "Reported height", "zh": "紀錄樹高"}, "unit": "m"}, {"key": "diameterCm", "label": {"en": "Reported diameter at breast height", "zh": "紀錄胸徑"}, "unit": "cm"}]
    common = {"section": "urban", "licence": LICENCE, "licenceUrl": LICENCE_URL, "status": "available"}
    save("urban.metadata.json", {"section": "urban", "datasets": [
        {**common, "id": "taipei-parks", "title": {"en": "Taipei parks, squares and green spaces", "zh": "臺北市公園、廣場與綠地"}, "description": {"en": "Official park reference locations and source-reported areas from Taipei's Parks and Street Lights Office.", "zh": "臺北市公園路燈工程管理處發布的公園定位點與來源面積。"}, "sourceId": "taipei-128366", "sourceUrl": PARK_SOURCE, "file": "/data/atlas/taipei-parks.geojson", "recordCount": len(ps), "dateRange": None, "updatedAt": "2026-10-13", "limitation": {"en": "Taipei City only. These are park reference points, not park boundary polygons. Source area values are not national green-cover estimates; records outside the official city boundary are excluded.", "zh": "僅涵蓋臺北市；資料為公園定位點而非公園邊界。來源面積不代表全國綠覆率；不符官方市界的點位排除。"}, "fields": [{"key": "district", "label": {"en": "District", "zh": "行政區"}}, {"key": "areaM2", "label": {"en": "Source-reported public land area", "zh": "來源公有土地面積"}, "unit": "m²"}, {"key": "constructionYear", "label": {"en": "Source construction year", "zh": "來源建造年度"}}, {"key": "address", "label": {"en": "Location", "zh": "位置"}}, {"key": "descriptionZh", "label": {"en": "Original park description (Traditional Chinese)", "zh": "原始公園概述"}}]},
        {**common, "id": "taipei-park-trees", "title": {"en": "Taipei public park tree inventory", "zh": "臺北市公園樹木盤點"}, "description": {"en": "Individually identified public park trees with reported species, survey dates and dimensions.", "zh": "保留原始樹籍編號、樹種、調查日期與尺寸之公園樹木紀錄。"}, "sourceId": "taipei-park-tree-inventory", "sourceUrl": TREE_SOURCE, "file": "/data/atlas/taipei-park-trees.geojson", "recordCount": len(ts), "dateRange": date_range(ts), "updatedAt": max(record_date(f["properties"].get("sourceUpdatedAt")) or "" for f in ts), "limitation": {"en": "Taipei public parks only, not all city trees or national tree coverage. Survey-date charts describe inventory records, not planting, survival or canopy change. Invalid spreadsheet dates remain missing. The city reports ongoing platform updates; check the source for removals and relocations.", "zh": "僅臺北市公園，非全市或全國樹木完整覆蓋。調查日期圖表呈現盤點紀錄，不代表栽植、存活或樹冠變遷；無效試算表日期維持缺值。市府正更新平台，移除及移植情形以來源為準。"}, "fields": tree_fields},
        {**common, "id": "taipei-riverside-trees", "title": {"en": "Taipei riverside tree survey", "zh": "臺北市河濱喬木調查"}, "description": {"en": "A historical, one-time municipal survey of trees in selected Taipei riverside parks and embankments.", "zh": "臺北市部分河濱公園及堤外灘地之一次性歷史喬木調查。"}, "sourceId": "taipei-riverside-tree-inventory", "sourceUrl": RIVER_TREE_SOURCE, "file": "/data/atlas/taipei-riverside-trees.geojson", "recordCount": len(rs), "dateRange": date_range(rs), "updatedAt": "2023-07-05", "limitation": {"en": "One-time 2016–2017 survey; the source explicitly states there are no subsequent inventory updates. Covers selected Taipei riverside parks, not nationwide trees. Original identifiers are preserved and duplicate source IDs are removed.", "zh": "2016–2017 年一次性調查；來源明確說明結案後未再更新，非現況存活清冊。僅部分臺北市河濱公園，不代表全國；保留原始編號並排除重複編號。"}, "fields": tree_fields + [{"key": "scientificName", "label": {"en": "Scientific name", "zh": "學名"}}]},
    ], "resources": [
        {"title": {"en": "Official Taipei tree inventory update notice", "zh": "臺北市樹籍平台更新說明"}, "url": "https://pwd.gov.taipei/News_Content.aspx?n=74082687FC0B1094&s=A181C1BB75726C09", "description": {"en": "The city explains the ongoing reconciliation of tree removals and relocations. A catalogue record does not prove the tree is currently present.", "zh": "市府說明樹木移除、移植與平台更新作業；盤點紀錄不等於該樹目前仍存在。"}},
        {"title": {"en": "USGS Landsat surface temperature", "zh": "USGS Landsat 地表溫度"}, "url": "https://www.usgs.gov/landsat-missions/landsat-collection-2-surface-temperature", "description": {"en": "Official satellite surface-temperature documentation. No validated Taiwan scene has been imported; this is distinct from the measured station air-temperature layer.", "zh": "官方衛星地表溫度說明；尚未匯入經驗證之臺灣影像，與測站實測氣溫圖層不同。"}},
    ]})
    print(json.dumps({"parks": pa, "parkTrees": ta, "riversideTrees": ra}, ensure_ascii=False))


if __name__ == "__main__":
    main()
