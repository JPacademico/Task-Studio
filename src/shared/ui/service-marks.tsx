/**
 * The marks for the services this app actually connects to.
 *
 * ## Why these are drawn and not fetched
 *
 * A landing page that loads eight logos from a CDN is a landing page with eight
 * requests, a content-security question and a layout shift — and the Artifact
 * of that on a free-tier deployment is a strip that pops in half a second after
 * everything else. These are a few hundred bytes of path data each, inline, and
 * they are drawn the moment the section is.
 *
 * ## Why they carry brand colour rather than `currentColor`
 *
 * Because *which service* is the entire information. A row of identical grey
 * glyphs says "we integrate with some things"; the colours are what let
 * somebody spot the one they use without reading a single label. This is the
 * one place in the app where a mark deliberately ignores the active skin —
 * every other icon takes the skin's accent, and these are quoting somebody
 * else's identity rather than expressing ours.
 *
 * ## What is deliberately not here
 *
 * No logo this product does not genuinely talk to. It is tempting to fill a
 * strip with every tool a reader might recognise, and it is a lie that gets
 * discovered on the pricing page. Jira and Asana appear as a *file* mark
 * rather than their own logos for exactly that reason: the app reads their
 * exports, it does not connect to them, and their logo in a row of connections
 * would promise an integration that does not exist.
 */

interface MarkProps {
  className?: string;
}

/** Discord — the face, simplified to the shape people recognise at 20px. */
export const DiscordMark = ({ className }: MarkProps) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" className={className}>
    <path
      fill="#5865F2"
      d="M19.3 5.4a16.5 16.5 0 0 0-4.1-1.3l-.2.4a15 15 0 0 0-5.9 0l-.2-.4a16.5 16.5 0 0 0-4.1 1.3C2.2 9.3 1.5 13.1 1.8 16.8a16.7 16.7 0 0 0 5 2.6l.6-.9c-.6-.2-1.1-.5-1.6-.8l.4-.3a11.9 11.9 0 0 0 10.2 0l.4.3c-.5.3-1 .6-1.6.8l.6.9a16.6 16.6 0 0 0 5-2.6c.4-4.3-.6-8.1-3.5-11.4ZM8.4 14.6c-1 0-1.8-.9-1.8-2s.8-2 1.8-2 1.8.9 1.8 2-.8 2-1.8 2Zm7.2 0c-1 0-1.8-.9-1.8-2s.8-2 1.8-2 1.8.9 1.8 2-.8 2-1.8 2Z"
    />
  </svg>
);

/** Slack — the four crossed bars. */
export const SlackMark = ({ className }: MarkProps) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" className={className}>
    <path fill="#36C5F0" d="M9 3a2 2 0 1 1 2 2H9V3Zm0 3h2v5a2 2 0 1 1-2-2V6Z" />
    <path fill="#2EB67D" d="M21 9a2 2 0 1 1-2 2V9h2Zm-3 0v2h-5a2 2 0 1 1 2-2h3Z" />
    <path fill="#ECB22E" d="M15 21a2 2 0 1 1-2-2h2v2Zm0-3h-2v-5a2 2 0 1 1 2 2v3Z" />
    <path fill="#E01E5A" d="M3 15a2 2 0 1 1 2-2v2H3Zm3 0v-2h5a2 2 0 1 1-2 2H6Z" />
  </svg>
);

/** Trello — a board with two lists on it. */
export const TrelloMark = ({ className }: MarkProps) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" className={className}>
    <rect x="3" y="3" width="18" height="18" rx="3" fill="#0052CC" />
    <rect x="6" y="6" width="5" height="11" rx="1" fill="#ffffff" />
    <rect x="13" y="6" width="5" height="7" rx="1" fill="#ffffff" />
  </svg>
);

/**
 * The calendar-feed mark: a document with a broadcast wave on it.
 *
 * Not any one vendor's logo, deliberately. The `.ics` feed is the integration
 * that works with *every* calendar — Apple, Outlook, Thunderbird, Fastmail —
 * and picking one of their logos to stand for all of them would understate it
 * to everybody using the other three.
 */
export const FeedMark = ({ className }: MarkProps) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" className={className}>
    <rect x="4" y="3" width="16" height="18" rx="2.5" fill="#0f766e" />
    <rect x="4" y="3" width="16" height="4" rx="2.5" fill="#134e4a" />
    <circle cx="9" cy="17" r="1.4" fill="#ffffff" />
    <path
      d="M9 13.4a3.6 3.6 0 0 1 3.6 3.6M9 10a7 7 0 0 1 7 7"
      fill="none"
      stroke="#ffffff"
      strokeWidth="1.6"
      strokeLinecap="round"
    />
  </svg>
);

/**
 * The board-export mark: a spreadsheet.
 *
 * Stands for Jira, Asana, Monday and Trello's own CSV — see the module note on
 * why those get a file rather than their logos.
 */
export const ExportMark = ({ className }: MarkProps) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" className={className}>
    <rect x="4" y="3" width="16" height="18" rx="2.5" fill="#475569" />
    <rect x="6.5" y="6.5" width="11" height="2.4" rx="0.8" fill="#e2e8f0" />
    <rect x="6.5" y="10.4" width="4.6" height="2.4" rx="0.8" fill="#94a3b8" />
    <rect x="12.9" y="10.4" width="4.6" height="2.4" rx="0.8" fill="#94a3b8" />
    <rect x="6.5" y="14.3" width="4.6" height="2.4" rx="0.8" fill="#94a3b8" />
    <rect x="12.9" y="14.3" width="4.6" height="2.4" rx="0.8" fill="#94a3b8" />
  </svg>
);

/** The generic outbound webhook: a plug going out to somewhere unnamed. */
export const WebhookMark = ({ className }: MarkProps) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" className={className}>
    <circle cx="12" cy="12" r="9" fill="#7c3aed" />
    <path
      d="M8.4 12.6 11 9.2m0 0 2.6 3.4M11 9.2v6.4"
      fill="none"
      stroke="#ffffff"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <circle cx="15.6" cy="15" r="1.7" fill="#ffffff" />
  </svg>
);

/**
 * GitHub — the mark, drawn rather than taken from a line-icon set.
 *
 * The lucide glyph is a one-weight outline that disappears at 16px inside a
 * tinted chip, which is exactly the complaint the Connections shelf had about
 * every icon on it. This is the filled silhouette people actually recognise,
 * and it keeps its own black-and-white identity across all thirteen skins for
 * the same reason the four above do.
 */
export const GitHubMark = ({ className }: MarkProps) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" className={className}>
    <circle cx="12" cy="12" r="11" fill="#181717" />
    <path
      fill="#ffffff"
      d="M12 3.4a8.6 8.6 0 0 0-2.72 16.76c.43.08.59-.19.59-.41v-1.6c-2.4.52-2.9-1.03-2.9-1.03-.4-1-.96-1.27-.96-1.27-.79-.53.06-.52.06-.52.87.06 1.33.9 1.33.9.77 1.32 2.02.94 2.52.72.08-.56.3-.94.55-1.16-1.92-.22-3.93-.96-3.93-4.26 0-.94.33-1.71.88-2.31-.09-.22-.38-1.1.08-2.29 0 0 .72-.23 2.36.88a8.2 8.2 0 0 1 4.3 0c1.63-1.11 2.35-.88 2.35-.88.47 1.19.17 2.07.09 2.29.55.6.88 1.37.88 2.31 0 3.31-2.02 4.04-3.94 4.25.31.27.59.8.59 1.61v2.39c0 .23.15.5.59.41A8.6 8.6 0 0 0 12 3.4Z"
    />
  </svg>
);
