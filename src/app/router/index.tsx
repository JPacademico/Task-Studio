import { lazy } from 'react';
import { Route, Routes } from 'react-router-dom';

import { AppLayout } from '@/app/layouts/app-layout';
import { GuestRoute, ProtectedRoute } from './protected-route';

// Auth screens are tiny and always needed first — keep them eager.
import { LoginPage } from '@/pages/auth/login-page';
import { SignupPage } from '@/pages/auth/signup-page';
import { VerifyEmailPage } from '@/pages/auth/verify-email-page';
import { ForgotPasswordPage } from '@/pages/auth/forgot-password-page';
import { ResetPasswordPage } from '@/pages/auth/reset-password-page';
import { OAuthCallbackPage } from '@/pages/auth/oauth-callback-page';
import { NotFoundPage } from '@/pages/not-found-page';

// The app surface is code-split: the whiteboard and DnD layers are heavy.
const DashboardPage = lazy(() => import('@/pages/dashboard/dashboard-page'));
const ProjectPage = lazy(() => import('@/pages/project-view/project-page'));
const TaskMenuPage = lazy(() => import('@/pages/task-menu/task-menu-page'));
const NotesBoardPage = lazy(() => import('@/pages/notes-board/notes-board-page'));
const MeetingsPage = lazy(() => import('@/pages/meetings/meetings-page'));
const OrganizationsPage = lazy(() => import('@/pages/organizations/organizations-page'));
const OrganizationPage = lazy(() => import('@/pages/organizations/organization-page'));
const RecycleBinPage = lazy(() => import('@/pages/recycle-bin/recycle-bin-page'));
const InvitationsPage = lazy(() => import('@/pages/invitations/invitations-page'));
const JoinPage = lazy(() => import('@/pages/invitations/join-page'));
const TrelloCallbackPage = lazy(() => import('@/pages/auth/trello-callback-page'));
const SettingsPage = lazy(() => import('@/pages/settings/settings-page'));
// Where a terminal is approved. Lazy like the rest, and it is the clearest case for it in the
// router: this page is opened once by anybody who ever installs the CLI and never again.
const CliAuthorizePage = lazy(() => import('@/pages/cli/cli-authorize-page'));
const ThemeGalleryPage = lazy(() => import('@/pages/themes/theme-gallery-page'));
// Where a plan button goes while payments are switched off. Lazy like the rest: it is a destination
// nobody reaches twice, and it should not sit in the bundle every reader downloads.
const PlanSoonPage = lazy(() => import('@/pages/billing/plan-soon-page'));
// The moderation console, split off like the rest — and it is the one chunk essentially nobody ever
// downloads, which is exactly the argument for keeping it lazy.
const AdminPage = lazy(() => import('@/pages/admin/admin-page'));

/**
 * The landing page, and the one chunk a returning user must never pay for. Lazy like the app
 * surface, and for a sharper reason than the rest.
 */
const LandingPage = lazy(() => import('@/pages/landing/landing-page'));

/**
 * The CLI documentation. Public, and outside both guards, for the same reason `/welcome` is: it is
 * read by people deciding whether to install something as often as by people who already have.
 */
const DocsPage = lazy(() => import('@/pages/docs/docs-page'));

/** The Terms and the Privacy Policy. Public: sign-up links here, and so do the OAuth consent screens. */
const TermsPage = lazy(() => import('@/pages/legal/legal-page').then((m) => ({ default: m.TermsPage })));
const PrivacyPage = lazy(() =>
  import('@/pages/legal/legal-page').then((m) => ({ default: m.PrivacyPage })),
);

export const AppRouter = () => (
  <Routes>
    {/* The front door, at its own address. `/` resolves here for anybody without a session and
        to the dashboard for anybody with one. */}
    <Route path="/welcome" element={<LandingPage />} />
    <Route path="/docs" element={<DocsPage />} />
    <Route path="/terms" element={<TermsPage />} />
    <Route path="/privacy" element={<PrivacyPage />} />

    {/* Where a plan button goes, from either side of the sign-in line. Public, and outside
        `AppLayout`, and both are the same decision. */}
    <Route path="/plans/soon" element={<PlanSoonPage />} />

    <Route element={<GuestRoute />}>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
    </Route>

    {/* Reachable while signed in but unconfirmed. */}
    <Route path="/verify-email" element={<VerifyEmailPage />} />

    {/* Where a provider sign-in lands, and deliberately not inside `GuestRoute`. The screen's
        whole job is to turn a one-time code into a session. */}
    <Route path="/oauth/callback" element={<OAuthCallbackPage />} />

    {/* An invite link: public, because it decides for itself where each visitor goes. */}
    <Route path="/join/:token" element={<JoinPage />} />

    {/* Outside `ProtectedRoute`, outside `GuestRoute`, and outside `AppLayout`. All three are
        deliberate. */}
    <Route path="/admin" element={<AdminPage />} />

    <Route element={<ProtectedRoute />}>
      {/* Trello's token comes back in the fragment; a redirect here would drop it. */}
      <Route path="/integrations/trello/callback" element={<TrelloCallbackPage />} />
      <Route element={<AppLayout />}>
        <Route index element={<DashboardPage />} />
        <Route path="/projects/:projectId" element={<ProjectPage />} />
        <Route path="/tasks" element={<TaskMenuPage />} />
        <Route path="/notes" element={<NotesBoardPage />} />
        <Route path="/meetings" element={<MeetingsPage />} />
        <Route path="/organizations" element={<OrganizationsPage />} />
        <Route path="/organizations/:organizationId" element={<OrganizationPage />} />
        <Route path="/recycle-bin" element={<RecycleBinPage />} />
        <Route path="/invitations" element={<InvitationsPage />} />
        <Route path="/themes" element={<ThemeGalleryPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        {/* Inside `ProtectedRoute`, which is the whole security property. Approving a terminal
            is an act performed *as* a signed-in account. */}
        <Route path="/cli" element={<CliAuthorizePage />} />
      </Route>
    </Route>

    <Route path="*" element={<NotFoundPage />} />
  </Routes>
);
