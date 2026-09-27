import React from 'react';
import { Navigate } from 'react-router';
import { useAuth } from '@/context/AuthContext';
import type { UserRole } from '@/types/auth.types';
import { getDashboardPathForRole, paths } from '../paths';
import { ProtectedRoute } from './ProtectedRoute';

interface RoleRouteProps {
  allowedRoles: UserRole[];
  children: React.ReactNode;
}

export function RoleRoute({ allowedRoles, children }: RoleRouteProps) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-900 text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
          <p className="text-sm text-slate-400">Checking permissions...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to={paths.signin} replace />;
  }

  if (!allowedRoles.includes(user.role)) {
    // Redirect user to their own authorized dashboard
    const targetDashboard = getDashboardPathForRole(user.role);
    return <Navigate to={targetDashboard} replace />;
  }

  return <ProtectedRoute>{children}</ProtectedRoute>;
}
