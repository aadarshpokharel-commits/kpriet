// Verifies all Computer Networks simulations: every simulation builds valid frames for its
// default inputs and many variations, and the networking maths matches reference answers.
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const files = ['cn-catalog.js', 'cn-render.js', 'cn-scenarios-u1.js', 'cn-scenarios-u2.js', 'cn-scenarios-u3.js', 'cn-scenarios-u4.js', 'cn-scenarios-u5.js'];
const sandbox = { TextEncoder, console };
sandbox.window = sandbox; sandbox.globalThis = sandbox;
vm.createContext(sandbox);
for (const f of files) vm.runInContext(readFileSync(new URL(`../src/tools/${f}`, import.meta.url), 'utf8'), sandbox, { filename: f });
const CAT = sandbox.EduverseCNCatalog; const SC = sandbox.CNScenarios; const U = sandbox.CNUtil; const R = sandbox.CNRender;

const results = {}; const fail = (name, msg) => { (results[name] ||= { checks: 0, fails: [] }).fails.push(msg); };
const ok = (name, cond, msg) => { (results[name] ||= { checks: 0, fails: [] }).checks++; if (!cond) fail(name, msg); };
const defaults = (id) => Object.fromEntries((SC[id].inputs || []).map((i) => [i.key, i.default]));

// 1) Every catalogue entry has an implementation, and every build renders
ok('Catalogue', CAT.simulations.length === 35, `expected 35 simulations, found ${CAT.simulations.length}`);
for (const s of CAT.simulations) {
  ok('Catalogue', !!SC[s.id], `${s.id} has no implementation`);
  if (!SC[s.id]) continue;
  const variants = [defaults(s.id)];
  (SC[s.id].inputs || []).forEach((inp) => { if (inp.type === 'select') inp.options.forEach(([v]) => variants.push({ ...defaults(s.id), [inp.key]: v })); if (inp.type === 'checkbox') variants.push({ ...defaults(s.id), [inp.key]: !inp.default }); });
  for (const v of variants.filter((x) => !(x.from && x.from === x.to))) for (const advanced of [false, true]) {
    let frames;
    try { frames = SC[s.id].build({ ...v }, { advanced }); } catch (e) { fail(s.title, `build threw for ${JSON.stringify(v)}: ${e.message}`); continue; }
    ok(s.title, Array.isArray(frames) && frames.length >= 2, `too few frames for ${JSON.stringify(v)}`);
    frames.forEach((f, i) => {
      ok(s.title, typeof f.title === 'string' && f.title.length > 3 && typeof f.why === 'string' && f.why.length > 3, `frame ${i} missing explanation (${JSON.stringify(v)})`);
      ok(s.title, Array.isArray(f.scene) && f.scene.length > 0, `frame ${i} has no scene`);
      try { const out = R.render({ scene: f.scene, speed: 1, advanced }); ok(s.title, out.svg.startsWith('<svg') && !/NaN|undefined/.test(out.svg), `frame ${i} renders NaN/undefined (${JSON.stringify(v)})`); } catch (e) { fail(s.title, `render threw on frame ${i}: ${e.message}`); }
    });
  }
}

// 2) Maths against references
let seed = 7; const rnd = (n) => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed % n; };
const bits = (n) => Array.from({ length: n }, () => rnd(2)).join('');
// CRC: polynomial remainder via BigInt reference
for (let t = 0; t < 300; t++) {
  const M = '1' + bits(3 + rnd(12)); const G = '1' + bits(2 + rnd(6)).replace(/0$/, '1');
  const r = G.length - 1; const { remainder } = U.crcDivide(M + '0'.repeat(r), G);
  let a = BigInt('0b' + M) << BigInt(r); const g = BigInt('0b' + G);
  for (let i = a.toString(2).length - 1; i >= r; i--) if ((a >> BigInt(i)) & 1n) a ^= g << BigInt(i - r);
  ok('CRC Error Detection Simulator', remainder === a.toString(2).padStart(r, '0'), `CRC ${M}/${G} got ${remainder}`);
  const code = M + remainder; ok('CRC Error Detection Simulator', /^0+$/.test(U.crcDivide(code, G).remainder), 'codeword must divide evenly');
  const k = rnd(code.length); const bad = code.slice(0, k) + (code[k] === '1' ? '0' : '1') + code.slice(k + 1);
  ok('CRC Error Detection Simulator', !/^0+$/.test(U.crcDivide(bad, G).remainder), `single-bit error at ${k} not detected (${code}/${G})`);
}
// Hamming: every single-bit error is corrected
for (let t = 0; t < 200; t++) {
  const D = bits(4 + rnd(8)); let nbits = 0; let r = 0; while ((1 << r) < D.length + r + 1) r++; nbits = D.length + r;
  const eb = 1 + rnd(nbits);
  const fr = SC['cn-crc'].build({ mode: 'hamming', hdata: D, errbit: eb }, { advanced: false });
  ok('CRC Error Detection Simulator', fr.at(-1).state.Syndrome === eb && fr.at(-1).state.Data === D, `Hamming ${D} err ${eb} → syndrome ${fr.at(-1).state.Syndrome}, data ${fr.at(-1).state.Data}`);
}
// Bit stuffing: never six 1s inside, and de-stuffing restores the data
for (let t = 0; t < 200; t++) {
  const D = bits(8 + rnd(16)); const fr = SC['cn-framing'].build({ method: 'bit', bits: D }, { advanced: false });
  const frameCells = fr.find((f) => /Frame ready/.test(f.title)).scene[0].rows[0].cells.map((c) => c.t).join('');
  const inner = frameCells.slice(8, -8);
  ok('Frame Formation Simulator', !/111111/.test(inner), `stuffed data ${inner} contains six 1s`);
  ok('Frame Formation Simulator', inner.replace(/111110/g, '11111') === D, `de-stuffing ${inner} ≠ ${D}`);
}
// Ethernet CRC-32 (known vector)
ok('Ethernet Frame Visualizer', U.crc32(Array.from(new TextEncoder().encode('123456789'))) === 0xcbf43926, 'CRC-32 check value must be 0xCBF43926');
// IPv4 checksum: header with checksum inserted sums to 0xFFFF
for (let t = 0; t < 100; t++) {
  const words = Array.from({ length: 10 }, (_, i) => (i === 5 ? 0 : rnd(65536)));
  const { checksum } = U.ipChecksum(words); words[5] = checksum;
  let s = 0; for (const w of words) { s += w; s = (s & 0xffff) + (s >>> 16); }
  ok('IP Packet Structure Visualizer', s === 0xffff, 'checksum verification failed');
}
ok('IP Packet Structure Visualizer', U.ipChecksum([0x4500, 0x0073, 0x0000, 0x4000, 0x4011, 0x0000, 0xc0a8, 0x0001, 0xc0a8, 0x00c7]).checksum === 0xb861, 'RFC example checksum must be 0xB861');
// Subnetting FLSM/VLSM
for (let t = 0; t < 200; t++) {
  const p = 16 + rnd(9); const want = 1 + rnd(2 ** Math.min(6, 30 - p) - 1);
  const net = `10.${rnd(256)}.0.0`; const base = `${net}/${p}`; const baseIp = U.parseIp(net) & U.maskOf(p);
  let fr; try { fr = SC['cn-subnetting'].build({ mode: 'flsm', network: `${U.ipStr(baseIp >>> 0)}/${p}`, by: 'subnets', count: want }, { advanced: false }); } catch (e) { fail('Subnetting Visualizer', `${base} ${want}: ${e.message}`); continue; }
  let b = 0; while (2 ** b < want) b++;
  ok('Subnetting Visualizer', fr[0].state['New prefix'] === `/${p + b}`, `${base} → ${want} subnets expected /${p + b}, got ${fr[0].state['New prefix']}`);
  const rows = fr.at(-1).scene[0].rows; const block = 2 ** (32 - p - b);
  rows.forEach((row, i) => ok('Subnetting Visualizer', row[1] === `${U.ipStr(((baseIp >>> 0) + i * block) >>> 0)}/${p + b}`, `subnet ${i} network ${row[1]}`));
}
{ const fr = SC['cn-subnetting'].build({ mode: 'vlsm', network: '192.168.1.0/24', needs: '60, 28, 12, 2' }, { advanced: false });
  const rows = fr.at(-1).scene[0].rows.map((r) => r[1]);
  ok('Subnetting Visualizer', JSON.stringify(rows) === JSON.stringify(['192.168.1.0/26', '192.168.1.64/27', '192.168.1.96/28', '192.168.1.112/30']), `VLSM rows ${rows}`); }
// IPv4 addressing
{ const fr = SC['cn-ipv4-addressing'].build({ ip: '172.20.9.130', prefix: '26' }, { advanced: false }); const st = fr.at(-1).state;
  ok('IPv4 Addressing Simulator', st.Network === '172.20.9.128/26' && st.Broadcast === '172.20.9.191' && st['Usable hosts'] === 62, JSON.stringify(st)); }
// Longest prefix match vs reference
const RT = [['192.168.10.0', 24, 'eth0'], ['192.168.10.128', 25, 'eth1'], ['10.0.0.0', 8, 'eth1'], ['172.16.0.0', 16, 'eth2'], ['172.16.5.0', 24, 'eth3'], ['0.0.0.0', 0, 'eth4']];
for (let t = 0; t < 300; t++) {
  const pick = [`192.168.10.${rnd(256)}`, `10.${rnd(256)}.${rnd(256)}.${rnd(256)}`, `172.16.${rnd(8)}.${rnd(256)}`, `${1 + rnd(223)}.${rnd(256)}.${rnd(256)}.${rnd(256)}`][rnd(4)];
  const d = U.parseIp(pick); const best = RT.filter(([n, p]) => ((d & U.maskOf(p)) >>> 0) === U.parseIp(n)).sort((a, b) => b[1] - a[1])[0];
  const fr = SC['cn-packet-forwarding'].build({ dst: pick, ttl: 10 }, { advanced: false });
  ok('Packet Forwarding Simulator', fr.at(-1).state['Out interface'] === best[2], `${pick} → ${fr.at(-1).state['Out interface']} expected ${best[2]}`);
}
// Distance vector converges to true shortest paths
{ const { rounds } = U.dvRun([['A', 'B', 1], ['A', 'C', 4], ['B', 'C', 2], ['B', 'D', 7], ['C', 'D', 1], ['D', 'E', 2]]);
  const last = rounds.at(-1); const nodes = ['A', 'B', 'C', 'D', 'E']; const edges = [['A', 'B', 1], ['A', 'C', 4], ['B', 'C', 2], ['B', 'D', 7], ['C', 'D', 1], ['D', 'E', 2]];
  nodes.forEach((x) => { const { dist } = U.dijkstra(nodes, edges, x); nodes.forEach((y) => ok('Routing Table Simulator', last[x][y][0] === dist[y], `DV ${x}->${y} = ${last[x][y][0]} vs ${dist[y]}`)); }); }
// Dijkstra vs Bellman-Ford on random graphs
for (let t = 0; t < 200; t++) {
  const n = 4 + rnd(4); const nodes = Array.from({ length: n }, (_, i) => String.fromCharCode(65 + i)); const edges = [];
  for (let i = 1; i < n; i++) edges.push([nodes[rnd(i)], nodes[i], 1 + rnd(9)]);
  for (let k = 0; k < n; k++) { const a = nodes[rnd(n)]; const b = nodes[rnd(n)]; if (a !== b) edges.push([a, b, 1 + rnd(9)]); }
  const { dist } = U.dijkstra(nodes, edges, 'A');
  const bf = Object.fromEntries(nodes.map((x) => [x, x === 'A' ? 0 : Infinity]));
  for (let i = 0; i < n; i++) edges.forEach(([a, b, w]) => { if (bf[a] + w < bf[b]) bf[b] = bf[a] + w; if (bf[b] + w < bf[a]) bf[a] = bf[b] + w; });
  nodes.forEach((x) => ok('Network Path Simulator', dist[x] === bf[x], `Dijkstra ${x}: ${dist[x]} vs ${bf[x]}`));
}
// Fragmentation reference
for (let t = 0; t < 300; t++) {
  const total = 100 + rnd(20000); const mtu = 68 + rnd(3000); const { per, frags } = U.fragment(total, mtu);
  ok('IP Fragmentation Simulator', per % 8 === 0 && per <= mtu - 20, `per=${per}`);
  ok('IP Fragmentation Simulator', frags.reduce((a, f) => a + f.data, 0) === total - 20, 'data bytes must add up');
  ok('IP Fragmentation Simulator', frags.every((f, i) => f.total <= mtu && f.off * 8 === f.bytes && f.mf === (i < frags.length - 1 ? 1 : 0)), 'offset/MF/length rules');
}
{ const { frags } = U.fragment(4000, 1500); ok('IP Fragmentation Simulator', JSON.stringify(frags.map((f) => [f.total, f.off, f.mf])) === JSON.stringify([[1500, 0, 1], [1500, 185, 1], [1040, 370, 0]]), 'textbook 4000/1500 example'); }
// Congestion control textbook trace (Reno, ssthresh 8, 3 dup ACKs at round 6)
{ const { pts } = U.congestion('reno', 8, 10, { 6: 'dup' }); ok('TCP Congestion Control Simulator', JSON.stringify(pts.map((p) => p[1])) === JSON.stringify([1, 2, 4, 8, 9, 10, 5, 6, 7, 8]), `Reno trace ${pts.map((p) => p[1])}`);
  const tah = U.congestion('tahoe', 8, 10, { 6: 'dup' }).pts.map((p) => p[1]); ok('TCP Congestion Control Simulator', JSON.stringify(tah) === JSON.stringify([1, 2, 4, 8, 9, 10, 1, 2, 4, 5]), `Tahoe trace ${tah}`); }
// Stop-and-wait / sliding window deliver everything
for (const sc of ['none', 'lostframe', 'lostack', 'both']) for (let n = 1; n <= 6; n++) { const fr = SC['cn-stop-wait'].build({ count: n, scenario: sc, which: Math.min(n, 2) }, { advanced: false }); ok('Stop-and-Wait ARQ Simulator', fr.at(-1).state['Frames delivered'] === `${n} / ${n}`, `${sc} n=${n} delivered ${fr.at(-1).state['Frames delivered']}`); }
for (const protocol of ['gbn', 'sr']) for (let t = 0; t < 60; t++) {
  const total = 3 + rnd(10); const fr = SC['cn-sliding-window'].build({ protocol, window: 2 + rnd(6), total, lost: rnd(total + 1) }, { advanced: false });
  ok('Sliding Window Simulator', fr.at(-1).state.Delivered === `${total} / ${total}`, `${protocol} total ${total}: ${fr.at(-1).state.Delivered}`);
}
// TCP handshake numbers
{ const fr = SC['cn-tcp-handshake'].build({ cisn: 1000, sisn: 5000, scenario: 'normal' }, { advanced: false });
  const labels = fr.at(-1).scene[0].msgs.filter((m) => m.label).map((m) => m.label);
  ok('TCP Three-Way Handshake Simulator', labels.includes('SYN seq=1000') && labels.includes('SYN+ACK seq=5000 ack=1001') && labels.includes('ACK seq=1001 ack=5001'), labels.join(' | ')); }
// TCP checksum verifies
{ const hdr = [0xc8, 0x22, 0, 80, 0, 0, 3, 0xe9, 0, 0, 0x13, 0x89, 0x50, 0x18, 0xfa, 0xf0, 0, 0, 0, 0]; const pl = [71, 69, 84];
  const ck = U.tcpChecksum(0xc0a8010a, 0x8efab704, hdr, pl); const h2 = hdr.slice(); h2[16] = ck >> 8; h2[17] = ck & 255;
  const words = [0xc0a8, 0x010a, 0x8efa, 0xb704, 6, 23]; const b = [...h2, ...pl, 0]; for (let i = 0; i < b.length; i += 2) words.push((b[i] << 8) | b[i + 1]);
  let s = 0; for (const w of words) { s += w; s = (s & 0xffff) + (s >>> 16); } ok('TCP Segment Visualizer', s === 0xffff, 'TCP checksum does not verify'); }
// Flow control never overflows the buffer
for (let t = 0; t < 100; t++) { const buf = 1000 + rnd(9000); const fr = SC['cn-flow-control'].build({ buf, mss: 200 + rnd(1800), read: rnd(3000), ticks: 4 + rnd(12) }, { advanced: false }); fr.forEach((f) => ok('TCP Flow Control Simulator', f.state.Buffered == null || (f.state.Buffered >= 0 && f.state.Buffered <= buf && f.state.rwnd === buf - f.state.Buffered), `buffer ${f.state.Buffered}/${buf}, rwnd ${f.state.rwnd}`)); }
// Switch learning table
{ const fr = SC['cn-switch'].build({ seq: 'A>C, C>A, B>A, D>*, A>C' }, { advanced: false }); const titles = fr.map((f) => f.title).join(' | ');
  ok('Switch Forwarding Simulator', /is not in the table → flood/.test(titles) && /port 1: forward only there/.test(titles) && /Broadcast destination → flood/.test(titles) && /port 3: forward only there/.test(titles), titles); }

let total = 0; let bad = 0;
console.log('Simulation / check group'.padEnd(46) + 'checks   result');
for (const [name, r] of Object.entries(results)) { total += r.checks; bad += r.fails.length; console.log(`${name.padEnd(46)}${String(r.checks).padStart(6)}   ${r.fails.length ? `FAIL (${r.fails.length})\n      e.g. ${r.fails[0]}` : 'OK'}`); }
console.log(`\n${Object.keys(results).length} groups, ${total} checks, ${bad} failures`);
process.exitCode = bad ? 1 : 0;
