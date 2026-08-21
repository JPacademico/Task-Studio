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
const RecycleBinPage = lazy(() => import('@/pages/recycle-bin/recycle-bin-page'));
const InvitationsPage = lazy(() => import('@/pages/invitations/invitations-page'));
const SettingsPage = lazy(() => import('@/pages/settings/settings-page'));
const ThemeGalleryPage = lazy(() => import('@/pages/themes/theme-gallery-page'));

export const AppRouter = () => (
  <Routes>
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

    <Route element={<ProtectedRoute />}>
      <Route element={<AppLayout />}>
        <Route index element={<DashboardPage />} />
        <Route path="/projects/:projectId" element={<ProjectPage />} />
        <Route path="/tasks" element={<TaskMenuPage />} />
        <Route path="/notes" element={<NotesBoardPage />} />
        <Route path="/meetings" element={<MeetingsPage />} />
        <Route path="/organizations" element={<OrganizationsPage />} />
        <Route path="/recycle-bin" element={<RecycleBinPage />} />
        <Route path="/invitations" element={<InvitationsPage />} />
        <Route path="/themes" element={<ThemeGalleryPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>
    </Route>

    <Route path="*" element={<NotFoundPage />} />
  </Routes>
);
