"""Builds the Kaiju skin's cursor: a monster's head, snout first, whose eyes light and whose jaw bites."""
import base64
import io
import math
import os

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))

# The delivered cursor, in CSS pixels, and the supersampling factor everything is drawn at.
BOX = 32
S = 8
# The working canvas, in screen pixels. The head turns about its snout tip at the centre.
WORK = 72
CENTRE = (WORK / 2, WORK / 2)

# The head is drawn facing left; this turns it to face up and to the left, like the system arrow.
TURN = 38
# How far the jaw hangs open, in degrees about its hinge: a little at rest, wider over a pressable,
# and shut on a press, which is the bite.
OPEN_REST = 20
OPEN_HOVER = 30
# The lunge that goes with the bite, along the snout, in screen pixels.
LUNGE = 1.1
# Clear pixels between the widest frame and the edge of the box.
MARGIN = 1
# The rim that keeps the head legible over a control of its own tone, in screen pixels.
RIM = 1.0

# --- The head, in screen pixels, facing left with the upper snout's tip at the origin. ---
SKULL = [
    (0.0, 0.0), (0.5, -1.5), (3.4, -2.5), (6.4, -3.2), (8.0, -4.5), (10.0, -4.9),
    (12.6, -4.3), (15.0, -3.5), (18.4, -2.2), (21.6, -0.6), (23.6, 2.6), (23.6, 7.4),
    (17.4, 8.0), (13.6, 5.6), (12.4, 2.9), (8.2, 1.7), (4.0, 1.2), (0.6, 0.9),
]
HINGE = (12.2, 2.8)
# The lower jaw, closed. It turns about the hinge to open.
JAW = [(1.2, 1.3), (11.8, 2.9), (13.4, 4.8), (9.6, 5.3), (5.0, 4.6), (1.4, 3.4)]
UPPER_TEETH = [(1.4, 1.0), (3.6, 1.15), (5.8, 1.35), (8.0, 1.65)]
LOWER_TEETH = [(2.6, 1.55), (4.8, 1.85), (7.0, 2.15), (9.2, 2.45)]
TOOTH = (0.62, 0.9)  # half-width, length
EYE = (9.1, -2.5)
EYE_RADIUS = 0.95
# The brow that overhangs the eye, which is most of what makes the face read as angry.
BROW = [(7.2, -3.9), (11.4, -4.2), (10.6, -3.1), (7.8, -3.0)]
NOSTRIL = (1.7, -1.05)
# Three dorsal plates up the back of the neck: base-left, tip, base-right.
PLATES = [
    [(16.0, -2.9), (17.2, -7.2), (19.0, -2.3)],
    [(19.0, -1.9), (21.0, -6.4), (22.4, -0.6)],
    [(22.0, 0.0), (25.4, -3.4), (23.8, 3.0)],
]

PALETTES = {
    # Charcoal hide on the pale page, bone plates, and a pale rim for dark controls.
    'light': {
        'hide': (40, 44, 52, 255),
        'shade': (22, 24, 30, 255),
        'plate': (206, 214, 226, 255),
        'plate_edge': (120, 132, 150, 255),
        'teeth': (246, 243, 232, 255),
        'mouth': (122, 20, 36, 255),
        'eye': (232, 214, 150, 255),
        'glow_core': (244, 250, 255, 255),
        'glow': (120, 140, 255),
        'glow_outer': (168, 92, 255),
        'rim': (236, 240, 246, 255),
    },
    # A lighter hide on the night palette, ringed in atomic blue so it never sinks into the dark.
    'dark': {
        'hide': (64, 72, 86, 255),
        'shade': (34, 38, 48, 255),
        'plate': (196, 208, 236, 255),
        'plate_edge': (98, 120, 196, 255),
        'teeth': (246, 243, 232, 255),
        'mouth': (150, 26, 46, 255),
        'eye': (232, 214, 150, 255),
        'glow_core': (244, 250, 255, 255),
        'glow': (120, 150, 255),
        'glow_outer': (176, 98, 255),
        'rim': (62, 92, 210, 255),
    },
}


def rotate(point, about, degrees):
    """Turns a point about another; positive is clockwise on screen (y runs down)."""
    radians = math.radians(degrees)
    x, y = point[0] - about[0], point[1] - about[1]
    return (
        about[0] + x * math.cos(radians) - y * math.sin(radians),
        about[1] + x * math.sin(radians) + y * math.cos(radians),
    )


def to_canvas(point, lunge: float):
    """A head-space point on the supersampled canvas: snout tip at the centre, pushed `lunge` px."""
    return ((CENTRE[0] + point[0] - lunge) * S, (CENTRE[1] + point[1]) * S)


def draw_head(canvas: Image.Image, palette: dict, opening: float, lunge: float, glowing: bool) -> None:
    pen = ImageDraw.Draw(canvas)

    def poly(points, fill, outline=None):
        pen.polygon([to_canvas(p, lunge) for p in points], fill=fill, outline=outline)

    def jaw(point):
        # Opening swings the front of the jaw down: counter-clockwise on screen about the hinge.
        return rotate(point, HINGE, -opening)

    # The inside of the mouth, behind both jaws, only where they have parted.
    if opening > 0:
        poly([(0.6, 0.9), HINGE, jaw((11.8, 2.9)), jaw((1.2, 1.6))], palette['mouth'])

    for plate in PLATES:
        poly(plate, palette['plate'])
        poly([plate[0], plate[1], ((plate[0][0] + plate[2][0]) / 2, (plate[0][1] + plate[2][1]) / 2)],
             palette['plate_edge'])

    poly(SKULL, palette['hide'])
    # Shade under the jawline and down the throat, so the head has a lit top and a dark underside.
    poly([(12.4, 2.9), (13.6, 5.6), (17.4, 8.0), (23.6, 7.4), (23.6, 4.8), (17.0, 4.6)], palette['shade'])

    half, length = TOOTH
    for x, y in UPPER_TEETH:
        poly([(x - half, y - 0.1), (x + half, y - 0.1), (x, y + length)], palette['teeth'])

    poly([jaw(p) for p in JAW], palette['hide'])
    poly([jaw(p) for p in [(1.4, 3.4), (5.0, 4.6), (9.6, 5.3), (13.4, 4.8), (9.0, 4.2), (4.4, 3.6)]],
         palette['shade'])
    for x, y in LOWER_TEETH:
        poly([jaw((x - half, y + 0.1)), jaw((x + half, y + 0.1)), jaw((x, y - length))], palette['teeth'])

    poly(BROW, palette['shade'])
    nx, ny = to_canvas(NOSTRIL, lunge)
    nostril = 0.38 * S
    pen.ellipse([nx - nostril, ny - nostril, nx + nostril, ny + nostril], fill=palette['shade'])

    ex, ey = to_canvas(EYE, lunge)
    radius = EYE_RADIUS * S
    if glowing:
        # The glow, on its own layer so it can be blurred without softening the head.
        glow = Image.new('RGBA', canvas.size, (0, 0, 0, 0))
        halo = ImageDraw.Draw(glow)
        for scale, colour, alpha in ((4.2, palette["glow_outer"], 120), (2.6, palette["glow"], 200)):
            r = radius * scale
            halo.ellipse([ex - r, ey - r, ex + r, ey + r], fill=(*colour, alpha))
        glow = glow.filter(ImageFilter.GaussianBlur(radius * 0.9))
        canvas.alpha_composite(glow)
        pen = ImageDraw.Draw(canvas)
        core = radius * 1.15
        pen.ellipse([ex - core, ey - core, ex + core, ey + core], fill=palette['glow_core'])
    else:
        pen.ellipse([ex - radius, ey - radius, ex + radius, ey + radius], fill=palette['eye'])
        pupil = radius * 0.45
        pen.ellipse([ex - pupil - 0.15 * S, ey - pupil, ex + pupil - 0.15 * S, ey + pupil], fill=palette['shade'])


def pose(palette: dict, opening: float, glowing: bool, biting: bool) -> Image.Image:
    canvas = Image.new('RGBA', (WORK * S, WORK * S), (0, 0, 0, 0))
    draw_head(canvas, palette, opening, LUNGE if biting else 0.0, glowing)
    # Drawn facing left; PIL turns counter-clockwise for a positive angle, so this lifts the snout.
    turned = canvas.rotate(-TURN, center=(CENTRE[0] * S, CENTRE[1] * S), resample=Image.BICUBIC)

    alpha = turned.getchannel('A')
    size = int(RIM * S) * 2 + 1
    rim = Image.new('RGBA', turned.size, palette['rim'])
    rim.putalpha(alpha.point(lambda value: 255 if value > 40 else 0).filter(ImageFilter.MaxFilter(size)))
    return Image.alpha_composite(rim, turned)


def premultiplied(image: Image.Image) -> Image.Image:
    pixels = np.asarray(image, dtype=np.float32)
    pixels[:, :, :3] *= pixels[:, :, 3:4] / 255.0
    return Image.fromarray(pixels.round().astype(np.uint8), 'RGBA')


def straight(image: Image.Image) -> Image.Image:
    pixels = np.asarray(image, dtype=np.float32)
    alpha = pixels[:, :, 3:4] / 255.0
    pixels[:, :, :3] = np.clip(pixels[:, :, :3] / np.where(alpha > 0, alpha, 1.0), 0, 255)
    # Lanczos rings: alpha of 1-5 a few pixels out is invisible but would widen every bounding box.
    pixels[:, :, 3] = np.where(pixels[:, :, 3] < 6, 0, pixels[:, :, 3])
    return Image.fromarray(pixels.round().astype(np.uint8), 'RGBA')


def reduce(image: Image.Image) -> Image.Image:
    """Down to screen pixels without dark fringes on the translucent edge."""
    return straight(premultiplied(image).resize((WORK, WORK), Image.LANCZOS))


POSES = {}
for name, palette in PALETTES.items():
    POSES[f'{name}-rest'] = reduce(pose(palette, OPEN_REST, glowing=False, biting=False))
    POSES[f'{name}-hover'] = reduce(pose(palette, OPEN_HOVER, glowing=True, biting=False))
    POSES[f'{name}-press'] = reduce(pose(palette, 0, glowing=False, biting=True))
    POSES[f'{name}-press-hover'] = reduce(pose(palette, 0, glowing=True, biting=True))


def fit() -> tuple[int, int]:
    """Where to cut the box from the work canvas so every frame fits."""
    boxes = [image.getchannel('A').getbbox() for image in POSES.values()]
    left, top = min(b[0] for b in boxes), min(b[1] for b in boxes)
    right, bottom = max(b[2] for b in boxes), max(b[3] for b in boxes)
    if right - left + 2 * MARGIN > BOX or bottom - top + 2 * MARGIN > BOX:
        raise SystemExit(f'frames span {right - left}x{bottom - top}px; a {BOX}px box is too small')
    return (left - MARGIN, top - MARGIN)


CUT = fit()
FRAMES = {
    name: image.crop((CUT[0], CUT[1], CUT[0] + BOX, CUT[1] + BOX)) for name, image in POSES.items()
}
# The snout's tip at rest. The bite lunges just past it, so a click lands where it was aimed.
HOTSPOT = (round(CENTRE[0] - CUT[0]), round(CENTRE[1] - CUT[1]))

built = f'{HERE}/built'
os.makedirs(built, exist_ok=True)

uris = {}
for name, image in FRAMES.items():
    image.save(f'{built}/{name}.png')
    buffer = io.BytesIO()
    image.save(buffer, format='PNG', optimize=True)
    uris[name] = base64.b64encode(buffer.getvalue()).decode()

# A contact sheet of every frame at 4x, on both page tones, for checking by eye.
sheet = Image.new('RGBA', (BOX * 4 * 4 + 50, BOX * 4 * 2 + 30), (128, 128, 128, 255))
for row, (name, tone) in enumerate((('light', (232, 236, 242, 255)), ('dark', (10, 13, 18, 255)))):
    for col, frame in enumerate(('rest', 'hover', 'press', 'press-hover')):
        tile = Image.new('RGBA', (BOX, BOX), tone)
        tile.alpha_composite(FRAMES[f'{name}-{frame}'])
        sheet.paste(tile.resize((BOX * 4, BOX * 4), Image.NEAREST), (10 + col * (BOX * 4 + 10), 10 + row * (BOX * 4 + 10)))
sheet.save(f'{built}/preview.png')

point = f'{HOTSPOT[0]} {HOTSPOT[1]}'

GATE = "html:not([data-cursor='off'])[data-skin='kaiju']"
GATE_DARK = "html:not([data-cursor='off'])[data-skin='kaiju'].dark"
NATIVE = ":not([data-native-cursor], [data-native-cursor] *)"

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


def inside(gate: str, selectors: list[str], suffix: str = '') -> str:
    return ',\n'.join(f'{gate} {selector}{suffix}{NATIVE}' for selector in selectors)


def rule(selectors: str, frame: str, fallback: str) -> str:
    return f'{selectors} {{\n  cursor: url("data:image/png;base64,{uris[frame]}") {point}, {fallback};\n}}'


css = f'''
/* --- Skin: KAIJU - the pointer is the monster's head. ---
   Generated by `custom-cursor/kaiju/build-cursors.py`. Its eyes light over pressables; a press bites. */

{rule(GATE, 'light-rest', 'auto')}

{rule(GATE_DARK, 'dark-rest', 'auto')}

{rule(inside(GATE, PRESSABLE), 'light-hover', 'pointer')}

{rule(inside(GATE_DARK, PRESSABLE), 'dark-hover', 'pointer')}

/* The bite. `:active` on the page itself, and again on the pressable list, which
   otherwise outranks it on the one surface a press matters most. */
{rule(f'{GATE} :active', 'light-press', 'auto')}

{rule(f'{GATE_DARK} :active', 'dark-press', 'auto')}

{rule(inside(GATE, PRESSABLE, ':active'), 'light-press-hover', 'pointer')}

{rule(inside(GATE_DARK, PRESSABLE, ':active'), 'dark-press-hover', 'pointer')}

/* The three the jaws must not swallow. */
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
