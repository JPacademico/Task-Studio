import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check } from 'lucide-react';

import { usePlanCatalogue } from '@/entities/billing/model/queries';
import {
  allowsFlavour,
  type BillingInterval,
  type Currency,
  type Plan,
  type PlanLimits,
  type PlanOffer,
} from '@/entities/billing/model/types';
import { formatBytesCeiling, formatPrice } from '@/features/billing/lib/format';
import { cn } from '@/shared/lib/cn';
import { Badge, Skeleton, buttonClasses } from '@/shared/ui';
import { useLocale, useT, type Translate } from '@/shared/i18n';
import { LavaLink } from './lava-link';

/**
 * Which currency a visitor is offered first.
 *
 * Guessed from the language they are reading in, and only as a starting point —
 * the picker is beside it. Identical reasoning to `PlanPanel`, and deliberately
 * the same function rather than a shared import: this page is loaded by people
 * with no account, and pulling a settings-panel module into the landing bundle
 * to reuse one line would cost more than the line.
 */
const preferredCurrency = (locale: string): Currency => (locale.startsWith('pt') ? 'brl' : 'usd');

/**
 * The plan the table leans on.
 *
 * ## Why one card is marked at all
 *
 * A three-column table with no emphasis asks the reader to do the comparison
 * from scratch, and most people looking at a pricing page have not yet decided
 * they want the product — let alone which tier of it. Marking one is the page
 * answering "which of these is for me" for the common case, and it is a real
 * answer rather than an upsell: Startup is where the ceilings stop being
 * visible for a small team, which is who this is for.
 */
const HIGHLIGHTED: Plan = 'STARTUP';

/**
 * Which card the row is leaning on right now.
 *
 * `HIGHLIGHTED` is where it rests; the pointer moves it. Hovering any card
 * brings that one forward and lets the other two fall back, which is the
 * behaviour a three-column table wants and almost never has: the reader is
 * *already* comparing, and the card under their cursor is the one they are
 * comparing from.
 *
 * Focus counts as well as hover, and it is not a courtesy. Without it the
 * emphasis would be invisible to anybody tabbing through the three "Get
 * started" buttons — three identical-looking cards with no indication which
 * one the focused button belongs to.
 */
const useFocusedPlan = () => {
  const [focused, setFocused] = useState<Plan | null>(null);

  return {
    focused: focused ?? HIGHLIGHTED,
    /*
     * `onPointerEnter` rather than `onMouseEnter`: a tap on a touch screen
     * fires a pointer event too, so the card somebody taps comes forward. The
     * pointer type is deliberately not checked — a tap that moves the emphasis
     * to the card being tapped is correct on a phone as well.
     */
    handlers: (plan: Plan) => ({
      onPointerEnter: () => setFocused(plan),
      onPointerLeave: () => setFocused((current) => (current === plan ? null : current)),
      onFocus: () => setFocused(plan),
      onBlur: () => setFocused((current) => (current === plan ? null : current)),
    }),
  };
};

/**
 * What each plan's card lists, derived from the limits it actually enforces.
 *
 * ## Why these are computed rather than written
 *
 * Because a pricing page that states numbers by hand is a pricing page that
 * eventually states the wrong ones. Every figure here comes from the same
 * `PLAN_LIMITS` the API refuses creates against, over the public catalogue
 * endpoint — so a limit cannot be advertised at one number and enforced at
 * another. That is not a hypothetical failure; it is the single most common bug
 * in pricing code.
 *
 * ## Why six lines and not the whole table
 *
 * A card is read in about four seconds and a landing page is not a
 * specification. These are the six a small team actually chooses on; the
 * complete comparison, including the rows nobody has ever picked a plan over,
 * is one screen away in Settings once somebody has an account.
 */
const featuresOf = (limits: PlanLimits, t: Translate): string[] => [
  t('landing.pricing.feat.projects', { count: String(limits.projectsPerOwner ?? '∞') }),
  limits.organizationsPerOwner === 1
    ? t('landing.pricing.feat.orgOne')
    : t('landing.pricing.feat.orgMany', { count: String(limits.organizationsPerOwner ?? '∞') }),
  limits.membersPerProject === null
    ? t('landing.pricing.feat.membersUnlimited')
    : t('landing.pricing.feat.members', { count: String(limits.membersPerProject) }),
  t('landing.pricing.feat.tasks', { count: String(limits.tasksPerProject ?? '∞') }),
  t('landing.pricing.feat.docs', {
    size: limits.documentBoardBytes === null ? '∞' : formatBytesCeiling(limits.documentBoardBytes),
  }),
  t('landing.pricing.feat.ai', { count: String(limits.aiCallsPerMonth ?? '∞') }),
  /*
   * The connections line, which is the one row that is a capability rather
   * than a number — and the one where the free tier has something worth
   * naming. "Discord and Figma" is a better free-tier line than a dash next to
   * "connections", and it is true.
   */
  allowsFlavour(limits.broadcastFlavours, 'slack') && allowsFlavour(limits.broadcastFlavours, 'generic')
    ? t('landing.pricing.feat.connectionsAll')
    : t('landing.pricing.feat.connectionsFree'),
];

/**
 * What the product costs, on the page people read before they have an account.
 *
 * ## Why the prices are fetched rather than written into the page
 *
 * `GET /billing/plans` is public and unauthenticated precisely so this can use
 * it. The alternative — a table of prices typed into the landing page — is a
 * fourth place for the money to be stated, alongside the plan catalogue, the
 * Stripe Price objects and `SETUP.md`, and the first three already need to be
 * kept in step by hand.
 *
 * The cost of fetching is one request on a page that is mostly static, and it
 * is paid while the section is well below the fold. What a visitor sees in the
 * meantime is a skeleton the same height as the cards, so the page does not
 * jump when the answer lands.
 *
 * ## Why a plan with no configured price still draws
 *
 * A deployment that sells nothing in reais still *has* a Startup plan with
 * Startup's limits, and hiding the card would make the page claim the product
 * has two tiers. The card renders with its ceilings and no amount, which is the
 * honest rendering of "this exists and you cannot buy it here yet".
 */
export const PricingTable = () => {
  const t = useT();
  const locale = useLocale();
  const { data, isLoading } = usePlanCatalogue();

  const [interval, setInterval] = useState<BillingInterval>('MONTH');
  const [currency, setCurrency] = useState<Currency>(() => preferredCurrency(locale));
  const { focused, handlers } = useFocusedPlan();

  /*
   * Corrected once the deployment says what it sells — the same settle-on-what-
   * exists that `PlanPanel` does, and for the same reason: the guess above is
   * from the reader's language and can name a currency with no prices behind
   * it, which would draw every card as unbuyable for a reason that is not
   * theirs.
   */
  const available = data?.currencies ?? [];
  useEffect(() => {
    if (available.length === 0 || available.includes(currency)) return;
    setCurrency(available[0]);
  }, [available, currency]);

  const priceFor = useMemo(
    () => (offer: PlanOffer) =>
      offer.prices.find((price) => price.interval === interval && price.currency === currency) ??
      null,
    [interval, currency],
  );

  if (isLoading || !data) {
    return (
      <div className="grid gap-4 lg:grid-cols-3">
        {[0, 1, 2].map((index) => (
          <Skeleton key={index} className="h-[30rem] rounded-3xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* --- The two switches -------------------------------------------- */}
      <div className="flex flex-wrap items-center justify-center gap-2">
        {/*
          A pair of pills rather than the shared `Segmented`.

          `Segmented` is an in-app control sized for a panel; this sits under a
          display heading on a marketing page and needs the larger tap target
          and the ability to carry the "2 months free" badge inline. It is the
          same interaction with a different scale, which is the case where a
          bespoke control beats bending a shared one.
        */}
        <div className="inline-flex items-center gap-1 rounded-2xl border border-edge bg-surface-sunken p-1">
          {(
            [
              ['MONTH', 'landing.pricing.monthly'],
              ['YEAR', 'landing.pricing.yearly'],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setInterval(value)}
              aria-pressed={interval === value}
              className={cn(
                'rounded-xl px-4 py-2 text-sm font-medium transition-colors',
                'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2',
                'focus-visible:outline-brand',
                interval === value
                  ? 'bg-surface-raised text-content shadow-sm'
                  : 'text-content-muted hover:text-content',
              )}
            >
              {t(label)}
            </button>
          ))}
        </div>

        {/* Said once, beside the switch that earns it, rather than on all
            three yearly prices. */}
        {interval === 'YEAR' && (
          <Badge className="border-positive/40 bg-positive/10 text-positive">
            {t('landing.pricing.save')}
          </Badge>
        )}

        {/* Only when there is a choice — a one-option control looks broken. */}
        {available.length > 1 && (
          <div className="inline-flex items-center gap-1 rounded-2xl border border-edge bg-surface-sunken p-1">
            {available.map((code) => (
              <button
                key={code}
                type="button"
                onClick={() => setCurrency(code)}
                aria-pressed={currency === code}
                className={cn(
                  'rounded-xl px-3 py-2 text-xs font-semibold uppercase tracking-wide transition-colors',
                  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2',
                  'focus-visible:outline-brand',
                  currency === code
                    ? 'bg-surface-raised text-content shadow-sm'
                    : 'text-content-muted hover:text-content',
                )}
              >
                {code}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* --- The three cards ----------------------------------------------

          `items-stretch` (the grid default, restored by dropping the
          `items-start` this had) rather than three cards of their own heights.

          It matters more than it used to. The emphasis now *moves* — see
          `useFocusedPlan` — and a row of cards with three different heights
          would have the row's total height change as the pointer crossed it,
          because the lifted card is the tallest thing in it. Equal heights make
          the geometry constant, so the only thing that changes on hover is the
          card, which is the point.

          It is also the reason the marked card no longer grows with
          `lg:-my-2 lg:py-8`. That was a real change of box, fine when it was
          fixed at build time and a reflow of the whole section if it followed a
          cursor. A `transform` says the same thing and costs no layout — a
          *translation*, specifically, for the reason given on the card. */}
      <ul className="grid gap-4 lg:grid-cols-3">
        {data.plans.map((offer) => {
          const isFree = offer.plan === 'FREE';
          /*
           * Where the button goes, and it used to go to `/register` - which is
           * not a route this app has ever had. Every one of these six buttons
           * landed on the 404 page, which is a remarkable thing to have been
           * doing on the one screen whose entire job is converting a reader
           * into an account.
           *
           * The two halves go to different places because they are different
           * questions. The free plan is a sign-up: it exists, it works, and
           * the next step is an account, so it goes to the account screen. A
           * paid plan is not purchasable yet - payments are switched off while
           * the rest of the product is built - so it goes to the page written
           * to say exactly that, carrying which plan was asked for so the page
           * can name it. That is the same destination the plan panel in
           * settings already uses; this screen was simply not pointed at it.
           */
          const planCta = isFree ? '/signup' : `/plans/soon?plan=${offer.plan}`;
          const price = priceFor(offer);
          const isFocused = offer.plan === focused;

          return (
            <li
              key={offer.plan}
              {...handlers(offer.plan)}
              className={cn(
                /*
                 * `isolate` is load-bearing, not tidiness: the glow below sits
                 * at `z-index: -1`, and without a stacking context here it
                 * would paint behind the *page*, which is to say not at all.
                 */
                'relative isolate rounded-3xl transition-transform duration-300 ease-studio',
                /*
                 * The focused card *rises*. It used to grow, and that was a bug
                 * on nine of the thirteen skins.
                 *
                 * Every one of those skins gives `.ui-card` a `--panel-texture`,
                 * and those textures are fine repeating patterns — volcano's is
                 * three 1px hairline gradients at 23°, 97° and 151° over a 6px
                 * dot screen. Scaling by 1.035 resamples a one-pixel line onto a
                 * grid it does not land on, so some lines come back brighter
                 * than others and the dots go irregular; animating the scale
                 * makes that pattern *crawl* across the card. It reads as the
                 * card glitching, and it was worst on volcano simply because
                 * volcano has the most texture.
                 *
                 * A translation has no such problem: the pattern is painted
                 * relative to the element's own box, so it moves with the card
                 * instead of being regenerated at a new scale, and the browser
                 * can hand the whole thing to the compositor untouched. It also
                 * says the same thing — this is the card in front — which is
                 * the only reason the transform was there.
                 */
                isFocused ? 'z-10 lg:-translate-y-2' : 'lg:translate-y-0',
              )}
            >
              {/*
                The travelling light, and the same light blurred behind the
                card. Both are described in full on `.lp-rim` in `index.css`;
                what is decided here is only *which* card has it running.

                The unfocused cards keep the rim, held still and dimmed — so
                the row reads as three cards in one design with one of them lit,
                rather than as one designed card beside two plain ones.
              */}
              <span aria-hidden className={cn('lp-glow', isFocused && 'lp-glow--active')} />
              <span aria-hidden className={cn('lp-rim', isFocused && 'lp-rim--active')} />

              <div
                className={cn(
                  /*
                   * Opaque, and that is a requirement rather than a preference:
                   * this face is what covers the spinning gradient behind it,
                   * so the rim is a hairline at the edge instead of a colour
                   * wheel showing through the whole card. The unfocused cards
                   * used to be `surface-raised/60` and cannot be any more.
                   */
                  'ui-card relative flex h-full flex-col gap-6 rounded-3xl',
                  'border bg-surface-raised p-7 sm:p-8',
                  /* Taller. Six feature lines and a price is a card that reads
                     in four seconds and looked cramped doing it; the extra
                     height is what lets the price, the button and the list
                     each have a band of their own. */
                  'min-h-[29rem]',
                  'transition-[border-color,box-shadow] duration-300 ease-studio',
                  isFocused
                    ? 'border-brand/40 shadow-xl shadow-brand/10'
                    : 'border-edge/80 shadow-sm',
                )}
              >
              {offer.plan === HIGHLIGHTED && (
                <Badge className="absolute right-6 top-6 border-brand/40 bg-brand/12 text-brand">
                  {t('landing.pricing.popular')}
                </Badge>
              )}

              <div>
                <h3 className="text-lg font-semibold tracking-tight">
                  {t(`billing.plan.${offer.plan}` as const)}
                </h3>

                {/*
                  The amount, at display size.

                  `tabular-nums` so the three cards' figures line up vertically
                  across the row — proportional digits make $5 and $20 sit at
                  visibly different heights against the currency mark, which
                  reads as a typesetting mistake at this size.
                */}
                <p className="mt-3 flex items-baseline gap-1.5">
                  <span className="text-4xl font-bold tabular-nums tracking-tight">
                    {isFree
                      ? formatPrice(0, currency, locale)
                      : price
                        ? formatPrice(price.amount, currency, locale)
                        : '—'}
                  </span>
                  {!isFree && price && (
                    <span className="text-sm text-content-faint">
                      {t(
                        interval === 'YEAR'
                          ? 'landing.pricing.perYear'
                          : 'landing.pricing.perMonth',
                      )}
                    </span>
                  )}
                </p>

                {/*
                  What a yearly price works out to per month.

                  The one number a reader comparing cadences actually wants and
                  would otherwise divide by twelve in their head — and it is the
                  line that makes "2 months free" concrete rather than a claim.
                */}
                <p className="mt-1 min-h-[1.25rem] text-xs text-content-muted">
                  {!isFree && price && interval === 'YEAR'
                    ? t('landing.pricing.billedYearly', {
                        amount: formatPrice(Math.round(price.amount / 12), currency, locale),
                      })
                    : !isFree && !price
                      ? t('landing.pricing.unavailable')
                      : ''}
                </p>
              </div>

              {/*
                The focused card's button carries the lamp, the other two do
                not — the same control the navigation bar and both calls to
                action use, so the emphasis moving across the row moves the
                *offer* with it rather than only a border.

                Two elements rather than one with a swapped variant, because
                only one of them can hold the lamp's seven spans. The swap
                mounts and unmounts a `LavaSurface` as the pointer crosses the
                row; that is three listeners at human speed, and the alternative
                — keeping all three lamps mounted and hiding two — would run two
                gooey filters nobody can see.
              */}
              {isFocused ? (
                <LavaLink to={planCta} className="w-full">
                  {t(isFree ? 'landing.pricing.ctaFree' : 'landing.pricing.ctaPaid')}
                </LavaLink>
              ) : (
                <Link
                  to={planCta}
                  className={buttonClasses({
                    variant: 'secondary',
                    size: 'md',
                    className: 'w-full',
                  })}
                >
                  {t(isFree ? 'landing.pricing.ctaFree' : 'landing.pricing.ctaPaid')}
                </Link>
              )}

              <ul className="space-y-3 border-t border-edge pt-6">
                {featuresOf(offer.limits, t).map((feature) => (
                  <li key={feature} className="flex items-start gap-2.5 text-sm">
                    <Check
                      className={cn(
                        'mt-0.5 h-4 w-4 shrink-0 transition-colors duration-300',
                        isFocused ? 'text-brand' : 'text-positive',
                      )}
                      aria-hidden
                    />
                    <span className="leading-snug text-content-muted">{feature}</span>
                  </li>
                ))}
              </ul>
              </div>
            </li>
          );
        })}
      </ul>

      {/* The sentence that stops the table being read as a feature matrix.
          Every plan is the whole product; what differs is how much of it you
          can hold. Worth saying once, under the cards, where somebody who has
          just compared three columns of numbers is looking. */}
      <p className="mx-auto max-w-2xl text-balance text-center text-xs leading-relaxed text-content-faint">
        {t('landing.pricing.footnote')}
      </p>
    </div>
  );
};

export default PricingTable;
