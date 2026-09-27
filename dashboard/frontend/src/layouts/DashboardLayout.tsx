import { useState } from 'react';
import { NavLink, Outlet, Link, useLocation, useSearchParams } from 'react-router';
import { BrandLogo } from '@/components/brand/BrandLogo';
import { NotificationCenter } from '@/components/notifications/NotificationCenter';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { useAuth } from '@/context/AuthContext';
import { getDashboardPathForRole, paths } from '@/router/paths';
import { cn } from '@/utils/cn';

interface NavEntry {
  label: string;
  tab?: string;
  to?: string;
  icon: string;
  badge?: string | number;
  isExternal?: boolean;
}

const STUDENT_NAV: NavEntry[] = [
  { label: 'Overview', tab: 'overview', icon: '📊' },
  { label: 'Notes', tab: 'notes', icon: '📝' },
  { label: 'Materials', tab: 'materials', icon: '📁' },
  { label: 'Videos', tab: 'videos', icon: '🎥' },
  { label: 'Presentations', tab: 'presentations', icon: '📑' },
  { label: 'Quizzes', tab: 'quizzes', icon: '⚡' },
  { label: 'Assignments', tab: 'assignments', icon: '📋' },
  { label: 'Notices', tab: 'notices', icon: '📢' },
  { label: 'AI / Doubt', tab: 'aiDoubt', icon: '🤖' },
  { label: 'Simulations', tab: 'simulations', icon: '🔬' },
  { label: 'My Progress', tab: 'progress', icon: '📈' },
  { label: 'Attendance', tab: 'attendance', icon: '📅' },
  { label: 'Results', tab: 'results', icon: '🏆' },
  { label: 'Semester Management', tab: 'semesterManagement', icon: '🎓' },
];

const TEACHER_NAV: NavEntry[] = [
  { label: 'Overview', tab: 'overview', icon: '📊' },
  { label: 'My Subjects', tab: 'mySubjects', icon: '📚' },
  { label: 'Notes', tab: 'notes', icon: '📝' },
  { label: 'Materials', tab: 'materials', icon: '📁' },
  { label: 'Videos', tab: 'videos', icon: '🎥' },
  { label: 'Presentations', tab: 'presentations', icon: '📑' },
  { label: 'Quizzes', tab: 'quizzes', icon: '⚡' },
  { label: 'Assignments', tab: 'assignments', icon: '📋' },
  { label: 'Announcements', tab: 'announcements', icon: '📢' },
  { label: 'Attendance', tab: 'attendance', icon: '📅' },
  { label: 'Results', tab: 'results', icon: '🏆' },
  { label: 'Student Progress', tab: 'studentProgress', icon: '👥' },
  { label: 'Simulations', tab: 'simulations', icon: '🔬' },
  { label: 'AI Query', tab: 'aiKnowledge', icon: '💡' },
  { label: 'Smart Board', to: '/smartboard', icon: '✨', isExternal: true },
];

const HOD_NAV: NavEntry[] = [
  { label: 'Overview', tab: 'overview', icon: '🏛' },
  { label: 'Faculty', tab: 'faculty', icon: '👨‍🏫' },
  { label: 'Students', tab: 'students', icon: '🎓' },
  { label: 'Enrollment Requests', tab: 'enrollments', icon: '📥' },
  { label: 'Subjects', tab: 'subjects', icon: '📖' },
  { label: 'Semesters', tab: 'semesters', icon: '🗓' },
  { label: 'Teacher Assignments', tab: 'teacherAssignments', icon: '🤝' },
  { label: 'Department Analytics', tab: 'analytics', icon: '📈' },
  { label: 'Announcements', tab: 'announcements', icon: '📢' },
  { label: 'Audit', tab: 'audit', icon: '🛡' },
];

const ADMIN_NAV: NavEntry[] = [
  { label: 'Institution Overview', tab: 'overview', icon: '🏛' },
  { label: 'Departments', tab: 'departments', icon: '🏢' },
  { label: 'Faculty', tab: 'faculty', icon: '👨‍🏫' },
  { label: 'Students', tab: 'students', icon: '🎓' },
  { label: 'Academic Structure', tab: 'structure', icon: '📚' },
  { label: 'Analytics', tab: 'activity', icon: '📊' },
  { label: 'Audit Logs', tab: 'audit', icon: '🛡' },
  { label: 'System Settings', tab: 'settings', icon: '⚙️' },
];

export function DashboardLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const dashboardPath = getDashboardPathForRole(user?.role);
  const currentTab = searchParams.get('tab') || 'overview';

  // Select navigation list based on user role
  let roleNav: NavEntry[] = [];
  if (user?.role === 'STUDENT') {
    roleNav = STUDENT_NAV;
  } else if (user?.role === 'TEACHER') {
    roleNav = TEACHER_NAV;
  } else if (user?.role === 'HOD') {
    roleNav = HOD_NAV;
  } else if (user?.role === 'ADMIN' || user?.role === 'PRINCIPAL') {
    roleNav = ADMIN_NAV;
  }

  const isItemActive = (item: NavEntry) => {
    if (item.tab) {
      return (
        location.pathname.startsWith(dashboardPath) &&
        (currentTab === item.tab || (!searchParams.get('tab') && item.tab === 'overview'))
      );
    }
    if (item.to) {
      return location.pathname === item.to;
    }
    return false;
  };

  return (
    <div className="min-h-dvh bg-background text-foreground flex flex-col transition-colors duration-200">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-card focus:text-card-foreground focus:px-3 focus:py-2 focus:ring-2 focus:ring-primary shadow-md border border-border"
      >
        Skip to content
      </a>

      {/* ─── Top Bar Header ─── */}
      <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur-md shadow-xs">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex items-center gap-3">
            {/* Mobile Menu Hamburger */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden inline-flex items-center justify-center p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer transition-colors"
              aria-label="Toggle mobile menu"
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>

            <Link to={paths.root} className="flex items-center gap-2">
              <BrandLogo className="h-8 w-auto" />
            </Link>
            <span className="hidden h-5 w-px bg-border sm:block" aria-hidden="true" />
            <div className="hidden sm:flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-primary-soft text-primary dark:text-accent-foreground border border-primary-border">
                {user ? `${user.role}` : 'Eduverse'}
              </span>
              <span className="text-xs text-muted-foreground font-medium">Academic Suite</span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 text-sm">
            <Link
              to={paths.root}
              className="text-muted-foreground hover:text-foreground font-medium transition-colors hidden sm:inline text-xs"
            >
              Public Portal
            </Link>
            <a
              href="/smartboard"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold text-primary dark:text-accent-foreground bg-primary-soft border border-primary-border hover:bg-primary hover:text-white transition-all shadow-2xs"
            >
              <span>✨</span> Smart Board
            </a>

            <ThemeToggle size="sm" />

            {user ? (
              <div className="flex items-center gap-2.5 sm:gap-3 pl-2 sm:pl-3 border-l border-border">
                <NotificationCenter />
                <div className="hidden md:flex flex-col text-right">
                  <span className="text-xs font-semibold text-foreground leading-tight">{user.name}</span>
                  <span className="text-[11px] text-muted-foreground leading-tight">{user.identifier || user.role}</span>
                </div>
                <button
                  type="button"
                  onClick={() => logout()}
                  className="rounded-lg border border-border bg-muted px-2.5 py-1 text-xs font-semibold text-error-text dark:text-error hover:bg-error hover:text-white transition-colors cursor-pointer"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <Link to={paths.signin} className="text-primary font-semibold hover:underline">
                Sign In
              </Link>
            )}
          </div>
        </div>

        {/* ─── Mobile Slide-out Menu ─── */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-border bg-card px-4 py-4 space-y-3 shadow-lg animate-in fade-in slide-in-from-top-2 duration-150">
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                {user?.role} Navigation
              </span>
              <span className="text-xs text-primary font-medium">{user?.name}</span>
            </div>
            <nav className="grid grid-cols-2 gap-1.5 max-h-[60vh] overflow-y-auto py-1">
              {roleNav.map((item) => {
                const active = isItemActive(item);
                const targetUrl = item.to || `${dashboardPath}?tab=${item.tab}`;
                return item.isExternal ? (
                  <a
                    key={item.label}
                    href={targetUrl}
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                  >
                    <span>{item.icon}</span>
                    <span>{item.label}</span>
                  </a>
                ) : (
                  <Link
                    key={item.label}
                    to={targetUrl}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      'flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-colors',
                      active
                        ? 'bg-primary-soft text-primary dark:text-accent-foreground font-bold shadow-xs border border-primary-border'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground font-medium'
                    )}
                  >
                    <span>{item.icon}</span>
                    <span className="truncate">{item.label}</span>
                  </Link>
                );
              })}
            </nav>
            <div className="pt-2 border-t border-border flex items-center justify-between text-xs">
              <NavLink
                to={paths.systemStatus}
                onClick={() => setMobileMenuOpen(false)}
                className="text-muted-foreground hover:text-primary"
              >
                System Status
              </NavLink>
              <a href="/smartboard" className="text-primary font-medium">
                Open Smart Board →
              </a>
            </div>
          </div>
        )}
      </header>

      {/* ─── Main Content Container ─── */}
      <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6 md:flex-row md:gap-8 md:py-8">
        {/* ─── Desktop Role-Based Persistent Sidebar ─── */}
        <aside aria-label="Role Navigation" className="hidden md:block md:w-60 md:shrink-0">
          <div className="sticky top-24 space-y-4">
            {/* User Profile Pill Card */}
            {user && (
              <div className="p-3.5 rounded-2xl border border-border bg-card shadow-2xs text-card-foreground">
                <div className="flex items-center gap-2.5">
                  <div className="h-9 w-9 rounded-xl bg-primary-soft text-primary dark:text-accent-foreground border border-primary-border font-bold flex items-center justify-center text-sm shadow-2xs">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-foreground truncate leading-tight">{user.name}</p>
                    <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                      {user.identifier || user.collegeEmail}
                    </p>
                  </div>
                </div>
                <div className="mt-2.5 pt-2 border-t border-border flex items-center justify-between text-[11px]">
                  <span className="inline-flex items-center gap-1 font-semibold text-success-text dark:text-success">
                    <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse"></span>
                    Verified Session
                  </span>
                  <span className="font-mono text-muted-foreground uppercase text-[10px]">{user.role}</span>
                </div>
              </div>
            )}

            {/* Navigation Menu */}
            <nav className="rounded-2xl border border-border bg-card p-2 shadow-2xs">
              <div className="px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                {user?.role} Navigation
              </div>
              <ul className="space-y-0.5 mt-1">
                {roleNav.map((item) => {
                  const active = isItemActive(item);
                  const targetUrl = item.to || `${dashboardPath}?tab=${item.tab}`;

                  if (item.isExternal) {
                    return (
                      <li key={item.label}>
                        <a
                          href={targetUrl}
                          className="flex items-center justify-between rounded-xl px-2.5 py-2 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                        >
                          <span className="flex items-center gap-2">
                            <span className="text-sm">{item.icon}</span>
                            <span>{item.label}</span>
                          </span>
                          <span className="text-[10px] text-primary">↗</span>
                        </a>
                      </li>
                    );
                  }

                  return (
                    <li key={item.label}>
                      <Link
                        to={targetUrl}
                        className={cn(
                          'flex items-center justify-between rounded-xl px-2.5 py-2 text-xs transition-colors',
                          active
                            ? 'bg-primary-soft font-bold text-primary dark:text-accent-foreground border border-primary-border shadow-2xs'
                            : 'text-muted-foreground hover:bg-muted hover:text-foreground font-medium'
                        )}
                      >
                        <span className="flex items-center gap-2">
                          <span className="text-sm">{item.icon}</span>
                          <span>{item.label}</span>
                        </span>
                        {item.badge && (
                          <span className="rounded-full bg-card px-1.5 py-0.5 text-[10px] font-semibold text-primary border border-border">
                            {item.badge}
                          </span>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>

              {/* Utility Links Footer */}
              <div className="mt-3 pt-2.5 border-t border-border px-1 space-y-0.5">
                <NavLink
                  to={paths.systemStatus}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-2 rounded-xl px-2 py-1.5 text-xs transition-colors',
                      isActive ? 'text-primary font-semibold bg-primary-soft' : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                    )
                  }
                >
                  <span>📶</span>
                  <span>System Health</span>
                </NavLink>
                <Link
                  to={paths.root}
                  className="flex items-center gap-2 rounded-xl px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                  <span>🌐</span>
                  <span>Eduverse Home</span>
                </Link>
              </div>
            </nav>
          </div>
        </aside>

        {/* ─── Main View Content ─── */}
        <main id="main" className="min-w-0 flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
