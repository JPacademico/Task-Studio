import type { UserSummary } from '@/entities/user/model/types';

/**
 * Everything about turning `@` into a person, and back again.
 *
 * ## The shape of a mention
 *
 * A mention is stored as the plain text somebody typed — `@Ana Ribeiro`, space
 * and all — and *not* as a token like `<@uuid>`. That decision is the one every
 * function here follows from, so it is worth the paragraph:
 *
 *   - It is what the reader sees, so it is what they get when they copy the
 *     line, quote it in an email, or read it in a notification body. A token
 *     would mean every one of those surfaces needs a renderer, and the ones
 *     outside our control — the browser's own notification, a screen reader
 *     reading the raw value — would show the token.
 *   - The message is still a sentence. Nothing downstream has to understand a
 *     markup dialect to search it, excerpt it, or show it somewhere new.
 *
 * What that costs is ambiguity: `@Ana Ribeiro` does not say *which* Ana, and it
 * stops matching if she renames herself. Both are paid for once, at send time,
 * by carrying the ids the picker resolved alongside the text — see the
 * `mentions` column on the API. This module handles the text half.
 *
 * ## Why names are matched against the roster and not by pattern
 *
 * There is no pattern that finds `@Ana Ribeiro` and not `@Ana` in
 * `@Ana Ribeiro`, because a display name may contain spaces and a sentence may
 * continue after one. So highlighting does not guess: it is handed the people
 * who are actually in this project and looks for exactly their names, longest
 * first. A stray `@everyone`, an email address, a price in `@ 4.99` — none of
 * them match anybody, so none of them light up.
 */

/** Past this, whatever is after the `@` is prose, not somebody's name. */
const MAX_QUERY = 40;

export interface MentionQuery {
  /** Index of the `@` itself. */
  start: number;
  /** What has been typed after it, which may be empty and may contain spaces. */
  query: string;
}

/**
 * The mention being typed at the caret, if there is one.
 *
 * Returns `null` far more often than not, and every `null` is a deliberate
 * refusal rather than a failure:
 *
 *   - no `@` behind the caret, or none close enough to still be a name;
 *   - an `@` that is not at a word boundary, which is what an email address
 *     looks like — `ana@empresa.com` must never open a picker;
 *   - a newline between the `@` and the caret, which ends any name.
 */
export const mentionQueryAt = (text: string, caret: number): MentionQuery | null => {
  const before = text.slice(0, caret);
  const start = before.lastIndexOf('@');
  if (start === -1) return null;

  // `ana@empresa.com`: an `@` with a word character in front of it is part of
  // something else. Only the start of the line or whitespace opens a mention.
  const preceding = start > 0 ? before[start - 1] : ' ';
  if (!/\s/.test(preceding)) return null;

  const query = before.slice(start + 1);
  if (query.length > MAX_QUERY || query.includes('\n')) return null;

  return { start, query };
};

/**
 * The roster members a half-typed name could still be referring to.
 *
 * Ranked so the most likely answer is first and can be taken with Enter alone:
 * a name that *starts* with what was typed beats one that merely contains it,
 * and ties are broken alphabetically so the order is stable between keystrokes.
 * A list that reorders itself as you type is a list you cannot aim at.
 *
 * An empty query matches everybody, because typing `@` on its own is a request
 * to see who is here.
 */
export const matchMembers = <T extends UserSummary>(
  members: readonly T[],
  query: string,
  limit = 6,
): T[] => {
  const needle = query.trim().toLowerCase();

  const scored = members
    .map((member) => {
      const name = member.displayName.toLowerCase();
      if (!needle) return { member, rank: 1 };
      if (name.startsWith(needle)) return { member, rank: 0 };
      if (name.includes(needle)) return { member, rank: 1 };
      return null;
    })
    .filter((entry): entry is { member: T; rank: number } => entry !== null);

  scored.sort(
    (a, b) =>
      a.rank - b.rank || a.member.displayName.localeCompare(b.member.displayName),
  );

  return scored.slice(0, limit).map((entry) => entry.member);
};

/**
 * Whether the thing at the caret is a *finished* mention rather than one being
 * typed.
 *
 * ## The problem this exists for
 *
 * The inserted mention carries a trailing space — see `applyMention` — and that
 * space was supposed to end the query. It does not, because a display name can
 * contain spaces: `@Clara Nunes ` is still a perfectly good prefix search, it
 * still matches Clara Nunes, and so the picker stayed open on the name it had
 * just inserted, offering to insert it again.
 *
 * ## Why an exact match and not "the query has a space in it"
 *
 * Because half the roster has a space in their name. `@Ana ` has to keep the
 * picker open — somebody is part-way through "Ana Ribeiro" — while
 * `@Ana Ribeiro ` has to close it. The only thing that separates those two is
 * whether what has been typed *is* somebody's whole name, so that is what is
 * asked.
 *
 * It also behaves correctly on the awkward case of a roster holding both "Ana"
 * and "Ana Ribeiro": `@Ana ` closes the picker, because Ana is a complete and
 * valid answer — and typing one more character reopens it on Ana Ribeiro,
 * because the query is no longer anybody's whole name.
 */
export const isMentionComplete = (
  query: string,
  members: readonly UserSummary[],
): boolean =>
  query.endsWith(' ') &&
  members.some((member) => member.displayName === query.slice(0, -1));

/**
 * Puts the chosen name into the draft, and says where the caret goes.
 *
 * The trailing space is there so the next word does not run into the name, and
 * it is *not* what closes the picker — that is `isMentionComplete`, for the
 * reason its own note gives. This comment used to claim the space did both
 * jobs, which is how the picker ended up reopening on every name it inserted.
 */
export const applyMention = (
  text: string,
  { start, query }: MentionQuery,
  displayName: string,
): { text: string; caret: number } => {
  const inserted = `@${displayName} `;
  const after = text.slice(start + 1 + query.length);

  return {
    text: `${text.slice(0, start)}${inserted}${after}`,
    caret: start + inserted.length,
  };
};

/** Regex-safe: a display name is whatever somebody typed into their profile. */
const escape = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export interface MentionSegment {
  text: string;
  /** The member this segment names, or `null` for ordinary prose. */
  member: UserSummary | null;
}

/**
 * Splits a message into prose and mentions, ready to render.
 *
 * Longest name first, which is the whole correctness argument: with "Ana" and
 * "Ana Ribeiro" both on the roster, a shortest-first alternation would match
 * "Ana" inside "@Ana Ribeiro" and leave " Ribeiro" hanging outside the chip.
 * JavaScript alternation is first-match-wins, so ordering the pattern is the
 * fix rather than a special case.
 *
 * Returns a single prose segment when nothing matches, which is the common
 * case and costs one regex that finds nothing.
 */
export const splitMentions = (
  content: string,
  members: readonly UserSummary[],
): MentionSegment[] => {
  if (members.length === 0 || !content.includes('@')) {
    return [{ text: content, member: null }];
  }

  const byName = new Map<string, UserSummary>();
  for (const member of members) {
    // First writer wins, so a duplicated display name resolves to one person
    // consistently rather than to whichever copy the regex happened to reach.
    if (!byName.has(member.displayName)) byName.set(member.displayName, member);
  }

  const names = [...byName.keys()].sort((a, b) => b.length - a.length).map(escape);
  const pattern = new RegExp(`@(${names.join('|')})`, 'g');

  const segments: MentionSegment[] = [];
  let index = 0;

  for (const match of content.matchAll(pattern)) {
    const at = match.index;
    if (at > index) segments.push({ text: content.slice(index, at), member: null });

    segments.push({ text: match[0], member: byName.get(match[1]) ?? null });
    index = at + match[0].length;
  }

  if (index < content.length) segments.push({ text: content.slice(index), member: null });
  return segments;
};

/**
 * Which of the people picked while writing are still named in the final text.
 *
 * The picker records everybody chosen during a draft, and a draft gets edited:
 * names are backspaced away, a sentence is rewritten, a mention is replaced
 * with a different one. Sending the raw list of everything ever clicked would
 * notify people whose names are no longer in the message — which reads, to
 * them, as being summoned to a conversation that never mentions them.
 *
 * So the text is the authority and the picks are only how ids were learned.
 */
export const mentionedIds = (content: string, picked: readonly UserSummary[]): string[] => [
  ...new Set(
    picked
      .filter((member) => content.includes(`@${member.displayName}`))
      .map((member) => member.id),
  ),
];
