import { useState } from 'react';
import { BookText, ExternalLink, Link2, ShieldCheck, Unlink } from 'lucide-react';

import { useConnectFigma, useDisconnectFigma } from '@/entities/integration/model/queries';
import type { ProjectFigma } from '@/entities/project/model/types';
import { cn } from '@/shared/lib/cn';
import { Button, FigmaMark, HoverHint, Input, Modal, PasswordInput } from '@/shared/ui';
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
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      align="center"
      icon={<FigmaMark className="h-7 w-5" />}
      title={t(figma ? 'figma.connectedTitle' : 'figma.connectTitle')}
      description={figma ? undefined : t('figma.connectBody')}
      className="max-w-md"
    >
      {figma ? (
        <div className="space-y-4">
          {/*
            The file itself, as an object rather than as a sentence.

            Somebody opening this dialog on a connected project is here to
            check what is connected or to undo it, and both questions are
            answered faster by a row that looks like the file than by a
            paragraph naming it. The row is also the way *to* the file, which
            is the thing most people actually came for.
          */}
          <a
            href={figma.url}
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
              <FigmaMark className="h-6 w-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold">{figma.fileName}</span>
              <span className="block truncate text-2xs text-content-muted">
                {t('figma.connectedBy', { name: figma.connectedBy.displayName })}
              </span>
            </span>
            <ExternalLink
              aria-hidden
              className="h-3.5 w-3.5 shrink-0 text-content-faint transition-colors group-hover:text-brand"
            />
          </a>

          <p className="text-2xs leading-relaxed text-content-muted">
            {t('figma.disconnectHint')}
          </p>

          <div className="flex justify-end gap-2 border-t border-edge pt-3.5">
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
            {/* A token is pasted, not typed, and a paste that silently
                lost its last character is invisible behind a row of dots -
                which is exactly the case the reveal is for. */}
            <PasswordInput
              value={token}
              onChange={(event) => setToken(event.target.value)}
              placeholder={t('figma.tokenPlaceholder')}
              maxLength={200}
              // A credential, so nothing may help fill it in or remember it.
              autoComplete="off"
              spellCheck={false}
            />
          </label>

          {/*
            Where to go and get one — as a step, not a footnote.

            This was 10px `text-content-faint` under the field: the quietest
            size in the app, in its quietest colour, carrying the one piece of
            information without which nobody can finish the form. It is now the
            size of the labels around it, on its own surface, because "I do not
            have a token" is the state every first-time reader of this dialog
            is in.
          */}
          <p
            className={cn(
              'flex items-start gap-2 rounded-xl border border-edge bg-surface-sunken/60',
              'px-3 py-2.5 text-xs leading-relaxed text-content-muted',
            )}
          >
            <ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand" />
            <span>{t('figma.tokenHint')}</span>
          </p>

          <div className="flex items-center gap-2 border-t border-edge pt-3.5">
            {/*
              The shared-credential note, behind the mark it is about.

              It used to be a permanent three-line block above the buttons.
              That is the right weight the first time somebody reads it and the
              wrong weight every time after, because it is a *property* of the
              arrangement rather than a decision to make here — and it pushed
              the actual buttons below the fold on a short window. Pointing at
              the shield says it in full; see `HoverHint` for why this is the
              one kind of sentence that may move behind a gesture.
            */}
            <HoverHint label={t('figma.securityLabel')} hint={t('figma.sharedCredential')}>
              <ShieldCheck className="h-3.5 w-3.5" />
            </HoverHint>

            {/*
              The tutorial, in the corner nobody has to look at.

              This dialog asks for two things somebody has to go and fetch from
              another product, and the hint above the buttons can only name the
              menu path — it has no room for what a token may read, what the
              file link looks like, or what to do when Figma refuses it. The
              documentation has all of that, so the dialog points at it from the
              one place a reader looks when a form has defeated them.

              A new tab, deliberately: following this in place would throw away
              a link and a token somebody may have already pasted. `rel` is
              there because `target="_blank"` without it hands the opened page a
              live `window.opener`.
            */}
            <a
              href="/docs#figma"
              target="_blank"
              rel="noreferrer noopener"
              className={cn(
                'inline-flex items-center gap-1.5 text-xs font-medium text-content-muted',
                'transition-colors hover:text-brand',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50',
                'rounded-lg px-1 py-0.5',
              )}
            >
              <BookText className="h-3.5 w-3.5" />
              {t('figma.howTo')}
            </a>

            <span className="ml-auto flex gap-2">
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
            </span>
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
