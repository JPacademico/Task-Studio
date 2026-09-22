"""Builds the Dragon skin's guan dao cursor.

Run it after changing anything below:

    python custom-cursor/dragon/build-cursors.py

It writes `built/cursor.css` beside this file; paste that over the block in
`src/app/styles/index.css` marked `Skin: DRAGON - the pointer is a guan dao`.
(A file rather than stdout, because the em dashes in the generated comments do
not survive a Windows console pipe.)

Requires Pillow (`pip install pillow`). Nothing in the application depends on
this script at build or run time; it is a one-off tool that produces text.

## How this differs from its two siblings

`halloween/` and `paper/` start from artwork a designer drew and do nothing but
rotate, crop, scale and place it. There is no drawing for this one, so the
weapon is constructed here - which changes what the file is for but not what it
has to guarantee, and the guarantees are the interesting part:

  - **One canvas, one crop, one scale, one placement** for every frame. Frames
    registered against their own bounding boxes drift by a pixel or two between
    states, and the pointer visibly twitches the moment it crosses onto a link.
  - **Rotation about the blade tip**, so the tip is in the same place in every
    frame and the *shaft* is what swings. That is how a polearm is actually
    held on a target, and it is what lets the hotspot sit on the tip in all
    three states rather than being correct in one of them.
  - **Supersampled 4x and reduced with LANCZOS**, because a 38px weapon drawn
    directly has no antialiasing on a curve and a guan dao is nothing but
    curves.

## The three states

  - **at rest**, on the 135-degree diagonal the system arrow sits on;
  - **over anything pressable**, brought up to 112 degrees - the "more straight
    angle" of a weapon raised to strike rather than carried;
  - **while the button is held**, whipped down to 96 degrees with the arc of
    the swing drawn behind it. A cursor cannot tween, so the arc is what makes
    one frame read as motion: the blade is somewhere new *and* there is a
    bright trail showing where it came from.
"""
import base64
import io
import math
import os

import numpy as np
from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))

# ---------------------------------------------------------------------------
# Sizes
# ---------------------------------------------------------------------------

# The delivered cursor, in CSS pixels. 42 rather than the knife's 40: a polearm
# is mostly shaft, so the *blade* - the part that has to be recognisable - is a
# smaller fraction of the footprint than a knife's is. Every current browser
# accepts a cursor image up to 128px; past that the declaration is dropped and
# the fallback keyword takes over.
BOX = 42
# The weapon's long side inside that box.
WEAPON = 38
# Where the whole composition sits, leaving room for the swing arc.
REST = 2

# Supersampling factor. Everything below is drawn at this scale and reduced at
# the end, which is the entire antialiasing strategy.
S = 4

# The working canvas, in supersampled pixels, large enough that rotating about
# the blade tip never clips the butt of the shaft.
#
# Sized from the geometry rather than guessed: the shaft ends about 640
# supersampled pixels from the tip, and a rotation can swing it to either side,
# so the canvas has to hold the tip plus that radius in every direction.
WORK = 1200

REST_DEGREES = 135
HOVER_DEGREES = 112
SLASH_DEGREES = 96

# ---------------------------------------------------------------------------
# Palette
#
# Read as a weapon rather than as a theme: steel is steel under any lighting,
# and recolouring it to the skin's gold would produce a golden prop. What the
# skin contributes is the tassel and the brass fittings, which are the parts
# that are genuinely imperial.
# ---------------------------------------------------------------------------

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

# ---------------------------------------------------------------------------
# Geometry, drawn vertically with the blade at the top
# ---------------------------------------------------------------------------

# The blade's centreline is an arc, so that the edge curves the way a crescent
# blade does instead of being a triangle with a bent side. Centre to the LEFT
# of the weapon means the arc sweeps up and to the left, which is the direction
# the blade has to lean for the whole thing to sit on the pointer's diagonal.
ARC_CENTRE = (10 * S, 70 * S)
ARC_RADIUS = 72 * S
ARC_FROM = 0.0    # degrees; the socket, level with the arc centre
ARC_TO = 62.0     # the tip

# Everything is drawn shifted by this, in supersampled pixels, so the vertical
# layout sits clear of the canvas edges before anything is rotated.
OFFSET = (60 * S, 40 * S)


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
    """How far the cutting edge bulges out, as a function of position (0..1).

    Zero at the socket and zero at the tip, peaking a little past the middle -
    which is where a guan dao is widest and is what makes the silhouette read
    as a blade rather than as a thickened line.
    """
    return 30 * S * math.sin(t ** 0.85 * math.pi) ** 1.25


def spine(t: float) -> float:
    """The blade's back. Nearly constant, closing to nothing at the tip."""
    return 5.5 * S * (1.0 - t ** 3.2)


BLADE_TIP = on_arc(ARC_TO)


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

    # --- the tassel ------------------------------------------------------
    #
    # Under the socket, falling along the shaft. Drawn before the ferrule so
    # the ferrule caps it, which is how it is actually bound on.
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

    # --- the back flange -------------------------------------------------
    #
    # The small hooked spur on the spine near the socket. It is the one detail
    # that separates a guan dao from a generic crescent blade on a stick, and
    # it survives being scaled to 38px because it breaks the silhouette.
    base = on_arc(ARC_FROM + 6)
    nx, ny = arc_normal(ARC_FROM + 6)
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
    """The arc the blade has just come through. Slash frame only.

    Three concentric strokes falling off in opacity, swept between the resting
    angle and the slash angle about the same tip the frames rotate about. Drawn
    *before* the weapon so the blade sits on top of its own trail.
    """
    socket = on_arc(ARC_FROM)
    pivot = BLADE_TIP

    # The arc is swept by the *socket*, because that is the end that travels.
    radius = math.dist(socket, pivot)
    start = math.degrees(math.atan2(-(socket[1] - pivot[1]), socket[0] - pivot[0]))
    sweep = REST_DEGREES - SLASH_DEGREES

    for offset, alpha, width in ((0.0, 150, 2.4), (6.0 * S, 90, 1.7), (12.0 * S, 45, 1.2)):
        points = []
        for step in range(19):
            degrees = start - sweep * (step / 18)
            radians = math.radians(degrees)
            reach = radius - offset
            points.append(
                (pivot[0] + reach * math.cos(radians), pivot[1] - reach * math.sin(radians))
            )

        # Each stroke on its own scratch layer, composited.
        #
        # `ImageDraw.Draw(image, 'RGBA')` looks like the obvious way to draw a
        # translucent line and is wrong on a transparent canvas: its blend is
        # `src*a + dst*(1-a)` against a destination of (0,0,0,0), so a white
        # line at 60% alpha comes out mid-grey at *full* opacity. That is what
        # turned the swing arc into a dark smear in the first build. Drawing at
        # full strength and scaling the alpha channel afterwards keeps the
        # colour and makes the transparency real.
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
    """One frame, at `degrees`, rotated about the blade tip.

    The tip is the fixed point in every frame, which is what lets one hotspot
    be correct in all of them: the blade stays on what the reader is aiming at
    and the shaft swings behind it.
    """
    canvas = Image.new('RGBA', (WORK, WORK), (0, 0, 0, 0))
    if with_swing:
        draw_swing(canvas)
    draw_weapon(canvas)

    # The weapon is drawn pointing up, i.e. at 90 degrees in the convention the
    # target angles use, so the turn is the difference. `rotate` is
    # counter-clockwise and takes its centre in image coordinates.
    return canvas.rotate(
        degrees - 90,
        center=BLADE_TIP,
        resample=Image.BICUBIC,
        expand=False,
    )


# ---------------------------------------------------------------------------
# Assembly
# ---------------------------------------------------------------------------

POSES = {
    'rest': pose(REST_DEGREES, with_swing=False),
    'hover': pose(HOVER_DEGREES, with_swing=False),
    'slash': pose(SLASH_DEGREES, with_swing=True),
}


def union(*images: Image.Image) -> tuple[int, int, int, int]:
    """One crop box covering every frame.

    Cropping each frame to its own content would register them against
    themselves, and the pointer would jump by a pixel or two every time it
    crossed onto a link. One box taken from all three keeps the tip still and
    lets only the shaft move.
    """
    boxes = [image.getbbox() for image in images if image.getbbox()]
    return (
        min(box[0] for box in boxes),
        min(box[1] for box in boxes),
        max(box[2] for box in boxes),
        max(box[3] for box in boxes),
    )


CROP = union(*POSES.values())
SCALE = (WEAPON * S) / max(CROP[2] - CROP[0], CROP[3] - CROP[1])


def premultiplied(image: Image.Image) -> Image.Image:
    """RGB scaled by alpha, so a reduction cannot darken a translucent stroke.

    `Image.resize` filters each channel on its own, with no idea that the RGB
    under a transparent pixel is meaningless. For an opaque shape that is
    harmless — every neighbour it averages with is the shape. For a *thin
    translucent* one it is ruinous: the swing arc is a two-pixel light line
    surrounded by (0,0,0,0), so LANCZOS mixed its colour with black and the
    trail came out as a dark smear instead of a bright one.

    Premultiplying puts the alpha into the colour before the filter runs, which
    makes averaging with a transparent neighbour mean "less of this colour"
    rather than "more black". `straight` below undoes it afterwards.
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
    """The same frame with a dark rim behind it, for the light page.

    Light-mode Dragon is raw silk - `--surface: 231 219 194` - and the blade is
    near-white steel. The drawn outline carries the shape at full size, but
    reduced to 38px it is under a pixel wide along the cutting edge and the
    blade starts to dissolve into the paper.

    So: the frame's own silhouette, blackened and laid down one pixel out in
    each direction, with the untouched frame composited back on top. Nothing is
    recoloured and no line is redrawn.
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
    """The point of the blade: the opaque pixel nearest the top-left corner.

    Measured rather than assumed, because it becomes the hotspot - a cursor
    whose hotspot is off its point makes every click land somewhere the reader
    did not aim.
    """
    pixels = image.load()
    best, coords = 10**9, (0, 0)
    for y in range(image.height):
        for x in range(image.width):
            if pixels[x, y][3] > 80 and x + y < best:
                best, coords = x + y, (x, y)
    return coords


# One hotspot for all six, taken from the resting frame in the dark palette.
#
# Dark rather than light because the halo adds a pixel on every side, and
# hotspotting on the rim would put the click a pixel above and left of the
# point it is drawn on. Resting rather than slashing because the slash frame's
# blade has deliberately moved: holding the hotspot still is what makes the
# swing visible.
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
     - **over anything pressable**, brought up to {HOVER_DEGREES} degrees - a weapon raised
       rather than carried, which is the whole of the hover signal;
     - **while the button is held**, whipped down to {SLASH_DEGREES} degrees with the arc of
       the swing drawn behind it. One frame each way, no loop, because a cursor
       cannot tween - the arc is what makes a single frame read as motion.

   ## Why the tip does not move between states

   Every frame is rotated about the point of the blade, so the point is in the
   same place in all six and only the shaft swings. That is how a polearm is
   held on a target, and it is what lets one hotspot be correct in every state
   instead of in one of them.

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

# The prose above is written with ASCII hyphens so that this file stays pure
# ASCII, and the stylesheet it lands in uses em dashes throughout. One pass
# converts them: " - " cannot occur inside a selector or inside base64, whose
# alphabet has no hyphen, so the substitution can only touch the comments.
css = css.replace(' - ', f' {chr(0x2014)} ')

io.open(f'{built}/cursor.css', 'w', encoding='utf-8', newline='').write(css)
print(f'wrote {built}/cursor.css - {len(css)} chars, hotspot {point}')
print(f'crop {CROP}, scale {SCALE:.4f}')
