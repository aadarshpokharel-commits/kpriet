'use strict';
/* Computer Networks simulations — Unit 4: Transport Layer */
(function (root) {
  const S = (root.CNScenarios = root.CNScenarios || {});
  const F = (title, why, scene, state = {}, adv = {}, next = '') => ({ title, why, scene, state, adv, next });
  const seqScene = (actors, msgs, states, box = [10, 6, 980, 548], minRows = 7) => { const shown = msgs.slice(-12); return { type: 'seq', box, actors, msgs: shown, cur: shown.length - 1, states, minRows }; };

  // ════════════════════ THREE-WAY HANDSHAKE ════════════════════
  S['cn-tcp-handshake'] = {
    inputs: [
      { key: 'cisn', label: 'Client initial sequence number (ISN)', type: 'number', default: 1000, min: 0, max: 4294967295 },
      { key: 'sisn', label: 'Server initial sequence number (ISN)', type: 'number', default: 5000, min: 0, max: 4294967295 },
      { key: 'scenario', label: 'Scenario', type: 'select', default: 'normal', options: [['normal', 'Normal connection'], ['lostsyn', 'SYN is lost (retransmitted)'], ['closed', 'Server port closed (RST)']] },
    ],
    build(inp) {
      const x = Math.max(0, Number(inp.cisn) || 0) >>> 0; const y = Math.max(0, Number(inp.sisn) || 0) >>> 0;
      const n1 = (x + 1) >>> 0; const m1 = (y + 1) >>> 0;
      const actors = [{ name: 'Client', sub: '192.168.1.10:51234', info: 'Active opener — calls connect().' }, { name: 'Server', sub: '142.250.183.4:80', info: 'Passive opener — listen() and accept().' }];
      const msgs = []; const frames = [];
      const snap = (title, why, st, state, adv, next) => frames.push(F(title, why, [seqScene(actors, msgs, st)], state, adv, next));
      snap('The server is listening on port 80; the client wants to connect.', 'TCP is connection-oriented: both sides must agree on starting sequence numbers before any data flows.', ['CLOSED', inp.scenario === 'closed' ? 'CLOSED (no listener)' : 'LISTEN'], { Client: 'CLOSED', Server: inp.scenario === 'closed' ? 'CLOSED' : 'LISTEN' }, {}, 'Client sends SYN.');
      if (inp.scenario === 'lostsyn') {
        msgs.push({ from: 0, to: 1, label: `SYN seq=${x}`, lost: true, detail: 'SYN=1' });
        snap(`SYN (seq=${x}) is lost.`, 'The client starts a retransmission timer when it sends the SYN.', ['SYN_SENT', 'LISTEN'], { Client: 'SYN_SENT', Server: 'LISTEN' }, {}, 'Timer expires.');
        msgs.push({ note: '⏰ Timeout — resend SYN', at: 0, tone: 'red' });
        snap('No SYN+ACK arrives → the client times out and resends the SYN.', 'The initial SYN timeout is about 1 s and doubles on each retry (exponential back-off).', ['SYN_SENT', 'LISTEN'], { Client: 'SYN_SENT', Server: 'LISTEN' }, {}, 'Resend.');
      }
      msgs.push({ from: 0, to: 1, label: `SYN seq=${x}`, detail: `SYN=1, MSS=1460, win=64240, SACK-permitted`, token: 'SYN' });
      snap(`Step 1 — Client → SYN, seq=${x}.`, 'SYN = synchronise. The client picks a random ISN and tells the server it wants to open a connection. A SYN uses one sequence number but carries no data.', ['SYN_SENT', inp.scenario === 'closed' ? 'CLOSED' : 'LISTEN'], { Client: 'SYN_SENT', Server: inp.scenario === 'closed' ? 'CLOSED' : 'LISTEN', 'Client ISN': x }, { Options: 'MSS 1460, window scale, SACK permitted' }, inp.scenario === 'closed' ? 'No process is listening.' : 'Server replies with SYN+ACK.');
      if (inp.scenario === 'closed') {
        msgs.push({ from: 1, to: 0, label: `RST+ACK ack=${n1}`, tone: 'red', detail: 'RST=1: port closed' });
        snap('No process listens on port 80 → the server replies RST+ACK.', 'RST aborts the attempt immediately; the application sees "Connection refused".', ['CLOSED', 'CLOSED'], { Client: 'CLOSED', Server: 'CLOSED', Result: 'Connection refused' }, {}, 'Done.');
        return frames;
      }
      msgs.push({ from: 1, to: 0, label: `SYN+ACK seq=${y} ack=${n1}`, detail: 'SYN=1, ACK=1, MSS=1460', token: 'SYN+ACK' });
      snap(`Step 2 — Server → SYN+ACK, seq=${y}, ack=${n1}.`, `The server acknowledges the client's SYN (ack = ${x} + 1 = ${n1}) and sends its own ISN ${y} in the same segment.`, ['SYN_SENT', 'SYN_RCVD'], { Client: 'SYN_SENT', Server: 'SYN_RCVD', 'Server ISN': y }, { 'Half-open connection': 'Server keeps state for this client' }, 'Client acknowledges.');
      msgs.push({ from: 0, to: 1, label: `ACK seq=${n1} ack=${m1}`, detail: 'ACK=1 (may carry data)', token: 'ACK' });
      snap(`Step 3 — Client → ACK, seq=${n1}, ack=${m1}.`, `The client acknowledges the server's SYN (ack = ${y} + 1). Both sides now know each other's starting sequence numbers.`, ['ESTABLISHED', 'ESTABLISHED'], { Client: 'ESTABLISHED', Server: 'ESTABLISHED' }, {}, 'Data can flow.');
      msgs.push({ note: 'CONNECTION ESTABLISHED', at: 0, tone: 'green' }); msgs.push({ from: 0, to: 1, label: `Data seq=${n1} (e.g. HTTP GET)`, detail: `bytes ${n1}…`, token: 'DATA' });
      snap('CONNECTION ESTABLISHED — the first data byte uses seq ' + n1 + '.', 'Three messages are needed so that both directions are synchronised and confirmed, and old duplicate SYNs cannot open a false connection.', ['ESTABLISHED', 'ESTABLISHED'], { Client: 'ESTABLISHED', Server: 'ESTABLISHED', 'Next client seq': n1, 'Next server seq': m1 }, {}, 'Done.');
      return frames;
    },
  };

  // ════════════════════ CONNECTION TERMINATION ════════════════════
  S['cn-tcp-termination'] = {
    inputs: [
      { key: 'who', label: 'Who closes first', type: 'select', default: 'client', options: [['client', 'Client (active close)'], ['server', 'Server (active close)']] },
      { key: 'style', label: 'Close style', type: 'select', default: 'four', options: [['four', 'Four-way close (FIN, ACK, FIN, ACK)'], ['half', 'Half-close: other side still sends data'], ['three', 'Three-way close (FIN+ACK combined)']] },
      { key: 'seqa', label: 'Active side next seq', type: 'number', default: 2000, min: 0, max: 4294967295 },
      { key: 'seqp', label: 'Passive side next seq', type: 'number', default: 7000, min: 0, max: 4294967295 },
    ],
    build(inp) {
      const u = Number(inp.seqa) >>> 0; let v = Number(inp.seqp) >>> 0;
      const activeIsClient = inp.who !== 'server';
      const A = activeIsClient ? 0 : 1; const P = 1 - A;
      const names = ['Client', 'Server'];
      const actors = [{ name: 'Client', sub: '51234' }, { name: 'Server', sub: '80' }];
      const msgs = []; const frames = []; const st = ['ESTABLISHED', 'ESTABLISHED'];
      const snap = (title, why, next, adv = {}) => frames.push(F(title, why, [seqScene(actors, msgs, st.slice())], { [names[A] + ' (active)']: st[A], [names[P] + ' (passive)']: st[P] }, adv, next));
      snap(`${names[A]} has finished sending and calls close().`, 'Each direction of a TCP connection is closed separately, so closing normally takes four segments.', 'Send FIN.');
      msgs.push({ from: A, to: P, label: `FIN seq=${u}`, detail: 'FIN=1, ACK=1', token: 'FIN' }); st[A] = 'FIN_WAIT_1';
      snap(`${names[A]} → FIN, seq=${u}.`, 'FIN means "I have no more data to send". It consumes one sequence number.', inp.style === 'three' ? 'Passive side replies FIN+ACK.' : 'Passive side acknowledges.');
      if (inp.style === 'three') {
        msgs.push({ from: P, to: A, label: `FIN+ACK seq=${v} ack=${u + 1}`, token: 'FIN+ACK' }); st[P] = 'LAST_ACK'; st[A] = 'TIME_WAIT';
        snap(`${names[P]} → FIN+ACK: acknowledges and closes its side at once.`, 'If the passive side has nothing left to send, it can combine its ACK and FIN.', 'Final ACK.');
      } else {
        msgs.push({ from: P, to: A, label: `ACK ack=${u + 1}`, token: 'ACK' }); st[P] = 'CLOSE_WAIT'; st[A] = 'FIN_WAIT_2';
        snap(`${names[P]} → ACK ${u + 1}.`, `${names[P]} enters CLOSE_WAIT: its application is told the other side closed. The connection is now half-closed.`, inp.style === 'half' ? `${names[P]} can still send data.` : `${names[P]} closes too.`);
        if (inp.style === 'half') {
          for (let k = 0; k < 2; k++) { msgs.push({ from: P, to: A, label: `Data seq=${v} (500 B)`, token: 'DATA' }); v += 500; snap(`${names[P]} still sends data (seq ${v - 500}).`, 'Half-close: only one direction is closed; the other keeps working until it sends its own FIN.', 'Acknowledge.'); msgs.push({ from: A, to: P, label: `ACK ack=${v}`, token: 'ACK' }); snap(`${names[A]} acknowledges ${v}.`, 'The active closer can still receive and acknowledge data in FIN_WAIT_2.', 'Continue.'); }
        }
        msgs.push({ from: P, to: A, label: `FIN seq=${v}`, token: 'FIN' }); st[P] = 'LAST_ACK'; st[A] = 'TIME_WAIT';
        snap(`${names[P]} → FIN, seq=${v}.`, `${names[P]} has finished too; it waits in LAST_ACK for the final acknowledgement.`, 'Final ACK.');
      }
      msgs.push({ from: A, to: P, label: `ACK ack=${v + 1}`, token: 'ACK' }); st[P] = 'CLOSED';
      snap(`${names[A]} → ACK ${v + 1}; ${names[P]} is CLOSED.`, `${names[A]} stays in TIME_WAIT.`, 'Wait 2 × MSL.');
      msgs.push({ note: 'TIME_WAIT: 2 × MSL (e.g. 60 s)', at: A, tone: 'violet' }); st[A] = 'CLOSED';
      snap(`${names[A]} waits 2 × MSL, then CLOSED.`, 'TIME_WAIT lets a lost final ACK be re-sent if the FIN is repeated, and lets old duplicate segments expire before the same port pair is reused.', 'Done.', { MSL: 'Maximum Segment Lifetime (typically 30–120 s)' });
      return frames;
    },
  };

  // ════════════════════ TCP SEGMENT ════════════════════
  function tcpChecksum(srcIp, dstIp, header, payload) {
    const words = [srcIp >>> 16, srcIp & 0xffff, dstIp >>> 16, dstIp & 0xffff, 6, header.length + payload.length];
    const bytes = [...header, ...payload]; if (bytes.length % 2) bytes.push(0);
    for (let i = 0; i < bytes.length; i += 2) words.push((bytes[i] << 8) | bytes[i + 1]);
    let sum = 0; for (const w of words) { sum += w; sum = (sum & 0xffff) + (sum >>> 16); }
    return ~sum & 0xffff;
  }
  root.CNUtil = Object.assign(root.CNUtil || {}, { tcpChecksum });
  const FLAGSETS = { syn: ['SYN'], synack: ['SYN', 'ACK'], ack: ['ACK'], pshack: ['PSH', 'ACK'], finack: ['FIN', 'ACK'], rst: ['RST'] };
  S['cn-tcp-segment'] = {
    inputs: [
      { key: 'sport', label: 'Source port', type: 'number', default: 51234, min: 1, max: 65535 },
      { key: 'dport', label: 'Destination port', type: 'number', default: 80, min: 1, max: 65535 },
      { key: 'seq', label: 'Sequence number', type: 'number', default: 1001, min: 0, max: 4294967295 },
      { key: 'ack', label: 'Acknowledgement number', type: 'number', default: 5001, min: 0, max: 4294967295 },
      { key: 'flags', label: 'Flags', type: 'select', default: 'pshack', options: [['syn', 'SYN'], ['synack', 'SYN + ACK'], ['ack', 'ACK'], ['pshack', 'PSH + ACK (data)'], ['finack', 'FIN + ACK'], ['rst', 'RST']] },
      { key: 'win', label: 'Window', type: 'number', default: 64240, min: 0, max: 65535 },
      { key: 'data', label: 'Payload text', type: 'text', default: 'GET / HTTP/1.1', max: 40 },
    ],
    build(inp) {
      const sp = Math.max(1, Math.min(65535, Number(inp.sport) || 51234)); const dp = Math.max(1, Math.min(65535, Number(inp.dport) || 80));
      const seq = Number(inp.seq) >>> 0; const ack = Number(inp.ack) >>> 0; const win = Math.max(0, Math.min(65535, Number(inp.win) || 0));
      const fl = FLAGSETS[inp.flags] || FLAGSETS.pshack; const has = (f) => fl.includes(f);
      const payload = Array.from(new TextEncoder().encode(has('SYN') || has('RST') ? '' : String(inp.data || '')));
      const flagsByte = (has('URG') ? 32 : 0) | (has('ACK') ? 16 : 0) | (has('PSH') ? 8 : 0) | (has('RST') ? 4 : 0) | (has('SYN') ? 2 : 0) | (has('FIN') ? 1 : 0);
      const hdr = [sp >> 8, sp & 255, dp >> 8, dp & 255, seq >>> 24, (seq >>> 16) & 255, (seq >>> 8) & 255, seq & 255, ack >>> 24, (ack >>> 16) & 255, (ack >>> 8) & 255, ack & 255, 5 << 4, flagsByte, win >> 8, win & 255, 0, 0, 0, 0];
      const srcIp = 0xc0a8010a; const dstIp = 0x8efab704; // 192.168.1.10 → 142.250.183.4
      const ck = tcpChecksum(srcIp, dstIp, hdr, payload);
      const hex = (v) => '0x' + v.toString(16).toUpperCase().padStart(4, '0');
      const f1 = (n, t) => ({ name: n, bits: 1, value: has(n) ? '1' : '0', tone: has(n) ? 'amber' : 'grey', info: t });
      const layout = [
        [{ name: 'Source Port', bits: 16, value: String(sp), info: 'Port of the sending process.' }, { name: 'Destination Port', bits: 16, value: String(dp), info: 'Port of the receiving process (80 = HTTP).' }],
        [{ name: 'Sequence Number', bits: 32, value: String(seq), info: has('SYN') ? 'For a SYN this is the Initial Sequence Number.' : 'Number of the first data byte in this segment.' }],
        [{ name: 'Acknowledgement Number', bits: 32, value: has('ACK') ? String(ack) : '0 (ACK=0)', info: 'Next byte expected from the other side; valid only when ACK = 1.' }],
        [{ name: 'Offset', bits: 4, value: '5', info: 'Header length in 32-bit words (5 = 20 bytes).' }, { name: 'Rsvd', bits: 6, value: '000000', info: 'Reserved.' }, f1('URG', 'Urgent pointer is valid.'), f1('ACK', 'Acknowledgement number is valid.'), f1('PSH', 'Push data to the application immediately.'), f1('RST', 'Reset (abort) the connection.'), f1('SYN', 'Synchronise sequence numbers — open a connection.'), f1('FIN', 'Sender has finished sending.'), { name: 'Window', bits: 16, value: String(win), info: 'Receive window: how many more bytes the sender of this segment can accept (flow control).' }],
        [{ name: 'Checksum', bits: 16, value: hex(ck), info: 'Covers a pseudo-header (IPs, protocol, length) + TCP header + data.' }, { name: 'Urgent Pointer', bits: 16, value: '0', info: 'Offset of urgent data when URG = 1.' }],
        [{ name: payload.length ? `Data (${payload.length} bytes)` : 'No data', bits: 32, value: payload.length ? `"${String(inp.data).slice(0, 30)}"` : '—', tone: 'blue', info: 'Application data carried by this segment.' }],
      ];
      const order = []; layout.forEach((r, ri) => r.forEach((f, fi) => { if (f.bits > 1) order.push([ri, fi]); }));
      order.splice(4, 0, 'flags');
      const sc = (step) => [{ type: 'fields', box: [10, 10, 980, 440], title: `TCP segment — flags ${fl.join('+')}`, width: 32, ruler: true, rows: layout.map((r, ri) => r.map((f, fi) => { const idx = order.findIndex((o) => (o === 'flags' ? ri === 3 && f.bits === 1 : o[0] === ri && o[1] === fi)); return { ...f, hl: idx === step, done: step === -2 || (idx >= 0 && idx < step), alwaysValue: step === -2 || (idx >= 0 && idx <= step) }; })) }, { type: 'callout', box: [10, 460, 980, 90], title: 'Segment', lines: [`${fl.join('+')} · seq ${seq} · ${has('ACK') ? `ack ${ack}` : 'no ack'} · win ${win} · ${payload.length} data bytes · header 20 bytes`], mono: true }];
      const frames = order.map((o, i) => {
        if (o === 'flags') return F(`Flags: ${fl.join(' + ')}.`, has('SYN') ? 'SYN opens a connection.' : has('FIN') ? 'FIN closes this direction of the connection.' : has('RST') ? 'RST aborts the connection immediately.' : has('PSH') ? 'PSH asks the receiver to pass the data to the application straight away.' : 'A pure ACK acknowledges data without carrying any.', sc(i), { Flags: fl.join('+'), 'Flag byte': '0b' + flagsByte.toString(2).padStart(6, '0') }, {}, 'Next field.');
        const f = layout[o[0]][o[1]];
        return F(`${f.name} = ${f.value}`, f.info, sc(i), { Field: f.name, Bits: f.bits, Value: f.value }, {}, i < order.length - 1 ? 'Next field.' : 'Segment complete.');
      });
      frames.push(F(`Complete segment: 20-byte header + ${payload.length} data bytes; next seq will be ${(seq + payload.length + (has('SYN') || has('FIN') ? 1 : 0)) >>> 0}.`, 'Sequence numbers count bytes: the next segment starts after the last byte of this one (SYN and FIN each count as one).', sc(-2), { 'Header': '20 bytes', 'Data': `${payload.length} bytes`, Checksum: hex(ck) }, { 'Pseudo-header': '192.168.1.10 → 142.250.183.4, proto 6' }, 'Done.'));
      return frames;
    },
  };

  // ════════════════════ TCP vs UDP ════════════════════
  S['cn-tcp-vs-udp'] = {
    inputs: [
      { key: 'count', label: 'Messages to send', type: 'number', default: 4, min: 2, max: 5 },
      { key: 'lose', label: 'Message lost in the network (0 = none)', type: 'number', default: 2, min: 0, max: 5 },
      { key: 'reorder', label: 'Network reorders the last two messages', type: 'checkbox', default: true },
    ],
    build(inp) {
      const n = Math.max(2, Math.min(5, Number(inp.count) || 4)); const lose = Math.max(0, Math.min(n, Number(inp.lose) || 0));
      const tcp = []; const udp = [];
      tcp.push({ m: { from: 0, to: 1, label: 'SYN' }, t: 'TCP opens a connection first (handshake).' });
      tcp.push({ m: { from: 1, to: 0, label: 'SYN+ACK' }, t: 'Server agrees.' });
      tcp.push({ m: { from: 0, to: 1, label: 'ACK' }, t: 'Connection established.' });
      udp.push({ m: { from: 0, to: 1, label: 'M1', lost: lose === 1 }, t: 'UDP sends immediately — no connection setup.' });
      for (let i = 2; i <= n; i++) udp.push({ m: { from: 0, to: 1, label: `M${i}`, lost: lose === i }, t: lose === i ? `M${i} is lost — UDP never notices or resends it.` : `UDP sends M${i} with no ACK.` });
      if (inp.reorder && n >= 2) { const a = udp.length - 1; const b = a - 1; [udp[a], udp[b]] = [udp[b], udp[a]]; udp[a].t = 'Datagrams can arrive out of order — UDP delivers them as they come.'; udp[b].t = 'A later datagram overtakes an earlier one.'; }
      udp.push({ m: { note: `App received: ${udp.filter((e) => !e.m.lost).map((e) => e.m.label).join(', ')}`, at: 1, tone: lose || inp.reorder ? 'red' : 'green' }, t: 'The UDP application must cope with loss and ordering itself.' });
      for (let i = 1; i <= n; i++) {
        if (i === lose) {
          tcp.push({ m: { from: 0, to: 1, label: `M${i} seq=${i}`, lost: true }, t: `M${i} is lost.` });
          tcp.push({ m: { note: '⏰ timeout', at: 0, tone: 'red' }, t: 'No ACK arrives, so the TCP timer expires.' });
          tcp.push({ m: { from: 0, to: 1, label: `M${i} resent` }, t: 'TCP retransmits the lost segment.' });
        } else tcp.push({ m: { from: 0, to: 1, label: `M${i} seq=${i}` }, t: `TCP sends M${i}.` });
        tcp.push({ m: { from: 1, to: 0, label: `ACK ${i + 1}` }, t: 'Every byte is acknowledged.' });
      }
      tcp.push({ m: { note: `App received: ${Array.from({ length: n }, (_, i) => `M${i + 1}`).join(', ')}`, at: 1, tone: 'green' }, t: 'TCP delivers everything, in order, exactly once.' });
      const steps = Math.max(tcp.length, udp.length);
      const frames = [];
      const actors = (p) => [{ name: `${p} Client` }, { name: `${p} Server` }];
      const cmp = [['Connection', 'Handshake first', 'None'], ['Reliability', 'ACKs + retransmission', 'None'], ['Ordering', 'In order', 'Not guaranteed'], ['Header', '20–60 bytes', '8 bytes'], ['Flow / congestion ctrl', 'Yes', 'No'], ['Speed / overhead', 'Slower, more overhead', 'Fast, light'], ['Used by', 'HTTP, FTP, SMTP, SSH', 'DNS, VoIP, video, games, DHCP']];
      for (let k = 0; k < steps; k++) {
        const tm = tcp.slice(0, k + 1).map((e) => e.m); const um = udp.slice(0, k + 1).map((e) => e.m);
        const tcpCur = k < tcp.length ? tm.length - 1 : -1; const udpCur = k < udp.length ? um.length - 1 : -1;
        frames.push(F(`TCP: ${k < tcp.length ? tcp[k].t : 'done.'}  |  UDP: ${k < udp.length ? udp[k].t : 'done.'}`, 'Both send the same application messages at the same time. TCP trades speed for reliability; UDP trades reliability for speed and simplicity.', [
          { type: 'seq', box: [10, 6, 485, 548], title: 'TCP', actors: actors('TCP'), msgs: tm.slice(-13), cur: tcpCur >= 0 ? Math.min(tm.length, 13) - 1 : -1, minRows: 12 },
          { type: 'seq', box: [505, 6, 485, 548], title: 'UDP', actors: actors('UDP'), msgs: um.slice(-13), cur: udpCur >= 0 ? Math.min(um.length, 13) - 1 : -1, minRows: 12 },
        ], { 'TCP segments': tm.filter((m) => m.label).length, 'UDP datagrams': um.filter((m) => m.label).length }, {}, k < steps - 1 ? 'Next step.' : 'Compare.'));
      }
      frames.push(F('TCP vs UDP — summary.', 'Choose TCP when every byte matters (web, e-mail, files); choose UDP when speed matters more than perfection (live media, DNS, games).', [{ type: 'table', box: [60, 30, 880, 420], title: 'Comparison', cols: ['Feature', 'TCP', 'UDP'], rows: cmp, mono: false, rowH: 48 }], { Winner: 'Depends on the application' }, {}, 'Done.'));
      return frames;
    },
  };

  // ════════════════════ TCP SLIDING WINDOW (bytes) ════════════════════
  S['cn-tcp-sliding-window'] = {
    inputs: [
      { key: 'total', label: 'Bytes to send', type: 'number', default: 8000, min: 2000, max: 12000 },
      { key: 'mss', label: 'MSS (bytes per segment)', type: 'number', default: 1000, min: 500, max: 2000 },
      { key: 'rwnd', label: 'Receiver window (rwnd, bytes)', type: 'number', default: 4000, min: 1000, max: 8000 },
      { key: 'shrink', label: 'Receiver shrinks rwnd to half after 3 ACKs', type: 'checkbox', default: false },
    ],
    build(inp) {
      const mss = Math.max(500, Math.min(2000, Number(inp.mss) || 1000));
      const total = Math.max(2 * mss, Math.min(12 * mss, Number(inp.total) || 8000));
      let rwnd = Math.max(mss, Number(inp.rwnd) || 4000);
      const nseg = Math.ceil(total / mss);
      let una = 0; let nxt = 0; let acks = 0; const inflight = []; const frames = [];
      const cells = () => Array.from({ length: nseg }, (_, i) => { const lo = i * mss; const hi = Math.min(total, lo + mss) - 1; return { t: `${lo}`, st: hi < una ? 'acked' : lo < nxt ? 'sent' : lo < una + rwnd ? 'usable' : 'notyet' }; });
      const snap = (title, why, pk, next) => frames.push(F(title, why, [
        { type: 'window', box: [10, 10, 980, 150], title: `Sender byte stream (each box = ${mss} bytes, label = first byte)`, cells: cells(), win: { from: Math.floor(una / mss), size: Math.round(rwnd / mss), label: `window = rwnd ${rwnd} B` } },
        { type: 'topo', box: [10, 170, 980, 240], nodes: [{ id: 'S', label: 'Sender', x: 0, y: 0.5, kind: 'pc' }, { id: 'R', label: 'Receiver', x: 1, y: 0.5, kind: 'server', sub: `rwnd ${rwnd}` }], links: [{ a: 'S', b: 'R' }], packets: pk },
        { type: 'callout', box: [10, 420, 980, 130], title: 'Window arithmetic', lines: [`SND.UNA (oldest unacked) = ${una}    SND.NXT (next to send) = ${nxt}`, `Bytes in flight = ${nxt - una}    Usable window = SND.UNA + rwnd − SND.NXT = ${Math.max(0, una + rwnd - nxt)}`], mono: true },
      ], { 'SND.UNA': una, 'SND.NXT': nxt, 'In flight': nxt - una, 'Usable': Math.max(0, una + rwnd - nxt), rwnd }, {}, next));
      snap(`TCP may have up to rwnd = ${rwnd} unacknowledged bytes in flight.`, 'TCP numbers bytes, not segments. The window slides forward as cumulative ACKs arrive.', [], 'Send segments until the window is full.');
      let guard = 0;
      while (una < total && guard++ < 200) {
        if (nxt < total && nxt + Math.min(mss, total - nxt) <= una + rwnd) {
          const len = Math.min(mss, total - nxt); inflight.push([nxt, len]); nxt += len;
          snap(`Send bytes ${nxt - len}–${nxt - 1} (seq=${nxt - len}).`, `${nxt - una} bytes are now in flight; ${Math.max(0, una + rwnd - nxt)} bytes of window remain usable.`, [{ from: 'S', to: 'R', label: `seq ${nxt - len}` }], nxt + mss <= una + rwnd && nxt < total ? 'Send more.' : 'Window full — wait for an ACK.');
          continue;
        }
        const [s0, l0] = inflight.shift(); una = s0 + l0; acks++;
        if (inp.shrink && acks === 3) rwnd = Math.max(mss, Math.round(rwnd / 2 / mss) * mss);
        snap(`ACK ${una} arrives${inp.shrink && acks === 3 ? ` with a smaller window rwnd = ${rwnd}` : ''} → window slides to start at byte ${una}.`, inp.shrink && acks === 3 ? 'The receiver advertised a smaller window (its buffer is filling), so the sender may keep fewer bytes in flight.' : 'A cumulative ACK means "all bytes before this number arrived". The left edge moves right, opening space for new data.', [{ from: 'R', to: 'S', label: `ACK ${una}`, tone: 'violet' }], una < total ? 'Send newly allowed bytes.' : 'All data acknowledged.');
      }
      frames.push(F(`All ${total} bytes acknowledged.`, 'The sliding window keeps the link busy while never sending more than the receiver can accept.', frames[frames.length - 1].scene.map((p) => (p.type === 'topo' ? { ...p, packets: [] } : p)), { 'Bytes sent': total, ACKs: acks }, {}, 'Done.'));
      return frames;
    },
  };

  // ════════════════════ FLOW CONTROL ════════════════════
  S['cn-flow-control'] = {
    inputs: [
      { key: 'buf', label: 'Receive buffer (bytes)', type: 'number', default: 4000, min: 1000, max: 10000 },
      { key: 'mss', label: 'Sender segment size (bytes)', type: 'number', default: 1000, min: 200, max: 2000 },
      { key: 'read', label: 'Application reads per tick (bytes)', type: 'number', default: 400, min: 0, max: 3000 },
      { key: 'ticks', label: 'Time steps', type: 'number', default: 10, min: 4, max: 16 },
    ],
    build(inp) {
      const B = Math.max(1000, Number(inp.buf) || 4000); const mss = Math.max(200, Number(inp.mss) || 1000); const rd = Math.max(0, Number(inp.read) || 0); const T = Math.max(4, Math.min(16, Number(inp.ticks) || 10));
      let buffered = 0; let rwndKnown = B; let lastRcvd = 0; let lastRead = 0; const hist = [[0, B]]; const frames = [];
      const sc = (pk) => [
        { type: 'bar', box: [10, 10, 980, 110], title: `Receiver buffer (${B} bytes)`, total: B, segs: [{ v: buffered, label: 'Buffered', tone: 'amber' }, { v: B - buffered, label: 'Free = rwnd', tone: 'green' }], caption: `rwnd = RcvBuffer − (LastByteRcvd − LastByteRead) = ${B} − (${lastRcvd} − ${lastRead}) = ${B - buffered}` },
        { type: 'topo', box: [10, 125, 480, 250], nodes: [{ id: 'S', label: 'Sender', x: 0, y: 0.5, kind: 'pc', sub: `knows rwnd ${rwndKnown}` }, { id: 'R', label: 'Receiver', x: 1, y: 0.5, kind: 'server' }], links: [{ a: 'S', b: 'R' }], packets: pk },
        { type: 'chart', box: [505, 125, 485, 425], title: 'Advertised window over time', xLabel: 'time step', yLabel: 'rwnd (bytes)', xMax: T, yMax: B, yStep: Math.max(500, Math.round(B / 8 / 500) * 500), series: [{ pts: hist.slice() }] },
      ];
      frames.push(F(`The receiver has a ${B}-byte buffer; it advertises rwnd = ${B}.`, 'Flow control stops a fast sender from overflowing a slow receiver. Every ACK carries the free buffer space (rwnd).', sc([]), { rwnd: B, Buffered: 0 }, { 'App read rate': `${rd} B/step` }, 'Start sending.'));
      for (let t = 1; t <= T; t++) {
        let sent = 0; let probe = false;
        if (rwndKnown > 0) sent = Math.min(mss, rwndKnown); else probe = true;
        const accept = Math.min(sent, B - buffered); buffered += accept; lastRcvd += accept;
        const readNow = Math.min(rd, buffered); buffered -= readNow; lastRead += readNow;
        rwndKnown = B - buffered; hist.push([t, rwndKnown]);
        frames.push(F(probe ? `Step ${t}: rwnd was 0 → sender only sends a 1-byte window probe.` : `Step ${t}: send ${sent} bytes; app reads ${readNow}; ACK advertises rwnd = ${rwndKnown}.`, probe ? 'With a zero window the sender stops and starts a persist timer; the probe forces the receiver to report when space opens up.' : rwndKnown === 0 ? 'The buffer is full, so the receiver advertises a zero window — the sender must stop.' : 'The sender never sends more than the last advertised rwnd.', sc(probe ? [{ from: 'S', to: 'R', label: 'probe 1B', tone: 'violet' }] : [{ from: 'S', to: 'R', label: `${sent} B` }]), { Step: `${t} / ${T}`, Sent: probe ? 'probe' : sent, 'App read': readNow, Buffered: buffered, rwnd: rwndKnown }, { LastByteRcvd: lastRcvd, LastByteRead: lastRead }, t < T ? 'Next time step.' : 'Done.'));
      }
      return frames;
    },
  };

  // ════════════════════ CONGESTION CONTROL ════════════════════
  function congestion(variant, ssthresh0, rounds, events) {
    let cwnd = 1; let ss = ssthresh0; const pts = []; const log = [];
    for (let r = 1; r <= rounds; r++) {
      const phase = cwnd < ss ? 'Slow start' : 'Congestion avoidance';
      pts.push([r, cwnd]); const ev = events[r];
      log.push({ r, cwnd, ss, phase, ev });
      if (ev === 'timeout') { ss = Math.max(2, Math.floor(cwnd / 2)); cwnd = 1; }
      else if (ev === 'dup') { ss = Math.max(2, Math.floor(cwnd / 2)); cwnd = variant === 'reno' ? ss : 1; }
      else if (cwnd < ss) cwnd = Math.min(cwnd * 2, ss);
      else cwnd += 1;
    }
    return { pts, log };
  }
  root.CNUtil.congestion = congestion;
  S['cn-congestion-control'] = {
    inputs: [
      { key: 'variant', label: 'TCP variant', type: 'select', default: 'reno', options: [['reno', 'TCP Reno (fast recovery)'], ['tahoe', 'TCP Tahoe']] },
      { key: 'ssthresh', label: 'Initial ssthresh (segments)', type: 'number', default: 16, min: 2, max: 64 },
      { key: 'rounds', label: 'Transmission rounds (RTTs)', type: 'number', default: 22, min: 6, max: 30 },
      { key: 'events', label: 'Loss events (round:type)', type: 'text', default: '9:dup, 16:timeout', max: 40, help: 'type = dup (3 duplicate ACKs) or timeout' },
    ],
    build(inp) {
      const rounds = Math.max(6, Math.min(30, Number(inp.rounds) || 22)); const ss0 = Math.max(2, Math.min(64, Number(inp.ssthresh) || 16));
      const events = {};
      String(inp.events || '').split(',').map((s) => s.trim()).filter(Boolean).forEach((p) => { const m = p.match(/^(\d+)\s*:\s*(dup|timeout)$/i); if (!m) throw new Error(`"${p}" — write events like 9:dup, 16:timeout.`); const r = Number(m[1]); if (r < 1 || r > rounds) throw new Error(`Round ${r} is outside 1–${rounds}.`); events[r] = m[2].toLowerCase(); });
      const { log } = congestion(inp.variant, ss0, rounds, events);
      const yMax = Math.max(8, ...log.map((l) => l.cwnd)) + 2;
      const frames = [];
      log.forEach((l, k) => {
        const pts = log.slice(0, k + 1).map((x) => [x.r, x.cwnd]);
        const nxt = log[k + 1];
        const evTxt = l.ev === 'timeout' ? ` — TIMEOUT: ssthresh = ${nxt ? nxt.ss : Math.max(2, Math.floor(l.cwnd / 2))}, cwnd = 1` : l.ev === 'dup' ? ` — 3 DUP ACKs: ssthresh = ${nxt ? nxt.ss : Math.max(2, Math.floor(l.cwnd / 2))}, cwnd = ${inp.variant === 'reno' ? 'ssthresh (fast recovery)' : '1'}` : '';
        frames.push(F(`Round ${l.r}: cwnd = ${l.cwnd} segment${l.cwnd === 1 ? '' : 's'} (${l.phase})${evTxt}.`,
          l.ev === 'timeout' ? 'A timeout signals heavy congestion: both Tahoe and Reno halve ssthresh and restart slow start from 1.' : l.ev === 'dup' ? (inp.variant === 'reno' ? 'Three duplicate ACKs mean later segments still arrive (mild congestion): Reno halves cwnd and continues in congestion avoidance (fast recovery).' : 'Tahoe treats 3 duplicate ACKs like a timeout: cwnd back to 1 and slow start.') : l.phase === 'Slow start' ? 'Slow start: cwnd doubles every RTT (one more segment per ACK) until it reaches ssthresh.' : 'Congestion avoidance (additive increase): cwnd grows by 1 segment per RTT.',
          [{ type: 'chart', box: [10, 10, 980, 540], title: `TCP ${inp.variant === 'tahoe' ? 'Tahoe' : 'Reno'} congestion window`, xLabel: 'Transmission round (RTT)', yLabel: 'cwnd (segments)', xMax: rounds, yMax, yStep: yMax > 30 ? 4 : 2, xStep: 2, series: [{ pts }], hlines: [{ y: l.ss, label: `ssthresh = ${l.ss}` }], marks: Object.entries(events).filter(([r]) => Number(r) <= l.r).map(([r, t]) => ({ x: Number(r), label: t === 'dup' ? '3 dup ACKs' : 'timeout' })), cur: [l.r, l.cwnd], curLabel: `cwnd ${l.cwnd}` }],
          { Round: l.r, cwnd: l.cwnd, ssthresh: l.ss, Phase: l.phase, Event: l.ev ? (l.ev === 'dup' ? '3 duplicate ACKs' : 'Timeout') : '—' }, { 'Sending rate': `≈ cwnd × MSS / RTT = ${l.cwnd} × 1460 B per RTT` }, k < log.length - 1 ? 'Next RTT.' : 'Done.'));
      });
      return frames;
    },
  };

  // ════════════════════ LOSS & RETRANSMISSION ════════════════════
  S['cn-retransmission'] = {
    inputs: [
      { key: 'count', label: 'Segments to send', type: 'number', default: 6, min: 3, max: 8 },
      { key: 'lost', label: 'Lost segment number', type: 'number', default: 2, min: 1, max: 8 },
      { key: 'mode', label: 'Recovery', type: 'select', default: 'fast', options: [['fast', 'Fast retransmit (3 duplicate ACKs)'], ['timeout', 'Retransmission timeout (RTO)']] },
    ],
    build(inp, ctx) {
      const n = Math.max(3, Math.min(8, Number(inp.count) || 6)); const lost = Math.max(1, Math.min(n, Number(inp.lost) || 2)); const MSS = 1000;
      const seqOf = (i) => 1 + (i - 1) * MSS;
      const actors = [{ name: 'Sender' }, { name: 'Receiver' }]; const msgs = []; const frames = [];
      let expected = 1; const buffered = new Set(); let dups = 0; let retransmitted = false;
      const snap = (title, why, next) => frames.push(F(title, why, [seqScene(actors, msgs, null, [10, 6, 980, 548], 10)], { 'Receiver expects': expected, 'Duplicate ACKs': dups, Retransmitted: retransmitted ? `segment ${lost}` : 'no' }, { Buffered: [...buffered].sort((a, b) => a - b).map((s) => `seq ${s}`).join(', ') || '—' }, next));
      if (ctx.advanced) {
        const samples = [100, 120, 90, 140, 110]; let est = samples[0]; let dev = samples[0] / 2; const rows = [];
        samples.forEach((sm, i) => { if (i) { dev = 0.75 * dev + 0.25 * Math.abs(sm - est); est = 0.875 * est + 0.125 * sm; } rows.push([String(i + 1), `${sm}`, est.toFixed(1), dev.toFixed(1), (est + 4 * dev).toFixed(1)]); });
        frames.push(F('How long should the sender wait? RTO = EstimatedRTT + 4 × DevRTT.', 'EstimatedRTT = 0.875·Est + 0.125·Sample; DevRTT = 0.75·Dev + 0.25·|Sample − Est|. The timeout adapts to the measured RTT and its variation.', [{ type: 'table', box: [60, 40, 880, 320], title: 'RTT estimation (ms)', cols: ['Sample', 'SampleRTT', 'EstimatedRTT', 'DevRTT', 'RTO'], rows }], { 'Final RTO': `${rows[rows.length - 1][4]} ms` }, {}, 'Now send the data.'));
      }
      for (let i = 1; i <= n; i++) {
        const s = seqOf(i); const isLost = i === lost;
        msgs.push({ from: 0, to: 1, label: `Seg ${i} seq=${s}`, lost: isLost, token: `seq ${s}` });
        if (isLost) { snap(`Segment ${i} (seq ${s}) is lost.`, 'The sender does not know yet and keeps sending within its window.', 'Continue sending.'); continue; }
        if (s === expected) { expected = s + MSS; while (buffered.has(expected)) { buffered.delete(expected); expected += MSS; } msgs.push({ from: 1, to: 0, label: `ACK ${expected}`, token: `ACK ${expected}` }); snap(`Segment ${i} arrives in order → ACK ${expected}.`, 'TCP ACKs are cumulative: the ACK number is the next byte expected.', 'Next segment.'); }
        else {
          buffered.add(s); dups++;
          msgs.push({ from: 1, to: 0, label: `ACK ${expected} (dup ${dups})`, tone: 'amber', token: `dup ${dups}` });
          snap(`Segment ${i} arrives out of order → duplicate ACK ${expected} (#${dups}).`, `Bytes ${expected}… are missing, so the receiver buffers segment ${i} and repeats ACK ${expected}.`, inp.mode === 'fast' && dups === 3 ? 'Three duplicates trigger fast retransmit.' : 'Next segment.');
          if (inp.mode === 'fast' && dups === 3 && !retransmitted) {
            retransmitted = true; msgs.push({ from: 0, to: 1, label: `Seg ${lost} seq=${seqOf(lost)} (fast retransmit)`, tone: 'violet' });
            expected = seqOf(lost) + MSS; while (buffered.has(expected)) { buffered.delete(expected); expected += MSS; }
            snap(`3 duplicate ACKs → fast retransmit segment ${lost} immediately.`, 'Duplicate ACKs prove later segments are getting through, so the sender resends the missing one without waiting for the timer.', 'Receiver fills the gap.');
            msgs.push({ from: 1, to: 0, label: `ACK ${expected}`, tone: 'green' });
            snap(`Gap filled → cumulative ACK ${expected}.`, 'All buffered segments are now in order and delivered together.', 'Continue.');
          }
        }
      }
      if (!retransmitted) {
        msgs.push({ note: '⏰ RTO expires', at: 0, tone: 'red' });
        snap('No ACK for segment ' + lost + ' before the retransmission timer expires.', inp.mode === 'fast' ? 'Fewer than 3 duplicate ACKs arrived, so fast retransmit could not trigger — the sender falls back to the timeout.' : 'Timeout recovery waits a full RTO, which is slower than fast retransmit.', 'Retransmit.');
        retransmitted = true; msgs.push({ from: 0, to: 1, label: `Seg ${lost} seq=${seqOf(lost)} (resent)`, tone: 'violet' });
        expected = seqOf(lost) + MSS; while (buffered.has(expected)) { buffered.delete(expected); expected += MSS; }
        snap(`Segment ${lost} is retransmitted.`, 'After a timeout TCP also doubles the RTO (exponential back-off).', 'Receiver fills the gap.');
        msgs.push({ from: 1, to: 0, label: `ACK ${expected}`, tone: 'green' });
        snap(`Cumulative ACK ${expected} — every byte has arrived.`, 'The receiver delivers all buffered data to the application in order.', 'Done.');
      }
      return frames;
    },
  };
})(typeof window !== 'undefined' ? window : globalThis);
