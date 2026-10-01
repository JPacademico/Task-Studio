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

/** A password field you can look at. */
export type PasswordInputProps = Omit<InputProps, 'type'>;

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ label, hint, error, className, wrapperClassName, id, ...props }, ref) => {
    const [isRevealed, setIsRevealed] = useState(false);
    // `useId` rather than falling back to `name` the way `Input` does. Two password fields on one
    // form is the normal case here, not the odd one — "current" and "new" sit together in settings.
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
            /* `tabIndex={-1}`, deliberately. The tab order through a sign-in form is email,
               password, submit. */
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
            {/* The icon shows the *state*, not the action, which is the way round every
                browser's own reveal control works: a crossed-out eye means "this is hidden". */}
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
