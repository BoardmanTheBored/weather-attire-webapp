# Art workflow

> Owned by the art track in `plan.md` (A0–A4). The Developer reviews and edits this file; the Agent keeps it current.

**Tool (A0):** Google Gemini app, free tier, image generation and editing ("Nano Banana"). Chosen 2026-10-16.

**License and terms (Developer to read and record before the final art is used):**
- [x] Read the Gemini Apps terms and Prohibited Use Policy and note the wording on ownership and commercial/public use: ______
- [x] Note whether downloaded images carry a visible watermark, and the daily limit: ______
- [x] Date the assets were generated: 2026-10-16

What the Agent verified on 2026-10-16: the [Gemini API terms](https://ai.google.dev/gemini-api/terms) say "Google won't claim ownership over that content"; the [Gemini Apps help page](https://support.google.com/gemini/answer/14286560?hl=en&p=generate_images) tells users to follow the Prohibited Use Policy and use discretion before publishing. It did not confirm commercial use, watermarks, or limits for the app. Use the Gemini app, not Google AI Studio (its terms are written for professional or business use).

## Working folders

- `art/work/` — raw generations and in-progress files. Not committed (see `.gitignore`).
- `assets/art/` — final transparent PNGs the app uses (committed). Layout: `character/`, `outfit/`, `icons/`, matching `assets/placeholders/`.
- `scripts/art_tools.py` — `crop`, `keyout`, `overlay`, `preview` (`pip install pillow`).

## Canvas

Every character layer shares one canvas so overlays line up. The app uses **1:2 (384×768 for the pilot)**. Gemini returns the image at its own size (round 1: 1408×768 landscape, figure centered), so every raw image is cropped with the **same box**, chosen from the mannequin: keep the figure centered with about 56 px of margin on each side for jackets and hats. After the new mannequin is generated, the Agent measures its figure box and gives you the crop box. Never crop or resize one layer on its own.

## Why round 1 came out as a photo, and what changed

Round 1 asked for a "wooden artist's mannequin", a real photographed object, and led with mood words ("rustic, vintage"). The model drew a photo. Round 2 fixes this by: leading with the medium ("flat vector illustration"), stating the line and fill rules positively (uniform dark outline, flat matte fills), naming what to leave out (photographic texture, shading, 3D), simplifying the mannequin (smooth shapes, no joints or wood grain, so clothes fit and extract cleanly), and choosing garment colors that differ from both the mannequin and the background.

## Prompts (round 2)

**Process for every asset:** start a **new chat**, attach the reference image (for all clothing and hats: `mannequin_raw`; for icons: the final mannequin as a style reference), paste the prompt, and generate 2–3 candidates. Pick the one whose figure did not move. Save as `art/work/<name>_raw.png` (JPG is fine). Do not continue one long chat: drift builds up.

If a result looks like a photo or a 3D render, add: *"This must look like a flat 2D vector illustration, not a photograph and not a 3D render."*

### Shared blocks

**STYLE**
> Flat vector illustration in the style of a vintage 1930s–40s American WPA national-park poster. Bold, uniform dark outlines (color #2B2118), flat matte color fills, no gradients, no shading, no soft lighting, no drop shadow, no photographic texture, no 3D rendering. Limited muted palette of faded red, mustard yellow, navy, olive green, warm cream and charcoal. Simple, slightly chunky shapes with minimal detail.

**BACKGROUND**
> The background is one single flat solid color, exactly #FF00FF magenta, edge to edge, with no gradient, vignette, floor, ground line, or shadow.

**EDIT** (the sentence that follows the item in every clothing prompt)
> Change nothing else: keep the mannequin's pose, size, proportions and exact position in the image, the background color, the outline style and the flat illustration style exactly as they are, and keep the same framing and image size. Draw the item in the same flat style, with the same uniform dark outline, flat color fills and a few simple fold lines.

### 1. Mannequin (1 image)

> [STYLE] A simplified, featureless artist's mannequin figure: a smooth rounded head with no face, a neck, torso, arms, hands and legs built from simple rounded shapes, with no joint details and no wood grain, filled with one flat warm cream color (#EADFC8). Full-length, front view, perfectly symmetrical, standing straight with the arms slightly away from the body and the feet slightly apart. The whole figure, including the head and feet, is fully visible and fills about 90% of the image height, centered, with empty margins on all sides. No clothing, no text, no other objects. [BACKGROUND]

Save as `mannequin_raw`. Everything below attaches this image.

### 2. Clothing and hats (14 images)

Each prompt is: **"Using this exact image as the base, add [ITEM]. [EDIT]"**

| # | Asset (file) | ITEM |
|---|---|---|
| 2 | `shirt-0` red | a short-sleeved crew-neck T-shirt in flat faded red (#B5483A), covering the torso from the shoulders to the hips |
| 3 | `shirt-1` blue | a short-sleeved crew-neck T-shirt in flat faded blue (#4F7CAC), covering the torso from the shoulders to the hips |
| 4 | `shirt-2` green | a short-sleeved crew-neck T-shirt in flat olive green (#6B7A3A), covering the torso from the shoulders to the hips |
| 5 | `pants-0` navy | straight-leg full-length trousers in flat navy (#27374D), from a simple waistband at the hips down to the ankles, leaving the feet bare |
| 6 | `pants-1` khaki | straight-leg full-length trousers in flat khaki brown (#8B6B3E), from a simple waistband at the hips down to the ankles, leaving the feet bare |
| 7 | `pants-2` grey | straight-leg full-length trousers in flat charcoal grey (#5C5C5C), from a simple waistband at the hips down to the ankles, leaving the feet bare |
| 8 | `shoes-0` sneakers | a pair of low-top lace-up sneakers, white with a dark sole, on the feet only; leave the legs bare |
| 9 | `shoes-1` loafers | a pair of brown leather slip-on loafers (#6B4423), on the feet only; leave the legs bare |
| 10 | `shoes-2` canvas shoes | a pair of mustard-yellow canvas slip-on shoes (#D9A441) with a white toe cap, on the feet only; leave the legs bare |
| 11 | `jacket-light` | an open, unzipped lightweight jacket like a windbreaker, with a collar and long sleeves reaching the wrists, in flat blue-grey (#6F8FA6), hanging open with a clear gap down the front so the bare torso shows between the two sides |
| 12 | `jacket-heavy` | a thick puffy quilted winter coat in flat navy (#2F3E5C), zipped up to the chin, with horizontal quilting lines, long sleeves and a hip-length hem |
| 13 | `hat-sun` | a wide-brimmed straw sun hat with a simple band, sitting on top of the head |
| 14 | `hat-rain` | a bright yellow (#E3B91F) rain hood pulled up over the head, with the hood opening framing the blank face |
| 15 | `hat-beanie` | a knitted burgundy (#7A2E3A) beanie with a folded cuff and a pom-pom, sitting on the head |

Why these choices: the light jacket is deliberately open so the shirt layer shows through the gap; garment colors avoid cream (the mannequin) and magenta (the background); pants are "khaki" because "tan" is too close to the cream mannequin to extract cleanly.

### 3. Icons (8 images, square)

Each prompt is: **"[STYLE] [SUBJECT] Match the illustration style, outline weight and palette of the attached image. A single icon, centered, square image, filling about 70% of the frame, thick uniform dark outline, only two or three flat colors, still clearly recognizable in greyscale. No text, letters or numbers. [BACKGROUND]"**

| # | Asset (file) | SUBJECT |
|---|---|---|
| 16 | `thermometer` | A vertical mercury thermometer with a round bulb at the bottom, tick marks along one side and red mercury. |
| 17 | `clear` | A sun made of a round disc with eight bold triangular rays, no face. |
| 18 | `overcast` | One large fluffy grey cloud with a clear scalloped outline. |
| 19 | `rain` | A grey cloud with four slanted blue raindrop lines falling from it. |
| 20 | `snow` | A grey cloud with three simple six-armed snowflakes below it. |
| 21 | `windy` | Three flowing horizontal wind lines that curl at the ends, no clouds. |
| 22 | `umbrella` | An open umbrella seen from the side, with a curved handle. |
| 23 | `hydration` | A single water droplet with one simple highlight. |

Attach the **finished** mannequin as the style reference for icons, and generate them after the character set so the style is settled. Every icon prompt should also say: *"The icon is the only object in the image: no frame, no border, no panel, no scene, no landscape, no extra objects."*

**Windy, second attempt (round 2's first windy came back as a framed landscape with trees, unusable):**

> [STYLE] Three flowing horizontal wind lines, stacked one above the other with space between them, each drawn as a thick ribbon with a dark outline and curling into a small spiral at its right end, in faded blue, cream and faded red. Match the illustration style, outline weight and palette of the attached image. These three lines are the only thing in the image: no frame, no border, no square or rectangle, no panel, no trees, no mountains, no landscape, no clouds, no background shapes. Centered, square image, the lines filling about 70% of the frame. No text, letters or numbers. [BACKGROUND]

## Building the assets (commands)

Save each raw Gemini image in `art/work/` as `<asset>.jpg` (or `.png`) using the asset names in the tables above: `mannequin_base`, `shirt-0` … `hat-beanie`, and the eight icon names. Then run:

```
python scripts/build_art.py            # everything present
python scripts/build_art.py windy      # only the named assets
```

`scripts/build_art.py` (uses `scripts/art_tools.py`, needs `pip install pillow`):
- crops every character image with the same box `512 0 896 768` (1:2, 384×768; the figure sits at x 568–840 and every item fits within x 559–850);
- samples each image's own background color from its corners (Gemini never returns exactly the hex requested: round 2 gave about #D84BB8 for the mannequin and different shades for each icon);
- makes the mannequin transparent, extracts each garment or hat as the difference from the bare mannequin, and cleans edges (outline-preserving growth, background-blend removal, no halo);
- makes each icon transparent, trims it to its subject, centers it on a square canvas with a small margin, and saves it at 128×128;
- writes everything to `assets/art/` with the color under transparent pixels cleared so the PNGs compress (the 23 files total about 1.2 MB).

`overlay` also prints where each item changed, as a drift check. Expected ranges (fraction of canvas height): shirt about 0.2–0.55, pants about 0.43–0.95, shoes about 0.87–1.0, jackets about 0.17–0.63, hats about 0.0–0.3. Outside its range means Gemini moved or resized the figure; regenerate that image. Do not raise `--bg-distance` much: a garment whose color is near the background gets eaten.

## Pilot results

**Round 1 (2026-10-16):** tool output on the first two generations was good: the figure's bounding box was identical in both raw images (x 572–834, y 46–722); the shirt covered y 0.22–0.56 of the canvas; the keyed mannequin was fully opaque; about 18 stray pink pixels in a 295,000-pixel layer. The style was wrong (photorealistic wooden mannequin and photographic shirt, not the flat illustrated WPA look in `research.md`), so the Developer chose to regenerate (round 2, prompts above).

**Round 2 (2026-10-17):** all 23 generated by the Developer in the flat illustrated style (the style problem is solved). Findings:
- **Drift:** none. The head was 0% changed in every non-hat edit, the feet 0% in nearly all, and every item lay inside one shared canvas (x 559–850, y 6–758 of the 1408×768 images), so all 14 layers use one crop box.
- **First extraction was too rough:** pants and sleeve outlines had notches and the jackets a pink fringe. Cause: the speck cleanup erased thin slivers where a garment's outline nearly coincides with the mannequin's own. Fix (now the defaults): smaller cleanup, outline-preserving growth, background-blend removal limited to the edge band, and a final background pass. Pink residue across all 14 layers fell to about 100 pixels in 4 million.
- **File size:** 5.5 MB at first, 1.2 MB after clearing noise under transparent pixels. A typical outfit loads about 480 KB.
- **Icons:** thermometer, clear (sun), overcast, rain, snow, umbrella and hydration are clean and still distinguishable in greyscale. **Windy needs regenerating** (see prompt above); `assets/art/icons/windy.png` is built from the unusable first attempt and must not ship.
- **For the app (C10):** the icons are full-color illustrations, so the 7-day strip's selected day (white-on-black, icons inverted) needs a light backing behind icons instead of `filter: invert`. The pants name `tan` becomes `khaki`, and the shirt, pants and shoe name lists in `js/assets.js` must match the generated colors.


## Credits (A4)

When the art is final, give the Agent the tool name, the generation date, and the license wording you recorded above. The Agent replaces the placeholder paragraph in the information screen (`#art-credit` in `index.html`) and updates the shirt, pants and shoe name lists in `js/assets.js` (red/blue/green; navy/khaki/grey; sneakers/loafers/canvas shoes).
