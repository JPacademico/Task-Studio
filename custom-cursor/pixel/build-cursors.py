"""Builds the Pixel art skin's cursor.

Run it after changing anything below:

    python custom-cursor/pixel/build-cursors.py

It writes `built/cursor.css` beside this file; paste that over the block in
`src/app/styles/index.css` marked `Skin: PIXEL - the pointer is the system
arrow, redrawn`. (A file rather than stdout, because the em dashes in the
generated comments do not survive a Windows console pipe.)

Requires Pillow (`pip install pillow`). Nothing in the application depends on
this script at build or run time; it is a one-off tool that produces text.

## How this differs from its three siblings

`halloween/` and `paper/` start from artwork a designer drew and rotate, crop,
scale and place it. `dragon/` constructs a weapon out of arcs and polygons at
four times size and reduces it with LANCZOS, because a guan dao is nothing but
curves and a 44px one drawn directly has no antialiasing.

This one is the opposite of all three, and the inversion is the whole point:

  - **It is authored as a grid of characters**, one per pixel, because that is
    what the drawing *is*. An 8-bit pointer is not a small picture of an arrow;
    it is a specific arrangement of twelve-ish pixels, and every one of them is
    a decision. A path description would be a lie about how the thing is made.
  - **It is scaled with NEAREST and nothing else.** Every other cursor here
    fights for antialiasing. This one must not have any: a single soft pixel
    anywhere on the edge is the difference between a retro pointer and a
    slightly blurry modern one, and it is the first thing anybody notices.
  - **It has two states: the arrow and the pointing hand.** It used to have
    one, on the argument that a 1987 machine had one pointer. That was wrong in
    the way that matters: every system since has turned the arrow into a hand
    over something clickable, and a pixel skin that kept the arrow over every
    button took away the one cue that says "this can be pressed". The hand is
    the system hand, redrawn on the same grid, exactly as the arrow is.

## Why this skin gets a cursor at all

The brief was "just like the default cursor but pixelated, and a bit bigger",
which is exactly right and is why there is no invention here. Every other skin
that draws a pointer replaces it with an *object* - a paper plane, a knife, a
polearm - because those skins are places. This one is a rendering mode: the
same interface, drawn by a machine with a 320x200 framebuffer. The correct
pointer for that machine is the pointer everybody already has, drawn the way
that machine would have had to draw it.
"""
import base64
import io
import os

from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))

# ---------------------------------------------------------------------------
# Sizes
# ---------------------------------------------------------------------------

# How many screen pixels one drawn pixel becomes.
#
# Two. It was three, which made the arrow 36x57 - chunky, and in use simply
# too big: it covered the thing it pointed at, and next to a 12px label it read
# as a toy rather than as a pointer. At 2x the arrow is 24x38, still visibly a
# grid of fat pixels, and close enough to the system arrow's footprint that it
# never gets in the way of what it is pointing at.
#
# An integer factor is not negotiable. At 2.5x, NEAREST gives alternating one-
# and two-pixel-wide columns, and a pixel-art arrow with uneven pixels is worse
# than no pixel art at all.
PIXEL = 2

# ---------------------------------------------------------------------------
# The drawing
#
# One character per pixel:
#
#   .  transparent
#   #  the outline
#   *  the fill
#   +  the highlight, one pixel in from the lit edge
#
# The shape is the system arrow and is deliberately not an improvement on it:
# a point at the top left, a straight left edge, a barb, and a tail. What the
# pixel grid changes is that the diagonal is a staircase rather than a line,
# which is the only honest way to draw one at this resolution.
# ---------------------------------------------------------------------------

ARROW = """
#...........
##..........
#+#.........
#++#........
#+++#.......
#++++#......
#+++++#.....
#++++++#....
#+++++++#...
#++++++++#..
#+++++++++#.
#++++++++++#
#+++++#####.
#++#++#.....
#+#.#++#....
##..#++#....
.....#++#...
.....#++#...
.....####...
"""

# The pointing hand, over anything that can be pressed.
#
# The system hand's anatomy, one decision per pixel: an index finger two pixels
# wide standing four pixels proud of the others, three knuckles stepping down
# to the right, a thumb tucked on the left, and a palm that closes into a cuff.
# The outline between the fingers stops where the palm begins, which is what
# makes it read as one hand rather than four sticks.
HAND = """
.....##..........
....#+*#.........
....#+*#.........
....#+*#.........
....#+*#.........
....#+*###.......
....#+*#+*###....
....#+*#+*#+*##..
.##.#+*#+*#+*#+*#
#+*##+*#+*#+*#+*#
#+**#+**********#
.#+*************#
..#+************#
..#+************#
...#+**********#.
...#+**********#.
....#+********#..
....#+********#..
....###########..
"""

# ---------------------------------------------------------------------------
# Palette
#
# Two of them, because this skin has two palettes and a cursor that is legible
# on one of them is invisible on the other. The arrow is drawn the way the
# system arrow is drawn - a light body with a dark outline on a dark page, and
# the reverse on a light one - so that whichever page it is over, the outline
# is the part that separates it from the background.
#
# The highlight is the one liberty: a single lighter tone along the lit edge,
# which is what a machine with sixteen colours would have spent one of them on
# and is what stops a two-tone arrow reading as a cut-out.
# ---------------------------------------------------------------------------

PALETTES = {
    'light': {
        '#': (26, 24, 38, 255),
        '*': (244, 244, 250, 255),
        '+': (255, 255, 255, 255),
    },
    'dark': {
        '#': (12, 10, 20, 255),
        '*': (228, 228, 240, 255),
        '+': (255, 255, 255, 255),
    },
}


def grid(art: str) -> list[str]:
    """The art as a rectangular list of rows, padded to the widest one."""
    rows = [row for row in art.splitlines() if row]
    width = max(len(row) for row in rows)
    return [row.ljust(width, '.') for row in rows]


def draw(rows: list[str], palette: dict[str, tuple[int, int, int, int]]) -> Image.Image:
    """One drawing, at one drawn pixel per image pixel, then blown up NEAREST."""
    width, height = len(rows[0]), len(rows)
    small = Image.new('RGBA', (width, height), (0, 0, 0, 0))
    pixels = small.load()

    for y, row in enumerate(rows):
        for x, mark in enumerate(row):
            if mark in palette:
                pixels[x, y] = palette[mark]

    return small.resize((width * PIXEL, height * PIXEL), Image.NEAREST)


ARROW_ROWS = grid(ARROW)
HAND_ROWS = grid(HAND)
WIDTH = len(ARROW_ROWS[0])
HEIGHT = len(ARROW_ROWS)
HAND_WIDTH = len(HAND_ROWS[0])
HAND_HEIGHT = len(HAND_ROWS)

FRAMES = {}
for name, palette in PALETTES.items():
    FRAMES[f'arrow-{name}'] = draw(ARROW_ROWS, palette)
    FRAMES[f'hand-{name}'] = draw(HAND_ROWS, palette)

# The arrow's hotspot is its point: the top-left drawn pixel, which the grid
# puts at (0, 0) by construction. Stated as the *centre* of that pixel rather
# than its corner, because at 2x the pixel is two screen pixels wide and
# hotspotting on its corner puts every click a pixel off the point somebody
# aimed with.
HOTSPOT = (PIXEL // 2, PIXEL // 2)

# The hand's is the middle of the fingertip: the index finger's cap is the two
# drawn pixels at the top of the grid, so the hotspot is the centre of that
# pair, half a drawn pixel down.
_tip = HAND_ROWS[0].index('#')
HAND_HOTSPOT = (_tip * PIXEL + PIXEL, PIXEL // 2)

built = f'{HERE}/built'
os.makedirs(built, exist_ok=True)

uris = {}
for name, image in FRAMES.items():
    image.save(f'{built}/{name}.png')
    buffer = io.BytesIO()
    image.save(buffer, format='PNG', optimize=True)
    uris[name] = base64.b64encode(buffer.getvalue()).decode()

point = f'{HOTSPOT[0]} {HOTSPOT[1]}'
hand_point = f'{HAND_HOTSPOT[0]} {HAND_HOTSPOT[1]}'

GATE = "html:not([data-cursor='off'])[data-skin='pixel']"
GATE_DARK = "html:not([data-cursor='off'])[data-skin='pixel'].dark"

# Every rule that targets something *inside* the page leaves the surfaces that
# keep the system pointer alone - the project whiteboard, whose pointer is a
# tool. See `[data-native-cursor]` in `index.css`. Appended to the subject of
# each selector by `inside()`, so a re-run can never drop it.
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
   Skin: PIXEL - the pointer is the system arrow, redrawn on a grid.
   ===========================================================================

   Generated by `custom-cursor/pixel/build-cursors.py`. Re-run it after any
   change and paste the result over this block; nothing here is hand-edited.

   ## Why this skin's cursor is not an object

   Every other pointer in this product replaces the arrow with a *thing* - a
   paper plane, a knife, a guan dao - because those skins are places, and a
   place has objects in it. This one is not a place; it is a rendering mode.
   The interface is the same interface, drawn by a machine with a small
   framebuffer and sixteen colours. The right pointer for that machine is the
   pointer everybody already has, drawn the way that machine would have had to
   draw it: a {WIDTH}x{HEIGHT} grid, scaled {PIXEL}x with no interpolation, every
   diagonal a staircase.

   {WIDTH * PIXEL}x{HEIGHT * PIXEL} on screen. It was drawn at 3x, which was chunky and in use
   too big - it covered what it pointed at. At {PIXEL}x it is still plainly a grid
   of fat pixels and sits close to the system arrow's footprint.

   ## Two states: the arrow, and the hand

   Over anything that can be pressed, the arrow becomes the system's pointing
   hand, redrawn on the same grid ({HAND_WIDTH}x{HAND_HEIGHT}, {HAND_WIDTH * PIXEL}x{HAND_HEIGHT * PIXEL} on screen). It
   used to stay an arrow everywhere, which took away the one cue that says
   "this can be clicked". No press frame: a 1987 machine did not animate its
   pointer, and the hand already says everything a press would.

   ## Two palettes

   The page underneath decides, the same way the Dragon skin's does. Both are
   a light body with a dark outline; the dark palette simply pushes both
   further apart, because an outline that reads as a line on a pale page reads
   as a smudge on a black one. `.dark` sits on the same element as `data-skin`,
   so this is one extra selector rather than a media query that would be wrong
   for anybody overriding the theme.

   ## The opt-out

   Every selector is gated on `html:not([data-cursor='off'])`. The switch in the
   theme picker writes `data-cursor="off"` onto the root element, which drops
   this whole block and hands back the system pointer - no second stylesheet,
   and no JavaScript that has to know which skins draw a cursor. Anything inside
   a `[data-native-cursor]` surface is left alone too; see that rule.

   ## Hotspots

   `{point}` for the arrow - the centre of its point, which is the top-left drawn
   pixel by construction. `{hand_point}` for the hand - the middle of the
   fingertip. Both are pixel centres rather than corners, because at {PIXEL}x a
   drawn pixel is {PIXEL} screen pixels across and a corner puts every click off
   the point somebody aimed with.

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

# The prose above is written with ASCII hyphens so that this file stays pure
# ASCII, and the stylesheet it lands in uses em dashes throughout. One pass
# converts them: " - " cannot occur inside a selector or inside base64, whose
# alphabet has no hyphen, so the substitution can only touch the comments.
css = css.replace(' - ', f' {chr(0x2014)} ')

io.open(f'{built}/cursor.css', 'w', encoding='utf-8', newline='').write(css)
print(f'wrote {built}/cursor.css - {len(css)} chars, hotspots {point} / {hand_point}')
print(f'arrow {WIDTH}x{HEIGHT} -> {WIDTH * PIXEL}x{HEIGHT * PIXEL}')
print(f'hand {HAND_WIDTH}x{HAND_HEIGHT} -> {HAND_WIDTH * PIXEL}x{HAND_HEIGHT * PIXEL}')
