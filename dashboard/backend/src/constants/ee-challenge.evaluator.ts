/**
 * Server-side verification of Challenge-mode answers for the Electrical & Electronics simulations (U21EEG01).
 *
 * This is a line-by-line port of window.EEChallengeKinds in smart-board-my-version/src/tools/ee-kit.js:
 * the engine evaluates the student's configuration in the browser for instant feedback, and the backend
 * re-evaluates the same configuration here, so the stored result never depends on a client-side verdict.
 * Keep the two in sync.
 */
type Cfg = Record<string, any>;

const on = (v: any, d = true) => (v == null ? d : v === true || v === 'true' || v === 1 || v === '1');
const num = (v: any, d = 0) => (Number.isFinite(Number(v)) ? Number(v) : d);
const res = (cfg: Cfg, k: string, count: number) => Array.from({ length: count }, (_, i) => num(cfg[`${k}${i + 1}`]));
const solve2 = (a: number, b: number, c: number, d: number, e: number, f: number): number[] => { const det = a * d - b * c; return Math.abs(det) < 1e-12 ? [NaN, NaN] : [(e * d - b * f) / det, (a * f - e * c) / det]; };
const KINDS: Record<string, (c: Cfg, meta?: { key: string; expected: unknown }) => number> = {
  'ohm-current': (c: Cfg) => num(c.V) / num(c.R),
  'ohm-voltage': (c: Cfg) => num(c.I) * num(c.R),
  'series-req': (c: Cfg) => res(c, 'R', Math.round(num(c.count, 3))).reduce((s: number, r: number) => s + r, 0),
  'series-current': (c: Cfg) => num(c.V) / res(c, 'R', Math.round(num(c.count, 3))).reduce((s: number, r: number) => s + r, 0),
  'parallel-req': (c: Cfg) => 1 / res(c, 'R', Math.round(num(c.count, 3))).reduce((s: number, r: number) => s + 1 / r, 0),
  'parallel-current': (c: Cfg) => res(c, 'R', Math.round(num(c.count, 3))).reduce((s: number, r: number) => s + num(c.V) / r, 0),
  'kcl-imbalance': (c: Cfg) => { const nin = Math.round(num(c.nin, 2)), nout = Math.round(num(c.nout, 2)); let s = 0; for (let i = 1; i <= nin; i++) s += num(c[`in${i}`]); for (let i = 1; i <= nout; i++) s -= num(c[`out${i}`]); return s; },
  'kvl-vr2': (c: Cfg) => { const E = num(c.E1) + (on(c.useE2, false) ? num(c.E2) * (c.e2dir === 'aid' ? 1 : -1) : 0); return (E * num(c.R2)) / (num(c.R1) + num(c.R2) + num(c.R3)); },
  'star-ra': (c: Cfg) => (num(c.Rab) * num(c.Rca)) / (num(c.Rab) + num(c.Rbc) + num(c.Rca)),
  'delta-rab': (c: Cfg) => num(c.Ra) + num(c.Rb) + (num(c.Ra) * num(c.Rb)) / num(c.Rc),
  'nodal-v1': (c: Cfg) => (nodal(c)[0] ?? NaN),
  'mesh-i1': (c: Cfg) => (mesh(c)[0] ?? NaN),
  'dc-torque': (c: Cfg) => num(c.K) * num(c.phi) * num(c.Ia),
  'dc-backemf-speed': (c: Cfg) => { const Eb = num(c.V) - num(c.Ia) * num(c.Ra); return (Eb * 60) / (2 * Math.PI * num(c.K) * num(c.phi)); },
  'transformer-v2': (c: Cfg) => (num(c.V1) * num(c.N2)) / num(c.N1),
  'transformer-i1': (c: Cfg) => (num(c.V1) * num(c.N2) / num(c.N1)) ** 2 / num(c.RL) / num(c.V1),
  'im-rotor-speed': (c: Cfg) => ((120 * num(c.f)) / num(c.P)) * (1 - num(c.s) / 100),
  'diode-current-ma': (c: Cfg) => { const Vk = c.material === 'ge' ? 0.3 : 0.7; const fwd = c.bias !== 'reverse'; return fwd && num(c.Vs) > Vk ? ((num(c.Vs) - Vk) / num(c.R)) * 1000 : 0; },
  'zener-iz-ma': (c: Cfg) => { const Vin = num(c.Vin), Vz = num(c.Vz); if (Vin * num(c.RL) / (num(c.Rs) + num(c.RL)) < Vz) return 0; return ((Vin - Vz) / num(c.Rs) - Vz / num(c.RL)) * 1000; },
  'bjt-ic-ma': (c: Cfg) => { const IB = Math.max(0, (num(c.VBB) - 0.7) / (num(c.RB) * 1000)); const ICsat = num(c.VCC) / (num(c.RC) * 1000); return Math.min(num(c.beta) * IB, ICsat) * 1000; },
  'fet-id-ma': (c: Cfg) => { if (c.VDS != null && num(c.VDS) < num(c.VGS) - num(c.VP)) return NaN; const r = 1 - num(c.VGS) / num(c.VP); return num(c.VGS) <= num(c.VP) ? 0 : num(c.IDSS) * r * r; },
  'hw-vdc': (c: Cfg) => (num(c.Vm) - num(c.Vd, 0.7)) / Math.PI,
  'fw-vdc': (c: Cfg) => (2 * (num(c.Vm) - num(c.Vd, 0.7) * (c.mode === 'bridge' ? 2 : 1))) / Math.PI,
  'filter-ripple': (c: Cfg) => { const fr = num(c.f, 50) * (c.rect === 'half' ? 1 : 2); const k = num(c.RL) * fr * num(c.C) * 1e-6; const Vdc = num(c.Vm) / (1 + 1 / (2 * k)); return Vdc / k; },
  'regulator-vout': (c: Cfg) => Math.min(num(c.Vset), Math.max(0, num(c.Vin) - 2)),
  'select-match': (c: Cfg, meta?: { key: string; expected: unknown }) => (meta && String(c[meta.key]) === String(meta.expected) ? 1 : 0),
  'dc-rotation-dir': (c: Cfg) => (c.field === 'reverse' ? -1 : 1) * (c.current === 'reverse' ? -1 : 1),
  'dc-shunt-il': (c: Cfg) => (c.mode && c.mode !== 'shunt' ? NaN : num(c.Ia) + num(c.V) / num(c.Rsh)),
  'dc-shunt-speed': (c: Cfg) => (c.mode && c.mode !== 'shunt' ? NaN : 1) * ((num(c.V) - num(c.Ia) * num(c.Ra)) / num(c.kphi)) * 60 / (2 * Math.PI),
  'starter-ist': (c: Cfg) => num(c.V) / (num(c.Ra) + num(c.Rst)),
  'dc-speed-ratio': (c: Cfg) => { const Rx = c.mode === 'field' ? 0 : num(c.Rx); const fl = c.mode === 'armature' ? 100 : num(c.field, 100); return ((num(c.V) - num(c.Ia) * (num(c.Ra) + Rx)) / (fl / 100)) / (num(c.V) - num(c.Ia) * num(c.Ra)); },
  'im-smax': (c: Cfg) => num(c.R2) / num(c.X2),
  'diode-shockley-ma': (c: Cfg) => { const Is = c.material === 'ge' ? 1e-7 : 1e-13; return Is * (Math.exp(num(c.V) / 0.02585) - 1) * 1000; },
  'bjt-vce': (c: Cfg) => { if (c.mode === 'cb') return NaN; const IC = Math.min(num(c.beta) * num(c.IB) * 1e-6, num(c.VCC) / (num(c.RC) * 1000)); return num(c.VCC) - IC * num(c.RC) * 1000; },
  'regulator-headroom': (c: Cfg) => num(c.Vin) - num(c.Vset),
  'shunt-current-ma': (c: Cfg) => { if (c.mode && c.mode !== 'shunt') return NaN; const Vo = num(c.Vz) + 0.7; return ((num(c.Vin) - Vo) / num(c.Rs) - Vo / num(c.RL)) * 1000; },
  'stepud-v2': (c: Cfg) => num(c.V1) * (c.mode === 'down' ? 1 / num(c.k, 1) : num(c.k, 1)),
  'im-torque-ratio': (c: Cfg) => { const s = num(c.s) / 100, R2 = num(c.R2), X2 = num(c.X2); return (2 * s * R2 * X2) / (R2 * R2 + (s * X2) ** 2); },
  'config-current-gain': (c: Cfg) => { const b = num(c.beta); const m = c.mode || c.config; return m === 'cb' ? b / (b + 1) : m === 'cc' ? b + 1 : b; },
};
/** Two-node DC network used by nodal analysis (see ee-u1.js). */
function nodal(c: Cfg): number[] {
  const useR5 = on(c.useR5), useE2 = useR5 && on(c.useE2);
  const R1 = num(c.R1), R2 = num(c.R2), R3 = num(c.R3), R4 = num(c.R4), R5 = num(c.R5, 1e9), E1 = num(c.E1), E2 = useE2 ? num(c.E2) : 0;
  const g5 = useR5 ? 1 / R5 : 0;
  // node 1: (V1-E1)/R1 + V1/R2 + (V1-V2)/R3 = 0 ; node 2: (V2-V1)/R3 + V2/R4 + (V2-E2)/R5' = 0 (E2 through R5)
  const a = 1 / R1 + 1 / R2 + 1 / R3, b = -1 / R3, cc = -1 / R3, d = 1 / R3 + 1 / R4 + g5;
  return solve2(a, b, cc, d, E1 / R1, E2 * g5);
}
/** Two-mesh DC network used by mesh analysis (see ee-u1.js). */
function mesh(c: Cfg): number[] {
  const R1 = num(c.R1), R2 = num(c.R2), R3 = num(c.R3), E1 = num(c.E1), E2 = num(c.E2);
  // mesh 1: E1 = I1(R1+R3) − I2 R3 ; mesh 2: −E2 = −I1 R3 + I2(R2+R3)
  return solve2(R1 + R3, -R3, -R3, R2 + R3, E1, -E2);
}


export const EE_CHALLENGE_KINDS = Object.keys(KINDS);

/** Evaluates a challenge configuration. Returns null when the kind is unknown; NaN when the configuration does not apply. */
export function evaluateSimulationChallenge(kind: string, configuration: Cfg, meta?: { key: string; expected: unknown }): number | null {
  const fn = KINDS[kind];
  if (!fn) return null;
  try { return fn(configuration || {}, meta); } catch { return NaN; }
}
