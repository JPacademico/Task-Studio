import { useId, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Terminal } from 'lucide-react';

import { useSkinMotion } from '@/shared/lib/skin-motion';
import { cn } from '@/shared/lib/cn';
import { useT } from '@/shared/i18n';
import { CliCommandList, DocsLink, FOCUS_RING } from './cli-commands';

/**
 * The CLI, on a project's Connections shelf. Every other row on that shelf has a button because
 * there is something on the other side of it: an OAuth consent screen, a webhook composer.
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

        {/* A fixed width, so the header does not reflow when the label changes. "Commands" and
            "Hide" differ by 36px, and in pt-BR ("Comandos") by more. */}
        <span
          className={cn(
            'w-[5.5rem] shrink-0 rounded-lg border px-2.5 py-1.5 text-center text-2xs font-medium transition-colors',
            isOpen ? 'border-brand/50 text-brand' : 'border-edge text-content-muted',
          )}
        >
          {t(isOpen ? 'cli.hideCommands' : 'cli.showCommands')}
        </span>
      </button>

      {/* `AnimatePresence` rather than a CSS max-height trick, matching `Collapsible` in the
          shared primitives: the content is a variable number of copyable rows. */}
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
