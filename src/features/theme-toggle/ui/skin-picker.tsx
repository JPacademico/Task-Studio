import { Check } from 'lucide-react';
import { motion } from 'framer-motion';

import { useTheme } from '@/app/providers/theme-provider';
import type { ThemeSkin } from '@/entities/user/model/types';
import { cn } from '@/shared/lib/cn';

interface SkinPreview {
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
}

/** The corner-cut the arcade skin applies to every frame, at mock scale. */
const NOTCH = 'polygon(0 3px, 3px 3px, 3px 0, calc(100% - 3px) 0, calc(100% - 3px) 3px, 100% 3px, 100% calc(100% - 3px), calc(100% - 3px) calc(100% - 3px), calc(100% - 3px) 100%, 3px 100%, 3px calc(100% - 3px), 0 calc(100% - 3px))';

/** Three star layers, matching the real skin's page wash. */
const STARFIELD =
  'radial-gradient(1.2px 1.2px at 18% 24%, rgb(255 255 255 / 0.85), transparent 100%),' +
  'radial-gradient(1px 1px at 72% 62%, rgb(96 232 255 / 0.9), transparent 100%),' +
  'radial-gradient(1.4px 1.4px at 44% 82%, rgb(45 230 184 / 0.85), transparent 100%)';

interface SkinDefinition {
  value: ThemeSkin;
  name: string;
  light: SkinPreview;
  dark: SkinPreview;
}

/**
 * Each card paints itself in its own palette rather than the active one, so
 * the choice can be made by looking instead of by trying all six.
 *
 * The cards carry no descriptions. A wall of six mocks, six names and six lines
 * of prose is a paragraph to read before making a choice that is entirely
 * visual — the mock already says what the skin is, so the words were only
 * competing with it.
 */
const SKINS: SkinDefinition[] = [
  {
    value: 'STUDIO',
    name: 'Studio',
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
];

/** A tiny screenshot of the app drawn from one skin's tokens. */
const SkinMock = ({ preview }: { preview: SkinPreview }) => (
  <div
    aria-hidden
    className="pointer-events-none relative flex h-24 w-full flex-col gap-1.5 overflow-hidden p-2"
    style={{
      background: preview.starfield
        ? `${STARFIELD}, ${preview.surface}`
        : preview.surface,
      backgroundSize: preview.starfield ? '60px 60px, 44px 44px, 80px 80px, auto' : undefined,
      borderRadius: preview.radius,
      fontFamily: preview.font,
    }}
  >
    {/* The singularity the deep field sinks into every screen edge, at mock
        scale — same shape and same gradient as the real cue, so the card is
        showing the thing the skin actually does. */}
    {preview.singularity && (
      <span
        className="absolute left-0 top-1/2 h-10 w-4 -translate-y-1/2 rounded-r-[100%]"
        style={{
          background: `radial-gradient(120% 65% at 0% 50%, #000 0 24%, ${preview.brand} 38%, ${preview.edge} 56%, transparent 80%)`,
        }}
      />
    )}

    {/* Title row with the brand tile. */}
    <div className="relative flex items-center gap-1.5">
      <span
        className="h-3.5 w-3.5 shrink-0"
        style={{ background: preview.brand, borderRadius: preview.radius / 2.5 }}
      />
      <span
        className="h-1.5 w-10"
        style={{ background: preview.content, opacity: 0.75, borderRadius: 99 }}
      />
      <span
        className="ml-auto h-2 w-6"
        style={{ background: preview.brand, borderRadius: preview.radius / 2.5 }}
      />
    </div>

    {/* Two cards. */}
    <div className="relative flex flex-1 gap-1.5">
      {[0, 1].map((index) => (
        <div
          key={index}
          className="flex flex-1 flex-col justify-center gap-1 p-1.5"
          style={{
            background: preview.raised,
            border: `${preview.border}px solid ${preview.edge}`,
            borderRadius: preview.radius,
            clipPath: preview.notched ? NOTCH : undefined,
          }}
        >
          <span
            className="h-1 w-full"
            style={{ background: preview.content, opacity: 0.55, borderRadius: 99 }}
          />
          <span
            className="h-1 w-2/3"
            style={{ background: preview.content, opacity: 0.28, borderRadius: 99 }}
          />
          <span
            className="mt-0.5 h-1.5 w-1/2"
            style={{ background: preview.brand, borderRadius: preview.radius / 3 }}
          />
        </div>
      ))}
    </div>
  </div>
);

/**
 * Theme picker.
 *
 * Light/dark stays a separate control: a skin is the whole visual language —
 * type, radii, borders, motion of the chrome — and each one ships both
 * palettes, so the two settings compose rather than override.
 *
 * Three to a row at every size above a phone. Six across on a wide screen made
 * each mock too small to tell the skins apart, which is the one job the grid
 * has.
 */
export const SkinPicker = () => {
  const { skin, setSkin, isDark } = useTheme();

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {SKINS.map((option) => {
        const isActive = skin === option.value;
        const preview = isDark ? option.dark : option.light;

        return (
          <button
            key={option.value}
            type="button"
            onClick={() => setSkin(option.value)}
            aria-pressed={isActive}
            className={cn(
              'group relative overflow-hidden rounded-2xl border p-2 text-left transition-all duration-200 ease-studio',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50',
              isActive
                ? 'border-brand bg-brand/[0.07] shadow-panel'
                : 'border-edge bg-surface-raised hover:-translate-y-0.5 hover:border-brand/50',
            )}
          >
            <SkinMock preview={preview} />

            <div className="flex items-center gap-2 px-1 pb-0.5 pt-2">
              <p className="flex min-w-0 flex-1 items-center gap-1.5 text-sm font-semibold">
                <span className="truncate">{option.name}</span>
                {option.value === 'STUDIO' && (
                  <span className="shrink-0 rounded-full bg-surface-sunken px-1.5 py-px text-[9px] font-medium uppercase tracking-wide text-content-faint">
                    Default
                  </span>
                )}
              </p>

              {isActive && (
                <motion.span
                  layoutId="skin-check"
                  className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-brand text-brand-contrast"
                >
                  <Check className="h-3 w-3" strokeWidth={3} />
                </motion.span>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
};
