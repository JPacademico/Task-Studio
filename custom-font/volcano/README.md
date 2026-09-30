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
large display lines. It runs at about 0.94em per character — nearly twice the
width of the Impact those headings used to fall back to — so the 14px section
and card headings (`h2`–`h4`) use `--font-display-small` instead, a solid black
stack. See the Volcano heading rules in `src/app/styles/index.css`.

## Licence

SIL Open Font License 1.1, with Reserved Font Name "Frijole". That reservation
is why the file ships unmodified: subsetting it is a modification, and a
modified version could not keep the name. At 92 kB it is fetched only when the
Volcano skin renders a heading, with `font-display: swap`.
