"""Builds the Vintage skin's cursor: the Windows XP arrow and link hand, pixel for pixel."""
import base64
import io
import os

import numpy as np
from PIL import Image, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))

BOX = 32
# Where the art's top-left pixel sits in the box, leaving room for the shadow on every side.
ORIGIN = (1, 1)
# Supersampling for the shadow only; the art itself is 1x pixels, as XP drew it.
S = 8

# The arrow, as the system drew it from Windows 95 to XP: B outline, W fill, '.' clear.
ARROW = """
B...........
BB..........
BWB.........
BWWB........
BWWWB.......
BWWWWB......
BWWWWWB.....
BWWWWWWB....
BWWWWWWWB...
BWWWWWWWWB..
BWWWWWWWWWB.
BWWWWWWBBBBB
BWWWBWWB....
BWWB.BWWB...
BWB..BWWB...
BB....BWWB..
B.....BWWB..
.......BWWB.
.......BWWB.
........BB..
"""
ARROW_HOTSPOT = (0, 0)

# The link hand's white, row by row as inclusive column spans. The outline is derived from it,
# so the finger seams fall out of the gaps between the spans.
HAND_FILL = {
    1: [(5, 6)], 2: [(5, 6)], 3: [(5, 6)], 4: [(5, 6)], 5: [(5, 6)],
    6: [(5, 6), (8, 9)],
    7: [(5, 6), (8, 9), (11, 12)],
    8: [(5, 6), (8, 9), (11, 12), (14, 14)],
    9: [(1, 2), (5, 6), (8, 9), (11, 12), (14, 15)],
    10: [(1, 3), (5, 6), (8, 9), (11, 12), (14, 15)],
    11: [(2, 15)], 12: [(2, 15)], 13: [(3, 15)], 14: [(3, 14)],
    15: [(4, 14)], 16: [(4, 13)], 17: [(5, 13)], 18: [(5, 12)], 19: [(5, 12)],
}
HAND_HOTSPOT = (5, 0)
# Pressed, the index finger folds two pixels into the page.
PRESS_FOLD = 2

# Body, outline, shadow alpha, shadow offset at rest and pressed.
PALETTES = {
    'light': {'fill': (255, 255, 255), 'line': (0, 0, 0), 'shadow': 0.42},
    # A warmer white on the dark leather, and a deeper shadow so it still lifts off the page.
    'dark': {'fill': (250, 246, 234), 'line': (0, 0, 0), 'shadow': 0.7},
}
SHADOW_REST = (2, 2)
SHADOW_PRESS = (1, 1)


def parse(art: str) -> np.ndarray:
    rows = [row for row in art.strip('\n').splitlines()]
    width = max(len(row) for row in rows)
    grid = np.zeros((len(rows), width), dtype=np.uint8)
    for y, row in enumerate(rows):
        for x, cell in enumerate(row):
            grid[y, x] = {'.': 0, 'W': 1, 'B': 2}[cell]
    return grid


def hand(fold: int = 0) -> np.ndarray:
    """The hand's fill from its spans, with a 4-neighbour outline round it."""
    fill = np.zeros((21, 17), dtype=bool)
    for y, spans in HAND_FILL.items():
        for left, right in spans:
            fill[y, left:right + 1] = True
    if fold:
        fill[1:1 + fold, 5:7] = False
    grown = fill.copy()
    grown[1:, :] |= fill[:-1, :]
    grown[:-1, :] |= fill[1:, :]
    grown[:, 1:] |= fill[:, :-1]
    grown[:, :-1] |= fill[:, 1:]
    grid = np.zeros(fill.shape, dtype=np.uint8)
    grid[grown] = 2
    grid[fill] = 1
    return grid


def render(grid: np.ndarray, palette: dict, shift: tuple[int, int], shadow: tuple[int, int]) -> Image.Image:
    box = Image.new('RGBA', (BOX, BOX), (0, 0, 0, 0))
    ox, oy = ORIGIN[0] + shift[0], ORIGIN[1] + shift[1]

    # XP's shadow: the silhouette, offset down and right, softened.
    silhouette = Image.new('L', (BOX * S, BOX * S), 0)
    pixels = silhouette.load()
    for y, x in zip(*np.nonzero(grid)):
        for dy in range(S):
            for dx in range(S):
                pixels[(ox + x + shadow[0]) * S + dx, (oy + y + shadow[1]) * S + dy] = 255
    soft = silhouette.filter(ImageFilter.GaussianBlur(0.9 * S)).resize((BOX, BOX), Image.LANCZOS)
    shade = Image.new('RGBA', (BOX, BOX), (0, 0, 0, 255))
    shade.putalpha(soft.point(lambda value: int(value * palette['shadow'])))
    box.alpha_composite(shade)

    art = box.load()
    for y, x in zip(*np.nonzero(grid)):
        colour = palette['fill'] if grid[y, x] == 1 else palette['line']
        art[ox + x, oy + y] = (*colour, 255)
    return box


FRAMES = {}
for name, palette in PALETTES.items():
    FRAMES[f'arrow-{name}'] = render(parse(ARROW), palette, (0, 0), SHADOW_REST)
    # Pressed, the arrow sinks a pixel into its own shadow, the way a classic button does.
    FRAMES[f'arrow-press-{name}'] = render(parse(ARROW), palette, (1, 1), SHADOW_PRESS)
    FRAMES[f'hand-{name}'] = render(hand(), palette, (0, 0), SHADOW_REST)
    FRAMES[f'hand-press-{name}'] = render(hand(PRESS_FOLD), palette, (0, 1), SHADOW_PRESS)

point = f'{ORIGIN[0] + ARROW_HOTSPOT[0]} {ORIGIN[1] + ARROW_HOTSPOT[1]}'
hand_point = f'{ORIGIN[0] + HAND_HOTSPOT[0]} {ORIGIN[1] + HAND_HOTSPOT[1]}'

built = f'{HERE}/built'
os.makedirs(built, exist_ok=True)

uris = {}
for name, image in FRAMES.items():
    image.save(f'{built}/{name}.png')
    buffer = io.BytesIO()
    image.save(buffer, format='PNG', optimize=True)
    uris[name] = base64.b64encode(buffer.getvalue()).decode()

GATE = "html:not([data-cursor='off'])[data-skin='vintage']"
GATE_DARK = "html:not([data-cursor='off'])[data-skin='vintage'].dark"
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


def rule(selectors: str, frame: str, spot: str, fallback: str) -> str:
    return f'{selectors} {{\n  cursor: url("data:image/png;base64,{uris[frame]}") {spot}, {fallback};\n}}'


css = f'''
/* --- Skin: VINTAGE - the pointer is Windows XP's. ---
   Generated by `custom-cursor/vintage/build-cursors.py`. A press sinks into XP's own shadow. */

{rule(GATE, 'arrow-light', point, 'auto')}

{rule(GATE_DARK, 'arrow-dark', point, 'auto')}

/* The hand over anything pressable. The fallback keyword is `pointer`, so a
   machine that refuses the image still gets a hand. */
{rule(inside(GATE, PRESSABLE), 'hand-light', hand_point, 'pointer')}

{rule(inside(GATE_DARK, PRESSABLE), 'hand-dark', hand_point, 'pointer')}

/* The press. `:active` on the page itself, and again on the pressable list, which
   otherwise outranks it on the one surface a press matters most. */
{rule(f'{GATE} :active', 'arrow-press-light', point, 'auto')}

{rule(f'{GATE_DARK} :active', 'arrow-press-dark', point, 'auto')}

{rule(inside(GATE, PRESSABLE, ':active'), 'hand-press-light', hand_point, 'pointer')}

{rule(inside(GATE_DARK, PRESSABLE, ':active'), 'hand-press-dark', hand_point, 'pointer')}

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
print(f'wrote {built}/cursor.css - {len(css)} chars, arrow {point}, hand {hand_point}')
