import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root = path.resolve(process.cwd(), '../..');
const toolsDir = path.join(root, 'smart-board-my-version', 'src', 'tools');
const context = {
  window: {
    EPDraw: {
      C: {},
      fmt: (n, d) => Number(n).toFixed(d ?? 2),
      clamp: (x, a, b) => Math.max(a, Math.min(b, x)),
      lerp: (a, b, t) => a + (b - a) * t,
      rad: (deg) => (deg * Math.PI) / 180,
    },
  },
  console,
  Math,
};

const scriptFiles = [
  'chem-catalog.js',
  'chem-sims-u1.js',
  'chem-sims-u2.js',
  'chem-sims-u3.js',
  'chem-sims-u4.js',
  'chem-sims-u5.js',
  'chem-sims-lab.js',
];

for (const file of scriptFiles) {
  vm.runInNewContext(fs.readFileSync(path.join(toolsDir, file), 'utf8'), context, { filename: file });
}

const catalog = context.window.EduverseChemCatalog;
const sims = context.window.ChemSims;

assert.equal(catalog.simulations.length, 30, 'U25CY103 should contain 30 simulations');

for (const item of catalog.simulations) {
  const spec = sims[item.id];
  assert.ok(spec, `Simulation ${item.id} must be defined in ChemSims`);
  assert.ok(Array.isArray(spec.params), `${item.id} must have params array`);
  assert.equal(typeof spec.steps, 'function', `${item.id} must have steps function`);
  assert.equal(typeof spec.compute, 'function', `${item.id} must have compute function`);
  assert.equal(typeof spec.draw, 'function', `${item.id} must have draw function`);

  const values = Object.fromEntries(spec.params.map((p) => [p.key, p.default]));
  const calc = spec.compute(values);
  assert.ok(calc, `${item.id} compute must return an object`);
  assert.ok(Array.isArray(calc.readouts), `${item.id} compute must return readouts array`);
  assert.ok(calc.readouts.length > 0, `${item.id} must produce at least one readout`);
  assert.ok(Array.isArray(calc.formulas), `${item.id} compute must return formulas array`);

  const steps = spec.steps(values, calc);
  assert.ok(Array.isArray(steps), `${item.id} steps must return an array`);
  assert.ok(steps.length > 0, `${item.id} must have at least one step`);
}

console.log('✅ Engineering Chemistry simulation test passed: 30 / 30 simulations fully validated.');
