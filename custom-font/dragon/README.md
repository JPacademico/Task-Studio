# dragon — 乐米曲奇方块体 (LeMi CookieBlock)

The Dragon skin's typeface: a geometric rounded-square face where every glyph —
Latin, numeral and CJK alike — is built on the same square grid with an even
stroke and softened corners.

- **Served at:** `/fonts/dragon/lemi-cookie-block.woff2`
- **Declared in:** the `@font-face` at the top of `src/app/styles/index.css`
- **Family name in CSS:** `'LeMi CookieBlock'`

## ⚠ The file is not in this repository

**The `@font-face` is declared and the fallback chain is in place, but the
`.woff2` itself is not here.** Nothing is broken — the skin renders on the
fallbacks below — but it is not yet rendering in the face it was designed for.

To finish it:

1. Obtain 乐米曲奇方块体 under a licence that permits **web embedding**. This is
   the part that has to be checked rather than assumed: a great many CJK
   display faces are free for personal use and not for a product.
2. Subset it. An unsubsetted CJK font is 3–8 MB, which is not a thing to put in
   front of a first paint. Keep Latin, the numerals, punctuation, and whichever
   CJK ranges the interface actually uses — the skin's own UI strings are
   English, so in practice that is Latin plus the handful of characters in
   `dragon-icons.tsx` and the theme's name.
3. Drop the result here as `lemi-cookie-block.woff2` with its licence beside it
   as `LICENCE.txt`.
4. Copy it to `public/fonts/dragon/lemi-cookie-block.woff2`.

Nothing else changes; the CSS already points at that path.

## Until then: the fallback chain

Declared on `--font-display`, `--font-sans` and `--font-hand` in the
`[data-skin='dragon']` block, in this order:

| Family | Where it comes from | Why it is in the list |
| --- | --- | --- |
| `'LeMi CookieBlock'` | this folder, once added | the real thing |
| `'Yuanti SC'` | macOS | the system rounded CJK face; closest match anybody has by default |
| `YouYuan` (幼圆) | Windows, when the CJK supplemental fonts are installed | same idea, same shape |
| `'M PLUS Rounded 1c'` | installed by hand, or a Google Fonts link | the archetype of this genre |
| `Verdana` | everywhere | the widest, squarest, most even-stroked face that ships on every machine. Not rounded, but it holds the *proportions* — and proportion is what survives at 13px |
| `'Segoe UI'`, `sans-serif` | everywhere | the last resort |

`local()` sits in front of the `url()` in the `@font-face`, so anybody who has
the font installed gets it with no network request at all.

## What this replaced, and why the replacement is not a regression

The skin used to set its display type in Kaiti (楷体) — the brush-written
regular script a hanging scroll is inscribed in — with Georgia behind it for
running text. That was the right face for the object the skin was imitating and
the wrong one for the interface it has to be: Kaiti's Latin glyphs are an
afterthought in the design, so an interface that is mostly English set in them
reads as broken rather than as calligraphic, and Georgia carried almost all of
the actual text.

A face that is *one system* across Latin, numerals and CJK is the thing that
was missing. The brush is still in the skin — it is in the dragon, the scroll
rods and the seal — where it is drawing rather than setting type.
