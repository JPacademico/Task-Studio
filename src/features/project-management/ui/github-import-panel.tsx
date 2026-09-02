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
   * Called once the import has been *accepted*, not once it has finished.
   *
   * The distinction is the whole change: this used to hand over a project id
   * because the request did not return until there was one. It now returns
   * in milliseconds with a job, so there is no project to navigate to yet —
   * and the dialog's job is simply to get out of the way. The tracker takes
   * over from here, including the button that opens the finished project.
   */
  onStarted: () => void;
}

/**
 * Making a project out of a repository somebody already has.
 *
 * ## Why this is two steps and not one
 *
 * Because an import is not a small thing. It creates a project, up to three
 * tasks, up to five pages, and it sends invitations to real people — from one
 * pasted URL, and every one of those is somebody else's inbox. "Look it up,
 * then decide" costs one extra click and turns all of that from a surprise
 * into a choice: the preview names the repository that was actually found
 * (GitHub follows renames, so it is not always the one in the URL), lists the
 * files that would become pages, and shows exactly which contributors would be
 * invited and which would not.
 *
 * The lookup is also free of the assistant — six GitHub reads, no model, no
 * quota — which is what makes it reasonable to run it every time somebody
 * corrects a typo.
 *
 * ## And why pressing the second button ends the conversation
 *
 * It used to begin a wait. The import was the request, so the panel sat there
 * with a spinner in it for as long as reading a repository through a model
 * takes, and navigating away threw the whole thing in the bin.
 *
 * It now starts a background job and closes. Nothing here watches it — the
 * import tracker does, from the app shell, so the reader can go and do
 * something else while a project builds itself. What this panel is for ends at
 * "yes, that is the right repository".
 *
 * ## Why the contributor list says who will *not* be invited
 *
 * A contributor with no matched account is shown greyed rather than hidden.
 * Hiding them would make the list look like the repository's whole team, and
 * the honest answer to "why wasn't Ana invited" is "she has not signed in here
 * with GitHub" — which is only visible if Ana is on the list at all.
 */
export const GithubImportPanel = ({
  organizationId,
  color,
  onStarted,
}: GithubImportPanelProps) => {
  const t = useT();
  const [url, setUrl] = useState('');
  const [useAssistant, setUseAssistant] = useState(true);
  const [guidance, setGuidance] = useState('');
  /*
   * The overview is a dialog now, not a block under the field.
   *
   * It was six stacked sections of 10px type wedged into the create-project
   * dialog under the URL input — the repository, a warning, the pages, the
   * contributors, a switch and a button — and the panel it sat in already had
   * a name field, a colour picker and an organization select above it. The
   * most important screen in the whole flow, the one where somebody decides
   * whether this is the right repository and who is about to be emailed, was
   * the most cramped.
   *
   * Its own dialog gives it the room to be read. The lookup stays where it was,
   * because that is a field somebody types in rather than a thing to look at.
   */
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
      // Only when there is something to steer. An empty note and no note are
      // the same thing, and sending `''` would put an empty fenced block in
      // the prompt for nothing.
      ...(useAssistant && guidance.trim() ? { guidance: guidance.trim() } : {}),
    });

    /*
     * Close, and go nowhere.
     *
     * There is nothing to navigate to — the project will not exist for another
     * half a minute — and keeping the dialog open to watch a progress bar
     * would put the app right back where it was before any of this changed.
     * The tracker takes it from here, on whatever page the reader moves to.
     */
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
          // Enter looks it up rather than submitting the dialog behind it,
          // which would create an empty project named whatever was in the name
          // field.
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

      {/*
        What was found, once the dialog has been dismissed.

        Without this, closing the overview leaves the panel looking exactly as
        it did before the lookup — the repository is still held, the import is
        still one click away, and nothing on screen says so. One row that names
        it and reopens the dialog is the whole fix.
      */}
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

      {/*
        The overview, in a dialog of its own.

        Opened by a successful lookup rather than by a second click: the reader
        pressed "look it up" and this *is* the answer, so making them press
        again to see it would be a step that exists only because the layout
        used to be different.
      */}
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

          {/* --- The one choice worth offering ----------------------------

              A row, and nothing under it. Both this and the contributor note
              above used to carry a paragraph explaining themselves, and on a
              panel that is already four stacked sections of 10px type they
              read as a wall — the reader is trying to check a repository, not
              study the feature. The label says what the switch does; what it
              does in detail is discoverable by using it once. */}
          {repo.canUseAssistant && (
            <div className="space-y-2.5 border-t border-edge/70 pt-2.5">
              <Switch
                checked={useAssistant}
                onChange={setUseAssistant}
                label={t('github.useAssistant')}
                // The panel's own scale, not the control's default. See `Switch`.
                className="text-2xs"
              />

              {/*
                A note steering what the assistant reads, and only when there
                is an assistant to steer.

                Collapsed with the switch rather than greyed out beside it: a
                disabled field for a feature that is off is a control asking to
                be understood before it can be ignored, and the switch above it
                already says why it is not there.

                What it *cannot* do is worth being plain about in the hint. It
                changes which files get attention; it cannot change what the
                import produces, because the answer is bound to a fixed schema
                and written into a project, three tasks and some pages either
                way. The API states the same boundary to the model and strips
                the characters that could break out of the block it is quoted
                in — see `sanitiseGuidance` there.
              */}
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
                    {/* Only once it is close enough to matter — a counter that
                        is always on is a limit the reader is asked to think
                        about before they have written anything. */}
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

          {/*
            The hint no longer describes a wait, because there is not one.

            It used to say "this takes a moment, stay on this screen" — which
            was true and was also the problem. What the reader needs to know now
            is the opposite: the work carries on somewhere else and they are
            free to go, which is not obvious from a button that closes a dialog.
          */}
          <p className="text-center text-3xs leading-relaxed text-content-faint">
            {t('github.backgroundHint')}
          </p>
          </div>
        )}
      </Modal>
    </div>
  );
};
