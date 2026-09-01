import { useEffect, useRef, useState } from 'react';
import { Check, Copy, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

import { env } from '@/shared/config/env';
import { cn } from '@/shared/lib/cn';
import { useT } from '@/shared/i18n';

/**
 * Where the CLI is documented.
 *
 * A constant rather than a string typed into two panels, because it is the one
 * thing on either of them that leaves this application — and a link that is
 * right in Settings and stale in the project tab is worse than one that is
 * wrong in both, since nobody goes looking for the second copy.
 *
 * It points at the package's own README in the repository rather than at a docs
 * site, because that is where the documentation actually is. When there is a
 * hosted one, this line changes and both panels follow.
 */
export const CLI_DOCS_URL =
  'https://github.com/JPacademico/Task-Studio/tree/main/Task-Studio-CLI#readme';

/**
 * The focus ring every bespoke control in this feature wears.
 *
 * Spelled out once because these are raw `<button>` and `<a>` elements rather
 * than the shared `Button`, and the first version of this feature shipped with
 * none of them: thirteen interactive elements, zero focus styles, falling
 * through to whatever ring the browser draws. On `pixel` and `newspaper` —
 * both of which square every corner in the product — a rounded browser default
 * reads as a rendering fault rather than as focus.
 *
 * Matched to `buttonClasses` in `shared/ui/button.tsx` so the whole app keeps
 * one focus language.
 */
const FOCUS_RING =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50 focus-visible:ring-offset-1 focus-visible:ring-offset-surface';

/**
 * The address the CLI wants, which is not the address this app uses.
 *
 * `env.apiUrl` carries the version prefix because every request the browser
 * makes is relative to it. The CLI adds its own — it has to, being a separate
 * client with its own idea of which version it speaks — so handing somebody the
 * browser's value produces `…/api/v1/api/v1/cli/session` and a 404 that reads
 * as the server being broken.
 *
 * ## Why nothing on this panel prints it any more
 *
 * The install instructions used to read `taskstudio login --api <this>`, and
 * that line is gone. Not because the address is secret — it is in the bundle
 * every visitor of this page has already downloaded, and in every request the
 * page makes, so hiding it would be theatre — but because *asking people to
 * retype it* teaches a habit worth attacking. It trains users that the normal
 * way to sign in is to paste an API host read off a web page into the command
 * that then receives their password, and a page publishing a lookalike host is
 * the entire exploit.
 *
 * A published CLI knows which deployment it was published for, so it defaults
 * to it, and `taskstudio login` takes no arguments. `--api` survives for
 * self-hosters, who are exactly the people for whom typing an address is a
 * deliberate act rather than a step in an instruction they are following.
 *
 * Kept exported because `taskstudio doctor` checks the same mistake from the
 * other end, and because a self-hoster reading this file is the one audience
 * that still needs the derivation written down.
 */
export const cliApiUrl = (): string => env.apiUrl.replace(/\/api\/v\d+$/, '');

/**
 * One command, with a button that copies it.
 *
 * ## Why the failure is loud now
 *
 * It used to be swallowed, on the argument that "the text is right there and
 * selectable". Both halves of that turned out to be false. `navigator.clipboard`
 * is `undefined` on a non-secure origin — which a self-hosted HTTP deployment
 * is — so on those deployments the button did nothing, every time, and said
 * nothing about it. And on a phone the line is wider than the column, so the
 * text is *not* all there to select.
 *
 * So a failure toasts, using the string the rest of the app already uses for
 * exactly this, and the success is announced to assistive technology instead of
 * being carried by an icon swap no screen reader can see.
 */
export const CommandLine = ({ children }: { children: string }) => {
  const t = useT();
  const [copied, setCopied] = useState(false);
  const codeRef = useRef<HTMLElement>(null);
  const [isClipped, setIsClipped] = useState(false);

  /*
   * Whether the line runs past its column, measured rather than guessed.
   *
   * The fade below is painted only when it is true. A permanent one would lie
   * about a short command having more to it, which is worse than no fade at
   * all: the whole job of the affordance is to be believed.
   *
   * Re-measured on resize because the panel lives in a column that changes
   * width — the Connections tab is narrower than Settings, and both reflow.
   */
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
      // Optional-chained: on a non-secure origin the whole API is absent, and
      // reading `.writeText` off `undefined` throws a TypeError that is far
      // less legible than the sentence below.
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
        /*
         * Focusable and labelled, because it scrolls.
         *
         * A `<code>` that overflows is a scroll container, and a scroll
         * container a keyboard cannot reach is content a keyboard user cannot
         * read. Chrome makes overflowing elements focusable on its own; Safari
         * and Firefox do not, so the attribute is explicit.
         */
        tabIndex={isClipped ? 0 : -1}
        role={isClipped ? 'region' : undefined}
        aria-label={isClipped ? t('cli.commandScrollable') : undefined}
        className={cn(
          'min-w-0 flex-1 overflow-x-auto whitespace-pre py-1 text-[11px] leading-relaxed text-content',
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

      {/*
        The success, said rather than drawn.

        The icon swap is invisible to a screen reader, which left the primary
        action of the whole feature with no confirmation at all for the people
        least able to infer one. `role="status"` is polite: it waits for a gap
        rather than interrupting whatever is being read.
      */}
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
      target="_blank"
      rel="noreferrer noopener"
      className={cn(
        'inline-flex items-center gap-1 rounded-md py-1 text-[11px] font-medium text-brand',
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
 * A group label above a run of commands.
 *
 * 11px semibold rather than the 10px `text-content-faint` it started as. That
 * combination measured 3.30:1 against the default skin's own surface — under
 * the 4.5:1 floor for text this size, and failing on eight of the nine skins
 * checked — on the labels that make the block scannable in the first place.
 * `Group` in the connections panel already uses this pairing for the same job.
 */
const GroupLabel = ({ children }: { children: string }) => (
  <p className="text-[11px] font-semibold uppercase tracking-wide text-content-muted">{children}</p>
);

/**
 * The commands themselves, in the order somebody runs them.
 *
 * ## Why there are two variants and not one list
 *
 * Because the two places this appears are answering different questions, and a
 * single list would answer neither well.
 *
 * In **Settings** the question is "how do I get this on my machine" — it is an
 * account-level page, there is no project in scope, and the answer ends at
 * being signed in. In a **project's Connections tab** the question is "how do I
 * connect *this* project", the reader is already looking at one, and the answer
 * they need is `init` — the command that adopts a checkout into a project that
 * already exists, which is the situation they are provably in.
 *
 * Showing `create project` to somebody standing inside a project would be
 * inviting them to make a second one for the same repository, which is the
 * worst thing this CLI can do to a board.
 *
 * ## Why `DocsLink` is not in here
 *
 * Because the two parents want it in different places, and putting it in both
 * produced two of them. Settings keeps it in the header, where it is visible
 * while the commands are folded away — that is most of the point of folding
 * them. The connections card has no header room, so it puts it at the bottom of
 * the panel. One link each, placed by whoever knows the layout.
 */
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
            {/*
              Offered in the project variant and not the account one, because
              it is a per-repository hook and the reader is provably standing in
              a project. In Settings there is no repository in scope, so the
              same line would be an instruction somebody cannot follow yet.
            */}
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

      <p className="text-[11px] leading-relaxed text-content-muted">
        {variant === 'project' ? t('cli.projectHint') : t('cli.accountHint')}
      </p>
    </div>
  );
};

export { FOCUS_RING };
