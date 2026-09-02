import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { AlertTriangle, Check, Globe, MonitorSmartphone, Terminal, X } from 'lucide-react';

import {
  cliDeviceApi,
  normaliseUserCode,
  type CliDeviceRequest,
} from '@/features/cli/api/cli-device.api';
import { errorMessage } from '@/shared/api/client';
import { formatRelative } from '@/shared/lib/dates';
import { cn } from '@/shared/lib/cn';
import { Button, EmptyState, Input, Skeleton } from '@/shared/ui';
import { useT } from '@/shared/i18n';

/** The code is eight characters; a dash in the middle is how people read it. */
const prettyCode = (code: string): string =>
  code.length === 8 ? `${code.slice(0, 4)}-${code.slice(4)}` : code;

/**
 * What the terminal is asking for, and who is asking.
 *
 * Every fact on this card is displayed and none of it is trusted. The device
 * name is a string the requesting process chose; the address is observed by the
 * server. The pairing is the point: a request the reader did not make can call
 * itself "my laptop", and cannot fake where it came from.
 */
const RequestCard = ({ request }: { request: CliDeviceRequest }) => {
  const t = useT();

  return (
    <div className="space-y-3 rounded-2xl border border-edge bg-surface-raised p-4">
      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand/12 text-brand"
        >
          <MonitorSmartphone className="h-5 w-5" />
        </span>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">
            {request.deviceName || t('cliAuth.unnamedDevice')}
          </p>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-2xs text-content-muted">
            {request.ipAddress && (
              <span className="inline-flex items-center gap-1">
                <Globe className="h-3 w-3 shrink-0" />
                {request.ipAddress}
              </span>
            )}
            <span>{formatRelative(request.requestedAt)}</span>
          </p>
        </div>

        <span className="shrink-0 rounded-lg border border-edge bg-surface-sunken px-2 py-1 font-mono text-xs tracking-[0.2em]">
          {prettyCode(request.userCode)}
        </span>
      </div>

      {/*
        What approving actually grants, said before it is granted.

        Not decoration and not a disclaimer: the one attack a device flow has is
        somebody being talked into approving a code they did not ask for, and
        the only defence that works is the reader knowing what they are about to
        hand over. It is a full-access token, so it says so.
      */}
      <p className="flex items-start gap-2 rounded-xl bg-warning/10 px-3 py-2 text-2xs leading-relaxed text-warning">
        <AlertTriangle aria-hidden className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        {t('cliAuth.grantWarning')}
      </p>
    </div>
  );
};

/**
 * Approving a terminal, from a browser that is already signed in.
 *
 * ## Why this page exists
 *
 * The CLI used to be installed with a line that read
 * `taskstudio login --api https://…`, followed by an email address and a
 * password typed into a shell. The address in it was never a secret — it is in
 * every request the app makes — but *handing it to the user to retype* trained
 * a habit worth attacking: paste an API host you read somewhere into the
 * command that then receives your password. A lookalike domain is the whole
 * exploit, and nothing about the command looks wrong while it is running.
 *
 * So the address moved into the published CLI and the credential moved out of
 * the terminal. The terminal now prints a short code; this page is where a
 * person confirms it, under an account they are already signed in to, on an
 * origin their browser is showing them. It is also the only sign-in the CLI has
 * ever had that works for an account created through Google or GitHub, which
 * has no password to exchange.
 *
 * ## Why the code can be typed as well as linked
 *
 * The terminal prints a clickable URL with the code in it, and that is the path
 * almost everybody takes. The field is for the case the link cannot be
 * followed — a server over SSH, a terminal that does not linkify, a phone
 * picking up a code read off a laptop — which is precisely the situation a
 * short, unambiguous code exists for.
 */
const CliAuthorizePage = () => {
  const t = useT();
  const [params, setParams] = useSearchParams();

  const [code, setCode] = useState(() => normaliseUserCode(params.get('code') ?? ''));
  const [submittedCode, setSubmittedCode] = useState(() =>
    normaliseUserCode(params.get('code') ?? ''),
  );
  const [outcome, setOutcome] = useState<'approved' | 'denied' | null>(null);

  /*
   * The code leaves the address bar once it has been read.
   *
   * It is single-use and short-lived, so this is tidiness rather than a
   * control — but a URL in somebody's history that reopens a stale approval
   * screen is a confusing thing to come back to, and there is no reason to
   * leave it there.
   */
  useEffect(() => {
    if (!params.get('code')) return;

    const next = new URLSearchParams(params);
    next.delete('code');
    setParams(next, { replace: true });
  }, [params, setParams]);

  const request = useQuery({
    queryKey: ['cli', 'device', submittedCode],
    queryFn: () => cliDeviceApi.describe(submittedCode),
    enabled: submittedCode.length === 8 && outcome === null,
    // A pending request is a fact about a ten-minute window, and re-asking for
    // it after the person has read it would only ever take the card away.
    staleTime: Infinity,
    retry: false,
  });

  const answer = useMutation({
    mutationFn: (verdict: 'approved' | 'denied') =>
      verdict === 'approved'
        ? cliDeviceApi.approve(submittedCode)
        : cliDeviceApi.deny(submittedCode),
    onSuccess: (_data, verdict) => setOutcome(verdict),
  });

  const isReady = code.length === 8;

  // --- Answered ------------------------------------------------------------

  if (outcome) {
    return (
      <Shell>
        <EmptyState
          icon={
            outcome === 'approved' ? (
              <Check className="h-6 w-6 text-positive" />
            ) : (
              <X className="h-6 w-6 text-danger" />
            )
          }
          title={t(outcome === 'approved' ? 'cliAuth.approvedTitle' : 'cliAuth.deniedTitle')}
          description={t(outcome === 'approved' ? 'cliAuth.approvedBody' : 'cliAuth.deniedBody')}
        />
      </Shell>
    );
  }

  // --- Asking for the code -------------------------------------------------

  if (submittedCode.length !== 8) {
    return (
      <Shell>
        <form
          className="space-y-3 rounded-2xl border border-edge bg-surface-raised p-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (isReady) setSubmittedCode(code);
          }}
        >
          <Input
            label={t('cliAuth.codeLabel')}
            name="code"
            value={prettyCode(code)}
            onChange={(event) => setCode(normaliseUserCode(event.target.value).slice(0, 8))}
            placeholder="XXXX-XXXX"
            autoFocus
            autoComplete="off"
            spellCheck={false}
            className="font-mono tracking-[0.2em]"
          />
          <div className="flex justify-end">
            <Button type="submit" disabled={!isReady}>
              {t('cliAuth.continue')}
            </Button>
          </div>
        </form>
      </Shell>
    );
  }

  // --- Looking it up -------------------------------------------------------

  if (request.isPending) {
    return (
      <Shell>
        <Skeleton className="h-32 rounded-2xl" />
      </Shell>
    );
  }

  if (request.isError || !request.data) {
    return (
      <Shell>
        <EmptyState
          icon={<AlertTriangle className="h-6 w-6" />}
          title={t('cliAuth.expiredTitle')}
          description={errorMessage(request.error, t('cliAuth.expiredBody'))}
          action={
            <Button
              variant="secondary"
              onClick={() => {
                setSubmittedCode('');
                setCode('');
              }}
            >
              {t('cliAuth.tryAnother')}
            </Button>
          }
        />
      </Shell>
    );
  }

  // --- The decision --------------------------------------------------------

  return (
    <Shell>
      <div className="space-y-4">
        <RequestCard request={request.data} />

        <div className="flex flex-wrap justify-end gap-2">
          <Button
            variant="ghost"
            onClick={() => answer.mutate('denied')}
            disabled={answer.isPending}
          >
            <X className="h-3.5 w-3.5" />
            {t('cliAuth.deny')}
          </Button>
          <Button onClick={() => answer.mutate('approved')} isLoading={answer.isPending}>
            <Check className="h-3.5 w-3.5" />
            {t('cliAuth.approve')}
          </Button>
        </div>

        {answer.isError && (
          <p className="text-2xs text-danger">{errorMessage(answer.error)}</p>
        )}
      </div>
    </Shell>
  );
};

/** One frame for all five states, so the heading does not move between them. */
const Shell = ({ children }: { children: React.ReactNode }) => {
  const t = useT();

  return (
    <div className={cn('mx-auto max-w-lg space-y-6')}>
      <header className="space-y-1">
        <p className="inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.18em] text-content-faint">
          <Terminal className="h-3.5 w-3.5" />
          {t('cli.title')}
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">{t('cliAuth.heading')}</h1>
        <p className="text-xs leading-relaxed text-content-muted">{t('cliAuth.subheading')}</p>
      </header>

      {children}
    </div>
  );
};

export default CliAuthorizePage;
