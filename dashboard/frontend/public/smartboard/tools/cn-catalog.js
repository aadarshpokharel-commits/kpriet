'use strict';

/*
 * Computer Networks (U21CSG05) — simulation library catalogue.
 * Single source for the CN engine (cn-simulation.html) and the Smart Board's
 * Simulation Lab. Organised Unit → Topic → Simulation.
 */
(function (root) {
  const UNITS = [
    { unit: 1, title: 'Introduction to Computer Networks' },
    { unit: 2, title: 'Data Link Layer' },
    { unit: 3, title: 'Network Layer' },
    { unit: 4, title: 'Transport Layer' },
    { unit: 5, title: 'Application Layer' },
  ];

  const SIMULATIONS = [
    // ── Unit 1 ──
    { id: 'cn-osi-model', unit: 1, topic: 'OSI Reference Model', title: 'OSI Model Visualizer', icon: '🧱', description: 'Follow a message down the 7 OSI layers, across the wire and back up — each layer adds or removes its header.' },
    { id: 'cn-tcpip-model', unit: 1, topic: 'TCP/IP Reference Model', title: 'TCP/IP Model Visualizer', icon: '🌐', description: 'Encapsulation through Application, Transport, Internet and Network Access layers for HTTP, DNS or SMTP.' },
    { id: 'cn-topology', unit: 1, topic: 'Network Topologies', title: 'Network Topology Visualizer', icon: '🕸️', description: 'Bus, star, ring, mesh and tree topologies, plus LAN / MAN / WAN scope and network components — send data and fail links.' },
    { id: 'cn-osi-vs-tcpip', unit: 1, topic: 'OSI vs TCP/IP', title: 'OSI vs TCP/IP Comparison', icon: '⚖️', description: 'Layer-by-layer mapping between the OSI and TCP/IP models with protocols and key differences.' },
    // ── Unit 2 ──
    { id: 'cn-framing', unit: 2, topic: 'Framing', title: 'Frame Formation Simulator', icon: '🧩', description: 'Character count, byte stuffing and bit stuffing — see every stuffed byte/bit added and removed.' },
    { id: 'cn-crc', unit: 2, topic: 'Error Detection', title: 'CRC Error Detection Simulator', icon: '🧮', description: 'CRC long division step by step, error injection at the receiver, and Hamming code error correction.' },
    { id: 'cn-stop-wait', unit: 2, topic: 'ARQ', title: 'Stop-and-Wait ARQ Simulator', icon: '⏱️', description: 'Alternating sequence numbers, timers, lost frames, lost ACKs and duplicate detection.' },
    { id: 'cn-sliding-window', unit: 2, topic: 'Flow Control', title: 'Sliding Window Simulator', icon: '🪟', description: 'Go-Back-N and Selective Repeat with a moving window, lost frames and retransmissions.' },
    { id: 'cn-ethernet-frame', unit: 2, topic: 'Ethernet', title: 'Ethernet Frame Visualizer', icon: '🔌', description: 'Build an IEEE 802.3 frame field by field, with padding and a real CRC-32 FCS.' },
    { id: 'cn-mac-address', unit: 2, topic: 'MAC Addressing', title: 'MAC Address Simulator', icon: '🏷️', description: 'OUI and NIC parts, unicast / multicast / broadcast bits, and how NICs accept or drop frames.' },
    { id: 'cn-arp', unit: 2, topic: 'ARP', title: 'ARP Request/Reply Simulator', icon: '📣', description: 'ARP cache miss, broadcast request, unicast reply and cache update — including off-subnet gateway lookups.' },
    { id: 'cn-switch', unit: 2, topic: 'Switching', title: 'Switch Forwarding Simulator', icon: '🔀', description: 'MAC learning, flooding, forwarding and filtering on a 4-port switch with a live MAC table.' },
    // ── Unit 3 ──
    { id: 'cn-ipv4-addressing', unit: 3, topic: 'IPv4 Addressing', title: 'IPv4 Addressing Simulator', icon: '🔢', description: 'Binary conversion, class, private/public range, network and broadcast addresses for any IPv4 address.' },
    { id: 'cn-subnetting', unit: 3, topic: 'Subnetting', title: 'Subnetting Visualizer', icon: '✂️', description: 'Fixed-length and VLSM subnetting with borrowed bits, block size and every subnet range.' },
    { id: 'cn-ip-packet', unit: 3, topic: 'IPv4 Packet Structure', title: 'IP Packet Structure Visualizer', icon: '📦', description: 'Every IPv4 header field with real values, including the header checksum calculation.' },
    { id: 'cn-packet-forwarding', unit: 3, topic: 'Packet Forwarding', title: 'Packet Forwarding Simulator', icon: '➡️', description: 'Longest-prefix match against a routing table, TTL decrement and output interface selection.' },
    { id: 'cn-routing-table', unit: 3, topic: 'Routing Tables', title: 'Routing Table Simulator', icon: '📋', description: 'Distance-vector routing: routers exchange tables round by round until every table converges.' },
    { id: 'cn-next-hop', unit: 3, topic: 'Routing', title: 'Router / Next-Hop Simulator', icon: '🛣️', description: 'Hop-by-hop forwarding: each router looks up the next hop; TTL expiry sends ICMP Time Exceeded.' },
    { id: 'cn-network-path', unit: 3, topic: 'Routing', title: 'Network Path Simulator', icon: '🗺️', description: "Dijkstra's shortest-path algorithm on a weighted network, then the packet follows the chosen path." },
    { id: 'cn-fragmentation', unit: 3, topic: 'Fragmentation', title: 'IP Fragmentation Simulator', icon: '🧱', description: 'Split a datagram for a smaller MTU — offsets, MF flag, lengths, reassembly and the DF bit.' },
    { id: 'cn-icmp-ping', unit: 3, topic: 'ICMP', title: 'ICMP Ping Simulator', icon: '📶', description: 'Echo request/reply with RTT and loss statistics, destination unreachable and time exceeded.' },
    // ── Unit 4 ──
    { id: 'cn-tcp-handshake', unit: 4, topic: 'Three-Way Handshake', title: 'TCP Three-Way Handshake Simulator', icon: '🤝', description: 'SYN, SYN+ACK, ACK with sequence numbers and TCP states — plus lost SYN and closed-port cases.' },
    { id: 'cn-tcp-termination', unit: 4, topic: 'TCP Connection', title: 'TCP Connection Termination Simulator', icon: '👋', description: 'Four-way FIN/ACK close with FIN_WAIT, CLOSE_WAIT, LAST_ACK and TIME_WAIT states, including half-close.' },
    { id: 'cn-tcp-segment', unit: 4, topic: 'TCP Segment', title: 'TCP Segment Visualizer', icon: '🧾', description: 'Ports, sequence and acknowledgement numbers, flags, window and checksum — field by field.' },
    { id: 'cn-tcp-vs-udp', unit: 4, topic: 'UDP', title: 'TCP vs UDP Comparison', icon: '⚖️', description: 'The same messages over TCP and UDP side by side — handshake, ACKs, loss, retransmission and ordering.' },
    { id: 'cn-tcp-sliding-window', unit: 4, topic: 'Reliable Data Transfer', title: 'TCP Sliding Window Simulator', icon: '🪟', description: 'Byte-stream send window: acknowledged, in flight, usable and not-yet-allowed bytes as ACKs arrive.' },
    { id: 'cn-flow-control', unit: 4, topic: 'Flow Control', title: 'TCP Flow Control Simulator', icon: '🚰', description: 'Receive buffer, advertised window (rwnd), zero-window and persist probes as the application reads.' },
    { id: 'cn-congestion-control', unit: 4, topic: 'Congestion Control', title: 'TCP Congestion Control Simulator', icon: '📈', description: 'Slow start, congestion avoidance, timeouts and triple duplicate ACKs for TCP Tahoe and Reno.' },
    { id: 'cn-retransmission', unit: 4, topic: 'Reliable Data Transfer', title: 'Packet Loss and Retransmission Simulator', icon: '🔁', description: 'Cumulative ACKs, duplicate ACKs, fast retransmit versus timeout, and RTO estimation.' },
    // ── Unit 5 ──
    { id: 'cn-dns', unit: 5, topic: 'DNS', title: 'DNS Resolution Simulator', icon: '📖', description: 'Iterative and recursive resolution through root, TLD and authoritative servers, with caching.' },
    { id: 'cn-dhcp', unit: 5, topic: 'DHCP', title: 'DHCP DORA Simulator', icon: '🎫', description: 'Discover, Offer, Request, Acknowledge — address pool, lease and renewal.' },
    { id: 'cn-http', unit: 5, topic: 'HTTP', title: 'HTTP Request/Response Simulator', icon: '🌍', description: 'TCP connection, request line and headers, status codes, and persistent vs non-persistent connections.' },
    { id: 'cn-ftp', unit: 5, topic: 'FTP', title: 'FTP File Transfer Simulator', icon: '📁', description: 'Control connection on port 21 and data connection in active or passive mode, block by block.' },
    { id: 'cn-email', unit: 5, topic: 'Email Protocols', title: 'Email Communication Simulator', icon: '✉️', description: 'SMTP dialogue between user agents and mail servers, then retrieval with POP3 or IMAP.' },
    { id: 'cn-client-server', unit: 5, topic: 'Application Layer Architecture', title: 'Client-Server Communication Simulator', icon: '🖧', description: 'Sockets, iterative and concurrent servers, and a client-server versus peer-to-peer comparison.' },
  ];

  const byId = {};
  SIMULATIONS.forEach((sim) => {
    sim.unitTitle = UNITS.find((u) => u.unit === sim.unit).title;
    byId[sim.id] = sim;
  });

  root.EduverseCNCatalog = Object.freeze({
    subject: { code: 'U21CSG05', name: 'Computer Networks', semester: 5, category: 'PCC', credits: 3, regulation: 'R2021 CBCS' },
    units: UNITS,
    simulations: SIMULATIONS,
    get: (id) => byId[id] || null,
  });
})(typeof window !== 'undefined' ? window : globalThis);
