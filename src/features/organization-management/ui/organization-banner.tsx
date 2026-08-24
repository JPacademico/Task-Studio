import { useEffect, useRef, useState } from 'react';
import { ImagePlus, Loader2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { useUpdateOrganization } from '@/entities/organization/model/queries';
import type { Organization } from '@/entities/organization/model/types';
import { uploadImage } from '@/entities/user/api/user.api';
import { cn } from '@/shared/lib/cn';
import { withAlpha } from '@/shared/lib/colors';
import { Button, Modal } from '@/shared/ui';
import { useT } from '@/shared/i18n';

/**
 * A generous letterhead, not a hero image.
 *
 * Tall enough for a logo lockup or a photograph of the office to survive being
 * cropped to a strip, short enough that the page's actual content is still on
 * screen when it loads. `aspect-ratio` rather than a fixed height so it holds
 * that proportion on a phone instead of becoming a letterbox.
 */
const BANNER_CLASSES =
  'relative w-full overflow-hidden rounded-3xl border border-edge aspect-[5/1] min-h-[104px]';

interface BannerPreviewProps {
  /** An object URL for the picked file. Null while nothing is being reviewed. */
  previewUrl: string | null;
  isUploading: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * What that picture will actually look like up there.
 *
 * ## Why this exists
 *
 * The banner is a 5:1 strip and almost nothing anybody picks is 5:1. A
 * photograph gets its middle band kept and everything above and below it
 * discarded, which for a group photo or a logo with air around it can throw
 * away the only part that mattered. Before this, the only way to find that out
 * was to upload the file, look at the result, and upload a different one — two
 * round trips and two objects in the bucket to answer a question the browser
 * could answer for nothing.
 *
 * ## Why the preview is the real component
 *
 * The frame below is the same `BANNER_CLASSES` box the page draws, with the
 * same `center/cover` background. It is not an approximation of the crop; it is
 * the crop. Anything else would be a preview that can disagree with the result,
 * which is worse than no preview at all.
 *
 * The full picture is shown underneath at its own aspect ratio, so somebody can
 * see *what was cut* rather than only what survived — which is the thing that
 * decides whether to pick a different file.
 */
const BannerPreview = ({
  previewUrl,
  isUploading,
  onConfirm,
  onCancel,
}: BannerPreviewProps) => {
  const t = useT();

  return (
    <Modal
      isOpen={Boolean(previewUrl)}
      onClose={onCancel}
      title={t('org.bannerPreviewTitle')}
      description={t('org.bannerPreviewSubtitle')}
      className="sm:max-w-2xl"
      flat
      footer={
        <>
          <Button variant="ghost" onClick={onCancel} disabled={isUploading}>
            {t('org.bannerPickAnother')}
          </Button>
          <Button onClick={onConfirm} isLoading={isUploading}>
            {t('org.bannerUse')}
          </Button>
        </>
      }
    >
      {previewUrl && (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-content-muted">
              {t('org.bannerAsShown')}
            </p>
            {/* The same box the page draws, so this is the crop rather than an
                impression of it. */}
            <div
              className={BANNER_CLASSES}
              style={{ background: `url(${previewUrl}) center/cover` }}
            />
          </div>

          <div className="space-y-1.5">
            <p className="text-xs font-medium text-content-muted">
              {t('org.bannerWholeImage')}
            </p>
            <p className="text-[11px] leading-relaxed text-content-faint">
              {t('org.bannerCropHint')}
            </p>
            {/* Capped so a tall photograph cannot push the buttons off the
                dialog — the point is to see what was cut, not to view the file. */}
            <img
              src={previewUrl}
              alt={t('org.bannerWholeImage')}
              className="max-h-52 w-full rounded-xl border border-edge object-contain"
            />
          </div>
        </div>
      )}
    </Modal>
  );
};

interface OrganizationBannerProps {
  organization: Organization;
}

/**
 * The picture across the top of a company's page.
 *
 * ## Why the empty state is a gradient rather than a placeholder
 *
 * Most companies will never set one, and a dashed "drop an image here" box at
 * the top of every page is a permanent reminder of a job nobody needs to do.
 * Instead the empty state is the company's own accent colour as a wash, which
 * reads as deliberate — it is the same treatment the project cards use — and
 * the upload control only appears for somebody who could actually use it.
 *
 * ## Why the bytes never touch the API
 *
 * `uploadImage` downscales in the browser and PUTs straight to R2 against a
 * presigned URL; only the resulting key and public URL are sent here. That is
 * the same path avatars and note images take, and the reason is in
 * `shared/lib/prepare-image`: a phone photograph is several megabytes and three
 * hundred times the pixels a 5:1 strip can draw, and resizing it on a
 * free-tier container would serialise every upload behind one CPU.
 *
 * ## Why nothing is uploaded until it is confirmed
 *
 * Picking the file only produces an object URL, which costs nothing and leaves
 * no trace. The upload — and the presigned request that carries the tightest
 * rate limit in the app — happens on "Use this image". Somebody trying three
 * photographs to see which one crops well therefore spends three previews and
 * one upload, rather than three uploads and three orphaned objects.
 */
export const OrganizationBanner = ({ organization }: OrganizationBannerProps) => {
  const t = useT();
  const fileRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [candidate, setCandidate] = useState<{ file: File; url: string } | null>(null);

  const update = useUpdateOrganization(organization.id);

  /*
   * Object URLs are a manual allocation.
   *
   * Each one pins the whole file in memory until it is revoked, so a session of
   * trying photographs would hold every one of them for as long as the page
   * lived. Revoking on replacement and on unmount is what keeps that to one.
   */
  useEffect(() => {
    if (!candidate) return;
    return () => URL.revokeObjectURL(candidate.url);
  }, [candidate]);

  const clearInput = () => {
    // Cleared so that picking the *same* file again still fires a change event,
    // which is the usual way somebody retries after cancelling.
    if (fileRef.current) fileRef.current.value = '';
  };

  const handlePick = (file: File | undefined) => {
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error(t('org.bannerNotAnImage'));
      clearInput();
      return;
    }

    setCandidate({ file, url: URL.createObjectURL(file) });
    clearInput();
  };

  const handleConfirm = async () => {
    if (!candidate) return;

    setIsUploading(true);
    try {
      const { key, publicUrl } = await uploadImage(candidate.file, 'banners');
      await update.mutateAsync({ bannerKey: key, bannerUrl: publicUrl });
      setCandidate(null);
    } catch {
      // `uploadImage` throws on a file the browser cannot decode, and the
      // mutation reports its own failures. Either way the honest thing to say
      // is that the picture did not land — the company is untouched, and the
      // preview stays open so the file does not have to be picked again.
      toast.error(t('org.bannerFailed'));
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <>
      <div
        className={cn(BANNER_CLASSES, 'group/banner')}
        style={
          organization.bannerUrl
            ? { background: `url(${organization.bannerUrl}) center/cover` }
            : {
                background: `linear-gradient(115deg, ${withAlpha(
                  organization.color,
                  0.55,
                )}, ${withAlpha(organization.color, 0.08)} 62%, transparent)`,
              }
        }
      >
        {/* A scrim under the controls only, so a pale banner never leaves a
            white button on white. Pointer-events-none: it is decoration, and it
            sits over the whole strip. */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent"
        />

        {/*
          Owner or admin only.

          `canManage` is the same flag the API enforces — an ordinary member
          opening this page sees the banner and no controls, rather than a
          button that collects a 403.
        */}
        {organization.canManage && (
          <div
            className={cn(
              'absolute bottom-2.5 right-2.5 flex items-center gap-1.5',
              // Always visible on touch, where there is no hover to reveal it.
              'opacity-100 transition-opacity sm:opacity-0',
              'sm:group-hover/banner:opacity-100 sm:focus-within:opacity-100',
            )}
          >
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(event) => handlePick(event.target.files?.[0])}
            />

            <Button
              size="sm"
              variant="secondary"
              onClick={() => fileRef.current?.click()}
              disabled={isUploading}
            >
              {isUploading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <ImagePlus className="h-3.5 w-3.5" />
              )}
              {t(organization.bannerUrl ? 'org.bannerReplace' : 'org.bannerAdd')}
            </Button>

            {organization.bannerUrl && (
              <Button
                size="icon"
                variant="secondary"
                aria-label={t('org.bannerRemove')}
                title={t('org.bannerRemove')}
                // The empty key is the contract for "take it down" — it clears
                // the URL with it, so nothing is left pointing at a forgotten
                // object. See the API's `UpdateOrganizationDto`.
                onClick={() => update.mutate({ bannerKey: '' })}
                disabled={isUploading}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        )}
      </div>

      <BannerPreview
        previewUrl={candidate?.url ?? null}
        isUploading={isUploading}
        onConfirm={() => void handleConfirm()}
        onCancel={() => setCandidate(null)}
      />
    </>
  );
};
