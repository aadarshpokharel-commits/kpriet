import type { UserRole } from '@/types/auth.types';

/** Route paths, relative to the router basename (VITE_BASE_PATH). */
export const paths = {
  root: '/',
  signin: '/signin',
  login: '/login',
  createAccount: '/create-account',
  register: '/register',
  studentDashboard: '/student/dashboard',
  studentSubjectWorkspace: '/student/subjects/:subjectId',
  studentQuizTake: '/student/quizzes/:quizId/take',
  teacherDashboard: '/teacher/dashboard',
  teacherQuizManagement: '/teacher/subjects/:subjectId/quizzes',
  hodDashboard: '/hod/dashboard',
  adminDashboard: '/admin/dashboard',
  systemStatus: '/system-status',
} as const;

/**
 * Returns the corresponding dashboard path for each user role.
 */
export function getDashboardPathForRole(role?: UserRole | null): string {
  switch (role) {
    case 'STUDENT':
      return paths.studentDashboard;
    case 'TEACHER':
      return paths.teacherDashboard;
    case 'HOD':
      return paths.hodDashboard;
    case 'ADMIN':
    case 'PRINCIPAL':
      return paths.adminDashboard;
    default:
      return paths.signin;
  }
}
