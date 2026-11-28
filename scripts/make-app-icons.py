#!/usr/bin/env python3
"""Draw the installable-app icons from the same leaf as src/app/icon.svg.

Needs ImageMagick (`convert`). Writes into public/:
  icon-192.png, icon-512.png   the rounded icon, transparent corners
  icon-maskable-512.png        full-bleed, leaf inside the safe circle, for
                               launchers that crop the icon to their own shape
  apple-touch-icon.png         180 px, full-bleed and opaque (iOS fills any
                               transparent corner with black)
Run again only if the leaf or the colours change.
"""
import subprocess
import tempfile
from pathlib import Path

GREEN = "#236d55"
LEAF = "#f3f7ed"
PATH = "M19 44C8 20 37 26 45 13c5 19 1 36-19 33M20 51c1-15 10-22 20-29"
PUBLIC = Path(__file__).resolve().parent.parent / "public"


def svg(body: str) -> str:
    return (
        '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" '
        f'viewBox="0 0 64 64">{body}</svg>'
    )


def leaf(scale: float, stroke: float) -> str:
    # Scale about the middle of the 64-unit square; keep the stroke ratio.
    shift = 32 * (1 - scale)
    return (
        f'<g transform="translate({shift:.3f} {shift:.3f}) scale({scale})">'
        f'<path d="{PATH}" fill="none" stroke="{LEAF}" stroke-width="{stroke}" '
        'stroke-linecap="round" stroke-linejoin="round"/></g>'
    )


ROUNDED = svg(f'<rect width="64" height="64" rx="16" fill="{GREEN}"/>' + leaf(1, 3))
# The safe zone is the inner 80% circle, so the leaf (about 38 x 38 units at
# full size) is drawn at 0.8 and the stroke thickened to stay legible small.
FULL = lambda scale: svg(
    f'<rect width="64" height="64" fill="{GREEN}"/>' + leaf(scale, 3.4)
)

JOBS = [
    ("icon-192.png", ROUNDED, 192),
    ("icon-512.png", ROUNDED, 512),
    ("icon-maskable-512.png", FULL(0.8), 512),
    ("apple-touch-icon.png", FULL(0.9), 180),
]

with tempfile.TemporaryDirectory() as scratch:
    for name, source, size in JOBS:
        tmp = Path(scratch) / (name + ".svg")
        tmp.write_text(source)
        subprocess.run(
            [
                "convert", "-background", "none", "-density", str(size * 6),
                str(tmp), "-resize", f"{size}x{size}", "-strip", str(PUBLIC / name),
            ],
            check=True,
        )
        print("wrote", name)
