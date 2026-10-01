import type { ComponentType } from 'react';
import { useReducedMotion } from 'framer-motion';
import { Github } from 'lucide-react';

import { cn } from '@/shared/lib/cn';
import { useT, type TranslationKey } from '@/shared/i18n';
import {
  DiscordMark,
  ExportMark,
  FeedMark,
  FigmaMark,
  GoogleCalendarMark,
  SlackMark,
  JiraMark,
  TrelloMark,
  WebhookMark,
} from '@/shared/ui';

interface Service {
  key: TranslationKey;
  detail: TranslationKey;
  Mark: ComponentType<{ className?: string }>;
}

/**
 * Everything this app actually connects to, and what each connection is *for*. A strip of logos
 * says "we integrate", which is a claim nobody can check and everybody makes.
 */
const SERVICES: Service[] = [
  { key: 'landing.svc.github', detail: 'landing.svc.githubWhat', Mark: Github },
  {
    key: 'landing.svc.figma',
    detail: 'landing.svc.figmaWhat',
    Mark: FigmaMark,
  },
  {
    key: 'landing.svc.googleCalendar',
    detail: 'landing.svc.googleCalendarWhat',
    Mark: GoogleCalendarMark,
  },
  { key: 'landing.svc.feed', detail: 'landing.svc.feedWhat', Mark: FeedMark },
  { key: 'landing.svc.discord', detail: 'landing.svc.discordWhat', Mark: DiscordMark },
  { key: 'landing.svc.slack', detail: 'landing.svc.slackWhat', Mark: SlackMark },
  { key: 'landing.svc.trello', detail: 'landing.svc.trelloWhat', Mark: TrelloMark },
  { key: 'landing.svc.jira', detail: 'landing.svc.jiraWhat', Mark: JiraMark },
  { key: 'landing.svc.exports', detail: 'landing.svc.exportsWhat', Mark: ExportMark },
  { key: 'landing.svc.webhooks', detail: 'landing.svc.webhooksWhat', Mark: WebhookMark },
];

/**
 * The connections, as a belt that runs on its own. The grid was eight equal cards in four columns,
 * and its virtue was that all eight were visible at once.
 */
export const IntegrationsStrip = () => {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return (
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {SERVICES.map((service) => (
          <li key={service.key}>
            <ServiceCard service={service} />
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div
      /* The fade at each end, and why it is a mask rather than two gradients. A belt that stops
         dead at the edge of its container reads as a horizontal scrollbar somebody forgot to style. */
      className={cn(
        'group relative overflow-hidden py-1',
        '[mask-image:linear-gradient(90deg,transparent,black_5%,black_95%,transparent)]',
      )}
    >
      {/* One flat list of sixteen, and the spacing is a trailing padding rather than a `gap`. */}
      <ul className="flex w-max animate-marquee group-hover:[animation-play-state:paused]">
        {[0, 1].map((copy) =>
          SERVICES.map((service) => (
            <li
              key={`${copy}-${service.key}`}
              aria-hidden={copy === 1}
              className="w-[15.75rem] shrink-0 pr-3"
            >
              <ServiceCard service={service} />
            </li>
          )),
        )}
      </ul>
    </div>
  );
};

/**
 * One service. It used to be a 36px tile in the top-left corner with the name under it, which is
 * the layout of a settings row.
 */
const ServiceCard = ({ service }: { service: Service }) => {
  const t = useT();
  const { key, detail, Mark } = service;

  return (
    <div
      className={cn(
        'group/card flex h-full flex-col items-center gap-2 rounded-2xl border border-edge',
        'bg-surface-raised px-4 py-5 text-center transition-colors hover:border-brand/50',
      )}
    >
      <span
        aria-hidden
        className={cn(
          'grid h-14 w-14 place-items-center rounded-2xl border border-edge bg-surface-sunken',
          'transition-transform duration-200 group-hover/card:scale-105',
        )}
      >
        <Mark className="h-8 w-8" />
      </span>

      <p className="text-sm font-semibold">{t(key)}</p>
      <p className="text-2xs leading-snug text-content-muted">{t(detail)}</p>
    </div>
  );
};
