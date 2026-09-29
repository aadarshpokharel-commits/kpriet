import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router';
import { useAuth } from '@/context/AuthContext';
import { AuthService } from '@/services/auth.service';
import { useProgrammes } from '@/hooks/useProgrammes';
import { getDashboardPathForRole, paths } from '@/router/paths';

type ProgrammeCategory = 'ALL' | 'UG' | 'PG' | 'MBA';

interface Programme {
  code: string;
  degree: string;
  name: string;
  category: 'UG' | 'PG' | 'MBA';
  icon: string;
  description: string;
  hod: {
    name: string;
    role: string;
    email: string;
  };
  subjects: string[];
  officialUrl: string;
}

/**
 * Presentation-only extras for the public programme cards, keyed by the stable
 * programmeId from the programme master. Programme NAMES, codes, degree type,
 * descriptions and the list itself always come from GET /programmes.
 */
const PROGRAMME_SHOWCASE: Record<string, { hod: Programme['hod']; subjects: string[] }> = {
  AIDS: {
    hod: {
      name: 'Dr. N. Yuvaraj',
      role: 'Professor & Head',
      email: 'yuvaraj.n@kpriet.ac.in',
    },
    subjects: [
      'Foundations of Data Science',
      'Machine Learning Paradigms',
      'Deep Learning & Neural Networks',
    ],
  },
  BME: {
    hod: {
      name: 'Dr. S. Sophia',
      role: 'Professor & Head',
      email: 'sophia.s@kpriet.ac.in',
    },
    subjects: [
      'Human Anatomy and Physiology',
      'Biomedical Instrumentation',
      'Medical Image Processing',
    ],
  },
  CHE: {
    hod: {
      name: 'Dr. K. Senthil Kumar',
      role: 'Professor & Head',
      email: 'senthilkumar.k@kpriet.ac.in',
    },
    subjects: [
      'Fluid Mechanics for Chemical Engineers',
      'Chemical Process Calculations',
      'Heat & Mass Transfer Operations',
    ],
  },
  CIV: {
    hod: {
      name: 'Dr. G. Anusha',
      role: 'Professor & Head',
      email: 'anusha.g@kpriet.ac.in',
    },
    subjects: [
      'Engineering Mechanics & Strength of Materials',
      'Structural Analysis & Modern Surveying',
      'Reinforced Concrete Structures (RCC)',
    ],
  },
  CSE: {
    hod: {
      name: 'Dr. M. Akila',
      role: 'Professor & Principal / HoD',
      email: 'principal@kpriet.ac.in',
    },
    subjects: [
      'Object Oriented Programming with Java',
      'Design and Analysis of Algorithms',
      'Operating Systems Architecture',
    ],
  },
  AIML: {
    hod: {
      name: 'Dr. D. Chandrakala',
      role: 'Professor & Head',
      email: 'chandrakala.d@kpriet.ac.in',
    },
    subjects: [
      'Statistical Foundations for Machine Learning',
      'Applied Artificial Intelligence & Heuristics',
      'Computer Vision & Image Analytics',
    ],
  },
  CYBER: {
    hod: {
      name: 'Dr. V. Seethalakshmi',
      role: 'Professor & Head',
      email: 'seethalakshmi.v@kpriet.ac.in',
    },
    subjects: [
      'Fundamentals of Information Security',
      'Applied Cryptography & Network Defense',
      'Ethical Hacking & Penetration Testing',
    ],
  },
  CSBS: {
    hod: {
      name: 'Dr. R. Saravanan',
      role: 'Professor & Head',
      email: 'saravanan.r@kpriet.ac.in',
    },
    subjects: [
      'Fundamentals of Economics & Financial Accounting',
      'Enterprise Design Thinking & Agile',
      'Predictive Analytics & Business Intelligence',
    ],
  },
  ECE: {
    hod: {
      name: 'Dr. J. Murugesan',
      role: 'Professor & Head',
      email: 'murugesan.j@kpriet.ac.in',
    },
    subjects: [
      'Electronic Circuits & Solid State Devices',
      'Digital Signal Processing & Filter Design',
      'VLSI Design & Verilog HDL',
    ],
  },
  EEE: {
    hod: {
      name: 'Dr. V. Kumar',
      role: 'Professor & Head',
      email: 'kumar.v@kpriet.ac.in',
    },
    subjects: [
      'Electric Circuit Analysis & Network Theory',
      'Electrical Machines & Electromagnetic Fields',
      'Power Electronics & Motor Drives',
    ],
  },
  IT: {
    hod: {
      name: 'Dr. Amitha I C',
      role: 'Associate Professor & Head',
      email: 'amitha.ic@kpriet.ac.in',
    },
    subjects: [
      'Matrices and Calculus',
      'Problem Solving and Python Programming',
      'Data Structures and Algorithms',
    ],
  },
  ME: {
    hod: {
      name: 'Dr. L. Rajeshkumar',
      role: 'Professor & Head',
      email: 'rajeshkumar.l@kpriet.ac.in',
    },
    subjects: [
      'Engineering Thermodynamics',
      'Kinematics and Dynamics of Machinery',
      'Manufacturing Technology & CNC Machines',
    ],
  },
  MTR: {
    hod: {
      name: 'Dr. B. Arulmurugan',
      role: 'Professor & Head',
      email: 'arulmurugan.b@kpriet.ac.in',
    },
    subjects: [
      'Sensors and Instrumentation in Robotics',
      'Microcontrollers & Embedded Automation',
      'Industrial Robotics & Machine Vision',
    ],
  },
};

/** Postgraduate / management programmes (outside the B.E. programme master). */
const POSTGRADUATE_PROGRAMMES: Programme[] = [
  {
    code: 'MCS',
    degree: 'M.E.',
    name: 'M.E. Computer Science and Engineering',
    category: 'PG',
    icon: '🎓',
    description: 'Postgraduate research in distributed cloud computing, algorithmic scalability, computational complexity, and secure architectures.',
    hod: {
      name: 'Dr. M. Akila',
      role: 'Professor & Head',
      email: 'akila.m@kpriet.ac.in',
    },
    subjects: [
      'Advanced Data Structures and Algorithms',
      'High Performance Parallel Computing',
    ],
    officialUrl: 'https://kpriet.ac.in',
  },
  {
    code: 'MVL',
    degree: 'M.E.',
    name: 'M.E. VLSI Design',
    category: 'PG',
    icon: '🔲',
    description: 'Advanced silicon system-on-chip (SoC) engineering, low-power nano-CMOS logic, and mixed-signal verification.',
    hod: {
      name: 'Dr. J. Murugesan',
      role: 'Professor & Head',
      email: 'murugesan.j@kpriet.ac.in',
    },
    subjects: [
      'Analog and Mixed Signal IC Design',
      'Low Power VLSI Circuit Architectures',
    ],
    officialUrl: 'https://kpriet.ac.in',
  },
  {
    code: 'MCD',
    degree: 'M.E.',
    name: 'M.E. CAD / CAM',
    category: 'PG',
    icon: '📐',
    description: 'Next-generation parametric computer-aided modeling, computational continuum mechanics, and robotic automated manufacturing.',
    hod: {
      name: 'Dr. L. Rajeshkumar',
      role: 'Professor & Head',
      email: 'rajeshkumar.l@kpriet.ac.in',
    },
    subjects: [
      'Advanced Finite Element Analysis (FEA)',
      'Computer Integrated Manufacturing Systems',
    ],
    officialUrl: 'https://kpriet.ac.in',
  },
  {
    code: 'MSE',
    degree: 'M.E.',
    name: 'M.E. Structural Engineering',
    category: 'PG',
    icon: '🏛',
    description: 'High-rise structural dynamics, seismic retrofitting, prestressed concrete megastructures, and advanced forensic engineering.',
    hod: {
      name: 'Dr. G. Anusha',
      role: 'Professor & Head',
      email: 'anusha.g@kpriet.ac.in',
    },
    subjects: [
      'Theory of Elasticity and Plasticity',
      'Earthquake Resistant Design of Structures',
    ],
    officialUrl: 'https://kpriet.ac.in',
  },
  {
    code: 'MBA',
    degree: 'M.B.A.',
    name: 'Master of Business Administration (M.B.A.)',
    category: 'MBA',
    icon: '💼',
    description: 'Executive management education cultivating visionary business leaders in global finance, digital marketing, HR analytics, and operations.',
    hod: {
      name: 'Dr. S. Sangeetha',
      role: 'Director & Head - KPR School of Business',
      email: 'sangeetha.s@kpriet.ac.in',
    },
    subjects: [
      'Managerial Economics & Strategic Analysis',
      'Marketing Management & Consumer Behavior',
      'Corporate Financial Management',
    ],
    officialUrl: 'https://kpriet.ac.in',
  },
];


export function HomePage() {
  const { isAuthenticated, user } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState<ProgrammeCategory>('ALL');
  const [deptIndex, setDeptIndex] = useState(0);
  const [publicStats, setPublicStats] = useState<{
    activeCourses: number;
    academicYears: number;
    facultyExperts: number;
    enrolledStudents: number;
  } | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    AuthService.getPublicStats()
      .then((data) => setPublicStats(data))
      .catch(() => {})
      .finally(() => setStatsLoading(false));
  }, []);

  // Horizontal scroll state for Programme Category Filter Tabs
  const categoryNavRef = useRef<HTMLDivElement>(null);
  const [canScrollCategoryLeft, setCanScrollCategoryLeft] = useState(false);
  const [canScrollCategoryRight, setCanScrollCategoryRight] = useState(false);

  const checkCategoryScroll = useCallback(() => {
    const el = categoryNavRef.current;
    if (!el) return;
    setCanScrollCategoryLeft(el.scrollLeft > 4);
    setCanScrollCategoryRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
  }, []);

  const scrollCategory = (direction: 'left' | 'right') => {
    const el = categoryNavRef.current;
    if (!el) return;
    const distance = Math.max(200, el.clientWidth * 0.6);
    el.scrollBy({ left: direction === 'left' ? -distance : distance, behavior: 'smooth' });
    setTimeout(checkCategoryScroll, 200);
  };

  const handleCategoryWheel = (e: React.WheelEvent) => {
    const el = categoryNavRef.current;
    if (!el) return;
    if (Math.abs(e.deltaY) > Math.abs(e.deltaX) && el.scrollWidth > el.clientWidth) {
      el.scrollLeft += e.deltaY;
      checkCategoryScroll();
    }
  };

  useEffect(() => {
    checkCategoryScroll();
    const el = categoryNavRef.current;
    if (el) {
      el.addEventListener('scroll', checkCategoryScroll, { passive: true });
    }
    window.addEventListener('resize', checkCategoryScroll);
    return () => {
      if (el) el.removeEventListener('scroll', checkCategoryScroll);
      window.removeEventListener('resize', checkCategoryScroll);
    };
  }, [checkCategoryScroll]);

  // B.E. programmes come from the central programme master (GET /programmes).
  const { programmes: programmeMaster } = useProgrammes();
  const ugProgrammes: Programme[] = programmeMaster.map((p) => {
    const showcase = PROGRAMME_SHOWCASE[p.programmeId];
    return {
      code: p.programmeId,
      degree: p.type,
      name: p.name,
      category: 'UG',
      icon: p.icon || '🎓',
      description: p.description || '',
      hod: p.hod
        ? { name: p.hod.name, role: 'Head of Department', email: p.hod.collegeEmail || '' }
        : showcase?.hod || { name: 'To be announced', role: 'Head of Department', email: '' },
      subjects: showcase?.subjects || [],
      officialUrl: p.officialWebsite || 'https://kpriet.ac.in',
    };
  });
  const PROGRAMMES: Programme[] = [...ugProgrammes, ...POSTGRADUATE_PROGRAMMES];
  const countBy = (cat: Programme['category']) => PROGRAMMES.filter((p) => p.category === cat).length;
  const ROTATING_DEPARTMENTS = PROGRAMMES.map((p) => `Department of ${p.name}`);
  const rotatingCount = ROTATING_DEPARTMENTS.length;

  useEffect(() => {
    if (rotatingCount === 0) return;
    const timer = setInterval(() => {
      setDeptIndex((prev) => (prev + 1) % rotatingCount);
    }, 1000);
    return () => clearInterval(timer);
  }, [rotatingCount]);

  const filteredProgrammes = PROGRAMMES.filter((p) => {
    if (selectedCategory === 'ALL') return true;
    return p.category === selectedCategory;
  });

  return (
    <div className="min-h-screen bg-[#FBFDFB] text-slate-900 font-sans selection:bg-[#247D4C] selection:text-white">
      {/* ══════════ 1. TOP NAVIGATION ══════════ */}
      <header className="sticky top-0 z-50 border-b border-slate-200/90 bg-white/95 backdrop-blur-md transition-all shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
        <div className="mx-auto flex h-16 sm:h-18 max-w-[min(96vw,1920px)] items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Brand Logo & Name */}
          <Link to="/" className="flex items-center gap-3.5 group">
            <img
              src="/brand/kpriet-logo.png"
              alt="KPRIET Logo"
              className="h-11 w-11 object-contain group-hover:scale-105 transition-transform"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                if (!target.src.includes('logo.png')) target.src = '/brand/logo.png';
              }}
            />
            <div className="flex flex-col">
              <span className="text-[15px] font-bold tracking-tight text-[#142B47] leading-tight">
                KPR Institute of
              </span>
              <span className="text-[15px] font-bold tracking-tight text-[#142B47] leading-tight">
                Engineering and Technology
              </span>
              <span className="text-[10px] text-slate-500 font-medium">
                Autonomous, Affiliated to Anna University
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-7 text-[13.5px] font-medium text-slate-600">
            <a href="#home" className="hover:text-[#247D4C] transition-colors">Home</a>
            <a href="#features" className="hover:text-[#247D4C] transition-colors">Features</a>
            <a href="#programmes" className="hover:text-[#247D4C] transition-colors">Programmes ({PROGRAMMES.length})</a>
            <a href="#students" className="hover:text-[#247D4C] transition-colors">Students</a>
            <a href="#teachers" className="hover:text-[#247D4C] transition-colors">Teachers</a>
            <a href="#about" className="hover:text-[#247D4C] transition-colors">About</a>
          </nav>

          {/* Auth CTA Actions: Always show Login and Register */}
          <div className="flex items-center gap-2.5">
            {isAuthenticated && user && (
              <Link
                to={getDashboardPathForRole(user.role)}
                className="hidden sm:inline-flex items-center gap-1.5 rounded-xl bg-emerald-50 border border-emerald-200 px-3.5 py-2 text-xs font-bold text-emerald-800 hover:bg-emerald-100 transition-colors shadow-xs"
              >
                <span>👤</span>
                <span>Dashboard ({user.role})</span>
              </Link>
            )}
            <Link
              to={paths.signin}
              className="rounded-xl border border-slate-300 bg-white px-4.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-xs"
            >
              Login
            </Link>
            <Link
              to={paths.createAccount}
              className="rounded-xl bg-[#247D4C] px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-[#1B5E39] transition-all"
            >
              Register
            </Link>
          </div>
        </div>
      </header>

      {/* ══════════ 2. HERO SECTION ══════════ */}
      <section id="home" className="relative overflow-hidden pt-12 pb-20 lg:pt-16 lg:pb-28">
        <div className="mx-auto max-w-[min(96vw,1920px)] px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            
            {/* Left Column: Headlines & CTAs */}
            <div className="lg:col-span-7 space-y-6">
              {/* Institution Pill */}
              <div className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-4 py-1.5 text-xs font-semibold text-sky-800 shadow-sm">
                <span>🏛</span>
                <span>Autonomous Institution • NAAC 'A' Grade • NBA Accredited • KPRIET</span>
              </div>

              {/* Main Titles */}
              <div className="space-y-1">
                <h1 className="text-3xl sm:text-4xl lg:text-[44px] font-extrabold tracking-tight text-slate-900 leading-[1.18]">
                  KPR Institute of Engineering and Technology
                </h1>
                <div className="text-3xl sm:text-4xl lg:text-[44px] font-extrabold tracking-tight text-[#0284C7] leading-[1.18] flex items-center gap-2">
                  <span>Learn Beyond</span>
                  <span className="text-[#0284C7] text-2xl font-black">●</span>
                </div>
                <h2 className="text-3xl sm:text-4xl lg:text-[44px] font-extrabold tracking-tight text-[#1B5E39] leading-[1.18] min-h-[46px] sm:min-h-[54px] lg:min-h-[58px] flex items-center">
                  <span
                    key={deptIndex}
                    className="inline-block transition-all duration-300 animate-in fade-in slide-in-from-bottom-2"
                  >
                    {ROTATING_DEPARTMENTS[deptIndex % Math.max(rotatingCount, 1)] ?? ''}
                  </span>
                </h2>
              </div>

              {/* Subtitle */}
              <p className="text-base sm:text-lg text-slate-600 max-w-2xl leading-relaxed pt-2">
                Official Academic Management & Smart Board Learning Platform for the Department of Information Technology at KPRIET. Connected student workspaces, multi-course faculty rosters, and digital curriculum labs.
              </p>

              {/* CTA Action Buttons: Clear Login and Register Options */}
              <div className="flex flex-wrap items-center gap-3.5 pt-3">
                <Link
                  to={paths.createAccount}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#247D4C] px-6 py-3.5 text-sm font-bold text-white shadow-md hover:bg-[#1B5E39] transition-all"
                >
                  <span>📝</span> Register Account →
                </Link>
                <Link
                  to={paths.signin}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-6 py-3.5 text-sm font-bold text-slate-800 hover:bg-slate-50 transition-colors shadow-sm"
                >
                  <span>🔑</span> Login
                </Link>
                <a
                  href="#features"
                  className="text-sm font-bold text-[#247D4C] hover:text-[#1B5E39] hover:underline px-3 py-2"
                >
                  Explore Eduverse ↓
                </a>
              </div>

              {/* Quick Metric Stats - Live Database Aggregation */}
              <div className="grid grid-cols-4 gap-4 pt-8 border-t border-slate-200/80 max-w-xl">
                <div>
                  <div className="text-2xl sm:text-3xl font-extrabold text-[#1B5E39]">
                    {statsLoading ? (
                      <span className="inline-block h-8 w-12 bg-slate-200 animate-pulse rounded" />
                    ) : (
                      `${publicStats?.activeCourses ?? 0}+`
                    )}
                  </div>
                  <div className="text-xs font-medium text-slate-500 mt-0.5">Active Courses</div>
                </div>
                <div>
                  <div className="text-2xl sm:text-3xl font-extrabold text-[#1B5E39]">
                    {statsLoading ? (
                      <span className="inline-block h-8 w-8 bg-slate-200 animate-pulse rounded" />
                    ) : (
                      publicStats?.academicYears ?? 4
                    )}
                  </div>
                  <div className="text-xs font-medium text-slate-500 mt-0.5">Academic Years</div>
                </div>
                <div>
                  <div className="text-2xl sm:text-3xl font-extrabold text-[#1B5E39]">
                    {statsLoading ? (
                      <span className="inline-block h-8 w-10 bg-slate-200 animate-pulse rounded" />
                    ) : (
                      publicStats?.facultyExperts ?? 0
                    )}
                  </div>
                  <div className="text-xs font-medium text-slate-500 mt-0.5">Faculty Experts</div>
                </div>
                <div>
                  <div className="text-2xl sm:text-3xl font-extrabold text-[#1B5E39]">
                    {statsLoading ? (
                      <span className="inline-block h-8 w-16 bg-slate-200 animate-pulse rounded" />
                    ) : (
                      `${(publicStats?.enrolledStudents ?? 0).toLocaleString()}+`
                    )}
                  </div>
                  <div className="text-xs font-medium text-slate-500 mt-0.5">Enrolled Students</div>
                </div>
              </div>
            </div>

            {/* Right Column: Visual Connected Flow Card with Floating Badges */}
            <div className="lg:col-span-5 relative">
              {/* Floating Math Badge Top-Right */}
              <div className="absolute -top-4 -right-2 z-20 bg-white/95 backdrop-blur-sm border border-slate-200 shadow-md rounded-2xl px-3.5 py-1.5 text-xs font-mono font-bold text-slate-700 flex items-center gap-1.5">
                <span>∫f(x)dx = F(x) + C</span>
                <span>📐</span>
              </div>

              {/* Floating Physics Badge Bottom-Left */}
              <div className="absolute -bottom-4 -left-2 z-20 bg-white/95 backdrop-blur-sm border border-slate-200 shadow-md rounded-2xl px-3.5 py-1.5 text-xs font-mono font-bold text-[#0284C7] flex items-center gap-1.5">
                <span>F = m·a • v = u + at</span>
                <span>⚛</span>
              </div>

              {/* Main Card Container */}
              <div className="relative rounded-3xl border border-slate-200/90 bg-white p-6 sm:p-7 shadow-[0_12px_40px_rgba(0,0,0,0.06)] space-y-4">
                {/* Flow Header */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="h-8 w-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-bold text-sm">
                      ⚡
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 leading-tight">
                        Eduverse Connected Flow
                      </h3>
                      <p className="text-[11px] text-slate-500">Live Institutional Synchronization</p>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 border border-emerald-200/80">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    Synchronized
                  </span>
                </div>

                {/* Step 01 */}
                <div className="flex items-start gap-3.5 p-3 rounded-2xl bg-slate-50/70 border border-slate-100">
                  <div className="h-10 w-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center text-lg flex-shrink-0">
                    🖥
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-slate-900">Smart Board Vector Canvas</h4>
                      <span className="text-[10px] font-bold text-slate-400">01</span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-snug mt-0.5">
                      Live lecture teaching, drawing, and calculations
                    </p>
                  </div>
                </div>

                <div className="text-center text-slate-500 font-bold text-xs py-0">↓</div>

                {/* Step 02 */}
                <div className="flex items-start gap-3.5 p-3 rounded-2xl bg-slate-50/70 border border-slate-100">
                  <div className="h-10 w-10 rounded-xl bg-sky-100 text-sky-800 flex items-center justify-center text-lg flex-shrink-0">
                    🧑‍🏫
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-slate-900">Teacher Content & Notes</h4>
                      <span className="text-[10px] font-bold text-sky-600">02</span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-snug mt-0.5">
                      One-click PDF generation & verified publishing
                    </p>
                  </div>
                </div>

                <div className="text-center text-slate-500 font-bold text-xs py-0">↓</div>

                {/* Step 03 */}
                <div className="flex items-start gap-3.5 p-3 rounded-2xl bg-slate-50/70 border border-slate-100">
                  <div className="h-10 w-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center text-lg flex-shrink-0">
                    📝
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-slate-900">Quizzes & Problem Sets</h4>
                      <span className="text-[10px] font-bold text-amber-600">03</span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-snug mt-0.5">
                      Subject-isolated tests & student submissions
                    </p>
                  </div>
                </div>

                <div className="text-center text-slate-500 font-bold text-xs py-0">↓</div>

                {/* Step 04 */}
                <div className="flex items-start gap-3.5 p-3 rounded-2xl bg-slate-50/70 border border-slate-100">
                  <div className="h-10 w-10 rounded-xl bg-purple-100 text-purple-800 flex items-center justify-center text-lg flex-shrink-0">
                    🎓
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-slate-900">Enrolled Students & Results</h4>
                      <span className="text-[10px] font-bold text-purple-600">04</span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-snug mt-0.5">
                      Instant scorecard, PDF viewers & progress metrics
                    </p>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ══════════ 3. PLATFORM CAPABILITIES SECTION ══════════ */}
      <section id="features" className="py-20 bg-slate-50/60 border-y border-slate-200/80">
        <div className="mx-auto max-w-[min(96vw,1920px)] px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <span className="inline-block rounded-full bg-emerald-100 text-emerald-800 px-3.5 py-1 text-xs font-semibold">
              Platform Capabilities
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Everything Your Academic Community Needs
            </h2>
            <p className="text-sm sm:text-base text-slate-600">
              Built specifically for academic rigor, department hierarchy, and digital classroom engagement.
            </p>
          </div>

          <div className="mt-14 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Capability 1 */}
            <div className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm hover:shadow-md transition-shadow">
              <div className="h-12 w-12 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center text-2xl mb-5">
                🖥
              </div>
              <h3 className="text-base font-bold text-slate-900">Smart Board Learning</h3>
              <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                Teach directly from the interactive vector Smart Board with shapes, graph plots, formulas, and live stylus precision.
              </p>
            </div>

            {/* Capability 2 */}
            <div className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm hover:shadow-md transition-shadow">
              <div className="h-12 w-12 rounded-xl bg-sky-50 text-sky-700 flex items-center justify-center text-2xl mb-5">
                📄
              </div>
              <h3 className="text-base font-bold text-slate-900">Digital Notes</h3>
              <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                Share classroom lecture notes and syllabus materials digitally with instant delivery to enrolled students.
              </p>
            </div>

            {/* Capability 3 */}
            <div className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm hover:shadow-md transition-shadow">
              <div className="h-12 w-12 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center text-2xl mb-5">
                📝
              </div>
              <h3 className="text-base font-bold text-slate-900">Quizzes & Assessments</h3>
              <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                Create, attempt, and automatically score multiple-choice and conceptual quizzes with immediate feedback.
              </p>
            </div>

            {/* Capability 4 */}
            <div className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm hover:shadow-md transition-shadow">
              <div className="h-12 w-12 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center text-2xl mb-5">
                📥
              </div>
              <h3 className="text-base font-bold text-slate-900">Assignments</h3>
              <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                Manage problem sets, student solution uploads, deadlines, and teacher grading with qualitative feedback.
              </p>
            </div>

            {/* Capability 5 */}
            <div className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm hover:shadow-md transition-shadow">
              <div className="h-12 w-12 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center text-2xl mb-5">
                📚
              </div>
              <h3 className="text-base font-bold text-slate-900">Subject-Based Learning</h3>
              <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                Keep Mathematics, Physics, and department curriculums strictly isolated and organized without cross-subject mixing.
              </p>
            </div>

            {/* Capability 6 */}
            <div className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm hover:shadow-md transition-shadow">
              <div className="h-12 w-12 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center text-2xl mb-5">
                👥
              </div>
              <h3 className="text-base font-bold text-slate-900">Academic Dashboard</h3>
              <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                Dedicated role-tailored workspaces for Students, Subject Teachers, Department HODs, and Administrators.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════ 4. SEAMLESS WORKFLOW SECTION ══════════ */}
      <section className="py-20 bg-white">
        <div className="mx-auto max-w-[min(96vw,1920px)] px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <span className="inline-block rounded-full bg-sky-100 text-sky-800 px-3.5 py-1 text-xs font-semibold">
              Seamless Workflow
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              How Eduverse Works
            </h2>
            <p className="text-sm sm:text-base text-slate-600">
              From blackboard derivations to student mastery in four transparent academic steps.
            </p>
          </div>

          <div className="mt-14 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Step 1 */}
            <div className="relative p-6 rounded-2xl border border-slate-200 bg-slate-50/50">
              <div className="text-3xl font-black text-emerald-600/30 mb-2">01</div>
              <h3 className="text-base font-bold text-slate-900">Teacher Teaches</h3>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                Teacher uses the Smart Board and digital resources to explain formulas, derivations, and interactive simulations.
              </p>
            </div>

            {/* Step 2 */}
            <div className="relative p-6 rounded-2xl border border-slate-200 bg-slate-50/50">
              <div className="text-3xl font-black text-sky-600/30 mb-2">02</div>
              <h3 className="text-base font-bold text-slate-900">Content Is Shared</h3>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                Notes, materials, quizzes, and assignments are compiled and automatically connected to the assigned subject.
              </p>
            </div>

            {/* Step 3 */}
            <div className="relative p-6 rounded-2xl border border-slate-200 bg-slate-50/50">
              <div className="text-3xl font-black text-amber-600/30 mb-2">03</div>
              <h3 className="text-base font-bold text-slate-900">Students Learn</h3>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                Enrolled students automatically receive subject content, review lecture slides, attempt quizzes, and practice on board.
              </p>
            </div>

            {/* Step 4 */}
            <div className="relative p-6 rounded-2xl border border-slate-200 bg-slate-50/50">
              <div className="text-3xl font-black text-purple-600/30 mb-2">04</div>
              <h3 className="text-base font-bold text-slate-900">Progress Is Tracked</h3>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                Assignments, quizzes, results, and student academic activity are recorded in real-time for departmental review.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════ 5. INTERACTIVE CLASSROOM TECHNOLOGY SECTION ══════════ */}
      <section className="py-20 bg-slate-950 text-white relative overflow-hidden">
        <div className="mx-auto max-w-[min(96vw,1920px)] px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto space-y-3 mb-14">
            <span className="inline-block rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-3.5 py-1 text-xs font-semibold">
              Interactive Classroom Technology
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Turn Every Classroom Into a Digital Learning Space
            </h2>
            <p className="text-sm sm:text-base text-slate-300">
              Teachers can teach using the existing Smart Board, create digital content, use subject-specific simulations, and share classroom notes with students.
            </p>
          </div>

          {/* Interactive Smart Board Showcase Card */}
          <div className="max-w-4xl mx-auto rounded-3xl border border-slate-800 bg-slate-900/90 shadow-2xl p-6 sm:p-8 backdrop-blur-xl">
            {/* Smart Board Mock Header */}
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <span className="text-xl">🖥</span>
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    PiyushDhara Smart Board
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      ● Math 101
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400">Teacher: Dr. Sharma • Lecture 04</p>
                </div>
              </div>
              <span className="text-xs font-mono font-semibold text-slate-400 px-2.5 py-1 rounded bg-slate-800 border border-slate-700">
                4K Vector
              </span>
            </div>

            {/* Board Mock Workspace */}
            <div className="my-6 rounded-2xl border border-slate-800 bg-[#060a14] p-6 text-center space-y-4">
              <p className="text-xs text-slate-400 font-medium">Quadratic Formula & Kinematics:</p>
              <div className="font-mono text-base sm:text-lg text-emerald-400 font-bold tracking-wide">
                x = (-b ± √(b² - 4ac)) / (2a)
              </div>
              <div className="font-mono text-xs sm:text-sm text-sky-400 font-semibold tracking-wider">
                v² = u² + 2as • s = ut + ½at²
              </div>
              <div className="pt-2 text-xs text-slate-400">
                ✏️ Freehand Pen • 📐 Compass & Ruler • 📊 Grapher • 🔬 Simulations
              </div>
            </div>

            {/* Smart Board Action Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
              <div className="flex items-center gap-2 text-xs text-slate-300">
                <span className="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 font-medium">🖥 Smart Board</span>
                <span className="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 font-medium">📄 Digital Notes</span>
                <span className="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 font-medium">🔬 Simulations</span>
                <span className="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 font-medium">📁 Subject Resources</span>
              </div>
              <Link
                to={isAuthenticated && user ? getDashboardPathForRole(user.role) : paths.signin}
                className="inline-flex items-center gap-2 rounded-xl bg-[#247D4C] hover:bg-[#1B5E39] text-white px-5 py-2.5 text-xs font-bold transition-all shadow-md"
              >
                <span>🔐</span> {isAuthenticated ? 'Open Dashboard Workspace →' : 'Sign In to Access Smart Board →'}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════ 6. LEARNER WORKSPACE SECTION ══════════ */}
      <section id="students" className="py-20 bg-slate-50/50">
        <div className="mx-auto max-w-[min(96vw,1920px)] px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <span className="inline-block rounded-full bg-emerald-100 text-emerald-800 px-3.5 py-1 text-xs font-semibold">
              Learner Workspace
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Everything Students Need, In One Place
            </h2>
            <p className="text-sm sm:text-base text-slate-600">
              Students access enrolled subjects from one unified dashboard with automatic content delivery.
            </p>
          </div>

          <div className="mt-14 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="text-2xl mb-3">📚</div>
              <h3 className="text-sm font-bold text-slate-900">My Subjects</h3>
              <p className="text-xs text-slate-600 mt-1.5">Single dashboard view displaying enrolled courses with faculty details.</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="text-2xl mb-3">📄</div>
              <h3 className="text-sm font-bold text-slate-900">Class Notes</h3>
              <p className="text-xs text-slate-600 mt-1.5">Verified PDF lecture notes published directly from the Smart Board.</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="text-2xl mb-3">📁</div>
              <h3 className="text-sm font-bold text-slate-900">Learning Materials</h3>
              <p className="text-xs text-slate-600 mt-1.5">Syllabus outlines, slide decks, reference PDFs, and digital simulations.</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="text-2xl mb-3">📝</div>
              <h3 className="text-sm font-bold text-slate-900">Quizzes</h3>
              <p className="text-xs text-slate-600 mt-1.5">Interactive timed quizzes with automated scoring and instant feedback.</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="text-2xl mb-3">📥</div>
              <h3 className="text-sm font-bold text-slate-900">Assignments</h3>
              <p className="text-xs text-slate-600 mt-1.5">Homework problem sets, file uploads, and submission tracking.</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="text-2xl mb-3">📊</div>
              <h3 className="text-sm font-bold text-slate-900">Results</h3>
              <p className="text-xs text-slate-600 mt-1.5">Academic scorecards and quiz attempt histories partitioned by subject.</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="text-2xl mb-3">🔔</div>
              <h3 className="text-sm font-bold text-slate-900">Notifications</h3>
              <p className="text-xs text-slate-600 mt-1.5">Real-time alerts when teachers publish new notes, quizzes, or grades.</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="text-2xl mb-3">📈</div>
              <h3 className="text-sm font-bold text-slate-900">Academic Progress</h3>
              <p className="text-xs text-slate-600 mt-1.5">Track your subject mastery and completed assignment milestones.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════ 7. FACULTY EMPOWERMENT SECTION ══════════ */}
      <section id="teachers" className="py-20 bg-white">
        <div className="mx-auto max-w-[min(96vw,1920px)] px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <span className="inline-block rounded-full bg-sky-100 text-sky-800 px-3.5 py-1 text-xs font-semibold">
              Faculty Empowerment
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Teach Smarter. Manage Everything From One Dashboard.
            </h2>
            <p className="text-sm sm:text-base text-slate-600">
              Teachers manage strictly their assigned subjects with complete subject isolation and Smart Board sync.
            </p>
          </div>

          <div className="mt-14 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-6 shadow-sm">
              <div className="text-2xl mb-3">🎯</div>
              <h3 className="text-sm font-bold text-slate-900">Subject Dashboard</h3>
              <p className="text-xs text-slate-600 mt-1.5">Focused workspace exclusively containing assigned subject courses.</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-6 shadow-sm">
              <div className="text-2xl mb-3">🖥</div>
              <h3 className="text-sm font-bold text-slate-900">Smart Board</h3>
              <p className="text-xs text-slate-600 mt-1.5">1-click transition to the live Smart Board for drawing and lecture delivery.</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-6 shadow-sm">
              <div className="text-2xl mb-3">📤</div>
              <h3 className="text-sm font-bold text-slate-900">Share Notes</h3>
              <p className="text-xs text-slate-600 mt-1.5">Directly convert board drawings or documents to PDF and broadcast to students.</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-6 shadow-sm">
              <div className="text-2xl mb-3">📁</div>
              <h3 className="text-sm font-bold text-slate-900">Digital Materials</h3>
              <p className="text-xs text-slate-600 mt-1.5">Publish PPT slides, syllabus guides, reference manuals, and video links.</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-6 shadow-sm">
              <div className="text-2xl mb-3">📝</div>
              <h3 className="text-sm font-bold text-slate-900">Quizzes</h3>
              <p className="text-xs text-slate-600 mt-1.5">Design timed quizzes with multiple-choice questions and automated scoring.</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-6 shadow-sm">
              <div className="text-2xl mb-3">📥</div>
              <h3 className="text-sm font-bold text-slate-900">Assignments</h3>
              <p className="text-xs text-slate-600 mt-1.5">Assign problem sets, track student submissions, and manage deadlines.</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-6 shadow-sm">
              <div className="text-2xl mb-3">✏️</div>
              <h3 className="text-sm font-bold text-slate-900">Grading</h3>
              <p className="text-xs text-slate-600 mt-1.5">Evaluate worksheet uploads, award marks, and provide qualitative guidance.</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-6 shadow-sm">
              <div className="text-2xl mb-3">📢</div>
              <h3 className="text-sm font-bold text-slate-900">Announcements</h3>
              <p className="text-xs text-slate-600 mt-1.5">Send urgent updates and classroom announcements to enrolled learners.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════ 8. INSTITUTIONAL GOVERNANCE SECTION ══════════ */}
      <section className="py-20 bg-slate-50/70 border-t border-slate-200">
        <div className="mx-auto max-w-[min(96vw,1920px)] px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <span className="inline-block rounded-full bg-emerald-100 text-emerald-800 px-3.5 py-1 text-xs font-semibold">
              Institutional Governance
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Role-Based Academic Architecture
            </h2>
            <p className="text-sm sm:text-base text-slate-600">
              Connected hierarchy across administrative oversight, department governance, faculty teaching, and student learning.
            </p>
          </div>

          <div className="mt-14 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-7 text-center shadow-sm">
              <div className="text-3xl mb-3">🏛</div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Principal / Admin</span>
              <h3 className="text-base font-bold text-slate-900 mt-1">Institution Overview</h3>
              <p className="text-xs text-slate-600 mt-2.5 leading-relaxed">
                Institution-level academic overview, department monitoring, and overall system audit logs.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-7 text-center shadow-sm">
              <div className="text-3xl mb-3">🎓</div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600">Head of Department</span>
              <h3 className="text-base font-bold text-slate-900 mt-1">Department Management</h3>
              <p className="text-xs text-slate-600 mt-2.5 leading-relaxed">
                Faculty registration approvals, subject assignments, department stats, and student listings.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-7 text-center shadow-sm">
              <div className="text-3xl mb-3">👨‍🏫</div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-sky-600">Teacher</span>
              <h3 className="text-base font-bold text-slate-900 mt-1">Subject Management</h3>
              <p className="text-xs text-slate-600 mt-2.5 leading-relaxed">
                Subject teaching, note publishing, quiz authoring, assignment submissions, and grading.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-7 text-center shadow-sm">
              <div className="text-3xl mb-3">👨‍🎓</div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-purple-600">Student</span>
              <h3 className="text-base font-bold text-slate-900 mt-1">Active Learning</h3>
              <p className="text-xs text-slate-600 mt-2.5 leading-relaxed">
                Subject workspace access, class notes, quiz attempts, homework submissions, and academic progress.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════ 9. ACADEMIC DISCIPLINES (ALL PROGRAMMES — B.E. list from the programme master) SECTION ══════════ */}
      <section id="programmes" className="py-20 bg-white">
        <div className="mx-auto max-w-[min(96vw,1920px)] px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <span className="inline-block rounded-full bg-emerald-100 text-emerald-800 px-3.5 py-1 text-xs font-semibold">
              Academic Disciplines
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Explore Academic Programmes & Departments
            </h2>
            <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
              KPR Institute of Engineering and Technology offers {PROGRAMMES.length} distinguished autonomous degree programmes. Choose your department to access official curriculum syllabi, Smart Board lecture notes, and faculty portals.
            </p>
          </div>

          {/* Programme Category Filter Tabs with Horizontal Scroll Controls */}
          <div className="mt-10 max-w-2xl mx-auto relative flex items-center rounded-2xl border border-slate-200 bg-slate-50/90 p-1.5 shadow-sm">
            {/* Scroll Left Button */}
            <button
              type="button"
              onClick={() => scrollCategory('left')}
              disabled={!canScrollCategoryLeft}
              aria-label="Scroll categories left"
              title="Scroll left (‹)"
              className={`shrink-0 z-20 flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition-all cursor-pointer ${
                canScrollCategoryLeft
                  ? 'opacity-100 hover:bg-slate-100 hover:text-emerald-700 hover:scale-105 active:scale-95 shadow-xs'
                  : 'opacity-0 pointer-events-none'
              }`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            {/* Left Fade Mask */}
            {canScrollCategoryLeft && (
              <div className="pointer-events-none absolute left-10 top-1.5 bottom-1.5 w-8 bg-gradient-to-r from-slate-50 to-transparent z-10" />
            )}

            {/* Horizontal Scrollable Categories Container */}
            <div
              ref={categoryNavRef}
              onWheel={handleCategoryWheel}
              className="flex-1 flex items-center justify-center sm:justify-start lg:justify-center gap-2 overflow-x-auto py-1 px-1.5 scroll-smooth scrollbar-none"
            >
              <button
                type="button"
                onClick={() => {
                  setSelectedCategory('ALL');
                  setTimeout(checkCategoryScroll, 100);
                }}
                className={`shrink-0 rounded-xl px-4 py-2 text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  selectedCategory === 'ALL'
                    ? 'bg-[#247D4C] text-white shadow-sm ring-1 ring-emerald-600'
                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                All Programmes ({PROGRAMMES.length})
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedCategory('UG');
                  setTimeout(checkCategoryScroll, 100);
                }}
                className={`shrink-0 rounded-xl px-4 py-2 text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  selectedCategory === 'UG'
                    ? 'bg-[#247D4C] text-white shadow-sm ring-1 ring-emerald-600'
                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                B.E. Undergraduate ({countBy('UG')})
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedCategory('PG');
                  setTimeout(checkCategoryScroll, 100);
                }}
                className={`shrink-0 rounded-xl px-4 py-2 text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  selectedCategory === 'PG'
                    ? 'bg-[#247D4C] text-white shadow-sm ring-1 ring-emerald-600'
                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                M.E. Postgraduate ({countBy('PG')})
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedCategory('MBA');
                  setTimeout(checkCategoryScroll, 100);
                }}
                className={`shrink-0 rounded-xl px-4 py-2 text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  selectedCategory === 'MBA'
                    ? 'bg-[#247D4C] text-white shadow-sm ring-1 ring-emerald-600'
                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                M.B.A. ({countBy('MBA')})
              </button>
            </div>

            {/* Right Fade Mask */}
            {canScrollCategoryRight && (
              <div className="pointer-events-none absolute right-10 top-1.5 bottom-1.5 w-8 bg-gradient-to-l from-slate-50 to-transparent z-10" />
            )}

            {/* Scroll Right Button */}
            <button
              type="button"
              onClick={() => scrollCategory('right')}
              disabled={!canScrollCategoryRight}
              aria-label="Scroll categories right"
              title="Scroll right (›)"
              className={`shrink-0 z-20 flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition-all cursor-pointer ${
                canScrollCategoryRight
                  ? 'opacity-100 hover:bg-slate-100 hover:text-emerald-700 hover:scale-105 active:scale-95 shadow-xs'
                  : 'opacity-0 pointer-events-none'
              }`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* Department Cards Grid */}
          <div className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProgrammes.map((prog) => (
              <div
                key={prog.code}
                className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md hover:border-emerald-300 transition-all"
              >
                <div>
                  {/* Top Badges */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="text-2xl">{prog.icon}</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                        {prog.degree}
                      </span>
                      <span className="text-[11px] font-extrabold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                        {prog.code}
                      </span>
                    </div>
                  </div>

                  {/* Title & Description */}
                  <h3 className="text-base font-bold text-slate-900 leading-snug">
                    {prog.name}
                  </h3>
                  <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                    {prog.description}
                  </p>

                  {/* Head of Department Info */}
                  <div className="mt-4 pt-3 border-t border-slate-100 text-xs">
                    <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                      <span>🏛</span>
                      <span>Head: {prog.hod.name}</span>
                    </div>
                    <div className="text-[11px] text-slate-500 pl-5">
                      {prog.hod.role}
                      {prog.hod.email ? ` • ${prog.hod.email}` : ''}
                    </div>
                  </div>

                  {/* Core Subjects */}
                  <div className="mt-3.5 space-y-1">
                    {prog.subjects.map((sub, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-xs text-slate-700">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
                        <span className="truncate">{sub}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Card Actions */}
                <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                  <Link
                    to={paths.signin}
                    className="text-xs font-bold text-[#247D4C] hover:text-[#1B5E39] flex items-center gap-1"
                  >
                    Access Portal →
                  </Link>
                  <a
                    href={prog.officialUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-medium text-slate-400 hover:text-slate-600"
                  >
                    Official Page ↗
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════ 10. NEXT-GEN ACADEMIC AI SECTION ══════════ */}
      <section className="py-20 bg-slate-50/70 border-t border-slate-200">
        <div className="mx-auto max-w-[min(96vw,1920px)] px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <span className="inline-block rounded-full bg-emerald-100 text-emerald-800 px-3.5 py-1 text-xs font-semibold">
              Next-Gen Academic AI
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Academic Assistance That Understands Your Subject
            </h2>
            <p className="text-sm sm:text-base text-slate-600">
              Students and teachers can access subject-specific academic assistance grounded in verified course materials.
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Math AI Card */}
            <div className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
              <div className="text-3xl mb-3">📐</div>
              <span className="text-[11px] font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
                Mathematics Knowledge Base
              </span>
              <h3 className="text-base font-bold text-slate-900 mt-2">Curriculum-Aligned Math AI</h3>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                Step-by-step calculus proofs, quadratic equation roots, and trigonometry derivations referenced to classroom notes.
              </p>
            </div>

            {/* Physics AI Card */}
            <div className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
              <div className="text-3xl mb-3">⚛</div>
              <span className="text-[11px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                Physics Knowledge Base
              </span>
              <h3 className="text-base font-bold text-slate-900 mt-2">Experimental STEM Assistant</h3>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                Projectile kinematics, free-body force balances, pendulum harmonics, and wave superposition with live simulation links.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════ 11. CALL TO ACTION SECTION ══════════ */}
      <section className="py-20 bg-[#142B47] text-white text-center">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 space-y-6">
          <div className="inline-block rounded-full bg-white/10 px-4 py-1.5 text-xs font-bold tracking-wider uppercase text-emerald-400">
            KPRIET
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Ready to Enter the Eduverse?
          </h2>
          <p className="text-base sm:text-lg text-slate-300 max-w-xl mx-auto">
            Connect learning, teaching and academic management in one platform.
          </p>
          <div className="flex flex-wrap justify-center gap-4 pt-3">
            <Link
              to={paths.createAccount}
              className="rounded-xl bg-[#247D4C] hover:bg-[#1B5E39] px-6 py-3.5 text-sm font-bold text-white shadow-md transition-all"
            >
              Register Account
            </Link>
            <Link
              to={paths.signin}
              className="rounded-xl border border-white/30 bg-white/10 hover:bg-white/15 px-6 py-3.5 text-sm font-bold text-white transition-colors"
            >
              Login to Portal
            </Link>
          </div>
        </div>
      </section>

      {/* ══════════ 12. INSTITUTIONAL FOOTER ══════════ */}
      <footer id="about" className="border-t border-slate-200 bg-white py-14 text-slate-600 text-xs">
        <div className="mx-auto max-w-[min(96vw,1920px)] px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
            {/* Col 1: Brand */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <img
                  src="/brand/kpriet-logo.png"
                  alt="KPRIET"
                  className="h-8 w-8 object-contain"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    if (!target.src.includes('logo.png')) target.src = '/brand/logo.png';
                  }}
                />
                <span className="font-extrabold text-sm text-[#142B47]">KPRIET</span>
              </div>
              <p className="text-slate-500 leading-relaxed">
                Eduverse Academic Portal — Modernizing higher education with connected Smart Board instruction, digital notes, and rigorous assessments.
              </p>
            </div>

            {/* Col 2: Quick Links */}
            <div>
              <h4 className="font-bold text-slate-900 mb-3 text-xs uppercase tracking-wider">Quick Links</h4>
              <ul className="space-y-2">
                <li><a href="#home" className="hover:text-[#247D4C]">Home</a></li>
                <li><a href="#features" className="hover:text-[#247D4C]">Features</a></li>
                <li><a href="#students" className="hover:text-[#247D4C]">Students</a></li>
                <li><a href="#teachers" className="hover:text-[#247D4C]">Teachers</a></li>
              </ul>
            </div>

            {/* Col 3: Authentication */}
            <div>
              <h4 className="font-bold text-slate-900 mb-3 text-xs uppercase tracking-wider">Authentication</h4>
              <ul className="space-y-2">
                <li><Link to={paths.signin} className="hover:text-[#247D4C]">Sign In</Link></li>
                <li><Link to={paths.createAccount} className="hover:text-[#247D4C]">Create Account</Link></li>
                <li><Link to={paths.signin} className="hover:text-[#247D4C]">Student Portal</Link></li>
                <li><Link to={paths.signin} className="hover:text-[#247D4C]">Teacher Portal</Link></li>
              </ul>
            </div>

            {/* Col 4: Academic */}
            <div>
              <h4 className="font-bold text-slate-900 mb-3 text-xs uppercase tracking-wider">Academic</h4>
              <ul className="space-y-2 text-slate-500">
                <li>{programmeMaster.length} B.E. Programmes</li>
                <li>{PROGRAMMES.length} KPRIET Academic Programmes</li>
                <li>Regulations 2025 / 2021 Autonomous</li>
              </ul>
            </div>
          </div>

          <div className="mt-12 pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4 text-slate-500 text-[11px]">
            <p>© 2026 KPR Institute of Engineering and Technology (KPRIET). All rights reserved.</p>
            <p>Institutional Academic Learning Platform</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
