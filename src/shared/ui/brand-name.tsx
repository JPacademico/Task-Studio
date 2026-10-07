import { useId } from 'react';

import { useSkin } from '@/app/providers/theme-provider';
import { cn } from '@/shared/lib/cn';
import { KAIJU_WORDMARK } from './kaiju-wordmark';

interface BrandNameProps {
  /** Layout classes, applied whichever way the name is drawn. */
  className?: string;
  /** Type classes for the plain-text name; the Kaiju wordmark is drawn, so it takes none. */
  textClassName?: string;
}

/**
 * The product name beside the mark. Kaiju draws it as lettering with a crest of plates on each T;
 * every other skin sets it as text in its own face.
 */
export const BrandName = ({ className, textClassName }: BrandNameProps) => {
  const skin = useSkin();
  const id = useId();

  if (skin !== 'KAIJU') return <span className={cn(className, textClassName)}>Task Studio</span>;

  const { width, height, path } = KAIJU_WORDMARK;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label="Task Studio"
      className={cn('h-[1.2rem] w-auto shrink-0', className)}
      style={{ filter: 'drop-shadow(0 0 5px rgb(var(--kaiju-volt) / 0.4))' }}
    >
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" style={{ stopColor: 'rgb(var(--kaiju-word-top))' }} />
          <stop offset="1" style={{ stopColor: 'rgb(var(--kaiju-word-bottom))' }} />
        </linearGradient>
      </defs>
      {/* The extrusion, a step down and to the right. */}
      <path d={path} transform="translate(0.9 1.1)" fill="rgb(var(--kaiju-word-shadow))" />
      <path d={path} fill={`url(#${id})`} />
    </svg>
  );
};
