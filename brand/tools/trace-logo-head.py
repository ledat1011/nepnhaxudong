"""Traces the head of the simplified logo mascot (brand/logo/mascot-logo.svg) from the approved
mascot illustration. build-logo-mascot.mjs runs it; it draws body, rice and hands itself.

Source: the same AI-generated raster illustration as vectorize-mascot.py (approved on 2026-11-03,
kept outside the repository), read through its read_source(), so the same SHA-256 check applies.

    python trace-logo-head.py SOURCE.png RICE_MASK.png OUT.json [--any-source]

RICE_MASK.png is the drawn rice group rendered at the source size (alpha = rice). OUT.json gets
{"head": [[d, fill], ...], "icon": [[d, fill], ...]} in 512 x 512 units:
- head: the mascot's head, with holes where the drawn rice lies in front of it;
- icon: the whole head for logo-icon, cut below the chin, as one piece without holes.

Steps, on top of vectorize-mascot.py's classify / split / trace:
1. Fewer details: the hat ribs become straw, the crow's feet beside the eyes become skin, the strand
   lines inside the black hair become hair.
2. Thicker lines: every Nâu đất pixel of the head grows by OUTLINE_GROW, so the traced lines match
   the 6-unit outline of the drawn body.
3. Smoother edges: a MODE_SIZE mode filter (MODE_PASSES times) before the trace, and coarser curve
   fitting (TRACE_SETTINGS).
4. The whole head: closed over what the rice hides, smoothed, cut below the chin (whole_head()).
"""
import argparse
import importlib.util
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image

spec = importlib.util.spec_from_file_location('vectorize_mascot', Path(__file__).with_name('vectorize-mascot.py'))
vm = importlib.util.module_from_spec(spec)
spec.loader.exec_module(vm)

HEAD, DARK, GOLD, STRAW, SKIN, CHEEK, HAIR = (
    vm.HEAD, *(vm.BRAND.index(c) for c in (vm.DARK, vm.GOLD, vm.STRAW, vm.SKIN, vm.CHEEK, vm.HAIR)))

# Crow's feet beside the eyes (x0, y0, x1, y1), in source pixels.
CROWS_FEET = [(385, 310, 425, 350), (635, 295, 680, 340)]
# Hair strand lines: Nâu đất pixels inside the hair closed with this radius, next to hair.
HAIR_CLOSE = 8
HAIR_NEAR = 2
OUTLINE_GROW = 3
MODE_SIZE = 9
MODE_PASSES = 2
TRACE_SETTINGS = {**vm.TRACE, 'filter_speckle': 24, 'corner_threshold': 135, 'length_threshold': 20.0,
                  'splice_threshold': 60}

# The whole head for logo-icon: the head part closed with this radius (it takes in the brim and
# hair the rice hides, and the loose brim bits between the leaves), cut at WHOLE_CUT (below the
# chin, so the long hair does not make the icon tall), outlined WHOLE_OUTLINE wide where guessed
# (as wide as the head's own lines after OUTLINE_GROW).
WHOLE_CLOSE = 64
WHOLE_CUT = 515
WHOLE_OUTLINE = 12
# The closed head is smoothed with a box filter this wide, so leaf outline bits that stick out go
# and the guessed brim edge is an even curve.
WHOLE_BLUR = 21
# The brim's lower-left edge, which the rice hides: a smooth curve on from the visible left edge
# (source x 176-190, y 300-372) to where the brim goes behind the hair and ear. Above it is hat,
# below it nothing; without it the closing leaves a flat, notched "foot" there.
BRIM_EDGE = [(176, 300), (178, 340), (190, 372), (212, 394), (246, 410), (290, 420), (330, 426), (360, 428)]
# On from there, just outside the face's lower-left outline down to the chin: below it the rice hid
# only leaf and outline bits, which the closing would fill as a dark wedge.
CHIN_EDGE = [(398, 458), (450, 484), (490, 500), (560, 510)]
BRIM_SAMPLES = 16
# Head pixels this close to skin, cheek or hair stay as they are in the brim zone (ear, face, hair
# and their outlines); other head pixels there are leaf and brim bits between the leaves.
BRIM_KEEP_NEAR = 10


def simplify(part, color):
    """Steps 1 and 2 on a copy of color."""
    color = color.copy()
    ys, xs = np.mgrid[0:vm.SOURCE_SIZE, 0:vm.SOURCE_SIZE]
    head = part == HEAD
    color[head & (color == GOLD)] = STRAW
    for x0, y0, x1, y1 in CROWS_FEET:
        color[head & (color == DARK) & (xs >= x0) & (xs < x1) & (ys >= y0) & (ys < y1)] = SKIN
    hair = head & (color == HAIR)
    inside = vm.erode(vm.dilate(hair, HAIR_CLOSE), HAIR_CLOSE) & vm.dilate(hair, HAIR_NEAR)
    color[head & (color == DARK) & inside] = HAIR
    color[vm.dilate(head & (color == DARK), OUTLINE_GROW) & head] = DARK
    return color


def largest_region(mask):
    if not mask.any():
        raise SystemExit('no head pixels: wrong source image?')
    ids, regions = vm.components(mask.astype(np.int8))
    best = max((rid for rid, r in enumerate(regions) if r['value']), key=lambda rid: regions[rid]['area'])
    return ids == best


def whole_head(part, color):
    """The head part with the pixels the rice hides painted in (hat under the brim, hair, skin), cut
    below the chin, as one piece. Returns (mask, color)."""
    head = part == HEAD
    rows = np.arange(vm.SOURCE_SIZE)[:, None]
    full = vm.fill_holes(vm.erode(vm.dilate(head, WHOLE_CLOSE), WHOLE_CLOSE) | head)
    # Box filter, then keep the pixels more than half inside: a smoothed silhouette.
    full = (vm.box_mean(full.astype(float), WHOLE_BLUR) >= 0.5) & (rows < WHOLE_CUT)
    # The lower-left brim follows BRIM_EDGE: hat above the curve, nothing below it.
    edge = [tuple(p) for p in vm.catmull_rom(BRIM_EDGE, BRIM_SAMPLES)]
    y0, x1 = BRIM_EDGE[0][1], BRIM_EDGE[-1][0]
    brim = vm.polygon_mask(edge + [(x1, y0)])
    chin = CHIN_EDGE[-1][0]
    below = vm.polygon_mask(edge + CHIN_EDGE + [(chin, vm.SOURCE_SIZE), (0, vm.SOURCE_SIZE), (0, y0)])
    keep = head & vm.dilate(head & np.isin(color, [SKIN, CHEEK, HAIR]), BRIM_KEEP_NEAR)
    head = head & ~((brim | below) & ~keep)
    full = (full | brim) & ~(below & ~brim)
    full = vm.fill_holes(largest_region(full))
    fills = head & (color != DARK)
    guessed = full & ~head
    # Through the head's outlines too, so a guessed area that they close off still gets a color.
    painted = vm.spread(np.where(fills, color, -1), fills, guessed | (head & ~fills))
    colors = np.where(head, color, painted)
    # The guessed brim is hat, also where the nearest known color is the ear or face next to it.
    colors[guessed & brim] = STRAW
    # Outlines along the whole smoothed silhouette and the cut, and where two fill colors meet in
    # the guessed areas (hat brim against hair or face).
    border = full & vm.dilate(~full, WHOLE_OUTLINE)
    fill_color = np.where(fills | guessed, colors, -1)
    seam = np.zeros_like(full)
    for dy, dx in ((1, 0), (0, 1)):
        moved = vm.shift(fill_color, dy, dx)
        seam |= (moved != fill_color) & (moved >= 0) & (fill_color >= 0)
    seam = vm.dilate(seam & guessed, WHOLE_OUTLINE // 2) & guessed
    colors = np.where(border | seam, DARK, colors)
    return full, np.where(full, colors, -1)


def mode_filter(mask, colors):
    """Each pixel takes the most common color (transparent counts as one) in a MODE_SIZE square."""
    label = np.where(mask, colors, -1)
    values = list(range(-1, len(vm.BRAND)))
    for _ in range(MODE_PASSES):
        counts = np.stack([vm.box_mean((label == v).astype(float), MODE_SIZE) for v in values])
        label = np.array(values)[counts.argmax(0)]
    return label >= 0, np.where(label >= 0, label, 0)


def trace(mask, colors):
    return vm.trace(*mode_filter(mask, colors), TRACE_SETTINGS)


def main(argv):
    parser = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    parser.add_argument('source')
    parser.add_argument('rice_mask', help='the drawn rice group as PNG, source size, alpha = rice')
    parser.add_argument('out', type=Path)
    parser.add_argument('--any-source', action='store_true', help='skip the SHA-256 check of the source')
    args = parser.parse_args(argv)
    pixels = vm.read_source(args.source, args.any_source)
    rice = Image.open(args.rice_mask)
    if rice.size != (vm.SOURCE_SIZE, vm.SOURCE_SIZE):
        raise SystemExit(f'rice mask must be {vm.SOURCE_SIZE} x {vm.SOURCE_SIZE}, got {rice.size}')
    rice = np.asarray(rice.convert('RGBA'))[..., 3] >= 128
    part, color = vm.assign_parts(vm.classify_picture(pixels))
    color = simplify(part, color)
    head = part == HEAD
    whole, whole_colors = whole_head(part, color)
    # The mascot keeps the long hair below the icon's cut, and leaves a hole where the rice is.
    mascot = (whole | head) & ~rice
    mascot_colors = np.where(head, color, whole_colors)
    result = {'head': trace(mascot, mascot_colors), 'icon': trace(whole, whole_colors)}
    args.out.write_text(json.dumps(result), encoding='utf-8')


if __name__ == '__main__':
    main(sys.argv[1:])
