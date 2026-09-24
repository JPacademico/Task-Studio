# dragon — Dragon Block

The Dragon skin's typeface: a geometric rounded-square face where every glyph is
built on the same square grid with an even stroke and softened corners.

- **Served at:** `/fonts/dragon/dragon-block.woff2`
- **Declared in:** the second `@font-face` at the top of `src/app/styles/index.css`
- **Family name in CSS:** `'Dragon Block'`
- **Built by:** `build-dragon-block.py`, in this folder
- **Size:** ~6 kB

## What it is

Dragon Block is a Modified Version of **ZCOOL KuaiLe (站酷快乐体)** — Liu Bingke,
Yang Kang and Wu Shaojie, 2018 — under the SIL Open Font License 1.1.

Upstream: <https://github.com/googlefonts/zcool-kuaile>

The modification is one thing and one thing only: the Latin-1 accented letters
the upstream `latin` subset omits are composed from the font's own marks. No
outline of the designers' was altered. See the module docstring in
`build-dragon-block.py` for every decision the script makes and why.

## What this replaced, and why the replacement is not a regression

This slot previously named **乐米曲奇方块体 (LeMi CookieBlock)** and pointed at
`/fonts/dragon/lemi-cookie-block.woff2` — a file that was never in the
repository, because a licence permitting web embedding had not been
established for it.

The effect was not "a fallback": it was that **the skin never once rendered in
its own face**. The `@font-face` resolved to nothing, `local()` matched on
approximately nobody's machine, and every visitor fell through to `Verdana` on
Windows or `Yuanti SC` on macOS. The Dragon skin has been a Verdana skin since
it shipped.

Dragon Block is the same genre by design — rounded square grid, even stroke,
softened corners, drawn as a Chinese display face — and its licence is settled
rather than pending, which is the difference that matters. It is also 6 kB
rather than the 3–8 MB an unsubsetted CJK face would have cost in front of a
first paint.

Before that, the skin set its display type in Kaiti (楷体) with Georgia behind
it for running text. That was the right face for the object the skin imitates
and the wrong one for the interface it has to be: Kaiti's Latin glyphs are an
afterthought in the design, so an interface that is mostly English set in them
reads as broken rather than as calligraphic, and Georgia carried almost all of
the actual text. A face that is *one system* is what makes the heading and the
list the same voice at two sizes.

The brush has not left the skin. It is in the dragon, the scroll rods, the
lanterns and the seal — where it is *drawing* rather than setting type.

## Why the font had to be modified at all

Google Fonts slices ZCOOL KuaiLe by unicode range, and the `latin` slice is
what makes it affordable here. But that slice covers **ASCII and punctuation
only**: no á, ã, ç, é, í, ó, õ, ú or ü.

That is not a cosmetic gap. A missing glyph does not render as a missing glyph
— it renders as *the next font in the stack appearing in the middle of a word*.
The Portuguese interface needs a cedilla or a tilde in almost every other label
(Conexões, Configurações, Ação, Não), so an unpatched slice would have put
Verdana inside every one of them, which looks like a rendering fault rather
than like a fallback.

`build-dragon-block.py` therefore composes the 53 Latin-1 letters both
interface languages use from the marks the font already carries:

| Mark | Where it comes from |
| --- | --- |
| grave, circumflex, tilde, dieresis, ring | the designers', used unmodified |
| acute | `grave` mirrored about its own centre |
| cedilla | the comma, scaled and hung under the baseline |
| dotlessi | `i` with its tittle dropped, so í is not a dot *and* an accent |

Each accented letter is a TrueType composite — two glyph references and an
offset — so it costs about 20 bytes rather than a second outline.

## Rebuilding it

```bash
python custom-font/dragon/build-dragon-block.py
```

Needs `fonttools` (`pip install fonttools brotli`). It fetches the current
`latin` slice from Google Fonts, patches it, and writes the result both here
and to `public/fonts/dragon/`. Both copies are committed — the script is for
reproducing and auditing the derivation, not a build step.

It resolves the slice URL out of the stylesheet rather than pinning it, so a
re-release upstream does not silently 404, and it refuses to finish if any
composed glyph would exceed the font's own vertical metrics.

## Why the name changed

The OFL only forbids reusing a *Reserved Font Name*, and ZCOOL KuaiLe declares
none — so keeping the name would have been permitted. It would still have been
a mistake, for a practical reason: `local('ZCOOL KuaiLe')` would then match the
**unpatched** font on any machine that has it installed, and serve a version
with no accents to exactly the people most likely to be reading Chinese and
Portuguese. Renaming makes that impossible, and it is honest about the fact
that the accents are not the original designers' work.

`local()` is not used at all in the declaration for the same reason. 6 kB over
the wire is cheaper than that class of bug.

## The fallback chain

Declared on `--font-display`, `--font-sans` and `--font-hand` in the
`[data-skin='dragon']` block, in this order:

| Family | Where it comes from | Why it is in the list |
| --- | --- | --- |
| `'Dragon Block'` | this folder | the real thing |
| `'Yuanti SC'` | macOS | the system rounded CJK face; closest match anybody has by default |
| `YouYuan` (幼圆) | Windows, with the CJK supplemental fonts installed | same idea, same shape |
| `'M PLUS Rounded 1c'` | installed by hand | the archetype of this genre |
| `Verdana` | everywhere | the widest, squarest, most even-stroked face that ships on every machine. Not rounded, but it holds the *proportions* — and proportion is what survives at 13px |
| `'Segoe UI'`, `sans-serif` | everywhere | the last resort |

Four deep behind the real face, even now that the file exists: a 6 kB request
can still fail, and a skin whose text is unreadable because one download did
not land is a skin broken by a CDN hiccup.

## Licensing

SIL Open Font License 1.1 — Copyright 2018 The ZCOOL KuaiLe Project Authors.
Free to use commercially, to embed, to serve from a website, and to modify,
which are the four things this does. The full text sits beside the file as
`LICENCE.txt`, and the derivation is recorded in the font's own name table.
