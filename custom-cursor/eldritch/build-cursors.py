"""Builds the Eldritch skin's cursor: a tentacle, tip first, that lashes when pressed."""
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
# The working canvas, in screen pixels. The tentacle turns about its tip at the centre.
WORK = 72
CENTRE = (WORK / 2, WORK / 2)

# Angles in degrees, 90 = tip straight up, 135 = up and to the left like the system arrow.
REST_DEGREES = 135
HOVER_DEGREES = 116
# The lash: on a press the body swings down about the tip, which stays on the hotspot.
SWING_DEGREES = 26
# Clear pixels between the widest frame and the edge of the box.
MARGIN = 1
# The rim that keeps the tentacle legible over a control of its own tone, in screen pixels.
RIM = 1.0

# --- The tentacle, drawn pointing up with its tip at the origin, in screen pixels. ---
LENGTH = 24.0
TIP_HALF = 0.32
BASE_HALF = 3.1
SAMPLES = 72

PALETTES = {
    # Deep-water teal on the parchment, violet suckers, a parchment rim for dark controls.
    'light': {
        'body': (24, 78, 70, 255),
        'shade': (13, 48, 43, 255),
        'belly': (94, 150, 134, 255),
        'sucker': (214, 200, 236, 255),
        'sucker_ring': (122, 78, 186, 255),
        'trail': (24, 78, 70, 110),
        'void': (20, 16, 26, 255),
        'void_ring': (122, 78, 186, 255),
        'rim': (238, 232, 214, 255),
    },
    # Bioluminescent on the night edition, with an abyss rim for light controls.
    'dark': {
        'body': (44, 146, 122, 255),
        'shade': (22, 92, 78, 255),
        'belly': (126, 226, 194, 255),
        'sucker': (196, 170, 250, 255),
        'sucker_ring': (126, 84, 220, 255),
        'trail': (86, 210, 174, 120),
        'void': (0, 0, 0, 255),
        'void_ring': (158, 108, 246, 255),
        'rim': (2, 12, 10, 255),
    },
}


def spine(curl: float):
    """Points, unit tangents and half-widths along the body, tip (t=0) to base (t=1)."""
    # A cubic: the tip hooks by `curl`, the middle sways the other way, the base settles.
    p0, p1, p2, p3 = (0.0, 0.0), (curl, 6.0), (-5.2, 13.5), (3.0, LENGTH)
    points, tangents, halves = [], [], []
    for index in range(SAMPLES + 1):
        t = index / SAMPLES
        u = 1 - t
        x = u**3 * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t**3 * p3[0]
        y = u**3 * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t**3 * p3[1]
        dx = 3 * u * u * (p1[0] - p0[0]) + 6 * u * t * (p2[0] - p1[0]) + 3 * t * t * (p3[0] - p2[0])
        dy = 3 * u * u * (p1[1] - p0[1]) + 6 * u * t * (p2[1] - p1[1]) + 3 * t * t * (p3[1] - p2[1])
        norm = math.hypot(dx, dy) or 1.0
        points.append((x, y))
        tangents.append((dx / norm, dy / norm))
        halves.append(TIP_HALF + (BASE_HALF - TIP_HALF) * t**0.85)
    return points, tangents, halves


def to_canvas(x: float, y: float) -> tuple[float, float]:
    return ((CENTRE[0] + x) * S, (CENTRE[1] + y) * S)


def side(points, tangents, halves, sign: float, inner: float = 0.0, outer: float = 1.0):
    """One edge of a band along the body, `inner`..`outer` of the half-width on side `sign`."""
    near, far = [], []
    for (x, y), (tx, ty), half in zip(points, tangents, halves):
        nx, ny = -ty * sign, tx * sign
        near.append(to_canvas(x + nx * half * inner, y + ny * half * inner))
        far.append(to_canvas(x + nx * half * outer, y + ny * half * outer))
    return near, far


def draw_tentacle(canvas: Image.Image, palette: dict, curl: float, pressed: bool) -> None:
    pen = ImageDraw.Draw(canvas)
    points, tangents, halves = spine(curl)

    if pressed:
        # Two faint wakes off the base, the way it came: the swing, drawn into the still frame.
        for offset, width in ((2.6, 0.55), (4.6, 0.4)):
            arc = []
            for (x, y), (tx, ty) in list(zip(points, tangents))[SAMPLES // 2 :]:
                arc.append(to_canvas(x + ty * offset, y - tx * offset))
            pen.line(arc, fill=palette['trail'], width=max(1, round(width * S)), joint='curve')

    left = [to_canvas(x - ty * h, y + tx * h) for (x, y), (tx, ty), h in zip(points, tangents, halves)]
    right = [to_canvas(x + ty * h, y - tx * h) for (x, y), (tx, ty), h in zip(points, tangents, halves)]
    pen.polygon(left + right[::-1], fill=palette['body'])

    # Shadow down the outer flank, belly down the inner one: the round of the body.
    near, far = side(points, tangents, halves, -1, 0.35, 1.0)
    pen.polygon(near + far[::-1], fill=palette['shade'])
    near, far = side(points, tangents, halves, 1, 0.05, 0.8)
    pen.polygon(near + far[::-1], fill=palette['belly'])

    # Suckers along the belly, shrinking toward the tip.
    t = 0.2
    while t < 0.93:
        index = round(t * SAMPLES)
        (x, y), (tx, ty), half = points[index], tangents[index], halves[index]
        cx, cy = to_canvas(x + ty * half * 0.42, y - tx * half * 0.42)
        r = max(0.42, half * 0.34) * S
        pen.ellipse([cx - r, cy - r, cx + r, cy + r], fill=palette['sucker_ring'])
        inner = r * 0.62
        pen.ellipse([cx - inner, cy - inner, cx + inner, cy + inner], fill=palette['sucker'])
        t += 0.1 + 0.07 * t

    # The rift it reaches out of: an oval of nothing across the base, ringed in the watcher's violet.
    (x, y), (tx, ty), half = points[-1], tangents[-1], halves[-1]
    for scale, colour in ((1.0, palette['void_ring']), (0.72, palette['void'])):
        across, along = half * 1.55 * scale, half * 0.72 * scale
        oval = [
            to_canvas(
                x + -ty * across * math.cos(angle) + tx * along * math.sin(angle),
                y + tx * across * math.cos(angle) + ty * along * math.sin(angle),
            )
            for angle in (index * math.tau / 40 for index in range(40))
        ]
        pen.polygon(oval, fill=colour)


def pose(degrees: float, palette: dict, curl: float, pressed: bool = False) -> Image.Image:
    canvas = Image.new('RGBA', (WORK * S, WORK * S), (0, 0, 0, 0))
    draw_tentacle(canvas, palette, curl, pressed)
    # Drawn pointing up (90 degrees); the turn is the difference, about the tip.
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
    # Resting with a slight hook; over a pressable it rises and beckons; a press lashes.
    POSES[f'{name}-rest'] = reduce(pose(REST_DEGREES, palette, curl=2.2))
    POSES[f'{name}-hover'] = reduce(pose(HOVER_DEGREES, palette, curl=4.2))
    POSES[f'{name}-press'] = reduce(
        pose(REST_DEGREES + SWING_DEGREES, palette, curl=5.2, pressed=True)
    )
    POSES[f'{name}-press-hover'] = reduce(
        pose(HOVER_DEGREES + SWING_DEGREES, palette, curl=6.0, pressed=True)
    )


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
# The tip, in every frame: the lash swings the body about it, so a click lands where it points.
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

GATE = "html:not([data-cursor='off'])[data-skin='eldritch']"
GATE_DARK = "html:not([data-cursor='off'])[data-skin='eldritch'].dark"
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
/* --- Skin: ELDRITCH - the pointer is a tentacle. ---
   Generated by `custom-cursor/eldritch/build-cursors.py`. It rises over pressables; a press lashes. */

{rule(GATE, 'light-rest', 'auto')}

{rule(GATE_DARK, 'dark-rest', 'auto')}

{rule(inside(GATE, PRESSABLE), 'light-hover', 'pointer')}

{rule(inside(GATE_DARK, PRESSABLE), 'dark-hover', 'pointer')}

/* The lash. `:active` on the page itself, and again on the pressable list, which
   otherwise outranks it on the one surface a press matters most. */
{rule(f'{GATE} :active', 'light-press', 'auto')}

{rule(f'{GATE_DARK} :active', 'dark-press', 'auto')}

{rule(inside(GATE, PRESSABLE, ':active'), 'light-press-hover', 'pointer')}

{rule(inside(GATE_DARK, PRESSABLE, ':active'), 'dark-press-hover', 'pointer')}

/* The three the tentacle must not swallow. */
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
