import {
  forwardRef,
  useId,
  useState,
  type InputHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';
import { Eye, EyeOff } from 'lucide-react';

import { cn } from '@/shared/lib/cn';
import { translate } from '@/shared/i18n';

interface FieldShellProps {
  label?: string;
  hint?: string;
  error?: string;
  className?: string;
}

export interface InputProps
  extends InputHTMLAttributes<HTMLInputElement>,
    Omit<FieldShellProps, 'className'> {
  wrapperClassName?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, hint, error, className, wrapperClassName, id, ...props }, ref) => {
    const fieldId = id ?? props.name;

    return (
      <div className={cn('space-y-1.5', wrapperClassName)}>
        {label && (
          <label htmlFor={fieldId} className="block text-xs font-medium text-content-muted">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={fieldId}
          aria-invalid={Boolean(error)}
          className={cn('field', error && 'border-danger focus:border-danger focus:ring-danger/30', className)}
          {...props}
        />
        {(error ?? hint) && (
          <p className={cn('text-xs', error ? 'text-danger' : 'text-content-faint')}>
            {error ?? hint}
          </p>
        )}
      </div>
    );
  },
);

Input.displayName = 'Input';

/**
 * A password field you can look at.
 *
 * ## Why every password field in the product gets one
 *
 * Because the alternative is typing a 20-character generated string into a row
 * of dots and finding out whether you got it right by being refused. Masking
 * defends against somebody reading the screen over your shoulder, which is a
 * real threat in an office and no threat at all on the laptop most of this is
 * typed on — and it is the user, who can see their own room, who is in a
 * position to decide which of those they are in. So the mask stays on by
 * default and the decision is offered rather than made for them.
 *
 * It matters most on the fields that are hardest: `new-password` on sign-up and
 * on reset, where there is no saved value to fall back on, nothing to compare
 * against, and a typo costs the whole flow.
 *
 * ## Why the state is never lifted or persisted
 *
 * It resets to masked on every mount, and there is deliberately no way to ask
 * for "always visible". A revealed password that is still revealed when you come
 * back to the tab tomorrow is the shoulder-surfing case the mask exists for,
 * arrived at by a preference nobody remembers setting.
 *
 * ## Why `type` is swapped rather than a CSS `-webkit-text-security`
 *
 * Because the attribute is what password managers, autofill and the browser's
 * own "save this password" prompt read. A field that looks masked but is typed
 * `text` is invisible to all three, which trades a real feature for a styling
 * convenience.
 */
export type PasswordInputProps = Omit<InputProps, 'type'>;

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ label, hint, error, className, wrapperClassName, id, ...props }, ref) => {
    const [isRevealed, setIsRevealed] = useState(false);
    /*
     * `useId` rather than falling back to `name` the way `Input` does.
     *
     * Two password fields on one form is the normal case here, not the odd one
     * — "current" and "new" sit together in settings — and the label has to
     * point at the right one. `name` would be unique across that pair, but the
     * reset screen has two fields that are *both* the new password, so it is
     * not unique in general.
     */
    const generated = useId();
    const fieldId = id ?? `${generated}-password`;

    return (
      <div className={cn('space-y-1.5', wrapperClassName)}>
        {label && (
          <label htmlFor={fieldId} className="block text-xs font-medium text-content-muted">
            {label}
          </label>
        )}

        <div className="relative">
          <input
            ref={ref}
            id={fieldId}
            type={isRevealed ? 'text' : 'password'}
            aria-invalid={Boolean(error)}
            className={cn(
              // `pr-11` is the button's 2.25rem plus the field's own gutter, so
              // a long password scrolls under the control rather than behind it.
              'field pr-11',
              error && 'border-danger focus:border-danger focus:ring-danger/30',
              className,
            )}
            {...props}
          />

          <button
            type="button"
            /*
             * `tabIndex={-1}`, deliberately.
             *
             * The tab order through a sign-in form is email, password, submit.
             * Putting a decoration between the password and the button means
             * everybody who tabs to submit now presses Enter on an eye instead,
             * which at best does nothing and at worst reveals the password to
             * the room. It stays reachable by pointer, and by a screen reader's
             * own cursor, which is where it is actually wanted.
             */
            tabIndex={-1}
            onClick={() => setIsRevealed((revealed) => !revealed)}
            aria-label={translate(isRevealed ? 'common.hidePassword' : 'common.showPassword')}
            aria-pressed={isRevealed}
            title={translate(isRevealed ? 'common.hidePassword' : 'common.showPassword')}
            className={cn(
              'absolute right-1 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center',
              'rounded-lg text-content-faint transition-colors',
              'hover:bg-surface-sunken hover:text-content',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40',
            )}
          >
            {/*
              The icon shows the *state*, not the action, which is the way round
              every browser's own reveal control works: a crossed-out eye means
              "this is hidden". The label and the tooltip say the action, so the
              two together answer both readings.
            */}
            {isRevealed ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
          </button>
        </div>

        {(error ?? hint) && (
          <p className={cn('text-xs', error ? 'text-danger' : 'text-content-faint')}>
            {error ?? hint}
          </p>
        )}
      </div>
    );
  },
);

PasswordInput.displayName = 'PasswordInput';

export interface TextareaProps
  extends TextareaHTMLAttributes<HTMLTextAreaElement>,
    Omit<FieldShellProps, 'className'> {
  wrapperClassName?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, hint, error, className, wrapperClassName, id, ...props }, ref) => {
    const fieldId = id ?? props.name;

    return (
      <div className={cn('space-y-1.5', wrapperClassName)}>
        {label && (
          <label htmlFor={fieldId} className="block text-xs font-medium text-content-muted">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={fieldId}
          aria-invalid={Boolean(error)}
          className={cn(
            'field min-h-[5.75rem] resize-y leading-relaxed',
            error && 'border-danger focus:border-danger focus:ring-danger/30',
            className,
          )}
          {...props}
        />
        {(error ?? hint) && (
          <p className={cn('text-xs', error ? 'text-danger' : 'text-content-faint')}>
            {error ?? hint}
          </p>
        )}
      </div>
    );
  },
);

Textarea.displayName = 'Textarea';
