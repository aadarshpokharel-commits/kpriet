'use strict';

// Shared DSA simulator used in the dashboard runner and the Smart Board.
(function () {
  const params = new URLSearchParams(window.location.search);
  const testMode = params.get('test') === '1';
  const testMessages = [];
  const $ = (id) => document.getElementById(id);
  const categorySelect = $('dsa-category');
  const algorithmSelect = $('dsa-algorithm');
  const valuesInput = $('dsa-values');
  const operationControls = $('dsa-operation-controls');
  const visualization = $('dsa-visualization');
  const toastEl = $('dsa-toast');
  const embedded = params.get('embedded') === '1';
  // Board mode: opened from the Smart Board simulation list for ONE simulation
  // (e.g. Stack). The Smart Board widget provides the title bar, so the lab's
  // own header and the simulation switcher are hidden.
  const lockedCategory = embedded && params.get('lock') === '1';
  const subjectContext = {
    subjectId: params.get('subjectId') || '', subjectName: params.get('subjectName') || '',
    subjectCode: params.get('subjectCode') || '', departmentId: params.get('departmentId') || '',
    departmentName: params.get('departmentName') || '', semesterId: params.get('semesterId') || '',
    semesterNumber: params.get('semesterNumber') || '', role: params.get('role') || 'student',
    unitNumber: params.get('unitNumber') || '', topic: params.get('topic') || '',
  };
  let assignedConfig = {};
  try { assignedConfig = JSON.parse(params.get('config') || '{}'); } catch (error) {}
  const labels = {
    array: 'Array', stack: 'Stack', queue: 'Queue', 'circular-queue': 'Circular Queue',
    'linked-list': 'Singly Linked List', 'binary-tree': 'Binary Tree', bst: 'Binary Search Tree',
    graph: 'Graph', searching: 'Searching', sorting: 'Sorting',
  };
  const algorithms = {
    array: [{ value: 'operations', label: 'Array operations' }],
    stack: [{ value: 'stack', label: 'Stack operations' }],
    queue: [{ value: 'queue', label: 'Linear queue operations' }],
    'circular-queue': [{ value: 'circular-queue', label: 'Circular queue operations' }],
    'linked-list': [{ value: 'linked-list', label: 'Linked list operations' }],
    'binary-tree': [{ value: 'traversal', label: 'Tree traversals' }],
    bst: [{ value: 'bst', label: 'BST operations' }],
    graph: [{ value: 'bfs', label: 'Breadth-first search (BFS)' }, { value: 'dfs', label: 'Depth-first search (DFS)' }],
    searching: [{ value: 'linear', label: 'Linear Search' }, { value: 'binary', label: 'Binary Search' }],
    sorting: [
      { value: 'bubble', label: 'Bubble Sort' }, { value: 'selection', label: 'Selection Sort' },
      { value: 'insertion', label: 'Insertion Sort' }, { value: 'merge', label: 'Merge Sort' },
      { value: 'quick', label: 'Quick Sort' },
    ],
  };
  const code = {
    array: ['for each index i in array', '    read or update array[i]', '    insert / remove at the chosen position'],
    stack: ['PUSH(value): add value at TOP', 'POP(): remove and return TOP', 'PEEK(): read TOP without removing it'],
    queue: ['ENQUEUE(value): add value at REAR', 'DEQUEUE(): remove and return FRONT', 'PEEK(): read FRONT without removing it'],
    'circular-queue': ['ENQUEUE(value):', '    rear = (rear + 1) mod capacity', '    place value at rear', 'DEQUEUE():', '    front = (front + 1) mod capacity'],
    'linked-list': ['node = new Node(value)', 'walk to the target position', 'previous.next = node', 'node.next = current'],
    'binary-tree': ['PREORDER(node): visit, left, right', 'INORDER(node): left, visit, right', 'POSTORDER(node): left, right, visit', 'LEVEL ORDER: visit each level'],
    bst: ['if value < node.value: move left', 'if value > node.value: move right', 'repeat until found or an empty link', 'insert at the empty link'],
    graph: ['add start node to queue / stack', 'while worklist is not empty:', '    remove next node and visit it', '    add unvisited neighbors'],
    linear: ['for i = 0 to n - 1', '    compare array[i] with target', '    if equal: return i', 'return NOT_FOUND'],
    binary: ['low = 0; high = n - 1', 'while low <= high:', '    mid = floor((low + high) / 2)', '    if array[mid] == target: return mid', '    if array[mid] < target: low = mid + 1', '    else: high = mid - 1'],
    bubble: ['for each pass through the array', '    compare neighboring values', '    swap if left value is greater', '    largest value settles at the end'],
    selection: ['for each position i:', '    minIndex = i', '    find the smallest remaining value', '    swap array[i] with array[minIndex]'],
    insertion: ['for i = 1 to n - 1', '    key = array[i]', '    shift larger values right', '    insert key into the open position'],
    merge: ['split the array into halves', 'recursively sort each half', 'compare the front of each half', 'copy the smaller value into the merge'],
    quick: ['pivot = last value in this range', 'move smaller values before the boundary', 'place pivot at the partition boundary', 'recursively sort both sides'],
  };
  const complexities = {
    array: [['Access', 'O(1)'], ['Search', 'O(n)'], ['Insert / Delete', 'O(n)'], ['Extra space', 'O(1)']],
    stack: [['Push', 'O(1)'], ['Pop', 'O(1)'], ['Peek', 'O(1)'], ['Extra space', 'O(n)']],
    queue: [['Enqueue', 'O(1)'], ['Dequeue', 'O(1)'], ['Peek', 'O(1)'], ['Extra space', 'O(n)']],
    'circular-queue': [['Enqueue', 'O(1)'], ['Dequeue', 'O(1)'], ['Peek', 'O(1)'], ['Extra space', 'O(capacity)']],
    'linked-list': [['Access', 'O(n)'], ['Search', 'O(n)'], ['Insert / Delete', 'O(1) at a known node'], ['Extra space', 'O(n)']],
    'binary-tree': [['Traversal', 'O(n)'], ['Search', 'O(n)'], ['Extra space', 'O(h)'], ['h', 'tree height']],
    bst: [['Search / Insert', 'O(log n) average'], ['Search / Insert', 'O(n) worst'], ['Delete', 'O(h)'], ['Extra space', 'O(h)']],
    graph: [['BFS / DFS', 'O(V + E)'], ['Space', 'O(V)'], ['V', 'vertices'], ['E', 'edges']],
    linear: [['Best', 'O(1)'], ['Average', 'O(n)'], ['Worst', 'O(n)'], ['Space', 'O(1)']],
    binary: [['Best', 'O(1)'], ['Average', 'O(log n)'], ['Worst', 'O(log n)'], ['Space', 'O(1)']],
    bubble: [['Best', 'O(n)'], ['Average', 'O(n²)'], ['Worst', 'O(n²)'], ['Space', 'O(1)']],
    selection: [['Best', 'O(n²)'], ['Average', 'O(n²)'], ['Worst', 'O(n²)'], ['Space', 'O(1)']],
    insertion: [['Best', 'O(n)'], ['Average', 'O(n²)'], ['Worst', 'O(n²)'], ['Space', 'O(1)']],
    merge: [['Best', 'O(n log n)'], ['Average', 'O(n log n)'], ['Worst', 'O(n log n)'], ['Space', 'O(n)']],
    quick: [['Best', 'O(n log n)'], ['Average', 'O(n log n)'], ['Worst', 'O(n²)'], ['Space', 'O(log n) average']],
  };
  const defaultData = String(assignedConfig.defaultExample || assignedConfig.initialData || '10, 20, 30, 40, 50, 60, 70');
  const defaultCategory = params.get('category') || assignedConfig.category || 'searching';
  const assignedTopic = params.get('topic') || assignedConfig.topic || '';
  let currentCategory = labels[defaultCategory] ? defaultCategory : 'searching';
  let values = [];
  let graph = { nodes: ['A', 'B', 'C', 'D', 'E', 'F'], edges: [['A', 'B', 1], ['B', 'A', 1], ['A', 'C', 1], ['C', 'A', 1], ['B', 'D', 1], ['D', 'B', 1], ['B', 'E', 1], ['E', 'B', 1], ['C', 'F', 1], ['F', 'C', 1]] };
  let frames = [];
  let cursor = 0;
  let timer = null;
  let toastTimer = null;
  let allowUnsortedBinary = false;
  let activityCompletionSent = false;
  let currentActivityId = params.get('simulationId') || '';
  let fixedCapacity = false;
  let queueCapacity = 8;
  let queueState = null;
  let graphDirected = false;
  let graphWeighted = false;

  function makeFrame(operation, why, extra = {}) {
    return {
      operation, why, next: 'Advance one step to continue.', values: values.slice(),
      comparisons: 0, swaps: 0, line: 0, ...extra,
    };
  }
  function stopPlayback() {
    if (timer) window.clearInterval(timer);
    timer = null;
    if (testMode) return;
    $('dsa-play').disabled = false;
    $('dsa-pause').disabled = true;
  }
  function showToast(message) {
    if (testMode) { testMessages.push(String(message)); return; }
    toastEl.textContent = message;
    toastEl.classList.add('visible');
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => toastEl.classList.remove('visible'), 2400);
  }
  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
  }
  function getToken() {
    try {
      const context = window.parent && window.parent !== window ? window.parent.CurrentSubjectContext : null;
      const valuesToTry = [context?.accessToken, context?.token, localStorage.getItem('eduverse_token'), sessionStorage.getItem('token')];
      return valuesToTry.find((value) => /^[\w-]+\.[\w-]+\.[\w-]+$/.test(String(value || ''))) || '';
    } catch (error) { return ''; }
  }
  function readNumbers(raw = valuesInput.value) {
    const text = String(raw || '').trim();
    if (!text) return [];
    const parts = text.split(/[\s,;]+/).filter(Boolean);
    if (parts.length > 30) throw new Error('Maximum 30 values for visualization.');
    const parsed = parts.map((part) => Number(part));
    if (parsed.some((value) => !Number.isInteger(value) || !Number.isFinite(value) || Math.abs(value) > 1000000)) throw new Error('Use whole numbers from -1,000,000 to 1,000,000.');
    return parsed;
  }
  function syncValues() {
    if (currentCategory === 'graph') {
      const nodes = String(valuesInput.value || '').split(/[\s,;]+/).filter(Boolean).map((node) => node.toUpperCase());
      if (nodes.length > 12) { showToast('Maximum 12 graph nodes for visualization.'); return false; }
      if (nodes.some((node) => node.length > 4) || new Set(nodes).size !== nodes.length) { showToast('Use unique node labels of up to 4 characters.'); return false; }
      graph = { nodes, edges: graph.edges.filter((edge) => nodes.includes(edge[0]) && nodes.includes(edge[1])) };
      renderOperationControls(); buildInitialTimeline(); render(); showToast(`${nodes.length} graph node${nodes.length === 1 ? '' : 's'} ready.`); return true;
    }
    try {
      values = readNumbers();
      if (currentCategory === 'bst' && new Set(values).size !== values.length) throw new Error('Binary Search Tree values must be distinct.');
      queueState = null;
      allowUnsortedBinary = false;
      $('dsa-binary-warning').classList.add('hidden');
      buildInitialTimeline();
      render();
      showToast(`${values.length} value${values.length === 1 ? '' : 's'} ready.`);
      return true;
    } catch (error) { showToast(error.message); return false; }
  }
  function setFrames(nextFrames) {
    stopPlayback();
    frames = nextFrames.length ? nextFrames : [makeFrame('Ready to begin.', 'Choose an operation to create a step-by-step trace.')];
    cursor = 0;
    if (!testMode) render();
  }
  function buildInitialTimeline() {
    const first = makeFrame(`${labels[currentCategory]} ready.`, 'Choose an operation to see each change to the internal state.', {
      visualKind: currentCategory, current: -1, comparing: [], sorted: [], visited: [],
      comparisons: 0, swaps: 0, line: 0,
    });
    if (currentCategory === 'queue' || currentCategory === 'circular-queue') {
      queueState = queueSnapshot(values, queueCapacity, currentCategory === 'circular-queue');
      Object.assign(first, queueState);
    }
    if (currentCategory === 'stack') first.stack = values.slice();
    if (currentCategory === 'linked-list' || currentCategory === 'binary-tree' || currentCategory === 'bst') first.treeValues = values.slice();
    if (currentCategory === 'graph') first.graph = cloneGraph(graph);
    frames = [first]; cursor = 0;
  }
  function cloneGraph(value) { return { nodes: value.nodes.slice(), edges: value.edges.map((edge) => edge.slice()) }; }
  function queueSnapshot(items, capacity, circular) {
    const slots = Array(Math.max(1, Math.min(20, capacity))).fill(null);
    const count = Math.min(items.length, slots.length);
    for (let index = 0; index < count; index += 1) slots[index] = items[index];
    return { queueSlots: slots, front: count ? 0 : -1, rear: count ? count - 1 : -1, size: count, circular };
  }
  function queueValues(state) {
    const items = [];
    for (let offset = 0; offset < state.size; offset += 1) {
      const index = state.circular ? (state.front + offset) % state.queueSlots.length : state.front + offset;
      if (state.queueSlots[index] != null) items.push(state.queueSlots[index]);
    }
    return items;
  }
  function currentFrame() { return frames[cursor] || frames[0] || makeFrame('Ready.', 'Choose an operation.'); }
  function addUnique(array, value) { if (!array.includes(value)) array.push(value); return array; }

  function linearSearch(target) {
    if (!values.length) return setFrames([makeFrame('Array is empty.', 'Add values before searching.', { visualKind: 'searching' })]);
    const trace = [makeFrame(`Start linear search for ${target}.`, 'Check each value in order until the target is found or the array ends.', { visualKind: 'searching', line: 0 })];
    let comparisons = 0; let found = false;
    for (let index = 0; index < values.length; index += 1) {
      comparisons += 1;
      const equal = values[index] === target;
      trace.push(makeFrame(`Compare ${target} with ${values[index]} at index ${index}.`, equal ? 'The values match, so the search can stop.' : 'The values do not match, so move to the next index.', {
        visualKind: 'searching', current: index, comparing: [index], found: equal ? index : -1,
        comparisons, line: 2, variables: { index, target }, next: equal ? `Value ${target} is found at index ${index}.` : 'Check the next array position.',
      }));
      if (equal) { found = true; break; }
    }
    if (!found) trace.push(makeFrame(`${target} was not found.`, 'Every array value was checked once.', { visualKind: 'searching', comparisons, line: 3, variables: { target } }));
    return setFrames(trace);
  }
  function binarySearch(target) {
    if (!values.length) return setFrames([makeFrame('Array is empty.', 'Add values before searching.', { visualKind: 'searching' })]);
    const isSorted = values.every((value, index) => index === 0 || values[index - 1] <= value);
    if (!isSorted && !allowUnsortedBinary) {
      $('dsa-binary-warning').classList.remove('hidden');
      showToast('Binary Search requires sorted data. Choose an option above.');
      return;
    }
    const trace = [makeFrame(`Start Binary Search for ${target}.`, isSorted ? 'The data is sorted, so each comparison can discard half the remaining range.' : 'Running on unsorted data can return an incorrect result; this trace is for demonstration only.', {
      visualKind: 'searching', low: 0, high: values.length - 1, line: 0,
    })];
    let low = 0; let high = values.length - 1; let comparisons = 0; let found = false;
    while (low <= high && trace.length < 90) {
      const mid = Math.floor((low + high) / 2); comparisons += 1;
      const value = values[mid];
      trace.push(makeFrame(`low=${low}, mid=${mid}, high=${high}. Compare ${target} with ${value}.`, `${target} ${target === value ? '=' : target > value ? '>' : '<'} ${value}. ${target === value ? 'The target is at the middle index.' : target > value ? 'When the data is sorted, every value at or left of mid is too small.' : 'When the data is sorted, every value at or right of mid is too large.'}`, {
        visualKind: 'searching', low, mid, high, current: mid, comparing: [mid], comparisons,
        discarded: Array.from({ length: values.length }, (_, index) => index).filter((index) => index < low || index > high),
        found: target === value ? mid : -1, line: 2, variables: { low, mid, high, value, target },
        next: target === value ? `Found ${target} at index ${mid}.` : target > value ? `Discard indexes ${low} through ${mid}; continue at index ${mid + 1}.` : `Discard indexes ${mid} through ${high}; continue through index ${mid - 1}.`,
      }));
      if (value === target) { found = true; break; }
      if (value < target) low = mid + 1; else high = mid - 1;
    }
    if (!found) trace.push(makeFrame(`${target} was not found.`, 'The remaining range is empty, so no index can contain the target.', { visualKind: 'searching', comparisons, line: 5, variables: { low, high, target } }));
    return setFrames(trace);
  }

  function sortFrames(algorithm) {
    const a = values.slice(); const trace = [makeFrame(`Start ${algorithmSelect.selectedOptions?.[0]?.textContent || `${algorithm.charAt(0).toUpperCase()}${algorithm.slice(1)} Sort`}.`, 'The array is unchanged. Follow each comparison and movement.', { visualKind: 'sorting', sorted: [], line: 0 })];
    let comparisons = 0; let swaps = 0;
    const record = (operation, why, extra = {}) => trace.push(makeFrame(operation, why, {
      visualKind: algorithm === 'merge' ? 'merge' : 'sorting', values: a.slice(), comparisons, swaps,
      line: 0, sorted: [], ...extra,
    }));
    if (algorithm === 'bubble') {
      for (let end = a.length - 1; end > 0; end -= 1) {
        let changed = false;
        for (let i = 0; i < end; i += 1) {
          comparisons += 1;
          record(`Compare ${a[i]} and ${a[i + 1]}.`, a[i] > a[i + 1] ? `${a[i]} is greater, so these neighbors must swap.` : 'They are already in ascending order; keep their positions.', { comparing: [i, i + 1], current: i, line: 1, pass: a.length - end });
          if (a[i] > a[i + 1]) {
            [a[i], a[i + 1]] = [a[i + 1], a[i]]; swaps += 1; changed = true;
            record(`Swap the neighboring values.`, `${a[i + 1]} moves right. The largest value seen in this pass settles at the end.`, { comparing: [i, i + 1], current: i + 1, line: 2, pass: a.length - end });
          }
        }
        if (!changed) break;
      }
      record('Bubble Sort complete.', 'Each pass places the next largest value in its final position.', { sorted: a.map((_, index) => index), line: 3 });
    } else if (algorithm === 'selection') {
      for (let i = 0; i < a.length - 1; i += 1) {
        let min = i;
        for (let j = i + 1; j < a.length; j += 1) {
          comparisons += 1;
          record(`Compare ${a[j]} with current minimum ${a[min]}.`, a[j] < a[min] ? `${a[j]} is smaller, so it becomes the new minimum.` : 'The current minimum stays unchanged.', { current: min, comparing: [min, j], minimum: min, line: 2, pass: i + 1 });
          if (a[j] < a[min]) min = j;
        }
        if (min !== i) { [a[i], a[min]] = [a[min], a[i]]; swaps += 1; record(`Move minimum ${a[i]} to index ${i}.`, 'The next position in the sorted prefix is now correct.', { current: i, comparing: [i, min], minimum: i, sorted: Array.from({ length: i + 1 }, (_, index) => index), line: 3, pass: i + 1 }); }
        else record(`${a[i]} is already the minimum for this pass.`, 'Extend the sorted prefix by one position.', { current: i, sorted: Array.from({ length: i + 1 }, (_, index) => index), line: 3, pass: i + 1 });
      }
      record('Selection Sort complete.', 'The sorted prefix now covers the whole array.', { sorted: a.map((_, index) => index), line: 3 });
    } else if (algorithm === 'insertion') {
      for (let i = 1; i < a.length; i += 1) {
        const key = a[i]; let j = i - 1;
        record(`Select ${key} as the key.`, 'Everything before the key is already sorted; find where the key belongs.', { current: i, sorted: Array.from({ length: i }, (_, index) => index), line: 1, pass: i });
        while (j >= 0 && a[j] > key) {
          comparisons += 1;
          record(`Compare ${key} with ${a[j]}.`, `${a[j]} is larger, so shift it one position to the right.`, { current: j, comparing: [j, j + 1], sorted: Array.from({ length: i }, (_, index) => index), line: 2, pass: i });
          a[j + 1] = a[j]; j -= 1;
          record(`Shift ${a[j + 1]} right.`, 'The open position moves one step left.', { current: j + 1, comparing: [j + 1], sorted: Array.from({ length: i }, (_, index) => index), line: 2, pass: i });
        }
        if (j >= 0) comparisons += 1;
        a[j + 1] = key;
        record(`Insert ${key} at index ${j + 1}.`, 'The sorted prefix grows by one element.', { current: j + 1, sorted: Array.from({ length: i + 1 }, (_, index) => index), line: 3, pass: i });
      }
      record('Insertion Sort complete.', 'The entire array is now in ascending order.', { sorted: a.map((_, index) => index), line: 3 });
    } else if (algorithm === 'merge') {
      let groups = a.map((value) => [value]);
      function split(part, depth) {
        if (part.length <= 1) return part.slice();
        const mid = Math.floor(part.length / 2); const left = part.slice(0, mid); const right = part.slice(mid);
        record(`Divide [${part.join(', ')}] into [${left.join(', ')}] and [${right.join(', ')}].`, 'Merge Sort keeps dividing each part until every part has one value.', { groups: [part.slice()], depth, line: 0, phase: 'Divide' });
        record('Continue with both smaller parts.', 'The two halves are now processed separately.', { groups: [left.slice(), right.slice()], depth: depth + 1, line: 0, phase: 'Divide' });
        const sortedLeft = split(left, depth + 1); const sortedRight = split(right, depth + 1);
        const merged = []; let li = 0; let ri = 0;
        while (li < sortedLeft.length && ri < sortedRight.length) {
          comparisons += 1;
          record(`Compare ${sortedLeft[li]} and ${sortedRight[ri]}.`, `${sortedLeft[li] <= sortedRight[ri] ? sortedLeft[li] : sortedRight[ri]} is smaller and goes next in the merged part.`, { groups: [sortedLeft.slice(li), sortedRight.slice(ri), merged.slice()], line: 2, phase: 'Merge', comparingValues: [sortedLeft[li], sortedRight[ri]] });
          if (sortedLeft[li] <= sortedRight[ri]) merged.push(sortedLeft[li++]); else merged.push(sortedRight[ri++]);
          record(`Add ${merged[merged.length - 1]} to the merged part.`, 'The next smallest front value is copied across.', { groups: [sortedLeft.slice(li), sortedRight.slice(ri), merged.slice()], line: 3, phase: 'Merge' });
        }
        merged.push(...sortedLeft.slice(li), ...sortedRight.slice(ri));
        groups = [merged.slice()];
        record(`Merge into [${merged.join(', ')}].`, 'Both halves are sorted, so combining them preserves ascending order.', { groups: [merged.slice()], line: 3, phase: 'Merge' });
        return merged;
      }
      const sorted = split(a.slice(), 0); a.splice(0, a.length, ...sorted);
      record('Merge Sort complete.', 'Every sorted group has been merged into one ordered array.', { groups: [a.slice()], sorted: a.map((_, index) => index), line: 3, phase: 'Complete' });
    } else if (algorithm === 'quick') {
      function partition(low, high) {
        const pivot = a[high]; let boundary = low;
        record(`Choose ${pivot} as the pivot.`, 'Values less than or equal to the pivot move to its left.', { current: high, pivot: high, low, high, boundary, line: 0 });
        for (let j = low; j < high; j += 1) {
          comparisons += 1;
          record(`Compare ${a[j]} with pivot ${pivot}.`, a[j] <= pivot ? `${a[j]} belongs before the pivot boundary.` : `${a[j]} stays on the right side of the pivot.`, { current: j, comparing: [j, high], pivot: high, low, high, boundary, line: 1 });
          if (a[j] <= pivot) {
            if (boundary !== j) { [a[boundary], a[j]] = [a[j], a[boundary]]; swaps += 1; }
            record(`Move ${a[boundary]} to the left partition.`, 'The partition boundary advances past values no larger than the pivot.', { current: boundary, comparing: [boundary, j], pivot: high, low, high, boundary: boundary + 1, line: 1 });
            boundary += 1;
          }
        }
        if (boundary !== high) { [a[boundary], a[high]] = [a[high], a[boundary]]; swaps += 1; }
        record(`Place pivot ${a[boundary]} at its final position ${boundary}.`, 'All left values are no larger and all right values are greater.', { current: boundary, pivot: boundary, low, high, boundary, line: 2, sorted: [boundary] });
        return boundary;
      }
      function quick(low, high) {
        if (low >= high) { if (low === high) record(`${a[low]} is a one-item range.`, 'A one-item range is already sorted.', { current: low, sorted: [low], low, high, line: 3 }); return; }
        const pivot = partition(low, high); quick(low, pivot - 1); quick(pivot + 1, high);
      }
      quick(0, a.length - 1);
      record('Quick Sort complete.', 'Each pivot is in its final position and all subranges are sorted.', { sorted: a.map((_, index) => index), line: 3 });
    }
    return setFrames(trace);
  }

  function arrayAction(action, value, index) {
    const a = values.slice(); const trace = [makeFrame(`Start ${action.toLowerCase()}.`, 'The selected index and value are shown before the array changes.', { visualKind: 'array', line: 0 })];
    if (action === 'Add') {
      if (a.length >= 30) return showToast('Maximum 30 values for visualization.');
      if (!Number.isInteger(index) || index < 0 || index > a.length) return showToast(`Choose an index from 0 to ${a.length}.`);
      if (index < a.length) trace.push(makeFrame(`Shift values from index ${a.length - 1} down to ${index} one place right.`, `Index ${index} must be free before ${value} can be written there.`, { visualKind: 'array', values: a.slice(), current: index, comparing: Array.from({ length: a.length - index }, (_, k) => index + k), line: 2 }));
      a.splice(index, 0, value); trace.push(makeFrame(`Insert ${value} at index ${index}.`, index === a.length - 1 ? 'Array indexes are zero-based; the new value occupies the next position.' : 'Values after this position moved one index right, so inserting costs O(n).', { visualKind: 'array', values: a, current: index, line: 2 }));
    } else if (action === 'Remove') {
      if (index < 0 || index >= a.length) return showToast('Choose an existing index.');
      const removed = a.splice(index, 1)[0]; trace.push(makeFrame(`Remove ${removed} at index ${index}.`, 'Values after this position shift one index left.', { visualKind: 'array', values: a, current: Math.min(index, a.length - 1), line: 2 }));
    } else if (action === 'Update') {
      if (index < 0 || index >= a.length) return showToast('Choose an existing index.');
      const old = a[index]; a[index] = value; trace.push(makeFrame(`Update index ${index} from ${old} to ${value}.`, 'Direct indexing reads and writes the selected array position.', { visualKind: 'array', values: a, current: index, line: 1 }));
    } else if (action === 'Select') {
      if (index < 0 || index >= a.length) return showToast('Choose an existing index.');
      trace.push(makeFrame(`Select index ${index}.`, `Index ${index} contains ${a[index]}. Array access uses the index to locate the value directly.`, { visualKind: 'array', values: a, current: index, line: 1, selectedValue: a[index] }));
    }
    values = a; valuesInput.value = a.join(', '); setFrames(trace);
  }

  function stackAction(action, value, capacity) {
    const stack = values.slice(); const trace = [makeFrame(`Start ${action.toLowerCase()}.`, 'Stack operations use one end called TOP.', { visualKind: 'stack', stack: stack.slice(), line: 0 })];
    if (action === 'Push') {
      if (fixedCapacity && stack.length >= capacity) return showToast('Stack is full. Increase the capacity to push another value.');
      stack.push(value); trace.push(makeFrame(`PUSH(${value}) adds ${value} at TOP.`, 'The most recently added item becomes the next item removed (LIFO).', { visualKind: 'stack', stack, current: stack.length - 1, line: 0, next: `${value} is now the TOP item.` }));
    } else if (action === 'Pop') {
      if (!stack.length) return showToast('Stack is empty; POP is not available.');
      const removed = stack.pop(); trace.push(makeFrame(`POP removes ${removed} from TOP.`, 'Only the top item is removed; the item below it becomes TOP.', { visualKind: 'stack', stack, current: stack.length - 1, line: 1, removed, next: stack.length ? `${stack[stack.length - 1]} is the new TOP.` : 'The stack is now empty.' }));
    } else if (action === 'Is Empty' || action === 'Is Full') {
      const result = action === 'Is Empty' ? stack.length === 0 : fixedCapacity && stack.length >= capacity;
      trace.push(makeFrame(`${action}: ${result ? 'Yes' : 'No'}.`, action === 'Is Empty' ? 'An empty stack has no TOP value.' : fixedCapacity ? `The stack stores ${stack.length} of ${capacity} allowed items.` : 'This stack uses a dynamic capacity, so it is not full.', { visualKind: 'stack', stack, current: stack.length - 1, line: 0, next: `Stack size = ${stack.length}${fixedCapacity ? ` of ${capacity}` : ''}.` }));
    } else {
      const top = stack[stack.length - 1];
      trace.push(makeFrame(top === undefined ? 'PEEK: the stack is empty.' : `PEEK reads ${top} from TOP.`, 'PEEK observes the top item without removing it.', { visualKind: 'stack', stack, current: stack.length - 1, line: 2, top, next: 'The stack contents stay unchanged.' }));
    }
    values = stack; valuesInput.value = stack.join(', '); setFrames(trace);
  }

  function queueAction(action, value, capacity, circular) {
    const state = queueState && queueState.circular === circular ? { ...queueState, queueSlots: queueState.queueSlots.slice() } : queueSnapshot(values, capacity, circular);
    if (state.queueSlots.length !== capacity) {
      const resized = queueSnapshot(queueValues(state), capacity, circular);
      Object.assign(state, resized);
    }
    const trace = [makeFrame(`Start ${action.toLowerCase()}.`, 'Queue operations add at REAR and remove from FRONT (FIFO).', { visualKind: currentCategory, ...state, queueSlots: state.queueSlots.slice(), line: 0 })];
    if (action === 'Enqueue') {
      if (state.size >= state.queueSlots.length || (!circular && state.rear >= state.queueSlots.length - 1)) return showToast('Queue is full. Dequeue an item or increase capacity.');
      const rear = circular ? (state.rear + 1) % state.queueSlots.length : state.rear + 1;
      state.queueSlots[rear] = value; state.rear = rear; state.front = state.front < 0 ? rear : state.front; state.size += 1;
      trace.push(makeFrame(`ENQUEUE(${value}) places ${value} at REAR (${rear}).`, circular && rear === 0 ? 'REAR wrapped from the last slot to slot 0.' : 'The item joins the back of the queue and waits behind earlier items.', { visualKind: currentCategory, ...state, queueSlots: state.queueSlots.slice(), values: values.concat(value), line: circular ? 1 : 0, next: 'The item will leave after the items before it.' }));
      values = queueValues(state);
    } else if (action === 'Dequeue') {
      if (!state.size || state.front < 0) return showToast('Queue is empty; DEQUEUE is not available.');
      const removed = state.queueSlots[state.front]; state.queueSlots[state.front] = null; state.size -= 1;
      if (!state.size) { state.front = -1; state.rear = -1; }
      else state.front = circular ? (state.front + 1) % state.queueSlots.length : state.front + 1;
      trace.push(makeFrame(`DEQUEUE removes ${removed} from FRONT.`, 'FIFO means the earliest enqueued item leaves first.', { visualKind: currentCategory, ...state, queueSlots: state.queueSlots.slice(), removed, values: values.slice(1), line: 4, next: state.size ? `${state.queueSlots[state.front]} is now at FRONT.` : 'The queue is now empty.' }));
      values = queueValues(state);
    } else if (action === 'Is Empty' || action === 'Is Full') {
      const result = action === 'Is Empty' ? state.size === 0 : state.size >= state.queueSlots.length;
      trace.push(makeFrame(`${action}: ${result ? 'Yes' : 'No'}.`, `The queue currently contains ${state.size} of ${state.queueSlots.length} items.`, { visualKind: currentCategory, ...state, queueSlots: state.queueSlots.slice(), line: 0 }));
    } else {
      const frontValue = state.front < 0 ? undefined : state.queueSlots[state.front];
      trace.push(makeFrame(frontValue === undefined ? 'PEEK: the queue is empty.' : `PEEK reads ${frontValue} at FRONT.`, 'PEEK shows the next item that would be dequeued and does not remove it.', { visualKind: currentCategory, ...state, queueSlots: state.queueSlots.slice(), line: 0, next: 'The queue remains unchanged.' }));
    }
    queueState = { ...state, queueSlots: state.queueSlots.slice() };
    valuesInput.value = values.join(', '); setFrames(trace);
  }

  function linkedListAction(action, value, position) {
    const a = values.slice(); const trace = [makeFrame(`Start ${action.toLowerCase()}.`, 'Each node stores a value and a reference to the next node.', { visualKind: 'linked-list', treeValues: a.slice(), line: 0 })];
    if ((action === 'Insert at position' && (position < 0 || position > a.length)) || (action === 'Delete from position' && (position < 0 || position >= a.length))) return showToast('Position is outside the current list.');
    const pos = position;
    if (action.startsWith('Insert')) {
      if (a.length >= 30) return showToast('Maximum 30 values for visualization.');
      if (action === 'Insert at beginning') {
        trace.push(makeFrame(`Create node ${value} before the current head.`, 'The new node points to the old head; then HEAD points to the new node.', { visualKind: 'linked-list', treeValues: [value, ...a], current: 0, pointer: 'head', line: 2 }));
        a.unshift(value);
      } else if (action === 'Insert at end') {
        trace.push(makeFrame(`Walk to the last node, then link ${value}.`, 'The last node’s next reference is updated to the new node.', { visualKind: 'linked-list', treeValues: [...a, value], current: a.length, pointer: 'current → next', line: 2 }));
        a.push(value);
      } else {
        if (pos > a.length) return showToast('Position must be between 0 and the current list size.');
        trace.push(makeFrame(`Walk to position ${pos} and keep the previous reference.`, 'The new node is linked between previous and current.', { visualKind: 'linked-list', treeValues: [...a.slice(0, pos), value, ...a.slice(pos)], current: pos, pointer: pos ? 'previous → next' : 'head', line: 1 }));
        a.splice(pos, 0, value);
      }
      trace.push(makeFrame(`Node ${value} is linked into the list.`, 'The references now connect every node to its successor and end at NULL.', { visualKind: 'linked-list', treeValues: a.slice(), current: action === 'Insert at beginning' ? 0 : Math.min(pos, a.length - 1), line: 3 }));
    } else if (action.startsWith('Delete')) {
      if (!a.length) return showToast('The list is empty.');
      let at = action === 'Delete from beginning' ? 0 : action === 'Delete from end' ? a.length - 1 : pos;
      if (at < 0 || at >= a.length) return showToast('Choose an existing list position.');
      const removed = a[at]; trace.push(makeFrame(`previous.next bypasses node ${removed}.`, 'The previous reference is redirected to the node after the one being removed.', { visualKind: 'linked-list', treeValues: a.slice(), current: at, pointer: at ? 'previous → current → next' : 'head → next', line: 2, removed }));
      a.splice(at, 1); trace.push(makeFrame(`Node ${removed} is detached.`, 'The remaining references form a continuous list ending in NULL.', { visualKind: 'linked-list', treeValues: a.slice(), current: Math.min(at, a.length - 1), line: 3 }));
    } else {
      if (!a.length) return showToast('The list is empty.');
      const found = a.indexOf(value); let seen = [];
      for (let i = 0; i < a.length; i += 1) {
        seen = seen.concat(i);
        trace.push(makeFrame(`Visit node ${a[i]} at position ${i}.`, a[i] === value ? `${value} matches; stop the traversal.` : 'Follow the next reference to continue.', { visualKind: 'linked-list', treeValues: a.slice(), current: i, visited: seen.slice(), pointer: `current = node ${a[i]}`, line: 1, comparisons: i + 1, found: a[i] === value ? i : -1 }));
        if (a[i] === value) break;
      }
      if (found < 0) trace.push(makeFrame(`${value} was not found.`, 'The traversal reached NULL after checking each node.', { visualKind: 'linked-list', treeValues: a.slice(), visited: seen, line: 3, comparisons: a.length }));
      return setFrames(trace);
    }
    values = a; valuesInput.value = a.join(', '); setFrames(trace);
  }

  function buildTree(valuesList) {
    if (!valuesList.length) return null;
    return valuesList.map((value, index) => ({ value, index, left: index * 2 + 1, right: index * 2 + 2 }));
  }
  function buildBstRoot(valuesList) {
    let root = null;
    let nextId = 0;
    valuesList.forEach((value) => {
      const node = { id: nextId++, value, left: null, right: null };
      if (!root) { root = node; return; }
      let current = root;
      while (true) {
        if (value === current.value) break;
        const side = value < current.value ? 'left' : 'right';
        if (!current[side]) { current[side] = node; break; }
        current = current[side];
      }
    });
    return root;
  }
  function snapshotBst(root) {
    const nodes = [];
    function visit(node) {
      if (!node) return;
      nodes.push({ id: node.id, value: node.value, left: node.left?.id ?? null, right: node.right?.id ?? null });
      visit(node.left); visit(node.right);
    }
    visit(root);
    return nodes;
  }
  function bstPreorderValues(root) {
    const result = [];
    function visit(node) { if (!node) return; result.push(node.value); visit(node.left); visit(node.right); }
    visit(root);
    return result;
  }
  function treeTraversal(order) {
    const isBst = currentCategory === 'bst';
    const nodes = isBst ? null : buildTree(values);
    const root = isBst ? buildBstRoot(values) : null;
    if ((isBst && !root) || (!isBst && !nodes?.length)) return showToast('Add values to build a tree.');
    const sequence = [];
    if (isBst) {
      function walkBst(node) {
        if (!node) return;
        if (order === 'preorder') sequence.push(node);
        walkBst(node.left);
        if (order === 'inorder') sequence.push(node);
        walkBst(node.right);
        if (order === 'postorder') sequence.push(node);
      }
      if (order === 'levelorder') {
        const queue = [root];
        while (queue.length) { const node = queue.shift(); sequence.push(node); if (node.left) queue.push(node.left); if (node.right) queue.push(node.right); }
      } else walkBst(root);
    } else {
      function walk(index) {
        if (index >= nodes.length) return;
        if (order === 'preorder') sequence.push(index);
        walk(index * 2 + 1);
        if (order === 'inorder') sequence.push(index);
        walk(index * 2 + 2);
        if (order === 'postorder') sequence.push(index);
      }
      if (order === 'levelorder') nodes.forEach((node) => sequence.push(node.index)); else walk(0);
    }
    const visualKind = isBst ? 'bst' : 'binary-tree';
    const treeNodes = isBst ? snapshotBst(root) : undefined;
    const trace = [makeFrame(`Start ${order} traversal.`, 'Follow the selected visit order; each highlighted node is added to the sequence.', { visualKind, treeValues: values.slice(), treeNodes, traversal: [] })];
    const visited = [];
    sequence.forEach((entry) => {
      const nodeId = isBst ? entry.id : entry;
      const value = isBst ? entry.value : values[entry];
      visited.push(value);
      trace.push(makeFrame(`Visit node ${value}.`, `${order} traversal visits this node now. The sequence so far is ${visited.join(' → ')}.`, { visualKind, treeValues: values.slice(), treeNodes, current: nodeId, visitedNodes: [nodeId], traversal: visited.slice(), line: order === 'levelorder' ? 3 : order === 'preorder' ? 0 : order === 'inorder' ? 1 : 2, next: sequence.length === visited.length ? 'Traversal complete.' : 'Continue to the next node in the traversal order.' }));
    });
    return setFrames(trace);
  }

  function bstInsert(value) {
    if (values.length >= 30) return showToast('Maximum 30 values for visualization.');
    if (values.includes(value)) return showToast(`${value} is already in the tree; BST values must be distinct.`);
    let root = buildBstRoot(values);
    let nextId = values.length;
    const trace = [makeFrame(`Insert ${value} into the Binary Search Tree.`, 'At each node, smaller values move left and larger values move right.', { visualKind: 'bst', treeValues: values.slice(), treeNodes: snapshotBst(root), line: 0 })];
    if (!root) {
      root = { id: nextId, value, left: null, right: null };
      trace.push(makeFrame(`${value} becomes the root.`, 'An empty tree stores its first value at the root.', { visualKind: 'bst', treeValues: [value], treeNodes: snapshotBst(root), current: root.id, line: 3 }));
    } else {
      let current = root; let comparisons = 0;
      while (true) {
        comparisons += 1;
        const side = value < current.value ? 'left' : 'right';
        trace.push(makeFrame(`${value} ${side === 'left' ? '<' : '>'} ${current.value}; move ${side}.`, `The BST rule sends smaller values left and larger values right.`, { visualKind: 'bst', treeValues: values.slice(), treeNodes: snapshotBst(root), current: current.id, comparing: [current.id], comparisons, line: side === 'left' ? 0 : 1, next: current[side] ? `Compare with ${current[side].value}.` : `The ${side} child is empty.` }));
        if (!current[side]) {
          current[side] = { id: nextId, value, left: null, right: null };
          trace.push(makeFrame(`Insert ${value} at the empty ${side} child of ${current.value}.`, 'The insertion preserves the BST ordering rule.', { visualKind: 'bst', treeValues: [...values, value], treeNodes: snapshotBst(root), current: nextId, comparisons, line: 3 }));
          break;
        }
        current = current[side];
      }
    }
    values = bstPreorderValues(root);
    valuesInput.value = values.join(', ');
    setFrames(trace);
  }
  function bstSearch(target) {
    const root = buildBstRoot(values);
    if (!root) return showToast('Add values before searching.');
    const nodes = snapshotBst(root);
    const trace = [makeFrame(`Search for ${target}.`, 'Use the BST ordering to choose one child at each comparison.', { visualKind: 'bst', treeValues: values.slice(), treeNodes: nodes, line: 0 })];
    let current = root; let comparisons = 0;
    while (current) {
      comparisons += 1;
      if (current.value === target) {
        trace.push(makeFrame(`Found ${target}.`, `The search stopped after ${comparisons} comparison${comparisons === 1 ? '' : 's'}.`, { visualKind: 'bst', treeValues: values.slice(), treeNodes: nodes, current: current.id, found: current.id, comparisons, line: 2 }));
        return setFrames(trace);
      }
      const side = target < current.value ? 'left' : 'right';
      trace.push(makeFrame(`${target} ${side === 'left' ? '<' : '>'} ${current.value}; move ${side}.`, 'The BST ordering rules out the other subtree.', { visualKind: 'bst', treeValues: values.slice(), treeNodes: nodes, current: current.id, comparisons, line: side === 'left' ? 0 : 1, variables: { target, current: current.value, comparisons }, next: current[side] ? `Compare with ${current[side].value}.` : `The ${side} child is empty; the value is not present.` }));
      current = current[side];
    }
    trace.push(makeFrame(`${target} was not found.`, 'The search reached an empty child reference.', { visualKind: 'bst', treeValues: values.slice(), treeNodes: nodes, comparisons, line: 2 }));
    setFrames(trace);
  }
  function bstMinMax(kind) {
    const root = buildBstRoot(values);
    if (!root) return showToast('Add values to build a tree.');
    const nodes = snapshotBst(root); const side = kind === 'min' ? 'left' : 'right'; const label = kind === 'min' ? 'minimum' : 'maximum';
    const trace = [makeFrame(`Find the ${label}.`, `The ${label} of a BST is the ${side}most node: keep moving ${side} from the root.`, { visualKind: 'bst', treeValues: values.slice(), treeNodes: nodes, line: 0 })];
    let current = root; let steps = 0;
    while (current[side]) {
      steps += 1;
      trace.push(makeFrame(`${current.value} has a ${side} child; move ${side} to ${current[side].value}.`, `Every value in the ${side} subtree is ${kind === 'min' ? 'smaller' : 'larger'} than ${current.value}.`, { visualKind: 'bst', treeValues: values.slice(), treeNodes: nodes, current: current.id, comparisons: steps, line: side === 'left' ? 0 : 1 }));
      current = current[side];
    }
    trace.push(makeFrame(`${label.charAt(0).toUpperCase() + label.slice(1)} = ${current.value}.`, `${current.value} has no ${side} child, so nothing is ${kind === 'min' ? 'smaller' : 'larger'}.`, { visualKind: 'bst', treeValues: values.slice(), treeNodes: nodes, current: current.id, found: current.id, comparisons: steps, line: 2, next: 'Search complete.' }));
    return setFrames(trace);
  }
  function bstDelete(target) {
    let root = buildBstRoot(values);
    if (!root) return showToast('Add values before deleting.');
    const trace = [makeFrame(`Find ${target} before deletion.`, 'Follow the same left/right comparisons used by BST search.', { visualKind: 'bst', treeValues: values.slice(), treeNodes: snapshotBst(root), line: 0 })];
    let current = root; let parent = null; let side = null; let comparisons = 0;
    while (current && current.value !== target) {
      comparisons += 1; parent = current; side = target < current.value ? 'left' : 'right';
      trace.push(makeFrame(`${target} ${side === 'left' ? '<' : '>'} ${current.value}; move ${side}.`, 'The BST ordering selects the child that can contain the target.', { visualKind: 'bst', treeValues: values.slice(), treeNodes: snapshotBst(root), current: current.id, comparisons, line: side === 'left' ? 0 : 1 }));
      current = current[side];
    }
    if (!current) { trace.push(makeFrame(`${target} is not in this tree.`, 'The search reached an empty child, so there is no node to delete.', { visualKind: 'bst', treeValues: values.slice(), treeNodes: snapshotBst(root), comparisons, line: 2 })); return setFrames(trace); }
    comparisons += 1;
    trace.push(makeFrame(`Found ${target}; inspect its children.`, 'Deletion must reconnect child references so every left value stays smaller and every right value stays larger.', { visualKind: 'bst', treeValues: values.slice(), treeNodes: snapshotBst(root), current: current.id, comparisons, line: 2 }));
    if (current.left && current.right) {
      let successorParent = current; let successor = current.right;
      while (successor.left) {
        trace.push(makeFrame(`Move left from ${successor.value} to find the in-order successor.`, 'The smallest value in the right subtree can replace this node without breaking BST order.', { visualKind: 'bst', treeValues: values.slice(), treeNodes: snapshotBst(root), current: successor.id, comparisons, line: 2 }));
        successorParent = successor; successor = successor.left;
      }
      current.value = successor.value;
      if (successorParent === current) successorParent.right = successor.right; else successorParent.left = successor.right;
      trace.push(makeFrame(`Replace ${target} with its in-order successor ${current.value}.`, 'The successor is removed from its old position and its right child, if any, takes that position.', { visualKind: 'bst', treeValues: bstPreorderValues(root), treeNodes: snapshotBst(root), current: current.id, comparisons, line: 3 }));
    } else {
      const child = current.left || current.right;
      if (!parent) root = child;
      else parent[side] = child;
      trace.push(makeFrame(`Remove ${target} and connect its parent to ${child ? child.value : 'an empty child'}.`, 'A node with zero or one child can be removed by reconnecting the one reference that points to it.', { visualKind: 'bst', treeValues: bstPreorderValues(root), treeNodes: snapshotBst(root), current: parent?.id, comparisons, line: 3 }));
    }
    values = bstPreorderValues(root); valuesInput.value = values.join(', '); setFrames(trace);
  }

  function graphAction(action, value, edgeText, directed, weighted) {
    const nextGraph = cloneGraph(graph); const trace = [makeFrame(`Start graph ${action.toLowerCase()}.`, 'A graph contains vertices (nodes) and edges connecting them.', { visualKind: 'graph', graph: cloneGraph(nextGraph), line: 0 })];
    if (action === 'Add node') {
      const node = String(value || '').trim().toUpperCase();
      if (!node) return showToast('Enter a node label.');
      if (node.length > 4) return showToast('Node labels can be up to 4 characters.');
      if (nextGraph.nodes.length >= 12) return showToast('Maximum 12 graph nodes for visualization.');
      if (nextGraph.nodes.includes(node)) return showToast(`${node} already exists.`);
      nextGraph.nodes.push(node); trace.push(makeFrame(`Add node ${node}.`, 'The new vertex is ready to be connected by edges.', { visualKind: 'graph', graph: cloneGraph(nextGraph), currentNode: node }));
    } else if (action === 'Remove node') {
      const node = String(value || '').trim().toUpperCase();
      if (!nextGraph.nodes.includes(node)) return showToast('Choose a node that exists.');
      nextGraph.nodes = nextGraph.nodes.filter((item) => item !== node); nextGraph.edges = nextGraph.edges.filter((edge) => edge[0] !== node && edge[1] !== node);
      trace.push(makeFrame(`Remove node ${node} and its edges.`, 'Edges cannot remain connected to a node that was removed.', { visualKind: 'graph', graph: cloneGraph(nextGraph) }));
    } else if (action === 'Add edge' || action === 'Remove edge') {
      const parts = String(edgeText || '').split(/[,:\s]+/).filter(Boolean); const from = (parts[0] || '').toUpperCase(); const to = (parts[1] || '').toUpperCase(); const weight = Number(parts[2] || 1);
      if (!nextGraph.nodes.includes(from) || !nextGraph.nodes.includes(to)) return showToast('Edge endpoints must be existing nodes. Enter from,to,weight.');
      if (weighted && (!Number.isFinite(weight) || weight <= 0)) return showToast('Enter a positive finite edge weight.');
      const exists = nextGraph.edges.some((edge) => edge[0] === from && edge[1] === to);
      if (action === 'Add edge') {
        if (!exists) nextGraph.edges.push([from, to, weighted ? weight : 1]);
        if (!directed && !nextGraph.edges.some((edge) => edge[0] === to && edge[1] === from)) nextGraph.edges.push([to, from, weighted ? weight : 1]);
        trace.push(makeFrame(`Add edge ${from} ${directed ? '→' : '↔'} ${to}${weighted ? ` (weight ${weight})` : ''}.`, 'The connection lets a traversal discover one endpoint from the other.', { visualKind: 'graph', graph: cloneGraph(nextGraph), currentNode: from }));
      } else {
        nextGraph.edges = nextGraph.edges.filter((edge) => !((edge[0] === from && edge[1] === to) || (!directed && edge[0] === to && edge[1] === from)));
        trace.push(makeFrame(`Remove the edge between ${from} and ${to}.`, 'The nodes remain, but this connection is no longer available to traversal.', { visualKind: 'graph', graph: cloneGraph(nextGraph) }));
      }
    }
    graph = nextGraph;
    valuesInput.value = graph.nodes.join(', ');
    renderOperationControls();
    setFrames(trace);
  }
  function graphTraversal(method, start) {
    const from = String(start || graph.nodes[0] || '').toUpperCase();
    if (!graph.nodes.includes(from)) return showToast('Choose a start node in the graph.');
    const trace = [makeFrame(`${method.toUpperCase()} starts at ${from}.`, method === 'bfs' ? 'BFS explores the closest neighbors first and tracks pending nodes in a queue.' : 'DFS follows one path deeply before returning to another branch.', { visualKind: 'graph', graph: cloneGraph(graph), line: 0, queue: method === 'bfs' ? [from] : [], stack: method === 'dfs' ? [from] : [], visited: [] })];
    const visited = []; const work = [from]; const seen = new Set([from]); let comparisons = 0;
    const done = new Set();
    while (work.length && visited.length < 12) {
      const current = method === 'bfs' ? work.shift() : work.pop();
      if (method === 'dfs') { if (done.has(current)) continue; done.add(current); seen.add(current); }
      visited.push(current);
      trace.push(makeFrame(`Visit node ${current}.`, `Visited so far: ${visited.join(', ')}. ${method === 'bfs' ? 'The queue removes its front item.' : 'The stack removes its top item.'}`, { visualKind: 'graph', graph: cloneGraph(graph), currentNode: current, visited: visited.slice(), queue: method === 'bfs' ? work.slice() : [], stack: method === 'dfs' ? work.slice() : [], comparisons, line: 2, next: 'Check each neighboring node that is not visited yet.' }));
      const neighbors = Array.from(new Set(graph.edges.filter((edge) => edge[0] === current).map((edge) => edge[1])));
      const ordered = method === 'dfs' ? neighbors.slice().reverse() : neighbors;
      ordered.forEach((node) => {
        comparisons += 1;
        if (method === 'bfs') { if (!seen.has(node)) { seen.add(node); work.push(node); } }
        else if (!done.has(node)) { seen.add(node); work.push(node); } // DFS: a node is final only when it is visited
      });
      if (work.length) trace.push(makeFrame(`Add unvisited neighbors of ${current}.`, `${method === 'bfs' ? 'Queue' : 'Stack'} now contains: ${work.join(', ')}.`, { visualKind: 'graph', graph: cloneGraph(graph), currentNode: current, visited: visited.slice(), queue: method === 'bfs' ? work.slice() : [], stack: method === 'dfs' ? work.slice() : [], comparisons, line: 3 }));
    }
    const reached = method === 'dfs' ? done : seen;
    const unreachable = graph.nodes.filter((node) => !reached.has(node));
    trace.push(makeFrame(`${method.toUpperCase()} complete: ${visited.join(' → ')}.`, unreachable.length ? `The remaining nodes are disconnected from ${from}: ${unreachable.join(', ')}.` : 'Every node was reachable from the chosen start node.', { visualKind: 'graph', graph: cloneGraph(graph), visited, currentNode: '', queue: [], stack: [], comparisons, line: 3, next: 'Traversal complete.' }));
    setFrames(trace);
  }

  function setCategory(value) {
    currentCategory = value;
    stopPlayback();
    allowUnsortedBinary = false;
    $('dsa-binary-warning').classList.add('hidden');
    const options = algorithms[value] || algorithms.array;
    algorithmSelect.innerHTML = options.map((item) => `<option value="${escapeHtml(item.value)}">${escapeHtml(item.label)}</option>`).join('');
    $('dsa-algorithm-wrap').classList.toggle('hidden', options.length <= 1 && !['sorting', 'searching', 'graph', 'binary-tree'].includes(value));
    if (value === 'graph') $('dsa-algorithm-wrap').classList.remove('hidden');
    if (value === 'binary-tree') $('dsa-algorithm-wrap').classList.remove('hidden');
    $('dsa-visual-heading').textContent = `${labels[value]} visualization`;
    $('dsa-values').value = value === 'sorting' ? '5, 3, 8, 1, 2' : value === 'graph' ? 'A, B, C, D, E, F' : valuesInput.value || defaultData;
    if (value === 'graph') {
      graph = { nodes: ['A', 'B', 'C', 'D', 'E', 'F'], edges: [['A', 'B', 1], ['B', 'A', 1], ['A', 'C', 1], ['C', 'A', 1], ['B', 'D', 1], ['D', 'B', 1], ['B', 'E', 1], ['E', 'B', 1], ['C', 'F', 1], ['F', 'C', 1]] };
      values = [];
    } else {
      try { values = readNumbers($('dsa-values').value); } catch (error) { values = [10, 20, 30, 40, 50, 60, 70]; }
      if (value === 'bst' && new Set(values).size !== values.length) {
        showToast('Binary Search Tree values must be distinct. Duplicate values were skipped.');
        values = Array.from(new Set(values)); $('dsa-values').value = values.join(', ');
      }
    }
    if (value === 'binary-tree' || value === 'bst' || value === 'linked-list') values = values.slice(0, value === 'bst' ? 15 : 30);
    $('dsa-input-help').textContent = value === 'graph' ? 'Enter up to 12 unique node labels, separated by commas.' : 'Enter comma-separated whole numbers. Maximum 30 values.';
    $('dsa-values').setAttribute('aria-label', value === 'graph' ? 'Graph node labels' : 'Simulation input values');
    renderOperationControls(); buildInitialTimeline(); render();
  }

  function inputNumber(label, id, value = 0, min = -99999, max = 99999) {
    return `<label class="dsa-field">${label}<input id="${id}" type="number" inputmode="numeric" value="${escapeHtml(value)}" min="${min}" max="${max}"></label>`;
  }
  function actionButton(action, label = action) { return `<button type="button" class="dsa-button" data-action="${escapeHtml(action)}">${escapeHtml(label)}</button>`; }
  function renderOperationControls() {
    const category = currentCategory;
    let html = '';
    if (category === 'array') html = `${inputNumber('Value', 'dsa-operation-value', 15)}${inputNumber('Index', 'dsa-operation-index', Math.max(0, values.length - 1), 0, 29)}${['Add','Remove','Update','Select'].map((item) => actionButton(item)).join('')}<button type="button" class="dsa-button" data-action="Array search">Search value</button>`;
    if (category === 'stack') html = `${inputNumber('Value to push', 'dsa-operation-value', 50)}<label class="dsa-field dsa-check-field"><span>Fixed capacity</span><input id="dsa-fixed-capacity" type="checkbox" ${fixedCapacity ? 'checked' : ''}></label>${inputNumber('Capacity', 'dsa-capacity', 8, 1, 30)}${actionButton('Push')}${actionButton('Pop')}${actionButton('Peek')}${actionButton('Is Empty')}${actionButton('Is Full')}`;
    if (category === 'queue' || category === 'circular-queue') html = `${inputNumber('Value to enqueue', 'dsa-operation-value', 60)}${inputNumber('Capacity', 'dsa-capacity', queueCapacity, 1, 20)}${actionButton('Enqueue')}${actionButton('Dequeue')}${actionButton('Peek')}${actionButton('Is Empty')}${actionButton('Is Full')}${category === 'circular-queue' ? '<span class="dsa-inline-note">REAR wraps to index 0 after the last slot.</span>' : ''}`;
    if (category === 'linked-list') html = `<label class="dsa-field">Operation<select id="dsa-list-action"><option>Insert at beginning</option><option>Insert at end</option><option>Insert at position</option><option>Delete from beginning</option><option>Delete from end</option><option>Delete from position</option><option>Search</option></select></label>${inputNumber('Value', 'dsa-operation-value', 15)}${inputNumber('Position', 'dsa-operation-index', 1, 0, 29)}<button type="button" class="dsa-button dsa-button-primary" data-action="Run linked list operation">Run operation</button>`;
    if (category === 'binary-tree') html = `${inputNumber('Value to insert', 'dsa-operation-value', 55)}<label class="dsa-field">Traversal<select id="dsa-tree-traversal"><option value="preorder">Preorder</option><option value="inorder">Inorder</option><option value="postorder">Postorder</option><option value="levelorder">Level order</option></select></label>${actionButton('Tree insert')}${actionButton('Tree delete')}${actionButton('Tree search')}<button type="button" class="dsa-button dsa-button-primary" data-action="Run traversal">Run traversal</button>`;
    if (category === 'bst') html = `${inputNumber('Value', 'dsa-operation-value', 60)}${actionButton('BST insert')}${actionButton('BST search')}${actionButton('BST delete')}<button type="button" class="dsa-button" data-action="BST min">Find min</button><button type="button" class="dsa-button" data-action="BST max">Find max</button><label class="dsa-field">Traversal<select id="dsa-tree-traversal"><option value="inorder">Inorder</option><option value="preorder">Preorder</option><option value="postorder">Postorder</option><option value="levelorder">Level order</option></select></label><button type="button" class="dsa-button" data-action="Run traversal">Run traversal</button>`;
    if (category === 'searching') html = `${inputNumber('Target value', 'dsa-operation-value', 40)}<button type="button" class="dsa-button dsa-button-primary" data-action="Run search">Run search</button>`;
    if (category === 'sorting') html = `<button type="button" class="dsa-button dsa-button-primary" data-action="Run sort">Run ${escapeHtml(algorithmSelect.selectedOptions[0]?.textContent || 'sort')}</button>`;
    if (category === 'graph') html = `<label class="dsa-field">Node label<input id="dsa-operation-value" type="text" value="G" maxlength="4" aria-label="Graph node label"></label><label class="dsa-field">Edge (from,to,weight)<input id="dsa-edge" type="text" placeholder="A, B, 3" maxlength="18"></label><label class="dsa-field dsa-check-field"><span>Directed</span><input id="dsa-directed" type="checkbox" ${graphDirected ? 'checked' : ''}></label><label class="dsa-field dsa-check-field"><span>Weighted</span><input id="dsa-weighted" type="checkbox" ${graphWeighted ? 'checked' : ''}></label><label class="dsa-field">Start node<select id="dsa-start-node">${graph.nodes.map((node) => `<option>${escapeHtml(node)}</option>`).join('')}</select></label>${actionButton('Add node')}${actionButton('Remove node')}${actionButton('Add edge')}${actionButton('Remove edge')}${actionButton('BFS','Run BFS')}${actionButton('DFS','Run DFS')}`;
    operationControls.innerHTML = html;
    operationControls.querySelectorAll('[data-action]').forEach((button) => button.addEventListener('click', () => handleAction(button.dataset.action)));
    $('dsa-list-action')?.addEventListener('change', () => {});
  }
  function handleAction(action) {
    const numericActions = new Set(['Add', 'Update', 'Array search', 'Push', 'Enqueue', 'Run linked list operation', 'Tree insert', 'Tree delete', 'Tree search', 'BST insert', 'BST search', 'BST delete', 'Run search']);
    const valueInput = $('dsa-operation-value');
    if (numericActions.has(action) && valueInput && valueInput.value.trim() === '') return showToast('Enter a whole-number value before running this operation.');
    if (numericActions.has(action) && valueInput && (!Number.isInteger(Number(valueInput.value)) || Math.abs(Number(valueInput.value)) > 1000000)) return showToast('Enter a whole number from -1,000,000 to 1,000,000.');
    const value = Number($('dsa-operation-value')?.value || 0); const index = Number($('dsa-operation-index')?.value || 0);
    if (currentCategory === 'array') {
      if (action === 'Array search') return currentAlgorithm() === 'binary' ? binarySearch(value) : linearSearch(value);
      return arrayAction(action, value, index);
    }
    if (currentCategory === 'stack') {
      fixedCapacity = Boolean($('dsa-fixed-capacity')?.checked); return stackAction(action, value, Number($('dsa-capacity')?.value || 8));
    }
    if (currentCategory === 'queue' || currentCategory === 'circular-queue') {
      queueCapacity = Math.max(1, Number($('dsa-capacity')?.value || 8)); return queueAction(action, value, queueCapacity, currentCategory === 'circular-queue');
    }
    if (currentCategory === 'linked-list') {
      const selected = $('dsa-list-action')?.value || 'Insert at beginning'; return linkedListAction(selected, value, index);
    }
    if (currentCategory === 'binary-tree') {
      if (action === 'Tree insert') { if (values.length >= 30) return showToast('Maximum 30 tree nodes.'); values.push(value); valuesInput.value = values.join(', '); return setFrames([makeFrame(`Insert ${value} in the next level-order position.`, 'A general binary tree fills each level from left to right.', { visualKind: 'binary-tree', treeValues: values.slice(), current: values.length - 1, line: 0 })]); }
      if (action === 'Tree delete') { const at = values.indexOf(value); if (at < 0) return showToast(`${value} is not in this tree.`); const last = values.pop(); if (at < values.length) values[at] = last; valuesInput.value = values.join(', '); return setFrames([makeFrame(`Delete ${value} from the binary tree.`, 'The deepest rightmost node replaces the removed value to keep the tree compact.', { visualKind: 'binary-tree', treeValues: values.slice(), current: at, line: 0 })]); }
      if (action === 'Tree search') { const at = values.indexOf(value); return setFrames([makeFrame(at < 0 ? `${value} was not found.` : `Found ${value} at tree position ${at}.`, 'A general binary tree has no ordering rule, so search may inspect every node.', { visualKind: 'binary-tree', treeValues: values.slice(), current: at, found: at, comparisons: at < 0 ? values.length : at + 1, line: 0 })]); }
      if (action === 'Run traversal') return treeTraversal($('dsa-tree-traversal')?.value || 'inorder');
    }
    if (currentCategory === 'bst') {
      if (action === 'BST insert') return bstInsert(value);
      if (action === 'BST search') return bstSearch(value);
      if (action === 'BST delete') return bstDelete(value);
      if (action === 'BST min') return bstMinMax('min');
      if (action === 'BST max') return bstMinMax('max');
      if (action === 'Run traversal') return treeTraversal($('dsa-tree-traversal')?.value || 'inorder');
    }
    if (currentCategory === 'searching' && action === 'Run search') return currentAlgorithm() === 'binary' ? binarySearch(value) : linearSearch(value);
    if (currentCategory === 'sorting' && action === 'Run sort') return sortFrames(currentAlgorithm());
    if (currentCategory === 'graph') {
      if (action === 'BFS' || action === 'DFS') return graphTraversal(action.toLowerCase(), $('dsa-start-node')?.value || graph.nodes[0]);
      graphDirected = Boolean($('dsa-directed')?.checked); graphWeighted = Boolean($('dsa-weighted')?.checked);
      return graphAction(action, String($('dsa-operation-value')?.value || ''), $('dsa-edge')?.value, graphDirected, graphWeighted);
    }
  }
  function currentAlgorithm() { return algorithmSelect.value || 'linear'; }
  function currentTopic() {
    if (currentCategory === 'searching') return currentAlgorithm() === 'binary' ? 'Binary Search' : 'Linear Search';
    if (currentCategory === 'sorting') return `${currentAlgorithm().charAt(0).toUpperCase()}${currentAlgorithm().slice(1)} Sort`;
    if (assignedTopic && currentCategory === (params.get('category') || assignedConfig.category || 'searching') && !['Searching', 'Sorting'].includes(assignedTopic)) return assignedTopic;
    return labels[currentCategory] || assignedTopic || 'Data Structures & Algorithms';
  }

  function renderCells(valuesToShow, frame) {
    const list = Array.isArray(valuesToShow) ? valuesToShow : [];
    if (!list.length) return '<p class="dsa-empty-visual">No values yet. Enter data below and choose Generate.</p>';
    const cells = list.map((value, index) => {
      const current = frame.current === index || frame.found === index;
      const comparing = (frame.comparing || []).includes(index) || (frame.comparingValues || []).includes(value);
      const sorted = (frame.sorted || []).includes(index);
      const discarded = (frame.discarded || []).includes(index);
      const pivot = frame.pivot === index;
      const state = frame.found === index ? 'Found' : current ? 'Current' : comparing ? 'Comparing' : sorted ? 'Sorted' : pivot ? 'Pivot' : '';
      const classes = ['dsa-cell', current ? 'current' : '', comparing ? 'comparing' : '', sorted ? 'sorted' : '', discarded ? 'discarded' : '', pivot ? 'pivot' : ''].filter(Boolean).join(' ');
      return `<div class="${classes}" aria-label="Index ${index}, value ${escapeHtml(value)}${state ? `, ${state}` : ''}"><small>Index ${index}</small><strong>${escapeHtml(value)}</strong><span class="dsa-cell-state">${state || '&nbsp;'}</span></div>`;
    }).join('');
    return `<div class="dsa-array">${cells}</div>`;
  }
  function renderTree(frame) {
    if (frame.visualKind === 'bst') {
      const treeNodes = frame.treeNodes || snapshotBst(buildBstRoot(values));
      if (!treeNodes.length) return '<p class="dsa-empty-visual">Add values to build this tree.</p>';
      const width = 920; let height = 340; const levelHeight = 78; const ns = 'http://www.w3.org/2000/svg';
      const byId = new Map(treeNodes.map((node) => [node.id, node]));
      const positions = new Map(); let order = 0;
      function layout(id, depth) {
        const node = byId.get(id); if (!node) return;
        if (node.left !== null) layout(node.left, depth + 1);
        const y = 34 + depth * levelHeight;
        positions.set(id, { x: width * (++order) / (treeNodes.length + 1), y });
        height = Math.max(height, y + 70);
        if (node.right !== null) layout(node.right, depth + 1);
      }
      layout(treeNodes[0].id, 0);
      const svg = document.createElementNS(ns, 'svg'); svg.setAttribute('viewBox', `0 0 ${width} ${height}`); svg.setAttribute('class', 'dsa-tree-svg'); svg.setAttribute('role', 'img'); svg.setAttribute('aria-label', 'Binary search tree visualization');
      treeNodes.forEach((node) => [node.left, node.right].forEach((childId) => {
        if (childId === null || !positions.has(childId)) return;
        const parent = positions.get(node.id); const child = positions.get(childId);
        const edge = document.createElementNS(ns, 'line'); edge.setAttribute('x1', parent.x); edge.setAttribute('y1', parent.y + 20); edge.setAttribute('x2', child.x); edge.setAttribute('y2', child.y - 20); edge.setAttribute('class', 'dsa-tree-edge'); svg.appendChild(edge);
      }));
      treeNodes.forEach((node) => {
        const position = positions.get(node.id); const group = document.createElementNS(ns, 'g');
        group.setAttribute('class', `dsa-tree-node ${frame.current === node.id || frame.found === node.id ? 'current' : (frame.visitedNodes || []).includes(node.id) ? 'visited' : (frame.comparing || []).includes(node.id) ? 'comparing' : ''}`);
        const circle = document.createElementNS(ns, 'circle'); circle.setAttribute('cx', position.x); circle.setAttribute('cy', position.y); circle.setAttribute('r', 20); group.appendChild(circle);
        const text = document.createElementNS(ns, 'text'); text.setAttribute('x', position.x); text.setAttribute('y', position.y + 1); text.textContent = String(node.value); group.appendChild(text);
        const index = document.createElementNS(ns, 'text'); index.setAttribute('x', position.x); index.setAttribute('y', position.y + 36); index.setAttribute('class', 'dsa-edge-label'); index.textContent = frame.current === node.id ? 'CURRENT' : `node ${node.id}`; group.appendChild(index);
        svg.appendChild(group);
      });
      return svg;
    }
    const treeValues = frame.treeValues || [];
    const items = treeValues.map((value, index) => ({ value, index })).filter((item) => item.value !== undefined);
    if (!items.length) return '<p class="dsa-empty-visual">Add values to build this tree.</p>';
    const width = 920; const height = 340; const levelHeight = 78; const ns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns, 'svg'); svg.setAttribute('viewBox', `0 0 ${width} ${height}`); svg.setAttribute('class', 'dsa-tree-svg'); svg.setAttribute('role', 'img'); svg.setAttribute('aria-label', 'Tree visualization');
    const positions = new Map();
    items.forEach((item) => { const level = Math.floor(Math.log2(item.index + 1)); const start = 2 ** level - 1; const slot = item.index - start; const count = 2 ** level; positions.set(item.index, { x: width * (slot + 0.5) / count, y: 34 + level * levelHeight }); });
    items.forEach((item) => [item.index * 2 + 1, item.index * 2 + 2].forEach((childIndex) => {
      if (!positions.has(childIndex)) return; const parent = positions.get(item.index); const child = positions.get(childIndex);
      const edge = document.createElementNS(ns, 'line'); edge.setAttribute('x1', parent.x); edge.setAttribute('y1', parent.y + 20); edge.setAttribute('x2', child.x); edge.setAttribute('y2', child.y - 20); edge.setAttribute('class', 'dsa-tree-edge'); svg.appendChild(edge);
    }));
    items.forEach((item) => {
      const position = positions.get(item.index); const group = document.createElementNS(ns, 'g');
      group.setAttribute('class', `dsa-tree-node ${frame.current === item.index || frame.found === item.index ? 'current' : (frame.visitedNodes || []).includes(item.index) ? 'visited' : (frame.comparing || []).includes(item.index) ? 'comparing' : ''}`);
      const circle = document.createElementNS(ns, 'circle'); circle.setAttribute('cx', position.x); circle.setAttribute('cy', position.y); circle.setAttribute('r', 20); group.appendChild(circle);
      const text = document.createElementNS(ns, 'text'); text.setAttribute('x', position.x); text.setAttribute('y', position.y + 1); text.textContent = String(item.value); group.appendChild(text);
      const index = document.createElementNS(ns, 'text'); index.setAttribute('x', position.x); index.setAttribute('y', position.y + 36); index.setAttribute('class', 'dsa-edge-label'); index.textContent = frame.current === item.index ? 'CURRENT' : `node ${item.index}`; group.appendChild(index);
      svg.appendChild(group);
    });
    return svg;
  }
  function renderGraph(frame) {
    const data = frame.graph || graph; if (!data.nodes.length) return '<p class="dsa-empty-visual">Add a node to begin.</p>';
    const ns = 'http://www.w3.org/2000/svg'; const width = 760; const height = 350; const centerX = width / 2; const centerY = height / 2; const radius = Math.min(width, height) * 0.36;
    const svg = document.createElementNS(ns, 'svg'); svg.setAttribute('viewBox', `0 0 ${width} ${height}`); svg.setAttribute('class', 'dsa-graph-svg'); svg.setAttribute('role', 'img'); svg.setAttribute('aria-label', 'Graph with nodes and edges');
    const points = new Map(); data.nodes.forEach((node, index) => { const angle = -Math.PI / 2 + (index / data.nodes.length) * Math.PI * 2; points.set(node, { x: centerX + Math.cos(angle) * radius, y: centerY + Math.sin(angle) * radius }); });
    data.edges.forEach((edge) => { const from = points.get(edge[0]); const to = points.get(edge[1]); if (!from || !to) return;
      const line = document.createElementNS(ns, 'line'); line.setAttribute('x1', from.x); line.setAttribute('y1', from.y); line.setAttribute('x2', to.x); line.setAttribute('y2', to.y); line.setAttribute('class', 'dsa-graph-edge'); svg.appendChild(line);
      if (edge[2] !== 1) { const label = document.createElementNS(ns, 'text'); label.setAttribute('x', (from.x + to.x) / 2); label.setAttribute('y', (from.y + to.y) / 2 - 4); label.setAttribute('class', 'dsa-edge-label'); label.textContent = String(edge[2]); svg.appendChild(label); }
    });
    data.nodes.forEach((node) => { const point = points.get(node); const group = document.createElementNS(ns, 'g'); group.setAttribute('class', `dsa-graph-node ${frame.currentNode === node ? 'current' : (frame.visited || []).includes(node) ? 'visited' : ''}`);
      const circle = document.createElementNS(ns, 'circle'); circle.setAttribute('cx', point.x); circle.setAttribute('cy', point.y); circle.setAttribute('r', 24); group.appendChild(circle);
      const text = document.createElementNS(ns, 'text'); text.setAttribute('x', point.x); text.setAttribute('y', point.y + 1); text.textContent = node; group.appendChild(text); svg.appendChild(group);
    }); return svg;
  }
  function renderQueue(frame) {
    const slots = frame.queueSlots || queueSnapshot(values, queueCapacity, currentCategory === 'circular-queue').queueSlots;
    const wrap = document.createElement('div'); wrap.style.width = '100%'; wrap.style.maxWidth = '780px';
    const pointer = document.createElement('div'); pointer.className = 'dsa-pointer-row'; pointer.innerHTML = `<span>FRONT ${frame.front >= 0 ? `↓ ${frame.front}` : ''}</span><span>REAR ${frame.rear >= 0 ? `↓ ${frame.rear}` : ''}</span>`; wrap.appendChild(pointer);
    const row = document.createElement('div'); row.className = 'dsa-queue-slots'; row.style.setProperty('--dsa-count', String(slots.length));
    slots.forEach((value, index) => { const cell = document.createElement('div'); cell.className = `dsa-queue-slot ${value == null ? 'empty' : ''} ${index === frame.front || index === frame.rear ? 'pointer' : ''}`; cell.textContent = value == null ? '—' : String(value); const small = document.createElement('small'); small.textContent = String(index); cell.appendChild(small); row.appendChild(cell); });
    wrap.appendChild(row); return wrap;
  }
  function render() {
    if (!frames.length) buildInitialTimeline(); const frame = currentFrame();
    $('dsa-topic').textContent = `${currentTopic()}${assignedConfig.difficulty ? ` · ${assignedConfig.difficulty}` : ''}`;
    $('dsa-step-label').textContent = `Step ${cursor + 1} of ${frames.length}`;
    $('dsa-progress-fill').style.width = `${frames.length <= 1 ? 0 : (cursor / (frames.length - 1)) * 100}%`;
    $('dsa-prev').disabled = cursor <= 0; $('dsa-next').disabled = cursor >= frames.length - 1;
    $('dsa-operation').textContent = frame.operation || 'Ready.'; $('dsa-why').textContent = frame.why || 'Choose an operation.'; $('dsa-next-explanation').textContent = frame.next || 'Advance one step to continue.';
    $('dsa-legend').innerHTML = '<span><i></i>Current</span><span><i class="legend-compare"></i>Comparing</span><span><i class="legend-sorted"></i>Sorted / visited</span>';
    visualization.innerHTML = '';
    let visual;
    if (frame.visualKind === 'graph') visual = renderGraph(frame);
    else if (frame.visualKind === 'binary-tree' || frame.visualKind === 'bst') visual = renderTree(frame);
    else if (frame.visualKind === 'queue' || frame.visualKind === 'circular-queue') visual = renderQueue(frame);
    else if (frame.visualKind === 'stack') {
      const stack = frame.stack || values; visual = document.createElement('div'); visual.style.display = 'grid'; visual.style.justifyItems = 'center';
      const top = document.createElement('div'); top.className = 'dsa-pointer-row'; top.style.justifyContent = 'center'; top.style.width = '170px'; top.textContent = stack.length ? `TOP ↓ index ${stack.length - 1}` : 'TOP · empty'; visual.appendChild(top);
      const cells = document.createElement('div'); cells.className = 'dsa-stack';
      stack.forEach((value, index) => { const cell = document.createElement('div'); cell.className = `dsa-cell ${index === stack.length - 1 ? 'current' : ''}`; cell.innerHTML = `<small>Index ${index}</small><strong>${escapeHtml(value)}</strong><span class="dsa-cell-state">${index === stack.length - 1 ? 'TOP' : ''}</span>`; cells.appendChild(cell); }); visual.appendChild(cells);
    } else if (frame.visualKind === 'linked-list') {
      const list = frame.treeValues || values; visual = document.createElement('div'); visual.className = 'dsa-node-list';
      list.forEach((value, index) => { const group = document.createElement('div'); group.className = 'dsa-list-node'; const node = document.createElement('div'); node.className = `dsa-cell ${(frame.current === index || frame.found === index) ? 'current' : ''}`; node.innerHTML = `<span class="dsa-pointer-label">${frame.current === index ? escapeHtml(frame.pointer || 'current') : ''}</span><small>Node ${index}</small><strong>${escapeHtml(value)}</strong><span class="dsa-cell-state">next →</span>`; group.appendChild(node); const arrow = document.createElement('span'); arrow.className = 'dsa-arrow'; arrow.textContent = '→'; group.appendChild(arrow); visual.appendChild(group); }); const nil = document.createElement('span'); nil.className = 'dsa-null'; nil.textContent = 'NULL'; visual.appendChild(nil);
    } else if (frame.visualKind === 'merge') {
      visual = document.createElement('div'); visual.style.display = 'grid'; visual.style.gap = '13px'; visual.style.width = '100%';
      const phase = document.createElement('div'); phase.className = 'dsa-info-label'; phase.style.textAlign = 'center'; phase.textContent = frame.phase || 'Divide and merge'; visual.appendChild(phase);
      (frame.groups || [frame.values || values]).forEach((group) => { const row = document.createElement('div'); row.className = 'dsa-array'; group.forEach((value) => { const cell = document.createElement('div'); cell.className = 'dsa-cell'; cell.innerHTML = `<strong>${escapeHtml(value)}</strong>`; row.appendChild(cell); }); visual.appendChild(row); });
    } else visual = renderCells(frame.values || values, frame);
    visualization.appendChild(typeof visual === 'string' ? (() => { const node = document.createElement('div'); node.innerHTML = visual; return node; })() : visual);
    const metrics = [];
    if (frame.comparisons !== undefined) metrics.push(['Comparisons', frame.comparisons]);
    if (frame.swaps !== undefined) metrics.push(['Swaps', frame.swaps]);
    if (frame.pass !== undefined) metrics.push(['Pass', frame.pass]);
    if (frame.low !== undefined) metrics.push(['Low', frame.low]);
    if (frame.mid !== undefined) metrics.push(['Mid', frame.mid]);
    if (frame.high !== undefined) metrics.push(['High', frame.high]);
    if (frame.variables?.target !== undefined) metrics.push(['Target', frame.variables.target]);
    if (frame.queue) metrics.push(['Queue', `[${frame.queue.join(', ')}]`]);
    if (frame.stack?.length) metrics.push(['Stack', `[${frame.stack.join(', ')}]`]);
    if (frame.visited?.length) metrics.push(['Visited', frame.visited.join(' → ')]);
    if (frame.traversal?.length) metrics.push(['Traversal sequence', frame.traversal.join(' → ')]);
    if (frame.front !== undefined) metrics.push(['Front', frame.front < 0 ? 'empty' : frame.front]);
    if (frame.rear !== undefined) metrics.push(['Rear', frame.rear < 0 ? 'empty' : frame.rear]);
    if (frame.size !== undefined) metrics.push(['Size', frame.size]);
    $('dsa-metrics').innerHTML = metrics.map(([name, value]) => `<span class="dsa-metric">${escapeHtml(name)}<strong>${escapeHtml(value)}</strong></span>`).join('');
    const currentCode = code[currentAlgorithm()] || code[currentCategory] || [];
    const pseudocode = $('dsa-pseudocode-card');
    pseudocode.classList.toggle('hidden', assignedConfig.showPseudocode === false);
    $('dsa-pseudocode').innerHTML = currentCode.map((line, index) => `<li class="${index === frame.line ? 'active' : ''}">${escapeHtml(line)}</li>`).join('');
    const complexity = $('dsa-complexity-card'); complexity.classList.toggle('hidden', assignedConfig.showComplexity === false);
    const complexityKey = ['searching','sorting'].includes(currentCategory) ? currentAlgorithm() : currentCategory;
    $('dsa-complexity').innerHTML = (complexities[complexityKey] || complexities.array).map(([name, val]) => `<div class="dsa-complexity-item"><span>${escapeHtml(name)}</span><strong>${escapeHtml(val)}</strong></div>`).join('');
    maybeSendCompletion();
    postStateToParent(frame);
  }

  function buildTimelineForCurrentOperation() {
    if (currentCategory === 'searching') currentAlgorithm() === 'binary' ? binarySearch(40) : linearSearch(40);
    else if (currentCategory === 'sorting') sortFrames(currentAlgorithm());
    else if (currentCategory === 'graph') graphTraversal(currentAlgorithm(), graph.nodes[0]);
    else if (currentCategory === 'binary-tree' || currentCategory === 'bst') treeTraversal('inorder');
    else buildInitialTimeline();
  }
  function moveTo(next) { cursor = Math.max(0, Math.min(frames.length - 1, next)); render(); if (cursor === frames.length - 1) { stopPlayback(); maybeSendCompletion(); } }
  function play() {
    if (cursor >= frames.length - 1) moveTo(0);
    stopPlayback(); $('dsa-play').disabled = true; $('dsa-pause').disabled = false;
    const speed = Number($('dsa-speed').value || 1); const ms = Math.max(180, Math.round(720 / speed));
    timer = window.setInterval(() => { if (cursor >= frames.length - 1) { stopPlayback(); maybeSendCompletion(); return; } moveTo(cursor + 1); }, ms);
  }
  function maybeSendCompletion() {
    if (cursor === frames.length - 1 && frames.length > 1 && !activityCompletionSent) {
      activityCompletionSent = true; sendActivity('COMPLETED', currentTopic());
    }
  }
  async function sendActivity(eventName, topic = currentTopic()) {
    if (!currentActivityId || !subjectContext.subjectId || subjectContext.role.toLowerCase() !== 'student') return;
    try {
      const response = await fetch(`/api/v1/academic/subjects/${encodeURIComponent(subjectContext.subjectId)}/simulations/${encodeURIComponent(currentActivityId)}/activity`, {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json', ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}) },
        body: JSON.stringify({ event: eventName, topic }),
      });
      if (!response.ok && response.status !== 404) console.warn('Simulation activity was not recorded.');
    } catch (error) { console.warn('Simulation activity could not be recorded.'); }
  }
  function contextSnapshot(frame = currentFrame()) {
    const frameState = { category: currentCategory, topic: currentTopic(), algorithm: currentAlgorithm(), step: cursor + 1, totalSteps: frames.length,
      currentOperation: frame.operation, explanation: frame.why, next: frame.next,
      values: frame.values || frame.treeValues || values, current: frame.current, currentNode: frame.currentNode, comparing: frame.comparing || [], low: frame.low, mid: frame.mid, high: frame.high,
      comparisons: frame.comparisons, swaps: frame.swaps, queue: frame.queue, stack: frame.stack,
      front: frame.front, rear: frame.rear, size: frame.size, visited: frame.visited, visitedNodes: frame.visitedNodes,
      queueSlots: frame.queueSlots, treeNodes: frame.treeNodes, variables: frame.variables,
      graph: frame.graph || (currentCategory === 'graph' ? graph : undefined),
    };
    return JSON.stringify(frameState).slice(0, 7500);
  }
  function postStateToParent(frame) {
    if (!embedded) return;
    try { window.parent.postMessage({ type: 'EDUVERSE_DSA_STATE', context: { simulation: 'Data Structures & Algorithms', topic: currentTopic(), state: JSON.parse(contextSnapshot(frame)) } }, window.location.origin); } catch (error) {}
  }
  async function askAI() {
    const question = $('dsa-ai-question').value.trim() || `Explain why the current ${labels[currentCategory]} step is happening.`;
    const detail = { type: 'DSA simulation state', content: contextSnapshot(), source: 'dsa-simulation' };
    if (embedded) {
      window.parent.postMessage({ type: 'EDUVERSE_DSA_ASK_AI', question, selection: detail }, window.location.origin);
      $('dsa-ai-answer').textContent = 'Opened the Smart Board AI panel with the current step and state.';
      $('dsa-ai-answer').classList.remove('hidden'); return;
    }
    if (!subjectContext.subjectId) { showToast('Open this simulation from an authorized subject workspace to ask AI.'); return; }
    $('dsa-ask-ai').disabled = true; $('dsa-ask-ai').textContent = 'Asking AI…';
    const answerEl = $('dsa-ai-answer'); answerEl.classList.remove('hidden'); answerEl.textContent = 'Thinking through the current algorithm state…';
    try {
      const token = getToken(); const response = await fetch('/api/v1/ai/query', {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ subjectId: subjectContext.subjectId, question,
          chapter: subjectContext.unitNumber || undefined, topic: labels[currentCategory],
          boardContext: { subjectId: subjectContext.subjectId, departmentId: subjectContext.departmentId,
            semesterId: subjectContext.semesterId, currentTopic: labels[currentCategory], currentLesson: params.get('title') || 'Data Structures & Algorithms',
            selectedObjectType: detail.type, selectedObjectContent: detail.content,
          },
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.message || payload.error || 'AI could not answer right now.');
      const result = payload.data || payload; answerEl.textContent = [result.directAnswer, result.explanation, result.additionalExplanation].filter(Boolean).join('\n\n') || result.answer || 'No answer was returned.';
    } catch (error) { answerEl.textContent = error.message || 'Could not contact the AI service.'; }
    finally { $('dsa-ask-ai').disabled = false; $('dsa-ask-ai').textContent = 'Ask AI about this step'; }
  }
  function launchBoard() {
    const context = { type: 'sim', title: params.get('title') || 'Data Structures & Algorithms', simKey: 'cs-dsa-lab', topic: currentTopic(), state: JSON.parse(contextSnapshot()), category: currentCategory, simulationId: currentActivityId, config: assignedConfig };
    window.parent.postMessage({ type: 'EDUVERSE_DSA_LAUNCH_SMARTBOARD', context }, window.location.origin);
  }
  function initialize() {
    document.title = `${params.get('title') || 'Data Structures & Algorithms'} · Eduverse`;
    $('dsa-title').textContent = params.get('title') || 'Data Structures & Algorithms';
    $('dsa-subtitle').textContent = assignedConfig.description || 'Explore a structure, run an algorithm, and follow every step.';
    $('dsa-subject').textContent = subjectContext.subjectName ? `${subjectContext.subjectCode ? `${subjectContext.subjectCode} · ` : ''}${subjectContext.subjectName}` : 'EDUVERSE · INTERACTIVE LAB';
    $('dsa-context-badge').textContent = `${subjectContext.departmentName || 'Subject'}${subjectContext.semesterNumber ? ` · Semester ${subjectContext.semesterNumber}` : ''}`;
    $('dsa-topic').textContent = `${currentTopic()}${assignedConfig.difficulty ? ` · ${assignedConfig.difficulty}` : ''}`;
    $('dsa-close').classList.toggle('hidden', !embedded);
    if (lockedCategory) {
      document.body.classList.add('dsa-board-mode');
      const categoryLabel = categorySelect.closest('label');
      if (categoryLabel) categoryLabel.classList.add('hidden');
    }
    $('dsa-launch-board').classList.toggle('hidden', embedded);
    $('dsa-close').addEventListener('click', () => window.parent.postMessage({ type: 'EDUVERSE_DSA_CLOSE' }, window.location.origin));
    $('dsa-launch-board').addEventListener('click', launchBoard);
    $('dsa-fullscreen').addEventListener('click', async () => {
      try {
        if (document.fullscreenElement) await document.exitFullscreen();
        else await $('dsa-app').requestFullscreen();
      } catch (error) { showToast('Full screen is not available in this window.'); }
    });
    document.addEventListener('fullscreenchange', () => { $('dsa-fullscreen').textContent = document.fullscreenElement ? '⛶ Exit full screen' : '⛶ Full screen'; });
    $('dsa-play').addEventListener('click', play); $('dsa-pause').addEventListener('click', stopPlayback);
    $('dsa-prev').addEventListener('click', () => moveTo(cursor - 1)); $('dsa-next').addEventListener('click', () => moveTo(cursor + 1));
    $('dsa-reset').addEventListener('click', () => { stopPlayback(); moveTo(0); activityCompletionSent = false; });
    $('dsa-generate').addEventListener('click', syncValues);
    $('dsa-randomize').addEventListener('click', () => {
      if (currentCategory === 'graph') {
        const size = Math.min(8, Math.max(4, graph.nodes.length || 6));
        valuesInput.value = Array.from({ length: size }, (_, index) => String.fromCharCode(65 + index)).join(', ');
      } else {
        const size = Math.min(10, Math.max(5, values.length || 7));
        valuesInput.value = Array.from({ length: size }, () => Math.floor(Math.random() * 90) + 10).join(', ');
      }
      syncValues();
    });
    $('dsa-clear').addEventListener('click', () => {
      valuesInput.value = ''; values = []; queueState = null;
      if (currentCategory === 'graph') graph = { nodes: [], edges: [] };
      renderOperationControls(); buildInitialTimeline(); render();
    });
    $('dsa-sort-input').addEventListener('click', () => { try { values = readNumbers().slice().sort((a, b) => a - b); valuesInput.value = values.join(', '); allowUnsortedBinary = false; $('dsa-binary-warning').classList.add('hidden'); binarySearch(Number($('dsa-operation-value')?.value || 0)); showToast('Values sorted. Binary Search started.'); } catch (error) { showToast(error.message); } });
    $('dsa-continue-unsorted').addEventListener('click', () => { allowUnsortedBinary = true; $('dsa-binary-warning').classList.add('hidden'); showToast('Warning acknowledged. Results may be incorrect on unsorted data.'); });
    $('dsa-ask-ai').addEventListener('click', askAI);
    $('dsa-category').addEventListener('change', (event) => setCategory(event.target.value));
    $('dsa-algorithm').addEventListener('change', () => { stopPlayback(); allowUnsortedBinary = false; $('dsa-binary-warning').classList.add('hidden'); buildInitialTimeline(); renderOperationControls(); render(); });
    $('dsa-speed').addEventListener('change', () => { if (timer) play(); });
    if (assignedConfig.allowCustomInput === false) { $('dsa-data-row').classList.add('hidden'); $('dsa-input-help').classList.add('hidden'); }
    if (assignedConfig.stepByStep === false) { $('dsa-prev').classList.add('hidden'); $('dsa-next').classList.add('hidden'); }
    if (assignedConfig.showPseudocode === false) $('dsa-pseudocode-card').classList.add('hidden');
    if (assignedConfig.showComplexity === false) $('dsa-complexity-card').classList.add('hidden');
    const selectedCategory = labels[defaultCategory] ? defaultCategory : 'searching';
    categorySelect.value = selectedCategory;
    valuesInput.value = selectedCategory === 'sorting' ? (assignedConfig.defaultExample || '5, 3, 8, 1, 2') : defaultData;
    if (params.get('state')) {
      try { const initial = JSON.parse(params.get('state')); if (Array.isArray(initial.values)) valuesInput.value = initial.values.join(', '); } catch (error) {}
    }
    try { values = readNumbers(); } catch (error) { values = [10, 20, 30, 40, 50, 60, 70]; valuesInput.value = values.join(', '); }
    setCategory(selectedCategory);
    if (subjectContext.role.toLowerCase() === 'student') sendActivity('OPENED', currentTopic());
    if (params.get('state')) {
      try { const initial = JSON.parse(params.get('state')); if (initial.algorithm && algorithms.searching.some((item) => item.value === initial.algorithm) || initial.algorithm && algorithms.sorting.some((item) => item.value === initial.algorithm)) algorithmSelect.value = initial.algorithm; }
      catch (error) {}
      renderOperationControls(); buildTimelineForCurrentOperation();
    }
    document.addEventListener('visibilitychange', () => { if (document.hidden) stopPlayback(); });
    window.addEventListener('pagehide', stopPlayback, { once: true });
  }
  function selectTestCategory(category, inputValues = []) {
    currentCategory = category;
    algorithmSelect.value = category === 'searching' ? 'linear' : category === 'sorting' ? 'bubble' : category === 'graph' ? 'bfs' : category === 'binary-tree' ? 'traversal' : '';
    if (category === 'graph') {
      graph = inputValues && !Array.isArray(inputValues)
        ? cloneGraph(inputValues)
        : { nodes: ['A', 'B', 'C', 'D', 'E', 'F'], edges: [['A', 'B', 1], ['B', 'A', 1], ['A', 'C', 1], ['C', 'A', 1], ['B', 'D', 1], ['D', 'B', 1], ['B', 'E', 1], ['E', 'B', 1], ['C', 'F', 1], ['F', 'C', 1]] };
      values = [];
    } else {
      values = Array.isArray(inputValues) ? inputValues.slice() : readNumbers(String(inputValues));
      valuesInput.value = values.join(', ');
    }
    queueState = null;
    allowUnsortedBinary = false;
    fixedCapacity = false;
    queueCapacity = 8;
    testMessages.length = 0;
    activityCompletionSent = false;
    buildInitialTimeline();
  }
  function testFrames() { return JSON.parse(JSON.stringify(frames)); }
  if (testMode) {
    window.__EDUVERSE_DSA_TEST_API__ = Object.freeze({
      selectCategory: selectTestCategory,
      setAlgorithm: (algorithm) => { algorithmSelect.value = algorithm; },
      validateInput: (raw) => readNumbers(raw),
      linearSearch: (target) => linearSearch(Number(target)),
      binarySearch: (target) => binarySearch(Number(target)),
      sort: (algorithm) => sortFrames(algorithm),
      arrayAction: (action, value, index) => arrayAction(action, Number(value), Number(index)),
      stackAction: (action, value, capacity, fixed = false) => { fixedCapacity = fixed; return stackAction(action, Number(value || 0), Number(capacity || 8)); },
      queueAction: (action, value, capacity, circular) => { queueCapacity = Number(capacity || 8); return queueAction(action, Number(value || 0), queueCapacity, Boolean(circular)); },
      linkedListAction: (action, value, position) => linkedListAction(action, Number(value || 0), Number(position || 0)),
      treeTraversal,
      bstInsert: (value) => bstInsert(Number(value)),
      bstSearch: (value) => bstSearch(Number(value)),
      bstDelete: (value) => bstDelete(Number(value)),
      bstMinMax: (kind) => bstMinMax(kind),
      graphAction: (action, value, edge, directed = false, weighted = false) => graphAction(action, value, edge, directed, weighted),
      graphTraversal: (method, start) => graphTraversal(method, start),
      moveTo: (step) => { cursor = Math.max(0, Math.min(frames.length - 1, Number(step))); maybeSendCompletion(); },
      getFrames: testFrames,
      getState: () => ({ category: currentCategory, algorithm: currentAlgorithm(), values: values.slice(), graph: cloneGraph(graph), queueState: queueState ? { ...queueState, queueSlots: queueState.queueSlots.slice() } : null, cursor, completed: activityCompletionSent, messages: testMessages.slice() }),
    });
  } else initialize();
})();
