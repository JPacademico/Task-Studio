import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Terminal } from 'lucide-react';

import { CommandLine } from '@/features/cli/ui/cli-commands';
import { LandingNav } from '@/pages/landing/ui/landing-nav';
import { cn } from '@/shared/lib/cn';
import { FigmaMark } from '@/shared/ui';
import { useLocale, useT } from '@/shared/i18n';
import { DOCS, type DocsSection } from './docs-content';

/**
 * The CLI, documented in the product rather than in a README. Both places that offer the CLI — the
 * project's Connections shelf and the account's settings.
 */
const DocsPage = () => {
  const t = useT();
  const locale = useLocale();
  const doc = DOCS[locale];

  const sections = useMemo(
    () => doc.groups.flatMap((group) => group.sections),
    [doc],
  );

  const [active, setActive] = useState(sections[0]?.id ?? '');

  // Which section the reader is in, from the browser rather than from scroll arithmetic.
  // `IntersectionObserver` reports crossings on its own thread; the alternative.
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];

        if (visible) setActive(visible.target.id);
      },
      { rootMargin: '-96px 0px -70% 0px', threshold: 0 },
    );

    for (const section of sections) {
      const node = document.getElementById(section.id);
      if (node) observer.observe(node);
    }

    return () => observer.disconnect();
  }, [sections]);

  return (
    <div className="min-h-dvh bg-surface">
      <LandingNav />

      <div className="mx-auto flex w-full max-w-6xl gap-10 px-4 sm:px-6">
        {/* --- The contents ------------------------------------------------ */}
        <nav
          aria-label={t('docs.contents')}
          className={cn(
            'hidden shrink-0 lg:block lg:w-56',
            // Sticky under the site header rather than scrolling away: a table of contents that
            // leaves the screen is a table of contents you scroll back up to reach.
            'lg:sticky lg:top-[4.5rem] lg:h-[calc(100dvh-6rem)] lg:overflow-y-auto lg:py-10',
          )}
        >
          <ul className="space-y-6">
            {doc.groups.map((group) => (
              <li key={group.label}>
                <p className="mb-2 text-3xs font-semibold uppercase tracking-[0.16em] text-brand">
                  {group.label}
                </p>
                <ul className="space-y-0.5">
                  {group.sections.map((section) => (
                    <li key={section.id}>
                      <a
                        href={`#${section.id}`}
                        aria-current={active === section.id ? 'true' : undefined}
                        className={cn(
                          'block rounded-lg px-2.5 py-1.5 text-xs transition-colors',
                          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50',
                          active === section.id
                            ? 'bg-surface-sunken font-medium text-content'
                            : 'text-content-muted hover:text-content',
                        )}
                      >
                        {section.title}
                      </a>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </nav>

        <main id="content" tabIndex={-1} className="min-w-0 flex-1 py-10 focus:outline-none">
          {/* --- The opening --------------------------------------------- */}
          {/* The heading, and nothing under it. There was a sentence here — "Install it, sign
              the machine in, then point it at a repository". */}
          <header>
            <h1 className="text-balance text-3xl font-bold tracking-tight sm:text-5xl">
              {doc.startTitle.split('taskstudio')[0]}
              <code className="font-mono text-brand">taskstudio</code>
            </h1>
          </header>

          {/* Three cards, numbered, because this is genuinely a sequence: you
              cannot connect a repository before signing the machine in. */}
          <ol className="mt-8 grid gap-3 sm:grid-cols-3">
            {doc.start.map((step) => (
              <li
                key={step.step}
                className="ui-card space-y-2.5 rounded-2xl border border-edge bg-surface-raised p-4"
              >
                <p className="flex items-center gap-2">
                  <span className="font-mono text-2xs font-semibold text-brand">{step.step}</span>
                  <span className="text-3xs font-semibold uppercase tracking-[0.14em] text-content-faint">
                    {step.label}
                  </span>
                </p>
                <CommandLine>{step.command}</CommandLine>
                {/* 12px, not 11. These lines carry the preconditions — which Node, what a login
                    actually opens — and they were set at the smallest size in the app. */}
                <p className="text-xs leading-relaxed text-content-muted">{step.body}</p>
              </li>
            ))}
          </ol>

          {/* --- The mobile contents strip -------------------------------- */}
          <nav
            aria-label={t('docs.contents')}
            className="-mx-4 mt-8 flex gap-1.5 overflow-x-auto px-4 lg:hidden"
          >
            {sections.map((section) => (
              <a
                key={section.id}
                href={`#${section.id}`}
                className={cn(
                  'shrink-0 rounded-full border px-3 py-1.5 text-xs transition-colors',
                  active === section.id
                    ? 'border-brand/50 bg-brand/12 text-brand'
                    : 'border-edge text-content-muted',
                )}
              >
                {section.title}
              </a>
            ))}
          </nav>

          <h2 className="mt-12 text-xl font-semibold tracking-tight">{doc.chooseTitle}</h2>

          <div className="mt-4 space-y-12">
            {sections.map((section) => (
              <Section key={section.id} section={section} />
            ))}
          </div>

          <footer className="mt-16 border-t border-edge/70 pt-6">
            <Link
              to="/welcome"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-brand transition-opacity hover:opacity-80"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              {t('docs.backHome')}
            </Link>
          </footer>
        </main>
      </div>
    </div>
  );
};

/** One section: a heading, an optional sentence, its commands and its notes. */
const Section = ({ section }: { section: DocsSection }) => {
  const headingRef = useRef<HTMLElement>(null);

  return (
    <section
      ref={headingRef}
      id={section.id}
      /* Cleared past the sticky site header, so following a link from the
         contents does not park the heading underneath it. */
      className="scroll-mt-24"
    >
      <h3 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
        {/* The Figma mark keeps its own colours and therefore its own plate: five brand colours
            inside a brand-tinted square is one tint too many. */}
        <span
          aria-hidden
          className={cn(
            'grid h-6 w-6 shrink-0 place-items-center rounded-lg',
            section.icon === 'figma' ? 'bg-surface-sunken' : 'bg-brand/12 text-brand',
          )}
        >
          {section.icon === 'figma' ? (
            <FigmaMark className="h-3.5 w-3.5" />
          ) : (
            <Terminal className="h-3.5 w-3.5" />
          )}
        </span>
        {section.title}
      </h3>

      {section.intro && (
        <p className="mt-2 max-w-prose text-sm leading-relaxed text-content-muted">
          {section.intro}
        </p>
      )}

      {section.commands && (
        <ul className="mt-4 space-y-2">
          {section.commands.map((entry) => (
            <li
              key={entry.command}
              className="ui-card rounded-2xl border border-edge bg-surface-raised p-3.5"
            >
              {/* The command first and full width, then what it does. The obvious layout is a
                  two-column table with the command on the left. */}
              <CommandLine>{entry.command}</CommandLine>
              <p className="mt-2 text-sm leading-relaxed text-content-muted">{entry.body}</p>

              {entry.flags && (
                <ul className="mt-2.5 space-y-1 border-t border-edge/70 pt-2.5">
                  {entry.flags.map((flag) => (
                    <li key={flag.flag} className="flex flex-wrap items-baseline gap-x-2">
                      {/* Was 11px faint-on-surface for both halves, which is the
                          lowest-contrast. */}
                      <code className="font-mono text-xs text-brand">{flag.flag}</code>
                      <span className="text-xs leading-relaxed text-content-muted">
                        {flag.body}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      )}

      {section.notes && (
        <div className="mt-4 space-y-3">
          {section.notes.map((note) => (
            <div
              key={note.title}
              /* A quieter surface than a command card, and a rule down the left rather than a full
                 border: these are asides about the commands above. */
              className="border-l-2 border-edge pl-3.5"
            >
              <p className="text-sm font-semibold">{note.title}</p>
              <p className="mt-1 max-w-prose text-sm leading-relaxed text-content-muted">
                {note.body}
              </p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
};

export default DocsPage;
