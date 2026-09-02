import { useId, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Terminal } from 'lucide-react';

import { useSkinMotion } from '@/shared/lib/skin-motion';
import { cn } from '@/shared/lib/cn';
import { useT } from '@/shared/i18n';
import { CliCommandList, DocsLink, FOCUS_RING } from './cli-commands';

/**
 * The Task Studio CLI, as a settings row.
 *
 * ## What this used to be, and why it is half the size
 *
 * It used to also hold the list of machines signed in through `taskstudio
 * login`, on the argument that commands are an offer you can fold away while a
 * list of live credentials is a security surface that must stay visible. The
 * argument was right and the conclusion was wrong: obeying both halves inside
 * one bordered box produced a panel that folded for nobody, because the half
 * that must not fold pinned the half that should.
 *
 * So they are two objects now. This one is an offer — an icon, a sentence, a
 * link, and a button that reveals four lines of shell for the people who want
 * them. `CliMachinesPanel` is the inventory, in its own section, always open.
 * Each gets to be honest about what it is.
 *
 * ## Why the commands are behind a button at all
 *
 * Because Settings is where somebody goes to change their display name, and
 * four lines of shell sitting open on that page is the product telling every
 * user that a terminal is part of using it. It is not. The row says the CLI
 * exists and links to its documentation — that much everybody should see — and
 * the commands appear for the people who press the button, which is exactly
 * the set of people who want them.
 */
export const CliPanel = () => {
  const t = useT();
  const [showCommands, setShowCommands] = useState(false);
  const panelId = useId();

  /*
   * The skin's own reveal curve, not a number typed here.
   *
   * `skin-motion.ts` carries a per-skin table — `terminal` snaps linear in
   * 100ms, `volcano` runs a slow cubic-bezier its author annotated "pressure,
   * then failure" — and a hardcoded `easeOut` was a curve that exists in none
   * of the thirteen. A panel that animates differently from every other reveal
   * in the same skin is the sort of wrongness nobody can name and everybody
   * feels.
   */
  const motionSpec = useSkinMotion();

  /*
   * And no curve at all when the reader has asked for none.
   *
   * The global `prefers-reduced-motion` rule in `index.css` clamps CSS
   * transition and animation durations, which does nothing to a Framer Motion
   * tween: those are inline styles driven from rAF, so there is no declaration
   * for the media query to override. The hook is the only thing that reaches
   * them, and six other components in this codebase already use it for exactly
   * this reason.
   */
  const reduceMotion = useReducedMotion();

  return (
    <div className="ui-card space-y-3 rounded-2xl border border-edge bg-surface-raised p-4">
      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand/12 text-brand"
        >
          <Terminal className="h-4 w-4" />
        </span>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">{t('cli.title')}</p>
          <p className="mt-0.5 text-2xs leading-relaxed text-content-muted">{t('cli.body')}</p>
          <div className="mt-1.5">
            <DocsLink />
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowCommands((open) => !open)}
          aria-expanded={showCommands}
          aria-controls={panelId}
          className={cn(
            'shrink-0 rounded-lg border px-2.5 py-1.5 text-2xs font-medium transition-colors',
            FOCUS_RING,
            showCommands
              ? 'border-brand/50 text-brand'
              : 'border-edge text-content-muted hover:border-brand/50 hover:text-content',
          )}
        >
          {t(showCommands ? 'cli.hideCommands' : 'cli.showCommands')}
        </button>
      </div>

      <AnimatePresence initial={false}>
        {showCommands && (
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
            <div className="rounded-xl border border-edge bg-surface-sunken/40 p-3">
              <CliCommandList variant="account" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
