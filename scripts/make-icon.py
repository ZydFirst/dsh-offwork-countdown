"""Render the market-card icon (assets/icon-256.png) from the same geometry as icon.svg.

The SVG is the vector source; this script rasterises the same shapes with Pillow so the
plugin can publish a GitHub-hosted PNG for storefronts that only accept raster icons.

Run from the repository root:  python scripts/make-icon.py
"""

from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

S = 4  # supersample factor: draw in 4x the 64-unit viewBox, then downscale
UNIT = 64 * S
OUT = Path(__file__).resolve().parent.parent / "assets" / "icon-256.png"


def vertical_gradient(size, top, bottom):
    """RGBA image with a linear vertical gradient between two RGB tuples."""
    width, height = size
    t = np.linspace(0.0, 1.0, height)[:, None]
    rgb = np.array(top, dtype=float) * (1 - t) + np.array(bottom, dtype=float) * t
    rgb = np.repeat(rgb[:, None, :], width, axis=1)
    alpha = np.full((height, width, 1), 255.0)
    return Image.fromarray(np.concatenate([rgb, alpha], axis=2).round().astype(np.uint8))


def round_cap_line(draw, start, end, fill, width):
    (x1, y1), (x2, y2) = start, end
    draw.line([x1, y1, x2, y2], fill=fill, width=width)
    r = width / 2
    for x, y in (start, end):
        draw.ellipse([x - r, y - r, x + r, y + r], fill=fill)


def main():
    canvas = Image.new("RGBA", (UNIT, UNIT), (0, 0, 0, 0))

    # Rounded sky tile.
    sky = vertical_gradient((UNIT, UNIT), (42, 51, 80), (21, 27, 45))
    mask = Image.new("L", (UNIT, UNIT), 0)
    ImageDraw.Draw(mask).rounded_rectangle(
        [2 * S, 2 * S, 62 * S, 62 * S], radius=16 * S, fill=255
    )
    canvas.paste(sky, (0, 0), mask)

    # Sun with its own gradient, limited to the sun's bounding box.
    sun_r = 13 * S
    sun_cx, sun_cy = 32 * S, 30 * S
    sun_box = [sun_cx - sun_r, sun_cy - sun_r, sun_cx + sun_r, sun_cy + sun_r]
    sun = vertical_gradient((2 * sun_r, 2 * sun_r), (255, 209, 122), (255, 125, 71))
    sun_mask = Image.new("L", (UNIT, UNIT), 0)
    ImageDraw.Draw(sun_mask).ellipse(sun_box, fill=255)
    sun_layer = Image.new("RGBA", (UNIT, UNIT), (0, 0, 0, 0))
    sun_layer.paste(sun, (sun_box[0], sun_box[1]), sun_mask.crop(sun_box))
    canvas = Image.alpha_composite(canvas, sun_layer)

    # Clock hands and hub.
    hands = Image.new("RGBA", (UNIT, UNIT), (0, 0, 0, 0))
    draw = ImageDraw.Draw(hands)
    hub = (32 * S, 30 * S)
    round_cap_line(draw, hub, (32 * S, 21 * S), (255, 255, 255, 235), int(2.6 * S))
    round_cap_line(draw, hub, (39.5 * S, 34.5 * S), (255, 255, 255, 153), int(2.6 * S))
    hub_r = 2.4 * S
    draw.ellipse([hub[0] - hub_r, hub[1] - hub_r, hub[0] + hub_r, hub[1] + hub_r], fill=(255, 255, 255, 255))
    canvas = Image.alpha_composite(canvas, hands)

    # Horizon bars.
    draw = ImageDraw.Draw(canvas)
    draw.rounded_rectangle([9 * S, 46 * S, 55 * S, 51 * S], radius=2.5 * S, fill=(59, 70, 104, 255))
    draw.rounded_rectangle([9 * S, 54 * S, 35 * S, 58 * S], radius=2 * S, fill=(43, 52, 82, 255))

    OUT.parent.mkdir(parents=True, exist_ok=True)
    canvas.resize((256, 256), Image.LANCZOS).save(OUT)
    print(f"wrote {OUT} ({OUT.stat().st_size} bytes)")


if __name__ == "__main__":
    main()
