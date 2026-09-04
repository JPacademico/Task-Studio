import { useState } from 'react';
import { Link2, ShieldCheck, Unlink } from 'lucide-react';

import { useConnectFigma, useDisconnectFigma } from '@/entities/integration/model/queries';
import type { ProjectFigma } from '@/entities/project/model/types';
import { cn } from '@/shared/lib/cn';
import { Button, FigmaMark, Input, Modal } from '@/shared/ui';
import { useT } from '@/shared/i18n';

interface FigmaLinkProps {
  projectId: string;
  figma: ProjectFigma | null;
  /** Owner or admin. The API refuses the write below that either way. */
  canManage: boolean;
  /** False on a deployment with no encryption key — see `figmaApi.status`. */
  isAvailable: boolean;
}

interface FigmaLinkDialogProps {
  projectId: string;
  figma: ProjectFigma | null;
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Connecting a project to a design file, or letting go of one.
 *
 * ## Why this is its own component
 *
 * The same reason `RepositoryLinkDialog` is: two surfaces need it and neither
 * owns it. The mark beside the project's name is where somebody goes when they
 * are thinking about the design; the Figma card on the Connections shelf is
 * where they go when they are thinking about what this project talks to. Both
 * are legitimate doors and both have to open the *same room* — a second copy
 * of this form would be a second place for "what counts as a Figma link" and
 * "what disconnecting costs you" to drift apart.
 *
 * ## Why the credential is on the form at all
 *
 * Figma has no anonymous read of any kind, so unlike a GitHub link there is
 * nothing to verify an address against without one. The sentence under the
 * token field says plainly what that means — one person's token, read by the
 * whole roster — because the alternative is somebody discovering it later,
 * which is the shape of every bad surprise a shared credential produces.
 *
 * The field is `type="password"` and the token is never read back: no route
 * answers with it, so re-opening this dialog on a connected project shows the
 * disconnect side rather than a pre-filled secret.
 */
export const FigmaLinkDialog = ({ projectId, figma, isOpen, onClose }: FigmaLinkDialogProps) => {
  const t = useT();
  const [url, setUrl] = useState('');
  const [token, setToken] = useState('');

  const connect = useConnectFigma(projectId);
  const disconnect = useDisconnectFigma(projectId);

  const submit = async () => {
    if (!url.trim() || !token.trim()) return;

    try {
      await connect.mutateAsync({ url: url.trim(), token: token.trim() });
      onClose();
      setUrl('');
      // Cleared on success as well as on close: a token that lingers in a
      // React state after the dialog is done with it is a credential kept
      // alive for no reason at all.
      setToken('');
    } catch {
      // The hook's own `onError` has already said what went wrong. Staying
      // open with the text still in the fields is the whole handling: a
      // mistyped link is corrected in place rather than retyped.
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('figma.connectTitle')} className="max-w-md">
      {figma ? (
        <div className="space-y-4">
          <p className="text-sm text-content-muted">{figma.fileName}</p>
          <p className="text-xs leading-relaxed text-content-faint">
            {t('figma.connectedBy', { name: figma.connectedBy.displayName })}
          </p>
          <p className="text-xs leading-relaxed text-content-faint">{t('figma.disconnectHint')}</p>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={onClose}>
              {t('common.cancel')}
            </Button>
            <Button
              variant="danger"
              isLoading={disconnect.isPending}
              onClick={() => {
                disconnect.mutate(undefined, { onSuccess: onClose });
              }}
            >
              <Unlink className="h-3.5 w-3.5" />
              {t('figma.disconnect')}
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
          <p className="text-xs leading-relaxed text-content-muted">{t('figma.connectBody')}</p>

          <label className="block space-y-1.5">
            <span className="text-2xs font-semibold uppercase tracking-wide text-content-faint">
              {t('figma.urlLabel')}
            </span>
            <Input
              autoFocus
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder={t('figma.urlPlaceholder')}
              maxLength={500}
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-2xs font-semibold uppercase tracking-wide text-content-faint">
              {t('figma.tokenLabel')}
            </span>
            <Input
              type="password"
              value={token}
              onChange={(event) => setToken(event.target.value)}
              placeholder={t('figma.tokenPlaceholder')}
              maxLength={200}
              // A credential, so nothing may help fill it in or remember it.
              autoComplete="off"
              spellCheck={false}
            />
            <span className="block text-3xs leading-relaxed text-content-faint">
              {t('figma.tokenHint')}
            </span>
          </label>

          {/*
            The one thing about this arrangement somebody has to know before
            they press the button, rather than after.

            A shared credential is a real trade and it is stated as one: it is
            this person's token, the roster reads through it, and it is
            encrypted at rest. Burying that in documentation is how a team
            finds out from an audit.
          */}
          <p
            className={cn(
              'flex items-start gap-2 rounded-xl border border-edge bg-surface-sunken/60',
              'px-3 py-2 text-3xs leading-relaxed text-content-muted',
            )}
          >
            <ShieldCheck className="mt-px h-3.5 w-3.5 shrink-0 text-content-faint" />
            {t('figma.sharedCredential')}
          </p>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              {t('common.cancel')}
            </Button>
            <Button
              type="submit"
              isLoading={connect.isPending}
              disabled={!url.trim() || !token.trim()}
            >
              <Link2 className="h-3.5 w-3.5" />
              {t('figma.connectAction')}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
};

/**
 * The way from a project to its design, beside the project's own name.
 *
 * ## Why it sits next to the repository mark
 *
 * Because they answer the same question about the two halves of a product
 * project — where is the code, where is the design — and both are
 * *destinations* rather than preferences. Somebody looking at a board and
 * wanting the design wants it now, from where they are; a link filed two
 * clicks into a settings dialog is a link people stop using and then stop
 * expecting.
 *
 * The same shape as `RepositoryLink` on purpose, down to the two-control
 * arrangement: on a connected project it is a link and nothing else, one click
 * straight to Figma, with disconnecting behind a second quiet button that only
 * an admin sees. A reader who cannot manage the project sees nothing at all on
 * an unconnected one — the offer would be a button that exists to refuse them.
 *
 * ## Why an unavailable deployment draws nothing rather than a disabled mark
 *
 * A deployment with no encryption key cannot keep a Figma credential, which is
 * a fact about the server and not about this project or this person. A greyed
 * mark would invite an admin to press it and read an error about an
 * environment variable they may not control; the Connections tab is where that
 * sentence belongs, and it says it there.
 */
export const FigmaLink = ({ projectId, figma, canManage, isAvailable }: FigmaLinkProps) => {
  const t = useT();
  const [isOpen, setIsOpen] = useState(false);

  const dialog = (
    <FigmaLinkDialog
      projectId={projectId}
      figma={figma}
      isOpen={isOpen}
      onClose={() => setIsOpen(false)}
    />
  );

  // --- Connected: a way to the design --------------------------------------

  if (figma) {
    return (
      <span className="inline-flex items-center gap-0.5">
        <a
          href={figma.url}
          target="_blank"
          // `noopener` is the one that matters — without it the opened page
          // gets a handle on this one through `window.opener`.
          rel="noreferrer noopener"
          title={`${t('figma.open')} — ${figma.fileName}`}
          className={cn(
            'inline-flex h-8 w-8 items-center justify-center rounded-lg border border-edge',
            'text-content-muted transition-colors',
            'hover:border-brand/50 hover:text-content',
            'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand',
          )}
        >
          <FigmaMark className="h-4 w-4" />
          <span className="sr-only">{t('figma.open')}</span>
        </a>

        {canManage && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            aria-label={t('figma.disconnect')}
            title={t('figma.disconnect')}
            onClick={() => setIsOpen(true)}
          >
            <Unlink className="h-3.5 w-3.5" />
          </Button>
        )}

        {dialog}
      </span>
    );
  }

  // --- Not connected: an offer, and only where it can be accepted ----------

  if (!canManage || !isAvailable) return null;

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        aria-label={t('figma.connect')}
        title={t('figma.connect')}
        onClick={() => setIsOpen(true)}
      >
        <FigmaMark className="h-4 w-4" />
      </Button>

      {dialog}
    </>
  );
};
