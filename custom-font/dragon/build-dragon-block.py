#!/usr/bin/env python3
"""Builds `dragon-block.woff2` — the Dragon skin's typeface."""

from __future__ import annotations

import array
import re
import sys
import urllib.request
from pathlib import Path

from fontTools.ttLib import TTFont
from fontTools.ttLib.tables import ttProgram
from fontTools.ttLib.tables._g_l_y_f import Glyph, GlyphComponent, GlyphCoordinates

HERE = Path(__file__).resolve().parent
UI_ROOT = HERE.parent.parent
ARCHIVE = HERE / "dragon-block.woff2"
SERVED = UI_ROOT / "public" / "fonts" / "dragon" / "dragon-block.woff2"

CSS_URL = "https://fonts.googleapis.com/css2?family=ZCOOL+KuaiLe&display=swap"
OFL_URL = "https://raw.githubusercontent.com/google/fonts/main/ofl/zcoolkuaile/OFL.txt"
# Google serves woff2 only to a browser that says it can take it.
UA = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/120.0 Safari/537.36"
)

FAMILY = "Dragon Block"
POSTSCRIPT = "DragonBlock-Regular"

# --- The vertical band the accents live in ---
CEILING = 913
FLOOR = -152
UPPER_TOP = 743          # the tallest capital that takes an accent, `A`
UPPER_GAP = 16
LOWER_MARK_BOTTOM = 600  # one shared line for every lowercase accent
# `i` is the exception, and it is the face's own doing: its stem stops at 420 — well below the 505
# x-height — because the tittle above it is unusually tall and occupies 480..610.
DOTLESS_MARK_BOTTOM = 500

# --- What gets built ---
COMPOSITES: list[tuple[int, str, str, str]] = [
    # (codepoint, new glyph name, base glyph, mark glyph)
    (0x00C0, "Agrave", "A", "grave"),
    (0x00C1, "Aacute", "A", "acute"),
    (0x00C2, "Acircumflex", "A", "circumflex"),
    (0x00C3, "Atilde", "A", "tilde"),
    (0x00C4, "Adieresis", "A", "dieresis"),
    (0x00C5, "Aring", "A", "ring"),
    (0x00C8, "Egrave", "E", "grave"),
    (0x00C9, "Eacute", "E", "acute"),
    (0x00CA, "Ecircumflex", "E", "circumflex"),
    (0x00CB, "Edieresis", "E", "dieresis"),
    (0x00CC, "Igrave", "I", "grave"),
    (0x00CD, "Iacute", "I", "acute"),
    (0x00CE, "Icircumflex", "I", "circumflex"),
    (0x00CF, "Idieresis", "I", "dieresis"),
    (0x00D1, "Ntilde", "N", "tilde"),
    (0x00D2, "Ograve", "O", "grave"),
    (0x00D3, "Oacute", "O", "acute"),
    (0x00D4, "Ocircumflex", "O", "circumflex"),
    (0x00D5, "Otilde", "O", "tilde"),
    (0x00D6, "Odieresis", "O", "dieresis"),
    (0x00D9, "Ugrave", "U", "grave"),
    (0x00DA, "Uacute", "U", "acute"),
    (0x00DB, "Ucircumflex", "U", "circumflex"),
    (0x00DC, "Udieresis", "U", "dieresis"),
    (0x00DD, "Yacute", "Y", "acute"),
    (0x00E0, "agrave", "a", "grave"),
    (0x00E1, "aacute", "a", "acute"),
    (0x00E2, "acircumflex", "a", "circumflex"),
    (0x00E3, "atilde", "a", "tilde"),
    (0x00E4, "adieresis", "a", "dieresis"),
    (0x00E5, "aring", "a", "ring"),
    (0x00E8, "egrave", "e", "grave"),
    (0x00E9, "eacute", "e", "acute"),
    (0x00EA, "ecircumflex", "e", "circumflex"),
    (0x00EB, "edieresis", "e", "dieresis"),
    # The four that take `dotlessi`, which is why it is built at all.
    (0x00EC, "igrave", "dotlessi", "grave"),
    (0x00ED, "iacute", "dotlessi", "acute"),
    (0x00EE, "icircumflex", "dotlessi", "circumflex"),
    (0x00EF, "idieresis", "dotlessi", "dieresis"),
    (0x00F1, "ntilde", "n", "tilde"),
    (0x00F2, "ograve", "o", "grave"),
    (0x00F3, "oacute", "o", "acute"),
    (0x00F4, "ocircumflex", "o", "circumflex"),
    (0x00F5, "otilde", "o", "tilde"),
    (0x00F6, "odieresis", "o", "dieresis"),
    (0x00F9, "ugrave", "u", "grave"),
    (0x00FA, "uacute", "u", "acute"),
    (0x00FB, "ucircumflex", "u", "circumflex"),
    (0x00FC, "udieresis", "u", "dieresis"),
    (0x00FD, "yacute", "y", "acute"),
    (0x00FF, "ydieresis", "y", "dieresis"),
]

CEDILLAS: list[tuple[int, str, str]] = [
    (0x00C7, "Ccedilla", "C"),
    (0x00E7, "ccedilla", "c"),
]


def fetch(url: str) -> bytes:
    request = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(request, timeout=60) as response:
        return response.read()


def latin_slice_url() -> str:
    """The URL of the `latin` slice, read out of the stylesheet rather than pinned. Google
    versions these files by content hash.
    """
    css = fetch(CSS_URL).decode("utf-8")
    blocks = css.split("@font-face")
    for block in blocks:
        if "U+0000-00FF" not in block:
            continue
        match = re.search(r"url\((https://[^)]+\.woff2)\)", block)
        if match:
            return match.group(1)
    raise SystemExit("Could not find the latin slice in the Google Fonts stylesheet.")


def bounds(font: TTFont, name: str) -> tuple[int, int, int, int]:
    glyph = font["glyf"][name]
    glyph.recalcBounds(font["glyf"])
    return glyph.xMin, glyph.yMin, glyph.xMax, glyph.yMax


def add_glyph(font: TTFont, name: str, glyph: Glyph, advance: int) -> None:
    font["glyf"][name] = glyph
    font["hmtx"][name] = (advance, glyph.xMin if glyph.numberOfContours else 0)
    order = font.getGlyphOrder()
    if name not in order:
        font.setGlyphOrder(list(order) + [name])
        font["maxp"].numGlyphs = len(font.getGlyphOrder())


def make_acute(font: TTFont) -> None:
    """`grave` mirrored about its own centre — see the module note."""
    x_min, _, x_max, _ = bounds(font, "grave")
    glyph = Glyph()
    glyph.numberOfContours = -1
    component = GlyphComponent()
    component.glyphName = "grave"
    component.transform = [[-1, 0], [0, 1]]
    # A mirror sends x to −x, so the shape lands at (−x_max, −x_min). Shifting
    # by the sum of the two ends puts it back where it started.
    component.x = x_min + x_max
    component.y = 0
    component.flags = 0x02  # ARGS_ARE_XY_VALUES
    glyph.components = [component]
    glyph.recalcBounds(font["glyf"])
    add_glyph(font, "acute", glyph, font["hmtx"]["grave"][0])


def make_cedilla(font: TTFont) -> None:
    """The comma, scaled and hung under the baseline. Its top is left a little *above* zero on
    purpose.
    """
    x_min, y_min, x_max, y_max = bounds(font, "comma")
    top = 45
    scale = round((top - FLOOR) / (y_max - y_min), 4)

    glyph = Glyph()
    glyph.numberOfContours = -1
    component = GlyphComponent()
    component.glyphName = "comma"
    component.transform = [[scale, 0], [0, scale]]
    component.x = round(-((x_min + x_max) / 2) * scale)
    component.y = round(top - y_max * scale)
    component.flags = 0x02
    glyph.components = [component]
    glyph.recalcBounds(font["glyf"])
    add_glyph(font, "cedilla", glyph, 0)


def make_dotlessi(font: TTFont) -> None:
    """`i` with the tittle removed. A pen has to be told what each point *means* — on-curve,
    off-curve, the implied on-curve midpoint between two consecutive off-curve points.
    """
    source = font["glyf"]["i"]
    source.expand(font["glyf"])
    coordinates, end_points, flags = source.getCoordinates(font["glyf"])

    spans = []
    start = 0
    for end in end_points:
        spans.append((start, end))
        start = end + 1
    if len(spans) != 2:
        raise SystemExit(f"`i` has {len(spans)} contours; expected a stem and a tittle.")

    tittle = max(spans, key=lambda span: min(coordinates[i][1] for i in range(span[0], span[1] + 1)))
    stem = next(span for span in spans if span != tittle)

    glyph = Glyph()
    glyph.numberOfContours = 1
    glyph.coordinates = GlyphCoordinates(
        [coordinates[i] for i in range(stem[0], stem[1] + 1)]
    )
    glyph.flags = array.array("B", [flags[i] & 0x01 for i in range(stem[0], stem[1] + 1)])
    glyph.endPtsOfContours = [stem[1] - stem[0]]
    glyph.program = ttProgram.Program()
    glyph.program.fromBytecode(b"")
    glyph.recalcBounds(font["glyf"])
    add_glyph(font, "dotlessi", glyph, font["hmtx"]["i"][0])


def mark_scale(font: TTFont, mark: str, uppercase: bool) -> float:
    """How far a mark shrinks so the row of them lands on one line. Lowercase never shrinks:
    there is room.
    """
    if not uppercase:
        return 1.0
    _, y_min, _, y_max = bounds(font, mark)
    available = CEILING - (UPPER_TOP + UPPER_GAP)
    return min(1.0, round(available / (y_max - y_min), 4))


def compose(font: TTFont, name: str, base: str, mark: str) -> None:
    base_x_min, _, base_x_max, base_y_max = bounds(font, base)
    mark_x_min, mark_y_min, mark_x_max, mark_y_max = bounds(font, mark)

    uppercase = base_y_max > 600
    scale = mark_scale(font, mark, uppercase)
    if uppercase:
        bottom = UPPER_TOP + UPPER_GAP
    elif base == "dotlessi":
        bottom = DOTLESS_MARK_BOTTOM
    else:
        bottom = LOWER_MARK_BOTTOM

    glyph = Glyph()
    glyph.numberOfContours = -1

    base_component = GlyphComponent()
    base_component.glyphName = base
    base_component.x = 0
    base_component.y = 0
    base_component.flags = 0x02
    # The composite is as wide as the letter under it: an accent adds height,
    # never advance, or every accented word would set wider than its neighbours.
    base_component.flags |= 0x0200  # USE_MY_METRICS

    mark_component = GlyphComponent()
    mark_component.glyphName = mark
    if scale != 1.0:
        mark_component.transform = [[scale, 0], [0, scale]]
    mark_component.x = round(
        (base_x_min + base_x_max) / 2 - ((mark_x_min + mark_x_max) / 2) * scale
    )
    mark_component.y = round(bottom - mark_y_min * scale)
    mark_component.flags = 0x02

    glyph.components = [base_component, mark_component]
    glyph.recalcBounds(font["glyf"])
    add_glyph(font, name, glyph, font["hmtx"][base][0])


def compose_cedilla(font: TTFont, name: str, base: str) -> None:
    base_x_min, _, base_x_max, _ = bounds(font, base)
    cedilla_x_min, _, cedilla_x_max, _ = bounds(font, "cedilla")

    glyph = Glyph()
    glyph.numberOfContours = -1

    base_component = GlyphComponent()
    base_component.glyphName = base
    base_component.x = 0
    base_component.y = 0
    base_component.flags = 0x02 | 0x0200

    hook = GlyphComponent()
    hook.glyphName = "cedilla"
    hook.x = round((base_x_min + base_x_max) / 2 - (cedilla_x_min + cedilla_x_max) / 2)
    hook.y = 0
    hook.flags = 0x02

    glyph.components = [base_component, hook]
    glyph.recalcBounds(font["glyf"])
    add_glyph(font, name, glyph, font["hmtx"][base][0])


def rename(font: TTFont) -> None:
    name_table = font["name"]
    notice = (
        "Dragon Block is a Modified Version of ZCOOL KuaiLe "
        "(Copyright 2018 The ZCOOL KuaiLe Project Authors), adding the Latin-1 "
        "accented letters its latin subset omits. SIL Open Font License 1.1."
    )

    for record in list(name_table.names):
        if record.nameID in (1, 3, 4, 6, 16, 17, 18, 20, 21, 22):
            name_table.removeNames(record.nameID, record.platformID, record.platEncID, record.langID)

    for platform, encoding, language in ((3, 1, 0x409), (1, 0, 0)):
        name_table.setName(FAMILY, 1, platform, encoding, language)
        name_table.setName("Regular", 2, platform, encoding, language)
        name_table.setName(f"{FAMILY}: 2024", 3, platform, encoding, language)
        name_table.setName(f"{FAMILY} Regular", 4, platform, encoding, language)
        name_table.setName(POSTSCRIPT, 6, platform, encoding, language)
        name_table.setName(notice, 0, platform, encoding, language)
        name_table.setName(
            "This Font Software is licensed under the SIL Open Font License, Version 1.1.",
            13,
            platform,
            encoding,
            language,
        )
        name_table.setName("https://openfontlicense.org", 14, platform, encoding, language)


def main() -> int:
    url = latin_slice_url()
    print(f"latin slice: {url}")

    source = HERE / ".zcool-latin.woff2"
    source.write_bytes(fetch(url))

    font = TTFont(source)
    cmap = font.getBestCmap()

    make_acute(font)
    make_cedilla(font)
    make_dotlessi(font)

    for _, name, base, mark in COMPOSITES:
        compose(font, name, base, mark)
    for _, name, base in CEDILLAS:
        compose_cedilla(font, name, base)

    # One cmap subtable per format the font already carries, so the new letters
    # are reachable however the shaper looks them up.
    added = {code: name for code, name, _, _ in COMPOSITES}
    added.update({code: name for code, name, _ in CEDILLAS})
    for table in font["cmap"].tables:
        if table.isUnicode():
            table.cmap.update(added)

    rename(font)

    # Nothing above may exceed the metrics the font already declares — see the
    # module note on why raising them would move every line on this skin.
    glyf = font["glyf"]
    for code, name in added.items():
        glyph = glyf[name]
        glyph.recalcBounds(glyf)
        if glyph.yMax > CEILING or glyph.yMin < FLOOR:
            raise SystemExit(
                f"U+{code:04X} ({name}) is {glyph.yMin}..{glyph.yMax}, "
                f"outside the font's own {FLOOR}..{CEILING}."
            )

    font.flavor = "woff2"
    ARCHIVE.parent.mkdir(parents=True, exist_ok=True)
    SERVED.parent.mkdir(parents=True, exist_ok=True)
    font.save(ARCHIVE)
    SERVED.write_bytes(ARCHIVE.read_bytes())
    source.unlink(missing_ok=True)

    licence = HERE / "LICENCE.txt"
    if not licence.exists():
        licence.write_bytes(fetch(OFL_URL))

    missing = [
        f"U+{code:04X}"
        for code in list(added) + list(cmap)
        if code not in font.getBestCmap()
    ]
    print(f"glyphs: {font['maxp'].numGlyphs}   size: {ARCHIVE.stat().st_size:,} bytes")
    print(f"missing after build: {missing or 'none'}")
    print(f"wrote {ARCHIVE}")
    print(f"wrote {SERVED}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
