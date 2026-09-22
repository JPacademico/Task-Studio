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
  - **It has one state.** The others change on hover and on press. This skin's
    entire argument is that it is a 1987 machine, and a 1987 machine had one
    pointer - the arrow, plus the system's own I-beam over text. Adding a hover
    frame would be a modern affordance wearing a pixel costume.

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
# Three, and the number is the whole of "a bit bigger". The grid below is 12x19
# - near enough the proportions of the system arrow - so at 3x the pointer is
# 36x57, against a system arrow that is typically 32px tall. That reads as
# noticeably chunkier without becoming a cursor that covers what it is pointing
# at, which is where a 4x version (48x76) lands.
#
# An integer factor is not negotiable. At 2.5x, NEAREST gives alternating one-
# and two-pixel-wide columns, and a pixel-art arrow with uneven pixels is worse
# than no pixel art at all.
PIXEL = 3

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

ART = """
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


def grid() -> list[str]:
    """The art as a rectangular list of rows, padded to the widest one."""
    rows = [row for row in ART.splitlines() if row]
    width = max(len(row) for row in rows)
    return [row.ljust(width, '.') for row in rows]


ROWS = grid()
WIDTH = len(ROWS[0])
HEIGHT = len(ROWS)


def draw(palette: dict[str, tuple[int, int, int, int]]) -> Image.Image:
    """One arrow, at one drawn pixel per image pixel, then blown up NEAREST."""
    small = Image.new('RGBA', (WIDTH, HEIGHT), (0, 0, 0, 0))
    pixels = small.load()

    for y, row in enumerate(ROWS):
        for x, mark in enumerate(row):
            if mark in palette:
                pixels[x, y] = palette[mark]

    return small.resize((WIDTH * PIXEL, HEIGHT * PIXEL), Image.NEAREST)


FRAMES = {name: draw(palette) for name, palette in PALETTES.items()}

# The hotspot is the arrow's point: the top-left drawn pixel, which the grid
# puts at (0, 0) by construction. Stated as the *centre* of that pixel rather
# than its corner, because at 3x the pixel is three screen pixels wide and
# hotspotting on its corner puts every click a pixel and a half off the point
# somebody aimed with.
HOTSPOT = (PIXEL // 2, PIXEL // 2)

built = f'{HERE}/built'
os.makedirs(built, exist_ok=True)

uris = {}
for name, image in FRAMES.items():
    image.save(f'{built}/{name}.png')
    buffer = io.BytesIO()
    image.save(buffer, format='PNG', optimize=True)
    uris[name] = base64.b64encode(buffer.getvalue()).decode()

point = f'{HOTSPOT[0]} {HOTSPOT[1]}'

GATE = "html:not([data-cursor='off'])[data-skin='pixel']"
GATE_DARK = "html:not([data-cursor='off'])[data-skin='pixel'].dark"

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

   It is also a little larger than the system arrow - about {WIDTH * PIXEL}x{HEIGHT * PIXEL} against
   a typical 32px - which is the other half of the effect. A pixel arrow at
   exactly system size reads as a slightly broken cursor; one that is visibly
   chunkier reads as a deliberate one.

   ## One state, deliberately

   No hover frame and no press frame. The other three skins change on both, and
   they are right to: they are showing you an object being aimed and used. A
   1987 machine had one pointer and the system's own I-beam over text, and a
   pixel arrow that grew or tilted under the mouse would be a modern
   affordance wearing a costume. The `pointer` fallback keyword still applies
   everywhere the browser would normally use it, so nothing about hit-testing
   or accessibility changes.

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
   and no JavaScript that has to know which skins draw a cursor.

   ## Hotspot

   `{point}` - the centre of the arrow's point. The tip is the top-left drawn
   pixel by construction, and at {PIXEL}x that pixel is {PIXEL} screen pixels across, so
   hotspotting on its corner would put every click off the point somebody
   aimed with.

   Text fields, disabled controls and drag handles are left alone: an I-beam,
   `not-allowed` and `grab` each say something no arrow can say.
   --------------------------------------------------------------------------- */

{GATE} {{
  cursor: url("data:image/png;base64,{uris['light']}") {point}, auto;
}}

{GATE_DARK} {{
  cursor: url("data:image/png;base64,{uris['dark']}") {point}, auto;
}}

/* The same arrow over anything pressable, and that is not redundant: without
   it the browser's own `pointer` hand takes over on every link and button, and
   the one place a reader looks hardest at the cursor is the place it would
   stop being pixel art. The fallback keyword is still `pointer`, so a machine
   that refuses the image gets the hand rather than the plain arrow. */
{GATE} a[href],
{GATE} button:not(:disabled),
{GATE} summary,
{GATE} select:not(:disabled),
{GATE} label[for],
{GATE} [role='button']:not([aria-disabled='true']),
{GATE} [role='tab'],
{GATE} [role='menuitem'],
{GATE} [role='option'],
{GATE} [role='switch'],
{GATE} input[type='checkbox']:not(:disabled),
{GATE} input[type='radio']:not(:disabled),
{GATE} input[type='submit']:not(:disabled),
{GATE} input[type='button']:not(:disabled),
{GATE} .cursor-pointer {{
  cursor: url("data:image/png;base64,{uris['light']}") {point}, pointer;
}}

{GATE_DARK} a[href],
{GATE_DARK} button:not(:disabled),
{GATE_DARK} summary,
{GATE_DARK} select:not(:disabled),
{GATE_DARK} label[for],
{GATE_DARK} [role='button']:not([aria-disabled='true']),
{GATE_DARK} [role='tab'],
{GATE_DARK} [role='menuitem'],
{GATE_DARK} [role='option'],
{GATE_DARK} [role='switch'],
{GATE_DARK} input[type='checkbox']:not(:disabled),
{GATE_DARK} input[type='radio']:not(:disabled),
{GATE_DARK} input[type='submit']:not(:disabled),
{GATE_DARK} input[type='button']:not(:disabled),
{GATE_DARK} .cursor-pointer {{
  cursor: url("data:image/png;base64,{uris['dark']}") {point}, pointer;
}}

/* The three the arrow must not swallow. */
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
print(f'grid {WIDTH}x{HEIGHT}, delivered {WIDTH * PIXEL}x{HEIGHT * PIXEL}')
