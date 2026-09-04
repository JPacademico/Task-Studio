import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Code2, Link2, Plug, Radio } from 'lucide-react';

import {
  useCalendarStatus,
  useFigmaAvailability,
  useProjectWebhooks,
} from '@/entities/integration/model/queries';
import type { WebhookFlavour } from '@/entities/integration/model/types';
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
   * What the badge says when the service is not available, and why it exists.
   *
   * The default is "Soon", which is right for Trello — a connection that does
   * not exist yet — and wrong for one that exists and is simply *switched off
   * here*. A reader told "Soon" about Figma will wait for a release; told
   * "Not enabled here" they will go and ask whoever runs the deployment, which
   * is the action that actually gets them the feature.
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
 * One service, drawn the same whether it is a chat channel or a repository.
 *
 * The uniformity is the point of the whole tab. Before this, a webhook was a
 * row in a list with a composer, a calendar was a badge on a different page and
 * a repository was a button next to a title — three connections, three shapes,
 * three places, and no screen anywhere that answered "what does this project
 * talk to". A card that looks the same for all of them is what makes that
 * question answerable at a glance.
 *
 * ## Why the whole card is the control
 *
 * It used to be a card with a small "Connect" button on its right edge, which
 * made a 300px-wide target out of a 60px one and put the only live pixel in
 * the corner furthest from where the eye lands. Every card here does exactly
 * one thing, so there is nothing for a button to disambiguate — the card *is*
 * the button, and the word that used to be on the button is now a label saying
 * which of the two states you are looking at.
 *
 * ## Why the state word is a label and not a control
 *
 * Because on a connected service it was a lie: pressing "Connect" on something
 * already connected opened the same place as pressing the card, and reading
 * "Connect" was the only way to find out you already had. It now says
 * *Connected* or *Connect*, carries the same sentence as a tooltip, and is
 * centred against the card rather than pinned to its top edge — a status,
 * where the eye scans for one.
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
      {/*
        Big enough to be recognised, and in the service's own colours.

        The chip was 36px holding a 16px single-weight line icon, which at a
        glance is a grey smudge — the Google Calendar mark in particular was
        illegible, and Discord and Slack were not their marks at all but the
        same generic speech bubble twice. Brand marks at 24px inside a 44px
        chip are what makes the shelf scannable without reading a word of it.
      */}
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
 * A section of the shelf.
 *
 * ## Why the heading grew and the sentence under it went
 *
 * The heading was 11px uppercase in `text-content-faint` — the quietest colour
 * the palette has, at the smallest size in the app — under which sat a
 * full-width sentence in a *louder* colour explaining what the group meant.
 * The label naming the section was therefore the least visible thing in it,
 * and the reader's eye went to the explanation instead of to the cards it was
 * explaining.
 *
 * The cards say what they are. So the sentence is gone and the heading is now
 * the size of a heading, which is the ordinary way round.
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
      <h3 className="flex items-center gap-2 text-base font-semibold tracking-tight text-content">
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
 * ## Why there is no longer a heading over the whole thing
 *
 * The tab is called Connections. A page whose first line repeats the name of
 * the tab that opened it, and whose second explains what a connection is, has
 * spent its two most valuable lines telling the reader something they proved
 * they knew by clicking. The groups below are the structure; they do not need
 * an introduction.
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
  figma,
  canManage,
}: ConnectionsPanelProps) => {
  const t = useT();
  const navigate = useNavigate();
  const calendar = useCalendarStatus();
  const figmaAvailability = useFigmaAvailability();

  /*
   * The same query the webhooks panel below already runs, so this costs one
   * cache read rather than a request: React Query dedupes on the key.
   *
   * It is what lets the three broadcast cards tell the truth. They used to say
   * nothing at all about their own state — `isConnected` was hardcoded `null`
   * — so a project posting to Discord for six months drew an identical card to
   * one posting nowhere.
   */
  const { data: hooks = [] } = useProjectWebhooks(projectId, canManage);

  const connectedFlavours = useMemo(
    () => new Set(hooks.filter((hook) => hook.isEnabled).map((hook) => hook.flavour)),
    [hooks],
  );

  /*
   * A request the webhooks panel picks up, rather than a second composer here.
   *
   * Pressing Discord has to end at the one form that creates a hook — there is
   * exactly one, and a card that opened a copy of it would be a second place
   * for the URL rules to drift. The nonce is what makes pressing the same card
   * twice work: the panel reacts to the *identity* of this object, so a repeat
   * press is a new request rather than a no-op against unchanged props.
   */
  const [compose, setCompose] = useState<ComposeRequest | null>(null);
  const requestCompose = useCallback(
    (flavour: WebhookFlavour) => setCompose({ flavour, nonce: Date.now() }),
    [],
  );

  const [isRepositoryDialogOpen, setIsRepositoryDialogOpen] = useState(false);
  const [isFigmaDialogOpen, setIsFigmaDialogOpen] = useState(false);

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
    <div className="space-y-7">
      {/* --- Broadcast ---------------------------------------------------- */}
      <Group title="connections.broadcast" icon={<Radio className="h-3.5 w-3.5" />}>
        {/*
          The destinations beside the panel, not stacked above it.

          They were a full-width row of three cards sitting on top of the
          webhooks panel, which read as a chooser — three doors, pick one — for
          three things that are one feature: a Discord hook, a Slack hook and
          somebody's own endpoint differ only in the JSON shape the API picks
          from the hostname. Worse, the chooser was the first thing on the tab
          and the thing that actually does the work was below it.

          Beside it they read as what they are: a legend for the panel, saying
          which destinations it understands and which of them this project is
          already posting to. Pressing one opens the panel's composer.
        */}
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
            // Settings, not a dialog here: connecting is an OAuth consent
            // flow, and it is a fact about the account rather than about this
            // project — see `CalendarConnectionPanel`. A client-side navigate
            // rather than `location.assign`, which threw the whole application
            // away and re-downloaded it to move one route.
            onSelect={() => navigate('/settings')}
            isAvailable={Boolean(calendar.data?.available)}
            note={{ label: 'connections.personal', hint: 'connections.personalHint' }}
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
            /*
              The card opens the same dialog the control beside the project's
              name opens — one implementation, two doors, which is the only
              arrangement that cannot drift.

              It used to have no control at all, on the argument that a second
              place to link a repository is how two places disagree. That was
              right about the danger and wrong about the fix: a card on a shelf
              of connections that is the one card you cannot act on is a dead
              spot, and the reader has no way to know the live version is up on
              the title bar.
            */
            onSelect={() =>
              repository
                ? window.open(repository.url, '_blank', 'noopener,noreferrer')
                : setIsRepositoryDialogOpen(true)
            }
          />
          {/*
            Beside GitHub, because they are the same kind of connection.

            Both are *features* rather than broadcasts or syncs: linking one
            changes what the project can do — a repository makes a task's
            branch mean something, a design file makes a page on the Documents
            tab a live reading of the real thing. Neither sends anything out
            and neither changes anything here on its own.

            Pressing it opens the same dialog the mark beside the project's
            name opens, for the reason the GitHub card gives: one
            implementation, two doors, which is the only arrangement that
            cannot drift.
          */}
          <ServiceCard
            name="figma.name"
            mark={<FigmaMark className="h-9 w-6" />}
            isConnected={Boolean(figma)}
            /*
              A deployment with no encryption key cannot keep a Figma
              credential, and the card says so rather than offering a form
              that fails on submit. `isAvailable` is what draws that state —
              the same treatment the calendar card gets when the deployment
              has no Google client.
            */
            isAvailable={Boolean(figmaAvailability.data?.available)}
            unavailableLabel="figma.unavailable"
            unavailableHint="figma.unavailableHint"
            onSelect={() =>
              figma
                ? window.open(figma.url, '_blank', 'noopener,noreferrer')
                : setIsFigmaDialogOpen(true)
            }
          />
          <ServiceCard
            name="connections.svc.trello"
            mark={<TrelloMark className="h-8 w-8" />}
            /*
              Listed, and honestly not connectable from here.

              A Trello import creates a *new* project from a board export — it
              is a thing you do once, at creation, and there is nothing to
              connect an existing project to. Leaving it off the shelf would
              have people asking for a feature that exists; drawing it with a
              button would be a button that cannot work.
            */
            isConnected={false}
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
    </div>
  );
};
