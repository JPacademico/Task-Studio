import { MousePointer2 } from 'lucide-react';

import { useTheme } from '@/app/providers/theme-provider';
import { useT } from '@/shared/i18n';
import { cn } from '@/shared/lib/cn';
import { Switch } from '@/shared/ui';
import { SKIN_CATALOG } from '../model/skin-catalog';

/**
 * The opt-out for skins that replace the mouse pointer.
 *
 * ## Why this is a control and not a decision the theme makes
 *
 * A custom cursor is the one thing a skin changes that the reader cannot look
 * away from. Two of the themes ship one — Paper throws a paper plane, Halloween
 * carries a knife — and both are the point of the theme rather than decoration
 * on it, so they are on by default. But a pointer is also the one piece of
 * chrome somebody may have a real reason to keep: a screen being shared, a
 * precision drag on a whiteboard, a machine where a 40px PNG cursor lags behind
 * the system one, or simply not wanting a knife on a work laptop. Making them
 * choose between the theme and their pointer is a false choice when one
 * attribute settles it.
 *
 * ## Why it reads as "off" rather than as a separate setting
 *
 * It sits directly under the preview, in both places a theme is chosen, because
 * that is where the question occurs to somebody — while they are looking at
 * what they are about to get. Buried in a preferences page it would be found by
 * the people who already know it exists, which is nobody.
 *
 * The state lives in `ThemeProvider` and is stored per device rather than on
 * the account; see `readStoredCursor` for that argument. Writing it flips one
 * attribute on `<html>`, which every cursor rule in `index.css` is gated on.
 */
export const CursorToggle = ({ className }: { className?: string }) => {
  const t = useT();
  const { hasCustomCursor, setHasCustomCursor, skin } = useTheme();

  const drawsCursor = SKIN_CATALOG.find((option) => option.value === skin)?.drawsCursor ?? false;

  return (
    <div
      className={cn(
        'rounded-2xl border border-edge bg-surface-raised px-3.5 py-3',
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

      {/*
        Two hints, one control. Which one shows depends on whether the *active*
        theme draws a pointer, because "this does nothing right now" is the
        thing somebody toggling it on a plain theme needs to be told — and the
        alternative, hiding the control on those themes, would make it appear
        and disappear as they browsed the gallery.
      */}
      <p className="mt-1.5 pl-[2.9rem] text-2xs leading-relaxed text-content-faint">
        {drawsCursor ? t('themes.cursorHint') : t('themes.cursorHintInactive')}
      </p>
    </div>
  );
};
