import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root = path.resolve(process.cwd(), '../..');
const toolsDir = path.join(root, 'smart-board-my-version', 'src', 'tools');
const context = { window: {}, console };
for (const file of ['chem-catalog.js', 'chemistry-data.js', 'chemistry-engines.js', 'chem-sims.js']) {
  vm.runInNewContext(fs.readFileSync(path.join(toolsDir, file), 'utf8'), context, { filename: file });
}

const catalog = context.window.EduverseChemCatalog;
const sims = context.window.ChemSims;
assert.equal(catalog.simulations.length, 68, 'U21CY101 should contain 68 simulations');
assert.equal(Object.keys(sims).length, 68, 'every catalogue item needs a logic definition');

const run = (id, values) => sims[id].compute(values);
assert.equal(run('chem-hardness-water', { ca: 80, mg: 40, temperature: 25 }).readouts[0].value, '120.0 mg/L');
assert.equal(run('chem-edta-hardness', { edtaVolume: 20, edtaMolarity: 0.01, sampleVolume: 50, pH: 10 }).readouts[2].value, '400.0 mg/L');
assert.equal(run('chem-electrochemical-cell', { cathode: 'Cu', anode: 'Zn', concentration: 1 }).readouts[3].value, 'Yes');
assert.equal(run('chem-degree-polymerization', { polymerMass: 56000, repeatMass: 56, polydispersity: 1.8 }).readouts[0].value, '1000');
assert.equal(run('chem-lab-potentiometric', { titrant: 22, potential: 485, slope: 70 }).state.visualizationState.graph.length, 26);
assert.equal(run('chem-lab-ph', { acidVolume: 10, baseVolume: 9.5, baseMolarity: .1 }).state.visualizationState.graph.length, 26);
assert.ok(sims['chem-lab-edta'].validate({ edtaVolume: 20, edtaMolarity: .01, sampleVolume: 0, pH: 10 }).length > 0);
for (const item of catalog.simulations) {
  const spec = sims[item.id];
  const values = Object.fromEntries(spec.params.map((p) => [p.key, p.default]));
  assert.equal(spec.validate(values).length, 0, item.id + ' defaults should be valid');
  assert.ok(spec.compute(values).readouts.length, item.id + ' should produce readouts');
}
console.log('Engineering Chemistry simulation checks passed:', catalog.simulations.length);
