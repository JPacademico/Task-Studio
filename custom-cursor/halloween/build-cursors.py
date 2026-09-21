"""Builds the Halloween knife cursor from the two drawings in this folder.

Run it after changing either PNG:

    python custom-cursor/halloween/build-cursors.py

It writes `built/cursor.css` beside the drawings; paste that over the block in
`src/app/styles/index.css` marked `Skin: HALLOWEEN - the pointer is a knife`.
(A file rather than stdout, because the em dashes in the generated comments do
not survive a Windows console pipe.) The drawings are never redrawn here -
everything below is rotation, cropping, scaling and placement, so what ships is
the design team's artwork and not an impression of it.

Requires Pillow (`pip install pillow`). Nothing in the application depends on
this script at build or run time; it is a one-off tool that produces text.
"""
import base64
import io
import math
import os

from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))

# 40 rather than the 48 this used to be.
#
# The first pass at these cursors was too big: a 48px blade covers the word it
# is pointing at and reads as a sticker rather than a pointer. 40 keeps the
# guard, the three notches in the grip and the pommel legible while sitting
# inside the footprint of a system arrow. Every current browser accepts a
# cursor image up to 128px; past that the declaration is dropped and the
# fallback keyword takes over.
BOX = 40
KNIFE = 34        # the drawing's long side inside the canvas
REST = 4          # where the resting frame sits, leaving room to lunge into
THRUST = 4        # how far the click frame drives forward, in canvas pixels

# Where the blade should point, measured the way `axis()` measures: 0 is right,
# 90 is straight up, 135 is up and to the left.
#
# 135 is the diagonal the system arrow sits on, and matching it is the whole of
# the angle correction. The artwork is drawn at roughly 143, which is close
# enough to look deliberate and far enough to look *wrong* next to an ordinary
# pointer - the blade appears to lie back. The turn applied is the difference
# between the two, computed below rather than typed, so re-drawn artwork at any
# angle lands on the same diagonal without this file changing.
TARGET_DEGREES = 135

clean = Image.open(f"{HERE}/facaNova.png").convert("RGBA")   # the knife
blood = Image.open(f"{HERE}/facaNova2.png").convert("RGBA")  # the same knife, bloodied


def opaque_points(image: Image.Image) -> list[tuple[int, int]]:
    pixels = image.load()
    return [
        (x, y)
        for y in range(image.height)
        for x in range(image.width)
        if pixels[x, y][3] > 80
    ]


def axis(image: Image.Image) -> float:
    """Which way the blade points, in degrees, 0 = right and 90 = up.

    The principal axis of the drawing's opaque pixels gives the *line* the
    knife lies on; the point of it is whichever end of that line is narrower,
    which is what separates a blade from a grip without anything here knowing
    it is looking at a knife.

    Measured from the clean drawing only. The bloodied one is the same artwork
    with red added along one edge, and that red is enough to make the blade end
    measure wider than the grip - so asking it the same question yields the
    knife backwards. Both frames then take the clean drawing's answer, which is
    also what keeps them registered against each other.
    """
    points = opaque_points(image)
    count = len(points)
    cx = sum(x for x, _ in points) / count
    cy = sum(y for _, y in points) / count

    sxx = sum((x - cx) ** 2 for x, _ in points) / count
    syy = sum((y - cy) ** 2 for _, y in points) / count
    sxy = sum((x - cx) * (y - cy) for x, y in points) / count
    theta = 0.5 * math.atan2(2 * sxy, sxx - syy)
    ux, uy = math.cos(theta), math.sin(theta)

    projected = [((x - cx) * ux + (y - cy) * uy, (x, y)) for x, y in points]
    values = [value for value, _ in projected]
    span = max(values) - min(values)

    def width_at(edge: float, sign: int) -> float:
        across = [
            (x - cx) * -uy + (y - cy) * ux
            for value, (x, y) in projected
            if sign * (value - edge) > -0.15 * span
        ]
        return max(across) - min(across) if across else 0.0

    low, high = min(projected)[1], max(projected)[1]
    nose, tail = (low, high) if width_at(min(values), -1) < width_at(max(values), 1) else (high, low)

    return math.degrees(math.atan2(-(nose[1] - tail[1]), nose[0] - tail[0]))


# One crop box for both drawings.
#
# Cropping each frame to its own content would register them against
# *themselves*: the bloodied knife's ink spills further left and lower than the
# clean one, so its blade would land a pixel or two off once both were scaled
# into the same canvas - and the knife would visibly jump the moment the
# pointer crossed onto a link. One box taken from both keeps the blade still
# and lets only the blood appear.
def union(*images: Image.Image) -> tuple[int, int, int, int]:
    boxes = [image.getbbox() for image in images]
    return (
        min(box[0] for box in boxes),
        min(box[1] for box in boxes),
        max(box[2] for box in boxes),
        max(box[3] for box in boxes),
    )


CROP = union(clean, blood)
TURN = TARGET_DEGREES - axis(clean)


def frame(image: Image.Image, offset: int) -> Image.Image:
    """One cursor frame: turned onto the arrow's diagonal, scaled, placed.

    The rotation is the only change to the artwork, and it is a few degrees
    rather than the quarter turn the previous set needed - these drawings
    already point up and to the left, the way the pointer they replace does.
    """
    turned = image.crop(CROP).rotate(TURN, expand=True, resample=Image.BICUBIC)
    # The turn leaves transparent corners; drop them so `KNIFE` measures the
    # blade rather than the rotated bounding box it arrived in.
    turned = turned.crop(turned.getbbox())

    scale = KNIFE / max(turned.size)
    turned = turned.resize(
        (max(1, round(turned.width * scale)), max(1, round(turned.height * scale))),
        Image.LANCZOS,
    )

    canvas = Image.new("RGBA", (BOX, BOX), (0, 0, 0, 0))
    canvas.alpha_composite(turned, (offset, offset))
    return canvas


def haloed(image: Image.Image) -> Image.Image:
    """The same frame with a dark rim behind it, for the cream page.

    Light-mode Halloween is a warm cream - `--surface: 240 231 216` - and the
    blade is drawn near-white. The artist's ink outline carries the shape at
    full size, but scaled to 34px that outline is under a pixel wide in places
    and the knife starts to dissolve into the page.

    So: the drawing's own silhouette, blackened and laid down one pixel out in
    each direction, with the untouched drawing composited back on top. Nothing
    is recoloured and no line is redrawn - the result is the artist's frame
    with a rim of its own shape behind it, which is the cheapest thing that
    survives both a cream page and a screenshot of one.
    """
    silhouette = Image.new("RGBA", image.size, (0, 0, 0, 0))
    alpha = image.getchannel("A")
    # 60% black: solid enough to separate the blade from cream, soft enough
    # that it reads as a shadow rather than a second outline.
    silhouette.putalpha(alpha.point(lambda value: int(value * 0.6)))

    out = Image.new("RGBA", image.size, (0, 0, 0, 0))
    for dx, dy in ((-1, 0), (1, 0), (0, -1), (0, 1)):
        out.alpha_composite(silhouette, (max(0, dx), max(0, dy)))
    out.alpha_composite(image)
    return out


DARK_REST = frame(clean, REST)
DARK_HOVER = frame(blood, REST)
DARK_STAB = frame(blood, max(0, REST - THRUST))

FRAMES = {
    # Dark mode gets the artist's originals, which are lit for exactly this:
    # a pale blade on a near-black page.
    "dark-rest": DARK_REST,
    "dark-hover": DARK_HOVER,
    "dark-stab": DARK_STAB,
    # Light mode gets the same frames with the rim behind them.
    "light-rest": haloed(DARK_REST),
    "light-hover": haloed(DARK_HOVER),
    "light-stab": haloed(DARK_STAB),
}


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


# One hotspot for all six, taken from the resting frame.
#
# It deliberately does *not* follow the point into the stab frame. If it did,
# the tip would stay under the pointer and the lunge would be invisible; fixed,
# the blade drives forward while the button is held and snaps back on release.
# That is the whole of the stab - one frame, no loop.
#
# Taken from the dark frame rather than the light one because the halo adds a
# pixel on every side: hotspotting on the rim would put the click a pixel above
# and left of the point it is drawn on.
HOTSPOT = tip(FRAMES["dark-rest"])

built = f"{HERE}/built"
os.makedirs(built, exist_ok=True)

uris = {}
for name, image in FRAMES.items():
    image.save(f"{built}/{name}.png")
    buffer = io.BytesIO()
    image.save(buffer, format="PNG", optimize=True)
    uris[name] = base64.b64encode(buffer.getvalue()).decode()

# Everything a pointer can be pressed on. One list, used by both the hover state
# and the stab state, so the two can never cover different surfaces.
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

point = f"{HOTSPOT[0]} {HOTSPOT[1]}"

# Every rule is gated on the opt-out, so the checkbox in the theme picker can
# hand the system pointer back without a second copy of this block existing.
#
# Compound, with no space before `[data-skin]`: both attributes and the `dark`
# class live on the *same* element. `ThemeProvider` writes all three onto
# `document.documentElement`, which is the `html` element this gate names, so a
# descendant combinator here matches nothing at all and the whole block
# silently does not apply.
GATE = "html:not([data-cursor='off'])[data-skin='halloween']"
GATE_DARK = "html:not([data-cursor='off'])[data-skin='halloween'].dark"


def rules(prefix: str, uri: str, fallback: str, suffix: str = "") -> str:
    selectors = ",\n".join(f"{prefix} {one}{suffix}" for one in CLICKABLE.split(",\n"))
    return f'{selectors} {{\n  cursor: url("data:image/png;base64,{uri}") {point}, {fallback};\n}}'


css = f'''
/* ===========================================================================
   Skin: HALLOWEEN - the pointer is a knife.
   ===========================================================================

   The two drawings in `custom-cursor/halloween/` are the design team's, and
   they are not redrawn here: this block is generated by `build-cursors.py` in
   that folder, which turns them {abs(TURN):.1f} degrees onto the diagonal the system
   arrow sits on and changes nothing else. Re-run it after any change to the
   artwork and paste the result over this block.

   Three states:

     - **at rest**, the clean knife;
     - **over anything pressable**, the bloodied one - the theme saying the
       thing under the point can be stabbed;
     - **while the button is held**, the same drawing driven {THRUST}px further along
       its own axis. The hotspot does not move with it, so the blade visibly
       lunges past the pointer and snaps back on release. One frame each way, no
       loop, because a cursor cannot tween and does not need to.

   ## Why two palettes

   The page underneath decides. Dark mode gets the artwork as drawn - a pale
   blade on a near-black page. Light mode gets the same frames with a dark rim
   of their own silhouette behind them, because on the cream page a white blade
   and a sub-pixel ink outline dissolve into the background. `.dark` sits on the
   same element as `data-skin`, so this is one extra selector rather than a
   media query that would be wrong for anybody overriding the theme.

   ## Specificity, which is doing real work

   Six rules that have to beat each other in a fixed order: dark over light,
   and within a palette, stab over blood over rest. That falls out of the
   selectors as written - the `.dark` variants carry one more class than their
   light counterparts, and within a palette `:active` beats `a[href]` beats the
   bare skin selector. No `!important` anywhere; one would break the next state
   added.

   ## The opt-out

   Every selector is gated on `html:not([data-cursor='off'])`. The checkbox in
   the theme picker writes `data-cursor="off"` onto the root element, which
   drops this whole block and hands back the system pointer - no second
   stylesheet, no JavaScript that has to know which skins draw a cursor.

   ## Hotspot

   `{point}` - the point of the blade in the resting frame, measured from the
   pixels rather than guessed.

   Text fields, disabled controls and drag handles are left alone: an I-beam,
   `not-allowed` and `grab` each say something no knife can say.
   --------------------------------------------------------------------------- */

{GATE} {{
  cursor: url("data:image/png;base64,{uris['light-rest']}") {point}, auto;
}}

{GATE_DARK} {{
  cursor: url("data:image/png;base64,{uris['dark-rest']}") {point}, auto;
}}

{rules(GATE, uris['light-hover'], 'pointer')}

{rules(GATE_DARK, uris['dark-hover'], 'pointer')}

/* The stab. `:active` rather than a class, so it covers everything a pointer
   can be held down on - including the page itself, where half the clicks in any
   application land. */
{GATE} :active {{
  cursor: url("data:image/png;base64,{uris['light-stab']}") {point}, auto;
}}

{GATE_DARK} :active {{
  cursor: url("data:image/png;base64,{uris['dark-stab']}") {point}, auto;
}}

/* And the same thing again on the pressable list, which is not redundant.
   `{GATE} a[href]` carries one more element than `{GATE} :active`, so on the
   one surface where a stab matters most - a link somebody is clicking - the
   hover rule would otherwise outrank the stab and the blade would never lunge.
   Repeating the list with `:active` on each selector puts it back on top. */
{rules(GATE, uris['light-stab'], 'pointer', ':active')}

{rules(GATE_DARK, uris['dark-stab'], 'pointer', ':active')}

/* The three the knife must not swallow. */
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
css = css.replace(" - ", f" {chr(0x2014)} ")

io.open(f"{built}/cursor.css", "w", encoding="utf-8", newline="").write(css)
print(f"wrote {built}/cursor.css - {len(css)} chars, hotspot {point}, turn {TURN:.1f} deg")
