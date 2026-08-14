import type { CSSProperties } from 'react';

import { cn } from '@/shared/lib/cn';
import type { SkinPreview } from '../model/skin-catalog';

/**
 * A tiny screenshot of the app, drawn from one skin's tokens.
 *
 * Every measurement is derived from a single `scale`, so the same component is
 * the thumbnail on a settings card and the full-size mock in the gallery's
 * preview box. Two hand-tuned copies at two sizes is how the small one ends up
 * showing a different theme from the big one.
 *
 * Nothing here is a real component from the app: this is a *picture* of an
 * interface, and it has to paint itself in a palette that is not the active
 * one, which anything wired to the CSS variables could not do.
 */

/** The corner-cut the arcade skin applies to every frame, at mock scale. */
const notch = (size: number): string =>
  `polygon(0 ${size}px, ${size}px ${size}px, ${size}px 0, calc(100% - ${size}px) 0, ` +
  `calc(100% - ${size}px) ${size}px, 100% ${size}px, 100% calc(100% - ${size}px), ` +
  `calc(100% - ${size}px) calc(100% - ${size}px), calc(100% - ${size}px) 100%, ${size}px 100%, ` +
  `${size}px calc(100% - ${size}px), 0 calc(100% - ${size}px))`;

/**
 * A leaf, at mock scale.
 *
 * The same shape the autumn loader is built from — a square with two opposite
 * corners rounded off entirely — because at eight pixels across that outline is
 * the whole of what makes a leaf a leaf, and anything more detailed is mush.
 */
const leaf = (color: string, size: number, rotate: number): CSSProperties => ({
  position: 'absolute',
  width: size,
  height: size,
  background: color,
  borderRadius: '0 100% 0 100%',
  transform: `rotate(${rotate}deg)`,
});

/** Three star layers, matching the real skin's page wash. */
const STARFIELD =
  'radial-gradient(1.2px 1.2px at 18% 24%, rgb(255 255 255 / 0.85), transparent 100%),' +
  'radial-gradient(1px 1px at 72% 62%, rgb(96 232 255 / 0.9), transparent 100%),' +
  'radial-gradient(1.4px 1.4px at 44% 82%, rgb(45 230 184 / 0.85), transparent 100%)';

interface SkinMockProps {
  preview: SkinPreview;
  /** 1 is the settings thumbnail; the gallery's preview box runs at 2.4. */
  scale?: number;
  className?: string;
}

export const SkinMock = ({ preview, scale = 1, className }: SkinMockProps) => {
  const px = (value: number) => value * scale;
  const radius = preview.radius * Math.min(scale, 1.6);

  /*
   * Corners that grew rather than being cut.
   *
   * The eldritch skin's radius tokens are asymmetric shorthand — big, small,
   * big, small — and that is the single most recognisable thing about it. A
   * mock that rounded all four corners evenly would be selling a teal palette
   * and nothing else, so the same asymmetry is reproduced here.
   */
  const corners = preview.organic
    ? `${radius}px ${radius / 4}px ${radius}px ${radius / 4}px`
    : `${radius}px`;

  const card: CSSProperties = {
    background: preview.raised,
    border: `${preview.border}px solid ${preview.edge}`,
    borderRadius: corners,
    clipPath: preview.notched ? notch(px(3)) : undefined,
    padding: px(6),
    gap: px(4),
  };

  const line = (width: string, opacity: number): CSSProperties => ({
    height: px(4),
    width,
    background: preview.content,
    opacity,
    borderRadius: preview.radius === 0 ? 0 : 99,
  });

  return (
    <div
      aria-hidden
      className={cn('pointer-events-none relative flex flex-col overflow-hidden', className)}
      style={{
        height: px(96),
        padding: px(8),
        gap: px(6),
        background: preview.starfield ? `${STARFIELD}, ${preview.surface}` : preview.surface,
        backgroundSize: preview.starfield ? '60px 60px, 44px 44px, 80px 80px, auto' : undefined,
        borderRadius: corners,
        fontFamily: preview.font,
      }}
    >
      {/* Newsprint: a halftone screen over the whole page, as on the real one. */}
      {preview.halftone && (
        <span
          className="absolute inset-0"
          style={{
            backgroundImage: `radial-gradient(${preview.content}22 0.5px, transparent 0.6px)`,
            backgroundSize: `${px(3)}px ${px(3)}px`,
          }}
        />
      )}

      {/* Hazard: the tape across the top of everything. */}
      {preview.stripes && (
        <span
          className="absolute inset-x-0 top-0"
          style={{
            height: px(5),
            background: `repeating-linear-gradient(-45deg, ${preview.brand} 0 ${px(6)}px, ${preview.edge} ${px(6)}px ${px(12)}px)`,
          }}
        />
      )}

      {/* The singularity the deep field sinks into every screen edge, at mock
          scale — same shape and same gradient as the real cue, so the card is
          showing the thing the skin actually does. */}
      {preview.singularity && (
        <span
          className="absolute left-0 top-1/2 -translate-y-1/2 rounded-r-[100%]"
          style={{
            height: px(40),
            width: px(16),
            background: `radial-gradient(120% 65% at 0% 50%, #000 0 24%, ${preview.brand} 38%, ${preview.edge} 56%, transparent 80%)`,
          }}
        />
      )}

      {/* Title row with the brand tile. */}
      <div className="relative flex items-center" style={{ gap: px(6) }}>
        <span
          className="shrink-0"
          style={{
            height: px(14),
            width: px(14),
            background: preview.brand,
            borderRadius: radius / 2.5,
          }}
        />
        <span style={line(`${px(40)}px`, 0.75)} />
        <span
          className="ml-auto"
          style={{
            height: px(8),
            width: px(24),
            background: preview.brand,
            borderRadius: radius / 2.5,
          }}
        />
      </div>

      {/* Newsprint: the double rule that sits under every masthead. */}
      {preview.rule && (
        <span
          className="relative block"
          style={{
            height: px(3),
            marginTop: -px(2),
            background: `linear-gradient(to bottom, ${preview.edge} 0 ${px(1)}px, transparent ${px(1)}px ${px(2)}px, ${preview.edge} ${px(2)}px ${px(3)}px)`,
          }}
        />
      )}

      {/* Two cards. */}
      <div className="relative flex flex-1" style={{ gap: px(6) }}>
        {[0, 1].map((index) => (
          <div
            key={index}
            className="relative flex flex-1 flex-col justify-center overflow-hidden"
            style={card}
          >
            <span style={line('100%', 0.55)} />
            <span style={line('66%', 0.28)} />
            <span
              style={{
                marginTop: px(2),
                height: px(6),
                width: '50%',
                background: preview.brand,
                borderRadius: radius / 3,
              }}
            />

            {/* Eldritch: the iris that opens on every card, caught open. */}
            {preview.watcher && index === 1 && (
              <span
                className="absolute right-0 top-0"
                style={{
                  height: px(30),
                  width: px(30),
                  background: `radial-gradient(38% 30% at 78% 22%, ${preview.watcher}66, transparent 70%), radial-gradient(12% 9% at 78% 22%, ${preview.brand}, transparent 76%)`,
                }}
              />
            )}

            {/* Runic: a rune cut into the face of one of the blocks. Two
                strokes at 45°, which is all the alphabet is. */}
            {preview.rune && index === 1 && (
              <span
                className="absolute inset-0"
                style={{
                  backgroundImage:
                    `linear-gradient(to right, transparent calc(50% - ${px(0.75)}px), ${preview.rune} calc(50% - ${px(0.75)}px), ${preview.rune} calc(50% + ${px(0.75)}px), transparent calc(50% + ${px(0.75)}px)),` +
                    `linear-gradient(48deg, transparent 47%, ${preview.rune} 47%, ${preview.rune} 53%, transparent 53%)`,
                  backgroundSize: `100% 100%, ${px(18)}px ${px(14)}px`,
                  backgroundPosition: 'center, center',
                  backgroundRepeat: 'no-repeat',
                  opacity: 0.55,
                }}
              />
            )}

            {/* Autumn: one has already landed on this card. */}
            {preview.leaves && index === 0 && (
              <span
                style={{
                  ...leaf(preview.leaves[0], px(9), -18),
                  top: px(4),
                  right: px(4),
                  opacity: 0.5,
                }}
              />
            )}

            {/* Hazard: every vessel has something in the bottom of it. */}
            {preview.sludge && (
              <span
                className="absolute inset-x-0 bottom-0"
                style={{
                  height: px(7),
                  background: `radial-gradient(${px(5)}px ${px(5)}px at ${px(6)}px ${px(7)}px, ${preview.sludge} ${px(4.5)}px, transparent ${px(4.8)}px) repeat-x 0 0 / ${px(12)}px ${px(7)}px, linear-gradient(to bottom, transparent 0 ${px(2.5)}px, ${preview.sludge} ${px(2.5)}px)`,
                }}
              />
            )}
          </div>
        ))}
      </div>

      {/* Runic: the lit groove where a menu meets the page — the same three
          bands as the real rail seam, at mock scale. */}
      {preview.rune && (
        <span
          className="absolute inset-y-0 left-0"
          style={{
            width: px(5),
            background: `linear-gradient(to right, ${preview.edge} 0 ${px(1.5)}px, ${preview.rune} ${px(1.5)}px ${px(3)}px, transparent)`,
          }}
        />
      )}

      {/* Autumn: the ones still in the air.
          Last in the mock so they paint over the cards, which is where they
          are in the real thing — the fall sits between the page content and
          the chrome. */}
      {preview.leaves && (
        <>
          <span style={{ ...leaf(preview.leaves[1], px(8), 34), left: '16%', top: '30%', opacity: 0.75 }} />
          <span style={{ ...leaf(preview.leaves[0], px(6), -42), left: '52%', top: '62%', opacity: 0.6 }} />
          <span style={{ ...leaf(preview.leaves[1], px(5), 12), left: '78%', top: '18%', opacity: 0.5 }} />
        </>
      )}
    </div>
  );
};
