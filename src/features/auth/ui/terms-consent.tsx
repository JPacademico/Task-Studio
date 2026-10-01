import { useT } from '@/shared/i18n';
import { cn } from '@/shared/lib/cn';

const LINK = 'font-medium text-brand underline underline-offset-2 hover:no-underline';

/** The two documents, opened in a new tab so a half-filled form is not lost. */
const Documents = () => {
  const t = useT();

  return (
    <>
      <a href="/terms" target="_blank" rel="noopener" className={LINK}>
        {t('legal.terms')}
      </a>{' '}
      {t('legal.accept.and')}{' '}
      <a href="/privacy" target="_blank" rel="noopener" className={LINK}>
        {t('legal.privacy')}
      </a>
    </>
  );
};

/** The signup checkbox. Required by the form and checked again by the API. */
export const TermsCheckbox = ({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
}) => {
  const t = useT();

  return (
    <label className="flex cursor-pointer items-start gap-2.5 text-xs leading-relaxed text-content-muted">
      <input
        type="checkbox"
        name="acceptTerms"
        required
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded accent-[rgb(var(--brand))]"
      />
      <span>
        {t('legal.accept.lead')} <Documents />.
      </span>
    </label>
  );
};

/** Under the sign-in providers, which can create an account on first use. */
export const TermsNotice = ({ className }: { className?: string }) => {
  const t = useT();

  return (
    <p className={cn('text-center text-2xs leading-relaxed text-content-faint', className)}>
      {t('legal.notice.lead')} <Documents />.
    </p>
  );
};
