import type { ThemeSkin } from '@/entities/user/model/types';
import { translate, type TranslationKey } from '@/shared/i18n';

/**
 * The one description of every theme in the app. It used to live inside the settings picker, which
 * was fine while settings was the only place a theme could be chosen.
 */

/**
 * The skin's face, named once because both palettes use it. 乐米曲奇方块体 — LeMi CookieBlock — a
 * geometric rounded-square face where Latin.
 */
const DRAGON_FONT =
  "'LeMi CookieBlock', 'Yuanti SC', YouYuan, 'M PLUS Rounded 1c', Verdana, 'Segoe UI', sans-serif";

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
  /**
   * Vibecoded only: the second half of the gradient. The skin's whole identity is a 135-degree
   * indigo-to-fuchsia sweep.
   */
  gradient?: string;
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
  /**
   * Dragon only: the gold mounting rule inset inside every card. The scroll border is the loudest
   * thing this skin does to a panel.
   */
  scrollTrim?: string;
  /**
   * Dragon only: the jade the mark is cut from. A third colour, and the reason the palette is not
   * simply "red and gold".
   */
  jade?: string;
  /** Newsprint only: a halftone screen over the whole mock. */
  halftone?: boolean;
  /**
   * Eldritch only: the mock's boxes grow rather than being cut, so the corner rounding is
   * asymmetric — the loudest thing the skin does.
   */
  organic?: boolean;
  /**
   * Eldritch only: something is looking out of the mock. The real skin opens its eye on the page
   * rather than on a card.
   */
  watcher?: string;
  /**
   * Autumn only: the two colours the leaves in the mock are drawn in — one caught mid-fall over the
   * page, one resting on a card.
   */
  leaves?: [string, string];
  /**
   * Runic only: the colour of the ink. Drawn as a ruled line down the mock's own edge and a rune
   * inked onto one of its cards — the two places the real skin puts it.
   */
  rune?: string;
  /**
   * Underwater only: the colour bubbles and the caustic net are drawn in. The net is the thing
   * being sold here.
   */
  caustic?: string;
  /**
   * Volcano only: the two ends of the temperature ramp — flow, then core. A pair rather than one
   * colour because the entire skin is the *ramp*.
   */
  molten?: [string, string];
}

export interface SkinDefinition {
  value: ThemeSkin;
  /**
   * The theme's name, and the one string here that is *not* a key. "Studio", "Newsprint",
   * "Eldritch" are names rather than words — they do not translate any more than a font's does.
   */
  name: string;
  /**
   * Three or four words, shown under the name in the gallery. A `TranslationKey`, not the words.
   */
  tagline: TranslationKey;
  /** One sentence, also a key. Only the gallery has room for it. */
  description: TranslationKey;
  /**
   * What somebody would type looking for this theme. Searched alongside the name and the tagline,
   * which is why "dark", "retro" and "loud" are in here and not in the prose.
   */
  tags: string[];
  /**
   * The same keywords in Portuguese, searched alongside the English ones. Additive rather than a
   * second table keyed by locale.
   */
  tagsPtBR?: string[];
  /**
   * Whether this theme replaces the mouse pointer. Ten do, and it is the one thing a theme can
   * change that the reader cannot ignore.
   */
  drawsCursor?: boolean;
  light: SkinPreview;
  dark: SkinPreview;
}

export const SKIN_CATALOG: SkinDefinition[] = [
  {
    value: 'STUDIO',
    name: 'Studio',
    tagline: 'skin.STUDIO.tagline',
    description: 'skin.STUDIO.body',
    tags: ['default', 'minimal', 'clean', 'neutral', 'teal', 'petrol', 'calm', 'professional'],
    tagsPtBR: [
      'padrão',
      'minimalista',
      'limpo',
      'neutro',
      'azul-petróleo',
      'calmo',
      'profissional',
      'claro',
    ],
    light: {
      surface: '#f6f6f8',
      raised: '#ffffff',
      edge: '#dbdbe4',
      brand: '#0e7490',
      content: '#181820',
      radius: 10,
      font: "'Inter', 'Segoe UI', system-ui, sans-serif",
      border: 1,
    },
    dark: {
      surface: '#0f0f12',
      raised: '#17171c',
      edge: '#26262e',
      brand: '#22d3ee',
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
    drawsCursor: true,
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
    drawsCursor: true,
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
    drawsCursor: true,
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
    drawsCursor: true,
    light: {
      surface: '#d6deec',
      raised: '#fafaff',
      edge: '#16142c',
      brand: '#5c3ad6',
      content: '#16142c',
      radius: 0,
      font: "'Studio Pixel', 'Cascadia Mono', Consolas, monospace",
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
      font: "'Studio Pixel', 'Cascadia Mono', Consolas, monospace",
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
    drawsCursor: true,
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
    drawsCursor: true,
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
    drawsCursor: true,
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
    drawsCursor: true,
    light: {
      surface: '#dec79a',
      raised: '#ead4a5',
      edge: '#926e44',
      brand: '#8c2e1a',
      content: '#3e180c',
      radius: 0,
      font: "'Studio Runic', 'Bahnschrift', 'DIN Condensed', 'Segoe UI', system-ui, sans-serif",
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
      font: "'Studio Runic', 'Bahnschrift', 'DIN Condensed', 'Segoe UI', system-ui, sans-serif",
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
    value: 'HALLOWEEN',
    name: 'Halloween',
    tagline: 'skin.HALLOWEEN.tagline',
    description: 'skin.HALLOWEEN.body',
    tags: [
      'halloween',
      'spooky',
      'pumpkin',
      'jack-o-lantern',
      'bats',
      'cobweb',
      'spider',
      'october',
      'autumn',
      'orange',
      'purple',
      'candle',
      'night',
      'dark',
      'seasonal',
    ],
    tagsPtBR: [
      'halloween',
      'dia das bruxas',
      'abóbora',
      'morcegos',
      'teia',
      'aranha',
      'outubro',
      'assombrado',
      'laranja',
      'roxo',
      'vela',
      'noite',
      'escuro',
    ],
    drawsCursor: true,
    light: {
      surface: '#f0e7d8',
      raised: '#faf4e9',
      edge: '#6c4e3a',
      brand: '#ac460b',
      content: '#261a28',
      radius: 7,
      font: "'Segoe UI', system-ui, sans-serif",
      border: 1,
    },
    dark: {
      surface: '#110c16',
      raised: '#1b1422',
      edge: '#423052',
      brand: '#ff8c28',
      content: '#f2eaf6',
      radius: 7,
      font: "'Segoe UI', system-ui, sans-serif",
      border: 1,
    },
  },

  // The fifteenth theme, and the only one that is a genre rather than a place. Everything else in
  // this catalogue is somewhere you could stand: a newsroom, a volcano, the deep field.
  {
    value: 'VIBECODED',
    name: 'Vibecoded',
    tagline: 'skin.VIBECODED.tagline',
    description: 'skin.VIBECODED.body',
    tags: [
      'vibecoded',
      'ai',
      'generated',
      'gradient',
      'indigo',
      'purple',
      'fuchsia',
      'saas',
      'startup',
      'glassmorphism',
      'modern',
      'slop',
      'generic',
      'template',
      'joke',
    ],
    tagsPtBR: [
      'vibecoded',
      'ia',
      'gerado',
      'gradiente',
      'roxo',
      'indigo',
      'startup',
      'moderno',
      'generico',
      'piada',
    ],
    light: {
      surface: '#f8fafc',
      raised: '#ffffff',
      edge: '#e2e8f0',
      brand: '#6366f1',
      content: '#0f172a',
      radius: 16,
      font: "'Inter', 'Segoe UI', system-ui, sans-serif",
      border: 1,
      gradient: '#d946ef',
    },
    dark: {
      surface: '#020617',
      raised: '#0f172a',
      edge: '#334155',
      brand: '#818cf8',
      content: '#f8fafc',
      radius: 16,
      font: "'Inter', 'Segoe UI', system-ui, sans-serif",
      border: 1,
      gradient: '#e879f9',
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
  {
    value: 'DRAGON',
    name: 'Dragon',
    tagline: 'skin.DRAGON.tagline',
    // A verse rather than a spec sheet, everywhere the skin is described.
    description: 'landing.themes.dragonVerse',
    tags: [
      'dragon',
      'china',
      'chinese',
      'imperial',
      'palace',
      'forbidden city',
      'scroll',
      'jade',
      'gold',
      'lacquer',
      'cinnabar',
      'red',
      'dynasty',
      'oriental',
      'calligraphy',
      'seal',
      'guan dao',
    ],
    tagsPtBR: [
      'dragão',
      'china',
      'chinês',
      'imperial',
      'palácio',
      'cidade proibida',
      'pergaminho',
      'jade',
      'ouro',
      'laca',
      'vermelho',
      'dinastia',
      'oriental',
      'caligrafia',
      'selo',
    ],
    drawsCursor: true,
    // Two rooms rather than one palette lightened and darkened. **Light is the scroll.** Raw silk
    // and rice paper, mounted in gold-brown brocade.
    light: {
      surface: '#f3e2b5',
      raised: '#faefcf',
      edge: '#b78a3a',
      brand: '#b83420',
      content: '#2c1b12',
      radius: 6,
      font: DRAGON_FONT,
      border: 1,
      scrollTrim: '#e2b44c',
      jade: '#3a8a6a',
    },
    dark: {
      surface: '#220c0c',
      raised: '#3a1413',
      edge: '#9e7430',
      brand: '#e8aa3e',
      content: '#f6e8d1',
      radius: 6,
      font: DRAGON_FONT,
      border: 1,
      scrollTrim: '#c6983e',
      jade: '#52b189',
    },
  },
];

/** The catalogue, keyed — for the surfaces that already know which skin they want. */
export const SKIN_BY_VALUE = new Map(SKIN_CATALOG.map((skin) => [skin.value, skin]));

/**
 * How many themes the settings page shows before it stops listing and starts pointing at the
 * gallery.
 */
export const SETTINGS_SKIN_LIMIT = 3;

/**
 * Free-text search over the catalogue. Name, tagline and tags, all case-folded, matched on
 * substring rather than on whole words so "news" finds Newsprint and "radio" finds Hazard.
 */
export const searchSkins = (query: string): SkinDefinition[] => {
  const needle = query.trim().toLowerCase();
  if (!needle) return SKIN_CATALOG;

  // The tagline is searched in the reader's own language. `translate` rather than a `t` threaded
  // down from the page: this is called from a `useMemo` keyed on the query.
  return SKIN_CATALOG.filter((skin) =>
    [skin.name, translate(skin.tagline), ...skin.tags, ...(skin.tagsPtBR ?? [])].some((field) =>
      field.toLowerCase().includes(needle),
    ),
  );
};
