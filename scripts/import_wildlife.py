"""Build an explicitly generalized public subset of the released TaiRON archive.

Run with the project geospatial environment. Optional download stage requires network;
all original locations remain in data/raw/, which is excluded from Git/deployment.
This script never manufactures observations or promotes uncertain taxa to a species.
"""
from __future__ import annotations

import argparse
import collections
import concurrent.futures
import csv
import datetime as dt
import hashlib
import gzip
import io
import json
import math
from pathlib import Path
import re
import time
import urllib.request
import zipfile

import geopandas as gpd
from pyproj import Transformer
from shapely.geometry import Point

DATASET_KEY = "db09684b-0fd1-431e-b5fa-4c1532fbdb14"
SOURCE_URL = f"https://www.gbif.org/dataset/{DATASET_KEY}"
ARCHIVE_URL = "https://ipt.taibif.tw/archive.do?r=tw_roadkill_data"
PROTECTED_URL = "https://www.forest.gov.tw/file/203699"
MARINE_PROTECTED_URL = "https://www.forest.gov.tw/file/74850"
ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / "data/raw/wildlife"
PUBLIC = ROOT / "public/data/atlas"
GRID_M = 10_000
# Deliberate over-exclusion, not a statement that every member is legally protected.
# Marine snakes/seabirds and bats are withheld where sensitivity is uncertain.
WITHHELD_ORDERS = {"Chiroptera", "Cetacea", "Sirenia"}
WITHHELD_FAMILIES = {
    "Cheloniidae", "Dermochelyidae", "Delphinidae", "Phocoenidae", "Balaenidae",
    "Balaenopteridae", "Ziphiidae", "Physeteridae", "Kogiidae", "Eschrichtiidae",
    "Iniidae", "Lipotidae", "Monodontidae", "Neobalaenidae", "Platanistidae",
    "Pontoporiidae", "Dugongidae", "Trichechidae", "Otariidae", "Phocidae",
    "Laridae", "Sternidae", "Diomedeidae", "Procellariidae", "Fregatidae",
    "Sulidae", "Pelecanidae", "Spheniscidae",
}
WITHHELD_GENERA = {"Hydrophis", "Laticauda", "Aipysurus", "Emydocephalus"}


def request_bytes(url: str) -> bytes:
    for attempt in range(3):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": "TaiwanEcoAtlas/1.0 (public historical biodiversity processing)", "Accept-Encoding": "gzip"}), timeout=60) as response:
                body = response.read()
                return gzip.decompress(body) if response.headers.get("Content-Encoding") == "gzip" else body
        except Exception:
            if attempt == 2:
                raise
            time.sleep(1 + attempt)
    raise RuntimeError("Download did not complete")


def fetch_sources() -> None:
    RAW.mkdir(parents=True, exist_ok=True)
    if not (RAW / "roadkill.zip").exists():
        (RAW / "roadkill.zip").write_bytes(request_bytes(ARCHIVE_URL))
    if not (RAW / "protected-2025.pdf").exists():
        (RAW / "protected-2025.pdf").write_bytes(request_bytes(PROTECTED_URL))
    if not (RAW / "protected-marine-2020.pdf").exists():
        (RAW / "protected-marine-2020.pdf").write_bytes(request_bytes(MARINE_PROTECTED_URL))
    pages = RAW / "gbif-lc"
    pages.mkdir(exist_ok=True)
    base = f"https://api.gbif.org/v1/occurrence/search?datasetKey={DATASET_KEY}&iucnRedListCategory=LC&limit=300&offset="
    first = pages / "000000.json"
    if not first.exists():
        first.write_bytes(request_bytes(base + "0"))
    total = json.loads(first.read_bytes())["count"]

    def page(offset: int) -> None:
        path = pages / f"{offset:06}.json"
        if not path.exists():
            payload = request_bytes(base + str(offset))
            if json.loads(payload).get("offset") != offset:
                raise ValueError("Unexpected GBIF page offset")
            temporary = path.with_suffix(".tmp")
            temporary.write_bytes(payload)
            temporary.replace(path)

    with concurrent.futures.ThreadPoolExecutor(max_workers=6) as executor:
        list(executor.map(page, range(0, total, 300)))


def protected_text(stem: str = "protected-2025") -> str:
    """The official PDF is used privately for a deliberately broad exclusion filter."""
    text_file = RAW / f"{stem}.txt"
    if not text_file.exists():
        from pypdf import PdfReader  # Processing-only dependency; never a runtime requirement.
        text_file.write_text("\n".join(page.extract_text() for page in PdfReader(RAW / f"{stem}.pdf").pages))
    return text_file.read_text()


def species_id(name: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")[:90]
    return f"{slug}-{hashlib.sha256(name.encode()).hexdigest()[:8]}"


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--download", action="store_true")
    parser.add_argument("--allow-partial", action="store_true", help="Explicitly publish only the cached conservation-screened pages, with incompleteness recorded")
    args = parser.parse_args()
    if args.download:
        fetch_sources()

    with zipfile.ZipFile(RAW / "roadkill.zip") as archive:
        rows = list(csv.DictReader(io.StringIO(archive.read("occurrence.txt").decode("utf-8-sig")), delimiter="\t"))
    originals = {row["occurrenceID"]: row for row in rows}
    if len(originals) != len(rows):
        raise ValueError("The archive contains duplicate occurrence identifiers")
    if len(rows) != 46_416:
        raise ValueError("Archive changed: review its provenance and privacy policy before importing")

    # This deliberately excludes every genus mentioned anywhere in the protected list,
    # including genus-wide listings and synonyms. False positives stay withheld.
    marine = protected_text("protected-marine-2020")
    if "Chelonia" not in marine or "Lagenodelphis" not in marine:
        raise ValueError("Marine protected list text is incomplete; stop publication")
    protected = protected_text() + "\n" + marine
    protected_tokens = set(re.findall(r"[A-Za-z]+", protected.lower()))
    protected_groups = set(re.findall(r"\b([a-z]+(?:idae|inae|iformes))\s+spp\.", protected.lower()))
    pages = sorted((RAW / "gbif-lc").glob("*.json"))
    expected = json.loads(pages[0].read_bytes())["count"]
    records = [record for page in pages for record in json.loads(page.read_bytes())["results"]]
    fetched_count = len({str(r["key"]) for r in records})
    if len(records) != fetched_count:
        raise ValueError("GBIF page set contains duplicate records")
    if fetched_count != expected and not args.allow_partial:
        raise ValueError("GBIF Least Concern page set is incomplete or duplicated")

    rejected = collections.Counter()
    candidates = []
    for record in records:
        original = originals.get(str(record.get("occurrenceID", "")))
        if not original:
            rejected["not_in_released_archive"] += 1
            continue
        if record.get("iucnRedListCategory") != "LC" or record.get("taxonRank") not in {"SPECIES", "SUBSPECIES", "VARIETY"}:
            rejected["uncertain_taxonomy_or_conservation"] += 1
            continue
        if "TAXON_MATCH_FUZZY" in record.get("issues", []) or original["scientificName"].strip().lower() != str(record.get("species", "")).strip().lower():
            rejected["taxon_name_mismatch_or_fuzzy_match"] += 1
            continue
        if record.get("informationWithheld") or record.get("dataGeneralizations"):
            rejected["publisher_restriction"] += 1
            continue
        raw_genus = original["scientificName"].split()[0].lower()
        interpreted_genus = str(record.get("genus", "")).lower()
        if record.get("order") in WITHHELD_ORDERS or any(item in WITHHELD_FAMILIES for item in (record.get("family"), original.get("family"))) or any(item in WITHHELD_GENERA for item in (record.get("genus"), original["scientificName"].split()[0])):
            rejected["conservative_sensitive_group_omission"] += 1
            continue
        if raw_genus in protected_tokens or interpreted_genus in protected_tokens or any(str(record.get(field, "")).lower() in protected_groups for field in ("family", "order")):
            rejected["conservative_protected_taxon_filter"] += 1
            continue
        if any(issue in set(record.get("issues", [])) for issue in ("COORDINATE_INVALID", "ZERO_COORDINATE", "COUNTRY_COORDINATE_MISMATCH", "COORDINATE_OUT_OF_RANGE")):
            rejected["coordinate_flag"] += 1
            continue
        try:
            date = dt.date(int(original["year"]), int(original["month"]), int(original["day"]))
            longitude, latitude = float(original["decimalLongitude"]), float(original["decimalLatitude"])
            if not dt.date(2011, 1, 1) <= date <= dt.date(2017, 12, 31):
                raise ValueError("Outside historical release")
            if not (117 <= longitude <= 125 and 20 <= latitude <= 27):
                raise ValueError("Outside Taiwan domain")
            if not math.isfinite(longitude + latitude):
                raise ValueError("Invalid coordinate")
        except (ValueError, TypeError):
            rejected["invalid_date_or_coordinate"] += 1
            continue
        candidates.append((original, record, date.isoformat(), longitude, latitude))

    counties = gpd.read_file(ROOT / "public/data/counties.geojson").to_crs(4326)
    points = gpd.GeoDataFrame({"candidate": list(range(len(candidates)))}, geometry=[Point(c[3], c[4]) for c in candidates], crs=4326)
    joined = gpd.sjoin(points, counties[["COUNTYCODE", "geometry"]], how="left", predicate="intersects")
    assignments = joined.dropna(subset=["COUNTYCODE"]).sort_values("COUNTYCODE").drop_duplicates("candidate").set_index("candidate")["COUNTYCODE"].to_dict()
    forward = Transformer.from_crs(4326, 3826, always_xy=True, allow_ballpark=False)
    backward = Transformer.from_crs(3826, 4326, always_xy=True, allow_ballpark=False)
    features, species = [], {}
    for index, (original, record, date, longitude, latitude) in enumerate(candidates):
        county = assignments.get(index)
        if county is None:
            rejected["outside_official_county_geometry"] += 1
            continue
        x, y = forward.transform(longitude, latitude)
        gx, gy = math.floor(x / GRID_M), math.floor(y / GRID_M)
        lon, lat = backward.transform((gx + .5) * GRID_M, (gy + .5) * GRID_M)
        name = original["scientificName"]
        sid = species_id(name)
        try:
            individuals = int(original["individualCount"])
            if individuals < 1:
                individuals = None
        except ValueError:
            individuals = None
        features.append({"type": "Feature", "id": original["occurrenceID"], "geometry": {"type": "Point", "coordinates": [round(lon, 5), round(lat, 5)]}, "properties": {
            "id": original["occurrenceID"], "sourceId": "roadkill", "title": name,
            "titleZh": None, "countyCode": county, "date": date, "category": original["class"],
            "species": name, "scientificName": name, "speciesId": sid,
            "family": original["family"] or None, "taxonKey": record.get("taxonKey"),
            "observationId": original["occurrenceID"], "gbifId": str(record["key"]),
            "individualCount": individuals, "gridId": f"tw10km-{gx}-{gy}",
            "coordinateUncertaintyM": None, "generalizationRadiusM": 7100, "precision": "10 km grid cell centre; not sighting location",
            "licence": "CC BY 4.0", "iucnCategory": "LC",
        }})
        entry = species.setdefault(sid, {"id": sid, "name": name, "scientificName": name, "category": original["class"], "family": original["family"] or None, "taxonKey": record.get("taxonKey"), "acceptedName": record.get("species"), "count": 0, "yearCounts": collections.Counter(), "countyCounts": collections.Counter(), "firstDate": date, "lastDate": date, "sourceUrl": SOURCE_URL, "licence": "CC BY 4.0"})
        entry["count"] += 1
        entry["yearCounts"][date[:4]] += 1
        entry["countyCounts"][county] += 1
        entry["firstDate"] = min(entry["firstDate"], date)
        entry["lastDate"] = max(entry["lastDate"], date)

    features.sort(key=lambda f: (f["properties"]["date"], int(f["id"])))
    PUBLIC.mkdir(parents=True, exist_ok=True)
    geojson = {"type": "FeatureCollection", "features": features}
    path = PUBLIC / "wildlife.geojson"
    path.write_text(json.dumps(geojson, ensure_ascii=False, separators=(",", ":")))
    (PUBLIC / "wildlife.species.json").write_text(json.dumps({"species": sorted(species.values(), key=lambda s: (-s["count"], s["name"]))}, ensure_ascii=False, separators=(",", ":")))
    dates = [f["properties"]["date"] for f in features]
    now = dt.datetime.now(dt.timezone.utc).isoformat()
    coverage_en = f"Published subset dates: {min(dates)}–{max(dates)}. Conservation metadata checked for {fetched_count:,} of {expected:,} Least Concern records. "
    coverage_zh = f"公開子集日期：{min(dates)}–{max(dates)}；已核對 {fetched_count:,}／{expected:,} 筆無危紀錄的保育資訊。"
    manifest = {
        "section": "wildlife", "datasets": [{
            "id": "wildlife", "section": "wildlife", "title": {"en": "Roadkill archive · public subset", "zh": "路死觀察典藏・公開子集"},
            "description": {"en": "Citizen-science roadkill observations from the released 2011–2017 TaiRON archive. Each point is a generalized 10 km grid-cell centre.", "zh": "取自臺灣路死觀察網 2011–2017 公開典藏的公民科學紀錄。每個點皆為概化後的 10 公里網格中心。"},
            "sourceId": "roadkill", "sourceUrl": SOURCE_URL, "licence": "CC BY 4.0", "licenceUrl": "https://creativecommons.org/licenses/by/4.0/",
            "status": "available", "file": "/data/atlas/wildlife.geojson", "recordCount": len(features),
            "dateRange": [min(dates), max(dates)], "updatedAt": now,
            "limitation": {"en": coverage_en + "Conservative subset: only exact-name GBIF Least Concern matches screened against published terrestrial and marine protected lists. Fuzzy taxon matches, marine turtles/mammals, seabird groups, sea snakes and bats are omitted conservatively; this screen is not a legal status determination. Exact coordinates, observer details and individual source links are withheld. Map points are 10 km cell centres, not observation locations; multiple records may share a centre. Source coordinate accuracy is unknown; the 7.1 km generalization radius describes the grid only. Counts reflect reporting effort, not animal abundance or roadkill risk.", "zh": coverage_zh + "採保守公開子集：僅呈現學名完全符合的 GBIF 無危紀錄，並以公開陸域及海洋保育名錄篩檢。模糊分類匹配、海龜、海洋哺乳類、海鳥分類群、海蛇及蝙蝠皆保守排除；本篩檢不是法律上的保育等級認定。精確座標、觀察者及個別來源連結不公開。地圖點位是 10 公里網格中心，並非發現位置，多筆紀錄可能共用中心。來源座標準確度未知，7.1 公里概化半徑僅描述網格。通報數受觀察投入影響，不代表動物數量或路死風險。"},
            "fields": [
                {"key": "scientificName", "label": {"en": "Reported taxon", "zh": "原始分類名稱"}},
                {"key": "category", "label": {"en": "Reported class", "zh": "原始綱別"}},
                {"key": "family", "label": {"en": "Reported family", "zh": "原始科別"}},
                {"key": "observationId", "label": {"en": "Original observation ID", "zh": "原始觀察編號"}},
                {"key": "individualCount", "label": {"en": "Reported individuals", "zh": "原始個體數"}},
                {"key": "precision", "label": {"en": "Location precision", "zh": "位置精度"}},
            ], "statisticsFile": "/data/atlas/wildlife.species.json",
        }],
        "resources": [
            {"title": {"en": "TaiRON · contribute an observation", "zh": "臺灣路死觀察網・提供觀察紀錄"}, "url": "https://roadkill.tw/", "description": {"en": "Use the official network to contribute new observations. EcoAtlas does not collect user submissions in this release.", "zh": "請透過官方觀察網提供新紀錄；本版 EcoAtlas 不收集使用者通報。"}},
            {"title": {"en": "Released archive and methodology", "zh": "公開典藏與調查方法"}, "url": SOURCE_URL, "description": {"en": "Taiwan Biodiversity Research Institute, TaiBIF and GBIF. Lin T (2026), version 1.11, DOI 10.15468/cidkqi.", "zh": "農業部生物多樣性研究所、TaiBIF 與 GBIF；Lin T（2026），版本 1.11，DOI 10.15468/cidkqi。"}},
            {"title": {"en": "Official protected-species list", "zh": "官方陸域保育類野生動物名錄"}, "url": "https://www.forest.gov.tw/0008324", "description": {"en": "The currently published list is used only for a conservative exclusion screen. This atlas is not a legal status determination.", "zh": "以官方目前公布的名錄進行保守排除；本圖集不作法律上的保育等級認定。"}},
            {"title": {"en": "Official marine protected-species list", "zh": "官方海洋保育類野生動物名錄"}, "url": "https://www.forest.gov.tw/0008329", "description": {"en": "The published marine list supplements the terrestrial screen. Sensitive marine groups are conservatively omitted even where an individual legal status is uncertain.", "zh": "以公開海洋名錄補足陸域篩檢；海洋敏感分類群即使個別法律等級未確認，亦保守排除。"}},
        ],
    }
    (PUBLIC / "wildlife.metadata.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2))
    provenance = {
        "datasetKey": DATASET_KEY, "archiveUrl": ARCHIVE_URL, "archiveVersion": "1.11", "citation": "Lin T (2026). The Taiwan Roadkill Observation Network Data Set. Taiwan Biodiversity Research Institute. https://doi.org/10.15468/cidkqi",
        "archiveSha256": hashlib.sha256((RAW / "roadkill.zip").read_bytes()).hexdigest(), "protectedListUrl": PROTECTED_URL, "protectedListSha256": hashlib.sha256((RAW / "protected-2025.pdf").read_bytes()).hexdigest(),
        "marineProtectedListUrl": MARINE_PROTECTED_URL, "marineProtectedListSha256": hashlib.sha256((RAW / "protected-marine-2020.pdf").read_bytes()).hexdigest(),
        "publicSha256": hashlib.sha256(path.read_bytes()).hexdigest(), "processedAt": now,
        "sourceRecords": len(rows), "gbifLeastConcernRecords": expected, "gbifRecordsFetched": fetched_count, "conservationMetadataComplete": fetched_count == expected, "publicRecords": len(features), "publicTaxa": len(species), "rejectedFromLeastConcern": dict(rejected),
        "notLeastConcern": len(rows) - expected, "countyAssignment": "Official NLSC COUNTY_MOI_1140318 point-in-polygon before generalization; out-of-boundary records omitted.",
        "generalization": "10,000 m EPSG:3826 TM2 cells. Public WGS84 coordinates are cell centres rounded to five decimal places; no precise source coordinates are shipped. Genera in published terrestrial or marine protected lists are conservatively omitted.",
        "taxonScreening": "Original occurrenceID joined to released archive; reported scientificName must exactly match GBIF interpreted species (case-insensitive). Fuzzy GBIF matches are omitted. LC is a GBIF global assessment, not Taiwan legal protection status.",
        "conservativeOmissions": {"orders": sorted(WITHHELD_ORDERS), "families": sorted(WITHHELD_FAMILIES), "genera": sorted(WITHHELD_GENERA), "note": "Deliberate broad withholding where sensitivity is uncertain, not a legal protected-status classification."},
        "dateHandling": "Validated original numeric year/month/day, not ambiguous eventDate text; all dates restricted to 2011–2017.",
        "privacy": "Only LC records; publisher restrictions/coordinate flags filtered. No raw precise coordinates, observer identifiers, localities, media URLs or per-occurrence source URLs in public files.",
    }
    (PUBLIC / "wildlife.provenance.json").write_text(json.dumps(provenance, ensure_ascii=False, indent=2))
    print(json.dumps(provenance, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
