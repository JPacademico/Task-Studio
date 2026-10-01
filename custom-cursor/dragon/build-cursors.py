"""Builds the Dragon skin's guan dao cursor."""
import base64
import io
import math
import os

import numpy as np
from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))

# --- Sizes ---

# The delivered cursor, in CSS pixels. 42 rather than the knife's 40: a polearm is mostly shaft.
BOX = 32
# The composition's long side inside that box.
WEAPON = 30
# Where the whole composition sits, leaving room for the swing arc.
REST = 1

# Supersampling factor. Everything below is drawn at this scale and reduced at
# the end, which is the entire antialiasing strategy.
S = 4

# The working canvas, in supersampled pixels, large enough that rotating about the blade tip never
# clips the butt of the shaft.
WORK = 1400

REST_DEGREES = 135
HOVER_DEGREES = 106
SLASH_DEGREES = 160

# --- Palette ---

STEEL = (216, 221, 227, 255)
STEEL_EDGE = (246, 249, 252, 255)
STEEL_SPINE = (128, 138, 150, 255)
BRASS = (200, 160, 74, 255)
BRASS_DEEP = (140, 104, 40, 255)
WOOD = (107, 58, 34, 255)
WOOD_LIT = (143, 82, 50, 255)
TASSEL = (179, 36, 28, 255)
TASSEL_LIT = (226, 73, 58, 255)
OUTLINE = (24, 16, 12, 255)

# --- Geometry, drawn vertically with the blade at the top ---

# The blade's centreline is an arc, so that the edge curves the way a crescent blade does instead of
# being a triangle with a bent side.
ARC_CENTRE = (-10 * S, 70 * S)
ARC_RADIUS = 72 * S
ARC_FROM = 180.0   # degrees; the socket, level with the arc centre
ARC_TO = 118.0     # the tip

# Everything is drawn shifted by this, in supersampled pixels, so the layout sits clear of the
# canvas edges before anything is rotated.
OFFSET = (170 * S, 40 * S)


def along(t: float) -> float:
    """A position on the blade as a fraction from socket (0) to tip (1). The arc now runs
    *backwards* in degrees - 180 down to 118.
    """
    return ARC_FROM + (ARC_TO - ARC_FROM) * t


def on_arc(degrees: float) -> tuple[float, float]:
    """A point on the blade's centreline. Screen coordinates, so y grows down."""
    radians = math.radians(degrees)
    return (
        ARC_CENTRE[0] + ARC_RADIUS * math.cos(radians) + OFFSET[0],
        ARC_CENTRE[1] - ARC_RADIUS * math.sin(radians) + OFFSET[1],
    )


def arc_normal(degrees: float) -> tuple[float, float]:
    """The outward normal at that point, pointing away from the arc centre."""
    radians = math.radians(degrees)
    return (math.cos(radians), -math.sin(radians))


def belly(t: float) -> float:
    """How far the cutting edge bulges out, as a function of position (0..1). Zero at the socket
    and zero at the tip, peaking a little past the middle.
    """
    return 30 * S * math.sin(t ** 0.85 * math.pi) ** 1.25


def spine(t: float) -> float:
    """The blade's back. Nearly constant, closing to nothing at the tip."""
    return 5.5 * S * (1.0 - t ** 3.2)


BLADE_TIP = on_arc(ARC_TO)
SOCKET = on_arc(ARC_FROM)

# --- The pivot ---

# The brass ferrule, a few units below the socket: the collar that binds the blade to the shaft, and
# the point the whole weapon now turns about.
PIVOT = (SOCKET[0], SOCKET[1] + 5.5 * S)


def blade_polygon() -> list[tuple[float, float]]:
    """The blade outline: out along the cutting edge, back along the spine."""
    steps = 60
    cutting, back = [], []

    for i in range(steps + 1):
        t = i / steps
        degrees = ARC_FROM + (ARC_TO - ARC_FROM) * t
        px, py = on_arc(degrees)
        nx, ny = arc_normal(degrees)

        cutting.append((px + nx * belly(t), py + ny * belly(t)))
        back.append((px - nx * spine(t), py - ny * spine(t)))

    return cutting + back[::-1]


def draw_weapon(canvas: Image.Image) -> None:
    """The guan dao, vertical, blade at the top. Drawn at `S` times size."""
    pen = ImageDraw.Draw(canvas)

    socket = on_arc(ARC_FROM)
    shaft_x = socket[0]
    shaft_top = socket[1]
    shaft_bottom = shaft_top + 92 * S
    half = 4.5 * S

    # --- the shaft -------------------------------------------------------
    pen.rounded_rectangle(
        [shaft_x - half, shaft_top - 2 * S, shaft_x + half, shaft_bottom],
        radius=half,
        fill=WOOD,
        outline=OUTLINE,
        width=max(1, S // 2),
    )
    # A highlight down one side, which is what makes a rectangle a pole.
    pen.rounded_rectangle(
        [shaft_x - half + 1.2 * S, shaft_top + 2 * S, shaft_x - half + 2.6 * S, shaft_bottom - 3 * S],
        radius=S,
        fill=WOOD_LIT,
    )

    # --- the butt cap ----------------------------------------------------
    pen.rounded_rectangle(
        [shaft_x - half - 0.8 * S, shaft_bottom - 7 * S, shaft_x + half + 0.8 * S, shaft_bottom],
        radius=1.5 * S,
        fill=BRASS,
        outline=OUTLINE,
        width=max(1, S // 2),
    )

    # --- the tassel ---
    # Under the socket, falling along the shaft.
    for index, (dx, length, tone) in enumerate(
        ((-3.2, 20, TASSEL), (-1.0, 26, TASSEL_LIT), (1.4, 22, TASSEL), (3.4, 16, TASSEL_LIT))
    ):
        top = shaft_top + 7 * S
        pen.line(
            [
                (shaft_x + dx * S, top),
                (shaft_x + dx * S * 1.7, top + length * S * 0.55),
                (shaft_x + dx * S * 2.3, top + length * S),
            ],
            fill=tone,
            width=max(1, int(1.7 * S)),
            joint='curve',
        )
        del index

    # --- the ferrule binding blade to shaft ------------------------------
    pen.rounded_rectangle(
        [shaft_x - half - 1.4 * S, shaft_top + 2 * S, shaft_x + half + 1.4 * S, shaft_top + 9 * S],
        radius=1.5 * S,
        fill=BRASS,
        outline=OUTLINE,
        width=max(1, S // 2),
    )
    pen.line(
        [(shaft_x - half - 1.4 * S, shaft_top + 5.5 * S), (shaft_x + half + 1.4 * S, shaft_top + 5.5 * S)],
        fill=BRASS_DEEP,
        width=max(1, S // 2),
    )

    # --- the back flange ---
    # The small hooked spur on the spine near the socket.
    base = on_arc(along(0.1))
    nx, ny = arc_normal(along(0.1))
    pen.polygon(
        [
            (base[0] - nx * 4 * S, base[1] - ny * 4 * S),
            (base[0] - nx * 15 * S - 2 * S, base[1] - ny * 15 * S - 5 * S),
            (base[0] - nx * 11 * S + 1 * S, base[1] - ny * 11 * S - 10 * S),
            (base[0] - nx * 3 * S, base[1] - ny * 3 * S - 7 * S),
        ],
        fill=BRASS,
        outline=OUTLINE,
    )

    # --- the blade -------------------------------------------------------
    outline = blade_polygon()
    pen.polygon(outline, fill=STEEL, outline=OUTLINE)

    # The spine, shaded: a darker band along the back half of the blade, which
    # is what gives a flat fill the suggestion of a ground bevel.
    shade = []
    for i in range(61):
        t = i / 60
        degrees = ARC_FROM + (ARC_TO - ARC_FROM) * t
        px, py = on_arc(degrees)
        nx, ny = arc_normal(degrees)
        shade.append((px - nx * spine(t) * 0.92, py - ny * spine(t) * 0.92))
    for i in range(60, -1, -1):
        t = i / 60
        degrees = ARC_FROM + (ARC_TO - ARC_FROM) * t
        px, py = on_arc(degrees)
        nx, ny = arc_normal(degrees)
        shade.append((px + nx * belly(t) * 0.3, py + ny * belly(t) * 0.3))
    pen.polygon(shade, fill=STEEL_SPINE)

    # The cutting edge itself, bright: a hairline just inside the outer curve.
    edge = []
    for i in range(61):
        t = i / 60
        degrees = ARC_FROM + (ARC_TO - ARC_FROM) * t
        px, py = on_arc(degrees)
        nx, ny = arc_normal(degrees)
        edge.append((px + nx * belly(t) * 0.94, py + ny * belly(t) * 0.94))
    pen.line(edge, fill=STEEL_EDGE, width=max(1, int(1.8 * S)), joint='curve')

    # And the outline again over everything, so the internal shading cannot
    # bleed past the silhouette after the reduction.
    pen.line(outline + outline[:1], fill=OUTLINE, width=max(1, int(0.9 * S)), joint='curve')


def draw_swing(canvas: Image.Image) -> None:
    """The arc the blade has just come through. Slash frame only. Three concentric strokes
    falling off in opacity, swept by the *tip* about the ferrule the frames rotate about.
    """
    pivot = PIVOT

    radius = math.dist(BLADE_TIP, pivot)
    start = math.degrees(math.atan2(-(BLADE_TIP[1] - pivot[1]), BLADE_TIP[0] - pivot[0]))
    # Four fifths of the actual travel rather than all of it. A trail that reaches the whole way
    # back to the raised pose leaves a bright arc hanging in space with nothing at its far end.
    sweep = (SLASH_DEGREES - HOVER_DEGREES) * 0.8

    for offset, alpha, width in ((0.0, 165, 2.6), (7.0 * S, 105, 1.9), (14.0 * S, 55, 1.3)):
        points = []
        for step in range(19):
            degrees = start - sweep * (step / 18)
            radians = math.radians(degrees)
            reach = radius - offset
            points.append(
                (pivot[0] + reach * math.cos(radians), pivot[1] - reach * math.sin(radians))
            )

        # Each stroke on its own scratch layer, composited. `ImageDraw.Draw(image, 'RGBA')` looks
        # like the obvious way to draw a translucent line and is wrong on a transparent canvas.
        scratch = Image.new('RGBA', canvas.size, (0, 0, 0, 0))
        ImageDraw.Draw(scratch).line(
            points,
            fill=STEEL_EDGE,
            width=max(1, int(width * S)),
            joint='curve',
        )
        scratch.putalpha(scratch.getchannel('A').point(lambda value: value * alpha // 255))
        canvas.alpha_composite(scratch)


def pose(degrees: float, with_swing: bool) -> Image.Image:
    """One frame, at `degrees`, rotated about the ferrule. The ferrule is the fixed point in
    every frame, so the blade sweeps a real arc and the shaft counter-swings behind it.
    """
    canvas = Image.new('RGBA', (WORK, WORK), (0, 0, 0, 0))
    if with_swing:
        draw_swing(canvas)
    draw_weapon(canvas)

    # The weapon is drawn pointing up, i.e. at 90 degrees in the convention the target angles use,
    # so the turn is the difference.
    return canvas.rotate(
        degrees - 90,
        center=PIVOT,
        resample=Image.BICUBIC,
        expand=False,
    )


# --- Assembly ---

POSES = {
    'rest': pose(REST_DEGREES, with_swing=False),
    'hover': pose(HOVER_DEGREES, with_swing=False),
    'slash': pose(SLASH_DEGREES, with_swing=True),
}


def union(*images: Image.Image) -> tuple[int, int, int, int]:
    """One crop box covering every frame. Cropping each frame to its own content would register
    them against themselves.
    """
    boxes = [image.getbbox() for image in images if image.getbbox()]
    return (
        min(box[0] for box in boxes),
        min(box[1] for box in boxes),
        max(box[2] for box in boxes),
        max(box[3] for box in boxes),
    )


CROP = union(*POSES.values())


def assert_uncropped() -> None:
    """Refuse to build a frame that the working canvas has cut into. A pose that runs off the
    canvas is silently *repaired* by every step after it.
    """
    for name, image in POSES.items():
        box = image.getbbox()
        if box is None:
            raise SystemExit(f'{name}: drew nothing at all')

        left, top, right, bottom = box
        touching = []
        if left <= 0:
            touching.append('left')
        if top <= 0:
            touching.append('top')
        if right >= image.width:
            touching.append('right')
        if bottom >= image.height:
            touching.append('bottom')

        if touching:
            raise SystemExit(
                f'{name}: content reaches the {", ".join(touching)} edge of the '
                f'{image.width}x{image.height} canvas (bbox {box}) - it has been '
                f'clipped. Increase OFFSET and/or WORK.'
            )


assert_uncropped()

SCALE = (WEAPON * S) / max(CROP[2] - CROP[0], CROP[3] - CROP[1])


def premultiplied(image: Image.Image) -> Image.Image:
    """RGB scaled by alpha, so a reduction cannot darken a translucent stroke. `Image.resize`
    filters each channel on its own.
    """
    pixels = np.asarray(image, dtype=np.float32)
    alpha = pixels[:, :, 3:4] / 255.0
    pixels[:, :, :3] *= alpha
    return Image.fromarray(pixels.round().astype(np.uint8), 'RGBA')


def straight(image: Image.Image) -> Image.Image:
    """The inverse of `premultiplied`, applied after the reduction."""
    pixels = np.asarray(image, dtype=np.float32)
    alpha = pixels[:, :, 3:4] / 255.0
    # Where nothing was drawn there is no colour to recover, and dividing would
    # be 0/0. Those pixels stay black and stay invisible.
    safe = np.where(alpha > 0, alpha, 1.0)
    pixels[:, :, :3] = np.clip(pixels[:, :, :3] / safe, 0, 255)
    return Image.fromarray(pixels.round().astype(np.uint8), 'RGBA')


def place(image: Image.Image) -> Image.Image:
    """Crop, reduce to delivered size, and drop into the cursor box."""
    cropped = premultiplied(image.crop(CROP))
    reduced = straight(
        cropped.resize(
            (
                max(1, round(cropped.width * SCALE / S)),
                max(1, round(cropped.height * SCALE / S)),
            ),
            Image.LANCZOS,
        )
    )

    box = Image.new('RGBA', (BOX, BOX), (0, 0, 0, 0))
    box.alpha_composite(reduced, (REST, REST))
    return box


def haloed(image: Image.Image) -> Image.Image:
    """The same frame with a dark rim behind it, for the light page. Light-mode Dragon is raw
    silk - `--surface: 231 219 194` - and the blade is near-white steel.
    """
    silhouette = Image.new('RGBA', image.size, (0, 0, 0, 0))
    silhouette.putalpha(image.getchannel('A').point(lambda value: int(value * 0.55)))

    out = Image.new('RGBA', image.size, (0, 0, 0, 0))
    for dx, dy in ((-1, 0), (1, 0), (0, -1), (0, 1)):
        out.alpha_composite(silhouette, (max(0, dx), max(0, dy)))
    out.alpha_composite(image)
    return out


DARK = {name: place(image) for name, image in POSES.items()}
FRAMES = {f'dark-{name}': image for name, image in DARK.items()}
FRAMES.update({f'light-{name}': haloed(image) for name, image in DARK.items()})


def tip(image: Image.Image) -> tuple[int, int]:
    """The point of the blade: the opaque pixel nearest the top-left corner."""
    pixels = image.load()
    best, coords = 10**9, (0, 0)
    for y in range(image.height):
        for x in range(image.width):
            if pixels[x, y][3] > 80 and x + y < best:
                best, coords = x + y, (x, y)
    return coords


# One hotspot for all six, taken from the resting frame in the dark palette. Dark rather than light
# because the halo adds a pixel on every side.
HOTSPOT = tip(FRAMES['dark-rest'])

built = f'{HERE}/built'
os.makedirs(built, exist_ok=True)

uris = {}
for name, image in FRAMES.items():
    image.save(f'{built}/{name}.png')
    buffer = io.BytesIO()
    image.save(buffer, format='PNG', optimize=True)
    uris[name] = base64.b64encode(buffer.getvalue()).decode()

# Everything a pointer can be pressed on. One list, used by both the raised
# state and the slash state, so the two can never cover different surfaces.
CLICKABLE = """a[href],
button:not(:disabled),
summary,
select:not(:disabled),
label[for],
[role='button']:not([aria-disabled='true']),
[role='tab'],
[role='menuitem'],
[role='option'],
[role='switch'],
input[type='checkbox']:not(:disabled),
input[type='radio']:not(:disabled),
input[type='submit']:not(:disabled),
input[type='button']:not(:disabled),
.cursor-pointer"""

point = f'{HOTSPOT[0]} {HOTSPOT[1]}'

GATE = "html:not([data-cursor='off'])[data-skin='dragon']"
GATE_DARK = "html:not([data-cursor='off'])[data-skin='dragon'].dark"


def rules(prefix: str, uri: str, fallback: str, suffix: str = '') -> str:
    selectors = ',\n'.join(f'{prefix} {one}{suffix}' for one in CLICKABLE.split(',\n'))
    return f'{selectors} {{\n  cursor: url("data:image/png;base64,{uri}") {point}, {fallback};\n}}'


css = f'''
/* ===========================================================================
   Skin: DRAGON - the pointer is a guan dao.
   ===========================================================================

   Generated by `custom-cursor/dragon/build-cursors.py`. Re-run it after any
   change and paste the result over this block; nothing here is hand-edited.

   Three states:

     - **at rest**, carried on the {REST_DEGREES}-degree diagonal the system arrow sits on;
     - **over anything pressable**, brought up to {HOVER_DEGREES} degrees - the blade swung
       up and forward off the carrying diagonal, which is the whole of the
       hover signal;
     - **while the button is held**, whipped anticlockwise to {SLASH_DEGREES} degrees - down
       and away to the left - with the arc of the swing drawn behind it. One
       frame each way, no loop, because a cursor cannot tween; the arc is what
       makes a single frame read as motion.

   ## Why the blade is what moves

   Every frame is rotated about the *ferrule* - the brass collar binding the
   blade to the shaft - rather than about the point of the blade. Rotating
   about the point is what an earlier version did, and it is why the weapon
   appeared to be a stick waving behind a blade that never went anywhere: a
   rotation leaves its centre fixed, so the centre is the one part of the
   drawing that cannot be seen to move. With the centre at the ferrule there is
   blade on one side of it and shaft on the other, both travel, and the eye
   follows the blade because it is the bright end.

   The hotspot is the resting frame's point, held fixed across all six. A click
   therefore lands exactly where it always did; what changed is that the weapon
   now swings around that position instead of dragging it along.

   ## Which side the edge is on

   The left. A guan dao carried on the up-left diagonal has its cutting edge
   facing forward along the direction of the swing, and the swing goes left.

   ## Why two palettes

   The page underneath decides. Dark mode gets the frames as drawn - bright
   steel on black lacquer. Light mode gets the same frames with a dark rim of
   their own silhouette behind them, because on raw silk a near-white blade and
   a sub-pixel outline dissolve into the page. `.dark` sits on the same element
   as `data-skin`, so this is one extra selector rather than a media query that
   would be wrong for anybody overriding the theme.

   ## Specificity, which is doing real work

   Six rules that have to beat each other in a fixed order: dark over light,
   and within a palette, slash over raised over rest. That falls out of the
   selectors as written - the `.dark` variants carry one more class than their
   light counterparts, and within a palette `:active` beats `a[href]` beats the
   bare skin selector. No `!important` anywhere; one would break the next state
   added.

   ## The opt-out

   Every selector is gated on `html:not([data-cursor='off'])`. The switch in the
   theme picker writes `data-cursor="off"` onto the root element, which drops
   this whole block and hands back the system pointer - no second stylesheet,
   and no JavaScript that has to know which skins draw a cursor.

   ## Hotspot

   `{point}` - the point of the blade in the resting frame, measured from the
   pixels rather than guessed.

   Text fields, disabled controls and drag handles are left alone: an I-beam,
   `not-allowed` and `grab` each say something no blade can say.
   --------------------------------------------------------------------------- */

{GATE} {{
  cursor: url("data:image/png;base64,{uris['light-rest']}") {point}, auto;
}}

{GATE_DARK} {{
  cursor: url("data:image/png;base64,{uris['dark-rest']}") {point}, auto;
}}

{rules(GATE, uris['light-hover'], 'pointer')}

{rules(GATE_DARK, uris['dark-hover'], 'pointer')}

/* The slash. `:active` rather than a class, so it covers everything a pointer
   can be held down on - including the page itself, where half the clicks in any
   application land. */
{GATE} :active {{
  cursor: url("data:image/png;base64,{uris['light-slash']}") {point}, auto;
}}

{GATE_DARK} :active {{
  cursor: url("data:image/png;base64,{uris['dark-slash']}") {point}, auto;
}}

/* And the same thing again on the pressable list, which is not redundant.
   `{GATE} a[href]` carries one more element than `{GATE} :active`, so on the
   one surface where a slash matters most - a link somebody is clicking - the
   raised rule would otherwise outrank it and the blade would never swing.
   Repeating the list with `:active` on each selector puts it back on top. */
{rules(GATE, uris['light-slash'], 'pointer', ':active')}

{rules(GATE_DARK, uris['dark-slash'], 'pointer', ':active')}

/* The three the blade must not swallow. */
{GATE} input:not([type='checkbox']):not([type='radio']):not([type='submit']):not([type='button']),
{GATE} textarea,
{GATE} [contenteditable='true'] {{
  cursor: text;
}}

{GATE} .cursor-grab {{
  cursor: grab;
}}

{GATE} .cursor-grabbing,
{GATE} .cursor-grab:active {{
  cursor: grabbing;
}}
'''

# The prose above is written with ASCII hyphens so that this file stays pure ASCII, and the
# stylesheet it lands in uses em dashes throughout.
css = css.replace(' - ', f' {chr(0x2014)} ')

io.open(f'{built}/cursor.css', 'w', encoding='utf-8', newline='').write(css)
print(f'wrote {built}/cursor.css - {len(css)} chars, hotspot {point}')
print(f'crop {CROP}, scale {SCALE:.4f}')
