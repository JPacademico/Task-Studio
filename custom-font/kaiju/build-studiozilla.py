#!/usr/bin/env python3
"""Builds `studiozilla.woff2`: Bowlby One recut as the Kaiju skin's monster face."""

from __future__ import annotations

import io
import math
import os
import random
import shutil

import pathops
from fontTools.pens.cu2quPen import Cu2QuPen
from fontTools.pens.recordingPen import DecomposingRecordingPen
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.ttLib import TTFont, newTable
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
UI_ROOT = os.path.dirname(os.path.dirname(HERE))
SOURCE = os.path.join(HERE, 'bowlby-one.woff2')
TARGET = os.path.join(HERE, 'studiozilla.woff2')
SERVED = os.path.join(UI_ROOT, 'public', 'fonts', 'kaiju', 'studiozilla.woff2')
PREVIEW = os.path.join(HERE, 'preview.png')

# OFL: Bowlby's Reserved Font Names cannot be carried by a modified version.
FAMILY = 'Studiozilla'
POSTSCRIPT = 'Studiozilla-Regular'

# Horizontal scale. Bowlby One sets about 0.8em per capital; a section title in a rail has to fit.
CONDENSE = 0.86
# Extra tracking per side, in font units (UPM 2048), so the bitten feet never touch.
BEARING_ADD = 14

# The bite: a row of teeth taken out of every glyph's foot, as if the letter had been chewed from
# below. Tall enough to read at 24px, short enough to stay a texture at 14px.
TOOTH_HEIGHT = 96
TOOTH_WIDTH = 170

# The crack: one tapered zig-zag down each capital and figure, the way plates split under a foot.
# Lower case and punctuation stay whole: they carry the reading at small sizes.
CRACK_WIDTH = 66
CRACK_KINKS = 4
CRACKED = set('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789')


def outline(glyph_set, name: str) -> pathops.Path:
    """The glyph decomposed and condensed, as a pathops path."""
    recording = DecomposingRecordingPen(glyph_set)
    glyph_set[name].draw(recording)
    path = pathops.Path()
    recording.replay(TransformPen(path.getPen(), (CONDENSE, 0, 0, 1, 0, 0)))
    return path


def polygon(points) -> pathops.Path:
    path = pathops.Path()
    pen = path.getPen()
    pen.moveTo(points[0])
    for point in points[1:]:
        pen.lineTo(point)
    pen.closePath()
    return path


def teeth(bounds, rng: random.Random) -> pathops.Path:
    """A row of uneven fangs under the glyph, biting up into its foot. Uneven, or it reads as a saw."""
    x_min, y_min, x_max, _ = bounds
    floor = y_min - 400
    x = x_min - TOOTH_WIDTH * rng.uniform(0.2, 1.0)
    points = [(x, floor)]
    while x < x_max + TOOTH_WIDTH:
        width = TOOTH_WIDTH * rng.uniform(0.6, 1.45)
        height = TOOTH_HEIGHT * rng.uniform(0.45, 1.3)
        lean = width * rng.uniform(-0.18, 0.18)
        points.append((x, y_min - 1))
        points.append((x + width / 2 + lean, y_min + height))
        x += width
    points.append((x, y_min - 1))
    points.append((x, floor))
    return polygon(points)


def crack(bounds, rng: random.Random) -> pathops.Path:
    """A lightning crack from the glyph's crown into its body, widest in the middle."""
    x_min, y_min, x_max, y_max = bounds
    width = x_max - x_min
    top, bottom = y_max + 60, y_min + (y_max - y_min) * 0.18
    x = x_min + width * rng.uniform(0.42, 0.62)
    spine = [(x, top)]
    for index in range(1, CRACK_KINKS + 1):
        y = top + (bottom - top) * index / CRACK_KINKS
        x += (1 if index % 2 else -1) * width * rng.uniform(0.07, 0.13)
        spine.append((x, y))

    left, right = [], []
    for index, (px, py) in enumerate(spine):
        t = index / CRACK_KINKS
        half = CRACK_WIDTH / 2 * math.sin(math.pi * min(1.0, t * 1.15)) + 1
        left.append((px - half, py))
        right.append((px + half, py))
    return polygon(left + right[::-1])


def is_empty(path: pathops.Path) -> bool:
    return len(list(path.points)) == 0


def bounds_of(path: pathops.Path):
    return None if is_empty(path) else path.bounds


def build() -> None:
    font = TTFont(SOURCE)
    font.flavor = None
    glyph_set = font.getGlyphSet()
    glyf, hmtx = font['glyf'], font['hmtx']

    chars = {}
    for code, glyph_name in font.getBestCmap().items():
        chars.setdefault(glyph_name, chr(code))

    shapes = {}
    for name in font.getGlyphOrder():
        path = outline(glyph_set, name)
        bounds = bounds_of(path)
        if bounds:
            rng = random.Random(name)
            cutter = teeth(bounds, rng)
            if chars.get(name, '') in CRACKED:
                cutter = pathops.op(cutter, crack(bounds, rng), pathops.PathOp.UNION)
            path = pathops.op(path, cutter, pathops.PathOp.DIFFERENCE)
        shapes[name] = path

    for name, path in shapes.items():
        advance, _ = hmtx[name]
        pen = TTGlyphPen(None)
        if is_empty(path):
            glyf[name] = pen.glyph()
            hmtx[name] = (round(advance * CONDENSE) + 2 * BEARING_ADD, 0)
            continue
        path.draw(TransformPen(Cu2QuPen(pen, max_err=1.0, reverse_direction=False), (1, 0, 0, 1, BEARING_ADD, 0)))
        glyph = pen.glyph()
        glyph.recalcBounds(glyf)
        glyf[name] = glyph
        hmtx[name] = (round(advance * CONDENSE) + 2 * BEARING_ADD, glyph.xMin)

    condense_kerning(font)
    strip_hinting(font)
    rename(font)
    font['OS/2'].recalcAvgCharWidth(font)
    font['head'].recalcBBoxes = True
    font.flavor = 'woff2'
    font.save(TARGET)
    os.makedirs(os.path.dirname(SERVED), exist_ok=True)
    shutil.copyfile(TARGET, SERVED)
    print(f'wrote {TARGET} ({os.path.getsize(TARGET):,} bytes)')
    specimen()


def condense_kerning(font: TTFont) -> None:
    """Pair adjustments shrink with the letters they sit between."""
    for lookup in font['GPOS'].table.LookupList.Lookup:
        for subtable in lookup.SubTable:
            records = []
            if subtable.Format == 1:
                for pair_set in subtable.PairSet:
                    records += [(r.Value1, r.Value2) for r in pair_set.PairValueRecord]
            else:
                for class1 in subtable.Class1Record:
                    records += [(r.Value1, r.Value2) for r in class1.Class2Record]
            for values in records:
                for value in values:
                    if value is None:
                        continue
                    for field in ('XAdvance', 'XPlacement'):
                        if hasattr(value, field):
                            setattr(value, field, round(getattr(value, field) * CONDENSE))


def strip_hinting(font: TTFont) -> None:
    """The outlines changed, so the original bytecode would steer the wrong points."""
    for table in ('fpgm', 'prep', 'cvt '):
        if table in font:
            del font[table]
    maxp = font['maxp']
    for field in ('maxZones', 'maxTwilightPoints', 'maxStorage', 'maxFunctionDefs',
                  'maxInstructionDefs', 'maxStackElements', 'maxSizeOfInstructions'):
        setattr(maxp, field, 1 if field == 'maxZones' else 0)
    gasp = newTable('gasp')
    gasp.version = 1
    gasp.gaspRange = {0xFFFF: 0x000A}  # grayscale + symmetric smoothing at every size
    font['gasp'] = gasp


def rename(font: TTFont) -> None:
    names = font['name']
    copyright_line = names.getDebugName(0) or ''
    for record in list(names.names):
        if record.nameID in (0, 1, 2, 3, 4, 6, 10, 16, 17, 18, 21, 22):
            names.removeNames(nameID=record.nameID)
    for name_id, value in (
        (0, f'{copyright_line} Modified for Task Studio as {FAMILY}.'.strip()),
        (1, FAMILY),
        (2, 'Regular'),
        (3, f'{FAMILY} Regular; derived from Bowlby One'),
        (4, f'{FAMILY} Regular'),
        (6, POSTSCRIPT),
        (10, 'Bowlby One condensed, with its feet bitten into teeth and its capitals cracked, '
             'for the Kaiju skin.'),
    ):
        names.setName(value, name_id, 3, 1, 0x409)
        names.setName(value, name_id, 1, 0, 0)


def specimen() -> None:
    """The face at display and UI sizes, on the skin's night, for checking by eye."""
    font = TTFont(TARGET)
    font.flavor = None
    buffer = io.BytesIO()
    font.save(buffer)
    data = buffer.getvalue()
    image = Image.new('RGB', (1100, 330), (10, 13, 18))
    draw = ImageDraw.Draw(image)
    y = 12
    for size, text in (
        (64, 'GODZILLA Studiozilla'),
        (36, 'Kaiju Task Studio — Projetos'),
        (22, 'Ação rápida: Configurações do quadro 0123'),
        (16, 'Tarefas abertas · Reuniões · Grupos · Métricas · Equipe'),
        (13, 'Seção pequena: título de painel lateral com acentuação ÇÃÕÉ'),
    ):
        face = ImageFont.truetype(io.BytesIO(data), size)
        draw.text((14, y), text, font=face, fill=(226, 232, 240))
        y += int(size * 1.35) + 6
    image.save(PREVIEW)


if __name__ == '__main__':
    build()
