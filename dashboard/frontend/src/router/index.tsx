import { createBrowserRouter, Navigate } from 'react-router';
import { env } from '@/config/env';
import { DashboardLayout } from '@/layouts/DashboardLayout';
import { CreateAccountPage } from '@/pages/CreateAccountPage';
import { HomePage } from '@/pages/HomePage';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { RouteErrorPage } from '@/pages/RouteErrorPage';
import { SignInPage } from '@/pages/SignInPage';
import { SystemStatusPage } from '@/pages/SystemStatusPage';
import { AdminDashboardPage } from '@/pages/dashboards/AdminDashboardPage';
import { HODDashboardPage } from '@/pages/dashboards/HODDashboardPage';
import { StudentDashboardPage } from '@/pages/dashboards/StudentDashboardPage';
import { SubjectWorkspacePage } from '@/pages/student/SubjectWorkspacePage';
import { TeacherDashboardPage } from '@/pages/dashboards/TeacherDashboardPage';
import { QuizManagementPage } from '@/pages/quiz/QuizManagementPage';
import { StudentQuizPage } from '@/pages/quiz/StudentQuizPage';
import { AdminRoute } from './guards/AdminRoute';
import { HODRoute } from './guards/HODRoute';
import { StudentRoute } from './guards/StudentRoute';
import { TeacherRoute } from './guards/TeacherRoute';
import { ProtectedRoute } from './guards/ProtectedRoute';
import { paths, getDashboardPathForRole } from './paths';
import { useAuth } from '@/context/AuthContext';

function DashboardRedirect() {
  const { user, isAuthenticated, loading } = useAuth();
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-900 text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
          <p className="text-sm text-slate-400">Loading your dashboard...</p>
        </div>
      </div>
    );
  }
  if (!isAuthenticated || !user) {
    return <Navigate to={paths.signin} replace />;
  }
  return <Navigate to={getDashboardPathForRole(user.role)} replace />;
}

export const router = createBrowserRouter(
  [
    // Dashboard aliases (smooth return from Smart Board or bookmarks)
    {
      path: '/dashboard',
      element: <DashboardRedirect />,
    },
    {
      path: '/dashboard/index.html',
      element: <DashboardRedirect />,
    },
    // Public Web Pages
    {
      path: paths.root,
      element: <HomePage />,
      errorElement: <RouteErrorPage />,
    },
    {
      path: paths.signin,
      element: <SignInPage />,
      errorElement: <RouteErrorPage />,
    },
    {
      path: paths.login,
      element: <Navigate to={paths.signin} replace />,
    },
    {
      path: paths.createAccount,
      element: <CreateAccountPage />,
      errorElement: <RouteErrorPage />,
    },
    {
      path: paths.register,
      element: <Navigate to={paths.createAccount} replace />,
    },

    // Standalone Proctored Assessment (Edge-to-edge full viewport, no dashboard sidebar)
    {
      path: paths.studentQuizTake,
      element: (
        <ProtectedRoute>
          <StudentQuizPage />
        </ProtectedRoute>
      ),
      errorElement: <RouteErrorPage />,
    },

    // Protected Role Dashboards (Wrapped in Dashboard Layout)
    {
      element: <DashboardLayout />,
      errorElement: <RouteErrorPage />,
      children: [
        {
          path: paths.studentDashboard,
          element: (
            <StudentRoute>
              <StudentDashboardPage />
            </StudentRoute>
          ),
        },
        {
          path: paths.studentSubjectWorkspace,
          element: (
            <StudentRoute>
              <SubjectWorkspacePage />
            </StudentRoute>
          ),
        },
        {
          path: paths.teacherDashboard,
          element: (
            <TeacherRoute>
              <TeacherDashboardPage />
            </TeacherRoute>
          ),
        },
        {
          path: paths.teacherQuizManagement,
          element: (
            <TeacherRoute>
              <QuizManagementPage />
            </TeacherRoute>
          ),
        },
        {
          path: paths.hodDashboard,
          element: (
            <HODRoute>
              <HODDashboardPage />
            </HODRoute>
          ),
        },
        {
          path: paths.adminDashboard,
          element: (
            <AdminRoute>
              <AdminDashboardPage />
            </AdminRoute>
          ),
        },
        {
          path: paths.systemStatus,
          element: <SystemStatusPage />,
        },
        {
          path: '*',
          element: <NotFoundPage />,
        },
      ],
    },
  ],
  { basename: env.basePath.replace(/\/$/, '') || '/' }
);
