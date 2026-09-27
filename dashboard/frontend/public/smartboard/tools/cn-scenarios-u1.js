'use strict';
/* Computer Networks simulations — Unit 1: Introduction to Computer Networks */
(function (root) {
  const S = (root.CNScenarios = root.CNScenarios || {});
  const F = (title, why, scene, state = {}, adv = {}, next = '') => ({ title, why, scene, state, adv, next });

  // ════════════════════ OSI MODEL VISUALIZER ════════════════════
  const OSI = [
    { n: 7, name: 'Application', pdu: 'Data', hdr: 'AH', tone: 'blue', proto: 'HTTP, FTP, SMTP, DNS', job: 'Gives network services to the user application (web, mail, file transfer).' },
    { n: 6, name: 'Presentation', pdu: 'Data', hdr: 'PH', tone: 'violet', proto: 'TLS, JPEG, ASCII, MPEG', job: 'Translates, encrypts and compresses data into a common format.' },
    { n: 5, name: 'Session', pdu: 'Data', hdr: 'SH', tone: 'teal', proto: 'NetBIOS, RPC, PPTP', job: 'Opens, manages and closes dialogues; adds checkpoints for recovery.' },
    { n: 4, name: 'Transport', pdu: 'Segment', hdr: 'TH', tone: 'amber', proto: 'TCP, UDP', job: 'End-to-end delivery between processes using port numbers; segmentation, reliability, flow control.' },
    { n: 3, name: 'Network', pdu: 'Packet', hdr: 'NH', tone: 'green', proto: 'IP, ICMP, OSPF', job: 'Logical (IP) addressing and routing across networks.' },
    { n: 2, name: 'Data Link', pdu: 'Frame', hdr: 'DH', tone: 'red', proto: 'Ethernet, PPP, 802.11', job: 'Physical (MAC) addressing, framing and error detection on one link.' },
    { n: 1, name: 'Physical', pdu: 'Bits', hdr: '', tone: 'grey', proto: 'Cables, NIC signals, hubs', job: 'Transmits raw bits as electrical, optical or radio signals.' },
  ];
  const osiAddr = { 4: 'Src port 49152 → Dst port 80', 3: 'Src IP 192.168.1.10 → Dst IP 203.0.113.5', 2: 'Src MAC 00:1A:2B:3C:4D:5E → Dst MAC 00:1F:3A:77:8C:21' };
  function osiLayers(active, done) {
    return OSI.map((l) => ({ name: `${l.n}. ${l.name}`, sub: l.pdu, subAdv: l.proto, tone: l.tone, info: `${l.job}\nPDU: ${l.pdu}\nExamples: ${l.proto}` }));
  }
  function osiPdu(level, message) {
    // Headers present after encapsulation down to `level` (7 → only AH … 2 → full frame)
    if (level === 1) return { caption: 'Physical: the frame becomes a bit stream', parts: [{ t: '0110100101110010…', tone: 'grey', w: 6, hl: true, info: 'Bits are sent as signals on the medium.' }] };
    const parts = [];
    OSI.slice(0, 6).filter((l) => l.n >= level).forEach((l) => { if (l.n <= 7) parts.unshift({ t: l.hdr, tone: l.tone, w: 1, hl: l.n === level, info: `${l.name} header` }); });
    parts.push({ t: message, tone: 'blue', w: 3, info: 'The user data' });
    if (level <= 2) parts.push({ t: 'DT', tone: 'red', w: 1, hl: level === 2, info: 'Data-link trailer (FCS for error detection)' });
    const top = OSI.find((l) => l.n === level);
    return { caption: `${top.pdu} at layer ${level}`, parts };
  }
  S['cn-osi-model'] = {
    inputs: [
      { key: 'message', label: 'Message', type: 'text', default: 'HELLO', max: 16 },
      { key: 'journey', label: 'Show', type: 'select', default: 'full', options: [['full', 'Full journey (send + receive)'], ['send', 'Sender only (encapsulation)'], ['receive', 'Receiver only (decapsulation)']] },
    ],
    build(inp) {
      const msg = String(inp.message || 'HELLO').trim().slice(0, 16) || 'HELLO';
      const frames = [];
      const scene = (activeS, doneS, activeR, doneR, pdu, wire) => [{
        type: 'layers', box: [10, 6, 980, 548],
        stacks: [
          { title: 'Sender (Host A)', layers: osiLayers(), active: activeS, done: doneS },
          { title: 'Receiver (Host B)', layers: osiLayers(), active: activeR, done: doneR },
        ],
        wire, pdu,
      }];
      const idx = (n) => 7 - n;
      if (inp.journey !== 'receive') {
        frames.push(F(`User types "${msg}" in an application on Host A.`, 'Data starts at the top of the sender\'s stack and must travel down all seven layers before it can leave the computer.',
          scene(-1, [], -1, [], { caption: 'Application data', parts: [{ t: msg, tone: 'blue', w: 3, hl: true }] }), { 'Current layer': '—', PDU: 'Data', Direction: 'Down (encapsulation)' }, {}, 'Layer 7 adds its header.'));
        const doneS = [];
        OSI.forEach((l) => {
          frames.push(F(`Layer ${l.n} — ${l.name}: ${l.hdr ? `adds header ${l.hdr}${l.n === 2 ? ' and trailer DT' : ''}` : 'converts the frame into bits'}.`, l.job,
            scene(idx(l.n), doneS.slice(), -1, [], osiPdu(l.n, msg)), { 'Current layer': `${l.n} ${l.name}`, PDU: l.pdu, Direction: 'Down (encapsulation)', 'Header added': l.hdr || '— (signals)' },
            { Protocols: l.proto, ...(osiAddr[l.n] ? { Addressing: osiAddr[l.n] } : {}) }, l.n > 1 ? `Hand the ${l.pdu.toLowerCase()} to layer ${l.n - 1}.` : 'Transmit the bits on the medium.'));
          doneS.push(idx(l.n));
        });
      }
      if (inp.journey === 'full') {
        frames.push(F('Bits travel across the physical medium.', 'Only the physical layers are connected by a real medium; every higher layer talks to its peer only logically, through the headers.',
          scene(-1, [0, 1, 2, 3, 4, 5, 6], -1, [], osiPdu(1, msg), { active: true, label: 'Cable / fibre / radio', token: '0110 1001…' }), { 'Current layer': 'Medium', PDU: 'Bits', Direction: 'A → B' }, {}, 'Host B\'s physical layer receives the signal.'));
      }
      if (inp.journey !== 'send') {
        const doneR = [];
        const doneSAll = inp.journey === 'full' ? [0, 1, 2, 3, 4, 5, 6] : [];
        OSI.slice().reverse().forEach((l) => {
          const pdu = l.n === 1 ? osiPdu(1, msg) : osiPdu(l.n, msg);
          if (l.n > 1) pdu.caption = `${l.name} reads and removes ${l.hdr}${l.n === 2 ? ' + DT' : ''}`;
          frames.push(F(`Layer ${l.n} — ${l.name}: ${l.n === 1 ? 'turns signals back into bits' : `reads and removes ${l.hdr}${l.n === 2 ? ' (checks FCS in DT)' : ''}`}.`,
            `The receiving ${l.name} layer processes only the header written by the sender's ${l.name} layer (peer-to-peer communication), then passes the rest up.`,
            scene(-1, doneSAll, idx(l.n), doneR.slice(), pdu), { 'Current layer': `${l.n} ${l.name}`, PDU: l.pdu, Direction: 'Up (decapsulation)', 'Header removed': l.hdr || '—' },
            { Protocols: l.proto, ...(osiAddr[l.n] ? { Addressing: osiAddr[l.n] } : {}) }, l.n < 7 ? `Pass up to layer ${l.n + 1}.` : 'Deliver to the application.'));
          doneR.push(idx(l.n));
        });
        frames.push(F(`Host B's application receives "${msg}".`, 'All headers have been removed in reverse order — the receiver gets exactly the data the sender\'s application produced.',
          scene(-1, doneSAll, -1, [0, 1, 2, 3, 4, 5, 6], { caption: 'Delivered data', parts: [{ t: msg, tone: 'blue', w: 3, hl: true }] }), { 'Current layer': 'Application (delivered)', PDU: 'Data', Direction: 'Complete' }, {}, 'Journey complete.'));
      }
      return frames;
    },
  };

  // ════════════════════ TCP/IP MODEL VISUALIZER ════════════════════
  const APPS = {
    http: { app: 'HTTP', msg: 'GET /index.html', tr: 'TCP', port: 80, proto: 6, pdu: 'Segment' },
    dns: { app: 'DNS', msg: 'Query A kpriet.ac.in', tr: 'UDP', port: 53, proto: 17, pdu: 'Datagram' },
    smtp: { app: 'SMTP', msg: 'MAIL FROM:<staff@…>', tr: 'TCP', port: 25, proto: 6, pdu: 'Segment' },
  };
  S['cn-tcpip-model'] = {
    inputs: [
      { key: 'app', label: 'Application protocol', type: 'select', default: 'http', options: [['http', 'HTTP (web page)'], ['dns', 'DNS (name lookup)'], ['smtp', 'SMTP (send e-mail)']] },
    ],
    build(inp) {
      const a = APPS[inp.app] || APPS.http;
      const L = [
        { name: 'Application', sub: 'Message', subAdv: 'HTTP, DNS, SMTP, FTP', tone: 'blue', info: 'Protocols used directly by applications.' },
        { name: 'Transport', sub: `${a.pdu} (${a.tr})`, subAdv: 'TCP, UDP', tone: 'amber', info: 'Process-to-process delivery with port numbers.' },
        { name: 'Internet', sub: 'Packet', subAdv: 'IP, ICMP, ARP', tone: 'green', info: 'Logical addressing and routing of packets.' },
        { name: 'Network Access', sub: 'Frame → Bits', subAdv: 'Ethernet, Wi-Fi', tone: 'red', info: 'Framing, MAC addressing and transmission on the local link.' },
      ];
      const hdr = {
        1: { t: `${a.tr} hdr`, tone: 'amber', info: `Source port 51234 → destination port ${a.port}${a.tr === 'TCP' ? ', sequence/ack numbers, flags' : ', length, checksum'}` },
        2: { t: 'IP hdr', tone: 'green', info: `192.168.1.10 → 142.250.183.4, TTL 64, protocol ${a.proto} (${a.tr})` },
        3: { t: 'Eth hdr', tone: 'red', info: 'Destination MAC (gateway) and source MAC, type 0x0800 (IPv4)' },
      };
      const pduAt = (lvl) => {
        if (lvl === 4) return { caption: 'Bits on the link', parts: [{ t: '1010 0110 0111…', tone: 'grey', w: 6, hl: true }] };
        const parts = [];
        if (lvl >= 3) parts.push({ ...hdr[3], w: 1.2, hl: lvl === 3 });
        if (lvl >= 2) parts.push({ ...hdr[2], w: 1.2, hl: lvl === 2 });
        if (lvl >= 1) parts.push({ ...hdr[1], w: 1.2, hl: lvl === 1 });
        parts.push({ t: a.msg, tone: 'blue', w: 3, hl: lvl === 0 });
        if (lvl >= 3) parts.push({ t: 'FCS', tone: 'red', w: 0.8, hl: lvl === 3, info: 'Frame check sequence (CRC-32)' });
        return { caption: ['Application message', `Transport ${a.pdu.toLowerCase()}`, 'IP packet', 'Ethernet frame'][lvl], parts, notes: [`Process port: ${a.port} (${a.app} server)`] };
      };
      const sc = (as, ds, ar, dr, lvl, wire) => [{ type: 'layers', box: [10, 6, 980, 548], stacks: [{ title: 'Client', layers: L, active: as, done: ds }, { title: 'Server', layers: L, active: ar, done: dr }], pdu: pduAt(lvl), wire }];
      const why = [
        `${a.app} creates the message. The application decides what to say; lower layers decide how to deliver it.`,
        `${a.tr} adds a header with the source port and destination port ${a.port}, so the server knows which process gets the data${a.tr === 'TCP' ? ', plus sequence numbers for reliable, ordered delivery' : '; UDP adds no connection or retransmission'}.`,
        `IP adds source and destination IP addresses so routers can forward the packet across networks. Protocol field = ${a.proto} (${a.tr}).`,
        'The network access layer frames the packet with MAC addresses for the next hop and an FCS, then sends it as bits.',
      ];
      const frames = [];
      const ds = [];
      L.forEach((l, i) => {
        frames.push(F(`Client ${l.name} layer: ${['creates the message', `adds the ${a.tr} header`, 'adds the IP header', 'frames and transmits'][i]}.`, why[i], sc(i, ds.slice(), -1, [], i), { Layer: l.name, PDU: ['Message', a.pdu, 'Packet', 'Frame'][i], Protocol: [a.app, a.tr, 'IPv4', 'Ethernet'][i] }, { Header: hdr[i] ? hdr[i].info : '—' }, i < 3 ? 'Pass down to the next layer.' : 'Send across the network.'));
        ds.push(i);
      });
      frames.push(F('The frame crosses the network.', 'Routers on the way look only at the Internet-layer header (IP) and re-frame the packet for each link; the transport and application data travel unchanged.', sc(-1, [0, 1, 2, 3], -1, [], 4, { active: true, label: 'LAN → routers → Internet → server LAN' }), { Layer: 'Links and routers', PDU: 'Bits / frames', Protocol: 'Ethernet, IP routing' }, {}, 'The server receives the frame.'));
      const dr = [];
      [3, 2, 1, 0].forEach((i) => {
        frames.push(F(`Server ${L[i].name} layer: ${['delivers the message to the application', `reads port ${a.port} and removes the ${a.tr} header`, 'checks the destination IP and removes the IP header', 'checks the FCS and MAC, removes the frame header'][i]}.`,
          ['The ' + a.app + ' server process receives exactly what the client sent.', `Port ${a.port} identifies the ${a.app} server process on this host.`, 'The IP address matches this host, so the packet is accepted.', 'A correct FCS shows the frame was not damaged on the link.'][i],
          sc(-1, [0, 1, 2, 3], i, dr.slice(), i === 0 ? 0 : i), { Layer: L[i].name, Direction: 'Up (decapsulation)', Protocol: [a.app, a.tr, 'IPv4', 'Ethernet'][i] }, {}, i ? 'Pass up.' : 'Complete.'));
        dr.push(i);
      });
      return frames;
    },
  };

  // ════════════════════ NETWORK TOPOLOGY VISUALIZER ════════════════════
  const letters = (n) => Array.from({ length: n }, (_, i) => String.fromCharCode(65 + i));
  function topoFrames(kind, n, src, dst, fail) {
    const names = letters(n);
    if (!names.includes(src) || !names.includes(dst) || src === dst) throw new Error(`Choose two different nodes between A and ${names[n - 1]}.`);
    const frames = [];
    const props = {
      bus: { links: '1 backbone + n drop lines', cable: 'Least', fault: 'A backbone break stops the network', ex: 'Early Ethernet (10BASE2)' },
      star: { links: `${n} (one per device)`, cable: 'Moderate', fault: 'Hub/switch failure stops all; one link failure isolates one device', ex: 'Office LAN with a switch' },
      ring: { links: `${n}`, cable: 'Moderate', fault: 'One break stops a single ring (dual rings can wrap)', ex: 'Token Ring, FDDI, SONET' },
      mesh: { links: `n(n−1)/2 = ${(n * (n - 1)) / 2}`, cable: 'Most', fault: 'Very robust — traffic reroutes', ex: 'Internet backbone, WAN cores' },
      tree: { links: 'n − 1 (hierarchy)', cable: 'Moderate', fault: 'A failed parent cuts off its whole branch', ex: 'Campus networks' },
    }[kind];
    const st = (extra) => ({ Topology: kind[0].toUpperCase() + kind.slice(1), Devices: n, Source: src, Destination: dst, ...extra });
    const adv = { Links: props.links, Cabling: props.cable, 'Fault tolerance': props.fault, Example: props.ex };
    const node = (id, x, y, extra = {}) => ({ id, label: id === 'SW' ? 'Switch' : id.startsWith('H') && id.length > 1 ? id : `Node ${id}`, x, y, kind: id === 'SW' || id.startsWith('H') && id.length > 1 ? 'switch' : 'pc', info: `Device ${id}`, ...extra });
    const mark = (nodes, hlIds, extra = {}) => nodes.map((nd) => ({ ...nd, hl: hlIds.includes(nd.id), ...(extra[nd.id] || {}) }));
    if (kind === 'bus') {
      const nodes = []; const links = [];
      names.forEach((id, i) => {
        const x = 0.06 + (0.88 * i) / Math.max(1, n - 1);
        nodes.push(node(id, x, i % 2 ? 0.95 : 0.05));
        nodes.push({ id: `t${i}`, label: '', x, y: 0.5, kind: 'tap', r: 6, icon: ' ' });
        links.push({ a: id, b: `t${i}` });
        if (i) links.push({ a: `t${i - 1}`, b: `t${i}`, w: 6, info: 'Shared backbone cable — every device hears every signal.' });
      });
      const si = names.indexOf(src); const di = names.indexOf(dst);
      const breakAt = fail === 'link' ? Math.min(si, di) + 1 : -1; // break between taps on the way
      const L = (hl = []) => links.map((l) => ({ ...l, hl: hl.includes(`${l.a}-${l.b}`), broken: fail === 'link' && l.a === `t${breakAt - 1}` && l.b === `t${breakAt}` }));
      frames.push(F('Bus topology: every device taps one shared backbone cable.', 'A bus uses the least cable, but all devices share the same medium, so only one can transmit at a time.', [{ type: 'topo', box: [10, 10, 980, 540], nodes: mark(nodes, []), links: L() }], st({ Phase: 'Layout' }), adv, `${src} will send a frame to ${dst}.`));
      frames.push(F(`${src} puts the signal on the bus.`, 'The signal travels in both directions along the cable; terminators at each end absorb it so it does not reflect back.', [{ type: 'topo', box: [10, 10, 980, 540], nodes: mark(nodes, [src]), links: L([`${src}-t${si}`]), packets: [{ from: src, to: `t${si}`, label: `to ${dst}` }] }], st({ Phase: 'Transmit' }), adv, 'The signal spreads along the backbone.'));
      const packets = [];
      if (si > 0) packets.push({ from: `t${si}`, to: `t${si - 1}`, label: '◀' });
      if (si < n - 1) packets.push({ from: `t${si}`, to: `t${si + 1}`, label: '▶', lost: fail === 'link' && breakAt === si + 1 });
      frames.push(F('The signal propagates along the whole cable.', fail === 'link' ? 'The backbone is broken, so the signal cannot pass the break — devices on the other side never hear it.' : 'Every device on the bus receives a copy of the same frame.', [{ type: 'topo', box: [10, 10, 980, 540], nodes: mark(nodes, []), links: L(), packets }], st({ Phase: 'Propagation' }), adv, 'Each device checks the destination address.'));
      if (fail === 'link') {
        const reach = (i) => (breakAt <= si ? i >= breakAt : i < breakAt);
        frames.push(F(`Backbone break: ${dst} cannot be reached.`, 'In a bus a single cable fault splits the network (and signal reflections disturb the rest). This is the main weakness of bus topology.', [{ type: 'topo', box: [10, 10, 980, 540], nodes: mark(nodes, [src], Object.fromEntries(names.map((id, i) => [id, reach(i) ? {} : { bad: true, badge: 'unreachable', badgeTone: 'red' }]))), links: L() }], st({ Phase: 'Failure', Result: 'Not delivered' }), adv, 'Repair the backbone to restore communication.'));
        return frames;
      }
      frames.push(F('Every device compares the destination address.', `Only ${dst} matches, so only ${dst} accepts the frame; the others discard it. On a bus, collisions happen if two devices transmit at once.`, [{ type: 'topo', box: [10, 10, 980, 540], nodes: mark(nodes, [dst], Object.fromEntries(names.filter((id) => id !== src).map((id) => [id, { badge: id === dst ? 'accept' : 'discard', badgeTone: id === dst ? 'violet' : 'red' }]))), links: L() }], st({ Phase: 'Delivery', Result: `Delivered to ${dst}` }), adv, 'Done.'));
      return frames;
    }
    if (kind === 'star') {
      const nodes = [{ id: 'SW', label: 'Switch / Hub', x: 0.5, y: 0.5, kind: 'switch', r: 32, info: 'Central device — every frame passes through it.' }];
      const links = [];
      names.forEach((id, i) => { const ang = (2 * Math.PI * i) / n - Math.PI / 2; nodes.push(node(id, 0.5 + 0.42 * Math.cos(ang), 0.5 + 0.46 * Math.sin(ang))); links.push({ a: id, b: 'SW' }); });
      const failedLeaf = fail === 'link' ? dst : null;
      const L = (hl = []) => links.map((l) => ({ ...l, hl: hl.includes(l.a), broken: l.a === failedLeaf }));
      frames.push(F('Star topology: every device connects to one central switch.', 'Each device has its own cable to the centre, so one bad cable affects only that device.', [{ type: 'topo', nodes: mark(nodes, ['SW']), links: L() }], st({ Phase: 'Layout' }), adv, `${src} sends to ${dst}.`));
      frames.push(F(`${src} sends the frame to the switch.`, 'All traffic goes through the central device.', [{ type: 'topo', nodes: mark(nodes, [src, 'SW']), links: L([src]), packets: [{ from: src, to: 'SW', label: `to ${dst}` }] }], st({ Phase: 'To centre' }), adv, 'The switch forwards it.'));
      if (fail === 'central') {
        frames.push(F('The central switch has failed — nothing is forwarded.', 'The centre is a single point of failure: when it fails, every device loses connectivity.', [{ type: 'topo', nodes: mark(nodes, [src], { SW: { bad: true, badge: 'FAILED', badgeTone: 'red' } }), links: links.map((l) => ({ ...l, dim: true })) }], st({ Phase: 'Failure', Result: 'Network down' }), adv, 'Replace the switch.'));
        return frames;
      }
      if (failedLeaf) {
        frames.push(F(`The cable to ${dst} is broken.`, `Only ${dst} is affected; every other device can still talk through the switch.`, [{ type: 'topo', nodes: mark(nodes, ['SW'], { [dst]: { bad: true, badge: 'isolated', badgeTone: 'red' } }), links: L(), packets: [{ from: 'SW', to: dst, label: 'frame', lost: true }] }], st({ Phase: 'Failure', Result: `${dst} unreachable` }), adv, 'Replace the cable.'));
        return frames;
      }
      frames.push(F(`The switch forwards the frame only to ${dst}.`, 'A switch learns which port each device is on and sends the frame out of that port only (a hub would repeat it to every port).', [{ type: 'topo', nodes: mark(nodes, [dst, 'SW']), links: L([dst]), packets: [{ from: 'SW', to: dst, label: 'frame' }] }], st({ Phase: 'Delivery', Result: `Delivered to ${dst}` }), adv, 'Done.'));
      return frames;
    }
    if (kind === 'ring') {
      const nodes = names.map((id, i) => { const ang = (2 * Math.PI * i) / n - Math.PI / 2; return node(id, 0.5 + 0.42 * Math.cos(ang), 0.5 + 0.44 * Math.sin(ang)); });
      const links = names.map((id, i) => ({ a: id, b: names[(i + 1) % n] }));
      const si = names.indexOf(src); const di = names.indexOf(dst);
      const brokenLink = fail === 'link' ? src : null; // the link leaving the sender
      const L = (hl = []) => links.map((l) => ({ ...l, hl: hl.includes(l.a), broken: l.a === brokenLink }));
      frames.push(F('Ring topology: each device connects to two neighbours in a closed loop.', 'Data travels in one direction around the ring, passing through every device between sender and receiver.', [{ type: 'topo', nodes: mark(nodes, []), links: L() }], st({ Phase: 'Layout' }), adv, 'A token circulates to control access.'));
      frames.push(F(`The token reaches ${src}, so ${src} may transmit.`, 'In a token ring only the device holding the token can send, which avoids collisions.', [{ type: 'topo', nodes: mark(nodes, [src], { [src]: { badge: 'token', badgeTone: 'violet' } }), links: L() }], st({ Phase: 'Token captured' }), adv, `${src} sends the frame clockwise.`));
      let i = si;
      while (i !== di) {
        const a = names[i]; const b = names[(i + 1) % n];
        if (fail === 'link' && a === brokenLink) {
          frames.push(F(`The ring is broken after ${a}.`, 'A single-ring network stops working when one link fails. Dual rings (FDDI) wrap traffic back the other way to survive this.', [{ type: 'topo', nodes: mark(nodes, [a], { [dst]: { bad: true, badge: 'unreachable', badgeTone: 'red' } }), links: L(), packets: [{ from: a, to: b, label: 'frame', lost: true }] }], st({ Phase: 'Failure', Result: 'Not delivered' }), adv, 'Repair the link.'));
          return frames;
        }
        frames.push(F(`${a} passes the frame to ${b}.`, b === dst ? `${dst} recognises its own address and copies the frame.` : `${b} is not the destination, so it regenerates the signal and passes it on.`, [{ type: 'topo', nodes: mark(nodes, [b]), links: L([a]), packets: [{ from: a, to: b, label: `→ ${dst}` }] }], st({ Phase: 'Forwarding', Hop: `${a} → ${b}` }), adv, b === dst ? 'The frame continues back to the sender.' : 'Next hop.'));
        i = (i + 1) % n;
      }
      frames.push(F(`${dst} copies the data and the frame returns to ${src}.`, `${src} removes its frame from the ring and releases the token for the next device.`, [{ type: 'topo', nodes: mark(nodes, [src, dst], { [dst]: { badge: 'copied', badgeTone: 'violet' } }), links: L() }], st({ Phase: 'Complete', Result: `Delivered to ${dst}` }), adv, 'Done.'));
      return frames;
    }
    if (kind === 'mesh') {
      const nodes = names.map((id, i) => { const ang = (2 * Math.PI * i) / n - Math.PI / 2; return node(id, 0.5 + 0.42 * Math.cos(ang), 0.5 + 0.44 * Math.sin(ang)); });
      const links = [];
      names.forEach((a, i) => names.slice(i + 1).forEach((b) => links.push({ a, b })));
      const direct = (l) => (l.a === src && l.b === dst) || (l.a === dst && l.b === src);
      const L = (hl = []) => links.map((l) => ({ ...l, hl: hl.some(([x, y]) => (l.a === x && l.b === y) || (l.a === y && l.b === x)), broken: fail === 'link' && direct(l), dim: !hl.length && !direct(l) && fail !== 'link' ? false : false }));
      frames.push(F(`Full mesh: every device has a direct link to every other (${(n * (n - 1)) / 2} links).`, 'Mesh gives the most redundancy and privacy, but needs n(n−1)/2 links and many ports per device.', [{ type: 'topo', nodes: mark(nodes, []), links: L() }], st({ Phase: 'Layout' }), adv, `${src} sends to ${dst}.`));
      if (fail !== 'link') {
        frames.push(F(`${src} uses its dedicated link to ${dst}.`, 'A direct point-to-point link means no other device carries this traffic.', [{ type: 'topo', nodes: mark(nodes, [src, dst]), links: L([[src, dst]]), packets: [{ from: src, to: dst, label: 'data' }] }], st({ Phase: 'Delivery', Result: `Delivered to ${dst}` }), adv, 'Done.'));
        return frames;
      }
      const via = names.find((x) => x !== src && x !== dst);
      frames.push(F(`The direct ${src}–${dst} link has failed.`, 'The mesh still has many other paths.', [{ type: 'topo', nodes: mark(nodes, [src]), links: L(), packets: [{ from: src, to: dst, label: 'data', lost: true }] }], st({ Phase: 'Failure' }), adv, `Reroute through ${via}.`));
      frames.push(F(`Traffic is rerouted ${src} → ${via}.`, 'Redundant links let the network survive link failures.', [{ type: 'topo', nodes: mark(nodes, [src, via]), links: L([[src, via]]), packets: [{ from: src, to: via, label: 'data' }] }], st({ Phase: 'Reroute', Hop: `${src} → ${via}` }), adv, `${via} forwards to ${dst}.`));
      frames.push(F(`${via} forwards to ${dst} — delivered.`, 'Two hops instead of one, but communication continues.', [{ type: 'topo', nodes: mark(nodes, [via, dst]), links: L([[via, dst]]), packets: [{ from: via, to: dst, label: 'data' }] }], st({ Phase: 'Delivery', Result: `Delivered via ${via}` }), adv, 'Done.'));
      return frames;
    }
    // tree
    const half = Math.ceil(n / 2);
    const leftLeaves = names.slice(0, half); const rightLeaves = names.slice(half);
    const nodes = [{ id: 'H0', label: 'Root switch', x: 0.5, y: 0.02, kind: 'switch', info: 'Top of the hierarchy.' }, { id: 'H1', label: 'Switch 1', x: 0.25, y: 0.42, kind: 'switch' }, { id: 'H2', label: 'Switch 2', x: 0.75, y: 0.42, kind: 'switch' }];
    const links = [{ a: 'H0', b: 'H1' }, { a: 'H0', b: 'H2' }];
    leftLeaves.forEach((id, i) => { nodes.push(node(id, 0.04 + (0.42 * i) / Math.max(1, leftLeaves.length - 1 || 1), 0.95)); links.push({ a: 'H1', b: id }); });
    rightLeaves.forEach((id, i) => { nodes.push(node(id, 0.54 + (0.42 * i) / Math.max(1, rightLeaves.length - 1 || 1), 0.95)); links.push({ a: 'H2', b: id }); });
    const parent = (id) => (leftLeaves.includes(id) ? 'H1' : 'H2');
    const path = parent(src) === parent(dst) ? [src, parent(src), dst] : [src, parent(src), 'H0', parent(dst), dst];
    const isOn = (l, p) => p.some((x, i) => i && ((l.a === p[i - 1] && l.b === x) || (l.b === p[i - 1] && l.a === x)));
    frames.push(F('Tree topology: stars connected in a hierarchy.', 'A tree is easy to expand branch by branch; traffic between branches goes up to a common parent and back down.', [{ type: 'topo', nodes: mark(nodes, []), links }], st({ Phase: 'Layout', Path: path.join(' → ') }), adv, `${src} sends to ${dst}.`));
    for (let i = 1; i < path.length; i++) {
      const a = path[i - 1]; const b = path[i];
      if (fail === 'central' && b === 'H0') {
        frames.push(F('The root switch has failed.', 'Every branch below a failed parent is cut off from the other branches.', [{ type: 'topo', nodes: mark(nodes, [a], { H0: { bad: true, badge: 'FAILED', badgeTone: 'red' } }), links, packets: [{ from: a, to: b, label: 'data', lost: true }] }], st({ Phase: 'Failure', Result: 'Not delivered' }), adv, 'Restore the root switch.'));
        return frames;
      }
      frames.push(F(`${a} → ${b}`, b === dst ? `${dst} receives the data.` : b === 'H0' ? 'The destination is in another branch, so the frame goes up to the root.' : 'The frame moves down toward the destination branch.', [{ type: 'topo', nodes: mark(nodes, [b]), links: links.map((l) => ({ ...l, hl: isOn(l, path.slice(0, i + 1)) })), packets: [{ from: a, to: b, label: 'data' }] }], st({ Phase: 'Forwarding', Hop: `${a} → ${b}` }), adv, b === dst ? 'Done.' : 'Next hop.'));
    }
    return frames;
  }
  function scopeFrames() {
    const rows = [['LAN', 'Room / building / campus', 'Up to ~1–2 km', '100 Mbps – 10 Gbps', 'Private (the organisation)', 'College lab, office'], ['MAN', 'City / metro area', '5–50 km', '10 Mbps – 10 Gbps', 'ISP or city provider', 'Cable TV network, city Wi-Fi'], ['WAN', 'Country / world', '> 50 km (unlimited)', 'Varies (leased lines, MPLS)', 'Telecom providers', 'The Internet, bank networks']];
    const tbl = (hl) => ({ type: 'table', box: [10, 350, 980, 200], title: 'Comparison', cols: ['Type', 'Covers', 'Distance', 'Speed', 'Owned by', 'Example'], rows, hl, mono: false });
    const lan = { type: 'topo', box: [10, 10, 980, 330], title: 'LAN — one building', nodes: [{ id: 's', label: 'Lab switch', x: 0.5, y: 0.25, kind: 'switch', hl: true }, { id: 'p1', label: 'PC 1', x: 0.15, y: 0.9, kind: 'pc' }, { id: 'p2', label: 'PC 2', x: 0.38, y: 0.9, kind: 'pc' }, { id: 'p3', label: 'Printer', x: 0.62, y: 0.9, kind: 'server', icon: '🖨️' }, { id: 'p4', label: 'Server', x: 0.85, y: 0.9, kind: 'server' }], links: ['p1', 'p2', 'p3', 'p4'].map((b) => ({ a: 's', b })) };
    const man = { type: 'topo', box: [10, 10, 980, 330], title: 'MAN — campuses across a city', nodes: [{ id: 'c1', label: 'Main campus LAN', x: 0.1, y: 0.5, kind: 'building' }, { id: 'c2', label: 'Hostel LAN', x: 0.5, y: 0.05, kind: 'building' }, { id: 'c3', label: 'City office LAN', x: 0.9, y: 0.5, kind: 'building' }, { id: 'm', label: 'Metro ring', x: 0.5, y: 0.6, kind: 'router', hl: true }], links: [{ a: 'c1', b: 'm', label: '12 km fibre' }, { a: 'c2', b: 'm', label: '6 km' }, { a: 'c3', b: 'm', label: '20 km' }] };
    const wan = { type: 'topo', box: [10, 10, 980, 330], title: 'WAN — networks across the country and world', nodes: [{ id: 'w1', label: 'Coimbatore', x: 0.08, y: 0.6, kind: 'city' }, { id: 'w2', label: 'Chennai', x: 0.35, y: 0.1, kind: 'city' }, { id: 'w3', label: 'Mumbai', x: 0.6, y: 0.7, kind: 'city' }, { id: 'w4', label: 'Singapore DC', x: 0.92, y: 0.3, kind: 'server' }, { id: 'isp', label: 'ISP backbone', x: 0.5, y: 0.4, kind: 'cloud', hl: true }], links: ['w1', 'w2', 'w3', 'w4'].map((b) => ({ a: b, b: 'isp' })) };
    return [
      F('LAN — Local Area Network.', 'A LAN connects devices in a small area such as a lab or building. It is privately owned, fast and has low error rates.', [lan, tbl(0)], { Type: 'LAN', Scale: 'Building' }, { Technology: 'Ethernet, Wi-Fi' }, 'Connect several LANs across a city.'),
      F('MAN — Metropolitan Area Network.', 'A MAN links LANs across a city, usually over a provider\'s fibre ring.', [man, tbl(1)], { Type: 'MAN', Scale: 'City' }, { Technology: 'Metro Ethernet, fibre rings' }, 'Connect cities and countries.'),
      F('WAN — Wide Area Network.', 'A WAN spans countries using telecom/ISP links. The Internet is the largest WAN. WANs are slower per link and cost more.', [wan, tbl(2)], { Type: 'WAN', Scale: 'Country / world' }, { Technology: 'Leased lines, MPLS, satellite' }, 'Compare all three.'),
    ];
  }
  function componentFrames() {
    const nodes = [
      { id: 'lap', label: 'Laptop', sub: 'client + NIC', x: 0.02, y: 0.45, kind: 'laptop', info: 'End device (host). Its NIC (network interface card) has a unique MAC address and converts data to signals.' },
      { id: 'ap', label: 'Access Point', x: 0.2, y: 0.08, kind: 'ap', info: 'Connects wireless devices to the wired LAN (Layer 2).' },
      { id: 'sw', label: 'Switch', x: 0.38, y: 0.45, kind: 'switch', info: 'Connects devices in a LAN and forwards frames by MAC address (Layer 2).' },
      { id: 'rt', label: 'Router', x: 0.56, y: 0.45, kind: 'router', info: 'Connects different networks and forwards packets by IP address (Layer 3).' },
      { id: 'md', label: 'Modem', x: 0.73, y: 0.45, kind: 'modem', info: 'Modulates/demodulates signals for the ISP line (DSL, cable, fibre ONT).' },
      { id: 'net', label: 'Internet', x: 0.86, y: 0.08, kind: 'cloud' },
      { id: 'srv', label: 'Web server', x: 0.98, y: 0.45, kind: 'server', info: 'Provides a service (web pages) to clients.' },
    ];
    const links = [{ a: 'lap', b: 'ap', dashed: true }, { a: 'ap', b: 'sw' }, { a: 'sw', b: 'rt' }, { a: 'rt', b: 'md' }, { a: 'md', b: 'net' }, { a: 'net', b: 'srv' }];
    const path = ['lap', 'ap', 'sw', 'rt', 'md', 'net', 'srv'];
    const role = {
      ap: ['Access point', 'Bridges the Wi-Fi link to the wired network.', 'Layer 2'],
      sw: ['Switch', 'Looks at the destination MAC and forwards the frame out of the router\'s port only.', 'Layer 2'],
      rt: ['Router', 'Reads the destination IP, chooses the next hop from its routing table and sends the packet out of the WAN interface.', 'Layer 3'],
      md: ['Modem', 'Converts digital data into signals suitable for the ISP line.', 'Layer 1'],
      net: ['ISP / Internet', 'Many routers forward the packet hop by hop toward the server\'s network.', 'Layer 3'],
      srv: ['Server', 'Receives the request and sends back the web page.', 'Layers 1–7'],
    };
    const frames = [F('A laptop (client) wants a web page. Its NIC turns data into signals.', 'Every host needs a NIC with a MAC address to join a network. The laptop is the client; the web server provides the service.', [{ type: 'topo', nodes: nodes.map((n) => ({ ...n, hl: n.id === 'lap' })), links }], { Device: 'Laptop + NIC', Function: 'Create and send the request', Layer: 'All (end host)' }, {}, 'The frame goes to the access point.')];
    for (let i = 1; i < path.length; i++) {
      const [name, fn, lyr] = role[path[i]];
      frames.push(F(`${name}: ${fn}`, `Component function — ${name} works at ${lyr}.`, [{ type: 'topo', nodes: nodes.map((n) => ({ ...n, hl: n.id === path[i] })), links: links.map((l) => ({ ...l, hl: l.a === path[i - 1] && l.b === path[i] })), packets: [{ from: path[i - 1], to: path[i], label: 'request' }] }], { Device: name, Function: fn, Layer: lyr }, {}, i < path.length - 1 ? 'Next device.' : 'Complete.'));
    }
    return frames;
  }
  S['cn-topology'] = {
    inputs: [
      { key: 'mode', label: 'Show', type: 'select', default: 'star', options: [['bus', 'Bus topology'], ['star', 'Star topology'], ['ring', 'Ring topology'], ['mesh', 'Mesh topology'], ['tree', 'Tree topology'], ['scope', 'LAN, MAN and WAN'], ['components', 'Network components & functions']] },
      { key: 'nodes', label: 'Number of devices', type: 'number', default: 6, min: 4, max: 8, showIf: (i) => ['bus', 'star', 'ring', 'mesh', 'tree'].includes(i.mode) },
      { key: 'src', label: 'Source', type: 'text', default: 'A', max: 1, showIf: (i) => ['bus', 'star', 'ring', 'mesh', 'tree'].includes(i.mode) },
      { key: 'dst', label: 'Destination', type: 'text', default: 'D', max: 1, showIf: (i) => ['bus', 'star', 'ring', 'mesh', 'tree'].includes(i.mode) },
      { key: 'fail', label: 'Failure', type: 'select', default: 'none', options: [['none', 'No failure'], ['link', 'Break a link'], ['central', 'Central device fails (star/tree)']], showIf: (i) => ['bus', 'star', 'ring', 'mesh', 'tree'].includes(i.mode) },
    ],
    build(inp) {
      if (inp.mode === 'scope') return scopeFrames();
      if (inp.mode === 'components') return componentFrames();
      const n = Math.max(4, Math.min(8, Number(inp.nodes) || 6));
      return topoFrames(inp.mode, n, String(inp.src || 'A').toUpperCase(), String(inp.dst || 'D').toUpperCase(), inp.fail || 'none');
    },
  };

  // ════════════════════ OSI vs TCP/IP COMPARISON ════════════════════
  S['cn-osi-vs-tcpip'] = {
    inputs: [],
    build() {
      const osi = OSI.map((l) => ({ name: `${l.n}. ${l.name}`, sub: l.pdu, tone: l.tone, info: l.job }));
      const tcp = [
        { name: 'Application', span: 3, sub: 'HTTP, FTP, SMTP, DNS, TLS', tone: 'blue', info: 'Combines OSI Application, Presentation and Session.' },
        { name: 'Transport', sub: 'TCP, UDP', tone: 'amber', info: 'Same role as OSI Transport.' },
        { name: 'Internet', sub: 'IP, ICMP, ARP', tone: 'green', info: 'Same role as OSI Network.' },
        { name: 'Network Access', span: 2, sub: 'Ethernet, Wi-Fi, PPP', tone: 'red', info: 'Combines OSI Data Link and Physical.' },
      ];
      const map = [[0, 0], [1, 0], [2, 0], [3, 1], [4, 2], [5, 3], [6, 3]];
      const diffs = [['Layers', '7', '4'], ['Developed by', 'ISO (1984)', 'US DoD / DARPA (1970s)'], ['Approach', 'Reference model — theory first', 'Practical — protocols first'], ['Session & presentation', 'Separate layers', 'Inside the application'], ['Transport', 'Connection-oriented focus', 'TCP (reliable) and UDP (fast)'], ['Network layer', 'Connectionless & connection-oriented', 'Connectionless IP only'], ['Used today', 'Teaching / troubleshooting', 'The Internet']];
      const sc = (activeO, activeT, hl, table) => [{ type: 'layers', box: table ? [10, 6, 540, 548] : [60, 6, 880, 548], stacks: [{ title: 'OSI (7 layers)', layers: osi, active: -1, done: activeO }, { title: 'TCP/IP (4 layers)', layers: tcp, active: activeT, done: [] }], mapping: map, mapHl: hl }].concat(table ? [{ type: 'table', box: [570, 20, 420, 520], title: 'Key differences', cols: ['Feature', 'OSI', 'TCP/IP'], rows: diffs, mono: false, rowH: 44 }] : []);
      const frames = [F('Two models describe the same communication.', 'OSI is a 7-layer reference model used for teaching and troubleshooting; TCP/IP is the 4-layer model the Internet actually runs on.', sc([], -1, []), { Focus: 'Overview' }, {}, 'Compare layer by layer.')];
      const steps = [
        [0, [0, 1, 2], 'TCP/IP Application = OSI Application + Presentation + Session.', 'In TCP/IP, formatting, encryption (TLS) and session control are handled inside the application protocols.', 'HTTP, FTP, SMTP, DNS, TLS'],
        [1, [3], 'Transport maps one-to-one.', 'Both models provide process-to-process delivery using ports, with TCP (reliable) or UDP (best effort).', 'TCP, UDP'],
        [2, [4], 'TCP/IP Internet = OSI Network.', 'Logical addressing and routing: IP moves packets between networks.', 'IPv4, IPv6, ICMP'],
        [3, [5, 6], 'TCP/IP Network Access = OSI Data Link + Physical.', 'TCP/IP does not define the lower layers in detail — it runs over any link technology.', 'Ethernet, Wi-Fi, PPP'],
      ];
      steps.forEach(([t, o, title, why, proto]) => frames.push(F(title, why, sc(o, t, o), { 'TCP/IP layer': tcp[t].name, 'OSI layers': o.map((i) => OSI[i].name).join(' + ') }, { Protocols: proto }, 'Next mapping.')));
      frames.push(F('Key differences between OSI and TCP/IP.', 'Remember: OSI is the conceptual model; TCP/IP is the implemented protocol suite.', sc([], -1, [], true), { Focus: 'Differences' }, {}, 'Comparison complete.'));
      return frames;
    },
  };
})(typeof window !== 'undefined' ? window : globalThis);
