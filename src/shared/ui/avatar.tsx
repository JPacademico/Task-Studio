import { cn } from '@/shared/lib/cn';
import { avatarColor, initials } from '@/shared/lib/colors';

interface AvatarProps {
  name: string;
  src?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
  title?: string;
}

const SIZES = {
  xs: 'h-6 w-6 text-[10px]',
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-16 w-16 text-lg',
} as const;

export const Avatar = ({ name, src, size = 'sm', className, title }: AvatarProps) => (
  <span
    title={title ?? name}
    className={cn(
      'inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full',
      'font-semibold text-white ring-2 ring-surface-raised',
      SIZES[size],
      className,
    )}
    style={src ? undefined : { backgroundColor: avatarColor(name) }}
  >
    {src ? (
      <img src={src} alt={name} className="h-full w-full object-cover" loading="lazy" />
    ) : (
      initials(name)
    )}
  </span>
);

interface AvatarStackProps {
  people: { id: string; displayName: string; avatarUrl?: string | null }[];
  max?: number;
  size?: AvatarProps['size'];
}

/** Overlapping assignee chips, with a "+N" overflow badge. */
export const AvatarStack = ({ people, max = 4, size = 'xs' }: AvatarStackProps) => {
  const visible = people.slice(0, max);
  const overflow = people.length - visible.length;

  return (
    <div className="flex items-center">
      <div className="flex -space-x-2">
        {visible.map((person) => (
          <Avatar
            key={person.id}
            name={person.displayName}
            src={person.avatarUrl}
            size={size}
          />
        ))}
      </div>
      {overflow > 0 && (
        <span className="ml-2 text-[11px] font-medium text-content-faint">+{overflow}</span>
      )}
    </div>
  );
};
