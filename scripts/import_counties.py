"""Convert official dataset 7442. No polygon simplification or invented geometry."""
import argparse
import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path
import geopandas as gpd
from pyproj.transformer import TransformerGroup
from shapely.ops import transform

CATALOGUE = "https://data.gov.tw/en/datasets/7442"
DOWNLOAD = "https://www.tgos.tw/tgos/VirtualDir/Product/1cd4f4c9-6b01-4cf9-bf6c-23a73aa17d24/%E7%9B%B4%E8%BD%84%E5%B8%82%E3%80%81%E7%B8%A3%28%E5%B8%82%29%E7%95%8C%E7%B7%9A1140318.zip"

def run(archive, output):
    archive, output = Path(archive), Path(output)
    frame = gpd.read_file(archive)
    if frame.crs is None:
        raise ValueError("Missing source CRS; do not guess")
    if len(frame) != 22 or frame.COUNTYCODE.nunique() != 22 or not frame.is_valid.all():
        raise ValueError("Expected 22 unique valid administrative geometries")
    original_crs = frame.crs.to_wkt()
    group = TransformerGroup(frame.crs, "EPSG:4326", always_xy=True)
    approved = [t for t in group.transformers if 0 <= t.accuracy <= 1]
    if not approved:
        raise ValueError("No verified non-ballpark WGS84 transformation")
    transformer = approved[0]
    frame.geometry = frame.geometry.map(lambda geometry: transform(transformer.transform, geometry))
    frame = frame.set_crs("EPSG:4326", allow_override=True)
    frame = frame[["COUNTYCODE", "COUNTYNAME", "COUNTYENG", "geometry"]].sort_values("COUNTYCODE")
    result = json.loads(frame.to_json(drop_id=True))
    def rounded(value):
        return [rounded(x) if isinstance(x, list) else round(x, 7) for x in value]
    for feature in result["features"]:
        feature["id"] = feature["properties"]["COUNTYCODE"]
        feature["geometry"]["coordinates"] = rounded(feature["geometry"]["coordinates"])
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(result, ensure_ascii=False, separators=(",", ":")))
    metadata = {"source": CATALOGUE, "download": DOWNLOAD, "edition": "2025-03-18", "retrievedAt": datetime.now(timezone.utc).isoformat(), "sourceSha256": hashlib.sha256(archive.read_bytes()).hexdigest(), "outputSha256": hashlib.sha256(output.read_bytes()).hexdigest(), "sourceCrsWkt": original_crs, "targetCrs": "EPSG:4326", "transformation": transformer.description, "transformationAccuracyMetres": transformer.accuracy, "countyCount": 22, "simplified": False, "coordinateDecimalPlaces": 7, "licence": "Open Government Data License 1.0", "licenceUrl": "https://data.gov.tw/license", "bounds": frame.total_bounds.tolist()}
    output.with_suffix(".metadata.json").write_text(json.dumps(metadata, ensure_ascii=False, indent=2))
    print(f"Validated and converted {len(frame)} counties → {output} ({output.stat().st_size:,} bytes)")

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("archive")
    parser.add_argument("--output", default="public/data/counties.geojson")
    args = parser.parse_args()
    run(args.archive, args.output)
