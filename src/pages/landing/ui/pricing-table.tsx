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
 * Which currency a visitor is offered first. Guessed from the language they are reading in, and
 * only as a starting point — the picker is beside it.
 */
const preferredCurrency = (locale: string): Currency => (locale.startsWith('pt') ? 'brl' : 'usd');

/**
 * The plan the table leans on. A three-column table with no emphasis asks the reader to do the
 * comparison from scratch.
 */
const HIGHLIGHTED: Plan = 'STARTUP';

/**
 * Which card the row is leaning on right now. `HIGHLIGHTED` is where it rests; the pointer moves
 * it.
 */
const useFocusedPlan = () => {
  const [focused, setFocused] = useState<Plan | null>(null);

  return {
    focused: focused ?? HIGHLIGHTED,
    // `onPointerEnter` rather than `onMouseEnter`: a tap on a touch screen fires a pointer event
    // too, so the card somebody taps comes forward.
    handlers: (plan: Plan) => ({
      onPointerEnter: () => setFocused(plan),
      onPointerLeave: () => setFocused((current) => (current === plan ? null : current)),
      onFocus: () => setFocused(plan),
      onBlur: () => setFocused((current) => (current === plan ? null : current)),
    }),
  };
};

/** What each plan's card lists, derived from the limits it actually enforces. */
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
  // The connections line, which is the one row that is a capability rather than a number — and the
  // one where the free tier has something worth naming.
  allowsFlavour(limits.broadcastFlavours, 'slack') && allowsFlavour(limits.broadcastFlavours, 'generic')
    ? t('landing.pricing.feat.connectionsAll')
    : t('landing.pricing.feat.connectionsFree'),
  // The looks: every skin on a paid plan, the default and Paper on free.
  limits.customThemes
    ? t('landing.pricing.feat.themesAll')
    : t('landing.pricing.feat.themesFree'),
];

/**
 * What the product costs, on the page people read before they have an account. `GET /billing/plans`
 * is public and unauthenticated precisely so this can use it.
 */
export const PricingTable = () => {
  const t = useT();
  const locale = useLocale();
  const { data, isLoading } = usePlanCatalogue();

  const [interval, setInterval] = useState<BillingInterval>('MONTH');
  const [currency, setCurrency] = useState<Currency>(() => preferredCurrency(locale));
  const { focused, handlers } = useFocusedPlan();

  // Corrected once the deployment says what it sells — the same settle-on-what- exists that
  // `PlanPanel` does, and for the same reason.
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
        {/* A pair of pills rather than the shared `Segmented`. `Segmented` is an in-app control
            sized for a panel. */}
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

      {/* --- The three cards --- */}
      <ul className="grid gap-4 lg:grid-cols-3">
        {data.plans.map((offer) => {
          const isFree = offer.plan === 'FREE';
          // Where the button goes, and it used to go to `/register` - which is not a route this app
          // has ever had.
          const planCta = isFree ? '/signup' : `/plans/soon?plan=${offer.plan}`;
          const price = priceFor(offer);
          const isFocused = offer.plan === focused;

          return (
            <li
              key={offer.plan}
              {...handlers(offer.plan)}
              className={cn(
                /* `isolate` is load-bearing, not tidiness: the glow below sits at `z-index: -1`,
                   and without a stacking context here it would paint behind the *page*. */
                'relative isolate rounded-3xl transition-transform duration-300 ease-studio',
                /* The focused card *rises*. It used to grow, and that was a bug on nine of the
                   thirteen skins. */
                isFocused ? 'z-10 lg:-translate-y-2' : 'lg:translate-y-0',
              )}
            >
              {/* The unfocused cards keep the rim, held still and dimmed — so the row reads as
                  three cards in one design with one of them lit. */}
              <span aria-hidden className={cn('lp-glow', isFocused && 'lp-glow--active')} />
              <span aria-hidden className={cn('lp-rim', isFocused && 'lp-rim--active')} />

              <div
                className={cn(
                  /* Opaque, and that is a requirement rather than a preference. */
                  'ui-card relative flex h-full flex-col gap-6 rounded-3xl',
                  'border bg-surface-raised p-7 sm:p-8',
                  /* Taller. Six feature lines and a price is a card that reads in four seconds and
                     looked cramped doing it; the extra height is what lets the price. */
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

                {/* The amount, at display size. `tabular-nums` so the three cards' figures line
                    up vertically across the row. */}
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

                {/* What a yearly price works out to per month. */}
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

              {/* The focused card's button carries the lamp, the other two do not — the same
                  control the navigation bar and both calls to action use. */}
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
    </div>
  );
};

export default PricingTable;
