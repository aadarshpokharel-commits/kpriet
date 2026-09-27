import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import {
  Eye,
  EyeOff,
  Lock,
  Mail,
  User,
  GraduationCap,
  Briefcase,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { ProgrammeSelect } from '@/components/programme/ProgrammeSelect';
import { useProgrammeRegistrationOptions } from '@/hooks/useProgrammes';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { paths } from '@/router/paths';

export function CreateAccountPage() {
  const { registerStudent, registerTeacher } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'student' | 'teacher'>('student');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [teacherSuccessMessage, setTeacherSuccessMessage] = useState<string | null>(null);

  // Programme selection — list comes from the central programme master API.
  const [programmeId, setProgrammeId] = useState<string>('');
  const [programmeError, setProgrammeError] = useState<string | null>(null);
  const { data: registrationOptions } = useProgrammeRegistrationOptions(programmeId || null);
  const [academicYear, setAcademicYear] = useState<string>('');

  // Common Form Fields
  const [name, setName] = useState('');
  const [collegeEmail, setCollegeEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Student specific
  const [studentRoll, setStudentRoll] = useState('');
  const [semesterNumber, setSemesterNumber] = useState(1);

  // Teacher specific
  const [employeeId, setEmployeeId] = useState('');
  const [designation, setDesignation] = useState('Assistant Professor');

  // Default the academic year to the newest one available for the selected programme.
  useEffect(() => {
    const years = registrationOptions?.academicYears ?? [];
    setAcademicYear((current) => (current && years.includes(current) ? current : years[0] ?? ''));
  }, [registrationOptions]);

  // Password strength meter calculation
  const calculatePasswordStrength = (pass: string) => {
    if (!pass) return { score: 0, label: 'None', color: 'bg-muted' };
    let score = 0;
    if (pass.length >= 8) score += 1;
    if (/[A-Z]/.test(pass)) score += 1;
    if (/[0-9]/.test(pass)) score += 1;
    if (/[^A-Za-z0-9]/.test(pass)) score += 1;

    switch (score) {
      case 1:
        return { score: 25, label: 'Weak', color: 'bg-error' };
      case 2:
        return { score: 50, label: 'Fair', color: 'bg-warning' };
      case 3:
        return { score: 75, label: 'Good', color: 'bg-info' };
      case 4:
        return { score: 100, label: 'Strong', color: 'bg-success' };
      default:
        return { score: 15, label: 'Too short', color: 'bg-error' };
    }
  };

  const passwordStrength = calculatePasswordStrength(password);
  const passwordsMatch = password.length > 0 && confirmPassword.length > 0 && password === confirmPassword;
  const passwordMismatch = confirmPassword.length > 0 && password !== confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setProgrammeError(null);

    // Validation checks
    if (!programmeId) {
      setProgrammeError('Select your programme / department.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match. Please verify both password fields.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    setLoading(true);

    try {
      if (activeTab === 'student') {
        await registerStudent({
          name,
          collegeEmail,
          password,
          programmeId,
          studentIdentifier: studentRoll.toUpperCase(),
          currentSemesterNumber: Number(semesterNumber),
          ...(academicYear ? { academicYear } : {}),
        });
        navigate(paths.studentDashboard, { replace: true });
      } else {
        await registerTeacher({
          name,
          collegeEmail,
          password,
          programmeId,
          employeeIdentifier: employeeId.toUpperCase(),
          designation,
        });

        setTeacherSuccessMessage(
          'Faculty application submitted! Your account is now PENDING review by your department HOD. You will receive access once approved.'
        );
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to complete registration. Please check your credentials.');
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
              to={paths.signin}
              className="text-xs font-semibold text-muted-foreground hover:text-primary transition-colors hidden sm:inline-flex items-center gap-1"
            >
              Sign In Instead →
            </Link>
          </div>
        </div>
      </header>

      {/* ─── Main Registration Card Container ─── */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 flex-1 flex items-center justify-center w-full">
        <div className="w-full space-y-6">
          
          {/* Header Title */}
          <div className="text-center space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary-soft border border-primary-border text-primary dark:text-accent-foreground text-xs font-bold">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              KPRIET Institutional Onboarding
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              Create Your Academic Account
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-md mx-auto">
              Please register using your official college roll email address (e.g.{' '}
              <span className="font-mono text-primary dark:text-accent-foreground font-bold">23IT040@kpriet.ac.in</span>).
            </p>
          </div>

          {/* Teacher Success Confirmation Screen */}
          {teacherSuccessMessage ? (
            <div className="rounded-3xl border border-success-border bg-card text-card-foreground p-8 shadow-xl text-center space-y-5 animate-in zoom-in-95 duration-200">
              <div className="h-16 w-16 bg-success-soft text-success rounded-full flex items-center justify-center mx-auto border border-success-border">
                <CheckCircle2 className="w-9 h-9" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-card-foreground">
                  Registration Submitted for Review
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
                  {teacherSuccessMessage}
                </p>
              </div>
              <div className="pt-2">
                <Link
                  to={paths.signin}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary hover:bg-primary-hover text-primary-foreground font-bold text-xs shadow-md transition-all"
                >
                  Return to Sign In →
                </Link>
              </div>
            </div>
          ) : (
            <div className="rounded-3xl border border-border bg-card text-card-foreground p-6 sm:p-8 shadow-xl space-y-6">
              
              {/* Role Switcher Tabs */}
              <div className="grid grid-cols-2 p-1 rounded-2xl bg-muted border border-border">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('student');
                    setError(null);
                  }}
                  className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeTab === 'student'
                      ? 'bg-card text-primary dark:text-accent-foreground shadow-xs border border-border'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <GraduationCap className="w-4 h-4" />
                  <span>Student Registration</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('teacher');
                    setError(null);
                  }}
                  className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeTab === 'teacher'
                      ? 'bg-card text-primary dark:text-accent-foreground shadow-xs border border-border'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Briefcase className="w-4 h-4" />
                  <span>Faculty Registration</span>
                </button>
              </div>

              {/* Error Alert */}
              {error && (
                <div className="rounded-2xl border border-error-border bg-error-soft p-4 text-xs font-medium text-error-text flex items-start gap-2.5 animate-in fade-in duration-150">
                  <AlertCircle className="w-4 h-4 text-error shrink-0 mt-0.5" />
                  <div className="flex-1 leading-relaxed">{error}</div>
                </div>
              )}

              {/* Registration Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                
                {/* Full Name & Institutional Email Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Full Name */}
                  <div className="space-y-1.5">
                    <label
                      htmlFor="name"
                      className="block text-xs font-bold uppercase tracking-wider text-foreground"
                    >
                      Full Name
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted-foreground">
                        <User className="w-4 h-4" />
                      </div>
                      <input
                        id="name"
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Piyush Sharma"
                        className="block w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-input text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                  </div>

                  {/* College Email */}
                  <div className="space-y-1.5">
                    <label
                      htmlFor="collegeEmail"
                      className="block text-xs font-bold uppercase tracking-wider text-foreground"
                    >
                      Official College Email
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted-foreground">
                        <Mail className="w-4 h-4" />
                      </div>
                      <input
                        id="collegeEmail"
                        type="email"
                        required
                        value={collegeEmail}
                        onChange={(e) => setCollegeEmail(e.target.value)}
                        placeholder={activeTab === 'student' ? '23IT040@kpriet.ac.in' : 'faculty@kpriet.ac.in'}
                        className="block w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-input text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                  </div>
                </div>

                {/* Role Specific Identifier */}
                <div className="grid grid-cols-1 gap-4">
                  {/* Student Roll / Faculty ID */}
                  <div className="space-y-1.5">
                    <label
                      htmlFor="identifier"
                      className="block text-xs font-bold uppercase tracking-wider text-foreground"
                    >
                      {activeTab === 'student' ? 'Roll / Register Number' : 'Employee / Faculty ID'}
                    </label>
                    <input
                      id="identifier"
                      type="text"
                      required
                      value={activeTab === 'student' ? studentRoll : employeeId}
                      onChange={(e) =>
                        activeTab === 'student' ? setStudentRoll(e.target.value) : setEmployeeId(e.target.value)
                      }
                      placeholder={activeTab === 'student' ? 'e.g. 7376231IT040' : 'e.g. KPR_FAC_104'}
                      className="block w-full px-4 py-2.5 rounded-xl border border-border bg-input text-sm text-foreground placeholder:text-muted-foreground uppercase focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>

                </div>

                {/* Programme / Department — from the central programme master (full names, searchable) */}
                <ProgrammeSelect
                  id="programme"
                  value={programmeId}
                  onChange={(id) => {
                    setProgrammeId(id);
                    setProgrammeError(null);
                  }}
                  required
                  error={programmeError}
                  helperText={
                    activeTab === 'teacher'
                      ? 'Your HOD will review your registration. Subjects are assigned by the HOD after approval.'
                      : undefined
                  }
                />

                {/* Additional Role Attributes: Semester for Student, Designation for Teacher */}
                {activeTab === 'student' ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label
                      htmlFor="semesterNumber"
                      className="block text-xs font-bold uppercase tracking-wider text-foreground"
                    >
                      Current Semester
                    </label>
                    <select
                      id="semesterNumber"
                      value={semesterNumber}
                      onChange={(e) => setSemesterNumber(Number(e.target.value))}
                      className="block w-full px-3 py-2.5 rounded-xl border border-border bg-input text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    >
                      {(registrationOptions?.semesterNumbers ?? [1, 2, 3, 4, 5, 6, 7, 8]).map((sem) => (
                        <option key={sem} value={sem}>
                          Semester {sem}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label
                      htmlFor="academicYear"
                      className="block text-xs font-bold uppercase tracking-wider text-foreground"
                    >
                      Academic Year
                    </label>
                    <select
                      id="academicYear"
                      value={academicYear}
                      onChange={(e) => setAcademicYear(e.target.value)}
                      disabled={!programmeId || (registrationOptions?.academicYears.length ?? 0) === 0}
                      className="block w-full px-3 py-2.5 rounded-xl border border-border bg-input text-sm text-foreground disabled:opacity-60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    >
                      {!programmeId && <option value="">Select a programme first</option>}
                      {programmeId && (registrationOptions?.academicYears.length ?? 0) === 0 && (
                        <option value="">Curriculum not published yet</option>
                      )}
                      {(registrationOptions?.academicYears ?? []).map((year) => (
                        <option key={year} value={year}>
                          {year.replace('-', '–')}
                        </option>
                      ))}
                    </select>
                  </div>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <label
                      htmlFor="designation"
                      className="block text-xs font-bold uppercase tracking-wider text-foreground"
                    >
                      Faculty Designation
                    </label>
                    <select
                      id="designation"
                      value={designation}
                      onChange={(e) => setDesignation(e.target.value)}
                      className="block w-full px-3 py-2.5 rounded-xl border border-border bg-input text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    >
                      <option value="Assistant Professor">Assistant Professor</option>
                      <option value="Associate Professor">Associate Professor</option>
                      <option value="Professor">Professor</option>
                      <option value="Adjunct Faculty">Adjunct Faculty</option>
                      <option value="Course Coordinator">Course Coordinator</option>
                    </select>
                  </div>
                )}

                {/* Password and Confirm Password Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                  {/* Password */}
                  <div className="space-y-1.5">
                    <label
                      htmlFor="password"
                      className="block text-xs font-bold uppercase tracking-wider text-foreground"
                    >
                      Password
                    </label>
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
                        className="block w-full pl-10 pr-11 py-2.5 rounded-xl border border-border bg-input text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-muted-foreground hover:text-foreground cursor-pointer"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>

                    {/* Password Strength Meter */}
                    {password.length > 0 && (
                      <div className="space-y-1 pt-1">
                        <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                          <div
                            className={`h-full ${passwordStrength.color} transition-all duration-300`}
                            style={{ width: `${passwordStrength.score}%` }}
                          />
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-muted-foreground font-medium">
                          <span>Strength: {passwordStrength.label}</span>
                          <span>Min 8 chars, 1 uppercase, 1 number</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Confirm Password */}
                  <div className="space-y-1.5">
                    <label
                      htmlFor="confirmPassword"
                      className="block text-xs font-bold uppercase tracking-wider text-foreground"
                    >
                      Confirm Password
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted-foreground">
                        <Lock className="w-4 h-4" />
                      </div>
                      <input
                        id="confirmPassword"
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••••••"
                        className={`block w-full pl-10 pr-10 py-2.5 rounded-xl border bg-input text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 ${
                          passwordMismatch
                            ? 'border-error focus:border-error focus:ring-error/20'
                            : passwordsMatch
                            ? 'border-success focus:border-success focus:ring-success/20'
                            : 'border-border focus:border-primary'
                        }`}
                      />
                      {passwordsMatch && (
                        <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-success">
                          <CheckCircle2 className="w-4 h-4" />
                        </div>
                      )}
                    </div>
                    {passwordMismatch && (
                      <p className="text-[10px] text-error font-medium">
                        Passwords do not match.
                      </p>
                    )}
                  </div>
                </div>

                {/* Faculty Approval Notice */}
                {activeTab === 'teacher' && (
                  <div className="rounded-2xl border border-warning-border bg-warning-soft p-3.5 text-xs text-warning-text flex items-start gap-2.5">
                    <ShieldAlert className="w-4 h-4 text-warning shrink-0 mt-0.5" />
                    <p className="leading-relaxed">
                      Faculty accounts require institutional verification by the respective department Head of Department (HOD) before full course creation and grading features are activated.
                    </p>
                  </div>
                )}

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading || passwordMismatch}
                  className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl bg-primary hover:bg-primary-hover text-primary-foreground font-bold text-sm shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-60 transition-all cursor-pointer transform active:scale-[0.99] mt-2"
                >
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      <span>Registering Account...</span>
                    </div>
                  ) : (
                    <>
                      <span>Complete {activeTab === 'student' ? 'Student' : 'Faculty'} Registration</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                {/* Already have account */}
                <div className="pt-3 text-center text-xs text-muted-foreground border-t border-border">
                  Already have an active institutional account?{' '}
                  <Link
                    to={paths.signin}
                    className="font-bold text-primary dark:text-accent-foreground hover:underline"
                  >
                    Sign in here →
                  </Link>
                </div>
              </form>
            </div>
          )}

          <p className="text-center text-[11px] text-muted-foreground">
            KPR Institute of Engineering and Technology • Learn Beyond • Autonomous Curriculum
          </p>

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
