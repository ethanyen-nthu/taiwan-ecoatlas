"""Shared import checks for the official culture and Taipei inventory releases."""
from __future__ import annotations

import hashlib
import json
import math
import re
from datetime import date
from pathlib import Path

from pyproj import CRS
from pyproj.transformer import TransformerGroup
from shapely.geometry import Point, shape
from shapely.prepared import prep

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / "data/raw"
OUT = ROOT / "public/data/atlas"
LICENCE = "Open Government Data License 1.0"
LICENCE_URL = "https://data.gov.tw/license"
COUNTIES = json.loads((ROOT / "public/data/counties.geojson").read_text())
COUNTY_GEOMETRIES = {f["properties"]["COUNTYCODE"]: shape(f["geometry"]) for f in COUNTIES["features"]}
COUNTY_PREPARED = {code: prep(geom) for code, geom in COUNTY_GEOMETRIES.items()}
GROUP = TransformerGroup(CRS.from_epsg(3826), CRS.from_epsg(4326), always_xy=True, allow_ballpark=False)
TRANSFORM = GROUP.transformers[0]
if TRANSFORM.accuracy < 0 or TRANSFORM.accuracy > 1:
    raise RuntimeError("Expected the official non-ballpark 1-m TWD97→WGS84 operation")


def text(value):
    return str(value).strip() if value is not None else ""


def number(value, minimum=0, maximum=math.inf):
    try:
        n = float(value)
        return n if math.isfinite(n) and minimum <= n <= maximum else None
    except (TypeError, ValueError):
        return None


def record_date(value):
    """Parse explicit ISO or Taiwanese civil dates; 1899 spreadsheet defaults are missing."""
    s = text(value)
    if not s:
        return None
    if re.fullmatch(r"\d{7}", s):
        y, m, d = int(s[:3]) + 1911, int(s[3:5]), int(s[5:7])
    elif re.fullmatch(r"\d{8}", s):
        y, m, d = int(s[:4]), int(s[4:6]), int(s[6:8])
    else:
        match = re.match(r"^(\d{3,4})[-/](\d{1,2})[-/](\d{1,2})(?:[ T].*)?$", s)
        if not match:
            return None
        y, m, d = map(int, match.groups())
        if y < 1911:
            y += 1911
    try:
        result = date(y, m, d)
        return result.isoformat() if date(1950, 1, 1) <= result <= date.today() else None
    except ValueError:
        return None


def point(longitude, latitude, county_code=None):
    lon, lat = number(longitude, 117, 125), number(latitude, 20, 27)
    if lon is None or lat is None:
        return None
    p = Point(lon, lat)
    if county_code and (county_code not in COUNTY_PREPARED or not COUNTY_PREPARED[county_code].covers(p)):
        return None
    return {"type": "Point", "coordinates": [round(lon, 7), round(lat, 7)]}


def feature(identifier, geometry, properties):
    return {"type": "Feature", "id": identifier, "geometry": geometry, "properties": {"id": identifier, **properties}}


def save(name, obj):
    OUT.mkdir(parents=True, exist_ok=True)
    p = OUT / name
    p.write_text(json.dumps(obj, ensure_ascii=False, separators=(",", ":")) + "\n")
    return {"file": f"/data/atlas/{name}", "sha256": hashlib.sha256(p.read_bytes()).hexdigest(), "bytes": p.stat().st_size}


def collection(features):
    ids = [f["id"] for f in features]
    if len(set(ids)) != len(ids):
        raise ValueError("Duplicate public identifiers")
    return {"type": "FeatureCollection", "features": features}


def date_range(features):
    dates = sorted(f["properties"]["date"] for f in features if f["properties"].get("date"))
    return [dates[0], dates[-1]] if dates else None


def source_hash(name):
    return hashlib.sha256((RAW / name).read_bytes()).hexdigest()
