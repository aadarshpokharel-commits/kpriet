import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import {
  Eye,
  EyeOff,
  Lock,
  Mail,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  BookOpen,
  Layers,
  Cpu,
  GraduationCap,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { getDashboardPathForRole, paths } from '@/router/paths';

export function SignInPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [collegeEmail, setCollegeEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Horizontal scroll states for IT Department Semester Teachers ribbon
  const semesterNavRef = useRef<HTMLDivElement>(null);
  const [canScrollSemLeft, setCanScrollSemLeft] = useState(false);
  const [canScrollSemRight, setCanScrollSemRight] = useState(false);

  const checkSemScroll = useCallback(() => {
    const el = semesterNavRef.current;
    if (!el) return;
    setCanScrollSemLeft(el.scrollLeft > 4);
    setCanScrollSemRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
  }, []);

  const scrollSem = (direction: 'left' | 'right') => {
    const el = semesterNavRef.current;
    if (!el) return;
    const distance = Math.max(160, el.clientWidth * 0.55);
    el.scrollBy({ left: direction === 'left' ? -distance : distance, behavior: 'smooth' });
    setTimeout(checkSemScroll, 200);
  };

  const handleSemWheel = (e: React.WheelEvent) => {
    const el = semesterNavRef.current;
    if (!el) return;
    if (Math.abs(e.deltaY) > Math.abs(e.deltaX) && el.scrollWidth > el.clientWidth) {
      el.scrollLeft += e.deltaY;
      checkSemScroll();
    }
  };

  useEffect(() => {
    checkSemScroll();
    const el = semesterNavRef.current;
    if (el) el.addEventListener('scroll', checkSemScroll, { passive: true });
    window.addEventListener('resize', checkSemScroll);
    return () => {
      if (el) el.removeEventListener('scroll', checkSemScroll);
      window.removeEventListener('resize', checkSemScroll);
    };
  }, [checkSemScroll]);

  // Quick preset fills for fast testing
  const setQuickDemo = (email: string, pass = 'Eduverse@Dev2026!') => {
    setCollegeEmail(email);
    setPassword(pass);
    setError(null);
  };

  // 1-Click instant login for semester demo teachers
  const handleQuickLogin = async (email: string, pass = 'Demo@IT12345') => {
    setCollegeEmail(email);
    setPassword(pass);
    setError(null);
    setLoading(true);
    try {
      const user = await login({ collegeEmail: email, password: pass });
      const from = (location.state as any)?.from?.pathname;
      const target = from || getDashboardPathForRole(user.role);
      navigate(target, { replace: true });
    } catch (err: any) {
      setError(err?.message || 'Login failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const rawInput = collegeEmail.trim();
      const emailToSubmit = rawInput.includes('@') ? rawInput : `${rawInput}@kpriet.ac.in`;
      const user = await login({ collegeEmail: emailToSubmit, password });
      // Redirect to the role dashboard or previous location
      const from = (location.state as any)?.from?.pathname;
      const target = from || getDashboardPathForRole(user.role);
      navigate(target, { replace: true });
    } catch (err: any) {
      setError(err?.message || 'Invalid institutional email or password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col justify-between transition-colors duration-200">
      
      {/* ─── Top Header ─── */}
      <header className="w-full border-b border-border bg-card/80 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to={paths.root} className="flex items-center gap-3 group">
            <div className="h-10 w-10 rounded-xl bg-white border border-primary-border p-1 shadow-xs flex items-center justify-center overflow-hidden">
              <img
                src="/brand/kpriet-logo.png"
                alt="KPR Institute of Engineering and Technology"
                className="h-full w-full object-contain"
                onError={(e) => {
                  const img = e.currentTarget;
                  if (!img.src.endsWith('/brand/logo.png')) img.src = '/brand/logo.png';
                }}
              />
            </div>
            <div>
              <span className="block text-sm font-black text-foreground tracking-tight leading-none group-hover:text-primary transition-colors">
                KPRIET
              </span>
              <span className="text-[10px] font-semibold text-primary dark:text-accent-foreground tracking-wider uppercase">
                KPRIET Portal
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            <ThemeToggle size="sm" />
            <Link
              to={paths.root}
              className="text-xs font-semibold text-muted-foreground hover:text-primary transition-colors hidden sm:inline-flex items-center gap-1"
            >
              <span>←</span> Public Portal
            </Link>
          </div>
        </div>
      </header>

      {/* ─── Main Auth Hero & Split Layout ─── */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 flex-1 flex items-center justify-center w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 w-full items-center">
          
          {/* Left Column: Platform Branding & Features (Desktop) */}
          <div className="lg:col-span-7 space-y-6 hidden lg:block">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-soft border border-primary-border text-primary dark:text-accent-foreground text-xs font-bold tracking-wide">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              Autonomous Academic Hub • R2021 & R2025
            </div>

            <h1 className="text-4xl xl:text-5xl font-extrabold tracking-tight text-foreground leading-tight">
              Next-Generation <br />
              <span className="text-primary dark:text-accent-foreground">
                Autonomous Learning
              </span>{' '}
              Portal
            </h1>

            <p className="text-sm xl:text-base text-muted-foreground max-w-xl leading-relaxed">
              Seamlessly unify curriculum intelligence, interactive simulations, proctored assessments, and Smart Board classroom collaboration for KPRIET engineering students and faculty.
            </p>

            {/* Benefit Badges */}
            <div className="grid grid-cols-2 gap-4 max-w-lg pt-2">
              <div className="p-4 rounded-2xl border border-border bg-card space-y-1.5 shadow-2xs">
                <div className="flex items-center gap-2 text-primary dark:text-accent-foreground font-bold text-xs">
                  <BookOpen className="w-4 h-4" />
                  12 Curriculum Tabs
                </div>
                <p className="text-xs text-muted-foreground leading-normal">
                  Notes, materials, recordings, and slide decks grounded per subject unit.
                </p>
              </div>

              <div className="p-4 rounded-2xl border border-border bg-card space-y-1.5 shadow-2xs">
                <div className="flex items-center gap-2 text-primary dark:text-accent-foreground font-bold text-xs">
                  <Cpu className="w-4 h-4" />
                  Subject AI Doubt Solver
                </div>
                <p className="text-xs text-muted-foreground leading-normal">
                  Domain-isolated RAG assistant calibrated strictly to course syllabi.
                </p>
              </div>

              <div className="p-4 rounded-2xl border border-border bg-card space-y-1.5 shadow-2xs">
                <div className="flex items-center gap-2 text-primary dark:text-accent-foreground font-bold text-xs">
                  <Layers className="w-4 h-4" />
                  Smart Board Sync
                </div>
                <p className="text-xs text-muted-foreground leading-normal">
                  Interactive real-time canvas with 2D/3D physics and chemistry simulations.
                </p>
              </div>

              <div className="p-4 rounded-2xl border border-border bg-card space-y-1.5 shadow-2xs">
                <div className="flex items-center gap-2 text-primary dark:text-accent-foreground font-bold text-xs">
                  <GraduationCap className="w-4 h-4" />
                  Continuous Proctoring
                </div>
                <p className="text-xs text-muted-foreground leading-normal">
                  Fullscreen integrity assessment engine with instant auto-grading.
                </p>
              </div>
            </div>
          </div>

          {/* Right Column: Sign In Card */}
          <div className="lg:col-span-5 w-full max-w-md mx-auto space-y-4">
            
            {/* 1-Click Test Credential Helper Bar */}
            <div className="p-4 rounded-2xl border border-border bg-card text-card-foreground shadow-xs space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-foreground flex items-center gap-1.5">
                  <span>⚡</span> Quick 1-Click Role Login:
                </span>
                <span className="text-[10px] text-muted-foreground font-mono">Dev Test Accounts</span>
              </div>
              <div className="grid grid-cols-4 gap-1.5 pt-1">
                <button
                  type="button"
                  onClick={() => setQuickDemo('student@kpriet.ac.in')}
                  className="rounded-xl border border-border bg-muted px-2 py-1.5 text-xs font-semibold text-foreground hover:border-primary hover:text-primary transition-all cursor-pointer shadow-2xs flex items-center justify-center gap-1"
                >
                  <span>🎓</span>
                  Student
                </button>
                <button
                  type="button"
                  onClick={() => setQuickDemo('teacher@kpriet.ac.in')}
                  className="rounded-xl border border-border bg-muted px-2 py-1.5 text-xs font-semibold text-foreground hover:border-primary hover:text-primary transition-all cursor-pointer shadow-2xs flex items-center justify-center gap-1"
                >
                  <span>👨‍🏫</span>
                  Teacher
                </button>
                <button
                  type="button"
                  onClick={() => setQuickDemo('hod.it@kpriet.ac.in')}
                  className="rounded-xl border border-border bg-muted px-2 py-1.5 text-xs font-semibold text-foreground hover:border-primary hover:text-primary transition-all cursor-pointer shadow-2xs flex items-center justify-center gap-1"
                >
                  <span>🏛️</span>
                  HOD
                </button>
                <button
                  type="button"
                  onClick={() => setQuickDemo('admin@kpriet.ac.in')}
                  className="rounded-xl border border-border bg-muted px-2 py-1.5 text-xs font-semibold text-foreground hover:border-primary hover:text-primary transition-all cursor-pointer shadow-2xs flex items-center justify-center gap-1"
                >
                  <span>⚡</span>
                  Admin
                </button>
              </div>
            </div>

            {/* IT Department Semester-Wise Demo Teachers (1-Click Login with Horizontal Scroll) */}
            <div className="p-4 rounded-2xl border border-primary/25 bg-primary/5 text-card-foreground shadow-xs space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-primary dark:text-accent-foreground flex items-center gap-1.5">
                  <span>💻</span> IT Department Semester Teachers:
                </span>
                <span className="text-[10px] bg-primary/10 text-primary dark:text-accent-foreground px-2 py-0.5 rounded-full font-mono font-semibold">
                  1-Click Login
                </span>
              </div>

              {/* Scrollable Semester Ribbon Container */}
              <div className="relative flex items-center rounded-xl bg-card/60 border border-primary/15 p-1">
                {/* Scroll Left Button */}
                <button
                  type="button"
                  onClick={() => scrollSem('left')}
                  disabled={!canScrollSemLeft}
                  aria-label="Scroll semesters left"
                  title="Scroll left (‹)"
                  className={`shrink-0 z-20 flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-card text-foreground transition-all cursor-pointer ${
                    canScrollSemLeft
                      ? 'opacity-100 hover:bg-muted hover:text-primary hover:scale-105 active:scale-95 shadow-2xs'
                      : 'opacity-0 pointer-events-none'
                  }`}
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>

                {/* Left Fade Mask */}
                {canScrollSemLeft && (
                  <div className="pointer-events-none absolute left-8 top-1 bottom-1 w-6 bg-gradient-to-r from-card to-transparent z-10" />
                )}

                {/* Horizontal Scroll Ribbon */}
                <div
                  ref={semesterNavRef}
                  onWheel={handleSemWheel}
                  className="flex-1 flex items-center gap-1.5 overflow-x-auto py-1 px-1 scroll-smooth scrollbar-none"
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => {
                    const roman = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'][sem - 1];
                    return (
                      <button
                        key={sem}
                        type="button"
                        disabled={loading}
                        onClick={() => handleQuickLogin(`it.sem${sem}.teacher@kpriet.ac.in`, 'Demo@IT12345')}
                        className="shrink-0 min-w-[70px] rounded-xl border border-primary/25 bg-card hover:bg-primary hover:text-primary-foreground hover:border-primary p-2 text-xs font-bold text-foreground transition-all cursor-pointer shadow-2xs flex flex-col items-center justify-center gap-0.5 active:scale-95 group disabled:opacity-50"
                        title={`Click to login as IT Semester ${sem} Teacher (${roman})`}
                      >
                        <span className="text-[9px] text-muted-foreground group-hover:text-primary-foreground/80 font-mono font-semibold uppercase">
                          Sem {sem}
                        </span>
                        <span className="text-xs font-black tracking-wide">
                          {roman}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Right Fade Mask */}
                {canScrollSemRight && (
                  <div className="pointer-events-none absolute right-8 top-1 bottom-1 w-6 bg-gradient-to-l from-card to-transparent z-10" />
                )}

                {/* Scroll Right Button */}
                <button
                  type="button"
                  onClick={() => scrollSem('right')}
                  disabled={!canScrollSemRight}
                  aria-label="Scroll semesters right"
                  title="Scroll right (›)"
                  className={`shrink-0 z-20 flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-card text-foreground transition-all cursor-pointer ${
                    canScrollSemRight
                      ? 'opacity-100 hover:bg-muted hover:text-primary hover:scale-105 active:scale-95 shadow-2xs'
                      : 'opacity-0 pointer-events-none'
                  }`}
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>

              <div className="text-[10px] text-muted-foreground text-center">
                Usernames: <span className="font-mono text-foreground">it.sem1.teacher</span> – <span className="font-mono text-foreground">it.sem8.teacher</span> • Pass: <span className="font-mono text-foreground">Demo@IT12345</span>
              </div>
            </div>

            {/* Error Alert */}
            {error && (
              <div className="rounded-2xl border border-error-border bg-error-soft p-4 text-xs font-medium text-error-text flex items-start gap-2.5 animate-in fade-in duration-150">
                <span className="text-error text-base">⚠️</span>
                <div className="flex-1 leading-relaxed">{error}</div>
              </div>
            )}

            {/* Sign In Form Card */}
            <div className="rounded-3xl border border-border bg-card text-card-foreground p-6 sm:p-8 shadow-xl space-y-6">
              <div className="space-y-1">
                <h2 className="text-xl font-black text-card-foreground tracking-tight">
                  Sign In to Your Workspace
                </h2>
                <p className="text-xs text-muted-foreground">
                  Access course contents, grades, assessments, and AI doubt solvers.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* College Email Input */}
                <div className="space-y-1.5">
                  <label
                    htmlFor="collegeEmail"
                    className="block text-xs font-bold uppercase tracking-wider text-foreground"
                  >
                    Official College Email or Username
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted-foreground">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      id="collegeEmail"
                      type="text"
                      required
                      value={collegeEmail}
                      onChange={(e) => setCollegeEmail(e.target.value)}
                      placeholder="e.g. math.teacher or 23it040@kpriet.ac.in"
                      className="block w-full pl-10 pr-4 py-3 rounded-xl border border-border bg-input text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                    />
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Sign in with username (e.g. <span className="font-semibold text-primary dark:text-accent-foreground">math.teacher</span>) or institutional email.
                  </p>
                </div>

                {/* Password Input */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label
                      htmlFor="password"
                      className="block text-xs font-bold uppercase tracking-wider text-foreground"
                    >
                      Password
                    </label>
                    <span className="text-[11px] font-medium text-primary dark:text-accent-foreground hover:underline cursor-pointer">
                      Forgot password?
                    </span>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted-foreground">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="block w-full pl-10 pr-11 py-3 rounded-xl border border-border bg-input text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-muted-foreground hover:text-foreground cursor-pointer"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Remember Session Checkbox */}
                <div className="flex items-center justify-between pt-1">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                    />
                    <span className="text-xs text-muted-foreground font-medium">
                      Keep me signed in
                    </span>
                  </label>
                  <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-primary" />
                    256-bit Encrypted
                  </span>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl bg-primary hover:bg-primary-hover text-primary-foreground font-bold text-sm shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-60 transition-all cursor-pointer transform active:scale-[0.99]"
                >
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      <span>Verifying Credentials...</span>
                    </div>
                  ) : (
                    <>
                      <span>Enter Academic Portal</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                {/* Register Link */}
                <div className="pt-3 text-center text-xs text-muted-foreground border-t border-border">
                  New student or faculty member?{' '}
                  <Link
                    to={paths.createAccount}
                    className="font-bold text-primary dark:text-accent-foreground hover:underline"
                  >
                    Create Account →
                  </Link>
                </div>
              </form>
            </div>

            {/* Footer Institutional Note */}
            <p className="text-center text-[11px] text-muted-foreground">
              KPR Institute of Engineering and Technology • Learn Beyond
            </p>
          </div>

        </div>
      </main>

      {/* ─── Bottom Sub-footer ─── */}
      <footer className="w-full border-t border-border py-4 text-center text-xs text-muted-foreground">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>© 2026 Eduverse. All rights reserved.</span>
          <div className="flex items-center gap-4">
            <Link to={paths.systemStatus} className="hover:text-primary transition-colors">
              System Health
            </Link>
            <span>•</span>
            <span>R2021 & R2025 Autonomous Curriculum</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
