"""Prepare the David Rumsey "Plan von Constantinopel" (Scheda, 1869) for use
as a Leaflet image overlay on the Beyoglu map.

Steps:
  1. Crop the decorative outer border so the map plate fills the bounds.
  2. Downscale to a web-friendly size (longest edge ~3000 px).
  3. Re-encode as an optimized progressive JPEG.

Usage:
    pip install -r requirements.txt
    python scripts/process_historical_map.py

The 14 MB raw scan stays local (gitignored); only the optimized output under
static/maps/ is committed.
"""
from __future__ import annotations

import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "11517024.jpg"
OUT_DIR = ROOT / "static" / "maps"
OUTPUT = OUT_DIR / "scheda-1869-constantinople.jpg"

# Fraction of each edge to crop away. The David Rumsey scan has a wide
# decorative paper border and a thinner ornamental frame around the plate.
# These values were chosen by inspecting the scan; tweak if you re-process
# a re-scan with different margins.
CROP_FRACTION = {
    "left": 0.045,
    "right": 0.045,
    "top": 0.045,
    "bottom": 0.045,
}

# Web-friendly long edge. ~3000 px gives crisp detail at Leaflet zoom 15-17
# while keeping the JPEG well under 3 MB.
MAX_LONG_EDGE = 3000

# JPEG encoding parameters. quality=82 + progressive + optimize is a sweet
# spot for hand-drawn / softly-shaded historical maps.
JPEG_QUALITY = 82


def crop_border(im: Image.Image) -> Image.Image:
    w, h = im.size
    left = int(w * CROP_FRACTION["left"])
    right = int(w * (1.0 - CROP_FRACTION["right"]))
    top = int(h * CROP_FRACTION["top"])
    bottom = int(h * (1.0 - CROP_FRACTION["bottom"]))
    return im.crop((left, top, right, bottom))


def downscale(im: Image.Image) -> Image.Image:
    w, h = im.size
    long_edge = max(w, h)
    if long_edge <= MAX_LONG_EDGE:
        return im
    scale = MAX_LONG_EDGE / long_edge
    new_size = (int(round(w * scale)), int(round(h * scale)))
    return im.resize(new_size, Image.LANCZOS)


def main() -> None:
    if not SOURCE.exists():
        sys.stderr.write(
            f"[error] source scan not found: {SOURCE}\n"
            "Place the David Rumsey scan (11517024.jpg) at the repo root and re-run.\n"
        )
        sys.exit(1)

    OUT_DIR.mkdir(parents=True, exist_ok=True)

    print(f"[read] {SOURCE}")
    with Image.open(SOURCE) as im:
        im.load()
        if im.mode != "RGB":
            im = im.convert("RGB")
        print(f"  original: {im.size[0]}x{im.size[1]} {im.mode}")

        cropped = crop_border(im)
        print(f"  cropped:  {cropped.size[0]}x{cropped.size[1]}")

        scaled = downscale(cropped)
        print(f"  scaled:   {scaled.size[0]}x{scaled.size[1]}")

        scaled.save(
            OUTPUT,
            format="JPEG",
            quality=JPEG_QUALITY,
            optimize=True,
            progressive=True,
        )

    out_kb = OUTPUT.stat().st_size / 1024
    print(f"[write] {OUTPUT} ({out_kb:.0f} KB)")


if __name__ == "__main__":
    main()
