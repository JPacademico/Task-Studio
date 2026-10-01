import type { UserSummary } from '@/entities/user/model/types';

/**
 * Everything about turning `@` into a person, and back again. A mention is stored as the plain text
 * somebody typed — `@Ana Ribeiro`, space and all — and *not* as a token like `<@uuid>`.
 */

/** Past this, whatever is after the `@` is prose, not somebody's name. */
const MAX_QUERY = 40;

export interface MentionQuery {
  /** Index of the `@` itself. */
  start: number;
  /** What has been typed after it, which may be empty and may contain spaces. */
  query: string;
}

/** The mention being typed at the caret, if there is one. */
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
 * The roster members a half-typed name could still be referring to. Ranked so the most likely
 * answer is first and can be taken with Enter alone.
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
 * Whether the thing at the caret is a *finished* mention rather than one being typed. The inserted
 * mention carries a trailing space — see `applyMention`.
 */
export const isMentionComplete = (
  query: string,
  members: readonly UserSummary[],
): boolean =>
  query.endsWith(' ') &&
  members.some((member) => member.displayName === query.slice(0, -1));

/**
 * Puts the chosen name into the draft, and says where the caret goes. The trailing space is there
 * so the next word does not run into the name, and it is *not* what closes the picker.
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
 * Splits a message into prose and mentions, ready to render. Longest name first, which is the whole
 * correctness argument: with "Ana" and "Ana Ribeiro" both on the roster.
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
 * Which of the people picked while writing are still named in the final text. The picker records
 * everybody chosen during a draft, and a draft gets edited: names are backspaced away.
 */
export const mentionedIds = (content: string, picked: readonly UserSummary[]): string[] => [
  ...new Set(
    picked
      .filter((member) => content.includes(`@${member.displayName}`))
      .map((member) => member.id),
  ),
];
