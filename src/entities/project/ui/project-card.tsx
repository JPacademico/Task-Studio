import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle2, ListTodo, Pin, Users } from 'lucide-react';

import { cn } from '@/shared/lib/cn';
import { useProjectIntentPrefetch } from '../model/queries';
import { withAlpha } from '@/shared/lib/colors';
import { useIsTouchDevice } from '@/shared/lib/hooks';
import { AvatarStack } from '@/shared/ui';
import { useT } from '@/shared/i18n';
import type { ProjectListItem } from '../model/types';

interface ProjectCardProps {
  project: ProjectListItem;
  onTogglePin?: (project: ProjectListItem) => void;
}

/**
 * Everything the card holds back until it is asked for.
 *
 * Its own component because two layouts render it: the pointer one, where it
 * lives in a panel that opens downward over the grid, and the touch one, where
 * there is no hover to open anything and it simply sits in the card.
 */
const ProjectDetails = ({ project }: { project: ProjectListItem }) => {
  const t = useT();

  const done = project.taskCount - project.openTaskCount;
  const progress = project.taskCount === 0 ? 0 : Math.round((done / project.taskCount) * 100);

  return (
    <div className="space-y-3 px-4 pb-4 pt-3">
      <p className="line-clamp-2 min-h-[2rem] text-xs leading-relaxed text-content-muted">
        {project.description ?? t('common.noDescription')}
      </p>

      <div className="space-y-1.5">
        <div className="h-1.5 overflow-hidden rounded-full bg-surface-sunken">
          {/*
            Width from a style, not a motion animation.

            The bar used to animate from zero on mount, which was right when
            every card was expanded on arrival. Now the panel it lives in is
            revealed on hover — so the animation would replay each time the
            pointer crossed a card, and a progress bar that re-fills on every
            hover reads as data changing rather than as decoration.
          */}
          <div
            className="h-full rounded-full transition-[width] duration-500 ease-studio"
            style={{ width: `${progress}%`, backgroundColor: project.color }}
          />
        </div>
        <div className="flex items-center justify-between text-[11px] text-content-faint">
          <span className="inline-flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" />
            {t('project.doneCount', { count: done })}
          </span>
          <span className="inline-flex items-center gap-1">
            <ListTodo className="h-3 w-3" />
            {t('project.openCount', { count: project.openTaskCount })}
          </span>
        </div>
      </div>

      <footer className="flex items-center justify-between border-t border-edge pt-3">
        <span className="inline-flex items-center gap-1.5 text-[11px] text-content-faint">
          <Users className="h-3 w-3" />
          {project.roster.length}
        </span>
        <AvatarStack people={project.roster} max={4} />
      </footer>
    </div>
  );
};

/**
 * One project, at rest and opened.
 *
 * ## The two states
 *
 * A dashboard's job is to let somebody find the project they want, and the
 * thing that does that is the name. Description, progress, counts and roster
 * are what you read *once you have found it* — so the card is a banner, a pin
 * and a title until the pointer settles on it, at which point it opens
 * downward and shows the rest.
 *
 * Six cards at 228px each is a screen and a half of scrolling before the task
 * list below is reachable; six at 100px is one glance.
 *
 * ## Why it opens *over* the grid rather than pushing it
 *
 * The detail panel is absolutely positioned under the card. If it were in
 * normal flow, hovering would grow the grid row and shove every card on that
 * row and below it — a layout that moves under the pointer, on a surface whose
 * whole purpose is aiming at one of twelve similar targets. Opening over the
 * neighbours costs a `z-index` and keeps the grid still.
 *
 * The expansion is `grid-template-rows: 0fr → 1fr` rather than a measured
 * height: it needs no JavaScript, no layout read, and it animates correctly
 * whatever the description turns out to be. `prefers-reduced-motion` flattens
 * it through the global rule.
 *
 * ## Touch
 *
 * There is no hover on a phone, so there is nothing to open with. The touch
 * layout keeps every card expanded — which is what this surface has always
 * done — and the whole absolute-panel apparatus is simply not rendered.
 */
export const ProjectCard = ({ project, onTogglePin }: ProjectCardProps) => {
  const t = useT();
  const isTouch = useIsTouchDevice();

  /*
   * A card the pointer settles on is very probably the next page.
   *
   * Spread onto the wrapper rather than the stretched link inside it, so the
   * whole card is the target — the link is a transparent overlay and the mouse
   * spends most of its time over the banner and the counters, not over it. The
   * hook does the deciding about whether this actually fires.
   */
  const intent = useProjectIntentPrefetch(project.id);

  const banner = (
    <div
      aria-hidden
      className={cn('w-full', isTouch ? 'h-16' : 'h-14')}
      style={{
        background: project.bannerUrl
          ? `url(${project.bannerUrl}) center/cover`
          : `linear-gradient(135deg, ${project.color}, ${withAlpha(project.color, 0.35)})`,
      }}
    />
  );

  const pin = onTogglePin && (
    <button
      type="button"
      aria-label={t(project.isPinned ? 'project.unpin' : 'project.pin')}
      title={t(project.isPinned ? 'project.unpin' : 'project.pin')}
      onClick={() => onTogglePin(project)}
      className={cn(
        // z-20: above the card-wide link, or pinning would navigate.
        'absolute right-2.5 top-2.5 z-20 grid h-7 w-7 place-items-center rounded-full backdrop-blur',
        'transition-colors duration-150',
        project.isPinned
          ? 'bg-white/90 text-brand'
          : 'bg-black/30 text-white/80 hover:bg-black/50 hover:text-white',
      )}
    >
      <Pin className={cn('h-3.5 w-3.5', project.isPinned && 'fill-current')} />
    </button>
  );

  /*
    The card-wide hit target.

    An overlay rather than wrapping the card in an anchor: the pin button and
    the avatar stack live inside, and an <a> containing a <button> is invalid
    markup that screen readers and keyboards both handle badly. This stays a
    single stretched link, sits under the pin (z-10 vs z-20), and carries the
    accessible name so the row still announces as one destination.
  */
  const link = (
    <Link
      to={`/projects/${project.id}`}
      aria-label={project.name}
      className="absolute inset-0 z-10 rounded-2xl focus:outline-none"
    />
  );

  /*
    The panel's own hit target, deliberately invisible to keyboards.

    The stretched link above covers the collapsed box only, so without this the
    half of the card somebody is actually reading would not be clickable. It is
    `tabIndex={-1}` and `aria-hidden` because it leads exactly where the first
    one does: a second tab stop and a second announcement of the same
    destination is noise, not access.
  */
  const panelLink = (
    <Link
      to={`/projects/${project.id}`}
      aria-hidden
      tabIndex={-1}
      className="absolute inset-0 z-10 rounded-2xl rounded-t-none focus:outline-none"
    />
  );

  const title = (
    <p className="px-4 py-3 text-sm font-semibold leading-snug transition-colors group-hover:text-brand">
      {project.name}
    </p>
  );

  if (isTouch) {
    return (
      <motion.div
        {...intent}
        layout
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.98 }}
        transition={{ type: 'spring', stiffness: 340, damping: 30 }}
        className={cn(
          'gpu group relative overflow-hidden rounded-2xl border border-edge bg-surface-raised',
          'focus-within:ring-2 focus-within:ring-brand/50',
        )}
      >
        {link}
        {banner}
        {pin}
        {title}
        <ProjectDetails project={project} />
      </motion.div>
    );
  }

  return (
    /*
      The cell keeps the *collapsed* height, always.

      This wrapper is what the grid measures, and nothing inside it grows — the
      panel below is absolute. That is the whole reason hovering one card does
      not move the eleven around it.
    */
    <motion.div
      {...intent}
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 340, damping: 30 }}
      className="gpu group relative z-0 hover:z-30 focus-within:z-30"
    >
      <div
        className={cn(
          'relative rounded-2xl border border-edge bg-surface-raised',
          // Flattened while open, so the panel below reads as the same card
          // continuing rather than as a second box under it.
          'transition-[border-radius,box-shadow] duration-200 ease-studio',
          'group-hover:rounded-b-none group-hover:shadow-lg',
          'group-focus-within:rounded-b-none group-focus-within:shadow-lg',
          'focus-within:ring-2 focus-within:ring-brand/50',
        )}
      >
        {link}
        {/* Clipped separately: the card itself must not hide the panel. */}
        <div className="overflow-hidden rounded-2xl rounded-b-none">{banner}</div>
        {pin}
        {title}
      </div>

      <div
        className={cn(
          'absolute inset-x-0 top-full grid grid-rows-[0fr]',
          'transition-[grid-template-rows] duration-200 ease-studio',
          'group-hover:grid-rows-[1fr] group-focus-within:grid-rows-[1fr]',
        )}
      >
        <div className="overflow-hidden">
          <div
            className={cn(
              'relative rounded-2xl rounded-t-none border-x border-b border-edge bg-surface-raised shadow-lg',
              // The link above stops at the collapsed box, so the panel gets
              // its own copy — otherwise the half of the card somebody is
              // actually reading would not be clickable.
              'pointer-events-none group-hover:pointer-events-auto group-focus-within:pointer-events-auto',
            )}
          >
            {panelLink}
            <ProjectDetails project={project} />
          </div>
        </div>
      </div>
    </motion.div>
  );
};
