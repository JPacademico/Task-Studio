#!/usr/bin/env python3
"""
Builds `studio-runic.woff2` and `studio-runic-bold.woff2` — the Runic skin's
typeface.

Run from the repository root:

    python custom-font/runic/build-studio-runic.py

It writes both fonts to `custom-font/runic/` (the archive copy) and to
`public/fonts/runic/` (the served copy), plus `preview.png` beside this file.
Requires fontTools and brotli (`pip install fonttools brotli`), numpy, and
Pillow. Nothing in the application runs this; it produces two files.

## Why the skin draws its own face

The Runic skin named 'Norse' first in all three of its font stacks — and no
file for it was ever shipped, so every visitor fell through to Bahnschrift, a
DIN-style engineering sans. The skin's colours, borders and ornaments said
"carved"; its letters said "motorway sign". The runes themselves (the Elder
Futhark labels `RunicText` draws) were never the problem — they have their own
face. The Latin was.

Sourcing a carved face was the first option and the wrong one. The obvious
candidates are display faces with personal-use or unclear web licences, and
`custom-font/README.md` is explicit that a face whose licence does not permit
web embedding does not go in this repository whatever it looks like. So this
one is drawn here, the same way the Pixel face is: original work, shipped
under the application's own terms.

## What it is

A carved Latin: every stroke straight, every curve replaced by a facet, the
way letters come out when they are cut into wood or stone with a blade rather
than written with a pen. Three runes lend their shapes to Latin letters that
already look like them — ᛒ to **B**, ᚱ to **R**, ᚹ to **P** — and **O** is the
long hexagon a carver makes of a circle. Wherever a stroke meets the cap
height, the x-height or the baseline it is cut *flat*, along the line, which is
the single detail that most makes a face read as carved rather than drawn.

It is also a face that has to set a task list, not just a heading. So:

  * **A real lowercase**, not small capitals. An interface is mostly
    lowercase, and a face without one is a face nobody can read a paragraph
    in. Every lowercase letter keeps the ordinary skeleton people read by —
    only the curves are facetted.
  * **UI proportions.** Cap height 0.70 em and x-height 0.51 em, within a
    hundredth of Bahnschrift, the face it replaces — so nothing in a layout
    that fitted before overflows now.
  * **An `l` with a foot**, so it never reads as a capital `I` in a label.
  * **Tabular figures by default**: every digit has the same advance, so a
    column of counts lines up without `tabular-nums` having to find a feature.
  * **Latin-1 accents**, composed from the face's own marks, because the
    Portuguese interface needs a cedilla or a tilde in almost every label and
    a missing glyph renders as the *next* font in the stack in the middle of a
    word.

## How the outlines are made

Each glyph is drawn as stroke centrelines — polylines with a width, mitred
where they turn — and the outline is their *union*. There is no polygon-union
library in this toolchain, and a glyph shipped as a pile of overlapping
contours renders with seams and darkened joins on some rasterisers, so the
union is computed by painting: every stroke is rasterised at 2 pixels per font
unit (union is simply "painted by any stroke"), the painted region is traced
back into closed contours along pixel edges, and Ramer–Douglas–Peucker
collapses each staircase back into the straight edge it came from. At this
resolution the recovered edges are within a fraction of a font unit of the
drawn geometry, and every diagonal comes out as one clean segment.

The flat cuts fall out of the same step: each glyph has a vertical band — the
baseline to the cap height, the x-height or an ascender — and anything painted
outside it is cleared before tracing. A stroke is simply drawn past the line
and the band cuts it square.

## Weights

Two, because the interface asks for two: 400 for running text and 700 for
`font-semibold` and headings. The drawings are identical; only the stroke
width changes (84 and 124 units), which is how a carver makes a heavier letter
— a wider blade, the same cuts.
"""

from __future__ import annotations

import math
import os
import unicodedata
from dataclasses import dataclass

import numpy as np
from fontTools.fontBuilder import FontBuilder
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.ttLib.tables._g_l_y_f import Glyph, GlyphComponent
from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
UI_ROOT = os.path.dirname(os.path.dirname(HERE))
SERVED = os.path.join(UI_ROOT, 'public', 'fonts', 'runic')

FAMILY = 'Studio Runic'
UPM = 1000

CAP = 700
XH = 510
ASC = 740
DESC = -210

# Line metrics: room above a capital for its accent, and below for a descender.
ASCENT = 950
DESCENT = 250

SCALE = 2  # raster pixels per font unit
TOLERANCE = 1.3  # RDP tolerance, in raster pixels

# How far a chisel cut leans (as a fraction of half the stroke) and how far the
# cut sits past the drawn end. See `Stroke.cap`.
CHISEL_LEAN = 0.75
CHISEL_REACH = 0.45

# How much narrower than drawn each group is set. Condensing is done here,
# once, by scaling the centrelines — the stroke keeps its width — rather than
# by re-measuring eighty drawings: a carved face is tall and narrow, because a
# blade cuts downward strokes more easily than long horizontals.
CONDENSE = {'upper': 0.86, 'lower': 0.9, 'figure': 0.9}

WEIGHTS = {
    'regular': {'stroke': 84, 'sb': 46, 'space': 250},
    'bold': {'stroke': 124, 'sb': 42, 'space': 260},
}


# ---------------------------------------------------------------------------
# Drawing primitives
# ---------------------------------------------------------------------------


@dataclass
class Stroke:
    points: list[tuple[float, float]]
    closed: bool = False
    # How a free end is finished. `chisel` (the default) cuts it on a slant,
    # the way a blade leaves the end of a groove, and is most of what makes
    # the face read as carved; `square` extends it by half the width; `butt`
    # stops at it. Ends that meet the band are cut flat by it regardless.
    cap: str = 'chisel'
    # Width as a fraction of the weight's stroke — marks are drawn finer.
    scale: float = 1.0
    # Mitre limit, as a multiple of half the width. Past it, a bevel.
    limit: float = 4.0


@dataclass
class Poly:
    """A filled convex shape — the dots, drawn as lozenges."""

    points: list[tuple[float, float]]


@dataclass
class GlyphDef:
    bw: float
    parts: list
    band: tuple[float, float] | None
    sb: float | None = None
    advance: float | None = None
    mark: bool = False


def S(*points, **options) -> Stroke:
    return Stroke(list(points), **options)


def line_at(p, q, y):
    """The point on the line through p and q at height y."""
    (x0, y0), (x1, y1) = p, q
    if y1 == y0:
        return (x0, y)
    return (x0 + (x1 - x0) * (y - y0) / (y1 - y0), y)


def lozenge(cx, cy, r):
    return Poly([(cx, cy + r), (cx + r * 0.82, cy), (cx, cy - r), (cx - r * 0.82, cy)])


def transformed(parts, sx=1.0, sy=1.0, dx=0.0, dy=0.0, keep_width=False):
    """Scaled and moved copies of some parts — superscripts, rotations.

    `keep_width` leaves the stroke as wide as it was, which is what condensing
    wants; otherwise a scaled-down copy (a superscript) gets a finer stroke.
    """
    out = []
    for part in parts:
        points = [(x * sx + dx, y * sy + dy) for x, y in part.points]
        if isinstance(part, Stroke):
            scale = part.scale if keep_width else part.scale * min(abs(sx), abs(sy)) ** 0.35
            out.append(Stroke(points, part.closed, part.cap, scale, part.limit))
        else:
            out.append(Poly(points))
    return out


# ---------------------------------------------------------------------------
# The drawings
# ---------------------------------------------------------------------------


def define(W: float) -> dict[str, GlyphDef]:
    """Every glyph, drawn for a stroke of width W.

    Coordinates are stroke *centrelines*, with x = 0 at the left edge of the
    letter's body and `bw` at its right. A line meant to sit on the cap height
    is drawn at `t` (half a stroke below it) so its top edge lands on the line;
    anything meant to be cut by a line is drawn past it and cut by the band.
    """
    h = W / 2
    t, b = CAP - h, h
    xt = XH - h
    R = W * 0.8  # lozenge dots
    over = W * 1.5  # how far past a line a stroke is drawn to be cut by it

    g: dict[str, GlyphDef] = {}
    caps = (0, CAP)
    pointed = (-0.4 * h, CAP + 0.4 * h)
    low = (0, XH)
    tall = (0, ASC)
    deep = (DESC, XH)

    def hexagon(bw, top, bottom, shoulder):
        """A carver's O: a long hexagon, pointed at the top and the bottom.

        The points are drawn a stroke's width inside the lines so that their
        tips — the mitre — land just past them, the way a round letter
        overshoots in any face. The glyph's band is widened to let them.
        """
        height = top - bottom
        return S(
            (bw / 2, top - h),
            (bw, bottom + height * (1 - shoulder)),
            (bw, bottom + height * shoulder),
            (bw / 2, bottom + h),
            (0, bottom + height * shoulder),
            (0, bottom + height * (1 - shoulder)),
            closed=True,
        )

    # ---- Capitals -----------------------------------------------------------

    bw = 470
    apex = (bw / 2, CAP)
    left_leg = line_at(apex, (0, 0), -over)
    right_leg = line_at(apex, (bw, 0), -over)
    bar = 245
    g['A'] = GlyphDef(bw, [
        S(left_leg, apex, right_leg),
        S(line_at(apex, (0, 0), bar), line_at(apex, (bw, 0), bar), cap='butt'),
    ], caps, sb=24)

    bw = 400
    g['B'] = GlyphDef(bw, [
        S((0, -over), (0, CAP + over)),
        S((0, CAP), (bw * 0.9, CAP * 0.73), (0, CAP * 0.48), cap='butt'),
        S((0, CAP * 0.48), (bw, CAP * 0.245), (0, 0), cap='butt'),
    ], caps)

    bw = 400
    g['C'] = GlyphDef(bw, [
        S((bw, t), (bw * 0.36, t), (0, CAP * 0.6), (0, CAP * 0.4), (bw * 0.36, b), (bw, b)),
    ], caps)

    bw = 420
    g['D'] = GlyphDef(bw, [
        S((0, -over), (0, CAP + over)),
        S((0, t), (bw * 0.52, t), (bw, CAP * 0.6), (bw, CAP * 0.4), (bw * 0.52, b), (0, b),
          cap='butt'),
    ], caps)

    bw = 360
    g['E'] = GlyphDef(bw, [
        S((bw, t), (0, t), (0, b), (bw, b)),
        S((0, CAP * 0.5), (bw * 0.8, CAP * 0.5)),
    ], caps)

    bw = 350
    g['F'] = GlyphDef(bw, [
        S((bw, t), (0, t), (0, -over)),
        S((0, CAP * 0.49), (bw * 0.8, CAP * 0.49)),
    ], caps)

    bw = 420
    g['G'] = GlyphDef(bw, [
        S((bw, t), (bw * 0.36, t), (0, CAP * 0.6), (0, CAP * 0.4), (bw * 0.36, b), (bw, b),
          (bw, CAP * 0.44), (bw * 0.52, CAP * 0.44)),
    ], caps)

    bw = 420
    g['H'] = GlyphDef(bw, [
        S((0, -over), (0, CAP + over)),
        S((bw, -over), (bw, CAP + over)),
        S((0, CAP * 0.5), (bw, CAP * 0.5), cap='butt'),
    ], caps)

    g['I'] = GlyphDef(0, [S((0, -over), (0, CAP + over))], caps)

    bw = 340
    g['J'] = GlyphDef(bw, [
        S((bw, CAP + over), (bw, CAP * 0.28), (bw * 0.66, b), (bw * 0.24, b), (0, CAP * 0.24)),
    ], caps)

    bw = 400
    arm_top = (bw, CAP)
    arm_foot = (0, CAP * 0.4)
    leg_from = (bw * 0.3, CAP * 0.4 + (CAP - CAP * 0.4) * 0.3)
    g['K'] = GlyphDef(bw, [
        S((0, -over), (0, CAP + over)),
        S(line_at(arm_foot, arm_top, CAP + over), arm_foot, cap='butt'),
        S(leg_from, line_at(leg_from, (bw, 0), -over), cap='butt'),
    ], caps)

    bw = 340
    g['L'] = GlyphDef(bw, [S((0, CAP + over), (0, b), (bw, b))], caps)

    bw = 530
    g['M'] = GlyphDef(bw, [
        S((0, -over), (0, CAP), (bw / 2, CAP * 0.3), (bw, CAP), (bw, -over), limit=3.0),
    ], caps)

    bw = 420
    g['N'] = GlyphDef(bw, [S((0, -over), (0, CAP), (bw, 0), (bw, CAP + over))], caps)

    bw = 440
    g['O'] = GlyphDef(bw, [hexagon(bw, CAP, 0, 0.24)], pointed)

    bw = 390
    g['P'] = GlyphDef(bw, [
        S((0, -over), (0, CAP + over)),
        S((0, CAP), (bw, CAP * 0.71), (0, CAP * 0.42), cap='butt'),
    ], caps)

    bw = 440
    g['Q'] = GlyphDef(bw, [
        hexagon(bw, CAP, 0, 0.24),
        S((bw * 0.55, CAP * 0.3), line_at((bw * 0.55, CAP * 0.3), (bw * 0.98, -40), -200),
          cap='butt'),
    ], (-120, CAP + 0.4 * h))

    bw = 410
    g['R'] = GlyphDef(bw, [
        S((0, -over), (0, CAP + over)),
        S((0, CAP), (bw * 0.95, CAP * 0.73), (0, CAP * 0.46), cap='butt'),
        S((0, CAP * 0.46), line_at((0, CAP * 0.46), (bw, 0), -over), cap='butt'),
    ], caps)

    bw = 400
    g['S'] = GlyphDef(bw, [
        S((bw, t), (bw * 0.26, t), (0, CAP * 0.68), (bw, CAP * 0.32), (bw * 0.74, b), (0, b)),
    ], caps)

    bw = 440
    g['T'] = GlyphDef(bw, [
        S((0, t), (bw, t)),
        S((bw / 2, t), (bw / 2, -over), cap='butt'),
    ], caps, sb=30)

    bw = 420
    g['U'] = GlyphDef(bw, [
        S((0, CAP + over), (0, CAP * 0.26), (bw * 0.3, b), (bw * 0.7, b), (bw, CAP * 0.26),
          (bw, CAP + over)),
    ], caps)

    bw = 470
    bottom = (bw / 2, 0)
    g['V'] = GlyphDef(bw, [
        S(line_at(bottom, (0, CAP), CAP + over), bottom, line_at(bottom, (bw, CAP), CAP + over)),
    ], caps, sb=24)

    bw = 670
    w1, w2, w3 = (bw * 0.25, 0), (bw * 0.5, CAP * 0.66), (bw * 0.75, 0)
    g['W'] = GlyphDef(bw, [
        S(line_at(w1, (0, CAP), CAP + over), w1, w2, w3, line_at(w3, (bw, CAP), CAP + over),
          limit=3.0),
    ], caps, sb=24)

    bw = 450
    g['X'] = GlyphDef(bw, [
        S(line_at((0, 0), (bw, CAP), -over), line_at((0, 0), (bw, CAP), CAP + over)),
        S(line_at((bw, 0), (0, CAP), -over), line_at((bw, 0), (0, CAP), CAP + over)),
    ], caps, sb=26)

    bw = 460
    fork = (bw / 2, CAP * 0.44)
    g['Y'] = GlyphDef(bw, [
        S(line_at(fork, (0, CAP), CAP + over), fork, line_at(fork, (bw, CAP), CAP + over)),
        S(fork, (bw / 2, -over), cap='butt'),
    ], caps, sb=24)

    bw = 400
    g['Z'] = GlyphDef(bw, [S((0, t), (bw, t), (0, b), (bw, b), limit=2.2)], caps)

    # ---- Lowercase ----------------------------------------------------------

    bw = 330
    g['a'] = GlyphDef(bw, [
        S((bw * 0.08, xt), (bw * 0.72, xt), (bw, XH * 0.78), (bw, -over)),
        S((bw, XH * 0.56), (bw * 0.38, XH * 0.56), (0, XH * 0.4), (0, XH * 0.2),
          (bw * 0.38, b), (bw, b), cap='butt'),
    ], low)

    bw = 350
    g['b'] = GlyphDef(bw, [
        S((0, -over), (0, ASC + over)),
        S((0, xt), (bw * 0.54, xt), (bw, XH * 0.64), (bw, XH * 0.36), (bw * 0.54, b), (0, b),
          cap='butt'),
    ], tall)

    bw = 310
    g['c'] = GlyphDef(bw, [
        S((bw, xt), (bw * 0.38, xt), (0, XH * 0.64), (0, XH * 0.36), (bw * 0.38, b), (bw, b)),
    ], low)

    bw = 350
    g['d'] = GlyphDef(bw, [
        S((bw, -over), (bw, ASC + over)),
        S((bw, xt), (bw * 0.46, xt), (0, XH * 0.64), (0, XH * 0.36), (bw * 0.46, b), (bw, b),
          cap='butt'),
    ], tall)

    bw = 330
    g['e'] = GlyphDef(bw, [
        S((0, XH * 0.5), (bw, XH * 0.5), (bw, XH * 0.7), (bw * 0.68, xt), (bw * 0.38, xt),
          (0, XH * 0.66), (0, XH * 0.34), (bw * 0.38, b), (bw, b)),
    ], low)

    bw = 260
    g['f'] = GlyphDef(bw, [
        S((bw, ASC - h), (140, ASC - h), (70, ASC - h - 70), (70, -over)),
        S((0, xt), (bw * 0.9, xt)),
    ], tall, sb=34)

    bw = 350
    g['g'] = GlyphDef(bw, [
        S((bw, xt), (bw * 0.46, xt), (0, XH * 0.64), (0, XH * 0.36), (bw * 0.46, b), (bw, b),
          cap='butt'),
        S((bw, XH + over), (bw, DESC * 0.6), (bw * 0.66, DESC + h), (bw * 0.06, DESC + h)),
    ], deep)

    bw = 350
    g['h'] = GlyphDef(bw, [
        S((0, -over), (0, ASC + over)),
        S((0, xt), (bw * 0.66, xt), (bw, XH * 0.72), (bw, -over), cap='butt'),
    ], tall)

    g['i'] = GlyphDef(0, [S((0, XH - h), (0, -over)), lozenge(0, XH + 150 + R * 0.4, R)],
                      (0, ASC + 80))
    g['dotlessi'] = GlyphDef(0, [S((0, XH - h), (0, -over))], low)

    bw = 150
    g['j'] = GlyphDef(bw, [
        S((bw, XH - h), (bw, DESC * 0.55), (bw * 0.45, DESC + h), (0, DESC + h)),
        lozenge(bw, XH + 150 + R * 0.4, R),
    ], (DESC, ASC + 80), sb=30)

    bw = 330
    arm_top = (bw, XH)
    arm_foot = (0, XH * 0.38)
    leg_from = (bw * 0.32, XH * 0.38 + (XH - XH * 0.38) * 0.32)
    g['k'] = GlyphDef(bw, [
        S((0, -over), (0, ASC + over)),
        S(line_at(arm_foot, arm_top, XH + over), arm_foot, cap='butt'),
        S(leg_from, line_at(leg_from, (bw, 0), -over), cap='butt'),
    ], tall)

    bw = 110
    g['l'] = GlyphDef(bw, [S((0, ASC + over), (0, b + 46), (bw, b))], tall, sb=40)

    bw = 560
    g['m'] = GlyphDef(bw, [
        S((0, -over), (0, xt), (bw * 0.38, xt), (bw * 0.5, XH * 0.76), (bw * 0.5, -over)),
        S((bw * 0.5, XH * 0.76), (bw * 0.62, xt), (bw * 0.86, xt), (bw, XH * 0.76), (bw, -over),
          cap='butt'),
    ], low)

    bw = 350
    g['n'] = GlyphDef(bw, [
        S((0, -over), (0, xt), (bw * 0.66, xt), (bw, XH * 0.72), (bw, -over)),
    ], low)

    bw = 360
    g['o'] = GlyphDef(bw, [hexagon(bw, XH, 0, 0.26)], (-0.4 * h, XH + 0.4 * h))

    bw = 350
    g['p'] = GlyphDef(bw, [
        S((0, DESC - over), (0, XH + over)),
        S((0, xt), (bw * 0.54, xt), (bw, XH * 0.64), (bw, XH * 0.36), (bw * 0.54, b), (0, b),
          cap='butt'),
    ], deep)

    bw = 350
    g['q'] = GlyphDef(bw, [
        S((bw, DESC - over), (bw, XH + over)),
        S((bw, xt), (bw * 0.46, xt), (0, XH * 0.64), (0, XH * 0.36), (bw * 0.46, b), (bw, b),
          cap='butt'),
    ], deep)

    bw = 250
    g['r'] = GlyphDef(bw, [
        S((0, -over), (0, XH + over)),
        S((0, XH * 0.5), (bw * 0.42, xt), (bw, xt), cap='butt'),
    ], low)

    bw = 310
    g['s'] = GlyphDef(bw, [
        S((bw, xt), (bw * 0.26, xt), (0, XH * 0.68), (bw, XH * 0.32), (bw * 0.74, b), (0, b)),
    ], low)

    bw = 260
    g['t'] = GlyphDef(bw, [
        S((70, ASC * 0.93), (70, b + 60), (140, b), (bw, b)),
        S((0, xt), (bw * 0.9, xt)),
    ], tall, sb=34)

    bw = 350
    g['u'] = GlyphDef(bw, [
        S((0, XH + over), (0, XH * 0.28), (bw * 0.34, b), (bw, b), cap='square'),
        S((bw, XH + over), (bw, -over)),
    ], low)

    bw = 380
    bottom = (bw / 2, 0)
    g['v'] = GlyphDef(bw, [
        S(line_at(bottom, (0, XH), XH + over), bottom, line_at(bottom, (bw, XH), XH + over)),
    ], low, sb=24)

    bw = 590
    w1, w2, w3 = (bw * 0.25, 0), (bw * 0.5, XH * 0.68), (bw * 0.75, 0)
    g['w'] = GlyphDef(bw, [
        S(line_at(w1, (0, XH), XH + over), w1, w2, w3, line_at(w3, (bw, XH), XH + over),
          limit=3.0),
    ], low, sb=24)

    bw = 360
    g['x'] = GlyphDef(bw, [
        S(line_at((0, 0), (bw, XH), -over), line_at((0, 0), (bw, XH), XH + over)),
        S(line_at((bw, 0), (0, XH), -over), line_at((bw, 0), (0, XH), XH + over)),
    ], low, sb=26)

    bw = 380
    tail = (bw * 0.14, DESC)
    meet = line_at((bw, XH), tail, 0)
    g['y'] = GlyphDef(bw, [
        S(line_at((bw, XH), tail, XH + over), line_at((bw, XH), tail, DESC - over)),
        S(line_at(meet, (0, XH), XH + over), meet, cap='butt'),
    ], deep, sb=24)

    bw = 320
    g['z'] = GlyphDef(bw, [S((0, xt), (bw, xt), (0, b), (bw, b), limit=2.2)], low)

    # ---- Figures: one advance for all ten ------------------------------------

    bw = 380
    digits = {
        'zero': [hexagon(bw, CAP, 0, 0.2)],
        'one': [S((bw * 0.12, CAP * 0.78), (bw * 0.62, CAP), (bw * 0.62, -over))],
        'two': [S((0, CAP * 0.78), (bw * 0.26, t), (bw * 0.74, t), (bw, CAP * 0.78),
                  (bw, CAP * 0.6), (0, b), (bw, b), limit=2.2)],
        'three': [S((0, t), (bw, t), (bw * 0.42, CAP * 0.56), (bw * 0.74, CAP * 0.56),
                    (bw, CAP * 0.37), (bw, CAP * 0.2), (bw * 0.76, b), (0, b), limit=2.5)],
        'four': [S((bw * 0.72, -over), (bw * 0.72, CAP), (0, CAP * 0.32), (bw, CAP * 0.32),
                   limit=2.5)],
        'five': [S((bw, t), (0, t), (0, CAP * 0.56), (bw * 0.74, CAP * 0.56), (bw, CAP * 0.38),
                   (bw, CAP * 0.2), (bw * 0.76, b), (0, b))],
        'six': [S((bw, t), (bw * 0.36, t), (0, CAP * 0.62), (0, CAP * 0.2), (bw * 0.24, b),
                  (bw * 0.76, b), (bw, CAP * 0.2), (bw, CAP * 0.38), (bw * 0.76, CAP * 0.54),
                  (0, CAP * 0.54), cap='butt')],
        'seven': [S((0, t), (bw, t), line_at((bw, t), (bw * 0.3, 0), -over))],
        'eight': [
            S((bw * 0.5, CAP - 0.8 * h), (bw * 0.95, CAP * 0.84), (bw * 0.95, CAP * 0.66),
              (bw * 0.5, CAP * 0.53), (bw * 0.05, CAP * 0.66), (bw * 0.05, CAP * 0.84), closed=True),
            S((bw * 0.5, CAP * 0.53), (bw, CAP * 0.37), (bw, CAP * 0.17), (bw * 0.5, 0.8 * h),
              (0, CAP * 0.17), (0, CAP * 0.37), closed=True),
        ],
        'nine': [S((0, b), (bw * 0.64, b), (bw, CAP * 0.38), (bw, CAP * 0.8), (bw * 0.76, t),
                   (bw * 0.24, t), (0, CAP * 0.8), (0, CAP * 0.62), (bw * 0.24, CAP * 0.46),
                   (bw, CAP * 0.46), cap='butt')],
    }
    for name, parts in digits.items():
        g[name] = GlyphDef(bw, parts, caps, sb=46 if W < 100 else 42)

    # ---- Punctuation ---------------------------------------------------------

    g['period'] = GlyphDef(0, [lozenge(0, R, R)], None, sb=60)
    g['comma'] = GlyphDef(0, [
        lozenge(0, R, R), S((0, R * 0.6), (-W * 0.9, -W * 1.7), scale=0.8, cap='butt'),
    ], None, sb=70)
    g['colon'] = GlyphDef(0, [lozenge(0, R, R), lozenge(0, XH - R, R)], None, sb=60)
    g['semicolon'] = GlyphDef(0, [
        lozenge(0, XH - R, R), lozenge(0, R, R),
        S((0, R * 0.6), (-W * 0.9, -W * 1.7), scale=0.8, cap='butt'),
    ], None, sb=70)
    g['exclam'] = GlyphDef(0, [S((0, CAP + over), (0, CAP * 0.32), cap='butt'), lozenge(0, R, R)],
                           caps, sb=60)
    bw = 330
    g['question'] = GlyphDef(bw, [
        S((0, CAP * 0.78), (bw * 0.28, t), (bw * 0.72, t), (bw, CAP * 0.78), (bw, CAP * 0.6),
          (bw * 0.5, CAP * 0.44), (bw * 0.5, CAP * 0.28), cap='square'),
        lozenge(bw * 0.5, R, R),
    ], caps)

    g['quotesingle'] = GlyphDef(0, [S((0, CAP + over), (0, CAP * 0.64), cap='butt')], caps, sb=50)
    g['quotedbl'] = GlyphDef(150, [
        S((0, CAP + over), (0, CAP * 0.64), cap='butt'),
        S((150, CAP + over), (150, CAP * 0.64), cap='butt'),
    ], caps, sb=50)

    def closing_quote(x):
        return [lozenge(x + 70, CAP - R, R), S((x + 70, CAP - R), (x, CAP * 0.6), scale=0.75)]

    def opening_quote(x):
        return [lozenge(x, CAP * 0.6 + R, R), S((x, CAP * 0.6 + R), (x + 70, CAP), scale=0.75)]

    g['quoteright'] = GlyphDef(70, closing_quote(0), caps, sb=46)
    g['quoteleft'] = GlyphDef(70, opening_quote(0), caps, sb=46)
    g['quotedblright'] = GlyphDef(240, closing_quote(0) + closing_quote(170), caps, sb=46)
    g['quotedblleft'] = GlyphDef(240, opening_quote(0) + opening_quote(170), caps, sb=46)
    g['quotesinglbase'] = GlyphDef(70, transformed(closing_quote(0), dy=-CAP * 0.6 - 20), None,
                                   sb=46)

    dash_y = 280
    g['hyphen'] = GlyphDef(200, [S((0, dash_y), (200, dash_y))], None)
    g['endash'] = GlyphDef(440, [S((0, dash_y), (440, dash_y))], None, sb=30)
    g['emdash'] = GlyphDef(860, [S((0, dash_y), (860, dash_y))], None, sb=30)
    g['minus'] = GlyphDef(380, [S((0, 300), (380, 300))], None)
    g['underscore'] = GlyphDef(460, [S((0, -120), (460, -120))], None, sb=10)

    top, bot = CAP + 70, -130
    g['parenleft'] = GlyphDef(150, [
        S(line_at((0, CAP * 0.64), (150, top), top + over), (0, CAP * 0.64), (0, CAP * 0.3),
          line_at((0, CAP * 0.3), (150, bot), bot - over)),
    ], (bot, top))
    g['parenright'] = GlyphDef(150, [
        S(line_at((150, CAP * 0.64), (0, top), top + over), (150, CAP * 0.64), (150, CAP * 0.3),
          line_at((150, CAP * 0.3), (0, bot), bot - over)),
    ], (bot, top))
    g['bracketleft'] = GlyphDef(150, [S((150, top - h), (0, top - h), (0, bot + h), (150, bot + h))],
                                (bot, top))
    g['bracketright'] = GlyphDef(150, [S((0, top - h), (150, top - h), (150, bot + h),
                                         (0, bot + h))], (bot, top))
    mid = (top + bot) / 2
    g['braceleft'] = GlyphDef(200, [
        S((200, top - h), (90, top - h), (90, mid + 60), (0, mid), (90, mid - 60), (90, bot + h),
          (200, bot + h), limit=2.5),
    ], (bot, top))
    g['braceright'] = GlyphDef(200, [
        S((0, top - h), (110, top - h), (110, mid + 60), (200, mid), (110, mid - 60),
          (110, bot + h), (0, bot + h), limit=2.5),
    ], (bot, top))
    g['slash'] = GlyphDef(300, [S(line_at((0, bot), (300, top), bot - over),
                                  line_at((0, bot), (300, top), top + over))], (bot, top), sb=20)
    g['backslash'] = GlyphDef(300, [S(line_at((300, bot), (0, top), bot - over),
                                      line_at((300, bot), (0, top), top + over))], (bot, top),
                              sb=20)
    g['bar'] = GlyphDef(0, [S((0, top + over), (0, bot - over))], (bot - 20, top + 10), sb=70)

    g['plus'] = GlyphDef(380, [S((0, 300), (380, 300)), S((190, 110), (190, 490))], None)
    g['equal'] = GlyphDef(380, [S((0, 200), (380, 200)), S((0, 400), (380, 400))], None)
    g['less'] = GlyphDef(360, [S((360, 540), (0, 300), (360, 60), limit=3.0)], None)
    g['greater'] = GlyphDef(360, [S((0, 540), (360, 300), (0, 60), limit=3.0)], None)
    g['asciicircum'] = GlyphDef(360, [S((0, CAP * 0.55), (180, CAP), (360, CAP * 0.55))], caps,
                                sb=30)
    g['asciitilde'] = GlyphDef(420, [S((0, 260), (126, 360), (294, 240), (420, 340))], None)
    g['grave'] = GlyphDef(120, [S((0, CAP), (120, CAP - 150), scale=0.85)], caps)

    star = (150, CAP - 170)
    spokes = [S((star[0], star[1] + 170), (star[0], star[1] - 170), cap='butt')]
    for angle in (30, -30):
        dx = math.cos(math.radians(angle)) * 160
        dy = math.sin(math.radians(angle)) * 160
        spokes.append(S((star[0] - dx, star[1] - dy), (star[0] + dx, star[1] + dy), cap='butt'))
    g['asterisk'] = GlyphDef(300, spokes, caps, sb=36)

    g['numbersign'] = GlyphDef(460, [
        S((190, CAP * 0.92), (120, 20), cap='butt'),
        S((360, CAP * 0.92), (290, 20), cap='butt'),
        S((20, CAP * 0.64), (460, CAP * 0.64)),
        S((0, CAP * 0.3), (440, CAP * 0.3)),
    ], caps, sb=30)

    g['dollar'] = GlyphDef(400, [
        *g['S'].parts,
        S((200, CAP + 90), (200, -90), cap='butt'),
    ], (-90, CAP + 90))

    small_hex = lambda x, y: S((x + 75, y + 170), (x + 150, y + 125), (x + 150, y + 45),
                               (x + 75, y), (x, y + 45), (x, y + 125), closed=True, scale=0.8)
    g['percent'] = GlyphDef(520, [
        S(line_at((40, 0), (480, CAP), -over), line_at((40, 0), (480, CAP), CAP + over)),
        small_hex(0, CAP - 170 - h),
        small_hex(370, h),
    ], caps, sb=30)

    bw = 460
    g['ampersand'] = GlyphDef(bw, [
        S(line_at((bw * 0.12, CAP * 0.66), (bw, 0), -over), (bw * 0.12, CAP * 0.66),
          (bw * 0.12, CAP * 0.84), (bw * 0.32, t), (bw * 0.62, t), (bw * 0.8, CAP * 0.84),
          (bw * 0.8, CAP * 0.7), (0, CAP * 0.34), (0, CAP * 0.16), (bw * 0.22, b),
          (bw * 0.56, b), (bw, CAP * 0.42), limit=3.0),
    ], caps, sb=30)

    bw = 640
    g['at'] = GlyphDef(bw, [
        S((bw * 0.82, -90 + h), (bw * 0.28, -90 + h), (0, CAP * 0.2), (0, CAP * 0.62),
          (bw * 0.28, CAP * 0.92), (bw * 0.72, CAP * 0.92), (bw, CAP * 0.62), (bw, CAP * 0.26),
          (bw * 0.88, CAP * 0.14), (bw * 0.72, CAP * 0.14), (bw * 0.72, CAP * 0.66), scale=0.85),
        S((bw * 0.72, CAP * 0.58), (bw * 0.42, CAP * 0.58), (bw * 0.28, CAP * 0.44),
          (bw * 0.28, CAP * 0.28), (bw * 0.42, CAP * 0.14), (bw * 0.72, CAP * 0.14), scale=0.85,
          cap='butt'),
    ], (-90, CAP), sb=30)

    g['degree'] = GlyphDef(220, [
        S((110, CAP - 0.6 * h), (220, CAP - 110), (110, CAP - 220), (0, CAP - 110), closed=True,
          scale=0.75),
    ], caps, sb=40)
    g['multiply'] = GlyphDef(340, [S((0, 80), (340, 440)), S((0, 440), (340, 80))], None)
    g['divide'] = GlyphDef(380, [S((0, 300), (380, 300)), lozenge(190, 470, R), lozenge(190, 130, R)],
                           None)
    g['plusminus'] = GlyphDef(380, [
        S((0, 340), (380, 340)), S((190, 160), (190, 520)), S((0, b), (380, b)),
    ], None)
    g['periodcentered'] = GlyphDef(0, [lozenge(0, 300, R)], None, sb=60)
    g['bullet'] = GlyphDef(0, [lozenge(0, 300, R * 1.45)], None, sb=70)
    g['ellipsis'] = GlyphDef(2 * R * 3.2, [
        lozenge(0, R, R), lozenge(R * 3.2, R, R), lozenge(R * 6.4, R, R),
    ], None, sb=60)
    g['guillemotleft'] = GlyphDef(400, [
        S((180, 480), (0, 260), (180, 40), limit=2.5),
        S((400, 480), (220, 260), (400, 40), limit=2.5),
    ], None, sb=36)
    g['guillemotright'] = GlyphDef(400, [
        S((0, 480), (180, 260), (0, 40), limit=2.5),
        S((220, 480), (400, 260), (220, 40), limit=2.5),
    ], None, sb=36)
    g['exclamdown'] = GlyphDef(0, [
        lozenge(0, XH - R, R), S((0, XH * 0.62), (0, DESC * 0.8 - over), cap='butt'),
    ], (DESC * 0.8, XH), sb=60)
    q = g['question']
    g['questiondown'] = GlyphDef(q.bw, transformed(q.parts, sx=-1, sy=-1, dx=q.bw, dy=XH - 20),
                                 (XH - 20 - CAP, XH))

    small = lambda glyph: transformed(g[glyph].parts, sx=0.6, sy=0.6, dy=CAP * 0.42)
    g['ordfeminine'] = GlyphDef(g['a'].bw * 0.6, small('a') + [
        S((0, CAP * 0.33), (g['a'].bw * 0.6, CAP * 0.33), scale=0.8),
    ], (CAP * 0.28, CAP), sb=40)
    g['ordmasculine'] = GlyphDef(g['o'].bw * 0.6, small('o') + [
        S((0, CAP * 0.33), (g['o'].bw * 0.6, CAP * 0.33), scale=0.8),
    ], (CAP * 0.28, CAP), sb=40)

    bw = 440
    g['Euro'] = GlyphDef(bw, [
        *g['C'].parts,
        S((-60, CAP * 0.58), (bw * 0.7, CAP * 0.58)),
        S((-60, CAP * 0.42), (bw * 0.7, CAP * 0.42)),
    ], caps)
    bw = 420
    g['sterling'] = GlyphDef(bw, [
        S((bw, CAP * 0.84), (bw * 0.82, t), (bw * 0.48, t), (bw * 0.26, CAP * 0.82),
          (bw * 0.26, CAP * 0.2), (0, b), (bw, b)),
        S((0, CAP * 0.46), (bw * 0.7, CAP * 0.46)),
    ], caps)

    g['arrowleft'] = GlyphDef(520, [S((0, 300), (520, 300)), S((200, 520), (0, 300), (200, 80))],
                              None)
    g['arrowright'] = GlyphDef(520, [S((0, 300), (520, 300)),
                                     S((320, 520), (520, 300), (320, 80))], None)
    g['arrowup'] = GlyphDef(400, [S((200, -20), (200, CAP)), S((0, CAP - 210), (200, CAP),
                                                                 (400, CAP - 210))], (-20, CAP))
    g['arrowdown'] = GlyphDef(400, [S((200, CAP + 20), (200, 0)), S((0, 210), (200, 0),
                                                                     (400, 210))], (0, CAP + 20))
    g['checkmark'] = GlyphDef(460, [S((0, 300), (170, 40), (460, CAP * 0.92), limit=3.0)], None)

    # ---- Marks, for the accented letters ------------------------------------
    #
    # Drawn around x = 0 with their foot at y = 0, advance zero; `compose`
    # centres them over the letter and lifts them to the right height.

    g['acutecomb'] = GlyphDef(0, [S((-50, 0), (60, 130), scale=0.85)], None, mark=True)
    g['gravecomb'] = GlyphDef(0, [S((50, 0), (-60, 130), scale=0.85)], None, mark=True)
    g['circumflexcomb'] = GlyphDef(0, [S((-110, 0), (0, 120), (110, 0), scale=0.85, limit=3.0)],
                                   None, mark=True)
    g['tildecomb'] = GlyphDef(0, [S((-125, 20), (-50, 110), (50, 20), (125, 110), scale=0.85)],
                              None, mark=True)
    g['dieresiscomb'] = GlyphDef(0, [lozenge(-95, R * 0.9, R * 0.9), lozenge(95, R * 0.9, R * 0.9)],
                                 None, mark=True)
    g['ringcomb'] = GlyphDef(0, [S((0, 150), (72, 75), (0, 0), (-72, 75), closed=True, scale=0.7)],
                             None, mark=True)
    g['cedillacomb'] = GlyphDef(0, [S((0, 20), (0, -60), (70, -120), (-40, -195), scale=0.8,
                                      limit=3.0)], None, mark=True)

    # Condense the letters and figures — see `CONDENSE`. Punctuation and marks
    # keep their drawn widths: a narrower full stop is not more carved.
    groups = {name: 'upper' for name in map(chr, range(ord('A'), ord('Z') + 1))}
    groups.update({name: 'lower' for name in map(chr, range(ord('a'), ord('z') + 1))})
    groups['dotlessi'] = 'lower'
    groups.update({name: 'figure' for name in digits})
    for name, group in groups.items():
        factor = CONDENSE[group]
        defn = g[name]
        defn.bw *= factor
        defn.parts = transformed(defn.parts, sx=factor, keep_width=True)

    return g


# Which character each glyph is, where it has one.
CMAP = {
    **{chr(c): chr(c) for c in range(ord('A'), ord('Z') + 1)},
    **{chr(c): chr(c) for c in range(ord('a'), ord('z') + 1)},
    '0': 'zero', '1': 'one', '2': 'two', '3': 'three', '4': 'four', '5': 'five', '6': 'six',
    '7': 'seven', '8': 'eight', '9': 'nine',
    '.': 'period', ',': 'comma', ':': 'colon', ';': 'semicolon', '!': 'exclam', '?': 'question',
    "'": 'quotesingle', '"': 'quotedbl', '’': 'quoteright', '‘': 'quoteleft',
    '”': 'quotedblright', '“': 'quotedblleft', '‚': 'quotesinglbase',
    '-': 'hyphen', '‐': 'hyphen', '–': 'endash', '—': 'emdash', '−': 'minus',
    '_': 'underscore', '(': 'parenleft', ')': 'parenright', '[': 'bracketleft',
    ']': 'bracketright', '{': 'braceleft', '}': 'braceright', '/': 'slash', '\\': 'backslash',
    '|': 'bar', '+': 'plus', '=': 'equal', '<': 'less', '>': 'greater', '^': 'asciicircum',
    '~': 'asciitilde', '`': 'grave', '*': 'asterisk', '#': 'numbersign', '$': 'dollar',
    '%': 'percent', '&': 'ampersand', '@': 'at', '°': 'degree', '×': 'multiply',
    '÷': 'divide', '±': 'plusminus', '·': 'periodcentered', '•': 'bullet',
    '…': 'ellipsis', '«': 'guillemotleft', '»': 'guillemotright',
    '¡': 'exclamdown', '¿': 'questiondown', 'ª': 'ordfeminine',
    'º': 'ordmasculine', '€': 'Euro', '£': 'sterling', '←': 'arrowleft',
    '→': 'arrowright', '↑': 'arrowup', '↓': 'arrowdown', '✓': 'checkmark',
    'ı': 'dotlessi',
    '́': 'acutecomb', '̀': 'gravecomb', '̂': 'circumflexcomb',
    '̃': 'tildecomb', '̈': 'dieresiscomb', '̊': 'ringcomb',
    '̧': 'cedillacomb',
}

MARK_OF = {
    'grave': 'gravecomb', 'acute': 'acutecomb', 'circumflex': 'circumflexcomb',
    'tilde': 'tildecomb', 'dieresis': 'dieresiscomb', 'ring': 'ringcomb',
    'cedilla': 'cedillacomb',
}

# Accented letter: (base, mark kind). Latin-1, which is every letter the two
# interface languages use.
ACCENTED = {}
for base, marks in {
    'A': 'grave acute circumflex tilde dieresis ring', 'a': 'grave acute circumflex tilde dieresis ring',
    'E': 'grave acute circumflex dieresis', 'e': 'grave acute circumflex dieresis',
    'I': 'grave acute circumflex dieresis', 'i': 'grave acute circumflex dieresis',
    'O': 'grave acute circumflex tilde dieresis', 'o': 'grave acute circumflex tilde dieresis',
    'U': 'grave acute circumflex dieresis', 'u': 'grave acute circumflex dieresis',
    'N': 'tilde', 'n': 'tilde', 'Y': 'acute', 'y': 'acute dieresis',
    'C': 'cedilla', 'c': 'cedilla',
}.items():
    for mark in marks.split():
        spelled = {'ring': 'RING ABOVE', 'dieresis': 'DIAERESIS'}.get(mark, mark.upper())
        letter = unicodedata.lookup(
            f"LATIN {'CAPITAL' if base.isupper() else 'SMALL'} LETTER {base.upper()} WITH {spelled}"
        )
        ACCENTED[letter] = (base, mark)


# ---------------------------------------------------------------------------
# From strokes to outlines
# ---------------------------------------------------------------------------


def stroke_polygons(stroke: Stroke, W: float) -> list[list[tuple[float, float]]]:
    """Convex pieces whose union is the stroke: a quad per segment, a wedge per join."""
    h = W * stroke.scale / 2
    pts = list(stroke.points)
    if stroke.closed:
        pts = pts + [pts[0]]
    pieces = []

    def unit(p, q):
        dx, dy = q[0] - p[0], q[1] - p[1]
        length = math.hypot(dx, dy) or 1.0
        return dx / length, dy / length

    segments = list(zip(pts[:-1], pts[1:]))
    for index, (p, q) in enumerate(segments):
        dx, dy = unit(p, q)
        nx, ny = -dy, dx
        start, end = p, q
        # Offsets along the stroke for the two corners of each end: equal for
        # a square or butt end, opposite for a chisel — one edge runs on past
        # the other, which is the slanted cut.
        lean_start = lean_end = (0.0, 0.0)
        is_first = index == 0 and not stroke.closed
        is_last = index == len(segments) - 1 and not stroke.closed
        if stroke.cap == 'square':
            if is_first:
                start = (p[0] - dx * h, p[1] - dy * h)
            if is_last:
                end = (q[0] + dx * h, q[1] + dy * h)
        elif stroke.cap == 'chisel':
            reach, lean = h * CHISEL_REACH, h * CHISEL_LEAN
            if is_first:
                start = (p[0] - dx * reach, p[1] - dy * reach)
                lean_start = (lean, -lean)
            if is_last:
                end = (q[0] + dx * reach, q[1] + dy * reach)
                lean_end = (lean, -lean)
        pieces.append([
            (start[0] + nx * h + dx * lean_start[0], start[1] + ny * h + dy * lean_start[0]),
            (end[0] + nx * h + dx * lean_end[0], end[1] + ny * h + dy * lean_end[0]),
            (end[0] - nx * h + dx * lean_end[1], end[1] - ny * h + dy * lean_end[1]),
            (start[0] - nx * h + dx * lean_start[1], start[1] - ny * h + dy * lean_start[1]),
        ])

    joins = list(range(1, len(pts) - 1))
    if stroke.closed:
        joins.append(0)
    for index in joins:
        before = pts[index - 1] if index > 0 else pts[-2]
        at = pts[index]
        after = pts[index + 1]
        d1 = unit(before, at)
        d2 = unit(at, after)
        cross = d1[0] * d2[1] - d1[1] * d2[0]
        if abs(cross) < 1e-9:
            continue
        # The outer side is the one the path turns away from.
        side = -1 if cross > 0 else 1
        n1 = (-d1[1] * side, d1[0] * side)
        n2 = (-d2[1] * side, d2[0] * side)
        a = (at[0] + n1[0] * h, at[1] + n1[1] * h)
        c = (at[0] + n2[0] * h, at[1] + n2[1] * h)
        bisector = (n1[0] + n2[0], n1[1] + n2[1])
        blen = math.hypot(*bisector)
        cos_half = blen / 2
        miter = h / cos_half if cos_half > 1e-9 else float('inf')
        if miter <= stroke.limit * h:
            m = (at[0] + bisector[0] / blen * miter, at[1] + bisector[1] / blen * miter)
            pieces.append([at, a, m, c])
        else:
            pieces.append([at, a, c])
    return pieces


def paint(defn: GlyphDef, W: float, origin_x: float):
    """Rasterises a glyph's parts; returns the painted grid and its frame."""
    x0, x1 = origin_x - 450, origin_x + (defn.bw or 0) + 450
    y0, y1 = DESC - 350, ASCENT + 250
    width = int((x1 - x0) * SCALE)
    height = int((y1 - y0) * SCALE)
    image = Image.new('L', (width, height), 0)
    draw = ImageDraw.Draw(image)

    def to_px(point):
        return ((point[0] + origin_x - x0) * SCALE, (y1 - point[1]) * SCALE)

    for part in defn.parts:
        if isinstance(part, Stroke):
            for piece in stroke_polygons(part, W):
                draw.polygon([to_px(p) for p in piece], fill=255)
        else:
            draw.polygon([to_px(p) for p in part.points], fill=255)

    grid = np.asarray(image) > 127
    if defn.band is not None:
        bottom, top = defn.band
        top_row = int(round((y1 - top) * SCALE))
        bottom_row = int(round((y1 - bottom) * SCALE))
        grid = grid.copy()
        grid[:max(0, top_row), :] = False
        grid[max(0, bottom_row):, :] = False
    return grid, (x0, y1)


def trace(grid: np.ndarray) -> list[list[tuple[int, int]]]:
    """Closed contours around the painted region, filled side on the right."""
    filled = np.pad(grid, 1)
    core = filled[1:-1, 1:-1]
    up = filled[:-2, 1:-1]
    down = filled[2:, 1:-1]
    left = filled[1:-1, :-2]
    right = filled[1:-1, 2:]

    edges: dict[tuple[int, int], list[tuple[int, int]]] = {}

    def add(mask, start, end):
        ys, xs = np.nonzero(mask)
        for y, x in zip(ys.tolist(), xs.tolist()):
            edges.setdefault((x + start[0], y + start[1]), []).append((x + end[0], y + end[1]))

    add(core & ~up, (0, 0), (1, 0))  # top edge, walking east
    add(core & ~right, (1, 0), (1, 1))  # right edge, walking south
    add(core & ~down, (1, 1), (0, 1))  # bottom edge, walking west
    add(core & ~left, (0, 1), (0, 0))  # left edge, walking north

    contours = []
    while edges:
        start = next(iter(edges))
        loop = [start]
        current = start
        heading = None
        while True:
            options = edges.get(current)
            if not options:
                break
            if len(options) == 1 or heading is None:
                nxt = options[0]
            else:
                # Where two regions touch at a corner, turn right: it keeps
                # each 4-connected region its own contour.
                right_turn = (-heading[1], heading[0])
                nxt = next(
                    (o for o in options if (o[0] - current[0], o[1] - current[1]) == right_turn),
                    options[0],
                )
            options.remove(nxt)
            if not options:
                del edges[current]
            heading = (nxt[0] - current[0], nxt[1] - current[1])
            current = nxt
            if current == start:
                break
            loop.append(current)
        if len(loop) >= 4:
            contours.append(loop)
    return contours


def collinear_free(points):
    out = []
    n = len(points)
    for i in range(n):
        a, b, c = points[i - 1], points[i], points[(i + 1) % n]
        if (b[0] - a[0]) * (c[1] - b[1]) != (b[1] - a[1]) * (c[0] - b[0]):
            out.append(b)
    return out


def rdp(points, tolerance):
    if len(points) < 3:
        return points
    (x0, y0), (x1, y1) = points[0], points[-1]
    dx, dy = x1 - x0, y1 - y0
    length = math.hypot(dx, dy)
    best, index = -1.0, 0
    for i in range(1, len(points) - 1):
        px, py = points[i]
        if length == 0:
            distance = math.hypot(px - x0, py - y0)
        else:
            distance = abs(dy * px - dx * py + x1 * y0 - y1 * x0) / length
        if distance > best:
            best, index = distance, i
    if best <= tolerance:
        return [points[0], points[-1]]
    return rdp(points[: index + 1], tolerance)[:-1] + rdp(points[index:], tolerance)


def simplify(loop, tolerance):
    points = collinear_free(loop)
    if len(points) < 3:
        return []
    # Start at an extreme, which on a polygon is always a true corner.
    start = min(range(len(points)), key=lambda i: (points[i][1], points[i][0]))
    points = points[start:] + points[:start]
    far = max(range(len(points)),
              key=lambda i: (points[i][0] - points[0][0]) ** 2 + (points[i][1] - points[0][1]) ** 2)
    first = rdp(points[: far + 1], tolerance)
    second = rdp(points[far:] + [points[0]], tolerance)
    return first[:-1] + second[:-1]


def signed_area(points):
    return sum(
        points[i - 1][0] * points[i][1] - points[i][0] * points[i - 1][1] for i in range(len(points))
    ) / 2


def outline(defn: GlyphDef, W: float, origin_x: float):
    """The glyph's contours in font units, TrueType-oriented."""
    grid, (x0, y1) = paint(defn, W, origin_x)
    contours = []
    for loop in trace(grid):
        simple = simplify(loop, TOLERANCE)
        if len(simple) < 3:
            continue
        points = []
        for px, py in simple:
            point = (round(px / SCALE + x0), round(y1 - py / SCALE))
            if not points or points[-1] != point:
                points.append(point)
        if len(points) >= 3 and points[0] == points[-1]:
            points.pop()
        if len(points) >= 3 and abs(signed_area(points)) > 40:
            contours.append(points)
    return contours


# ---------------------------------------------------------------------------
# The font
# ---------------------------------------------------------------------------


def build(weight: str):
    spec = WEIGHTS[weight]
    W = spec['stroke']
    defs = define(W)

    glyphs = {}
    metrics = {}
    bounds = {}

    notdef = TTGlyphPen(None)
    for contour in ([(60, 0), (60, CAP), (440, CAP), (440, 0)],
                    [(120, 60), (380, 60), (380, CAP - 60), (120, CAP - 60)]):
        notdef.moveTo(contour[0])
        for point in contour[1:]:
            notdef.lineTo(point)
        notdef.closePath()
    glyphs['.notdef'] = notdef.glyph()
    metrics['.notdef'] = (500, 60)
    glyphs['space'] = TTGlyphPen(None).glyph()
    metrics['space'] = (spec['space'], 0)

    for name, defn in defs.items():
        sb = spec['sb'] if defn.sb is None else defn.sb + (spec['sb'] - 46) / 2
        origin_x = 0 if defn.mark else sb + W / 2
        contours = outline(defn, W, origin_x)

        # TrueType wants outer contours clockwise: negative area with y up.
        if contours and max(contours, key=lambda c: abs(signed_area(c))) and \
                signed_area(max(contours, key=lambda c: abs(signed_area(c)))) > 0:
            contours = [list(reversed(c)) for c in contours]

        pen = TTGlyphPen(None)
        for contour in contours:
            pen.moveTo(contour[0])
            for point in contour[1:]:
                pen.lineTo(point)
            pen.closePath()
        glyphs[name] = pen.glyph()

        xs = [p[0] for c in contours for p in c] or [0]
        ys = [p[1] for c in contours for p in c] or [0]
        bounds[name] = (min(xs), min(ys), max(xs), max(ys))

        advance = 0 if defn.mark else round(defn.bw + W + 2 * sb)
        metrics[name] = (advance, min(xs) if contours else 0)

    # Accented letters, as composites: base + mark, centred over the ink.
    for char, (base, mark_kind) in ACCENTED.items():
        name = f'uni{ord(char):04X}'
        mark = MARK_OF[mark_kind]
        source = 'dotlessi' if base == 'i' else base
        bx0, _, bx1, by1 = bounds[source]
        mx0, my0, mx1, _ = bounds[mark]

        if mark_kind == 'cedilla':
            lift = 0
        elif base.isupper():
            lift = CAP + 70 - my0
        else:
            lift = XH + 80 - my0

        glyph = Glyph()
        glyph.numberOfContours = -1
        base_part = GlyphComponent()
        base_part.glyphName = source
        base_part.x, base_part.y = 0, 0
        base_part.flags = 0x02 | 0x0200  # ARGS_ARE_XY_VALUES | USE_MY_METRICS
        mark_part = GlyphComponent()
        mark_part.glyphName = mark
        mark_part.x = round((bx0 + bx1) / 2 - (mx0 + mx1) / 2)
        mark_part.y = round(lift)
        mark_part.flags = 0x02
        glyph.components = [base_part, mark_part]
        glyphs[name] = glyph
        metrics[name] = metrics[source]

    cmap = {0x20: 'space', 0xA0: 'space'}
    for char, name in CMAP.items():
        cmap[ord(char)] = name
    for char in ACCENTED:
        cmap[ord(char)] = f'uni{ord(char):04X}'

    order = ['.notdef', 'space'] + [n for n in glyphs if n not in ('.notdef', 'space')]

    builder = FontBuilder(UPM, isTTF=True)
    builder.setupGlyphOrder(order)
    builder.setupCharacterMap(cmap)
    builder.setupGlyf(glyphs)
    builder.setupHorizontalMetrics(metrics)
    builder.setupHorizontalHeader(ascent=ASCENT, descent=-DESCENT, lineGap=0)
    style = 'Bold' if weight == 'bold' else 'Regular'
    builder.setupNameTable({
        'familyName': FAMILY,
        'styleName': style,
        'uniqueFontIdentifier': f'TaskStudio:{FAMILY}-{style}:2026',
        'fullName': f'{FAMILY} {style}',
        'psName': f'StudioRunic-{style}',
        'version': 'Version 1.000',
        'copyright': 'Copyright 2026 Task Studio. Drawn for the Runic skin.',
        'licenseDescription': 'Part of Task Studio; licensed with the application.',
    })
    builder.setupOS2(
        version=4,
        sTypoAscender=ASCENT,
        sTypoDescender=-DESCENT,
        sTypoLineGap=0,
        usWinAscent=ASCENT,
        usWinDescent=DESCENT,
        sxHeight=XH,
        sCapHeight=CAP,
        usWeightClass=700 if weight == 'bold' else 400,
        # USE_TYPO_METRICS, plus BOLD or REGULAR.
        fsSelection=(1 << 7) | ((1 << 5) if weight == 'bold' else (1 << 6)),
        achVendID='TSTD',
    )
    builder.setupPost(isFixedPitch=0)
    builder.font['head'].macStyle = 1 if weight == 'bold' else 0
    return builder.font


def main() -> None:
    os.makedirs(SERVED, exist_ok=True)

    stems = (('regular', 'studio-runic'), ('bold', 'studio-runic-bold'))
    for weight, stem in stems:
        font = build(weight)
        font.flavor = 'woff2'
        for folder in (HERE, SERVED):
            font.save(os.path.join(folder, f'{stem}.woff2'))
        # A plain TrueType beside the script, for the preview only.
        font.flavor = None
        font.save(os.path.join(HERE, f'{stem}.ttf'))
        size = os.path.getsize(os.path.join(HERE, f'{stem}.woff2'))
        print(f'{stem}.woff2: {len(font.getGlyphOrder())} glyphs, {size} bytes')

    from PIL import ImageFont

    sample = [
        'The quick brown fox jumps over the lazy dog.',
        'THE QUICK BROWN FOX JUMPS OVER THE LAZY DOG',
        'NORSE-BOLD  Sprint board · 12 tasks · 3 done',
        '0123456789 !?&@#$%*()[]{}<>+-=/\\|_:;,.\'"',
        'Configurações, Conexões, Ação, você, está — “aspas” … → ✓',
    ]
    image = Image.new('RGB', (1500, 560), (234, 212, 165))
    draw = ImageDraw.Draw(image)
    y = 14
    for _, stem in stems:
        face = ImageFont.truetype(os.path.join(HERE, f'{stem}.ttf'), 30)
        for line in sample:
            draw.text((16, y), line, fill=(62, 24, 12), font=face)
            y += 52
        y += 12
    image.save(os.path.join(HERE, 'preview.png'))

    for _, stem in stems:
        os.remove(os.path.join(HERE, f'{stem}.ttf'))


if __name__ == '__main__':
    main()
