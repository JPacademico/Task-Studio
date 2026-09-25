# custom-font

Every typeface this product ships, one folder per theme.

## Why this folder exists, and why it is not `public/fonts`

Two different jobs that were being done by one directory.

`public/fonts/` is a **delivery** directory: Vite copies it verbatim to the
root of the build, so anything in it is a URL. That is the only thing it is
good at, and it has no room for the things a font actually comes with — the
licence, the original `.ttf` the `.woff2` was subset from, the note saying
which glyphs were kept and why. Those were either missing or sitting next to
the binary pretending to be assets, which is how `creepster-OFL.txt` ended up
being served to the public internet as a static file.

`custom-font/` is the **source** directory: the licence, the upstream file, the
subsetting notes, and a README per theme saying what the face is for. Nothing
in here is served. It is the folder somebody opens when they want to know where
a typeface came from or whether the product is allowed to use it.

The two are kept in step by hand, which is deliberate at this size — there are
four faces. `pixel/` and `runic/` are the two drawn here rather than sourced;
each one's build script writes both copies. See "Adding a font" below.

## Layout

```
custom-font/
  <theme>/
    README.md      what the face is, where it came from, what it is licensed under
    LICENCE.txt    the licence as the foundry ships it, verbatim
    *.woff2        the file that gets copied to public/fonts/<theme>/
```

Theme names match the `data-skin` attribute exactly — `halloween`, `dragon` —
so the folder, the served path and the CSS selector all say the same word.

## Adding a font

1. `mkdir custom-font/<theme>` and drop the `.woff2` in it with its licence.
2. Write the theme README: what it is, where it came from, and what it is for.
3. Copy the `.woff2` to `public/fonts/<theme>/` — that is what the browser
   fetches.
4. Declare the `@font-face` at the top of `src/app/styles/index.css`, pointing
   at `/fonts/<theme>/<file>.woff2`.
5. Put the family at the head of the skin's `--font-*` tokens, with a fallback
   chain behind it. **Always leave a real fallback**: a skin whose type is
   unreadable when one file 404s is a skin that is broken by a CDN hiccup.

## The one rule about licences

A face whose licence does not permit web embedding does not go in here at all,
whatever it looks like. `local()` in an `@font-face` is not a loophole — it is
for the case where somebody has *already* bought and installed the font, and
the fallback chain behind it is what everybody else gets.
