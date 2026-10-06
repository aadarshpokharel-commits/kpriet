import React, { useState } from 'react';

export const ReactionMechanismStudio: React.FC<{ onLaunchSim?: (simKey: string) => void }> = ({ onLaunchSim }) => {
  // SN1 vs SN2 Simulator Controls
  const [substrate, setSubstrate] = useState<'primary' | 'secondary' | 'tertiary'>('tertiary');
  const [nucleophile, setNucleophile] = useState<'strong' | 'weak'>('weak');
  const [solvent, setSolvent] = useState<'protic' | 'aprotic'>('protic');
  const [leavingGroup, setLeavingGroup] = useState<'good' | 'moderate'>('good');

  // Active mechanism inspection tab
  const [selectedMechanism, setSelectedMechanism] = useState<'sn1-sn2' | 'sear' | 'azo'>('sn1-sn2');

  // Compute Predicted Mechanism Outcome
  const predictPathway = () => {
    if (substrate === 'tertiary') {
      return {
        pathway: 'SN1 (Unimolecular Nucleophilic Substitution)',
        rateLaw: 'Rate = k [R-X]',
        rateOrder: 'First Order (Unimolecular)',
        intermediate: 'Planar Carbocation Intermediate (sp² hybridized, 120°)',
        stereochemistry: 'Racemization (Both front and backside attack possible)',
        energyProfile: 'Double-Hump Energy Curve (Two transition states via carbocation valley)',
        why: 'Tertiary carbocation is strongly stabilized by hyperconjugation and inductive effect (+I from 3 methyls), while severe steric hindrance completely blocks backside SN2 attack.',
        stepCount: 2,
        color: '#0284c7',
      };
    }
    if (substrate === 'primary') {
      return {
        pathway: 'SN2 (Bimolecular Nucleophilic Substitution)',
        rateLaw: 'Rate = k [R-X] [Nu⁻]',
        rateOrder: 'Second Order (Bimolecular)',
        intermediate: 'No Intermediate! Single pentacoordinate transition state [Nu···C···X]‡',
        stereochemistry: '100% Inversion of Configuration (Walden Inversion)',
        energyProfile: 'Single-Barrier Energy Profile (Concerted backside displacement)',
        why: 'Primary carbon has minimal steric hindrance, allowing unhindered backside attack of the incoming nucleophile. Primary carbocations are too unstable to form via SN1.',
        stepCount: 1,
        color: '#059669',
      };
    }
    // Secondary substrate
    if (nucleophile === 'strong' && solvent === 'aprotic') {
      return {
        pathway: 'SN2 Favoured (Strong Nucleophile in Polar Aprotic Solvent)',
        rateLaw: 'Rate = k [R-X] [Nu⁻]',
        rateOrder: 'Second Order',
        intermediate: 'Concerted Transition State',
        stereochemistry: 'Inversion of Configuration (Walden Inversion)',
        energyProfile: 'Single Energy Barrier',
        why: 'Polar aprotic solvents (e.g. acetone, DMSO) do not solvate anions, making the strong nucleophile highly naked and reactive, accelerating concerted SN2 attack.',
        stepCount: 1,
        color: '#059669',
      };
    }
    return {
      pathway: 'SN1 Favoured (Polar Protic Solvent)',
      rateLaw: 'Rate = k [R-X]',
      rateOrder: 'First Order',
      intermediate: 'Secondary Carbocation Intermediate',
      stereochemistry: 'Partial Racemization with slight net inversion',
      energyProfile: 'Two-Step Profile with Carbocation Intermediate',
      why: 'Polar protic solvent (water, alcohol) stabilizes both the leaving halide anion and carbocation via hydrogen bonding, lowering activation energy for C-X heterolysis.',
      stepCount: 2,
      color: '#0284c7',
    };
  };

  const outcome = predictPathway();

  return (
    <div className="space-y-6">
      {/* Studio Header */}
      <div className="flex items-center justify-between border-b border-line pb-4 flex-wrap gap-3">
        <div>
          <h3 className="text-lg font-bold text-ink flex items-center gap-2">
            <span>⚡</span> Reaction Mechanism Studio & Pathway Predictor
          </h3>
          <p className="text-xs text-muted">
            Inspect curved-arrow electron transitions, concerted vs stepwise profiles, and thermodynamic energy barriers.
          </p>
        </div>

        {/* Mechanism Topic Filter */}
        <div className="flex rounded-xl border border-line bg-surface p-1 text-xs md:text-sm font-bold flex-wrap gap-1">
          <button
            type="button"
            onClick={() => setSelectedMechanism('sn1-sn2')}
            className={`rounded-lg px-4 md:px-5 py-2.5 min-h-[48px] transition cursor-pointer flex items-center justify-center ${
              selectedMechanism === 'sn1-sn2' ? 'bg-primary text-white shadow-sm' : 'text-muted hover:text-ink'
            }`}
          >
            SN1 vs SN2 Simulator
          </button>
          <button
            type="button"
            onClick={() => setSelectedMechanism('sear')}
            className={`rounded-lg px-4 md:px-5 py-2.5 min-h-[48px] transition cursor-pointer flex items-center justify-center ${
              selectedMechanism === 'sear' ? 'bg-primary text-white shadow-sm' : 'text-muted hover:text-ink'
            }`}
          >
            SEAr Benzene Substitution
          </button>
          <button
            type="button"
            onClick={() => setSelectedMechanism('azo')}
            className={`rounded-lg px-4 md:px-5 py-2.5 min-h-[48px] transition cursor-pointer flex items-center justify-center ${
              selectedMechanism === 'azo' ? 'bg-primary text-white shadow-sm' : 'text-muted hover:text-ink'
            }`}
          >
            Diazotization & Azo Coupling
          </button>
        </div>
      </div>

      {/* ─── SCENARIO 1: SN1 vs SN2 INTERACTIVE SIMULATOR ─── */}
      {selectedMechanism === 'sn1-sn2' && (
        <div className="space-y-6">
          {/* Reaction Condition Controls Panel */}
          <div className="rounded-2xl border border-line bg-surface/50 p-5 md:p-6 space-y-4">
            <span className="text-xs md:text-sm font-bold uppercase tracking-wider text-primary block">
              Configure Reaction Environment Parameters:
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs md:text-sm">
              {/* Substrate Type */}
              <div className="space-y-2">
                <label className="font-bold text-ink block">Substrate Structure:</label>
                <div className="flex rounded-xl border border-line bg-surface p-1 gap-1">
                  <button
                    type="button"
                    onClick={() => setSubstrate('primary')}
                    className={`flex-1 py-3 px-1.5 rounded-lg font-bold text-center transition cursor-pointer min-h-[48px] flex items-center justify-center ${
                      substrate === 'primary' ? 'bg-primary text-white shadow' : 'text-muted hover:text-ink'
                    }`}
                  >
                    1° Primary
                  </button>
                  <button
                    type="button"
                    onClick={() => setSubstrate('secondary')}
                    className={`flex-1 py-3 px-1.5 rounded-lg font-bold text-center transition cursor-pointer min-h-[48px] flex items-center justify-center ${
                      substrate === 'secondary' ? 'bg-primary text-white shadow' : 'text-muted hover:text-ink'
                    }`}
                  >
                    2° Secondary
                  </button>
                  <button
                    type="button"
                    onClick={() => setSubstrate('tertiary')}
                    className={`flex-1 py-3 px-1.5 rounded-lg font-bold text-center transition cursor-pointer min-h-[48px] flex items-center justify-center ${
                      substrate === 'tertiary' ? 'bg-primary text-white shadow' : 'text-muted hover:text-ink'
                    }`}
                  >
                    3° Tertiary
                  </button>
                </div>
                <span className="text-[11px] text-muted block">
                  {substrate === 'tertiary' ? 'e.g. tert-butyl bromide' : substrate === 'primary' ? 'e.g. bromoethane' : 'e.g. 2-bromopropane'}
                </span>
              </div>

              {/* Nucleophile Strength */}
              <div className="space-y-2">
                <label className="font-bold text-ink block">Nucleophile Strength:</label>
                <div className="flex rounded-xl border border-line bg-surface p-1 gap-1">
                  <button
                    type="button"
                    onClick={() => setNucleophile('strong')}
                    className={`flex-1 py-3 px-2 rounded-lg font-bold text-center transition cursor-pointer min-h-[48px] flex items-center justify-center ${
                      nucleophile === 'strong' ? 'bg-primary text-white shadow' : 'text-muted hover:text-ink'
                    }`}
                  >
                    Strong (OH⁻, CN⁻)
                  </button>
                  <button
                    type="button"
                    onClick={() => setNucleophile('weak')}
                    className={`flex-1 py-3 px-2 rounded-lg font-bold text-center transition cursor-pointer min-h-[48px] flex items-center justify-center ${
                      nucleophile === 'weak' ? 'bg-primary text-white shadow' : 'text-muted hover:text-ink'
                    }`}
                  >
                    Weak (H₂O, EtOH)
                  </button>
                </div>
              </div>

              {/* Solvent Type */}
              <div className="space-y-2">
                <label className="font-bold text-ink block">Solvent Medium:</label>
                <div className="flex rounded-xl border border-line bg-surface p-1 gap-1">
                  <button
                    type="button"
                    onClick={() => setSolvent('protic')}
                    className={`flex-1 py-3 px-2 rounded-lg font-bold text-center transition cursor-pointer min-h-[48px] flex items-center justify-center ${
                      solvent === 'protic' ? 'bg-primary text-white shadow' : 'text-muted hover:text-ink'
                    }`}
                  >
                    Polar Protic (H₂O)
                  </button>
                  <button
                    type="button"
                    onClick={() => setSolvent('aprotic')}
                    className={`flex-1 py-3 px-2 rounded-lg font-bold text-center transition cursor-pointer min-h-[48px] flex items-center justify-center ${
                      solvent === 'aprotic' ? 'bg-primary text-white shadow' : 'text-muted hover:text-ink'
                    }`}
                  >
                    Polar Aprotic (Acetone)
                  </button>
                </div>
              </div>

              {/* Leaving Group */}
              <div className="space-y-2">
                <label className="font-bold text-ink block">Leaving Group Ability:</label>
                <div className="flex rounded-xl border border-line bg-surface p-1 gap-1">
                  <button
                    type="button"
                    onClick={() => setLeavingGroup('good')}
                    className={`flex-1 py-3 px-2 rounded-lg font-bold text-center transition cursor-pointer min-h-[48px] flex items-center justify-center ${
                      leavingGroup === 'good' ? 'bg-primary text-white shadow' : 'text-muted hover:text-ink'
                    }`}
                  >
                    Good (I⁻, Br⁻)
                  </button>
                  <button
                    type="button"
                    onClick={() => setLeavingGroup('moderate')}
                    className={`flex-1 py-3 px-2 rounded-lg font-bold text-center transition cursor-pointer min-h-[48px] flex items-center justify-center ${
                      leavingGroup === 'moderate' ? 'bg-primary text-white shadow' : 'text-muted hover:text-ink'
                    }`}
                  >
                    Moderate (Cl⁻)
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Predicted Reaction Pathway Result Card */}
          <div className="rounded-2xl border border-line bg-panel p-6 shadow-md space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-line pb-4">
              <div>
                <span className="text-xs md:text-sm font-bold uppercase tracking-wider text-muted">Predicted Reaction Pathway</span>
                <h4 className="text-xl md:text-2xl font-extrabold text-ink mt-0.5">{outcome.pathway}</h4>
              </div>
              <span className="rounded-full bg-emerald-500/15 px-3.5 py-1.5 text-xs md:text-sm font-bold text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                {outcome.rateOrder}
              </span>
            </div>

            {/* Pathway Comparison Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs md:text-sm">
              <div className="rounded-xl border border-line bg-surface/40 p-5 space-y-2.5">
                <span className="font-bold text-muted uppercase text-xs tracking-wider">Kinetic Rate Law:</span>
                <p className="font-mono font-extrabold text-cyan-400 text-base md:text-lg bg-surface p-3 rounded-xl border border-line shadow-xs">
                  {outcome.rateLaw}
                </p>
                <span className="font-bold text-muted uppercase text-xs tracking-wider block pt-2">Intermediate State:</span>
                <p className="text-ink font-semibold text-sm md:text-base leading-relaxed">{outcome.intermediate}</p>
              </div>

              <div className="rounded-xl border border-line bg-surface/40 p-5 space-y-2.5">
                <span className="font-bold text-muted uppercase text-xs tracking-wider">Stereochemical Result:</span>
                <p className="text-ink font-bold text-base md:text-lg bg-surface p-3 rounded-xl border border-line text-cyan-600 dark:text-cyan-400 shadow-xs">
                  {outcome.stereochemistry}
                </p>
                <span className="font-bold text-muted uppercase text-xs tracking-wider block pt-2">Energy Profile:</span>
                <p className="text-ink font-semibold text-sm md:text-base leading-relaxed">{outcome.energyProfile}</p>
              </div>
            </div>

            {/* Why Panel */}
            <div className="rounded-xl border border-line/60 bg-surface/50 p-5 text-sm space-y-1.5">
              <strong className="text-ink font-bold text-sm md:text-base block">Scientific Explanation (Why this occurs):</strong>
              <p className="text-muted leading-relaxed text-xs md:text-sm">{outcome.why}</p>
            </div>

            {/* Direct Launch to Full Smart Board Simulator */}
            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => onLaunchSim && onLaunchSim('chem-sn1-sn2-mechanism')}
                className="inline-flex items-center gap-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-3 min-h-[52px] text-sm md:text-base font-bold text-white shadow-lg hover:from-emerald-500 hover:to-teal-500 transition-all cursor-pointer active:scale-98"
              >
                <span>🔬</span> Open Interactive SN1 vs SN2 Energy Simulator →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── SCENARIO 2: SEAr BENZENE SUBSTITUTION ─── */}
      {selectedMechanism === 'sear' && (
        <div className="rounded-2xl border border-line bg-panel p-6 space-y-5">
          <div className="flex items-center justify-between border-b border-line pb-4 flex-wrap gap-2">
            <div>
              <h4 className="text-lg md:text-xl font-bold text-ink">Electrophilic Aromatic Substitution (SEAr)</h4>
              <p className="text-xs md:text-sm text-muted mt-0.5">Generation of Electrophile → Arenium σ-Complex (Wheland Intermediate) → Proton Loss & Rearomatization</p>
            </div>
            <span className="text-xs md:text-sm font-mono text-cyan-400 bg-cyan-500/10 px-3 py-1.5 rounded-lg border border-cyan-500/20">
              ΔH_resonance = 152 kJ/mol
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-xl border border-line bg-surface/40 p-5 space-y-2">
              <span className="font-bold text-sm text-cyan-400">Step 1: Electrophile Attack</span>
              <p className="text-xs md:text-sm text-muted leading-relaxed">
                Benzene π-electrons attack the strong electrophile (NO₂⁺ in nitration, R⁺ in Friedel-Crafts), breaking ring aromaticity.
              </p>
            </div>
            <div className="rounded-xl border border-line bg-surface/40 p-5 space-y-2">
              <span className="font-bold text-sm text-amber-400">Step 2: Wheland Intermediate</span>
              <p className="text-xs md:text-sm text-muted leading-relaxed">
                Formation of the resonance-stabilized Arenium σ-complex where the positive charge is delocalized over ortho and para carbons.
              </p>
            </div>
            <div className="rounded-xl border border-line bg-surface/40 p-5 space-y-2">
              <span className="font-bold text-sm text-emerald-400">Step 3: Rearomatization</span>
              <p className="text-xs md:text-sm text-muted leading-relaxed">
                Base abstracts the sp³ hydrogen, restoring the aromatic 6 π-electron sextet and releasing 152 kJ/mol of resonance stabilization.
              </p>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={() => onLaunchSim && onLaunchSim('chem-elimination-substitution')}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 min-h-[52px] text-sm md:text-base font-bold text-white shadow-lg hover:bg-primary-hover transition cursor-pointer active:scale-98"
            >
              <span>⚗️</span> Launch SEAr & Elimination Stepper →
            </button>
          </div>
        </div>
      )}

      {/* ─── SCENARIO 3: DIAZOTIZATION & AZO COUPLING ─── */}
      {selectedMechanism === 'azo' && (
        <div className="rounded-2xl border border-line bg-panel p-6 space-y-5">
          <div className="flex items-center justify-between border-b border-line pb-4 flex-wrap gap-2">
            <div>
              <h4 className="text-lg md:text-xl font-bold text-ink">Diazotization of Aniline & Azo Dye Coupling</h4>
              <p className="text-xs md:text-sm text-muted mt-0.5">Formation of Benzenediazonium Chloride (0–5 °C) and Electrophilic Coupling with β-Naphthol</p>
            </div>
            <span className="text-xs md:text-sm font-mono text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20">
              Sudan I Dye Yield: ~88%
            </span>
          </div>

          <div className="rounded-xl border border-line/60 bg-surface/40 p-5 text-sm space-y-3">
            <div className="flex items-center justify-between font-mono text-xs text-muted">
              <span>REACTION SEQUENCE:</span>
              <span className="text-amber-400 font-bold">Strict 0–5 °C Thermal Limit</span>
            </div>
            <p className="text-ink font-semibold text-sm md:text-base">
              Aniline + NaNO₂ + HCl (0–5 °C) ➔ [C₆H₅-N⁺≡N Cl⁻] + 2 H₂O
            </p>
            <p className="text-ink font-semibold text-sm md:text-base">
              [C₆H₅-N⁺≡N] + β-Naphtholate (Alkaline) ➔ 1-Phenylazo-2-naphthol (Sudan I, Vivid Orange-Red)
            </p>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={() => onLaunchSim && onLaunchSim('chem-azo-dye-synthesis')}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 min-h-[52px] text-sm md:text-base font-bold text-white shadow-lg hover:bg-primary-hover transition cursor-pointer active:scale-98"
            >
              <span>🎨</span> Launch Azo Dye Flow Simulation →
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
