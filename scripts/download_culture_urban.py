"""Download official public culture/urban inputs; does not run in production.

Run with .venv/bin/python scripts/download_culture_urban.py, followed by the
two import scripts. Raw inputs are ignored by Git. Existing files are replaced
only when this explicit refresh command is run.
"""
from io import BytesIO
from pathlib import Path
from urllib.request import Request, urlopen
from zipfile import ZipFile

RAW = Path(__file__).resolve().parents[1] / "data/raw"
SOURCES = {
    "cip-villages.json": "https://data.cip.gov.tw/API/v1/dump/datastore/A53000000A-111027-001",
    "cip-trails.json": "https://data.cip.gov.tw/API/v1/dump/datastore/A53000000A-112072-001",
    "tourism-trails.zip": "https://media.taiwan.net.tw/XMLReleaseAll_public/v2.0/Zh_tw/Trail-json.zip",
    "taipei-parks.json": "https://parks.gov.taipei/parks/api/",
    "taipei-park-trees.json": "https://tppkl.blob.core.windows.net/blobfs/TaipeiParkTree.json",
    "taipei-riverside-trees.csv": "https://data.taipei/api/frontstage/tpeod/dataset/resource.download?rid=99346ee9-c667-451d-badc-7c2c3797da5a",
}


def main():
    RAW.mkdir(parents=True, exist_ok=True)
    for filename, url in SOURCES.items():
        with urlopen(Request(url, headers={"User-Agent": "TaiwanEcoAtlas-public-data-import/1.0"}), timeout=180) as response:
            payload = response.read()
        (RAW / filename).write_bytes(payload)
        print(f"{filename}: {len(payload):,} bytes")
        if filename == "tourism-trails.zip":
            # The first ZIP member is a CSV manifest, not the route JSON.
            with ZipFile(BytesIO(payload)) as archive:
                member = next(n for n in archive.namelist() if n.endswith("TrailList.json"))
                (RAW / "tourism-trails.json").write_bytes(archive.read(member))


if __name__ == "__main__":
    main()
