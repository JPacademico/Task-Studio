import { MousePointer2 } from 'lucide-react';

import { useTheme } from '@/app/providers/theme-provider';
import { useT } from '@/shared/i18n';
import { cn } from '@/shared/lib/cn';
import { Switch } from '@/shared/ui';

/**
 * The opt-out for skins that replace the mouse pointer.
 *
 * ## Why this is a control and not a decision the theme makes
 *
 * A custom cursor is the one thing a skin changes that the reader cannot look
 * away from. Several themes ship one — Paper throws a paper plane, Halloween
 * carries a knife, Dragon a guan dao — and each is the point of the theme
 * rather than decoration on it, so they are on by default. But a pointer is
 * also the one piece of chrome somebody may have a real reason to keep: a
 * screen being shared, a precision drag on a whiteboard, a machine where a 40px
 * PNG cursor lags behind the system one, or simply not wanting a knife on a
 * work laptop. Making them choose between the theme and their pointer is a
 * false choice when one attribute settles it.
 *
 * ## Why it reads as "off" rather than as a separate setting
 *
 * It sits directly under the preview, in both places a theme is chosen, because
 * that is where the question occurs to somebody — while they are looking at
 * what they are about to get. Buried in a preferences page it would be found by
 * the people who already know it exists, which is nobody.
 *
 * ## Why there is no explanatory line under it
 *
 * There was one, in two variants depending on whether the active theme drew a
 * pointer. Both said what the label and the switch already say: this turns the
 * theme's cursor off. A sentence that restates its own control is not a hint —
 * it is a second row of text to read past, on a box whose entire content is one
 * toggle. The box is sized for the switch alone now.
 *
 * The state lives in `ThemeProvider` and is stored per device rather than on
 * the account; see `readStoredCursor` for that argument. Writing it flips one
 * attribute on `<html>`, which every cursor rule in `index.css` is gated on.
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
