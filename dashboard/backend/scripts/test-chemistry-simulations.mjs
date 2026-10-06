import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root = path.resolve(import.meta.dirname, '../../..');
const toolsDir = path.join(root, 'dashboard', 'frontend', 'public', 'smartboard', 'tools');

class MockContext2D {
  constructor() {
    this.__base = [1, 0, 0, 1, 0, 0];
    this.fillStyle = '#000';
    this.strokeStyle = '#000';
    this.lineWidth = 1;
    this.lineCap = 'butt';
    this.lineJoin = 'miter';
    this.font = '10px sans-serif';
    this.textAlign = 'start';
    this.textBaseline = 'alphabetic';
    this.shadowBlur = 0;
    this.shadowColor = 'transparent';
  }
  save() {}
  restore() {}
  beginPath() {}
  closePath() {}
  moveTo() {}
  lineTo() {}
  arc() {}
  arcTo() {}
  rect() {}
  stroke() {}
  fill() {}
  clearRect() {}
  fillRect() {}
  strokeRect() {}
  fillText() {}
  strokeText() {}
  measureText(str) { return { width: (str || '').length * 8 }; }
  translate() {}
  scale() {}
  rotate() {}
  setTransform() {}
  createLinearGradient() { return { addColorStop() {} }; }
  createRadialGradient() { return { addColorStop() {} }; }
  setLineDash() {}
  ellipse() {}
  roundRect() {}
  bezierCurveTo() {}
  quadraticCurveTo() {}
}

const context = {
  window: {
    CanvasRenderingContext2D: MockContext2D,
  },
  console,
  Math,
  Number,
  String,
  Boolean,
  Array,
  Object,
  JSON,
};
context.window.window = context.window;

const scriptFiles = [
  'chem-catalog.js',
  'ep-draw.js',
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
const D = context.window.EPDraw;

assert.equal(catalog.simulations.length, 30, 'U25CY103 should contain 30 simulations');

for (const item of catalog.simulations) {
  const spec = sims[item.id];
  assert.ok(spec, `Simulation ${item.id} must be defined in ChemSims`);
  assert.ok(Array.isArray(spec.params), `${item.id} must have params array`);
  assert.equal(typeof spec.steps, 'function', `${item.id} must have steps function`);
  assert.equal(typeof spec.compute, 'function', `${item.id} must have compute function`);
  assert.equal(typeof spec.draw, 'function', `${item.id} must have draw function`);

  const values = Object.fromEntries(spec.params.map((p) => [p.key, p.default]));
  if (spec.modes && spec.modes.length) values.mode = spec.modes[0].key;

  const calc = spec.compute(values);
  assert.ok(calc, `${item.id} compute must return an object`);
  assert.ok(Array.isArray(calc.readouts), `${item.id} compute must return readouts array`);
  assert.ok(calc.readouts.length > 0, `${item.id} must produce at least one readout`);
  assert.ok(Array.isArray(calc.formulas), `${item.id} compute must return formulas array`);

  const steps = spec.steps(values, calc);
  assert.ok(Array.isArray(steps), `${item.id} steps must return an array`);
  assert.ok(steps.length > 0, `${item.id} must have at least one step`);

  // Test draw for all steps
  const mockCtx = new MockContext2D();
  const simState = {
    p: values,
    c: calc,
    ui: spec.initUi ? spec.initUi(values) : {},
    step: 0,
    st: 4,
    t: 1.5,
    dur: 4,
    mode: values.mode,
    view: { yaw: -0.6, pitch: 0.42, zoom: 1, panX: 0, panY: 0 },
    playing: false,
    D,
    steps,
    world: { zoom: 1, toScreen: (x, y) => [x, y], toWorld: (x, y) => [x, y], apply: () => {} },
  };

  for (let sIdx = 0; sIdx < steps.length; sIdx++) {
    simState.step = sIdx;
    spec.draw(mockCtx, simState);
  }
}

console.log('✅ Engineering Chemistry simulation test passed: 30 / 30 simulations, calculations, formulas & canvas drawing validated.');
