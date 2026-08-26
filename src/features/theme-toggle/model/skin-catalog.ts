import type { ThemeSkin } from '@/entities/user/model/types';
import { translate, type TranslationKey } from '@/shared/i18n';

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
  /**
   * Eldritch only: something is looking out of the mock.
   *
   * The real skin opens its eye on the page rather than on a card, but a mock
   * has no page to open one on — and a preview that only paints the palette
   * would be selling a teal-and-violet colour scheme, which is the least of
   * what this theme is.
   */
  watcher?: string;
  /**
   * Autumn only: the two colours the leaves in the mock are drawn in — one
   * caught mid-fall over the page, one resting on a card.
   *
   * A pair rather than a single colour because a scatter of one hue reads as a
   * pattern, and the whole point of the skin is that no two leaves match.
   */
  leaves?: [string, string];
  /**
   * Runic only: the colour of the ink.
   *
   * Drawn as a ruled line down the mock's own edge and a rune inked onto one of
   * its cards — the two places the real skin puts it. A preview that only
   * painted the paper would be selling a beige theme.
   */
  rune?: string;
  /**
   * Underwater only: the colour bubbles and the caustic net are drawn in.
   *
   * The net is the thing being sold here. A preview that painted the palette
   * and stopped would be a cyan card, and cyan cards are not what anybody
   * remembers about this skin — the broken light on every surface is.
   */
  caustic?: string;
  /**
   * Volcano only: the two ends of the temperature ramp — flow, then core.
   *
   * A pair rather than one colour because the entire skin is the *ramp*: a hot
   * line under every object that runs from orange to yellow-white. One value
   * would sell an orange theme, which is the least of what this is.
   */
  molten?: [string, string];
}

export interface SkinDefinition {
  value: ThemeSkin;
  /**
   * The theme's name, and the one string here that is *not* a key.
   *
   * "Studio", "Newsprint", "Eldritch" are names rather than words — they do not
   * translate any more than a font's does, and a Portuguese reader looking for
   * the theme somebody described to them wants to find the same label.
   */
  name: string;
  /**
   * Three or four words, shown under the name in the gallery.
   *
   * A `TranslationKey`, not the words. Same reasoning as `TASK_TYPE_META`: this
   * table carries presentation the design system owns *and* vocabulary the
   * reader's language owns, and keeping literal English here made the whole
   * theme gallery — the one screen in the app that is entirely prose —
   * untranslatable. The type is what keeps it honest: a key with no entry in
   * the dictionary is a compile error.
   */
  tagline: TranslationKey;
  /** One sentence, also a key. Only the gallery has room for it. */
  description: TranslationKey;
  /**
   * What somebody would type looking for this theme. Searched alongside the
   * name and the tagline, which is why "dark", "retro" and "loud" are in here
   * and not in the prose.
   */
  tags: string[];
  /**
   * The same keywords in Portuguese, searched alongside the English ones.
   *
   * Additive rather than a second table keyed by locale: somebody switching
   * languages does not stop knowing the English word for "dark", and a search
   * that quietly narrowed when they did would be worse than one that matches
   * both. Optional, so a theme that has not been given any is simply searched
   * in English.
   */
  tagsPtBR?: string[];
  light: SkinPreview;
  dark: SkinPreview;
}

export const SKIN_CATALOG: SkinDefinition[] = [
  {
    value: 'STUDIO',
    name: 'Studio',
    tagline: 'skin.STUDIO.tagline',
    description: 'skin.STUDIO.body',
    tags: ['default', 'minimal', 'clean', 'neutral', 'indigo', 'calm', 'professional'],
    tagsPtBR: [
      'padrão',
      'minimalista',
      'limpo',
      'neutro',
      'índigo',
      'calmo',
      'profissional',
      'claro',
    ],
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
    tagline: 'skin.PAPER.tagline',
    description: 'skin.PAPER.body',
    tags: ['illustrated', 'playful', 'cartoon', 'yellow', 'bold', 'friendly', 'sticker'],
    tagsPtBR: ['ilustrado', 'divertido', 'desenho', 'amarelo', 'marcante', 'adesivo', 'papel'],
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
    tagline: 'skin.TERMINAL.tagline',
    description: 'skin.TERMINAL.body',
    tags: ['retro', 'crt', 'monospace', 'neon', 'hacker', 'code', 'magenta', 'dark'],
    tagsPtBR: [
      'retrô',
      'monoespaçada',
      'néon',
      'hacker',
      'código',
      'magenta',
      'escuro',
      'terminal',
    ],
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
    tagline: 'skin.VINTAGE.tagline',
    description: 'skin.VINTAGE.body',
    tags: ['brass', 'steampunk', 'serif', 'antique', 'warm', 'leather', 'classic'],
    tagsPtBR: [
      'latão',
      'steampunk',
      'serifada',
      'antigo',
      'quente',
      'couro',
      'clássico',
      'vintage',
    ],
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
    tagline: 'skin.PIXEL.tagline',
    description: 'skin.PIXEL.body',
    tags: ['arcade', '8-bit', 'game', 'sprite', 'retro', 'nes', 'blocky', 'magenta'],
    tagsPtBR: ['fliperama', 'arcade', '8 bits', 'jogo', 'sprite', 'retrô', 'pixel', 'magenta'],
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
    tagline: 'skin.SPACE.tagline',
    description: 'skin.SPACE.body',
    tags: ['space', 'stars', 'sci-fi', 'dark', 'void', 'mint', 'glow', 'futuristic'],
    tagsPtBR: [
      'espaço',
      'estrelas',
      'ficção científica',
      'escuro',
      'vazio',
      'menta',
      'brilho',
      'futurista',
    ],
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
    tagline: 'skin.HAZARD.tagline',
    description: 'skin.HAZARD.body',
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
    tagsPtBR: [
      'tóxico',
      'radioativo',
      'atômico',
      'nuclear',
      'aviso',
      'industrial',
      'amarelo',
      'verde',
      'perigo',
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
    tagline: 'skin.NEWSPAPER.tagline',
    description: 'skin.NEWSPAPER.body',
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
    tagsPtBR: [
      'jornal',
      'impresso',
      'serifada',
      'editorial',
      'manchete',
      'meio-tom',
      'papel',
      'vermelho',
      'clássico',
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
    tagline: 'skin.ELDRITCH.tagline',
    description: 'skin.ELDRITCH.body',
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
    tagsPtBR: [
      'lovecraft',
      'cósmico',
      'horror',
      'abissal',
      'oculto',
      'escuro',
      'ciano',
      'violeta',
      'misterioso',
      'gótico',
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
    tagline: 'skin.AUTUMN.tagline',
    description: 'skin.AUTUMN.body',
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
    tagsPtBR: [
      'outono',
      'folhas',
      'colheita',
      'quente',
      'aconchegante',
      'laranja',
      'âmbar',
      'madeira',
      'natureza',
      'sazonal',
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
  {
    value: 'RUNIC',
    name: 'Runic',
    tagline: 'skin.RUNIC.tagline',
    description: 'skin.RUNIC.body',
    tags: [
      'runic',
      'runes',
      'norse',
      'viking',
      'paper',
      'parchment',
      'vellum',
      'manuscript',
      'scroll',
      'ink',
      'oxblood',
      'sepia',
      'aged',
      'arcane',
      'fantasy',
      'bold',
    ],
    tagsPtBR: [
      'rúnico',
      'runas',
      'nórdico',
      'viking',
      'papel',
      'pergaminho',
      'antigo',
      'medieval',
    ],
    light: {
      surface: '#dec79a',
      raised: '#ead4a5',
      edge: '#926e44',
      brand: '#8c2e1a',
      content: '#3e180c',
      radius: 0,
      font: "'Bahnschrift', 'DIN Condensed', 'Segoe UI', system-ui, sans-serif",
      border: 2,
      rune: '#7e1e0e',
    },
    dark: {
      surface: '#1a130d',
      raised: '#281e15',
      edge: '#604a32',
      brand: '#e28e60',
      content: '#f0e2c7',
      radius: 0,
      font: "'Bahnschrift', 'DIN Condensed', 'Segoe UI', system-ui, sans-serif",
      border: 2,
      rune: '#f6a05c',
    },
  },
  {
    value: 'UNDERWATER',
    name: 'Underwater',
    tagline: 'skin.UNDERWATER.tagline',
    description: 'skin.UNDERWATER.body',
    tags: [
      'underwater',
      'ocean',
      'sea',
      'water',
      'aquatic',
      'deep',
      'diving',
      'reef',
      'caustics',
      'bubbles',
      'teal',
      'cyan',
      'aqua',
      'calm',
      'soft',
    ],
    tagsPtBR: ['submerso', 'oceano', 'mar', 'água', 'azul', 'profundo', 'bolhas', 'aquático'],
    light: {
      surface: '#bae0e2',
      raised: '#d6f1f0',
      edge: '#3a8292',
      brand: '#0a5e6e',
      content: '#082e3a',
      radius: 22,
      font: "'Quicksand', 'Varela Round', 'Trebuchet MS', system-ui, sans-serif",
      border: 1,
      caustic: '#ffffff',
    },
    dark: {
      surface: '#051220',
      raised: '#0b2032',
      edge: '#1e5268',
      brand: '#5ee2e2',
      content: '#d6f0f6',
      radius: 22,
      font: "'Quicksand', 'Varela Round', 'Trebuchet MS', system-ui, sans-serif",
      border: 1,
      caustic: '#60ecea',
    },
  },
  {
    value: 'VOLCANO',
    name: 'Volcano',
    tagline: 'skin.VOLCANO.tagline',
    description: 'skin.VOLCANO.body',
    tags: [
      'volcano',
      'volcanic',
      'lava',
      'magma',
      'molten',
      'basalt',
      'ash',
      'obsidian',
      'fire',
      'heat',
      'ember',
      'orange',
      'red',
      'loud',
      'bold',
      'dark',
    ],
    tagsPtBR: [
      'vulcão',
      'vulcânico',
      'lava',
      'magma',
      'derretido',
      'cinzas',
      'brasas',
      'fogo',
      'quente',
    ],
    light: {
      surface: '#cec3bb',
      raised: '#e4dbd3',
      edge: '#5c4a40',
      brand: '#8e2c0a',
      content: '#201612',
      radius: 2,
      font: "'Archivo Black', 'Anton', Impact, 'Franklin Gothic Heavy', sans-serif",
      border: 2,
      molten: ['#e25814', '#ffda7a'],
    },
    dark: {
      surface: '#0e0a0a',
      raised: '#1d1514',
      edge: '#5c3a2a',
      brand: '#ff7c2c',
      content: '#f6e8de',
      radius: 2,
      font: "'Archivo Black', 'Anton', Impact, 'Franklin Gothic Heavy', sans-serif",
      border: 2,
      molten: ['#ff701a', '#ffeca8'],
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

  /*
   * The tagline is searched in the reader's own language.
   *
   * `translate` rather than a `t` threaded down from the page: this is called
   * from a `useMemo` keyed on the query, and the language it reads is the one
   * that was active when the search ran — which is the only answer that can
   * match what is on screen. The `tags` are deliberately *not* translated: they
   * are the words somebody types looking for a theme, and a Portuguese reader
   * hunting the dark one is as likely to type "dark" as "escuro", so both
   * lists are kept and searched together.
   */
  return SKIN_CATALOG.filter((skin) =>
    [skin.name, translate(skin.tagline), ...skin.tags, ...(skin.tagsPtBR ?? [])].some((field) =>
      field.toLowerCase().includes(needle),
    ),
  );
};
