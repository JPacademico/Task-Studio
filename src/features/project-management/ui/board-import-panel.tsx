import { useEffect, useRef, useState } from 'react';
import { toast } from '@/shared/lib/toast';
import { AlertTriangle, FileSpreadsheet, Upload, X } from 'lucide-react';

import { uploadBoardExport } from '@/entities/user/api/user.api';
import { useStartBoardImport } from '@/entities/integration/model/queries';
import { useBoardStatus, useStartConnectedImport } from '@/entities/integration/model/boards.queries';
import type { BoardChoice, BoardImportSource, BoardProvider } from '@/entities/integration/model/types';
import { BoardAccountCard } from '@/features/board-sync/ui/board-account-card';
import { BoardPicker } from '@/features/board-sync/ui/board-picker';
import { cn } from '@/shared/lib/cn';
import { Button, JiraMark, Segmented, Switch, TrelloMark, formatFileSize } from '@/shared/ui';
import { useT } from '@/shared/i18n';

type Source = BoardProvider | 'FILE';

interface BoardImportPanelProps {
  /** File the imported project under this company, when one was chosen. */
  organizationId?: string;
  /** The accent the dialog's picker is on. */
  color?: string;
  /** The planned window from the dialog's date fields, as ISO instants. */
  startsAt?: string;
  endsAt?: string;
  /** Opens on this source, e.g. after returning from connecting the account. */
  initialSource?: BoardProvider;
  /** Called once the import has been accepted — not once it has finished. */
  onStarted: () => void;
}

/** The file extension decides the reader, so there is no format dropdown to get wrong. */
const sourceFor = (file: File): BoardImportSource =>
  file.name.toLowerCase().endsWith('.json') ? 'TRELLO_JSON' : 'BOARD_CSV';

/** Brings a board over from Trello or Jira — live through a connected account, or from an export file. */
export const BoardImportPanel = ({ initialSource, ...props }: BoardImportPanelProps) => {
  const t = useT();
  const { data: status } = useBoardStatus();
  const [source, setSource] = useState<Source>(initialSource ?? 'TRELLO');
  const touchedRef = useRef(Boolean(initialSource));

  // With neither account offered by this deployment, the file is the only way in.
  useEffect(() => {
    if (touchedRef.current || !status) return;
    touchedRef.current = true;
    if (!status.trello.available && !status.jira.available) setSource('FILE');
  }, [status]);

  return (
    <div className="space-y-3">
      <Segmented
        value={source}
        onChange={(next) => {
          touchedRef.current = true;
          setSource(next);
        }}
        options={[
          { value: 'TRELLO', label: t('connections.svc.trello'), icon: <TrelloMark className="h-3 w-3" /> },
          { value: 'JIRA', label: t('connections.svc.jira'), icon: <JiraMark className="h-3 w-3" /> },
          { value: 'FILE', label: t('boardImport.fromFile'), icon: <Upload className="h-3 w-3" /> },
        ]}
      />

      {source === 'FILE' ? <FileImport {...props} /> : <ConnectedImport key={source} provider={source} {...props} />}
    </div>
  );
};

const ConnectedImport = ({
  provider,
  organizationId,
  color,
  startsAt,
  endsAt,
  onStarted,
}: Omit<BoardImportPanelProps, 'initialSource'> & { provider: BoardProvider }) => {
  const t = useT();
  const { data: status } = useBoardStatus();
  const start = useStartConnectedImport();
  const [choice, setChoice] = useState<BoardChoice | null>(null);
  const [keepInSync, setKeepInSync] = useState(true);

  const isConnected = Boolean(status?.[provider === 'TRELLO' ? 'trello' : 'jira']?.connection);

  const create = async () => {
    if (!choice) return;
    await start.mutateAsync({
      provider,
      externalId: choice.id,
      siteId: choice.siteId ?? undefined,
      name: choice.name,
      keepInSync,
      organizationId,
      color,
      startsAt,
      endsAt,
    });
    onStarted();
  };

  return (
    <div className="space-y-3">
      <BoardAccountCard provider={provider} resumeImport compact />

      {isConnected && (
        <>
          <BoardPicker provider={provider} value={choice} onChange={setChoice} />

          <label className="flex items-start gap-2.5">
            <Switch checked={keepInSync} onChange={setKeepInSync} label={t('boards.keepInSync')} />
            <span className="text-2xs leading-relaxed text-content-muted">{t('boards.keepInSyncHint')}</span>
          </label>

          <WhatComesAcross connected />

          <Button type="button" className="w-full" onClick={() => void create()} isLoading={start.isPending} disabled={!choice}>
            {t('boardImport.start')}
          </Button>

          <p className="text-center text-3xs leading-relaxed text-content-faint">{t('github.backgroundHint')}</p>
        </>
      )}
    </div>
  );
};

const FileImport = ({ organizationId, color, startsAt, endsAt, onStarted }: Omit<BoardImportPanelProps, 'initialSource'>) => {
  const t = useT();
  const inputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const startImport = useStartBoardImport();

  const choose = (picked: File | null | undefined) => {
    if (picked) setFile(picked);
  };

  const create = async () => {
    if (!file) return;

    setIsUploading(true);
    try {
      // Bytes go straight to R2 first; the job only carries the object key.
      const uploaded = await uploadBoardExport(file);

      await startImport.mutateAsync({
        source: sourceFor(file),
        payloadKey: uploaded.key,
        payloadName: file.name,
        organizationId,
        color,
        startsAt,
        endsAt,
      });

      onStarted();
    } catch (error) {
      toast.error((error as Error).message || t('boardImport.failed'));
    } finally {
      setIsUploading(false);
    }
  };

  const isTrello = file ? sourceFor(file) === 'TRELLO_JSON' : false;

  return (
    <div className="space-y-3">
      {!file ? (
        <div
          onDragOver={(event) => {
            event.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setIsDragging(false);
            choose(event.dataTransfer.files?.[0]);
          }}
          className={cn(
            'rounded-xl border border-dashed p-5 text-center transition-colors',
            isDragging ? 'border-brand bg-brand/[0.06]' : 'border-edge bg-surface-sunken/40',
          )}
        >
          <Upload aria-hidden className="mx-auto h-5 w-5 text-content-faint" />
          <p className="mt-2 text-xs font-medium">{t('boardImport.drop')}</p>
          <p className="mt-0.5 text-2xs text-content-muted">{t('boardImport.formats')}</p>

          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="mt-3"
            onClick={() => inputRef.current?.click()}
          >
            {t('boardImport.choose')}
          </Button>

          <input
            ref={inputRef}
            type="file"
            // Windows reports a `.csv` as `text/plain` when Excel is not installed.
            accept=".json,.csv,application/json,text/csv,text/plain"
            className="hidden"
            onChange={(event) => choose(event.target.files?.[0])}
          />
        </div>
      ) : (
        <div className="flex items-center gap-2.5 rounded-xl border border-edge bg-surface-sunken/50 p-3">
          <span
            aria-hidden
            className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-brand/12 text-brand"
          >
            <FileSpreadsheet className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate text-xs font-semibold">{file.name}</p>
            <p className="mt-0.5 text-3xs text-content-faint">
              {formatFileSize(file.size)} ·{' '}
              {t(isTrello ? 'boardImport.readsTrello' : 'boardImport.readsCsv')}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setFile(null)}
            aria-label={t('boardImport.clear')}
            className="grid h-6 w-6 shrink-0 place-items-center rounded-md text-content-faint transition-colors hover:bg-surface-raised hover:text-content"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      <WhatComesAcross />

      <Button
        type="button"
        className="w-full"
        onClick={() => void create()}
        isLoading={isUploading || startImport.isPending}
        disabled={!file}
      >
        {t('boardImport.start')}
      </Button>

      <p className="text-center text-3xs leading-relaxed text-content-faint">
        {t('github.backgroundHint')}
      </p>
    </div>
  );
};

/** Said before the button is pressed, so nobody finds a gap after deleting the original. */
const WhatComesAcross = ({ connected = false }: { connected?: boolean }) => {
  const t = useT();
  return (
    <div className="space-y-1.5 rounded-xl border border-edge/70 bg-surface-sunken/30 p-3">
      <p className="text-3xs font-semibold uppercase tracking-[0.14em] text-content-faint">
        {t('boardImport.whatComesTitle')}
      </p>
      <p className="text-2xs leading-relaxed text-content-muted">{t('boardImport.whatComes')}</p>
      <p className="flex items-start gap-1.5 text-2xs leading-relaxed text-content-faint">
        <AlertTriangle aria-hidden className="mt-0.5 h-3 w-3 shrink-0" />
        {t(connected ? 'boardImport.whatSyncs' : 'boardImport.whatDoesNot')}
      </p>
    </div>
  );
};
