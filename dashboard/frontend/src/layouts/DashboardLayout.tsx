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
  { label: 'Smart Board', to: '/smartboard/index.html', icon: '✨', isExternal: true },
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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

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

  const getSmartBoardUrl = () => {
    if (!user) return '/smartboard/index.html';
    // Build the return URL that the Smart Board "← Portal" button will navigate to.
    // We use the role-specific dashboard path instead of the current location so
    // that coming from any page (e.g. overview, subjects list, etc.) always returns
    // to the correct teacher/student dashboard.
    const roleReturn =
      user.role === 'TEACHER' ? '/teacher/dashboard' :
      user.role === 'STUDENT' ? '/student/dashboard' :
      user.role === 'HOD'     ? '/hod/dashboard' :
      '/teacher/dashboard';
    const returnUrl = window.location.origin + roleReturn;
    const params = new URLSearchParams({
      role: (user.role || 'teacher').toLowerCase(),
      teacherName: user.name || '',
      name: user.name || '',
      teacherId: (user as any).id || (user as any)._id || '',
      departmentName: (user as any).departmentName || (user as any).department?.name || '',
      returnUrl,
    });
    return `/smartboard/index.html?${params.toString()}`;
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
        <div className="mx-auto flex h-14 sm:h-15 w-full max-w-[min(98vw,2560px)] items-center justify-between gap-3 px-3 sm:px-5 lg:px-6 3xl:px-8">
          <div className="flex items-center gap-2.5 sm:gap-3">
            {/* Mobile Menu Hamburger */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden inline-flex items-center justify-center min-w-[38px] min-h-[38px] p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer transition-colors"
              aria-label="Toggle mobile menu"
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>

            <Link to={paths.root} className="flex items-center gap-2">
              <BrandLogo className="h-7 sm:h-8 w-auto" />
            </Link>
            <span className="hidden h-4 w-px bg-border sm:block" aria-hidden="true" />
            <div className="hidden sm:flex items-center gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary-soft text-primary dark:text-accent-foreground border border-primary-border">
                {user ? `${user.role}` : 'Eduverse'}
              </span>
              <span className="text-xs text-muted-foreground font-medium hidden lg:inline">Academic Suite</span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-2.5 text-sm">
            <Link
              to={paths.root}
              className="text-muted-foreground hover:text-foreground font-medium transition-colors hidden sm:inline text-xs"
            >
              Public Portal
            </Link>
            <a
              href={getSmartBoardUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-primary dark:text-accent-foreground bg-primary-soft border border-primary-border hover:bg-primary hover:text-white transition-all shadow-2xs"
            >
              <span>✨</span> Smart Board
            </a>

            {/* Smart Board Classroom Fullscreen Toggle */}
            <button
              type="button"
              onClick={() => {
                if (!document.fullscreenElement) {
                  document.documentElement.requestFullscreen().catch(() => {});
                } else {
                  document.exitFullscreen().catch(() => {});
                }
              }}
              className="hidden sm:inline-flex items-center justify-center min-w-[34px] min-h-[34px] rounded-xl border border-border bg-muted/70 p-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
              title="Toggle Classroom Fullscreen (Smart Board)"
              aria-label="Toggle Fullscreen"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
              </svg>
            </button>

            <ThemeToggle size="sm" />

            {user ? (
              <div className="flex items-center gap-2 sm:gap-2.5 pl-2 sm:pl-2.5 border-l border-border">
                <NotificationCenter />
                <div className="hidden md:flex flex-col text-right">
                  <span className="text-xs font-semibold text-foreground leading-tight">{user.name}</span>
                  <span className="text-[10px] text-muted-foreground leading-tight">{user.identifier || user.role}</span>
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
              <a
                href={getSmartBoardUrl()}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary font-medium"
              >
                Open Smart Board →
              </a>
            </div>
          </div>
        )}
      </header>

      {/* ─── Main Content Container ─── */}
      <div className="mx-auto flex w-full max-w-[min(98vw,2560px)] flex-1 flex-col gap-4 sm:gap-6 px-3 py-4 sm:px-5 lg:px-6 3xl:px-8 md:flex-row md:gap-6 lg:gap-8 md:py-6">
        {/* ─── Desktop Role-Based Persistent Sidebar ─── */}
        <aside
          aria-label="Role Navigation"
          className={cn(
            'hidden md:block transition-all duration-200 shrink-0',
            sidebarCollapsed ? 'md:w-16' : 'md:w-56'
          )}
        >
          <div className="sticky top-20 space-y-3">
            {/* User Profile Pill Card */}
            {user && (
              <div
                className={cn(
                  'rounded-2xl border border-border bg-card shadow-2xs text-card-foreground transition-all',
                  sidebarCollapsed ? 'p-2 flex flex-col items-center text-center' : 'p-3'
                )}
              >
                <div className={cn('flex items-center', sidebarCollapsed ? 'justify-center' : 'gap-2.5')}>
                  <div className="h-8.5 w-8.5 rounded-xl bg-primary-soft text-primary dark:text-accent-foreground border border-primary-border font-bold flex items-center justify-center text-xs shadow-2xs shrink-0">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  {!sidebarCollapsed && (
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-foreground truncate leading-tight">{user.name}</p>
                      <p className="text-[10.5px] text-muted-foreground truncate mt-0.5">
                        {user.identifier || user.collegeEmail}
                      </p>
                    </div>
                  )}
                </div>
                {!sidebarCollapsed && (
                  <div className="mt-2 pt-2 border-t border-border flex items-center justify-between text-[10.5px]">
                    <span className="inline-flex items-center gap-1 font-semibold text-success-text dark:text-success">
                      <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse"></span>
                      Active
                    </span>
                    <span className="font-mono text-muted-foreground uppercase text-[10px]">{user.role}</span>
                  </div>
                )}
              </div>
            )}

            {/* Navigation Menu */}
            <nav className="rounded-2xl border border-border bg-card p-1.5 shadow-2xs">
              <div className="flex items-center justify-between px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                {!sidebarCollapsed && <span>{user?.role} Navigation</span>}
                <button
                  type="button"
                  onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                  className="rounded-lg p-1 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer ml-auto"
                  title={sidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar (More Smart Board Space)'}
                  aria-label={sidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    {sidebarCollapsed ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                    )}
                  </svg>
                </button>
              </div>

              <ul className="space-y-0.5 mt-1">
                {roleNav.map((item) => {
                  const active = isItemActive(item);
                  const targetUrl = item.to || `${dashboardPath}?tab=${item.tab}`;

                  if (item.isExternal) {
                    return (
                      <li key={item.label}>
                        <a
                          href={item.label === 'Smart Board' ? getSmartBoardUrl() : targetUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          title={sidebarCollapsed ? item.label : undefined}
                          className={cn(
                            'flex items-center rounded-xl py-2 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors min-h-[38px]',
                            sidebarCollapsed ? 'justify-center px-1' : 'justify-between px-2.5'
                          )}
                        >
                          <span className="flex items-center gap-2">
                            <span className="text-sm shrink-0">{item.icon}</span>
                            {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
                          </span>
                          {!sidebarCollapsed && <span className="text-[10px] text-primary">↗</span>}
                        </a>
                      </li>
                    );
                  }

                  return (
                    <li key={item.label}>
                      <Link
                        to={targetUrl}
                        title={sidebarCollapsed ? item.label : undefined}
                        className={cn(
                          'flex items-center rounded-xl py-2 text-xs transition-colors min-h-[38px]',
                          sidebarCollapsed ? 'justify-center px-1' : 'justify-between px-2.5',
                          active
                            ? 'bg-primary-soft font-bold text-primary dark:text-accent-foreground border border-primary-border shadow-2xs'
                            : 'text-muted-foreground hover:bg-muted hover:text-foreground font-medium'
                        )}
                      >
                        <span className="flex items-center gap-2">
                          <span className="text-sm shrink-0">{item.icon}</span>
                          {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
                        </span>
                        {!sidebarCollapsed && item.badge && (
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
              {!sidebarCollapsed && (
                <div className="mt-2.5 pt-2 border-t border-border px-1 space-y-0.5">
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
              )}
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
