import type { ComponentType } from 'react';
import { useReducedMotion } from 'framer-motion';
import { Github } from 'lucide-react';

import { cn } from '@/shared/lib/cn';
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

interface Service {
  key: TranslationKey;
  detail: TranslationKey;
  Mark: ComponentType<{ className?: string }>;
}

/**
 * Everything this app actually connects to, and what each connection is *for*.
 *
 * ## Why every card carries a verb
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
const SERVICES: Service[] = [
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
 * The connections, as a belt that runs on its own.
 *
 * ## Why this stopped being a grid
 *
 * The grid was eight equal cards in four columns, and its virtue was that all
 * eight were visible at once. The cost was that it was the third stack of equal
 * boxes on a page whose whole argument is that this product is not made of
 * them, and it was static in a section sandwiched between two moving ones — so
 * the eye arrived, registered "logos", and left.
 *
 * A belt says something the grid could not: these are *connections*, things
 * that run alongside the work rather than a feature list to be audited. It also
 * fixes the honest problem with eight cards in one row, which is that on
 * anything narrower than a laptop four of them were half a phone wide and their
 * sentences wrapped to four lines.
 *
 * ## Why the list is rendered twice
 *
 * Because that is what makes the loop seamless with no measurement and nothing
 * watching a scroll position. Two identical copies sit side by side and the
 * track slides exactly half its own width; at the instant it wraps back to
 * zero, the second copy is occupying precisely the pixels the first one just
 * left. Nothing is ever seen to jump. The duplicate is `aria-hidden`, so a
 * screen reader is told about eight services rather than sixteen.
 *
 * ## Why the movement is CSS and not Framer Motion
 *
 * Almost everything else that moves in this app is Framer, because almost
 * everything else is driven by state. This is not: it is an unconditional,
 * linear, infinite loop. On the compositor it costs no main-thread work,
 * cannot drift, is paused under the pointer with a single declaration, and is
 * covered by the global `prefers-reduced-motion` rule without anybody wiring
 * it up. See `tailwind.config.js`.
 *
 * ## Why it pauses under the pointer
 *
 * A card that carries a sentence is a card somebody will want to stop and
 * finish, and chasing a moving target with the eye is the single most
 * complained-about thing about marquees. Hovering the belt stops it where it
 * is; leaving starts it again from there.
 *
 * ## Reduced motion
 *
 * Falls back to the grid, in full — not to a slower belt. A strip that moves on
 * its own is exactly the unrequested motion the preference exists to turn off,
 * and the grid was never a bad way to read this, only a dull one.
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
      /*
       * The fade at each end, and why it is a mask rather than two gradients.
       *
       * A belt that stops dead at the edge of its container reads as a
       * horizontal scrollbar somebody forgot to style. Two absolutely-placed
       * gradient overlays are the usual fix and they only work over a known
       * background — this page is drawn in thirteen skins, one of which puts a
       * star field behind this section. A mask removes the pixels rather than
       * painting over them, so whatever is behind shows through correctly in
       * every one.
       */
      className={cn(
        'group relative overflow-hidden py-1',
        '[mask-image:linear-gradient(90deg,transparent,black_5%,black_95%,transparent)]',
      )}
    >
      {/*
        One flat list of sixteen, and the spacing is a trailing padding rather
        than a `gap`.

        That is not a style preference, it is the arithmetic. A `gap` puts a
        space *between* items and none after the last, so half the track is one
        copy plus half a gap — six pixels short of a copy — and the loop jumps
        by six pixels once every pass. Padding on each item makes every slot
        exactly the same width, so half the track is exactly eight slots and the
        wrap is invisible.

        Two nested `ul`s would have been the tidier markup and have the same
        problem one level up: the gap between the two copies is counted once,
        not twice.
      */}
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
 * One service.
 *
 * ## Why the mark is centred and large
 *
 * It used to be a 36px tile in the top-left corner with the name under it,
 * which is the layout of a settings row — correct where somebody is scanning a
 * list of things they have already decided to look for, and wrong here, where
 * the mark is what does the recognising. On a belt the reader gets a second or
 * two per card, and in that second the logo is the fastest thing on it to read.
 * So the mark leads at more than twice the size, the name sits directly under
 * it, and the sentence saying what the connection *does* comes third, where
 * somebody who stopped for the logo will find it.
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
