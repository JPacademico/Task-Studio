import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  Ban,
  CheckCircle2,
  Lock,
  Search,
  ShieldAlert,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';

import { adminApi, adminTokenStore } from '@/features/admin/api/admin.api';
import type { AdminStats, AdminUserRow } from '@/features/admin/model/types';
import { errorMessage } from '@/shared/api/client';
import { formatDateTime, formatRelative } from '@/shared/lib/dates';
import { cn } from '@/shared/lib/cn';
import { Avatar, Button, EmptyState, Input, Modal, Skeleton, Textarea } from '@/shared/ui';

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
const AdminPage = () => {
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [token, setToken] = useState<string | null>(() => adminTokenStore.get());
  const [password, setPassword] = useState('');
  const [isSigningIn, setIsSigningIn] = useState(false);

  const [query, setQuery] = useState('');
  const [bannedOnly, setBannedOnly] = useState(false);
  const [rows, setRows] = useState<AdminUserRow[] | null>(null);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const [target, setTarget] = useState<AdminUserRow | null>(null);
  const [reason, setReason] = useState('');
  const [days, setDays] = useState<number | null>(7);
  const [isBanning, setIsBanning] = useState(false);

  // Whether the deployment has a console at all, asked once and unauthenticated.
  useEffect(() => {
    adminApi
      .status()
      .then((result) => setIsAvailable(result.enabled))
      .catch(() => setIsAvailable(false));
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
      const [users, counts] = await Promise.all([
        adminApi.users(query.trim(), bannedOnly),
        adminApi.stats(),
      ]);
      setRows(users);
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
  }, [bannedOnly, query]);

  useEffect(() => {
    if (!token) return;
    void refresh();
  }, [token, bannedOnly, refresh]);

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
        'min-h-dvh bg-surface px-5 py-10 sm:px-8',
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

          <Input
            label="Master password"
            name="admin-password"
            type="password"
            autoComplete="off"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value.slice(0, 256))}
            placeholder="••••••••••••••••"
          />

          <Button type="submit" className="w-full" isLoading={isSigningIn} disabled={!password}>
            Unlock
          </Button>

          <p className="text-center text-[10px] leading-relaxed text-content-faint">
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
            <p className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] text-danger">
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
          <div className="grid grid-cols-3 gap-2.5">
            {[
              { label: 'Accounts', value: stats.users, icon: <Users className="h-3 w-3" /> },
              { label: 'Suspended', value: stats.banned, icon: <Ban className="h-3 w-3" /> },
              {
                label: 'Unconfirmed',
                value: stats.unverified,
                icon: <ShieldAlert className="h-3 w-3" />,
              },
            ].map((tile) => (
              <div key={tile.label} className="ui-card rounded-xl border border-edge bg-surface-raised p-3">
                <p className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.14em] text-content-faint">
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
                <p className="flex items-center gap-1.5">
                  <span className="truncate text-sm font-semibold">{user.displayName}</span>
                  {user.isVerified ? (
                    <CheckCircle2 className="h-3 w-3 shrink-0 text-positive" aria-label="Confirmed" />
                  ) : (
                    <span className="shrink-0 rounded bg-warning/15 px-1 py-px text-[9px] font-semibold uppercase text-warning">
                      unconfirmed
                    </span>
                  )}
                </p>
                <p className="truncate text-[11px] text-content-muted">{user.email}</p>
                <p className="mt-0.5 text-[10px] text-content-faint">
                  Joined {formatDateTime(user.createdAt)}
                  {user.lastLoginAt && ` · last seen ${formatRelative(user.lastLoginAt)}`}
                  {user.banCount > 0 && ` · ${user.banCount} suspension(s) on record`}
                </p>

                {user.ban && (
                  <p className="mt-1.5 rounded-lg bg-danger/10 px-2 py-1.5 text-[10px] leading-relaxed text-danger">
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
            </li>
          ))}
        </ul>
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

          <p className="text-[11px] leading-relaxed text-content-faint">
            Nothing is deleted. Their projects, tasks and documents stay exactly as they
            are, and their colleagues keep everything they contributed — a suspension
            takes away access, not work.
          </p>
        </div>
      </Modal>
    </div>
  );
};

export default AdminPage;
