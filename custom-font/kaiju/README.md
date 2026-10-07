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

The skin uses it for display and section titles only; the wordmark is separate, below. Body text and task titles
stay in a plain sans — see `--font-display` and `--font-sans` on
`[data-skin='kaiju']` in `src/app/styles/index.css`.

## Centred capitals

The skin sets labels, buttons and titles in capitals, and both of its faces hold
capitals above the middle of their line box, so a `+` icon beside `NOVO PROJETO`
centres and the word rides high. Both are corrected with `@font-face` metric
overrides in `src/app/styles/index.css`, which move the baseline without changing
the line height:

- **Studiozilla**: `ascent-override: 116.58%`, `descent-override: 40.02%`. Stock it
  is 1.111 / 0.455 with a 0.766 cap height: caps sat 0.055em high.
- **Kaiju Sans**: an alias of the system's Bahnschrift (`src: local('Bahnschrift')`,
  weights 300 to 700 still vary), at `85.94%` / `14.06%` with a 20% line gap. Stock
  it is 0.794 / 0.206 with a 0.719 cap height: caps sat 0.065em high.

The rule for both: ascent minus descent equals the cap height, and ascent plus
descent stays what the face already had. A browser without the descriptors (older
Safari) renders the stock metrics, which is how it looked before.

## The wordmark

The product name beside the mark is not set in Studiozilla. Mixed case at 16px in a
face with bitten feet read as melted, so the name is drawn as lettering instead:

- [Oxanium](https://fonts.google.com/specimen/Oxanium) ExtraBold (`wght` 800) by
  the Oxanium Project Authors, from `google/fonts`: chamfered, heavy, and still sharp at nav
  size. `oxanium.ttf` is the variable font byte for byte; its licence is
  `LICENCE-oxanium.txt`.
- `build-wordmark.py` shapes `TASK STUDIO` with HarfBuzz (so the kerning is the
  font's), leans it 9 degrees forward, and fuses a crest of three dorsal plates onto
  each T's crossbar with `skia-pathops`. Re-run it after any change:

```
python custom-font/kaiju/build-wordmark.py
```

  It writes `src/shared/ui/kaiju-wordmark.ts` (one SVG path, no font to load) and
  `wordmark-preview.png`. It needs `fonttools`, `skia-pathops`, `uharfbuzz` and
  `pillow`.
- `BrandName` (`src/shared/ui/brand-name.tsx`) draws the path on the Kaiju skin, a
  gradient face over a one-step extrusion, and sets plain text on every other.

The plate outline in `build-wordmark.py` is the one `PLATE` in
`src/shared/ui/kaiju-icons.tsx` and `--kaiju-plate-shape` in `index.css` draw.
Change one and change all three.

## Licence

SIL Open Font License 1.1, with Reserved Font Names "Bowlby", "Bowlby One" and
"Bowlby One SC". `bowlby-one.woff2` is kept here unmodified as the source and is
not served. Studiozilla is a Modified Version, which the OFL allows on two
conditions this folder meets: it does not use a reserved name (the family and
PostScript names are `Studiozilla` / `Studiozilla-Regular`, and the name table
credits Bowlby One as its source), and it is released under the same licence —
`LICENCE.txt` covers both files.
