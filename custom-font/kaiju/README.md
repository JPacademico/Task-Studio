# kaiju — Studiozilla

The Kaiju skin's display face: heavy capitals that look like something large
has walked over them — feet chewed into uneven fangs, capitals split by a crack.

## Where it came from

[Bowlby One](https://fonts.google.com/specimen/Bowlby+One) by Vernon Adams,
downloaded from Google Fonts on 2026-10-06:

- `bowlby-one.woff2` — Google Fonts' `latin` file for Bowlby One v25, byte for
  byte (`https://fonts.gstatic.com/s/bowlbyone/v25/taiPGmVuC4y96PFeqp8sqomI_A.woff2`,
  21,536 bytes). Covers Basic Latin and Latin-1, so the Portuguese interface gets
  its ç, ã, õ and é from the face itself rather than from the fallback.
- `LICENCE.txt` — the OFL as it sits beside the font in `google/fonts`.

## Why this face

A monster-movie title wants weight first: wide, black, blocky capitals that
read from across a room. Bowlby One is that, it is open-licence, and unlike the
horror faces it stays legible at the 13–16px a sidebar title is set at. The
monster is added on top of it rather than chosen in.

## Studiozilla — the recut

`studiozilla.woff2`, built by `build-studiozilla.py` from `bowlby-one.woff2`
and copied to `public/fonts/kaiju/`. Re-run it after any change:

```
python custom-font/kaiju/build-studiozilla.py
```

It needs `fonttools`, `skia-pathops` and `pillow`. What it changes:

- **Condensed to 86%** with 14 units of extra tracking per side. Bowlby sets
  about 0.8em per capital; a section title in a rail has to fit. Kerning pairs
  are condensed with the letters.
- **Bitten feet.** Every glyph loses a row of uneven fangs from its foot, up to
  ~5% of the em deep. Uneven on purpose — a regular row reads as a saw or a
  postage stamp. At 14px it is a roughness, not a hole.
- **Cracked capitals.** A–Z and 0–9 each get one tapered lightning crack from
  the crown into the body. Lower case and punctuation stay whole: they carry the
  reading at small sizes. The cracks are seeded by glyph name, so a rebuild is
  identical.
- **Hinting removed.** The outlines changed, so the original bytecode would
  steer the wrong points; `gasp` asks for smoothing at every size instead.
- `preview.png` is written beside it on every build, for checking by eye.

The skin uses it for display and section titles only. Body text and task titles
stay in a plain sans — see `--font-display` and `--font-sans` on
`[data-skin='kaiju']` in `src/app/styles/index.css`.

## Licence

SIL Open Font License 1.1, with Reserved Font Names "Bowlby", "Bowlby One" and
"Bowlby One SC". `bowlby-one.woff2` is kept here unmodified as the source and is
not served. Studiozilla is a Modified Version, which the OFL allows on two
conditions this folder meets: it does not use a reserved name (the family and
PostScript names are `Studiozilla` / `Studiozilla-Regular`, and the name table
credits Bowlby One as its source), and it is released under the same licence —
`LICENCE.txt` covers both files.
