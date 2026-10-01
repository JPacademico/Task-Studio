"""Builds the Runic skin's cursor: the pager's rune arrow, turned to point."""
import base64
import io
import math
import os

from PIL import Image, ImageDraw, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))

BOX = 32
S = 8

# Screen pixels per unit of the component's 24-unit viewBox.
SCALE = 1.15

# The component's paths, in its own units.
STAVE = [((20.4, 12.0), (5.2, 12.0))]
# One path in the component, so its two arms meet in a mitre - the sharp point
# the eye reads as the tip. Drawn as one polyline here for the same reason.
BARB = ((11.0, 5.6), (4.4, 12.0), (11.0, 18.4))
NICKS = [((16.6, 8.8), (13.4, 12.0)), ((16.6, 15.2), (13.4, 12.0))]

BODY_WIDTH = 2.1
NICK_WIDTH = 1.6
GLOW_WIDTH = 1.0
HALO = 1.2

# The two angles, in degrees clockwise from the pager's own "left". Where the point sits is measured
# by `fit()`: a fixed (3.2, 3.2) let the 62-degree pose cut its lower barb off at the left edge.
REST_DEGREES = 45
HOVER_DEGREES = 62
# Clear pixels kept between the widest frame and the edge of the box.
MARGIN = 1
# Provisional placement, in a box this much larger, before `fit()` measures the frames.
POINT = (12.0, 12.0)
WORK_BOX = BOX + 24

PALETTES = {
    # Oak-gall ink on the sheet, the rubric in the cut, a paper halo.
    'light': {
        'body': (62, 24, 12, 255),
        'glow': (176, 52, 22, 255),
        'halo': (246, 233, 204, 255),
    },
    # Bone on the night stone, the ember in the cut, a soot halo.
    'dark': {
        'body': (240, 226, 199, 255),
        'glow': (246, 160, 92, 255),
        'halo': (10, 6, 3, 255),
    },
}

# The click: the arrow itself catches fire, like a rune the scribe's light has found. The stroke
# turns ember, its cut burns white-hot and the light bleeds out of the stroke rather than a disc.
LIT = {
    'light': {
        'bloom': (232, 92, 24),
        'bloom_alpha': 0.8,
        'body': (196, 58, 16, 255),
        'core': (255, 196, 112, 255),
        'rim': (90, 24, 8, 255),
    },
    'dark': {
        'bloom': (255, 118, 34),
        'bloom_alpha': 1.0,
        'body': (255, 158, 72, 255),
        'core': (255, 240, 208, 255),
        'rim': (40, 12, 4, 255),
    },
}
# How far the light bleeds past the stroke, in screen pixels.
BLOOM = 3.4


def mitre_point() -> tuple[float, float]:
    """Where the outer edges of the barb's two arms meet, in viewBox units. The tip of the drawn
    mark is not the vertex of its centre line.
    """
    (ax, ay), (tx, ty), (bx, by) = BARB
    half_angle = (math.atan2(by - ty, bx - tx) - math.atan2(ay - ty, ax - tx)) / 2
    reach = (BODY_WIDTH / 2) / math.sin(half_angle)
    # The bisector of this barb points straight along +x; the mitre is behind it.
    return (tx - reach, ty)


PIVOT = mitre_point()


def place(point: tuple[float, float], degrees: float) -> tuple[float, float]:
    """A viewBox point, turned about the mitre and set in the box, supersampled."""
    angle = math.radians(degrees)
    x, y = point[0] - PIVOT[0], point[1] - PIVOT[1]
    rx = x * math.cos(angle) - y * math.sin(angle)
    ry = x * math.sin(angle) + y * math.cos(angle)
    return ((POINT[0] + rx * SCALE) * S, (POINT[1] + ry * SCALE) * S)


def stroke(draw: ImageDraw.ImageDraw, segment, width: float, degrees: float) -> None:
    """One segment with square caps, as the component draws it."""
    (ax, ay), (bx, by) = place(segment[0], degrees), place(segment[1], degrees)
    length = math.hypot(bx - ax, by - ay) or 1
    # Extend both ends by half the width: that is what a square cap is.
    half = width * SCALE * S / 2
    ux, uy = (bx - ax) / length, (by - ay) / length
    ax, ay, bx, by = ax - ux * half, ay - uy * half, bx + ux * half, by + uy * half
    nx, ny = -uy * half, ux * half
    draw.polygon(
        [(ax + nx, ay + ny), (bx + nx, by + ny), (bx - nx, by - ny), (ax - nx, ay - ny)],
        fill=255,
    )


def polyline(draw: ImageDraw.ImageDraw, points, width: float, degrees: float) -> None:
    """Three points, square caps at the ends and a mitre where they meet."""
    p0, p1, p2 = (place(point, degrees) for point in points)
    half = width * SCALE * S / 2

    def unit(a, b):
        length = math.hypot(b[0] - a[0], b[1] - a[1]) or 1
        return ((b[0] - a[0]) / length, (b[1] - a[1]) / length)

    u1, u2 = unit(p0, p1), unit(p1, p2)
    n1, n2 = (-u1[1], u1[0]), (-u2[1], u2[0])
    start = (p0[0] - u1[0] * half, p0[1] - u1[1] * half)
    end = (p2[0] + u2[0] * half, p2[1] + u2[1] * half)

    def join(side: float):
        # Where the two offset edges on this side cross.
        a = (p1[0] + side * n1[0] * half, p1[1] + side * n1[1] * half)
        b = (p1[0] + side * n2[0] * half, p1[1] + side * n2[1] * half)
        cross = u1[0] * u2[1] - u1[1] * u2[0]
        if abs(cross) < 1e-9:
            return a
        t = ((b[0] - a[0]) * u2[1] - (b[1] - a[1]) * u2[0]) / cross
        return (a[0] + u1[0] * t, a[1] + u1[1] * t)

    draw.polygon(
        [
            (start[0] + n1[0] * half, start[1] + n1[1] * half),
            join(1),
            (end[0] + n2[0] * half, end[1] + n2[1] * half),
            (end[0] - n2[0] * half, end[1] - n2[1] * half),
            join(-1),
            (start[0] - n1[0] * half, start[1] - n1[1] * half),
        ],
        fill=255,
    )


def mask_of(segments, width: float, degrees: float, barb: bool = False) -> Image.Image:
    mask = Image.new('L', (WORK_BOX * S, WORK_BOX * S), 0)
    draw = ImageDraw.Draw(mask)
    for segment in segments:
        stroke(draw, segment, width, degrees)
    if barb:
        polyline(draw, BARB, width, degrees)
    return mask


def layers(stack, size) -> Image.Image:
    out = Image.new('RGBA', size, (0, 0, 0, 0))
    for colour, alpha in stack:
        layer = Image.new('RGBA', size, colour)
        layer.putalpha(alpha)
        out = Image.alpha_composite(out, layer)
    return out


def frame(degrees: float, palette: dict, lit: dict | None = None) -> Image.Image:
    body = mask_of(STAVE, BODY_WIDTH, degrees, barb=True)
    body.paste(255, mask=mask_of(NICKS, NICK_WIDTH, degrees))
    glow = mask_of(STAVE, GLOW_WIDTH, degrees, barb=True)

    size = int(HALO * S) * 2 + 1
    halo = body.filter(ImageFilter.MaxFilter(size))

    if lit is None:
        stack = ((palette['halo'], halo), (palette['body'], body), (palette['glow'], glow))
        return layers(stack, body.size).resize((WORK_BOX, WORK_BOX), Image.LANCZOS)

    # The bloom is the stroke's own shape, blurred: light coming out of the cut, not a disc behind it.
    bloom = body.filter(ImageFilter.MaxFilter(int(0.9 * S) * 2 + 1))
    bloom = bloom.filter(ImageFilter.GaussianBlur(BLOOM * S / 2))
    bloom = bloom.point(lambda value: min(255, int(value * lit['bloom_alpha'] * 1.6)))
    rim = body.filter(ImageFilter.MaxFilter(int(0.5 * S) * 2 + 1))
    stack = (
        ((*lit['bloom'], 255), bloom),
        (lit['rim'], rim),
        (lit['body'], body),
        (lit['core'], glow),
    )
    return layers(stack, body.size).resize((WORK_BOX, WORK_BOX), Image.LANCZOS)


POSES = {}
for name, palette in PALETTES.items():
    POSES[f'rest-{name}'] = frame(REST_DEGREES, palette)
    POSES[f'hover-{name}'] = frame(HOVER_DEGREES, palette)
    POSES[f'rest-lit-{name}'] = frame(REST_DEGREES, palette, LIT[name])
    POSES[f'hover-lit-{name}'] = frame(HOVER_DEGREES, palette, LIT[name])


def fit() -> tuple[int, int]:
    """Where to cut the box from the work canvas so every frame fits, bloom included."""
    boxes = [
        image.getchannel('A').getbbox()
        for image in POSES.values()
    ]
    left, top = min(b[0] for b in boxes), min(b[1] for b in boxes)
    right, bottom = max(b[2] for b in boxes), max(b[3] for b in boxes)
    if right - left + 2 * MARGIN > BOX or bottom - top + 2 * MARGIN > BOX:
        raise SystemExit(f'frames span {right - left}x{bottom - top}px; a {BOX}px box is too small')
    return (int(left - MARGIN), int(top - MARGIN))


CUT = fit()
FRAMES = {
    name: image.crop((CUT[0], CUT[1], CUT[0] + BOX, CUT[1] + BOX)) for name, image in POSES.items()
}

# The mitre, which does not move between the frames: all four turn about it.
HOTSPOT = (round(POINT[0] - CUT[0]), round(POINT[1] - CUT[1]))

built = f'{HERE}/built'
os.makedirs(built, exist_ok=True)

uris = {}
for name, image in FRAMES.items():
    image.save(f'{built}/{name}.png')
    buffer = io.BytesIO()
    image.save(buffer, format='PNG', optimize=True)
    uris[name] = base64.b64encode(buffer.getvalue()).decode()

point = f'{HOTSPOT[0]} {HOTSPOT[1]}'

GATE = "html:not([data-cursor='off'])[data-skin='runic']"
GATE_DARK = "html:not([data-cursor='off'])[data-skin='runic'].dark"
LIT_GATE = f"{GATE}[data-rune-lit]"
LIT_GATE_DARK = f"{GATE_DARK}[data-rune-lit]"
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
/* --- Skin: RUNIC - the pointer is the pager's rune arrow. ---
   Generated by `custom-cursor/runic/build-cursors.py`. A click lights the arrow (`RuneClickGlow`). */

{GATE} {{
  cursor: url("data:image/png;base64,{uris['rest-light']}") {point}, auto;
}}

{GATE_DARK} {{
  cursor: url("data:image/png;base64,{uris['rest-dark']}") {point}, auto;
}}

/* Over anything pressable, the point lifts. The fallback keyword is `pointer`,
   so a machine that refuses the image still gets a hand. */
{inside(GATE, PRESSABLE)} {{
  cursor: url("data:image/png;base64,{uris['hover-light']}") {point}, pointer;
}}

{inside(GATE_DARK, PRESSABLE)} {{
  cursor: url("data:image/png;base64,{uris['hover-dark']}") {point}, pointer;
}}

/* Lit: the same two poses with the stroke burning. */
{LIT_GATE} {{
  cursor: url("data:image/png;base64,{uris['rest-lit-light']}") {point}, auto;
}}

{LIT_GATE_DARK} {{
  cursor: url("data:image/png;base64,{uris['rest-lit-dark']}") {point}, auto;
}}

{inside(LIT_GATE, PRESSABLE)} {{
  cursor: url("data:image/png;base64,{uris['hover-lit-light']}") {point}, pointer;
}}

{inside(LIT_GATE_DARK, PRESSABLE)} {{
  cursor: url("data:image/png;base64,{uris['hover-lit-dark']}") {point}, pointer;
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

css = css.replace(' - ', f' {chr(0x2014)} ')

io.open(f'{built}/cursor.css', 'w', encoding='utf-8', newline='').write(css)
print(f'wrote {built}/cursor.css - {len(css)} chars, hotspot {point}')
for name, image in FRAMES.items():
    left, top, right, bottom = image.getbbox()
    print(f'{name}: content {right - left}x{bottom - top} at ({left},{top})')
