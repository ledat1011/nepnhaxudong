"""Traces one person pose for the story scenes (brand/story/people/*.svg) from an approved picture.

Sources: the six pose pictures made with Recraft in Task 7 step 1 (1024 x 1024 PNG, flat colors on a
near-white background), approved by the owner on 2026-11-05. The pictures are not kept in the
repository; the owner keeps them outside it.

    python vectorize-pose.py SOURCE.png OUT.svg [--fixes FIXES.json] [--debug DIR]

Steps (classify, 3 x 3 smoothing, vtracer trace and palette snap come from vectorize-mascot.py):
1. Source colors: every exact color that covers at least ANCHOR_MIN_PIXELS pixels, merged when two
   are closer than ANCHOR_MERGE in CIE Lab. The most common one is the background. Each source color
   becomes the nearest palette color (POSE_TOKENS), unless FIXES.json maps it by hand.
2. Classify every pixel to a source color in CIE Lab (an edge pixel goes to the nearer end of an
   ink-to-color pair, so edges get no halo color).
3. Background: background pixels connected to the image border become transparent. Enclosed
   background (eye whites, silver hair) stays Trắng gạo.
4. Hand fixes from FIXES.json.
5. Smooth (SMOOTH_SIZE mode filter, then the 3 x 3 majority of vectorize-mascot.py), trace with
   vtracer and snap each path color to the palette.
6. Fit: crop to the drawn pixels and scale into 256 x 256: the lowest drawn pixel on the bottom
   edge (the feet stand on the ground), centered left to right.

The output has one root <g data-part="person"> and no layers: the scenes move a person as one piece.

FIXES.json keys (coordinates in source pixels, as the PNG shows them, before any mirror):
- "mirror": true flips the person left to right (the scenes need the six poses facing right).
- "map": {"#RRGGBB": "token"}: the source color nearest to #RRGGBB becomes that palette token.
- "recolor": [{"to": "token", "at": [x, y]} or {"to": "token", "box": [x0, y0, x1, y1], "from": ...}]:
  "at" recolors the 4-connected region of one source color under that point; "box" recolors the
  drawn pixels in the box (only those that are now "from", a token or a list, when it is given).
- "clear": the same items without "to", run after every recolor: makes those pixels transparent.
- "overlay" / "underlay": "file.svg": hand-drawn elements (inside an <svg> root, in source pixels)
  drawn over / under the trace with the same mirror, crop and scale. The fit (step 6) does not see them.
- "smooth": mode filter size (odd, 1 = off). "trace": vtracer settings that replace TRACE.

Needs Python 3 with the versions in requirements-mascot.txt (pip install -r requirements-mascot.txt).
"""
import argparse
import importlib.util
import json
import re
import sys
from pathlib import Path

import numpy as np
from PIL import Image

spec = importlib.util.spec_from_file_location('vectorize_mascot', Path(__file__).with_name('vectorize-mascot.py'))
vm = importlib.util.module_from_spec(spec)
spec.loader.exec_module(vm)

OUT_SIZE = 256
# The palette without the two sky colors, so a near-white source color never turns blue.
POSE_TOKENS = ['nau-dat', 'nau-ao', 'vang-lua', 'vang-rom', 'trang-gao', 'hong-ma', 'xanh-ma', 'da', 'toc',
               'xanh-la-nhat']
PALETTE = [vm.TOKENS['color'][name]['value'] for name in POSE_TOKENS]
TOKEN_INDEX = {name: i for i, name in enumerate(POSE_TOKENS)}
# Outlines and hair: an edge pixel between one of these and a fill goes to the ink when nearer.
INK_TOKENS = {'nau-dat', 'toc'}
ANCHOR_MIN_PIXELS = 1000
ANCHOR_MERGE = 4.0
SMOOTH_SIZE = 5
TRACE = {**vm.TRACE, 'filter_speckle': 6, 'corner_threshold': 120, 'length_threshold': 16.0,
         'splice_threshold': 60}
DECIMALS = 1

# vectorize-mascot.py's classify(), majority(), trace() and compact_path() read these module
# globals, so they are set to the pose palette and the pose scale before those functions run.
vm.BRAND = PALETTE
vm.DECIMALS = DECIMALS


def find_anchors(rgb):
    """Source colors, most common first: list of (hex, pixel count)."""
    flat = rgb.reshape(-1, 3)
    colors, counts = np.unique(flat, axis=0, return_counts=True)
    order = np.argsort(-counts)
    kept = []
    for i in order:
        if counts[i] < ANCHOR_MIN_PIXELS:
            break
        lab = vm.srgb_to_lab(colors[i].astype(float))
        if all(np.sqrt(((lab - other) ** 2).sum()) >= ANCHOR_MERGE for _, _, other in kept):
            kept.append(('#%02X%02X%02X' % tuple(int(c) for c in colors[i]), int(counts[i]), lab))
    return [(hex_color, count) for hex_color, count, _ in kept]


def nearest_token(hex_color):
    lab = vm.srgb_to_lab(vm.hex_rgb(hex_color))
    labs = vm.srgb_to_lab(np.array([vm.hex_rgb(c) for c in PALETTE]))
    return POSE_TOKENS[int(((labs - lab) ** 2).sum(1).argmin())]


def anchor_tokens(anchors, by_hand):
    """Palette token per source color (None for the background, which is the first one)."""
    tokens = [None] + [nearest_token(h) for h, _ in anchors[1:]]
    for wanted, token in by_hand.items():
        if token not in TOKEN_INDEX:
            raise SystemExit(f'map: {token} is not one of {POSE_TOKENS}')
        lab = vm.srgb_to_lab(vm.hex_rgb(wanted))
        dist = [((vm.srgb_to_lab(vm.hex_rgb(h)) - lab) ** 2).sum() for h, _ in anchors]
        tokens[int(np.argmin(dist))] = token
    return tokens


def connected(start, allowed):
    """Pixels of `allowed` that a 4-connected path inside `allowed` links to `start`."""
    region = start & allowed
    while True:
        grown = region
        for _ in range(8):
            grown = vm.dilate(grown, 1) & allowed
        if (grown == region).all():
            return region
        region = grown


def box_mask(shape, box):
    x0, y0, x1, y1 = box
    mask = np.zeros(shape, dtype=bool)
    mask[max(y0, 0):y1, max(x0, 0):x1] = True
    return mask


def token_of(name, what):
    if name not in TOKEN_INDEX:
        raise SystemExit(f'{what}: {name} is not one of {POSE_TOKENS}')
    return TOKEN_INDEX[name]


def fix_region(item, anchor, mask, colors, what):
    """The drawn pixels a recolor or clear item names: the region under "at", or the box."""
    if 'at' in item:
        x, y = item['at']
        seed = np.zeros_like(mask)
        seed[y, x] = True
        region = connected(seed, mask & (anchor == anchor[y, x]))
        if not region.any():
            raise SystemExit(f'{what}: nothing drawn at {item["at"]}')
        return region
    region = box_mask(mask.shape, item['box']) & mask
    if 'from' in item:
        names = [item['from']] if isinstance(item['from'], str) else item['from']
        region &= np.isin(colors, [token_of(name, what) for name in names])
    return region


def apply_fixes(anchor, mask, colors, fixes):
    for item in fixes.get('recolor', []):
        colors[fix_region(item, anchor, mask, colors, 'recolor')] = token_of(item['to'], 'recolor')
    for item in fixes.get('clear', []):
        mask[fix_region(item, anchor, mask, colors, 'clear')] = False


def mode_filter(mask, colors, size):
    """Each pixel takes the most common color (transparent counts as one) in a size x size square."""
    if size <= 1:
        return mask, colors
    label = np.where(mask, colors, -1)
    values = list(range(-1, len(PALETTE)))
    counts = np.stack([vm.box_mean((label == v).astype(float), size) for v in values])
    label = np.array(values)[counts.argmax(0)]
    return label >= 0, np.where(label >= 0, label, 0)


def fit(mask, colors):
    """The drawn pixels on a square canvas: bottom on the bottom edge, centered left to right.
    Returns (mask, colors, size, (x0, y0) of the crop, (left, top) padding)."""
    ys, xs = np.nonzero(mask)
    x0, x1, y0, y1 = xs.min(), xs.max() + 1, ys.min(), ys.max() + 1
    w, h = x1 - x0, y1 - y0
    size = max(w, h)
    left, top = (size - w) // 2, size - h
    out_mask = np.zeros((size, size), dtype=bool)
    out_colors = np.zeros((size, size), dtype=colors.dtype)
    out_mask[top:top + h, left:left + w] = mask[y0:y1, x0:x1]
    out_colors[top:top + h, left:left + w] = colors[y0:y1, x0:x1]
    return out_mask, out_colors, size, (x0, y0), (left, top)


def drawn_group(path, mirror, width, crop, pad, scale):
    """A hand-drawn file's elements in a <g> that maps source pixels to the output, as the trace."""
    text = Path(path).read_text(encoding='utf-8')
    inner = re.search(r'<svg\b[^>]*>(.*)</svg>', text, re.S)
    if inner is None:
        raise SystemExit(f'{path} is not an svg document')
    body = re.sub(r'>\s+<', '><', re.sub(r'<!--.*?-->', '', inner.group(1), flags=re.S)).strip()
    sx = -scale if mirror else scale
    # The crop is measured after the mirror: x_out = (width - x_src - crop x + pad x) * scale.
    tx = ((width if mirror else 0) - crop[0] + pad[0]) * scale
    ty = (pad[1] - crop[1]) * scale
    f = lambda v: vm.fmt(v) if abs(v) >= 1 else f'{v:.4f}'.rstrip('0')
    return f'<g transform="matrix({f(sx)} 0 0 {f(scale)} {f(tx)} {f(ty)})">{body}</g>'


def save_debug(directory, anchors, tokens, mask, colors):
    directory.mkdir(parents=True, exist_ok=True)
    palette = np.array([vm.hex_rgb(c) for c in PALETTE], dtype=np.uint8)
    img = np.zeros(mask.shape + (4,), dtype=np.uint8)
    img[mask, :3] = palette[colors[mask]]
    img[mask, 3] = 255
    Image.fromarray(img).save(directory / 'snapped.png')
    report = [f'{h} {count:7d} px -> {token or "background"}' for (h, count), token in zip(anchors, tokens)]
    (directory / 'anchors.txt').write_text('\n'.join(report) + '\n', encoding='utf-8')


def main(argv):
    parser = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    parser.add_argument('source')
    parser.add_argument('out')
    parser.add_argument('--fixes', type=Path, help='JSON file with the hand fixes for this pose')
    parser.add_argument('--debug', type=Path, help='folder for the snapped colors as PNG and the color list')
    args = parser.parse_args(argv)
    fixes = json.loads(args.fixes.read_text(encoding='utf-8')) if args.fixes else {}

    rgb = vm.read_source(args.source, any_source=True)
    anchors = find_anchors(rgb)
    tokens = anchor_tokens(anchors, fixes.get('map', {}))
    vm.ANCHORS = [('background' if t is None else h, h, t, t in INK_TOKENS) for (h, _), t in zip(anchors, tokens)]
    anchor = vm.classify(rgb)

    background = anchor == 0
    border = np.zeros_like(background)
    border[0, :] = border[-1, :] = border[:, 0] = border[:, -1] = True
    outside = connected(border, background)
    mask = ~outside
    token_index = np.array([TOKEN_INDEX['trang-gao'] if t is None else TOKEN_INDEX[t] for t in tokens])
    colors = token_index[anchor]
    apply_fixes(anchor, mask, colors, fixes)
    if args.debug:
        save_debug(args.debug, anchors, tokens, mask, colors)

    mirror = bool(fixes.get('mirror'))
    if mirror:
        mask, colors = np.fliplr(mask), np.fliplr(colors)

    mask, colors = mode_filter(mask, colors, fixes.get('smooth', SMOOTH_SIZE))
    mask, colors, size, crop, pad = fit(mask, colors)
    vm.SCALE = OUT_SIZE / size
    paths = vm.trace(mask, colors, {**TRACE, **fixes.get('trace', {})})
    body = ''.join(f'<path d="{d}" fill="{fill}"/>' for d, fill in paths)
    drawn = lambda key: drawn_group(args.fixes.parent / fixes[key], mirror, rgb.shape[1], crop, pad, vm.SCALE)
    if 'underlay' in fixes:
        body = drawn('underlay') + body
    if 'overlay' in fixes:
        body += drawn('overlay')

    svg = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {OUT_SIZE} {OUT_SIZE}">\n'
           f'<g data-part="person">{body}</g>\n</svg>\n')
    Path(args.out).write_text(svg, encoding='utf-8', newline='\n')
    used = sorted({fill for _, fill in paths})
    print(f'wrote {args.out}: {len(svg.encode())} bytes, {len(paths)} paths, colors {" ".join(used)}')


if __name__ == '__main__':
    main(sys.argv[1:])
