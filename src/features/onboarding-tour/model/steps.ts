import type { TranslationKey } from '@/shared/i18n';

/** Which screen a step is shown over: the real page, or one of the tour's fake ones. */
export type TourStage = 'app' | 'topbar' | 'sidebar' | 'rail' | 'project';

/** Where the card would rather sit beside its target; it falls back when there is no room. */
export type TourPlacement = 'below' | 'above' | 'right' | 'left';

export interface TourStep {
  id: string;
  stage: TourStage;
  /** `data-tour` on the real page, or `data-tour-mock` on a fake screen. None centres the card. */
  target?: { real: string } | { mock: string };
  placement?: TourPlacement;
  title: TranslationKey;
  body: TranslationKey;
}

/** Ten at most, and only what every account uses. */
export const TOUR_STEPS: TourStep[] = [
  { id: 'welcome', stage: 'app', title: 'tour.welcome.title', body: 'tour.welcome.body' },
  {
    id: 'stats',
    stage: 'app',
    target: { real: 'dash-stats' },
    placement: 'below',
    title: 'tour.stats.title',
    body: 'tour.stats.body',
  },
  {
    id: 'new-project',
    stage: 'topbar',
    target: { mock: 'new-project' },
    placement: 'below',
    title: 'tour.newProject.title',
    body: 'tour.newProject.body',
  },
  {
    id: 'menu',
    stage: 'sidebar',
    target: { mock: 'workspace' },
    placement: 'right',
    title: 'tour.menu.title',
    body: 'tour.menu.body',
  },
  {
    id: 'rail',
    stage: 'rail',
    target: { mock: 'projects' },
    placement: 'left',
    title: 'tour.rail.title',
    body: 'tour.rail.body',
  },
  {
    id: 'tabs',
    stage: 'project',
    target: { mock: 'tabs' },
    placement: 'below',
    title: 'tour.tabs.title',
    body: 'tour.tabs.body',
  },
  {
    id: 'new-task',
    stage: 'project',
    target: { mock: 'new-task' },
    placement: 'below',
    title: 'tour.newTask.title',
    body: 'tour.newTask.body',
  },
  {
    id: 'chat',
    stage: 'project',
    target: { mock: 'chat' },
    placement: 'below',
    title: 'tour.chat.title',
    body: 'tour.chat.body',
  },
  {
    id: 'tools',
    stage: 'topbar',
    target: { mock: 'tools' },
    placement: 'below',
    title: 'tour.tools.title',
    body: 'tour.tools.body',
  },
  {
    id: 'pin',
    stage: 'topbar',
    target: { mock: 'pin' },
    placement: 'below',
    title: 'tour.pin.title',
    body: 'tour.pin.body',
  },
];
