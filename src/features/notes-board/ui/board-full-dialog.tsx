import { useNavigate } from 'react-router-dom';
import { ArrowUpRight, FolderOpen, HardDrive, Sparkles } from 'lucide-react';

import type { FolderFiling } from '@/entities/document/model/types';
import {
  formatBytesCeiling,
  formatBytesUsed,
  usageFraction,
} from '@/features/billing/lib/format';
import { cn } from '@/shared/lib/cn';
import { Button, Modal } from '@/shared/ui';
import { useT } from '@/shared/i18n';

type FullFiling = Extract<FolderFiling, { status: 'full' }>;

interface BoardFullDialogProps {
  projectId: string;
  /** The refusal to explain, or null when there is nothing to say. */
  filing: FullFiling | null;
  onClose: () => void;
}

/**
 * The Documents board had no room to file a picture from the whiteboard.
 *
 * ## What it has to get across, in order
 *
 * 1. **Nothing was lost.** The picture is on the whiteboard; only the
 *    Documents board's copy is missing. A dialog that opened on "storage
 *    full" alone would read as "your upload failed", which it did not.
 * 2. **How full, in numbers.** The same gauge the Documents tab draws, so the
 *    two never disagree about how much room there is.
 * 3. **The two ways out.** Clearing what is not needed — which anybody on the
 *    roster can start on right now — and a larger plan, which only the
 *    project's *owner* can buy, because a project board is sized by the
 *    owner's plan and nobody else's. Offering a member an upgrade that would
 *    not change this board would be selling them the wrong thing.
 *
 * No upgrade button on Baron: it is the largest plan, so the only honest way
 * out there is the first one.
 */
export const BoardFullDialog = ({ projectId, filing, onClose }: BoardFullDialogProps) => {
  const t = useT();
  const navigate = useNavigate();

  const usage = filing?.usage;
  const byPages = filing?.reason === 'pages';
  const fraction = usage
    ? byPages
      ? usageFraction(usage.documents, usage.documentLimit)
      : usageFraction(usage.usedBytes, usage.limitBytes)
    : null;

  const canUpgrade = Boolean(filing && filing.ownerPlan !== 'BARON');
  const ownerCanUpgrade = Boolean(filing?.isOwner && canUpgrade);

  const openDocuments = () => {
    onClose();
    navigate(`/projects/${projectId}?tab=text`);
  };

  return (
    <Modal
      isOpen={Boolean(filing)}
      onClose={onClose}
      title={t('folder.full.title')}
      description={t('folder.full.subtitle')}
      align="center"
      icon={<HardDrive className="h-5 w-5 text-warning" />}
      footer={
        <>
          <Button variant="ghost" onClick={openDocuments}>
            <FolderOpen className="h-3.5 w-3.5" />
            {t('folder.full.openDocuments')}
          </Button>
          {ownerCanUpgrade ? (
            <Button
              onClick={() => {
                onClose();
                navigate('/settings');
              }}
            >
              <Sparkles className="h-3.5 w-3.5" />
              {t('folder.full.upgrade')}
            </Button>
          ) : (
            <Button onClick={onClose}>{t('common.close')}</Button>
          )}
        </>
      }
    >
      {filing && usage && (
        <div className="space-y-4">
          <p className="text-sm leading-relaxed text-content">
            {t(byPages ? 'folder.full.bodyPages' : 'folder.full.bodyBytes')}
          </p>

          {/* The gauge, in the Documents tab's own terms. */}
          {fraction !== null && (
            <div className="space-y-1.5">
              <div className="flex items-baseline justify-between gap-3 text-2xs text-content-muted">
                <span className="font-semibold uppercase tracking-wide">
                  {t(byPages ? 'folder.full.pagesLabel' : 'folder.full.storageLabel')}
                </span>
                <span className="tabular-nums">
                  {byPages
                    ? `${usage.documents} / ${usage.documentLimit ?? '∞'}`
                    : t('doc.storage', {
                        used: formatBytesUsed(usage.usedBytes),
                        limit: formatBytesCeiling(usage.limitBytes ?? 0),
                      })}
                </span>
              </div>
              <div
                role="meter"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(Math.min(1, fraction) * 100)}
                className="h-2 overflow-hidden rounded-full bg-surface-sunken ring-1 ring-inset ring-edge"
              >
                <div
                  className={cn('h-full rounded-full', fraction >= 1 ? 'bg-danger' : 'bg-warning')}
                  style={{ width: `${Math.min(100, Math.max(4, fraction * 100))}%` }}
                />
              </div>
              {!byPages && (
                <p className="text-3xs text-content-faint">
                  {t('folder.full.pictureSize', { size: formatBytesUsed(filing.incomingBytes) })}
                </p>
              )}
            </div>
          )}

          {/* The way out anybody on the roster can take today. */}
          <div className="rounded-xl border border-edge bg-surface-sunken/60 p-3">
            <p className="text-xs font-semibold text-content">{t('folder.full.hintTitle')}</p>
            <p className="mt-1 text-2xs leading-relaxed text-content-muted">
              {t('folder.full.hintBody')}
            </p>
          </div>

          {/* And the one only the owner can. */}
          {canUpgrade && !filing.isOwner && (
            <p className="flex items-start gap-1.5 text-2xs leading-relaxed text-content-muted">
              <ArrowUpRight className="mt-0.5 h-3 w-3 shrink-0 text-brand" />
              {t('folder.full.askOwner')}
            </p>
          )}
          {!canUpgrade && (
            <p className="text-2xs leading-relaxed text-content-muted">
              {t('folder.full.onBaron')}
            </p>
          )}
        </div>
      )}
    </Modal>
  );
};
