import { useEffect, useRef, useState } from 'react';
import { Check, Copy, ExternalLink } from 'lucide-react';
import { toast } from '@/shared/lib/toast';

import { env } from '@/shared/config/env';
import { cn } from '@/shared/lib/cn';
import { useT } from '@/shared/i18n';

/**
 * Where the CLI is documented. A constant rather than a string typed into two panels, because it is
 * the one link on either of them that used to leave this application.
 */
export const CLI_DOCS_URL = '/docs';

/**
 * The focus ring every bespoke control in this feature wears. Spelled out once because these are
 * raw `<button>` and `<a>` elements rather than the shared `Button`.
 */
const FOCUS_RING =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50 focus-visible:ring-offset-1 focus-visible:ring-offset-surface';

/**
 * The address the CLI wants, which is not the address this app uses. `env.apiUrl` carries the
 * version prefix because every request the browser makes is relative to it.
 */
export const cliApiUrl = (): string => env.apiUrl.replace(/\/api\/v\d+$/, '');

/**
 * One command, with a button that copies it. It used to be swallowed, on the argument that "the
 * text is right there and selectable". Both halves of that turned out to be false.
 */
export const CommandLine = ({ children }: { children: string }) => {
  const t = useT();
  const [copied, setCopied] = useState(false);
  const codeRef = useRef<HTMLElement>(null);
  const [isClipped, setIsClipped] = useState(false);

  // Whether the line runs past its column, measured rather than guessed. The fade below is painted
  // only when it is true.
  useEffect(() => {
    const element = codeRef.current;
    if (!element) return;

    const measure = () => setIsClipped(element.scrollWidth > element.clientWidth + 1);
    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [children]);

  const copy = async () => {
    try {
      // Optional-chained: on a non-secure origin the whole API is absent, and reading `.writeText`
      // off `undefined` throws a TypeError that is far less legible than the sentence below.
      await navigator.clipboard?.writeText(children);
      setCopied(true);
      // Long enough to notice, short enough that the button is ready again
      // before somebody wants the next line.
      setTimeout(() => setCopied(false), 1600);
    } catch {
      toast.error(t('cli.copyFailed'));
    }
  };

  return (
    <div className="ui-code flex items-center gap-2 rounded-xl border border-edge bg-surface-sunken px-3 py-1.5">
      <code
        ref={codeRef}
        /* Focusable and labelled, because it scrolls. A `<code>` that overflows is a scroll
           container. */
        tabIndex={isClipped ? 0 : -1}
        role={isClipped ? 'region' : undefined}
        aria-label={isClipped ? t('cli.commandScrollable') : undefined}
        className={cn(
          'min-w-0 flex-1 overflow-x-auto whitespace-pre py-1 text-2xs leading-relaxed text-content',
          FOCUS_RING,
          // The fade is a mask so it works over every skin's surface colour;
          // a gradient overlay would need to know the background it sits on.
          isClipped && '[mask-image:linear-gradient(to_right,black_88%,transparent)]',
        )}
      >
        {children}
      </code>

      <button
        type="button"
        onClick={() => void copy()}
        title={t('cli.copy')}
        aria-label={`${t('cli.copy')}: ${children}`}
        className={cn(
          'grid h-8 w-8 shrink-0 place-items-center rounded-lg text-content-muted',
          'transition-colors hover:bg-surface-raised hover:text-content',
          FOCUS_RING,
        )}
      >
        {copied ? <Check className="h-3.5 w-3.5 text-positive" /> : <Copy className="h-3.5 w-3.5" />}
      </button>

      {/* The success, said rather than drawn. The icon swap is invisible to a screen reader. */}
      <span className="sr-only" role="status" aria-live="polite">
        {copied ? t('cli.copied') : ''}
      </span>
    </div>
  );
};

/** The one link out, drawn the same wherever the commands appear. */
export const DocsLink = () => {
  const t = useT();

  return (
    <a
      href={CLI_DOCS_URL}
      /* A new tab, still. It is an internal route now, so this could be a `<Link>` — and it should
         not be. */
      target="_blank"
      rel="noreferrer noopener"
      className={cn(
        'inline-flex items-center gap-1 rounded-md py-1 text-2xs font-medium text-brand',
        'transition-opacity hover:opacity-80',
        FOCUS_RING,
      )}
    >
      {t('cli.docs')}
      <ExternalLink className="h-3 w-3" />
    </a>
  );
};

/**
 * A group label above a run of commands. 11px semibold rather than the 10px `text-content-faint` it
 * started as.
 */
const GroupLabel = ({ children }: { children: string }) => (
  <p className="text-2xs font-semibold uppercase tracking-wide text-content-muted">{children}</p>
);

/** The commands themselves, in the order somebody runs them. */
export const CliCommandList = ({ variant }: { variant: 'account' | 'project' }) => {
  const t = useT();

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <GroupLabel>{t('cli.install')}</GroupLabel>
        <CommandLine>npm install -g @task-studio/cli</CommandLine>
        {/* No `--api`, and no address to copy. See the note on `cliApiUrl`. */}
        <CommandLine>taskstudio login</CommandLine>
      </div>

      <div className="space-y-1.5">
        <GroupLabel>{variant === 'project' ? t('cli.inThisRepo') : t('cli.thenInAnyRepo')}</GroupLabel>
        {variant === 'project' ? (
          <>
            <CommandLine>taskstudio init</CommandLine>
            <CommandLine>taskstudio ide install</CommandLine>
            {/* Offered in the project variant and not the account one, because it is a
                per-repository hook and the reader is provably standing in a project. */}
            <CommandLine>taskstudio hook install</CommandLine>
          </>
        ) : (
          <>
            <CommandLine>taskstudio init</CommandLine>
            <CommandLine>taskstudio create project</CommandLine>
            <CommandLine>taskstudio ide install</CommandLine>
          </>
        )}
      </div>

      <p className="text-2xs leading-relaxed text-content-muted">
        {variant === 'project' ? t('cli.projectHint') : t('cli.accountHint')}
      </p>
    </div>
  );
};

export { FOCUS_RING };
