#!/usr/bin/env python3
"""
Builds `studio-pixel.woff2` and `studio-pixel-bold.woff2` — the Pixel skin's
typeface.

Run from the repository root:

    python custom-font/pixel/build-studio-pixel.py

It writes both fonts to `custom-font/pixel/` (the archive copy) and to
`public/fonts/pixel/` (the served copy), plus `preview.png` beside this file.
Requires fontTools and brotli (`pip install fonttools brotli`) and Pillow for
the preview. Nothing in the application runs this; it produces two files.

## Why this skin draws its own face

The Pixel skin's stack used to name 'Press Start 2P', 'Silkscreen' and
'Pixelify Sans' — none of which was ever loaded — so every visitor fell
through to Cascadia Mono or Consolas: the same monospace the Terminal skin
lands on. Two skins with two different premises read in one typeface, and
the 8-bit one lost the single thing that most says "8-bit".

Loading an existing pixel face would have fixed the fallback and kept the
problem one step removed: those faces are on half the retro sites on the web.
This one is drawn here, one decision per pixel, on the same grid the skin's
pointer is drawn on (`custom-cursor/pixel/`), so the letters and the cursor
are visibly the same machine.

## The grid

A classic 5x7 cell: capitals and figures are seven pixels tall, lowercase has
a five-pixel x-height with two-pixel ascenders over it and two-pixel
descenders under the baseline. One pixel of space follows every glyph.

A pixel is 100 units on a 1000-unit em, which gives:

    cap height   700    (0.70 em — close to what a UI sans measures)
    x-height     500
    ascent      1000    room above a capital for an accent and a gap
    descent      250    two descender rows and a quarter-pixel of air

Proportional, not monospaced: an `i` is one pixel wide and an `m` five. A
monospaced pixel face is a terminal, which is the other skin.

## Accents

Built, not drawn per letter: every accented letter is its base glyph plus a
two-row mark, centred on the base and set one clear row above it — above the
x-height for lowercase, above the cap height for capitals. `í` and friends
use a dotless `i`. The cedilla hangs in the descender rows. That covers every
letter the Portuguese and English interfaces use, which matters for the
reason the Dragon face's note gives: a missing glyph renders as the *next*
font in the stack appearing in the middle of a word.

## Bold

A real pixel bold rather than the browser's smear: every pixel is doubled to
its right, so stems are two pixels wide and each glyph one pixel wider. It is
how a machine with this grid drew emphasis, and it keeps every edge on the
grid, which synthetic emboldening does not.

## Outlines

Each glyph's pixels are traced into their union — outer contours clockwise,
counters anticlockwise — rather than emitted as one square per pixel.
Abutting squares leave hairline seams wherever antialiasing lands between
them, and a glyph made of forty overlapping contours is forty times the work
for the rasteriser.
"""

from __future__ import annotations

import os
from collections import defaultdict

from fontTools.fontBuilder import FontBuilder
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.ttLib import TTFont

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
SERVED = os.path.join(ROOT, 'public', 'fonts', 'pixel')

PX = 100
UPM = 1000
ASCENT = 1000
DESCENT = 250
FAMILY = 'Studio Pixel'

# ---------------------------------------------------------------------------
# The drawings.
#
# Rows from the top of the capital zone down: the seventh row (index 6) sits on
# the baseline, and rows 7 and 8, when present, are descenders. A glyph whose
# rows are fewer than seven is padded at the top — `-` is one row, drawn where
# it sits, with blank rows above it given explicitly.
# ---------------------------------------------------------------------------

G: dict[str, list[str]] = {
    'A': ['.###.', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
    'B': ['####.', '#...#', '#...#', '####.', '#...#', '#...#', '####.'],
    'C': ['.###.', '#...#', '#....', '#....', '#....', '#...#', '.###.'],
    'D': ['####.', '#...#', '#...#', '#...#', '#...#', '#...#', '####.'],
    'E': ['#####', '#....', '#....', '####.', '#....', '#....', '#####'],
    'F': ['#####', '#....', '#....', '####.', '#....', '#....', '#....'],
    'G': ['.###.', '#...#', '#....', '#.###', '#...#', '#...#', '.####'],
    'H': ['#...#', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
    'I': ['###', '.#.', '.#.', '.#.', '.#.', '.#.', '###'],
    'J': ['....#', '....#', '....#', '....#', '#...#', '#...#', '.###.'],
    'K': ['#...#', '#..#.', '#.#..', '##...', '#.#..', '#..#.', '#...#'],
    'L': ['#....', '#....', '#....', '#....', '#....', '#....', '#####'],
    'M': ['#...#', '##.##', '#.#.#', '#.#.#', '#...#', '#...#', '#...#'],
    'N': ['#...#', '#...#', '##..#', '#.#.#', '#..##', '#...#', '#...#'],
    'O': ['.###.', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
    'P': ['####.', '#...#', '#...#', '####.', '#....', '#....', '#....'],
    'Q': ['.###.', '#...#', '#...#', '#...#', '#.#.#', '#..#.', '.##.#'],
    'R': ['####.', '#...#', '#...#', '####.', '#.#..', '#..#.', '#...#'],
    'S': ['.####', '#....', '#....', '.###.', '....#', '....#', '####.'],
    'T': ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '..#..'],
    'U': ['#...#', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
    'V': ['#...#', '#...#', '#...#', '#...#', '#...#', '.#.#.', '..#..'],
    'W': ['#...#', '#...#', '#...#', '#.#.#', '#.#.#', '#.#.#', '.#.#.'],
    'X': ['#...#', '#...#', '.#.#.', '..#..', '.#.#.', '#...#', '#...#'],
    'Y': ['#...#', '#...#', '.#.#.', '..#..', '..#..', '..#..', '..#..'],
    'Z': ['#####', '....#', '...#.', '..#..', '.#...', '#....', '#####'],

    'a': ['.....', '.....', '.###.', '....#', '.####', '#...#', '.####'],
    'b': ['#....', '#....', '####.', '#...#', '#...#', '#...#', '####.'],
    'c': ['....', '....', '.###', '#...', '#...', '#...', '.###'],
    'd': ['....#', '....#', '.####', '#...#', '#...#', '#...#', '.####'],
    'e': ['.....', '.....', '.###.', '#...#', '#####', '#....', '.###.'],
    'f': ['..##', '.#..', '####', '.#..', '.#..', '.#..', '.#..'],
    'g': ['.....', '.....', '.####', '#...#', '#...#', '#...#', '.####', '....#', '.###.'],
    'h': ['#....', '#....', '####.', '#...#', '#...#', '#...#', '#...#'],
    'i': ['#', '.', '#', '#', '#', '#', '#'],
    'j': ['..#', '...', '..#', '..#', '..#', '..#', '..#', '#.#', '.#.'],
    'k': ['#...', '#...', '#..#', '#.#.', '##..', '#.#.', '#..#'],
    'l': ['#.', '#.', '#.', '#.', '#.', '#.', '.#'],
    'm': ['.....', '.....', '##.#.', '#.#.#', '#.#.#', '#.#.#', '#.#.#'],
    'n': ['.....', '.....', '####.', '#...#', '#...#', '#...#', '#...#'],
    'o': ['.....', '.....', '.###.', '#...#', '#...#', '#...#', '.###.'],
    'p': ['.....', '.....', '####.', '#...#', '#...#', '#...#', '####.', '#....', '#....'],
    'q': ['.....', '.....', '.####', '#...#', '#...#', '#...#', '.####', '....#', '....#'],
    'r': ['....', '....', '#.##', '##..', '#...', '#...', '#...'],
    's': ['....', '....', '.###', '#...', '.##.', '...#', '###.'],
    't': ['.#..', '.#..', '####', '.#..', '.#..', '.#..', '..##'],
    'u': ['.....', '.....', '#...#', '#...#', '#...#', '#...#', '.####'],
    'v': ['.....', '.....', '#...#', '#...#', '#...#', '.#.#.', '..#..'],
    'w': ['.....', '.....', '#...#', '#...#', '#.#.#', '#.#.#', '.#.#.'],
    'x': ['.....', '.....', '#...#', '.#.#.', '..#..', '.#.#.', '#...#'],
    'y': ['.....', '.....', '#...#', '#...#', '#...#', '#...#', '.####', '....#', '.###.'],
    'z': ['.....', '.....', '#####', '...#.', '..#..', '.#...', '#####'],
    'dotlessi': ['.', '.', '#', '#', '#', '#', '#'],

    '0': ['.###.', '#...#', '#..##', '#.#.#', '##..#', '#...#', '.###.'],
    '1': ['.#.', '##.', '.#.', '.#.', '.#.', '.#.', '###'],
    '2': ['.###.', '#...#', '....#', '...#.', '..#..', '.#...', '#####'],
    '3': ['####.', '....#', '....#', '.###.', '....#', '....#', '####.'],
    '4': ['...#.', '..##.', '.#.#.', '#..#.', '#####', '...#.', '...#.'],
    '5': ['#####', '#....', '####.', '....#', '....#', '#...#', '.###.'],
    '6': ['..##.', '.#...', '#....', '####.', '#...#', '#...#', '.###.'],
    '7': ['#####', '....#', '...#.', '..#..', '.#...', '.#...', '.#...'],
    '8': ['.###.', '#...#', '#...#', '.###.', '#...#', '#...#', '.###.'],
    '9': ['.###.', '#...#', '#...#', '.####', '....#', '...#.', '.##..'],

    '!': ['#', '#', '#', '#', '#', '.', '#'],
    '"': ['#.#', '#.#', '...', '...', '...', '...', '...'],
    '#': ['.....', '.#.#.', '#####', '.#.#.', '#####', '.#.#.', '.....'],
    '$': ['..#..', '.####', '#.#..', '.###.', '..#.#', '####.', '..#..'],
    '%': ['##...', '##..#', '...#.', '..#..', '.#...', '#..##', '...##'],
    '&': ['.##..', '#..#.', '#.#..', '.#...', '#.#.#', '#..#.', '.##.#'],
    "'": ['#', '#', '.', '.', '.', '.', '.'],
    '(': ['..#', '.#.', '#..', '#..', '#..', '.#.', '..#'],
    ')': ['#..', '.#.', '..#', '..#', '..#', '.#.', '#..'],
    '*': ['.....', '..#..', '#.#.#', '.###.', '#.#.#', '..#..', '.....'],
    '+': ['.....', '..#..', '..#..', '#####', '..#..', '..#..', '.....'],
    ',': ['..', '..', '..', '..', '..', '.#', '.#', '#.'],
    '-': ['....', '....', '....', '####', '....', '....', '....'],
    '.': ['.', '.', '.', '.', '.', '.', '#'],
    '/': ['....#', '....#', '...#.', '..#..', '.#...', '#....', '#....'],
    ':': ['.', '.', '.', '#', '.', '.', '#'],
    ';': ['..', '..', '..', '.#', '..', '..', '.#', '#.'],
    '<': ['...#', '..#.', '.#..', '#...', '.#..', '..#.', '...#'],
    '=': ['.....', '.....', '#####', '.....', '#####', '.....', '.....'],
    '>': ['#...', '.#..', '..#.', '...#', '..#.', '.#..', '#...'],
    '?': ['.###.', '#...#', '....#', '...#.', '..#..', '.....', '..#..'],
    '@': ['.###.', '#...#', '#.###', '#.#.#', '#.###', '#....', '.####'],
    '[': ['###', '#..', '#..', '#..', '#..', '#..', '###'],
    '\\': ['#....', '#....', '.#...', '..#..', '...#.', '....#', '....#'],
    ']': ['###', '..#', '..#', '..#', '..#', '..#', '###'],
    '^': ['..#..', '.#.#.', '#...#', '.....', '.....', '.....', '.....'],
    '_': ['.....', '.....', '.....', '.....', '.....', '.....', '.....', '#####'],
    '`': ['#.', '.#', '..', '..', '..', '..', '..'],
    '{': ['..#', '.#.', '.#.', '#..', '.#.', '.#.', '..#'],
    '|': ['#', '#', '#', '#', '#', '#', '#', '#'],
    '}': ['#..', '.#.', '.#.', '..#', '.#.', '.#.', '#..'],
    '~': ['.....', '.....', '.#...', '#.#.#', '...#.', '.....', '.....'],

    chr(0x2013): ['....', '....', '....', '####', '....', '....', '....'],  # en dash
    chr(0x2014): ['......', '......', '......', '######', '......', '......', '......'],  # em dash
    chr(0x2018): ['.#', '#.', '#.', '..', '..', '..', '..'],  # left single quote
    chr(0x2019): ['.#', '.#', '#.', '..', '..', '..', '..'],  # right single quote
    chr(0x201C): ['.#.#', '#.#.', '#.#.', '....', '....', '....', '....'],  # left double quote
    chr(0x201D): ['.#.#', '.#.#', '#.#.', '....', '....', '....', '....'],  # right double quote
    chr(0x2026): ['.....', '.....', '.....', '.....', '.....', '.....', '#.#.#'],  # ellipsis
    chr(0x2022): ['...', '...', '.#.', '###', '.#.', '...', '...'],  # bullet
    chr(0x00B7): ['.', '.', '.', '#', '.', '.', '.'],  # middle dot
    chr(0x00B0): ['.#.', '#.#', '.#.', '...', '...', '...', '...'],  # degree
    chr(0x00D7): ['.....', '#...#', '.#.#.', '..#..', '.#.#.', '#...#', '.....'],  # multiply
    chr(0x00F7): ['.....', '..#..', '.....', '#####', '.....', '..#..', '.....'],  # divide
    chr(0x20AC): ['..###', '.#...', '####.', '.#...', '####.', '.#...', '..###'],  # euro
    chr(0x00A3): ['..##.', '.#..#', '.#...', '###..', '.#...', '.#...', '#####'],  # pound
    chr(0x00A1): ['.', '#', '.', '#', '#', '#', '#', '#'],  # inverted !
    chr(0x00BF): ['.....', '..#..', '.....', '..#..', '.#...', '#....', '#...#', '.###.'],  # inverted ?
    chr(0x00AB): ['.....', '..#.#', '.#.#.', '#.#..', '.#.#.', '..#.#', '.....'],  # «
    chr(0x00BB): ['.....', '#.#..', '.#.#.', '..#.#', '.#.#.', '#.#..', '.....'],  # »
    chr(0x2192): ['.....', '..#..', '...#.', '#####', '...#.', '..#..', '.....'],  # →
    chr(0x2190): ['.....', '..#..', '.#...', '#####', '.#...', '..#..', '.....'],  # ←
    chr(0x2191): ['..#..', '.###.', '#.#.#', '..#..', '..#..', '..#..', '..#..'],  # ↑
    chr(0x2193): ['..#..', '..#..', '..#..', '..#..', '#.#.#', '.###.', '..#..'],  # ↓
    chr(0x2713): ['.....', '.....', '....#', '...#.', '#.#..', '.#...', '.....'],  # ✓
    chr(0x00AA): ['.##', '#.#', '.##', '###', '...', '...', '...'],  # ª
    chr(0x00BA): ['.#.', '#.#', '.#.', '###', '...', '...', '...'],  # º
    chr(0x00B1): ['.....', '..#..', '..#..', '#####', '..#..', '..#..', '#####'],  # ±
}

# Two-row marks, top row first, placed over a base with one clear row between.
MARKS = {
    'grave': ['#.', '.#'],
    'acute': ['.#', '#.'],
    'circumflex': ['.#.', '#.#'],
    'tilde': ['.#.#', '#.#.'],
    'dieresis': ['#.#'],
}

# Accented letter -> (base glyph, mark). The cedilla is handled separately.
COMPOSITES = {
    chr(0x00C0): ('A', 'grave'),
    chr(0x00C1): ('A', 'acute'),
    chr(0x00C2): ('A', 'circumflex'),
    chr(0x00C3): ('A', 'tilde'),
    chr(0x00C4): ('A', 'dieresis'),
    chr(0x00C8): ('E', 'grave'),
    chr(0x00C9): ('E', 'acute'),
    chr(0x00CA): ('E', 'circumflex'),
    chr(0x00CB): ('E', 'dieresis'),
    chr(0x00CC): ('I', 'grave'),
    chr(0x00CD): ('I', 'acute'),
    chr(0x00CE): ('I', 'circumflex'),
    chr(0x00CF): ('I', 'dieresis'),
    chr(0x00D1): ('N', 'tilde'),
    chr(0x00D2): ('O', 'grave'),
    chr(0x00D3): ('O', 'acute'),
    chr(0x00D4): ('O', 'circumflex'),
    chr(0x00D5): ('O', 'tilde'),
    chr(0x00D6): ('O', 'dieresis'),
    chr(0x00D9): ('U', 'grave'),
    chr(0x00DA): ('U', 'acute'),
    chr(0x00DB): ('U', 'circumflex'),
    chr(0x00DC): ('U', 'dieresis'),
    chr(0x00DD): ('Y', 'acute'),
    chr(0x00E0): ('a', 'grave'),
    chr(0x00E1): ('a', 'acute'),
    chr(0x00E2): ('a', 'circumflex'),
    chr(0x00E3): ('a', 'tilde'),
    chr(0x00E4): ('a', 'dieresis'),
    chr(0x00E8): ('e', 'grave'),
    chr(0x00E9): ('e', 'acute'),
    chr(0x00EA): ('e', 'circumflex'),
    chr(0x00EB): ('e', 'dieresis'),
    chr(0x00EC): ('dotlessi', 'grave'),
    chr(0x00ED): ('dotlessi', 'acute'),
    chr(0x00EE): ('dotlessi', 'circumflex'),
    chr(0x00EF): ('dotlessi', 'dieresis'),
    chr(0x00F1): ('n', 'tilde'),
    chr(0x00F2): ('o', 'grave'),
    chr(0x00F3): ('o', 'acute'),
    chr(0x00F4): ('o', 'circumflex'),
    chr(0x00F5): ('o', 'tilde'),
    chr(0x00F6): ('o', 'dieresis'),
    chr(0x00F9): ('u', 'grave'),
    chr(0x00FA): ('u', 'acute'),
    chr(0x00FB): ('u', 'circumflex'),
    chr(0x00FC): ('u', 'dieresis'),
    chr(0x00FD): ('y', 'acute'),
    chr(0x00FF): ('y', 'dieresis'),
}

CEDILLA = {chr(0x00C7): 'C', chr(0x00E7): 'c'}

# ---------------------------------------------------------------------------
# Pixels
# ---------------------------------------------------------------------------

Pixels = set[tuple[int, int]]


def pixels_of(rows: list[str]) -> Pixels:
    """Rows (top first, row 6 on the baseline) to a set of (x, y) with y up."""
    found: Pixels = set()
    for index, row in enumerate(rows):
        y = 6 - index
        for x, mark in enumerate(row):
            if mark == '#':
                found.add((x, y))
    return found


def width_of(rows: list[str]) -> int:
    return max(len(row) for row in rows)


def top_of(pixels: Pixels) -> int:
    return max(y for _, y in pixels)


def with_mark(base: list[str], mark: list[str]) -> Pixels:
    body = pixels_of(base)
    width = width_of(base)
    mark_width = max(len(row) for row in mark)
    # Centred on the base, rounding towards the left on an odd difference.
    dx = (width - mark_width) // 2
    # One clear row above the base's own top (the x-height for lowercase, the
    # cap height for capitals), then the mark, bottom row first.
    base_top = top_of(body)
    bottom = base_top + 2
    placed = set(body)
    for index, row in enumerate(reversed(mark)):
        for x, char in enumerate(row):
            if char == '#':
                placed.add((x + dx, bottom + index))
    return placed


def with_cedilla(base: list[str]) -> Pixels:
    body = pixels_of(base)
    centre = width_of(base) // 2
    return body | {(centre, -1), (centre - 1, -2), (centre, -2)}


def embolden(pixels: Pixels) -> Pixels:
    """A pixel bold: every pixel doubled to its right."""
    return pixels | {(x + 1, y) for x, y in pixels}


def embolden_stems(pixels: Pixels, width: int) -> tuple[Pixels, int]:
    """
    A pixel bold for glyphs whose counters are one pixel wide.

    Doubling every pixel to its right closes a one-pixel gap, which turns an
    `m` into a solid block and a pair of quotes into a bar. Here only the
    *stem* columns — columns with two or more pixels stacked — are doubled,
    by inserting a copy of each beside it, so every stem is two pixels wide and
    every gap between them stays open. The glyph grows by one pixel per stem.
    """
    stems = sorted({x for x, y in pixels if (x, y + 1) in pixels or (x, y - 1) in pixels})
    shift: dict[int, int] = {}
    offset = 0
    for x in range(min(x for x, _ in pixels), width):
        shift[x] = x + offset
        if x in stems:
            offset += 1
    widened: Pixels = set()
    for x, y in pixels:
        widened.add((shift[x], y))
        if x in stems:
            widened.add((shift[x] + 1, y))
    return widened, width + len(stems)


# Glyphs whose counters would close under the plain bold; see `embolden_stems`.
BOLD_BY_STEMS = set('mwMW#"') | {chr(0x201C), chr(0x201D)}

# Glyphs with no stems to double, drawn bold by hand.
BOLD_ROWS: dict[str, list[str]] = {
    chr(0x2026): ['........', '........', '........', '........', '........', '........', '##.##.##'],
    chr(0x00AB): ['.......', '..##.##', '.##.##.', '##.##..', '.##.##.', '..##.##', '.......'],
    chr(0x00BB): ['.......', '##.##..', '.##.##.', '..##.##', '.##.##.', '##.##..', '.......'],
}


def bolden(char: str, pixels: Pixels, width: int) -> tuple[Pixels, int]:
    if char in BOLD_ROWS:
        return pixels_of(BOLD_ROWS[char]), width_of(BOLD_ROWS[char])
    if char in BOLD_BY_STEMS:
        return embolden_stems(pixels, width)
    return embolden(pixels), width + 1


# ---------------------------------------------------------------------------
# Tracing
# ---------------------------------------------------------------------------

def contours_of(pixels: Pixels) -> list[list[tuple[int, int]]]:
    """
    The union of the pixels as closed contours, in pixel units.

    Each pixel contributes its four edges clockwise (y up: up the left, along
    the top, down the right, back along the bottom). An edge shared by two
    pixels appears once in each direction and cancels; what is left is the
    boundary, already oriented — clockwise around ink, anticlockwise around
    counters.
    """
    edges: set[tuple[tuple[int, int], tuple[int, int]]] = set()
    for x, y in pixels:
        for edge in (
            ((x, y), (x, y + 1)),
            ((x, y + 1), (x + 1, y + 1)),
            ((x + 1, y + 1), (x + 1, y)),
            ((x + 1, y), (x, y)),
        ):
            reverse = (edge[1], edge[0])
            if reverse in edges:
                edges.remove(reverse)
            else:
                edges.add(edge)

    outgoing: dict[tuple[int, int], list[tuple[int, int]]] = defaultdict(list)
    for start, end in edges:
        outgoing[start].append(end)

    def turn_right_first(previous: tuple[int, int], at: tuple[int, int],
                         options: list[tuple[int, int]]) -> tuple[int, int]:
        # Where two pixels touch only at a corner, the vertex has two ways out.
        # Taking the sharpest right turn keeps each pixel group its own closed
        # contour instead of one figure-of-eight through the shared corner.
        dx, dy = at[0] - previous[0], at[1] - previous[1]
        right = (dy, -dx)
        for option in options:
            if (option[0] - at[0], option[1] - at[1]) == right:
                return option
        return options[0]

    loops = []
    while outgoing:
        start = next(iter(outgoing))
        loop = [start]
        current = outgoing[start].pop()
        if not outgoing[start]:
            del outgoing[start]
        previous = start
        while current != start:
            loop.append(current)
            options = outgoing[current]
            following = options[0] if len(options) == 1 else turn_right_first(previous, current, options)
            options.remove(following)
            if not options:
                del outgoing[current]
            previous, current = current, following
        loops.append(simplify(loop))
    return loops


def simplify(loop: list[tuple[int, int]]) -> list[tuple[int, int]]:
    """Drops the points that lie on a straight run between their neighbours."""
    kept = []
    count = len(loop)
    for index, point in enumerate(loop):
        before = loop[index - 1]
        after = loop[(index + 1) % count]
        if (point[0] - before[0]) * (after[1] - point[1]) != (point[1] - before[1]) * (after[0] - point[0]):
            kept.append(point)
    return kept


def draw_glyph(pixels: Pixels):
    pen = TTGlyphPen(None)
    for loop in contours_of(pixels):
        pen.moveTo((loop[0][0] * PX, loop[0][1] * PX))
        for x, y in loop[1:]:
            pen.lineTo((x * PX, y * PX))
        pen.closePath()
    return pen.glyph()


# ---------------------------------------------------------------------------
# Assembly
# ---------------------------------------------------------------------------

def glyph_name(char: str) -> str:
    if len(char) > 1:
        return char
    return f'uni{ord(char):04X}'


def build(bold: bool) -> TTFont:
    entries: dict[str, tuple[Pixels, int]] = {}

    for char, rows in G.items():
        entries[char] = (pixels_of(rows), width_of(rows))
    for char, (base, mark) in COMPOSITES.items():
        entries[char] = (with_mark(G[base], MARKS[mark]), width_of(G[base]))
    for char, base in CEDILLA.items():
        entries[char] = (with_cedilla(G[base]), width_of(G[base]))

    glyphs = {'.notdef': TTGlyphPen(None).glyph(), 'space': TTGlyphPen(None).glyph()}
    metrics = {'.notdef': (500, 0), 'space': (400 + (100 if bold else 0), 0)}
    cmap = {0x20: 'space', 0xA0: 'space', 0x131: 'dotlessi'}

    for char, (pixels, width) in entries.items():
        name = glyph_name(char)
        if bold:
            pixels, width = bolden(char, pixels, width)
        glyphs[name] = draw_glyph(pixels)
        lsb = min(x for x, _ in pixels) * PX
        metrics[name] = ((width + 1) * PX, lsb)
        if len(char) == 1:
            cmap[ord(char)] = name

    order = ['.notdef', 'space'] + [name for name in glyphs if name not in ('.notdef', 'space')]

    builder = FontBuilder(UPM, isTTF=True)
    builder.setupGlyphOrder(order)
    builder.setupCharacterMap(cmap)
    builder.setupGlyf(glyphs)
    builder.setupHorizontalMetrics(metrics)
    builder.setupHorizontalHeader(ascent=ASCENT, descent=-DESCENT, lineGap=0)
    style = 'Bold' if bold else 'Regular'
    builder.setupNameTable({
        'familyName': FAMILY,
        'styleName': style,
        'uniqueFontIdentifier': f'TaskStudio:{FAMILY}-{style}:2026',
        'fullName': f'{FAMILY} {style}',
        'psName': f'StudioPixel-{style}',
        'version': 'Version 1.000',
        'copyright': 'Copyright 2026 Task Studio. Drawn for the Pixel skin.',
        'licenseDescription': 'Part of Task Studio; licensed with the application.',
    })
    builder.setupOS2(
        version=4,
        sTypoAscender=ASCENT,
        sTypoDescender=-DESCENT,
        sTypoLineGap=0,
        usWinAscent=ASCENT,
        usWinDescent=DESCENT,
        sxHeight=500,
        sCapHeight=700,
        usWeightClass=700 if bold else 400,
        # USE_TYPO_METRICS, plus BOLD or REGULAR.
        fsSelection=(1 << 7) | ((1 << 5) if bold else (1 << 6)),
        achVendID='TSTD',
    )
    builder.setupPost(isFixedPitch=0)
    # macStyle bit 0 is bold; it has to agree with fsSelection.
    builder.font['head'].macStyle = 1 if bold else 0
    return builder.font


def main() -> None:
    os.makedirs(SERVED, exist_ok=True)

    for bold, stem in ((False, 'studio-pixel'), (True, 'studio-pixel-bold')):
        font = build(bold)
        font.flavor = 'woff2'
        for folder in (HERE, SERVED):
            font.save(os.path.join(folder, f'{stem}.woff2'))
        # A plain TrueType beside the script, for the preview only.
        font.flavor = None
        font.save(os.path.join(HERE, f'{stem}.ttf'))
        size = os.path.getsize(os.path.join(HERE, f'{stem}.woff2'))
        print(f'{stem}.woff2: {len(font.getGlyphOrder())} glyphs, {size} bytes')

    try:
        from PIL import Image, ImageDraw, ImageFont
    except ImportError:
        return

    sample = [
        'The quick brown fox jumps over the lazy dog.',
        'THE QUICK BROWN FOX JUMPS OVER THE LAZY DOG',
        '0123456789 !?&@#$%*()[]{}<>+-=/\\|_:;,.\'"',
        'Configurações, Conexões, Ação, você, está — “aspas” … → ✓',
    ]
    image = Image.new('RGB', (1500, 420), 'white')
    draw = ImageDraw.Draw(image)
    y = 12
    for stem in ('studio-pixel', 'studio-pixel-bold'):
        face = ImageFont.truetype(os.path.join(HERE, f'{stem}.ttf'), 30)
        for line in sample:
            draw.text((14, y), line, fill='black', font=face)
            y += 48
        y += 10
    image.save(os.path.join(HERE, 'preview.png'))

    for stem in ('studio-pixel', 'studio-pixel-bold'):
        os.remove(os.path.join(HERE, f'{stem}.ttf'))


if __name__ == '__main__':
    main()
