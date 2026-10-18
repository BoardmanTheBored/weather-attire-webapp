"""Helpers for turning AI-generated images into aligned, transparent app assets.

Requires Pillow:  pip install pillow

Commands
  crop     Cut every raw generation to the same box so all layers share one canvas.
           python scripts/art_tools.py crop in.jpg out.png --box 512 0 896 768

  keyout   Make a flat-color background transparent (mannequin, icons).
           python scripts/art_tools.py keyout in.png out.png --color D84BB8

  overlay  Extract what changed between a base image and an edited copy of it
           (a garment, jacket or hat added to the mannequin) as a transparent PNG
           on the same canvas. Prints where the change is so you can spot drift.
           python scripts/art_tools.py overlay base.png edited.png out.png

  preview  Stack transparent layers over a grey checkerboard to check alignment.
           python scripts/art_tools.py preview out.png mannequin.png shirt-1.png jacket-light.png

How edges are made clean (keyout and overlay share this):
  The generated art has a flat background and dark outlines, so a pixel on the silhouette edge is a
  blend of background and the nearest subject color (usually the outline). Instead of guessing a
  mask and then shrinking, growing or blurring it, each edge pixel is solved exactly:
      pixel = a * subject + (1 - a) * background
  which gives its transparency `a` and its true color, with no halo of background color. Pixels away
  from the edge are copied unchanged, so no outline can be cut out. An overlay contains exactly the
  pixels that differ from the base image; everything else already comes from the base layer.
"""
import argparse
import sys

from PIL import Image, ImageChops, ImageFilter


def load_rgb(path):
    return Image.open(path).convert("RGB")


def hex_to_rgb(value):
    value = value.lstrip("#")
    return tuple(int(value[i : i + 2], 16) for i in (0, 2, 4))


def sample_bg(image):
    """Average color of small patches in the four corners, as a hex string.

    Gemini never returns exactly the background hex that was asked for, and the shade differs from
    image to image, so each image is measured on its own.
    """
    rgb = image.convert("RGB")
    w, h = rgb.size
    total = [0, 0, 0]
    count = 0
    for x, y in [(4, 4), (w - 24, 4), (4, h - 24), (w - 24, h - 24)]:
        for dx in range(0, 20, 4):
            for dy in range(0, 20, 4):
                r, g, b = rgb.getpixel((x + dx, y + dy))
                total[0] += r
                total[1] += g
                total[2] += b
                count += 1
    return "%02X%02X%02X" % tuple(round(t / count) for t in total)


def l1_distance(image, color):
    """Sum of the three channel differences from a flat color, as a greyscale image."""
    r, g, b = ImageChops.difference(image, Image.new("RGB", image.size, color)).split()
    return ImageChops.add(ImageChops.add(r, g), b)


def crop(args):
    image = Image.open(args.input).convert("RGB")
    left, top, right, bottom = args.box
    if left < 0 or top < 0 or right > image.width or bottom > image.height or right <= left or bottom <= top:
        sys.exit(f"Box {args.box} does not fit inside the {image.width}x{image.height} image.")
    out = image.crop(args.box)
    out.save(args.output)
    print(f"wrote {args.output} ({out.width}x{out.height}), ratio 1:{out.height / out.width:.2f}")


def save_png(image, path):
    """Save an RGBA image with the color under fully transparent pixels cleared.

    Noise left in invisible pixels (JPEG artifacts) would otherwise stop PNG from compressing them.
    """
    clean = Image.new("RGBA", image.size, (0, 0, 0, 0))
    clean.paste(image, mask=image.getchannel("A").point(lambda v: 255 if v > 0 else 0))
    clean.save(path, optimize=True)


def sample_outline(image):
    """Typical outline color of an illustration: the median of its very dark pixels."""
    dark = [p for p in image.convert("RGB").getdata() if sum(p) < 160]
    if not dark:
        return (43, 33, 24)
    return tuple(sorted(c[i] for c in dark)[len(dark) // 2] for i in range(3))


def keep_large_regions(mask, min_area, min_fraction, reach):
    """Keep the connected regions of a mask that belong to the item.

    Generator noise and outline jitter leave small blobs all over the picture; the item is made of
    large regions. A region is kept if it has at least `min_fraction` of the largest region's area (so
    two shoes both survive), or if it has at least `min_area` pixels and lies within `reach` pixels of
    a kept region (a hem fragment cut off from a trouser leg by a one-pixel gap). Noise beside the
    item that is far from it, or tiny, is dropped.
    """
    width, height = mask.size
    data = bytearray(mask.tobytes())
    regions = []
    for start in range(len(data)):
        if data[start] != 255:
            continue
        stack = [start]
        data[start] = 1
        region = []
        while stack:
            i = stack.pop()
            region.append(i)
            x, y = i % width, i // width
            for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1), (x - 1, y - 1), (x + 1, y - 1), (x - 1, y + 1), (x + 1, y + 1)):
                if 0 <= nx < width and 0 <= ny < height:
                    j = ny * width + nx
                    if data[j] == 255:
                        data[j] = 1
                        stack.append(j)
        regions.append(region)
    if not regions:
        return Image.new("L", mask.size, 0)
    largest = max(len(r) for r in regions)
    kept = bytearray(len(data))
    big = [r for r in regions if len(r) >= max(min_area, min_fraction * largest)]
    for region in big:
        for i in region:
            kept[i] = 255
    # Fragments close to a kept region.
    near = Image.frombytes("L", mask.size, bytes(kept)).filter(ImageFilter.MaxFilter(reach * 2 + 1)).tobytes()
    for region in regions:
        if region in big or len(region) < min_area:
            continue
        if any(near[i] for i in region):
            for i in region:
                kept[i] = 255
    return Image.frombytes("L", mask.size, bytes(kept))


def matte_edges(image, bg, region=None, edge=3, radius=4, line_tolerance=45):
    """Cut `image` out of its flat background `bg`, solving each edge pixel exactly.

    Returns an RGBA image. Pixels that are background become transparent; pixels more than `edge`
    pixels from any background are copied with full opacity; pixels in between are matted against the
    darkest strongly non-background color within `radius` pixels (the outline, or the stroke color for
    icons drawn without one). If given, `region` (a mask) limits the result to those pixels.
    """
    width, height = image.size
    bg_distance = l1_distance(image, bg)
    is_bg = bg_distance.point(lambda d: 255 if d < 40 else 0)  # clean background: fully transparent
    # Edge pixels are found from anything at least half background. In a very narrow gap (between an
    # arm and the torso) JPEG blending leaves no clean background pixel at all, only blends.
    seed = bg_distance.point(lambda d: 255 if d < 100 else 0)
    near_bg = seed.filter(ImageFilter.MaxFilter(edge * 2 + 1))  # those pixels plus the ones next to them
    interior = ImageChops.subtract(Image.new("L", image.size, 255), near_bg)

    out = image.convert("RGBA")
    out.putalpha(interior)  # copied unchanged, fully opaque

    px = out.load()
    src = image.load()
    dist = bg_distance.load()
    bgmask = is_bg.load()
    nearmask = near_bg.load()
    for y in range(height):
        for x in range(width):
            if bgmask[x, y]:
                continue  # background stays transparent
            if not nearmask[x, y]:
                continue  # interior, already opaque
            # Edge pixel: gather the strongly non-background colors nearby. The pixel is a blend of the
            # background and one of them: usually the dark outline, but for thin strokes the lighter fill.
            nearby = []
            for yy in range(max(0, y - radius), min(height, y + radius + 1)):
                for xx in range(max(0, x - radius), min(width, x + radius + 1)):
                    if dist[xx, yy] >= 200:
                        nearby.append(src[xx, yy])
            if not nearby:
                px[x, y] = (0, 0, 0, 0)  # faint speck with no subject beside it
                continue
            nearby.sort(key=sum)
            candidates = [nearby[0], nearby[len(nearby) // 2], nearby[-1]]  # darkest, middle, lightest
            # Solve pixel = a*subject + (1-a)*bg along the line from bg to a candidate. Try the darkest
            # first (the outline fits nearly every edge pixel) and fall back to the others only when it
            # does not fit, so a lighter color never wins on a pixel that really is an outline blend.
            pixel = src[x, y]
            w = [p - k for p, k in zip(pixel, bg)]
            best = None
            for subject in candidates:
                v = [c - k for c, k in zip(subject, bg)]
                vv = sum(c * c for c in v)
                if vv == 0:
                    continue
                t = sum(a * b for a, b in zip(w, v)) / vv
                residual = max(abs(p - (k + t * c)) for p, k, c in zip(pixel, bg, v))
                if residual <= line_tolerance and t > -0.05:
                    best = (residual, t, subject)
                    break
            if best is None:
                px[x, y] = (*pixel, 255)  # not a bg/subject blend: keep exactly as drawn
            else:
                alpha = min(1.0, max(0.0, best[1]))
                px[x, y] = (*best[2], 0 if alpha < 0.06 else round(alpha * 255))

    if region is not None:
        out.putalpha(ImageChops.multiply(out.getchannel("A"), region))
    return out


def keyout(args):
    image = load_rgb(args.input)
    out = matte_edges(image, hex_to_rgb(args.color), edge=args.edge, radius=args.radius, line_tolerance=args.line_tolerance)
    save_png(out, args.output)
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
    bg = hex_to_rgb(args.bg or sample_bg(edited))

    # Pixels the edit changed. Weak changes (generator noise) are despeckled: open drops 1-2 px specks,
    # close joins small gaps, and only large connected regions are kept (noise blobs are small, the
    # item is not). Thin changes can still be real: where the new outline nearly coincides with
    # the base's outline only a sliver differs, and dropping it cuts a gap in the outline. So strong
    # changes are also kept, but only next to the main changed area: the whole picture is regenerated, so
    # every outline jitters by a sub-pixel, and that jitter far from the item must not become part of it.
    r, g, b = ImageChops.difference(base, edited).split()
    difference = ImageChops.add(ImageChops.add(r, g), b)
    main = difference.point(lambda d: 255 if d > args.threshold else 0)
    main = main.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.MaxFilter(3))
    main = main.filter(ImageFilter.MaxFilter(3)).filter(ImageFilter.MinFilter(3))
    main = keep_large_regions(main, args.min_area, args.min_fraction, args.reach)
    strong = difference.point(lambda d: 255 if d > args.strong else 0)
    beside_main = main.filter(ImageFilter.MaxFilter(args.reach * 2 + 1))
    changed = ImageChops.lighter(main, ImageChops.multiply(strong, beside_main))

    # An item's outline can coincide exactly with the base's own outline (a shoe collar on the ankle
    # outline). Those pixels are 'unchanged', so they would be left to the base layer, but a layer drawn
    # between the base and this one (trousers under shoes) can cover them and cut a gap in the outline.
    # So keep outline-colored pixels within `ring` px of the item. Only outlines: fills such as the
    # cream chest seen through an open jacket must not be pasted over the layers beneath.
    outline = sample_outline(base)
    darkish = l1_distance(edited, outline).point(lambda d: 255 if d < 110 else 0)
    ring = changed.filter(ImageFilter.MaxFilter(args.ring * 2 + 1))
    changed = ImageChops.lighter(changed, ImageChops.multiply(ring, darkish))

    if args.clip_bottom is not None:
        # An edit can redraw things that are not the item (trouser edits also redraw the feet). Rows at or
        # below this fraction of the canvas height are left to the layers that own them.
        from PIL import ImageDraw
        ImageDraw.Draw(changed).rectangle((0, round(changed.height * args.clip_bottom), changed.width, changed.height), fill=0)
    out = matte_edges(edited, bg, region=changed, edge=args.edge, radius=args.radius, line_tolerance=args.line_tolerance)
    save_png(out, args.output)
    print_report(out, args.output)

    box = out.getchannel("A").point(lambda v: 255 if v > 0 else 0).getbbox()
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


def add_edge_options(parser):
    parser.add_argument("--edge", type=int, default=3, help="pixels from the background treated as edge (default 3)")
    parser.add_argument("--radius", type=int, default=4, help="search radius for the nearby subject color (default 4)")
    parser.add_argument("--line-tolerance", type=int, default=45, help="how far a pixel may stray from a background/subject blend (default 45)")


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
    k.add_argument("--color", required=True, help="background color as hex, measured from the image (e.g. D84BB8)")
    add_edge_options(k)
    k.set_defaults(func=keyout)

    o = sub.add_parser("overlay", help="extract an added item as a transparent layer")
    o.add_argument("base")
    o.add_argument("edited")
    o.add_argument("output")
    o.add_argument("--threshold", type=int, default=30, help="sum of channel differences counted as changed (default 30)")
    o.add_argument("--strong", type=int, default=100, help="difference kept at any width, even 1 px thin, beside the item (default 100)")
    o.add_argument("--min-area", type=int, default=150, help="smallest changed region kept, in pixels; smaller blobs are noise (default 150)")
    o.add_argument("--min-fraction", type=float, default=0.2, help="a region must also be this fraction of the largest region (default 0.2)")
    o.add_argument("--clip-bottom", type=float, default=None, help="drop everything at or below this fraction of the canvas height (used for trousers, whose edits also redraw the feet)")
    o.add_argument("--ring", type=int, default=1, help="keep outline pixels this close to the item even if unchanged, so no layer under it can cut a gap in the outline (default 1)")
    o.add_argument("--reach", type=int, default=3, help="how close to the item a thin strong change must be, in pixels (default 3)")
    o.add_argument("--bg", help="background color of the edited image as hex (default: measured from its corners)")
    add_edge_options(o)
    o.set_defaults(func=overlay)

    p = sub.add_parser("preview", help="composite layers over a checkerboard")
    p.add_argument("output")
    p.add_argument("layers", nargs="+")
    p.set_defaults(func=preview)

    args = parser.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
