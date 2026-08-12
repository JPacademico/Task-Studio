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
import { NotFoundPage } from '@/pages/not-found-page';

// The app surface is code-split: the whiteboard and DnD layers are heavy.
const DashboardPage = lazy(() => import('@/pages/dashboard/dashboard-page'));
const ProjectPage = lazy(() => import('@/pages/project-view/project-page'));
const TaskMenuPage = lazy(() => import('@/pages/task-menu/task-menu-page'));
const NotesBoardPage = lazy(() => import('@/pages/notes-board/notes-board-page'));
const RecycleBinPage = lazy(() => import('@/pages/recycle-bin/recycle-bin-page'));
const InvitationsPage = lazy(() => import('@/pages/invitations/invitations-page'));
const SettingsPage = lazy(() => import('@/pages/settings/settings-page'));

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

    <Route element={<ProtectedRoute />}>
      <Route element={<AppLayout />}>
        <Route index element={<DashboardPage />} />
        <Route path="/projects/:projectId" element={<ProjectPage />} />
        <Route path="/tasks" element={<TaskMenuPage />} />
        <Route path="/notes" element={<NotesBoardPage />} />
        <Route path="/recycle-bin" element={<RecycleBinPage />} />
        <Route path="/invitations" element={<InvitationsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>
    </Route>

    <Route path="*" element={<NotFoundPage />} />
  </Routes>
);
