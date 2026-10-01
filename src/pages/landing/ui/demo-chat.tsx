import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';

import { Avatar } from '@/shared/ui';
import { cn } from '@/shared/lib/cn';
import { useT, type TranslationKey } from '@/shared/i18n';
import { useDemoClock } from './demo-frame';

/**
 * The conversation, as a short exchange that goes somewhere. Three messages and a typing indicator,
 * and the content is doing work: it is a question, an answer, and a *decision*.
 */
const MESSAGES: { key: TranslationKey; author: string; mine?: boolean }[] = [
  { key: 'landing.chat.one', author: 'Ana' },
  { key: 'landing.chat.two', author: 'Bruno' },
  { key: 'landing.chat.three', author: 'You', mine: true },
];

/** The project conversation, filling in on a loop. */
export const DemoChat = () => {
  const t = useT();
  const reduceMotion = useReducedMotion();

  /*
   * Beats: one per message, one for the typing indicator before the last, and
   * two to rest on the finished exchange before it clears.
   */
  const step = useDemoClock(MESSAGES.length + 3, 1_150);

  const visible = Math.min(step, MESSAGES.length);
  const isTyping = step === MESSAGES.length - 1;

  return (
    /* A fixed height, not a minimum. The panel used to grow by a row for about a third of a second
       every time the last message landed, which shoved the whole section. */
    <div className="flex h-[15.5rem] flex-col">
      {/* --- Which project this belongs to --- */}
      <div className="flex items-center gap-2 border-b border-edge pb-2">
        <span aria-hidden className="h-2 w-2 shrink-0 rounded-full bg-positive" />
        <p className="truncate text-2xs font-semibold">{t('landing.chat.project')}</p>
        <span className="ml-auto text-3xs text-content-faint">
          {t('landing.chat.online')}
        </span>
      </div>

      {/* `justify-end` stacks from the bottom, so what a clipped list loses is the oldest
          message off the top — the same direction a real transcript scrolls. */}
      <ul className="flex flex-1 flex-col justify-end gap-2 overflow-hidden pt-3">
        {/* `popLayout`, so the typing indicator is lifted out of layout flow the instant it
            starts leaving rather than holding a row open until it has finished fading. */}
        <AnimatePresence mode="popLayout" initial={false}>
          {MESSAGES.slice(0, visible).map((message) => (
            <motion.li
              key={message.key}
              layout
              initial={reduceMotion ? false : { opacity: 0, y: 12, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ type: 'spring', stiffness: 320, damping: 28 }}
              className={cn(
                'flex items-end gap-1.5',
                message.mine && 'flex-row-reverse',
              )}
            >
              <Avatar name={message.author} size="xs" />
              <div
                className={cn(
                  'max-w-[78%] rounded-2xl px-2.5 py-1.5 text-2xs leading-snug',
                  message.mine
                    ? 'rounded-br-sm bg-brand text-brand-contrast'
                    : 'rounded-bl-sm bg-surface-sunken text-content',
                )}
              >
                {t(message.key)}
              </div>
            </motion.li>
          ))}

          {isTyping && (
            <motion.li
              key="typing"
              layout
              initial={reduceMotion ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex items-end gap-1.5"
            >
              <Avatar name="You" size="xs" />
              <span className="flex items-center gap-1 rounded-2xl rounded-bl-sm bg-surface-sunken px-3 py-2">
                {[0, 1, 2].map((dot) => (
                  <motion.span
                    key={dot}
                    aria-hidden
                    className="h-1 w-1 rounded-full bg-content-faint"
                    animate={reduceMotion ? undefined : { opacity: [0.3, 1, 0.3] }}
                    transition={{
                      duration: 1.1,
                      repeat: Infinity,
                      // Staggered, so the three dots read as a wave rather
                      // than as one blinking block.
                      delay: dot * 0.16,
                    }}
                  />
                ))}
                <span className="sr-only">{t('landing.chat.typing')}</span>
              </span>
            </motion.li>
          )}
        </AnimatePresence>
      </ul>

      {/* A composer that does not work, and is not pretending to — no cursor, no focus ring,
          and it never receives a keystroke. */}
      <div
        aria-hidden
        className="mt-3 flex items-center gap-2 rounded-xl border border-edge bg-surface-sunken/60 px-3 py-2"
      >
        <span className="text-2xs text-content-faint">{t('landing.chat.placeholder')}</span>
      </div>
    </div>
  );
};
