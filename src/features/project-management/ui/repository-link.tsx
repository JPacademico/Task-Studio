import { useState } from 'react';
import { ExternalLink, Github, Link2, Unlink } from 'lucide-react';

import { useLinkRepository, useUnlinkRepository } from '@/entities/integration/model/queries';
import type { ProjectRepository } from '@/entities/project/model/types';
import { cn } from '@/shared/lib/cn';
import { Button, GitHubMark, Input, Modal } from '@/shared/ui';
import { useT } from '@/shared/i18n';

interface RepositoryLinkProps {
  projectId: string;
  repository: ProjectRepository | null;
  /** Owner or admin. The API refuses the write below that either way. */
  canManage: boolean;
}

interface RepositoryLinkDialogProps {
  projectId: string;
  repository: ProjectRepository | null;
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Connecting a repository, or letting go of one.
 *
 * ## Why this is its own component
 *
 * Because two surfaces need it and neither of them owns it. The control beside
 * the project's name is where somebody goes when they are thinking about the
 * code; the GitHub card on the Connections shelf is where they go when they are
 * thinking about what this project talks to. Both are legitimate doors and both
 * have to open the *same room* — a second copy of this form would be a second
 * place for "which URLs are accepted" and "what disconnecting costs you" to
 * drift apart, and the drift would not be visible from either side.
 *
 * Which of the two forms it draws is decided by state rather than by the
 * caller: a project either has a repository or it does not, and asking two call
 * sites to work that out is asking one of them to eventually get it wrong.
 */
export const RepositoryLinkDialog = ({
  projectId,
  repository,
  isOpen,
  onClose,
}: RepositoryLinkDialogProps) => {
  const t = useT();
  const [url, setUrl] = useState('');

  const link = useLinkRepository(projectId);
  const unlink = useUnlinkRepository(projectId);

  const submit = async () => {
    if (!url.trim()) return;

    try {
      await link.mutateAsync(url.trim());
      onClose();
      setUrl('');
    } catch {
      // The hook's own `onError` has already said what went wrong. Staying
      // open with the text still in the field is the whole handling: a typo is
      // corrected in place rather than retyped.
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      align="center"
      icon={<GitHubMark className="h-7 w-7" />}
      title={t(repository ? 'repo.connectedTitle' : 'repo.connectTitle')}
      description={repository ? undefined : t('repo.connectBody')}
      className="max-w-md"
    >
      {repository ? (
        <div className="space-y-4">
          {/*
            The repository as an object, and as the way to it.

            The same treatment the Figma dialog gives a connected file, for the
            same reason: somebody opening this is checking what is linked or
            undoing it, and a row that looks like the repository answers the
            first question at a glance while being the answer to "take me
            there" — which is what most people actually wanted.
          */}
          <a
            href={repository.url}
            target="_blank"
            rel="noreferrer noopener"
            className={cn(
              'ui-card group flex items-center gap-3 rounded-2xl border border-edge',
              'bg-surface-raised p-3 transition-colors hover:border-brand/50',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50',
            )}
          >
            <span
              aria-hidden
              className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-edge bg-surface-sunken"
            >
              <GitHubMark className="h-6 w-6" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold">{repository.fullName}</span>
              {repository.defaultBranch && (
                <span className="block truncate font-mono text-2xs text-content-muted">
                  {repository.defaultBranch}
                </span>
              )}
            </span>
            <ExternalLink
              aria-hidden
              className="h-3.5 w-3.5 shrink-0 text-content-faint transition-colors group-hover:text-brand"
            />
          </a>

          <p className="text-2xs leading-relaxed text-content-muted">{t('repo.disconnectHint')}</p>

          <div className="flex justify-end gap-2 border-t border-edge pt-3.5">
            <Button variant="ghost" onClick={onClose}>
              {t('common.cancel')}
            </Button>
            <Button
              variant="danger"
              isLoading={unlink.isPending}
              onClick={() => {
                unlink.mutate(undefined, { onSuccess: onClose });
              }}
            >
              <Unlink className="h-3.5 w-3.5" />
              {t('repo.disconnect')}
            </Button>
          </div>
        </div>
      ) : (
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
        >
          <label className="block space-y-1.5">
            <span className="text-2xs font-semibold uppercase tracking-wide text-content-faint">
              {t('repo.urlLabel')}
            </span>
            <Input
              autoFocus
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder={t('repo.placeholder')}
              maxLength={300}
            />
          </label>

          {/*
            The one rule that decides whether this will work, said before the
            button rather than by the button's failure.

            Only a public repository can be linked — the deployment's token
            carries no scopes by design — and somebody pasting a private URL
            currently learns that from a red toast. At the size of a field
            label, on its own surface, it is a precondition instead of an
            error.
          */}
          <p
            className={cn(
              'flex items-start gap-2 rounded-xl border border-edge bg-surface-sunken/60',
              'px-3 py-2.5 text-xs leading-relaxed text-content-muted',
            )}
          >
            <Github className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand" />
            <span>{t('repo.publicOnly')}</span>
          </p>

          <div className="flex justify-end gap-2 border-t border-edge pt-3.5">
            <Button type="button" variant="ghost" onClick={onClose}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" isLoading={link.isPending} disabled={!url.trim()}>
              <Link2 className="h-3.5 w-3.5" />
              {t('repo.connectAction')}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
};

/**
 * The way from a project to its code, beside the project's own name.
 *
 * ## Why it sits on the title rather than in settings
 *
 * Because it is a *destination*, not a preference. Somebody looking at a board
 * and wanting the repository wants it now, from where they are — and a link
 * filed two clicks into a settings dialog is a link people stop using and then
 * stop expecting. The header already carries the other facts of the same kind
 * (which company this is filed under, when it runs) and this is one more.
 *
 * ## Why the same control does both jobs
 *
 * On a linked project it is a link and nothing else: one click, straight to
 * GitHub, no menu in the way. On an unlinked one it is the offer to connect —
 * which is a different action, but it answers the same question somebody
 * arrived with ("where is the code?") and putting it anywhere else means the
 * answer to that question depends on a state they cannot see yet.
 *
 * A reader who cannot manage the project sees *nothing* on an unlinked one.
 * The offer would be a button that exists to refuse them, and "no repository is
 * connected" is not news anybody needs delivered.
 */
export const RepositoryLink = ({ projectId, repository, canManage }: RepositoryLinkProps) => {
  const t = useT();
  const [isOpen, setIsOpen] = useState(false);

  const dialog = (
    <RepositoryLinkDialog
      projectId={projectId}
      repository={repository}
      isOpen={isOpen}
      onClose={() => setIsOpen(false)}
    />
  );

  // --- Linked: a way to the code -------------------------------------------

  if (repository) {
    return (
      <span className="inline-flex items-center gap-0.5">
        <a
          href={repository.url}
          target="_blank"
          // `noopener` is the one that matters — without it the opened page
          // gets a handle on this one through `window.opener`.
          rel="noreferrer noopener"
          title={`${t('repo.open')} — ${repository.fullName}`}
          className={cn(
            'inline-flex h-8 w-8 items-center justify-center rounded-lg border border-edge',
            'text-content-muted transition-colors',
            'hover:border-brand/50 hover:text-content',
            'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand',
          )}
        >
          <Github aria-hidden className="h-4 w-4" />
          <span className="sr-only">{t('repo.open')}</span>
        </a>

        {/*
          Disconnecting is deliberately not on this control.

          It lives in the dialog behind the same button an admin uses to
          connect, so the destructive half is never one stray click away from
          the half everybody uses forty times a day. An admin gets a second,
          quiet button to open it; everybody else gets the link alone.
        */}
        {canManage && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            aria-label={t('repo.disconnect')}
            title={t('repo.disconnect')}
            onClick={() => setIsOpen(true)}
          >
            <Unlink className="h-3.5 w-3.5" />
          </Button>
        )}

        {dialog}
      </span>
    );
  }

  // --- Not linked: an offer, and only to somebody who can accept it --------

  if (!canManage) return null;

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        aria-label={t('repo.connect')}
        title={t('repo.connect')}
        onClick={() => setIsOpen(true)}
      >
        <Github className="h-4 w-4" />
      </Button>

      {dialog}
    </>
  );
};
