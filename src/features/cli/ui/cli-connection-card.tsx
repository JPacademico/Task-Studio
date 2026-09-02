import { useId, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Terminal } from 'lucide-react';

import { useSkinMotion } from '@/shared/lib/skin-motion';
import { cn } from '@/shared/lib/cn';
import { useT } from '@/shared/i18n';
import { CliCommandList, DocsLink, FOCUS_RING } from './cli-commands';

/**
 * The CLI, on a project's Connections shelf.
 *
 * ## Why this is a card that opens rather than a card with a Connect button
 *
 * Every other row on that shelf has a button because there is something on the
 * other side of it: an OAuth consent screen, a webhook composer, a repository
 * dialog. There is nothing on the other side of this one. Connecting an editor
 * is four commands typed into a terminal on somebody's own machine, and this
 * application cannot do any of it — it can only *say* what they are.
 *
 * A "Connect" button that opened a panel of text to copy would be a lie about
 * what pressing it does. So the card says what it is, and opening it reveals
 * the instructions, which is exactly what happens.
 *
 * ## Why it is collapsed by default
 *
 * Because most people reading this tab are not going to install a CLI, and four
 * lines of shell in a settings-shaped surface reads as complexity the product
 * is imposing on them. Collapsed, it is one row saying a thing exists; open, it
 * is a complete answer. Nobody has to scroll past a terminal to reach the
 * webhook they came for.
 */
export const CliConnectionCard = () => {
  const t = useT();
  const [isOpen, setIsOpen] = useState(false);
  const panelId = useId();

  // The skin's own reveal curve and the reader's motion preference. See the
  // matching notes in `CliPanel`; both were hardcoded here first.
  const motionSpec = useSkinMotion();
  const reduceMotion = useReducedMotion();

  return (
    <div
      className={cn(
        'ui-card overflow-hidden rounded-2xl border transition-colors',
        isOpen ? 'border-brand/30 bg-brand/[0.04]' : 'border-edge bg-surface-raised',
      )}
    >
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-expanded={isOpen}
        aria-controls={panelId}
        className={cn(
          'flex w-full items-start gap-3 p-3 text-left transition-colors',
          'hover:bg-surface-sunken/40',
          FOCUS_RING,
        )}
      >
        <span
          aria-hidden
          className={cn(
            'mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl transition-colors',
            isOpen ? 'bg-brand/12 text-brand' : 'bg-surface-sunken text-content-muted',
          )}
        >
          <Terminal className="h-4 w-4" />
        </span>

        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold">{t('cli.title')}</span>
          <span className="mt-0.5 block text-2xs leading-relaxed text-content-muted">
            {t('cli.projectBody')}
          </span>
        </span>

        {/*
          A fixed width, so the header does not reflow when the label changes.

          "Commands" and "Hide" differ by 36px, and in pt-BR ("Comandos") by
          more — enough that every line of the description re-wrapped at the
          exact moment the panel animated open. The pill is now as wide as its
          longest label in either language and the text column never moves.
        */}
        <span
          className={cn(
            'w-[5.5rem] shrink-0 rounded-lg border px-2.5 py-1.5 text-center text-2xs font-medium transition-colors',
            isOpen ? 'border-brand/50 text-brand' : 'border-edge text-content-muted',
          )}
        >
          {t(isOpen ? 'cli.hideCommands' : 'cli.showCommands')}
        </span>
      </button>

      {/*
        `AnimatePresence` rather than a CSS max-height trick, matching
        `Collapsible` in the shared primitives: the content is a variable number
        of copyable rows, and a guessed max-height either clips the last one or
        makes the close animation drift.
      */}
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            id={panelId}
            role="region"
            aria-label={t('cli.commandsRegion')}
            initial={reduceMotion ? false : { height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { height: 0, opacity: 0 }}
            transition={motionSpec.reveal}
            className="overflow-hidden"
          >
            <div className="space-y-3 border-t border-edge/70 p-3">
              <CliCommandList variant="project" />
              <DocsLink />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
