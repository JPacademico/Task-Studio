import type { ReactNode } from 'react';
import {
  BarChart3,
  Bell,
  Building2,
  CalendarDays,
  CalendarRange,
  Columns3,
  FileText,
  FolderKanban,
  Globe,
  KanbanSquare,
  LayoutDashboard,
  Mail,
  MessageCircle,
  Moon,
  Palette,
  Pin,
  Plus,
  Radio,
  Settings,
  StickyNote,
  Trash2,
  Users,
} from 'lucide-react';

import { useCurrentUser } from '@/features/auth/model/session.store';
import { cn } from '@/shared/lib/cn';
import { withAlpha } from '@/shared/lib/colors';
import { Avatar, LavaButton, Segmented, StudioMark } from '@/shared/ui';
import { useT, type TranslationKey } from '@/shared/i18n';
import type { TourStage } from '../model/steps';

/**
 * The fake screens the tour stands in front of the real one, so it can point at a menu that is
 * hidden or a project that does not exist yet. Drawn with the app's own classes, so they wear the skin.
 */

/** A spot the tour can point at: `data-tour-mock` is what `TourOverlay` measures. */
const Spot = ({ id, className, children }: { id: string; className?: string; children: ReactNode }) => (
  <div data-tour-mock={id} className={className}>
    {children}
  </div>
);

const MockTopBar = () => {
  const t = useT();
  const user = useCurrentUser();

  return (
    <header className="nav-rail nav-rail--top ui-textured fixed inset-x-0 top-0 flex h-14 items-center gap-3 border-b border-edge bg-surface-raised px-4 shadow-[0_10px_30px_-24px_rgb(0_0_0/0.8)]">
      <span className="grid h-8 w-8 place-items-center text-brand">
        <StudioMark className="h-8 w-8" />
      </span>
      <span className="hidden font-hand text-base font-bold sm:block">Task Studio</span>

      <div className="ml-auto flex items-center gap-1.5">
        <Spot id="pin" className="grid h-9 w-9 place-items-center rounded-xl text-brand">
          <Pin className="h-[1.15rem] w-[1.15rem]" />
        </Spot>
        <Spot id="new-project">
          <LavaButton size="sm" tabIndex={-1}>
            <Plus className="h-3.5 w-3.5" strokeWidth={2.6} />
            <span className="hidden sm:inline">{t('nav.newProject')}</span>
          </LavaButton>
        </Spot>
        <Spot id="tools" className="flex items-center gap-0.5 text-content-muted">
          {[Bell, Globe, Moon].map((Icon, index) => (
            <span key={index} className="grid h-9 w-9 place-items-center rounded-xl">
              <Icon className="h-4 w-4" />
            </span>
          ))}
        </Spot>
        <Avatar name={user?.displayName ?? '?'} src={user?.avatarUrl} size="sm" />
      </div>
    </header>
  );
};

const MENU: { heading: TranslationKey; items: { label: TranslationKey; icon: typeof Bell }[] }[] = [
  {
    heading: 'nav.groupWorkspace',
    items: [
      { label: 'nav.dashboard', icon: LayoutDashboard },
      { label: 'nav.taskMenu', icon: CalendarDays },
      { label: 'nav.notesBoard', icon: StickyNote },
      { label: 'nav.meetings', icon: CalendarRange },
    ],
  },
  {
    heading: 'nav.groupManage',
    items: [
      { label: 'nav.organizations', icon: Building2 },
      { label: 'nav.invitations', icon: Mail },
      { label: 'nav.recycleBin', icon: Trash2 },
      { label: 'nav.themes', icon: Palette },
      { label: 'nav.settings', icon: Settings },
    ],
  },
];

const MockSidebar = () => {
  const t = useT();

  return (
    <aside className="nav-rail nav-rail--left ui-textured fixed left-0 top-0 flex h-full w-[16.5rem] max-w-[85vw] flex-col border-r border-edge bg-surface-raised [background-image:var(--rail-wash-left)]">
      <span
        aria-hidden
        className="nav-rail__edge absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-brand/45 to-transparent"
      />
      <header className="flex justify-center px-4 pb-4 pt-5">
        <span className="grid h-11 w-11 place-items-center text-brand">
          <StudioMark className="h-11 w-11" />
        </span>
      </header>
      <nav className="flex flex-col gap-5 px-3">
        {MENU.map((group, groupIndex) => (
          <Spot key={group.heading} id={groupIndex === 0 ? 'workspace' : 'manage'} className="space-y-1">
            <p className="px-3 pb-1 text-3xs font-semibold uppercase tracking-[0.18em] text-content-faint">
              {t(group.heading)}
            </p>
            {group.items.map((item, index) => (
              <div
                key={item.label}
                className={cn(
                  'flex items-center gap-3 rounded-2xl px-3 py-2 text-sm',
                  groupIndex === 0 && index === 0
                    ? 'bg-brand/12 font-semibold text-brand'
                    : 'text-content-muted',
                )}
              >
                <item.icon className="h-4 w-4" />
                {t(item.label)}
              </div>
            ))}
          </Spot>
        ))}
      </nav>
    </aside>
  );
};

const MockRail = () => {
  const t = useT();
  const projects = [
    { name: t('tour.sample.project'), color: '#0e7490', open: 4 },
    { name: t('tour.sample.project2'), color: '#7c3aed', open: 7 },
    { name: t('tour.sample.project3'), color: '#d97706', open: 2 },
  ];

  return (
    <aside className="nav-rail nav-rail--right ui-textured fixed right-0 top-0 flex h-full w-[16.25rem] max-w-[85vw] flex-col border-l border-edge bg-surface-raised [background-image:var(--rail-wash-right)]">
      <span
        aria-hidden
        className="nav-rail__edge absolute inset-y-0 left-0 w-px bg-gradient-to-b from-transparent via-brand/45 to-transparent"
      />
      <header className="flex items-center gap-2 px-4 pb-3 pt-5">
        <span className="grid h-8 w-8 place-items-center rounded-xl bg-brand/12 text-brand">
          <FolderKanban className="h-4 w-4" />
        </span>
        <div className="leading-tight">
          <p className="text-sm font-bold">{t('dash.projects')}</p>
          <p className="text-3xs uppercase tracking-[0.16em] text-content-faint">{t('rail.soonestFirst')}</p>
        </div>
      </header>
      <Spot id="projects" className="space-y-1.5 px-3">
        {projects.map((project) => (
          <div key={project.name} className="flex items-center gap-2.5 rounded-2xl border border-edge bg-surface px-3 py-2.5">
            <span className="h-8 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: project.color }} />
            <div className="min-w-0 leading-tight">
              <p className="truncate text-sm font-semibold">{project.name}</p>
              <p className="text-3xs text-content-faint">
                {project.open} {t('rail.openCount')}
              </p>
            </div>
          </div>
        ))}
      </Spot>
    </aside>
  );
};

const TABS: { value: string; label: TranslationKey; icon: ReactNode }[] = [
  { value: 'board', label: 'project.tabBoard', icon: <KanbanSquare className="h-3 w-3" /> },
  { value: 'groups', label: 'project.tabGroups', icon: <Columns3 className="h-3 w-3" /> },
  { value: 'dashboard', label: 'project.tabMetrics', icon: <BarChart3 className="h-3 w-3" /> },
  { value: 'roster', label: 'project.tabRoster', icon: <Users className="h-3 w-3" /> },
  { value: 'live', label: 'project.tabLive', icon: <Radio className="h-3 w-3" /> },
  { value: 'text', label: 'project.tabText', icon: <FileText className="h-3 w-3" /> },
];

/** Task colours for the sample board: one per card, cycling. */
const SAMPLE_COLORS = ['#0e7490', '#7c3aed', '#16a34a'];

const MockProject = () => {
  const t = useT();
  const columns: { title: TranslationKey; tasks: TranslationKey[] }[] = [
    { title: 'tour.sample.todo', tasks: ['tour.sample.task1', 'tour.sample.task4'] },
    { title: 'tour.sample.doing', tasks: ['tour.sample.task2'] },
    { title: 'tour.sample.done', tasks: ['tour.sample.task3'] },
  ];

  return (
    <div className="fixed inset-0 overflow-hidden bg-surface">
      <div className="mx-auto w-full max-w-6xl space-y-5 px-4 pt-8 sm:px-8 sm:pt-10">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex gap-3">
            <span className="w-1.5 self-stretch rounded-full bg-brand" />
            <div className="space-y-1">
              <p className="text-3xs uppercase tracking-[0.18em] text-content-faint sm:text-xs">
                {t('tour.sample.owner')}
              </p>
              <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{t('tour.sample.project')}</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Spot id="chat" className="inline-flex items-center gap-1.5 rounded-xl border border-edge px-3 py-1.5 text-xs font-medium">
              <MessageCircle className="h-3.5 w-3.5" />
              Chat
            </Spot>
            <Spot id="new-task">
              <LavaButton tabIndex={-1}>
                <Plus className="h-4 w-4" strokeWidth={2.6} />
                {t('project.newTask')}
              </LavaButton>
            </Spot>
          </div>
        </div>

        <Spot id="tabs" className="inline-flex max-w-full">
          <Segmented
            value="board"
            options={TABS.map((tab) => ({ ...tab, label: t(tab.label) }))}
            onChange={() => undefined}
            label={t('project.tabsLabel')}
            variant="glass"
            size="lg"
            className="flex w-full flex-nowrap overflow-hidden"
          />
        </Spot>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {columns.map((column, columnIndex) => (
            <div key={column.title} className="panel space-y-2 p-3">
              <p className="ui-section-title text-xs font-semibold uppercase tracking-wide text-content-muted">
                {t(column.title)}
              </p>
              {column.tasks.map((task, taskIndex) => {
                const color = SAMPLE_COLORS[(columnIndex + taskIndex) % SAMPLE_COLORS.length];
                return (
                  // Built the way `TaskCard` is: the task's colour as an inset stripe and a faint wash.
                  <div
                    key={task}
                    className="relative overflow-hidden rounded-xl border border-edge bg-surface-raised p-3 pl-4"
                    style={{ background: `linear-gradient(120deg, ${withAlpha(color, 0.1)}, transparent 55%)` }}
                  >
                    <span aria-hidden className="absolute inset-y-0 left-0 w-1" style={{ backgroundColor: color }} />
                    <p className="ui-task-title text-sm font-semibold">{t(task)}</p>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

/** The fake screen for one stage of the tour; `app` is the real page and draws nothing. */
export const TourStageMock = ({ stage }: { stage: TourStage }) => {
  if (stage === 'app') return null;

  return (
    // `inert`: a picture of the app, never a second copy of it to tab into.
    <div key={stage} inert className="tour-stage pointer-events-none">
      {stage === 'topbar' && <MockTopBar />}
      {stage === 'sidebar' && <MockSidebar />}
      {stage === 'rail' && <MockRail />}
      {stage === 'project' && <MockProject />}
    </div>
  );
};
