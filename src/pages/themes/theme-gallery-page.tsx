import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Moon,
  Palette,
  Search,
  Sun,
  X,
} from 'lucide-react';
import { toast } from 'sonner';

import { useTheme } from '@/app/providers/theme-provider';
import type { ThemeSkin } from '@/entities/user/model/types';
import {
  SKIN_BY_VALUE,
  SKIN_CATALOG,
  searchSkins,
  type SkinDefinition,
} from '@/features/theme-toggle/model/skin-catalog';
import { SkinMock } from '@/features/theme-toggle/ui/skin-mock';
import { TEXT_LIMITS } from '@/shared/config/constants';
import { cn } from '@/shared/lib/cn';
import { clampText } from '@/shared/lib/text';
import { useSkinMotion } from '@/shared/lib/skin-motion';
import { Button, DirectionArrow, EmptyState, RunicText } from '@/shared/ui';
import { useT } from '@/shared/i18n';

/**
 * Six to a page.
 *
 * Not a performance number — the whole catalogue is eight rows of static data.
 * It is a *shopping* number: a grid you can take in without scrolling is a grid
 * you compare, and comparing is the entire job of this screen. Pagination also
 * gives the page a rhythm the settings list never had.
 */
const PAGE_SIZE = 6;

interface GalleryCardProps {
  skin: SkinDefinition;
  isActive: boolean;
  isSelected: boolean;
  isDark: boolean;
  onSelect: () => void;
}

/**
 * One theme on the shelf.
 *
 * The whole card previews; nothing on it applies. Applying repaints the entire
 * app underneath the pointer, so browsing with an Apply button on every tile
 * made the shelf feel like eight ways to have an accident — and a card that
 * offers both actions makes you read it before you can click it. There is now
 * exactly one Apply in the room, in the preview box, next to the full-size
 * picture of what it will do.
 */
const GalleryCard = ({ skin, isActive, isSelected, isDark, onSelect }: GalleryCardProps) => {
  const t = useT();
  const preview = isDark ? skin.dark : skin.light;

  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 380, damping: 34 }}
      className={cn(
        'ui-card gpu group relative flex flex-col overflow-hidden rounded-2xl border',
        'bg-surface-raised transition-all duration-200 ease-studio',
        isSelected
          ? 'border-brand shadow-glow'
          : 'border-edge hover:-translate-y-1 hover:border-brand/50 hover:shadow-panel',
      )}
    >
      <button
        type="button"
        onClick={onSelect}
        aria-pressed={isSelected}
        aria-label={`{t('themes.preview')} the ${skin.name} theme`}
        className="relative block w-full p-2.5 pb-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand/50"
      >
        {/* The mock lifts out of the card under the pointer, so the picture is
            the thing that reacts rather than a border colour. */}
        <span className="block overflow-hidden rounded-xl transition-transform duration-300 ease-studio group-hover:scale-[1.03]">
          <SkinMock preview={preview} scale={1.15} className="w-full" />
        </span>

        <span className="mt-2.5 flex items-start gap-2 px-0.5">
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-1.5">
              <span className="truncate text-sm font-bold tracking-tight">{skin.name}</span>
              {isActive && (
                <span className="shrink-0 rounded-full bg-positive/15 px-1.5 py-px text-[9px] font-bold uppercase tracking-wide text-positive">
                  {t('themes.inUse')}
                </span>
              )}
            </span>
            <span className="mt-0.5 block truncate text-[11px] text-content-faint">
              {t(skin.tagline)}
            </span>
          </span>

          {isSelected && (
            <motion.span
              layoutId="gallery-selection"
              className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-brand text-brand-contrast"
            >
              <Check className="h-3 w-3" strokeWidth={3} />
            </motion.span>
          )}
        </span>
      </button>
    </motion.article>
  );
};

/**
 * The theme gallery.
 *
 * Everything a theme is lives in one catalogue (`skin-catalog.ts`) and this
 * page is a view over it: search filters, pagination slices, and the preview
 * box renders whichever row is selected at four times the thumbnail's scale.
 * Nothing on this screen knows what a specific theme looks like, which is why
 * adding the ninth one is a data change and not a UI change.
 */
const ThemeGalleryPage = () => {
  const t = useT();
  const { skin, setSkin, isDark } = useTheme();
  const motionSpec = useSkinMotion();

  const [query, setQuery] = useState('');
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<ThemeSkin>(skin);
  // The preview box can show either palette without touching the user's own.
  const [previewDark, setPreviewDark] = useState(isDark);

  useEffect(() => setPreviewDark(isDark), [isDark]);

  const results = useMemo(() => searchSkins(query), [query]);
  const pageCount = Math.max(1, Math.ceil(results.length / PAGE_SIZE));

  // A search that shortens the list must never leave the user on a page that
  // no longer exists — which reads as "the gallery went blank".
  useEffect(() => setPage((current) => Math.min(current, pageCount - 1)), [pageCount]);

  const visible = results.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);
  const detail = SKIN_BY_VALUE.get(selected) ?? SKIN_CATALOG[0];
  const detailPreview = previewDark ? detail.dark : detail.light;

  const apply = (value: ThemeSkin, name: string) => {
    setSkin(value);
    setSelected(value);
    toast.success(t('toast.skinApplied', { name }));
  };

  return (
    <div className="space-y-5 sm:space-y-7">
      <header className="space-y-1">
        <p className="text-[10px] uppercase tracking-[0.18em] text-content-faint sm:text-xs">
          <RunicText mode="always">{t('settings.appearance')}</RunicText>
        </p>
        <h1 className="flex items-center gap-2.5 text-xl font-semibold tracking-tight sm:text-2xl">
          <Palette className="h-5 w-5 text-brand" />
          {t('themes.heading')}
        </h1>
      </header>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
        {/* --- The shelf ---------------------------------------------------- */}
        <div className="order-2 space-y-4 lg:order-1">
          <div className="flex flex-wrap items-center gap-2">
            <label className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-content-faint" />
              <input
                value={query}
                onChange={(event) => {
                  setQuery(clampText(event.target.value, TEXT_LIMITS.search));
                  setPage(0);
                }}
                placeholder={t('themes.searchPlaceholder')}
                aria-label={t('themes.searchLabel')}
                maxLength={TEXT_LIMITS.search}
                className="field h-10 pl-9 pr-9"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  aria-label={t('themes.clearSearch')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-lg p-1 text-content-faint transition-colors hover:text-content"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </label>

            <span className="shrink-0 text-[11px] tabular-nums text-content-faint">
              {results.length} of {SKIN_CATALOG.length}
            </span>
          </div>

          {results.length === 0 ? (
            <EmptyState
              icon={<Search className="h-6 w-6" />}
              title={t('themes.noMatch')}
              description={t('themes.noMatchBody')}
              action={
                <Button size="sm" variant="secondary" onClick={() => setQuery('')}>
                  {t('themes.clearSearch')}
                </Button>
              }
            />
          ) : (
            <>
              {/*
                Keyed by the query and the page, so React remounts the grid and
                the enter animation runs per page — the whole sheet slides in as
                one object rather than six cards crossfading independently.

                Deliberately *not* wrapped in <AnimatePresence mode="wait">.
                That is the same trap the route transitions in `app-layout.tsx`
                document: the outgoing sheet has to finish exiting before the
                next one mounts, and a stalled exit leaves the grid showing a
                set of themes the search no longer matches — which is what this
                did the first time it was wired up. A remount cannot stall.
              */}
              <motion.div
                key={`${query}:${page}`}
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={motionSpec.reveal}
                className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3"
              >
                {visible.map((entry) => (
                  <GalleryCard
                    key={entry.value}
                    skin={entry}
                    isActive={skin === entry.value}
                    isSelected={selected === entry.value}
                    isDark={previewDark}
                    onSelect={() => setSelected(entry.value)}
                  />
                ))}
              </motion.div>

              {pageCount > 1 && (
                <nav
                  aria-label={t('themes.pages')}
                  className="flex items-center justify-center gap-2 pt-1"
                >
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label={t('themes.previousPage')}
                    disabled={page === 0}
                    onClick={() => setPage((current) => Math.max(0, current - 1))}
                  >
                    <DirectionArrow direction="left" fallback={ArrowLeft} className="h-4 w-4" />
                  </Button>

                  {Array.from({ length: pageCount }, (_, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => setPage(index)}
                      aria-label={t('common.pageNumber', { number: String(index + 1) })}
                      aria-current={index === page}
                      className={cn(
                        'h-2 rounded-full transition-all duration-200 ease-studio',
                        index === page
                          ? 'w-6 bg-brand'
                          : 'w-2 bg-edge hover:bg-content-faint',
                      )}
                    />
                  ))}

                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label={t('themes.nextPage')}
                    disabled={page >= pageCount - 1}
                    onClick={() => setPage((current) => Math.min(pageCount - 1, current + 1))}
                  >
                    <DirectionArrow direction="right" fallback={ArrowRight} className="h-4 w-4" />
                  </Button>
                </nav>
              )}
            </>
          )}
        </div>

        {/* --- The preview box ---------------------------------------------- */}
        <aside className="order-1 lg:sticky lg:top-20 lg:order-2">
          <div className="panel overflow-hidden">
            <div className="flex items-center gap-2 border-b border-edge px-3.5 py-2.5">
              <p className="flex-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-content-faint">
                {t('themes.preview')}
              </p>

              {/* Both palettes ship with every theme, so the box can show either
                  without the page committing to one. */}
              <div className="ui-segment inline-flex items-center gap-0.5 rounded-lg border border-edge bg-surface-sunken p-0.5">
                {[
                  { value: false, label: t('theme.light'), icon: <Sun className="h-3 w-3" /> },
                  { value: true, label: t('theme.dark'), icon: <Moon className="h-3 w-3" /> },
                ].map((option) => (
                  <button
                    key={option.label}
                    type="button"
                    onClick={() => setPreviewDark(option.value)}
                    aria-pressed={previewDark === option.value}
                    className={cn(
                      'inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-medium transition-colors duration-150',
                      previewDark === option.value
                        ? 'bg-surface-raised text-content shadow-sm'
                        : 'text-content-muted hover:text-content',
                    )}
                  >
                    {option.icon}
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-3.5">
              {/* The stage. Keyed by theme *and* palette so a switch animates
                  rather than swapping colours under a static frame — and a
                  remount for the same reason as the grid above. */}
              <motion.div
                key={`${detail.value}:${String(previewDark)}`}
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={motionSpec.reveal}
                className="gpu overflow-hidden rounded-xl ring-1 ring-edge"
              >
                <SkinMock preview={detailPreview} scale={2.4} className="w-full" />
              </motion.div>

              <div className="space-y-2.5 pt-3.5">
                <div className="flex items-baseline gap-2">
                  <h2 className="text-base font-bold tracking-tight">{detail.name}</h2>
                  <span className="truncate text-[11px] text-content-faint">
                    {t(detail.tagline)}
                  </span>
                </div>

                {/* The description, and nothing else. The tag chips were a
                    second, worse description of the same theme sitting under
                    the first one — they still earn their keep as search terms,
                    which is where they now live and nowhere else. */}
                <p className="text-xs leading-relaxed text-content-muted">
                  {t(detail.description)}
                </p>

                <Button
                  className="w-full"
                  disabled={skin === detail.value}
                  onClick={() => apply(detail.value, detail.name)}
                >
                  {skin === detail.value ? (
                    <>
                      <Check className="h-3.5 w-3.5" strokeWidth={3} />
                      {t('themes.currentlyApplied')}
                    </>
                  ) : (
                    <>
                      <Palette className="h-3.5 w-3.5" />
                      Apply {detail.name}
                    </>
                  )}
                </Button>

                <p className="text-center text-[10px] leading-relaxed text-content-faint">
                  {t('themes.bothModes')}
                </p>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default ThemeGalleryPage;
