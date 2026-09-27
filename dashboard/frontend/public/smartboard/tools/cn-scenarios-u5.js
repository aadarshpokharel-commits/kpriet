'use strict';
/* Computer Networks simulations — Unit 5: Application Layer */
(function (root) {
  const S = (root.CNScenarios = root.CNScenarios || {});
  const F = (title, why, scene, state = {}, adv = {}, next = '') => ({ title, why, scene, state, adv, next });
  const seqPart = (actors, msgs, box = [10, 6, 980, 548], minRows = 8, states) => { const shown = msgs.slice(-12); return { type: 'seq', box, actors, msgs: shown, cur: shown.length - 1, minRows, states }; };
  const hashIp = (name) => { let h = 2166136261; for (const c of name) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0; } return `${(h >>> 24) % 200 + 20}.${(h >>> 16) & 255}.${(h >>> 8) & 255}.${(h & 253) + 1}`; };

  // ════════════════════ DNS ════════════════════
  S['cn-dns'] = {
    inputs: [
      { key: 'name', label: 'Domain name', type: 'text', default: 'www.kpriet.ac.in', max: 60 },
      { key: 'type', label: 'Record type', type: 'select', default: 'A', options: [['A', 'A (IPv4 address)'], ['AAAA', 'AAAA (IPv6 address)'], ['MX', 'MX (mail server)']] },
      { key: 'mode', label: 'Resolver queries', type: 'select', default: 'iterative', options: [['iterative', 'Iterative (referrals)'], ['recursive', 'Recursive (each server asks the next)']] },
      { key: 'cache', label: 'Local DNS cache', type: 'select', default: 'empty', options: [['empty', 'Empty'], ['tld', 'Knows the TLD server'], ['answer', 'Already has the answer']] },
    ],
    build(inp) {
      const name = String(inp.name || '').trim().toLowerCase().replace(/\.$/, '');
      if (!/^([a-z0-9-]+\.)+[a-z]{2,}$/.test(name)) throw new Error('Enter a domain name like www.kpriet.ac.in');
      const labels = name.split('.'); const tld = labels[labels.length - 1];
      const zone = labels.length >= 3 && labels[labels.length - 2].length <= 3 ? labels.slice(-3).join('.') : labels.slice(-2).join('.');
      const rtype = inp.type || 'A';
      const answer = rtype === 'A' ? hashIp(name) : rtype === 'AAAA' ? `2001:db8::${(hashIp(name).split('.').reduce((a, b) => a + Number(b), 0)).toString(16)}` : `10 mail.${zone} → ${hashIp('mail.' + zone)}`;
      const actors = [{ name: 'Client', sub: 'stub resolver', info: 'The browser asks the OS resolver, which asks the local DNS server.' }, { name: 'Local DNS', sub: '(ISP / campus)', info: 'Resolves names for clients and caches answers.' }, { name: 'Root server', sub: '.', info: '13 root server names (hundreds of anycast sites). They know the TLD servers.' }, { name: `.${tld} TLD`, sub: 'TLD server', info: 'Knows the authoritative servers for every domain under .' + tld }, { name: `ns.${zone}`, sub: 'authoritative', info: `Holds the actual records for ${zone}.` }];
      const msgs = []; const frames = []; let n = 0;
      const snap = (title, why, next, active) => frames.push(F(title, why, [{ ...seqPart(actors, msgs), activeActors: active }], { Query: `${name} ${rtype}`, Mode: inp.mode === 'recursive' ? 'Recursive' : 'Iterative', 'DNS messages': n }, { Transport: 'UDP port 53', TTL: '3600 s' }, next));
      const q = (a, b, label, detail) => { msgs.push({ from: a, to: b, label, detail, token: 'query' }); n++; };
      const r = (a, b, label, detail, tone) => { msgs.push({ from: a, to: b, label, detail, token: 'reply', tone }); n++; };
      q(0, 1, `${rtype}? ${name}`, 'recursive query (RD=1)');
      snap(`The client asks its local DNS server: "${rtype} record for ${name}?"`, 'Hosts send a recursive query to the local DNS server: "please find the full answer for me".', 'Check the cache.', [0, 1]);
      if (inp.cache === 'answer') {
        r(1, 0, answer, 'from cache (non-authoritative)', 'green');
        snap(`Cache hit — the local DNS server answers immediately: ${answer}.`, 'Caching makes most lookups take one round trip. The answer is "non-authoritative" and expires when its TTL runs out.', 'Done.', [0, 1]);
        return frames;
      }
      const skipRoot = inp.cache === 'tld';
      if (inp.mode === 'iterative') {
        if (!skipRoot) {
          q(1, 2, `${rtype}? ${name}`, 'iterative (RD=0)'); snap('Local DNS asks a root server.', 'The root does not know the answer, but it knows who handles .' + tld + '.', 'Root refers it onward.', [1, 2]);
          r(2, 1, `Referral: .${tld} NS`, `ns1.nic.${tld}`); snap(`Root replies with a referral to the .${tld} TLD servers.`, 'In iterative resolution each server returns the best referral it has; the local server does the next query itself.', 'Ask the TLD.', [1, 2]);
        } else { msgs.push({ note: `cached: .${tld} TLD server`, at: 1, tone: 'violet' }); snap(`The local DNS server already has the .${tld} TLD servers cached — it skips the root.`, 'Caching referrals reduces load on the root servers.', 'Ask the TLD.', [1]); }
        q(1, 3, `${rtype}? ${name}`); snap(`Local DNS asks the .${tld} TLD server.`, `The TLD server knows the authoritative name servers for ${zone}.`, 'TLD refers onward.', [1, 3]);
        r(3, 1, `Referral: ${zone} NS`, `ns.${zone}`); snap(`TLD replies with a referral to ns.${zone}.`, 'Another referral — closer to the answer.', 'Ask the authoritative server.', [1, 3]);
        q(1, 4, `${rtype}? ${name}`); snap(`Local DNS asks the authoritative server ns.${zone}.`, 'The authoritative server holds the real record.', 'It answers.', [1, 4]);
        r(4, 1, answer, 'authoritative answer (AA=1)', 'green'); snap(`Authoritative answer: ${name} → ${answer}.`, 'The local DNS server caches this answer for its TTL.', 'Reply to the client.', [1, 4]);
      } else {
        const chain = skipRoot ? [1, 3, 4] : [1, 2, 3, 4];
        for (let i = 0; i + 1 < chain.length; i++) { q(chain[i], chain[i + 1], `${rtype}? ${name}`, 'recursive (RD=1)'); snap(`${actors[chain[i]].name} asks ${actors[chain[i + 1]].name}.`, 'In fully recursive resolution each server passes the question on and waits — the load moves up the hierarchy.', 'Continue.', [chain[i], chain[i + 1]]); }
        for (let i = chain.length - 1; i > 0; i--) { r(chain[i], chain[i - 1], answer, i === chain.length - 1 ? 'authoritative' : 'passed back', 'green'); snap(`${actors[chain[i]].name} returns the answer to ${actors[chain[i - 1]].name}.`, 'The answer travels back along the same chain; each server may cache it.', 'Continue.', [chain[i], chain[i - 1]]); }
      }
      r(1, 0, answer, 'cached for TTL', 'green');
      snap(`The client receives ${answer} and can now connect.`, `Total DNS messages: ${n}. Next time the local server will answer from its cache.`, 'Done.', [0, 1]);
      return frames;
    },
  };

  // ════════════════════ DHCP DORA ════════════════════
  S['cn-dhcp'] = {
    inputs: [
      { key: 'mac', label: 'Client MAC', type: 'text', default: '00:1A:2B:3C:4D:5E', max: 17 },
      { key: 'pool', label: 'Address pool start', type: 'text', default: '192.168.1.100', max: 15 },
      { key: 'lease', label: 'Lease time (hours)', type: 'number', default: 8, min: 1, max: 72 },
      { key: 'scenario', label: 'Scenario', type: 'select', default: 'normal', options: [['normal', 'New client (DORA)'], ['two', 'Two DHCP servers offer'], ['renew', 'DORA, then lease renewal at T1']] },
    ],
    build(inp) {
      const mac = String(inp.mac || '00:1A:2B:3C:4D:5E').toUpperCase();
      if (!/^([0-9A-F]{2}[:-]){5}[0-9A-F]{2}$/.test(mac)) throw new Error('Client MAC must look like 00:1A:2B:3C:4D:5E.');
      const pool = String(inp.pool || '192.168.1.100').trim();
      const m = pool.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/); if (!m || m.slice(1).some((x) => Number(x) > 255) || Number(m[4]) > 250) throw new Error('Pool start must be an IPv4 address with last octet ≤ 250.');
      const ipAt = (k) => `${m[1]}.${m[2]}.${m[3]}.${Number(m[4]) + k}`;
      const offer = ipAt(0); const lease = Math.max(1, Number(inp.lease) || 8);
      const two = inp.scenario === 'two';
      const actors = [{ name: 'Client', sub: mac }, { name: 'DHCP Server 1', sub: `${m[1]}.${m[2]}.${m[3]}.1` }].concat(two ? [{ name: 'DHCP Server 2', sub: `${m[1]}.${m[2]}.${m[3]}.2` }] : []);
      const msgs = []; const frames = [];
      const poolRows = (st) => [0, 1, 2, 3].map((k) => [ipAt(k), k === 0 ? st : 'free', k === 0 && st !== 'free' ? mac : '—']);
      const snap = (title, why, st, clientIp, next, adv = {}) => frames.push(F(title, why, [seqPart(actors, msgs, [10, 6, 640, 548], 8), { type: 'table', box: [665, 20, 325, 220], title: 'Server 1 address pool', cols: ['IP', 'Status', 'Client'], rows: poolRows(st), hl: 0 }, { type: 'callout', box: [665, 260, 325, 180], title: 'Client configuration', lines: clientIp ? [`IP: ${clientIp}/24`, `Gateway: ${m[1]}.${m[2]}.${m[3]}.1`, `DNS: 8.8.8.8`, `Lease: ${lease} h`] : ['No IP address yet (0.0.0.0)'] }], { 'Client IP': clientIp || '0.0.0.0', 'Pool entry': st, Lease: `${lease} h` }, { Ports: 'client UDP 68 ↔ server UDP 67', ...adv }, next));
      snap('A new client joins the network with no IP address.', 'DHCP gives hosts their IP address, mask, gateway and DNS server automatically. The four messages spell DORA.', 'free', null, 'Discover.');
      msgs.push({ from: 0, to: 1, label: 'DHCPDISCOVER', detail: '0.0.0.0:68 → 255.255.255.255:67, xid 0x3903F326', token: 'D' });
      if (two) msgs.push({ from: 0, to: 2, label: 'DHCPDISCOVER', token: 'D' });
      snap('D — DISCOVER (broadcast).', 'The client does not know any server or even its own IP, so it broadcasts from 0.0.0.0 to 255.255.255.255.', 'free', null, 'Servers make offers.');
      msgs.push({ from: 1, to: 0, label: `DHCPOFFER ${offer}`, detail: `yiaddr ${offer}, lease ${lease} h, mask /24`, token: 'O' });
      snap(`O — OFFER: Server 1 offers ${offer}.`, 'The server reserves an address from its pool and offers it together with the lease time and options.', 'offered', null, two ? 'Server 2 also offers.' : 'Client requests it.');
      if (two) { msgs.push({ from: 2, to: 0, label: `DHCPOFFER ${m[1]}.${m[2]}.${m[3]}.200`, token: 'O' }); snap('Server 2 also sends an offer.', 'A client may receive several offers; it usually accepts the first one.', 'offered', null, 'Client picks one.'); }
      msgs.push({ from: 0, to: 1, label: `DHCPREQUEST ${offer}`, detail: 'broadcast, server-id = Server 1', token: 'R' });
      if (two) msgs.push({ from: 0, to: 2, label: 'DHCPREQUEST (server-id S1)', token: 'R' });
      snap(`R — REQUEST: "I'd like ${offer} from Server 1."`, two ? 'The REQUEST is broadcast so Server 2 also sees it and releases its unused offer.' : 'The request is still broadcast, because the client has not confirmed its address yet.', 'offered', null, 'Server acknowledges.');
      msgs.push({ from: 1, to: 0, label: `DHCPACK ${offer}`, detail: `lease ${lease} h, router, DNS`, token: 'A' });
      snap(`A — ACK: the lease is confirmed; the client uses ${offer}.`, 'The client may send an ARP probe first to make sure nobody else uses the address.', 'leased', offer, inp.scenario === 'renew' ? 'Wait until T1.' : 'Done.', { T1: `${lease / 2} h (renew)`, T2: `${(lease * 0.875).toFixed(1)} h (rebind)` });
      if (inp.scenario === 'renew') {
        msgs.push({ note: `T1 = ${lease / 2} h (50% of lease)`, at: 0, tone: 'violet' });
        msgs.push({ from: 0, to: 1, label: 'DHCPREQUEST (renew)', detail: `unicast ${offer} → server`, token: 'R' });
        snap(`At T1 (${lease / 2} h) the client renews directly with its server.`, 'Renewal is unicast because the client already has a valid address.', 'leased', offer, 'Server extends the lease.');
        msgs.push({ from: 1, to: 0, label: 'DHCPACK (lease extended)', token: 'A' });
        snap(`The lease is extended for another ${lease} h.`, 'If the server did not answer, the client would broadcast at T2 (87.5%) to any server (rebinding).', 'leased', offer, 'Done.');
      }
      return frames;
    },
  };

  // ════════════════════ HTTP ════════════════════
  S['cn-http'] = {
    inputs: [
      { key: 'method', label: 'Method', type: 'select', default: 'GET', options: [['GET', 'GET'], ['POST', 'POST (submit a form)']] },
      { key: 'path', label: 'Path', type: 'text', default: '/index.html', max: 40 },
      { key: 'status', label: 'Server response', type: 'select', default: '200', options: [['200', '200 OK'], ['404', '404 Not Found'], ['301', '301 Moved Permanently'], ['304', '304 Not Modified (cached)']] },
      { key: 'version', label: 'Connection', type: 'select', default: '1.1', options: [['1.0', 'HTTP/1.0 non-persistent'], ['1.1', 'HTTP/1.1 persistent']] },
      { key: 'objects', label: 'Embedded objects (images)', type: 'number', default: 2, min: 0, max: 3 },
    ],
    build(inp) {
      const path = String(inp.path || '/index.html').trim() || '/'; if (!path.startsWith('/')) throw new Error('The path must start with /');
      const status = inp.status || '200'; const persistent = inp.version !== '1.0'; const objs = status === '200' ? Math.max(0, Math.min(3, Number(inp.objects) || 0)) : 0;
      const reason = { 200: 'OK', 404: 'Not Found', 301: 'Moved Permanently', 304: 'Not Modified' }[status];
      const actors = [{ name: 'Browser', sub: '192.168.1.10:51234' }, { name: 'Web server', sub: 'www.kpriet.ac.in:80' }];
      const msgs = []; const frames = []; let rtt = 0; let conns = 0;
      const reqText = (p) => [`${inp.method} ${p} HTTP/${inp.version}`, 'Host: www.kpriet.ac.in', 'User-Agent: Mozilla/5.0', 'Accept: text/html,image/*', persistent ? 'Connection: keep-alive' : 'Connection: close', ...(status === '304' && p === path ? ['If-Modified-Since: Mon, 21 Sep 2026 10:00:00 GMT'] : []), ...(inp.method === 'POST' && p === path ? ['Content-Type: application/x-www-form-urlencoded', 'Content-Length: 27', '', 'name=Aadarsh&dept=IT'] : [])];
      const respText = (p, st) => [`HTTP/${inp.version} ${st} ${{ 200: 'OK', 404: 'Not Found', 301: 'Moved Permanently', 304: 'Not Modified' }[st]}`, 'Date: Sun, 27 Sep 2026 09:00:00 GMT', 'Server: Apache/2.4', ...(st === '301' ? ['Location: https://www.kpriet.ac.in' + p] : []), ...(st === '200' ? [`Content-Type: ${p.endsWith('.png') ? 'image/png' : 'text/html'}`, 'Content-Length: 5120', 'Last-Modified: Mon, 21 Sep 2026 10:00:00 GMT'] : []), '', st === '200' ? (p.endsWith('.png') ? '<binary image data>' : '<html>…</html>') : st === '404' ? '<h1>Not Found</h1>' : ''];
      const snap = (title, why, lines, next, label) => frames.push(F(title, why, [seqPart(actors, msgs, [10, 6, 560, 548], 10), { type: 'callout', box: [585, 20, 405, 360], title: label || 'Message', lines, mono: true, lineH: 18 }], { Connection: persistent ? 'Persistent (HTTP/1.1)' : 'Non-persistent (HTTP/1.0)', 'TCP connections': conns, 'RTTs so far': rtt }, { 'Formula': persistent ? '2 RTT + 1 RTT per extra object' : '2 RTT per object' }, next));
      const openConn = () => { conns++; msgs.push({ from: 0, to: 1, label: 'SYN', token: 'SYN' }); msgs.push({ from: 1, to: 0, label: 'SYN+ACK', token: 'SYN+ACK' }); rtt++; snap(`Open TCP connection #${conns} to port 80 (SYN, SYN+ACK).`, 'HTTP runs over TCP, so a connection must be set up first — one round-trip time (RTT).', ['TCP 3-way handshake', 'Client → SYN', 'Server → SYN+ACK', 'Client → ACK (+ request)'], 'Send the request.', 'TCP'); };
      const fetch = (p, st, isMain) => {
        msgs.push({ from: 0, to: 1, label: `${isMain ? inp.method : 'GET'} ${p}`, detail: 'ACK + HTTP request', token: 'REQ' });
        snap(`Request: ${isMain ? inp.method : 'GET'} ${p} HTTP/${inp.version}.`, isMain ? (inp.method === 'POST' ? 'POST sends form data in the request body.' : 'GET asks for a resource; the request line has method, path and version, followed by headers.') + (st === '304' ? ' The If-Modified-Since header makes it a conditional GET.' : '') : 'The browser parses the HTML and requests each embedded object.', reqText(p), 'Server responds.', 'HTTP request');
        msgs.push({ from: 1, to: 0, label: `${st} ${{ 200: 'OK', 404: 'Not Found', 301: 'Moved', 304: 'Not Modified' }[st]}`, detail: st === '200' ? '5120 bytes' : 'no body', token: st, tone: st === '200' || st === '304' ? 'green' : 'red' }); rtt++;
        snap(`Response: ${st} ${{ 200: 'OK', 404: 'Not Found', 301: 'Moved Permanently', 304: 'Not Modified' }[st]}.`, { 200: 'Success — the body carries the requested object.', 404: 'The server has no resource at this path.', 301: 'The resource moved; the browser will follow the Location header.', 304: 'The cached copy is still fresh, so no body is sent — this saves bandwidth.' }[st], respText(p, st), persistent ? 'Next object on the same connection.' : 'The server closes the connection.', 'HTTP response');
        if (!persistent) { msgs.push({ from: 1, to: 0, label: 'FIN (close)', token: 'FIN', tone: 'grey' }); snap('HTTP/1.0: the connection is closed after one object.', 'Non-persistent HTTP needs a new TCP connection for every object — an extra RTT each time.', ['Connection: close'], 'Next object.', 'TCP'); }
      };
      openConn(); fetch(path, status, true);
      for (let k = 1; k <= objs; k++) { if (!persistent) openConn(); fetch(`/img/photo${k}.png`, '200', false); }
      frames.push(F(`Page loaded: ${1 + objs} object${objs ? 's' : ''}, ${conns} TCP connection${conns > 1 ? 's' : ''}, ${rtt} RTTs.`, persistent ? 'Persistent connections reuse one TCP connection, saving a handshake per object.' : `Non-persistent HTTP: 2 RTT × ${1 + objs} objects = ${2 * (1 + objs)} RTTs (plus transmission time).`, frames[frames.length - 1].scene, { 'Objects': 1 + objs, 'TCP connections': conns, RTTs: rtt }, {}, 'Done.'));
      return frames;
    },
  };

  // ════════════════════ FTP ════════════════════
  S['cn-ftp'] = {
    inputs: [
      { key: 'mode', label: 'Data connection mode', type: 'select', default: 'passive', options: [['passive', 'Passive (PASV)'], ['active', 'Active (PORT)']] },
      { key: 'cmd', label: 'Command', type: 'select', default: 'RETR', options: [['RETR', 'RETR — download a file'], ['STOR', 'STOR — upload a file'], ['LIST', 'LIST — directory listing']] },
      { key: 'file', label: 'File name', type: 'text', default: 'notes-unit5.pdf', max: 30 },
      { key: 'size', label: 'File size (KB)', type: 'number', default: 48, min: 1, max: 512 },
      { key: 'block', label: 'Block size shown (KB)', type: 'number', default: 16, min: 4, max: 128 },
    ],
    build(inp) {
      const file = String(inp.file || 'file.txt').replace(/[^\w.-]/g, '') || 'file.txt';
      const size = Math.max(1, Number(inp.size) || 48); const block = Math.max(4, Number(inp.block) || 16);
      const passive = inp.mode !== 'active'; const cmd = inp.cmd || 'RETR';
      const actors = [{ name: 'Client', sub: '192.168.1.10' }, { name: 'Server control', sub: 'port 21' }, { name: 'Server data', sub: passive ? 'port 50020' : 'port 20' }];
      const msgs = []; const frames = [];
      const snap = (title, why, next, st) => frames.push(F(title, why, [seqPart(actors, msgs, [10, 6, 980, 548], 11)], { Mode: passive ? 'Passive' : 'Active', 'Control connection': 'open (port 21)', 'Data connection': st || 'closed' }, { 'Data port': passive ? 'server 50020 (from 227 reply)' : 'client 50000 (from PORT)' }, next));
      msgs.push({ from: 0, to: 1, label: 'TCP connect → :21' }); msgs.push({ from: 1, to: 0, label: '220 Service ready' });
      snap('The client opens the control connection to port 21.', 'FTP uses two TCP connections: a control connection for commands (open for the whole session) and separate data connections for files.', 'Log in.');
      msgs.push({ from: 0, to: 1, label: 'USER student' }); msgs.push({ from: 1, to: 0, label: '331 Password required' });
      snap('USER student → 331.', 'Commands are plain text; replies start with a 3-digit code (2xx success, 3xx more needed, 4xx/5xx errors).', 'Send the password.');
      msgs.push({ from: 0, to: 1, label: 'PASS ••••••' }); msgs.push({ from: 1, to: 0, label: '230 Logged in' });
      snap('PASS → 230 User logged in.', 'Note: classic FTP sends the password in clear text; SFTP/FTPS encrypt it.', passive ? 'Ask for passive mode.' : 'Tell the server where to connect.');
      if (passive) { msgs.push({ from: 0, to: 1, label: 'PASV' }); msgs.push({ from: 1, to: 0, label: '227 Passive (…,195,100)', detail: 'port = 195×256+100 = 50020' }); snap('PASV → 227: the server opens port 50020 and tells the client.', 'In passive mode the CLIENT opens the data connection, which works through client-side firewalls and NAT.', 'Client connects for data.'); }
      else { msgs.push({ from: 0, to: 1, label: 'PORT 192,168,1,10,195,80', detail: 'client port 195×256+80 = 50000' }); msgs.push({ from: 1, to: 0, label: '200 PORT OK' }); snap('PORT → 200: the client tells the server its data port 50000.', 'In active mode the SERVER connects back from port 20 to the client — often blocked by client firewalls/NAT.', 'Send the command.'); }
      msgs.push({ from: 0, to: 1, label: `${cmd}${cmd === 'LIST' ? '' : ' ' + file}` });
      msgs.push(passive ? { from: 0, to: 2, label: 'TCP connect → :50020', tone: 'violet' } : { from: 2, to: 0, label: 'TCP connect :20 → :50000', tone: 'violet' });
      msgs.push({ from: 1, to: 0, label: '150 Opening data connection' });
      snap(`${cmd} → data connection opened (${passive ? 'client → server' : 'server → client'}), 150.`, 'Every transfer (and every directory listing) uses a new data connection.', 'Transfer the data.', 'open');
      const total = cmd === 'LIST' ? 2 : size; const bs = cmd === 'LIST' ? 2 : block; let done = 0; let k = 0;
      while (done < total && k < 8) {
        const len = Math.min(bs, total - done); done += len; k++;
        msgs.push(cmd === 'STOR' ? { from: 0, to: 2, label: `data ${len} KB (${done}/${total})`, tone: 'blue' } : { from: 2, to: 0, label: cmd === 'LIST' ? 'directory listing' : `data ${len} KB (${done}/${total})`, tone: 'blue' });
        snap(cmd === 'LIST' ? 'The directory listing is sent over the data connection.' : `Block ${k}: ${len} KB (${Math.round((100 * done) / total)}%).`, 'File contents never travel on the control connection — "out-of-band" control.', done < total ? 'Next block.' : 'Close the data connection.', 'transferring');
      }
      if (done < total) { msgs.push({ note: `… ${total - done} KB more …`, at: 0, tone: 'grey' }); }
      msgs.push({ from: cmd === 'STOR' ? 0 : 2, to: cmd === 'STOR' ? 2 : 0, label: 'FIN (end of data)', tone: 'grey' }); msgs.push({ from: 1, to: 0, label: '226 Transfer complete' });
      snap('The data connection closes; 226 Transfer complete.', 'Closing the data connection marks the end of the file (stream mode).', 'Quit.', 'closed');
      msgs.push({ from: 0, to: 1, label: 'QUIT' }); msgs.push({ from: 1, to: 0, label: '221 Goodbye' });
      snap('QUIT → 221; the control connection closes.', 'FTP keeps session state (current directory, login) on the control connection — it is a stateful protocol.', 'Done.');
      return frames;
    },
  };

  // ════════════════════ EMAIL ════════════════════
  S['cn-email'] = {
    inputs: [
      { key: 'from', label: 'From', type: 'text', default: 'alice@kpriet.ac.in', max: 40 },
      { key: 'to', label: 'To', type: 'text', default: 'bob@gmail.com', max: 40 },
      { key: 'subject', label: 'Subject', type: 'text', default: 'Unit 5 notes', max: 40 },
      { key: 'retrieve', label: 'Bob reads mail with', type: 'select', default: 'imap', options: [['imap', 'IMAP (mail stays on server)'], ['pop3', 'POP3 (download and delete)']] },
    ],
    build(inp, ctx) {
      const from = String(inp.from || '').trim(); const to = String(inp.to || '').trim();
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(from) || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to)) throw new Error('Enter valid e-mail addresses.');
      const fd = from.split('@')[1]; const td = to.split('@')[1];
      const actors = [{ name: "Alice's UA", sub: from }, { name: `smtp.${fd}`, sub: "Alice's mail server" }, { name: `mx.${td}`, sub: "Bob's mail server" }, { name: "Bob's UA", sub: to }];
      const msgs = []; const frames = [];
      const snap = (title, why, next, st) => frames.push(F(title, why, [{ ...seqPart(actors, msgs, [10, 6, 980, 548], 11), activeActors: st }], { From: from, To: to, Subject: inp.subject || '' }, { Protocols: 'SMTP 587/25 (push), IMAP 993 / POP3 995 (pull)' }, next));
      msgs.push({ from: 0, to: 1, label: 'SMTP submit (port 587)', detail: 'AUTH + message' });
      snap('Alice\'s user agent submits the e-mail to her mail server with SMTP.', 'SMTP is a PUSH protocol: the sender pushes mail to its server, and servers push mail to each other.', 'Find Bob\'s mail server.', [0, 1]);
      if (ctx.advanced) { msgs.push({ note: `DNS MX ${td} → mx.${td}`, at: 1, tone: 'violet' }); snap(`Alice's server looks up the MX record of ${td}.`, 'The DNS MX record names the mail server that accepts mail for a domain.', 'Open an SMTP session.', [1]); }
      const dialog = [[2, 1, '220 mx ready'], [1, 2, `EHLO smtp.${fd}`], [2, 1, '250 Hello'], [1, 2, `MAIL FROM:<${from}>`], [2, 1, '250 OK'], [1, 2, `RCPT TO:<${to}>`], [2, 1, '250 OK'], [1, 2, 'DATA'], [2, 1, '354 End data with .'], [1, 2, `Subject: ${inp.subject || ''} … .`], [2, 1, '250 Queued'], [1, 2, 'QUIT'], [2, 1, '221 Bye']];
      const whys = { 1: 'The client greets the server (EHLO also asks for extensions like TLS).', 3: 'Envelope sender.', 5: 'Envelope recipient — the server checks it has this mailbox.', 7: 'DATA starts the message: headers, a blank line, the body, then a line with a single "."', 9: 'The message headers and body are transferred as text.', 11: 'The session ends; Bob\'s server stores the mail in his mailbox.' };
      if (ctx.advanced) {
        dialog.forEach(([a, b, t], i) => { msgs.push({ from: a, to: b, label: t }); snap(`Server to server SMTP (port 25): ${t}`, whys[i] || 'Each command gets a numeric reply code.', 'Next command.', [1, 2]); });
      } else {
        msgs.push({ from: 1, to: 2, label: 'SMTP port 25: EHLO, MAIL FROM, RCPT TO, DATA', detail: '220 / 250 / 354 / 250 replies' });
        snap(`Alice's server relays the mail to mx.${td} with SMTP (port 25).`, 'The SMTP dialogue: EHLO → MAIL FROM → RCPT TO → DATA → message → "." → QUIT, each answered with a reply code (use Advanced view to see every command).', 'Mail is stored.', [1, 2]);
        msgs.push({ from: 2, to: 1, label: '250 Queued for delivery' });
        snap('Bob\'s server accepts the message and stores it in Bob\'s mailbox.', 'Delivery is complete even if Bob is offline — the mailbox holds the mail.', 'Bob checks his mail.', [1, 2]);
      }
      msgs.push({ note: 'stored in Bob\'s mailbox', at: 2, tone: 'green' });
      if (inp.retrieve === 'pop3') {
        [[3, 2, 'USER bob / PASS ••••'], [2, 3, '+OK logged in'], [3, 2, 'LIST'], [2, 3, '+OK 1 message'], [3, 2, 'RETR 1'], [2, 3, 'message text'], [3, 2, 'DELE 1'], [3, 2, 'QUIT']].forEach(([a, b, t], i) => { msgs.push({ from: a, to: b, label: `POP3: ${t}`, tone: 'blue' }); if (i % 2 === 1 || i >= 6) snap(`POP3: ${t}`, i === 7 ? 'POP3 (port 110/995) downloads mail to one device and usually deletes it from the server — simple, but mail is not synchronised across devices.' : 'POP3 is a PULL protocol: Bob\'s user agent fetches the mail.', i < 7 ? 'Continue.' : 'Done.', [2, 3]); });
      } else {
        [[3, 2, 'LOGIN bob ••••'], [2, 3, 'OK'], [3, 2, 'SELECT INBOX'], [2, 3, '* 1 EXISTS'], [3, 2, 'FETCH 1 BODY[]'], [2, 3, 'message text'], [3, 2, 'STORE 1 +FLAGS \\Seen'], [3, 2, 'LOGOUT']].forEach(([a, b, t], i) => { msgs.push({ from: a, to: b, label: `IMAP: ${t}`, tone: 'blue' }); if (i % 2 === 1 || i >= 6) snap(`IMAP: ${t}`, i === 7 ? 'IMAP (port 143/993) keeps mail and folders on the server, so every device sees the same mailbox and read/unread state.' : 'IMAP is a PULL protocol with folders and server-side state.', i < 7 ? 'Continue.' : 'Done.', [2, 3]); });
      }
      return frames;
    },
  };

  // ════════════════════ CLIENT-SERVER / P2P ════════════════════
  S['cn-client-server'] = {
    inputs: [
      { key: 'arch', label: 'Architecture', type: 'select', default: 'cs', options: [['cs', 'Client-server'], ['p2p', 'Peer-to-peer (file sharing)']] },
      { key: 'clients', label: 'Clients / peers', type: 'number', default: 3, min: 2, max: 4 },
      { key: 'server', label: 'Server design', type: 'select', default: 'concurrent', options: [['concurrent', 'Concurrent (thread per client)'], ['iterative', 'Iterative (one at a time)']], showIf: (i) => i.arch !== 'p2p' },
    ],
    build(inp) {
      const k = Math.max(2, Math.min(4, Number(inp.clients) || 3)); const frames = [];
      if (inp.arch === 'p2p') {
        const peers = Array.from({ length: k + 1 }, (_, i) => `P${i + 1}`); const chunks = 4;
        const have = peers.map((p, i) => new Set(i === 0 ? [0, 1, 2, 3] : []));
        const nodes = peers.map((p, i) => { const a = (2 * Math.PI * i) / peers.length - Math.PI / 2; return { id: p, label: p === 'P1' ? 'P1 (seed)' : p, x: 0.5 + 0.42 * Math.cos(a), y: 0.5 + 0.45 * Math.sin(a), kind: 'laptop' }; });
        const links = []; peers.forEach((a, i) => peers.slice(i + 1).forEach((b) => links.push({ a, b, dashed: true })));
        const tbl = () => peers.map((p, i) => [p, ...Array.from({ length: chunks }, (_, c) => (have[i].has(c) ? '■' : '·'))]);
        const snap = (title, why, pk, next) => frames.push(F(title, why, [{ type: 'topo', box: [10, 10, 560, 540], nodes: nodes.map((n, i) => ({ ...n, badge: `${have[i].size}/${chunks}`, badgeTone: 'violet' })), links, packets: pk }, { type: 'table', box: [590, 20, 400, 260], title: 'Chunks held (■)', cols: ['Peer', 'C1', 'C2', 'C3', 'C4'], rows: tbl() }], { Architecture: 'Peer-to-peer', Peers: peers.length, 'Chunks total': chunks }, { 'Upload capacity': 'grows with every peer' }, next));
        snap('Peer-to-peer: the file is split into 4 chunks; only P1 has them all.', 'In P2P every peer is both a client and a server — no always-on central server is needed.', [], 'Peers request chunks.');
        let round = 0;
        while (have.some((h) => h.size < chunks) && round < 20) {
          round++; const pk = [];
          peers.forEach((p, i) => { if (have[i].size === chunks) return; const need = [0, 1, 2, 3].find((c) => !have[i].has(c) && (c + round + i) % 2 === 0) ?? [0, 1, 2, 3].find((c) => !have[i].has(c)); const srcIdx = peers.findIndex((q, j) => j !== i && have[j].has(need) && pk.filter((x) => x.from === q).length < 1); if (srcIdx >= 0) { pk.push({ from: peers[srcIdx], to: p, label: `C${need + 1}` }); } });
          pk.forEach((x) => have[peers.indexOf(x.to)].add(Number(x.label.slice(1)) - 1));
          snap(`Round ${round}: ${pk.map((x) => `${x.from}→${x.to} ${x.label}`).join(', ')}.`, 'Peers upload chunks they already have to other peers, so the total upload capacity grows as more peers join (self-scalability).', pk, have.every((h) => h.size === chunks) ? 'Everyone has the file.' : 'Next round.');
        }
        frames.push(F(`All ${peers.length} peers have the complete file after ${round} rounds.`, 'Client-server distribution time grows linearly with the number of clients; P2P grows much more slowly because peers share the upload work.', frames[frames.length - 1].scene.map((p) => (p.type === 'topo' ? { ...p, packets: [] } : p)), { Rounds: round }, {}, 'Done.'));
        return frames;
      }
      const clients = Array.from({ length: k }, (_, i) => `C${i + 1}`); const concurrent = inp.server !== 'iterative';
      const nodes = [{ id: 'S', label: 'Server', sub: '10.0.0.5:8080', x: 0.5, y: 0.08, kind: 'server', r: 32 }, ...clients.map((c, i) => ({ id: c, label: `Client ${i + 1}`, sub: `192.168.1.${11 + i}:${50000 + i}`, x: 0.08 + (0.84 * i) / Math.max(1, k - 1), y: 0.95, kind: 'laptop' }))];
      const links = clients.map((c) => ({ a: c, b: 'S' }));
      const conns = []; const status = {};
      const tbl = () => conns.map((c) => [c, `192.168.1.${10 + Number(c.slice(1))}:${49999 + Number(c.slice(1))}`, '10.0.0.5:8080', status[c]]);
      const snap = (title, why, nd, pk, next) => frames.push(F(title, why, [{ type: 'topo', box: [10, 10, 560, 540], nodes: nodes.map((n) => ({ ...n, ...(nd[n.id] || {}) })), links: links.map((l) => ({ ...l, hl: pk.some((p) => p.from === l.a || p.to === l.a) })), packets: pk }, { type: 'table', box: [585, 20, 405, 260], title: 'Connections (socket 4-tuples)', cols: ['Client', 'Client socket', 'Server socket', 'State'], rows: tbl(), empty: '(no connections)' }], { Architecture: 'Client-server', 'Server design': concurrent ? 'Concurrent' : 'Iterative', Connections: conns.length }, { 'Listening socket': '10.0.0.5:8080 (LISTEN)' }, next));
      snap('The server creates a socket, binds to port 8080 and listens.', 'Client-server: an always-on server with a fixed address waits for requests; clients start the communication.', { S: { hl: true, badge: 'LISTEN', badgeTone: 'violet' } }, [], 'Clients connect.');
      clients.forEach((c) => { conns.push(c); status[c] = concurrent ? 'thread started' : c === 'C1' ? 'being served' : 'waiting in backlog'; });
      snap(`${k} clients connect at nearly the same time.`, 'Each accepted connection gets its own socket, identified by the 4-tuple (client IP, client port, server IP, server port) — so one server port can serve many clients.', Object.fromEntries(clients.map((c) => [c, { hl: true }])), clients.map((c) => ({ from: c, to: 'S', label: 'connect' })), concurrent ? 'The server serves them in parallel.' : 'The iterative server serves one at a time.');
      if (concurrent) {
        clients.forEach((c) => { status[c] = 'request handled'; });
        snap('Concurrent server: a thread (or process) per client handles all requests in parallel.', 'accept() hands each new connection to a worker; the main thread returns to listening. No client waits for another.', { S: { hl: true, badge: `${k} threads`, badgeTone: 'violet' } }, clients.map((c) => ({ from: 'S', to: c, label: 'response' })), 'Close connections.');
      } else {
        clients.forEach((c, i) => {
          status[c] = 'being served'; if (i > 0) status[clients[i - 1]] = 'closed';
          snap(`Iterative server handles ${c}; ${clients.slice(i + 1).join(', ') || 'no one'} ${clients.length - i - 1 === 1 ? 'waits' : 'wait'}.`, 'An iterative server finishes one client before accepting the next — simple, but clients queue up and wait.', { [c]: { hl: true } }, [{ from: 'S', to: c, label: 'response' }], i < k - 1 ? 'Next client.' : 'Close.');
        });
      }
      clients.forEach((c) => { status[c] = 'closed'; });
      snap('All requests served; connections closed.', concurrent ? 'Concurrent servers scale better for many simultaneous clients (at the cost of threads and memory).' : `The last client waited for ${k - 1} others — this is why busy servers are concurrent.`, {}, [], 'Done.');
      return frames;
    },
  };
})(typeof window !== 'undefined' ? window : globalThis);
