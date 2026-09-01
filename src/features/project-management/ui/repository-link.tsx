import { useState } from 'react';
import { Github, Link2, Unlink } from 'lucide-react';

import {
  useLinkRepository,
  useUnlinkRepository,
} from '@/entities/integration/model/queries';
import type { ProjectRepository } from '@/entities/project/model/types';
import { cn } from '@/shared/lib/cn';
import { Button, Input, Modal } from '@/shared/ui';
import { useT } from '@/shared/i18n';

interface RepositoryLinkProps {
  projectId: string;
  repository: ProjectRepository | null;
  /** Owner or admin. The API refuses the write below that either way. */
  canManage: boolean;
}

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
  const [url, setUrl] = useState('');

  const link = useLinkRepository(projectId);
  const unlink = useUnlinkRepository(projectId);

  const submit = async () => {
    if (!url.trim()) return;

    try {
      await link.mutateAsync(url.trim());
      setIsOpen(false);
      setUrl('');
    } catch {
      // The hook's own `onError` has already said what went wrong. Staying
      // open with the text still in the field is the whole handling: a typo is
      // corrected in place rather than retyped.
    }
  };

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

        <Modal
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          title={t('repo.connectTitle')}
          className="max-w-md"
        >
          <div className="space-y-4">
            <p className="text-sm text-content-muted">{repository.fullName}</p>
            <p className="text-xs leading-relaxed text-content-faint">
              {t('repo.disconnectHint')}
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setIsOpen(false)}>
                {t('common.cancel')}
              </Button>
              <Button
                variant="danger"
                isLoading={unlink.isPending}
                onClick={() => {
                  unlink.mutate(undefined, { onSuccess: () => setIsOpen(false) });
                }}
              >
                <Unlink className="h-3.5 w-3.5" />
                {t('repo.disconnect')}
              </Button>
            </div>
          </div>
        </Modal>
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

      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title={t('repo.connectTitle')}
        className="max-w-md"
      >
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
        >
          <p className="text-xs leading-relaxed text-content-muted">{t('repo.connectBody')}</p>

          <Input
            autoFocus
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            placeholder={t('repo.placeholder')}
            maxLength={300}
          />

          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setIsOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" isLoading={link.isPending} disabled={!url.trim()}>
              <Link2 className="h-3.5 w-3.5" />
              {t('repo.connectAction')}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
};
