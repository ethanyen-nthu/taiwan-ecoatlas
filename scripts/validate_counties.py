"""Validate the processed official map before publication."""
import hashlib
import json
from pathlib import Path
import geopandas as gpd
from shapely.geometry import Point
path = Path("public/data/counties.geojson")
metadata = json.loads(path.with_suffix(".metadata.json").read_text())
assert hashlib.sha256(path.read_bytes()).hexdigest() == metadata["outputSha256"]
frame = gpd.read_file(path)
assert frame.crs.to_epsg() == 4326 and len(frame) == 22 and frame.COUNTYCODE.nunique() == 22
assert frame.is_valid.all() and not frame.is_empty.any()
for name, code, lon, lat in [
    ("Penghu", "10016", 119.566, 23.571), ("Kinmen", "09020", 118.318, 24.432),
    ("Matsu", "09007", 119.932, 26.155), ("Green Island", "10014", 121.49, 22.65),
    ("Orchid Island", "10014", 121.55, 22.04),
]:
    assert frame.loc[frame.COUNTYCODE == code].geometry.iloc[0].covers(Point(lon, lat)), name
assert metadata["simplified"] is False
print("PASS: checksums, WGS84, 22 valid bilingual counties and required offshore islands")
