import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { AlertTriangle, Check, Copy, Plus, Send, Webhook } from 'lucide-react';

import {
  useCreateWebhook,
  useDeleteWebhook,
  useProjectWebhooks,
  useTestWebhook,
  useUpdateWebhook,
} from '@/entities/integration/model/queries';
import type {
  ProjectWebhook,
  WebhookEvent,
  WebhookFlavour,
} from '@/entities/integration/model/types';
import { formatRelative } from '@/shared/lib/dates';
import { cn } from '@/shared/lib/cn';
import { Button, EmptyState, Input, Skeleton, Switch } from '@/shared/ui';
import { useT, type TranslationKey } from '@/shared/i18n';

/**
 * Every event a hook can subscribe to, with the sentence the composer shows.
 *
 * Duplicated from the API's `WEBHOOK_EVENTS` rather than fetched, and that is
 * a deliberate trade. Fetching would keep one list; it would also mean a
 * request before the composer can draw its checkboxes, and a slug arriving
 * from the server with no translation for it — which is the failure this
 * table's `TranslationKey` typing makes impossible at compile time instead.
 *
 * The API is still the authority: it drops slugs it does not recognise rather
 * than rejecting the request, so a client one release ahead degrades to the
 * events they have in common instead of breaking.
 */
const EVENT_LABEL: Record<WebhookEvent, TranslationKey> = {
  'task.created': 'webhooks.event.taskCreated',
  'task.completed': 'webhooks.event.taskCompleted',
  'task.deleted': 'webhooks.event.taskDeleted',
  'meeting.scheduled': 'webhooks.event.meetingScheduled',
  'member.joined': 'webhooks.event.memberJoined',
  'project.completed': 'webhooks.event.projectCompleted',
};

const ALL_EVENTS = Object.keys(EVENT_LABEL) as WebhookEvent[];

/** What the destination is called, once its hostname has been recognised. */
const FLAVOUR_LABEL: Record<WebhookFlavour, TranslationKey> = {
  discord: 'webhooks.flavour.discord',
  slack: 'webhooks.flavour.slack',
  generic: 'webhooks.flavour.generic',
};

/**
 * A press on one of the destination cards beside this panel.
 *
 * `nonce` is what makes pressing the same card twice do something twice: the
 * effect below keys off it rather than off the flavour, so a repeated press is
 * a new request rather than an unchanged prop the effect ignores.
 */
export interface ComposeRequest {
  flavour: WebhookFlavour;
  nonce: number;
}

/** The example URL each destination is recognised by. */
const FLAVOUR_PLACEHOLDER: Record<WebhookFlavour, string> = {
  discord: 'https://discord.com/api/webhooks/…',
  slack: 'https://hooks.slack.com/services/…',
  generic: 'https://example.com/task-studio',
};

interface WebhooksPanelProps {
  projectId: string;
  /** Owner or admin. The API refuses everything here below that. */
  canManage: boolean;
  /**
   * Open the composer, aimed at one destination.
   *
   * The Connections shelf draws a card per destination and this is how a press
   * on one arrives. It carries no behaviour of its own — a Discord hook and a
   * Slack hook are the same row with a different hostname — so all it changes
   * is the example URL in the field, which is the one thing somebody pressing
   * "Discord" actually needs to see.
   */
  composeRequest?: ComposeRequest | null;
}

/**
 * Where this project posts its events.
 *
 * ## Why one feature covers Discord, Slack and everything else
 *
 * Because all three take the same thing: a URL that accepts a POST. Discord
 * and Slack both hand one out from their own channel settings with no OAuth
 * and no app to install, and the only difference between them is the JSON
 * shape they want — which the API decides from the hostname and this panel
 * merely reports. Zapier, Make, n8n and somebody's own server are the same
 * again with no special-casing at all.
 *
 * That is why there is no list of supported services here and never will be: a
 * dropdown of vendors is a list somebody has to maintain, and it would be
 * wrong the week a new one appears.
 *
 * ## Why the delivery state is on the row
 *
 * Because a webhook that stops working is invisible from both ends. Nothing
 * happens, which looks exactly like nothing having happened. The last status,
 * the last error and the failure count are the only way somebody finds out the
 * URL they pasted has a typo in it — and after ten consecutive failures the
 * hook switches itself off and says so here, rather than costing a request per
 * event forever.
 */
export const WebhooksPanel = ({ projectId, canManage, composeRequest }: WebhooksPanelProps) => {
  const t = useT();

  const { data: hooks = [], isLoading } = useProjectWebhooks(projectId, canManage);
  const create = useCreateWebhook(projectId);
  const update = useUpdateWebhook(projectId);
  const remove = useDeleteWebhook(projectId);
  const test = useTestWebhook(projectId);

  const [isComposing, setIsComposing] = useState(false);
  const [url, setUrl] = useState('');
  const [events, setEvents] = useState<WebhookEvent[]>([]);
  const [secret, setSecret] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [placeholder, setPlaceholder] = useState(FLAVOUR_PLACEHOLDER.discord);

  /*
   * A press on a destination card opens the composer.
   *
   * Guarded by the nonce rather than by the whole object, because the parent
   * builds a fresh one on every render and an effect depending on that would
   * re-open a composer the reader had just closed.
   */
  const handledNonce = useRef<number | null>(null);
  const composerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!composeRequest || handledNonce.current === composeRequest.nonce) return;

    handledNonce.current = composeRequest.nonce;
    setPlaceholder(FLAVOUR_PLACEHOLDER[composeRequest.flavour]);
    setIsComposing(true);

    /*
     * Brought into view, because the card that opened it is beside this panel
     * rather than above it — on a narrow window the composer can appear a
     * screen below the thing that was pressed, which reads as nothing having
     * happened. Deferred a frame so the element exists to scroll to.
     */
    requestAnimationFrame(() =>
      composerRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }),
    );
  }, [composeRequest]);

  /*
   * Reading a project's webhooks is admin-only, and so is this panel.
   *
   * Not merely because the API refuses — it does — but because the URL *is*
   * the credential for most destinations. A Discord incoming webhook URL
   * visible to every member is a URL any member can post to as the project,
   * forever, including after they leave.
   */
  if (!canManage) {
    return (
      <EmptyState
        icon={<Webhook className="h-6 w-6" />}
        title={t('webhooks.adminOnly')}
        description={t('webhooks.adminOnlyBody')}
      />
    );
  }

  const submit = async () => {
    if (url.trim().length === 0) return;

    const created = await create.mutateAsync({ url: url.trim(), events });
    setSecret(created.secret);
    setIsComposing(false);
    setUrl('');
    setEvents([]);
    setCopied(false);
  };

  const copySecret = async () => {
    if (!secret) return;
    try {
      await navigator.clipboard.writeText(secret);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2_000);
    } catch {
      toast.error(t('webhooks.copyFailed'));
    }
  };

  const toggleEvent = (event: WebhookEvent) =>
    setEvents((current) =>
      current.includes(event) ? current.filter((entry) => entry !== event) : [...current, event],
    );

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 2 }, (_, index) => (
          <Skeleton key={index} className="h-20 rounded-2xl" />
        ))}
      </div>
    );
  }

  return (
    <section className="space-y-4">
      <header className="flex flex-wrap items-baseline gap-x-2">
        <h2 className="text-sm font-semibold tracking-tight">{t('webhooks.title')}</h2>
        <p className="text-2xs text-content-faint">{t('webhooks.subtitle')}</p>
      </header>

      {/* --- The signing secret, once ------------------------------------- */}
      {secret && (
        <div className="space-y-2 rounded-xl border border-brand/40 bg-brand/[0.06] p-3">
          <p className="text-2xs font-medium text-brand">{t('webhooks.secretNow')}</p>

          <div className="flex items-center gap-1.5">
            <input
              readOnly
              value={secret}
              onFocus={(event) => event.currentTarget.select()}
              aria-label={t('webhooks.secretLabel')}
              className="field h-8 flex-1 py-0 font-mono text-3xs"
            />
            <Button
              size="sm"
              variant={copied ? 'secondary' : 'primary'}
              onClick={() => void copySecret()}
              className="h-8 shrink-0 gap-1.5 px-2.5 text-2xs"
            >
              {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
              {t(copied ? 'webhooks.copied' : 'webhooks.copy')}
            </Button>
          </div>

          <p className="text-3xs leading-relaxed text-content-muted">
            {t('webhooks.secretExplain')}
          </p>

          <Button
            size="sm"
            variant="ghost"
            onClick={() => setSecret(null)}
            className="h-6 px-2 text-3xs"
          >
            {t('webhooks.dismissSecret')}
          </Button>
        </div>
      )}

      {/* --- The hooks ---------------------------------------------------- */}
      {hooks.length === 0 && !isComposing ? (
        <EmptyState
          icon={<Webhook className="h-6 w-6" />}
          title={t('webhooks.none')}
          description={t('webhooks.noneBody')}
          action={
            <Button size="sm" variant="secondary" onClick={() => setIsComposing(true)}>
              <Plus className="h-3.5 w-3.5" strokeWidth={2.8} />
              {t('webhooks.new')}
            </Button>
          }
        />
      ) : (
        <ul className="space-y-2">
          {hooks.map((hook) => (
            <li key={hook.id}>
              <WebhookRow
                hook={hook}
                onToggle={(isEnabled) => update.mutate({ id: hook.id, isEnabled })}
                onTest={() => test.mutate(hook.id)}
                isTesting={test.isPending && test.variables === hook.id}
                onRemove={() => remove.mutate(hook.id)}
              />
            </li>
          ))}
        </ul>
      )}

      {/* --- The composer -------------------------------------------------- */}
      {isComposing ? (
        <div
          ref={composerRef}
          className="space-y-3 rounded-2xl border border-edge bg-surface-raised p-4"
        >
          <Input
            label={t('webhooks.url')}
            name="webhookUrl"
            value={url}
            onChange={(event) => setUrl(event.target.value.slice(0, 2000))}
            placeholder={placeholder}
            autoFocus
          />

          <p className="text-2xs leading-relaxed text-content-muted">
            {t('webhooks.urlHint')}
          </p>

          <div className="space-y-1.5">
            <p className="text-3xs font-semibold uppercase tracking-[0.14em] text-content-faint">
              {t('webhooks.eventsTitle')}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {ALL_EVENTS.map((event) => {
                const on = events.includes(event);
                return (
                  <button
                    key={event}
                    type="button"
                    onClick={() => toggleEvent(event)}
                    aria-pressed={on}
                    className={cn(
                      'rounded-full border px-2.5 py-1 text-3xs transition-colors',
                      on
                        ? 'border-brand bg-brand/12 text-brand'
                        : 'border-edge text-content-muted hover:text-content',
                    )}
                  >
                    {t(EVENT_LABEL[event])}
                  </button>
                );
              })}
            </div>
            {/* Empty means everything, which is the API's default and what
                most people want from a notification hook. Said here so an
                untouched selection does not read as "nothing selected". */}
            <p className="text-3xs text-content-faint">
              {events.length === 0 ? t('webhooks.allEvents') : t('webhooks.someEvents')}
            </p>
          </div>

          <div className="flex flex-wrap gap-1.5">
            <Button
              size="sm"
              onClick={() => void submit()}
              isLoading={create.isPending}
              disabled={url.trim().length === 0}
            >
              {t('webhooks.add')}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setIsComposing(false)}>
              {t('common.cancel')}
            </Button>
          </div>
        </div>
      ) : (
        hooks.length > 0 && (
          <Button size="sm" variant="secondary" onClick={() => setIsComposing(true)}>
            <Plus className="h-3.5 w-3.5" strokeWidth={2.8} />
            {t('webhooks.new')}
          </Button>
        )
      )}
    </section>
  );
};

interface WebhookRowProps {
  hook: ProjectWebhook;
  onToggle: (isEnabled: boolean) => void;
  onTest: () => void;
  isTesting: boolean;
  onRemove: () => void;
}

const WebhookRow = ({ hook, onToggle, onTest, isTesting, onRemove }: WebhookRowProps) => {
  const t = useT();
  const [isConfirmingRemove, setIsConfirmingRemove] = useState(false);

  /*
   * The path is hidden and the host is not.
   *
   * For Discord and Slack the path *is* the secret — anybody holding the whole
   * URL can post to that channel — and this panel is read by every admin on
   * the project and over anybody's shoulder. The host is what identifies which
   * hook is which, which is the only thing the row actually needs to say.
   */
  const host = (() => {
    try {
      return new URL(hook.url).host;
    } catch {
      return hook.url.slice(0, 40);
    }
  })();

  const failing = hook.failureCount > 0;

  return (
    <div className="space-y-2 rounded-2xl border border-edge bg-surface-raised p-3">
      <div className="flex items-start gap-2.5">
        <span
          aria-hidden
          className={cn(
            'mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg',
            hook.isEnabled ? 'bg-brand/12 text-brand' : 'bg-surface-sunken text-content-faint',
          )}
        >
          <Webhook className="h-4 w-4" />
        </span>

        <div className="min-w-0 flex-1 leading-tight">
          <p className="flex items-center gap-1.5 truncate text-xs font-semibold">
            <span className="truncate">{host}</span>
            <span className="shrink-0 rounded-full border border-edge px-1.5 text-4xs uppercase tracking-wider text-content-faint">
              {t(FLAVOUR_LABEL[hook.flavour])}
            </span>
          </p>
          <p className="mt-0.5 text-3xs text-content-faint">
            {hook.events.length === 0
              ? t('webhooks.allEvents')
              : hook.events.map((event) => t(EVENT_LABEL[event])).join(' · ')}
          </p>
        </div>

        <Switch
          checked={hook.isEnabled}
          onChange={onToggle}
          label=""
          aria-label={t('webhooks.enabled')}
          className="shrink-0"
        />
      </div>

      {/* --- What happened last ------------------------------------------- */}
      {(hook.lastAttemptAt || hook.lastError) && (
        <p
          className={cn(
            'flex items-start gap-1.5 rounded-lg px-2.5 py-1.5 text-3xs leading-snug',
            failing ? 'bg-warning/10 text-warning' : 'bg-surface-sunken text-content-faint',
          )}
        >
          {failing && <AlertTriangle aria-hidden className="mt-0.5 h-3 w-3 shrink-0" />}
          <span>
            {hook.lastError ??
              t('webhooks.lastOk', { status: String(hook.lastStatus ?? 200) })}
            {hook.lastAttemptAt && ` · ${formatRelative(hook.lastAttemptAt)}`}
            {hook.failureCount > 1 &&
              ` · ${t('webhooks.failures', { count: String(hook.failureCount) })}`}
          </span>
        </p>
      )}

      <div className="flex flex-wrap items-center gap-1.5">
        <Button
          size="sm"
          variant="ghost"
          onClick={onTest}
          isLoading={isTesting}
          className="h-6 gap-1 px-2 text-3xs"
        >
          <Send className="h-3 w-3" />
          {t('webhooks.test')}
        </Button>

        {isConfirmingRemove ? (
          <>
            <Button
              size="sm"
              variant="danger"
              onClick={onRemove}
              className="h-6 px-2 text-3xs"
            >
              {t('webhooks.removeConfirm')}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setIsConfirmingRemove(false)}
              className="h-6 px-2 text-3xs"
            >
              {t('common.cancel')}
            </Button>
          </>
        ) : (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setIsConfirmingRemove(true)}
            className="ml-auto h-6 px-2 text-3xs text-danger hover:text-danger"
          >
            {t('webhooks.remove')}
          </Button>
        )}
      </div>
    </div>
  );
};
