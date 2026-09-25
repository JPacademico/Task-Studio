# pixel — Studio Pixel

The Pixel skin's typeface. Served from `public/fonts/pixel/`.

| File | Weight | Used for |
|---|---|---|
| `studio-pixel.woff2` | 400 (covers 100–500) | body text, labels |
| `studio-pixel-bold.woff2` | 700 (covers 600–900) | `font-semibold` / `font-bold`, headings |

## Where it came from

Drawn for this product, not downloaded. Every glyph is an ASCII bitmap in
`build-studio-pixel.py`, traced into outlines and written out as WOFF2 by that
script — run it again after changing a drawing:

    python custom-font/pixel/build-studio-pixel.py

It writes both files here and to `public/fonts/pixel/`, and renders
`preview.png` beside itself so a change can be checked by eye.

## Why the skin has its own face

The skin used to name 'Press Start 2P', 'Silkscreen' and 'Pixelify Sans', none
of which was ever loaded — so it rendered in Cascadia Mono / Consolas, the same
monospace the Terminal skin falls back to. The two skins read as one. A face
drawn on the same 5x7 grid as the skin's pointer (`custom-cursor/pixel/`)
gives the 8-bit skin a look nobody else has.

## Coverage

ASCII, the Latin-1 letters Portuguese and English need (á à â ã ä é ê ë í î ï
ó ô õ ö ú û ü ç ñ ý ÿ and their capitals), dashes, curly quotes, ellipsis,
bullet, arrows, check mark, ° × ÷ ± € £ « » ¡ ¿ ª º. Anything else falls
through to the monospace in the skin's stack.

## Licence

Original work, shipped as part of Task Studio under the application's own
terms. No third-party outlines or bitmaps are included.
