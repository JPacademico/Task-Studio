"""Builds the Terminal skin's cursor: Ubuntu's pointer and its hand.

Run it after changing anything below:

    python custom-cursor/terminal/build-cursors.py

It writes `built/cursor.css` beside this file; paste that over the block in
`src/app/styles/index.css` marked `Skin: TERMINAL - the pointer is Ubuntu's`.
(A file rather than stdout, because the em dashes in the generated comments do
not survive a Windows console pipe.)

Requires Pillow (`pip install pillow`). Nothing in the application depends on
this script at build or run time; it is a one-off tool that produces text.

## What is being drawn

The pointer Ubuntu ships with its Yaru theme, as closely as a drawing made from
its description can be: a slim arrow with a long straight left edge, a barb, a
tail that leaves the barb at an angle, softly rounded corners everywhere, a
solid body inside a light rim, and a small soft shadow under it. Over anything
clickable it is Yaru's hand: the index finger standing up, three fingers folded
under it, a thumb out to the left.

It is not the system's own image. That ships under the terms of the theme it
belongs to and would have to be carried and credited; a pointer this simple is
a shape, and the shape is drawn here from scratch.

## How it is drawn

Everything is built as a *mask* at eight times size, from polygons and
capsules, and every colour is derived from that one mask:

  - the rim is the mask dilated by a disc, which is what rounds every corner
    of the outline the way Yaru's are rounded, with no corner special-cased;
  - the shadow is the rim, blurred and dropped a pixel;
  - the body is the mask itself.

Then the whole thing is reduced with LANCZOS, which is the entire antialiasing
strategy - the same one the Dragon script uses, for the same reason.

## Two palettes

Ubuntu's own pointer is dark with a white rim, and that is what the light
palette uses: on a pale page the body is what you see and the rim is what
keeps it off a dark control. The dark palette inverts it, the way the older
DMZ-White theme Ubuntu shipped for years did: a white body with a dark rim,
because a black arrow on a black-violet page is a rim with nothing in it.
"""
import base64
import io
import math
import os

from PIL import Image, ImageChops, ImageDraw, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))

# The system cursor's own box. Everything here is drawn inside it.
BOX = 32
# Supersampling factor.
S = 8

# How thick the rim is, in screen pixels. Yaru's is a little over one.
RIM = 1.25

# ---------------------------------------------------------------------------
# The arrow, in screen pixels, point first.
#
# 17 pixels from the point to the foot of the tail and 12.6 across at the
# barb: the system arrow's own footprint, give or take the rim.
# ---------------------------------------------------------------------------

ARROW = [
    (2.0, 2.0),     # the point
    (2.0, 18.4),    # down the straight left edge
    (6.1, 14.5),    # into the notch
    (8.8, 20.6),    # down the left side of the tail
    (11.6, 19.4),   # across its foot
    (8.9, 13.4),    # up the right side of the tail
    (14.6, 13.4),   # out to the barb
]

ARROW_HOTSPOT = (2, 2)

# ---------------------------------------------------------------------------
# The hand, in screen pixels.
#
# Each finger is a capsule: a line with a round cap, which is what a fingertip
# is. The palm is a rounded block the fingers stand on. Seams between the
# fingers are drawn afterwards, in the rim colour, so the fused silhouette
# still reads as four fingers rather than a mitten.
# ---------------------------------------------------------------------------

# Drawn on a roomy grid and then scaled into place (see `hand()`), because the
# proportions are easier to judge at this size than at the one it ships at.
FINGER_WIDTH = 3.6

# (x of the centre line, top of the finger, bottom of the finger)
FINGERS = [
    (9.6, 3.4, 14.4),    # index, standing up
    (13.0, 9.2, 14.8),   # middle, folded
    (16.4, 10.0, 14.8),  # ring
    (19.6, 11.4, 14.8),  # little
]

# The thumb, from its tip to where it meets the palm.
THUMB = ((4.9, 13.4), (8.6, 17.6))
THUMB_WIDTH = 3.5

# The palm: left, top, right, bottom, corner radius.
PALM = (7.8, 12.8, 21.4, 23.4, 3.4)

# How much the whole hand is reduced from the grid above, and about where:
# the fingertip, so the hotspot stays on it. 0.8 brings it to about 17x21,
# which is the system hand's own footprint.
HAND_SCALE = 0.8
HAND_ORIGIN = (9.6, 1.6)

# The fingertip: the middle of the index finger's cap, after scaling.
HAND_HOTSPOT = (10, 2)

# ---------------------------------------------------------------------------
# Palettes: body, rim, shadow alpha.
# ---------------------------------------------------------------------------

PALETTES = {
    'light': {'body': (22, 22, 24, 255), 'rim': (255, 255, 255, 255), 'shadow': 0.38},
    'dark': {'body': (250, 250, 250, 255), 'rim': (18, 18, 20, 255), 'shadow': 0.55},
}


def up(point: tuple[float, float]) -> tuple[float, float]:
    """Screen pixels to supersampled pixels."""
    return (point[0] * S, point[1] * S)


def capsule(draw: ImageDraw.ImageDraw, a, b, width: float) -> None:
    """A line with round caps, in screen pixels."""
    (ax, ay), (bx, by) = up(a), up(b)
    radius = width * S / 2
    draw.line([(ax, ay), (bx, by)], fill=255, width=round(width * S))
    for cx, cy in ((ax, ay), (bx, by)):
        draw.ellipse([cx - radius, cy - radius, cx + radius, cy + radius], fill=255)


def arrow_mask() -> Image.Image:
    mask = Image.new('L', (BOX * S, BOX * S), 0)
    ImageDraw.Draw(mask).polygon([up(p) for p in ARROW], fill=255)
    return mask


def hand(point: tuple[float, float]) -> tuple[float, float]:
    """A point on the hand's drawing grid, scaled about the fingertip."""
    ox, oy = HAND_ORIGIN
    return (ox + (point[0] - ox) * HAND_SCALE + 0.4, oy + (point[1] - oy) * HAND_SCALE + 0.4)


def hand_mask() -> Image.Image:
    mask = Image.new('L', (BOX * S, BOX * S), 0)
    draw = ImageDraw.Draw(mask)
    for x, top, bottom in FINGERS:
        capsule(draw, hand((x, top)), hand((x, bottom)), FINGER_WIDTH * HAND_SCALE)
    capsule(draw, hand(THUMB[0]), hand(THUMB[1]), THUMB_WIDTH * HAND_SCALE)
    left, top, right, bottom, radius = PALM
    draw.rounded_rectangle(
        [*up(hand((left, top))), *up(hand((right, bottom)))],
        radius=radius * HAND_SCALE * S,
        fill=255,
    )
    return mask


def hand_seams() -> Image.Image:
    """The lines between the fingers, and between the thumb and the index."""
    seams = Image.new('L', (BOX * S, BOX * S), 0)
    draw = ImageDraw.Draw(seams)
    width = round(0.6 * S)
    for index, ((left_x, left_top, _), (right_x, right_top, _)) in enumerate(
        zip(FINGERS, FINGERS[1:])
    ):
        seam_x = (left_x + right_x) / 2
        start = max(left_top, right_top) + 1.2
        # Beside the standing finger the seam runs down to the knuckles, which
        # is what separates it from the fist. Between two folded fingers it is
        # only the notch between their tips: any longer and the fist reads as
        # a row of bars.
        end = 14.0 if index == 0 else start + 2.2
        draw.line([up(hand((seam_x, start))), up(hand((seam_x, end)))], fill=255, width=width)
    # The thumb's inner edge, where it folds against the index finger.
    draw.line([up(hand((8.2, 15.2))), up(hand((9.6, 17.4)))], fill=255, width=width)
    return seams


def dilate(mask: Image.Image, radius: float) -> Image.Image:
    """Grow a mask by a disc of `radius` screen pixels."""
    size = int(radius * S) * 2 + 1
    return mask.filter(ImageFilter.MaxFilter(size if size % 2 else size + 1))


def compose(mask: Image.Image, palette: dict, seams: Image.Image | None = None) -> Image.Image:
    rim_mask = dilate(mask, RIM)

    # The shadow: the rim's silhouette, dropped one pixel and softened.
    shadow_mask = ImageChops.offset(rim_mask, 0, S).filter(ImageFilter.GaussianBlur(1.1 * S))
    shadow_alpha = shadow_mask.point(lambda value: int(value * palette['shadow']))
    shadow = Image.new('RGBA', mask.size, (0, 0, 0, 0))
    shadow.putalpha(shadow_alpha)

    rim = Image.new('RGBA', mask.size, palette['rim'])
    rim.putalpha(rim_mask)

    body = Image.new('RGBA', mask.size, palette['body'])
    body_alpha = mask if seams is None else ImageChops.subtract(mask, seams)
    body.putalpha(body_alpha)

    out = Image.alpha_composite(shadow, rim)
    out = Image.alpha_composite(out, body)
    return out.resize((BOX, BOX), Image.LANCZOS)


FRAMES = {}
for name, palette in PALETTES.items():
    FRAMES[f'arrow-{name}'] = compose(arrow_mask(), palette)
    FRAMES[f'hand-{name}'] = compose(hand_mask(), palette, hand_seams())

built = f'{HERE}/built'
os.makedirs(built, exist_ok=True)

uris = {}
for name, image in FRAMES.items():
    image.save(f'{built}/{name}.png')
    buffer = io.BytesIO()
    image.save(buffer, format='PNG', optimize=True)
    uris[name] = base64.b64encode(buffer.getvalue()).decode()

point = f'{ARROW_HOTSPOT[0]} {ARROW_HOTSPOT[1]}'
hand_point = f'{HAND_HOTSPOT[0]} {HAND_HOTSPOT[1]}'

GATE = "html:not([data-cursor='off'])[data-skin='terminal']"
GATE_DARK = "html:not([data-cursor='off'])[data-skin='terminal'].dark"

# Every rule that targets something *inside* the page leaves the surfaces that
# keep the system pointer alone. See `[data-native-cursor]` in `index.css`.
NATIVE = ":not([data-native-cursor], [data-native-cursor] *)"


def inside(gate: str, selectors: list[str]) -> str:
    return ',\n'.join(f'{gate} {selector}{NATIVE}' for selector in selectors)


PRESSABLE = [
    'a[href]',
    'button:not(:disabled)',
    'summary',
    'select:not(:disabled)',
    'label[for]',
    "[role='button']:not([aria-disabled='true'])",
    "[role='tab']",
    "[role='menuitem']",
    "[role='option']",
    "[role='switch']",
    "input[type='checkbox']:not(:disabled)",
    "input[type='radio']:not(:disabled)",
    "input[type='submit']:not(:disabled)",
    "input[type='button']:not(:disabled)",
    '.cursor-pointer',
]

TEXT = [
    "input:not([type='checkbox']):not([type='radio']):not([type='submit']):not([type='button'])",
    'textarea',
    "[contenteditable='true']",
]

css = f'''
/* ===========================================================================
   Skin: TERMINAL - the pointer is Ubuntu's.
   ===========================================================================

   Generated by `custom-cursor/terminal/build-cursors.py`. Re-run it after any
   change and paste the result over this block; nothing here is hand-edited.

   ## Why this pointer

   The skin is a terminal, and the machine a terminal like this one runs on is
   a Linux desktop. Its pointer is the one Ubuntu ships: a slim arrow with
   rounded corners and a soft shadow, and a hand over anything that can be
   pressed. Drawn from the shape rather than copied from the theme's files,
   inside the system cursor's own {BOX}px box, at the system arrow's size.

   ## Two palettes

   The light palette wears Ubuntu's own: a dark body inside a white rim. The
   dark palette inverts it, the way the DMZ-White theme Ubuntu shipped for
   years did, because a black arrow on a black-violet page is a rim with
   nothing inside it. `.dark` sits on the same element as `data-skin`, so this
   is one extra selector rather than a media query.

   ## The opt-out

   Every selector is gated on `html:not([data-cursor='off'])`, like every
   other skin that draws a pointer, and anything inside a
   `[data-native-cursor]` surface keeps the system's.

   ## Hotspots

   `{point}` for the arrow - its point. `{hand_point}` for the hand - the middle
   of the index fingertip.

   Text fields, disabled controls and drag handles are left alone: an I-beam,
   `not-allowed` and `grab` each say something no arrow can say.
   --------------------------------------------------------------------------- */

{GATE} {{
  cursor: url("data:image/png;base64,{uris['arrow-light']}") {point}, auto;
}}

{GATE_DARK} {{
  cursor: url("data:image/png;base64,{uris['arrow-dark']}") {point}, auto;
}}

/* The hand over anything pressable. The fallback keyword is `pointer`, so a
   machine that refuses the image still gets a hand. */
{inside(GATE, PRESSABLE)} {{
  cursor: url("data:image/png;base64,{uris['hand-light']}") {hand_point}, pointer;
}}

{inside(GATE_DARK, PRESSABLE)} {{
  cursor: url("data:image/png;base64,{uris['hand-dark']}") {hand_point}, pointer;
}}

/* The three the arrow must not swallow. */
{inside(GATE, TEXT)} {{
  cursor: text;
}}

{inside(GATE, ['.cursor-grab'])} {{
  cursor: grab;
}}

{inside(GATE, ['.cursor-grabbing', '.cursor-grab:active'])} {{
  cursor: grabbing;
}}
'''

# Hyphens in the prose become em dashes, as in the Pixel script: " - " cannot
# occur inside a selector or inside base64, so this only touches comments.
css = css.replace(' - ', f' {chr(0x2014)} ')

io.open(f'{built}/cursor.css', 'w', encoding='utf-8', newline='').write(css)
print(f'wrote {built}/cursor.css - {len(css)} chars, hotspots {point} / {hand_point}')
for name, image in FRAMES.items():
    left, top, right, bottom = image.getbbox()
    print(f'{name}: content {right - left}x{bottom - top}')
