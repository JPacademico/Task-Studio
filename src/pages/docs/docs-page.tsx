import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Terminal } from 'lucide-react';

import { CommandLine } from '@/features/cli/ui/cli-commands';
import { LandingNav } from '@/pages/landing/ui/landing-nav';
import { cn } from '@/shared/lib/cn';
import { useLocale, useT } from '@/shared/i18n';
import { DOCS, type DocsSection } from './docs-content';

/**
 * The CLI, documented in the product rather than in a README.
 *
 * ## Why this page exists
 *
 * Both places that offer the CLI — the project's Connections shelf and the
 * account's settings — linked "Read the docs" straight out to a GitHub README.
 * That is three problems in one link. It leaves the product for a page in a
 * different typeface with none of the reader's theme or language; it shows a
 * file whose audience is somebody browsing source, not somebody who has just
 * been handed four commands to run; and it is the one link on those panels that
 * could rot without anybody noticing, because nothing here fails when a
 * repository is renamed.
 *
 * The README stays where it is, for people reading the package. This is for
 * people using it.
 *
 * ## The shape, and why the sidebar is worth its width
 *
 * A command reference is read by *lookup*, not by reading — somebody arrives
 * knowing they want the thing that closes a task and not what it is called. A
 * persistent list of every section, with the one they are in marked, is the
 * cheapest possible answer to "what else is there", and it is the difference
 * between a page you scroll and a page you navigate.
 *
 * On a phone the sidebar becomes a scrolling strip above the content rather
 * than a drawer behind a button: there are nine entries, they are all one word,
 * and a menu that has to be opened to find out it is short is worse than the
 * strip it replaces.
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

  /*
   * Which section the reader is in, from the browser rather than from scroll
   * arithmetic.
   *
   * `IntersectionObserver` reports crossings on its own thread; the alternative
   * — a scroll listener measuring every heading — runs on the main thread at
   * scroll frequency to answer a question that changes nine times on the whole
   * page.
   *
   * The root margin is what makes it feel right rather than merely correct: it
   * shrinks the viewport to a band near the top, so a section becomes "current"
   * when its heading reaches reading position, not when its last line finally
   * leaves the bottom of the screen.
   */
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
            // Sticky under the site header rather than scrolling away: a table
            // of contents that leaves the screen is a table of contents you
            // scroll back up to reach.
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
          <header className="space-y-3">
            <h1 className="text-balance text-3xl font-bold tracking-tight sm:text-5xl">
              {doc.startTitle.split('taskstudio')[0]}
              <code className="font-mono text-brand">taskstudio</code>
            </h1>
            <p className="max-w-prose text-sm leading-relaxed text-content-muted">
              {doc.startBody}
            </p>
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
                <p className="text-2xs leading-relaxed text-content-muted">{step.body}</p>
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
                  'shrink-0 rounded-full border px-3 py-1.5 text-2xs transition-colors',
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
        <span
          aria-hidden
          className="grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-brand/12 text-brand"
        >
          <Terminal className="h-3.5 w-3.5" />
        </span>
        {section.title}
      </h3>

      {section.intro && (
        <p className="mt-2 max-w-prose text-xs leading-relaxed text-content-muted">
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
              {/*
                The command first and full width, then what it does.

                The obvious layout is a two-column table with the command on the
                left, and it is wrong here for one practical reason: these are
                copyable, and a copy button inside a narrow left column is a
                target the width of a word. Stacked, the command gets the whole
                row and the description gets a full measure to be read at.
              */}
              <CommandLine>{entry.command}</CommandLine>
              <p className="mt-2 text-xs leading-relaxed text-content-muted">{entry.body}</p>

              {entry.flags && (
                <ul className="mt-2.5 space-y-1 border-t border-edge/70 pt-2.5">
                  {entry.flags.map((flag) => (
                    <li key={flag.flag} className="flex flex-wrap items-baseline gap-x-2">
                      <code className="font-mono text-2xs text-brand">{flag.flag}</code>
                      <span className="text-2xs text-content-faint">{flag.body}</span>
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
              /* A quieter surface than a command card, and a rule down the left
                 rather than a full border: these are asides about the commands
                 above, and drawing them as equals would flatten the section. */
              className="border-l-2 border-edge pl-3.5"
            >
              <p className="text-xs font-semibold">{note.title}</p>
              <p className="mt-1 max-w-prose text-xs leading-relaxed text-content-muted">
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
