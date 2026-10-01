import { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';

import { authApi } from '@/features/auth/api/auth.api';

/**
 * The Cloudflare Turnstile widget, on the four forms a script would attack. The site key and the
 * API's secret are a pair, and Cloudflare checks one against the other.
 */
const SCRIPT_ID = 'cf-turnstile-script';
const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

interface TurnstileApi {
  render: (
    element: HTMLElement,
    options: {
      sitekey: string;
      callback: (token: string) => void;
      'error-callback'?: () => void;
      'expired-callback'?: () => void;
      theme?: 'auto' | 'light' | 'dark';
      appearance?: 'always' | 'execute' | 'interaction-only';
    },
  ) => string;
  remove: (widgetId: string) => void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

/**
 * Load the Turnstile script once per document, and resolve when it is usable. Shared rather than
 * per-component because two forms can be mounted at once.
 */
let scriptPromise: Promise<void> | null = null;

const loadTurnstile = (): Promise<void> => {
  if (window.turnstile) return Promise.resolve();
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise<void>((resolve, reject) => {
    const existing = document.getElementById(SCRIPT_ID);

    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('Turnstile failed to load')));
      return;
    }

    const script = document.createElement('script');
    script.id = SCRIPT_ID;
    script.src = SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.addEventListener('load', () => resolve());
    script.addEventListener('error', () => {
      // Let a later mount try again rather than caching the failure forever —
      // this is exactly the case where the reader's network was briefly out.
      scriptPromise = null;
      reject(new Error('Turnstile failed to load'));
    });

    document.head.appendChild(script);
  });

  return scriptPromise;
};

/** Whether this deployment asks for a human check, and with which key. */
export const useBotProtection = () =>
  useQuery({
    queryKey: ['bot-protection'],
    queryFn: () => authApi.botProtection(),
    // The answer changes when the deployment is reconfigured, which is not
    // during somebody's visit. One request per session is plenty.
    staleTime: Infinity,
    retry: false,
  });

interface HumanCheckProps {
  /**
   * Called with a fresh token, and with `undefined` when the old one expires. Turnstile tokens are
   * single-use and time-limited.
   */
  onToken: (token: string | undefined) => void;
}

export const HumanCheck = ({ onToken }: HumanCheckProps) => {
  const { data: config } = useBotProtection();
  const hostRef = useRef<HTMLDivElement>(null);

  // The callback lives in a ref so that re-rendering the parent — which every keystroke in the form
  // does — cannot tear down and rebuild the widget.
  const onTokenRef = useRef(onToken);
  onTokenRef.current = onToken;

  useEffect(() => {
    const host = hostRef.current;
    if (!config || !host) return;

    let widgetId: string | null = null;
    let cancelled = false;

    void loadTurnstile()
      .then(() => {
        if (cancelled || !window.turnstile) return;

        widgetId = window.turnstile.render(host, {
          sitekey: config.siteKey,
          callback: (token) => onTokenRef.current(token),
          'error-callback': () => onTokenRef.current(undefined),
          'expired-callback': () => onTokenRef.current(undefined),
          // `auto` follows the page's own light/dark, which is what the thirteen
          // skins already express through `prefers-color-scheme`.
          theme: 'auto',
        });
      })
      .catch(() => {
        // The script did not load — an ad blocker, a captive portal, an offline moment.
        // Deliberately silent: the API fails open when it cannot reach Cloudflare either.
      });

    return () => {
      cancelled = true;
      if (widgetId && window.turnstile) window.turnstile.remove(widgetId);
    };
  }, [config]);

  if (!config) return null;

  return <div ref={hostRef} className="flex justify-center" aria-live="polite" />;
};
