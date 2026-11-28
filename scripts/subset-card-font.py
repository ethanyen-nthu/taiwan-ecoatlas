#!/usr/bin/env python3
"""Cut the small font the share images are drawn with.

The share images (the pictures a link shows in LINE) are drawn on the server
by Satori, which needs a font file and cannot use the system's. Shipping a
whole Chinese font would be about 16 MB per weight, so this keeps only the
glyphs the images can print: the characters in the files that hold their
words, the names of the 22 counties, and plain ASCII with a few symbols.

Source: Noto Sans CJK (SIL Open Font License 1.1), the Traditional Chinese
face of the .ttc file. Run it again whenever a Chinese word is added to one
of the files below:

    python3 scripts/subset-card-font.py /path/to/NotoSansCJK-Regular.ttc \
                                         /path/to/NotoSansCJK-Bold.ttc

It writes src/assets/fonts/card-regular.otf, card-bold.otf and card-glyphs.txt
(the characters kept), which tests/county-card.test.ts checks every word
against, so a missing glyph fails a test instead of printing an empty box.
"""
import json
import re
import sys
from pathlib import Path

from fontTools import subset
from fontTools.ttLib import TTCollection, TTFont

root = Path(__file__).resolve().parent.parent
sources = [
    root / "src/lib/county-card.ts",
    root / "src/app/opengraph-image.tsx",
    root / "src/app/county/[code]/opengraph-image.tsx",
]
cjk = re.compile(r"[　-〿一-鿿＀-￯‐-‟]")


def characters() -> str:
    found = set()
    for path in sources:
        if path.exists():
            found.update(cjk.findall(path.read_text(encoding="utf8")))
    outlines = json.loads((root / "public/data/county-outlines.json").read_text("utf8"))
    for county in outlines.values():
        found.update(cjk.findall(county["name"]))
    ascii_text = "".join(chr(code) for code in range(0x20, 0x7F))
    symbols = "µ³²°·–—−’“”…×≈→↑↓±"
    return ascii_text + symbols + "".join(sorted(found))


def traditional_chinese_face(path: str) -> TTFont:
    collection = TTCollection(path)
    for font in collection.fonts:
        family = font["name"].getDebugName(1) or ""
        if family.endswith(" TC"):
            return font
    raise SystemExit(f"No Traditional Chinese face in {path}")


def cut(path: str, out: Path, text: str) -> None:
    font = traditional_chinese_face(path)
    options = subset.Options()
    options.layout_features = ["kern", "locl"]
    options.name_IDs = [0, 1, 2, 3, 4, 5, 6, 13, 14]
    options.notdef_outline = True
    options.hinting = False
    subsetter = subset.Subsetter(options)
    subsetter.populate(text=text)
    subsetter.subset(font)
    font.flavor = None
    font.save(out)
    print(out, out.stat().st_size, "bytes")


def main() -> None:
    if len(sys.argv) != 3:
        raise SystemExit(__doc__)
    text = characters()
    target = root / "src/assets/fonts"
    target.mkdir(parents=True, exist_ok=True)
    cut(sys.argv[1], target / "card-regular.otf", text)
    cut(sys.argv[2], target / "card-bold.otf", text)
    (target / "card-glyphs.txt").write_text("".join(sorted(set(text))), encoding="utf8")
    print(len(set(text)), "characters kept")


main()
