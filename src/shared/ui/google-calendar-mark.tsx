/** The Google Calendar glyph, drawn rather than imported. */
export const GoogleCalendarMark = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    aria-hidden="true"
    focusable="false"
    className={className}
  >
    {/* The sheet. A hair inset so the coloured edges read as the frame. */}
    <rect x="4" y="4" width="16" height="16" rx="2" fill="#ffffff" />

    {/* The four edges, in the four brand colours, clockwise from the top. */}
    <path d="M4 6a2 2 0 0 1 2-2h12v3H4V6Z" fill="#4285f4" />
    <path d="M18 4h.5A1.5 1.5 0 0 1 20 5.5V7h-2V4Z" fill="#1967d2" />
    <path d="M20 7v11a2 2 0 0 1-2 2h-1v-3h3V7Z" fill="#fbbc04" />
    <path d="M17 17v3H6a2 2 0 0 1-2-2v-1h13Z" fill="#34a853" />
    <path d="M4 17v-4h3v4H4Z" fill="#188038" />
    <path d="M17 7v6h3V7h-3Z" fill="#fbbc04" />
    <path d="M17 13v4h3v-4h-3Z" fill="#ea4335" />

    {/*
      The date block. Not a literal "31" — at the sizes this is drawn (14–18px)
      a numeral is a smudge, and the shape people actually recognise is a dark
      mass in the middle of a white sheet.
    */}
    <rect x="7.5" y="9.5" width="9" height="7" rx="0.75" fill="#ffffff" />
    <rect x="9" y="11" width="6" height="1.4" rx="0.7" fill="#4285f4" />
    <rect x="9" y="13.6" width="4" height="1.4" rx="0.7" fill="#5f6368" />
  </svg>
);
