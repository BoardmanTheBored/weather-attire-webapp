"""Builds every art asset in assets/art/ from the raw Gemini images in art/work/.

Requires Pillow:  pip install pillow
Usage:            python scripts/build_art.py [name ...]     (no names = everything present)

Inputs  (art/work/):  mannequin_base.jpg, shirt-0..2, pants-0..2, shoes-0..2, jacket-light, jacket-heavy,
                      hat-sun, hat-rain, hat-beanie (all edits of the bare mannequin), and the icon images
                      thermometer, clear, overcast, rain, snow, windy, umbrella, hydration.
Outputs (assets/art/): character/mannequin.png, outfit/<name>.png (384x768 transparent layers),
                      icons/<name>.png (128x128 transparent).

Each generation's background color is sampled from its own corners (Gemini never returns the exact
hex that was asked for), so nothing here assumes a color.
"""
import sys
from pathlib import Path
from types import SimpleNamespace

from PIL import Image

sys.path.insert(0, str(Path(__file__).parent))
import art_tools  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
WORK = ROOT / "art" / "work"
CROP_DIR = WORK / "crop"
OUT = ROOT / "assets" / "art"

# One shared canvas for the character: the same box is cut from the mannequin and every edit of it.
# Measured in art/README.md (figure centered at x=704, all items within x 559-850).
BOX = (512, 0, 896, 768)

OUTFIT = ["shirt-0", "shirt-1", "shirt-2", "pants-0", "pants-1", "pants-2", "shoes-0", "shoes-1", "shoes-2",
          "jacket-light", "jacket-heavy", "hat-sun", "hat-rain", "hat-beanie"]
ICONS = ["thermometer", "clear", "overcast", "rain", "snow", "windy", "umbrella", "hydration"]
ICON_SIZE = 128
ICON_PADDING = 0.06  # fraction of the icon's longest side kept as transparent margin


def sample_bg(image):
    """Average of small patches in the four corners, as a hex string."""
    rgb = image.convert("RGB")
    w, h = rgb.size
    patches = [(4, 4), (w - 24, 4), (4, h - 24), (w - 24, h - 24)]
    total = [0, 0, 0]
    count = 0
    for x, y in patches:
        for dx in range(0, 20, 4):
            for dy in range(0, 20, 4):
                r, g, b = rgb.getpixel((x + dx, y + dy))
                total[0] += r
                total[1] += g
                total[2] += b
                count += 1
    return "%02X%02X%02X" % tuple(round(t / count) for t in total)


def crop_to_canvas(src, dst):
    art_tools.crop(SimpleNamespace(input=str(src), output=str(dst), box=list(BOX)))


def build_mannequin():
    dst = OUT / "character" / "mannequin.png"
    crop = CROP_DIR / "mannequin_base.png"
    crop_to_canvas(WORK / "mannequin_base.jpg", crop)
    bg = sample_bg(Image.open(crop))
    art_tools.keyout(SimpleNamespace(input=str(crop), output=str(dst), color=bg, tolerance=60, defringe=True))
    return f"mannequin (bg #{bg})"


def build_outfit(name):
    crop_base = CROP_DIR / "mannequin_base.png"
    crop_edit = CROP_DIR / f"{name}.png"
    crop_to_canvas(WORK / f"{name}.jpg", crop_edit)
    bg = sample_bg(Image.open(crop_edit))
    dst = OUT / "outfit" / f"{name}.png"
    art_tools.overlay(SimpleNamespace(
        base=str(crop_base), edited=str(crop_edit), output=str(dst), threshold=40, clean=1, grow=2,
        shrink=0, soften=0.8, bg=bg, bg_distance=110, edge_band=3, edge_bg_distance=190))
    return f"{name} (bg #{bg})"


def build_icon(name):
    src = WORK / f"{name}.jpg"
    bg = sample_bg(Image.open(src))
    tmp = CROP_DIR / f"{name}_keyed.png"
    art_tools.keyout(SimpleNamespace(input=str(src), output=str(tmp), color=bg, tolerance=60, defringe=True))
    keyed = Image.open(tmp)
    box = keyed.getchannel("A").point(lambda v: 255 if v > 20 else 0).getbbox()
    subject = keyed.crop(box)
    side = round(max(subject.size) * (1 + 2 * ICON_PADDING))
    square = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    square.paste(subject, ((side - subject.width) // 2, (side - subject.height) // 2))
    icon = square.resize((ICON_SIZE, ICON_SIZE), Image.LANCZOS)
    dst = OUT / "icons" / f"{name}.png"
    art_tools.save_png(icon, dst)
    print(f"wrote {dst} ({ICON_SIZE}x{ICON_SIZE}) from subject {subject.size}")
    return f"{name} (bg #{bg})"


def main():
    wanted = sys.argv[1:]
    for folder in ("character", "outfit", "icons"):
        (OUT / folder).mkdir(parents=True, exist_ok=True)
    CROP_DIR.mkdir(parents=True, exist_ok=True)

    jobs = []
    if not wanted or "mannequin" in wanted:
        jobs.append(("mannequin", build_mannequin))
    jobs += [(n, lambda n=n: build_outfit(n)) for n in OUTFIT if not wanted or n in wanted]
    jobs += [(n, lambda n=n: build_icon(n)) for n in ICONS if not wanted or n in wanted]

    done, missing = [], []
    for name, job in jobs:
        source = WORK / ("mannequin_base.jpg" if name == "mannequin" else f"{name}.jpg")
        if not source.exists():
            missing.append(name)
            continue
        print(f"--- {name}")
        done.append(job())
    print(f"\nbuilt {len(done)} assets" + (f"; missing sources: {', '.join(missing)}" if missing else ""))


if __name__ == "__main__":
    main()
