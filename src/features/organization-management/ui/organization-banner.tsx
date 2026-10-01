import { useEffect, useRef, useState } from 'react';
import { ImagePlus, Loader2, Trash2 } from 'lucide-react';
import { toast } from '@/shared/lib/toast';

import { useUpdateOrganization } from '@/entities/organization/model/queries';
import type { Organization } from '@/entities/organization/model/types';
import { uploadImage } from '@/entities/user/api/user.api';
import { cn } from '@/shared/lib/cn';
import { withAlpha } from '@/shared/lib/colors';
import { Button, Modal } from '@/shared/ui';
import { useT } from '@/shared/i18n';

/**
 * A generous letterhead, not a hero image. Tall enough for a logo lockup or a photograph of the
 * office to survive being cropped to a strip.
 */
const BANNER_CLASSES =
  'relative w-full overflow-hidden rounded-3xl border border-edge aspect-[5/1] min-h-[6.5rem]';

interface BannerPreviewProps {
  /** An object URL for the picked file. Null while nothing is being reviewed. */
  previewUrl: string | null;
  isUploading: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * What that picture will actually look like up there. The banner is a 5:1 strip and almost nothing
 * anybody picks is 5:1.
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
            <p className="text-2xs leading-relaxed text-content-faint">
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

/** The picture across the top of a company's page. */
export const OrganizationBanner = ({ organization }: OrganizationBannerProps) => {
  const t = useT();
  const fileRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [candidate, setCandidate] = useState<{ file: File; url: string } | null>(null);

  const update = useUpdateOrganization(organization.id);

  // Object URLs are a manual allocation. Each one pins the whole file in memory until it is
  // revoked.
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
      // `uploadImage` throws on a file the browser cannot decode, and the mutation reports its own
      // failures.
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
        {/* A scrim under the controls only, so a pale banner never leaves a white button on
            white. Pointer-events-none: it is decoration, and it sits over the whole strip. */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent"
        />

        {/* Owner or admin only. `canManage` is the same flag the API enforces — an ordinary
            member opening this page sees the banner and no controls. */}
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
                // The empty key is the contract for "take it down" — it clears the URL with it, so
                // nothing is left pointing at a forgotten object.
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
