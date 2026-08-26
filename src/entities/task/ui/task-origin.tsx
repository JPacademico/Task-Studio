import { Link } from 'react-router-dom';
import { ArrowUpRight, User } from 'lucide-react';

import { cn } from '@/shared/lib/cn';
import { useT } from '@/shared/i18n';
import type { Task } from '../model/types';

interface TaskOriginProps {
  project: Task['project'];
  /**
   * `pill` is the bordered chip a card carries; `inline` is the quieter text
   * form the dense list row uses. Two densities of the same statement.
   */
  variant?: 'pill' | 'inline';
  className?: string;
}

/**
 * Where a task comes from: a project, or nobody.
 *
 * The agenda mixes both kinds on one page, and the project chip used to be the
 * only thing on a card that said which board a task belonged to — so a task
 * with no project at all needs to say *that*, rather than simply dropping the
 * chip and leaving a gap that reads as a rendering bug.
 *
 * It is deliberately not a link. There is nowhere for a personal task to go:
 * the task menu is already the only place it lives.
 */
export const TaskOrigin = ({ project, variant = 'pill', className }: TaskOriginProps) => {
  const t = useT();

  if (!project) {
    return (
      <span
        title={t('agenda.personalTitle')}
        className={cn(
          'inline-flex shrink-0 items-center gap-1.5 text-[11px] font-medium text-content-faint',
          variant === 'pill' && 'rounded-full border border-dashed border-edge px-2 py-0.5',
          className,
        )}
      >
        <User className="h-2.5 w-2.5 shrink-0" strokeWidth={2.6} />
        <span className="truncate">{t('agenda.personal')}</span>
      </span>
    );
  }

  if (variant === 'inline') {
    return (
      <Link
        to={`/projects/${project.id}`}
        title={t('common.openNamed', { name: project.name })}
        className={cn(
          'max-w-[8rem] shrink-0 items-center gap-1.5 text-[11px] text-content-muted',
          'transition-colors hover:text-brand',
          className,
        )}
      >
        <span
          aria-hidden
          className="h-2 w-2 shrink-0 rounded-full"
          style={{ backgroundColor: project.color }}
        />
        <span className="truncate">{project.name}</span>
      </Link>
    );
  }

  return (
    <Link
      to={`/projects/${project.id}`}
      onClick={(event) => event.stopPropagation()}
      title={t('common.openNamed', { name: project.name })}
      className={cn(
        'group/link inline-flex max-w-[9rem] items-center gap-1.5 rounded-full border px-2 py-0.5',
        'text-[11px] font-medium transition-all duration-150',
        'border-edge text-content-muted hover:-translate-y-px hover:border-brand hover:text-brand',
        className,
      )}
    >
      <span
        aria-hidden
        className="h-2 w-2 shrink-0 rounded-full"
        style={{ backgroundColor: project.color }}
      />
      <span className="truncate">{project.name}</span>
      <ArrowUpRight
        className="h-3 w-3 shrink-0 transition-transform duration-150 group-hover/link:translate-x-px group-hover/link:-translate-y-px"
        strokeWidth={2.6}
      />
    </Link>
  );
};
