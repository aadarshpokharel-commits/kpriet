// Usage: (serve smart-board-my-version/src on :8100) node ma-simulation.check.mjs <sim-id>[,<sim-id>...]
// Opens each simulation in Smart Board mode (1366x768), walks every step in every mode,
// tries min/max/default of every numeric parameter and every select option, and reports problems.
import { chromium } from 'playwright';
const ids = (process.argv[2] || '').split(',').filter(Boolean); const shots = process.argv.includes('--shots');
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const p = await b.newPage({ viewport: { width: 1366, height: 768 } }); const errs = [];
p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error' && !/favicon|404/.test(m.text())) errs.push(m.text()); });
await p.goto('http://localhost:8100/ma-simulation.html?embedded=1&lock=1&role=teacher&sim=' + (ids[0] || 'ma-eigen'));
await p.waitForTimeout(500);
for (const id of ids) {
  errs.length = 0;
  const r = await p.evaluate(async (id) => {
    const out = { problems: [], combos: 0 };
    const spec = window.MASims[id]; if (!spec) return { problems: ['not registered in window.EPSims'] };
    if (!window.EduverseMACatalog.get(id)) out.problems.push('not in catalog');
    window.EPEngine._open(id);
    const E = window.EPEngine; const params = spec.params || [];
    const check = (label) => {
      const s = E._state(); const c = s.calc || {};
      if (!Array.isArray(c.formulas)) out.problems.push(label + ': formulas missing');
      if (!Array.isArray(c.readouts)) out.problems.push(label + ': readouts missing');
      if (!c.explain || !c.explain.what || !c.explain.why || !c.explain.param || !c.explain.effect) out.problems.push(label + ': explain incomplete');
      const txt = JSON.stringify(c);
      if (/NaN|undefined|Infinity/.test(txt)) out.problems.push(label + ': NaN/undefined/Infinity in output: ' + txt.match(/.{0,60}(NaN|undefined|Infinity).{0,20}/)[0]);
      for (let i = 0; i < s.steps; i++) { E._drawAt(i, 0, 0); E._drawAt(i, 1.7, 3.3); E._drawAt(i, 99, 12.1); }
      out.combos++;
    };
    const modes = (spec.modes || [{ key: undefined }]).map((m) => m.key);
    for (const m of modes) {
      if (m !== undefined) E._set('mode', m);
      check('mode ' + m + ' defaults');
      for (const d of params) {
        if (d.showIf && !d.showIf(E._state().p)) continue;
        const vals = d.type === 'select' ? d.options.map((o) => o.value) : d.type === 'toggle' ? [true, false] : [d.min, d.max, d.default];
        for (const v of vals) { E._set(d.key, v); check(`mode ${m} ${d.key}=${v}`); }
        E._set(d.key, d.default);
      }
    }
    (spec.examples || []).forEach((ex, i) => { Object.entries(ex.values).forEach(([k, v]) => E._set(k, v)); check('example ' + i); });
    const st = E._state(); if (st.steps < 3) out.problems.push('fewer than 3 steps');
    out.steps = st.steps;
    const d = document.documentElement; out.overflow = d.scrollHeight - d.clientHeight;
    return out;
  }, id);
  if (shots) {
    await p.evaluate((id) => window.EPEngine._open(id), id);
    const n = await p.evaluate(() => window.EPEngine._state().steps);
    for (let i = 0; i < n; i++) { await p.evaluate((i) => window.EPEngine._goto(i), i); await p.waitForTimeout(60); await p.screenshot({ path: `/tmp/w/shots/ma/${id}-${i}.png` }); }
  }
  const bad = (r.problems || []).length || errs.length || r.overflow > 0;
  console.log(`${bad ? 'FAIL' : 'ok  '} ${id}: steps=${r.steps} combos=${r.combos} overflow=${r.overflow}${r.problems && r.problems.length ? '\n   - ' + [...new Set(r.problems)].slice(0, 12).join('\n   - ') : ''}${errs.length ? '\n   errors: ' + [...new Set(errs)].slice(0, 6).join(' | ') : ''}`);
}
await b.close();
