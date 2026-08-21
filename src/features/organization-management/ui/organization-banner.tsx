import { useRef, useState } from 'react';
import { ImagePlus, Loader2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { useUpdateOrganization } from '@/entities/organization/model/queries';
import type { Organization } from '@/entities/organization/model/types';
import { uploadImage } from '@/entities/user/api/user.api';
import { cn } from '@/shared/lib/cn';
import { withAlpha } from '@/shared/lib/colors';
import { Button } from '@/shared/ui';
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
 */
export const OrganizationBanner = ({ organization }: OrganizationBannerProps) => {
  const t = useT();
  const fileRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const update = useUpdateOrganization(organization.id);

  const handlePick = async (file: File | undefined) => {
    if (!file) return;

    setIsUploading(true);
    try {
      const { key, publicUrl } = await uploadImage(file, 'banners');
      await update.mutateAsync({ bannerKey: key, bannerUrl: publicUrl });
    } catch {
      // `uploadImage` throws on a file the browser cannot decode, and the
      // mutation reports its own failures. Either way the honest thing to say
      // is that the picture did not land — the company is untouched.
      toast.error(t('org.bannerFailed'));
    } finally {
      setIsUploading(false);
      // Cleared so that picking the *same* file again still fires a change
      // event, which is the usual way somebody retries after a failure.
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
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
            onChange={(event) => void handlePick(event.target.files?.[0])}
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
  );
};
