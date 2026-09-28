'use strict';

/*
 * Engineering Mathematics simulation frame: turns a compact definition into an engine simulation.
 *
 *   MAFrame.define(id, {
 *     params, examples, modes, view3d, initialView, stepDuration,
 *     solve(p) → { steps:[{title, text, lines:[…]}], formulas, readouts, state, explain, …any data for plot },
 *     plot(g, box, sol, S),        // visualisation in the right-hand box (x, y, w, h)
 *     layout: 'split' | 'wide-plot' | 'work-only'
 *   })
 *
 * solve() may throw MACore.ParseError (or any Error) for invalid input: the frame shows the message,
 * keeps the simulation usable and never shows a made-up answer.
 */
(function () {
  const S = (window.MASims = window.MASims || {});
  const D = window.EPDraw; const M = window.MACore;

  function define(id, def) {
    const cache = { key: '', sol: null };
    const run = (p) => {
      const key = JSON.stringify(p);
      if (cache.key === key && cache.sol) return cache.sol;
      let sol;
      try { sol = def.solve(p); sol.ok = true; } catch (e) {
        const msg = e instanceof M.ParseError ? e.message : (e && e.message) || 'This input is not supported.';
        sol = { ok: false, error: msg, steps: [{ title: 'Check the input', text: msg, lines: [{ t: msg, c: '#b91c1c', b: true }, 'Correct the entry on the left — the calculation restarts automatically.'] }] };
      }
      cache.key = key; cache.sol = sol; return sol;
    };
    S[id] = {
      params: def.params, examples: def.examples, modes: def.modes, view3d: def.view3d, view2d: def.view2d, initialView: def.initialView,
      stepDuration: def.stepDuration || 3.5, approx: def.approx, tools: def.tools, actions: def.actions, onAction: def.onAction, onPointer: def.onPointer, initUi: def.initUi,
      validate(p) { const sol = run(p); return sol.ok ? (sol.warnings || []) : [sol.error]; },
      compute(p) {
        const sol = run(p);
        if (!sol.ok) return { formulas: [], readouts: [{ label: 'Input', value: 'needs correction', tone: 'bad' }], state: { error: sol.error, input: def.inputOf ? def.inputOf(p) : undefined }, explain: { what: sol.error, why: 'The calculation only runs on valid mathematical input, so no answer is shown.', param: 'The highlighted input.', effect: 'Fix the entry and every step is recalculated.' }, sol };
        return { formulas: sol.formulas || [], readouts: sol.readouts || [], state: Object.assign({ input: def.inputOf ? def.inputOf(p) : undefined }, sol.state || {}), explain: sol.explain || {}, sol };
      },
      steps(p, c) { return (c.sol.steps || []).map((s) => ({ title: s.title, text: s.text || '' })); },
      draw(g, St) {
        const sol = St.c.sol; D.clear(g, '#f8fafc');
        const layout = sol.ok ? def.layout || 'split' : 'work-only';
        const wBox = layout === 'split' ? [8, 8, 452, 544] : layout === 'wide-plot' ? [8, 8, 360, 544] : [8, 8, 984, 544];
        M.Work.draw(g, wBox, sol.steps || [], Math.min(St.step, (sol.steps || []).length - 1), { title: def.workTitle || 'Step-by-step working', size: def.workSize });
        if (!sol.ok || layout === 'work-only') return;
        const pBox = layout === 'split' ? [468, 8, 524, 544] : [376, 8, 616, 544];
        try { def.plot(g, pBox, sol, St); } catch (e) { console.error(e); D.text(g, 'Graph not available for this input', pBox[0] + pBox[2] / 2, pBox[1] + pBox[3] / 2, { align: 'center', color: D.C.muted, size: 16 }); }
      },
    };
    return S[id];
  }

  /** Formula row helper. */
  const F = (name, formula, given, calc, result, unit) => ({ name, formula, given, calc, result, unit: unit || '—' });

  window.MAFrame = { define, F };
})();
