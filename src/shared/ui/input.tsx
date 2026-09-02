import { forwardRef, type InputHTMLAttributes, type TextareaHTMLAttributes } from 'react';

import { cn } from '@/shared/lib/cn';

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
