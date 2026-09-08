import { useState } from 'react';
import { useReducedMotion } from 'framer-motion';

import { useT } from '@/shared/i18n';
import { cn } from '@/shared/lib/cn';

const ChevronDown = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 14" className={className} fill="currentColor">
    <path d="M12 14L0 4.5L3.5 0L12 6.5L20.5 0L24 4.5L12 14Z" />
  </svg>
);

const ChevronUp = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 14" className={className} fill="currentColor">
    <path d="M12 0L24 9.5L20.5 14L12 7.5L3.5 14L0 9.5L12 0Z" />
  </svg>
);

/**
 * The maker's mark: a `p.` that opens into `pitico.`
 *
 * Styled to match a stamped, lowercase, terminal aesthetic with 
 * centering arrows over the second 'i'.
 */
export const PiticoMark = ({ className }: { className?: string }) => {
  const t = useT();
  const reduceMotion = useReducedMotion();
  const [isOpen, setIsOpen] = useState(false);

  const letter = t('landing.pitico.letter');
  const word = t('landing.pitico.word');
  
  // Extract the dot so we can animate the letters expanding before it.
  const hasDot = word.endsWith('.') && letter.endsWith('.');
  const baseLetter = hasDot ? letter.slice(0, -1) : letter;
  const baseWord = hasDot ? word.slice(0, -1) : word;
  
  const middle = baseWord.slice(baseLetter.length);
  const suffix = hasDot ? '.' : '';

  // To center the arrows exactly over the second "i" in "pitico."
  // Base letter is "p", middle is "itico". Second "i" is at middle index 2.
  const middleBefore = middle.slice(0, 2); // "it"
  const middleTarget = middle.charAt(2);   // "i"
  const middleAfter = middle.slice(3);     // "co"

  return (
    <span className={cn('inline-flex items-baseline', className)}>
      <button
        type="button"
        aria-label={t('landing.pitico.aria')}
        title={t('landing.pitico.aria')}
        onPointerEnter={() => setIsOpen(true)}
        onPointerLeave={() => setIsOpen(false)}
        onFocus={() => setIsOpen(true)}
        onBlur={() => setIsOpen(false)}
        onClick={() => setIsOpen((open) => !open)}
        aria-expanded={isOpen}
        className={cn(
          'group relative inline-flex cursor-pointer items-baseline overflow-visible',
          'rounded-sm focus-visible:outline focus-visible:outline-2',
          'focus-visible:outline-offset-4 focus-visible:outline-brand',
          // Aesthetic: terminal/coding font, lowercase, bold, flat ink color
          'lowercase tracking-wide text-content/90 font-bold font-mono',
        )}
      >
        <span className="flex items-baseline px-1">
          <span>{baseLetter}</span>
          <span
            className={cn(
              'grid overflow-hidden py-4 -my-4', // Allow absolute arrows to overflow vertically
              !reduceMotion && 'transition-[grid-template-columns] duration-[420ms] ease-studio'
            )}
            style={{
              gridTemplateColumns: isOpen ? '1fr' : '0fr',
            }}
          >
            <span className="min-w-0 overflow-visible whitespace-nowrap flex items-baseline">
              <span>{middleBefore}</span>
              
              <span className="relative inline-flex flex-col items-center justify-center">
                {/* Top Chevron */}
                <span 
                  className={cn(
                    "absolute -top-3.5 left-1/2 w-3.5 h-2.5 -translate-x-1/2 text-content/90",
                    !reduceMotion && "transition-opacity duration-[420ms] ease-studio",
                    isOpen ? "opacity-100" : "opacity-0"
                  )}
                  aria-hidden
                >
                  <ChevronDown className="w-full h-full" />
                </span>

                <span>{middleTarget}</span>

                {/* Bottom Chevron */}
                <span 
                  className={cn(
                    "absolute -bottom-3.5 left-1/2 w-3.5 h-2.5 -translate-x-1/2 text-content/90",
                    !reduceMotion && "transition-opacity duration-[420ms] ease-studio",
                    isOpen ? "opacity-100" : "opacity-0"
                  )}
                  aria-hidden
                >
                  <ChevronUp className="w-full h-full" />
                </span>
              </span>

              <span>{middleAfter}</span>
            </span>
          </span>
          <span>{suffix}</span>
        </span>
      </button>
    </span>
  );
};

export default PiticoMark;
