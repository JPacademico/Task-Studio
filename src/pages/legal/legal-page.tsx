import { Fragment, useEffect, type ReactNode } from 'react';
import { Link } from 'react-router-dom';

import { LandingNav } from '@/pages/landing/ui/landing-nav';
import { useLocale, useT } from '@/shared/i18n';
import { LEGAL, LEGAL_CONTACT, LEGAL_UPDATED, type LegalKind } from './content';

const LINK = 'font-medium text-brand underline underline-offset-2 hover:no-underline';

/** A paragraph with its `{email}`, `{terms}` and `{privacy}` tokens turned into links. */
const Rich = ({ text }: { text: string }) => {
  const t = useT();
  const parts = text.split(/(\{email\}|\{terms\}|\{privacy\})/);

  return (
    <>
      {parts.map((part, index) => {
        let node: ReactNode = part;
        if (part === '{email}') {
          node = (
            <a className={LINK} href={`mailto:${LEGAL_CONTACT}`}>
              {LEGAL_CONTACT}
            </a>
          );
        } else if (part === '{terms}' || part === '{privacy}') {
          const kind = part === '{terms}' ? 'terms' : 'privacy';
          node = (
            <Link className={LINK} to={`/${kind}`}>
              {t(kind === 'terms' ? 'legal.terms' : 'legal.privacy')}
            </Link>
          );
        }
        return <Fragment key={index}>{node}</Fragment>;
      })}
    </>
  );
};

/** The Terms of Service or the Privacy Policy. Public, outside both guards, like `/docs`. */
const LegalPage = ({ kind }: { kind: LegalKind }) => {
  const t = useT();
  const locale = useLocale();
  const doc = LEGAL[locale][kind];

  useEffect(() => {
    document.title = `${doc.title} · Task Studio`;
    window.scrollTo(0, 0);
  }, [doc.title]);

  const updated = new Intl.DateTimeFormat(locale, { dateStyle: 'long' }).format(
    new Date(`${LEGAL_UPDATED}T12:00:00`),
  );

  return (
    <div className="min-h-dvh bg-surface">
      <LandingNav />

      <main id="content" className="mx-auto w-full max-w-3xl px-4 pb-24 pt-12 sm:px-6">
        <p className="text-3xs font-semibold uppercase tracking-[0.16em] text-brand">
          {t('legal.eyebrow')}
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">{doc.title}</h1>
        <p className="mt-2 text-xs text-content-faint">{t('legal.updated', { date: updated })}</p>

        <p className="mt-6 text-sm leading-relaxed text-content-muted sm:text-base">
          <Rich text={doc.intro} />
        </p>

        <div className="mt-10 space-y-8">
          {doc.sections.map((section) => (
            <section key={section.heading}>
              <h2 className="text-base font-semibold tracking-tight sm:text-lg">{section.heading}</h2>
              {section.body.map((paragraph) => (
                <p key={paragraph} className="mt-2 text-sm leading-relaxed text-content-muted">
                  <Rich text={paragraph} />
                </p>
              ))}
              {section.list && (
                <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-content-muted marker:text-brand">
                  {section.list.map((item) => (
                    <li key={item}>
                      <Rich text={item} />
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>

        <nav className="mt-14 flex flex-wrap gap-x-6 gap-y-2 border-t border-edge pt-6 text-sm">
          <Link className={LINK} to={kind === 'terms' ? '/privacy' : '/terms'}>
            {t(kind === 'terms' ? 'legal.privacy' : 'legal.terms')}
          </Link>
          <Link className={LINK} to="/welcome">
            {t('legal.home')}
          </Link>
        </nav>
      </main>
    </div>
  );
};

export const TermsPage = () => <LegalPage kind="terms" />;
export const PrivacyPage = () => <LegalPage kind="privacy" />;
