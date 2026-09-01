import type { ReactNode } from 'react';
import { Check, Code2, Github, Link2, MessageSquare, Plug, Radio, Webhook } from 'lucide-react';

import { useCalendarStatus } from '@/entities/integration/model/queries';
import type { ProjectRepository } from '@/entities/project/model/types';
import { CliConnectionCard } from '@/features/cli/ui/cli-connection-card';
import { GoogleCalendarMark } from '@/features/calendar-sync/ui/google-calendar-mark';
import { WebhooksPanel } from '@/features/webhooks/ui/webhooks-panel';
import { cn } from '@/shared/lib/cn';
import { EmptyState } from '@/shared/ui';
import { useT, type TranslationKey } from '@/shared/i18n';

interface ConnectionsPanelProps {
  projectId: string;
  repository: ProjectRepository | null;
  /** Owner or admin. Everything here leaves the project, so everything here is theirs. */
  canManage: boolean;
}

/** How a service reads on the shelf: what it is, and whether it is on. */
interface ServiceCardProps {
  name: TranslationKey;
  what: TranslationKey;
  mark: ReactNode;
  /** `null` when the service has no per-project on/off to report. */
  isConnected: boolean | null;
  /** What the reader should press, and where it takes them. */
  action?: { label: TranslationKey; onSelect: () => void };
  /** Set for a service listed for completeness rather than offered. */
  isAvailable?: boolean;
}

/**
 * One service, drawn the same whether it is a chat channel or a repository.
 *
 * The uniformity is the point of the whole tab. Before this, a webhook was a
 * row in a list with a composer, a calendar was a badge on a different page and
 * a repository was a button next to a title — three connections, three shapes,
 * three places, and no screen anywhere that answered "what does this project
 * talk to". A card that looks the same for all of them is what makes that
 * question answerable at a glance.
 */
const ServiceCard = ({
  name,
  what,
  mark,
  isConnected,
  action,
  isAvailable = true,
}: ServiceCardProps) => {
  const t = useT();

  return (
    <li
      className={cn(
        'ui-card flex items-start gap-3 rounded-2xl border border-edge bg-surface-raised p-3',
        !isAvailable && 'opacity-60',
      )}
    >
      <span
        aria-hidden
        className={cn(
          'mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl',
          isConnected ? 'bg-positive/12 text-positive' : 'bg-surface-sunken text-content-muted',
        )}
      >
        {mark}
      </span>

      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 text-sm font-semibold">
          {t(name)}
          {isConnected && (
            <span className="inline-flex items-center gap-1 rounded-full border border-positive/40 bg-positive/[0.08] px-1.5 py-px text-[9px] font-medium uppercase tracking-wide text-positive">
              <Check className="h-2.5 w-2.5" />
              {t('connections.connected')}
            </span>
          )}
        </p>
        <p className="mt-0.5 text-[11px] leading-relaxed text-content-muted">{t(what)}</p>
      </div>

      {action && isAvailable && (
        <button
          type="button"
          onClick={action.onSelect}
          className={cn(
            'shrink-0 rounded-lg border border-edge px-2.5 py-1 text-[11px] font-medium',
            'text-content-muted transition-colors hover:border-brand/50 hover:text-content',
          )}
        >
          {t(action.label)}
        </button>
      )}

      {!isAvailable && (
        <span className="shrink-0 text-[10px] uppercase tracking-wide text-content-faint">
          {t('connections.soon')}
        </span>
      )}
    </li>
  );
};

/** A section of the shelf, with the sentence that says why these are together. */
const Group = ({
  title,
  hint,
  icon,
  children,
}: {
  title: TranslationKey;
  hint: TranslationKey;
  icon: ReactNode;
  children: ReactNode;
}) => {
  const t = useT();

  return (
    <section className="space-y-2">
      <header className="space-y-0.5">
        <h3 className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-content-faint">
          {icon}
          {t(title)}
        </h3>
        <p className="text-[11px] leading-relaxed text-content-muted">{t(hint)}</p>
      </header>
      {children}
    </section>
  );
};

/**
 * Everything this project talks to, on one shelf.
 *
 * ## Why this replaced the webhooks tab
 *
 * Because "Webhooks" named a *mechanism*, and nobody arrives looking for a
 * mechanism. They arrive wanting the board to post into Discord, or the
 * meetings to show up on a phone, or a way back to the repository — and each of
 * those was somewhere else: a tab, a badge on the meetings page, a button on
 * the title. There was no screen that answered "what does this project connect
 * to", which is the question people actually have, and the one a tab called
 * Connections can be found by.
 *
 * ## Why three groups, and why these three
 *
 * They are separated by *what the connection does to the project*, which is the
 * only division that changes how carefully somebody should read it:
 *
 *   - **Broadcast** sends this project's events outward and changes nothing
 *     here. The risk is somebody else's channel getting noisy.
 *   - **Sync** keeps two records in step, so the outside can change things
 *     *inside* the project — a meeting moved in Google moves here.
 *   - **Features** change what the project can do. Linking a repository is
 *     what makes a branch on a task mean anything.
 *   - **Your editor** is the odd one out and is last for that reason: nothing
 *     in it happens on this server. It is four commands somebody types on their
 *     own machine, and the shelf's job there is to say they exist.
 *
 * Sorting by vendor would have put Discord and Google next to each other and
 * hidden that Google can move your meetings and Discord cannot.
 *
 * ## Why the calendar is here but marked personal
 *
 * It is the one connection on this tab that belongs to the *reader* rather than
 * to the project — one person connects once and every project they are on is
 * covered. Leaving it off would make the shelf a lie by omission ("this project
 * does not sync to a calendar" is false); putting it on without the label would
 * make an admin think they had connected it for the team.
 */
export const ConnectionsPanel = ({
  projectId,
  repository,
  canManage,
}: ConnectionsPanelProps) => {
  const t = useT();
  const calendar = useCalendarStatus();

  /*
   * Everything here sends this project's work somewhere outside it, so the
   * whole tab is admin-only — the same bar as managing the roster, and the
   * same reasoning the webhooks tab used: for most destinations the URL *is*
   * the credential.
   *
   * The tab itself is hidden from members by the page, so this is the second
   * line rather than the first.
   */
  if (!canManage) {
    return (
      <EmptyState
        icon={<Plug className="h-6 w-6" />}
        title={t('connections.adminOnly')}
        description={t('connections.adminOnlyBody')}
      />
    );
  }

  const isCalendarLive = Boolean(calendar.data?.connection?.isEnabled);

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h2 className="text-sm font-semibold">{t('connections.title')}</h2>
        <p className="max-w-prose text-[11px] leading-relaxed text-content-muted">
          {t('connections.body')}
        </p>
      </header>

      {/* --- Broadcast ---------------------------------------------------- */}
      <Group
        title="connections.broadcast"
        hint="connections.broadcastHint"
        icon={<Radio className="h-3 w-3" />}
      >
        {/*
          The three destinations are one feature, so they are drawn as one
          panel rather than three cards with a "connect" button each.

          A Discord hook, a Slack hook and somebody's own endpoint differ only
          in the JSON shape the API picks from the hostname — there is nothing
          to choose between them at this level, and three cards that all open
          the same composer would be three doors into one room. The cards below
          say what is possible; the panel is where it is done.
        */}
        <ul className="grid gap-2 sm:grid-cols-3">
          <ServiceCard
            name="connections.svc.discord"
            what="connections.svc.discordWhat"
            mark={<MessageSquare className="h-4 w-4" />}
            isConnected={null}
          />
          <ServiceCard
            name="connections.svc.slack"
            what="connections.svc.slackWhat"
            mark={<MessageSquare className="h-4 w-4" />}
            isConnected={null}
          />
          <ServiceCard
            name="connections.svc.webhook"
            what="connections.svc.webhookWhat"
            mark={<Webhook className="h-4 w-4" />}
            isConnected={null}
          />
        </ul>

        <div className="rounded-2xl border border-edge bg-surface-sunken/40 p-3">
          <WebhooksPanel projectId={projectId} canManage={canManage} />
        </div>
      </Group>

      {/* --- Sync ---------------------------------------------------------- */}
      <Group
        title="connections.sync"
        hint="connections.syncHint"
        icon={<Link2 className="h-3 w-3" />}
      >
        <ul className="grid gap-2 sm:grid-cols-2">
          <ServiceCard
            name="connections.svc.googleCalendar"
            what="connections.svc.googleCalendarWhat"
            mark={<GoogleCalendarMark className="h-4 w-4" />}
            isConnected={isCalendarLive}
            // Settings, not a dialog here: connecting is an OAuth consent
            // flow, and it is a fact about the account rather than about this
            // project — see `CalendarConnectionPanel`.
            action={{
              label: isCalendarLive ? 'connections.manage' : 'connections.connect',
              onSelect: () => {
                window.location.assign('/settings');
              },
            }}
            isAvailable={Boolean(calendar.data?.available)}
          />
        </ul>
        <p className="text-[10px] leading-relaxed text-content-faint">
          {t('connections.personalHint')}
        </p>
      </Group>

      {/* --- Features ------------------------------------------------------ */}
      <Group
        title="connections.features"
        hint="connections.featuresHint"
        icon={<Plug className="h-3 w-3" />}
      >
        <ul className="grid gap-2 sm:grid-cols-2">
          <ServiceCard
            name="connections.svc.github"
            what="connections.svc.githubWhat"
            mark={<Github className="h-4 w-4" />}
            isConnected={Boolean(repository)}
            /*
              No button, and that is deliberate rather than an omission.

              The control that connects a repository lives beside the project's
              name, where somebody looking for the code will find it — and a
              second one here would be two places that do the same thing, which
              is how they drift. The card's job on this shelf is to say whether
              it is on.
            */
          />
          <ServiceCard
            name="connections.svc.trello"
            what="connections.svc.trelloWhat"
            mark={<Plug className="h-4 w-4" />}
            /*
              Listed, and honestly not connectable from here.

              A Trello import creates a *new* project from a board export — it
              is a thing you do once, at creation, and there is nothing to
              connect an existing project to. Leaving it off the shelf would
              have people asking for a feature that exists; drawing it with a
              button would be a button that cannot work.
            */
            isConnected={null}
            isAvailable={false}
          />
        </ul>
      </Group>

      {/* --- Your editor ---------------------------------------------------

          Last, and structurally different from everything above it.

          Every other group on this shelf describes something the *server* does
          on the project's behalf — it posts, it syncs, it reads a repository.
          This one describes something the reader does on their own machine,
          which is why the card opens instead of connecting: there is no button
          this application could offer that would install a CLI.

          It earns its place here anyway, because "what does this project
          connect to" is the question the tab exists to answer, and an editor
          that can create tasks and close them with a commit is the largest
          answer on the page. */}
      <Group
        title="connections.editor"
        hint="connections.editorHint"
        icon={<Code2 className="h-3 w-3" />}
      >
        <CliConnectionCard />
      </Group>
    </div>
  );
};
