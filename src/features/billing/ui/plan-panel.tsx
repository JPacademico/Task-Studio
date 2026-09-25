import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AlertTriangle, Check, Coins, CreditCard, Minus } from 'lucide-react';
import { toast } from '@/shared/lib/toast';

import {
  useBillingSummary,
  useOpenBillingPortal,
  usePlanCatalogue,
  useRefreshPlanAfterCheckout,
} from '@/entities/billing/model/queries';
import {
  allowsFlavour,
  type BillingInterval,
  type Currency,
  type Limit,
  type Plan,
  type PlanLimits,
  type PlanOffer,
} from '@/entities/billing/model/types';
import { formatCalendarDate } from '@/shared/lib/dates';
import { cn } from '@/shared/lib/cn';
import { Badge, Button, LavaSurface, Segmented, Skeleton, buttonClasses } from '@/shared/ui';
import { useLocale, useT, type Translate, type TranslationKey } from '@/shared/i18n';
import { formatBytesCeiling, formatBytesUsed, formatPrice, usageFraction } from '../lib/format';

/**
 * Which currency a reader is offered first.
 *
 * Guessed from the language they are reading in, and only as a *starting
 * point* — the picker is right there. A Portuguese reader is overwhelmingly
 * likely to want reais, and making them find a dropdown to see a price in a
 * currency they can actually pay in is a worse default than occasionally
 * guessing wrong for a Brazilian who prefers dollars.
 *
 * Not derived from geolocation, which would need permission for something this
 * unimportant, and not from the browser's currency (there is no such thing).
 */
const preferredCurrency = (locale: string): Currency => (locale.startsWith('pt') ? 'brl' : 'usd');

/** The one-line pitch under each plan's name. */
const BLURB: Record<Plan, TranslationKey> = {
  FREE: 'billing.freeBlurb',
  STARTUP: 'billing.startupBlurb',
  BARON: 'billing.baronBlurb',
};

const PLAN_NAME: Record<Plan, TranslationKey> = {
  FREE: 'billing.plan.FREE',
  STARTUP: 'billing.plan.STARTUP',
  BARON: 'billing.plan.BARON',
};

/**
 * The rows of the comparison table, in the order they are drawn.
 *
 * ## Why nine rows and not the whole `PlanLimits` object
 *
 * Because a comparison table is a sales document, and the fields it leaves out
 * are as considered as the ones it keeps. `projectsPerOwnerIncludingBinned` and
 * `teamsPerScope` are real ceilings that nobody has ever chosen a plan over —
 * putting them here would push the row somebody *does* care about below the
 * fold to make room for a number about the recycle bin.
 *
 * They are still enforced, still in the API's own catalogue, and still named in
 * the refusal if anybody meets one. This list is about what to *show*.
 *
 * ## Why `render` is a function per row
 *
 * Because the nine values are four different kinds of thing — a count, a byte
 * ceiling, a boolean, and a count that may be uncapped — and a table that
 * printed them all with one formatter would render `documentBoardBytes` as
 * "83886080".
 */
interface FeatureRow {
  key: TranslationKey;
  render: (limits: PlanLimits, t: Translate) => string | boolean;
}

const FEATURES: FeatureRow[] = [
  { key: 'billing.feature.projects', render: (l, t) => count(l.projectsPerOwner, t) },
  { key: 'billing.feature.organizations', render: (l, t) => count(l.organizationsPerOwner, t) },
  { key: 'billing.feature.membersPerProject', render: (l, t) => count(l.membersPerProject, t) },
  {
    key: 'billing.feature.membersPerOrganization',
    render: (l, t) => count(l.membersPerOrganization, t),
  },
  { key: 'billing.feature.tasksPerProject', render: (l, t) => count(l.tasksPerProject, t) },
  /*
   * Directly under the task row on purpose.
   *
   * These two are the pair a reader is actually comparing: one is now uncapped
   * on the top tier and the other is the tightest step in the table, so putting
   * them together is what makes the shape of the offer legible rather than
   * making the reader hold two rows apart in their head.
   */
  { key: 'billing.feature.boardPages', render: (l, t) => count(l.boardPagesPerUser, t) },
  {
    key: 'billing.feature.whiteboardPages',
    render: (l, t) => count(l.whiteboardPagesPerProject ?? l.boardPagesPerUser, t),
  },
  {
    key: 'billing.feature.documentBoard',
    render: (l, t) =>
      l.documentBoardBytes === null
        ? t('billing.limit.unlimited')
        : formatBytesCeiling(l.documentBoardBytes),
  },
  { key: 'billing.feature.ai', render: (l, t) => count(l.aiCallsPerMonth, t) },
  /*
   * Two rows for broadcasting, not one.
   *
   * A single "Discord, Slack & custom endpoints" row would have to render a
   * tick on the free tier (it has Discord) or a dash (it lacks the other two),
   * and both are lies. Splitting it is the only honest rendering, and it also
   * happens to be the better sales table: a free reader sees a tick they
   * already have next to a dash they could buy, which is a far more legible
   * offer than one ambiguous row.
   */
  { key: 'billing.feature.discord', render: (l) => allowsFlavour(l.broadcastFlavours, 'discord') },
  {
    key: 'billing.feature.broadcast',
    render: (l) =>
      allowsFlavour(l.broadcastFlavours, 'slack') &&
      allowsFlavour(l.broadcastFlavours, 'generic'),
  },
  { key: 'billing.feature.figma', render: (l) => l.figmaConnections },
  /*
   * A tick or a dash, like the other capabilities: the free tier keeps Studio
   * and Paper, and every other skin in the catalogue is what this row sells.
   */
  { key: 'billing.feature.customThemes', render: (l) => l.customThemes },
];

const count = (limit: Limit, t: Translate): string =>
  limit === null ? t('billing.limit.unlimited') : String(limit);

/**
 * The plan somebody is on, what it allows, and how to change it.
 *
 * ## Why this is one panel and not a page
 *
 * Because changing plan is a *setting*. It is the same kind of act as changing
 * a password or connecting a calendar — infrequent, about the account rather
 * than about any project, and reached by somebody who came to Settings on
 * purpose. A dedicated `/billing` route would be a second place to navigate to
 * for something that belongs beside the other things you can change about
 * yourself.
 *
 * The comparison table folds away for the same reason the skin gallery does:
 * the common visit is somebody checking what they are on or what is left, and
 * three columns of ceilings on top of that is a wall in front of the answer.
 *
 * ## Why the usage meters are here rather than where the limits bite
 *
 * They are in both places, and they are different things in each. A project
 * that is full says so at the moment somebody tries to add to it — that is an
 * error, and it is the API's job. These are the *inventory*: what you own
 * against what you are allowed, in one place, so somebody deciding whether to
 * pay can see the answer without visiting six projects.
 *
 * The three shown are the three that are facts about *this account* — projects
 * owned, organizations owned, assistant calls spent, and the reader's own desk.
 * A per-project ceiling cannot be drawn here because there is no one project to
 * draw it for.
 */
export const PlanPanel = () => {
  const t = useT();
  const locale = useLocale();
  const [params, setParams] = useSearchParams();

  const catalogue = usePlanCatalogue();
  const summary = useBillingSummary();
  const portal = useOpenBillingPortal();
  const refreshAfterCheckout = useRefreshPlanAfterCheckout();

  const [isComparing, setIsComparing] = useState(false);
  const [interval, setInterval] = useState<BillingInterval>('MONTH');
  const [currency, setCurrency] = useState<Currency>(() => preferredCurrency(locale));

  /*
   * The currency, corrected once the deployment says what it sells.
   *
   * The initial guess is from the reader's language and can name a currency
   * this deployment has no prices in — at which point every plan would draw as
   * unbuyable for a reason that is not the reader's fault. This settles on the
   * first currency actually on offer.
   *
   * Depends on the catalogue rather than running once, because the catalogue
   * arrives after the first render.
   */
  const available = catalogue.data?.currencies ?? [];
  useEffect(() => {
    if (available.length === 0 || available.includes(currency)) return;
    setCurrency(available[0]);
  }, [available, currency]);

  /*
   * What the redirect back from Stripe says, said once and then removed.
   *
   * Stripping the parameter matters for the same reason it does on the calendar
   * panel: without it, a reader who reloads the page — or comes back to the tab
   * an hour later — is congratulated on a payment they made this morning.
   *
   * The refetch is the interesting half. The webhook that grants the plan is a
   * *separate* request from Stripe to the API, racing the browser's redirect,
   * and on a cold container it frequently loses. See `useRefreshPlanAfterCheckout`.
   */
  useEffect(() => {
    const outcome = params.get('checkout');
    if (!outcome) return;

    if (outcome === 'done') {
      toast.success(t('billing.checkoutDone'));
      void refreshAfterCheckout();
    } else if (outcome === 'cancelled') {
      toast.info(t('billing.checkoutCancelled'));
    }

    const next = new URLSearchParams(params);
    next.delete('checkout');
    setParams(next, { replace: true });
    // `params` identity changes on every navigation; the outcome is read from
    // it once and the effect must not re-run on an unrelated query change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.get('checkout')]);

  const plans = catalogue.data?.plans ?? [];
  const current = summary.data;

  const priceFor = useMemo(
    () => (offer: PlanOffer) =>
      offer.prices.find((price) => price.interval === interval && price.currency === currency) ??
      null,
    [interval, currency],
  );

  if (summary.isLoading || catalogue.isLoading) {
    return <Skeleton className="h-40 rounded-2xl" />;
  }

  if (!current) return null;

  const paymentsEnabled = current.paymentsEnabled;
  const isGranted = current.source === 'ADMIN';

  return (
    <div className="space-y-3">
      {/* --- What you are on ---------------------------------------------- */}
      <div className="rounded-2xl border border-edge bg-surface-raised p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-sm font-semibold">
              {/*
                Money, not magic.

                `Sparkles` is the icon this product uses for the assistant — it
                is on the AI panel, the checklist suggestion and the project
                tab — so spending it here said "something clever happens" above
                a line about what the account is paying for. A coin says the
                one thing this section is about, and gives the sparkle back to
                the feature that had earned it.
              */}
              <Coins className="h-3.5 w-3.5 shrink-0 text-brand" />
              {t('billing.currentPlan', { plan: t(PLAN_NAME[current.plan]) })}
            </p>
            <p className="mt-0.5 text-xs leading-relaxed text-content-muted">
              {t(BLURB[current.plan])}
            </p>

            {/*
              What happens next, when anything does.

              Four mutually exclusive states, and only one of them is drawn.
              Ordered by urgency rather than by likelihood: a failed payment is
              the only one that asks the reader to do something, so it wins over
              a cancellation notice, which in turn wins over an ordinary renewal
              date nobody needs to act on.
            */}
            {isGranted ? (
              <p className="mt-2 text-2xs text-content-faint">
                {t('billing.grantedByAdmin')} {t('billing.grantedByAdminHint')}
              </p>
            ) : current.subscription?.status === 'PAST_DUE' ? (
              <p className="mt-2 flex items-start gap-1.5 rounded-lg bg-warning/10 px-2 py-1.5 text-2xs leading-relaxed text-warning">
                <AlertTriangle className="mt-px h-3 w-3 shrink-0" />
                <span>
                  <strong>{t('billing.pastDue')}</strong> — {t('billing.pastDueBody')}
                </span>
              </p>
            ) : current.subscription?.currentPeriodEnd ? (
              <p className="mt-2 text-2xs text-content-faint">
                {t(
                  current.subscription.cancelAtPeriodEnd ? 'billing.endsOn' : 'billing.renewsOn',
                  { date: formatCalendarDate(current.subscription.currentPeriodEnd) },
                )}
              </p>
            ) : null}
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {current.canManage && (
              <Button
                size="sm"
                variant="secondary"
                title={t('billing.manageHint')}
                onClick={() => portal.mutate()}
                isLoading={portal.isPending}
              >
                <CreditCard className="h-3.5 w-3.5" />
                {t('billing.manage')}
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={() => setIsComparing((open) => !open)}>
              {t(isComparing ? 'billing.hidePlans' : 'billing.comparePlans')}
            </Button>
          </div>
        </div>

        {/* --- Usage ------------------------------------------------------- */}
        <div className="mt-4 grid gap-2.5 border-t border-edge pt-3 sm:grid-cols-2">
          <Meter
            label={t('billing.usage.projects')}
            used={current.usage.projects}
            limit={current.limits.projectsPerOwner}
            format={String}
            t={t}
          />
          <Meter
            label={t('billing.usage.organizations')}
            used={current.usage.organizations}
            limit={current.limits.organizationsPerOwner}
            format={String}
            t={t}
          />
          <Meter
            label={t('billing.usage.ai')}
            used={current.usage.ai.used}
            limit={current.usage.ai.limit}
            format={String}
            note={t('billing.usage.resets', { date: formatCalendarDate(current.usage.ai.resetsAt) })}
            t={t}
          />
          {/*
            Your own desk, and only your own desk.

            The note under it is doing real work rather than decorating. This
            meter is the reader's plan applied to the reader's pages, which is
            correct here and is *not* how a project board works: a project's
            pages share one allowance sized by the project owner's plan, for
            every member of the project. Without the line, somebody on Baron
            reasonably reads "1 GB" as their personal share of every board they
            can write to. The board's own gauge says the rest — see
            `BoardGauge`.
          */}
          <Meter
            label={t('billing.usage.personalBoard')}
            used={current.usage.personalBoardBytes}
            limit={current.limits.documentBoardBytes}
            format={formatBytesUsed}
            formatLimit={formatBytesCeiling}
            note={t('billing.usage.personalBoardNote')}
            t={t}
          />
        </div>
      </div>

      {/* --- A deployment that cannot take money --------------------------- */}
      {!paymentsEnabled && (
        <p className="rounded-xl border border-dashed border-edge px-3 py-2 text-2xs leading-relaxed text-content-faint">
          <strong className="text-content-muted">{t('billing.notConfigured')}</strong>{' '}
          {t('billing.notConfiguredBody')}
        </p>
      )}

      {/* --- The comparison ------------------------------------------------ */}
      {isComparing && (
        <div className="space-y-3 rounded-2xl border border-edge bg-surface-raised p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Segmented<BillingInterval>
              label={t('billing.section')}
              value={interval}
              onChange={setInterval}
              options={[
                { value: 'MONTH', label: t('billing.monthly') },
                { value: 'YEAR', label: t('billing.yearly') },
              ]}
            />

            {/*
              The currency picker appears only when there is a choice.

              A deployment selling in one currency has nothing to ask, and a
              one-option control is a control that looks broken.
            */}
            {available.length > 1 && (
              <Segmented<Currency>
                label={t('billing.currency')}
                value={currency}
                onChange={setCurrency}
                options={available.map((code) => ({
                  value: code,
                  label: code.toUpperCase(),
                }))}
              />
            )}
          </div>

          {interval === 'YEAR' && (
            <Badge className="border-positive/40 bg-positive/10 text-positive">
              {t('billing.yearlySave')}
            </Badge>
          )}

          <div className="grid gap-2.5 lg:grid-cols-3">
            {plans.map((offer) => {
              const price = priceFor(offer);
              const isCurrent = offer.plan === current.plan;
              // Free is never bought, a plan already held is never re-bought,
              // and a plan with no price in this currency cannot be. The three
              // reasons are different and the button is absent for all of them.
              const canBuy =
                paymentsEnabled && !isGranted && !isCurrent && offer.plan !== 'FREE' && price;

              return (
                <div
                  key={offer.plan}
                  className={cn(
                    'ui-card flex flex-col gap-3 rounded-xl border p-3.5',
                    isCurrent ? 'border-brand bg-brand/[0.04]' : 'border-edge bg-surface-sunken/40',
                  )}
                >
                  <div>
                    <p className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold">{t(PLAN_NAME[offer.plan])}</span>
                      {isCurrent && (
                        <Badge className="border-brand/40 bg-brand/10 text-brand">
                          {t('billing.currentBadge')}
                        </Badge>
                      )}
                    </p>

                    <p className="mt-1 text-lg font-semibold tabular-nums">
                      {offer.plan === 'FREE'
                        ? formatPrice(0, currency, locale)
                        : price
                          ? formatPrice(price.amount, currency, locale)
                          : '—'}
                      <span className="ml-1 text-2xs font-normal text-content-faint">
                        {t(interval === 'YEAR' ? 'billing.perYear' : 'billing.perMonth')}
                      </span>
                    </p>

                    <p className="mt-1 text-2xs leading-relaxed text-content-muted">
                      {t(BLURB[offer.plan])}
                    </p>
                  </div>

                  <ul className="flex-1 space-y-1.5 border-t border-edge pt-2.5">
                    {FEATURES.map((feature) => {
                      const value = feature.render(offer.limits, t);

                      return (
                        <li
                          key={feature.key}
                          className="flex items-baseline justify-between gap-2 text-2xs"
                        >
                          <span className="text-content-faint">{t(feature.key)}</span>
                          <span className="shrink-0 font-medium tabular-nums">
                            {typeof value === 'boolean' ? (
                              value ? (
                                <Check
                                  className="h-3.5 w-3.5 text-positive"
                                  aria-label={t('billing.feature.yes')}
                                />
                              ) : (
                                <Minus
                                  className="h-3.5 w-3.5 text-content-faint"
                                  aria-label={t('billing.feature.no')}
                                />
                              )
                            ) : (
                              value
                            )}
                          </span>
                        </li>
                      );
                    })}
                  </ul>

                  {canBuy && (
                    /*
                     * Routed, not charged — payments are switched off while the
                     * rest of the product is built out.
                     *
                     * The mutation above is deliberately left wired up rather
                     * than deleted: turning this back into a checkout is one
                     * `onClick` and nothing else, and a half-removed payment
                     * path is a far worse thing to come back to than an unused
                     * one. `useStartCheckout` is still exercised by its own
                     * tests either way.
                     *
                     * A `Link` rather than a `Button onClick={navigate}`,
                     * because it is a navigation: middle-click, open-in-new-tab
                     * and a visible address are all things a person reasonably
                     * expects from something that takes them somewhere.
                     */
                    <Link
                      to={`/plans/soon?plan=${offer.plan}`}
                      className={buttonClasses({ variant: 'lava', size: 'sm', className: 'w-full' })}
                    >
                      {/*
                        The wax. `buttonClasses` hands over the tube, the edge
                        and the hover fill, and a class cannot put children
                        inside an anchor — so without this the button was a
                        *still* lamp, which reads as a broken gradient rather
                        than as a missing child. Same composition `LavaLink`
                        does on the landing page.
                      */}
                      <LavaSurface />
                      <span className="relative inline-flex items-center justify-center gap-1.5">
                        {t('billing.choosePlan', { plan: t(PLAN_NAME[offer.plan]) })}
                      </span>
                    </Link>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * One "x of y" reading, with a bar under it.
 *
 * ## Why an unmetered limit draws no bar
 *
 * Because there is nothing for it to be a fraction *of*. A full-width bar would
 * say "you have used everything" and an empty one would say "you have used
 * nothing", and both are claims about a ceiling that does not exist. The word
 * is the honest rendering.
 *
 * ## Why the bar can be full but never over
 *
 * An account that was downgraded holds more than its new plan allows, so
 * `used > limit` is a real and reachable state. The number tells the truth; the
 * bar is clamped, because a fill overflowing its track reads as a rendering
 * fault rather than as a message. See `usageFraction`.
 */
const Meter = ({
  label,
  used,
  limit,
  format,
  formatLimit,
  note,
  t,
}: {
  label: string;
  used: number;
  limit: Limit;
  format: (value: number) => string;
  formatLimit?: (value: number) => string;
  note?: string;
  t: Translate;
}) => {
  const fraction = usageFraction(used, limit);

  return (
    <div className="min-w-0">
      <p className="flex items-baseline justify-between gap-2 text-2xs">
        <span className="truncate text-content-faint">{label}</span>
        <span className="shrink-0 font-medium tabular-nums">
          {format(used)}{' '}
          <span className="font-normal text-content-faint">
            {limit === null
              ? t('billing.limit.unlimited')
              : t('billing.limit.ofLimit', { limit: (formatLimit ?? format)(limit) })}
          </span>
        </span>
      </p>

      {fraction !== null && (
        <div
          className="mt-1 h-1 overflow-hidden rounded-full bg-surface-sunken"
          role="progressbar"
          aria-valuenow={Math.round(fraction * 100)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={label}
        >
          <div
            className={cn(
              'h-full rounded-full',
              // Three bands, because "nearly full" is the state worth noticing
              // and a single colour cannot say it. The threshold is where a
              // reader still has time to act rather than where they are stuck.
              fraction >= 1 ? 'bg-danger' : fraction >= 0.8 ? 'bg-warning' : 'bg-brand',
            )}
            style={{ width: `${Math.max(2, fraction * 100)}%` }}
          />
        </div>
      )}

      {note && <p className="mt-0.5 text-3xs text-content-faint">{note}</p>}
    </div>
  );
};
