import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const source = readFileSync(new URL('../src/tools/dsa-simulation.js', import.meta.url), 'utf8');
const plain = (value) => JSON.parse(JSON.stringify(value));
const state = (api) => plain(api.getState());
const frames = (api) => plain(api.getFrames());

function createHarness() {
  const elements = new Map();
  const makeElement = () => ({
    value: '', textContent: '', innerHTML: '', disabled: false,
    classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
    style: { setProperty() {} },
    setAttribute() {},
  });
  const document = { getElementById(id) {
    if (!elements.has(id)) elements.set(id, makeElement());
    return elements.get(id);
  } };
  const window = {
    location: { search: '?test=1', origin: 'http://localhost' },
    parent: null,
    setInterval,
    clearInterval,
    setTimeout,
    clearTimeout,
  };
  vm.runInNewContext(source, { window, document, URLSearchParams }, { filename: 'dsa-simulation.js' });
  return window.__EDUVERSE_DSA_TEST_API__;
}

test('input validation accepts empty/small lists and rejects malformed, oversized, and out-of-range data', () => {
  const api = createHarness();
  assert.deepEqual(plain(api.validateInput('')), []);
  assert.deepEqual(plain(api.validateInput('10, 20;30')), [10, 20, 30]);
  assert.throws(() => api.validateInput('1, nope, 3'), /whole numbers/);
  assert.throws(() => api.validateInput(Array.from({ length: 31 }, (_, i) => i).join(',')), /Maximum 30/);
  assert.throws(() => api.validateInput('1000001'), /-1,000,000 to 1,000,000/);
});

test('array selection, insertion, update, and deletion change the indexed data', () => {
  const api = createHarness();
  api.selectCategory('array', [10, 20, 30]);
  api.arrayAction('Select', 0, 1);
  assert.match(frames(api).at(-1).operation, /Select index 1/);
  api.arrayAction('Add', 40, 3);
  api.arrayAction('Update', 25, 1);
  api.arrayAction('Remove', 0, 0);
  assert.deepEqual(state(api).values, [25, 30, 40]);
});

test('stack enforces empty/full conditions and completes push/pop operations', () => {
  const api = createHarness();
  api.selectCategory('stack', []);
  api.stackAction('Pop', 0, 2, true);
  assert.match(state(api).messages.at(-1), /empty/);
  api.stackAction('Push', 10, 2, true);
  api.stackAction('Push', 20, 2, true);
  api.stackAction('Push', 30, 2, true);
  assert.match(state(api).messages.at(-1), /full/);
  api.stackAction('Pop', 0, 2, true);
  assert.deepEqual(state(api).values, [10]);
});

test('linear queue rejects overflow and circular queue wraps REAR to slot zero', () => {
  const api = createHarness();
  api.selectCategory('queue', [1, 2]);
  api.queueAction('Enqueue', 3, 2, false);
  assert.match(api.getState().messages.at(-1), /full/);
  api.selectCategory('circular-queue', [1, 2, 3]);
  api.queueAction('Dequeue', 0, 3, true);
  api.queueAction('Enqueue', 4, 3, true);
  const queueState = state(api).queueState;
  assert.equal(queueState.rear, 0);
  assert.equal(queueState.front, 1);
  assert.deepEqual(queueState.queueSlots, [4, 2, 3]);
});

test('linked list inserts and deletes by position while preserving order', () => {
  const api = createHarness();
  api.selectCategory('linked-list', [10, 20, 30]);
  api.linkedListAction('Insert at position', 15, 1);
  assert.deepEqual(state(api).values, [10, 15, 20, 30]);
  api.linkedListAction('Delete from position', 0, 2);
  assert.deepEqual(state(api).values, [10, 15, 30]);
  api.linkedListAction('Insert at position', 12, 50);
  assert.match(state(api).messages.at(-1), /outside/);
});

test('linear and binary search show comparison steps and binary search warns on unsorted input', () => {
  const api = createHarness();
  api.selectCategory('searching', [10, 20, 30, 40, 50, 60, 70]);
  api.linearSearch(40);
  assert.equal(frames(api).at(-1).found, 3);
  assert.equal(frames(api).at(-1).comparisons, 4);
  api.setAlgorithm('binary');
  api.binarySearch(60);
  assert.equal(frames(api).at(-1).found, 5);
  assert.equal(frames(api).at(-1).comparisons, 2);
  api.selectCategory('searching', [10, 3, 8, 1]);
  api.setAlgorithm('binary');
  api.binarySearch(8);
  assert.match(state(api).messages.at(-1), /requires sorted data/i);
});

for (const algorithm of ['bubble', 'selection', 'insertion', 'merge', 'quick']) {
  test(`${algorithm} sort reaches an ordered final state`, () => {
    const api = createHarness();
    api.selectCategory('sorting', [5, 3, 8, 1, 2, 3]);
    api.sort(algorithm);
    const trace = frames(api);
    assert.ok(trace.length > 2, 'the algorithm must expose intermediate steps');
    assert.deepEqual(trace.at(-1).values, [1, 2, 3, 3, 5, 8]);
  });
}

test('BST inserts, searches, deletes, and inorder traversal preserve BST order', () => {
  const api = createHarness();
  api.selectCategory('bst', [50, 30, 70, 20, 40, 60, 80]);
  api.bstInsert(65);
  api.bstSearch(65);
  assert.match(frames(api).at(-1).operation, /Found 65/);
  api.bstDelete(50);
  api.treeTraversal('inorder');
  assert.deepEqual(frames(api).at(-1).traversal, [20, 30, 40, 60, 65, 70, 80]);
});

test('BFS and DFS visit connected nodes and report disconnected graph vertices', () => {
  const api = createHarness();
  api.selectCategory('graph');
  api.graphTraversal('bfs', 'A');
  assert.deepEqual(frames(api).at(-1).visited, ['A', 'B', 'C', 'D', 'E', 'F']);
  api.graphTraversal('dfs', 'A');
  assert.equal(frames(api).at(-1).visited.length, 6);
  api.selectCategory('graph', { nodes: ['A', 'B', 'C'], edges: [['A', 'B', 1], ['B', 'A', 1]] });
  api.graphTraversal('bfs', 'A');
  assert.match(frames(api).at(-1).why, /disconnected.*C/i);
});

test('manual final step can mark a multi-step assignment as complete', () => {
  const api = createHarness();
  api.selectCategory('searching', [1, 2, 3]);
  api.linearSearch(3);
  api.moveTo(frames(api).length - 1);
  assert.equal(state(api).cursor, frames(api).length - 1);
  assert.equal(state(api).completed, true);
});
