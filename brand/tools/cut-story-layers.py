"""Cuts the moving parts of the rice story scenes into transparent WebP layers.

Reads `brand/story/layers.json` and the approved sketches (`brand/story/phac/*.webp`, 1600 px wide).
The layers are cut from each sketch resized to 1200 x 675, the size all coordinates are in; the page
places them in percent of the scene, so they line up with the smaller scene picture. Writes:

- `web/public/lop/<slug>-<name>.webp`: one RGBA WebP per layer, cropped to its visible box (a
  folder of its own, one level deep, as the path guard of the site wants);
- `web/public/story/canh-<n>-<slug>.webp`: the scene pictures, 960 x 540, and the young-rice and
  night pictures of step 2 (`canh-2-nang-mua-gio-{non,dem}.webp`);
- `web/src/lib/story/scene-layers.json`: where each layer sits, in percent of the scene.

A layer entry in layers.json:
- `name`: the part name the motion code looks for (`data-part`).
- `rect: [x0, y0, x1, y1]`, `circle: [cx, cy, r]` or `circles: [[cx, cy, r], ...]` (several small
  shapes that move as one part, such as rain drops), `polygon: [[x, y], ...]`, or
  `union: [<shape>, ...]` (several of these shapes as one), in pixels of the 1200 x 675 picture.
- `pad`: pixels added around the shape. The layer covers the part plus this margin, so a part
  that shakes or drifts by less than `pad` never shows the original part behind it.
- `feather`: the width in pixels of the soft edge, inside the pad.
- `matte`: true takes only the drawn part (its pixels that differ from the background behind it),
  so the part can rotate or drift over the sky without carrying the sky with it.
- `patch`: true also writes `<name>-patch`, the background behind the part, filled in from the
  pixels around it. The page lays it under the part, so the part can leave its place.
  `"flat"` fills it with one colour instead: the median of the strip just above the shape, for a
  part that sits on a plain wall but touches other drawn things on its sides.
- `matte_range: [low, high]` (optional): the matte thresholds for this layer, when its
  background has a texture that the default range would keep.
- `fill`: true makes the layer the filled-in background itself (as a patch, but stacked in the
  entry order, so it can lie over an earlier layer, or stand alone under a layer that turns).
  `fill_color: [r, g, b]` fills it with one colour instead, when the things around the hole
  (a dark machine, ink lines) would darken the smooth fill.
- `radial: {"from": a, "to": b, "copies": n}` (with `circle` and `matte`): a wheel with n equal
  spokes, part of it hidden behind other things. The layer is the clean sector from a to b
  degrees (counter-clockwise from the right), turned n times by 360 / n degrees, so the whole
  wheel can turn.
- `origin: [x, y]` (optional): the turning point; the shape's centre by default.

Needs numpy and Pillow (`brand/tools/requirements-mascot.txt`). Run from the repo root:
    python brand/tools/cut-story-layers.py
"""

from __future__ import annotations

import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parents[2]
SPEC = ROOT / "brand" / "story" / "layers.json"
SCENES = ROOT / "web" / "public" / "story"
OUT_DIR = ROOT / "web" / "public" / "lop"
MANIFEST = ROOT / "web" / "src" / "lib" / "story" / "scene-layers.json"
SKETCHES = ROOT / "brand" / "story" / "phac"
# The extra pictures of step 2, which fade over the day picture: young rice and night. The green
# rice between them is recoloured from the day picture in the browser (lib/story/green-rice.ts),
# because as a file it would weigh as much as the day picture.
YOUNG = (SKETCHES / "2-nang-mua-gio-non.webp", SCENES / "canh-2-nang-mua-gio-non.webp")
NIGHT = (SKETCHES / "2-nang-mua-gio-dem.webp", SCENES / "canh-2-nang-mua-gio-dem.webp")
# Sketches whose file name is not `<n>-<slug>.webp`.
SKETCH_NAMES = {"nang-mua-gio": "2-nang-mua-gio-ngay"}

# The size the layers are cut at, and the size of every coordinate in layers.json.
WIDTH, HEIGHT = 1200, 675
# The size of the pictures on the page. The scene is at most 416 CSS px wide (from 768 px) or about
# 320 px (phone), so 960 px is sharp on 2x screens and on a 3x phone; 1200 px only added bytes
# (about 30 % more for the 8 scenes, owner 2026-11-11: "page load hơi lâu").
PAGE_WIDTH, PAGE_HEIGHT = 960, 540
SLUGS = ["cay-ma", "nang-mua-gio", "gat", "say", "xay-xat", "dong-goi", "den-tay-khach", "mam-com"]
# The difference from the background, per channel, below which a pixel is background and above
# which it is fully the drawn part (matte layers).
MATTE_LOW, MATTE_HIGH = 10.0, 38.0
FILL_ROUNDS = 1500
# How far, in pixels, the patch under a matte part reaches beyond the drawn pixels.
PATCH_SPREAD = 4
LAYER_QUALITY = 82
PICTURE_QUALITY = 70


def shape_mask(entry: dict, grow: float) -> np.ndarray:
    """A 0..1 mask of the entry's shape grown by `grow` pixels, over the whole picture."""
    if "union" in entry:
        return np.max([shape_mask(shape, grow) for shape in entry["union"]], axis=0)
    if "polygon" in entry:
        img = Image.new("L", (WIDTH, HEIGHT), 0)
        ImageDraw.Draw(img).polygon([tuple(p) for p in entry["polygon"]], fill=255)
        size = int(round(abs(grow))) * 2 + 1
        if size > 1:
            img = img.filter(ImageFilter.MaxFilter(size) if grow > 0 else ImageFilter.MinFilter(size))
        return np.asarray(img, dtype=np.float32) / 255
    ys, xs = np.mgrid[0:HEIGHT, 0:WIDTH]
    if "circles" in entry:
        inside = np.zeros((HEIGHT, WIDTH), dtype=bool)
        for cx, cy, r in entry["circles"]:
            inside |= (xs - cx) ** 2 + (ys - cy) ** 2 <= (r + grow) ** 2
        return inside.astype(np.float32)
    if "circle" in entry:
        cx, cy, r = entry["circle"]
        return ((xs - cx) ** 2 + (ys - cy) ** 2 <= (r + grow) ** 2).astype(np.float32)
    x0, y0, x1, y1 = entry["rect"]
    return ((xs >= x0 - grow) & (xs <= x1 + grow) & (ys >= y0 - grow) & (ys <= y1 + grow)).astype(
        np.float32
    )


def soft(mask: np.ndarray, feather: float) -> np.ndarray:
    """Blurs a hard mask so it falls from 1 to 0 over about `feather` pixels, then keeps the
    inside fully opaque: the blur only works outward."""
    if feather <= 0:
        return mask
    img = Image.fromarray((mask * 255).astype(np.uint8))
    blurred = np.asarray(img.filter(ImageFilter.GaussianBlur(feather / 2)), dtype=np.float32) / 255
    return np.maximum(mask, blurred)


def fill_hole(rgb: np.ndarray, hole: np.ndarray) -> np.ndarray:
    """Fills the pixels where `hole` is set from the pixels around them (a smooth membrane:
    each pixel becomes the average of its neighbours, repeated). The backgrounds behind the
    moving parts are sky wash and plain walls, which this fills without a visible seam."""
    out = rgb.astype(np.float32).copy()
    hole = hole.astype(bool)
    ys, xs = np.nonzero(hole)
    if len(ys) == 0:
        return out
    y0, y1 = max(ys.min() - 2, 0), min(ys.max() + 3, HEIGHT)
    x0, x1 = max(xs.min() - 2, 0), min(xs.max() + 3, WIDTH)
    part = out[y0:y1, x0:x1]
    inside = hole[y0:y1, x0:x1]
    ring = ~inside
    part[inside] = part[ring].mean(axis=0)
    for _ in range(FILL_ROUNDS):
        avg = (
            np.roll(part, 1, 0) + np.roll(part, -1, 0) + np.roll(part, 1, 1) + np.roll(part, -1, 1)
        ) / 4
        part[inside] = avg[inside]
    out[y0:y1, x0:x1] = part
    return out


def wheel(rgba: np.ndarray, entry: dict) -> np.ndarray:
    """Rebuilds a wheel with equal spokes from one clean sector: the sector is turned `copies`
    times about the circle's centre and the copies laid over each other."""
    cx, cy, _ = entry["circle"]
    radial = entry["radial"]
    ys, xs = np.mgrid[0:HEIGHT, 0:WIDTH]
    angle = np.degrees(np.arctan2(-(ys - cy), xs - cx)) % 360
    lo, hi = radial["from"] % 360, radial["to"] % 360
    inside = (angle >= lo) & (angle < hi) if lo < hi else (angle >= lo) | (angle < hi)
    sector = rgba.copy()
    sector[..., 3] *= inside
    source = Image.fromarray(sector.astype(np.uint8), "RGBA")
    out = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    step = 360 / radial["copies"]
    for k in range(radial["copies"]):
        # PIL turns counter-clockwise on screen for a positive angle, as the sector angles go.
        out.alpha_composite(source.rotate(k * step, resample=Image.BICUBIC, center=(cx, cy)))
    return np.asarray(out, dtype=np.float32)


def save_layer(rgba: np.ndarray, path: Path) -> tuple[int, int, int, int]:
    """Crops the layer to its visible pixels, saves it and returns its box."""
    alpha = rgba[..., 3]
    ys, xs = np.nonzero(alpha > 2)
    x0, x1, y0, y1 = int(xs.min()), int(xs.max()) + 1, int(ys.min()), int(ys.max()) + 1
    Image.fromarray(rgba[y0:y1, x0:x1].astype(np.uint8), "RGBA").save(
        path, "WEBP", quality=LAYER_QUALITY, method=6, alpha_quality=90
    )
    return x0, y0, x1 - x0, y1 - y0


def pct(value: float, whole: int) -> float:
    return round(value * 100 / whole, 3)


def place(name: str, slug: str, box: tuple[int, int, int, int], origin: tuple[float, float]) -> dict:
    x, y, w, h = box
    return {
        "name": name,
        "src": f"/lop/{slug}-{name}.webp",
        "left": pct(x, WIDTH),
        "top": pct(y, HEIGHT),
        "width": pct(w, WIDTH),
        "height": pct(h, HEIGHT),
        "originX": round((origin[0] - x) * 100 / w, 3),
        "originY": round((origin[1] - y) * 100 / h, 3),
    }


def centre(entry: dict) -> tuple[float, float]:
    if "origin" in entry:
        return tuple(entry["origin"])
    if "circle" in entry:
        return entry["circle"][0], entry["circle"][1]
    if "union" in entry:
        return centre(entry["union"][0])
    if "polygon" in entry:
        pts = entry["polygon"]
        return sum(p[0] for p in pts) / len(pts), sum(p[1] for p in pts) / len(pts)
    if "circles" in entry:
        return (
            sum(c[0] for c in entry["circles"]) / len(entry["circles"]),
            sum(c[1] for c in entry["circles"]) / len(entry["circles"]),
        )
    x0, y0, x1, y1 = entry["rect"]
    return (x0 + x1) / 2, (y0 + y1) / 2


def sketch_of(slug: str) -> Path:
    index = SLUGS.index(slug)
    return SKETCHES / f"{SKETCH_NAMES.get(slug, f'{index + 1}-{slug}')}.webp"


def scene_picture(slug: str) -> Path:
    return SCENES / f"canh-{SLUGS.index(slug) + 1}-{slug}.webp"


def cut_scene(slug: str, entries: list[dict]) -> list[dict]:
    resized = Image.open(sketch_of(slug)).convert("RGB").resize((WIDTH, HEIGHT), Image.LANCZOS)
    rgb = np.asarray(resized, dtype=np.float32)
    patches: list[dict] = []
    parts: list[dict] = []
    for entry in entries:
        name, pad, feather = entry["name"], entry.get("pad", 8), entry.get("feather", 4)
        core = shape_mask(entry, pad - feather)
        cover = soft(core, feather)
        background = None
        if entry.get("patch") == "flat":
            x0, y0, x1, _ = entry["rect"]
            strip = rgb[y0 - pad - 6 : y0 - pad - 1, x0:x1].reshape(-1, 3)
            background = np.broadcast_to(np.median(strip, axis=0), rgb.shape).astype(np.float32)
        elif entry.get("matte") or entry.get("patch") or entry.get("fill"):
            background = fill_hole(rgb, shape_mask(entry, pad) > 0)
        if entry.get("fill"):
            if "fill_color" in entry:
                background = np.broadcast_to(np.array(entry["fill_color"], np.float32), rgb.shape)
            rgba = np.dstack([background, cover * 255])
        else:
            if entry.get("matte"):
                diff = np.abs(rgb - background).max(axis=2)
                low, high = entry.get("matte_range", (MATTE_LOW, MATTE_HIGH))
                drawn = np.clip((diff - low) / (high - low), 0, 1)
                alpha = drawn * cover
            else:
                alpha = cover
            rgba = np.dstack([rgb, alpha * 255])
            if "radial" in entry:
                rgba = wheel(rgba, entry)
        box = save_layer(rgba, OUT_DIR / f"{slug}-{name}.webp")
        parts.append(place(name, slug, box, centre(entry)))
        if entry.get("patch"):
            if entry.get("matte"):
                # Only where the part is drawn, a little wider: elsewhere the original sky with
                # its ink-wash grain stays visible, and the smooth fill would show as a pale box.
                spread = Image.fromarray(((drawn > 0.08) * 255).astype(np.uint8)).filter(
                    ImageFilter.MaxFilter(PATCH_SPREAD * 2 + 1)
                )
                under = soft(np.asarray(spread, dtype=np.float32) / 255, 3) * shape_mask(entry, pad)
            else:
                under = soft(shape_mask(entry, pad - feather), feather)
            patch = np.dstack([background, under * 255])
            pbox = save_layer(patch, OUT_DIR / f"{slug}-{name}-patch.webp")
            patches.append(place(f"{name}-patch", slug, pbox, centre(entry)))
    # Patches first: the page stacks the layers in this order, so every part lies over them.
    return patches + parts


def save_picture(img: Image.Image, path: Path) -> None:
    img.convert("RGB").resize((PAGE_WIDTH, PAGE_HEIGHT), Image.LANCZOS).save(
        path, "WEBP", quality=PICTURE_QUALITY, method=6
    )


def main() -> None:
    spec = json.loads(SPEC.read_text(encoding="utf-8"))
    unknown = set(spec) - set(SLUGS)
    assert not unknown, f"unknown scenes in layers.json: {unknown}"
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    for old in OUT_DIR.glob("*.webp"):
        old.unlink()
    manifest = {slug: cut_scene(slug, spec[slug]) for slug in SLUGS if slug in spec}
    MANIFEST.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    # The young-rice and night pictures are resized like the day picture of the same scene, so
    # they line up when one fades in.
    pictures = [(sketch_of(slug), scene_picture(slug)) for slug in SLUGS] + [YOUNG, NIGHT]
    for source, target in pictures:
        save_picture(Image.open(source), target)
    for slug, layers in manifest.items():
        size = sum((OUT_DIR / Path(layer["src"]).name).stat().st_size for layer in layers)
        print(f"{slug}: {len(layers)} layers, {size // 1024} KB")
    for _, target in pictures:
        print(f"{target.name}: {target.stat().st_size // 1024} KB")


if __name__ == "__main__":
    main()
