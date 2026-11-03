"""Builds brand/mascot/mascot-layered.svg and head-full.svg from the approved mascot illustration.

Source: an AI-generated raster illustration (1024 x 1024 PNG, girl with a nón lá holding a rice
sheaf) that the owner approved on 2026-11-03. The PNG is not kept in the repository; pass its path.

    python vectorize-mascot.py SOURCE.png OUT.svg [--head-full HEAD.svg] [--debug DIR]

Steps:
1. Classify every pixel to one of the source colors (ANCHORS), in CIE Lab. A pixel between two
   source colors (an antialiased edge) goes to the nearer end of that pair, so edges get no halo color.
2. Split the picture into the four animation parts (body, rice, hands, head) by connected regions,
   with the rules in assign_parts(). Outlines go to the highest part next to them.
3. Fill what each lower part needs under the parts above it, so a tilted head (±3°) or rice (±6°)
   shows no hole: the body silhouette under everything, the head's colors in the body where the rice
   lies in front of the head, rice under the hands, every part a few pixels under the next.
4. Replace the straw section of the rice (from under the grain heads to the cut ends) with drawn
   straws, rope tie and leaf end (redraw_straws()); traced, its thin lines broke into bits and blobs.
5. Smooth each part (3 x 3 majority; the drawn pixels are kept as drawn), trace it on its own with
   vtracer, snap each color to the brand palette, scale to 512 x 512 and write compact relative
   path data.
6. Write head-full.svg for logo-icon: the head with the pixels the rice hides painted in, cut below
   the chin (head_full()). The mascot's own head keeps those holes, since the leaves lie in front.

Needs Python 3 with numpy, Pillow and vtracer (built with vtracer 0.6.15).

The rules and pixel positions below fit this one illustration (1024 x 1024 source coordinates).
"""
import argparse
import re
import sys
from collections import deque
from pathlib import Path

import numpy as np
import vtracer
from PIL import Image, ImageDraw

SOURCE_SIZE = 1024
OUT_SIZE = 512
SCALE = OUT_SIZE / SOURCE_SIZE

DARK = '#4A2C1A'
BLOUSE = '#8B5A2B'
GOLD = '#D9A13B'
STRAW = '#F2E2B6'
CHEEK = '#E59A84'
LEAF = '#6E8B3D'
SKIN = '#F4CDA8'
HAIR = '#222222'
BRAND = [DARK, BLOUSE, GOLD, STRAW, CHEEK, LEAF, SKIN, HAIR]

# Source color -> brand color (None = background, left transparent). Ink colors are outlines,
# hair and eyes: a pixel between ink and another color goes to the ink when it is nearer to it.
ANCHORS = [
    ('background', '#F8F3E7', None, False),
    ('outline', '#4E2F1C', DARK, True),
    ('hair', '#22211E', HAIR, True),
    ('grain-outline', '#724415', DARK, True),
    ('blouse', '#985B30', BLOUSE, False),
    ('skin', '#FAC8A2', SKIN, False),
    ('cheek', '#EA8F7A', CHEEK, False),
    ('skin-shade', '#E9A179', SKIN, False),
    ('gold', '#EEB751', GOLD, False),
    ('gold-shade', '#B17D36', GOLD, False),
    ('hat-light', '#F7DBAB', STRAW, False),
    ('straw', '#EECB97', STRAW, False),
    ('straw-shade', '#E7B974', STRAW, False),
    ('leaf', '#908A3D', LEAF, False),
    ('leaf-shade', '#645421', DARK, False),
]
ANCHOR_INDEX = {name: i for i, (name, *_) in enumerate(ANCHORS)}

BODY, RICE, HANDS, HEAD = range(4)
PARTS = ['body', 'rice', 'hands', 'head']

# Part rules, in source pixels. HEAD_ZONE is a rough outline of hat, hair, face and ears (not the
# neck): a straw, skin or hair region whose center lies in it belongs to the head. Skin outside it
# is the neck above HANDS_TOP and the hands with their forearms below it.
HEAD_ZONE = [(150, 380), (150, 260), (330, 110), (525, 40), (720, 110), (910, 290), (910, 380),
             (790, 480), (785, 705), (665, 705), (645, 520), (630, 497), (560, 500), (480, 492),
             (400, 470), (320, 440)]
HANDS_TOP = 600
# Black hair regions smaller than this are dark cores of outlines (eye lines), not hair: they keep
# their part but are drawn Nâu đất.
HAIR_MIN_AREA = 1500
# Regions smaller than this take the part and color around them (edge speckles).
SPECKLE_AREA = 40
# Dark gold between grains can read as blouse; such a bit would pull the body out under the rice.
BLOUSE_SPECKLE_AREA = 100
OUTLINE_REACH = 14
# The grain outline shade counts only this close to RICE_ANCHORS.
RICE_ANCHORS = ['gold', 'gold-shade', 'leaf', 'leaf-shade', 'straw', 'straw-shade', 'hat-light']
GRAIN_OUTLINE_REACH = 12
# Background regions enclosed by the figure and smaller than this are light lines (hat ribs).
BACKGROUND_HOLE_AREA = 600
# Elsewhere in the rice a shade pixel within this distance of gold is gold (grain rims). In the
# hat, a gold or shade pixel farther than this from an outline is a rib line and is gold.
SHADE_REACH = 3

# The straw section (from under the grain heads down to the cut ends) is drawn, not traced: traced,
# its thin straw lines broke into bits and blobs. Source pixels.
# STRAW_EDGE_A / STRAW_EDGE_B: the bundle's upper-right and lower-left edges at matching stations,
# top first. The STRAWS straws run between them, so they fan out where the bundle is wider. What the
# leaves, grains or hands cover, or what lies outside the traced rice, is not shown (the straws run
# on under it), except between the hands (MID_REGION) and below the sleeve (LOW_REGION), where the
# drawn shapes are the straws' edge and cut ends.
STRAW_EDGE_A = [(330, 440), (410, 505), (500, 575), (590, 648), (670, 719), (775, 770), (958, 908)]
STRAW_EDGE_B = [(250, 555), (330, 615), (400, 672), (450, 738), (575, 870), (652, 915), (742, 1018)]
STRAWS = 16
STRAW_SAMPLES = 60
# Each line between two straws wavers by up to this share of the straw width, so no straw is a
# straight plank of constant width.
STRAW_WAVE = 0.22
STRAW_LINE_WIDTH = 3
# The shade: at this share across the straw, this wide, from this share of the bundle's length.
STRAW_SHADE_AT = 0.35
STRAW_SHADE_WIDTH = 5
STRAW_SHADE_FROM = 0.3
# Every STRAW_LINE_STEP-th point of a line is written; a line stops STRAW_LINE_CLEAR pixels before
# an outline, the rope or anything that covers the straws.
STRAW_LINE_STEP = 3
STRAW_LINE_CLEAR = 2
STRAW_OUTLINE = 6
# Every STRAW_DEPTH_LINE-th line (counted from STRAW_DEPTH_FIRST) is Nâu áo, the others Vàng lúa.
STRAW_DEPTH_LINE = 5
STRAW_DEPTH_FIRST = 3
# The straws end in pairs. A pair is cut up to END_JITTER stations short of the last one, at least
# END_STEP away from its neighbour, with a round end END_DEPTHS deep (share of its half width).
END_JITTER = 0.18
END_STEP = 0.06
# Over the last END_ZONE stations the line between two pairs is a Nâu đất outline this wide.
END_ZONE = 0.3
END_LINE_WIDTH = 4
END_DEPTHS = (0.55, 0.8, 1.0)
STRAW_SEED = 7
# Grains and leaves stay as traced, with the outline this close to them; they only lie above the
# upper hand (GRAIN_ZONE). A gold (green) region there is a grain (leaf) when it is thicker than
# 2 x GRAIN_THICK (LEAF_THICK) somewhere; a gold or green streak between straw lines is not.
PROTECT_BAND = 10
PROTECT_CORE = 5
GRAIN_ZONE = [(0, 0), (1024, 0), (1024, 600), (640, 690), (480, 780), (0, 820)]
GRAIN_THICK = 4
LEAF_THICK = 3
STRAW_SMOOTH = 4
# The lower end of the leaf that crosses the straws above the upper hand is light green in the
# source and reads as straw by color, so it is drawn: its left edge (a thin outline against the
# straws) and its right edge (the outline against the blouse).
LEAF_TIP_LEFT = [(490, 552), (532, 600), (565, 630), (585, 646), (596, 652)]
LEAF_TIP_RIGHT = [(540, 552), (584, 600), (606, 640)]
LEAF_TIP_LEFT_LINE = 4
LEAF_TIP_RIGHT_LINE = 8
# The rope tie, wrapped across the bundle just under the upper hand, from its top edge to under the
# lower hand: ROPE_WRAPS cords side by side, each of twisted strands (ellipses slanted ROPE_ANGLE
# degrees to the rope) every ROPE_STEP along ROPE, ROPE_HALF wide on each side.
ROPE = ((703, 726), (604, 852))
ROPE_WRAPS = 2
ROPE_HALF = 6.5
ROPE_STEP = 6.5
ROPE_ANGLE = 40
ROPE_OUTLINE = 2.5
ROPE_POINTS = 10
# How much thinner a gold strand is than its outline, so the Nâu áo core shows between strands.
ROPE_SHADE = 2.1
# Where it is tied, the bundle's edge pinches in by this much next to the rope.
ROPE_PINCH = 5
# Between the hands (MID_REGION) the straws' edge is the drawn one too: there the lines follow it,
# while the traced edge would cut every line short. Its lower-left side is the smooth end of the
# straws between the forearm and the lower hand.
MID_REGION = [(655, 700), (800, 762), (745, 830), (640, 875), (600, 848), (548, 795), (590, 760)]
# Left of that side (MID_CUT) the traced edge was a saw-tooth; the straws end on the straight line.
MID_CUT = [(548, 795), (600, 848), (575, 890), (480, 840), (500, 785)]
# The right forearm lies in front of the straws: right of ARM_EDGE (below ARM_TOP) and above the
# sleeve's lower outline (SLEEVE_EDGE). LOW_REGION is everything below that outline.
ARM_EDGE = ((770, 772), (735, 808))
ARM_TOP = 700
SLEEVE_EDGE = [(790, 898), (800, 908), (815, 918), (830, 921), (850, 912), (870, 899), (880, 894),
               (890, 881), (900, 868), (910, 850), (915, 837)]
LOW_REGION = [(630, 876)] + SLEEVE_EDGE + [(1000, 850), (1000, 1040), (630, 1040)]
# The image generator's translucent four-point star over the straw ends: hand pixels traced from it
# go (the drawn straws are there).
WATERMARK = [(900, 872), (934, 904), (902, 936), (875, 903)]
# Width of the hands' own outline: darker hand pixels farther from the skin over the straws go.
HAND_OUTLINE = 8

# The whole head for logo-icon: the head part closed with this radius (it takes in the brim and
# hair the rice hides, and the loose brim bits between the leaves), cut at HEAD_FULL_CUT (below the
# chin, so the long hair does not make the icon tall), outlined HEAD_FULL_OUTLINE wide where guessed.
HEAD_FULL_CLOSE = 64
HEAD_FULL_CUT = 515
HEAD_FULL_OUTLINE = 7
# The closed head is smoothed with a box filter this wide, so leaf outline bits that stick out go
# and the guessed brim edge is an even curve.
HEAD_FULL_BLUR = 21

# Extra paint under the parts above, in source pixels.
UNDER_LAYER = 14
BODY_REACH = 36
BODY_CLOSE = 40
BODY_EDGE_WIDTH = 6
RICE_UNDER_HANDS_CLOSE = 60
HEAD_CLOSE = 64

# Pivots in OUT_SIZE units: head at mid-neck, rice at the upper gripping hand.
PIVOTS = {'head': (278, 257), 'rice': (302, 356)}

TRACE = dict(
    colormode='color',
    hierarchical='stacked',
    mode='spline',
    filter_speckle=8,
    color_precision=8,
    layer_difference=1,
    corner_threshold=90,
    length_threshold=10.0,
    max_iterations=10,
    splice_threshold=45,
    path_precision=2,
)
# The rice is many small grains: coarser curve fitting there saves a third of its size and does not
# show. On the face it would bend the smile, so the other parts keep TRACE.
TRACE_BY_PART = {'rice': dict(length_threshold=14.0, splice_threshold=60)}
DECIMALS = 1
SMOOTH_PASSES = 2


def hex_rgb(value):
    return np.array([int(value[i:i + 2], 16) for i in (1, 3, 5)], dtype=float)


def srgb_to_lab(rgb):
    c = rgb / 255.0
    c = np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)
    m = np.array([[0.4124, 0.3576, 0.1805], [0.2126, 0.7152, 0.0722], [0.0193, 0.1192, 0.9505]])
    xyz = c @ m.T / np.array([0.95047, 1.0, 1.08883])
    f = np.where(xyz > 0.008856, np.cbrt(xyz), 7.787 * xyz + 16 / 116)
    return np.stack([116 * f[..., 1] - 16, 500 * (f[..., 0] - f[..., 1]), 200 * (f[..., 1] - f[..., 2])], -1)


def classify(rgb, skip=()):
    """Anchor index per pixel: nearest anchor, or the nearer end of the nearest ink-to-color pair.
    Anchors named in skip are not used."""
    lab = srgb_to_lab(rgb.reshape(-1, 3).astype(float))
    anchors = srgb_to_lab(np.array([hex_rgb(h) for _, h, _, _ in ANCHORS]))
    used = [i for i, (name, *_) in enumerate(ANCHORS) if name not in skip]
    # Only ink-to-color pairs: an edge between two fills is one or two pixels wide and the nearest
    # anchor is right for it; a fill-to-fill pair would pull in real colors (a light hat between
    # background and gold).
    pairs = [(i, j) for i in used for j in used if ANCHORS[i][3] and not ANCHORS[j][3]]
    out = np.empty(len(lab), dtype=np.int16)
    for start in range(0, len(lab), 1 << 16):
        chunk = lab[start:start + (1 << 16)]
        best = ((chunk[:, None, :] - anchors[None]) ** 2).sum(-1)
        best[:, [i for i in range(len(ANCHORS)) if i not in used]] = np.inf
        label = best.argmin(1)
        dist = best.min(1)
        for i, j in pairs:
            a, b = anchors[i], anchors[j]
            ab = b - a
            t = np.clip(((chunk - a) @ ab) / (ab @ ab), 0, 1)
            d = ((chunk - (a + t[:, None] * ab)) ** 2).sum(-1)
            closer = d < dist
            dist = np.where(closer, d, dist)
            label = np.where(closer, np.where(t < 0.5, i, j), label)
        out[start:start + len(chunk)] = label
    return out.reshape(rgb.shape[:-1])


def classify_picture(rgb):
    """classify(), with the grain outline shade only near the rice: elsewhere it lies between the
    blouse and the outline and would thicken every line on the blouse."""
    anchor = classify(rgb)
    rice = np.isin(anchor, [ANCHOR_INDEX[n] for n in RICE_ANCHORS])
    redo = (anchor == ANCHOR_INDEX['grain-outline']) & ~dilate(rice, GRAIN_OUTLINE_REACH)
    anchor[redo] = classify(rgb[redo], skip=('grain-outline',))
    return anchor


def components(label):
    """4-connected regions of equal label: (region id per pixel, list of region facts)."""
    h, w = label.shape
    ids = -np.ones((h, w), dtype=np.int32)
    regions = []
    for y0 in range(h):
        for x0 in range(w):
            if ids[y0, x0] >= 0:
                continue
            value = label[y0, x0]
            rid = len(regions)
            ids[y0, x0] = rid
            queue = deque([(y0, x0)])
            count = sx = sy = 0
            while queue:
                y, x = queue.popleft()
                count += 1
                sx += x
                sy += y
                for ny, nx in ((y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1)):
                    if 0 <= ny < h and 0 <= nx < w and ids[ny, nx] < 0 and label[ny, nx] == value:
                        ids[ny, nx] = rid
                        queue.append((ny, nx))
            regions.append({'value': int(value), 'area': count, 'cx': sx / count, 'cy': sy / count})
    return ids, regions


def shift(mask, dy, dx):
    out = np.zeros_like(mask)
    h, w = mask.shape
    out[max(dy, 0):h + min(dy, 0), max(dx, 0):w + min(dx, 0)] = mask[max(-dy, 0):h + min(-dy, 0), max(-dx, 0):w + min(-dx, 0)]
    return out


def dilate(mask, steps):
    """Grows a mask by about `steps` pixels (alternating 4- and 8-neighbor steps, close to a disc)."""
    for n in range(steps):
        grown = mask | shift(mask, 1, 0) | shift(mask, -1, 0) | shift(mask, 0, 1) | shift(mask, 0, -1)
        if n % 2:
            grown |= shift(mask, 1, 1) | shift(mask, 1, -1) | shift(mask, -1, 1) | shift(mask, -1, -1)
        mask = grown
    return mask


def erode(mask, steps):
    return ~dilate(~mask, steps)


def fill_holes(mask):
    outside = np.zeros_like(mask)
    outside[0, :] = ~mask[0, :]
    outside[-1, :] = ~mask[-1, :]
    outside[:, 0] = ~mask[:, 0]
    outside[:, -1] = ~mask[:, -1]
    while True:
        grown = dilate(outside, 1) & ~mask
        if (grown == outside).all():
            return ~outside
        outside = grown


def spread(values, known, target):
    """Copies each known value into the target pixels, nearest first (by growing rings)."""
    values = values.copy()
    known = known.copy()
    todo = target & ~known
    while todo.any():
        progressed = False
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1), (1, 1), (1, -1), (-1, 1), (-1, -1)):
            src = shift(known, dy, dx) & todo
            if src.any():
                values[src] = shift(values, dy, dx)[src]
                known |= src
                todo &= ~src
                progressed = True
        if not progressed:
            break
    return values


def box_mean(values, size):
    """Mean of the size x size square around each pixel (edges padded with the edge value)."""
    r = size // 2
    padded = np.pad(values, r + 1, mode='edge').cumsum(0).cumsum(1)
    h, w = values.shape
    total = (padded[size:size + h, size:size + w] - padded[:h, size:size + w]
             - padded[size:size + h, :w] + padded[:h, :w])
    return total / (size * size)


def polygon_mask(points):
    canvas = Image.new('1', (SOURCE_SIZE, SOURCE_SIZE), 0)
    ImageDraw.Draw(canvas).polygon(points, fill=1)
    return np.asarray(canvas, dtype=bool)


def region_part(name, inside_head, cy):
    if name == 'background':
        return -1
    if name == 'hair':
        return HEAD if inside_head else -2
    if ANCHORS[ANCHOR_INDEX[name]][3]:
        return -2
    if name in ('gold', 'gold-shade', 'leaf', 'leaf-shade'):
        return RICE
    if inside_head:
        return HEAD
    if name in ('hat-light', 'straw', 'straw-shade'):
        return RICE
    if name in ('skin', 'skin-shade', 'cheek'):
        return BODY if cy < HANDS_TOP else HANDS
    return BODY


def assign_parts(anchor):
    """Part per pixel (-1 = background) and brand color index per pixel (-1 = transparent)."""
    # Ink anchors other than hair are all one key: outlines, whatever their source shade.
    ink = [i for i, (name, _, _, is_ink) in enumerate(ANCHORS) if is_ink and name != 'hair']
    key = np.where(np.isin(anchor, ink), ink[0], anchor)
    ids, regions = components(key)
    head_zone = polygon_mask(HEAD_ZONE)
    on_border = set(np.unique(np.concatenate([ids[0], ids[-1], ids[:, 0], ids[:, -1]])).tolist())
    part_of_region = np.empty(len(regions), dtype=np.int16)
    thin_hair = []
    for rid, r in enumerate(regions):
        name = ANCHORS[r['value']][0]
        inside = head_zone[int(round(r['cy'])), int(round(r['cx']))]
        small = r['area'] < (BLOUSE_SPECKLE_AREA if name == 'blouse' else SPECKLE_AREA)
        hole = name == 'background' and rid not in on_border and r['area'] < BACKGROUND_HOLE_AREA
        part_of_region[rid] = -3 if small or hole else region_part(name, inside, r['cy'])
        if name == 'hair' and r['area'] < HAIR_MIN_AREA:
            thin_hair.append(rid)
    part = part_of_region[ids]
    # Outlines (-2): the highest part with a fill within OUTLINE_REACH.
    outline = part == -2
    for p in range(len(PARTS)):
        part = np.where(dilate(part == p, OUTLINE_REACH) & outline, p, part)
    # The color of an anchor, except: the grains' shaded rims and hat ribs are gold.
    brand = np.array([BRAND.index(b) if b else -1 for _, _, b, _ in ANCHORS], dtype=np.int16)
    color = brand[anchor]
    is_any = lambda names: np.isin(anchor, [ANCHOR_INDEX[n] for n in names])
    near = lambda names: dilate(is_any(names), SHADE_REACH)
    golden = ['gold', 'gold-shade', 'straw-shade']
    rims = (part == RICE) & is_any(['straw-shade']) & near(['gold', 'gold-shade'])
    color[rims & ~near(['straw', 'hat-light'])] = BRAND.index(GOLD)
    ink = [name for name, _, _, is_ink in ANCHORS if is_ink]
    color[(part == HEAD) & is_any(golden) & ~near(ink)] = BRAND.index(GOLD)
    color[outline | np.isin(ids, thin_hair)] = BRAND.index(DARK)
    # Outlines far from any fill (thick lines) take the part of the nearest fill and stay dark;
    # speckles take part and color of their nearest pixel.
    part = spread(part, part >= 0, part == -2)
    known = part != -3
    both = spread(part * 16 + color + 1, known, ~known)
    part, color = both // 16, both % 16 - 1
    part = np.where(color < 0, -1, part)
    return part, color


def extend(part, color):
    """Paint each part under the parts above it where tilting can uncover it. Returns one mask per part."""
    masks = [part == p for p in range(len(PARTS))]
    colors = [np.where(masks[p], color, -1) for p in range(len(PARTS))]
    covered_by = lambda p: np.logical_or.reduce([part == q for q in range(p + 1, len(PARTS))])
    # Rice under the hands, where the sheaf runs on under them.
    under = masks[HANDS] & erode(dilate(masks[RICE], RICE_UNDER_HANDS_CLOSE), RICE_UNDER_HANDS_CLOSE)
    colors[RICE] = spread(colors[RICE], masks[RICE], under)
    masks[RICE] |= under
    # Body: its silhouette closed under everything that covers it.
    covered = covered_by(BODY)
    grown = masks[BODY] | (covered & dilate(masks[BODY], BODY_REACH))
    silhouette = fill_holes(erode(dilate(grown, BODY_CLOSE), BODY_CLOSE) | grown)
    under = silhouette & covered & ~masks[BODY]
    fills = masks[BODY] & (color != BRAND.index(DARK))
    colors[BODY] = spread(np.where(fills, color, -1), fills, under | (masks[BODY] & ~fills))
    colors[BODY] = np.where(masks[BODY], color, colors[BODY])
    # The guessed part of the silhouette gets an outline too, in case a tilt uncovers its edge.
    edge = under & dilate(~silhouette, BODY_EDGE_WIDTH)
    colors[BODY] = np.where(edge, BRAND.index(DARK), colors[BODY])
    masks[BODY] |= under
    # Where the rice lies in front of the head (hat brim, hair, face), the head, drawn above the
    # rice, has a hole. The body, below the rice, carries the head's colors there, so a tilted rice
    # uncovers hat and face, not the page.
    head = part == HEAD
    behind = erode(dilate(head, HEAD_CLOSE), HEAD_CLOSE) & (part == RICE)
    colors[BODY] = np.where(behind, spread(np.where(head, color, -1), head, behind), colors[BODY])
    masks[BODY] |= behind
    # Every lower part a few pixels under the parts above it, so no seam shows between traces.
    for p in (BODY, RICE, HANDS):
        under = dilate(masks[p], UNDER_LAYER) & covered_by(p) & ~masks[p]
        colors[p] = spread(colors[p], masks[p], under)
        masks[p] |= under
    return masks, colors


def largest_region(mask):
    ids, regions = components(mask.astype(np.int8))
    best = max((rid for rid, r in enumerate(regions) if r['value']), key=lambda rid: regions[rid]['area'])
    return ids == best


def head_full(part, color):
    """The whole head for logo-icon: the head part with the pixels the rice hides painted in (hat
    under the brim, hair, skin), cut below the chin, as one piece. Returns (mask, color)."""
    head = part == HEAD
    rows = np.arange(SOURCE_SIZE)[:, None]
    full = fill_holes(erode(dilate(head, HEAD_FULL_CLOSE), HEAD_FULL_CLOSE) | head)
    full = (box_mean(full.astype(float), HEAD_FULL_BLUR) >= 0.5) & (rows < HEAD_FULL_CUT)
    full = fill_holes(largest_region(full))
    # Hat ribs (gold) are thin lines, not a fill to extend.
    fills = head & ~np.isin(color, [BRAND.index(DARK), BRAND.index(GOLD)])
    guessed = full & ~head
    # Through the head's outlines too, so a guessed area that they close off still gets a color.
    painted = spread(np.where(fills, color, -1), fills, guessed | (head & ~fills))
    colors = np.where(head, color, painted)
    # Outlines along the whole smoothed silhouette and the cut, and where two fill colors meet in
    # the guessed areas (hat brim against hair or face).
    border = full & dilate(~full, HEAD_FULL_OUTLINE)
    fill_color = np.where(fills | guessed, colors, -1)
    seam = np.zeros_like(full)
    for dy, dx in ((1, 0), (0, 1)):
        moved = shift(fill_color, dy, dx)
        seam |= (moved != fill_color) & (moved >= 0) & (fill_color >= 0)
    seam = dilate(seam & guessed, HEAD_FULL_OUTLINE // 2) & guessed
    colors = np.where(border | seam, BRAND.index(DARK), colors)
    return full, np.where(full, colors, -1)


def write_svg(path, body):
    svg = f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {OUT_SIZE} {OUT_SIZE}">\n{body}</svg>\n'
    Path(path).write_text(svg, encoding='utf-8', newline='\n')
    print(f'wrote {path} ({len(svg.encode())} bytes)')


def catmull_rom(points, samples):
    """A smooth curve through the points (Catmull-Rom), `samples` points per segment plus the end."""
    p = [np.asarray(q, dtype=float) for q in points]
    p = [2 * p[0] - p[1]] + p + [2 * p[-1] - p[-2]]
    out = []
    for i in range(1, len(p) - 2):
        p0, p1, p2, p3 = p[i - 1], p[i], p[i + 1], p[i + 2]
        for t in np.linspace(0, 1, samples, endpoint=False):
            out.append(0.5 * (2 * p1 + (p2 - p0) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t
                              + (3 * p1 - p0 - 3 * p2 + p3) * t ** 3))
    out.append(p[-2])
    return np.array(out)


def label_canvas():
    return Image.new('L', (SOURCE_SIZE, SOURCE_SIZE), 0)


def labels(canvas):
    """Brand color index per pixel from a canvas drawn with index + 1 (0 = nothing)."""
    return np.asarray(canvas).astype(np.int16) - 1


def straw_layer():
    """The straws as a brand color index per pixel (-1 = none), in source pixels, and their thin
    Vàng lúa / Nâu áo lines and shades as (points, color, width) polylines. The lines are written as vector paths:
    traced, they cost about three times the bytes."""
    rng = np.random.default_rng(STRAW_SEED)
    edge_a = catmull_rom(STRAW_EDGE_A, STRAW_SAMPLES)
    edge_b = catmull_rom(STRAW_EDGE_B, STRAW_SAMPLES)
    count = len(edge_a)
    along = np.linspace(0, 1, count)
    share = []
    for k in range(STRAWS + 1):
        wave = 0.0
        if 0 < k < STRAWS:
            phase = rng.uniform(0, 2 * np.pi, 2)
            slow, fast = rng.uniform(1.0, 2.2), rng.uniform(2.5, 4.0)
            wave = STRAW_WAVE / STRAWS * (0.6 * np.sin(2 * np.pi * slow * along + phase[0])
                                          + 0.4 * np.sin(2 * np.pi * fast * along + phase[1]))
        share.append(k / STRAWS + wave)
    lines = [edge_a + (edge_b - edge_a) * np.asarray(f)[..., None] for f in share]
    pairs = STRAWS // 2
    cuts = [rng.uniform(0, END_JITTER)]
    while len(cuts) < pairs:
        cut = rng.uniform(0, END_JITTER)
        if abs(cut - cuts[-1]) >= END_STEP:
            cuts.append(cut)
    ends = [count - 1 - int(cut * STRAW_SAMPLES) for cut in cuts]
    depths = [rng.choice(END_DEPTHS) for _ in range(pairs)]
    canvas = label_canvas()
    draw = ImageDraw.Draw(canvas)
    caps = []
    thin = []
    for i in range(pairs):
        left, right = lines[2 * i][:ends[i] + 1], lines[2 * i + 2][:ends[i] + 1]
        forward = left[-1] - left[-2] + right[-1] - right[-2]
        forward /= np.hypot(*forward)
        middle, half = (left[-1] + right[-1]) / 2, (right[-1] - left[-1]) / 2
        depth = np.hypot(*half) * depths[i]
        caps.append(depth)
        cap = [middle - half * np.cos(t) + forward * depth * np.sin(t) for t in np.linspace(0, np.pi, 11)]
        draw.polygon([tuple(q) for q in [*left, *cap, *right[::-1]]], fill=BRAND.index(STRAW) + 1)
    for k in range(1, STRAWS):
        pair = k // 2
        if k % 2:
            # The line inside a pair stops before the pair's round end.
            step = np.hypot(*(lines[k][ends[pair]] - lines[k][ends[pair] - 1]))
            end = ends[pair] - int(np.ceil(caps[pair] / step)) - 1
        else:
            # Between two pairs: toward the ends the line is an outline, so each cut end stands
            # on its own, up to the end of the longer pair.
            end = min(ends[pair - 1], ends[pair])
            split = end - int(END_ZONE * STRAW_SAMPLES)
            draw.line([tuple(q) for q in lines[k][split:max(ends[pair - 1], ends[pair]) + 1]],
                      fill=BRAND.index(DARK) + 1, width=END_LINE_WIDTH, joint='curve')
            end = split + 1
        tone = BLOUSE if k % STRAW_DEPTH_LINE == STRAW_DEPTH_FIRST else GOLD
        thin.append((lines[k][:end], tone, STRAW_LINE_WIDTH))
    # Warmer straws: a soft Vàng lúa shade along every other straw, near its upper line, from the
    # upper hand down to the end.
    for k in range(0, STRAWS, 2):
        pair = k // 2
        shade = lines[k] + (lines[k + 1] - lines[k]) * STRAW_SHADE_AT
        step = np.hypot(*(shade[ends[pair]] - shade[ends[pair] - 1]))
        end = ends[pair] - int(np.ceil(caps[pair] / step)) - 1
        thin.append((shade[int(STRAW_SHADE_FROM * count):end], GOLD, STRAW_SHADE_WIDTH))
    return labels(canvas), thin


def line_paths(thin, visible):
    """The straw lines as filled outlines (no strokes in the mascot), one path per color, cut where
    `visible` is False."""
    shapes = {}
    for points, tone, width in thin:
        inside = visible[np.clip(points[:, 1].round().astype(int), 0, SOURCE_SIZE - 1),
                         np.clip(points[:, 0].round().astype(int), 0, SOURCE_SIZE - 1)]
        start = None
        for i, seen in enumerate(np.append(inside, False)):
            if seen and start is None:
                start = i
            elif not seen and start is not None:
                if i - start >= 2:
                    # The visible run, thinned out but with both of its ends.
                    run = points[start:i]
                    run = np.vstack([run[:-1:STRAW_LINE_STEP], run[-1:]])
                    shapes.setdefault(tone, []).append(band(run, width / 2))
                start = None
    paths = []
    for tone, polygons in shapes.items():
        d = ''.join('M' + 'L'.join(f'{x:.2f} {y:.2f}' for x, y in polygon) + 'Z' for polygon in polygons)
        paths.append((compact_path(d, 0, 0), tone))
    return paths


def band(points, half):
    """Outline of a polyline `half` wide on each side."""
    tangent = np.gradient(points, axis=0)
    tangent /= np.maximum(np.hypot(tangent[:, 0], tangent[:, 1]), 1e-9)[:, None]
    normal = np.stack([-tangent[:, 1], tangent[:, 0]], 1) * half
    return [*(points + normal), *(points - normal)[::-1]]


def ellipse(center, a, b, angle, points=24):
    t = np.linspace(0, 2 * np.pi, points, endpoint=False)
    x, y = a * np.cos(t), b * np.sin(t)
    c, s = np.cos(angle), np.sin(angle)
    return [(center[0] + x[i] * c - y[i] * s, center[1] + x[i] * s + y[i] * c) for i in range(points)]


def rope_shapes():
    """The rope tie: ROPE_WRAPS thin twisted cords side by side, across the bundle, as (color,
    polygons) layers, bottom first: the Nâu đất outline, the Nâu áo shade, and the Vàng lúa strands
    (ellipses slanted to the cord). Written as vector paths: traced, the thin strands merge."""
    start, end = (np.asarray(q, dtype=float) for q in ROPE)
    axis = (end - start) / np.hypot(*(end - start))
    across = np.array([-axis[1], axis[0]])
    slant = np.arctan2(axis[1], axis[0]) + np.radians(ROPE_ANGLE)
    a = ROPE_HALF / np.sin(np.radians(ROPE_ANGLE))
    b = ROPE_STEP * 0.6
    gap = 2 * (ROPE_HALF + ROPE_OUTLINE) - ROPE_OUTLINE
    length = np.hypot(*(end - start))
    layers = {DARK: [], BLOUSE: [], GOLD: []}
    for wrap in range(ROPE_WRAPS):
        shift = across * gap * (wrap - (ROPE_WRAPS - 1) / 2)
        # The Nâu áo core of the cord, under the strands.
        core = [start + shift + axis * d for d in (ROPE_STEP / 2, length - ROPE_STEP)]
        layers[BLOUSE].append(band(np.array(core), ROPE_HALF - ROPE_OUTLINE / 2))
        for d in np.arange(0, length, ROPE_STEP):
            center = start + shift + axis * d
            layers[DARK].append(ellipse(center, a + ROPE_OUTLINE, b + ROPE_OUTLINE, slant, ROPE_POINTS))
            layers[GOLD].append(ellipse(center - axis, a - 1, b - ROPE_SHADE, slant, ROPE_POINTS))
    return [(tone, layers[tone]) for tone in (DARK, BLOUSE, GOLD)]


def rope_mask(shapes):
    canvas = Image.new('1', (SOURCE_SIZE, SOURCE_SIZE), 0)
    draw = ImageDraw.Draw(canvas)
    for polygon in shapes[0][1]:
        draw.polygon(polygon, fill=1)
    return np.asarray(canvas, dtype=bool)


def polygon_paths(layers):
    """One path per color; every polygon turned the same way, so overlaps add up under nonzero fill."""
    paths = []
    for tone, polygons in layers:
        d = ''
        for polygon in polygons:
            area = sum(x0 * y1 - x1 * y0 for (x0, y0), (x1, y1) in zip(polygon, polygon[1:] + polygon[:1]))
            if area < 0:
                polygon = polygon[::-1]
            d += 'M' + 'L'.join(f'{x:.2f} {y:.2f}' for x, y in polygon) + 'Z'
        paths.append((compact_path(d, 0, 0), tone))
    return paths


def leaf_tip(color):
    """Draws the leaf's light lower end over `color`; returns (its mask, the new colors)."""
    tip = polygon_mask(LEAF_TIP_LEFT + LEAF_TIP_RIGHT[::-1])
    canvas = Image.new('1', (SOURCE_SIZE, SOURCE_SIZE), 0)
    draw = ImageDraw.Draw(canvas)
    draw.line(LEAF_TIP_RIGHT, fill=1, width=LEAF_TIP_RIGHT_LINE, joint='curve')
    draw.line(LEAF_TIP_LEFT, fill=1, width=LEAF_TIP_LEFT_LINE, joint='curve')
    edges = np.asarray(canvas, dtype=bool) & dilate(tip, LEAF_TIP_RIGHT_LINE // 2)
    color = np.where(tip, BRAND.index(LEAF), color)
    return tip | edges, np.where(edges, BRAND.index(DARK), color)


def thick_regions(mask, depth):
    """The connected regions of mask that are thicker than 2 x depth somewhere."""
    ids, regions = components(mask.astype(np.int8))
    core = erode(mask, depth)
    keep = [rid for rid in np.unique(ids[core]) if regions[rid]['value'] == 1]
    return np.isin(ids, keep)


def arm_front():
    """The right forearm in front of the straws: right of ARM_EDGE, above the sleeve's lower outline."""
    (x0, y0), (x1, y1) = ARM_EDGE
    yy, xx = np.mgrid[0:SOURCE_SIZE, 0:SOURCE_SIZE]
    side = (x1 - x0) * (yy - y0) - (y1 - y0) * (xx - x0)
    right = np.sign(side) == np.sign((x1 - x0) * (SOURCE_SIZE - y0) - (y1 - y0) * (SOURCE_SIZE - x0))
    return right & ~polygon_mask(LOW_REGION) & (yy > ARM_TOP)


def redraw_straws(anchor, part, masks, colors):
    """Replaces the traced straws in the rice with the drawn straws, rope and leaf end. Returns the
    mask of drawn pixels, which the smoothing before tracing must keep as they are, and the straw
    lines and the rope as paths to add over the traced rice."""
    brand = np.array([BRAND.index(b) if b else -1 for _, _, b, _ in ANCHORS], dtype=np.int16)
    raw = brand[anchor]
    rice, color = masks[RICE], colors[RICE]
    straws, thin = straw_layer()
    drawn = straws >= 0
    low = polygon_mask(LOW_REGION)
    # Between the hands and below the sleeve the drawn shapes are the straws' own edge.
    shaped = low | polygon_mask(MID_REGION)
    zone = rice & polygon_mask(GRAIN_ZONE)
    # Grains and leaves are thick; a gold or green streak between straw lines is not.
    kept = (thick_regions(zone & (raw == BRAND.index(GOLD)), GRAIN_THICK)
            | thick_regions(zone & (raw == BRAND.index(LEAF)), LEAF_THICK))
    tip, color = leaf_tip(color)
    kept |= tip
    protect = (zone & (kept | (dilate(kept, PROTECT_BAND) & (raw == BRAND.index(DARK))))) | tip
    front = arm_front()
    # The hands took the old straw lines next to them as their outlines; over the straws only their
    # own outline stays, and the rest is straw.
    skin = masks[HANDS] & (colors[HANDS] != BRAND.index(DARK))
    stray = drawn & masks[HANDS] & ~skin & ~dilate(skin, HAND_OUTLINE) & ~front
    masks[HANDS] &= ~stray
    allowed = (rice | shaped | stray) & ~front & ~polygon_mask(MID_CUT)
    straw = drawn & allowed & ~protect
    # A smooth edge: thin outline teeth that stick into the straws go under them (the grain and
    # leaf fills and the first PROTECT_CORE pixels of their outlines stay), and thin jags of the
    # traced edge go.
    core = protect & (kept | dilate(kept, PROTECT_CORE) | tip)
    candidate = erode(dilate(straw, STRAW_SMOOTH), STRAW_SMOOTH) & drawn & allowed & ~core
    straw = dilate(erode(candidate, STRAW_SMOOTH), STRAW_SMOOTH) & candidate
    # What the smoothing takes off (slivers between grain and leaf outlines, jags) takes the color
    # next to it instead.
    sliver = candidate & ~straw
    old = rice & (drawn | shaped) & ~protect
    # The forearm's outline over the straws was traced into the rice; it belongs to the body.
    arm_line = old & front & (color == BRAND.index(DARK))
    colors[BODY] = np.where(arm_line, BRAND.index(DARK), colors[BODY])
    rice = (rice & ~old) | straw | tip
    color = np.where(straw, straws, np.where(rice, color, -1))
    rest = rice & ~straw & ~sliver
    color = np.where(sliver, spread(np.where(rest, color, -1), rest, sliver), color)
    rice |= sliver
    # The bundle pinches in where the rope ties it.
    rope = rope_shapes()
    tie = rope_mask(rope)
    pinch = dilate(tie, ROPE_PINCH) & ~erode(straw, ROPE_PINCH) & ~tie
    straw &= ~pinch
    rice &= ~(pinch & ~protect)
    # Outline wherever the straws meet something else, unless an outline is already there; the
    # hands draw their own.
    lined = straw | masks[HANDS] | (rice & ~straw & (color == BRAND.index(DARK)))
    edge = straw & dilate(~lined, STRAW_OUTLINE)
    color = np.where(edge, BRAND.index(DARK), color)
    masks[RICE], colors[RICE] = rice, color
    lines = line_paths(thin, erode(straw & ~edge & ~dilate(tie, 1), STRAW_LINE_CLEAR)) + polygon_paths(rope)
    # Below the sleeve the body was only painted under the old straws: drop what the new ones leave.
    masks[BODY] &= ~(low & (part != BODY) & ~rice & ~masks[HANDS])
    # The pixels traced from the watermark go.
    masks[HANDS] &= ~polygon_mask(WATERMARK)
    return straw | tip, lines


NUMBER = re.compile(r'-?\d*\.?\d+(?:e-?\d+)?')
TOKEN = re.compile(r'[MLCZmlcz]|-?\d*\.?\d+(?:e-?\d+)?')
ARITY = {'M': 2, 'L': 2, 'C': 6, 'Z': 0}


def fmt(value):
    text = f'{value:.{DECIMALS}f}'.rstrip('0').rstrip('.')
    if text in ('-0', ''):
        text = '0'
    if text.startswith('0.'):
        text = text[1:]
    elif text.startswith('-0.'):
        text = '-' + text[2:]
    return text


def serialize(items):
    """Path items (command letters and number strings) with the fewest separators."""
    out = ''
    prev = None
    for item in items:
        if prev is not None and item[0] not in 'mlcz' and not item.startswith('-'):
            if not (item.startswith('.') and '.' in prev):
                out += ' '
        out += item
        prev = item if item[0] not in 'mlczM' else None
    return out


def compact_path(d, tx, ty):
    """vtracer absolute path data -> relative path data in OUT_SIZE units."""
    tokens = TOKEN.findall(d)
    q = 10 ** DECIMALS
    to_grid = lambda v: round(v * SCALE * q)
    items = []
    cur = start = (0, 0)
    last = None
    i = 0
    while i < len(tokens):
        cmd = tokens[i]
        i += 1
        if cmd not in ARITY:
            raise ValueError(f'unexpected path command {cmd} from vtracer')
        if cmd == 'Z':
            items.append('z')
            cur = start
            last = 'z'
            continue
        n = ARITY[cmd]
        while i < len(tokens) and NUMBER.fullmatch(tokens[i]):
            values = [float(v) for v in tokens[i:i + n]]
            i += n
            pts = [(to_grid(values[k] + tx), to_grid(values[k + 1] + ty)) for k in range(0, n, 2)]
            if not items:
                items.append('M')
                items += [fmt(c / q) for c in pts[0]]
                last = 'M'
            else:
                letter = cmd.lower()
                # m is never repeated implicitly (a second pair after m means l).
                if letter != last or letter == 'm':
                    items.append(letter)
                items += [fmt((c - o) / q) for (x, y) in pts for c, o in ((x, cur[0]), (y, cur[1]))]
                last = letter
            cur = pts[-1]
            if cmd == 'M':
                start = cur
    return serialize(items)


PATH = re.compile(r'<path d="([^"]*)" fill="(#[0-9A-Fa-f]{6})" transform="translate\(([-\d.]+),([-\d.]+)\)"\s*/>')


def snap(hex_color, choices=BRAND):
    """Nearest of the choices. vtracer merges speckles into a neighbor and averages their colors, so
    an average of two colors must snap back to a color of that picture (straw and gold lines would
    otherwise give skin)."""
    rgb = hex_rgb(hex_color)
    return min(choices, key=lambda b: ((hex_rgb(b) - rgb) ** 2).sum())


def majority(mask, colors, passes):
    """3 x 3 majority filter over color (transparent is a color too): smooths stair-step edges."""
    label = np.where(mask, colors, -1)
    values = list(range(-1, len(BRAND)))
    for _ in range(passes):
        counts = []
        for v in values:
            hit = (label == v).astype(np.int8)
            total = np.zeros(label.shape, dtype=np.int8)
            for dy in (-1, 0, 1):
                for dx in (-1, 0, 1):
                    total += shift(hit, dy, dx)
            counts.append(total)
        counts = np.stack(counts)
        best = counts.max(0)
        own = np.take_along_axis(counts, (label + 1)[None].astype(np.int64), 0)[0]
        label = np.where(own >= best, label, np.array(values)[counts.argmax(0)])
    return label >= 0, label


def trace(mask, colors, settings, keep=None):
    smooth_mask, smooth_colors = majority(mask, colors, SMOOTH_PASSES)
    if keep is None:
        mask, colors = smooth_mask, smooth_colors
    else:
        mask, colors = np.where(keep, mask, smooth_mask), np.where(keep, colors, smooth_colors)
    h, w = mask.shape
    rgba = np.zeros((h, w, 4), dtype=np.uint8)
    palette = np.array([hex_rgb(b) for b in BRAND], dtype=np.uint8)
    rgba[mask, :3] = palette[colors[mask]]
    used = [BRAND[i] for i in np.unique(colors[mask])]
    rgba[mask, 3] = 255
    pixels = [tuple(int(v) for v in px) for px in rgba.reshape(-1, 4)]
    svg = vtracer.convert_pixels_to_svg(pixels, (w, h), **settings)
    paths = []
    for d, fill, tx, ty in PATH.findall(svg):
        paths.append((compact_path(d, float(tx), float(ty)), snap(fill.upper(), used)))
    if len(paths) != svg.count('<path'):
        raise ValueError('vtracer wrote a path this script cannot read')
    return paths


def group(name, paths):
    attrs = f' id="{name}"'
    if name in PIVOTS:
        x, y = PIVOTS[name]
        attrs += f' data-pivot="{x} {y}" style="transform-box: view-box; transform-origin: {x}px {y}px"'
    body = '\n'.join(f'<path d="{d}" fill="{fill}"/>' for d, fill in paths)
    return f'<g{attrs}>\n{body}\n</g>\n'


def save_debug(directory, part, masks, colors):
    directory.mkdir(parents=True, exist_ok=True)
    palette = np.array([hex_rgb(b) for b in BRAND], dtype=np.uint8)
    tint = np.array([[220, 60, 60], [60, 160, 60], [60, 90, 220], [230, 180, 30]], dtype=np.uint8)
    view = np.full(part.shape + (3,), 255, dtype=np.uint8)
    view[part >= 0] = tint[part[part >= 0]]
    Image.fromarray(view).save(directory / 'parts.png')
    for p, name in enumerate(PARTS):
        img = np.zeros(part.shape + (4,), dtype=np.uint8)
        img[masks[p], :3] = palette[colors[p][masks[p]]]
        img[masks[p], 3] = 255
        Image.fromarray(img).save(directory / f'part-{name}.png')


def main(argv):
    parser = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    parser.add_argument('source')
    parser.add_argument('out')
    parser.add_argument('--head-full', type=Path,
                        help='where to write the whole head for logo-icon (default: head-full.svg next to OUT)')
    parser.add_argument('--debug', type=Path, help='folder for the part masks as PNG')
    args = parser.parse_args(argv)
    image = Image.open(args.source).convert('RGB')
    if image.size != (SOURCE_SIZE, SOURCE_SIZE):
        raise SystemExit(f'expected a {SOURCE_SIZE} x {SOURCE_SIZE} image, got {image.size}')
    pixels = np.asarray(image)
    anchor = classify_picture(pixels)
    part, color = assign_parts(anchor)
    masks, colors = extend(part, color)
    drawn, straw_lines = redraw_straws(anchor, part, masks, colors)
    if args.debug:
        save_debug(args.debug, part, masks, colors)
    traced = {name: trace(masks[p], colors[p], {**TRACE, **TRACE_BY_PART.get(name, {})},
                          drawn if p == RICE else None)
              for p, name in enumerate(PARTS)}
    traced['rice'] += straw_lines
    write_svg(args.out, ''.join(group(name, traced[name]) for name in PARTS))
    head_mask, head_colors = head_full(part, color)
    head_out = args.head_full or Path(args.out).with_name('head-full.svg')
    write_svg(head_out, f'<g id="head">\n' + '\n'.join(
        f'<path d="{d}" fill="{fill}"/>' for d, fill in trace(head_mask, head_colors, TRACE)) + '\n</g>\n')


if __name__ == '__main__':
    main(sys.argv[1:])
