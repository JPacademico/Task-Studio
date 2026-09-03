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
const SettingsPage = lazy(() => import('@/pages/settings/settings-page'));
/*
 * Where a terminal is approved.
 *
 * Lazy like the rest, and it is the clearest case for it in the router: this
 * page is opened once by anybody who ever installs the CLI and never again.
 */
const CliAuthorizePage = lazy(() => import('@/pages/cli/cli-authorize-page'));
const ThemeGalleryPage = lazy(() => import('@/pages/themes/theme-gallery-page'));
/*
 * The moderation console, split off like the rest — and it is the one chunk
 * essentially nobody ever downloads, which is exactly the argument for keeping
 * it lazy: a page reachable by one person a month should not be in the bundle
 * every visitor pays for.
 */
const AdminPage = lazy(() => import('@/pages/admin/admin-page'));

/**
 * The landing page, and the one chunk a returning user must never pay for.
 *
 * Lazy like the app surface, and for a sharper reason than the rest: this is
 * the only screen in the router that exists for people who are *not* users
 * yet. Somebody signing in every morning would otherwise download a marketing
 * page, its animations and its copy, every time the service worker revalidated
 * — for a screen they are never sent to. `ProtectedRoute` sends a *guest* at
 * `/` here; an authenticated visitor goes straight to their dashboard and
 * never downloads this chunk at all.
 */
const LandingPage = lazy(() => import('@/pages/landing/landing-page'));

/**
 * The CLI documentation.
 *
 * Public, and outside both guards, for the same reason `/welcome` is: it is
 * read by people deciding whether to install something as often as by people
 * who already have, and a documentation page that demands a session is one
 * nobody can link to.
 */
const DocsPage = lazy(() => import('@/pages/docs/docs-page'));

export const AppRouter = () => (
  <Routes>
    {/*
      The front door, at its own address.

      `/` resolves here for anybody without a session and to the dashboard for
      anybody with one, so the bare address means "what is this" to a visitor
      and "my work" to a user — see `ProtectedRoute`. The redirect points at
      this path rather than rendering the page under `/` so the landing page has
      one canonical URL that can be linked to, shared, and returned to from the
      documentation.

      Outside `GuestRoute`, unlike the sign-in screens below it, and
      deliberately: the docs link back here, and a guard would bounce every
      signed-in reader following that link to the dashboard.
    */}
    <Route path="/welcome" element={<LandingPage />} />
    <Route path="/docs" element={<DocsPage />} />

    <Route element={<GuestRoute />}>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
    </Route>

    {/* Reachable while signed in but unconfirmed. */}
    <Route path="/verify-email" element={<VerifyEmailPage />} />

    {/*
      Where a provider sign-in lands, and deliberately not inside `GuestRoute`.

      The screen's whole job is to turn a one-time code into a session, which
      makes the visitor authenticated halfway through rendering it. Behind the
      guest guard that transition would redirect the page out from under its own
      effect, and an already-signed-in user following the link would be bounced
      before the code was ever spent.
    */}
    <Route path="/oauth/callback" element={<OAuthCallbackPage />} />

    {/*
      Outside `ProtectedRoute`, outside `GuestRoute`, and outside `AppLayout`.

      All three are deliberate. The administrator is not a *user* — there is no
      account behind this and the API authenticates it with a password from the
      deployment's environment (see `AdminAuthService`) — so wrapping it in a
      guard that asks about a user session would be asking the wrong question,
      in both directions: `ProtectedRoute` would bounce an admin who is not
      signed in, and `GuestRoute` would bounce one who is.

      No `AppLayout` either. The rail, the chat dock and the project rooms all
      belong to somebody's workspace, and this page is not in one.
    */}
    <Route path="/admin" element={<AdminPage />} />

    <Route element={<ProtectedRoute />}>
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
        {/*
          Inside `ProtectedRoute`, which is the whole security property.

          Approving a terminal is an act performed *as* a signed-in account, so
          a guest arriving here is redirected to sign in and comes back — which
          is exactly the flow that makes the device grant safe. See the page.
        */}
        <Route path="/cli" element={<CliAuthorizePage />} />
      </Route>
    </Route>

    <Route path="*" element={<NotFoundPage />} />
  </Routes>
);
