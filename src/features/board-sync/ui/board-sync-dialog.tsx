import { useEffect, useState } from 'react';
import { AlertTriangle, ExternalLink, RefreshCw, Unlink } from 'lucide-react';

import {
  useBoardStatus,
  useLinkBoard,
  useProjectBoardSync,
  useRunBoardSync,
  useUnlinkBoard,
  useUpdateBoardSync,
} from '@/entities/integration/model/boards.queries';
import type { BoardChoice, BoardProvider, BoardSyncLink } from '@/entities/integration/model/types';
import { formatRelative } from '@/shared/lib/dates';
import { useT } from '@/shared/i18n';
import { Button, JiraMark, Modal, Skeleton, Switch, TrelloMark } from '@/shared/ui';
import { BoardAccountCard } from './board-account-card';
import { BoardPicker } from './board-picker';

const MARKS = { TRELLO: TrelloMark, JIRA: JiraMark } as const;

interface BoardSyncDialogProps {
  projectId: string;
  provider: BoardProvider;
  isOpen: boolean;
  onClose: () => void;
}

/** A project's link to a Trello board or Jira project: link it, pull it, or let it go. */
export const BoardSyncDialog = ({ projectId, provider, isOpen, onClose }: BoardSyncDialogProps) => {
  const t = useT();
  const { data, isLoading } = useProjectBoardSync(projectId, isOpen);
  const link = data?.link ?? null;
  // An existing link decides the provider; the card that was pressed only matters before one exists.
  const shown = link?.provider ?? provider;
  const Mark = MARKS[shown];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      align="center"
      icon={<Mark className="h-8 w-8" />}
      title={t(shown === 'TRELLO' ? 'boards.syncTitleTrello' : 'boards.syncTitleJira')}
      description={t('boards.syncBody')}
      className="max-w-md"
    >
      {isLoading || !data ? (
        <Skeleton className="h-40 rounded-xl" />
      ) : link && link.isConnected ? (
        <LinkedView projectId={projectId} link={link} canManage={data.canManage} interval={data.intervalMinutes} />
      ) : (
        <LinkForm projectId={projectId} provider={shown} dormant={link} canManage={data.canManage} />
      )}
    </Modal>
  );
};

const LinkedView = ({
  projectId,
  link,
  canManage,
  interval,
}: {
  projectId: string;
  link: BoardSyncLink;
  canManage: boolean;
  interval: number;
}) => {
  const t = useT();
  const run = useRunBoardSync(projectId);
  const update = useUpdateBoardSync(projectId);
  const unlink = useUnlinkBoard(projectId);
  const [isConfirmingUnlink, setIsConfirmingUnlink] = useState(false);
  const summary = link.lastSummary;

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-edge bg-surface-sunken/50 p-3.5">
        <div className="flex items-center gap-2">
          <p className="min-w-0 flex-1 truncate text-sm font-semibold">{link.externalName}</p>
          {link.externalUrl && (
            <a
              href={link.externalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex shrink-0 items-center gap-1 text-3xs text-content-muted hover:text-brand"
            >
              {t('boards.openSource')}
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
        <p className="mt-1 text-2xs text-content-muted">
          {link.lastSyncedAt
            ? t('boards.lastSynced', { when: formatRelative(link.lastSyncedAt) })
            : t('boards.neverSynced')}
          {link.connectedAs && ` · ${t('boards.throughAccount', { name: link.connectedAs })}`}
        </p>

        {summary && (
          <p className="mt-2 text-3xs leading-relaxed text-content-faint">
            {t('boards.summary', {
              created: summary.created,
              updated: summary.updated,
              conflicts: summary.conflicts,
              removed: summary.removed,
            })}
            {summary.skippedTasks > 0 && ` ${t('boards.summarySkipped', { count: summary.skippedTasks })}`}
            {summary.skippedColumns > 0 && ` ${t('boards.summaryColumns', { count: summary.skippedColumns })}`}
          </p>
        )}

        {link.lastError && (
          <p className="mt-2 flex items-start gap-1.5 text-3xs leading-relaxed text-warning">
            <AlertTriangle className="mt-px h-3 w-3 shrink-0" />
            <span>{link.lastError}</span>
          </p>
        )}
      </div>

      {canManage && (
        <>
          <label className="flex items-start gap-2.5">
            <Switch
              checked={link.autoSync}
              onChange={(checked) => update.mutate(checked)}
              label={t('boards.autoSync')}
            />
            <span className="text-2xs leading-relaxed text-content-muted">
              {interval > 0 ? t('boards.autoSyncHint', { minutes: interval }) : t('boards.autoSyncOff')}
            </span>
          </label>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <Button onClick={() => run.mutate(undefined)} isLoading={run.isPending}>
              <RefreshCw className="h-3.5 w-3.5" />
              {t('boards.syncNow')}
            </Button>
            <Button
              variant={isConfirmingUnlink ? 'danger' : 'ghost'}
              size="sm"
              onClick={() => (isConfirmingUnlink ? unlink.mutate(undefined) : setIsConfirmingUnlink(true))}
              onBlur={() => setIsConfirmingUnlink(false)}
              isLoading={unlink.isPending}
            >
              <Unlink className="h-3.5 w-3.5" />
              {t(isConfirmingUnlink ? 'boards.unlinkConfirm' : 'boards.unlink')}
            </Button>
          </div>
        </>
      )}

      <p className="text-3xs leading-relaxed text-content-faint">{t('boards.mergeRule')}</p>
    </div>
  );
};

const LinkForm = ({
  projectId,
  provider,
  dormant,
  canManage,
}: {
  projectId: string;
  provider: BoardProvider;
  dormant: BoardSyncLink | null;
  canManage: boolean;
}) => {
  const t = useT();
  const { data: status } = useBoardStatus();
  const link = useLinkBoard(projectId);
  const [choice, setChoice] = useState<BoardChoice | null>(null);
  const [autoSync, setAutoSync] = useState(true);

  useEffect(() => setChoice(null), [provider]);

  const isConnected = Boolean(status?.[provider === 'TRELLO' ? 'trello' : 'jira']?.connection);

  if (!canManage) {
    return <p className="text-center text-xs text-content-muted">{t('boards.adminOnly')}</p>;
  }

  return (
    <div className="space-y-4">
      {dormant && (
        <p className="rounded-xl border border-brand/30 bg-brand/[0.06] p-3 text-2xs leading-relaxed text-content-muted">
          {t('boards.dormant', { name: dormant.externalName })}
        </p>
      )}

      <BoardAccountCard provider={provider} compact />

      {isConnected && (
        <>
          <BoardPicker provider={provider} value={choice} onChange={setChoice} />

          <label className="flex items-start gap-2.5">
            <Switch checked={autoSync} onChange={setAutoSync} label={t('boards.autoSync')} />
            <span className="text-2xs leading-relaxed text-content-muted">{t('boards.autoSyncShort')}</span>
          </label>

          <Button
            className="w-full"
            disabled={!choice}
            isLoading={link.isPending}
            onClick={() =>
              choice &&
              link.mutate({
                provider,
                externalId: choice.id,
                siteId: choice.siteId ?? undefined,
                autoSync,
              })
            }
          >
            {t('boards.linkAndSync')}
          </Button>

          <p className="text-3xs leading-relaxed text-content-faint">{t('boards.adoptNote')}</p>
        </>
      )}
    </div>
  );
};
