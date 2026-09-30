"""Builds the Runic skin's cursor: the pager's rune arrow, turned to point.

Run it after changing anything below:

    python custom-cursor/runic/build-cursors.py

It writes `built/cursor.css` beside this file; paste that over the block in
`src/app/styles/index.css` marked `Skin: RUNIC - the pointer is the pager's
rune arrow`. (A file rather than stdout, because the em dashes in the
generated comments do not survive a Windows console pipe.)

Requires Pillow (`pip install pillow`). Nothing in the application depends on
this script at build or run time; it is a one-off tool that produces text.

## What is being drawn

`RuneArrow` in `src/shared/ui/runic-icons.tsx` - the mark on the theme menu's
"previous" and "next" buttons - stroke for stroke: the stave, the barb, and
the two nicks that make it a rune rather than an arrow, with the lit line down
the barb and the stave that the skin calls the glow. The geometry below is that
component's `viewBox="0 0 24 24"` paths, copied, so the two stay one drawing.

Only the angle is new. The pager's arrow points left; a pointer has to point
where the system's does, up and to the left, so the resting frame is the same
mark turned 45 degrees. Over anything that can be pressed it turns further,
to 62 degrees, and stands a little more upright - the whole cursor lifting
its point at the thing it can act on. The click's glow is not a frame here: a
cursor image cannot animate, so it is a short flash drawn by `RuneClickGlow`.

## How it is drawn

Each stroke is drawn as a capsule at eight times size - square caps, as the
component's `strokeLinecap="square"` has them - into a mask, then:

  - the halo is the mask dilated by a disc, in the page's own paper colour,
    so the mark stays legible over a dark control as well as a light page;
  - the body is the mask in ink;
  - the glow line is drawn over the barb and the stave in the rubric colour.

Then reduced with LANCZOS, like the Dragon and Terminal pointers.
"""
import base64
import io
import math
import os

from PIL import Image, ImageDraw, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))

BOX = 32
S = 8

# Screen pixels per unit of the component's 24-unit viewBox. The arrow is 16
# units long, so this makes it about 19px along its own axis - the system
# arrow's height - and on the diagonal it fills about 20x20 of the box.
SCALE = 1.15

# The component's paths, in its own units.
STAVE = [((20.4, 12.0), (5.2, 12.0))]
# One path in the component, so its two arms meet in a mitre - the sharp point
# the eye reads as the tip. Drawn as one polyline here for the same reason.
BARB = ((11.0, 5.6), (4.4, 12.0), (11.0, 18.4))
NICKS = [((16.6, 8.8), (13.4, 12.0)), ((16.6, 15.2), (13.4, 12.0))]

BODY_WIDTH = 2.1
NICK_WIDTH = 1.6
GLOW_WIDTH = 1.0
HALO = 1.2

# Where the point sits in the box, and the two angles, in degrees clockwise
# from the pager's own "left". Far enough in that the halo round the mitre is
# not cut off by the edge of the image.
POINT = (3.2, 3.2)
REST_DEGREES = 45
HOVER_DEGREES = 62

PALETTES = {
    # Oak-gall ink on the sheet, the rubric in the cut, a paper halo.
    'light': {
        'body': (62, 24, 12, 255),
        'glow': (176, 52, 22, 255),
        'halo': (246, 233, 204, 255),
    },
    # Bone on the night stone, the ember in the cut, a soot halo.
    'dark': {
        'body': (240, 226, 199, 255),
        'glow': (246, 160, 92, 255),
        'halo': (10, 6, 3, 255),
    },
}


def mitre_point() -> tuple[float, float]:
    """Where the outer edges of the barb's two arms meet, in viewBox units.

    The tip of the drawn mark is not the vertex of its centre line but this,
    half a stroke width beyond it along the bisector. Both frames turn about
    it, so the hotspot sits on the visible point and never moves.
    """
    (ax, ay), (tx, ty), (bx, by) = BARB
    half_angle = (math.atan2(by - ty, bx - tx) - math.atan2(ay - ty, ax - tx)) / 2
    reach = (BODY_WIDTH / 2) / math.sin(half_angle)
    # The bisector of this barb points straight along +x; the mitre is behind it.
    return (tx - reach, ty)


PIVOT = mitre_point()


def place(point: tuple[float, float], degrees: float) -> tuple[float, float]:
    """A viewBox point, turned about the mitre and set in the box, supersampled."""
    angle = math.radians(degrees)
    x, y = point[0] - PIVOT[0], point[1] - PIVOT[1]
    rx = x * math.cos(angle) - y * math.sin(angle)
    ry = x * math.sin(angle) + y * math.cos(angle)
    return ((POINT[0] + rx * SCALE) * S, (POINT[1] + ry * SCALE) * S)


def stroke(draw: ImageDraw.ImageDraw, segment, width: float, degrees: float) -> None:
    """One segment with square caps, as the component draws it."""
    (ax, ay), (bx, by) = place(segment[0], degrees), place(segment[1], degrees)
    length = math.hypot(bx - ax, by - ay) or 1
    # Extend both ends by half the width: that is what a square cap is.
    half = width * SCALE * S / 2
    ux, uy = (bx - ax) / length, (by - ay) / length
    ax, ay, bx, by = ax - ux * half, ay - uy * half, bx + ux * half, by + uy * half
    nx, ny = -uy * half, ux * half
    draw.polygon(
        [(ax + nx, ay + ny), (bx + nx, by + ny), (bx - nx, by - ny), (ax - nx, ay - ny)],
        fill=255,
    )


def polyline(draw: ImageDraw.ImageDraw, points, width: float, degrees: float) -> None:
    """Three points, square caps at the ends and a mitre where they meet."""
    p0, p1, p2 = (place(point, degrees) for point in points)
    half = width * SCALE * S / 2

    def unit(a, b):
        length = math.hypot(b[0] - a[0], b[1] - a[1]) or 1
        return ((b[0] - a[0]) / length, (b[1] - a[1]) / length)

    u1, u2 = unit(p0, p1), unit(p1, p2)
    n1, n2 = (-u1[1], u1[0]), (-u2[1], u2[0])
    start = (p0[0] - u1[0] * half, p0[1] - u1[1] * half)
    end = (p2[0] + u2[0] * half, p2[1] + u2[1] * half)

    def join(side: float):
        # Where the two offset edges on this side cross.
        a = (p1[0] + side * n1[0] * half, p1[1] + side * n1[1] * half)
        b = (p1[0] + side * n2[0] * half, p1[1] + side * n2[1] * half)
        cross = u1[0] * u2[1] - u1[1] * u2[0]
        if abs(cross) < 1e-9:
            return a
        t = ((b[0] - a[0]) * u2[1] - (b[1] - a[1]) * u2[0]) / cross
        return (a[0] + u1[0] * t, a[1] + u1[1] * t)

    draw.polygon(
        [
            (start[0] + n1[0] * half, start[1] + n1[1] * half),
            join(1),
            (end[0] + n2[0] * half, end[1] + n2[1] * half),
            (end[0] - n2[0] * half, end[1] - n2[1] * half),
            join(-1),
            (start[0] - n1[0] * half, start[1] - n1[1] * half),
        ],
        fill=255,
    )


def mask_of(segments, width: float, degrees: float, barb: bool = False) -> Image.Image:
    mask = Image.new('L', (BOX * S, BOX * S), 0)
    draw = ImageDraw.Draw(mask)
    for segment in segments:
        stroke(draw, segment, width, degrees)
    if barb:
        polyline(draw, BARB, width, degrees)
    return mask


def frame(degrees: float, palette: dict) -> Image.Image:
    body = mask_of(STAVE, BODY_WIDTH, degrees, barb=True)
    body.paste(255, mask=mask_of(NICKS, NICK_WIDTH, degrees))
    glow = mask_of(STAVE, GLOW_WIDTH, degrees, barb=True)

    size = int(HALO * S) * 2 + 1
    halo = body.filter(ImageFilter.MaxFilter(size))

    out = Image.new('RGBA', body.size, (0, 0, 0, 0))
    for colour, alpha in ((palette['halo'], halo), (palette['body'], body), (palette['glow'], glow)):
        layer = Image.new('RGBA', body.size, colour)
        layer.putalpha(alpha)
        out = Image.alpha_composite(out, layer)
    return out.resize((BOX, BOX), Image.LANCZOS)


FRAMES = {}
for name, palette in PALETTES.items():
    FRAMES[f'rest-{name}'] = frame(REST_DEGREES, palette)
    FRAMES[f'hover-{name}'] = frame(HOVER_DEGREES, palette)

# The mitre, which does not move between the frames: both turn about it.
HOTSPOT = (round(POINT[0]), round(POINT[1]))

built = f'{HERE}/built'
os.makedirs(built, exist_ok=True)

uris = {}
for name, image in FRAMES.items():
    image.save(f'{built}/{name}.png')
    buffer = io.BytesIO()
    image.save(buffer, format='PNG', optimize=True)
    uris[name] = base64.b64encode(buffer.getvalue()).decode()

point = f'{HOTSPOT[0]} {HOTSPOT[1]}'

GATE = "html:not([data-cursor='off'])[data-skin='runic']"
GATE_DARK = "html:not([data-cursor='off'])[data-skin='runic'].dark"
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
   Skin: RUNIC - the pointer is the pager's rune arrow.
   ===========================================================================

   Generated by `custom-cursor/runic/build-cursors.py`. Re-run it after any
   change and paste the result over this block; nothing here is hand-edited.

   ## Why this mark

   It is `RuneArrow` - the arrow cut into the theme menu's "previous" and
   "next" buttons - stroke for stroke, so the one direction sign this world
   already has is the one it points with. Turned {REST_DEGREES} degrees onto the diagonal
   the system arrow sits on, and drawn inside the system cursor's own {BOX}px box.

   ## Two frames

   At rest it lies on the diagonal. Over anything that can be pressed it
   turns to {HOVER_DEGREES} degrees, lifting its point at the thing it can act on. Both
   turn about the mitre at the point, so the hotspot never moves between
   them. The click
   is a brief glow drawn at the pointer by `RuneClickGlow`, because a cursor
   image cannot animate.

   ## Two palettes

   Oak-gall ink with the rubric in the cut and a paper halo on the light
   sheet; bone with the ember in the cut and a soot halo on the night stone.
   The halo is what keeps the mark legible over a control of the other tone.

   ## The opt-out

   Every selector is gated on `html:not([data-cursor='off'])`, and anything
   inside a `[data-native-cursor]` surface keeps the system's pointer.

   Text fields, disabled controls and drag handles are left alone: an I-beam,
   `not-allowed` and `grab` each say something no arrow can say.
   --------------------------------------------------------------------------- */

{GATE} {{
  cursor: url("data:image/png;base64,{uris['rest-light']}") {point}, auto;
}}

{GATE_DARK} {{
  cursor: url("data:image/png;base64,{uris['rest-dark']}") {point}, auto;
}}

/* Over anything pressable, the point lifts. The fallback keyword is `pointer`,
   so a machine that refuses the image still gets a hand. */
{inside(GATE, PRESSABLE)} {{
  cursor: url("data:image/png;base64,{uris['hover-light']}") {point}, pointer;
}}

{inside(GATE_DARK, PRESSABLE)} {{
  cursor: url("data:image/png;base64,{uris['hover-dark']}") {point}, pointer;
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

css = css.replace(' - ', f' {chr(0x2014)} ')

io.open(f'{built}/cursor.css', 'w', encoding='utf-8', newline='').write(css)
print(f'wrote {built}/cursor.css - {len(css)} chars, hotspot {point}')
for name, image in FRAMES.items():
    left, top, right, bottom = image.getbbox()
    print(f'{name}: content {right - left}x{bottom - top} at ({left},{top})')
