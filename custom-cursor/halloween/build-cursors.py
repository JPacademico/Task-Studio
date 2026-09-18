"""Builds the Halloween knife cursor from the three drawings in this folder.

Run it after changing any of the PNGs:

    python custom-cursor/halloween/build-cursors.py

It writes `built/cursor.css` beside the drawings; paste that over the block in
`src/app/styles/index.css` marked `Skin: HALLOWEEN — the pointer is a knife`.
(A file rather than stdout, because the em dashes in the generated comments do
not survive a Windows console pipe.) The drawings are never
redrawn here — everything below is rotation, cropping, scaling and one
composite, so what ships is the design team's artwork and not an impression of
it.

Requires Pillow (`pip install pillow`). Nothing in the application depends on
this script at build or run time; it is a one-off tool that produces text.
"""
import base64
import io
import os

from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))

# 48 rather than the 32 a system cursor uses.
#
# The drawings are illustrations — an outlined blade, a guard, three notches in
# the grip and a pommel — and at 32 pixels on a 45-degree diagonal every one of
# those features lands on less than a pixel. At 48 they survive, and the cursor
# is still small enough not to cover what it is pointing at. Every current
# browser accepts a cursor image up to 128px; past that the declaration is
# dropped and the fallback keyword takes over.
BOX = 48
KNIFE = 44        # the drawing's long side inside the canvas
REST = 4          # where the resting frame sits, leaving room to lunge into
THRUST = 4        # how far the click frame drives forward, in canvas pixels

clean = Image.open(f"{HERE}/Knife1.png").convert("RGBA")   # pale blade, ink outline
solid = Image.open(f"{HERE}/Knife2.png").convert("RGBA")   # the same knife, filled
blood = Image.open(f"{HERE}/Knife3.png").convert("RGBA")   # pale blade, blood on it


def bloodied(base: Image.Image) -> Image.Image:
    """`base` with only the red pixels of `Knife3` laid over it.

    The three files are the same drawing on the same canvas, so the blood lands
    exactly where the artist put it. This exists for one reason: on the cream
    Halloween page the pale-bladed drawing is nearly the background colour, so
    light mode has to use the *filled* knife — and the set has no
    filled-and-bloodied drawing. Compositing one from two of the artist's own
    files is closer to the reference than recolouring either would be.
    """
    red = Image.new("RGBA", base.size, (0, 0, 0, 0))
    source, target = blood.load(), red.load()

    for y in range(blood.height):
        for x in range(blood.width):
            r, g, b, a = source[x, y]
            # The blood is the only saturated red in the file; the blade is grey
            # and the outline is near-black.
            if a > 40 and r > 90 and r - g > 45 and r - b > 45:
                target[x, y] = (r, g, b, a)

    out = base.copy()
    out.alpha_composite(red)
    return out


def union(*images: Image.Image) -> tuple[int, int, int, int]:
    """One crop box for every drawing in the set.

    Cropping each frame to its own content would register them against
    *themselves*: the bloodied knife's ink spills further left and lower than
    the clean one, so its blade would land two pixels off once both were scaled
    into the same canvas — and the knife would visibly jump the moment the
    pointer crossed onto a link. One box taken from all three keeps the blade
    still and lets only the blood appear.
    """
    boxes = [image.getbbox() for image in images]
    return (
        min(box[0] for box in boxes),
        min(box[1] for box in boxes),
        max(box[2] for box in boxes),
        max(box[3] for box in boxes),
    )


CROP = union(clean, solid, blood)


def frame(image: Image.Image, offset: int) -> Image.Image:
    """One cursor frame: turned to the arrow's diagonal, scaled, placed.

    The rotation is the only change to the artwork. The reference points up and
    to the *right*; the system pointer it replaces points up and to the left, so
    the drawing takes a quarter turn anticlockwise and nothing else about it
    moves — same blade, same grip, same blood, same proportions.
    """
    turned = image.crop(CROP).rotate(90, expand=True, resample=Image.BICUBIC)

    scale = KNIFE / max(turned.size)
    turned = turned.resize(
        (max(1, round(turned.width * scale)), max(1, round(turned.height * scale))),
        Image.LANCZOS,
    )

    canvas = Image.new("RGBA", (BOX, BOX), (0, 0, 0, 0))
    canvas.alpha_composite(turned, (offset, offset))
    return canvas


def tip(image: Image.Image) -> tuple[int, int]:
    """The point of the blade: the opaque pixel nearest the top-left corner.

    Measured rather than assumed, because it becomes the hotspot — a cursor
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


FRAMES = {
    # Light mode gets the filled drawing. On the cream page the pale blade *is*
    # the background colour, and the ink outline that separates them is under a
    # pixel wide once the drawing is scaled this far down.
    "light-rest": frame(solid, REST),
    "light-hover": frame(bloodied(solid), REST),
    "light-stab": frame(bloodied(solid), REST - THRUST),
    # Dark mode gets the artist's originals, which are lit for exactly this.
    "dark-rest": frame(clean, REST),
    "dark-hover": frame(blood, REST),
    "dark-stab": frame(blood, REST - THRUST),
}

# One hotspot for all six, taken from the resting frame.
#
# It deliberately does *not* follow the point into the stab frame. If it did,
# the tip would stay under the pointer and the lunge would be invisible; fixed,
# the blade drives four pixels past the pointer while the button is held and
# snaps back on release. That is the whole of the stab — one frame, no loop.
HOTSPOT = tip(FRAMES["light-rest"])

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


def rules(prefix: str, uri: str, fallback: str) -> str:
    selectors = ",\n".join(f"{prefix} {one}" for one in CLICKABLE.split(",\n"))
    return f'{selectors} {{\n  cursor: url("data:image/png;base64,{uri}") {point}, {fallback};\n}}'


css = f'''
/* ===========================================================================
   Skin: HALLOWEEN — the pointer is a knife.
   ===========================================================================

   The three drawings in `custom-cursor/halloween/` are the design team's, and
   they are not redrawn here: this block is generated by `build-cursors.py` in
   that folder, which rotates them a quarter turn onto the diagonal the system
   arrow sits on and changes nothing else. Re-run it after any change to the
   artwork and paste the result over this block.

   Three states:

     - **at rest**, the clean knife;
     - **over anything pressable**, the bloodied one — the theme saying the
       thing under the point can be stabbed;
     - **while the button is held**, the same drawing driven {THRUST}px further along
       its own axis. The hotspot does not move with it, so the blade visibly
       lunges past the pointer and snaps back on release. One frame each way, no
       loop, because a cursor cannot tween and does not need to.

   ## Why two palettes

   The page underneath decides. On the cream page a pale blade is the
   background, so light mode uses the filled drawing; on the near-black page
   that silhouette would be the one invisible thing, so dark mode uses the lit
   one. `.dark` sits on the same element as `data-skin`, so this is one extra
   selector rather than a media query that would be wrong for anybody
   overriding the theme.

   ## Specificity, which is doing real work

   Six rules that have to beat each other in a fixed order: dark over light,
   and within a palette, stab over blood over rest. That falls out of the
   selectors as written — `[data-skin='halloween'].dark :active` (0,3,0) beats
   `[data-skin='halloween'].dark a[href]` (0,2,1) beats
   `[data-skin='halloween'].dark` (0,2,0), and each beats its light
   counterpart. No `!important` anywhere; one would break the next state added.

   ## Hotspot

   `{point}` — the point of the blade in the resting frame, measured from the
   pixels rather than guessed.

   Text fields, disabled controls and drag handles are left alone: an I-beam,
   `not-allowed` and `grab` each say something no knife can say.
   --------------------------------------------------------------------------- */

[data-skin='halloween'] {{
  cursor: url("data:image/png;base64,{uris['light-rest']}") {point}, auto;
}}

[data-skin='halloween'].dark {{
  cursor: url("data:image/png;base64,{uris['dark-rest']}") {point}, auto;
}}

{rules("[data-skin='halloween']", uris['light-hover'], 'pointer')}

{rules("[data-skin='halloween'].dark", uris['dark-hover'], 'pointer')}

/* The stab. `:active` rather than a class, so it covers everything a pointer
   can be held down on — including the page itself, where half the clicks in any
   application land. */
[data-skin='halloween'] :active {{
  cursor: url("data:image/png;base64,{uris['light-stab']}") {point}, auto;
}}

[data-skin='halloween'].dark :active {{
  cursor: url("data:image/png;base64,{uris['dark-stab']}") {point}, auto;
}}

/* The three the knife must not swallow. */
[data-skin='halloween'] input:not([type='checkbox']):not([type='radio']):not([type='submit']):not([type='button']),
[data-skin='halloween'] textarea,
[data-skin='halloween'] [contenteditable='true'] {{
  cursor: text;
}}

[data-skin='halloween'] .cursor-grab {{
  cursor: grab;
}}

[data-skin='halloween'] .cursor-grabbing,
[data-skin='halloween'] .cursor-grab:active {{
  cursor: grabbing;
}}
'''

io.open(f"{built}/cursor.css", "w", encoding="utf-8", newline="").write(css)
print(f"wrote {built}/cursor.css — {len(css)} chars, hotspot {point}")
