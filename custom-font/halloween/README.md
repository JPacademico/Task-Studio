# halloween — Creepster

A single-weight display face with a dripping, uneven baseline. Used by the
Halloween skin for **names only** — task titles, document names, rail
destinations, settings sections — and not for the greeting or the page titles,
which stay on Chiller. See the long note at the foot of `src/app/styles/index.css`
for that split and why it is drawn where it is.

- **Foundry:** Font Diner
- **Licence:** SIL Open Font License 1.1 — see `LICENCE.txt`, verbatim as shipped
- **Served at:** `/fonts/halloween/creepster.woff2`

## `size-adjust: 82%`

Declared on the `@font-face`. Creepster's cap height is unusually large for its
em, so at a shared `font-size` it sets visibly bigger than the faces around it —
which broke every `truncate` in the rail. The adjust brings its rendered size
back in line without touching the twenty-odd `font-size` declarations that
would otherwise each need a correction.
