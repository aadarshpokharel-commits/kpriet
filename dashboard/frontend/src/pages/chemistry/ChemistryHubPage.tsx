import { useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import {
  CHEMISTRY_UNITS,
  MOLECULES_3D_CATALOG,
  CHEMISTRY_MISSIONS,
  VIRTUAL_LAB_EXPERIMENTS,
  VIVA_VOCE_BANK,
} from './chemistryData';
import { Molecule3DViewer } from './components/Molecule3DViewer';
import { NewmanHybridizationStudio } from './components/NewmanHybridizationStudio';
import { ReactionMechanismStudio } from './components/ReactionMechanismStudio';
import { CHEMISTRY_BOARD_SIMULATIONS } from '@/simulations/chemistry';
import { SimulationModal } from '@/simulations/SimulationModal';
import type { ISimulationDefinition } from '@/simulations/types';

type ChemistryTab =
  | 'overview'
  | 'molecules'
  | 'conformation'
  | 'mechanisms'
  | 'virtuallab'
  | 'spectroscopy'
  | 'electrochem'
  | 'polymers'
  | 'missions'
  | 'viva'
  | 'materials';

export function ChemistryHubPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = (searchParams.get('tab') as ChemistryTab) || 'overview';

  const setTab = (tab: ChemistryTab) => {
    setSearchParams({ tab });
  };

  // 3D Molecular Studio Active Molecule
  const [selectedMoleculeId, setSelectedMoleculeId] = useState<string>('mol-water');
  const activeMolecule =
    MOLECULES_3D_CATALOG.find((m) => m.id === selectedMoleculeId) || MOLECULES_3D_CATALOG[0]!;

  // Active Lab Experiment
  const [selectedLabId, setSelectedLabId] = useState<string>('lab-01');
  const activeLab =
    VIRTUAL_LAB_EXPERIMENTS.find((l) => l.id === selectedLabId) || VIRTUAL_LAB_EXPERIMENTS[0]!;

  // Simulation Preview Modal State
  const [previewSim, setPreviewSim] = useState<ISimulationDefinition | null>(null);

  // Classroom Presentation Mode State for 4K Smartboards
  const [classroomMode, setClassroomMode] = useState<boolean>(false);

  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  // Viva question reveal states
  const [revealedVivaAnswers, setRevealedVivaAnswers] = useState<Record<string, boolean>>({});
  const toggleViva = (id: string) => {
    setRevealedVivaAnswers((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Launch Simulation Helper
  const handleLaunchSim = (simKey: string) => {
    const simDef = CHEMISTRY_BOARD_SIMULATIONS.find((s) => s.id === simKey);
    if (simDef) {
      setPreviewSim(simDef);
    } else {
      window.open(`/smartboard/chem-simulation.html?sim=${simKey}`, '_blank');
    }
  };

  return (
    <div
      className={`min-h-screen bg-background text-foreground pb-20 selection:bg-primary selection:text-white transition-colors ${
        classroomMode ? 'classroom-mode' : ''
      }`}
    >
      {/* ═════════════════════════════════════════════════════════════════ */}
      {/* 1. TOP HEADER & BREADCRUMBS                                       */}
      {/* ═════════════════════════════════════════════════════════════════ */}
      <header
        className={`sticky top-0 z-40 border-b border-line bg-surface/95 backdrop-blur-md ${
          classroomMode ? 'classroom-hide' : ''
        }`}
      >
        <div className="sb-container flex h-16 items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="flex items-center justify-center h-10 w-10 rounded-xl border border-line bg-panel text-muted hover:text-ink hover:bg-surface transition-all text-sm font-bold"
              title="Return to KPRIET Home"
            >
              ←
            </Link>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-extrabold text-cyan-600 dark:text-cyan-400 bg-cyan-500/10 px-2.5 py-0.5 rounded border border-cyan-500/20">
                U25CY103
              </span>
              <span className="text-xs md:text-sm font-semibold text-muted hidden sm:inline">
                Regulations 2025 • Semester I • B.Tech Chemical / Core
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              type="button"
              onClick={() => setClassroomMode(!classroomMode)}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs md:text-sm font-bold transition-all cursor-pointer min-h-[44px] ${
                classroomMode
                  ? 'bg-amber-500 text-slate-950 font-extrabold shadow-lg'
                  : 'border border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20'
              }`}
              title="Toggle 4K Smartboard Classroom Presentation Mode"
            >
              <span>🎓</span>
              <span>{classroomMode ? 'Exit Classroom' : 'Classroom Mode'}</span>
            </button>
            <a
              href="/smartboard/chem-simulation.html"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-2 text-xs md:text-sm font-bold text-white shadow-sm hover:from-emerald-500 hover:to-teal-500 transition-all min-h-[44px]"
            >
              <span>🖥</span> Open Smart Board Lab
            </a>
            <Link
              to="/student/dashboard"
              className="rounded-xl border border-line bg-panel px-3.5 py-2 text-xs md:text-sm font-bold text-ink hover:bg-surface transition-colors min-h-[44px] flex items-center justify-center"
            >
              Student Portal
            </Link>
          </div>
        </div>
      </header>

      {/* ═════════════════════════════════════════════════════════════════ */}
      {/* 2. HERO SECTION & MOTTO                                           */}
      {/* ═════════════════════════════════════════════════════════════════ */}
      <section
        className={`relative overflow-hidden border-b border-line bg-gradient-to-b from-surface via-surface/80 to-background py-10 lg:py-14 ${
          classroomMode ? 'classroom-hide' : ''
        }`}
      >
        <div className="sb-container space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-4 py-1 text-xs md:text-sm font-bold text-cyan-700 dark:text-cyan-300">
            <span>⚗️</span>
            <span>KPRIET Interactive Science & Engineering Architecture</span>
          </div>

          <div className="space-y-2">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-ink">
              ENGINEERING CHEMISTRY
            </h1>
            <p className="text-lg sm:text-xl font-bold text-emerald-600 dark:text-emerald-400">
              "Don't just read Chemistry. Explore it."
            </p>
            <p className="text-sm sm:text-base text-muted max-w-4xl leading-relaxed pt-1">
              Transitioning conventional engineering chemistry from passive notes into an active,
              manipulation-based scientific studio: 3D molecular structures, curved-arrow reaction mechanisms,
              potentiometric titrations, spectrophotometry, and virtual laboratory experimentation.
            </p>
          </div>

          {/* Key Metric Badges */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 pt-2 max-w-5xl">
            <div className="rounded-xl border border-line bg-panel p-4 shadow-xs">
              <span className="text-xs md:text-sm text-muted block font-semibold">Syllabus Structure</span>
              <span className="text-xl sm:text-2xl font-black text-ink mt-0.5 block">5 Units + Lab</span>
              <span className="text-xs text-muted">75 Total Academic Hours</span>
            </div>
            <div className="rounded-xl border border-line bg-panel p-4 shadow-xs">
              <span className="text-xs md:text-sm text-muted block font-semibold">Interactive Sims</span>
              <span className="text-xl sm:text-2xl font-black text-cyan-500 mt-0.5 block">30 Models</span>
              <span className="text-xs text-muted">Canvas & 3D WebGL Engines</span>
            </div>
            <div className="rounded-xl border border-line bg-panel p-4 shadow-xs">
              <span className="text-xs md:text-sm text-muted block font-semibold">Virtual Experiments</span>
              <span className="text-xl sm:text-2xl font-black text-emerald-500 mt-0.5 block">8 Experiments</span>
              <span className="text-xs text-muted">With Live Viva & Observations</span>
            </div>
            <div className="rounded-xl border border-line bg-panel p-4 shadow-xs">
              <span className="text-xs md:text-sm text-muted block font-semibold">Gamified Challenges</span>
              <span className="text-xl sm:text-2xl font-black text-amber-500 mt-0.5 block">8 Missions</span>
              <span className="text-xs text-muted">Concept Mastery Badges</span>
            </div>
          </div>
        </div>
      </section>

      {/* ═════════════════════════════════════════════════════════════════ */}
      {/* 3. NAVIGATION TAB BAR                                             */}
      {/* ═════════════════════════════════════════════════════════════════ */}
      <div
        className={`sticky ${
          classroomMode ? 'top-0' : 'top-16'
        } z-30 border-b border-line bg-surface/95 backdrop-blur-md transition-all`}
      >
        <div className="sb-container">
          <div className="flex space-x-2 overflow-x-auto py-3 no-scrollbar text-xs md:text-sm font-bold">
            {[
              { id: 'overview' as const, label: 'Course Overview', icon: '📖' },
              { id: 'molecules' as const, label: '3D Molecular Studio', icon: '⚛️' },
              { id: 'conformation' as const, label: 'Newman & Hybridization', icon: '🔄' },
              { id: 'mechanisms' as const, label: 'Reaction Mechanisms', icon: '⚡' },
              { id: 'virtuallab' as const, label: 'Virtual Chemistry Lab', icon: '🥽' },
              { id: 'spectroscopy' as const, label: 'Spectroscopy & Chromatography', icon: '🌈' },
              { id: 'electrochem' as const, label: 'Electrochemistry & Kinetics', icon: '🔋' },
              { id: 'polymers' as const, label: 'Polymer Studio', icon: '🔗' },
              { id: 'missions' as const, label: 'Missions & Mastery', icon: '🎯' },
              { id: 'viva' as const, label: 'Viva Voce Mode', icon: '🗣️' },
              { id: 'materials' as const, label: 'Notes & Resources', icon: '📚' },
            ].map((tab) => {
              const active = currentTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setTab(tab.id)}
                  className={`flex items-center gap-2.5 whitespace-nowrap rounded-2xl px-5 py-3 min-h-[52px] transition-all cursor-pointer text-sm md:text-base ${
                    active
                      ? 'bg-primary text-white shadow-md font-bold'
                      : 'text-muted hover:text-ink hover:bg-surface-elevated'
                  }`}
                >
                  <span className="text-lg shrink-0">{tab.icon}</span>
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ═════════════════════════════════════════════════════════════════ */}
      {/* 4. MAIN CONTENT AREA                                              */}
      {/* ═════════════════════════════════════════════════════════════════ */}
      <main className="sb-container pt-8">
        {/* ─── TAB 1: OVERVIEW & UNITS ─── */}
        {currentTab === 'overview' && (
          <div className="space-y-8">
            <div>
              <h2 className="text-xl font-bold text-ink">Engineering Chemistry Curriculum Architecture</h2>
              <p className="text-xs text-muted mt-1">
                Course Code: <strong className="text-ink">U25CY103</strong> • 3 Credits • CBCS Pattern
              </p>
            </div>

            {/* Units Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {CHEMISTRY_UNITS.map((unit) => (
                <div
                  key={unit.number}
                  className="rounded-2xl border border-line bg-panel p-5 flex flex-col justify-between hover:border-primary/50 transition-all shadow-xs"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-white bg-slate-900 dark:bg-slate-800 px-2.5 py-1 rounded-lg">
                        {unit.roman}
                      </span>
                      <span className="text-xs font-mono font-semibold text-muted">
                        {unit.hours} Hours
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-ink leading-snug">{unit.title}</h3>
                    <p className="text-xs text-muted leading-relaxed line-clamp-3">
                      {unit.description}
                    </p>

                    <div className="pt-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted block mb-1.5">
                        Core Syllabus Highlights:
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {unit.topics.slice(0, 4).map((t, idx) => (
                          <span
                            key={idx}
                            className="rounded-md border border-line bg-surface/50 px-2 py-0.5 text-[10px] text-ink/80"
                          >
                            {t.split(':')[0]}
                          </span>
                        ))}
                        {unit.topics.length > 4 && (
                          <span className="text-[10px] text-muted self-center">
                            +{unit.topics.length - 4} more
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 mt-4 border-t border-line/60 flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-muted">
                      {unit.simulations.length} Simulations
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        if (unit.number === 1) setTab('molecules');
                        else if (unit.number === 2) setTab('mechanisms');
                        else if (unit.number === 3) setTab('polymers');
                        else if (unit.number === 4) setTab('electrochem');
                        else if (unit.number === 5) setTab('spectroscopy');
                        else setTab('virtuallab');
                      }}
                      className="text-xs font-bold text-primary hover:underline cursor-pointer flex items-center gap-1"
                    >
                      Explore Unit →
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Quick Access Action Banners */}
            <div className="rounded-2xl border border-line bg-gradient-to-r from-emerald-600/10 via-teal-600/10 to-transparent p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-ink">Launch Smart Board Chemistry Lab</h3>
                <p className="text-xs text-muted mt-0.5">
                  Complete interactive simulation engine with step-by-step telemetry, formulas, and Eduverse AI.
                </p>
              </div>
              <a
                href="/smartboard/chem-simulation.html"
                target="_blank"
                rel="noreferrer"
                className="rounded-xl bg-primary px-5 py-2.5 text-xs font-bold text-white shadow hover:bg-primary-hover transition text-center"
              >
                Launch Smart Board →
              </a>
            </div>
          </div>
        )}

        {/* ─── TAB 2: 3D MOLECULAR STUDIO ─── */}
        {currentTab === 'molecules' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-ink">3D Molecular Visualization Studio</h2>
              <p className="text-xs text-muted mt-1">
                Explore real-time spatial geometries, hybridization, bond angles, and electron clouds.
              </p>
            </div>

            {/* Molecule Horizontal Carousel / Selector */}
            <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
              {MOLECULES_3D_CATALOG.map((m) => {
                const isSelected = m.id === selectedMoleculeId;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setSelectedMoleculeId(m.id)}
                    className={`flex items-center gap-2.5 whitespace-nowrap rounded-xl border px-3.5 py-2 text-xs font-bold transition cursor-pointer ${
                      isSelected
                        ? 'border-cyan-500 bg-cyan-500/15 text-cyan-400 shadow-sm'
                        : 'border-line bg-panel text-muted hover:text-ink hover:bg-surface'
                    }`}
                  >
                    <span>{m.name}</span>
                    <span className="font-mono text-[10px] text-muted">{m.formula}</span>
                  </button>
                );
              })}
            </div>

            {/* Main Interactive 3D Viewer */}
            <Molecule3DViewer molecule={activeMolecule} height={460} showDetails={true} />

            {/* Educational Formula & Bond Reference Strip */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="rounded-xl border border-line bg-panel p-4 space-y-1">
                <span className="text-xs text-muted font-semibold uppercase">Hybridization</span>
                <p className="text-base font-bold text-ink">{activeMolecule.hybridization}</p>
                <p className="text-xs text-muted">Mixed quantum atomic orbital configuration</p>
              </div>
              <div className="rounded-xl border border-line bg-panel p-4 space-y-1">
                <span className="text-xs text-muted font-semibold uppercase">Geometry</span>
                <p className="text-base font-bold text-ink">{activeMolecule.geometry}</p>
                <p className="text-xs text-muted">VSEPR spatial domain orientation</p>
              </div>
              <div className="rounded-xl border border-line bg-panel p-4 space-y-1">
                <span className="text-xs text-muted font-semibold uppercase">Bond Angle</span>
                <p className="text-base font-bold text-amber-500">{activeMolecule.bondAngle}</p>
                <p className="text-xs text-muted">Measured equilibrium inter-bond angle</p>
              </div>
            </div>
          </div>
        )}

        {/* ─── TAB 3: CONFORMATION & HYBRIDIZATION ─── */}
        {currentTab === 'conformation' && <NewmanHybridizationStudio />}

        {/* ─── TAB 4: REACTION MECHANISM STUDIO ─── */}
        {currentTab === 'mechanisms' && <ReactionMechanismStudio onLaunchSim={handleLaunchSim} />}

        {/* ─── TAB 5: VIRTUAL CHEMISTRY LABORATORY ─── */}
        {currentTab === 'virtuallab' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-line pb-3 flex-wrap gap-2">
              <div>
                <h2 className="text-xl font-bold text-ink">Virtual Chemistry Laboratory</h2>
                <p className="text-xs text-muted mt-0.5">
                  Interactive experimental apparatus, real-time measurements, titration curves, and viva checks.
                </p>
              </div>
              <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-lg border border-emerald-500/20">
                8 Syllabus Experiments
              </span>
            </div>

            {/* Experiment Selector Chips */}
            <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
              {VIRTUAL_LAB_EXPERIMENTS.map((lab) => {
                const isSelected = lab.id === selectedLabId;
                return (
                  <button
                    key={lab.id}
                    type="button"
                    onClick={() => setSelectedLabId(lab.id)}
                    className={`flex items-center gap-2 whitespace-nowrap rounded-xl border px-3.5 py-2 text-xs font-bold transition cursor-pointer ${
                      isSelected
                        ? 'border-emerald-500 bg-emerald-500/15 text-emerald-400 shadow-sm'
                        : 'border-line bg-panel text-muted hover:text-ink'
                    }`}
                  >
                    <span>Lab {lab.labNumber}:</span>
                    <span>{lab.title.split('—')[0]?.replace('Virtual Lab', '').trim()}</span>
                  </button>
                );
              })}
            </div>

            {/* Active Experiment Detail Sheet */}
            <div className="rounded-2xl border border-line bg-panel p-6 shadow-sm space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 border-b border-line pb-4">
                <div>
                  <span className="font-mono text-xs font-bold text-emerald-500 uppercase">
                    EXPERIMENT #{activeLab.labNumber}
                  </span>
                  <h3 className="text-xl font-extrabold text-ink mt-1">{activeLab.title}</h3>
                  <p className="text-xs text-muted mt-1 leading-relaxed">
                    <strong>Aim:</strong> {activeLab.aim}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => handleLaunchSim(activeLab.simKey)}
                  className="rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-5 py-2.5 text-xs font-bold text-white shadow hover:from-emerald-500 hover:to-teal-500 transition cursor-pointer shrink-0"
                >
                  🚀 Run Virtual Lab Simulator
                </button>
              </div>

              {/* Theory & Principle Equation */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
                <div className="md:col-span-8 space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted">
                    Scientific Theory & Mechanism:
                  </h4>
                  <p className="text-xs text-ink/90 leading-relaxed">{activeLab.theory}</p>
                </div>

                <div className="md:col-span-4 rounded-xl border border-line bg-surface/50 p-4 space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-primary block">
                    Governing Principle Equation:
                  </span>
                  <p className="font-mono text-sm font-bold text-ink bg-surface p-2 rounded border border-line">
                    {activeLab.principleEquation}
                  </p>
                </div>
              </div>

              {/* Apparatus, Chemicals, Safety */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 text-xs">
                <div className="rounded-xl border border-line bg-surface/30 p-4 space-y-2">
                  <strong className="text-ink font-bold block">🧪 Chemicals Required:</strong>
                  <ul className="list-disc list-inside space-y-1 text-muted">
                    {activeLab.chemicals.map((c, i) => (
                      <li key={i}>{c}</li>
                    ))}
                  </ul>
                </div>

                <div className="rounded-xl border border-line bg-surface/30 p-4 space-y-2">
                  <strong className="text-ink font-bold block">⚙️ Apparatus & Glassware:</strong>
                  <ul className="list-disc list-inside space-y-1 text-muted">
                    {activeLab.apparatus.map((a, i) => (
                      <li key={i}>{a}</li>
                    ))}
                  </ul>
                </div>

                <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-4 space-y-2">
                  <strong className="text-rose-600 dark:text-rose-400 font-bold block">
                    ⚠️ Safety & Precautions:
                  </strong>
                  <ul className="list-disc list-inside space-y-1 text-rose-700 dark:text-rose-300">
                    {activeLab.safety.map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Step-by-Step Laboratory Procedure */}
              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted">
                  Experimental Procedure:
                </h4>
                <div className="space-y-2">
                  {activeLab.procedureSteps.map((step, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-3 rounded-xl border border-line bg-surface/40 p-3 text-xs"
                    >
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/20 text-primary font-bold text-[10px]">
                        {idx + 1}
                      </span>
                      <p className="text-ink/90 leading-relaxed">{step}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Lab Viva Questions Preview */}
              <div className="pt-2 border-t border-line space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted">
                  Essential Lab Viva Voce Questions:
                </h4>
                <div className="space-y-2">
                  {activeLab.vivaQuestions.map((v, i) => (
                    <div key={i} className="rounded-xl border border-line bg-surface/40 p-3 text-xs space-y-1">
                      <p className="font-bold text-ink">Q: {v.q}</p>
                      <p className="text-emerald-600 dark:text-emerald-400 font-medium">A: {v.a}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── TAB 6: SPECTROSCOPY STUDIO ─── */}
        {currentTab === 'spectroscopy' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-ink">Spectroscopy & Chromatography Studio</h2>
              <p className="text-xs text-muted mt-0.5">
                UV-Visible Spectrophotometry, Infrared Group Vibrations, ¹H NMR Shifts, and HPLC/GC Separation.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* UV-Vis Spectrophotometer */}
              <div className="rounded-2xl border border-line bg-panel p-5 space-y-3 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xl">🌈</span>
                    <span className="text-xs font-mono text-cyan-400">UV-Vis (200–800 nm)</span>
                  </div>
                  <h3 className="text-base font-bold text-ink">Beer-Lambert Spectrophotometer</h3>
                  <p className="text-xs text-muted leading-relaxed">
                    Verify A = ε·b·c, scan absorption maxima λ_max for KMnO₄ (525 nm) and CuSO₄ (810 nm), construct calibration lines, and deduce unknown concentrations.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleLaunchSim('chem-beer-lambert-spec')}
                  className="rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white shadow hover:bg-primary-hover transition cursor-pointer"
                >
                  Launch UV-Vis Simulator →
                </button>
              </div>

              {/* IR & NMR Interpreter */}
              <div className="rounded-2xl border border-line bg-panel p-5 space-y-3 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xl">📉</span>
                    <span className="text-xs font-mono text-amber-400">IR & ¹H NMR</span>
                  </div>
                  <h3 className="text-base font-bold text-ink">IR & NMR Spectrum Interpreter</h3>
                  <p className="text-xs text-muted leading-relaxed">
                    Click characteristic IR vibrational bands (O-H 3300 cm⁻¹, C=O 1715 cm⁻¹, C-H 2950 cm⁻¹) and analyze ¹H NMR chemical shifts, splitting patterns (n+1 rule), and integration ratios.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleLaunchSim('chem-spectroscopy-interpreter')}
                  className="rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white shadow hover:bg-primary-hover transition cursor-pointer"
                >
                  Launch Spectrum Explorer →
                </button>
              </div>

              {/* Chromatography Simulator */}
              <div className="rounded-2xl border border-line bg-panel p-5 space-y-3 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xl">📊</span>
                    <span className="text-xs font-mono text-emerald-400">HPLC, GC, TLC</span>
                  </div>
                  <h3 className="text-base font-bold text-ink">Chromatographic Separation Simulator</h3>
                  <p className="text-xs text-muted leading-relaxed">
                    Simulate Thin Layer Chromatography (Rf calculation) and Column Retention Times (HPLC/GC) based on stationary phase polarity, partition coefficients, and solvent gradients.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleLaunchSim('chem-chromatography-tlc')}
                  className="rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white shadow hover:bg-primary-hover transition cursor-pointer"
                >
                  Launch Chromatography Lab →
                </button>
              </div>

              {/* Surface Chemistry & Adsorption */}
              <div className="rounded-2xl border border-line bg-panel p-5 space-y-3 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xl">🫧</span>
                    <span className="text-xs font-mono text-violet-400">Colloids & Isotherms</span>
                  </div>
                  <h3 className="text-base font-bold text-ink">Adsorption Isotherms & Micelle CMC</h3>
                  <p className="text-xs text-muted leading-relaxed">
                    Fit Langmuir monolayer and Freundlich empirical isotherms. Model surfactant self-assembly into spherical micelles at the Critical Micelle Concentration (CMC).
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleLaunchSim('chem-adsorption-isotherms')}
                  className="rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white shadow hover:bg-primary-hover transition cursor-pointer"
                >
                  Launch Adsorption Visualizer →
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ─── TAB 7: ELECTROCHEMISTRY & KINETICS ─── */}
        {currentTab === 'electrochem' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-ink">Electrochemistry, Thermodynamics & Kinetics</h2>
              <p className="text-xs text-muted mt-0.5">
                Galvanic Cells, Nernst Potentials, Clausius-Clapeyron Phase Equilibria, and Reaction Rate Orders.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Galvanic Cell Simulator */}
              <div className="rounded-2xl border border-line bg-panel p-5 space-y-3 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xl">🔋</span>
                    <span className="text-xs font-mono text-cyan-400">Nernst E° = 1.10 V</span>
                  </div>
                  <h3 className="text-base font-bold text-ink">Galvanic Cell & Nernst EMF Simulator</h3>
                  <p className="text-xs text-muted leading-relaxed">
                    Interactive Daniell cell: electron flow from Zn anode to Cu cathode, ion migration across the salt bridge, voltmeter potential, and Nernst equation adjustments for ion activities.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleLaunchSim('chem-galvanic-nernst-cell')}
                  className="rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white shadow hover:bg-primary-hover transition cursor-pointer"
                >
                  Launch 3D Galvanic Cell →
                </button>
              </div>

              {/* Chemical Kinetics Particle Simulator */}
              <div className="rounded-2xl border border-line bg-panel p-5 space-y-3 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xl">⏱️</span>
                    <span className="text-xs font-mono text-emerald-400">Order & Rate Laws</span>
                  </div>
                  <h3 className="text-base font-bold text-ink">Reaction Rate Laws & Collision Simulator</h3>
                  <p className="text-xs text-muted leading-relaxed">
                    Simulate molecular collisions, temperature-dependent Arrhenius activation energy (Ea), and plot integrated rate laws for zero, first, and second order reactions.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleLaunchSim('chem-reaction-kinetics')}
                  className="rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white shadow hover:bg-primary-hover transition cursor-pointer"
                >
                  Launch Kinetics Simulator →
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ─── TAB 8: POLYMER STUDIO ─── */}
        {currentTab === 'polymers' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-ink">Polymers & Coordination Chemistry Studio</h2>
              <p className="text-xs text-muted mt-0.5">
                Polymerization Kinetics, Glass Transitions, Injection Molding Machines, and Crystal Field Splitting.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Polymer Chain Growth & PDI */}
              <div className="rounded-2xl border border-line bg-panel p-5 space-y-3 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xl">🔗</span>
                    <span className="text-xs font-mono text-violet-400">PDI = Mw / Mn</span>
                  </div>
                  <h3 className="text-base font-bold text-ink">Polymer Chain Growth & Molecular Weight</h3>
                  <p className="text-xs text-muted leading-relaxed">
                    Simulate chain-growth (addition) vs step-growth (Carothers condensation) polymerization. Calculate live number-average Mn, weight-average Mw, and polydispersity index PDI.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleLaunchSim('chem-polymer-chain-growth')}
                  className="rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white shadow hover:bg-primary-hover transition cursor-pointer"
                >
                  Launch Polymer Studio →
                </button>
              </div>

              {/* Crystal Field Theory */}
              <div className="rounded-2xl border border-line bg-panel p-5 space-y-3 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xl">💎</span>
                    <span className="text-xs font-mono text-cyan-400">CFT: Δo & Δt</span>
                  </div>
                  <h3 className="text-base font-bold text-ink">Crystal Field Splitting, Colour & Magnetism</h3>
                  <p className="text-xs text-muted leading-relaxed">
                    Explore octahedral (t2g/eg) and tetrahedral d-orbital splitting, spectrochemical series ligand strength, high-spin vs low-spin configurations, and spin-only magnetic moments.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleLaunchSim('chem-crystal-field-theory')}
                  className="rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white shadow hover:bg-primary-hover transition cursor-pointer"
                >
                  Launch Coordination Studio →
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ─── TAB 9: MISSIONS & MASTERY ─── */}
        {currentTab === 'missions' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-ink">Engineering Chemistry Missions</h2>
              <p className="text-xs text-muted mt-0.5">
                Complete all 8 curriculum challenges to earn mastery badges and unlock distinction credentials.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {CHEMISTRY_MISSIONS.map((m) => (
                <div
                  key={m.id}
                  className="rounded-2xl border border-line bg-panel p-5 space-y-3 flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-primary bg-primary/10 px-2.5 py-0.5 rounded border border-primary/20">
                        MISSION {m.missionNumber < 10 ? `0${m.missionNumber}` : m.missionNumber}
                      </span>
                      <span className="text-xs text-muted font-semibold">{m.category}</span>
                    </div>

                    <h3 className="text-base font-bold text-ink">{m.title}</h3>
                    <p className="text-xs text-muted leading-relaxed">{m.task}</p>

                    <div className="pt-2 flex items-center justify-between text-xs">
                      <span className="text-emerald-500 font-semibold">{m.rewardBadge}</span>
                      <span className="font-mono text-muted">{m.targetMetric}</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleLaunchSim(m.simKey)}
                    className="w-full rounded-xl bg-surface border border-line py-2 text-xs font-bold text-ink hover:bg-surface-elevated transition cursor-pointer text-center"
                  >
                    Start Mission →
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ─── TAB 10: VIVA VOCE MODE ─── */}
        {currentTab === 'viva' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-ink">Oral Examination & Viva Voce Simulator</h2>
              <p className="text-xs text-muted mt-0.5">
                Faculty-curated oral questions covering fundamental concepts, lab observations, and physical principles.
              </p>
            </div>

            <div className="space-y-3">
              {VIVA_VOCE_BANK.map((item) => {
                const isRevealed = revealedVivaAnswers[item.id];
                return (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-line bg-panel p-5 space-y-3 transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="rounded-md bg-slate-900 text-white font-mono text-[10px] font-bold px-2 py-0.5">
                          UNIT {item.unit}
                        </span>
                        <span className="text-xs font-semibold text-muted">{item.concept}</span>
                      </div>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          item.difficulty === 'Core'
                            ? 'bg-emerald-500/10 text-emerald-500'
                            : item.difficulty === 'Viva Standard'
                            ? 'bg-cyan-500/10 text-cyan-500'
                            : 'bg-amber-500/10 text-amber-500'
                        }`}
                      >
                        {item.difficulty}
                      </span>
                    </div>

                    <h4 className="text-sm font-bold text-ink">{item.question}</h4>

                    {isRevealed && (
                      <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-xs space-y-1">
                        <strong className="text-emerald-600 dark:text-emerald-400 font-bold block">
                          Model Viva Response:
                        </strong>
                        <p className="text-ink leading-relaxed">{item.answer}</p>
                      </div>
                    )}

                    <div className="flex justify-end pt-1">
                      <button
                        type="button"
                        onClick={() => toggleViva(item.id)}
                        className="rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-muted hover:text-ink hover:bg-surface transition cursor-pointer"
                      >
                        {isRevealed ? 'Hide Model Answer' : 'Reveal Model Answer →'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ─── TAB 11: NOTES & STUDY MATERIALS ─── */}
        {currentTab === 'materials' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-ink">Lecture Handouts & Study Materials</h2>
              <p className="text-xs text-muted mt-0.5">
                Official course syllabus, reference textbooks, and formula sheets for U25CY103.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-2xl border border-line bg-panel p-5 space-y-3">
                <span className="text-2xl">📚</span>
                <h3 className="text-base font-bold text-ink">Prescribed Textbooks (Regulations 2025)</h3>
                <ul className="text-xs text-muted space-y-2 list-disc list-inside">
                  <li>P. C. Jain & Monika Jain, <em>Engineering Chemistry</em>, Dhanpat Rai Publishing Co.</li>
                  <li>S. S. Dara & S. S. Umare, <em>A Textbook of Engineering Chemistry</em>, S. Chand & Company.</li>
                  <li>Peter Atkins & Julio de Paula, <em>Physical Chemistry</em>, Oxford University Press.</li>
                  <li>Paula Yurkanis Bruice, <em>Organic Chemistry</em>, Pearson Education.</li>
                </ul>
              </div>

              <div className="rounded-2xl border border-line bg-panel p-5 space-y-3">
                <span className="text-2xl">📝</span>
                <h3 className="text-base font-bold text-ink">Curriculum Lecture Modules</h3>
                <div className="space-y-2 text-xs">
                  {CHEMISTRY_UNITS.slice(0, 5).map((u) => (
                    <div key={u.number} className="flex justify-between items-center py-1 border-b border-line/60">
                      <span className="font-semibold text-ink">{u.roman}: {u.title}</span>
                      <span className="text-primary font-bold cursor-pointer hover:underline">Download PDF</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ═════════════════════════════════════════════════════════════════ */}
      {/* 5. EMBEDDED SIMULATION PREVIEW MODAL                              */}
      {/* ═════════════════════════════════════════════════════════════════ */}
      {previewSim && (
        <SimulationModal
          isOpen={Boolean(previewSim)}
          definition={previewSim}
          onClose={() => setPreviewSim(null)}
          iframeUrl={`/smartboard/chem-simulation.html?sim=${previewSim.id}&title=${encodeURIComponent(previewSim.title)}`}
          onLaunchSmartBoard={(key, title) => {
            window.open(`/smartboard/chem-simulation.html?sim=${key}&title=${encodeURIComponent(title)}`, '_blank');
          }}
        />
      )}

      {/* ═════════════════════════════════════════════════════════════════ */}
      {/* 6. PERSISTENT CLASSROOM SMARTBOARD TOOLBAR                        */}
      {/* ═════════════════════════════════════════════════════════════════ */}
      {classroomMode && (
        <div className="classroom-floating-bar fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 rounded-2xl border border-line/80 bg-slate-900/95 backdrop-blur-xl px-5 py-3 shadow-2xl text-white">
          <div className="flex items-center gap-2 border-r border-slate-700/80 pr-3">
            <span className="text-xl">🎓</span>
            <div className="hidden sm:block">
              <span className="text-xs font-bold text-amber-400 block leading-tight">CLASSROOM MODE</span>
              <span className="text-[10px] text-slate-400 font-mono">4K Smartboard Active</span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setTab('overview')}
            className={`flex items-center gap-2 rounded-xl px-3.5 py-2.5 min-h-[46px] text-xs md:text-sm font-bold transition cursor-pointer ${
              currentTab === 'overview' ? 'bg-primary text-white shadow' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
            }`}
          >
            <span>📖</span> <span className="hidden md:inline">Course</span> Units
          </button>
          <button
            type="button"
            onClick={() => setTab('molecules')}
            className={`flex items-center gap-2 rounded-xl px-3.5 py-2.5 min-h-[46px] text-xs md:text-sm font-bold transition cursor-pointer ${
              currentTab === 'molecules' ? 'bg-primary text-white shadow' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
            }`}
          >
            <span>⚛️</span> 3D Studio
          </button>
          <button
            type="button"
            onClick={() => setTab('virtuallab')}
            className={`flex items-center gap-2 rounded-xl px-3.5 py-2.5 min-h-[46px] text-xs md:text-sm font-bold transition cursor-pointer ${
              currentTab === 'virtuallab' ? 'bg-primary text-white shadow' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
            }`}
          >
            <span>🥽</span> Lab
          </button>
          <div className="h-6 w-px bg-slate-700 mx-1 hidden sm:block" />
          <button
            type="button"
            onClick={handleToggleFullscreen}
            className="flex items-center gap-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 px-4 py-2.5 min-h-[46px] text-xs md:text-sm font-bold text-white transition cursor-pointer"
            title="Toggle Browser Fullscreen"
          >
            <span>⛶</span> Fullscreen
          </button>
          <button
            type="button"
            onClick={() => setClassroomMode(false)}
            className="flex items-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 px-4 py-2.5 min-h-[46px] text-xs md:text-sm font-extrabold transition cursor-pointer"
            title="Exit Classroom Presentation Mode"
          >
            <span>✕</span> Exit
          </button>
        </div>
      )}
    </div>
  );
}
