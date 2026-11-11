"""Cuts the moving parts of the rice story scenes into transparent WebP layers.

Reads `brand/story/layers.json` and the scene pictures the page shows (`web/public/story/canh-*.webp`,
1200 x 675), so every layer matches the page pixel for pixel. Writes:

- `web/public/lop/<slug>-<name>.webp`: one RGBA WebP per layer, cropped to its visible box (a
  folder of its own, one level deep, as the path guard of the site wants);
- `web/public/story/canh-2-nang-mua-gio-{non,dem}.webp`: the young-rice and night pictures of step 2;
- `web/src/lib/story/scene-layers.json`: where each layer sits, in percent of the scene.

A layer entry in layers.json:
- `name`: the part name the motion code looks for (`data-part`).
- `rect: [x0, y0, x1, y1]`, `circle: [cx, cy, r]` or `circles: [[cx, cy, r], ...]` (several small
  shapes that move as one part, such as rain drops), in pixels of the 1200 x 675 picture.
- `pad`: pixels added around the shape. The layer covers the part plus this margin, so a part
  that shakes or drifts by less than `pad` never shows the original part behind it.
- `feather`: the width in pixels of the soft edge, inside the pad.
- `matte`: true takes only the drawn part (its pixels that differ from the background behind it),
  so the part can rotate or drift over the sky without carrying the sky with it.
- `patch`: true also writes `<name>-patch`, the background behind the part, filled in from the
  pixels around it. The page lays it under the part, so the part can leave its place.
  `"flat"` fills it with one colour instead: the median of the strip just above the shape, for a
  part that sits on a plain wall but touches other drawn things on its sides.
- `origin: [x, y]` (optional): the turning point; the shape's centre by default.

Needs numpy and Pillow (`brand/tools/requirements-mascot.txt`). Run from the repo root:
    python brand/tools/cut-story-layers.py
"""

from __future__ import annotations

import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

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

WIDTH, HEIGHT = 1200, 675
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
    if "circles" in entry:
        return (
            sum(c[0] for c in entry["circles"]) / len(entry["circles"]),
            sum(c[1] for c in entry["circles"]) / len(entry["circles"]),
        )
    x0, y0, x1, y1 = entry["rect"]
    return (x0 + x1) / 2, (y0 + y1) / 2


def cut_scene(slug: str, index: int, entries: list[dict]) -> list[dict]:
    src = SCENES / f"canh-{index + 1}-{slug}.webp"
    rgb = np.asarray(Image.open(src).convert("RGB"), dtype=np.float32)
    assert rgb.shape[:2] == (HEIGHT, WIDTH), f"{src} is not {WIDTH} x {HEIGHT}"
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
        elif entry.get("matte") or entry.get("patch"):
            background = fill_hole(rgb, shape_mask(entry, pad) > 0)
        if entry.get("matte"):
            diff = np.abs(rgb - background).max(axis=2)
            drawn = np.clip((diff - MATTE_LOW) / (MATTE_HIGH - MATTE_LOW), 0, 1)
            alpha = drawn * cover
        else:
            alpha = cover
        rgba = np.dstack([rgb, alpha * 255])
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
    img.convert("RGB").resize((WIDTH, HEIGHT), Image.LANCZOS).save(
        path, "WEBP", quality=PICTURE_QUALITY, method=6
    )


def main() -> None:
    spec = json.loads(SPEC.read_text(encoding="utf-8"))
    unknown = set(spec) - set(SLUGS)
    assert not unknown, f"unknown scenes in layers.json: {unknown}"
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    for old in OUT_DIR.glob("*.webp"):
        old.unlink()
    manifest = {slug: cut_scene(slug, SLUGS.index(slug), spec[slug]) for slug in SLUGS if slug in spec}
    MANIFEST.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    # Resized like the day picture of the same scene, so they line up when one fades in.
    for source, target in (YOUNG, NIGHT):
        save_picture(Image.open(source), target)
    for slug, layers in manifest.items():
        size = sum((OUT_DIR / Path(layer["src"]).name).stat().st_size for layer in layers)
        print(f"{slug}: {len(layers)} layers, {size // 1024} KB")
    for _, target in (YOUNG, NIGHT):
        print(f"{target.name}: {target.stat().st_size // 1024} KB")


if __name__ == "__main__":
    main()
