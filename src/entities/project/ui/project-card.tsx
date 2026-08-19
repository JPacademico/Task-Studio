import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle2, ListTodo, Pin, Users } from 'lucide-react';

import { cn } from '@/shared/lib/cn';
import { withAlpha } from '@/shared/lib/colors';
import { AvatarStack } from '@/shared/ui';
import type { ProjectListItem } from '../model/types';

interface ProjectCardProps {
  project: ProjectListItem;
  onTogglePin?: (project: ProjectListItem) => void;
}

export const ProjectCard = ({ project, onTogglePin }: ProjectCardProps) => {
  const done = project.taskCount - project.openTaskCount;
  const progress = project.taskCount === 0 ? 0 : Math.round((done / project.taskCount) * 100);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98 }}
      whileHover={{ y: -3 }}
      transition={{ type: 'spring', stiffness: 340, damping: 30 }}
      className={cn(
        'gpu group relative overflow-hidden rounded-2xl border border-edge bg-surface-raised',
        // The whole card is a link, so it takes the focus ring the inner
        // heading used to.
        'focus-within:ring-2 focus-within:ring-brand/50',
      )}
    >
      {/*
        The card-wide hit target.
        
        An overlay rather than wrapping the card in an anchor: the pin button
        and the avatar stack live inside, and an <a> containing a <button> is
        invalid markup that screen readers and keyboards both handle badly.
        This stays a single stretched link, sits under the pin (z-10 vs z-20),
        and carries the accessible name so the row still announces as one
        destination.
      */}
      <Link
        to={`/projects/${project.id}`}
        aria-label={project.name}
        className="absolute inset-0 z-10 rounded-2xl focus:outline-none"
      />
      <div
        aria-hidden
        className="h-20 w-full"
        style={{
          background: project.bannerUrl
            ? `url(${project.bannerUrl}) center/cover`
            : `linear-gradient(135deg, ${project.color}, ${withAlpha(project.color, 0.35)})`,
        }}
      />

      {onTogglePin && (
        <button
          type="button"
          aria-label={project.isPinned ? 'Unpin project' : 'Pin project'}
          onClick={() => onTogglePin(project)}
          className={cn(
            // z-20: above the card-wide link, or pinning would navigate.
            'absolute right-3 top-3 z-20 grid h-8 w-8 place-items-center rounded-full backdrop-blur',
            'transition-colors duration-150',
            project.isPinned
              ? 'bg-white/90 text-brand'
              : 'bg-black/30 text-white/80 hover:bg-black/50 hover:text-white',
          )}
        >
          <Pin className={cn('h-3.5 w-3.5', project.isPinned && 'fill-current')} />
        </button>
      )}

      <div className="space-y-3 p-4">
        <div className="space-y-1">
          {/* Plain text now — the card-wide link above owns the navigation, and
              a second anchor to the same place is one extra tab stop for
              nothing. `group-hover` keeps the colour cue it had. */}
          <p className="text-sm font-semibold leading-snug transition-colors group-hover:text-brand">
            {project.name}
          </p>
          <p className="line-clamp-2 min-h-[2rem] text-xs leading-relaxed text-content-muted">
            {project.description ?? 'No description yet.'}
          </p>
        </div>

        <div className="space-y-1.5">
          <div className="h-1.5 overflow-hidden rounded-full bg-surface-sunken">
            <motion.div
              className="h-full rounded-full"
              style={{ backgroundColor: project.color }}
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            />
          </div>
          <div className="flex items-center justify-between text-[11px] text-content-faint">
            <span className="inline-flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" />
              {done} done
            </span>
            <span className="inline-flex items-center gap-1">
              <ListTodo className="h-3 w-3" />
              {project.openTaskCount} open
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
    </motion.div>
  );
};
