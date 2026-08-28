import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { AlertTriangle, FileSpreadsheet, Upload, X } from 'lucide-react';

import { uploadBoardExport } from '@/entities/user/api/user.api';
import { useStartBoardImport } from '@/entities/integration/model/queries';
import type { BoardImportSource } from '@/entities/integration/model/types';
import { cn } from '@/shared/lib/cn';
import { Button, formatFileSize } from '@/shared/ui';
import { useT } from '@/shared/i18n';

interface BoardImportPanelProps {
  /** File the imported project under this company, when one was chosen. */
  organizationId?: string;
  /** The accent the dialog's picker is on. */
  color?: string;
  /** The planned window from the dialog's date fields, as ISO instants. */
  startsAt?: string;
  endsAt?: string;
  /** Called once the import has been accepted — not once it has finished. */
  onStarted: () => void;
}

/**
 * Which reader a file needs, from its own name.
 *
 * Decided here rather than sniffed on the server, and the reason is the error
 * message. A `.json` that is not a Trello export should fail with "this is not
 * a Trello board" — which needs to know it was *meant* to be one — rather than
 * with whatever a CSV parser makes of a JSON file.
 */
const sourceFor = (file: File): BoardImportSource =>
  file.name.toLowerCase().endsWith('.json') ? 'TRELLO_JSON' : 'BOARD_CSV';

/**
 * Bringing a board over from Trello, Jira, Asana or anything that exports a
 * spreadsheet.
 *
 * ## Why this is a file rather than a connection
 *
 * Because a connection to any of them means OAuth, an app registration, a
 * review process at a vendor, and a stored credential per user — for a feature
 * somebody uses **once**, on the day they move in. An export file needs none
 * of it: the user already has the data, every one of these tools has an export
 * button, and nothing has to keep working next year.
 *
 * The honest cost is that it is a one-time copy rather than a live sync, and
 * the panel says so rather than letting somebody discover it in a fortnight.
 *
 * ## Why the format is not a dropdown
 *
 * Picking "Trello" from a list and then choosing a `.csv` is a mistake nobody
 * would notice making, and it produces the least helpful error in the whole
 * feature. The file extension already carries the answer, so the picker is the
 * only control and the panel says which reader it will use — a statement
 * rather than a question.
 *
 * ## What comes across, said before the button is pressed
 *
 * Lists become columns, cards become tasks, due dates and done-ness carry
 * over. Labels, checklists, attachments and assignees do not — they end up in
 * each task's description where a person can read them. That paragraph is the
 * single most useful thing on this panel: an importer that quietly drops half
 * of somebody's board is one they find out about after they have deleted the
 * original.
 */
export const BoardImportPanel = ({
  organizationId,
  color,
  startsAt,
  endsAt,
  onStarted,
}: BoardImportPanelProps) => {
  const t = useT();
  const inputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const startImport = useStartBoardImport();

  const choose = (picked: File | null | undefined) => {
    if (!picked) return;
    setFile(picked);
  };

  const create = async () => {
    if (!file) return;

    setIsUploading(true);
    try {
      /*
       * Two requests, and the order matters.
       *
       * The bytes go straight from the browser to R2 through a presigned PUT —
       * the API never proxies them, which is what keeps a free-tier container
       * viable — and only then does the job get created, carrying the object
       * key.
       *
       * A failure in the first leaves nothing behind. A failure in the second
       * would leave an object nothing references, which is why the API deletes
       * the upload on every path that refuses a job as well as on every path
       * that finishes one — see `discardPayload` there. Nothing has to be
       * cleaned up from this side.
       */
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
      {/* --- The picker ------------------------------------------------- */}
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
          <p className="mt-0.5 text-[11px] text-content-muted">{t('boardImport.formats')}</p>

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
            // Both spellings of each, because Windows reports a `.csv` as
            // `text/plain` when Excel is not installed — see `uploadBoardExport`.
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
            <p className="mt-0.5 text-[10px] text-content-faint">
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

      {/* --- What will and will not come across -------------------------

          The most important text on the panel. An importer that silently
          drops half a board is one people discover after deleting the
          original, so the omissions are stated up front rather than
          discovered — and they are stated as *where the data went* rather
          than as "unsupported", because it is not lost. */}
      <div className="space-y-1.5 rounded-xl border border-edge/70 bg-surface-sunken/30 p-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-content-faint">
          {t('boardImport.whatComesTitle')}
        </p>
        <p className="text-[11px] leading-relaxed text-content-muted">
          {t('boardImport.whatComes')}
        </p>
        <p className="flex items-start gap-1.5 text-[11px] leading-relaxed text-content-faint">
          <AlertTriangle aria-hidden className="mt-0.5 h-3 w-3 shrink-0" />
          {t('boardImport.whatDoesNot')}
        </p>
      </div>

      <Button
        type="button"
        className="w-full"
        onClick={() => void create()}
        isLoading={isUploading || startImport.isPending}
        disabled={!file}
      >
        {t('boardImport.start')}
      </Button>

      <p className="text-center text-[10px] leading-relaxed text-content-faint">
        {t('github.backgroundHint')}
      </p>
    </div>
  );
};
