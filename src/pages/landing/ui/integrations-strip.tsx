import type { ComponentType } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Github } from 'lucide-react';

import { useT, type TranslationKey } from '@/shared/i18n';
import {
  DiscordMark,
  ExportMark,
  FeedMark,
  GoogleCalendarMark,
  SlackMark,
  TrelloMark,
  WebhookMark,
} from '@/shared/ui';

/**
 * Everything this app actually connects to, and what each connection is *for*.
 *
 * ## Why every row carries a verb
 *
 * A strip of logos says "we integrate", which is a claim nobody can check and
 * everybody makes. Naming what each one *does* — pulls a repository in, pushes
 * meetings out, posts to a channel — turns the same strip into a list of
 * things the reader can decide whether they want. It is also the honest
 * format: "Discord" is not a feature, "post to a Discord channel when a task
 * is finished" is.
 *
 * ## Why the list stops here
 *
 * Because this is all of them. It is very tempting to pad a strip like this
 * with logos of tools a reader might recognise, and the padding is discovered
 * the moment somebody goes looking for the setting. Everything below exists,
 * is configurable today, and is described in the words the settings screen
 * uses.
 */
const SERVICES: {
  key: TranslationKey;
  detail: TranslationKey;
  Mark: ComponentType<{ className?: string }>;
}[] = [
  { key: 'landing.svc.github', detail: 'landing.svc.githubWhat', Mark: Github },
  {
    key: 'landing.svc.googleCalendar',
    detail: 'landing.svc.googleCalendarWhat',
    Mark: GoogleCalendarMark,
  },
  { key: 'landing.svc.feed', detail: 'landing.svc.feedWhat', Mark: FeedMark },
  { key: 'landing.svc.discord', detail: 'landing.svc.discordWhat', Mark: DiscordMark },
  { key: 'landing.svc.slack', detail: 'landing.svc.slackWhat', Mark: SlackMark },
  { key: 'landing.svc.trello', detail: 'landing.svc.trelloWhat', Mark: TrelloMark },
  { key: 'landing.svc.exports', detail: 'landing.svc.exportsWhat', Mark: ExportMark },
  { key: 'landing.svc.webhooks', detail: 'landing.svc.webhooksWhat', Mark: WebhookMark },
];

/**
 * The connections, as a grid of cards rather than a marquee.
 *
 * A scrolling logo band is the convention and it is the wrong shape for this:
 * it can only carry a name, it moves the thing somebody is trying to read, and
 * on a phone it is a horizontal scroll competing with the page's vertical one.
 * Eight cards fit on one screen and can each say what they do.
 */
export const IntegrationsStrip = () => {
  const t = useT();
  const reduceMotion = useReducedMotion();

  return (
    <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
      {SERVICES.map(({ key, detail, Mark }, index) => (
        <motion.li
          key={key}
          initial={reduceMotion ? false : { opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          // Once. A card that re-animates every time it scrolls back into view
          // turns a page into a slot machine.
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.4, delay: Math.min(index * 0.05, 0.3) }}
          className="group rounded-2xl border border-edge bg-surface-raised p-3.5 transition-colors hover:border-brand/50"
        >
          <span
            aria-hidden
            className="grid h-9 w-9 place-items-center rounded-xl border border-edge bg-surface-sunken transition-transform group-hover:scale-105"
          >
            <Mark className="h-5 w-5" />
          </span>
          <p className="mt-2.5 text-xs font-semibold">{t(key)}</p>
          <p className="mt-0.5 text-[11px] leading-snug text-content-muted">{t(detail)}</p>
        </motion.li>
      ))}
    </ul>
  );
};
