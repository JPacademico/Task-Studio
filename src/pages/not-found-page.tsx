import { Link } from 'react-router-dom';

export const NotFoundPage = () => (
  <div className="grid min-h-screen place-items-center px-6 text-center">
    <div className="space-y-4">
      <p className="text-6xl font-black tracking-tighter text-brand">404</p>
      <h1 className="text-lg font-semibold">This board does not exist</h1>
      <p className="mx-auto max-w-sm text-sm text-content-muted">
        The page may have been deleted, or the link is wrong.
      </p>
      <Link
        to="/"
        className="inline-flex h-10 items-center justify-center rounded-xl bg-brand px-4 text-sm
          font-medium text-brand-contrast transition-[transform,filter] duration-150
          hover:brightness-110 active:scale-[0.98]"
      >
        Back to dashboard
      </Link>
    </div>
  </div>
);
