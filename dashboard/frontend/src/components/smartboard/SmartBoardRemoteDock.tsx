import { useState, useEffect, useMemo } from 'react';
import type { ISmartBoardSessionPayload } from '@/types/academic.types';
import { getSimulationsForSubject } from '@/simulations/registry';
import { isSmartBoardDsaSimulation } from '@/simulations/types';
import type { ISimulationDefinition } from '@/simulations/types';

interface SmartBoardRemoteDockProps {
  activeSession: ISmartBoardSessionPayload | null;
  onClose: () => void;
  onOpenLaunchModal: () => void;
  subjectContext?: any;
}

interface SmartBoardStatus {
  currentPage: number;
  totalPages: number;
  activeResource?: string | null;
  subjectId?: string | null;
  subjectName?: string | null;
  isConnected: boolean;
  lastPing: number;
}

export function SmartBoardRemoteDock({
  activeSession,
  onClose,
  onOpenLaunchModal,
  subjectContext,
}: SmartBoardRemoteDockProps) {
  const [boardStatus, setBoardStatus] = useState<SmartBoardStatus>({
    currentPage: 1,
    totalPages: 3,
    activeResource: activeSession?.sessionData?.initialResource?.title || null,
    subjectId: activeSession?.sessionData?.subject?.id || null,
    subjectName: activeSession?.sessionData?.subject?.name || null,
    isConnected: false,
    lastPing: Date.now(),
  });

  const [isMinimized, setIsMinimized] = useState(false);
  const [channel, setChannel] = useState<BroadcastChannel | null>(null);

  // Setup BroadcastChannel for real-time bi-directional synchronization
  useEffect(() => {
    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel('eduverse_smartboard_sync');
      setChannel(bc);

      bc.onmessage = (event) => {
        const { type, payload } = event.data || {};
        if (type === 'SMARTBOARD_STATUS') {
          setBoardStatus({
            currentPage: payload.currentPage || 1,
            totalPages: payload.totalPages || 1,
            activeResource: payload.activeResource,
            subjectId: payload.subjectId,
            subjectName: payload.subjectName,
            isConnected: true,
            lastPing: Date.now(),
          });
        }
      };

      // Request status from Smart Board right after docking
      bc.postMessage({ type: 'SYNC_GET_STATUS', timestamp: Date.now() });
    } catch (e) {
      console.warn('BroadcastChannel sync init:', e);
    }

    // Ping check interval
    const timer = setInterval(() => {
      if (bc) {
        bc.postMessage({ type: 'SYNC_GET_STATUS', timestamp: Date.now() });
      }
    }, 4000);

    return () => {
      clearInterval(timer);
      if (bc) bc.close();
    };
  }, []);

  const sendCommand = (type: string, payload: any = {}) => {
    if (!channel) return;
    channel.postMessage({
      type,
      payload,
      timestamp: Date.now(),
    });
  };

  const handlePrevPage = () => {
    sendCommand('SYNC_PREV_PAGE');
    setBoardStatus((prev) => ({
      ...prev,
      currentPage: Math.max(1, prev.currentPage - 1),
    }));
  };

  const handleNextPage = () => {
    sendCommand('SYNC_NEXT_PAGE');
    setBoardStatus((prev) => ({
      ...prev,
      currentPage: Math.min(prev.totalPages, prev.currentPage + 1),
    }));
  };

  const handleAddPage = () => {
    sendCommand('SYNC_ADD_PAGE');
    setBoardStatus((prev) => ({
      ...prev,
      currentPage: prev.totalPages + 1,
      totalPages: prev.totalPages + 1,
    }));
  };

  const handleClearBoard = () => {
    if (confirm('Clear current drawing page on Smart Board?')) {
      sendCommand('SYNC_CLEAR_PAGE');
    }
  };

  const handleToggleFullscreen = () => {
    sendCommand('SYNC_TOGGLE_FULLSCREEN');
  };

  /** Smart Board URL for this session; `extra` adds e.g. a simulation preset. */
  const boardUrl = (extra: Record<string, string> = {}) => {
    const data: any = activeSession?.sessionData || {};
    const q = new URLSearchParams({
      subjectId: String(data.subject?.id || ''),
      subjectName: String(data.subject?.name || ''),
      subjectCode: String(data.subject?.code || ''),
      departmentId: String(data.departmentId || data.department?.id || ''),
      departmentName: String(data.department?.name || ''),
      semesterId: String(data.semesterId || ''),
      semesterNumber: String(data.semester?.number || data.subject?.semesterNumber || ''),
      teacherId: String(data.teacherId || ''),
      sectionId: String(data.sectionId || ''),
      sessionId: String(activeSession?.sessionId || ''),
      role: String(data.role || 'teacher'),
      ...extra,
    });
    return `/smartboard/index.html?${q.toString()}`;
  };

  /** Launches a simulation on the connected board, or opens the board with it if no board is open yet. */
  const handleLaunchSim = (sim: ISimulationDefinition) => {
    const simKey = sim.smartboardPresetKey || sim.id;
    const context = isSmartBoardDsaSimulation(sim)
      ? { topic: sim.title, category: sim.dsaCategory, config: { category: sim.dsaCategory, topic: sim.title } }
      : { topic: sim.title, category: sim.category, config: {} };
    if (boardStatus.isConnected) {
      sendCommand('SYNC_LAUNCH_SIMULATION', { simKey, title: sim.title, context });
    } else {
      window.open(boardUrl({ preset: simKey, title: sim.title, topic: sim.title, ...(context.category ? { category: String(context.category) } : {}) }), '_blank');
    }
    setBoardStatus((prev) => ({ ...prev, activeResource: sim.title }));
  };

  const handleLaunchPpt = (ppt: any) => {
    sendCommand('SYNC_LAUNCH_RESOURCE', {
      type: 'ppt',
      title: ppt.title,
      file: ppt.attachments?.[0]?.url || `${ppt.title}.pptx`,
    });
    setBoardStatus((prev) => ({ ...prev, activeResource: ppt.title }));
  };

  // Every simulation for this subject (same list as the subject's Simulations tab)
  const simulations = useMemo(() => {
    const data: any = activeSession?.sessionData || {};
    return getSimulationsForSubject({
      subjectCode: data.subject?.code || '',
      subjectName: data.subject?.name || '',
      department: data.department || undefined,
    });
  }, [activeSession]);

  if (!activeSession) return null;

  const sub = activeSession.sessionData.subject;
  const dept = activeSession.sessionData.department;
  const presentations = subjectContext?.presentations || activeSession.sessionData.presentations || [];

  return (
    <div
      className={`fixed bottom-5 right-5 z-40 transition-all duration-300 font-sans shadow-2xl rounded-2xl border ${
        boardStatus.isConnected
          ? 'border-emerald-500/50 bg-slate-950/95 text-white'
          : 'border-indigo-500/50 bg-slate-950/95 text-white'
      } backdrop-blur-md`}
      style={{ width: isMinimized ? 'auto' : '460px', maxWidth: 'calc(100vw - 30px)' }}
    >
      {/* ─── DOCK HEADER ─── */}
      <div className="flex items-center justify-between p-3.5 border-b border-white/10 gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="relative flex h-3 w-3">
            <span
              className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                boardStatus.isConnected ? 'bg-emerald-400' : 'bg-amber-400'
              }`}
            />
            <span
              className={`relative inline-flex rounded-full h-3 w-3 ${
                boardStatus.isConnected ? 'bg-emerald-500' : 'bg-amber-500'
              }`}
            />
          </span>

          <div className="truncate">
            <div className="flex items-center gap-2">
              <span className="font-bold text-xs truncate">
                {sub.code} • {sub.name}
              </span>
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-white/10 text-emerald-300">
                Live Sync
              </span>
            </div>
            {!isMinimized && (
              <p className="text-[10px] text-slate-400 truncate">
                Sem {sub.semesterNumber} • {dept.name}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="rounded-lg p-1.5 text-slate-400 hover:text-white hover:bg-white/10 transition-all text-xs"
            title={isMinimized ? 'Expand Remote Dock' : 'Minimize Dock'}
          >
            {isMinimized ? '□' : '─'}
          </button>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:text-rose-400 hover:bg-white/10 transition-all text-xs"
            title="Close Remote Control"
          >
            ✕
          </button>
        </div>
      </div>

      {/* ─── DOCK BODY (When expanded) ─── */}
      {!isMinimized && (
        <div className="p-4 space-y-3.5">
          {/* Active Canvas Page Navigation */}
          <div className="flex items-center justify-between bg-white/5 p-2.5 rounded-xl border border-white/10">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-300 font-semibold">Canvas Page:</span>
              <span className="font-mono text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded">
                {boardStatus.currentPage} / {boardStatus.totalPages}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={handlePrevPage}
                disabled={boardStatus.currentPage <= 1}
                className="px-2.5 py-1 rounded-lg text-xs font-bold bg-white/10 hover:bg-white/20 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                title="Previous Canvas Page"
              >
                ◀ Prev
              </button>
              <button
                onClick={handleNextPage}
                disabled={boardStatus.currentPage >= boardStatus.totalPages}
                className="px-2.5 py-1 rounded-lg text-xs font-bold bg-white/10 hover:bg-white/20 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                title="Next Canvas Page"
              >
                Next ▶
              </button>
              <button
                onClick={handleAddPage}
                className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-600/80 hover:bg-emerald-500 text-white transition-all shadow-sm"
                title="Add New Whiteboard Page"
              >
                + Page
              </button>
              <button
                onClick={handleClearBoard}
                className="p-1 rounded-lg text-xs text-slate-400 hover:text-rose-400 hover:bg-white/10 transition-all"
                title="Clear current whiteboard canvas"
              >
                🗑️
              </button>
            </div>
          </div>

          {/* Active Resource banner */}
          {boardStatus.activeResource && (
            <div className="flex items-center justify-between text-xs bg-indigo-500/10 border border-indigo-500/20 px-3 py-1.5 rounded-lg text-indigo-200">
              <span className="truncate">🚀 Active: <strong>{boardStatus.activeResource}</strong></span>
              <span className="text-[10px] text-slate-400 flex-shrink-0 ml-2">Stylus Ready</span>
            </div>
          )}

          {/* Quick Remote Content Push */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Push Subject Content to Board
              </span>
              <button
                onClick={handleToggleFullscreen}
                className="text-[11px] text-sky-400 hover:text-sky-300 font-semibold"
                title="Trigger Fullscreen on Smart Board"
              >
                ⛶ Fullscreen Board
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              {/* Simulation Quick Launcher */}
              {simulations.length > 0 && (
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-400 block font-semibold">Simulations:</span>
                  <select
                    onChange={(e) => {
                      if (!e.target.value) return;
                      const sim = simulations.find((s) => s.id === e.target.value);
                      if (sim) handleLaunchSim(sim);
                      e.target.value = '';
                    }}
                    className="w-full bg-white/5 border border-white/15 rounded-lg px-2 py-1.5 text-xs text-slate-200 focus:outline-none"
                    defaultValue=""
                  >
                    <option value="" disabled className="bg-slate-900 text-slate-400">
                      🔬 Launch Simulation…
                    </option>
                    {simulations.map((sim) => (
                      <option key={sim.id} value={sim.id} className="bg-slate-900 text-white">
                        {sim.icon} {sim.title}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Presentations Quick Launcher */}
              <div className="space-y-1">
                <span className="text-[10px] text-slate-400 block font-semibold">Slide Decks:</span>
                <select
                  onChange={(e) => {
                    if (!e.target.value) return;
                    const ppt = presentations.find((p: any) => p._id === e.target.value);
                    if (ppt) handleLaunchPpt(ppt);
                    e.target.value = '';
                  }}
                  className="w-full bg-white/5 border border-white/15 rounded-lg px-2 py-1.5 text-xs text-slate-200 focus:outline-none"
                  defaultValue=""
                >
                  <option value="" disabled className="bg-slate-900 text-slate-400">
                    📊 Present PPT Deck…
                  </option>
                  {presentations.map((ppt: any) => (
                    <option key={ppt._id} value={ppt._id} className="bg-slate-900 text-white">
                      {ppt.title}
                    </option>
                  ))}
                  {presentations.length === 0 && (
                    <option value="default" className="bg-slate-900 text-white">
                      {sub.name} Overview Slides
                    </option>
                  )}
                </select>
              </div>
            </div>
          </div>

          {/* Footer Navigation Link */}
          <div className="flex items-center justify-between pt-2 border-t border-white/10 text-xs">
            <a
              href={boardUrl()}
              target="_blank"
              rel="noreferrer"
              className="text-emerald-400 hover:text-emerald-300 font-semibold inline-flex items-center gap-1"
            >
              <span>↗</span> Open Board Window
            </a>

            <button
              onClick={onOpenLaunchModal}
              className="text-slate-400 hover:text-white transition-all text-xs"
            >
              Switch Course…
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
