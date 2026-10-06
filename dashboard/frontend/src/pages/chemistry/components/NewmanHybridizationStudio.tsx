import { useState, useRef, useEffect } from 'react';

export const NewmanHybridizationStudio = () => {
  const [activeSubTab, setActiveSubTab] = useState<'newman' | 'hybridization'>('newman');

  // ════════════════════════════════════════════════════════════════════════
  // 1. NEWMAN PROJECTION & POTENTIAL ENERGY STATE
  // ════════════════════════════════════════════════════════════════════════
  const [dihedralAngle, setDihedralAngle] = useState(180); // Default Anti (180°)
  const newmanCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const energyCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Compute energy for butane as function of dihedral angle theta (degrees)
  // E(theta) = 9.5*(1 + cos(theta)) - 3.8*cos(2*theta) + ...
  const calculateButaneEnergy = (deg: number) => {
    const rad = (deg * Math.PI) / 180;
    // Approximated empirical Fourier potential curve for n-butane (kJ/mol)
    // 0° (fully eclipsed) = 19 kJ/mol; 60° (gauche) = 3.8 kJ/mol; 120° (eclipsed) = 16 kJ/mol; 180° (anti) = 0 kJ/mol
    const e =
      7.6 +
      8.0 * Math.cos(rad) +
      2.0 * Math.cos(2 * rad) +
      1.4 * Math.cos(3 * rad);
    return Math.max(0, e);
  };

  const getConformationName = (deg: number) => {
    const normalized = ((deg % 360) + 360) % 360;
    if (normalized >= 350 || normalized <= 10) return { name: 'Fully Eclipsed (Syn-periplanar)', tone: 'bad', desc: 'Highest potential energy (19 kJ/mol) with maximal steric and torsional strain.' };
    if (normalized >= 50 && normalized <= 70) return { name: 'Gauche Conformer (Synclinal)', tone: 'info', desc: 'Local potential minimum (3.8 kJ/mol). Stable, with mild steric crowding between methyl groups.' };
    if (normalized >= 110 && normalized <= 130) return { name: 'Eclipsed Conformer (Anticlinal)', tone: 'bad', desc: 'High energy transition state (16 kJ/mol) where C-H bonds eclipse methyl groups.' };
    if (normalized >= 170 && normalized <= 190) return { name: 'Anti Conformer (Anti-periplanar)', tone: 'good', desc: 'Global potential energy minimum (0 kJ/mol). Maximum distance between methyls (180°), zero steric strain.' };
    if (normalized >= 230 && normalized <= 250) return { name: 'Eclipsed Conformer (Anticlinal)', tone: 'bad', desc: 'High energy transition state (16 kJ/mol).' };
    if (normalized >= 290 && normalized <= 310) return { name: 'Gauche Conformer (Synclinal)', tone: 'info', desc: 'Local potential minimum (3.8 kJ/mol).' };
    return { name: `Intermediate Conformer (${normalized.toFixed(0)}°)`, tone: 'muted', desc: 'Rotational trajectory between stationary conformers.' };
  };

  // Draw 2D Synchronized Newman Projection Disc
  useEffect(() => {
    const canvas = newmanCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);

    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, w, h);

    const cx = w / 2;
    const cy = h / 2;
    const radius = Math.min(w, h) * 0.22;

    // Back Carbon (large outer circle)
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fillStyle = '#1e293b';
    ctx.fill();
    ctx.lineWidth = 3.5;
    ctx.strokeStyle = '#38bdf8';
    ctx.stroke();

    // Front Carbon (central point)
    ctx.beginPath();
    ctx.arc(cx, cy, 8, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();

    const radBack = ((dihedralAngle - 180) * Math.PI) / 180; // Back rotates relative to front

    // 1. Draw Back Carbon Ligands (terminate at outer circle boundary)
    const backAngle1 = -Math.PI / 2 + radBack;
    const backAngle2 = backAngle1 + (2 * Math.PI) / 3;
    const backAngle3 = backAngle1 - (2 * Math.PI) / 3;

    const drawBackBond = (angle: number, label: string, color: string) => {
      const x1 = cx + Math.cos(angle) * radius;
      const y1 = cy + Math.sin(angle) * radius;
      const x2 = cx + Math.cos(angle) * (radius + 54);
      const y2 = cy + Math.sin(angle) * (radius + 54);

      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 4.5;
      ctx.stroke();

      ctx.fillStyle = color;
      ctx.font = 'bold 15px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, cx + Math.cos(angle) * (radius + 74), cy + Math.sin(angle) * (radius + 74));
    };

    drawBackBond(backAngle1, 'CH₃ (Back)', '#f59e0b');
    drawBackBond(backAngle2, 'H', '#94a3b8');
    drawBackBond(backAngle3, 'H', '#94a3b8');

    // 2. Draw Front Carbon Ligands (radiate from central point cx, cy)
    const frontAngle1 = -Math.PI / 2; // Up
    const frontAngle2 = frontAngle1 + (2 * Math.PI) / 3;
    const frontAngle3 = frontAngle1 - (2 * Math.PI) / 3;

    const drawFrontBond = (angle: number, label: string, color: string) => {
      const x2 = cx + Math.cos(angle) * (radius + 44);
      const y2 = cy + Math.sin(angle) * (radius + 44);

      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(x2, y2);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 5;
      ctx.stroke();

      ctx.fillStyle = color;
      ctx.font = 'bold 15px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, cx + Math.cos(angle) * (radius + 64), cy + Math.sin(angle) * (radius + 64));
    };

    drawFrontBond(frontAngle1, 'CH₃ (Front)', '#38bdf8');
    drawFrontBond(frontAngle2, 'H', '#f8fafc');
    drawFrontBond(frontAngle3, 'H', '#f8fafc');

    // Arc representing dihedral angle θ
    ctx.beginPath();
    ctx.arc(cx, cy, radius * 0.5, frontAngle1, backAngle1, backAngle1 < frontAngle1);
    ctx.strokeStyle = 'rgba(245, 158, 11, 0.85)';
    ctx.lineWidth = 2.5;
    ctx.setLineDash([5, 4]);
    ctx.stroke();
    ctx.setLineDash([]);
  }, [dihedralAngle]);

  // Draw Dynamic Potential Energy Curve Graph
  useEffect(() => {
    const canvas = energyCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);

    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, w, h);

    const padLeft = 55;
    const padRight = 24;
    const padTop = 36;
    const padBottom = 44;
    const plotW = w - padLeft - padRight;
    const plotH = h - padTop - padBottom;

    // Grid lines
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    for (let e = 0; e <= 20; e += 5) {
      const y = padTop + plotH - (e / 20) * plotH;
      ctx.beginPath();
      ctx.moveTo(padLeft, y);
      ctx.lineTo(padLeft + plotW, y);
      ctx.stroke();

      ctx.fillStyle = '#94a3b8';
      ctx.font = 'bold 12px Inter, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(`${e}`, padLeft - 8, y + 4);
    }

    // X axis ticks (0, 60, 120, 180, 240, 300, 360)
    const ticks = [0, 60, 120, 180, 240, 300, 360];
    ticks.forEach((deg) => {
      const x = padLeft + (deg / 360) * plotW;
      ctx.beginPath();
      ctx.moveTo(x, padTop + plotH);
      ctx.lineTo(x, padTop + plotH + 6);
      ctx.strokeStyle = '#475569';
      ctx.stroke();

      ctx.fillStyle = '#cbd5e1';
      ctx.font = 'bold 13px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`${deg}°`, x, padTop + plotH + 20);
    });

    // Draw Potential Energy Curve
    ctx.beginPath();
    for (let deg = 0; deg <= 360; deg += 2) {
      const e = calculateButaneEnergy(deg);
      const x = padLeft + (deg / 360) * plotW;
      const y = padTop + plotH - (e / 20) * plotH;
      if (deg === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 3.5;
    ctx.stroke();

    // Area fill below curve
    ctx.lineTo(padLeft + plotW, padTop + plotH);
    ctx.lineTo(padLeft, padTop + plotH);
    ctx.closePath();
    ctx.fillStyle = 'rgba(56, 189, 248, 0.1)';
    ctx.fill();

    // Active Dihedral Angle Marker
    const curE = calculateButaneEnergy(dihedralAngle);
    const curX = padLeft + (dihedralAngle / 360) * plotW;
    const curY = padTop + plotH - (curE / 20) * plotH;

    // Vertical dashed marker line
    ctx.beginPath();
    ctx.setLineDash([5, 4]);
    ctx.moveTo(curX, padTop);
    ctx.lineTo(curX, padTop + plotH);
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.setLineDash([]);

    // Pulsing point on curve
    ctx.beginPath();
    ctx.arc(curX, curY, 8, 0, Math.PI * 2);
    ctx.fillStyle = '#f59e0b';
    ctx.shadowColor = '#f59e0b';
    ctx.shadowBlur = 12;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Energy value chip badge above marker
    const badgeText = `${curE.toFixed(1)} kJ/mol`;
    ctx.font = 'bold 13px Inter, sans-serif';
    const textW = ctx.measureText(badgeText).width;
    const badgeX = Math.max(padLeft + 10, Math.min(w - padRight - textW - 16, curX - (textW + 16) / 2));
    const badgeY = Math.max(padTop - 24, curY - 26);

    ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
    ctx.beginPath();
    ctx.roundRect(badgeX, badgeY, textW + 16, 22, 5);
    ctx.fill();
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(badgeText, badgeX + (textW + 16) / 2, badgeY + 11);

    // Axis Labels
    ctx.fillStyle = '#cbd5e1';
    ctx.font = 'bold 13px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText('Dihedral Angle θ (Degrees)', padLeft + plotW / 2, h - 8);

    ctx.save();
    ctx.translate(18, padTop + plotH / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('Potential Energy (kJ/mol)', 0, 0);
    ctx.restore();
  }, [dihedralAngle]);

  // ════════════════════════════════════════════════════════════════════════
  // 2. HYBRIDIZATION SIMULATOR STATE
  // ════════════════════════════════════════════════════════════════════════
  const [selectedHyb, setSelectedHyb] = useState<'sp' | 'sp2' | 'sp3'>('sp3');
  const hybCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const HYB_DATA = {
    sp: {
      name: 'sp Hybridization',
      geometry: 'Linear',
      angle: '180°',
      domains: 2,
      orbitalsMixed: 'One 2s + One 2p (2 unhybridized 2p orbitals)',
      examples: ['BeCl₂ (Beryllium Chloride)', 'C₂H₂ (Ethyne)', 'CO₂ (Carbon Dioxide)'],
      character: '50% s, 50% p',
      description: 'Mixing one s and one p orbital yields two collinear hybrid lobes pointing in opposite directions along the z-axis with an angle of 180°.',
    },
    sp2: {
      name: 'sp² Hybridization',
      geometry: 'Trigonal Planar',
      angle: '120°',
      domains: 3,
      orbitalsMixed: 'One 2s + Two 2p (1 unhybridized 2p orbital)',
      examples: ['BF₃ (Boron Trifluoride)', 'C₂H₄ (Ethene)', 'C₆H₆ (Benzene)'],
      character: '33.3% s, 66.7% p',
      description: 'Mixing one s and two p orbitals produces three coplanar hybrid lobes oriented towards the corners of an equilateral triangle separated by 120°.',
    },
    sp3: {
      name: 'sp³ Hybridization',
      geometry: 'Tetrahedral',
      angle: '109.5°',
      domains: 4,
      orbitalsMixed: 'One 2s + Three 2p (0 unhybridized orbitals)',
      examples: ['CH₄ (Methane)', 'CCl₄', 'NH₃ (Pyramidal, 107°)', 'H₂O (Bent, 104.5°)'],
      character: '25% s, 75% p',
      description: 'Mixing one s and three p orbitals forms four identical hybrid lobes pointing toward the vertices of a regular tetrahedron with 109.5° bond angles.',
    },
  };

  // Draw 3D Hybrid Orbitals
  useEffect(() => {
    if (activeSubTab !== 'hybridization') return;
    const canvas = hybCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);

    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, w, h);

    const cx = w / 2;
    const cy = h / 2;

    // Draw central nucleus
    ctx.beginPath();
    ctx.arc(cx, cy, 14, 0, Math.PI * 2);
    ctx.fillStyle = '#e2e8f0';
    ctx.fill();

    // Draw Hybrid Orbital Lobes
    const drawLobe = (angle: number, length: number, color: string, label: string) => {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(angle);

      // Large positive lobe
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.bezierCurveTo(length * 0.45, -28, length * 0.9, -16, length, 0);
      ctx.bezierCurveTo(length * 0.9, 16, length * 0.45, 28, 0, 0);
      ctx.fillStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = 12;
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Small negative back-lobe
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.bezierCurveTo(-length * 0.2, -12, -length * 0.35, -8, -length * 0.38, 0);
      ctx.bezierCurveTo(-length * 0.35, 8, -length * 0.2, 12, 0, 0);
      ctx.fillStyle = 'rgba(148, 163, 184, 0.4)';
      ctx.fill();

      // Label at lobe tip
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 12px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(label, length + 16, 4);

      ctx.restore();
    };

    if (selectedHyb === 'sp') {
      drawLobe(0, 110, '#38bdf8', 'sp (1)');
      drawLobe(Math.PI, 110, '#38bdf8', 'sp (2)');
      // Angle arc 180°
      ctx.beginPath();
      ctx.arc(cx, cy, 45, 0, Math.PI);
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 3]);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#f59e0b';
      ctx.font = 'bold 13px Inter, sans-serif';
      ctx.fillText('180°', cx, cy - 54);
    } else if (selectedHyb === 'sp2') {
      const a1 = -Math.PI / 2;
      const a2 = a1 + (2 * Math.PI) / 3;
      const a3 = a1 - (2 * Math.PI) / 3;
      drawLobe(a1, 105, '#22c55e', 'sp² (1)');
      drawLobe(a2, 105, '#22c55e', 'sp² (2)');
      drawLobe(a3, 105, '#22c55e', 'sp² (3)');

      // Angle arc 120°
      ctx.beginPath();
      ctx.arc(cx, cy, 40, a1, a2);
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 3]);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#f59e0b';
      ctx.font = 'bold 13px Inter, sans-serif';
      ctx.fillText('120°', cx + 32, cy - 20);
    } else if (selectedHyb === 'sp3') {
      // 4 lobes in tetrahedral arrangement
      drawLobe(-Math.PI / 2, 105, '#a855f7', 'sp³ (1)');
      drawLobe(Math.PI / 6, 95, '#a855f7', 'sp³ (2)');
      drawLobe((5 * Math.PI) / 6, 95, '#a855f7', 'sp³ (3)');
      drawLobe(Math.PI / 2 + 0.3, 75, 'rgba(168, 85, 247, 0.75)', 'sp³ (4 - back)');

      ctx.fillStyle = '#f59e0b';
      ctx.font = 'bold 13px Inter, sans-serif';
      ctx.fillText('109.5°', cx + 36, cy - 30);
    }
  }, [activeSubTab, selectedHyb]);

  return (
    <div className="space-y-6">
      {/* Studio Navigation Sub-Tabs */}
      <div className="flex items-center justify-between border-b border-line pb-4 flex-wrap gap-3">
        <div>
          <h3 className="text-lg font-bold text-ink flex items-center gap-2">
            <span>🔄</span> Conformational Analysis & Hybridization Simulator
          </h3>
          <p className="text-xs text-muted">
            Explore rotational energy landscapes (Newman projection) and quantum orbital mixing (sp, sp², sp³).
          </p>
        </div>

        <div className="flex rounded-xl border border-line bg-surface p-1 text-xs md:text-sm font-bold">
          <button
            type="button"
            onClick={() => setActiveSubTab('newman')}
            className={`rounded-lg px-4 md:px-5 py-2.5 min-h-[48px] transition cursor-pointer flex items-center justify-center ${
              activeSubTab === 'newman' ? 'bg-primary text-white shadow-sm' : 'text-muted hover:text-ink'
            }`}
          >
            Newman Projection Rotator
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('hybridization')}
            className={`rounded-lg px-4 md:px-5 py-2.5 min-h-[48px] transition cursor-pointer flex items-center justify-center ${
              activeSubTab === 'hybridization' ? 'bg-primary text-white shadow-sm' : 'text-muted hover:text-ink'
            }`}
          >
            Hybridization 3D Simulator
          </button>
        </div>
      </div>

      {/* ─── TAB 1: NEWMAN PROJECTION & POTENTIAL ENERGY ─── */}
      {activeSubTab === 'newman' && (
        <div className="space-y-6">
          {/* Active Conformation Status Banner */}
          {(() => {
            const conf = getConformationName(dihedralAngle);
            const energy = calculateButaneEnergy(dihedralAngle);
            return (
              <div className="rounded-2xl border border-line bg-gradient-to-r from-surface via-surface/90 to-surface/40 p-5 md:p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="font-mono text-sm md:text-base font-bold text-amber-400 bg-amber-500/10 px-3 py-1 rounded border border-amber-500/20">
                      θ = {dihedralAngle.toFixed(0)}°
                    </span>
                    <h4 className="text-base md:text-lg font-bold text-ink">{conf.name}</h4>
                  </div>
                  <p className="text-xs md:text-sm text-muted mt-1.5 leading-relaxed">{conf.desc}</p>
                </div>

                <div className="flex items-center gap-6 shrink-0 flex-wrap">
                  <div className="text-right">
                    <span className="text-xs font-semibold text-muted uppercase tracking-wider block">
                      Potential Energy
                    </span>
                    <span className="text-2xl md:text-3xl font-extrabold text-cyan-400 font-mono">
                      {energy.toFixed(2)}{' '}
                      <span className="text-sm font-normal text-muted">kJ/mol</span>
                    </span>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {[
                      { deg: 180, label: 'Anti (180°)' },
                      { deg: 60, label: 'Gauche (60°)' },
                      { deg: 120, label: 'Eclipsed (120°)' },
                      { deg: 0, label: 'Fully Eclipsed (0°)' },
                    ].map((preset) => (
                      <button
                        key={preset.deg}
                        type="button"
                        onClick={() => setDihedralAngle(preset.deg)}
                        className={`rounded-xl px-3.5 py-2.5 min-h-[46px] text-xs md:text-sm font-semibold transition cursor-pointer border flex items-center justify-center ${
                          Math.abs(dihedralAngle - preset.deg) < 3
                            ? 'bg-primary text-white border-primary shadow'
                            : 'bg-surface border-line text-muted hover:text-ink'
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Interactive Rotator Slider */}
          <div className="rounded-2xl border border-line bg-surface/50 p-5 space-y-3">
            <div className="flex items-center justify-between text-sm md:text-base font-bold text-ink">
              <span>Rotate C2–C3 Central Bond (Dihedral Angle θ):</span>
              <span className="font-mono text-amber-400 text-base md:text-lg font-extrabold">{dihedralAngle}°</span>
            </div>
            <div className="py-2">
              <input
                type="range"
                min="0"
                max="360"
                step="1"
                value={dihedralAngle}
                onChange={(e) => setDihedralAngle(Number(e.target.value))}
                className="w-full sb-slider cursor-pointer"
              />
            </div>
            <div className="flex justify-between text-xs md:text-sm font-mono text-muted flex-wrap gap-2">
              <span>0° (Fully Eclipsed)</span>
              <span>60° (Gauche)</span>
              <span>120° (Eclipsed)</span>
              <span>180° (Anti)</span>
              <span>240° (Eclipsed)</span>
              <span>300° (Gauche)</span>
              <span>360° (Fully Eclipsed)</span>
            </div>
          </div>

          {/* Dual Synchronized Canvas Viewports */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Left: 2D Newman Projection Disc */}
            <div className="lg:col-span-5 rounded-2xl border border-line bg-slate-950 p-4 md:p-5 flex flex-col">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3">
                <span className="text-xs md:text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <span>🎯</span> 2D Newman Projection
                </span>
                <span className="text-xs font-mono text-slate-400">Front C(●) & Back C(○)</span>
              </div>
              <div className="flex-1 min-h-[360px] flex items-center justify-center">
                <canvas ref={newmanCanvasRef} className="w-full h-[360px] lg:h-[400px] block" />
              </div>
              <div className="pt-3 border-t border-slate-800 text-xs md:text-sm text-slate-400 flex justify-between">
                <span>Front C: <strong className="text-cyan-400">Blue</strong></span>
                <span>Back C: <strong className="text-amber-400">Orange</strong></span>
                <span>Dihedral θ: <strong className="text-white font-bold">{dihedralAngle}°</strong></span>
              </div>
            </div>

            {/* Right: Dynamic Potential Energy Curve */}
            <div className="lg:col-span-7 rounded-2xl border border-line bg-slate-950 p-4 md:p-5 flex flex-col">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3">
                <span className="text-xs md:text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <span>📈</span> Potential Energy vs Dihedral Angle
                </span>
                <span className="text-xs font-mono text-emerald-400">Real-Time Trajectory</span>
              </div>
              <div className="flex-1 min-h-[360px]">
                <canvas ref={energyCanvasRef} className="w-full h-[360px] lg:h-[400px] block" />
              </div>
              <div className="pt-3 border-t border-slate-800 text-xs md:text-sm text-slate-400 flex justify-between flex-wrap gap-2">
                <span>Anti: 0 kJ/mol (Global Min)</span>
                <span>Gauche: 3.8 kJ/mol (Local Min)</span>
                <span>Eclipsed: 16–19 kJ/mol (Max)</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB 2: HYBRIDIZATION 3D SIMULATOR ─── */}
      {activeSubTab === 'hybridization' && (
        <div className="space-y-6">
          {/* Hybridization Type Selector */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            {(['sp', 'sp2', 'sp3'] as const).map((type) => {
              const d = HYB_DATA[type];
              const isSelected = selectedHyb === type;
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => setSelectedHyb(type)}
                  className={`rounded-2xl border p-5 text-left transition cursor-pointer min-h-[72px] ${
                    isSelected
                      ? 'border-primary bg-primary/10 shadow-md ring-2 ring-primary/30'
                      : 'border-line bg-panel hover:bg-surface'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-base font-extrabold text-primary">{d.name}</span>
                    <span className="rounded-full bg-surface px-3 py-1 text-xs font-bold text-ink border border-line">
                      {d.angle}
                    </span>
                  </div>
                  <h4 className="mt-1.5 text-base font-bold text-ink">{d.geometry}</h4>
                  <p className="text-xs md:text-sm text-muted mt-1">{d.domains} Electron Domains • {d.character}</p>
                </button>
              );
            })}
          </div>

          {/* 3D Hybrid Lobe Visualizer & Details Pane */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Left: 3D Canvas Stage */}
            <div className="lg:col-span-7 rounded-2xl border border-line bg-slate-950 p-4 md:p-5 flex flex-col">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3">
                <span className="text-xs md:text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <span>⚛️</span> {HYB_DATA[selectedHyb].name} Orbital Lobes
                </span>
                <span className="text-xs md:text-sm font-mono text-cyan-400">Bond Angle: {HYB_DATA[selectedHyb].angle}</span>
              </div>
              <div className="flex-1 min-h-[360px] flex items-center justify-center">
                <canvas ref={hybCanvasRef} className="w-full h-[360px] lg:h-[400px] block" />
              </div>
              <p className="text-xs md:text-sm text-slate-400 text-center pt-3 border-t border-slate-800">
                Major positive lobes form strong axial σ-bonds; back-lobes have reversed quantum phase.
              </p>
            </div>

            {/* Right: Scientific Analysis Panel */}
            <div className="lg:col-span-5 rounded-2xl border border-line bg-panel p-5 space-y-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-primary">Quantum Mixing Breakdown</span>
                <h4 className="text-base font-extrabold text-ink mt-0.5">{HYB_DATA[selectedHyb].geometry}</h4>
                <p className="text-xs text-muted mt-1 leading-relaxed">{HYB_DATA[selectedHyb].description}</p>
              </div>

              <div className="space-y-2 border-t border-line pt-3 text-xs">
                <div className="flex justify-between py-1 border-b border-line/60">
                  <span className="text-muted font-medium">Orbitals Mixed:</span>
                  <strong className="text-ink text-right">{HYB_DATA[selectedHyb].orbitalsMixed}</strong>
                </div>
                <div className="flex justify-between py-1 border-b border-line/60">
                  <span className="text-muted font-medium">s / p Character:</span>
                  <strong className="text-ink">{HYB_DATA[selectedHyb].character}</strong>
                </div>
                <div className="flex justify-between py-1 border-b border-line/60">
                  <span className="text-muted font-medium">Theoretical Bond Angle:</span>
                  <strong className="text-amber-500 font-bold">{HYB_DATA[selectedHyb].angle}</strong>
                </div>
              </div>

              <div className="pt-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted block mb-2">
                  Prototypical Curriculum Molecules:
                </span>
                <div className="space-y-1.5">
                  {HYB_DATA[selectedHyb].examples.map((ex, i) => (
                    <div
                      key={i}
                      className="rounded-lg border border-line bg-surface/50 px-3 py-2 text-xs font-semibold text-ink flex items-center gap-2"
                    >
                      <span className="text-emerald-500">✓</span> {ex}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
