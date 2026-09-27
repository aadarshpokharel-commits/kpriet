import { AcademicService } from '@/services/academic.service';
import type { ISmartBoardSessionPayload } from '@/types/academic.types';

export interface SmartBoardSimulationLaunch {
  subjectId: string;
  simKey: string;
  title: string;
  simulationContext?: {
    simulationId?: string;
    topic?: string;
    category?: string;
    config?: Record<string, unknown>;
    state?: Record<string, unknown>;
  };
}

/** Adds the simulation to a Smart Board URL so the board opens it on load. */
export function withSimulationPreset(url: string, sim: SmartBoardSimulationLaunch): string {
  const target = new URL(url, window.location.origin);
  target.searchParams.set('preset', sim.simKey);
  target.searchParams.set('title', sim.title);
  const ctx = sim.simulationContext || {};
  if (ctx.category) target.searchParams.set('category', String(ctx.category));
  if (ctx.topic) target.searchParams.set('topic', String(ctx.topic));
  if (ctx.simulationId) target.searchParams.set('simulationId', String(ctx.simulationId));
  if (ctx.config && Object.keys(ctx.config).length) target.searchParams.set('config', JSON.stringify(ctx.config));
  if (ctx.state && Object.keys(ctx.state).length) target.searchParams.set('state', JSON.stringify(ctx.state));
  return target.pathname + target.search;
}

/**
 * Launches a simulation straight onto the Smart Board (no launch dialog):
 * creates the board session for the subject, stores it for the board tab,
 * and opens the board with the simulation preset in the URL.
 *
 * The tab is opened synchronously (before the network call) so the browser's
 * popup blocker treats it as part of the teacher's click.
 */
export async function launchSmartBoardSimulation(
  sim: SmartBoardSimulationLaunch
): Promise<ISmartBoardSessionPayload | null> {
  const tab = window.open('', '_blank');
  try {
    const initialResource = { type: 'sim', title: sim.title, simKey: sim.simKey, simulationContext: sim.simulationContext || {} };
    const focus = sim.simulationContext?.topic ? { topic: String(sim.simulationContext.topic) } : undefined;
    const session = await AcademicService.createSmartBoardSession({
      subjectId: sim.subjectId,
      initialResource,
      ...(focus ? { focus } : {}),
    } as any);
    const sessionData: any = (session as any).sessionData || session;
    try {
      localStorage.setItem('eduverse_smartboard_active_session', JSON.stringify(sessionData));
      sessionStorage.setItem('eduverse_rbac_session', JSON.stringify(sessionData));
    } catch {
      /* storage unavailable — the URL still carries everything the board needs */
    }

    const base =
      session.boardUrl ||
      `/smartboard/index.html?${new URLSearchParams({
        subjectId: sim.subjectId,
        sessionId: session.sessionId || '',
        role: sessionData?.role || 'teacher',
      }).toString()}`;
    const url = withSimulationPreset(base, sim);
    if (tab) tab.location.href = url;
    else window.open(url, '_blank');
    return session;
  } catch (error) {
    // Could not create a session: still open the board with the simulation
    const url = withSimulationPreset(`/smartboard/index.html?${new URLSearchParams({ subjectId: sim.subjectId, role: 'teacher' }).toString()}`, sim);
    if (tab) tab.location.href = url;
    else window.open(url, '_blank');
    console.warn('Smart Board session note:', error);
    return null;
  }
}
