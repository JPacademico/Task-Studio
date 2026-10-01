# volcano — Frijole

The Volcano skin's display face: heavy capitals whose outlines have crumbled,
the way a block of cooled basalt breaks.

## Where it came from

[Frijole](https://fonts.google.com/specimen/Frijole) by Sideshow (Font Diner),
downloaded from Google Fonts on 2026-09-30:

- `frijole.woff2` — Google Fonts' `latin` file for Frijole v15, byte for byte
  (`https://fonts.gstatic.com/s/frijole/v15/uU9PCBUR8oakM2BQ3xTR3w.woff2`,
  92,364 bytes). Covers Basic Latin and Latin-1, so the Portuguese interface
  gets its ç, ã, õ and é from the face itself rather than from the fallback.
- `LICENCE.txt` — the OFL as it sits beside the font in `google/fonts`.

## Why this face

The brief pointed at a cracked, chunky dungeon lettering whose own licence is
personal-use only, which the rule in `../README.md` excludes whatever it looks
like. Frijole is the closest open-licence match: solid black strokes and a
chipped, eroded silhouette, and it stays legible at small sizes.

## Where it is used

`--font-display` on the Volcano skin: page titles (`h1`) and the landing page's
large display lines, as Frijole, unmodified.

Every section title — `h2`–`h4`, `.ui-section-title`, `.ui-modal-title`,
`.ui-doc-title` — uses `--font-display-small`, which is **Studio Basalt**, the
recut below. Task and room titles (`.ui-task-title`) are user text read in
bulk, so they keep a solid black (`--font-display-solid`): small caps would
erase their case.

## Studio Basalt — the small-size recut

`studio-basalt.woff2`, built by `build-studio-basalt.py` from `frijole.woff2`
and copied to `public/fonts/volcano/`. Re-run it after any change:

```
python custom-font/volcano/build-studio-basalt.py
```

What it changes, all of it aimed at 11–18px:

- **The flake ring is gone.** Every Frijole letter is wrapped in a broken ring
  of small filled contours. At 14px that ring is under a pixel wide and renders
  as grey fuzz round each letter. Filled contours under `FLAKE_MAX` are dropped;
  real parts — accents, dots, the comma — start well above it.
- **Sub-pixel cracks are filled.** Holes under `CRACK_MIN` only grey the letter
  at small sizes. Counters and the larger chips stay, so the rough edge is
  still basalt.
- **Condensed to 84%** and re-spaced to a fixed side bearing, now that the ring
  no longer needs room. Frijole sets at about 0.94em per letter; a section title
  in a sidebar has to fit.
- **Hinting removed.** The outlines changed, so the original bytecode would
  steer the wrong points; `gasp` asks for smoothing at every size instead.

Fewer contours and no bytecode take the file from 92 kB to about 57 kB.

## Licence

SIL Open Font License 1.1, with Reserved Font Name "Frijole". `frijole.woff2`
ships unmodified under that name. Studio Basalt is a Modified Version, which the
OFL allows on two conditions this folder meets: it does not use the reserved
name (the family and PostScript names are `Studio Basalt` /
`StudioBasalt-Regular`, and the name table credits Frijole as its source), and it
is released under the same licence — `LICENCE.txt` covers both files.
