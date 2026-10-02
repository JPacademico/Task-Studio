"""Builds the Newsprint skin's cursor: a classic fountain pen, nib first."""
import base64
import io
import math
import os

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))

# The delivered cursor, in CSS pixels, and the supersampling factor everything is drawn at.
# 36 rather than the usual 32: the larger pen's four poses span 31px between them.
BOX = 36
S = 8
# The working canvas, in screen pixels. The pen turns about its nib at the centre, so anything
# within half of this of the nib survives every rotation.
WORK = 72
CENTRE = (WORK / 2, WORK / 2)

# Angles in degrees, 90 = nib straight up, 135 = up and to the left like the system arrow.
REST_DEGREES = 135
HOVER_DEGREES = 113
# How far the press drives the pen along its own axis, in screen pixels.
THRUST = 2.4
# Clear pixels between the widest frame and the edge of the box.
MARGIN = 1
# The rim that keeps the pen legible over a control of its own tone, in screen pixels.
RIM = 1.0

# --- The pen, drawn pointing up with the nib's point at the origin. ---
# Drawn on a roomy grid and scaled by PEN, which brings it to about 25px: a touch past the system arrow.
PEN = 0.92

NIB = [(0.0, 0.0), (0.85, 2.0), (1.65, 5.6), (1.95, 9.2), (-1.95, 9.2), (-1.65, 5.6), (-0.85, 2.0)]
SLIT = ((0.0, 1.1), (0.0, 6.0))
BREATHER = ((0.0, 6.5), 0.62)
# Grip section: top y, bottom y, half-width at top, half-width at bottom.
SECTION = (9.0, 12.6, 1.55, 1.85)
BAND = (12.6, 13.8, 2.15)
BARREL = (13.8, 27.4, 2.0)
FINIAL = (27.4, 28.8, 1.25)
# The clip, on the barrel's right flank: top, bottom, x offset, width.
CLIP = (15.4, 23.6, 1.45, 0.6)

PALETTES = {
    # Black lacquer and gold on the newsprint, with a sheet-coloured rim for dark controls.
    'light': {
        'barrel': (24, 22, 20, 255),
        'barrel_lit': (96, 90, 82, 255),
        'section': (14, 13, 12, 255),
        'gold': (214, 172, 84, 255),
        'gold_deep': (142, 104, 36, 255),
        'band': (178, 30, 34, 255),
        'ink': (16, 14, 12, 255),
        'rim': (244, 240, 230, 255),
    },
    # Ivory resin on the night edition, with an ink rim for light controls.
    'dark': {
        'barrel': (234, 228, 214, 255),
        'barrel_lit': (255, 253, 246, 255),
        'section': (40, 37, 34, 255),
        'gold': (222, 182, 96, 255),
        'gold_deep': (150, 112, 44, 255),
        'band': (232, 96, 88, 255),
        'ink': (16, 14, 12, 255),
        'rim': (16, 14, 12, 255),
    },
}


def up(x: float, y: float, forward: float = 0.0) -> tuple[float, float]:
    """A pen-space point on the supersampled canvas, nib at the centre, moved `forward` px."""
    return ((CENTRE[0] + x * PEN) * S, (CENTRE[1] + y * PEN - forward) * S)


def draw_pen(canvas: Image.Image, palette: dict, forward: float, pressed: bool) -> None:
    pen = ImageDraw.Draw(canvas)

    def poly(points, fill):
        pen.polygon([up(x, y, forward) for x, y in points], fill=fill)

    def rect(top, bottom, half_top, half_bottom, fill):
        poly([(-half_top, top), (half_top, top), (half_bottom, bottom), (-half_bottom, bottom)], fill)

    # Barrel, with a rounded end and a lit stripe down its left flank.
    top, bottom, half = BARREL
    pen.rounded_rectangle(
        [*up(-half, top - 0.6, forward), *up(half, bottom, forward)],
        radius=half * PEN * S * 0.9,
        fill=palette['barrel'],
    )
    pen.rounded_rectangle(
        [*up(-half + 0.55, top + 0.6, forward), *up(-half + 1.35, bottom - 1.4, forward)],
        radius=0.4 * PEN * S,
        fill=palette['barrel_lit'],
    )
    # Finial cap at the end.
    f_top, f_bottom, f_half = FINIAL
    pen.rounded_rectangle(
        [*up(-f_half, f_top - 0.8, forward), *up(f_half, f_bottom, forward)],
        radius=f_half * PEN * S * 0.8,
        fill=palette['gold'],
    )
    # The clip: a gold strip on the right flank with a ball at its foot.
    c_top, c_bottom, c_x, c_w = CLIP
    pen.rounded_rectangle(
        [*up(c_x - c_w / 2, c_top, forward), *up(c_x + c_w / 2, c_bottom, forward)],
        radius=c_w * PEN * S / 2,
        fill=palette['gold'],
    )
    bx, by = up(c_x, c_bottom - 0.3, forward)
    radius = 0.8 * PEN * S
    pen.ellipse([bx - radius, by - radius, bx + radius, by + radius], fill=palette['gold'])

    # Gold band with the masthead's red line through it.
    b_top, b_bottom, b_half = BAND
    rect(b_top, b_bottom, b_half, b_half, palette['gold'])
    rect(b_top + 0.35, b_bottom - 0.35, b_half, b_half, palette['band'])

    # Grip section, tapering into the nib.
    s_top, s_bottom, s_half_top, s_half_bottom = SECTION
    rect(s_top, s_bottom, s_half_top, s_half_bottom, palette['section'])

    # The nib: two-tone gold, so the flat plate reads as curved.
    nib = NIB
    if pressed:
        # Under pressure the tines part: the point splits and the shoulders spread a little.
        nib = [(x * 1.08, y) for x, y in NIB]
    poly(nib, palette['gold'])
    poly([(0.0, 0.0), *[(x, y) for x, y in nib if x > 0], (0.0, 7.4)], palette['gold_deep'])

    # Slit and breather hole.
    (sx0, sy0), (sx1, sy1) = SLIT
    slit_width = max(1, round((0.6 if pressed else 0.45) * PEN * S))
    pen.line([up(sx0, sy0 - (0.9 if pressed else 0), forward), up(sx1, sy1, forward)],
             fill=palette['ink'], width=slit_width)
    (hx, hy), hr = BREATHER
    cx, cy = up(hx, hy, forward)
    hr *= PEN * S
    pen.ellipse([cx - hr, cy - hr, cx + hr, cy + hr], fill=palette['ink'])

    if pressed:
        # A bead of ink where the point meets the page.
        ix, iy = up(0.0, -0.5, forward)
        bead = 1.0 * S
        pen.ellipse([ix - bead, iy - bead, ix + bead, iy + bead], fill=palette['ink'])


def pose(degrees: float, palette: dict, pressed: bool = False) -> Image.Image:
    canvas = Image.new('RGBA', (WORK * S, WORK * S), (0, 0, 0, 0))
    draw_pen(canvas, palette, THRUST if pressed else 0.0, pressed)
    # Drawn pointing up (90 degrees); the turn is the difference, about the nib.
    turned = canvas.rotate(degrees - 90, center=(CENTRE[0] * S, CENTRE[1] * S), resample=Image.BICUBIC)

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
    POSES[f'{name}-rest'] = reduce(pose(REST_DEGREES, palette))
    POSES[f'{name}-hover'] = reduce(pose(HOVER_DEGREES, palette))
    POSES[f'{name}-press'] = reduce(pose(REST_DEGREES, palette, pressed=True))
    POSES[f'{name}-press-hover'] = reduce(pose(HOVER_DEGREES, palette, pressed=True))


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
/* --- Skin: NEWSPAPER - the pointer is a fountain pen. ---
   Generated by `custom-cursor/newspaper/build-cursors.py`. Upright over pressables; a press stabs. */

{rule(GATE, 'light-rest', 'auto')}

{rule(GATE_DARK, 'dark-rest', 'auto')}

{rule(inside(GATE, PRESSABLE), 'light-hover', 'pointer')}

{rule(inside(GATE_DARK, PRESSABLE), 'dark-hover', 'pointer')}

/* The stab. `:active` on the page itself, and again on the pressable list, which
   otherwise outranks it on the one surface a press matters most. */
{rule(f'{GATE} :active', 'light-press', 'auto')}

{rule(f'{GATE_DARK} :active', 'dark-press', 'auto')}

{rule(inside(GATE, PRESSABLE, ':active'), 'light-press-hover', 'pointer')}

{rule(inside(GATE_DARK, PRESSABLE, ':active'), 'dark-press-hover', 'pointer')}

/* The three the pen must not swallow. */
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
