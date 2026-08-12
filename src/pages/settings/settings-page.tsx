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
import { cn } from '@/shared/lib/cn';
import { Avatar, Button, Input, Section, Spinner, Textarea } from '@/shared/ui';

const THEMES: { value: ThemePreference; label: string; icon: ReactNode }[] = [
  { value: 'LIGHT', label: 'Light', icon: <Sun className="h-3.5 w-3.5" /> },
  { value: 'DARK', label: 'Dark', icon: <Moon className="h-3.5 w-3.5" /> },
  { value: 'SYSTEM', label: 'System', icon: <Monitor className="h-3.5 w-3.5" /> },
];

const SettingsPage = () => {
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
      toast.success('Profile saved.');
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
      toast.success('Avatar removed.');
    },
  });

  const handleAvatarUpload = async (file: File) => {
    setIsUploading(true);
    try {
      const { key } = await uploadImage(file, 'avatars');
      setUser(await userApi.setAvatar(key));
      toast.success('Avatar updated.');
    } catch (error) {
      toast.error(errorMessage(error, 'Could not upload the image.'));
    } finally {
      setIsUploading(false);
    }
  };

  const passwordIsValid =
    newPassword.length >= 8 && /\d/.test(newPassword) && /[a-zA-Z]/.test(newPassword);

  return (
    <div className="mx-auto max-w-3xl space-y-9">
      <header className="space-y-1">
        <p className="text-xs uppercase tracking-[0.18em] text-content-faint">Settings</p>
        <h1 className="text-2xl font-semibold tracking-tight">Profile & preferences</h1>
      </header>

      <Section title="Avatar" description="Uploaded straight to Cloudflare R2, max 5 MB.">
        <div className="flex items-center gap-4 rounded-2xl border border-edge bg-surface-raised p-4">
          <Avatar name={user?.displayName ?? '?'} src={user?.avatarUrl} size="lg" />

          <div className="flex flex-wrap items-center gap-2">
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-edge px-3 py-2 text-xs transition-colors hover:border-brand hover:text-brand">
              {isUploading ? (
                <Spinner />
              ) : (
                <ImagePlus className="h-3.5 w-3.5" />
              )}
              {isUploading ? 'Uploading…' : 'Upload image'}
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
                Remove
              </Button>
            )}
          </div>
        </div>
      </Section>

      <Section title="Identity">
        <form
          className="space-y-4 rounded-2xl border border-edge bg-surface-raised p-4"
          onSubmit={(event) => {
            event.preventDefault();
            saveProfile.mutate();
          }}
        >
          <Input
            label="Display name"
            name="displayName"
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            minLength={2}
            maxLength={60}
          />
          <Input label="Email" name="email" value={user?.email ?? ''} disabled />
          <Textarea
            label="Bio"
            name="bio"
            value={bio}
            onChange={(event) => setBio(event.target.value)}
            maxLength={280}
            placeholder="What are you working on?"
          />
          <div className="flex justify-end">
            <Button type="submit" isLoading={saveProfile.isPending}>
              Save profile
            </Button>
          </div>
        </form>
      </Section>

      <Section title="Theme" description="Every theme ships both a light and a dark palette.">
        <div className="rounded-2xl border border-edge bg-surface-raised p-4">
          <SkinPicker />
        </div>
      </Section>

      <Section title="Appearance" description="Synced to your account, applied instantly.">
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
              {option.label}
            </button>
          ))}
        </div>
      </Section>

      <Section
        title="Password"
        description="Changing it signs out every device, including this one."
      >
        <form
          className="space-y-4 rounded-2xl border border-edge bg-surface-raised p-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (passwordIsValid) changePassword.mutate();
          }}
        >
          <Input
            label="Current password"
            name="currentPassword"
            type="password"
            autoComplete="current-password"
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
          />
          <Input
            label="New password"
            name="newPassword"
            type="password"
            autoComplete="new-password"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            hint="8+ characters, with at least one letter and one number."
          />
          <div className="flex justify-end">
            <Button
              type="submit"
              variant="secondary"
              isLoading={changePassword.isPending}
              disabled={!passwordIsValid || currentPassword.length === 0}
            >
              Change password
            </Button>
          </div>
        </form>
      </Section>
    </div>
  );
};

export default SettingsPage;
