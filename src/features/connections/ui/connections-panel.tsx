import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Code2, Link2, Plug, Radio } from 'lucide-react';

import {
  useCalendarStatus,
  useFigmaAvailability,
  useProjectWebhooks,
} from '@/entities/integration/model/queries';
import { useBoardStatus, useProjectBoardSync } from '@/entities/integration/model/boards.queries';
import type { BoardProvider, WebhookFlavour } from '@/entities/integration/model/types';
import { BoardSyncDialog } from '@/features/board-sync/ui/board-sync-dialog';
import type { ProjectFigma, ProjectRepository } from '@/entities/project/model/types';
import { CliConnectionCard } from '@/features/cli/ui/cli-connection-card';
import { FigmaLinkDialog } from '@/features/project-management/ui/figma-link';
import { RepositoryLinkDialog } from '@/features/project-management/ui/repository-link';
import { WebhooksPanel, type ComposeRequest } from '@/features/webhooks/ui/webhooks-panel';
import { cn } from '@/shared/lib/cn';
import {
  DiscordMark,
  EmptyState,
  FigmaMark,
  GitHubMark,
  GoogleCalendarMark,
  JiraMark,
  SlackMark,
  TrelloMark,
  WebhookMark,
} from '@/shared/ui';
import { useT, type TranslationKey } from '@/shared/i18n';

interface ConnectionsPanelProps {
  projectId: string;
  repository: ProjectRepository | null;
  /** The design file this project works against, if one is connected. */
  figma: ProjectFigma | null;
  /** Owner or admin. Everything here leaves the project, so everything here is theirs. */
  canManage: boolean;
}

/** How a service reads on the shelf: what it is, and whether it is on. */
interface ServiceCardProps {
  name: TranslationKey;
  mark: ReactNode;
  isConnected: boolean;
  /** What pressing the card does. Absent for a service listed but not offered. */
  onSelect?: () => void;
  /** Set for a service listed for completeness rather than offered. */
  isAvailable?: boolean;
  /**
   * What the badge says when the service is not available, and why it exists. The default is
   * "Soon", which is right for Trello — a connection that does not exist yet.
   */
  unavailableLabel?: TranslationKey;
  /** A sentence for the badge's tooltip when the service is unavailable. */
  unavailableHint?: TranslationKey;
  /** The narrow variant that sits beside the webhooks panel. */
  compact?: boolean;
  /** A word in the corner — used by the calendar to say whose connection it is. */
  note?: { label: TranslationKey; hint: TranslationKey };
}

/**
 * One service, drawn the same whether it is a chat channel or a repository. The uniformity is the
 * point of the whole tab.
 */
const ServiceCard = ({
  name,
  mark,
  isConnected,
  onSelect,
  isAvailable = true,
  unavailableLabel = 'connections.soon',
  unavailableHint,
  compact = false,
  note,
}: ServiceCardProps) => {
  const t = useT();

  const status = isAvailable
    ? t(isConnected ? 'connections.connected' : 'connections.connect')
    : t(unavailableLabel);

  const body = (
    <>
      {/* Big enough to be recognised, and in the service's own colours. The chip was 36px
          holding a 16px single-weight line icon, which at a glance is a grey smudge. */}
      <span
        aria-hidden
        className={cn(
          'grid shrink-0 place-items-center rounded-xl border transition-colors',
          compact ? 'h-10 w-10' : 'h-12 w-12',
          isConnected ? 'border-positive/30 bg-positive/[0.08]' : 'border-edge bg-surface-sunken',
          !isAvailable && 'opacity-50 grayscale',
        )}
      >
        {mark}
      </span>

      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold tracking-tight">{t(name)}</span>
        {note && (
          <span
            title={t(note.hint)}
            className="mt-0.5 inline-block text-3xs uppercase tracking-wide text-content-faint"
          >
            {t(note.label)}
          </span>
        )}
      </span>

      {/* Vertically centred by the row itself — see the note above. */}
      <span
        title={isAvailable || !unavailableHint ? status : t(unavailableHint)}
        className={cn(
          'shrink-0 rounded-full border px-2 py-0.5 text-3xs font-medium uppercase tracking-wide',
          isConnected
            ? 'border-positive/40 text-positive'
            : 'border-edge text-content-muted group-hover:border-brand/50 group-hover:text-content',
          !isAvailable && 'border-dashed text-content-faint',
        )}
      >
        {status}
      </span>
    </>
  );

  const shell = cn(
    'group flex w-full items-center rounded-2xl border text-left transition-colors duration-150',
    compact ? 'gap-2.5 p-2.5' : 'gap-3 p-3',
    isConnected ? 'neon-ring border-transparent' : 'ui-card border-edge bg-surface-raised',
    onSelect && !isConnected && 'hover:border-brand/50 hover:bg-surface-sunken/40',
    !isAvailable && 'opacity-70',
  );

  return (
    <li>
      {onSelect && isAvailable ? (
        <button
          type="button"
          onClick={onSelect}
          className={cn(
            shell,
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50',
            'focus-visible:ring-offset-1 focus-visible:ring-offset-surface',
          )}
        >
          {body}
        </button>
      ) : (
        <div className={cn(shell, 'cursor-default')}>{body}</div>
      )}
    </li>
  );
};

/**
 * A section of the shelf. The heading was 11px uppercase in `text-content-faint` — the quietest
 * colour the palette has, at the smallest size in the app.
 */
const Group = ({
  title,
  icon,
  children,
}: {
  title: TranslationKey;
  icon: ReactNode;
  children: ReactNode;
}) => {
  const t = useT();

  return (
    <section className="space-y-2.5">
      <h3 className="ui-section-title flex items-center gap-2 text-base font-semibold tracking-tight text-content">
        <span
          aria-hidden
          className="grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-brand/12 text-brand"
        >
          {icon}
        </span>
        {t(title)}
      </h3>
      {children}
    </section>
  );
};

/** Everything this project talks to, on one shelf. */
export const ConnectionsPanel = ({
  projectId,
  repository,
  figma,
  canManage,
}: ConnectionsPanelProps) => {
  const t = useT();
  const navigate = useNavigate();
  const calendar = useCalendarStatus();
  const figmaAvailability = useFigmaAvailability();

  // The same query the webhooks panel below already runs, so this costs one cache read rather than
  // a request: React Query dedupes on the key.
  const { data: hooks = [] } = useProjectWebhooks(projectId, canManage);

  const connectedFlavours = useMemo(
    () => new Set(hooks.filter((hook) => hook.isEnabled).map((hook) => hook.flavour)),
    [hooks],
  );

  // A request the webhooks panel picks up, rather than a second composer here. Pressing Discord has
  // to end at the one form that creates a hook — there is exactly one.
  const [compose, setCompose] = useState<ComposeRequest | null>(null);
  const requestCompose = useCallback(
    (flavour: WebhookFlavour) => setCompose({ flavour, nonce: Date.now() }),
    [],
  );

  const [isRepositoryDialogOpen, setIsRepositoryDialogOpen] = useState(false);
  const [boardDialog, setBoardDialog] = useState<BoardProvider | null>(null);
  const boardSync = useProjectBoardSync(projectId, canManage);
  const boards = useBoardStatus(canManage);
  const syncedWith = boardSync.data?.link?.isConnected ? boardSync.data.link.provider : null;
  const [isFigmaDialogOpen, setIsFigmaDialogOpen] = useState(false);

  // Everything here sends this project's work somewhere outside it, so the whole tab is admin-only
  // — the same bar as managing the roster, and the same reasoning the webhooks tab used.
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
    <div className="space-y-7">
      {/* --- Broadcast ---------------------------------------------------- */}
      <Group title="connections.broadcast" icon={<Radio className="h-3.5 w-3.5" />}>
        {/* The destinations beside the panel, not stacked above it. They were a full-width row
            of three cards sitting on top of the webhooks panel, which read as a chooser. */}
        <div className="grid items-start gap-3 lg:grid-cols-[minmax(0,1fr)_15rem]">
          <div className="rounded-2xl border border-edge bg-surface-sunken/40 p-3">
            <WebhooksPanel projectId={projectId} canManage={canManage} composeRequest={compose} />
          </div>

          <ul className="flex flex-col gap-2">
            <ServiceCard
              compact
              name="connections.svc.discord"
              mark={<DiscordMark className="h-7 w-7" />}
              isConnected={connectedFlavours.has('discord')}
              onSelect={() => requestCompose('discord')}
            />
            <ServiceCard
              compact
              name="connections.svc.slack"
              mark={<SlackMark className="h-7 w-7" />}
              isConnected={connectedFlavours.has('slack')}
              onSelect={() => requestCompose('slack')}
            />
            <ServiceCard
              compact
              name="connections.svc.webhook"
              mark={<WebhookMark className="h-7 w-7" />}
              isConnected={connectedFlavours.has('generic')}
              onSelect={() => requestCompose('generic')}
            />
          </ul>
        </div>
      </Group>

      {/* --- Sync ---------------------------------------------------------- */}
      <Group title="connections.sync" icon={<Link2 className="h-3.5 w-3.5" />}>
        <ul className="grid gap-2 sm:grid-cols-2">
          <ServiceCard
            name="connections.svc.googleCalendar"
            mark={<GoogleCalendarMark className="h-8 w-8" />}
            isConnected={isCalendarLive}
            // Settings, not a dialog here: connecting is an OAuth consent flow, and it is a fact
            // about the account rather than about this project — see `CalendarConnectionPanel`.
            onSelect={() => navigate('/settings')}
            isAvailable={Boolean(calendar.data?.available)}
            note={{ label: 'connections.personal', hint: 'connections.personalHint' }}
          />
          {/* One board per project: the other provider's card stays pressable to show which one. */}
          <ServiceCard
            name="connections.svc.trello"
            mark={<TrelloMark className="h-8 w-8" />}
            isConnected={syncedWith === 'TRELLO'}
            onSelect={() => setBoardDialog('TRELLO')}
            isAvailable={Boolean(boards.data?.trello.available) || syncedWith === 'TRELLO'}
            unavailableLabel="boards.notEnabled"
            unavailableHint="boards.unavailableHint"
          />
          <ServiceCard
            name="connections.svc.jira"
            mark={<JiraMark className="h-8 w-8" />}
            isConnected={syncedWith === 'JIRA'}
            onSelect={() => setBoardDialog('JIRA')}
            isAvailable={Boolean(boards.data?.jira.available) || syncedWith === 'JIRA'}
            unavailableLabel="boards.notEnabled"
            unavailableHint="boards.unavailableHint"
          />
        </ul>
      </Group>

      {/* --- Features ------------------------------------------------------ */}
      <Group title="connections.features" icon={<Plug className="h-3.5 w-3.5" />}>
        <ul className="grid gap-2 sm:grid-cols-2">
          <ServiceCard
            name="connections.svc.github"
            mark={<GitHubMark className="h-8 w-8" />}
            isConnected={Boolean(repository)}
            /* The card opens the same dialog the control beside the project's name opens — one
               implementation, two doors, which is the only arrangement that cannot drift. */
            onSelect={() =>
              repository
                ? window.open(repository.url, '_blank', 'noopener,noreferrer')
                : setIsRepositoryDialogOpen(true)
            }
          />
          {/* Beside GitHub, because they are the same kind of connection. Both are *features*
              rather than broadcasts or syncs: linking one changes what the project can do. */}
          <ServiceCard
            name="figma.name"
            mark={<FigmaMark className="h-9 w-6" />}
            isConnected={Boolean(figma)}
            /* A deployment with no encryption key cannot keep a Figma credential, and the card says
               so rather than offering a form that fails on submit. */
            isAvailable={Boolean(figmaAvailability.data?.available)}
            unavailableLabel="figma.unavailable"
            unavailableHint="figma.unavailableHint"
            onSelect={() =>
              figma
                ? window.open(figma.url, '_blank', 'noopener,noreferrer')
                : setIsFigmaDialogOpen(true)
            }
          />
        </ul>
      </Group>

      {/* --- Your editor ---
          Last, and structurally different from everything above it. */}
      <Group title="connections.editor" icon={<Code2 className="h-3.5 w-3.5" />}>
        <CliConnectionCard />
      </Group>

      <RepositoryLinkDialog
        projectId={projectId}
        repository={repository}
        isOpen={isRepositoryDialogOpen}
        onClose={() => setIsRepositoryDialogOpen(false)}
      />

      <FigmaLinkDialog
        projectId={projectId}
        figma={figma}
        isOpen={isFigmaDialogOpen}
        onClose={() => setIsFigmaDialogOpen(false)}
      />

      <BoardSyncDialog
        projectId={projectId}
        provider={boardDialog ?? 'TRELLO'}
        isOpen={boardDialog !== null}
        onClose={() => setBoardDialog(null)}
      />
    </div>
  );
};
