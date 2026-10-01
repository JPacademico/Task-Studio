import { MousePointer2 } from 'lucide-react';

import { useTheme } from '@/app/providers/theme-provider';
import { useT } from '@/shared/i18n';
import { cn } from '@/shared/lib/cn';
import { Switch } from '@/shared/ui';

/**
 * The opt-out for skins that replace the mouse pointer. A custom cursor is the one thing a skin
 * changes that the reader cannot look away from.
 */
export const CursorToggle = ({ className }: { className?: string }) => {
  const t = useT();
  const { hasCustomCursor, setHasCustomCursor } = useTheme();

  return (
    <div
      className={cn(
        'rounded-2xl border border-edge bg-surface-raised px-3.5 py-2.5',
        className,
      )}
    >
      <Switch
        id="custom-cursor"
        checked={hasCustomCursor}
        onChange={setHasCustomCursor}
        label={
          <span className="flex items-center gap-1.5 font-medium text-content">
            <MousePointer2 className="h-3.5 w-3.5 shrink-0 text-brand" strokeWidth={2.4} />
            {t('themes.cursor')}
          </span>
        }
      />
    </div>
  );
};
