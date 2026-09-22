import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  Ban,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Flag,
  Lock,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Users,
} from 'lucide-react';
import { toast } from '@/shared/lib/toast';

import type { Plan } from '@/entities/billing/model/types';
import { adminApi, adminTokenStore } from '@/features/admin/api/admin.api';
import type { AdminReport, AdminStats, AdminUserRow } from '@/features/admin/model/types';
import { errorMessage } from '@/shared/api/client';
import { formatDateTime, formatRelative } from '@/shared/lib/dates';
import { cn } from '@/shared/lib/cn';
import {
  Avatar,
  Button,
  EmptyState,
  Input,
  Modal,
  PasswordInput,
  Skeleton,
  Textarea,
} from '@/shared/ui';

/**
 * The suspension lengths on offer, and why they are buttons and not a number.
 *
 * A free-text "days" field invites a typo that is indistinguishable from an
 * intention — 300 instead of 30 is a decade of somebody's working life, entered
 * by a slip nothing would catch. Four durations plus permanent covers what
 * moderation actually does, and each one is a deliberate press.
 */
const DURATIONS: { days: number | null; label: string }[] = [
  { days: 1, label: '24 hours' },
  { days: 7, label: '7 days' },
  { days: 30, label: '30 days' },
  { days: 90, label: '90 days' },
  { days: null, label: 'Permanent' },
];

const MIN_REASON = 10;

/**
 * The plans, in the order the filter and the picker draw them.
 *
 * Spelled out here rather than fetched from `GET /admin/plans` for the *labels*
 * — that endpoint carries the ceilings, which the dialog shows, and this array
 * is what has to exist before any request has come back so the filter can be
 * drawn on an empty console.
 *
 * Untranslated, like the rest of this page. The console is deliberately not
 * dressed in the product's furniture and is read by one person who runs the
 * deployment; putting it through the dictionary would mean every plan rename
 * touching two locales to change a word only the operator sees.
 */
const PLANS: { value: Plan; label: string; tone: string }[] = [
  { value: 'FREE', label: 'Free', tone: 'border-edge text-content-muted' },
  { value: 'STARTUP', label: 'Startup', tone: 'border-brand/40 bg-brand/10 text-brand' },
  { value: 'BARON', label: 'Baron', tone: 'border-positive/40 bg-positive/10 text-positive' },
];

const planLabel = (plan: Plan): string =>
  PLANS.find((entry) => entry.value === plan)?.label ?? plan;

/**
 * The moderation console.
 *
 * ## Why this page is not part of the app
 *
 * It sits outside `ProtectedRoute` and outside `AppLayout`, and it has no rail,
 * no chat dock and no project context — because it is not a screen for a *user*
 * of Task Studio. The administrator is not a user (see `AdminAuthService` on
 * the API): there is no account to sign into, no flag on a row, and no route
 * from a compromised session to this page. What opens it is a password held in
 * the deployment's environment, and what it buys is thirty minutes.
 *
 * Its plainness is deliberate too. Every other surface in this app is dressed
 * in one of thirteen skins; this one stays flat and severe, because it is the
 * screen where somebody takes a product away from a person and it should not
 * feel like the rest of the furniture.
 *
 * ## Why suspending needs a reason typed into it
 *
 * The reason is emailed, verbatim, to the person losing access — it is the only
 * thing they receive and the only basis on which they can respond. The API
 * enforces a minimum length; this refuses to enable the button below it for the
 * same reason, so the requirement is visible before the request rather than
 * after.
 */
/**
 * What people have said about one account, on demand.
 *
 * ## Why the reasons are not on the row
 *
 * Because the search result is a list of *accounts* and a report is a
 * paragraph. Inlining them would turn a scannable list into a wall the moment
 * one account collected four, and the count on the row already does the job a
 * list has to do — telling somebody which row to open.
 *
 * ## Why it fetches on expand rather than with the list
 *
 * A search returns twenty-five accounts and an administrator opens at most one
 * or two. Loading every account's reports to render a number that is already on
 * the row would be twenty-five queries for a list nobody has asked to read.
 */
const ReportSheet = ({ userId, count }: { userId: string; count: number }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [reports, setReports] = useState<AdminReport[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const open = async () => {
    setIsOpen(true);
    if (reports) return;

    setIsLoading(true);
    try {
      setReports(await adminApi.reports(userId));
    } catch (error) {
      toast.error(errorMessage(error, 'Could not read those reports.'));
      setIsOpen(false);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mt-1.5">
      <button
        type="button"
        onClick={() => (isOpen ? setIsOpen(false) : void open())}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-lg border border-warning/40 bg-warning/10',
          'px-2 py-1 text-3xs font-semibold text-warning transition-colors hover:bg-warning/15',
        )}
      >
        <Flag className="h-2.5 w-2.5" />
        {count} report{count === 1 ? '' : 's'}
      </button>

      {isOpen && (
        <div className="mt-1.5 space-y-1.5">
          {isLoading && <Skeleton className="h-12 rounded-lg" />}

          {reports?.map((report) => (
            <div
              key={report.id}
              className="rounded-lg border border-edge bg-surface-sunken/60 p-2 text-3xs leading-relaxed"
            >
              <p className="text-content-faint">
                {report.reporter.displayName} ({report.reporter.email})
                {report.project && ` · ${report.project.name}`}
                {` · ${formatDateTime(report.createdAt)}`}
                {report.reviewedAt && ' · reviewed'}
              </p>
              {/* The reporter's own words, unedited and un-truncated. Whatever
                  made this worth filing is in the sentence, not in a summary. */}
              <p className="mt-1 whitespace-pre-wrap text-content">{report.reason}</p>
            </div>
          ))}

          {reports && reports.some((report) => !report.reviewedAt) && (
            <Button
              size="sm"
              variant="ghost"
              onClick={async () => {
                try {
                  await adminApi.reviewReports(userId);
                  setReports((current) =>
                    current?.map((report) => ({
                      ...report,
                      reviewedAt: report.reviewedAt ?? new Date().toISOString(),
                    })) ?? null,
                  );
                  toast.success('Marked as read.');
                } catch (error) {
                  toast.error(errorMessage(error, 'Could not mark those as read.'));
                }
              }}
            >
              <CheckCircle2 className="h-3 w-3" />
              Mark as read
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

const AdminPage = () => {
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [token, setToken] = useState<string | null>(() => adminTokenStore.get());
  const [password, setPassword] = useState('');
  const [isSigningIn, setIsSigningIn] = useState(false);

  const [query, setQuery] = useState('');
  const [bannedOnly, setBannedOnly] = useState(false);
  /** Null is "every plan", which is what the console opens on. */
  const [planFilter, setPlanFilter] = useState<Plan | null>(null);
  const [rows, setRows] = useState<AdminUserRow[] | null>(null);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  /*
   * Where in the directory we are, and how big it is.
   *
   * `page` is one-based because it is the number a person reads. `total` and
   * `pageCount` come back from the API beside the rows rather than being
   * guessed from the row count: twenty-five rows could equally be the whole
   * directory or the first page of two hundred, and there is no way to tell
   * those apart from the array alone. See `AdminUserPage`.
   */
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pageCount, setPageCount] = useState(1);

  const [target, setTarget] = useState<AdminUserRow | null>(null);
  const [reason, setReason] = useState('');
  const [days, setDays] = useState<number | null>(7);
  const [isBanning, setIsBanning] = useState(false);

  /*
   * The plan sheet, kept entirely separate from the suspension sheet above.
   *
   * They are two dialogs on the same list and there was a real temptation to
   * share one `target`. They must not: closing one would close the other, and
   * more to the point they are opposite kinds of act — one takes a product away
   * from somebody and the other gives them more of it. A shared piece of state
   * is how a mis-click ends up on the wrong sheet.
   */
  const [planTarget, setPlanTarget] = useState<AdminUserRow | null>(null);
  const [nextPlan, setNextPlan] = useState<Plan>('STARTUP');
  const [planNote, setPlanNote] = useState('');
  const [isSavingPlan, setIsSavingPlan] = useState(false);

  /*
   * Whether the deployment has a console at all, asked once and unauthenticated.
   *
   * A failed probe is deliberately *not* read as "no console". It used to be,
   * and the result was a page that told an administrator their password was
   * never set whenever the API was asleep, offline, or refusing the request for
   * any other reason — the most confusing possible answer, because it names a
   * cause the reader then goes and checks and finds correct.
   *
   * Only the 503 the API raises for a missing `ADMIN_PASSWORD` means that.
   * Anything else is a failure to *ask*, so the password form is shown and the
   * attempt is allowed to produce a real error of its own.
   */
  useEffect(() => {
    adminApi
      .status()
      .then((result) => setIsAvailable(result.enabled))
      .catch((error) => {
        const status = (error as { response?: { status?: number } })?.response?.status;
        setIsAvailable(status === 503 ? false : true);
      });
  }, []);

  /**
   * Re-read the directory.
   *
   * Also the place the session's expiry is noticed: a 401 anywhere in here
   * means the half hour is up, so the token is dropped and the password form
   * comes back rather than leaving an empty table and no explanation.
   */
  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      const [directory, counts] = await Promise.all([
        adminApi.users(query.trim(), bannedOnly, planFilter ?? undefined, page),
        adminApi.stats(),
      ]);
      setRows(directory.rows);
      setTotal(directory.total);
      setPageCount(directory.pageCount);
      /*
       * The API's answer wins over the request.
       *
       * It clamps a page number past the end rather than refusing it, so
       * asking for page 9 of a 3-page directory comes back as page 3 with its
       * rows. Writing that back is what keeps the control and the list
       * agreeing — without it the footer would say "9 of 3" over page 3's
       * contents, and "next" would do nothing forever.
       */
      if (directory.page !== page) setPage(directory.page);
      setStats(counts);
    } catch (error) {
      const status = (error as { response?: { status?: number } })?.response?.status;
      if (status === 401) {
        adminTokenStore.clear();
        setToken(null);
        toast.error('Admin session expired. Sign in again.');
      } else {
        toast.error(errorMessage(error, 'Could not load the directory.'));
      }
    } finally {
      setIsLoading(false);
    }
  }, [bannedOnly, page, planFilter, query]);

  /*
   * Re-runs when a *toggle* changes, and not when the search box is typed in.
   *
   * `refresh` is rebuilt whenever `query` changes, so listing it here would
   * fire a request per keystroke against a console that returns twenty-five
   * accounts. The two filters are pressed rather than typed, so they search
   * immediately; the text field waits for the button or for Enter.
   */
  useEffect(() => {
    if (!token) return;
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, bannedOnly, planFilter, page]);

  /*
   * Changing a filter returns to the first page.
   *
   * Without this, narrowing a three-page directory to one page while standing
   * on page 3 asks the API for a page that no longer exists — which it clamps,
   * so the reader silently lands somewhere they did not choose. Going back to
   * the top is the only answer that is the same every time.
   *
   * It runs *before* the fetch above on the same change, because setting state
   * in an effect re-renders before the browser paints; the request that goes
   * out is the one for page 1.
   */
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    setPage(1);
  }, [bannedOnly, planFilter]);

  const handleSignIn = async () => {
    setIsSigningIn(true);
    try {
      const session = await adminApi.signIn(password);
      setPassword('');
      setToken(session.token);
    } catch (error) {
      toast.error(errorMessage(error, 'Could not sign in.'));
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleBan = async () => {
    if (!target || reason.trim().length < MIN_REASON) return;

    setIsBanning(true);
    try {
      const result = await adminApi.ban(target.id, { reason: reason.trim(), days });
      toast.success(`${target.displayName} suspended`, {
        description: `A notice was emailed to ${result.emailed}.`,
      });
      setTarget(null);
      setReason('');
      await refresh();
    } catch (error) {
      toast.error(errorMessage(error, 'Could not suspend that account.'));
    } finally {
      setIsBanning(false);
    }
  };

  /**
   * Put an account on a plan by hand.
   *
   * The toast says what did *not* happen as well as what did, and that is the
   * important half: this writes an entitlement and never touches Stripe, so an
   * administrator moving a paying customer to Free has stopped their ceilings
   * and not their billing. Saying so at the moment of the change is the only
   * place that fact reliably lands.
   */
  const handleSetPlan = async () => {
    if (!planTarget) return;

    setIsSavingPlan(true);
    try {
      await adminApi.setPlan(planTarget.id, {
        plan: nextPlan,
        note: planNote.trim() || undefined,
      });

      toast.success(`${planTarget.displayName} is now on ${planLabel(nextPlan)}`, {
        description: planTarget.subscription
          ? 'Their Stripe subscription was NOT changed — do that in the Stripe dashboard if you meant to.'
          : 'They were emailed about the change.',
      });

      setPlanTarget(null);
      setPlanNote('');
      await refresh();
    } catch (error) {
      toast.error(errorMessage(error, 'Could not change that plan.'));
    } finally {
      setIsSavingPlan(false);
    }
  };

  const handleUnban = async (user: AdminUserRow) => {
    try {
      await adminApi.unban(user.id);
      toast.success(`${user.displayName} restored`);
      await refresh();
    } catch (error) {
      toast.error(errorMessage(error, 'Could not lift that suspension.'));
    }
  };

  const canBan = reason.trim().length >= MIN_REASON;

  const shell = useMemo(
    () =>
      cn(
        'min-h-dvh bg-surface px-5 pb-10 sm:px-8',
        /*
         * A deep top gutter, and it is not symmetry for its own sake.
         *
         * This page renders outside `AppLayout`, so it has none of the shell's
         * chrome above it — no top bar, no reveal strip, nothing. `py-10` put
         * the "Admin console" eyebrow about forty pixels under the browser's
         * own toolbar, which on a maximised window reads as the page having
         * been cut off rather than as a page that starts there. The extra
         * breathing room is what tells a reader this is the top.
         */
        'pt-16 sm:pt-20',
        // Flat, and deliberately not skinned. See the component note.
        'safe-t safe-b safe-l safe-r',
      ),
    [],
  );

  // ---- The deployment has no console --------------------------------------
  if (isAvailable === false) {
    return (
      <div className={shell}>
        <div className="mx-auto max-w-md">
          <EmptyState
            icon={<ShieldAlert className="h-6 w-6" />}
            title="No admin console on this deployment"
            description="ADMIN_PASSWORD is not set on the API, so there is nothing to sign in to. That is the default."
            action={
              <Link to="/" className="text-xs font-medium text-brand hover:underline">
                Back to Task Studio
              </Link>
            }
          />
        </div>
      </div>
    );
  }

  // ---- The password gate ---------------------------------------------------
  if (!token) {
    return (
      <div className={cn(shell, 'grid place-items-center')}>
        <form
          className="panel w-full max-w-sm space-y-4 p-6"
          onSubmit={(event) => {
            event.preventDefault();
            void handleSignIn();
          }}
        >
          <div className="space-y-1.5">
            <span className="inline-grid h-10 w-10 place-items-center rounded-xl bg-danger/12 text-danger ring-1 ring-inset ring-danger/25">
              <Lock className="h-5 w-5" />
            </span>
            <h1 className="pt-1 text-lg font-bold tracking-tight">Task Studio admin</h1>
            <p className="text-xs leading-relaxed text-content-muted">
              Moderation only. Everything done here is logged on the API and emailed to
              the account it affects.
            </p>
          </div>

          <PasswordInput
            label="Master password"
            name="admin-password"
            autoComplete="off"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value.slice(0, 256))}
            placeholder="••••••••••••••••"
          />

          <Button type="submit" className="w-full" isLoading={isSigningIn} disabled={!password}>
            Unlock
          </Button>

          <p className="text-center text-3xs leading-relaxed text-content-faint">
            Five wrong answers locks this console for fifteen minutes.
          </p>
        </form>
      </div>
    );
  }

  // ---- The console ---------------------------------------------------------
  return (
    <div className={shell}>
      <div className="mx-auto max-w-3xl space-y-5">
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-3xs uppercase tracking-[0.18em] text-danger">
              <ShieldCheck className="h-3 w-3" />
              Admin console
            </p>
            <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Accounts</h1>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 text-xs text-content-muted hover:text-brand"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Task Studio
            </Link>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                adminTokenStore.clear();
                setToken(null);
                setRows(null);
              }}
            >
              Lock
            </Button>
          </div>
        </header>

        {stats && (
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-5">
            {[
              { label: 'Accounts', value: stats.users, icon: <Users className="h-3 w-3" /> },
              { label: 'Suspended', value: stats.banned, icon: <Ban className="h-3 w-3" /> },
              {
                label: 'Unconfirmed',
                value: stats.unverified,
                icon: <ShieldAlert className="h-3 w-3" />,
              },
              /*
                Accounts with something unread against them.
                
                Counting *people* rather than reports, because six colleagues
                reporting one person is one thing to look at. See `AdminStats`.
              */
              { label: 'Reported', value: stats.reported, icon: <Flag className="h-3 w-3" /> },
              /*
                Accounts on a paid plan, comped ones included.

                Not "revenue" and not "subscribers" — both are questions Stripe
                answers better, and this console has no business guessing at
                either. What it counts is what it can enforce: how many accounts
                are working inside raised ceilings. See `AdminStats.paid`.
              */
              {
                label: 'On a paid plan',
                value: stats.paid,
                icon: <Sparkles className="h-3 w-3" />,
              },
            ].map((tile) => (
              <div key={tile.label} className="ui-card rounded-xl border border-edge bg-surface-raised p-3">
                <p className="flex items-center gap-1.5 text-3xs uppercase tracking-[0.14em] text-content-faint">
                  {tile.icon}
                  {tile.label}
                </p>
                <p className="mt-0.5 text-xl font-semibold tabular-nums">{tile.value}</p>
              </div>
            ))}
          </div>
        )}

        <form
          className="flex flex-wrap items-end gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            void refresh();
          }}
        >
          <Input
            label="Search"
            name="q"
            value={query}
            onChange={(event) => setQuery(event.target.value.slice(0, 120))}
            placeholder="Name or email address"
            className="min-w-[14rem] flex-1"
          />
          <Button type="submit" variant="secondary" isLoading={isLoading}>
            <Search className="h-3.5 w-3.5" />
            Search
          </Button>
          <Button
            type="button"
            variant={bannedOnly ? 'primary' : 'ghost'}
            onClick={() => setBannedOnly((only) => !only)}
            aria-pressed={bannedOnly}
          >
            <Ban className="h-3.5 w-3.5" />
            Suspended only
          </Button>
        </form>

        {/* --- The plan filter ------------------------------------------------

            A row of its own under the search rather than a fourth control in
            it. Four buttons plus a text field plus two toggles on one line
            wraps into an unreadable block on anything narrower than a laptop,
            and these three are a *set* — exactly one is active — which is a
            different shape from the two independent toggles above.

            "All" is a real option rather than "none selected", because a filter
            you can only turn on is one somebody has to reload the page to
            escape. */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-3xs uppercase tracking-[0.14em] text-content-faint">
            Plan
          </span>
          {[{ value: null, label: 'All', tone: 'border-edge text-content-muted' }, ...PLANS].map(
            (option) => (
              <button
                key={option.label}
                type="button"
                onClick={() => setPlanFilter(option.value as Plan | null)}
                aria-pressed={planFilter === option.value}
                className={cn(
                  'rounded-lg border px-2.5 py-1 text-2xs font-medium transition-colors',
                  planFilter === option.value
                    ? option.tone
                    : 'border-edge text-content-faint hover:text-content-muted',
                )}
              >
                {option.label}
              </button>
            ),
          )}
        </div>

        {isLoading && !rows && (
          <div className="space-y-2">
            {Array.from({ length: 5 }, (_, index) => (
              <Skeleton key={index} className="h-16" />
            ))}
          </div>
        )}

        {rows?.length === 0 && (
          <EmptyState
            icon={<Search className="h-6 w-6" />}
            title="Nobody matches that"
            description="Search by any part of a display name or an email address."
          />
        )}

        <ul className="space-y-2">
          {rows?.map((user) => (
            <li
              key={user.id}
              className={cn(
                'ui-card flex flex-wrap items-center gap-3 rounded-xl border p-3',
                user.ban ? 'border-danger/40 bg-danger/[0.04]' : 'border-edge bg-surface-raised',
              )}
            >
              <Avatar name={user.displayName} src={user.avatarUrl} size="md" />

              <div className="min-w-0 flex-1 leading-tight">
                <p className="flex flex-wrap items-center gap-1.5">
                  <span className="truncate text-sm font-semibold">{user.displayName}</span>
                  {user.isVerified ? (
                    <CheckCircle2 className="h-3 w-3 shrink-0 text-positive" aria-label="Confirmed" />
                  ) : (
                    <span className="shrink-0 rounded bg-warning/15 px-1 py-px text-4xs font-semibold uppercase text-warning">
                      unconfirmed
                    </span>
                  )}

                  {/*
                    The plan, and — when it is not the default — who decided.

                    Free draws no badge at all. It is the majority of every
                    directory and a chip on every row would be noise that makes
                    the two that matter harder to see.

                    `granted` and `paid` are drawn apart because they are
                    genuinely different situations: one is a decision somebody
                    here made and can undo, the other is a card being charged
                    that this console cannot stop. An administrator about to
                    change a plan needs to know which one they are looking at
                    before they open the sheet, not after.
                  */}
                  {user.plan !== 'FREE' && (
                    <span
                      title={
                        user.planNote ??
                        (user.planSource === 'ADMIN' ? 'Granted by an administrator' : undefined)
                      }
                      className={cn(
                        'shrink-0 rounded border px-1.5 py-px text-4xs font-semibold uppercase',
                        PLANS.find((entry) => entry.value === user.plan)?.tone,
                      )}
                    >
                      {planLabel(user.plan)}
                      {user.planSource === 'ADMIN' && ' · granted'}
                    </span>
                  )}

                  {user.subscription?.status === 'PAST_DUE' && (
                    <span className="shrink-0 rounded bg-warning/15 px-1 py-px text-4xs font-semibold uppercase text-warning">
                      payment failed
                    </span>
                  )}
                </p>
                <p className="truncate text-2xs text-content-muted">{user.email}</p>
                <p className="mt-0.5 text-3xs text-content-faint">
                  Joined {formatDateTime(user.createdAt)}
                  {user.lastLoginAt && ` · last seen ${formatRelative(user.lastLoginAt)}`}
                  {user.banCount > 0 && ` · ${user.banCount} suspension(s) on record`}
                </p>

                {/*
                  Reports, and the reasons one click away.

                  The count is what decides whether somebody opens an account
                  at all; the *reasons* are what they decide on. Four reports
                  that all describe the same incident are one incident seen by
                  four people, and four that describe four different things are
                  a pattern — no aggregate can tell those apart, so the sheet
                  has to be able to show the words.
                */}
                {user.reportCount > 0 && (
                  <ReportSheet userId={user.id} count={user.reportCount} />
                )}

                {user.ban && (
                  <p className="mt-1.5 rounded-lg bg-danger/10 px-2 py-1.5 text-3xs leading-relaxed text-danger">
                    <strong>
                      Suspended
                      {user.ban.expiresAt
                        ? ` until ${formatDateTime(user.ban.expiresAt)}`
                        : ' permanently'}
                    </strong>
                    <br />
                    {user.ban.reason}
                  </p>
                )}
              </div>

              <div className="flex shrink-0 items-center gap-1.5">
                {/*
                  Plan first, suspension second, and the order is not arbitrary.

                  The destructive control belongs at the end of the row — it is
                  the one a slipped click must not land on, and putting the
                  benign action between it and the rest of the row is a cheap
                  way to buy that distance.
                */}
                <Button
                  size="sm"
                  variant="ghost"
                  title="Change this account's plan"
                  onClick={() => {
                    setPlanTarget(user);
                    // Opens on what they already have, so the sheet describes
                    // the current state before it describes a change.
                    setNextPlan(user.plan);
                    setPlanNote(user.planNote ?? '');
                  }}
                >
                  <CreditCard className="h-3.5 w-3.5" />
                  Plan
                </Button>

                {user.ban ? (
                  <Button size="sm" variant="secondary" onClick={() => void handleUnban(user)}>
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Restore
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => {
                      setTarget(user);
                      setReason('');
                      setDays(7);
                    }}
                  >
                    <Ban className="h-3.5 w-3.5" />
                    Suspend
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>

        {/*
          The pager.

          ## Why it is drawn even on a single page

          Because its other job is saying *how many accounts there are*, and
          that number is worth having whether or not it spills onto a second
          page. A footer that appeared only past twenty-five rows would also be
          a control that moves the page under somebody the moment a search
          crosses the threshold.

          The two buttons are hidden — not disabled-and-drawn — on a
          single-page directory, because a pair of permanently dead arrows is
          chrome that teaches a reader to ignore that corner of the screen.

          ## Why it does not draw a numbered page list

          Twenty-five to a page over a directory that is realistically hundreds
          of accounts means a numbered strip is either truncated with ellipses
          or longer than the rows above it. Previous/next plus "page N of M" is
          the whole of what an administrator working through a filtered list
          needs, and it costs one line.
        */}
        {rows !== null && (
          <footer className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <p className="text-2xs text-content-faint">
              {total === 0
                ? 'No accounts'
                : `${total} account${total === 1 ? '' : 's'}`}
              {pageCount > 1 && ` · page ${page} of ${pageCount}`}
            </p>

            {pageCount > 1 && (
              <div className="flex items-center gap-1.5">
                <Button
                  variant="secondary"
                  size="sm"
                  /*
                    Guarded on `isLoading` as well as on the bound, because the
                    request for the next page is in flight for a moment during
                    which the button is still pressable — and two presses would
                    skip a page and land on a number the list never showed.
                  */
                  disabled={page <= 1 || isLoading}
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  Previous
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={page >= pageCount || isLoading}
                  onClick={() => setPage((current) => Math.min(pageCount, current + 1))}
                >
                  Next
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
          </footer>
        )}
      </div>

      {/* --- The suspension sheet -------------------------------------------- */}
      <Modal
        isOpen={target !== null}
        onClose={() => setTarget(null)}
        title={`Suspend ${target?.displayName ?? ''}`}
        description="They are emailed this reason, verbatim, and lose access immediately."
        footer={
          <>
            <Button variant="ghost" onClick={() => setTarget(null)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={() => void handleBan()} isLoading={isBanning} disabled={!canBan}>
              <Ban className="h-3.5 w-3.5" />
              {days === null ? 'Suspend permanently' : `Suspend for ${days} day(s)`}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <p className="text-xs font-medium">How long</p>
            <div className="flex flex-wrap gap-1.5">
              {DURATIONS.map((duration) => (
                <button
                  key={duration.label}
                  type="button"
                  onClick={() => setDays(duration.days)}
                  className={cn(
                    'rounded-lg border px-2.5 py-1.5 text-xs transition-colors',
                    days === duration.days
                      ? 'border-danger bg-danger/12 text-danger'
                      : 'border-edge text-content-muted hover:border-danger/40',
                  )}
                >
                  {duration.label}
                </button>
              ))}
            </div>
          </div>

          <Textarea
            label="Reason"
            name="reason"
            value={reason}
            onChange={(event) => setReason(event.target.value.slice(0, 1000))}
            placeholder="What they did, in a sentence they will read in an email."
            maxLength={1000}
          />

          <p className="text-2xs leading-relaxed text-content-faint">
            Nothing is deleted. Their projects, tasks and documents stay exactly as they
            are, and their colleagues keep everything they contributed — a suspension
            takes away access, not work.
          </p>
        </div>
      </Modal>

      {/* --- The plan sheet ---------------------------------------------------

          Its own dialog rather than a dropdown on the row, and the reason is
          what a plan change actually is: it raises or lowers every ceiling on
          every project that account owns, for everybody working in them. That
          is not a one-click act, and a menu that changed it on selection would
          make it one.

          What it deliberately does not do is touch Stripe. The paragraph at the
          bottom says so, because the failure it prevents is an administrator
          moving a paying customer to Free, assuming the card stopped, and
          finding out a month later that it did not. */}
      <Modal
        isOpen={planTarget !== null}
        onClose={() => setPlanTarget(null)}
        title={`Change ${planTarget?.displayName ?? ''}'s plan`}
        description="This changes what their account is allowed to hold. It does not charge, refund or cancel anything."
        footer={
          <>
            <Button variant="ghost" onClick={() => setPlanTarget(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => void handleSetPlan()}
              isLoading={isSavingPlan}
              disabled={planTarget?.plan === nextPlan}
            >
              <CreditCard className="h-3.5 w-3.5" />
              {planTarget?.plan === nextPlan
                ? `Already on ${planLabel(nextPlan)}`
                : `Move to ${planLabel(nextPlan)}`}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <p className="text-xs font-medium">Plan</p>
            <div className="flex flex-wrap gap-1.5">
              {PLANS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setNextPlan(option.value)}
                  className={cn(
                    'rounded-lg border px-2.5 py-1.5 text-xs transition-colors',
                    nextPlan === option.value
                      ? option.tone
                      : 'border-edge text-content-muted hover:border-brand/40',
                  )}
                >
                  {option.label}
                  {planTarget?.plan === option.value && ' · current'}
                </button>
              ))}
            </div>
          </div>

          {/*
            The note is for anything but Free, because Free is not a grant.

            Moving somebody to Free releases the account back to Stripe — there
            is no standing decision left to explain, and a note attached to one
            would outlive the thing it described.
          */}
          {nextPlan !== 'FREE' && (
            <Textarea
              label="Why (optional)"
              name="planNote"
              value={planNote}
              onChange={(event) => setPlanNote(event.target.value.slice(0, 280))}
              placeholder="Partner account, support gesture, migrated from the old pricing…"
              maxLength={280}
              hint="Kept on the account so whoever reads this console next knows why."
            />
          )}

          <div className="space-y-2 text-2xs leading-relaxed text-content-faint">
            {nextPlan === 'FREE' ? (
              <p>
                Setting an account back to <strong>Free</strong> hands it back to Stripe:
                the next webhook about a live subscription will grant whatever is
                actually being paid for. That is what makes a grant reversible.
              </p>
            ) : (
              <p>
                A granted plan is pinned to the account and <strong>survives Stripe</strong>
                {' '}— no webhook can demote it, and the person cannot buy a plan over the
                top of it while it stands.
              </p>
            )}

            {planTarget?.subscription && (
              <p className="rounded-lg bg-warning/10 px-2 py-1.5 text-warning">
                <strong>This account has a Stripe subscription.</strong> Changing the plan
                here does not cancel it, and does not issue a refund. If you meant to stop
                the billing as well, do that in the Stripe dashboard.
              </p>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default AdminPage;
