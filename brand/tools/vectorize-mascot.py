"""Builds brand/mascot/mascot-layered.svg from the approved mascot illustration.

Source: an AI-generated raster illustration (1024 x 1024 PNG, girl with a nón lá holding a rice
sheaf) that the owner approved on 2026-11-03. The PNG is not kept in the repository; pass its path.

    python vectorize-mascot.py SOURCE.png OUT.svg [--debug DIR]

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
BRAND = [DARK, BLOUSE, GOLD, STRAW, CHEEK, LEAF, SKIN]

# Source color -> brand color (None = background, left transparent). Ink colors are outlines,
# hair and eyes: a pixel between ink and another color goes to the ink when it is nearer to it.
ANCHORS = [
    ('background', '#F8F3E7', None, False),
    ('outline', '#4E2F1C', DARK, True),
    ('hair', '#22211E', DARK, True),
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
# The straw bundle below the grains is redrawn from lightness alone: a rice pixel in STRAW_ZONE
# darker than BUNDLE_LINE_L (CIE L), or darker than the mean of the LINE_WINDOW square around it
# by LINE_CONTRAST, is a line; every other one is straw. Thin straw lines keep their length that
# way (by color they break into outline and shade bits, and the lower straws have light lines),
# and the soft golden streaks, which quantize to noise, go. The rope tie keeps its gold.
STRAW_ZONE = [(520, 600), (600, 610), (960, 850), (960, 1024), (700, 1024), (530, 800), (505, 700)]
BUNDLE_LINE_L = 48
LINE_WINDOW = 11
LINE_CONTRAST = 10
TIE_ZONE = [(688, 718), (726, 732), (672, 840), (632, 828)]
# Elsewhere in the rice a shade pixel within this distance of gold is gold (grain rims). In the
# hat, a gold or shade pixel farther than this from an outline is a rib line and is gold.
SHADE_REACH = 3
# A translucent four-point star (the image generator's mark) over the straw ends: inside this
# outline every light pixel that is not on the sleeve edge is straw again, and a straw pixel that
# touches the background is outline.
WATERMARK = [(900, 872), (934, 904), (902, 936), (875, 903)]
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


def remove_watermark(anchor):
    """Repaints the generator's star mark (WATERMARK) as straw with its outline."""
    star = polygon_mask(WATERMARK)
    keep = [i for i, (name, _, _, ink) in enumerate(ANCHORS) if ink or name == 'background']
    light = star & ~np.isin(anchor, keep) & ~dilate(anchor == ANCHOR_INDEX['blouse'], SHADE_REACH)
    anchor = np.where(light, ANCHOR_INDEX['straw'], anchor)
    edge = star & (anchor == ANCHOR_INDEX['straw']) & dilate(anchor == ANCHOR_INDEX['background'], 2)
    return np.where(edge, ANCHOR_INDEX['outline'], anchor).astype(anchor.dtype)


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
    for rid, r in enumerate(regions):
        name = ANCHORS[r['value']][0]
        inside = head_zone[int(round(r['cy'])), int(round(r['cx']))]
        small = r['area'] < (BLOUSE_SPECKLE_AREA if name == 'blouse' else SPECKLE_AREA)
        hole = name == 'background' and rid not in on_border and r['area'] < BACKGROUND_HOLE_AREA
        part_of_region[rid] = -3 if small or hole else region_part(name, inside, r['cy'])
    part = part_of_region[ids]
    # Outlines (-2): the highest part with a fill within OUTLINE_REACH.
    outline = part == -2
    for p in range(len(PARTS)):
        part = np.where(dilate(part == p, OUTLINE_REACH) & outline, p, part)
    # The color of an anchor, except: straw in the bundle, the grains' shaded rims and hat ribs gold.
    brand = np.array([BRAND.index(b) if b else -1 for _, _, b, _ in ANCHORS], dtype=np.int16)
    color = brand[anchor]
    is_any = lambda names: np.isin(anchor, [ANCHOR_INDEX[n] for n in names])
    near = lambda names: dilate(is_any(names), SHADE_REACH)
    golden = ['gold', 'gold-shade', 'straw-shade']
    bundle = (part == RICE) & polygon_mask(STRAW_ZONE)
    tie = bundle & polygon_mask(TIE_ZONE) & is_any(golden)
    line = (lightness < BUNDLE_LINE_L) | (lightness < box_mean(lightness, LINE_WINDOW) - LINE_CONTRAST)
    color[bundle] = np.where(line[bundle], BRAND.index(DARK), BRAND.index(STRAW))
    color[tie & ~line] = BRAND.index(GOLD)
    rims = (part == RICE) & ~bundle & is_any(['straw-shade']) & near(['gold', 'gold-shade'])
    color[rims & ~near(['straw', 'hat-light'])] = BRAND.index(GOLD)
    ink = [name for name, _, _, is_ink in ANCHORS if is_ink]
    color[(part == HEAD) & is_any(golden) & ~near(ink)] = BRAND.index(GOLD)
    color[part == -2] = BRAND.index(DARK)
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
    parser.add_argument('--debug', type=Path, help='folder for the part masks as PNG')
    args = parser.parse_args(argv)
    image = Image.open(args.source).convert('RGB')
    if image.size != (SOURCE_SIZE, SOURCE_SIZE):
        raise SystemExit(f'expected a {SOURCE_SIZE} x {SOURCE_SIZE} image, got {image.size}')
    pixels = np.asarray(image)
    raw = classify_picture(pixels)
    anchor = remove_watermark(raw)
    # Repaired pixels get the lightness of their new anchor (the bundle is drawn from lightness).
    lab = srgb_to_lab(pixels.astype(float))[..., 0]
    anchor_lightness = srgb_to_lab(np.array([hex_rgb(h) for _, h, _, _ in ANCHORS]))[:, 0]
    lightness = np.where(anchor != raw, anchor_lightness[anchor], lab)
    part, color = assign_parts(anchor, lightness)
    masks, colors = extend(part, color)
    if args.debug:
        save_debug(args.debug, part, masks, colors)
    svg = f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {OUT_SIZE} {OUT_SIZE}">\n'
    for p, name in enumerate(PARTS):
        svg += group(name, trace(masks[p], colors[p], {**TRACE, **TRACE_BY_PART.get(name, {})}))
    svg += '</svg>\n'
    Path(args.out).write_text(svg, encoding='utf-8', newline='\n')
    print(f'wrote {args.out} ({len(svg.encode())} bytes)')


if __name__ == '__main__':
    main(sys.argv[1:])
