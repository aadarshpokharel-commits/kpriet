// Deep correctness check of all 10 DSA simulations against independent reference implementations.
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../src/tools/dsa-simulation.js', import.meta.url), 'utf8');
const plain = (v) => JSON.parse(JSON.stringify(v));
function harness() {
  const elements = new Map();
  const el = () => ({ value: '', textContent: '', innerHTML: '', disabled: false, checked: false,
    classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } }, style: { setProperty() {} },
    setAttribute() {}, addEventListener() {}, querySelectorAll() { return []; }, closest() { return null; }, appendChild() {}, selectedOptions: [] });
  const document = { getElementById(id) { if (!elements.has(id)) elements.set(id, el()); return elements.get(id); }, createElement: el, addEventListener() {}, body: el() };
  const window = { location: { search: '?test=1', origin: 'http://localhost' }, parent: null, setInterval, clearInterval, setTimeout, clearTimeout, addEventListener() {} };
  vm.runInNewContext(source, { window, document, URLSearchParams }, { filename: 'dsa-simulation.js' });
  return window.__EDUVERSE_DSA_TEST_API__;
}
let seed = 12345; const rnd = (n) => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed % n; };
const randList = (len, max = 60) => Array.from({ length: len }, () => rnd(max) + 1);
const fails = {}; const counts = {};
function check(name, ok, detail) { counts[name] = (counts[name] || 0) + 1; if (!ok) { (fails[name] ||= []).push(detail); } }
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const lastFrame = (api) => plain(api.getFrames()).at(-1);
const vals = (api) => plain(api.getState()).values;

// 1. ARRAYS
for (let t = 0; t < 300; t++) {
  const api = harness(); let ref = randList(1 + rnd(8)); api.selectCategory('array', ref.slice());
  for (let k = 0; k < 6; k++) {
    const op = ['Add', 'Remove', 'Update', 'Select'][rnd(4)]; const v = rnd(99); const i = rnd(ref.length + 2);
    if (op === 'Add') { if (i <= ref.length) ref.splice(i, 0, v); }
    if (op === 'Remove' && i < ref.length) ref.splice(i, 1);
    if (op === 'Update' && i < ref.length) ref[i] = v;
    api.arrayAction(op, v, i);
    check('Arrays', eq(vals(api), ref), `${op}(${v}@${i}) got ${vals(api)} want ${ref}`);
    if (op === 'Select' && i < ref.length) check('Arrays', /Select index/.test(lastFrame(api).operation) && lastFrame(api).selectedValue === ref[i], 'select value');
  }
}
// 2. STACK
for (let t = 0; t < 300; t++) {
  const api = harness(); const cap = 1 + rnd(6); const ref = []; api.selectCategory('stack', []);
  for (let k = 0; k < 12; k++) {
    const op = ['Push', 'Pop', 'Peek'][rnd(3)]; const v = rnd(99);
    if (op === 'Push' && ref.length < cap) ref.push(v);
    if (op === 'Pop' && ref.length) ref.pop();
    api.stackAction(op, v, cap, true);
    check('Stack', eq(vals(api), ref), `${op} got ${vals(api)} want ${ref}`);
    if (op === 'Peek' && ref.length) check('Stack', lastFrame(api).top === ref.at(-1), 'peek');
  }
}
// 3/4. QUEUE + CIRCULAR QUEUE
for (const circular of [false, true]) {
  const name = circular ? 'Circular Queue' : 'Queue';
  for (let t = 0; t < 300; t++) {
    const api = harness(); const cap = 2 + rnd(5); api.selectCategory(circular ? 'circular-queue' : 'queue', []);
    const ref = []; let rear = -1; // linear queue: rear only moves forward until the queue empties
    for (let k = 0; k < 16; k++) {
      const op = rnd(2) ? 'Enqueue' : 'Dequeue'; const v = rnd(99);
      if (op === 'Enqueue') {
        const full = circular ? ref.length >= cap : (ref.length >= cap || rear >= cap - 1);
        if (!full) { ref.push(v); rear++; }
      } else if (ref.length) { ref.shift(); if (!ref.length) rear = -1; }
      api.queueAction(op, v, cap, circular);
      check(name, eq(vals(api), ref), `${op}(${v}) cap${cap} got ${vals(api)} want ${ref}`);
      const qs = plain(api.getState()).queueState;
      if (ref.length && qs) check(name, qs.queueSlots[qs.front] === ref[0] && qs.queueSlots[qs.rear] === ref.at(-1), 'front/rear pointers');
    }
  }
}
// 5. LINKED LIST
for (let t = 0; t < 300; t++) {
  const api = harness(); const ref = randList(rnd(6)); api.selectCategory('linked-list', ref.slice());
  for (let k = 0; k < 8; k++) {
    const ops = ['Insert at beginning', 'Insert at end', 'Insert at position', 'Delete from beginning', 'Delete from end', 'Delete from position', 'Search'];
    const op = ops[rnd(ops.length)]; const v = rnd(99); const p = rnd(ref.length + 2);
    if (op === 'Insert at beginning') ref.unshift(v);
    if (op === 'Insert at end') ref.push(v);
    if (op === 'Insert at position' && p <= ref.length) ref.splice(p, 0, v);
    if (op === 'Delete from beginning' && ref.length) ref.shift();
    if (op === 'Delete from end' && ref.length) ref.pop();
    if (op === 'Delete from position' && p < ref.length) ref.splice(p, 1);
    api.linkedListAction(op, v, p);
    check('Linked List', eq(vals(api), ref), `${op}(${v}@${p}) got ${vals(api)} want ${ref}`);
    if (op === 'Search' && ref.length) { const f = lastFrame(api); check('Linked List', ref.includes(v) ? f.found === ref.indexOf(v) : /not found/.test(f.operation), 'search'); }
  }
}
// 6. BINARY TREE traversals (level-order array representation)
function refTrav(a, order) { const out = []; const w = (i) => { if (i >= a.length) return; if (order === 'preorder') out.push(a[i]); w(2 * i + 1); if (order === 'inorder') out.push(a[i]); w(2 * i + 2); if (order === 'postorder') out.push(a[i]); }; if (order === 'levelorder') return a.slice(); w(0); return out; }
for (let t = 0; t < 300; t++) {
  const api = harness(); const a = randList(1 + rnd(12)); api.selectCategory('binary-tree', a.slice());
  for (const order of ['preorder', 'inorder', 'postorder', 'levelorder']) { api.treeTraversal(order); check('Binary Tree', eq(lastFrame(api).traversal, refTrav(a, order)), `${order} of ${a}`); }
}
// 7. BST
function bstInsertRef(root, v) { if (!root) return { v, l: null, r: null }; if (v < root.v) root.l = bstInsertRef(root.l, v); else if (v > root.v) root.r = bstInsertRef(root.r, v); return root; }
function bstDeleteRef(root, v) { if (!root) return null; if (v < root.v) root.l = bstDeleteRef(root.l, v); else if (v > root.v) root.r = bstDeleteRef(root.r, v); else { if (!root.l) return root.r; if (!root.r) return root.l; let s = root.r; while (s.l) s = s.l; root.v = s.v; root.r = bstDeleteRef(root.r, s.v); } return root; }
const inorder = (n, o = []) => { if (n) { inorder(n.l, o); o.push(n.v); inorder(n.r, o); } return o; };
const preorder = (n, o = []) => { if (n) { o.push(n.v); preorder(n.l, o); preorder(n.r, o); } return o; };
for (let t = 0; t < 300; t++) {
  const api = harness(); const init = [...new Set(randList(1 + rnd(9), 99))]; let root = null; init.forEach((v) => { root = bstInsertRef(root, v); });
  api.selectCategory('bst', init.slice());
  for (let k = 0; k < 8; k++) {
    const op = ['insert', 'delete', 'search'][rnd(3)]; const v = rnd(99) + 1; const present = inorder(root).includes(v);
    if (op === 'insert') { api.bstInsert(v); if (!present) root = bstInsertRef(root, v); }
    if (op === 'delete') { api.bstDelete(v); if (present) root = bstDeleteRef(root, v); }
    if (op === 'search') { api.bstSearch(v); check('Binary Search Tree', present ? /Found/.test(lastFrame(api).operation) : /not found/.test(lastFrame(api).operation), `search ${v}`); }
    { let built = null; vals(api).forEach((x) => { built = bstInsertRef(built, x); }); check('Binary Search Tree', eq(preorder(built), preorder(root)), `${op}(${v}) tree got ${preorder(built)} want ${preorder(root)}`); }
    if (root) { api.bstMinMax('min'); check('Binary Search Tree', new RegExp(`Minimum = ${Math.min(...inorder(root))}\\.`).test(lastFrame(api).operation), 'min'); api.bstMinMax('max'); check('Binary Search Tree', new RegExp(`Maximum = ${Math.max(...inorder(root))}\\.`).test(lastFrame(api).operation), 'max'); }
    api.treeTraversal('inorder'); if (inorder(root).length) check('Binary Search Tree', eq(lastFrame(api).traversal, inorder(root)), 'inorder sorted');
  }
}
// 8. GRAPH BFS / DFS
for (let t = 0; t < 300; t++) {
  const api = harness(); const n = 3 + rnd(6); const nodes = Array.from({ length: n }, (_, i) => String.fromCharCode(65 + i)); const edges = [];
  for (let k = 0; k < n + rnd(n); k++) { const a = nodes[rnd(n)]; const b = nodes[rnd(n)]; if (a !== b && !edges.some((e) => e[0] === a && e[1] === b)) { edges.push([a, b, 1]); if (!edges.some((e) => e[0] === b && e[1] === a)) edges.push([b, a, 1]); } }
  const adj = (x) => [...new Set(edges.filter((e) => e[0] === x).map((e) => e[1]))];
  const bfs = []; { const seen = new Set(['A']); const q = ['A']; while (q.length) { const x = q.shift(); bfs.push(x); adj(x).forEach((y) => { if (!seen.has(y)) { seen.add(y); q.push(y); } }); } }
  const dfs = []; { const seen = new Set(); const go = (x) => { seen.add(x); dfs.push(x); adj(x).forEach((y) => { if (!seen.has(y)) go(y); }); }; go('A'); }
  api.selectCategory('graph', { nodes, edges });
  api.graphTraversal('bfs', 'A'); check('Graph (BFS/DFS)', eq(lastFrame(api).visited, bfs), `BFS got ${lastFrame(api).visited} want ${bfs} edges ${JSON.stringify(edges)}`);
  api.graphTraversal('dfs', 'A'); check('Graph (BFS/DFS)', eq(lastFrame(api).visited, dfs), `DFS got ${lastFrame(api).visited} want ${dfs} edges ${JSON.stringify(edges.filter((e) => e[0] < e[1]))}`);
}
// 9. SEARCHING
for (let t = 0; t < 400; t++) {
  const api = harness(); const a = randList(1 + rnd(12), 40); const target = rnd(45);
  api.selectCategory('searching', a.slice()); api.linearSearch(target);
  const f = lastFrame(api); const idx = a.indexOf(target);
  check('Searching', idx >= 0 ? f.found === idx && f.comparisons === idx + 1 : /not found/.test(f.operation) && f.comparisons === a.length, `linear ${target} in ${a}`);
  const s = a.slice().sort((x, y) => x - y); api.selectCategory('searching', s.slice()); api.setAlgorithm('binary'); api.binarySearch(target);
  const g = lastFrame(api);
  check('Searching', s.includes(target) ? s[g.found] === target : /not found/.test(g.operation), `binary ${target} in ${s}`);
  check('Searching', g.comparisons <= Math.floor(Math.log2(s.length)) + 1, `binary comparisons ${g.comparisons} for n=${s.length}`);
}
// 10. SORTING
for (let t = 0; t < 300; t++) {
  const a = randList(rnd(12), 30); const want = a.slice().sort((x, y) => x - y);
  for (const alg of ['bubble', 'selection', 'insertion', 'merge', 'quick']) {
    const api = harness(); api.selectCategory('sorting', a.slice()); api.sort(alg);
    const fr = plain(api.getFrames()); const final = fr.at(-1);
    const out = alg === 'merge' ? (final.groups ? final.groups[0] : final.values) : final.values;
    check('Sorting', eq(out, want), `${alg} ${a} -> ${out}`);
    if (alg === 'bubble') { let inv = 0; for (let i = 0; i < a.length; i++) for (let j = i + 1; j < a.length; j++) if (a[i] > a[j]) inv++; check('Sorting', final.swaps === inv, `bubble swaps ${final.swaps} != inversions ${inv}`); }
  }
}

console.log('Simulation                 checks   result');
for (const name of Object.keys(counts)) {
  const f = fails[name] || []; console.log(`${name.padEnd(26)} ${String(counts[name]).padStart(6)}   ${f.length ? `FAIL (${f.length})\n      e.g. ${f[0]}` : 'OK'}`);
}
