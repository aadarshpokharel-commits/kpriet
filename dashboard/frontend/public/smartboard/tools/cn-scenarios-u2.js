'use strict';
/* Computer Networks simulations — Unit 2: Data Link Layer */
(function (root) {
  const S = (root.CNScenarios = root.CNScenarios || {});
  const F = (title, why, scene, state = {}, adv = {}, next = '') => ({ title, why, scene, state, adv, next });
  const cellsOf = (str, cls) => String(str).split('').map((t) => ({ t, cls }));
  const bitsOnly = (s, name, maxLen) => {
    const v = String(s || '').replace(/\s+/g, '');
    if (!/^[01]+$/.test(v)) throw new Error(`${name} must contain only 0s and 1s.`);
    if (v.length > maxLen) throw new Error(`${name} can be at most ${maxLen} bits.`);
    return v;
  };

  // ════════════════════ FRAMING ════════════════════
  S['cn-framing'] = {
    inputs: [
      { key: 'method', label: 'Framing method', type: 'select', default: 'bit', options: [['count', 'Character count'], ['byte', 'Byte (character) stuffing'], ['bit', 'Bit stuffing']] },
      { key: 'bits', label: 'Data bits', type: 'text', default: '011111101111110', max: 24, showIf: (i) => i.method === 'bit' },
      { key: 'bytes', label: 'Data (use FLAG and ESC as special bytes)', type: 'text', default: 'A FLAG B ESC C', max: 60, showIf: (i) => i.method === 'byte' },
      { key: 'text', label: 'Message', type: 'text', default: 'NETWORKS', max: 20, showIf: (i) => i.method === 'count' },
      { key: 'size', label: 'Characters per frame', type: 'number', default: 3, min: 1, max: 8, showIf: (i) => i.method === 'count' },
    ],
    build(inp) {
      const frames = [];
      if (inp.method === 'bit') {
        const data = bitsOnly(inp.bits || '011111101111110', 'Data', 24);
        const FLAG = '01111110';
        const out = []; let ones = 0; const events = [];
        for (let i = 0; i < data.length; i++) {
          out.push({ t: data[i], cls: 'plain', src: i });
          ones = data[i] === '1' ? ones + 1 : 0;
          if (ones === 5) { out.push({ t: '0', cls: 'new' }); events.push({ at: i, len: out.length }); ones = 0; }
        }
        const dataRow = (upto, hl) => ({ label: 'Data', cells: data.split('').map((t, i) => ({ t, cls: i === hl ? 'hl' : i < upto ? 'dim' : 'plain' })) });
        frames.push(F('Bit stuffing: the frame starts and ends with the flag 01111110.', 'The flag contains six 1s in a row. To stop the same pattern appearing inside the data, the sender inserts a 0 after every five consecutive 1s.',
          [{ type: 'bits', box: [20, 20, 960, 300], title: 'Sender', rows: [dataRow(0, -1), { label: 'Flag', cells: cellsOf(FLAG, 'flag') }] }],
          { Method: 'Bit stuffing', 'Data bits': data.length, 'Stuffed 0s': 0 }, { Flag: FLAG }, 'Scan the data bits.'));
        let shown = 0;
        events.forEach((ev, k) => {
          shown = ev.len;
          frames.push(F(`Five 1s in a row (ending at bit ${ev.at + 1}) → insert a 0.`, 'The inserted 0 guarantees the receiver never sees six 1s in the data, so 01111110 can only mean "flag".',
            [{ type: 'bits', box: [20, 20, 960, 300], title: 'Sender', rows: [dataRow(ev.at + 1, ev.at), { label: 'Stuffed so far', cells: out.slice(0, shown).map((c, j) => ({ t: c.t, cls: j === shown - 1 ? 'new' : c.cls === 'new' ? 'new' : 'plain' })) }] }],
            { Method: 'Bit stuffing', 'Position scanned': ev.at + 1, 'Stuffed 0s': k + 1 }, {}, 'Continue scanning.'));
        });
        const framed = [...cellsOf(FLAG, 'flag'), ...out.map((c) => ({ t: c.t, cls: c.cls === 'new' ? 'new' : 'plain' })), ...cellsOf(FLAG, 'flag')];
        frames.push(F(`Frame ready: flag + ${out.length} bits + flag (${events.length} stuffed 0${events.length === 1 ? '' : 's'}).`, events.length ? 'Orange bits are the stuffed zeros.' : 'The data never had five 1s in a row, so nothing needed stuffing.',
          [{ type: 'bits', box: [20, 20, 960, 300], title: 'Transmitted frame', rows: [{ label: 'Frame', cells: framed }] }],
          { Method: 'Bit stuffing', 'Frame length': framed.length, 'Stuffed 0s': events.length, Overhead: `${events.length + 16} bits` }, {}, 'The receiver removes the stuffing.'));
        frames.push(F('Receiver: after five 1s, a 0 is removed (de-stuffing).', 'The receiver strips the flags, then deletes every 0 that follows five consecutive 1s — recovering the original data exactly.',
          [{ type: 'bits', box: [20, 20, 960, 300], title: 'Receiver', rows: [{ label: 'Received', cells: out.map((c) => ({ t: c.t, cls: c.cls === 'new' ? 'err' : 'plain' })) }, { label: 'Recovered', cells: cellsOf(data, 'ok') }] }],
          { Method: 'Bit stuffing', Recovered: data, Match: 'Yes' }, {}, 'Done.'));
        return frames;
      }
      if (inp.method === 'byte') {
        const toks = String(inp.bytes || '').trim().split(/\s+/).filter(Boolean).map((t) => t.toUpperCase());
        if (!toks.length) throw new Error('Enter some data bytes, e.g. A FLAG B ESC C.');
        if (toks.length > 14) throw new Error('Use at most 14 bytes.');
        const cls = (t) => (t === 'FLAG' ? 'flag' : t === 'ESC' ? 'esc' : 'plain');
        const tokCells = (list, hl, stuffedIdx = []) => list.map((t, i) => ({ t: t === 'FLAG' ? 'F' : t === 'ESC' ? 'E' : t.slice(0, 2), cls: stuffedIdx.includes(i) ? 'new' : i === hl ? 'hl' : cls(t) }));
        frames.push(F('Byte stuffing: frames are delimited by a FLAG byte.', 'If a FLAG or ESC byte occurs inside the data, the sender puts an ESC byte in front of it so the receiver treats it as data, not as a delimiter.',
          [{ type: 'bits', box: [20, 20, 960, 300], title: 'Data bytes (F = FLAG, E = ESC)', rows: [{ label: 'Data', cells: tokCells(toks, -1) }] }], { Method: 'Byte stuffing', Bytes: toks.length }, {}, 'Scan each byte.'));
        const out = []; const stuffed = [];
        toks.forEach((t, i) => {
          if (t === 'FLAG' || t === 'ESC') {
            stuffed.push(out.length); out.push('ESC'); out.push(t);
            frames.push(F(`Byte ${i + 1} is ${t} → insert ESC before it.`, `Without the ESC, the receiver would read this ${t} as ${t === 'FLAG' ? 'the end of the frame' : 'an escape for the next byte'}.`,
              [{ type: 'bits', box: [20, 20, 960, 300], title: 'Sender', rows: [{ label: 'Data', cells: tokCells(toks, i) }, { label: 'Stuffed', cells: tokCells(out, -1, stuffed) }] }], { Method: 'Byte stuffing', Scanning: `byte ${i + 1}`, 'ESC added': stuffed.length }, {}, 'Continue.'));
          } else out.push(t);
        });
        const frame = ['FLAG', ...out, 'FLAG'];
        frames.push(F(`Frame: FLAG + ${out.length} bytes + FLAG.`, `${stuffed.length} escape byte${stuffed.length === 1 ? '' : 's'} added (orange).`, [{ type: 'bits', box: [20, 20, 960, 300], title: 'Transmitted frame', rows: [{ label: 'Frame', cells: tokCells(frame, -1, stuffed.map((x) => x + 1)) }] }], { Method: 'Byte stuffing', 'Frame bytes': frame.length, 'ESC added': stuffed.length }, {}, 'Receiver removes the ESC bytes.'));
        frames.push(F('Receiver removes each ESC and keeps the byte after it.', 'The original data is restored exactly.', [{ type: 'bits', box: [20, 20, 960, 300], title: 'Receiver', rows: [{ label: 'Received', cells: tokCells(out, -1, stuffed) }, { label: 'Recovered', cells: toks.map((t) => ({ t: t === 'FLAG' ? 'F' : t === 'ESC' ? 'E' : t.slice(0, 2), cls: 'ok' })) }] }], { Method: 'Byte stuffing', Recovered: toks.join(' ') }, {}, 'Done.'));
        return frames;
      }
      const text = String(inp.text || 'NETWORKS').slice(0, 20) || 'NETWORKS';
      const size = Math.max(1, Math.min(8, Number(inp.size) || 3));
      const chunks = []; for (let i = 0; i < text.length; i += size) chunks.push(text.slice(i, i + size));
      const rowFor = (k, hl) => ({ label: `Frame ${k + 1}`, cells: [{ t: String(chunks[k].length + 1), cls: hl ? 'hl' : 'flag' }, ...cellsOf(chunks[k], 'plain')], note: `count = ${chunks[k].length} chars + 1 (count byte)` });
      frames.push(F('Character count: the first byte of each frame tells its length.', 'The count includes itself, so the receiver knows exactly where the next frame starts.', [{ type: 'bits', box: [20, 20, 960, 400], title: 'Message', rows: [{ label: 'Data', cells: cellsOf(text, 'plain') }] }], { Method: 'Character count', Frames: chunks.length }, {}, 'Build each frame.'));
      chunks.forEach((c, k) => frames.push(F(`Frame ${k + 1}: count ${c.length + 1}, data "${c}".`, 'The sender writes the length first, then the characters.', [{ type: 'bits', box: [20, 20, 960, 440], title: 'Frames', rows: chunks.slice(0, k + 1).map((_, j) => rowFor(j, j === k)) }], { Method: 'Character count', Frame: k + 1, Count: c.length + 1 }, {}, 'Next frame.')));
      if (chunks.length > 1) {
        const bad = chunks[0].length + 3;
        frames.push(F(`Problem: if the first count is corrupted (${chunks[0].length + 1} → ${bad}), the receiver loses synchronisation.`, 'The receiver would read the wrong bytes as the next count, so every following frame is misread. This is why character count is rarely used alone.', [{ type: 'bits', box: [20, 20, 960, 300], title: 'Corrupted count', rows: [{ label: 'Stream', cells: [{ t: String(bad), cls: 'err' }, ...cellsOf(chunks[0], 'plain'), { t: String(chunks[1].length + 1), cls: 'err' }, ...cellsOf(chunks[1], 'dim')], note: 'next "count" is read in the wrong place', noteTone: 'red' }] }], { Method: 'Character count', Weakness: 'No resynchronisation' }, {}, 'Done.'));
      }
      return frames;
    },
  };

  // ════════════════════ CRC / HAMMING ════════════════════
  function crcDivide(bitsStr, gen) {
    const a = bitsStr.split('').map(Number); const g = gen.split('').map(Number); const r = g.length - 1; const steps = [];
    for (let i = 0; i + r < a.length; i++) {
      const lead = a[i];
      const before = a.slice();
      if (lead) for (let j = 0; j <= r; j++) a[i + j] ^= g[j];
      steps.push({ i, lead, before, after: a.slice() });
    }
    return { steps, remainder: a.slice(a.length - r).join('') };
  }
  S['cn-crc'] = {
    inputs: [
      { key: 'mode', label: 'Technique', type: 'select', default: 'crc', options: [['crc', 'CRC error detection'], ['hamming', 'Hamming code error correction']] },
      { key: 'data', label: 'Data bits', type: 'text', default: '1101011011', max: 16, showIf: (i) => i.mode === 'crc' },
      { key: 'gen', label: 'Generator (divisor)', type: 'text', default: '10011', max: 9, showIf: (i) => i.mode === 'crc' },
      { key: 'hdata', label: 'Data bits', type: 'text', default: '1011', max: 11, showIf: (i) => i.mode === 'hamming' },
      { key: 'errbit', label: 'Flip bit during transmission (0 = no error)', type: 'number', default: 0, min: 0, max: 24 },
    ],
    build(inp, ctx) {
      if (inp.mode === 'hamming') return hamming(inp);
      const M = bitsOnly(inp.data || '1101011011', 'Data', 16);
      const G = bitsOnly(inp.gen || '10011', 'Generator', 9);
      if (G[0] !== '1' || G.length < 2) throw new Error('The generator must start with 1 and have at least 2 bits.');
      const r = G.length - 1;
      const dividend = M + '0'.repeat(r);
      const { steps, remainder } = crcDivide(dividend, G);
      const poly = G.split('').map((b, i) => (b === '1' ? (G.length - 1 - i === 0 ? '1' : G.length - 1 - i === 1 ? 'x' : `x^${G.length - 1 - i}`) : null)).filter(Boolean).join(' + ');
      const frames = [];
      frames.push(F(`Append ${r} zeros (degree of the generator) to the data.`, 'CRC treats the bits as a polynomial. Dividing M·x^r by the generator gives a remainder that the sender appends, so the whole codeword divides evenly.',
        [{ type: 'bits', box: [20, 20, 960, 200], title: 'Sender', rows: [{ label: 'Data M', cells: cellsOf(M, 'plain') }, { label: 'Generator G', cells: cellsOf(G, 'flag') }, { label: 'Dividend', cells: [...cellsOf(M, 'plain'), ...cellsOf('0'.repeat(r), 'new')] }] }],
        { 'Data bits': M.length, 'Generator': G, 'CRC bits (r)': r }, { 'Generator polynomial': poly }, 'Start the modulo-2 division.'));
      steps.forEach((st, k) => {
        const rows = [
          { label: 'Current bits', cells: st.before.map((b, j) => ({ t: String(b), cls: j < st.i ? 'dim' : j <= st.i + r ? 'hl' : 'plain' })) },
          { label: st.lead ? 'XOR with G' : 'XOR with 0s', indent: st.i, cells: cellsOf(st.lead ? G : '0'.repeat(G.length), st.lead ? 'flag' : 'dim') },
          { label: 'Result', cells: st.after.map((b, j) => ({ t: String(b), cls: j < st.i + 1 ? 'dim' : j <= st.i + r ? 'new' : 'plain' })) },
        ];
        if (!ctx.advanced && k > 0 && k < steps.length - 1 && !st.lead) return; // basic view skips "leading 0" steps in the middle
        frames.push(F(`Step ${k + 1}: leading bit is ${st.lead} → ${st.lead ? 'XOR with the generator' : 'XOR with zeros (shift)'}.`, 'Modulo-2 division uses XOR instead of subtraction: 1⊕1 = 0, 1⊕0 = 1. Only a leading 1 is "divided" by the generator.',
          [{ type: 'bits', box: [20, 20, 960, 220], title: `Division step ${k + 1} of ${steps.length}`, rows }], { Step: `${k + 1} / ${steps.length}`, 'Leading bit': st.lead }, { Window: st.before.slice(st.i, st.i + r + 1).join('') }, 'Next bit.'));
      });
      const code = M + remainder;
      frames.push(F(`Remainder = ${remainder}. Transmit data + CRC = ${code}.`, 'The remainder (CRC) replaces the appended zeros. The transmitted codeword is exactly divisible by the generator.',
        [{ type: 'bits', box: [20, 20, 960, 200], title: 'Codeword', rows: [{ label: 'Transmit', cells: [...cellsOf(M, 'plain'), ...cellsOf(remainder, 'ok')] }] }], { CRC: remainder, Codeword: code }, {}, 'The receiver checks the codeword.'));
      const eb = Math.max(0, Math.min(code.length, Number(inp.errbit) || 0));
      const recv = eb ? code.slice(0, eb - 1) + (code[eb - 1] === '1' ? '0' : '1') + code.slice(eb) : code;
      const check = crcDivide(recv, G);
      if (ctx.advanced) {
        check.steps.forEach((st, k) => {
          frames.push(F(`Receiver step ${k + 1}: leading bit ${st.lead}.`, 'The receiver divides the received codeword by the same generator.', [{ type: 'bits', box: [20, 20, 960, 220], title: `Receiver division ${k + 1} of ${check.steps.length}`, rows: [
            { label: 'Current bits', cells: st.before.map((b, j) => ({ t: String(b), cls: j < st.i ? 'dim' : j <= st.i + r ? 'hl' : 'plain' })) },
            { label: st.lead ? 'XOR with G' : 'XOR with 0s', indent: st.i, cells: cellsOf(st.lead ? G : '0'.repeat(G.length), st.lead ? 'flag' : 'dim') },
          ] }], { Step: `${k + 1} / ${check.steps.length}` }, {}, 'Next bit.'));
        });
      }
      const ok = /^0+$/.test(check.remainder);
      frames.push(F(ok ? `Receiver remainder = ${check.remainder} → no error detected, frame accepted.` : `Receiver remainder = ${check.remainder} ≠ 0 → error detected, frame discarded.`,
        ok ? 'A zero remainder means the codeword is still divisible by the generator.' : `Bit ${eb} was flipped on the link. A non-zero remainder tells the receiver the frame is corrupt; it is discarded and the sender retransmits (ARQ).`,
        [{ type: 'bits', box: [20, 20, 960, 220], title: 'Receiver check', rows: [{ label: 'Sent', cells: cellsOf(code, 'plain') }, { label: 'Received', cells: recv.split('').map((b, j) => ({ t: b, cls: j === eb - 1 ? 'err' : 'plain' })) }, { label: 'Remainder', cells: cellsOf(check.remainder, ok ? 'ok' : 'err'), note: ok ? 'accept' : 'reject', noteTone: ok ? 'green' : 'red' }] }],
        { Received: recv, Remainder: check.remainder, Result: ok ? 'Accepted' : 'Error detected' }, {}, 'Done.'));
      return frames;
    },
  };
  function hamming(inp) {
    const D = bitsOnly(inp.hdata || '1011', 'Data', 11);
    let r = 0; while ((1 << r) < D.length + r + 1) r++;
    const n = D.length + r;
    const code = new Array(n + 1).fill(null);
    let di = 0;
    for (let p = 1; p <= n; p++) if ((p & (p - 1)) !== 0) code[p] = Number(D[di++]);
    const pos = (arr, hlSet = [], cls = {}) => Array.from({ length: n }, (_, k) => { const p = k + 1; const isP = (p & (p - 1)) === 0; return { t: arr[p] == null ? '?' : String(arr[p]), cls: cls[p] || (hlSet.includes(p) ? 'hl' : isP ? 'flag' : 'plain') }; });
    const posRow = { label: 'Position', cells: Array.from({ length: n }, (_, k) => ({ t: String(k + 1), cls: 'dim' })) };
    const frames = [F(`Hamming code: ${D.length} data bits need ${r} parity bits (positions 1, 2, 4…).`, `Choose the smallest r with 2^r ≥ m + r + 1 (${1 << r} ≥ ${D.length} + ${r} + 1). Parity bits sit at powers of two; data fills the rest.`,
      [{ type: 'bits', box: [20, 20, 960, 200], title: `Hamming (${n}, ${D.length}) — even parity`, rows: [posRow, { label: 'Codeword', cells: pos(code) }] }], { 'Data bits (m)': D.length, 'Parity bits (r)': r, 'Code length': n }, {}, 'Compute each parity bit.')];
    for (let k = 0; k < r; k++) {
      const p = 1 << k; const covered = [];
      for (let q = 1; q <= n; q++) if (q & p) covered.push(q);
      const ones = covered.filter((q) => q !== p && code[q] === 1).length;
      code[p] = ones % 2;
      frames.push(F(`P${p} checks positions ${covered.join(', ')} → ${ones} one${ones === 1 ? '' : 's'} → P${p} = ${code[p]}.`, 'Even parity: the parity bit makes the number of 1s in its group even.',
        [{ type: 'bits', box: [20, 20, 960, 200], title: `Parity bit P${p}`, rows: [posRow, { label: 'Codeword', cells: pos(code, covered) }] }], { Parity: `P${p}`, Covers: covered.join(','), Value: code[p] }, {}, 'Next parity bit.'));
    }
    const sent = code.slice();
    const eb = Math.max(0, Math.min(n, Number(inp.errbit) || 0));
    const recv = sent.slice(); if (eb) recv[eb] ^= 1;
    frames.push(F(eb ? `Bit ${eb} is flipped during transmission.` : 'Codeword transmitted without errors.', 'The receiver does not know which bit (if any) changed.', [{ type: 'bits', box: [20, 20, 960, 200], title: 'Transmission', rows: [posRow, { label: 'Sent', cells: pos(sent) }, { label: 'Received', cells: pos(recv, [], eb ? { [eb]: 'err' } : {}) }] }], { Sent: sent.slice(1).join(''), Received: recv.slice(1).join('') }, {}, 'Receiver recomputes the checks.'));
    let syn = 0; const checks = [];
    for (let k = 0; k < r; k++) { const p = 1 << k; let x = 0; for (let q = 1; q <= n; q++) if (q & p) x ^= recv[q]; checks.push(`C${p}=${x}`); if (x) syn += p; }
    const fixed = recv.slice(); if (syn && syn <= n) fixed[syn] ^= 1;
    frames.push(F(`Syndrome ${checks.join(', ')} → error position ${syn || 'none'}.`, syn ? `The failed checks add up to position ${syn}, so the receiver flips that bit back — the error is corrected without retransmission.` : 'All checks pass: no single-bit error.',
      [{ type: 'bits', box: [20, 20, 960, 240], title: 'Receiver', rows: [posRow, { label: 'Received', cells: pos(recv, [], syn ? { [syn]: 'err' } : {}) }, { label: 'Corrected', cells: pos(fixed, [], syn ? { [syn]: 'ok' } : {}) }] }],
      { Syndrome: syn, Corrected: syn ? `bit ${syn}` : 'nothing', Data: Array.from({ length: n }, (_, k) => k + 1).filter((p) => (p & (p - 1)) !== 0).map((p) => fixed[p]).join('') }, {}, 'Done.'));
    return frames;
  }

  // ════════════════════ STOP-AND-WAIT ARQ ════════════════════
  S['cn-stop-wait'] = {
    inputs: [
      { key: 'count', label: 'Frames to send', type: 'number', default: 3, min: 1, max: 6 },
      { key: 'scenario', label: 'Scenario', type: 'select', default: 'lostframe', options: [['none', 'No errors'], ['lostframe', 'A frame is lost'], ['lostack', 'An ACK is lost'], ['both', 'Frame lost, then ACK lost']] },
      { key: 'which', label: 'Affected frame number', type: 'number', default: 2, min: 1, max: 6 },
    ],
    build(inp) {
      const n = Math.max(1, Math.min(6, Number(inp.count) || 3));
      const k = Math.max(1, Math.min(n, Number(inp.which) || 2));
      const sc = inp.scenario || 'none';
      const lostFrame = new Set(sc === 'lostframe' || sc === 'both' ? [k] : []);
      const lostAck = new Set(sc === 'lostack' ? [k] : sc === 'both' ? [Math.min(n, k + 1)] : []);
      const actors = [{ name: 'Sender', info: 'Sends one frame, starts a timer and waits for its ACK.' }, { name: 'Receiver', info: 'Accepts the frame with the expected sequence number and ACKs it.' }];
      const msgs = []; const frames = [];
      let expect = 0; let sent = 0; let delivered = 0; let retrans = 0;
      const snap = (title, why, st, next) => { frames.push(F(title, why, [{ type: 'seq', box: [20, 6, 960, 548], actors, msgs: msgs.slice(-12), cur: Math.min(msgs.length, 12) - 1, states: st }], { 'Frames delivered': `${delivered} / ${n}`, 'Receiver expects': `seq ${expect}`, Retransmissions: retrans }, { 'Frames sent (incl. retries)': sent }, next)); };
      for (let i = 1; i <= n; i++) {
        const seq = (i - 1) % 2; let attempt = 0;
        for (;;) {
          attempt++; sent++;
          const lose = attempt === 1 && lostFrame.has(i);
          msgs.push({ from: 0, to: 1, label: `Frame ${i} (seq ${seq})${attempt > 1 ? ' — resent' : ''}`, token: `F${i}`, detail: `seq=${seq}, timer started`, lost: lose });
          if (lose) {
            snap(`Frame ${i} (seq ${seq}) is lost on the link.`, 'The sender keeps a copy and its timer is running; the receiver never sees this frame.', ['Timer running', `Expect ${expect}`], 'The timer expires.');
            msgs.push({ note: '⏰ Timeout', at: 0, tone: 'red' }); retrans++;
            snap('Timeout: no ACK arrived in time.', 'Stop-and-Wait resends the same frame (same sequence number) when the timer expires.', ['Resend', `Expect ${expect}`], `Resend frame ${i}.`);
            continue;
          }
          const dup = seq !== expect;
          if (!dup) { expect = 1 - expect; delivered++; }
          snap(dup ? `Receiver gets frame ${i} again (seq ${seq}) — duplicate!` : `Receiver gets frame ${i} (seq ${seq}) and delivers it.`, dup ? `It expected seq ${expect}, so it discards the duplicate but ACKs it again so the sender can move on.` : `Seq ${seq} was expected. The receiver now expects seq ${expect}.`, ['Waiting for ACK', dup ? 'Discard duplicate' : `Expect ${expect}`], 'Receiver sends an ACK.');
          const loseAck = attempt === 1 && lostAck.has(i);
          msgs.push({ from: 1, to: 0, label: `ACK ${expect}`, token: `ACK${expect}`, detail: `next expected = ${expect}`, lost: loseAck });
          if (loseAck) {
            snap(`ACK ${expect} is lost.`, 'The frame was delivered, but the sender cannot know that.', ['Timer running', `Expect ${expect}`], 'The timer expires.');
            msgs.push({ note: '⏰ Timeout', at: 0, tone: 'red' }); retrans++;
            snap('Timeout: the sender resends the same frame.', 'Because the sequence number is the same, the receiver will recognise it as a duplicate.', ['Resend', `Expect ${expect}`], `Resend frame ${i}.`);
            continue;
          }
          snap(`Sender receives ACK ${expect} and stops the timer.`, i < n ? `Frame ${i} is confirmed. The sender may now send frame ${i + 1} with seq ${1 - seq}.` : 'All frames are confirmed.', [i < n ? 'Ready' : 'Done', `Expect ${expect}`], i < n ? 'Send the next frame.' : 'Transfer complete.');
          break;
        }
      }
      frames.unshift(F('Stop-and-Wait ARQ: send one frame, then wait for its ACK.', 'Sequence numbers alternate 0, 1, 0, 1… A timer handles lost frames or ACKs; the sequence number lets the receiver drop duplicates.', [{ type: 'seq', box: [20, 6, 960, 548], actors, msgs: [], cur: -1, states: ['Ready', 'Expect 0'] }], { 'Frames delivered': `0 / ${n}`, 'Receiver expects': 'seq 0', Retransmissions: 0 }, { Efficiency: 'Low on long links — the sender is idle while waiting' }, 'Send frame 1.'));
      return frames;
    },
  };

  // ════════════════════ SLIDING WINDOW (GBN / SR) ════════════════════
  function slidingWindow(inp) {
    const proto = inp.protocol === 'sr' ? 'sr' : 'gbn';
    const N = Math.max(2, Math.min(7, Number(inp.window) || 4));
    const total = Math.max(3, Math.min(12, Number(inp.total) || 8));
    const lostK = Math.max(0, Math.min(total, Number(inp.lost) || 0)); // 1-based, 0 none
    const m = proto === 'gbn' ? Math.ceil(Math.log2(N + 1)) : Math.ceil(Math.log2(2 * N));
    const actors = [{ name: 'Sender', info: `Window of ${N} frames` }, { name: 'Receiver', info: proto === 'gbn' ? 'Accepts only the next in-order frame (window 1).' : `Buffers out-of-order frames (window ${N}).` }];
    const msgs = []; const frames = [];
    let base = 0; let next = 0; let expected = 0; let delivered = 0; let retrans = 0;
    const acked = new Array(total).fill(false); const lostOnce = new Array(total).fill(false); const sentOnce = new Array(total).fill(false);
    const rbuf = new Array(total).fill(false); const inflight = [];
    const label = (i) => `F${i + 1} (seq ${i % (1 << m)})`;
    const senderCells = () => Array.from({ length: total }, (_, i) => ({ t: `F${i + 1}`, st: acked[i] || (proto === 'gbn' && i < base) ? 'acked' : lostOnce[i] && !inflight.includes(i) && i >= base && !acked[i] && i < next ? 'lost' : i < next ? 'sent' : i < base + N ? 'usable' : 'notyet' }));
    const recvCells = () => Array.from({ length: total }, (_, i) => ({ t: `F${i + 1}`, st: i < expected ? 'recv' : rbuf[i] ? 'buffered' : i === expected ? 'expected' : 'notyet' }));
    const snap = (title, why, next2) => {
      const shown = msgs.slice(-10);
      frames.push(F(title, why, [
        { type: 'window', box: [10, 4, 980, 110], title: `Sender window (N = ${N})`, cells: senderCells(), win: { from: base, size: N, label: `base F${base + 1} … F${Math.min(total, base + N)}` } },
        { type: 'window', box: [10, 116, 980, 110], title: proto === 'gbn' ? 'Receiver (accepts in order only)' : `Receiver window (N = ${N})`, cells: recvCells(), win: proto === 'sr' ? { from: expected, size: N, label: 'receive window' } : { from: expected, size: 1, label: 'expected' } },
        { type: 'seq', box: [10, 230, 980, 326], actors, msgs: shown, cur: shown.length - 1, minRows: 8 },
      ], { Protocol: proto === 'gbn' ? 'Go-Back-N' : 'Selective Repeat', Base: base, 'Next to send': next, 'Delivered in order': `${delivered} / ${total}`, Retransmissions: retrans }, { 'Sequence bits (m)': m, 'Max window': proto === 'gbn' ? `2^m − 1 = ${(1 << m) - 1}` : `2^(m−1) = ${1 << (m - 1)}` }, next2));
    };
    snap(`${proto === 'gbn' ? 'Go-Back-N' : 'Selective Repeat'}: the sender may have up to ${N} unacknowledged frames.`, proto === 'gbn' ? 'Go-Back-N keeps the pipe full. On a loss, the receiver discards later frames and the sender resends everything from the lost frame.' : 'Selective Repeat also pipelines, but the receiver buffers out-of-order frames and only the lost frame is resent.', 'Fill the window.');
    let guard = 0;
    while (base < total && guard++ < 300) {
      if (next < base + N && next < total) {
        const i = next; next++;
        const lose = i + 1 === lostK && !sentOnce[i];
        if (sentOnce[i]) retrans++;
        sentOnce[i] = true;
        msgs.push({ from: 0, to: 1, label: `${label(i)}${lostOnce[i] ? ' resent' : ''}`, token: `F${i + 1}`, lost: lose });
        if (lose) { lostOnce[i] = true; snap(`F${i + 1} is lost.`, 'The sender does not know yet and keeps sending within its window.', 'Continue sending.'); }
        else { inflight.push(i); snap(`Send F${i + 1}.`, `F${i + 1} is inside the window [F${base + 1} … F${base + N}], so it can be sent without waiting.`, 'Continue.'); }
        continue;
      }
      if (!inflight.length) {
        // timeout
        const t = proto === 'gbn' ? base : acked.findIndex((a, j) => !a && j >= base);
        msgs.push({ note: `⏰ Timeout F${t + 1}`, at: 0, tone: 'red' });
        if (proto === 'gbn') { next = base; snap(`Timeout for F${base + 1} → go back and resend F${base + 1} … F${Math.min(total, base + N)}.`, 'Go-Back-N retransmits the lost frame and every frame after it that was already sent.', 'Resend the window.'); }
        else { retrans++; msgs.push({ from: 0, to: 1, label: `${label(t)} resent`, token: `F${t + 1}` }); inflight.push(t); snap(`Timeout for F${t + 1} → resend only F${t + 1}.`, 'Selective Repeat resends just the frame that was not acknowledged.', 'Receiver fills the gap.'); }
        continue;
      }
      const f = inflight.shift();
      if (proto === 'gbn') {
        if (f === expected) {
          expected++; delivered++;
          msgs.push({ from: 1, to: 0, label: `ACK ${expected + 1}`, token: `ACK${expected + 1}`, detail: 'cumulative' });
          base = Math.max(base, expected);
          snap(`Receiver accepts F${f + 1}, sends ACK ${expected + 1}; sender slides to base ${base}.`, 'The ACK is cumulative: "I have everything before F' + (expected + 1) + '".', 'Continue.');
        } else {
          msgs.push({ from: 1, to: 0, label: `ACK ${expected + 1} (dup)`, token: `ACK${expected + 1}`, tone: 'amber' });
          snap(`F${f + 1} arrives out of order → discarded; duplicate ACK ${expected + 1}.`, `The receiver is waiting for F${expected + 1}; Go-Back-N receivers do not buffer later frames.`, 'Continue.');
        }
      } else {
        const inWin = f >= expected && f < expected + N;
        if (inWin) {
          rbuf[f] = true; acked[f] = true;
          let slid = 0; while (expected < total && rbuf[expected]) { expected++; delivered++; slid++; }
          while (base < total && acked[base]) base++;
          msgs.push({ from: 1, to: 0, label: `ACK ${f + 1}`, token: `ACK${f + 1}`, detail: 'individual' });
          snap(slid ? `F${f + 1} received → deliver ${slid} frame${slid > 1 ? 's' : ''} in order; ACK ${f + 1}.` : `F${f + 1} buffered (F${expected + 1} still missing); ACK ${f + 1}.`, slid ? 'The gap is filled, so buffered frames are delivered together and the receive window slides.' : 'Selective Repeat buffers out-of-order frames and acknowledges each one individually.', 'Continue.');
        } else {
          msgs.push({ from: 1, to: 0, label: `ACK ${f + 1} (again)`, token: `ACK${f + 1}` });
          snap(`F${f + 1} is a duplicate → re-ACK.`, 'Already delivered; the receiver ACKs again in case the earlier ACK was lost.', 'Continue.');
        }
      }
    }
    frames.push(F(`All ${total} frames delivered with ${retrans} retransmission${retrans === 1 ? '' : 's'}.`, proto === 'gbn' ? 'Go-Back-N is simple for the receiver but wastes bandwidth resending frames that had arrived correctly.' : 'Selective Repeat uses bandwidth efficiently at the cost of receiver buffers and individual ACKs.', frames[frames.length - 1].scene, { Protocol: proto === 'gbn' ? 'Go-Back-N' : 'Selective Repeat', Delivered: `${total} / ${total}`, Retransmissions: retrans }, {}, 'Done.'));
    return frames;
  }
  S['cn-sliding-window'] = {
    inputs: [
      { key: 'protocol', label: 'Protocol', type: 'select', default: 'gbn', options: [['gbn', 'Go-Back-N'], ['sr', 'Selective Repeat']] },
      { key: 'window', label: 'Window size (N)', type: 'number', default: 4, min: 2, max: 7 },
      { key: 'total', label: 'Frames to send', type: 'number', default: 8, min: 3, max: 12 },
      { key: 'lost', label: 'Lose frame number (0 = none)', type: 'number', default: 3, min: 0, max: 12, },
    ],
    build: slidingWindow,
  };

  // ════════════════════ ETHERNET FRAME ════════════════════
  const CRC_TABLE = (() => { const t = []; for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  const crc32 = (bytes) => { let c = 0xffffffff; for (const b of bytes) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  const parseMac = (s, name) => {
    const v = String(s || '').trim().replace(/[-.]/g, ':');
    const parts = v.includes(':') ? v.split(':') : (v.match(/.{1,2}/g) || []);
    if (parts.length !== 6 || parts.some((p) => !/^[0-9a-fA-F]{1,2}$/.test(p))) throw new Error(`${name} must be 6 hex bytes, e.g. 00:1A:2B:3C:4D:5E.`);
    return parts.map((p) => parseInt(p, 16));
  };
  const macStr = (b) => b.map((x) => x.toString(16).padStart(2, '0').toUpperCase()).join(':');
  root.CNUtil = Object.assign(root.CNUtil || {}, { crc32, crcDivide, parseMac, macStr });
  S['cn-ethernet-frame'] = {
    inputs: [
      { key: 'dst', label: 'Destination MAC', type: 'text', default: '00:1F:3A:77:8C:21', max: 17 },
      { key: 'src', label: 'Source MAC', type: 'text', default: '00:1A:2B:3C:4D:5E', max: 17 },
      { key: 'type', label: 'EtherType', type: 'select', default: '0800', options: [['0800', '0x0800 — IPv4'], ['0806', '0x0806 — ARP'], ['86DD', '0x86DD — IPv6']] },
      { key: 'payload', label: 'Payload text', type: 'text', default: 'Hello KPRIET', max: 60 },
    ],
    build(inp) {
      const dst = parseMac(inp.dst || '00:1F:3A:77:8C:21', 'Destination MAC'); const src = parseMac(inp.src || '00:1A:2B:3C:4D:5E', 'Source MAC');
      const type = [parseInt(String(inp.type || '0800').slice(0, 2), 16), parseInt(String(inp.type || '0800').slice(2), 16)];
      const data = Array.from(new TextEncoder().encode(String(inp.payload || '')));
      const pad = Math.max(0, 46 - data.length);
      const body = [...dst, ...src, ...type, ...data, ...new Array(pad).fill(0)];
      const fcs = crc32(body);
      const fcsBytes = [fcs & 0xff, (fcs >>> 8) & 0xff, (fcs >>> 16) & 0xff, (fcs >>> 24) & 0xff]; // transmitted little-endian
      const hex = (arr) => arr.map((x) => x.toString(16).padStart(2, '0').toUpperCase()).join(' ');
      const flds = [
        { name: 'Preamble', bits: 7, value: 'AA ×7', tone: 'grey', info: '7 bytes of 10101010 that let the receiver\'s clock synchronise.' },
        { name: 'SFD', bits: 2, value: 'AB', tone: 'grey', info: 'Start Frame Delimiter 10101011 — the frame starts after it.' },
        { name: 'Destination MAC', bits: 6, value: macStr(dst), tone: 'red', info: 'Who should receive the frame (6 bytes).' },
        { name: 'Source MAC', bits: 6, value: macStr(src), tone: 'amber', info: 'Who sent the frame (6 bytes).' },
        { name: 'Type', bits: 3, value: `0x${String(inp.type || '0800').toUpperCase()}`, tone: 'violet', info: 'EtherType: which protocol is inside the payload.' },
        { name: `Payload ${data.length}B${pad ? ` + pad ${pad}` : ''}`, bits: 10, value: pad ? `${data.length} data + ${pad} zero bytes` : `${data.length} bytes`, tone: 'blue', info: 'Data from the upper layer, 46–1500 bytes. Short payloads are padded to 46.' },
        { name: 'FCS (CRC-32)', bits: 4, value: `0x${fcs.toString(16).toUpperCase().padStart(8, '0')}`, tone: 'green', info: 'CRC-32 over destination..payload. The receiver recomputes it to detect errors.' },
      ];
      const total = 14 + data.length + pad + 4;
      const sc = (hlIdx) => [{ type: 'fields', box: [10, 20, 980, 150], title: 'IEEE 802.3 Ethernet frame', width: 38, rows: [flds.map((f, i) => ({ ...f, hl: i === hlIdx, done: i < hlIdx || hlIdx === -2, alwaysValue: i <= hlIdx || hlIdx === -2 }))] },
        { type: 'table', box: [10, 200, 980, 340], title: 'Frame bytes', cols: ['Field', 'Size', 'Value (hex)'], hl: hlIdx, rows: [['Preamble', '7 B', 'AA AA AA AA AA AA AA'], ['SFD', '1 B', 'AB'], ['Destination', '6 B', hex(dst)], ['Source', '6 B', hex(src)], ['Type', '2 B', hex(type)], ['Payload', `${data.length + pad} B`, hex(data.slice(0, 16)) + (data.length > 16 ? ' …' : '') + (pad ? ` + ${pad}×00` : '')], ['FCS', '4 B', hex(fcsBytes)]] }];
      const why = [
        'The preamble is not part of the frame\'s length; it wakes up and synchronises the receiver.',
        'The SFD marks the exact start of the frame.',
        dst.every((b) => b === 0xff) ? 'All FFs is the broadcast address — every station accepts it.' : (dst[0] & 1) ? 'The lowest bit of the first byte is 1, so this is a multicast address.' : 'A unicast address: only one NIC will accept the frame.',
        'The sender\'s own NIC address, used by switches to learn where it is.',
        `EtherType ${String(inp.type || '0800').toUpperCase()} tells the receiver which protocol to hand the payload to.`,
        pad ? `Ethernet needs at least 46 payload bytes (64-byte minimum frame), so ${pad} zero bytes are added.` : 'The payload is long enough, so no padding is needed.',
        'CRC-32 is calculated over destination, source, type and payload. A mismatch at the receiver means the frame is dropped.',
      ];
      const frames = flds.map((f, i) => F(`${f.name}: ${f.value}`, why[i], sc(i), { Field: f.name, Size: ['7 bytes', '1 byte', '6 bytes', '6 bytes', '2 bytes', `${data.length + pad} bytes`, '4 bytes'][i] }, { Value: f.value }, i < flds.length - 1 ? 'Next field.' : 'Frame complete.'));
      frames.push(F(`Frame complete: ${total} bytes (without preamble/SFD).`, `Valid Ethernet frames are 64–1518 bytes. This frame is ${total >= 64 && total <= 1518 ? 'within' : 'outside'} the limits.`, sc(-2), { 'Frame size': `${total} bytes`, 'Header': '14 bytes', 'FCS': '4 bytes', Padding: `${pad} bytes` }, { FCS: `0x${fcs.toString(16).toUpperCase().padStart(8, '0')}` }, 'Done.'));
      return frames;
    },
  };

  // ════════════════════ MAC ADDRESS ════════════════════
  const OUI = { '00:50:56': 'VMware', '00:0C:29': 'VMware', '3C:5A:B4': 'Google', 'F4:5C:89': 'Apple', '00:1B:63': 'Apple', '00:E0:4C': 'Realtek', 'B8:27:EB': 'Raspberry Pi', '00:1A:A0': 'Dell', '3C:52:82': 'HP', '00:25:9C': 'Cisco-Linksys', '00:1A:2B': 'Ayecom (example)', '00:1F:3A': 'Hon Hai / Foxconn' };
  S['cn-mac-address'] = {
    inputs: [{ key: 'mac', label: 'Destination MAC address', type: 'text', default: '00:1A:2B:3C:4D:5E', max: 17, help: 'Try FF:FF:FF:FF:FF:FF (broadcast) or 01:00:5E:00:00:FB (multicast).' }],
    build(inp) {
      const b = parseMac(inp.mac || '00:1A:2B:3C:4D:5E', 'MAC address');
      const m = macStr(b); const oui = m.slice(0, 8);
      const ig = b[0] & 1; const ul = (b[0] >> 1) & 1; const bcast = b.every((x) => x === 0xff);
      const kind = bcast ? 'broadcast' : ig ? 'multicast' : 'unicast';
      const firstBits = b[0].toString(2).padStart(8, '0');
      const frames = [];
      const macRow = (hl) => ({ label: 'MAC', cells: m.split(':').map((x, i) => ({ t: x, cls: hl === 'oui' ? (i < 3 ? 'flag' : 'dim') : hl === 'nic' ? (i >= 3 ? 'esc' : 'dim') : 'plain' })) });
      frames.push(F(`MAC address ${m} — 48 bits written as 6 hex bytes.`, 'A MAC (hardware) address identifies a network interface on the local link. It is burned into the NIC.', [{ type: 'bits', box: [20, 20, 960, 180], title: 'MAC address', cell: 64, rows: [macRow()] }], { MAC: m, Length: '48 bits' }, { Notations: `${m}  |  ${m.replace(/:/g, '-')}  |  ${m.replace(/:/g, '').toLowerCase().replace(/(.{4})(?!$)/g, '$1.')}` }, 'Split into two halves.'));
      frames.push(F(`First 3 bytes ${oui} = OUI (manufacturer: ${OUI[oui] || 'unknown / not in sample list'}).`, 'The Organizationally Unique Identifier is assigned to the manufacturer by IEEE.', [{ type: 'bits', box: [20, 20, 960, 180], title: 'OUI', cell: 64, rows: [macRow('oui')] }], { OUI: oui, Vendor: OUI[oui] || 'Unknown' }, {}, 'The last 3 bytes identify the NIC.'));
      frames.push(F(`Last 3 bytes ${m.slice(9)} = NIC-specific part.`, 'The manufacturer gives each NIC a unique value, so the whole 48-bit address is globally unique.', [{ type: 'bits', box: [20, 20, 960, 180], title: 'NIC part', cell: 64, rows: [macRow('nic')] }], { 'NIC part': m.slice(9) }, {}, 'Check the special bits.'));
      frames.push(F(`First byte ${m.slice(0, 2)} = ${firstBits}: I/G bit = ${ig}, U/L bit = ${ul} → ${kind}.`, bcast ? 'All 48 bits are 1 → broadcast: every NIC on the LAN accepts it.' : `The least-significant bit of the first byte (I/G) is ${ig}: ${ig ? 'group (multicast) address' : 'individual (unicast) address'}. The next bit (U/L) is ${ul}: ${ul ? 'locally administered' : 'universally (manufacturer) assigned'}.`,
        [{ type: 'bits', box: [20, 20, 960, 200], title: 'First byte in binary', cell: 60, rows: [{ label: m.slice(0, 2), cells: firstBits.split('').map((t, i) => ({ t, cls: i === 7 ? 'hl' : i === 6 ? 'flag' : 'plain' })), note: '← U/L, I/G' }] }], { Type: kind, 'I/G bit': ig, 'U/L bit': ul }, {}, 'See how NICs react on a LAN.'));
      const hosts = [{ id: 'H1', mac: m, group: true }, { id: 'H2', mac: '00:E0:4C:11:22:33', group: ig && !bcast }, { id: 'H3', mac: '3C:52:82:AA:BB:CC', group: false }, { id: 'H4', mac: 'F4:5C:89:01:02:03', group: false }];
      const accept = (h) => bcast || (ig ? h.group : h.mac === m);
      const nodes = [{ id: 'S', label: 'Sender', sub: '00:25:9C:9A:9B:9C', x: 0.02, y: 0.5, kind: 'pc' }, { id: 'SW', label: 'Shared LAN', x: 0.4, y: 0.5, kind: 'hub' }, ...hosts.map((h, i) => ({ id: h.id, label: h.id, sub: h.mac, x: 0.9, y: 0.04 + i * 0.31, kind: 'pc', info: h.group ? 'Member of the multicast group' : 'NIC' }))];
      const links = [{ a: 'S', b: 'SW' }, ...hosts.map((h) => ({ a: 'SW', b: h.id }))];
      frames.push(F(`A frame to ${m} reaches every NIC on the shared LAN.`, 'Each NIC compares the destination MAC with its own (or its multicast groups).', [{ type: 'topo', box: [10, 10, 980, 540], nodes, links, packets: hosts.map((h) => ({ from: 'SW', to: h.id, label: 'dst ' + m.slice(-5) })) }], { 'Destination type': kind }, {}, 'NICs decide.'));
      frames.push(F(`${hosts.filter(accept).map((h) => h.id).join(', ') || 'No NIC'} accept${hosts.filter(accept).length === 1 ? 's' : ''}; the others drop the frame.`, bcast ? 'Broadcast frames are accepted by all.' : ig ? 'Only NICs that joined the multicast group accept it.' : 'Unicast: only the NIC with the matching address accepts it.', [{ type: 'topo', box: [10, 10, 980, 540], nodes: nodes.map((nd) => { const h = hosts.find((x) => x.id === nd.id); return h ? { ...nd, hl: accept(h), badge: accept(h) ? 'accept' : 'drop', badgeTone: accept(h) ? 'violet' : 'red' } : nd; }), links }], { Accepted: hosts.filter(accept).length, Dropped: hosts.length - hosts.filter(accept).length }, {}, 'Done.'));
      return frames;
    },
  };

  // ════════════════════ ARP ════════════════════
  S['cn-arp'] = {
    inputs: [
      { key: 'target', label: 'Host A wants to send to IP', type: 'text', default: '192.168.1.20', max: 15, help: '.20 and .30 are on the LAN, .1 is the gateway; try .99 (no such host) or 8.8.8.8 (another network).' },
      { key: 'cache', label: 'ARP cache on Host A', type: 'select', default: 'empty', options: [['empty', 'Empty (cache miss)'], ['hit', 'Already has the entry (cache hit)']] },
    ],
    build(inp) {
      const hosts = { A: ['192.168.1.10', '00:1A:2B:3C:4D:5E'], B: ['192.168.1.20', '00:E0:4C:11:22:33'], C: ['192.168.1.30', '3C:52:82:AA:BB:CC'], GW: ['192.168.1.1', '00:25:9C:9A:9B:9C'] };
      const t = String(inp.target || '').trim();
      if (!/^(\d{1,3}\.){3}\d{1,3}$/.test(t) || t.split('.').some((o) => Number(o) > 255)) throw new Error('Enter a valid IPv4 address.');
      const onLan = t.startsWith('192.168.1.');
      const lookupIp = onLan ? t : hosts.GW[0];
      const owner = Object.keys(hosts).find((k) => hosts[k][0] === lookupIp);
      const nodes = [
        { id: 'A', label: 'Host A', sub: '192.168.1.10', x: 0.03, y: 0.5, kind: 'pc' }, { id: 'SW', label: 'Switch', x: 0.42, y: 0.5, kind: 'switch' },
        { id: 'B', label: 'Host B', sub: '192.168.1.20', x: 0.9, y: 0.02, kind: 'pc' }, { id: 'C', label: 'Host C', sub: '192.168.1.30', x: 0.9, y: 0.5, kind: 'pc' }, { id: 'GW', label: 'Gateway', sub: '192.168.1.1', x: 0.9, y: 0.98, kind: 'router' },
      ];
      const links = [{ a: 'A', b: 'SW' }, { a: 'SW', b: 'B' }, { a: 'SW', b: 'C' }, { a: 'SW', b: 'GW' }];
      const cacheRows = (has) => (has ? [[lookupIp, owner ? hosts[owner][1] : '?', 'dynamic']] : []);
      const sc = (nd, pk, has, arp) => [{ type: 'topo', box: [10, 10, 640, 540], nodes: nodes.map((n) => ({ ...n, ...(nd[n.id] || {}) })), links, packets: pk }, { type: 'table', box: [665, 20, 325, 150], title: 'Host A ARP cache', cols: ['IP', 'MAC', 'Type'], rows: cacheRows(has), empty: '(empty)', hl: has ? 0 : null }].concat(arp ? [{ type: 'table', box: [665, 200, 325, 330], title: 'ARP packet', cols: ['Field', 'Value'], rows: arp, mono: true }] : []);
      const frames = [];
      frames.push(F(`Host A needs to send an IP packet to ${t}.`, onLan ? `${t} is on the same subnet (192.168.1.0/24), so A needs that host's MAC address.` : `${t} is on another network, so the packet must go to the default gateway — A needs the gateway's MAC (192.168.1.1).`, sc({ A: { hl: true } }, [], inp.cache === 'hit'), { 'Target IP': t, 'Resolve MAC of': lookupIp, 'Same subnet': onLan ? 'Yes' : 'No → gateway' }, {}, 'Check the ARP cache.'));
      if (inp.cache === 'hit' && owner) {
        frames.push(F(`Cache hit: ${lookupIp} → ${hosts[owner][1]}.`, 'No ARP request is needed; A builds the Ethernet frame immediately.', sc({ A: { hl: true } }, [], true), { Cache: 'Hit' }, {}, 'Send the frame.'));
        frames.push(F(`A sends the data frame directly to ${owner}.`, 'The ARP cache saves a broadcast for every packet. Entries expire after a few minutes.', sc({ [owner]: { hl: true } }, [{ from: 'A', to: 'SW', label: 'data' }], true), { Result: 'Delivered' }, {}, 'Done.'));
        return frames;
      }
      const req = [['Operation', '1 (request)'], ['Sender MAC', hosts.A[1]], ['Sender IP', hosts.A[0]], ['Target MAC', '00:00:00:00:00:00'], ['Target IP', lookupIp], ['Eth dst', 'FF:FF:FF:FF:FF:FF']];
      frames.push(F('Cache miss → A broadcasts an ARP request.', `"Who has ${lookupIp}? Tell 192.168.1.10." The Ethernet destination is FF:FF:FF:FF:FF:FF so every host on the LAN receives it.`, sc({ A: { hl: true } }, [{ from: 'A', to: 'SW', label: 'ARP who-has' }], false, req), { Cache: 'Miss', 'ARP op': 'Request (broadcast)' }, {}, 'The switch floods the broadcast.'));
      frames.push(F('The switch floods the broadcast to every port.', 'Every host reads the request and compares the target IP with its own IP.', sc({ B: { hl: owner === 'B' }, C: { hl: owner === 'C' }, GW: { hl: owner === 'GW' } }, [{ from: 'SW', to: 'B', label: 'who-has' }, { from: 'SW', to: 'C', label: 'who-has' }, { from: 'SW', to: 'GW', label: 'who-has' }], false, req), { 'ARP op': 'Request' }, {}, 'Hosts compare IPs.'));
      if (!owner) {
        frames.push(F(`No host owns ${lookupIp} — nobody replies.`, 'A retries a few times, then gives up and reports "Destination host unreachable".', sc({ B: { badge: 'not me', badgeTone: 'red' }, C: { badge: 'not me', badgeTone: 'red' }, GW: { badge: 'not me', badgeTone: 'red' }, A: { bad: true } }, [], false), { Result: 'Unreachable' }, {}, 'Done.'));
        return frames;
      }
      const rep = [['Operation', '2 (reply)'], ['Sender MAC', hosts[owner][1]], ['Sender IP', lookupIp], ['Target MAC', hosts.A[1]], ['Target IP', hosts.A[0]], ['Eth dst', hosts.A[1] + ' (unicast)']];
      const badges = Object.fromEntries(['B', 'C', 'GW'].map((k) => [k, k === owner ? { hl: true, badge: "it's me", badgeTone: 'violet' } : { badge: 'ignore', badgeTone: 'red' }]));
      frames.push(F(`${owner} recognises its IP and sends an ARP reply (unicast).`, `The reply says "${lookupIp} is at ${hosts[owner][1]}". It is sent only to A. ${owner} also learns A's mapping from the request.`, sc(badges, [{ from: owner, to: 'SW', label: 'ARP reply' }], false, rep), { 'ARP op': 'Reply (unicast)' }, {}, 'The reply reaches A.'));
      frames.push(F(`A stores ${lookupIp} → ${hosts[owner][1]} in its ARP cache.`, 'Future packets to this IP use the cached MAC with no broadcast.', sc({ A: { hl: true } }, [{ from: 'SW', to: 'A', label: 'ARP reply' }], true, rep), { Cache: 'Updated' }, {}, 'Send the data.'));
      frames.push(F(`A sends the data frame to ${owner}${onLan ? '' : ` (the gateway forwards it toward ${t})`}.`, onLan ? 'Destination MAC = B\'s MAC, destination IP = B\'s IP.' : 'The destination MAC is the gateway\'s, but the destination IP stays ' + t + ' — MAC addresses change hop by hop, IP addresses do not.', sc({ [owner]: { hl: true } }, [{ from: 'A', to: 'SW', label: 'IP data' }], true), { Result: 'Sent' }, {}, 'Done.'));
      return frames;
    },
  };

  // ════════════════════ SWITCH FORWARDING ════════════════════
  S['cn-switch'] = {
    inputs: [{ key: 'seq', label: 'Frames to send (src>dst, * = broadcast)', type: 'text', default: 'A>C, C>A, B>A, D>*, A>C', max: 60, help: 'Hosts A–D are on ports 1–4. Use X as an unknown destination.' }],
    build(inp) {
      const hosts = { A: [1, 'AA:AA:AA:00:00:01'], B: [2, 'BB:BB:BB:00:00:02'], C: [3, 'CC:CC:CC:00:00:03'], D: [4, 'DD:DD:DD:00:00:04'] };
      const list = String(inp.seq || '').split(',').map((s) => s.trim().toUpperCase()).filter(Boolean);
      if (!list.length) throw new Error('Enter frames like A>C, B>*');
      if (list.length > 8) throw new Error('Use at most 8 frames.');
      const pairs = list.map((p) => { const m = p.match(/^([A-D])\s*>\s*([A-D*X])$/); if (!m || m[1] === m[2]) throw new Error(`"${p}" is not valid — use a form like A>C.`); return [m[1], m[2]]; });
      const table = []; const frames = [];
      const nodes = [{ id: 'SW', label: 'Switch', x: 0.5, y: 0.5, kind: 'switch', r: 32 }, ...Object.entries(hosts).map(([h, [port, mac]], i) => ({ id: h, label: `Host ${h}`, sub: mac, x: [0.05, 0.95, 0.05, 0.95][i], y: [0.05, 0.05, 0.95, 0.95][i], kind: 'pc' }))];
      const links = Object.entries(hosts).map(([h, [port]]) => ({ a: h, b: 'SW', label: `port ${port}` }));
      const sc = (nd, pk, hlRow, linksHl = []) => [{ type: 'topo', box: [10, 10, 620, 540], nodes: nodes.map((n) => ({ ...n, ...(nd[n.id] || {}) })), links: links.map((l) => ({ ...l, hl: linksHl.includes(l.a) })), packets: pk }, { type: 'table', box: [650, 20, 340, 300], title: 'MAC address table', cols: ['MAC', 'Port'], rows: table.map((r) => [r[0], r[1]]), hl: hlRow, empty: '(empty — nothing learned yet)' }];
      frames.push(F('The switch starts with an empty MAC address table.', 'A switch learns by looking at the SOURCE MAC of every frame, and forwards using the DESTINATION MAC.', sc({}, [], null), { Frames: pairs.length, 'Table entries': 0 }, {}, 'Send the first frame.'));
      pairs.forEach(([s, d], k) => {
        const [sp, smac] = hosts[s];
        frames.push(F(`Frame ${k + 1}: ${s} → ${d === '*' ? 'broadcast' : d} arrives on port ${sp}.`, 'Every frame carries source and destination MAC addresses.', sc({ [s]: { hl: true } }, [{ from: s, to: 'SW', label: `to ${d === '*' ? 'FF…FF' : d}` }], null, [s]), { Frame: `${k + 1} / ${pairs.length}`, In: `port ${sp}` }, {}, 'Learn the source.'));
        const existing = table.findIndex((r) => r[0] === smac);
        if (existing < 0) table.push([smac, sp]); else table[existing][1] = sp;
        const row = table.findIndex((r) => r[0] === smac);
        frames.push(F(existing < 0 ? `Learn: ${smac} is on port ${sp} (new entry).` : `Refresh: ${smac} is still on port ${sp}.`, 'Learning from the source address lets the switch avoid flooding frames to this host later.', sc({ SW: { hl: true } }, [], row), { 'Table entries': table.length }, {}, 'Look up the destination.'));
        if (d === '*' || d === 'X') {
          const outs = Object.keys(hosts).filter((h) => h !== s);
          frames.push(F(d === '*' ? 'Broadcast destination → flood to all other ports.' : 'Unknown destination MAC → flood to all other ports.', d === '*' ? 'Broadcast frames always go out of every port except the one they came in on.' : 'The switch has not learned this MAC yet, so it sends the frame everywhere (unknown unicast flooding).', sc(Object.fromEntries(outs.map((h) => [h, { badge: 'copy' }])), outs.map((h) => ({ from: 'SW', to: h, label: 'flood' })), null, outs), { Decision: 'Flood', 'Out ports': outs.map((h) => hosts[h][0]).join(', ') }, {}, k < pairs.length - 1 ? 'Next frame.' : 'Done.'));
          return;
        }
        const [dp, dmac] = hosts[d];
        const hit = table.findIndex((r) => r[0] === dmac);
        if (hit < 0) {
          const outs = Object.keys(hosts).filter((h) => h !== s);
          frames.push(F(`${dmac} is not in the table → flood.`, `The switch does not yet know where ${d} is. ${d} will reply, and the switch will learn its port then.`, sc(Object.fromEntries(outs.map((h) => [h, { badge: h === d ? 'accept' : 'drop', badgeTone: h === d ? 'violet' : 'red' }])), outs.map((h) => ({ from: 'SW', to: h, label: 'flood' })), null, outs), { Decision: 'Flood (unknown)', 'Out ports': outs.map((h) => hosts[h][0]).join(', ') }, {}, k < pairs.length - 1 ? 'Next frame.' : 'Done.'));
        } else if (dp === sp) {
          frames.push(F('Destination is on the same port → filter (drop).', 'No need to forward a frame back where it came from.', sc({}, [], hit), { Decision: 'Filter' }, {}, 'Next frame.'));
        } else {
          frames.push(F(`${dmac} → port ${dp}: forward only there.`, 'Known unicast: the switch sends the frame out of exactly one port, keeping other links free.', sc({ [d]: { hl: true } }, [{ from: 'SW', to: d, label: 'frame' }], hit, [d]), { Decision: 'Forward', 'Out port': dp }, {}, k < pairs.length - 1 ? 'Next frame.' : 'Done.'));
        }
      });
      return frames;
    },
  };
})(typeof window !== 'undefined' ? window : globalThis);
