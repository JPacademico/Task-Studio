import { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  FileText,
  Github,
  Search,
  Sparkles,
  Star,
  UserCheck,
} from 'lucide-react';

import { usePreviewRepository, useStartImport } from '@/entities/integration/model/queries';
import {
  MAX_IMPORT_GUIDANCE,
  type RepositoryPreview,
} from '@/entities/integration/model/types';
import { cn } from '@/shared/lib/cn';
import { Avatar, Button, Input, Modal, Switch, Textarea } from '@/shared/ui';
import { useT } from '@/shared/i18n';

interface GithubImportPanelProps {
  /** File the imported project under this company, when one was chosen. */
  organizationId?: string;
  /** The accent the dialog's picker is on — overrides the assistant's choice. */
  color?: string;
  /**
   * Called once the import has been *accepted*, not once it has finished. The distinction is the
   * whole change: this used to hand over a project id.
   */
  onStarted: () => void;
}

/** Making a project out of a repository somebody already has. */
export const GithubImportPanel = ({
  organizationId,
  color,
  onStarted,
}: GithubImportPanelProps) => {
  const t = useT();
  const [url, setUrl] = useState('');
  const [useAssistant, setUseAssistant] = useState(true);
  const [guidance, setGuidance] = useState('');
  // The overview is a dialog now, not a block under the field. It was six stacked sections of 10px
  // type wedged into the create-project dialog under the URL input — the repository, a warning.
  const [isOverviewOpen, setIsOverviewOpen] = useState(false);

  const preview = usePreviewRepository();
  const runImport = useStartImport();

  const repo: RepositoryPreview | undefined = preview.data;
  const invitable = repo?.contributors.filter((person) => person.matchedUser) ?? [];

  const look = () => {
    const trimmed = url.trim();
    if (!trimmed) return;
    preview.mutate(trimmed, { onSuccess: () => setIsOverviewOpen(true) });
  };

  const create = async () => {
    if (!repo) return;

    await runImport.mutateAsync({
      // The canonical address rather than what was typed: GitHub follows
      // renames, and the project should come from where the repository is.
      url: `${repo.owner}/${repo.repo}`,
      organizationId,
      color,
      useAssistant,
      // Only when there is something to steer. An empty note and no note are the same thing, and
      // sending `''` would put an empty fenced block in the prompt for nothing.
      ...(useAssistant && guidance.trim() ? { guidance: guidance.trim() } : {}),
    });

    // Close, and go nowhere. There is nothing to navigate to — the project will not exist for
    // another half a minute.
    setIsOverviewOpen(false);
    onStarted();
  };

  return (
    <div className="space-y-3">
      <div className="flex items-end gap-2">
        <Input
          label={t('github.repository')}
          name="repository"
          value={url}
          onChange={(event) => setUrl(event.target.value.slice(0, 300))}
          placeholder="github.com/owner/name"
          className="flex-1"
          // Enter looks it up rather than submitting the dialog behind it, which would create an
          // empty project named whatever was in the name field.
          onKeyDown={(event) => {
            if (event.key !== 'Enter') return;
            event.preventDefault();
            look();
          }}
        />
        <Button
          type="button"
          variant="secondary"
          onClick={look}
          isLoading={preview.isPending}
          disabled={url.trim().length === 0}
        >
          <Search className="h-3.5 w-3.5" />
          {t('github.look')}
        </Button>
      </div>

      {!repo && !preview.isPending && (
        <p className="text-2xs leading-relaxed text-content-faint">{t('github.hint')}</p>
      )}

      {/* What was found, once the dialog has been dismissed. Without this, closing the overview
          leaves the panel looking exactly as it did before the lookup. */}
      {repo && !isOverviewOpen && (
        <button
          type="button"
          onClick={() => setIsOverviewOpen(true)}
          className={cn(
            'flex w-full items-center gap-2 rounded-xl border border-edge bg-surface-sunken/50',
            'px-2.5 py-2 text-left transition-colors hover:border-brand/50',
          )}
        >
          <Github aria-hidden className="h-3.5 w-3.5 shrink-0 text-content-faint" />
          <span className="min-w-0 flex-1 truncate text-2xs font-medium">
            {repo.fullName}
          </span>
          <span className="shrink-0 text-3xs text-brand">{t('github.overviewTitle')}</span>
        </button>
      )}

      {/* The overview, in a dialog of its own. Opened by a successful lookup rather than by a
          second click: the reader pressed "look it up" and this *is* the answer. */}
      <Modal
        isOpen={isOverviewOpen && Boolean(repo)}
        onClose={() => setIsOverviewOpen(false)}
        title={t('github.overviewTitle')}
        className="max-w-lg"
      >
        {repo && (
          <div className="space-y-3.5">
          {/* --- What was found ------------------------------------------- */}
          <div className="flex items-start gap-2.5">
            <span
              aria-hidden
              className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-brand/12 text-brand"
            >
              <Github className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1 leading-tight">
              <p className="truncate text-xs font-semibold">{repo.fullName}</p>
              <p className="mt-0.5 line-clamp-2 text-2xs text-content-muted">
                {repo.description ?? t('github.noDescription')}
              </p>
              <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-3xs text-content-faint">
                {repo.language && <span>{repo.language}</span>}
                <span className="inline-flex items-center gap-0.5">
                  <Star className="h-2.5 w-2.5" />
                  {repo.stars}
                </span>
                <span>{t('github.openIssues', { count: String(repo.openIssues) })}</span>
              </p>
            </div>
          </div>

          {/* An archived repository still imports — it is just worth knowing
              before the project it becomes looks abandoned a week later. */}
          {repo.isArchived && (
            <p className="flex items-start gap-1.5 text-2xs leading-snug text-warning">
              <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
              {t('github.archivedWarning')}
            </p>
          )}

          {/* --- What would come across ----------------------------------- */}
          <div className="space-y-1.5 border-t border-edge/70 pt-2.5">
            <p className="flex items-center gap-1.5 text-3xs font-semibold uppercase tracking-[0.14em] text-content-faint">
              <FileText className="h-3 w-3" />
              {t('github.pagesTitle')}
            </p>
            <p className="text-2xs leading-relaxed text-content-muted">
              {repo.documents.length > 0
                ? repo.documents.join(' · ')
                : t('github.noPages')}
            </p>
          </div>

          {/* --- Who would be asked to join ------------------------------- */}
          {repo.contributors.length > 0 && (
            <div className="space-y-1.5 border-t border-edge/70 pt-2.5">
              <p className="flex items-center gap-1.5 text-3xs font-semibold uppercase tracking-[0.14em] text-content-faint">
                <UserCheck className="h-3 w-3" />
                {t('github.contributorsTitle', { count: String(invitable.length) })}
              </p>

              <ul className="flex flex-wrap gap-1.5">
                {repo.contributors.slice(0, 10).map((person) => (
                  <li
                    key={person.login}
                    title={
                      person.matchedUser
                        ? t('github.willInvite', { name: person.matchedUser.displayName })
                        : t('github.noAccount', { login: person.login })
                    }
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-full border px-1.5 py-0.5 text-3xs',
                      person.matchedUser
                        ? 'border-brand/40 bg-brand/[0.07] text-content'
                        : 'border-edge text-content-faint',
                    )}
                  >
                    <Avatar
                      name={person.matchedUser?.displayName ?? person.login}
                      src={person.matchedUser?.avatarUrl ?? person.avatarUrl}
                      size="xs"
                    />
                    <span className="max-w-[7rem] truncate">
                      {person.matchedUser?.displayName ?? person.login}
                    </span>
                    {person.matchedUser && (
                      <CheckCircle2 className="h-2.5 w-2.5 shrink-0 text-positive" />
                    )}
                  </li>
                ))}
              </ul>

              <p className="text-3xs leading-relaxed text-content-faint">
                {t('github.contributorsHint')}
              </p>
            </div>
          )}

          {/* --- The one choice worth offering ---
              A row, and nothing under it. */}
          {repo.canUseAssistant && (
            <div className="space-y-2.5 border-t border-edge/70 pt-2.5">
              <Switch
                checked={useAssistant}
                onChange={setUseAssistant}
                label={t('github.useAssistant')}
                // The panel's own scale, not the control's default. See `Switch`.
                className="text-2xs"
              />

              {/* A note steering what the assistant reads, and only when there is an assistant
                  to steer. */}
              {useAssistant && (
                <div className="space-y-1">
                  <Textarea
                    label={t('github.guidanceLabel')}
                    name="guidance"
                    rows={2}
                    value={guidance}
                    onChange={(event) =>
                      setGuidance(event.target.value.slice(0, MAX_IMPORT_GUIDANCE))
                    }
                    placeholder={t('github.guidancePlaceholder')}
                    maxLength={MAX_IMPORT_GUIDANCE}
                    className="text-2xs"
                  />
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-3xs leading-relaxed text-content-faint">
                      {t('github.guidanceHint')}
                    </p>
                    {/* Only once it is close enough to matter. */}
                    {guidance.length > MAX_IMPORT_GUIDANCE * 0.75 && (
                      <span className="shrink-0 text-3xs tabular-nums text-content-faint">
                        {MAX_IMPORT_GUIDANCE - guidance.length}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex flex-col-reverse gap-2 border-t border-edge/70 pt-3 sm:flex-row">
            {/* Back to the field with what was typed still in it — the whole
                reason somebody closes this is that it is the wrong repository. */}
            <Button
              type="button"
              variant="ghost"
              className="sm:w-auto"
              onClick={() => setIsOverviewOpen(false)}
            >
              {t('github.overviewBack')}
            </Button>
            <Button
              type="button"
              className="flex-1"
              onClick={() => void create()}
              isLoading={runImport.isPending}
            >
              <Sparkles className="h-3.5 w-3.5" />
              {t('github.import')}
            </Button>
          </div>

          {/* The hint no longer describes a wait, because there is not one. It used to say
              "this takes a moment, stay on this screen". */}
          <p className="text-center text-3xs leading-relaxed text-content-faint">
            {t('github.backgroundHint')}
          </p>
          </div>
        )}
      </Modal>
    </div>
  );
};
