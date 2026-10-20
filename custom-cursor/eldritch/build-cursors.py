"""Builds the Eldritch skin's cursor: a barbed arrowhead with an eye that glows over pressables
and shuts on a press."""
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
# The working canvas, in screen pixels. The arrow is drawn tip-up at the centre, then turned.
WORK = 72
CENTRE = (WORK / 2, WORK / 2)

# Turned about its tip so the left edge stands vertical, like the system arrow. Every frame shares
# it: the glow and the blink are the only changes, so the hotspot never moves.
TILT_DEGREES = 27.0
# Clear pixels between the frame and the edge of the box.
MARGIN = 1
# The rim that keeps the arrow legible over a control of its own tone, in screen pixels.
RIM = 1.0

# --- The arrowhead, pointing up with its tip at the origin, in screen pixels. ---
SCALE = 1.08
BARB = (10.2 * SCALE, 20.0 * SCALE)
NOTCH_Y = 14.4 * SCALE
# The eye, after the turn: the middle of the head rather than its axis, which runs close to the
# vertical edge. Then its half-width and half-height.
EYE_SEAT = (6.1 * SCALE, 10.3 * SCALE)
EYE_HALF = (3.8 * SCALE, 2.3 * SCALE)
IRIS_R = 1.95 * SCALE
PUPIL_HALF = (0.62 * SCALE, 1.72 * SCALE)

PALETTES = {
    # Deep-water teal on the parchment, a violet iris, a parchment rim for dark controls.
    'light': {
        'body': (24, 78, 70, 255),
        'shade': (13, 48, 43, 255),
        'ridge': (94, 150, 134, 255),
        'sclera': (236, 230, 210, 255),
        'lid_line': (9, 30, 27, 255),
        'lid': (60, 118, 104, 255),
        'iris': (122, 78, 186, 255),
        'iris_ring': (64, 34, 112, 255),
        'pupil': (20, 16, 26, 255),
        'glow': (64, 224, 182, 255),
        'aura': (122, 78, 186, 200),
        'glow_core': (226, 255, 244, 255),
        'rim': (238, 232, 214, 255),
    },
    # Bioluminescent on the night edition, with an abyss rim for light controls.
    'dark': {
        'body': (44, 146, 122, 255),
        'shade': (22, 92, 78, 255),
        'ridge': (126, 226, 194, 255),
        'sclera': (222, 238, 230, 255),
        'lid_line': (4, 22, 19, 255),
        'lid': (86, 190, 160, 255),
        'iris': (158, 108, 246, 255),
        'iris_ring': (82, 44, 150, 255),
        'pupil': (0, 0, 0, 255),
        'glow': (110, 255, 210, 255),
        'aura': (158, 108, 246, 190),
        'glow_core': (236, 255, 248, 255),
        'rim': (2, 12, 10, 255),
    },
}


def bezier(p0, p1, p2, p3, steps=40):
    out = []
    for index in range(1, steps + 1):
        t = index / steps
        u = 1 - t
        out.append((
            u**3 * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t**3 * p3[0],
            u**3 * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t**3 * p3[1],
        ))
    return out


def right_half():
    """Tip, a bowed right flank, the barb hooking back like a claw, the hollow back to the notch."""
    bx, by = BARB
    k = SCALE
    flank_edge = bezier((0, 0), (2.5 * k, 6.4 * k), (6.9 * k, 13.2 * k), (bx, by))
    # Past the barb the point hooks a hair further out and down before the hollow begins.
    hook = (bx + 0.6 * k, by + 1.0 * k)
    back = bezier(hook, (6.2 * k, 17.6 * k), (2.6 * k, 15.0 * k), (0, NOTCH_Y))
    return [(0.0, 0.0)] + flank_edge + [hook] + back


def outline():
    right = right_half()
    return right + [(-x, y) for x, y in reversed(right[1:-1])]


def spine_edge(inner: float):
    """The line `inner` of the way out from the axis to the right flank, tip to notch depth."""
    bx, by = BARB
    flank_edge = bezier((0, 0), (2.5 * SCALE, 6.4 * SCALE), (6.9 * SCALE, 13.2 * SCALE), (bx, by))
    return [(x * inner, y) for x, y in flank_edge if y <= NOTCH_Y + 2 * SCALE]


def to_canvas(points):
    return [((CENTRE[0] + x) * S, (CENTRE[1] + y) * S) for x, y in points]


def draw_arrow(palette: dict) -> Image.Image:
    canvas = Image.new('RGBA', (WORK * S, WORK * S), (0, 0, 0, 0))
    pen = ImageDraw.Draw(canvas)
    pen.polygon(to_canvas(outline()), fill=palette['body'])
    # The far flank in shadow, a lit seam down the near one: the arrowhead has a spine. The shadow is
    # the right half, with everything left of the spine line cut away again.
    shade = Image.new('RGBA', canvas.size, (0, 0, 0, 0))
    ImageDraw.Draw(shade).polygon(to_canvas(right_half()), fill=palette['shade'])
    edge = spine_edge(0.42)
    cut = [(-1.0, 0.0)] + edge + [(edge[-1][0], 40.0), (-1.0, 40.0)]
    ImageDraw.Draw(shade).polygon(to_canvas(cut), fill=(0, 0, 0, 0))
    canvas.alpha_composite(shade)
    ridge = [(0.0, 1.2 * SCALE), (0.0, 7.0 * SCALE)]
    pen.line(to_canvas(ridge), fill=palette['ridge'], width=round(0.7 * S))
    return canvas


def almond(cx: float, cy: float, half_w: float, half_h: float, steps=48):
    """The eye's outline: two arcs meeting in points at either corner."""
    top = [(cx - half_w + 2 * half_w * i / steps, cy - half_h * math.sin(math.pi * i / steps)) for i in range(steps + 1)]
    bottom = [(cx + half_w - 2 * half_w * i / steps, cy + half_h * math.sin(math.pi * i / steps)) for i in range(1, steps)]
    return top + bottom


def ellipse_box(cx, cy, rx, ry):
    return [((CENTRE[0] + cx - rx) * S, (CENTRE[1] + cy - ry) * S), ((CENTRE[0] + cx + rx) * S, (CENTRE[1] + cy + ry) * S)]


def draw_eye(canvas: Image.Image, palette: dict, centre, state: str) -> None:
    """`open`, `glow` (over a pressable) or `shut` (pressed). Drawn upright whatever the tilt."""
    cx, cy = centre
    shape = to_canvas(almond(cx, cy, *EYE_HALF))
    # The watcher's violet, soaked into the flesh round the eye.
    glow(canvas, palette, lambda pen: pen.polygon(shape, fill=palette['aura']), 0.9)
    mask = Image.new('L', canvas.size, 0)
    ImageDraw.Draw(mask).polygon(shape, fill=255)

    layer = Image.new('RGBA', canvas.size, (0, 0, 0, 0))
    pen = ImageDraw.Draw(layer)

    if state.startswith('shut'):
        # The lid down, its seam sagging, three lashes under it.
        pen.polygon(shape, fill=palette['lid'])
        pen.line(to_canvas(seam(cx, cy, 1.0)), fill=palette['lid_line'], width=round(0.75 * S), joint='curve')
        for x in (-1.6 * SCALE, 0.0, 1.6 * SCALE):
            y = seam_y(cy, x)
            pen.line(to_canvas([(cx + x, y), (cx + x * 1.15, y + 0.95 * SCALE)]), fill=palette['lid_line'], width=round(0.45 * S))
    else:
        pen.polygon(shape, fill=palette['sclera'])
        pen.ellipse(ellipse_box(cx, cy, IRIS_R, IRIS_R), fill=palette['iris_ring'])
        pen.ellipse(ellipse_box(cx, cy, IRIS_R * 0.8, IRIS_R * 0.8), fill=palette['iris'])
        pen.ellipse(ellipse_box(cx, cy, *PUPIL_HALF), fill=palette['pupil'])

    clipped = Image.new('RGBA', canvas.size, (0, 0, 0, 0))
    clipped.paste(layer, (0, 0), mask)
    canvas.alpha_composite(clipped)
    # The waterline: a dark rim round the almond so the eye reads at 8px across.
    ImageDraw.Draw(canvas).line(shape + shape[:1], fill=palette['lid_line'], width=round(0.55 * S), joint='curve')

    if state == 'glow':
        # The pupil lit from inside: a halo over the iris that spills just past the lids.
        glow(canvas, palette, lambda pen: pen.ellipse(ellipse_box(cx, cy, IRIS_R * 1.35, IRIS_R * 1.15), fill=palette['glow']), 1.0)
        glow(canvas, palette, lambda pen: pen.ellipse(ellipse_box(cx, cy, PUPIL_HALF[0] * 1.8, PUPIL_HALF[1] * 1.1), fill=palette['glow']), 0.45)
        ImageDraw.Draw(canvas).ellipse(ellipse_box(cx, cy, *PUPIL_HALF), fill=palette['glow_core'])
    elif state == 'shut-glow':
        # Shut over a pressable: the light it was holding leaks out along the seam.
        line = to_canvas(seam(cx, cy, 0.85))
        glow(canvas, palette, lambda pen: pen.line(line, fill=palette['glow'], width=round(1.3 * S), joint='curve'), 0.6)
        ImageDraw.Draw(canvas).line(line, fill=palette['glow_core'], width=round(0.45 * S), joint='curve')
    elif state == 'open':
        glint = ellipse_box(cx - 0.75 * SCALE, cy - 0.75 * SCALE, 0.42 * SCALE, 0.42 * SCALE)
        ImageDraw.Draw(canvas).ellipse(glint, fill=(255, 255, 255, 230))


def seam_y(cy: float, x: float) -> float:
    """The shut lids' seam: just below centre, sagging most in the middle."""
    return cy + 0.35 * SCALE + 0.9 * SCALE * (1 - (x / EYE_HALF[0]) ** 2)


def seam(cx: float, cy: float, reach: float):
    return [(cx + x, seam_y(cy, x)) for x in np.linspace(-EYE_HALF[0] * reach, EYE_HALF[0] * reach, 30)]


def glow(canvas: Image.Image, palette: dict, paint, blur: float) -> None:
    """Whatever `paint` draws, blurred into light and laid over the canvas."""
    light = Image.new('RGBA', canvas.size, (0, 0, 0, 0))
    paint(ImageDraw.Draw(light))
    canvas.alpha_composite(light.filter(ImageFilter.GaussianBlur(blur * S)))


def pose(palette: dict, state: str) -> Image.Image:
    arrow = draw_arrow(palette)
    # Turned about the tip; then the eye, upright, wherever its seat on the axis landed.
    turned = arrow.rotate(TILT_DEGREES, center=(CENTRE[0] * S, CENTRE[1] * S), resample=Image.BICUBIC)
    draw_eye(turned, palette, EYE_SEAT, state)


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
    POSES[f'{name}-rest'] = reduce(pose(palette, 'open'))
    POSES[f'{name}-hover'] = reduce(pose(palette, 'glow'))
    # The blink: shut for as long as the button is held, open again on release.
    POSES[f'{name}-press'] = reduce(pose(palette, 'shut'))
    POSES[f'{name}-press-hover'] = reduce(pose(palette, 'shut-glow'))


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
# The tip. Nothing about the arrow moves between frames, so a click lands where it pointed.
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
for row, (name, tone) in enumerate((('light', (238, 232, 214, 255)), ('dark', (8, 10, 14, 255)))):
    for col, frame in enumerate(('rest', 'hover', 'press', 'press-hover')):
        tile = Image.new('RGBA', (BOX, BOX), tone)
        tile.alpha_composite(FRAMES[f'{name}-{frame}'])
        sheet.paste(tile.resize((BOX * 4, BOX * 4), Image.NEAREST), (10 + col * (BOX * 4 + 10), 10 + row * (BOX * 4 + 10)))
sheet.save(f'{built}/preview.png')

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
/* --- Skin: ELDRITCH - the pointer is a barbed arrowhead with an eye in it. ---
   Generated by `custom-cursor/eldritch/build-cursors.py`. The pupil lights over pressables; a press shuts it. */

{rule(GATE, 'light-rest', 'auto')}

{rule(GATE_DARK, 'dark-rest', 'auto')}

{rule(inside(GATE, PRESSABLE), 'light-hover', 'pointer')}

{rule(inside(GATE_DARK, PRESSABLE), 'dark-hover', 'pointer')}

/* The blink. `:active` on the page itself, and again on the pressable list, which
   otherwise outranks it on the one surface a press matters most. */
{rule(f'{GATE} :active', 'light-press', 'auto')}

{rule(f'{GATE_DARK} :active', 'dark-press', 'auto')}

{rule(inside(GATE, PRESSABLE, ':active'), 'light-press-hover', 'pointer')}

{rule(inside(GATE_DARK, PRESSABLE, ':active'), 'dark-press-hover', 'pointer')}

/* The three the eye must not swallow. */
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
