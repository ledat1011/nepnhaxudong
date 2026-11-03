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
4. Smooth each part (3 x 3 majority), trace it on its own with vtracer, snap each color to the brand
   palette, scale to 512 x 512 and write compact relative path data.
5. Add the tied straw bundle (straws, rope tie, cut ends) to the rice as hand-drawn polygons
   (straw_bundle()); traced, its thin lines broke into bits.
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
# The loose straws between the grains and the upper hand are redrawn from lightness alone: a rice
# pixel in STRAW_ZONE darker than BUNDLE_LINE_L (CIE L), or darker than the mean of the LINE_WINDOW
# square around it by LINE_CONTRAST, is a line; every other one is straw. By color they break into
# outline, shade and gold bits.
STRAW_ZONE = [(520, 600), (600, 610), (650, 700), (560, 790), (530, 800), (505, 700)]
BUNDLE_LINE_L = 48
LINE_WINDOW = 11
LINE_CONTRAST = 10
# Elsewhere in the rice a shade pixel within this distance of gold is gold (grain rims). In the
# hat, a gold or shade pixel farther than this from an outline is a rib line and is gold.
SHADE_REACH = 3

# The tied straw bundle (between the hands, the rope tie, and the cut straws below the lower hand) is
# drawn by hand instead of traced: traced, its thin straw lines broke into bits. Source pixels.
# Between the hands: MID_STRAWS parallel straws from under the upper forearm (MID_START) to the right
# arm, whose outline cuts them (ARM_EDGE); MID_TOP is the top straw's upper side, MID_BOTTOM a point
# on the lowest straw's lower side.
MID_TOP = ((670, 719), (770, 772))
MID_BOTTOM = (545, 806)
MID_START = ((610, 687), (545, 796))
ARM_EDGE = ((770, 772), (735, 808))
MID_STRAWS = 6
# How far the straws run on under the upper forearm past MID_START.
MID_UNDER_ARM = 24
# The rope tie: a band across the straws from the bundle's upper outline (TIE_TOP, where it rises
# TIE_BULGE over it with a flat round end TIE_CAP deep) down under the lower hand.
TIE_TOP = (698, 734)
TIE_BULGE = 4
TIE_CAP = 7
TIE_LENGTH = 140
TIE_WIDTH = 28
TIE_TWIST_STEP = 10
TIE_TWIST_SLANT = 9
# Below the lower hand: one straw per cut end, all pointing away from LOW_FOCUS, cut at the top by
# the sleeve's lower outline (SLEEVE_EDGE) and, under the hand, by the start of LOW_REGION.
LOW_ENDS = [(762, 1006), (790, 1002), (817, 996), (850, 986), (885, 976), (895, 957), (922, 932),
            (927, 897)]
LOW_FOCUS = (240, 484)
LOW_LENGTH = 220
LOW_STRAW_WIDTH = 18
SLEEVE_EDGE = [(790, 898), (800, 908), (815, 918), (830, 921), (850, 912), (870, 899), (880, 894),
               (890, 881), (900, 868), (910, 850), (915, 837)]
LOW_REGION = [(630, 876)] + SLEEVE_EDGE + [(1000, 850), (1000, 1040), (630, 1040)]
# Outline width, and the width of the Nâu áo line between two straws.
BUNDLE_OUTLINE = 5
STRAW_LINE = 3.5
# Rounded cut end: its depth as a share of the straw width.
STRAW_END_DEPTH = 0.3
STRAW_END_POINTS = 9
# The image generator's translucent four-point star over the straw ends: hand or rice pixels traced
# from it go (the drawn straws are there).
WATERMARK = [(900, 872), (934, 904), (902, 936), (875, 903)]
# Width of the hands' own outline: darker hand pixels farther from the skin over the bundle go.
HAND_OUTLINE = 8
# Traced rice pixels this close to the drawn bundle, or below the sleeve (LOW_REGION), go, so no
# old straw bit shows beside it.
BUNDLE_CLEAR = 10

# The whole head for logo-icon: the head part closed with this radius (it takes in the brim and
# hair the rice hides, and the loose brim bits between the leaves), cut at HEAD_FULL_CUT (below the
# chin, so the long hair does not make the icon tall), outlined HEAD_FULL_OUTLINE wide where guessed.
HEAD_FULL_CLOSE = 64
HEAD_FULL_CUT = 515
HEAD_FULL_OUTLINE = 7
# Leaf outline bits that stick out of the closed head and are thinner than twice this go.
HEAD_FULL_SMOOTH = 5

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


def assign_parts(anchor, lightness):
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
    # The color of an anchor, except: the loose straws, the grains' shaded rims and hat ribs gold.
    brand = np.array([BRAND.index(b) if b else -1 for _, _, b, _ in ANCHORS], dtype=np.int16)
    color = brand[anchor]
    is_any = lambda names: np.isin(anchor, [ANCHOR_INDEX[n] for n in names])
    near = lambda names: dilate(is_any(names), SHADE_REACH)
    golden = ['gold', 'gold-shade', 'straw-shade']
    bundle = (part == RICE) & polygon_mask(STRAW_ZONE)
    line = (lightness < BUNDLE_LINE_L) | (lightness < box_mean(lightness, LINE_WINDOW) - LINE_CONTRAST)
    color[bundle] = np.where(line[bundle], BRAND.index(DARK), BRAND.index(STRAW))
    rims = (part == RICE) & ~bundle & is_any(['straw-shade']) & near(['gold', 'gold-shade'])
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
    full = fill_holes(erode(dilate(head, HEAD_FULL_CLOSE), HEAD_FULL_CLOSE) | head) & (rows < HEAD_FULL_CUT)
    full = fill_holes(largest_region(dilate(erode(full, HEAD_FULL_SMOOTH), HEAD_FULL_SMOOTH) & full))
    # Hat ribs (gold) are thin lines, not a fill to extend.
    fills = head & ~np.isin(color, [BRAND.index(DARK), BRAND.index(GOLD)])
    guessed = full & ~head
    # Through the head's outlines too, so a guessed area that they close off still gets a color.
    painted = spread(np.where(fills, color, -1), fills, guessed | (head & ~fills))
    colors = np.where(head, color, painted)
    # The guessed areas get outlines: along the new silhouette, along the cut, and where two fill
    # colors meet in them (hat brim against hair or face).
    border = full & dilate(~full, HEAD_FULL_OUTLINE)
    fill_color = np.where(fills | guessed, colors, -1)
    seam = np.zeros_like(full)
    for dy, dx in ((1, 0), (0, 1)):
        moved = shift(fill_color, dy, dx)
        seam |= (moved != fill_color) & (moved >= 0) & (fill_color >= 0)
    seam = dilate(seam & guessed, HEAD_FULL_OUTLINE // 2) & guessed
    colors = np.where((border & (guessed | (rows >= HEAD_FULL_CUT - HEAD_FULL_OUTLINE))) | seam,
                      BRAND.index(DARK), colors)
    return full, np.where(full, colors, -1)


def write_svg(path, body):
    svg = f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {OUT_SIZE} {OUT_SIZE}">\n{body}</svg>\n'
    Path(path).write_text(svg, encoding='utf-8', newline='\n')
    print(f'wrote {path} ({len(svg.encode())} bytes)')


def unit(vector):
    vector = np.asarray(vector, dtype=float)
    return vector / np.hypot(*vector)


def signed_area(polygon):
    return sum(x0 * y1 - x1 * y0 for (x0, y0), (x1, y1) in zip(polygon, polygon[1:] + polygon[:1])) / 2


def clip(subject, convex):
    """The part of polygon `subject` (any shape) inside the convex polygon `convex` (Sutherland-Hodgman)."""
    sign = 1 if signed_area(convex) > 0 else -1
    out = [np.asarray(p, dtype=float) for p in subject]
    for a, b in zip(convex, convex[1:] + convex[:1]):
        a, b = np.asarray(a, dtype=float), np.asarray(b, dtype=float)
        side = lambda p: sign * ((b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]))
        points, out = out, []
        for p, q in zip(points[-1:] + points[:-1], points):
            sp, sq = side(p), side(q)
            if sq >= 0:
                if sp < 0:
                    out.append(p + (q - p) * sp / (sp - sq))
                out.append(q)
            elif sp >= 0:
                out.append(p + (q - p) * sp / (sp - sq))
        if not out:
            return []
    return out


def straw_shape(start, end, half_width, cap):
    """Convex outline of a straw from start to end, the end rounded over the last `cap` pixels."""
    start, end = np.asarray(start, dtype=float), np.asarray(end, dtype=float)
    along = unit(end - start)
    across = np.array([-along[1], along[0]])
    base = end - along * cap
    arc = [base + along * cap * np.cos(t) + across * half_width * np.sin(t)
           for t in np.linspace(np.pi / 2, -np.pi / 2, STRAW_END_POINTS)]
    return [start + across * half_width] + arc + [start - across * half_width]


def half_plane(line, inside_point, shift=0.0):
    """Large convex polygon: the side of `line` that holds inside_point, its edge moved `shift` inward."""
    p, q = (np.asarray(v, dtype=float) for v in line)
    along = unit(q - p)
    normal = np.array([-along[1], along[0]])
    if normal @ (np.asarray(inside_point) - p) < 0:
        normal = -normal
    p = p + normal * shift
    far = 4 * SOURCE_SIZE
    return [p - along * far, p + along * far, p + along * far + normal * far, p - along * far + normal * far]


def offset_line(points, distance):
    """A polyline moved `distance` to its right-hand side (below a line drawn left to right)."""
    points = [np.asarray(p, dtype=float) for p in points]
    normals = [np.array([-e[1], e[0]]) for e in (unit(b - a) for a, b in zip(points, points[1:]))]
    moved = []
    for i, p in enumerate(points):
        near = normals[max(i - 1, 0):i + 1]
        moved.append(p + unit(sum(near)) * distance)
    return moved


def straw_bundle():
    """The hand-drawn bundle as (color, polygons) layers, bottom first, in source pixels."""
    along = unit(np.subtract(MID_TOP[1], MID_TOP[0]))
    down = np.array([-along[1], along[0]])
    top = np.asarray(MID_TOP[0], dtype=float)
    band = down @ (np.asarray(MID_BOTTOM) - top)
    pitch = (band - 2 * BUNDLE_OUTLINE) / MID_STRAWS
    start_point = np.asarray(MID_START[0], dtype=float)
    start_dir = unit(np.subtract(MID_START[1], MID_START[0]))
    arm_outer = half_plane(ARM_EDGE, MID_BOTTOM)
    arm_inner = half_plane(ARM_EDGE, MID_BOTTOM, BUNDLE_OUTLINE)
    # One straight cut under the forearm, not a step at every straw.
    start_side = half_plane(MID_START, MID_TOP[1], -MID_UNDER_ARM / 2)
    mid = {DARK: [], BLOUSE: [], STRAW: []}
    for i in range(MID_STRAWS):
        center = top + down * (BUNDLE_OUTLINE + (i + 0.5) * pitch)
        # Where this straw's center line meets the start line, then a little further under the arm.
        k = np.linalg.solve(np.column_stack([along, -start_dir]), start_point - center)[0]
        start = center + along * (k - MID_UNDER_ARM)
        end = start + along * SOURCE_SIZE / 2
        for color, half, region in ((DARK, pitch / 2 + BUNDLE_OUTLINE, arm_outer),
                                    (BLOUSE, pitch / 2, arm_inner),
                                    (STRAW, (pitch - STRAW_LINE) / 2, arm_inner)):
            mid[color].append(clip(clip(straw_shape(start, end, half, 0), region), start_side))
    tie_top = np.asarray(TIE_TOP, dtype=float) - down * TIE_BULGE
    tie_end = tie_top + down * TIE_LENGTH
    half = TIE_WIDTH / 2
    tie_core = straw_shape(tie_end, tie_top, half, TIE_CAP)
    twists = []
    for offset in np.arange(TIE_TWIST_STEP, TIE_LENGTH, TIE_TWIST_STEP):
        a = tie_top + down * offset - along * half
        b = tie_top + down * (offset + TIE_TWIST_SLANT) + along * half
        side = unit(np.array([-(b - a)[1], (b - a)[0]])) * STRAW_LINE / 2
        twists.append(clip([a + side, b + side, b - side, a - side], tie_core))
    low_outer = LOW_REGION
    low_inner = [LOW_REGION[0]] + offset_line(SLEEVE_EDGE, BUNDLE_OUTLINE) + LOW_REGION[len(SLEEVE_EDGE) + 1:]
    low = {DARK: [], BLOUSE: [], STRAW: []}
    half = LOW_STRAW_WIDTH / 2
    cap = LOW_STRAW_WIDTH * STRAW_END_DEPTH
    for end in LOW_ENDS:
        direction = unit(np.subtract(end, LOW_FOCUS))
        start = np.asarray(end) - direction * LOW_LENGTH
        low[DARK].append(clip(low_outer, straw_shape(start, end + direction * BUNDLE_OUTLINE,
                                                     half + BUNDLE_OUTLINE, cap + BUNDLE_OUTLINE)))
        low[BLOUSE].append(clip(low_inner, straw_shape(start, end, half + STRAW_LINE / 2, cap)))
        low[STRAW].append(clip(low_inner, straw_shape(start, end, half, cap)))
    tie_half = TIE_WIDTH / 2 + BUNDLE_OUTLINE
    tie_outline = straw_shape(tie_end, tie_top - down * BUNDLE_OUTLINE, tie_half, TIE_CAP + BUNDLE_OUTLINE)
    return [(DARK, low[DARK]), (BLOUSE, low[BLOUSE]), (STRAW, low[STRAW]),
            (DARK, mid[DARK]), (BLOUSE, mid[BLOUSE]), (STRAW, mid[STRAW]),
            (DARK, [tie_outline]), (GOLD, [tie_core]), (DARK, twists)]


def bundle_paths(layers):
    """One path per layer; every polygon counter-clockwise, so overlaps add up under nonzero fill."""
    paths = []
    for color, polygons in layers:
        d = ''
        for polygon in polygons:
            if len(polygon) < 3:
                continue
            if signed_area(polygon) < 0:
                polygon = polygon[::-1]
            d += 'M' + 'L'.join(f'{x:.2f} {y:.2f}' for x, y in polygon) + 'Z'
        paths.append((compact_path(d, 0, 0), color))
    return paths


def bundle_mask(layers):
    canvas = Image.new('1', (SOURCE_SIZE, SOURCE_SIZE), 0)
    draw = ImageDraw.Draw(canvas)
    for _, polygons in layers:
        for polygon in polygons:
            if len(polygon) >= 3:
                draw.polygon([tuple(p) for p in polygon], fill=1)
    return dilate(np.asarray(canvas, dtype=bool), BUNDLE_CLEAR) | polygon_mask(LOW_REGION)


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


def snap(hex_color):
    """Nearest brand color. vtracer merges speckles into a neighbor and averages their colors."""
    rgb = hex_rgb(hex_color)
    return min(BRAND, key=lambda b: ((hex_rgb(b) - rgb) ** 2).sum())


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


def trace(mask, colors, settings):
    mask, colors = majority(mask, colors, SMOOTH_PASSES)
    h, w = mask.shape
    rgba = np.zeros((h, w, 4), dtype=np.uint8)
    palette = np.array([hex_rgb(b) for b in BRAND], dtype=np.uint8)
    rgba[mask, :3] = palette[colors[mask]]
    rgba[mask, 3] = 255
    pixels = [tuple(int(v) for v in px) for px in rgba.reshape(-1, 4)]
    svg = vtracer.convert_pixels_to_svg(pixels, (w, h), **settings)
    paths = []
    for d, fill, tx, ty in PATH.findall(svg):
        paths.append((compact_path(d, float(tx), float(ty)), snap(fill.upper())))
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
    part, color = assign_parts(anchor, srgb_to_lab(pixels.astype(float))[..., 0])
    masks, colors = extend(part, color)
    bundle = straw_bundle()
    clear = bundle_mask(bundle)
    masks[RICE] &= ~clear
    masks[HANDS] &= ~polygon_mask(WATERMARK)
    # The hands took the old straw lines next to them as their outlines; over the drawn bundle only
    # their own outline stays.
    skin = masks[HANDS] & (colors[HANDS] != BRAND.index(DARK))
    masks[HANDS] &= ~(clear & (colors[HANDS] == BRAND.index(DARK)) & ~dilate(skin, HAND_OUTLINE))
    if args.debug:
        save_debug(args.debug, part, masks, colors)
    traced = {name: trace(masks[p], colors[p], {**TRACE, **TRACE_BY_PART.get(name, {})})
              for p, name in enumerate(PARTS)}
    traced['rice'] += bundle_paths(bundle)
    write_svg(args.out, ''.join(group(name, traced[name]) for name in PARTS))
    head_mask, head_colors = head_full(part, color)
    head_out = args.head_full or Path(args.out).with_name('head-full.svg')
    write_svg(head_out, f'<g id="head">\n' + '\n'.join(
        f'<path d="{d}" fill="{fill}"/>' for d, fill in trace(head_mask, head_colors, TRACE)) + '\n</g>\n')


if __name__ == '__main__':
    main(sys.argv[1:])
