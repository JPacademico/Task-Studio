#!/usr/bin/env python3
"""Builds `studio-basalt.woff2`: Frijole recut for the Volcano skin's small titles."""

from __future__ import annotations

import os
import shutil
import sys

from fontTools.pens.areaPen import AreaPen
from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.recordingPen import DecomposingRecordingPen
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.ttLib import TTFont, newTable

HERE = os.path.dirname(os.path.abspath(__file__))
UI_ROOT = os.path.dirname(os.path.dirname(HERE))
SOURCE = os.path.join(HERE, 'frijole.woff2')
TARGET = os.path.join(HERE, 'studio-basalt.woff2')
SERVED = os.path.join(UI_ROOT, 'public', 'fonts', 'volcano', 'studio-basalt.woff2')

# OFL: a modified Frijole cannot keep the Reserved Font Name.
FAMILY = 'Studio Basalt'
POSTSCRIPT = 'StudioBasalt-Regular'

# Filled contours below this area (font units squared) are the broken ring of flakes round each
# letter. Real parts start near 19,000 (the acute) and flakes stop near 5,000.
FLAKE_MAX = 9000
# Cracks below this area are sub-pixel at 16px and only grey the letter; larger ones stay as chips.
CRACK_MIN = 6500
# Horizontal scale. Frijole sets about 0.94em per letter, nearly twice a UI face.
CONDENSE = 0.84
# Side bearing per side once the flakes are gone, in font units (UPM 1024).
BEARING = 34


def split_contours(glyph_set, name: str) -> list[list[tuple[str, tuple]]]:
    pen = DecomposingRecordingPen(glyph_set)
    glyph_set[name].draw(pen)
    contours, current = [], []
    for op, args in pen.value:
        current.append((op, args))
        if op in ('closePath', 'endPath'):
            contours.append(current)
            current = []
    return contours


def measure(glyph_set, contour) -> tuple[float, tuple[float, float, float, float] | None]:
    area, bounds = AreaPen(), BoundsPen(glyph_set)
    for op, args in contour:
        getattr(area, op)(*args)
        getattr(bounds, op)(*args)
    return area.value, bounds.bounds


def contains(outer, inner) -> bool:
    return outer[0] <= inner[0] and outer[1] <= inner[1] and outer[2] >= inner[2] and outer[3] >= inner[3]


def keep(glyph_set, name: str):
    """The contours that survive: real parts, and the cracks in them big enough to read."""
    measured = [(contour, *measure(glyph_set, contour)) for contour in split_contours(glyph_set, name)]
    # TrueType fills clockwise, which AreaPen reports as negative.
    parts = [m for m in measured if m[1] < 0 and -m[1] >= FLAKE_MAX and m[2]]
    kept = [m[0] for m in parts]
    for contour, area, bounds in measured:
        if area <= 0 or not bounds or area < CRACK_MIN:
            continue
        # A hole is kept only inside a part that survived; a hole in a flake goes with the flake.
        if any(contains(part[2], bounds) for part in parts):
            kept.append(contour)
    return kept, [m[2] for m in parts]


def build() -> None:
    font = TTFont(SOURCE)
    font.flavor = None
    glyph_set = font.getGlyphSet()
    glyf, hmtx = font['glyf'], font['hmtx']

    removed = 0
    for name in font.getGlyphOrder():
        advance, _ = hmtx[name]
        kept, bounds = keep(glyph_set, name)
        removed += len(split_contours(glyph_set, name)) - len(kept)

        pen = TTGlyphPen(None)
        if not kept:
            glyf[name] = pen.glyph()
            hmtx[name] = (round(advance * CONDENSE), 0)
            continue

        x_min = min(b[0] for b in bounds) * CONDENSE
        x_max = max(b[2] for b in bounds) * CONDENSE
        # Shift so the left edge sits on the bearing, then condense about the origin.
        shift = BEARING - x_min
        transform = TransformPen(pen, (CONDENSE, 0, 0, 1, shift, 0))
        for contour in kept:
            for op, args in contour:
                getattr(transform, op)(*args)
        glyph = pen.glyph()
        glyph.recalcBounds(glyf)
        glyf[name] = glyph
        hmtx[name] = (round(x_max - x_min + 2 * BEARING), glyph.xMin)

    # The outlines changed, so the original hinting would steer the wrong points.
    for table in ('fpgm', 'prep', 'cvt '):
        if table in font:
            del font[table]
    for name in font.getGlyphOrder():
        glyph = glyf[name]
        if hasattr(glyph, 'program'):
            glyph.program.fromBytecode(b'')
    maxp = font['maxp']
    for field in ('maxZones', 'maxTwilightPoints', 'maxStorage', 'maxFunctionDefs',
                  'maxInstructionDefs', 'maxStackElements', 'maxSizeOfInstructions'):
        setattr(maxp, field, 1 if field == 'maxZones' else 0)
    gasp = newTable('gasp')
    gasp.version = 1
    gasp.gaspRange = {0xFFFF: 0x000A}  # grayscale + symmetric smoothing at every size
    font['gasp'] = gasp

    rename(font)
    font['OS/2'].recalcAvgCharWidth(font)
    font.flavor = 'woff2'
    font.save(TARGET)
    os.makedirs(os.path.dirname(SERVED), exist_ok=True)
    shutil.copyfile(TARGET, SERVED)
    print(f'wrote {TARGET} ({os.path.getsize(TARGET):,} bytes), dropped {removed:,} contours')


def rename(font: TTFont) -> None:
    names = font['name']
    copyright_line = names.getDebugName(0) or ''
    for record in list(names.names):
        if record.nameID in (1, 3, 4, 6, 16, 17, 18, 21, 22):
            names.removeNames(nameID=record.nameID)
    for name_id, value in (
        (0, f'{copyright_line} Modified for Task Studio as {FAMILY}.'.strip()),
        (1, FAMILY),
        (2, 'Regular'),
        (3, f'{FAMILY} Regular; derived from Frijole'),
        (4, f'{FAMILY} Regular'),
        (6, POSTSCRIPT),
        (10, 'Frijole with its flake ring removed, small cracks filled and the set condensed '
             'for 11-18px titles.'),
    ):
        names.setName(value, name_id, 3, 1, 0x409)
        names.setName(value, name_id, 1, 0, 0)


if __name__ == '__main__':
    if len(sys.argv) > 1:
        FLAKE_MAX, CRACK_MIN, CONDENSE = (float(v) for v in sys.argv[1:4])
    build()
