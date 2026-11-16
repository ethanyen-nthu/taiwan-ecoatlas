"""Process downloaded official public CIP village/profile and Tourism trail releases.

Raw files are private build inputs in data/raw. Run with .venv/bin/python.
No positions are inferred from narratives or geocoded from village names.
"""
from __future__ import annotations

import json
import math
from collections import Counter

from shapely import force_2d, from_wkt
from shapely.geometry import mapping

from culture_urban_common import (
    RAW, LICENCE, LICENCE_URL, TRANSFORM, COUNTY_PREPARED,
    collection, feature, number, point, record_date, save, source_hash, text,
)

VILLAGE_SOURCE = "https://data.gov.tw/dataset/156632"
TRAIL_SOURCE = "https://data.gov.tw/dataset/166817"
PUBLIC_TRAIL_SOURCE = "https://data.gov.tw/dataset/41653"


def villages():
    rows = json.loads((RAW / "cip-villages.json").read_text())[0]["result"]["records"]
    features, excluded, duplicate_ids = [], Counter(), set()
    for r in rows:
        original_id = text(r.get("Seq"))
        code = text(r.get("縣市別代碼"))
        if not original_id or original_id in duplicate_ids:
            excluded["missing_or_duplicate_id"] += 1
            continue
        duplicate_ids.add(original_id)
        lon, lat = number(r.get("經度"), 117, 125), number(r.get("緯度"), 20, 27)
        x, y = number(r.get("X座標"), 100000, 400000), number(r.get("Y座標"), 2300000, 2900000)
        if None in (lon, lat, x, y):
            excluded["invalid_coordinates"] += 1
            continue
        tx, ty = TRANSFORM.transform(x, y)
        disagreement = math.hypot((tx - lon) * 100000, (ty - lat) * 110000)
        if disagreement > 300:
            excluded["conflicting_geographic_and_projected_coordinates"] += 1
            continue
        geometry = point(tx, ty, code)
        if geometry is None:
            excluded["outside_source_county"] += 1
            continue
        traditional, name = text(r.get("部落傳統名制_羅馬拼音")), text(r.get("部落名稱"))
        if not name:
            excluded["missing_name"] += 1
            continue
        features.append(feature(f"village-{original_id}", geometry, {
            "sourceId": "A53000000A-111027-001", "sourceRecordId": original_id,
            "title": traditional or name, "titleZh": name, "countyCode": code,
            "date": None, "listedAt": record_date(r.get("DateListed")),
            "category": text(r.get("族別")) or None, "group": text(r.get("族別")) or None,
            "traditionalName": traditional or None, "countyName": text(r.get("縣市")),
            "township": text(r.get("鄉鎮市區")), "village": text(r.get("村里")),
            "publicReferencePoint": text(r.get("定位點")), "sourceUrl": VILLAGE_SOURCE,
        }))
    artifact = save("villages.geojson", collection(features))
    return features, {"inputRecords": len(rows), "outputRecords": len(features), "excluded": dict(excluded), "sourceSha256": source_hash("cip-villages.json"), **artifact}


def historical_profiles():
    rows = json.loads((RAW / "cip-trails.json").read_text())[0]["result"]["records"]
    profiles = []
    for r in rows:
        profiles.append({
            "id": f"historic-trail-{r['Seq']}", "sourceRecordId": text(r["Seq"]),
            "sourceId": "A53000000A-112072-001", "sourceUrl": TRAIL_SOURCE,
            "title": text(r["古道名稱"]), "titleZh": text(r["古道名稱"]),
            "listedAt": record_date(r.get("DateListed")), "studyYear": int(r["年度"]) + 1911,
            "descriptionZh": text(r["古道簡介"]),
            "descriptionEn": "Council of Indigenous Peoples historical-trail study. Original historical descriptions are provided in Traditional Chinese.",
            "endpointsZh": text(r["起迄地點"]), "lengthText": text(r["古道長度_公里"]),
            "historicalContextZh": text(r["重要歷史背景_開鑿目的"]),
            "associatedCommunitiesZh": text(r["所經主要民族_含重要部落"]),
            "constructionHistoryZh": text(r["開鑿年代包含重要修建年代及為何重修的故事"]),
            "communityImpactZh": text(r["開鑿後對鄰近部落影響"]),
            "recordedConditionZh": text(r["古道現況"]),
            "landscapeZh": text(r["文化景觀與特殊自然地景"]),
            "attribution": text(r["資料來源"]), "licence": LICENCE, "licenceUrl": LICENCE_URL,
            "geometry": None,
        })
    save("cultural-trails.json", profiles)
    return profiles


def public_trails():
    d = json.loads((RAW / "tourism-trails.json").read_text())
    features, excluded = [], Counter()
    for r in d["Trails"]:
        if "古道" not in text(r.get("TrailName")):
            continue
        if r.get("IsPublicAccess") != 1 or r.get("ServiceStatus") != 1:
            excluded["not_open_public_access"] += 1
            continue
        try:
            geom = force_2d(from_wkt(r.get("Geometry", "")))
            if geom.geom_type not in ("LineString", "MultiLineString") or not geom.is_valid or geom.is_empty:
                raise ValueError("Invalid route geometry")
            west, south, east, north = geom.bounds
            if not (117 <= west <= east <= 125 and 20 <= south <= north <= 27):
                raise ValueError("Out of Taiwan coordinate domain")
        except Exception:
            excluded["invalid_geometry"] += 1
            continue
        source_id = text(r["TrailID"])
        covered = [code for code, county in COUNTY_PREPARED.items() if county.intersects(geom)]
        primary = text((r.get("PostalAddress") or {}).get("CityCode"))
        code = primary if primary in covered else covered[0] if len(covered) == 1 else None
        # Cross-county routes remain unassigned to a single county; all intersecting codes retained.
        props = {
            "sourceId": "tourism-41653", "sourceRecordId": source_id,
            "title": text(r["TrailName"]), "titleZh": text(r["TrailName"]),
            "countyCode": code, "intersectingCountyCodes": ",".join(covered),
            "date": None, "updatedAt": text(r.get("UpdateTime")), "category": "Public historical trail",
            "descriptionZh": text(r.get("Description")),
            "descriptionEn": "Official public trail record. The original description is in Traditional Chinese; check its official website for current access conditions.",
            "sourceUrl": text(r.get("WebsiteURL")) or PUBLIC_TRAIL_SOURCE,
            "catalogueUrl": PUBLIC_TRAIL_SOURCE, "lengthMetres": number(r.get("TrailLength")),
            "publicAccess": True, "sourceServiceStatus": r.get("ServiceStatus"),
        }
        features.append(feature(source_id, json.loads(json.dumps(mapping(geom))), props))
    artifact = save("public-historic-trails.geojson", collection(features))
    return features, {"inputRecords": len(d["Trails"]), "outputRecords": len(features), "excluded": dict(excluded), "releaseUpdatedAt": d["UpdateTime"], "sourceSha256": source_hash("tourism-trails.json"), **artifact}


def main():
    vs, village_audit = villages()
    profiles = historical_profiles()
    trails, trail_audit = public_trails()
    save("culture.provenance.json", {"villages": village_audit, "historicalProfiles": len(profiles), "publicTrails": trail_audit, "coordinateOperation": TRANSFORM.description, "coordinateAccuracyMetres": TRANSFORM.accuracy})
    common = {"section": "culture", "licence": LICENCE, "licenceUrl": LICENCE_URL, "status": "available", "dateRange": None, "fields": []}
    save("culture.metadata.json", {"section": "culture", "datasets": [
        {**common, "id": "villages", "title": {"en": "Indigenous village reference points", "zh": "原住民族部落公開定位點"}, "description": {"en": "Public village names, traditional romanization and associated groups from the Council of Indigenous Peoples.", "zh": "原住民族委員會公開之部落名稱、傳統名制羅馬拼音及族別。"}, "sourceId": "A53000000A-111027-001", "sourceUrl": VILLAGE_SOURCE, "file": "/data/atlas/villages.geojson", "recordCount": len(vs), "updatedAt": "2026-08-25", "limitation": {"en": "Reference points locate published villages, not traditional territories or access rights. Catalogue listing dates are preserved separately; historical founding dates are not inferred. Conflicting coordinates and county mismatches are excluded.", "zh": "公開定位點不代表傳統領域或進入權利；另保留資料列載日期，不推定部落成立年代。座標互相矛盾或不符來源縣市者排除。"}, "fields": [{"key": "traditionalName", "label": {"en": "Traditional name", "zh": "傳統名制"}}, {"key": "group", "label": {"en": "Source-listed Indigenous group", "zh": "來源所列族別"}}, {"key": "township", "label": {"en": "Township", "zh": "鄉鎮市區"}}, {"key": "publicReferencePoint", "label": {"en": "Public reference point", "zh": "公開定位點"}}, {"key": "listedAt", "label": {"en": "Catalogue listing date", "zh": "資料列載日期"}}]},
        {**common, "id": "public-historic-trails", "title": {"en": "Public historical trail routes", "zh": "公開古道路線"}, "description": {"en": "Actual route geometry from the Tourism Administration release, filtered to named historical trails listed as open and publicly accessible.", "zh": "交通部觀光署發布之實際路線，僅收錄名稱為古道且來源標示開放及可公開進入者。"}, "sourceId": "tourism-41653", "sourceUrl": PUBLIC_TRAIL_SOURCE, "file": "/data/atlas/public-historic-trails.geojson", "recordCount": len(trails), "updatedAt": trail_audit["releaseUpdatedAt"], "limitation": {"en": "A selection of public historical trails, not a complete Indigenous-trail inventory. Open status is a release snapshot; official closures and community restrictions take precedence. Eight separate CIP historical study profiles contain no coordinates and are not drawn as invented routes.", "zh": "僅呈現公開古道選錄，非完整原住民族古道盤點；開放狀態為發布當時快照，以官方封閉公告及社群限制為準。另有八筆原民會歷史研究簡介，因未附座標，不虛構路線。"}, "fields": [{"key": "lengthMetres", "label": {"en": "Source-reported length", "zh": "來源路線長度"}, "unit": "m"}, {"key": "descriptionZh", "label": {"en": "Original description (Traditional Chinese)", "zh": "原始簡介"}}]},
    ], "resources": [
        {"title": {"en": "Eight Indigenous historical-trail studies", "zh": "八筆臺灣原住民族古道研究簡介"}, "url": TRAIL_SOURCE, "description": {"en": "Source historical narratives from a 2011 study, listed in 2023. The downloadable local profile library preserves the original Traditional Chinese text, study context and attribution.", "zh": "原民會 2011 年研究、2023 年列載之歷史敘述；本地簡介保留原文、研究年代及出處，不作現況通行指南。"}},
        {"title": {"en": "Indigenous language E-Learning", "zh": "族語 E 樂園"}, "url": "https://web.klokah.tw/", "description": {"en": "Public language-learning materials maintained by the Indigenous Languages Research and Development Foundation.", "zh": "原住民族語言研究發展基金會維護的公開族語學習教材。"}},
        {"title": {"en": "Indigenous language dictionaries", "zh": "原住民族語線上辭典"}, "url": "https://e-dictionary.ilrdf.org.tw/", "description": {"en": "Search the official language dictionaries at their source; dictionary content is not copied into the atlas.", "zh": "連至原始辭典查詢，地圖平台不另行重製辭典內容。"}},
    ]})
    print(json.dumps({"villages": village_audit, "trails": trail_audit, "historicalProfiles": len(profiles)}, ensure_ascii=False))


if __name__ == "__main__":
    main()
