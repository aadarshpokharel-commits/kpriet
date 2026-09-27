'use strict';
/* Computer Networks simulations — Unit 3: Network Layer */
(function (root) {
  const S = (root.CNScenarios = root.CNScenarios || {});
  const F = (title, why, scene, state = {}, adv = {}, next = '') => ({ title, why, scene, state, adv, next });

  // ─── IPv4 helpers ───
  const parseIp = (s, name = 'IP address') => {
    const v = String(s || '').trim();
    const m = v.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
    if (!m || m.slice(1).some((o) => Number(o) > 255)) throw new Error(`${name} must be a valid IPv4 address like 192.168.1.10.`);
    return ((Number(m[1]) << 24) >>> 0) + (Number(m[2]) << 16) + (Number(m[3]) << 8) + Number(m[4]);
  };
  const ipStr = (n) => [24, 16, 8, 0].map((s) => (n >>> s) & 255).join('.');
  const maskOf = (p) => (p === 0 ? 0 : (0xffffffff << (32 - p)) >>> 0);
  const bin32 = (n) => (n >>> 0).toString(2).padStart(32, '0');
  const dotted = (n) => bin32(n).replace(/(.{8})(?!$)/g, '$1.');
  const parseCidr = (s) => {
    const [ip, p] = String(s || '').trim().split('/');
    const prefix = Number(p);
    if (!Number.isInteger(prefix) || prefix < 0 || prefix > 32) throw new Error('Write the network as address/prefix, e.g. 192.168.1.0/24.');
    return { ip: parseIp(ip, 'Network'), prefix };
  };
  const ipClass = (n) => { const a = n >>> 24; return a < 128 ? ['A', 8, '0'] : a < 192 ? ['B', 16, '10'] : a < 224 ? ['C', 24, '110'] : a < 240 ? ['D', null, '1110'] : ['E', null, '1111']; };
  const kindOf = (n) => {
    const a = n >>> 24; const b = (n >>> 16) & 255;
    if (a === 10 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168)) return 'Private (RFC 1918)';
    if (a === 127) return 'Loopback';
    if (a === 169 && b === 254) return 'Link-local (APIPA)';
    if (a >= 224 && a < 240) return 'Multicast';
    if (a >= 240) return 'Reserved';
    if (n === 0) return 'Unspecified';
    return 'Public';
  };
  root.CNUtil = Object.assign(root.CNUtil || {}, { parseIp, ipStr, maskOf, parseCidr, ipClass, kindOf });
  const bitRow = (label, n, clsFn) => ({ label, cells: dotted(n).split('').map((t, i) => { const bit = t === '.' ? -1 : i - Math.floor(i / 9); return { t, cls: t === '.' ? 'dim' : clsFn ? clsFn(bit) : 'plain' }; }) });

  // ════════════════════ IPv4 ADDRESSING ════════════════════
  S['cn-ipv4-addressing'] = {
    inputs: [
      { key: 'ip', label: 'IPv4 address', type: 'text', default: '192.168.10.37', max: 15 },
      { key: 'prefix', label: 'Prefix length (blank = classful default)', type: 'text', default: '', max: 2 },
    ],
    build(inp) {
      const ip = parseIp(inp.ip || '192.168.10.37');
      const [cls, defPrefix, lead] = ipClass(ip);
      let prefix = String(inp.prefix || '').trim() === '' ? defPrefix : Number(inp.prefix);
      if (prefix == null) throw new Error(`Class ${cls} addresses have no default mask; enter a prefix length.`);
      if (!Number.isInteger(prefix) || prefix < 0 || prefix > 32) throw new Error('Prefix length must be 0–32.');
      const mask = maskOf(prefix); const net = (ip & mask) >>> 0; const bc = (net | (~mask >>> 0)) >>> 0;
      const hostBits = 32 - prefix;
      const usable = hostBits >= 2 ? 2 ** hostBits - 2 : hostBits === 1 ? 2 : 1;
      const octets = ipStr(ip).split('.');
      const frames = [];
      const netCls = (b) => (b < prefix ? 'flag' : 'esc');
      frames.push(F(`${ipStr(ip)} is four 8-bit numbers (octets).`, 'Computers store an IPv4 address as 32 bits; dotted-decimal is just the human-friendly form.', [{ type: 'bits', box: [20, 20, 960, 140], title: 'Dotted decimal → binary', labelW: 130, rows: [bitRow(ipStr(ip), ip)] }, { type: 'table', box: [20, 200, 960, 180], cols: ['Octet', 'Decimal', 'Binary'], rows: octets.map((o, i) => [String(i + 1), o, Number(o).toString(2).padStart(8, '0')]) }], { Address: ipStr(ip), Bits: 32 }, { Binary: dotted(ip) }, 'Find the class.'));
      frames.push(F(`First bits ${lead}… → Class ${cls}${defPrefix ? ` (default /${defPrefix})` : ''}.`, 'Classful addressing uses the leading bits: 0 = A, 10 = B, 110 = C, 1110 = D (multicast), 1111 = E. Modern networks use CIDR, but the class is still useful to know.', [{ type: 'bits', box: [20, 20, 960, 140], title: 'Leading bits', labelW: 130, rows: [bitRow(ipStr(ip), ip, (b) => (b >= 0 && b < lead.length ? 'hl' : 'plain'))] }, { type: 'table', box: [20, 200, 960, 220], cols: ['Class', 'Leading bits', 'First octet', 'Default mask'], rows: [['A', '0', '0–127', '/8'], ['B', '10', '128–191', '/16'], ['C', '110', '192–223', '/24'], ['D', '1110', '224–239', 'multicast'], ['E', '1111', '240–255', 'reserved']], hl: 'ABCDE'.indexOf(cls) }], { Class: cls, Type: kindOf(ip) }, {}, 'Apply the subnet mask.'));
      frames.push(F(`Prefix /${prefix} → mask ${ipStr(mask)}: ${prefix} network bits, ${hostBits} host bits.`, 'The mask has 1s over the network part and 0s over the host part.', [{ type: 'bits', box: [20, 20, 960, 200], title: 'Network part (purple) vs host part (blue)', labelW: 130, rows: [bitRow(ipStr(ip), ip, netCls), bitRow(`Mask /${prefix}`, mask, netCls)] }], { Mask: ipStr(mask), 'Network bits': prefix, 'Host bits': hostBits }, {}, 'AND the address with the mask.'));
      frames.push(F(`Network address = IP AND mask = ${ipStr(net)}.`, 'ANDing keeps the network bits and clears the host bits. All hosts in this subnet share this network address.', [{ type: 'bits', box: [20, 20, 960, 240], title: 'Bitwise AND', labelW: 130, rows: [bitRow(ipStr(ip), ip, netCls), bitRow('AND mask', mask, netCls), bitRow(`= ${ipStr(net)}`, net, (b) => (b < prefix ? 'ok' : 'dim'))] }], { Network: `${ipStr(net)}/${prefix}` }, {}, 'Find the broadcast address.'));
      frames.push(F(`Broadcast = host bits all 1 = ${ipStr(bc)}.`, 'The broadcast address reaches every host in the subnet, so it cannot be given to a host.', [{ type: 'bits', box: [20, 20, 960, 180], title: 'Broadcast address', labelW: 130, rows: [bitRow(`= ${ipStr(bc)}`, bc, (b) => (b < prefix ? 'plain' : 'new'))] }], { Broadcast: ipStr(bc) }, {}, 'Usable host range.'));
      frames.push(F(`Usable hosts: ${hostBits >= 2 ? `${ipStr(net + 1)} – ${ipStr(bc - 1)} (${usable} hosts)` : hostBits === 1 ? '2 (point-to-point /31)' : '1 (host route /32)'}.`, 'Hosts = 2^(host bits) − 2, because the network and broadcast addresses are reserved.', [{ type: 'table', box: [20, 20, 960, 330], title: 'Summary', cols: ['Item', 'Value'], rows: [['Address', ipStr(ip)], ['Class / type', `${cls} / ${kindOf(ip)}`], ['Prefix / mask', `/${prefix} = ${ipStr(mask)}`], ['Network', ipStr(net)], ['First host', hostBits >= 2 ? ipStr(net + 1) : '—'], ['Last host', hostBits >= 2 ? ipStr(bc - 1) : '—'], ['Broadcast', ipStr(bc)], ['Usable hosts', `2^${hostBits} − 2 = ${usable}`]], rowH: 34 }], { Network: `${ipStr(net)}/${prefix}`, Broadcast: ipStr(bc), 'Usable hosts': usable }, { 'Wildcard mask': ipStr(~mask >>> 0) }, 'Done.'));
      return frames;
    },
  };

  // ════════════════════ SUBNETTING (FLSM / VLSM) ════════════════════
  const subnetRow = (i, net, p) => { const bc = (net | (~maskOf(p) >>> 0)) >>> 0; const h = 32 - p; return [`S${i + 1}`, `${ipStr(net)}/${p}`, ipStr(maskOf(p)), h >= 2 ? ipStr(net + 1) : '—', h >= 2 ? ipStr(bc - 1) : '—', ipStr(bc), String(h >= 2 ? 2 ** h - 2 : 0)]; };
  const COLS = ['Subnet', 'Network', 'Mask', 'First host', 'Last host', 'Broadcast', 'Hosts'];
  S['cn-subnetting'] = {
    inputs: [
      { key: 'mode', label: 'Method', type: 'select', default: 'flsm', options: [['flsm', 'Fixed-length (equal subnets)'], ['vlsm', 'VLSM (different sizes)']] },
      { key: 'network', label: 'Network', type: 'text', default: '192.168.1.0/24', max: 18 },
      { key: 'by', label: 'Requirement', type: 'select', default: 'subnets', options: [['subnets', 'Number of subnets'], ['hosts', 'Hosts per subnet']], showIf: (i) => i.mode === 'flsm' },
      { key: 'count', label: 'How many', type: 'number', default: 4, min: 1, max: 4096, showIf: (i) => i.mode === 'flsm' },
      { key: 'needs', label: 'Hosts needed per subnet', type: 'text', default: '60, 28, 12, 2', max: 60, showIf: (i) => i.mode === 'vlsm' },
    ],
    build(inp) {
      const { ip, prefix } = parseCidr(inp.network || '192.168.1.0/24');
      const base = (ip & maskOf(prefix)) >>> 0;
      if (base !== ip) throw new Error(`${ipStr(ip)} is not the network address of /${prefix} (it should be ${ipStr(base)}).`);
      const avail = 32 - prefix;
      const frames = [];
      if (inp.mode === 'vlsm') {
        const needs = String(inp.needs || '').split(/[,\s]+/).filter(Boolean).map(Number);
        if (!needs.length || needs.some((n) => !Number.isInteger(n) || n < 1)) throw new Error('Enter host counts like 60, 28, 12, 2.');
        if (needs.length > 12) throw new Error('Use at most 12 subnets.');
        const order = needs.map((n, i) => ({ n, i })).sort((a, b) => b.n - a.n);
        frames.push(F(`VLSM: allocate the largest subnet first from ${ipStr(base)}/${prefix}.`, 'Variable Length Subnet Masking gives each subnet just enough addresses, which wastes far fewer addresses than equal subnets. Sorting largest-first keeps every block aligned.', [{ type: 'table', box: [10, 20, 980, 200], title: 'Requirements (sorted)', cols: ['Subnet', 'Hosts needed', 'Block size', 'Prefix'], rows: order.map(({ n, i }) => { let h = 2; while (2 ** h - 2 < n) h++; return [`S${i + 1}`, String(n), String(2 ** h), `/${32 - h}`]; }) }], { Network: `${ipStr(base)}/${prefix}`, 'Available addresses': 2 ** avail }, {}, 'Allocate the first block.'));
        let cur = base; const rows = []; const end = base + 2 ** avail;
        for (const { n, i } of order) {
          let h = 2; while (2 ** h - 2 < n) h++;
          const p = 32 - h;
          if (p < prefix || cur + 2 ** h > end) throw new Error(`Not enough address space: S${i + 1} (${n} hosts) does not fit in ${ipStr(base)}/${prefix}.`);
          rows.push(subnetRow(i, cur, p));
          frames.push(F(`S${i + 1} needs ${n} hosts → 2^${h} − 2 = ${2 ** h - 2} ≥ ${n} → /${p}: ${ipStr(cur)}/${p}.`, `The block of ${2 ** h} addresses starts at the next free address. ${2 ** h - 2 - n} addresses are spare in this subnet.`, [{ type: 'table', box: [10, 20, 980, 520], title: 'VLSM allocation', cols: COLS, rows: rows.slice(), hl: rows.length - 1 }], { Subnet: `S${i + 1}`, 'Hosts needed': n, Block: 2 ** h, Prefix: `/${p}` }, { 'Next free address': ipStr(cur + 2 ** h) }, 'Next subnet.'));
          cur += 2 ** h;
        }
        const used = cur - base;
        frames.push(F(`All ${needs.length} subnets allocated — ${used} of ${2 ** avail} addresses used.`, `${2 ** avail - used} addresses remain free for future subnets.`, [{ type: 'table', box: [10, 20, 980, 520], title: 'VLSM allocation', cols: COLS, rows }], { Used: used, Free: 2 ** avail - used }, {}, 'Done.'));
        return frames;
      }
      const count = Math.max(1, Number(inp.count) || 4);
      let borrow; let why;
      if (inp.by === 'hosts') {
        let h = 2; while (2 ** h - 2 < count) h++;
        borrow = avail - h;
        why = `Hosts per subnet = ${count}: need h host bits with 2^h − 2 ≥ ${count} → h = ${h} (${2 ** h - 2} hosts). Borrow ${avail} − ${h} = ${borrow} bits.`;
      } else {
        borrow = 0; while (2 ** borrow < count) borrow++;
        why = `${count} subnets: borrow b bits with 2^b ≥ ${count} → b = ${borrow} (${2 ** borrow} subnets).`;
      }
      if (borrow < 0 || prefix + borrow > 30) throw new Error(`/${prefix} cannot provide that — it would need /${prefix + Math.max(0, borrow)}. Choose a smaller requirement.`);
      const np = prefix + borrow; const block = 2 ** (32 - np); const nSub = 2 ** borrow;
      frames.push(F(`Borrow ${borrow} host bit${borrow === 1 ? '' : 's'} → new prefix /${np}.`, why, [{ type: 'bits', box: [20, 20, 960, 170], title: `${ipStr(base)}/${prefix} → /${np}`, labelW: 130, rows: [bitRow(`Mask /${np}`, maskOf(np), (b) => (b < prefix ? 'flag' : b < np ? 'new' : 'esc'))] }], { 'Original prefix': `/${prefix}`, 'Borrowed bits': borrow, 'New prefix': `/${np}` }, { 'New mask': ipStr(maskOf(np)) }, 'Work out the block size.'));
      frames.push(F(`Block size = 2^${32 - np} = ${block} addresses per subnet; ${nSub} subnets; ${Math.max(0, block - 2)} hosts each.`, 'Each subnet starts where the previous one ended (network addresses go up in steps of the block size).', [{ type: 'bits', box: [20, 20, 960, 170], title: 'Subnet bits (orange) choose the subnet; host bits (blue) choose the host', labelW: 130, rows: [bitRow(`Mask /${np}`, maskOf(np), (b) => (b < prefix ? 'flag' : b < np ? 'new' : 'esc'))] }], { Subnets: nSub, 'Block size': block, 'Hosts per subnet': Math.max(0, block - 2) }, {}, 'List the subnets.'));
      const rows = []; const show = Math.min(nSub, 16);
      for (let i = 0; i < show; i++) {
        rows.push(subnetRow(i, base + i * block, np));
        if (i < 6 || i === show - 1) frames.push(F(`Subnet ${i + 1}: ${ipStr(base + i * block)}/${np}.`, `Network = ${ipStr(base)} + ${i} × ${block}. Broadcast is the last address before the next subnet.`, [{ type: 'table', box: [10, 20, 980, 520], title: `Subnets of ${ipStr(base)}/${prefix}${nSub > show ? ` (first ${show} of ${nSub})` : ''}`, cols: COLS, rows: rows.slice(), hl: rows.length - 1 }], { Subnet: `${i + 1} / ${nSub}` }, {}, i < show - 1 ? 'Next subnet.' : 'Done.'));
      }
      return frames;
    },
  };

  // ════════════════════ IP PACKET STRUCTURE ════════════════════
  function ipChecksum(words) { let sum = 0; for (const w of words) { sum += w; sum = (sum & 0xffff) + (sum >>> 16); } return { sum, checksum: ~sum & 0xffff }; }
  root.CNUtil.ipChecksum = ipChecksum;
  S['cn-ip-packet'] = {
    inputs: [
      { key: 'src', label: 'Source IP', type: 'text', default: '192.168.1.10', max: 15 },
      { key: 'dst', label: 'Destination IP', type: 'text', default: '142.250.183.4', max: 15 },
      { key: 'ttl', label: 'TTL', type: 'number', default: 64, min: 1, max: 255 },
      { key: 'proto', label: 'Protocol', type: 'select', default: '6', options: [['6', '6 — TCP'], ['17', '17 — UDP'], ['1', '1 — ICMP']] },
      { key: 'len', label: 'Payload bytes', type: 'number', default: 100, min: 0, max: 65515 },
      { key: 'df', label: "Don't Fragment (DF)", type: 'checkbox', default: true },
    ],
    build(inp) {
      const src = parseIp(inp.src || '192.168.1.10', 'Source IP'); const dst = parseIp(inp.dst || '142.250.183.4', 'Destination IP');
      const ttl = Math.max(1, Math.min(255, Number(inp.ttl) || 64)); const proto = Number(inp.proto) || 6;
      const len = Math.max(0, Math.min(65515, Number(inp.len) || 0)); const total = 20 + len; const id = 0x1c46; const flags = inp.df ? 2 : 0;
      const words = [(4 << 12) | (5 << 8) | 0, total, id, (flags << 13) | 0, (ttl << 8) | proto, 0, src >>> 16, src & 0xffff, dst >>> 16, dst & 0xffff];
      const { sum, checksum } = ipChecksum(words);
      const hex = (v, n = 4) => '0x' + v.toString(16).toUpperCase().padStart(n, '0');
      const protoName = { 6: 'TCP', 17: 'UDP', 1: 'ICMP' }[proto];
      const defs = [
        ['Version', 4, '4', 'IP version 4.'], ['IHL', 4, '5', 'Header length in 32-bit words: 5 × 4 = 20 bytes (no options).'], ['DSCP / ECN', 8, '0', 'Type of service: priority (DSCP) and congestion notification (ECN).'], ['Total Length', 16, `${total}`, `Header + data = 20 + ${len} = ${total} bytes (max 65 535).`],
        ['Identification', 16, hex(id), 'Same value on every fragment of one datagram, so they can be reassembled.'], ['Flags', 3, inp.df ? '010 (DF)' : '000', inp.df ? "DF = 1: routers must not fragment this packet." : 'MF = 0 and DF = 0: may be fragmented; this is the last (only) piece.'], ['Fragment Offset', 13, '0', 'Position of this fragment in 8-byte units; 0 for an unfragmented packet.'],
        ['TTL', 8, `${ttl}`, 'Time to live: each router subtracts 1; at 0 the packet is dropped (prevents loops).'], ['Protocol', 8, `${proto} (${protoName})`, 'Which transport protocol is inside: 1 ICMP, 6 TCP, 17 UDP.'], ['Header Checksum', 16, hex(checksum), 'One\'s-complement checksum of the header only; recomputed at every hop because TTL changes.'],
        ['Source Address', 32, ipStr(src), 'Sender\'s IP address.'], ['Destination Address', 32, ipStr(dst), 'Final receiver\'s IP address — it does not change hop by hop.'],
      ];
      const rowsOf = (hlIdx, doneAll) => { const rows = [[0, 1, 2, 3], [4, 5, 6], [7, 8, 9], [10], [11]]; return rows.map((r) => r.map((k) => ({ name: defs[k][0], bits: defs[k][1], value: defs[k][2], hl: k === hlIdx, done: doneAll || k < hlIdx, alwaysValue: doneAll || k <= hlIdx, info: defs[k][3] }))); };
      const sc = (hl, all, extra = []) => [{ type: 'fields', box: [10, 10, 980, extra.length ? 330 : 520], title: 'IPv4 header (20 bytes)', width: 32, ruler: true, rows: rowsOf(hl, all) }].concat(extra);
      const frames = defs.map((d, k) => F(`${d[0]} = ${d[2]}`, d[3], sc(k, false), { Field: d[0], Bits: d[1], Value: d[2] }, {}, k < defs.length - 1 ? 'Next field.' : 'Compute the checksum.'));
      const checksumIdx = 9;
      frames.splice(checksumIdx, 0, F('Header checksum: add the ten 16-bit header words (checksum field = 0).', 'Carries out of the top bit are wrapped around and added back (one\'s-complement sum). The checksum is the bit-inverse of that sum.', sc(checksumIdx, false, [{ type: 'table', box: [10, 350, 980, 200], title: 'Checksum calculation', cols: ['Words (hex)', 'Sum', 'Checksum = ~sum'], rows: [[words.map((w) => w.toString(16).toUpperCase().padStart(4, '0')).join(' '), hex(sum), hex(checksum)]] }]), { 'One\'s-complement sum': hex(sum), Checksum: hex(checksum) }, { Words: words.map((w) => hex(w)).join(' ') }, 'Fill in the checksum field.'));
      frames.push(F(`Complete IPv4 header: ${protoName} packet, ${total} bytes, TTL ${ttl}.`, 'A router checks the checksum, decrements TTL, recomputes the checksum and forwards the packet using the destination address.', sc(-1, true), { 'Total length': total, Protocol: protoName, TTL: ttl, Checksum: hex(checksum) }, {}, 'Done.'));
      return frames;
    },
  };

  // ════════════════════ PACKET FORWARDING (LONGEST PREFIX MATCH) ════════════════════
  const RT = [
    ['192.168.10.0/24', 'directly connected', 'eth0'], ['192.168.10.128/25', '10.0.0.2', 'eth1'], ['10.0.0.0/8', '10.0.0.2', 'eth1'],
    ['172.16.0.0/16', '10.0.1.2', 'eth2'], ['172.16.5.0/24', '10.0.2.2', 'eth3'], ['0.0.0.0/0', '203.0.113.1 (default)', 'eth4'],
  ];
  S['cn-packet-forwarding'] = {
    inputs: [
      { key: 'dst', label: 'Destination IP', type: 'text', default: '172.16.5.20', max: 15, help: 'Try 192.168.10.200 (two matches), 10.9.9.9, 8.8.8.8 (default route).' },
      { key: 'ttl', label: 'Incoming TTL', type: 'number', default: 12, min: 1, max: 255 },
    ],
    build(inp) {
      const d = parseIp(inp.dst || '172.16.5.20', 'Destination IP'); const ttl = Math.max(1, Number(inp.ttl) || 12);
      const table = RT.map(([c, nh, ifc]) => { const { ip, prefix } = parseCidr(c); return { c, ip, prefix, nh, ifc, match: ((d & maskOf(prefix)) >>> 0) === ip }; });
      const nodes = [{ id: 'IN', label: 'Incoming', x: 0.02, y: 0.5, kind: 'net' }, { id: 'R', label: 'Router R1', x: 0.35, y: 0.5, kind: 'router', r: 34 }, ...['eth0', 'eth1', 'eth2', 'eth3', 'eth4'].map((e, i) => ({ id: e, label: e, sub: ['192.168.10.0/24', '10.0.0.2', '10.0.1.2', '10.0.2.2', 'ISP 203.0.113.1'][i], x: 0.92, y: 0.02 + i * 0.24, kind: i === 0 ? 'switch' : i === 4 ? 'cloud' : 'router' }))];
      const links = [{ a: 'IN', b: 'R' }, ...['eth0', 'eth1', 'eth2', 'eth3', 'eth4'].map((e) => ({ a: 'R', b: e, label: e }))];
      const rtRows = () => table.map((r) => [r.c, r.nh, r.ifc]);
      const sc = (nd, pk, hl, tone, lk = []) => [{ type: 'topo', box: [10, 10, 470, 540], nodes: nodes.map((n) => ({ ...n, ...(nd[n.id] || {}) })), links: links.map((l) => ({ ...l, hl: lk.includes(l.b) })), packets: pk }, { type: 'table', box: [495, 20, 495, 300], title: 'Routing table of R1', cols: ['Destination', 'Next hop', 'Interface'], rows: rtRows(), hl, rowTone: tone }];
      const frames = [F(`A packet for ${ipStr(d)} arrives at router R1 (TTL ${ttl}).`, 'The router forwards using only the destination IP address.', sc({ R: { hl: true } }, [{ from: 'IN', to: 'R', label: ipStr(d) }], null), { Destination: ipStr(d), TTL: ttl }, {}, 'Check TTL.')];
      if (ttl <= 1) {
        frames.push(F('TTL would reach 0 → the packet is discarded.', 'R1 sends an ICMP Time Exceeded (type 11) message back to the source. This stops packets looping forever.', sc({ R: { bad: true, badge: 'drop', badgeTone: 'red' } }, [{ from: 'R', to: 'IN', label: 'ICMP 11', tone: 'red' }], null), { Result: 'Dropped — TTL expired' }, {}, 'Done.'));
        return frames;
      }
      frames.push(F(`TTL ${ttl} → ${ttl - 1}.`, 'Every router decrements TTL and recomputes the header checksum.', sc({ R: { hl: true } }, [], null), { TTL: ttl - 1 }, {}, 'Compare with each routing entry.'));
      const tones = {};
      table.forEach((r, i) => {
        tones[i] = r.match ? 'green' : 'red';
        frames.push(F(`${ipStr(d)} AND /${r.prefix} = ${ipStr((d & maskOf(r.prefix)) >>> 0)} → ${r.match ? `matches ${r.c}` : `no match for ${r.c}`}.`, 'For each entry the router masks the destination with the entry\'s prefix length and compares it with the network address.', sc({ R: { hl: true } }, [], i, { ...tones }), { Entry: r.c, Match: r.match ? 'Yes' : 'No' }, { Mask: ipStr(maskOf(r.prefix)) }, 'Next entry.'));
      });
      const best = table.map((r, i) => ({ ...r, i })).filter((r) => r.match).sort((a, b) => b.prefix - a.prefix)[0];
      const matches = table.filter((r) => r.match);
      frames.push(F(`Longest prefix match: ${best.c} (/${best.prefix}) wins${matches.length > 1 ? ` over ${matches.filter((r) => r !== table[best.i]).map((r) => '/' + r.prefix).join(', ')}` : ''}.`, 'When several entries match, the most specific route (longest prefix) is used. The default route 0.0.0.0/0 matches everything, so it is used only when nothing else matches.', sc({ R: { hl: true } }, [], best.i, Object.fromEntries(table.map((r, i) => [i, i === best.i ? 'green' : r.match ? 'amber' : 'grey']))), { 'Matching entries': matches.length, Chosen: best.c }, {}, 'Forward the packet.'));
      frames.push(F(`Forward out ${best.ifc} ${best.nh === 'directly connected' ? `directly to the host ${ipStr(d)} (ARP for its MAC)` : `to next hop ${best.nh}`}.`, best.nh === 'directly connected' ? 'The destination is on a network attached to this router, so it is delivered directly.' : 'The next hop is the neighbouring router that is closer to the destination.', sc({ [best.ifc]: { hl: true } }, [{ from: 'R', to: best.ifc, label: ipStr(d) }], best.i, { [best.i]: 'green' }, [best.ifc]), { 'Out interface': best.ifc, 'Next hop': best.nh, TTL: ttl - 1 }, {}, 'Done.'));
      return frames;
    },
  };

  // ════════════════════ ROUTING TABLE (DISTANCE VECTOR) ════════════════════
  const DV_NODES = ['A', 'B', 'C', 'D', 'E'];
  const DV_POS = { A: [0.05, 0.5], B: [0.35, 0.05], C: [0.35, 0.95], D: [0.7, 0.5], E: [0.97, 0.5] };
  const DV_EDGES = [['A', 'B', 1], ['A', 'C', 4], ['B', 'C', 2], ['B', 'D', 7], ['C', 'D', 1], ['D', 'E', 2]];
  function dvRun(edges) {
    const cost = (x, y) => { const e = edges.find(([a, b]) => (a === x && b === y) || (a === y && b === x)); return e ? e[2] : Infinity; };
    const nbrs = (x) => DV_NODES.filter((y) => y !== x && cost(x, y) < Infinity);
    let T = {}; DV_NODES.forEach((x) => { T[x] = {}; DV_NODES.forEach((y) => { T[x][y] = x === y ? [0, '—'] : cost(x, y) < Infinity ? [cost(x, y), y] : [Infinity, '—']; }); });
    const rounds = [JSON.parse(JSON.stringify(T, (k, v) => (v === Infinity ? 'inf' : v)))];
    for (let r = 0; r < 10; r++) {
      const N = {}; let changed = false;
      DV_NODES.forEach((x) => {
        N[x] = {};
        DV_NODES.forEach((y) => {
          if (x === y) { N[x][y] = [0, '—']; return; }
          let best = [Infinity, '—'];
          nbrs(x).forEach((v) => { const c = cost(x, v) + T[v][y][0]; if (c < best[0]) best = [c, v]; });
          N[x][y] = best;
          if (best[0] !== T[x][y][0]) changed = true;
        });
      });
      T = N;
      rounds.push(JSON.parse(JSON.stringify(T, (k, v) => (v === Infinity ? 'inf' : v))));
      if (!changed) break;
    }
    return { rounds, nbrs, cost };
  }
  root.CNUtil.dvRun = dvRun;
  S['cn-routing-table'] = {
    inputs: [
      { key: 'router', label: 'Show routing table of', type: 'select', default: 'A', options: DV_NODES.map((n) => [n, `Router ${n}`]) },
      { key: 'change', label: 'Topology', type: 'select', default: 'none', options: [['none', 'Normal link costs'], ['bc', 'B–C link cost raised to 9']] },
    ],
    build(inp) {
      const me = DV_NODES.includes(inp.router) ? inp.router : 'A';
      const edges = DV_EDGES.map((e) => (inp.change === 'bc' && e[0] === 'B' && e[1] === 'C' ? ['B', 'C', 9] : e));
      const { rounds, nbrs } = dvRun(edges);
      const nodes = DV_NODES.map((n) => ({ id: n, label: `Router ${n}`, x: DV_POS[n][0], y: DV_POS[n][1], kind: 'router' }));
      const links = edges.map(([a, b, c]) => ({ a, b, label: String(c) }));
      const tbl = (r, prev) => DV_NODES.map((y) => { const [c, v] = r[me][y]; return [y, c === 'inf' ? '∞' : String(c), v]; });
      const tones = (r, prev) => Object.fromEntries(DV_NODES.map((y, i) => [i, prev && JSON.stringify(prev[me][y]) !== JSON.stringify(r[me][y]) ? 'amber' : null]).filter(([, t]) => t));
      const matrix = (r) => ({ type: 'table', box: [505, 300, 485, 250], title: 'All distance vectors (advanced)', cols: ['From', ...DV_NODES], rows: DV_NODES.map((x) => [x, ...DV_NODES.map((y) => (r[x][y][0] === 'inf' ? '∞' : String(r[x][y][0])))]) });
      const frames = [];
      rounds.forEach((r, k) => {
        const prev = k ? rounds[k - 1] : null;
        const changed = prev ? DV_NODES.filter((y) => JSON.stringify(prev[me][y]) !== JSON.stringify(r[me][y])) : [];
        const scene = [{ type: 'topo', box: [10, 10, 480, 540], title: k ? `Round ${k}: routers exchange distance vectors` : 'Round 0: routers know only their neighbours', nodes: nodes.map((n) => ({ ...n, hl: n.id === me })), links, packets: k ? nbrs(me).map((v) => ({ from: v, to: me, label: `DV of ${v}` })) : [] }, { type: 'table', box: [505, 20, 485, 270], title: `Routing table of ${me}`, cols: ['Destination', 'Cost', 'Next hop'], rows: tbl(r), rowTone: tones(r, prev) }, matrix(r)];
        const last = k === rounds.length - 1;
        frames.push(F(k === 0 ? `Initially ${me} knows only its directly connected neighbours.` : last && k > 0 && !changed.length ? `Round ${k}: no table changes — the network has converged.` : `Round ${k}: ${me} updates ${changed.length ? changed.join(', ') : 'nothing'} using its neighbours' vectors.`,
          k === 0 ? 'Distance-vector routers start with the cost of each attached link; other destinations are ∞.' : 'Bellman-Ford: D(me, y) = min over neighbours v of [ cost(me, v) + D(v, y) ]. Changed entries are highlighted.',
          scene, { Round: k, Router: me, 'Entries changed': changed.length }, { 'Neighbours': nbrs(me).join(', ') }, last ? 'Converged — tables are stable.' : 'Next exchange round.'));
      });
      return frames;
    },
  };

  // ════════════════════ ROUTER / NEXT-HOP ════════════════════
  const NH_R = ['R1', 'R2', 'R3', 'R4'];
  const NH_E = [['R1', 'R2', 1], ['R2', 'R3', 1], ['R1', 'R4', 2], ['R4', 'R3', 2], ['R2', 'R4', 3]];
  const NH_NET = { N1: ['10.1.0.0/16', 'R1'], N2: ['10.2.0.0/16', 'R2'], N3: ['10.3.0.0/16', 'R3'], N4: ['10.4.0.0/16', 'R4'] };
  function dijkstra(nodes, edges, src) {
    const dist = {}; const prev = {}; const done = new Set(); nodes.forEach((n) => { dist[n] = Infinity; prev[n] = null; }); dist[src] = 0;
    const steps = [];
    while (done.size < nodes.length) {
      const u = nodes.filter((n) => !done.has(n)).sort((a, b) => dist[a] - dist[b] || a.localeCompare(b))[0];
      if (dist[u] === Infinity) break;
      done.add(u); const relaxed = [];
      edges.filter(([a, b]) => a === u || b === u).forEach(([a, b, w]) => { const v = a === u ? b : a; if (!done.has(v) && dist[u] + w < dist[v]) { dist[v] = dist[u] + w; prev[v] = u; relaxed.push(v); } });
      steps.push({ u, relaxed, dist: { ...dist }, prev: { ...prev }, done: new Set(done) });
    }
    return { dist, prev, steps };
  }
  root.CNUtil.dijkstra = dijkstra;
  const pathTo = (prev, src, dst) => { const p = []; let x = dst; while (x) { p.unshift(x); if (x === src) break; x = prev[x]; } return p[0] === src ? p : []; };
  S['cn-next-hop'] = {
    inputs: [
      { key: 'from', label: 'Source network', type: 'select', default: 'N1', options: Object.keys(NH_NET).map((k) => [k, `${k} ${NH_NET[k][0]}`]) },
      { key: 'to', label: 'Destination network', type: 'select', default: 'N3', options: Object.keys(NH_NET).map((k) => [k, `${k} ${NH_NET[k][0]}`]) },
      { key: 'ttl', label: 'Initial TTL', type: 'number', default: 64, min: 1, max: 255 },
    ],
    build(inp) {
      const from = NH_NET[inp.from] ? inp.from : 'N1'; const to = NH_NET[inp.to] ? inp.to : 'N3';
      if (from === to) throw new Error('Choose two different networks.');
      const ttl0 = Math.max(1, Number(inp.ttl) || 64);
      const tables = {}; NH_R.forEach((r) => { const { prev } = dijkstra(NH_R, NH_E, r); tables[r] = Object.keys(NH_NET).map((n) => { const gw = NH_NET[n][1]; if (gw === r) return [NH_NET[n][0], 'direct', '—']; const p = pathTo(prev, r, gw); return [NH_NET[n][0], p[1], String(dijkstra(NH_R, NH_E, r).dist[gw])]; }); });
      const srcHost = '10' + '.' + from.slice(1) + '.0.5'; const dstHost = '10.' + to.slice(1) + '.0.9';
      const nodes = [...NH_R.map((r, i) => ({ id: r, label: r, x: [0.22, 0.5, 0.78, 0.5][i], y: [0.5, 0.05, 0.5, 0.95][i], kind: 'router' })), { id: 'HS', label: `Host ${srcHost}`, x: 0.0, y: from === 'N1' ? 0.5 : from === 'N2' ? 0.02 : from === 'N3' ? 0.5 : 0.98, kind: 'pc' }, { id: 'HD', label: `Host ${dstHost}`, x: 1, y: to === 'N3' ? 0.5 : to === 'N2' ? 0.02 : to === 'N1' ? 0.5 : 0.98, kind: 'server' }];
      if (from === 'N3') nodes.find((n) => n.id === 'HS').x = 1; if (to === 'N1') nodes.find((n) => n.id === 'HD').x = 0;
      const links = [...NH_E.map(([a, b, c]) => ({ a, b, label: `cost ${c}` })), { a: 'HS', b: NH_NET[from][1] }, { a: 'HD', b: NH_NET[to][1] }];
      const sc = (router, pk, hlRow, badge) => [{ type: 'topo', box: [10, 10, 560, 540], nodes: nodes.map((n) => ({ ...n, hl: n.id === router, ...(badge && badge[n.id] ? badge[n.id] : {}) })), links: links.map((l) => ({ ...l, hl: pk && pk.some((p) => (p.from === l.a && p.to === l.b) || (p.from === l.b && p.to === l.a)) })), packets: pk || [] }].concat(router && tables[router] ? [{ type: 'table', box: [590, 20, 400, 250], title: `Routing table of ${router}`, cols: ['Destination', 'Next hop', 'Cost'], rows: tables[router], hl: hlRow }] : []);
      const frames = [F(`Host ${srcHost} sends a packet to ${dstHost} (TTL ${ttl0}).`, `The host's destination is not on its own network, so it sends the packet to its default gateway ${NH_NET[from][1]}.`, sc(null, [{ from: 'HS', to: NH_NET[from][1], label: `TTL ${ttl0}` }]), { Source: srcHost, Destination: dstHost, TTL: ttl0 }, {}, `${NH_NET[from][1]} looks up the destination.`)];
      let r = NH_NET[from][1]; let ttl = ttl0; const destRow = Object.keys(NH_NET).indexOf(to);
      for (let hop = 0; hop < 8; hop++) {
        const [, nh] = tables[r][destRow];
        ttl -= 1;
        if (ttl <= 0) {
          frames.push(F(`${r}: TTL reaches 0 → packet dropped.`, `${r} discards it and sends ICMP Time Exceeded (type 11) back to ${srcHost}. traceroute uses exactly this to discover each hop.`, sc(r, [{ from: r, to: 'HS', label: 'ICMP 11', tone: 'red' }], destRow, { [r]: { bad: true, badge: 'TTL 0', badgeTone: 'red' } }), { Router: r, TTL: 0, Result: 'Dropped' }, {}, 'Done.'));
          return frames;
        }
        if (nh === 'direct') {
          frames.push(F(`${r}: ${NH_NET[to][0]} is directly connected → deliver to ${dstHost}.`, 'The last router ARPs for the host\'s MAC and delivers the packet on the local network.', sc(r, [{ from: r, to: 'HD', label: `TTL ${ttl}` }], destRow), { Router: r, TTL: ttl, Result: 'Delivered' }, {}, 'Done.'));
          return frames;
        }
        frames.push(F(`${r}: destination ${NH_NET[to][0]} → next hop ${nh}. TTL ${ttl + 1} → ${ttl}.`, 'Each router knows only the next hop, not the whole path. Routing tables were built by the routing protocol (lowest total cost).', sc(r, [{ from: r, to: nh, label: `TTL ${ttl}` }], destRow), { Router: r, 'Next hop': nh, TTL: ttl }, { 'Cost to destination': tables[r][destRow][2] }, `${nh} repeats the lookup.`));
        r = nh;
      }
      return frames;
    },
  };

  // ════════════════════ NETWORK PATH (DIJKSTRA) ════════════════════
  const PRESETS = {
    campus: { nodes: ['A', 'B', 'C', 'D', 'E', 'F'], pos: { A: [0, 0.5], B: [0.3, 0.05], C: [0.3, 0.95], D: [0.65, 0.05], E: [0.65, 0.95], F: [1, 0.5] }, edges: [['A', 'B', 4], ['A', 'C', 2], ['B', 'C', 1], ['B', 'D', 5], ['C', 'E', 10], ['C', 'D', 8], ['D', 'E', 2], ['D', 'F', 6], ['E', 'F', 3]] },
    wan: { nodes: ['A', 'B', 'C', 'D', 'E', 'F', 'G'], pos: { A: [0, 0.3], B: [0.25, 0], C: [0.25, 0.7], D: [0.5, 0.35], E: [0.72, 0], F: [0.72, 0.8], G: [1, 0.4] }, edges: [['A', 'B', 2], ['A', 'C', 6], ['B', 'D', 3], ['C', 'D', 1], ['B', 'E', 9], ['D', 'E', 4], ['D', 'F', 5], ['C', 'F', 7], ['E', 'G', 2], ['F', 'G', 4]] },
  };
  S['cn-network-path'] = {
    inputs: [
      { key: 'preset', label: 'Network', type: 'select', default: 'campus', options: [['campus', '6-router campus network'], ['wan', '7-router WAN']] },
      { key: 'src', label: 'Source router', type: 'text', default: 'A', max: 1 },
      { key: 'dst', label: 'Destination router', type: 'text', default: 'F', max: 1 },
    ],
    build(inp) {
      const P = PRESETS[inp.preset] || PRESETS.campus;
      const src = String(inp.src || 'A').toUpperCase(); const dst = String(inp.dst || 'F').toUpperCase();
      if (!P.nodes.includes(src) || !P.nodes.includes(dst) || src === dst) throw new Error(`Choose two different routers from ${P.nodes.join(', ')}.`);
      const { steps, dist, prev } = dijkstra(P.nodes, P.edges, src);
      const nodes = P.nodes.map((n) => ({ id: n, label: n, x: P.pos[n][0], y: P.pos[n][1], kind: 'router' }));
      const tbl = (st, rel) => P.nodes.map((n) => [n, st.dist[n] === Infinity ? '∞' : String(st.dist[n]), st.prev[n] || '—', st.done.has(n) ? '✓' : '']);
      const sc = (st, u, rel, path) => [{ type: 'topo', box: [10, 10, 560, 540], nodes: nodes.map((n) => ({ ...n, hl: n.id === u || (path && path.includes(n.id)), badge: st && st.dist[n.id] !== Infinity ? `d=${st.dist[n.id]}` : undefined, badgeTone: 'violet', dim: false })), links: P.edges.map(([a, b, w]) => ({ a, b, label: String(w), hl: path ? path.some((x, i) => i && ((path[i - 1] === a && x === b) || (path[i - 1] === b && x === a))) : (u && (a === u || b === u) && rel && (rel.includes(a) || rel.includes(b))) })) }, { type: 'table', box: [590, 20, 400, 330], title: "Dijkstra's table", cols: ['Node', 'Distance', 'Previous', 'Done'], rows: st ? tbl(st) : P.nodes.map((n) => [n, n === src ? '0' : '∞', '—', '']), rowTone: st ? Object.fromEntries(P.nodes.map((n, i) => [i, n === u ? 'green' : rel && rel.includes(n) ? 'amber' : null]).filter(([, t]) => t)) : {} }];
      const frames = [F(`Find the lowest-cost path from ${src} to ${dst}.`, "Link-state routing (e.g. OSPF) gives every router the whole map; each runs Dijkstra's algorithm. Start: distance 0 to itself, ∞ to all others.", sc(null, src), { Source: src, Destination: dst }, {}, 'Pick the closest unvisited router.')];
      steps.forEach((st, k) => frames.push(F(`Visit ${st.u} (distance ${st.dist[st.u]})${st.relaxed.length ? ` → update ${st.relaxed.map((v) => `${v}=${st.dist[v]}`).join(', ')}` : ' → no shorter routes found'}.`, 'Dijkstra always finalises the unvisited node with the smallest distance, then tries to shorten the distance to each of its neighbours (relaxation).', sc(st, st.u, st.relaxed), { Step: `${k + 1} / ${steps.length}`, Visiting: st.u }, { Relaxed: st.relaxed.join(', ') || 'none' }, 'Next closest router.')));
      const path = pathTo(prev, src, dst);
      const last = steps[steps.length - 1];
      frames.push(F(`Shortest path ${path.join(' → ')} with cost ${dist[dst]}.`, 'Follow the "previous" column backwards from the destination to read the path.', sc(last, null, null, path), { Path: path.join(' → '), Cost: dist[dst] }, {}, 'Send the packet along the path.'));
      for (let i = 1; i < path.length; i++) {
        const sc2 = sc(last, null, null, path); sc2[0].packets = [{ from: path[i - 1], to: path[i], label: 'packet' }];
        frames.push(F(`Packet: ${path[i - 1]} → ${path[i]}.`, i === path.length - 1 ? `Delivered at ${dst}.` : 'Each router forwards along its shortest-path tree.', sc2, { Hop: `${i} / ${path.length - 1}` }, {}, i < path.length - 1 ? 'Next hop.' : 'Done.'));
      }
      return frames;
    },
  };

  // ════════════════════ IP FRAGMENTATION ════════════════════
  function fragment(total, mtu, ihl = 20) {
    const data = total - ihl; const per = Math.floor((mtu - ihl) / 8) * 8; const frags = [];
    for (let off = 0; off < data; off += per) { const len = Math.min(per, data - off); frags.push({ off: off / 8, bytes: off, data: len, total: len + ihl, mf: off + len < data ? 1 : 0 }); }
    return { per, frags };
  }
  root.CNUtil.fragment = fragment;
  S['cn-fragmentation'] = {
    inputs: [
      { key: 'total', label: 'Datagram total length (bytes, incl. 20-byte header)', type: 'number', default: 4000, min: 21, max: 65535 },
      { key: 'mtu', label: 'Next link MTU (bytes)', type: 'number', default: 1500, min: 68, max: 9000 },
      { key: 'df', label: "Don't Fragment (DF) set", type: 'checkbox', default: false },
      { key: 'shuffle', label: 'Fragments arrive out of order', type: 'checkbox', default: true },
    ],
    build(inp) {
      const total = Math.max(21, Math.min(65535, Number(inp.total) || 4000)); const mtu = Math.max(68, Math.min(9000, Number(inp.mtu) || 1500));
      const frames = [];
      const nodes = [{ id: 'S', label: 'Sender', x: 0, y: 0.5, kind: 'pc' }, { id: 'R', label: 'Router', sub: `next MTU ${mtu}`, x: 0.4, y: 0.5, kind: 'router' }, { id: 'D', label: 'Receiver', x: 1, y: 0.5, kind: 'server' }];
      const links = [{ a: 'S', b: 'R', label: 'MTU 9000' }, { a: 'R', b: 'D', label: `MTU ${mtu}` }];
      frames.push(F(`A ${total}-byte datagram (ID 0x1C46) reaches a link with MTU ${mtu}.`, 'Each link has a Maximum Transmission Unit. A packet larger than the MTU must be split (fragmented) or dropped.', [{ type: 'topo', box: [10, 10, 980, 250], nodes, links, packets: [{ from: 'S', to: 'R', label: `${total} B` }] }], { 'Total length': total, MTU: mtu, DF: inp.df ? 1 : 0 }, {}, total <= mtu ? 'It fits.' : 'Fragment it.'));
      if (total <= mtu) { frames.push(F('The datagram fits within the MTU — no fragmentation.', 'It is forwarded unchanged.', [{ type: 'topo', box: [10, 10, 980, 250], nodes, links, packets: [{ from: 'R', to: 'D', label: `${total} B` }] }], { Result: 'Forwarded whole' }, {}, 'Done.')); return frames; }
      if (inp.df) { frames.push(F('DF = 1 and the packet is too big → dropped.', `The router sends ICMP Destination Unreachable, code 4 "Fragmentation needed" with the MTU (${mtu}). Path MTU Discovery uses this to find the right packet size.`, [{ type: 'topo', box: [10, 10, 980, 250], nodes: nodes.map((n) => (n.id === 'R' ? { ...n, bad: true, badge: 'drop', badgeTone: 'red' } : n)), links, packets: [{ from: 'R', to: 'S', label: 'ICMP 3/4', tone: 'red' }] }], { Result: 'Dropped', ICMP: 'Type 3 Code 4' }, {}, 'Done.')); return frames; }
      const { per, frags } = fragment(total, mtu);
      const cols = ['Fragment', 'Total length', 'Data bytes', 'Offset (×8)', 'Byte range', 'MF'];
      const rowOf = (f, i) => [`#${i + 1}`, String(f.total), String(f.data), String(f.off), `${f.bytes}–${f.bytes + f.data - 1}`, String(f.mf)];
      frames.push(F(`Each fragment carries at most ⌊(${mtu} − 20) / 8⌋ × 8 = ${per} data bytes.`, 'Fragment offsets are counted in 8-byte units, so every fragment except the last must carry a multiple of 8 data bytes. Each fragment gets its own 20-byte header.', [{ type: 'callout', box: [20, 20, 960, 140], title: 'Data per fragment', lines: [`Data to send = ${total} − 20 = ${total - 20} bytes`, `Max data per fragment = ${per} bytes → ${frags.length} fragments`], mono: true }], { 'Data bytes': total - 20, 'Per fragment': per, Fragments: frags.length }, {}, 'Create the fragments.'));
      const rows = [];
      frags.forEach((f, i) => { rows.push(rowOf(f, i)); frames.push(F(`Fragment ${i + 1}: offset ${f.off} (byte ${f.bytes}), ${f.data} data bytes, MF = ${f.mf}.`, f.mf ? 'MF = 1 (More Fragments) tells the receiver more pieces follow.' : 'MF = 0 marks the last fragment; offset + length gives the original size.', [{ type: 'table', box: [10, 20, 980, 340], title: 'Fragments (all share ID 0x1C46)', cols, rows: rows.slice(), hl: i }, { type: 'topo', box: [10, 380, 980, 170], nodes, links, packets: [{ from: 'R', to: 'D', label: `frag ${i + 1}` }] }], { Fragment: `${i + 1} / ${frags.length}`, Offset: f.off, MF: f.mf, Length: f.total }, { 'Offset × 8': f.bytes }, 'Next fragment.')); });
      const arrival = inp.shuffle && frags.length > 1 ? frags.map((f, i) => i).sort((a, b) => ((a * 7 + 3) % frags.length) - ((b * 7 + 3) % frags.length)) : frags.map((f, i) => i);
      frames.push(F(`Fragments arrive in the order ${arrival.map((i) => `#${i + 1}`).join(', ')}.`, 'Fragments can take different paths; the receiver (not routers) reassembles them using ID, offset and MF.', [{ type: 'table', box: [10, 20, 980, 340], title: 'Arrival order', cols, rows: arrival.map((i) => rowOf(frags[i], i)) }], { 'Arrival order': arrival.map((i) => i + 1).join(', ') }, {}, 'Reassemble.'));
      frames.push(F(`Reassembled by offset: ${total - 20} data bytes + 20-byte header = ${total} bytes.`, 'Sorting by offset puts the data back in place; the fragment with MF = 0 tells the receiver the total length. If any fragment is lost, the whole datagram is discarded after a timeout.', [{ type: 'table', box: [10, 20, 980, 340], title: 'Sorted by offset', cols, rows: frags.map(rowOf), rowTone: Object.fromEntries(frags.map((f, i) => [i, 'green'])) }], { Reassembled: `${total} bytes`, Check: 'OK' }, {}, 'Done.'));
      return frames;
    },
  };

  // ════════════════════ ICMP PING ════════════════════
  S['cn-icmp-ping'] = {
    inputs: [
      { key: 'count', label: 'Echo requests', type: 'number', default: 3, min: 1, max: 5 },
      { key: 'scenario', label: 'Scenario', type: 'select', default: 'ok', options: [['ok', 'Destination reachable'], ['loss', 'One reply is lost'], ['down', 'Destination host is down'], ['ttl', 'TTL too small (time exceeded)']] },
      { key: 'ttl', label: 'TTL', type: 'number', default: 64, min: 1, max: 255 },
    ],
    build(inp) {
      const n = Math.max(1, Math.min(5, Number(inp.count) || 3)); const sc0 = inp.scenario || 'ok';
      const ttl = sc0 === 'ttl' ? Math.min(2, Math.max(1, Number(inp.ttl) || 2)) : Math.max(1, Number(inp.ttl) || 64);
      const actors = [{ name: 'Host A', sub: '192.168.1.10' }, { name: 'Router 1', sub: '192.168.1.1' }, { name: 'Router 2', sub: '10.0.0.2' }, { name: 'Server', sub: '203.0.113.5' }];
      const msgs = []; const frames = []; const delays = [1, 8, 3];
      let recv = 0; let sent = 0; const rtts = [];
      const push = (title, why, next) => { const shown = msgs.slice(-12); frames.push(F(title, why, [{ type: 'seq', box: [10, 6, 980, 548], actors, msgs: shown, cur: shown.length - 1, minRows: 9 }], { 'Echo requests sent': sent, 'Replies received': recv, TTL: ttl }, { 'RTT samples': rtts.length ? rtts.map((r) => r + ' ms').join(', ') : '—' }, next)); };
      frames.push(F(`ping 203.0.113.5 — send ${n} ICMP Echo Requests.`, 'Ping uses ICMP Echo Request (type 8) and Echo Reply (type 0) to test reachability and measure round-trip time.', [{ type: 'seq', box: [10, 6, 980, 548], actors, msgs: [], cur: -1, minRows: 9 }], { 'Echo requests sent': 0, 'Replies received': 0, TTL: ttl }, {}, 'Send the first request.'));
      for (let s = 1; s <= n; s++) {
        let t = ttl; let dropped = false; sent++;
        for (let h = 0; h < 3; h++) {
          if (h > 0) { t -= 1; if (t <= 0) {
            msgs.push({ from: h, to: 0, label: 'Time Exceeded (type 11)', tone: 'red', detail: `from ${actors[h].sub}` });
            push(`Router ${h} drops request ${s}: TTL expired.`, `Router ${h} sends ICMP Time Exceeded (type 11) back to Host A. Increase the TTL to reach the server (traceroute raises TTL by one each time).`, 'Next request.');
            dropped = true; break;
          } }
          if (h === 2 && sc0 === 'down') {
            msgs.push({ from: h, to: h + 1, label: `Echo Request seq=${s}`, lost: true, detail: 'no ARP reply from server' });
            push(`Router 2 cannot reach the server (host is down).`, 'Router 2 gets no ARP reply for 203.0.113.5.', 'Router 2 reports the failure.');
            msgs.push({ from: 2, to: 0, label: 'Dest. Unreachable (type 3)', tone: 'red', detail: 'code 1 host unreachable' });
            push('Router 2 sends ICMP Destination Unreachable (type 3, code 1).', 'ICMP carries error reports back to the source — the application sees "Destination host unreachable".', 'Next request.');
            dropped = true; break;
          }
          msgs.push({ from: h, to: h + 1, label: `Echo Request seq=${s}`, detail: `type 8, id 0x1A2B, TTL ${t}`, token: `req ${s}` });
          push(`Echo Request seq=${s}: ${actors[h].name} → ${actors[h + 1].name} (TTL ${t}).`, h ? 'Each router decrements TTL and forwards the packet toward the destination.' : 'Host A builds an ICMP Echo Request inside an IP packet (protocol 1).', 'Forward.');
        }
        if (dropped) continue;
        const lostReply = sc0 === 'loss' && s === Math.min(2, n);
        msgs.push({ note: 'Echo Reply (type 0)', at: 3, tone: 'green' });
        for (let h = 3; h > 0; h--) {
          if (lostReply && h === 2) { msgs.push({ from: h, to: h - 1, label: `Echo Reply seq=${s}`, lost: true }); push(`Reply seq=${s} is lost.`, 'After a timeout (about 1 s) ping reports "Request timed out" for this sequence number.', 'Next request.'); break; }
          msgs.push({ from: h, to: h - 1, label: `Echo Reply seq=${s}`, detail: 'type 0, same id and seq', token: `rep ${s}` });
          push(`Echo Reply seq=${s}: ${actors[h].name} → ${actors[h - 1].name}.`, h === 3 ? 'The server copies the identifier, sequence number and data into an Echo Reply.' : 'The reply is routed back to Host A.', 'Forward.');
        }
        if (!lostReply) { recv++; const rtt = 2 * delays.reduce((a, b) => a + b, 0) + s; rtts.push(rtt); msgs.push({ note: `Reply ${s}: RTT ${rtt} ms`, at: 0, tone: 'green' }); push(`Reply from 203.0.113.5: seq=${s} time=${rtt} ms.`, 'RTT = time between sending the request and receiving the matching reply.', s < n ? 'Next request.' : 'Show statistics.'); }
      }
      const loss = Math.round(100 * (1 - recv / n));
      const tbl = [['Packets sent', String(n)], ['Received', String(recv)], ['Loss', `${loss}%`], ['RTT min/avg/max', rtts.length ? `${Math.min(...rtts)} / ${(rtts.reduce((a, b) => a + b, 0) / rtts.length).toFixed(1)} / ${Math.max(...rtts)} ms` : '—']];
      frames.push(F(`Ping statistics: ${n} sent, ${recv} received, ${loss}% loss.`, sc0 === 'ok' ? 'All replies came back — the host is reachable.' : sc0 === 'loss' ? 'One reply was lost; packet loss shows congestion or a faulty link.' : sc0 === 'down' ? 'ICMP errors show where delivery failed.' : 'Time Exceeded messages identify the router where TTL ran out.', [{ type: 'table', box: [200, 60, 600, 260], title: 'ping summary', cols: ['Statistic', 'Value'], rows: tbl, rowH: 44 }], { Sent: n, Received: recv, Loss: `${loss}%` }, {}, 'Done.'));
      return frames;
    },
  };
})(typeof window !== 'undefined' ? window : globalThis);
