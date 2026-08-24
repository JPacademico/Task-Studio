import { useEffect, useState, type ReactNode } from 'react';
import { useMutation } from '@tanstack/react-query';
import { ImagePlus, Monitor, Moon, Sun, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { useTheme } from '@/app/providers/theme-provider';
import { uploadImage, userApi } from '@/entities/user/api/user.api';
import type { ThemePreference } from '@/entities/user/model/types';
import { authApi } from '@/features/auth/api/auth.api';
import { useSessionStore } from '@/features/auth/model/session.store';
import { SkinPicker } from '@/features/theme-toggle/ui/skin-picker';
import { errorMessage } from '@/shared/api/client';
import { TEXT_LIMITS } from '@/shared/config/constants';
import { cn } from '@/shared/lib/cn';
import { clampText } from '@/shared/lib/text';
import { Avatar, Button, Input, Section, Spinner, Textarea } from '@/shared/ui';
import { useT, type TranslationKey } from '@/shared/i18n';

/*
 * Keys, not words: this is a module constant evaluated at import, long
 * before a language is known. See the same note on the sidebar's `GROUPS`.
 */
const THEMES: { value: ThemePreference; label: TranslationKey; icon: ReactNode }[] = [
  { value: 'LIGHT', label: 'settings.light', icon: <Sun className="h-3.5 w-3.5" /> },
  { value: 'DARK', label: 'settings.dark', icon: <Moon className="h-3.5 w-3.5" /> },
  { value: 'SYSTEM', label: 'settings.system', icon: <Monitor className="h-3.5 w-3.5" /> },
];

const SettingsPage = () => {
  const t = useT();
  const { user, setUser } = useSessionStore();
  const { preference, setPreference } = useTheme();

  const [displayName, setDisplayName] = useState(user?.displayName ?? '');
  const [bio, setBio] = useState(user?.bio ?? '');
  const [isUploading, setIsUploading] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');

  useEffect(() => {
    setDisplayName(user?.displayName ?? '');
    setBio(user?.bio ?? '');
  }, [user?.bio, user?.displayName]);

  const saveProfile = useMutation({
    mutationFn: () => userApi.updateProfile({ displayName, bio }),
    onSuccess: (updated) => {
      setUser(updated);
      toast.success(t('settings.profileSaved'));
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  const changePassword = useMutation({
    mutationFn: () => authApi.changePassword({ currentPassword, newPassword }),
    onSuccess: (response) => {
      setCurrentPassword('');
      setNewPassword('');
      // Every session was revoked server-side, including this one.
      toast.success(response.message);
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  const removeAvatar = useMutation({
    mutationFn: userApi.removeAvatar,
    onSuccess: (updated) => {
      setUser(updated);
      toast.success(t('settings.avatarRemoved'));
    },
  });

  const handleAvatarUpload = async (file: File) => {
    setIsUploading(true);
    try {
      const { key } = await uploadImage(file, 'avatars');
      setUser(await userApi.setAvatar(key));
      toast.success(t('settings.avatarUpdated'));
    } catch (error) {
      toast.error(errorMessage(error, t('settings.uploadFailed')));
    } finally {
      setIsUploading(false);
    }
  };

  const passwordIsValid =
    newPassword.length >= 8 && /\d/.test(newPassword) && /[a-zA-Z]/.test(newPassword);

  return (
    <div className="mx-auto max-w-3xl space-y-9">
      <header className="space-y-1">
        <p className="text-xs uppercase tracking-[0.18em] text-content-faint">{t('settings.title')}</p>
        <h1 className="text-2xl font-semibold tracking-tight">{t('settings.heading')}</h1>
      </header>

      <Section title={t('settings.avatar')}>
        <div className="flex items-center gap-4 rounded-2xl border border-edge bg-surface-raised p-4">
          <Avatar name={user?.displayName ?? '?'} src={user?.avatarUrl} size="lg" />

          <div className="flex flex-wrap items-center gap-2">
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-edge px-3 py-2 text-xs transition-colors hover:border-brand hover:text-brand">
              {isUploading ? (
                <Spinner />
              ) : (
                <ImagePlus className="h-3.5 w-3.5" />
              )}
              {isUploading ? t('settings.uploading') : t('settings.uploadImage')}
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/avif"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void handleAvatarUpload(file);
                }}
              />
            </label>

            {user?.avatarUrl && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeAvatar.mutate()}
                isLoading={removeAvatar.isPending}
              >
                <Trash2 className="h-3.5 w-3.5" />
                {t('settings.remove')}
              </Button>
            )}
          </div>
        </div>
      </Section>

      <Section title={t('settings.identity')}>
        <form
          className="space-y-4 rounded-2xl border border-edge bg-surface-raised p-4"
          onSubmit={(event) => {
            event.preventDefault();
            saveProfile.mutate();
          }}
        >
          <Input
            label={t('auth.signUp.displayName')}
            name="displayName"
            value={displayName}
            onChange={(event) =>
              setDisplayName(clampText(event.target.value, TEXT_LIMITS.displayName))
            }
            minLength={2}
            maxLength={TEXT_LIMITS.displayName}
          />
          <Input label={t('auth.email')} name="email" value={user?.email ?? ''} disabled />
          <Textarea
            label={t('settings.bio')}
            name="bio"
            value={bio}
            onChange={(event) => setBio(clampText(event.target.value, TEXT_LIMITS.bio))}
            maxLength={TEXT_LIMITS.bio}
            placeholder={t('settings.bioPlaceholder')}
          />
          <div className="flex justify-end">
            <Button type="submit" isLoading={saveProfile.isPending}>
              {t('settings.saveProfile')}
            </Button>
          </div>
        </form>
      </Section>

      {/* Three, then a door. The full catalogue is a gallery, not a setting —
          see the note on SkinPicker. */}
      <Section title={t('settings.theme')}>
        <div className="rounded-2xl border border-edge bg-surface-raised p-4">
          <SkinPicker />
        </div>
      </Section>

      <Section title={t('settings.appearance')}>
        <div className="flex flex-wrap gap-2 rounded-2xl border border-edge bg-surface-raised p-4">
          {THEMES.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setPreference(option.value)}
              className={cn(
                'inline-flex items-center gap-2 rounded-xl border px-3.5 py-2 text-xs transition-colors',
                preference === option.value
                  ? 'border-brand bg-brand/12 text-brand'
                  : 'border-edge text-content-muted hover:text-content',
              )}
            >
              {option.icon}
              {t(option.label)}
            </button>
          ))}
        </div>
      </Section>

      <Section title={t('settings.password')}>
        <form
          className="space-y-4 rounded-2xl border border-edge bg-surface-raised p-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (passwordIsValid) changePassword.mutate();
          }}
        >
          <Input
            label={t('settings.currentPassword')}
            name="currentPassword"
            type="password"
            autoComplete="current-password"
            value={currentPassword}
            onChange={(event) =>
              setCurrentPassword(clampText(event.target.value, TEXT_LIMITS.password))
            }
            maxLength={TEXT_LIMITS.password}
          />
          <Input
            label={t('auth.reset.newPassword')}
            name="newPassword"
            type="password"
            autoComplete="new-password"
            value={newPassword}
            onChange={(event) =>
              setNewPassword(clampText(event.target.value, TEXT_LIMITS.password))
            }
            maxLength={TEXT_LIMITS.password}
            hint={t('auth.reset.hint')}
          />
          <div className="flex justify-end">
            {/* The section lost its subtitle, but the consequence is real and
                irreversible — so it moves onto the control that causes it
                rather than disappearing with the prose. */}
            <Button
              type="submit"
              variant="secondary"
              title={t('settings.signsOutEverywhere')}
              isLoading={changePassword.isPending}
              disabled={!passwordIsValid || currentPassword.length === 0}
            >
              {t('settings.changePassword')}
            </Button>
          </div>
        </form>
      </Section>
    </div>
  );
};

export default SettingsPage;
