"""Helpers for turning AI-generated images into aligned, transparent app assets.

Requires Pillow:  pip install pillow

Commands
  crop     Cut every raw generation to the same box so all layers share one canvas.
           python scripts/art_tools.py crop in.jpg out.png --box 512 0 896 768

  keyout   Make a flat-color background transparent (mannequin, icons).
           python scripts/art_tools.py keyout in.png out.png --color FF00FF --tolerance 60

  overlay  Extract what changed between a base image and an edited copy of it
           (a garment, jacket or hat added to the mannequin) as a transparent PNG
           on the same canvas. Prints where the change is so you can spot drift.
           python scripts/art_tools.py overlay base.png edited.png out.png --threshold 40

  preview  Stack transparent layers over a grey checkerboard to check alignment.
           python scripts/art_tools.py preview out.png mannequin.png shirt-1.png jacket-light.png

All outputs are resized to the base canvas size when sizes differ (the aspect ratio must match).
"""
import argparse
import sys

from PIL import Image, ImageChops, ImageFilter


def load_rgb(path):
    return Image.open(path).convert("RGB")


def hex_to_rgb(value):
    value = value.lstrip("#")
    return tuple(int(value[i : i + 2], 16) for i in (0, 2, 4))


def crop(args):
    image = Image.open(args.input).convert("RGB")
    left, top, right, bottom = args.box
    if left < 0 or top < 0 or right > image.width or bottom > image.height or right <= left or bottom <= top:
        sys.exit(f"Box {args.box} does not fit inside the {image.width}x{image.height} image.")
    out = image.crop(args.box)
    out.save(args.output)
    print(f"wrote {args.output} ({out.width}x{out.height}), ratio 1:{out.height / out.width:.2f}")


def keyout(args):
    """Distance from the key color decides alpha: 0 inside the tolerance, 255 well outside it."""
    image = load_rgb(args.input)
    key = hex_to_rgb(args.color)
    key_image = Image.new("RGB", image.size, key)
    diff = ImageChops.difference(image, key_image)
    r, g, b = diff.split()
    # Sum of the three channel differences: JPEG noise on a flat background stays small, while a
    # subject that is close to the key in one channel (wood vs magenta) still scores high.
    distance = ImageChops.add(ImageChops.add(r, g), b)
    # Linear ramp from tolerance to 2*tolerance gives soft, anti-aliased edges.
    low, high = args.tolerance, args.tolerance * 2
    alpha = distance.point(lambda d: 0 if d <= low else 255 if d >= high else int(255 * (d - low) / (high - low)))
    if args.defringe:
        # Pull the visible edge in by a pixel so key-colored fringes do not show.
        alpha = alpha.filter(ImageFilter.MinFilter(3))
    out = image.convert("RGBA")
    out.putalpha(alpha)
    out.save(args.output)
    print_report(out, args.output)


def overlay(args):
    base = load_rgb(args.base)
    edited = load_rgb(args.edited)
    if edited.size != base.size:
        ratio_gap = abs(edited.width / edited.height - base.width / base.height)
        if ratio_gap > 0.01:
            sys.exit(f"Aspect ratios differ (base {base.size}, edited {edited.size}); regenerate at the same ratio.")
        print(f"note: resizing edited image {edited.size} -> {base.size}")
        edited = edited.resize(base.size, Image.LANCZOS)

    diff = ImageChops.difference(base, edited)
    r, g, b = diff.split()
    change = ImageChops.lighter(ImageChops.lighter(r, g), b)
    mask = change.point(lambda d: 255 if d > args.threshold else 0)

    if args.bg:
        # Drop pixels that are still mostly the generation's background color (pink specks and fringe).
        key = Image.new("RGB", edited.size, hex_to_rgb(args.bg))
        kr, kg, kb = ImageChops.difference(edited, key).split()
        away_from_bg = ImageChops.add(ImageChops.add(kr, kg), kb).point(lambda d: 255 if d > args.bg_distance else 0)
        mask = ImageChops.multiply(mask, away_from_bg)

    # Open removes isolated specks from generator noise; close fills pinholes where the new
    # garment happens to match the mannequin's color.
    size = args.clean * 2 + 1
    mask = mask.filter(ImageFilter.MinFilter(size)).filter(ImageFilter.MaxFilter(size))
    mask = mask.filter(ImageFilter.MaxFilter(size)).filter(ImageFilter.MinFilter(size))
    if args.shrink:
        # Edge pixels blend the item with the generation's background color (a pink fringe).
        mask = mask.filter(ImageFilter.MinFilter(args.shrink * 2 + 1))
    if args.grow:
        mask = mask.filter(ImageFilter.MaxFilter(args.grow * 2 + 1))
    alpha = mask.filter(ImageFilter.GaussianBlur(args.soften)) if args.soften else mask

    out = edited.convert("RGBA")
    out.putalpha(alpha)
    out.save(args.output)
    print_report(out, args.output)

    box = mask.getbbox()
    if box is None:
        print("WARNING: nothing changed above the threshold; lower --threshold or check the edit.")
        return
    w, h = base.size
    print(
        "changed area as a fraction of the canvas: "
        f"x {box[0] / w:.2f}-{box[2] / w:.2f}, y {box[1] / h:.2f}-{box[3] / h:.2f}"
    )
    print("Check this against where the item belongs. A shirt should not reach the head or feet;")
    print("if it does, the generator moved or resized the figure and the edit should be redone.")


def preview(args):
    layers = [Image.open(p).convert("RGBA") for p in args.layers]
    size = layers[0].size
    board = Image.new("RGBA", size, (200, 200, 200, 255))
    tile = 16
    for y in range(0, size[1], tile):
        for x in range(0, size[0], tile):
            if (x // tile + y // tile) % 2:
                board.paste((165, 165, 165, 255), (x, y, x + tile, y + tile))
    for layer in layers:
        if layer.size != size:
            sys.exit(f"Layer sizes differ: {layers[0].size} vs {layer.size}. All layers must share one canvas.")
        board = Image.alpha_composite(board, layer)
    board.convert("RGB").save(args.output)
    print(f"wrote {args.output} ({size[0]}x{size[1]}) from {len(layers)} layers")


def print_report(image, path):
    alpha = image.getchannel("A")
    opaque = sum(alpha.histogram()[128:])
    total = image.width * image.height
    print(f"wrote {path} ({image.width}x{image.height}), {100 * opaque / total:.1f}% opaque")


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = parser.add_subparsers(dest="command", required=True)

    c = sub.add_parser("crop", help="crop to a shared canvas box")
    c.add_argument("input")
    c.add_argument("output")
    c.add_argument("--box", type=int, nargs=4, metavar=("LEFT", "TOP", "RIGHT", "BOTTOM"), required=True)
    c.set_defaults(func=crop)

    k = sub.add_parser("keyout", help="make a flat background color transparent")
    k.add_argument("input")
    k.add_argument("output")
    k.add_argument("--color", default="FF00FF", help="background color as hex (default FF00FF)")
    k.add_argument("--tolerance", type=int, default=60, help="channel distance treated as background (default 60)")
    k.add_argument("--defringe", action="store_true", help="shrink the edge by one pixel")
    k.set_defaults(func=keyout)

    o = sub.add_parser("overlay", help="extract an added item as a transparent layer")
    o.add_argument("base")
    o.add_argument("edited")
    o.add_argument("output")
    o.add_argument("--threshold", type=int, default=40, help="channel difference counted as changed (default 40)")
    o.add_argument("--clean", type=int, default=2, help="speck/pinhole cleanup radius in pixels (default 2)")
    o.add_argument("--bg", help="background color of the generation as hex; pixels near it are dropped (e.g. CF4CB0)")
    o.add_argument("--bg-distance", type=int, default=110, help="sum of channel differences from --bg kept as subject (default 110)")
    o.add_argument("--shrink", type=int, default=1, help="trim this many pixels off the edge to drop background fringe (default 1)")
    o.add_argument("--grow", type=int, default=0, help="expand the cutout by this many pixels (default 0)")
    o.add_argument("--soften", type=float, default=0.8, help="edge blur radius (default 0.8, 0 for hard edges)")
    o.set_defaults(func=overlay)

    p = sub.add_parser("preview", help="composite layers over a checkerboard")
    p.add_argument("output")
    p.add_argument("layers", nargs="+")
    p.set_defaults(func=preview)

    args = parser.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
