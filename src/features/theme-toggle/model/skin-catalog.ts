import type { ThemeSkin } from '@/entities/user/model/types';

/**
 * The one description of every theme in the app.
 *
 * It used to live inside the settings picker, which was fine while settings
 * was the only place a theme could be chosen. Now there is a gallery too, and
 * two hand-maintained copies of eight palettes is how a theme ends up looking
 * like one thing on the shelf and another once applied — so the catalogue moved
 * here and both surfaces render the same rows.
 *
 * The preview values are deliberately literal hex rather than the CSS variables
 * the real skin uses: a card has to paint itself in a palette that is *not* the
 * active one, which a variable cannot do.
 */

export interface SkinPreview {
  surface: string;
  raised: string;
  edge: string;
  brand: string;
  content: string;
  /** Corner rounding of the mock, in px — the loudest difference between skins. */
  radius: number;
  /** Preview typeface, so the mock reads like the skin it is selling. */
  font: string;
  /** Border weight of the mock's cards. */
  border: number;
  /** Arcade only: the mock's cards lose their corner pixels, like the real thing. */
  notched?: boolean;
  /** Space only: the mock sits on a star field rather than a flat surface. */
  starfield?: boolean;
  /** Space only: a black hole half-sunk into the mock's edge, as on the page. */
  singularity?: boolean;
  /** Hazard only: a strip of tape across the top of the mock. */
  stripes?: boolean;
  /** Hazard only: what is pooled in the bottom of the mock's cards. */
  sludge?: string;
  /** Newsprint only: the double rule under the mock's masthead. */
  rule?: boolean;
  /** Newsprint only: a halftone screen over the whole mock. */
  halftone?: boolean;
  /**
   * Eldritch only: the mock's boxes grow rather than being cut, so the corner
   * rounding is asymmetric — the loudest thing the skin does, and invisible in
   * a preview that only paints its palette.
   */
  organic?: boolean;
  /** Eldritch only: something is looking out of the mock. */
  watcher?: string;
  /**
   * Autumn only: the two colours the leaves in the mock are drawn in — one
   * caught mid-fall over the page, one resting on a card.
   *
   * A pair rather than a single colour because a scatter of one hue reads as a
   * pattern, and the whole point of the skin is that no two leaves match.
   */
  leaves?: [string, string];
}

export interface SkinDefinition {
  value: ThemeSkin;
  name: string;
  /** Three or four words, shown under the name in the gallery. */
  tagline: string;
  /** One sentence. Only the gallery has room for it. */
  description: string;
  /**
   * What somebody would type looking for this theme. Searched alongside the
   * name and the tagline, which is why "dark", "retro" and "loud" are in here
   * and not in the prose.
   */
  tags: string[];
  light: SkinPreview;
  dark: SkinPreview;
}

export const SKIN_CATALOG: SkinDefinition[] = [
  {
    value: 'STUDIO',
    name: 'Studio',
    tagline: 'The quiet default',
    description:
      'Soft surfaces, one indigo accent and nothing that asks for your attention — the look the rest of these are a departure from.',
    tags: ['default', 'minimal', 'clean', 'neutral', 'indigo', 'calm', 'professional'],
    light: {
      surface: '#f6f6f8',
      raised: '#ffffff',
      edge: '#dbdbe4',
      brand: '#6366f1',
      content: '#181820',
      radius: 10,
      font: "'Inter', 'Segoe UI', system-ui, sans-serif",
      border: 1,
    },
    dark: {
      surface: '#0f0f12',
      raised: '#17171c',
      edge: '#26262e',
      brand: '#8184ff',
      content: '#f5f5f7',
      radius: 10,
      font: "'Inter', 'Segoe UI', system-ui, sans-serif",
      border: 1,
    },
  },
  {
    value: 'PAPER',
    name: 'Paper',
    tagline: 'Illustrated and loud',
    description:
      'Thick ink outlines, chunky corners and shadows that read as cut paper lying on the page rather than as a blur.',
    tags: ['illustrated', 'playful', 'cartoon', 'yellow', 'bold', 'friendly', 'sticker'],
    light: {
      surface: '#e4ecfe',
      raised: '#fcfdff',
      edge: '#1a1a30',
      brand: '#facc15',
      content: '#121224',
      radius: 16,
      font: "'Nunito', 'Trebuchet MS', system-ui, sans-serif",
      border: 2,
    },
    dark: {
      surface: '#151736',
      raised: '#21244c',
      edge: '#7a84d6',
      brand: '#fad642',
      content: '#eef1ff',
      radius: 16,
      font: "'Nunito', 'Trebuchet MS', system-ui, sans-serif",
      border: 2,
    },
  },
  {
    value: 'TERMINAL',
    name: 'Terminal',
    tagline: 'Phosphor and scanlines',
    description:
      'Monospace everywhere, hard corners, neon rules and a faint scanline wash over the whole tube.',
    tags: ['retro', 'crt', 'monospace', 'neon', 'hacker', 'code', 'magenta', 'dark'],
    light: {
      surface: '#f0e9f6',
      raised: '#fcf9ff',
      edge: '#963cb2',
      brand: '#be18ae',
      content: '#2e0c42',
      radius: 0,
      font: "'Cascadia Mono', Consolas, monospace",
      border: 1,
    },
    dark: {
      surface: '#160628',
      raised: '#270a44',
      edge: '#c426d0',
      brand: '#ff3ed6',
      content: '#7afaf6',
      radius: 0,
      font: "'Cascadia Mono', Consolas, monospace",
      border: 1,
    },
  },
  {
    value: 'VINTAGE',
    name: 'Vintage',
    tagline: 'Brass and leather',
    description:
      'Machined corners, engraved rules and controls that catch a highlight along the top edge and sink when pressed.',
    tags: ['brass', 'steampunk', 'serif', 'antique', 'warm', 'leather', 'classic'],
    light: {
      surface: '#eadbc2',
      raised: '#f7eedb',
      edge: '#8a6a3d',
      brand: '#b06a20',
      content: '#332212',
      radius: 3,
      font: 'Baskerville, Georgia, serif',
      border: 2,
    },
    dark: {
      surface: '#211911',
      raised: '#2f2419',
      edge: '#a97e3f',
      brand: '#e0a94a',
      content: '#f0e2c8',
      radius: 3,
      font: 'Baskerville, Georgia, serif',
      border: 2,
    },
  },
  {
    value: 'PIXEL',
    name: 'Pixel art',
    tagline: '8-bit cartridge',
    description:
      'Nine-slice tiles with the corner pixels knocked out, ordered dither for a material, and motion quantised into whole frames.',
    tags: ['arcade', '8-bit', 'game', 'sprite', 'retro', 'nes', 'blocky', 'magenta'],
    light: {
      surface: '#d6deec',
      raised: '#fafaff',
      edge: '#16142c',
      brand: '#5c3ad6',
      content: '#16142c',
      radius: 0,
      font: "'Silkscreen', 'VT323', 'Cascadia Mono', Consolas, monospace",
      border: 3,
      notched: true,
    },
    dark: {
      surface: '#100c28',
      raised: '#1e1642',
      edge: '#a68cff',
      brand: '#ff52c4',
      content: '#ece8ff',
      radius: 0,
      font: "'Silkscreen', 'VT323', 'Cascadia Mono', Consolas, monospace",
      border: 3,
      notched: true,
    },
  },
  {
    value: 'SPACE',
    name: 'Space',
    tagline: 'The deep field',
    description:
      'Lit glass instruments over a drifting starfield, with a singularity sunk into every screen edge where a menu hides.',
    tags: ['space', 'stars', 'sci-fi', 'dark', 'void', 'mint', 'glow', 'futuristic'],
    light: {
      surface: '#e6ecf9',
      raised: '#fcfdff',
      edge: '#8c9ac8',
      brand: '#07806c',
      content: '#0c122c',
      radius: 18,
      font: "'Exo 2', 'Titillium Web', 'Segoe UI', system-ui, sans-serif",
      border: 1,
      starfield: true,
      singularity: true,
    },
    dark: {
      surface: '#020309',
      raised: '#0a0d1b',
      edge: '#4c5a9e',
      brand: '#2de6b8',
      content: '#e9f0ff',
      radius: 18,
      font: "'Exo 2', 'Titillium Web', 'Segoe UI', system-ui, sans-serif",
      border: 1,
      starfield: true,
      singularity: true,
    },
  },
  {
    value: 'HAZARD',
    name: 'Hazard',
    tagline: 'Containment breach',
    description:
      'Stencilled warnings, hazard tape at every seam and toxic sludge pooled in the bottom of every card — which sloshes.',
    tags: [
      'toxic',
      'radioactive',
      'atomic',
      'nuclear',
      'warning',
      'industrial',
      'yellow',
      'green',
      'loud',
      'danger',
    ],
    light: {
      surface: '#e2e0d2',
      raised: '#f2f1e6',
      edge: '#1e1e18',
      brand: '#eab308',
      content: '#161610',
      radius: 3,
      font: "'Oswald', 'Arial Narrow', Impact, sans-serif",
      border: 2,
      stripes: true,
      sludge: '#84cc16',
    },
    dark: {
      surface: '#0a0c09',
      raised: '#151913',
      edge: '#5c6e30',
      brand: '#a3e635',
      content: '#dfedd1',
      radius: 3,
      font: "'Oswald', 'Arial Narrow', Impact, sans-serif",
      border: 2,
      stripes: true,
      sludge: '#a3ff2a',
    },
  },
  {
    value: 'NEWSPAPER',
    name: 'Newsprint',
    tagline: 'The morning edition',
    description:
      'Halftone paper, ruled columns, banner headlines under a double rule, and photographs printed the only way a press could — in black.',
    tags: [
      'newspaper',
      'newsprint',
      'print',
      'serif',
      'editorial',
      'headline',
      'halftone',
      'paper',
      'red',
      'classic',
    ],
    light: {
      surface: '#e7e2d6',
      raised: '#f4f0e6',
      edge: '#1a1816',
      brand: '#b21e22',
      content: '#141210',
      radius: 0,
      font: "'Playfair Display', 'Times New Roman', Times, serif",
      border: 1,
      rule: true,
      halftone: true,
    },
    dark: {
      surface: '#121110',
      raised: '#1d1b19',
      edge: '#6a635a',
      brand: '#e86058',
      content: '#f0ece2',
      radius: 0,
      font: "'Playfair Display', 'Times New Roman', Times, serif",
      border: 1,
      rule: true,
      halftone: true,
    },
  },
  {
    value: 'ELDRITCH',
    name: 'Eldritch',
    tagline: 'Something is reading this',
    description:
      'Corners that grew rather than being cut, light with no source, inscribed capitals — and an iris that opens on every card when the pointer finds it.',
    tags: [
      'lovecraft',
      'eldritch',
      'cosmic',
      'horror',
      'abyssal',
      'occult',
      'dark',
      'teal',
      'violet',
      'mysterious',
      'gothic',
    ],
    light: {
      surface: '#e0d8c4',
      raised: '#eee8d6',
      edge: '#4a4c3e',
      brand: '#11645a',
      content: '#201e18',
      radius: 14,
      font: "'Cinzel', 'Palatino Linotype', Palatino, Georgia, serif",
      border: 1,
      organic: true,
      watcher: '#7a4eba',
    },
    dark: {
      surface: '#060a0c',
      raised: '#0d1517',
      edge: '#2c504a',
      brand: '#56d2ae',
      content: '#d6e8e2',
      radius: 14,
      font: "'Cinzel', 'Palatino Linotype', Palatino, Georgia, serif",
      border: 1,
      organic: true,
      watcher: '#9e6cf6',
    },
  },
  {
    value: 'AUTUMN',
    name: 'Autumn',
    tagline: 'Warm paper and falling leaves',
    description:
      'Pressed rag paper under a low sun, corners rounded the whole way through, a serif you could read a novel in — and leaves coming down over all of it.',
    tags: [
      'autumn',
      'fall',
      'october',
      'leaves',
      'harvest',
      'warm',
      'cosy',
      'cozy',
      'orange',
      'amber',
      'wood',
      'nature',
      'seasonal',
    ],
    light: {
      surface: '#f7ebd6',
      raised: '#fdf5e7',
      edge: '#926234',
      brand: '#ba4a14',
      content: '#2e1e12',
      radius: 17,
      font: "'Gloock', 'Bookman Old Style', 'Palatino Linotype', Georgia, serif",
      border: 2,
      leaves: ['#ba4a14', '#d69422'],
    },
    dark: {
      surface: '#1a120d',
      raised: '#261b13',
      edge: '#603e24',
      brand: '#eb8d2e',
      content: '#f4e5ce',
      radius: 17,
      font: "'Gloock', 'Bookman Old Style', 'Palatino Linotype', Georgia, serif",
      border: 2,
      leaves: ['#eb8d2e', '#d64a2c'],
    },
  },
];

/** The catalogue, keyed — for the surfaces that already know which skin they want. */
export const SKIN_BY_VALUE = new Map(SKIN_CATALOG.map((skin) => [skin.value, skin]));

/**
 * How many themes the settings page shows before it stops listing and starts
 * pointing at the gallery.
 *
 * Three is not an arbitrary cut: it is the width of the grid, so the section is
 * exactly one row whatever the catalogue grows to. A settings page that lists
 * every theme in the product is a settings page that gets longer every time
 * somebody adds one, and the choice is visual anyway — it wants a gallery.
 */
export const SETTINGS_SKIN_LIMIT = 3;

/**
 * Free-text search over the catalogue.
 *
 * Name, tagline and tags, all case-folded, matched on substring rather than on
 * whole words so "news" finds Newsprint and "radio" finds Hazard. An empty
 * query returns everything in catalogue order, which is the order the themes
 * shipped in.
 */
export const searchSkins = (query: string): SkinDefinition[] => {
  const needle = query.trim().toLowerCase();
  if (!needle) return SKIN_CATALOG;

  return SKIN_CATALOG.filter((skin) =>
    [skin.name, skin.tagline, ...skin.tags].some((field) =>
      field.toLowerCase().includes(needle),
    ),
  );
};
