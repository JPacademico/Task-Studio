import { Link } from 'react-router-dom';
import { useT } from '@/shared/i18n';

export const NotFoundPage = () => {
  const t = useT();

  return (
  <div className="grid min-h-screen place-items-center px-6 text-center">
    <div className="space-y-4">
      <p className="text-6xl font-black tracking-tighter text-brand">404</p>
      <h1 className="text-lg font-semibold">{t('error.notFound.title')}</h1>
      <p className="mx-auto max-w-sm text-sm text-content-muted">
        {t('error.notFound.body')}
      </p>
      <Link
        to="/"
        className="inline-flex h-10 items-center justify-center rounded-xl bg-brand px-4 text-sm
          font-medium text-brand-contrast transition-[transform,filter] duration-150
          hover:brightness-110 active:scale-[0.98]"
      >
        {t('error.notFound.back')}
      </Link>
    </div>
  </div>
  );
};
