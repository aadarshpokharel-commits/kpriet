import React, { useRef, useEffect, useState, useCallback } from 'react';
import type { IMolecule3D } from '../chemistryData';

interface Molecule3DViewerProps {
  molecule: IMolecule3D;
  height?: number | string;
  showDetails?: boolean;
}

export const Molecule3DViewer: React.FC<Molecule3DViewerProps> = ({
  molecule,
  height = 'clamp(480px, 58vh, 880px)',
  showDetails = true,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Representation style
  const [renderMode, setRenderMode] = useState<'ball-and-stick' | 'space-filling' | 'wireframe'>('ball-and-stick');
  const [showLabels, setShowLabels] = useState(true);
  const [showAngles, setShowAngles] = useState(true);
  const [autoRotate, setAutoRotate] = useState(true);
  const [isStageExpanded, setIsStageExpanded] = useState(false);

  // Spatial view matrix: yaw, pitch, zoom, pan
  const [view, setView] = useState({
    yaw: 0.45,
    pitch: 0.28,
    zoom: 1.1,
    panX: 0,
    panY: 0,
  });

  const isDraggingRef = useRef(false);
  const lastMousePosRef = useRef({ x: 0, y: 0 });
  const touchStartDistRef = useRef<number | null>(null);

  // Reset View Camera
  const handleResetCamera = () => {
    setView({ yaw: 0.45, pitch: 0.28, zoom: 1.1, panX: 0, panY: 0 });
  };

  // Zoom controls
  const handleZoom = (delta: number) => {
    setView((v) => ({ ...v, zoom: Math.max(0.4, Math.min(3.5, v.zoom + delta)) }));
  };

  // Mouse Handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    isDraggingRef.current = true;
    lastMousePosRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDraggingRef.current) return;
    const dx = e.clientX - lastMousePosRef.current.x;
    const dy = e.clientY - lastMousePosRef.current.y;
    lastMousePosRef.current = { x: e.clientX, y: e.clientY };

    if (e.buttons === 2 || e.shiftKey) {
      setView((v) => ({ ...v, panX: v.panX + dx, panY: v.panY + dy }));
    } else {
      setView((v) => ({
        ...v,
        yaw: v.yaw + dx * 0.008,
        pitch: Math.max(-1.45, Math.min(1.45, v.pitch + dy * 0.008)),
      }));
    }
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.12 : -0.12;
    handleZoom(delta);
  };

  // Touch Handlers for 75" - 86" Classroom Smartboards
  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length === 1) {
      isDraggingRef.current = true;
      const touch = e.touches[0];
      if (touch) {
        lastMousePosRef.current = { x: touch.clientX, y: touch.clientY };
      }
      touchStartDistRef.current = null;
    } else if (e.touches.length === 2) {
      isDraggingRef.current = false;
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      if (t1 && t2) {
        touchStartDistRef.current = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      }
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length === 1 && isDraggingRef.current) {
      const touch = e.touches[0];
      if (!touch) return;
      const dx = touch.clientX - lastMousePosRef.current.x;
      const dy = touch.clientY - lastMousePosRef.current.y;
      lastMousePosRef.current = { x: touch.clientX, y: touch.clientY };

      setView((v) => ({
        ...v,
        yaw: v.yaw + dx * 0.009,
        pitch: Math.max(-1.45, Math.min(1.45, v.pitch + dy * 0.009)),
      }));
    } else if (e.touches.length === 2 && touchStartDistRef.current !== null) {
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      if (t1 && t2) {
        const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
        const factor = dist / touchStartDistRef.current;
        if (Math.abs(factor - 1) > 0.02) {
          setView((v) => ({
            ...v,
            zoom: Math.max(0.4, Math.min(3.5, v.zoom * (factor > 1 ? 1.03 : 0.97))),
          }));
          touchStartDistRef.current = dist;
        }
      }
    }
  };

  const handleTouchEnd = () => {
    isDraggingRef.current = false;
    touchStartDistRef.current = null;
  };

  // 3D Perspective Projection Function (matches EPDraw coordinate engine)
  const projectPoint = useCallback(
    (
      p: [number, number, number],
      cx: number,
      cy: number,
      scale: number,
      v: typeof view
    ) => {
      const cyw = Math.cos(v.yaw);
      const syw = Math.sin(v.yaw);
      const cp = Math.cos(v.pitch);
      const sp = Math.sin(v.pitch);
      const s = scale * v.zoom;
      const dist = 9.0;

      // Model axes: x -> right, y -> depth, z -> up
      const x = p[0];
      const y = p[1];
      const z = p[2];

      const x1 = x * cyw - y * syw;
      const y1 = x * syw + y * cyw;
      const y2 = y1 * cp - z * sp;
      const z2 = y1 * sp + z * cp;

      const persp = dist / (dist + y2 * 0.25);
      return {
        x: cx + v.panX + x1 * s * persp,
        y: cy + v.panY - z2 * s * persp,
        depth: y2,
        k: persp * v.zoom,
      };
    },
    [view]
  );

  // Main Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const render = () => {
      // Handle Auto-Rotation
      if (autoRotate && !isDraggingRef.current) {
        setView((v) => ({ ...v, yaw: v.yaw + 0.006 }));
      }

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const width = canvas.clientWidth;
      const h = canvas.clientHeight;

      if (canvas.width !== width * dpr || canvas.height !== h * dpr) {
        canvas.width = width * dpr;
        canvas.height = h * dpr;
      }

      ctx.save();
      ctx.scale(dpr, dpr);

      // Deep scientific space background
      ctx.fillStyle = '#090d16';
      ctx.fillRect(0, 0, width, h);

      // Subtle spatial grid floor
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
      ctx.lineWidth = 1;
      const gridStep = 40;
      for (let x = 0; x <= width; x += gridStep) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = 0; y <= h; y += gridStep) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      const cx = width / 2;
      const cy = h / 2;
      const baseScale = Math.min(width, h) * 0.28;

      // Project all atoms
      const projectedAtoms = molecule.atoms.map((a) => {
        const q = projectPoint(a.pos, cx, cy, baseScale, view);
        return { atom: a, proj: q };
      });

      // Build bond coordinates
      const projectedBonds = molecule.bonds.map((b) => {
        const fromA = projectedAtoms.find((pa) => pa.atom.id === b.from);
        const toA = projectedAtoms.find((pa) => pa.atom.id === b.to);
        const avgDepth = fromA && toA ? (fromA.proj.depth + toA.proj.depth) / 2 : 0;
        return { bond: b, from: fromA?.proj, to: toA?.proj, depth: avgDepth };
      });

      // Sort items by depth for correct painter's algorithm
      const renderQueue: Array<{
        type: 'bond' | 'atom';
        depth: number;
        data: any;
      }> = [
        ...projectedBonds.map((pb) => ({ type: 'bond' as const, depth: pb.depth, data: pb })),
        ...projectedAtoms.map((pa) => ({ type: 'atom' as const, depth: pa.proj.depth, data: pa })),
      ];

      renderQueue.sort((a, b) => b.depth - a.depth);

      // Render Bonds & Atoms
      renderQueue.forEach((item) => {
        if (item.type === 'bond' && renderMode !== 'space-filling') {
          const { bond, from, to } = item.data;
          if (!from || !to) return;

          const dx = to.x - from.x;
          const dy = to.y - from.y;
          const len = Math.hypot(dx, dy);
          if (len < 1) return;

          const angle = Math.atan2(dy, dx);
          const bondWidth = renderMode === 'wireframe' ? 2 : Math.max(3, 7 * ((from.k + to.k) / 2));

          ctx.save();
          if (bond.order === 1 || renderMode === 'wireframe') {
            ctx.beginPath();
            ctx.moveTo(from.x, from.y);
            ctx.lineTo(to.x, to.y);
            ctx.strokeStyle = '#64748b';
            ctx.lineWidth = bondWidth;
            ctx.lineCap = 'round';
            ctx.stroke();

            // Specular shine line
            if (renderMode === 'ball-and-stick' && bondWidth > 4) {
              ctx.beginPath();
              ctx.moveTo(from.x, from.y);
              ctx.lineTo(to.x, to.y);
              ctx.strokeStyle = 'rgba(255,255,255,0.25)';
              ctx.lineWidth = bondWidth * 0.35;
              ctx.stroke();
            }
          } else if (bond.order === 2) {
            // Double bond: two parallel cylinders
            const offset = 4.5 * ((from.k + to.k) / 2);
            const ox = -Math.sin(angle) * offset;
            const oy = Math.cos(angle) * offset;

            [1, -1].forEach((dir) => {
              ctx.beginPath();
              ctx.moveTo(from.x + ox * dir, from.y + oy * dir);
              ctx.lineTo(to.x + ox * dir, to.y + oy * dir);
              ctx.strokeStyle = '#64748b';
              ctx.lineWidth = bondWidth * 0.65;
              ctx.stroke();
            });
          } else if (bond.order === 3) {
            // Triple bond: central + two sides
            const offset = 6 * ((from.k + to.k) / 2);
            const ox = -Math.sin(angle) * offset;
            const oy = Math.cos(angle) * offset;

            ctx.beginPath();
            ctx.moveTo(from.x, from.y);
            ctx.lineTo(to.x, to.y);
            ctx.strokeStyle = '#64748b';
            ctx.lineWidth = bondWidth * 0.6;
            ctx.stroke();

            [1, -1].forEach((dir) => {
              ctx.beginPath();
              ctx.moveTo(from.x + ox * dir, from.y + oy * dir);
              ctx.lineTo(to.x + ox * dir, to.y + oy * dir);
              ctx.strokeStyle = '#64748b';
              ctx.lineWidth = bondWidth * 0.5;
              ctx.stroke();
            });
          } else if (bond.order === 1.5) {
            // Aromatic resonance bond (solid + dashed parallel)
            const offset = 4.5 * ((from.k + to.k) / 2);
            const ox = -Math.sin(angle) * offset;
            const oy = Math.cos(angle) * offset;

            ctx.beginPath();
            ctx.moveTo(from.x, from.y);
            ctx.lineTo(to.x, to.y);
            ctx.strokeStyle = '#64748b';
            ctx.lineWidth = bondWidth * 0.6;
            ctx.stroke();

            ctx.beginPath();
            ctx.setLineDash([6, 5]);
            ctx.moveTo(from.x + ox, from.y + oy);
            ctx.lineTo(to.x + ox, to.y + oy);
            ctx.strokeStyle = '#38bdf8';
            ctx.lineWidth = bondWidth * 0.55;
            ctx.stroke();
            ctx.setLineDash([]);
          }
          ctx.restore();
        } else if (item.type === 'atom') {
          const { atom, proj } = item.data;
          const radiusMultiplier = renderMode === 'space-filling' ? 2.3 : renderMode === 'wireframe' ? 0.65 : 1.0;
          const atomRadius = Math.max(4, atom.radius * proj.k * radiusMultiplier);

          ctx.save();
          // Sphere 3D shading with specular highlight
          const grad = ctx.createRadialGradient(
            proj.x - atomRadius * 0.35,
            proj.y - atomRadius * 0.35,
            atomRadius * 0.1,
            proj.x,
            proj.y,
            atomRadius
          );
          grad.addColorStop(0, '#ffffff');
          grad.addColorStop(0.32, atom.color);
          grad.addColorStop(1, '#020617');

          ctx.beginPath();
          ctx.arc(proj.x, proj.y, atomRadius, 0, Math.PI * 2);
          ctx.fillStyle = grad;
          ctx.shadowColor = atom.color;
          ctx.shadowBlur = renderMode === 'ball-and-stick' ? 8 : 4;
          ctx.fill();
          ctx.shadowBlur = 0;

          ctx.lineWidth = 1;
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
          ctx.stroke();

          // Atom Symbol Label (Optimized for classroom readability at distance)
          if (showLabels && atomRadius > 8) {
            ctx.fillStyle = '#ffffff';
            ctx.font = `bold ${Math.max(13, Math.round(atomRadius * 0.9))}px Inter, sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.shadowColor = 'rgba(0,0,0,0.95)';
            ctx.shadowBlur = 6;
            ctx.fillText(atom.symbol, proj.x, proj.y);
            ctx.shadowBlur = 0;
          }

          ctx.restore();
        }
      });

      // Overlay: Bond Angle Display with High-Contrast Classroom Badge
      if (showAngles && molecule.bondAngle && projectedAtoms.length >= 3) {
        ctx.save();
        const center = projectedAtoms[0]?.proj;
        if (center) {
          const badgeText = `θ = ${molecule.bondAngle}`;
          ctx.font = 'bold 15px Inter, sans-serif';
          const textMetrics = ctx.measureText(badgeText);
          const badgeW = textMetrics.width + 16;
          const badgeH = 26;
          const bx = center.x - badgeW / 2;
          const by = center.y + 30;

          // Semi-transparent rounded backdrop
          ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
          ctx.beginPath();
          ctx.roundRect(bx, by, badgeW, badgeH, 6);
          ctx.fill();
          ctx.strokeStyle = 'rgba(56, 189, 248, 0.5)';
          ctx.lineWidth = 1.5;
          ctx.stroke();

          // Badge text
          ctx.fillStyle = '#38bdf8';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(badgeText, center.x, by + badgeH / 2);
        }
        ctx.restore();
      }

      ctx.restore();
      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [molecule, renderMode, showLabels, showAngles, autoRotate, view, projectPoint]);

  return (
    <div
      ref={containerRef}
      className={`flex flex-col rounded-2xl border border-line bg-slate-950 overflow-hidden shadow-2xl transition-all duration-300 ${
        isStageExpanded ? 'fixed inset-4 z-50 shadow-2xl' : 'relative'
      }`}
    >
      {/* Top Header & Molecule Telemetry */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line/60 bg-slate-900/90 px-4 md:px-6 py-3 text-white">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 font-extrabold text-xl shrink-0">
            ⚛️
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-lg md:text-xl text-white">{molecule.name}</span>
              <span className="font-mono text-xs md:text-sm font-semibold text-cyan-400 bg-cyan-500/10 px-2.5 py-1 rounded border border-cyan-500/20">
                {molecule.formula}
              </span>
              <span className="rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-xs font-bold px-2.5 py-1">
                {molecule.hybridization}
              </span>
            </div>
            <p className="text-xs md:text-sm text-slate-400 mt-0.5">
              Geometry: <strong className="text-slate-200">{molecule.geometry}</strong> • Angle:{' '}
              <strong className="text-amber-300 font-semibold">{molecule.bondAngle}</strong> • IUPAC: {molecule.iupac}
            </p>
          </div>
        </div>

        {/* Viewport Control Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Representation Style Selector */}
          <div className="flex rounded-xl border border-slate-700 bg-slate-800/90 p-1 text-xs md:text-sm font-semibold text-slate-300">
            <button
              type="button"
              onClick={() => setRenderMode('ball-and-stick')}
              className={`rounded-lg px-3 py-2 min-h-[44px] transition cursor-pointer flex items-center justify-center ${
                renderMode === 'ball-and-stick' ? 'bg-cyan-600 text-white font-bold shadow' : 'hover:text-white'
              }`}
            >
              Ball & Stick
            </button>
            <button
              type="button"
              onClick={() => setRenderMode('space-filling')}
              className={`rounded-lg px-3 py-2 min-h-[44px] transition cursor-pointer flex items-center justify-center ${
                renderMode === 'space-filling' ? 'bg-cyan-600 text-white font-bold shadow' : 'hover:text-white'
              }`}
            >
              Space-Filling
            </button>
            <button
              type="button"
              onClick={() => setRenderMode('wireframe')}
              className={`rounded-lg px-3 py-2 min-h-[44px] transition cursor-pointer flex items-center justify-center ${
                renderMode === 'wireframe' ? 'bg-cyan-600 text-white font-bold shadow' : 'hover:text-white'
              }`}
            >
              Skeletal
            </button>
          </div>

          <button
            type="button"
            onClick={() => setAutoRotate(!autoRotate)}
            className={`rounded-xl border px-3.5 py-2 min-h-[44px] text-xs md:text-sm font-semibold transition cursor-pointer flex items-center justify-center gap-1.5 ${
              autoRotate
                ? 'border-cyan-500/40 bg-cyan-500/20 text-cyan-300'
                : 'border-slate-700 bg-slate-800 text-slate-400 hover:text-white'
            }`}
            title="Toggle Continuous 3D Rotation"
          >
            {autoRotate ? '⏸ Pause' : '▶ Rotate'}
          </button>

          <button
            type="button"
            onClick={handleResetCamera}
            className="rounded-xl border border-slate-700 bg-slate-800 px-3.5 py-2 min-h-[44px] text-xs md:text-sm font-semibold text-slate-300 hover:bg-slate-700 hover:text-white transition cursor-pointer flex items-center justify-center gap-1.5"
            title="Reset Camera View"
          >
            ↺ Reset
          </button>

          <button
            type="button"
            onClick={() => setIsStageExpanded(!isStageExpanded)}
            className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 min-h-[44px] text-xs md:text-sm font-semibold text-slate-300 hover:bg-slate-700 hover:text-white transition cursor-pointer flex items-center justify-center"
            title={isStageExpanded ? 'Exit Expanded View' : 'Expand 3D Stage'}
          >
            {isStageExpanded ? '↙ Collapse' : '⛶ Expand'}
          </button>
        </div>
      </div>

      {/* Main 3D Canvas Stage */}
      <div
        className="relative w-full overflow-hidden bg-slate-950 select-none touch-none"
        style={{ height: isStageExpanded ? 'calc(100vh - 170px)' : height }}
      >
        <canvas
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchEnd}
          onContextMenu={(e) => e.preventDefault()}
          className="w-full h-full block cursor-grab active:cursor-grabbing touch-none"
          title="Drag to orbit 3D model, Pinch to zoom, Right-drag to pan"
        />

        {/* Floating HUD: Real-time Telemetry Chips */}
        <div className="absolute top-4 left-4 flex flex-wrap gap-2.5 pointer-events-none">
          <div className="flex items-center gap-2 rounded-xl bg-slate-900/90 backdrop-blur-md border border-slate-700/60 px-3.5 py-1.5 text-xs md:text-sm text-slate-300 shadow-lg">
            <span className="text-slate-500 font-semibold">DOMAINS:</span>
            <span className="font-bold text-cyan-400">{molecule.electronDomains}</span>
          </div>
          <div className="flex items-center gap-2 rounded-xl bg-slate-900/90 backdrop-blur-md border border-slate-700/60 px-3.5 py-1.5 text-xs md:text-sm text-slate-300 shadow-lg">
            <span className="text-slate-500 font-semibold">LONE PAIRS:</span>
            <span className="font-bold text-amber-400">{molecule.lonePairs}</span>
          </div>
          <div className="flex items-center gap-2 rounded-xl bg-slate-900/90 backdrop-blur-md border border-slate-700/60 px-3.5 py-1.5 text-xs md:text-sm text-slate-300 shadow-lg">
            <span className="text-slate-500 font-semibold">DIPOLE:</span>
            <span className="font-bold text-emerald-400">{molecule.dipoleMoment}</span>
          </div>
        </div>

        {/* Floating Zoom & Toggle Controls - Smartboard touch friendly */}
        <div className="absolute bottom-4 right-4 flex items-center gap-2 bg-slate-900/90 backdrop-blur-md border border-slate-700/60 p-1.5 rounded-2xl shadow-xl">
          <button
            type="button"
            onClick={() => handleZoom(0.25)}
            className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-800 text-white font-bold hover:bg-slate-700 text-lg transition cursor-pointer active:scale-95"
            title="Zoom In"
          >
            ＋
          </button>
          <button
            type="button"
            onClick={() => handleZoom(-0.25)}
            className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-800 text-white font-bold hover:bg-slate-700 text-lg transition cursor-pointer active:scale-95"
            title="Zoom Out"
          >
            －
          </button>
          <button
            type="button"
            onClick={() => setShowLabels(!showLabels)}
            className={`rounded-xl px-3.5 py-2 min-h-[44px] text-xs md:text-sm font-bold transition cursor-pointer flex items-center justify-center ${
              showLabels ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' : 'text-slate-400 hover:text-white'
            }`}
          >
            Labels
          </button>
          <button
            type="button"
            onClick={() => setShowAngles(!showAngles)}
            className={`rounded-xl px-3.5 py-2 min-h-[44px] text-xs md:text-sm font-bold transition cursor-pointer flex items-center justify-center ${
              showAngles ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'text-slate-400 hover:text-white'
            }`}
          >
            Angles
          </button>
        </div>

        {/* Interaction Hint */}
        <div className="absolute bottom-4 left-4 text-xs text-slate-400/80 font-mono pointer-events-none hidden sm:block bg-slate-900/70 backdrop-blur px-3 py-1 rounded-lg border border-slate-800/80">
          Touch drag to orbit • Pinch to zoom • Classroom touch enabled
        </div>
      </div>

      {/* Educational Insight Panel */}
      {showDetails && (
        <div className="border-t border-line/60 bg-slate-900/60 p-4 md:p-5 text-sm text-slate-300 leading-relaxed flex items-start gap-3.5">
          <span className="text-2xl shrink-0 mt-0.5">💡</span>
          <div>
            <span className="font-bold text-white text-sm md:text-base block mb-1">Quantum & Geometric Rationale:</span>
            <p className="text-slate-300 text-xs md:text-sm leading-relaxed">{molecule.description}</p>
          </div>
        </div>
      )}
    </div>
  );
};
