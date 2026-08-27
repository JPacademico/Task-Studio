import { useState, type MouseEvent, type ReactElement } from 'react';
import { useQuery } from '@tanstack/react-query';

import { authApi, type OAuthProvider } from '@/features/auth/api/auth.api';
import { ensureApiAwake, isApiWarm } from '@/shared/api/client';
import { cn } from '@/shared/lib/cn';
import { SkinLoader } from '@/shared/ui';
import { useT } from '@/shared/i18n';

/**
 * The two marks, inlined.
 *
 * Not from `lucide-react`, which has no brand glyphs, and not from a CDN: a
 * sign-in screen is the one page that must render before anything else is
 * trusted, and two paths of SVG are cheaper than any way of fetching them.
 * Google's is the four-colour G at its published proportions — the one mark in
 * this app that does not take the skin's palette, because a recoloured
 * provider mark reads as a phishing page.
 */
const GoogleMark = () => (
  <svg viewBox="0 0 48 48" className="h-4 w-4" aria-hidden>
    <path
      fill="#4285F4"
      d="M45.12 24.5c0-1.56-.14-3.06-.4-4.5H24v8.51h11.84c-.51 2.75-2.06 5.08-4.39 6.64v5.52h7.11c4.16-3.83 6.56-9.47 6.56-16.17Z"
    />
    <path
      fill="#34A853"
      d="M24 46c5.94 0 10.92-1.97 14.56-5.33l-7.11-5.52c-1.97 1.32-4.49 2.1-7.45 2.1-5.73 0-10.58-3.87-12.31-9.07H4.34v5.7C7.96 41.07 15.4 46 24 46Z"
    />
    <path
      fill="#FBBC05"
      d="M11.69 28.18c-.44-1.32-.69-2.73-.69-4.18s.25-2.86.69-4.18v-5.7H4.34A21.99 21.99 0 0 0 2 24c0 3.55.85 6.91 2.34 9.88l7.35-5.7Z"
    />
    <path
      fill="#EA4335"
      d="M24 10.75c3.23 0 6.13 1.11 8.41 3.29l6.31-6.31C34.91 4.18 29.93 2 24 2 15.4 2 7.96 6.93 4.34 14.12l7.35 5.7c1.73-5.2 6.58-9.07 12.31-9.07Z"
    />
  </svg>
);

const GitHubMark = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
    <path d="M12 .5C5.73.5.9 5.33.9 11.6c0 4.9 3.18 9.06 7.59 10.53.55.1.75-.24.75-.53v-2.07c-3.09.67-3.74-1.32-3.74-1.32-.5-1.29-1.23-1.63-1.23-1.63-1.01-.69.08-.68.08-.68 1.11.08 1.7 1.15 1.7 1.15.99 1.7 2.6 1.21 3.23.93.1-.72.39-1.21.7-1.49-2.47-.28-5.06-1.24-5.06-5.51 0-1.22.43-2.21 1.15-2.99-.12-.28-.5-1.42.11-2.95 0 0 .93-.3 3.06 1.14a10.6 10.6 0 0 1 5.58 0c2.12-1.44 3.05-1.14 3.05-1.14.61 1.53.23 2.67.11 2.95.72.78 1.15 1.77 1.15 2.99 0 4.28-2.6 5.22-5.08 5.5.4.35.76 1.03.76 2.08v3.08c0 .3.2.64.76.53a11.11 11.11 0 0 0 7.58-10.53C23.1 5.33 18.27.5 12 .5Z" />
  </svg>
);

const MARKS: Record<OAuthProvider, () => ReactElement> = {
  google: GoogleMark,
  github: GitHubMark,
};

const LABELS: Record<OAuthProvider, string> = {
  google: 'Google',
  github: 'GitHub',
};

interface OAuthButtonsProps {
  /** Changes only the wording: the flow is identical either way. */
  intent: 'signIn' | 'signUp';
  className?: string;
}

/**
 * "Continue with Google / GitHub", when the API has been given the keys.
 *
 * ## Why the list is fetched
 *
 * The client ids live on the API, not in this bundle, so the SPA genuinely does
 * not know which providers are available — and a button that leads to a 503 is
 * worse than an absent one. `/auth/oauth/providers` answers in a few bytes, it
 * is cached for the session, and a failed request renders nothing at all, which
 * is also the right answer for an API deployed before these endpoints existed.
 *
 * ## Why this is a link and not a mutation
 *
 * The provider's consent screen is a page the user has to see, on the
 * provider's own origin, setting the provider's own cookies. There is nothing
 * an XHR could do with it. So the button hands the browser to the API, which
 * redirects onward — see `authApi.oauthStartUrl` and the callback screen.
 *
 * ## Why the navigation waits
 *
 * That handover is a *full page navigation*, and on a free-tier host the
 * container it lands on is asleep. The browser leaves the app immediately and
 * then sits on the hosting platform's own loading page — unbranded, silent,
 * for the length of a Node boot plus a Neon connect — before Google is ever
 * reached. From the user's side that is indistinguishable from having clicked
 * a broken link into somebody else's website, which is exactly the moment a
 * sign-in screen cannot afford to look untrustworthy.
 *
 * So the click waits for `/health` to answer before it navigates, and says so
 * while it waits. The wait is usually zero: `AuthShell` starts the same boot
 * on mount, `ensureApiAwake` shares that one promise, and by the time anybody
 * has read the form and chosen a provider the container is normally up.
 *
 * `href` stays real. Middle-click, ⌘-click and "open in new tab" go straight
 * through — a modified click is not intercepted — because taking those away
 * to add a spinner would be a bad trade.
 */
export const OAuthButtons = ({ intent, className }: OAuthButtonsProps) => {
  const t = useT();
  /** The provider whose click is waiting on the container, if any. */
  const [waking, setWaking] = useState<OAuthProvider | null>(null);

  const { data: providers } = useQuery({
    queryKey: ['auth', 'oauth-providers'],
    queryFn: authApi.oauthProviders,
    // The answer changes when the server is redeployed, not while somebody is
    // looking at a login form.
    staleTime: Infinity,
    retry: false,
  });

  const available = (['google', 'github'] as const).filter(
    (provider) => providers?.[provider],
  );

  if (available.length === 0) return null;

  const start = async (event: MouseEvent<HTMLAnchorElement>, provider: OAuthProvider) => {
    // A modified click means "open this somewhere else" — leave it alone.
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

    event.preventDefault();
    const url = authApi.oauthStartUrl(provider);

    if (isApiWarm()) {
      window.location.assign(url);
      return;
    }

    setWaking(provider);
    // Navigate either way. A boot that could not be confirmed is still far
    // more likely to answer than not, and refusing to continue would strand
    // somebody who has already decided how they want to sign in.
    await ensureApiAwake();
    window.location.assign(url);
  };

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex items-center gap-3" aria-hidden>
        <span className="h-px flex-1 bg-edge" />
        <span className="text-[10px] uppercase tracking-[0.18em] text-content-faint">
          {t('auth.oauth.divider')}
        </span>
        <span className="h-px flex-1 bg-edge" />
      </div>

      {/*
        One per row, always. These used to sit two-up on a half-width cell,
        which left roughly 170px for a string nobody controls the length of —
        "Continue with Google", "Criar conta com GitHub" — so the label was
        ellipsised on every render rather than in some edge case. A stacked
        list gives each button the card's full width, which every locale's
        wording fits at the normal text size, and the marks stay optically
        aligned down the left edge instead of floating mid-cell.
      */}
      <div className="grid gap-2">
        {available.map((provider) => {
          const Mark = MARKS[provider];

          return (
            <a
              key={provider}
              href={authApi.oauthStartUrl(provider)}
              onClick={(event) => void start(event, provider)}
              aria-busy={waking === provider || undefined}
              className={cn(
                'ui-btn inline-flex h-10 w-full select-none items-center justify-center gap-2.5 rounded-xl',
                'border border-edge px-4 text-sm font-medium text-content',
                'transition-[transform,background-color,border-color] duration-150 ease-studio',
                'hover:border-brand/50 hover:bg-surface-sunken active:scale-[0.98]',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50',
                // A second click during the wait would start a second
                // navigation; the whole row goes inert rather than just the
                // one that was pressed.
                waking && 'pointer-events-none',
                waking && waking !== provider && 'opacity-50',
              )}
            >
              <span className="shrink-0">
                {waking === provider ? <SkinLoader size="sm" tone="inherit" /> : <Mark />}
              </span>
              <span className="whitespace-nowrap">
                {t(intent === 'signUp' ? 'auth.oauth.signUpWith' : 'auth.oauth.continueWith', {
                  provider: LABELS[provider],
                })}
              </span>
            </a>
          );
        })}
      </div>

      {/*
        Said only once the wait is real.

        Rendering this permanently would be an apology for a delay that, on a
        warm container, does not happen — and a sign-in screen that opens by
        explaining that it might be slow is worse than one that is
        occasionally slow. It appears when a boot is actually being waited on,
        which is also the only moment it is true.
      */}
      {waking && (
        <p
          role="status"
          className="text-center text-[11px] leading-relaxed text-content-muted"
        >
          {t('auth.oauth.waking')}
        </p>
      )}
    </div>
  );
};
