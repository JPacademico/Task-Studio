"""Builds the Newsprint skin's cursor: the system arrow cut as a pen nib, slit and breather hole."""
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
# The working canvas, in screen pixels. The nib turns about its point at the centre.
WORK = 72
CENTRE = (WORK / 2, WORK / 2)

# How far the hover frame tilts the nib towards writing, in degrees, about its point.
HOVER_TILT = 14
# How far the press drives the nib along its own axis, past the point, in screen pixels.
THRUST = 1.6
# Clear pixels between the widest frame and the edge of the box.
MARGIN = 1
# The rim that keeps the nib legible over a control of its own tone, in screen pixels.
RIM = 1.0

# The nib-arrow in drawing units, point at the origin: traced from the reference, the left flank is
# the nib's edge and the stem its feed. 190 units tall; UNIT brings it to about 22px.
UNIT = 0.116
BODY = [
    (0, 0),
    (118, 106),   # the right wing
    (72, 114),    # the notch where the wing meets the stem
    (92, 176),    # the stem's foot, right
    (64, 188),    # the stem's foot, left
    (47, 126),    # the stem's root on the left
    (4, 160),     # the left flank's foot
]
# The slit runs from just behind the point to the breather hole, along the nib's axis.
SLIT_FROM = (4.0, 9.0)
HOLE = (34.0, 92.0)
# Thicker than the reference's hairline: at 23px a true-scale slit is under half a pixel.
SLIT_WIDTH = 11.0
HOLE_RADIUS = 17.5

PALETTES = {
    # Printer's ink on the newsprint; the cuts show the sheet, and a sheet-coloured rim for dark
    # controls. The red is the masthead's, which is also the editor's pencil.
    'light': {
        'body': (18, 16, 14, 255),
        'cut': (244, 240, 230, 255),
        'red': (196, 32, 36, 255),
        'rim': (244, 240, 230, 255),
    },
    # The night edition reverses the plate: an ivory nib with ink in its cuts and an ink rim.
    'dark': {
        'body': (238, 232, 218, 255),
        'cut': (18, 16, 14, 255),
        'red': (236, 92, 84, 255),
        'rim': (18, 16, 14, 255),
    },
}


def to_canvas(x: float, y: float, forward: float = 0.0) -> tuple[float, float]:
    """A drawing-unit point on the supersampled canvas, point at the centre, pushed `forward` px."""
    # The axis the nib is driven along: point towards the hole, normalised.
    length = math.hypot(*HOLE)
    ax, ay = -HOLE[0] / length, -HOLE[1] / length
    return (
        (CENTRE[0] + x * UNIT + ax * forward) * S,
        (CENTRE[1] + y * UNIT + ay * forward) * S,
    )


def draw_nib(canvas: Image.Image, palette: dict, forward: float, inked: bool, pressed: bool) -> None:
    pen = ImageDraw.Draw(canvas)
    pen.polygon([to_canvas(x, y, forward) for x, y in BODY], fill=palette['body'])

    width = max(1, round(SLIT_WIDTH * UNIT * S))
    if pressed:
        # Under pressure the tines part: the slit opens into a wedge that is widest at the point.
        hx, hy = HOLE
        length = math.hypot(hx, hy)
        nx, ny = -hy / length, hx / length
        # Starts behind the point, so the point itself survives the split.
        start = (SLIT_FROM[0] + 3.0, SLIT_FROM[1] + 9.0)
        spread = SLIT_WIDTH * 0.95
        wedge = [
            (start[0] + nx * spread, start[1] + ny * spread),
            (start[0] - nx * spread, start[1] - ny * spread),
            (hx - nx * SLIT_WIDTH * 0.45, hy - ny * SLIT_WIDTH * 0.45),
            (hx + nx * SLIT_WIDTH * 0.45, hy + ny * SLIT_WIDTH * 0.45),
        ]
        pen.polygon([to_canvas(x, y, forward) for x, y in wedge], fill=palette['cut'])
    else:
        pen.line([to_canvas(*SLIT_FROM, forward), to_canvas(*HOLE, forward)], fill=palette['cut'], width=width)

    cx, cy = to_canvas(*HOLE, forward)
    radius = HOLE_RADIUS * UNIT * S
    pen.ellipse([cx - radius, cy - radius, cx + radius, cy + radius], fill=palette['cut'])
    if inked:
        # Over a pressable the hole holds a drop of red: the pen is charged.
        inner = radius * 0.62
        pen.ellipse([cx - inner, cy - inner, cx + inner, cy + inner], fill=palette['red'])

    if pressed:
        # A spot of red where the point meets the page, struck just ahead of it.
        ix, iy = to_canvas(-2.0, -5.0, forward)
        spot = 1.15 * S
        pen.ellipse([ix - spot, iy - spot, ix + spot, iy + spot], fill=palette['red'])


def pose(tilt: float, palette: dict, inked: bool, pressed: bool) -> Image.Image:
    canvas = Image.new('RGBA', (WORK * S, WORK * S), (0, 0, 0, 0))
    draw_nib(canvas, palette, THRUST if pressed else 0.0, inked, pressed)
    # PIL turns counter-clockwise for a positive angle; the tilt swings the stem down and under.
    turned = canvas.rotate(-tilt, center=(CENTRE[0] * S, CENTRE[1] * S), resample=Image.BICUBIC)

    alpha = turned.getchannel('A')
    size = int(RIM * S) * 2 + 1
    rim = Image.new('RGBA', turned.size, palette['rim'])
    rim.putalpha(alpha.filter(ImageFilter.MaxFilter(size)))
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
    POSES[f'{name}-rest'] = reduce(pose(0, palette, inked=False, pressed=False))
    POSES[f'{name}-hover'] = reduce(pose(HOVER_TILT, palette, inked=True, pressed=False))
    POSES[f'{name}-press'] = reduce(pose(0, palette, inked=False, pressed=True))
    POSES[f'{name}-press-hover'] = reduce(pose(HOVER_TILT, palette, inked=True, pressed=True))


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
# The nib's point at rest. The press drives past it and springs back, like the knife's stab.
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
for row, (name, tone) in enumerate((('light', (244, 240, 230, 255)), ('dark', (24, 22, 20, 255)))):
    for col, frame in enumerate(('rest', 'hover', 'press', 'press-hover')):
        tile = Image.new('RGBA', (BOX, BOX), tone)
        tile.alpha_composite(FRAMES[f'{name}-{frame}'])
        sheet.paste(tile.resize((BOX * 4, BOX * 4), Image.NEAREST), (10 + col * (BOX * 4 + 10), 10 + row * (BOX * 4 + 10)))
sheet.save(f'{built}/preview.png')

point = f'{HOTSPOT[0]} {HOTSPOT[1]}'

GATE = "html:not([data-cursor='off'])[data-skin='newspaper']"
GATE_DARK = "html:not([data-cursor='off'])[data-skin='newspaper'].dark"
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
/* --- Skin: NEWSPAPER - the pointer is a pen nib cut as the arrow. ---
   Generated by `custom-cursor/newspaper/build-cursors.py`. It tilts and takes red ink over pressables. */

{rule(GATE, 'light-rest', 'auto')}

{rule(GATE_DARK, 'dark-rest', 'auto')}

{rule(inside(GATE, PRESSABLE), 'light-hover', 'pointer')}

{rule(inside(GATE_DARK, PRESSABLE), 'dark-hover', 'pointer')}

/* The press: the tines split and mark the page. `:active` on the page, and again on the pressable
   list, which otherwise outranks it on the one surface a press matters most. */
{rule(f'{GATE} :active', 'light-press', 'auto')}

{rule(f'{GATE_DARK} :active', 'dark-press', 'auto')}

{rule(inside(GATE, PRESSABLE, ':active'), 'light-press-hover', 'pointer')}

{rule(inside(GATE_DARK, PRESSABLE, ':active'), 'dark-press-hover', 'pointer')}

/* The three the nib must not swallow. */
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
