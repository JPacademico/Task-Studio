import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Mail, Search, UserPlus } from 'lucide-react';

import { userApi } from '@/entities/user/api/user.api';
import type { UserSummary } from '@/entities/user/model/types';
import { TEXT_LIMITS } from '@/shared/config/constants';
import { clampText } from '@/shared/lib/text';
import { Avatar, Button, Spinner } from '@/shared/ui';
import { useT } from '@/shared/i18n';

/** Somebody to invite: a picked account, or an address typed in full. */
export type InviteTarget = { userId: string; label: string } | { email: string; label: string };

interface PersonSearchProps {
  /** Resets the query on every open; nothing is fetched while closed. */
  isOpen: boolean;
  onInvite: (target: InviteTarget) => void;
  /** Already on the roster: never offered. */
  excludeIds?: ReadonlySet<string>;
  /** Invited and not yet answered: shown, but not offered again. */
  pendingIds?: ReadonlySet<string>;
  /** Which row's invitation is in flight, by user id or email. */
  pendingTarget?: string | null;
  autoFocus?: boolean;
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Wraps the matched part of `text` so a typed fragment is visible in every result. */
const highlight = (text: string, needle: string): ReactNode => {
  const at = needle ? text.toLowerCase().indexOf(needle.toLowerCase()) : -1;
  if (at < 0) return text;
  return (
    <>
      {text.slice(0, at)}
      <mark className="rounded-sm bg-brand/15 px-px text-inherit">
        {text.slice(at, at + needle.length)}
      </mark>
      {text.slice(at + needle.length)}
    </>
  );
};

/**
 * Type a name or an email and pick from what comes back. Colleagues match on part of their email;
 * anyone else on their name or the full address, which is the API's privacy rule.
 */
export const PersonSearch = ({
  isOpen,
  onInvite,
  excludeIds,
  pendingIds,
  pendingTarget = null,
  autoFocus = true,
}: PersonSearchProps) => {
  const t = useT();
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setQuery('');
    setDebounced('');
  }, [isOpen]);

  // Debounced so typing an address does not fire a request per keystroke.
  useEffect(() => {
    const timeout = setTimeout(() => setDebounced(query.trim()), 250);
    return () => clearTimeout(timeout);
  }, [query]);

  const { data: found = [], isFetching } = useQuery({
    queryKey: ['users', 'search', debounced],
    queryFn: () => userApi.search(debounced, 8),
    enabled: isOpen && debounced.length >= 2,
    staleTime: 30_000,
  });

  const candidates = useMemo(
    () => found.filter((person: UserSummary) => !excludeIds?.has(person.id)),
    [excludeIds, found],
  );

  const typed = query.trim().toLowerCase();
  const isEmail = EMAIL.test(typed);
  // An exact address comes back unmasked, so a typed one that matched shows as its row instead.
  const typedIsListed = found.some((person) => person.email.toLowerCase() === typed);
  const isSettled = debounced === query.trim();

  return (
    <div className="space-y-2">
      <label className="block space-y-1.5">
        <span className="text-xs font-medium text-content-muted">{t('invite.findPerson')}</span>
        <span className="relative block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-content-faint" />
          <input
            value={query}
            onChange={(event) => setQuery(clampText(event.target.value, TEXT_LIMITS.search))}
            placeholder={t('invite.findPersonPlaceholder')}
            maxLength={TEXT_LIMITS.search}
            autoFocus={autoFocus}
            autoComplete="off"
            spellCheck={false}
            aria-describedby="person-search-results"
            className="field h-10 w-full pl-8 pr-9 text-sm"
          />
          {isFetching && (
            <Spinner className="absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2" />
          )}
        </span>
      </label>

      {typed.length < 2 ? (
        <p className="px-1 text-3xs leading-relaxed text-content-faint">
          {t('invite.findPersonHint')}
        </p>
      ) : (
        <ul id="person-search-results" aria-live="polite" className="space-y-1.5">
          {candidates.map((person) => {
            const isPending = pendingIds?.has(person.id) ?? false;
            const isBusy = pendingTarget === person.id;

            return (
              <li
                key={person.id}
                className="flex items-center gap-3 rounded-xl border border-edge px-3 py-2"
              >
                <Avatar name={person.displayName} src={person.avatarUrl} size="xs" />
                <span className="min-w-0 flex-1 leading-tight">
                  <span className="block truncate text-xs font-medium">
                    {highlight(person.displayName, typed)}
                  </span>
                  <span className="block truncate text-2xs text-content-faint">
                    {highlight(person.email, typed)}
                  </span>
                </span>
                {isPending ? (
                  <span className="shrink-0 text-3xs uppercase tracking-wide text-content-faint">
                    {t('invite.alreadyInvited')}
                  </span>
                ) : (
                  <Button
                    size="sm"
                    isLoading={isBusy}
                    disabled={Boolean(pendingTarget) && !isBusy}
                    onClick={() => onInvite({ userId: person.id, label: person.displayName })}
                  >
                    <UserPlus className="h-3.5 w-3.5" />
                    {t('roster.invite')}
                  </Button>
                )}
              </li>
            );
          })}

          {isEmail && !typedIsListed && isSettled && !isFetching && (
            <li className="flex items-center gap-3 rounded-xl border border-dashed border-edge px-3 py-2">
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-surface-sunken">
                <Mail className="h-3 w-3 text-content-faint" />
              </span>
              <span className="min-w-0 flex-1 truncate text-xs">{query.trim()}</span>
              <Button
                size="sm"
                variant="secondary"
                isLoading={pendingTarget === typed}
                disabled={Boolean(pendingTarget) && pendingTarget !== typed}
                onClick={() => onInvite({ email: typed, label: query.trim() })}
              >
                {t('invite.byEmail')}
              </Button>
            </li>
          )}

          {candidates.length === 0 && !isEmail && isSettled && !isFetching && (
            <li className="px-1 py-2 text-center text-2xs text-content-faint">
              {t('invite.noPersonMatch')}
            </li>
          )}
        </ul>
      )}
    </div>
  );
};

/** Whether a target names this row, for the in-flight spinner. */
export const targetKey = (target: InviteTarget): string =>
  'userId' in target ? target.userId : target.email;

/** The API payload half of a target. */
export const targetPayload = (target: InviteTarget): { userId: string } | { email: string } =>
  'userId' in target ? { userId: target.userId } : { email: target.email };
