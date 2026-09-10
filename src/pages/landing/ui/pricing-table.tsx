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
          <Skeleton key={index} className="h-[26rem] rounded-3xl" />
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

      {/* --- The three cards ---------------------------------------------- */}
      <ul className="grid items-start gap-4 lg:grid-cols-3">
        {data.plans.map((offer) => {
          const isFree = offer.plan === 'FREE';
          const price = priceFor(offer);
          const isHighlighted = offer.plan === HIGHLIGHTED;

          return (
            <li
              key={offer.plan}
              className={cn(
                'ui-card relative flex flex-col gap-5 rounded-3xl border p-6',
                /*
                 * The marked card is *lifted*, not recoloured.
                 *
                 * A brand-filled middle column would read as an advertisement
                 * sitting between two products rather than as one of three
                 * things on offer, and it would put white-on-brand body text
                 * next to two columns of ordinary body text. A ring, a raised
                 * surface and a shadow say "this one" in the same visual
                 * language the rest of the product already uses for emphasis.
                 */
                isHighlighted
                  ? 'border-brand/50 bg-surface-raised shadow-lg shadow-brand/10 lg:-my-2 lg:py-8 lg:ring-1 lg:ring-brand/20'
                  : 'border-edge bg-surface-raised/60',
              )}
            >
              {isHighlighted && (
                <Badge className="absolute right-5 top-5 border-brand/40 bg-brand/12 text-brand">
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

              <Link
                to="/register"
                className={buttonClasses({
                  variant: isHighlighted ? 'primary' : 'secondary',
                  size: 'md',
                  className: 'w-full',
                })}
              >
                {t(isFree ? 'landing.pricing.ctaFree' : 'landing.pricing.ctaPaid')}
              </Link>

              <ul className="space-y-2.5 border-t border-edge pt-5">
                {featuresOf(offer.limits, t).map((feature) => (
                  <li key={feature} className="flex items-start gap-2.5 text-sm">
                    <Check
                      className={cn(
                        'mt-0.5 h-4 w-4 shrink-0',
                        isHighlighted ? 'text-brand' : 'text-positive',
                      )}
                      aria-hidden
                    />
                    <span className="leading-snug text-content-muted">{feature}</span>
                  </li>
                ))}
              </ul>
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
