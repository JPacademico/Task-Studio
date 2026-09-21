"""Builds the Paper skin's cursor from the two drawings in this folder.

Run it after changing either PNG:

    python custom-cursor/paper/build-cursors.py

It writes `built/cursor.css` beside the drawings; paste that over the block in
`src/app/styles/index.css` marked `Skin: PAPER - the pointer is a paper plane`.
(A file rather than stdout, because the em dashes in the generated comments do
not survive a Windows console pipe.)

## Why this replaced an inline SVG

The first version of this cursor was two `<path>`s written by hand in the
stylesheet - a four-point dart approximating the design. It was legible and it
was not the drawing: the folded nose, the shadowed underside and the weight of
the ink were all absent, because they cannot be had from four points. These are
the design team's files, turned and scaled and nothing else.

PNG rather than the SVG they could have stayed as, for one reason that only
shows up on other people's machines: an SVG cursor is rasterised by the browser
at whatever size it decides, and Chrome and Safari disagree - the same
`viewBox` lands a pixel apart, which moves the hotspot off the nose. A PNG at a
fixed size is the same cursor everywhere.

Requires Pillow (`pip install pillow`). Nothing in the application depends on
this script at build or run time; it is a one-off tool that produces text.
"""
import base64
import io
import math
import os

from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))

# Smaller than the Halloween knife's 40, and deliberately.
#
# A knife is an illustration with parts that have to survive - a guard, notches
# in the grip, a pommel. A paper plane is a silhouette with one fold in it, so
# it stays readable much further down, and Paper is the quiet skin: the cursor
# should be a plane you notice once, not furniture.
BOX = 36
PLANE = 30        # the drawing's long side inside the canvas
REST = 3          # where the resting frame sits, leaving room to fly into
THROW = 3         # how far the click frame flies forward, in canvas pixels

# Where each drawing should point, in the same terms `axis()` reports: 0 is
# right, 90 is straight up, 135 is up and to the left.
#
# The arrow takes the diagonal the system pointer sits on; the pointer-state
# plane stands straight up, which is what the hand it replaces does. Both are a
# few degrees off as drawn - 127 and 83 - and the difference is computed below
# rather than typed, so re-drawn artwork lands on the same angles without this
# file changing.
ARROW_DEGREES = 135
POINTER_DEGREES = 90

arrow = Image.open(f"{HERE}/plane-arrow.png").convert("RGBA")
pointer = Image.open(f"{HERE}/plane-pointer.png").convert("RGBA")


def opaque_points(image: Image.Image) -> list[tuple[int, int]]:
    pixels = image.load()
    return [
        (x, y)
        for y in range(image.height)
        for x in range(image.width)
        if pixels[x, y][3] > 80
    ]


def axis(image: Image.Image) -> float:
    """Which way the plane points, in degrees, 0 = right and 90 = up.

    The principal axis of the opaque pixels gives the line the plane lies on,
    and the narrower end of that line is its nose - which is what separates
    nose from tail without anything here knowing it is looking at a plane.
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


def frame(image: Image.Image, target: float, offset: tuple[int, int]) -> Image.Image:
    """One cursor frame: turned to `target`, scaled to `PLANE`, placed."""
    turn = target - axis(image)
    turned = image.crop(image.getbbox()).rotate(turn, expand=True, resample=Image.BICUBIC)
    # The turn leaves transparent corners; drop them so `PLANE` measures the
    # drawing rather than the rotated bounding box it arrived in.
    turned = turned.crop(turned.getbbox())

    scale = PLANE / max(turned.size)
    turned = turned.resize(
        (max(1, round(turned.width * scale)), max(1, round(turned.height * scale))),
        Image.LANCZOS,
    )

    canvas = Image.new("RGBA", (BOX, BOX), (0, 0, 0, 0))
    # Centred across the axis, so a plane standing straight up is not glued to
    # the left edge of its canvas the way the diagonal one wants to be.
    x = offset[0] if turned.width > turned.height else (BOX - turned.width) // 2
    canvas.alpha_composite(turned, (x, offset[1]))
    return canvas


def nose(image: Image.Image) -> tuple[int, int]:
    """The tip of the plane: the opaque pixel nearest the top of the canvas.

    Measured rather than assumed, because it becomes the hotspot - a cursor
    whose hotspot is off its nose makes every click land somewhere the reader
    did not aim. Ties go to the leftmost pixel of the topmost row, which is the
    nose of the diagonal plane and the fold of the upright one.
    """
    pixels = image.load()
    for y in range(image.height):
        for x in range(image.width):
            if pixels[x, y][3] > 80:
                return (x, y)
    return (0, 0)


FRAMES = {
    "arrow": frame(arrow, ARROW_DEGREES, (REST, REST)),
    "arrow-throw": frame(arrow, ARROW_DEGREES, (max(0, REST - THROW), max(0, REST - THROW))),
    "pointer": frame(pointer, POINTER_DEGREES, (REST, REST)),
    "pointer-throw": frame(pointer, POINTER_DEGREES, (REST, max(0, REST - THROW))),
}

# Two hotspots, one per drawing, and neither moves into its thrown frame.
#
# Fixing the hotspot is what makes the throw visible: the plane travels forward
# while the button is held and springs back on release, instead of dragging the
# pointer along with it. One frame each way, no loop, because a cursor cannot
# tween and does not need to.
ARROW_POINT = nose(FRAMES["arrow"])
POINTER_POINT = nose(FRAMES["pointer"])

built = f"{HERE}/built"
os.makedirs(built, exist_ok=True)

uris = {}
for name, image in FRAMES.items():
    image.save(f"{built}/{name}.png")
    buffer = io.BytesIO()
    image.save(buffer, format="PNG", optimize=True)
    uris[name] = base64.b64encode(buffer.getvalue()).decode()

# Everything a pointer can be pressed on. One list, used by the hover state and
# the thrown state alike, so the two can never cover different surfaces.
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

# Every rule is gated on the opt-out, so the checkbox in the theme picker can
# hand the system pointer back without a second copy of this block existing.
#
# Compound, with no space before `[data-skin]`: both attributes live on the
# *same* element. `ThemeProvider` writes `data-skin` onto `document
# .documentElement`, which is the `html` element this gate names, so a
# descendant combinator here matches nothing at all and the whole block
# silently does not apply.
GATE = "html:not([data-cursor='off'])[data-skin='paper']"

arrow_point = f"{ARROW_POINT[0]} {ARROW_POINT[1]}"
pointer_point = f"{POINTER_POINT[0]} {POINTER_POINT[1]}"


def rules(uri: str, point: str, suffix: str = "") -> str:
    selectors = ",\n".join(f"{GATE} {one}{suffix}" for one in CLICKABLE.split(",\n"))
    return f'{selectors} {{\n  cursor: url("data:image/png;base64,{uri}") {point}, pointer;\n}}'


css = f'''
/* ===========================================================================
   Skin: PAPER - the pointer is a paper plane.
   ===========================================================================

   The two drawings in `custom-cursor/paper/` are the design team's, and they
   are not redrawn here: this block is generated by `build-cursors.py` in that
   folder, which turns each onto its angle, scales it to {PLANE}px and changes
   nothing else. Re-run it after any change to the artwork and paste the result
   over this block.

   ## Why this skin gets a cursor

   A custom cursor is the most intrusive thing a theme can do - it replaces a
   control the reader brought with them - so it has to earn the replacement by
   being the same idea as the skin rather than a decoration on top of it. Paper
   is a desk: ruled sheets, a pen, things folded and passed along. A paper plane
   is the one object in that world that is unmistakable at cursor size, and it
   is already what an arrow *is* - a thing thrown at what you meant.

   Three states, from two drawings:

     - **at rest**, the plane on the diagonal, seen from above;
     - **over anything pressable**, the upright plane - the same fold seen
       nose-on, which is the drawing that reads as *aimed at this*;
     - **while the button is held**, whichever of the two is current, flown
       {THROW}px further along its own axis. The hotspot does not follow it, so the
       plane visibly leaves the pointer and springs back on release.

   ## Hotspots

   `{arrow_point}` for the diagonal plane and `{pointer_point}` for the upright one - the nose
   of each, measured from the pixels rather than guessed. They differ because
   the drawings do: one points up and to the left, the other straight up.

   ## The opt-out

   Every selector is gated on `html:not([data-cursor='off'])`. The checkbox in
   the theme picker writes `data-cursor="off"` onto the root element, which
   drops this whole block and hands back the system pointer - no second
   stylesheet, and no JavaScript that has to know which skins draw a cursor.

   Text fields, disabled controls and drag handles are left alone: an I-beam,
   `not-allowed` and `grab` each say something no paper plane can say.
   --------------------------------------------------------------------------- */

{GATE} {{
  cursor: url("data:image/png;base64,{uris['arrow']}") {arrow_point}, auto;
}}

{rules(uris['pointer'], pointer_point)}

/* The throw. `:active` rather than a class, so it covers everything a pointer
   can be held down on - including the page itself, where half the clicks in any
   application land. The pressable list repeats with `:active` on each selector
   so that a held button keeps the upright plane rather than reverting to the
   diagonal one; without it the specificity of the bare `:active` rule below
   would win on a link and the plane would flip mid-press. */
{GATE} :active {{
  cursor: url("data:image/png;base64,{uris['arrow-throw']}") {arrow_point}, auto;
}}

{rules(uris['pointer-throw'], pointer_point, ':active')}

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
print(
    f"wrote {built}/cursor.css - {len(css)} chars, "
    f"arrow hotspot {arrow_point}, pointer hotspot {pointer_point}"
)
