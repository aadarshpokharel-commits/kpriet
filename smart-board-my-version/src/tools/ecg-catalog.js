/**
 * ecg-catalog.js
 * Digital Electronics (U21ECG01) — 46 Simulations Catalog
 * Regulation R2021 CBCS · Semester II · B.Tech IT · ESC
 *
 * 5 Units:
 * Unit I:   Boolean Theorems and Logic Reduction (Sims 1-8)
 * Unit II:  Combinational Logic Design (Sims 9-20)
 * Unit III: Latches and Flip-Flops (Sims 21-28)
 * Unit IV:  Sequential Circuits (Sims 29-40)
 * Unit V:   Registers and Hazards (Sims 41-46)
 */
(function (root, factory) {
  var exp = factory();
  if (typeof root !== 'undefined') root.EduverseECGCatalog = exp;
  if (typeof window !== 'undefined') window.EduverseECGCatalog = exp;
  if (typeof global !== 'undefined') global.EduverseECGCatalog = exp;
  if (typeof module === 'object' && module.exports) module.exports = exp;
  if (typeof define === 'function' && define.amd) define([], function () { return exp; });
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const UNITS = [
    { number: 1, title: 'Boolean Theorems and Logic Reduction', code: 'UNIT I' },
    { number: 2, title: 'Combinational Logic Design', code: 'UNIT II' },
    { number: 3, title: 'Latches and Flip-Flops', code: 'UNIT III' },
    { number: 4, title: 'Sequential Circuits', code: 'UNIT IV' },
    { number: 5, title: 'Registers and Hazards', code: 'UNIT V' }
  ];

  const SIMULATIONS = [
    // ══════════════════════════════════════════════════════════
    // UNIT I — BOOLEAN THEOREMS AND LOGIC REDUCTION
    // ══════════════════════════════════════════════════════════
    {
      id: 'de-number-system',
      unit: 1,
      unitTitle: 'Boolean Theorems and Logic Reduction',
      topic: 'Number Systems',
      title: 'Number System Simulator',
      icon: '🔢',
      flagship: false,
      tier: 1,
      description: 'Convert between Binary, Decimal, Octal, and Hexadecimal with step-by-step division/multiplication conversion traces.',
      formula: 'N_{10} = \\sum_{i} d_i \\cdot r^i',
      defaultParams: { inputBase: 10, outputBase: 2, inputValue: '42' },
      challenge: {
        goal: 'Convert the decimal number 173 to its binary, octal, and hexadecimal equivalents. Show all steps.',
        targetBinary: '10101101',
        targetOctal: '255',
        targetHex: 'AD'
      }
    },
    {
      id: 'de-complements',
      unit: 1,
      unitTitle: 'Boolean Theorems and Logic Reduction',
      topic: 'Complements',
      title: 'Complements Simulator',
      icon: '➖',
      flagship: false,
      tier: 2,
      description: "Visualize 1's complement (bit inversion) and 2's complement (invert + 1) operations with step-by-step binary representation.",
      formula: "1's: \\overline{N} \\quad | \\quad 2's: \\overline{N} + 1",
      defaultParams: { bits: 8, inputValue: '01010110' },
      challenge: {
        goal: "Find the 1's and 2's complement of the 8-bit binary number 01101010.",
        target1s: '10010101',
        target2s: '10010110'
      }
    },
    {
      id: 'de-boolean-theorem',
      unit: 1,
      unitTitle: 'Boolean Theorems and Logic Reduction',
      topic: 'Boolean Theorems',
      title: 'Boolean Theorem Visualizer',
      icon: '📜',
      flagship: false,
      tier: 1,
      description: 'Enter Boolean expressions, apply Boolean laws (Commutative, Associative, Distributive, De Morgan\'s, Absorption), and show each simplification step side-by-side.',
      formula: "\\overline{A \\cdot B} = \\overline{A} + \\overline{B} \\quad | \\quad A + A'B = A + B",
      defaultParams: { expression: "A·B + A·B' + A'·B" },
      challenge: {
        goal: "Simplify the Boolean expression F = AB + AB' + A'B using Boolean theorems. Show each law applied.",
        targetSimplified: 'A + B'
      }
    },
    {
      id: 'de-logic-gates',
      unit: 1,
      unitTitle: 'Boolean Theorems and Logic Reduction',
      topic: 'Logic Gates',
      title: 'Logic Gate Simulator ⭐ (Flagship)',
      icon: '🔲',
      flagship: true,
      tier: 0,
      description: 'Interactive AND, OR, NOT, NAND, NOR, XOR, XNOR gates. Change inputs and immediately see gate output, truth table row highlighting, and logic expression.',
      formula: 'AND: Y=A·B  |  OR: Y=A+B  |  NOT: Y=A\'  |  NAND: Y=(AB)\'  |  NOR: Y=(A+B)\'  |  XOR: Y=A⊕B',
      defaultParams: { gateType: 'AND', inputA: 0, inputB: 0 },
      challenge: {
        goal: 'Set the inputs to make each gate produce a HIGH output. Identify which gates produce HIGH for inputs A=1, B=0.',
        targetGates: ['OR', 'NAND', 'XOR', 'XNOR']
      }
    },
    {
      id: 'de-universal-gates',
      unit: 1,
      unitTitle: 'Boolean Theorems and Logic Reduction',
      topic: 'NAND/NOR Universal Gates',
      title: 'NAND/NOR Universal Gate Simulator',
      icon: '🔄',
      flagship: false,
      tier: 1,
      description: 'Demonstrate how NOT, AND, OR, XOR can be constructed using only NAND or only NOR gates with equivalent Boolean expression and circuit.',
      formula: 'NOT = NAND(A,A) | AND = NAND(NAND(A,B)) | OR = NAND(A\',B\')',
      defaultParams: { universalGate: 'NAND', targetGate: 'AND', inputA: 0, inputB: 0 },
      challenge: {
        goal: 'Build an OR gate using only NAND gates. Verify the truth table matches.',
        targetGate: 'OR'
      }
    },
    {
      id: 'de-sop-pos',
      unit: 1,
      unitTitle: 'Boolean Theorems and Logic Reduction',
      topic: 'SOP/POS Representation',
      title: 'SOP/POS Representation Simulator',
      icon: '📋',
      flagship: false,
      tier: 2,
      description: 'Enter a Boolean function and display Sum of Products (SOP), Product of Sums (POS), canonical forms, and the corresponding truth table.',
      formula: 'SOP: F = \\Sigma m(...)  |  POS: F = \\Pi M(...)',
      defaultParams: { variables: 3, minterms: '1,3,5,7' },
      challenge: {
        goal: 'Express F(A,B,C) = Σm(1,2,5,6) in both SOP and POS canonical forms.',
        targetSOP: "A'B'C + A'BC' + AB'C + ABC'",
        targetPOS: "(A+B+C)(A+B'+C')(A'+B+C')(A'+B'+C)"
      }
    },
    {
      id: 'de-kmap',
      unit: 1,
      unitTitle: 'Boolean Theorems and Logic Reduction',
      topic: 'K-Map Simplification',
      title: 'K-Map Simplification Simulator ⭐ (Flagship)',
      icon: '🗺️',
      flagship: true,
      tier: 0,
      description: 'Interactive Karnaugh Map: 2/3/4 variable K-Maps. Enter minterms/maxterms, populate the K-map, select groups interactively, visualize grouping, and generate simplified expression with Truth Table → K-Map → Grouping → Simplified Expression pipeline.',
      formula: 'F(A,B,C,D) = \\Sigma m(0,1,2,5,8,9,10) \\rightarrow \\text{Simplified SOP}',
      defaultParams: { variables: 4, minterms: '0,1,2,5,8,9,10', dontCares: '' },
      challenge: {
        goal: 'Simplify F(A,B,C,D) = Σm(0,2,5,7,8,10,13,15) using a 4-variable K-Map. Draw the groups and find the minimal SOP expression.',
        targetExpression: "B'D' + BD"
      }
    },
    {
      id: 'de-quine-mccluskey',
      unit: 1,
      unitTitle: 'Boolean Theorems and Logic Reduction',
      topic: 'Quine-McCluskey',
      title: 'Quine-McCluskey Simulator',
      icon: '🧮',
      flagship: false,
      tier: 1,
      description: 'Step-by-step Quine-McCluskey minimization: Minterms → Binary Representation → Grouping by 1-count → Prime Implicants → Essential Prime Implicants → Simplified Expression.',
      formula: 'Minterms \\rightarrow Groups \\rightarrow PI \\rightarrow EPI \\rightarrow F_{min}',
      defaultParams: { variables: 4, minterms: '0,1,2,5,6,7,8,9,10,14' },
      challenge: {
        goal: 'Use Quine-McCluskey to minimize F(A,B,C,D) = Σm(0,2,5,7,8,10,13,15). Find all prime implicants and essential prime implicants.',
        targetExpression: "B'D' + BD"
      }
    },

    // ══════════════════════════════════════════════════════════
    // UNIT II — COMBINATIONAL LOGIC DESIGN
    // ══════════════════════════════════════════════════════════
    {
      id: 'de-half-adder',
      unit: 2,
      unitTitle: 'Combinational Logic Design',
      topic: 'Half Adder',
      title: 'Half Adder Simulator',
      icon: '➕',
      flagship: false,
      tier: 1,
      description: 'Show inputs A, B, Sum (XOR), Carry (AND) with truth table and gate-level implementation diagram.',
      formula: 'Sum = A ⊕ B  |  Carry = A · B',
      defaultParams: { inputA: 0, inputB: 0 },
      challenge: {
        goal: 'Verify the half adder truth table by testing all 4 input combinations and recording Sum and Carry outputs.',
        targetRows: 4
      }
    },
    {
      id: 'de-full-adder',
      unit: 2,
      unitTitle: 'Combinational Logic Design',
      topic: 'Full Adder',
      title: 'Full Adder Simulator',
      icon: '➕',
      flagship: false,
      tier: 1,
      description: 'A, B, Carry-in → Sum, Carry-out with gate-level implementation showing two half adders and an OR gate.',
      formula: 'Sum = A ⊕ B ⊕ Cin  |  Cout = AB + Cin(A ⊕ B)',
      defaultParams: { inputA: 0, inputB: 0, carryIn: 0 },
      challenge: {
        goal: 'Find the input combination that produces Sum=1 and Carry-out=1 simultaneously.',
        targetA: 1, targetB: 1, targetCin: 1
      }
    },
    {
      id: 'de-adder-subtractor',
      unit: 2,
      unitTitle: 'Combinational Logic Design',
      topic: '1-Bit Adder/Subtractor',
      title: '1-Bit Adder/Subtractor Simulator',
      icon: '±',
      flagship: false,
      tier: 2,
      description: 'Interactive circuit supporting addition and subtraction with mode selection, carry/borrow visualization, and XOR-based B-complement control.',
      formula: 'Mode=0: Add | Mode=1: Subtract (B ⊕ M)',
      defaultParams: { inputA: 1, inputB: 1, mode: 0 },
      challenge: {
        goal: 'Perform both A+B and A-B for A=1, B=0 and verify the results.',
        targetAdd: { sum: 1, carry: 0 },
        targetSub: { diff: 1, borrow: 0 }
      }
    },
    {
      id: 'de-parallel-adder',
      unit: 2,
      unitTitle: 'Combinational Logic Design',
      topic: 'Parallel Adder',
      title: 'Parallel Adder Simulator',
      icon: '⊞',
      flagship: false,
      tier: 2,
      description: 'Connect multiple full-adder stages showing input bits, ripple carry propagation through each stage, output sum, and final carry.',
      formula: 'C_{i+1} = A_iB_i + C_i(A_i ⊕ B_i)',
      defaultParams: { bits: 4, inputA: '1011', inputB: '0110' },
      challenge: {
        goal: 'Add the 4-bit numbers 1011 (11) and 0110 (6). Trace the carry propagation through each stage.',
        targetSum: '10001'
      }
    },
    {
      id: 'de-twos-comp-adder',
      unit: 2,
      unitTitle: 'Combinational Logic Design',
      topic: "2's Complement Adder/Subtractor",
      title: "2's Complement Adder/Subtractor ⭐ (Flagship)",
      icon: '🔢',
      flagship: true,
      tier: 0,
      description: "Visualize subtraction using 2's complement: Input A, Input B → 2's Complement of B → Binary Addition → Result. Every binary operation shown step-by-step.",
      formula: "A - B = A + \\overline{B} + 1  \\quad (2's complement)",
      defaultParams: { bits: 4, inputA: '0111', inputB: '0011', operation: 'subtract' },
      challenge: {
        goal: "Compute 7 - 3 using 4-bit 2's complement arithmetic. Show all steps.",
        targetResult: '0100'
      }
    },
    {
      id: 'de-mux',
      unit: 2,
      unitTitle: 'Combinational Logic Design',
      topic: 'Multiplexer',
      title: 'Multiplexer Simulator ⭐ (Flagship)',
      icon: '🔀',
      flagship: true,
      tier: 0,
      description: 'Interactive 2:1 and 4:1 MUX. Change selection lines and see selected input, output, and internal signal path animation.',
      formula: '2:1 MUX: Y = S\'I_0 + SI_1  |  4:1 MUX: Y = S_1\'S_0\'I_0 + ...',
      defaultParams: { muxSize: 4, selectLines: '00', inputs: [1, 0, 1, 0] },
      challenge: {
        goal: 'Configure a 4:1 MUX to implement the function F(A,B) = Σm(1,2,3). Set the data inputs correctly.',
        targetInputs: [0, 1, 1, 1]
      }
    },
    {
      id: 'de-decoder',
      unit: 2,
      unitTitle: 'Combinational Logic Design',
      topic: 'Decoder',
      title: 'Decoder Simulator',
      icon: '📤',
      flagship: false,
      tier: 1,
      description: 'Interactive 2-to-4 and 3-to-8 decoder showing input combination, active output line, truth table, and internal AND gate logic.',
      formula: 'D_i = m_i(A_{n-1}, ..., A_0)',
      defaultParams: { decoderSize: 4, inputs: '00', enable: 1 },
      challenge: {
        goal: 'Which input combination activates output line D5 in a 3-to-8 decoder?',
        targetInput: '101'
      }
    },
    {
      id: 'de-encoder',
      unit: 2,
      unitTitle: 'Combinational Logic Design',
      topic: 'Encoder',
      title: 'Encoder Simulator',
      icon: '📥',
      flagship: false,
      tier: 2,
      description: 'Select an active input line and see the corresponding encoded binary output. Priority encoder handles multiple active inputs.',
      formula: '8-to-3 Encoder: A_2A_1A_0 = f(D_7...D_0)',
      defaultParams: { encoderSize: 8, activeInput: 5, priority: true },
      challenge: {
        goal: 'In an 8-to-3 priority encoder with D7=0, D5=1, D3=1, what is the output?',
        targetOutput: '101'
      }
    },
    {
      id: 'de-demux',
      unit: 2,
      unitTitle: 'Combinational Logic Design',
      topic: 'Demultiplexer',
      title: 'Demultiplexer Simulator',
      icon: '🔀',
      flagship: false,
      tier: 2,
      description: 'Show input, select lines, active output, and signal path animation. 1-to-4 and 1-to-8 DEMUX configurations.',
      formula: 'Y_i = I · m_i(S)',
      defaultParams: { demuxSize: 4, input: 1, selectLines: '10' },
      challenge: {
        goal: 'Route a HIGH input to output Y2 in a 1-to-4 DEMUX. What select line values are needed?',
        targetSelect: '10'
      }
    },
    {
      id: 'de-code-converter',
      unit: 2,
      unitTitle: 'Combinational Logic Design',
      topic: 'Code Converter',
      title: 'Code Converter Simulator',
      icon: '🔄',
      flagship: false,
      tier: 2,
      description: 'Interactive conversion environment: BCD ↔ Excess-3, BCD ↔ Gray Code, Binary ↔ Gray with truth table and conversion logic.',
      formula: 'Gray: G_i = B_i ⊕ B_{i+1}  |  Binary: B_i = G_i ⊕ B_{i+1}',
      defaultParams: { conversionType: 'binary-to-gray', inputCode: '1011' },
      challenge: {
        goal: 'Convert the binary code 1101 to Gray code. Show the XOR operations at each bit position.',
        targetGray: '1011'
      }
    },
    {
      id: 'de-error-detection',
      unit: 2,
      unitTitle: 'Combinational Logic Design',
      topic: 'Error Detection and Correction',
      title: 'Error Detection & Correction Code Simulator',
      icon: '🛡️',
      flagship: false,
      tier: 1,
      description: 'Interactive data transmission: Data → Hamming Encoding → Transmission → Error Injection → Detection / Correction → Recovered Data.',
      formula: 'Hamming(7,4): 2^r ≥ m + r + 1',
      defaultParams: { dataWord: '1011', errorBit: -1, codeType: 'hamming' },
      challenge: {
        goal: 'Encode the data word 1011 using Hamming(7,4) code, inject an error at bit position 5, and correct it using the syndrome.',
        targetSyndrome: '101'
      }
    },
    {
      id: 'de-parity',
      unit: 2,
      unitTitle: 'Combinational Logic Design',
      topic: 'Parity Generator/Checker',
      title: 'Parity Generator & Checker ⭐ (Flagship)',
      icon: '✓',
      flagship: true,
      tier: 0,
      description: 'Even and Odd parity: Enter data bits, see generated parity bit, transmitted data, insert errors, receive data, check parity, and error indication.',
      formula: 'Even Parity: P = D_3 ⊕ D_2 ⊕ D_1 ⊕ D_0',
      defaultParams: { dataBits: '1011', parityType: 'even', errorBit: -1 },
      challenge: {
        goal: 'Generate even parity for data 1010, transmit it, flip bit 2, and verify the parity checker detects the error.',
        targetParity: 0,
        targetDetection: true
      }
    },

    // ══════════════════════════════════════════════════════════
    // UNIT III — LATCHES AND FLIP-FLOPS
    // ══════════════════════════════════════════════════════════
    {
      id: 'de-nor-latch',
      unit: 3,
      unitTitle: 'Latches and Flip-Flops',
      topic: 'NOR Latch',
      title: 'NOR Latch Simulator',
      icon: '🔒',
      flagship: false,
      tier: 1,
      description: 'Interactive SR latch using cross-coupled NOR gates. Show S, R, Q, Q̅, state changes, invalid state, and complete truth table.',
      formula: 'Q_{n+1} = S + R\'Q_n  |  Invalid: S=R=1',
      defaultParams: { S: 0, R: 0, Q: 0 },
      challenge: {
        goal: 'Starting from Q=0, apply Set (S=1, R=0) then Reset (S=0, R=1). Record Q after each operation.',
        targetSequence: [1, 0]
      }
    },
    {
      id: 'de-nand-latch',
      unit: 3,
      unitTitle: 'Latches and Flip-Flops',
      topic: 'NAND Latch',
      title: 'NAND Latch Simulator',
      icon: '🔒',
      flagship: false,
      tier: 1,
      description: 'Interactive NAND-based S̅R̅ latch with active-low inputs, cross-coupled gate visualization, and state transition table.',
      formula: "Q_{n+1} = S' · (R + Q_n)'  |  Invalid: S̅=R̅=0",
      defaultParams: { Sbar: 1, Rbar: 1, Q: 0 },
      challenge: {
        goal: 'Demonstrate the latch memory property: Set the latch, then return both inputs to inactive (1,1) and verify Q holds.',
        targetHold: true
      }
    },
    {
      id: 'de-digital-pulse',
      unit: 3,
      unitTitle: 'Latches and Flip-Flops',
      topic: 'Digital Pulses',
      title: 'Digital Pulse Simulator',
      icon: '⏱️',
      flagship: false,
      tier: 2,
      description: 'Interactive clock/pulse generator with adjustable frequency and duty cycle. Visual timing waveform showing period, rise/fall edges.',
      formula: 'T = 1/f  |  Duty Cycle = t_{ON}/T × 100%',
      defaultParams: { frequency: 1000, dutyCycle: 50 },
      challenge: {
        goal: 'Generate a 2 kHz clock with 25% duty cycle. Calculate the ON and OFF times.',
        targetPeriod: 0.5,
        targetOnTime: 0.125
      }
    },
    {
      id: 'de-clocked-ff',
      unit: 3,
      unitTitle: 'Latches and Flip-Flops',
      topic: 'Clocked Flip-Flops',
      title: 'Clocked Flip-Flop Simulator',
      icon: '🔄',
      flagship: false,
      tier: 1,
      description: 'Interactive SR, D, JK, and T flip-flops with clock edge triggering. Show clock, inputs, outputs, state changes, and timing diagram.',
      formula: 'SR: Q=S+R\'Q | D: Q=D | JK: Q=JQ\'+K\'Q | T: Q=TQ\'+T\'Q',
      defaultParams: { ffType: 'D', D: 1, clock: 0, trigger: 'rising' },
      challenge: {
        goal: 'Observe a D flip-flop: Set D=1, apply a rising clock edge, then set D=0 and apply another edge. What are the outputs?',
        targetOutputs: [1, 0]
      }
    },
    {
      id: 'de-master-slave',
      unit: 3,
      unitTitle: 'Latches and Flip-Flops',
      topic: 'Master-Slave Flip-Flop',
      title: 'Master-Slave Flip-Flop ⭐ (Flagship)',
      icon: '🔐',
      flagship: true,
      tier: 0,
      description: 'Visualize Master → Slave → Output: Master captures on clock HIGH, Slave transfers on clock LOW. Shows how the two stages prevent race conditions.',
      formula: 'Master loads @ CLK↑, Slave outputs @ CLK↓',
      defaultParams: { ffType: 'JK', J: 1, K: 0, clock: 0 },
      challenge: {
        goal: 'Demonstrate how Master-Slave JK eliminates the race-around problem. Apply J=K=1 and trace through one full clock cycle.',
        targetToggle: true
      }
    },
    {
      id: 'de-async-inputs',
      unit: 3,
      unitTitle: 'Latches and Flip-Flops',
      topic: 'Asynchronous Inputs',
      title: 'Asynchronous Inputs Simulator',
      icon: '⚡',
      flagship: false,
      tier: 2,
      description: 'Demonstrate Preset and Clear asynchronous input behavior that overrides clock-controlled operation.',
      formula: 'PRE=0: Q→1 (async) | CLR=0: Q→0 (async)',
      defaultParams: { preset: 1, clear: 1, D: 0, clock: 0 },
      challenge: {
        goal: 'Force the flip-flop to Q=1 using Preset without a clock edge, then clear it using Clear.',
        targetPreset: 1,
        targetClear: 0
      }
    },
    {
      id: 'de-ff-timing',
      unit: 3,
      unitTitle: 'Latches and Flip-Flops',
      topic: 'Flip-Flop Timing',
      title: 'Flip-Flop Timing Simulator',
      icon: '📊',
      flagship: false,
      tier: 1,
      description: 'Interactive timing diagrams showing Clock, Input, Output, propagation delay, setup time, hold time, and timing relationships.',
      formula: 't_{setup} + t_{hold} < T_{clk}',
      defaultParams: { ffType: 'D', clockPeriod: 100, propDelay: 10, setupTime: 5, holdTime: 3 },
      challenge: {
        goal: 'Given setup time = 5ns and hold time = 3ns, what is the minimum clock period for reliable operation?',
        targetMinPeriod: 15
      }
    },
    {
      id: 'de-ff-conversion',
      unit: 3,
      unitTitle: 'Latches and Flip-Flops',
      topic: 'Flip-Flop Conversion',
      title: 'Flip-Flop Conversion Simulator',
      icon: '🔄',
      flagship: false,
      tier: 2,
      description: 'Convert between SR, D, JK, T flip-flop types. Show existing FF → required logic → converted FF → verification truth table.',
      formula: 'D→JK: J=D, K=D\'  |  JK→D: D=JQ\'+K\'Q',
      defaultParams: { sourceFF: 'SR', targetFF: 'JK' },
      challenge: {
        goal: 'Convert an SR flip-flop into a JK flip-flop. Derive the combinational logic needed and verify with the excitation table.',
        targetLogic: 'S=JQ\', R=KQ'
      }
    },

    // ══════════════════════════════════════════════════════════
    // UNIT IV — SEQUENTIAL CIRCUITS
    // ══════════════════════════════════════════════════════════
    {
      id: 'de-seq-model',
      unit: 4,
      unitTitle: 'Sequential Circuits',
      topic: 'Sequential Circuit Model',
      title: 'Sequential Circuit Model Visualizer',
      icon: '🔁',
      flagship: false,
      tier: 2,
      description: 'General sequential circuit model: Input → Combinational Logic → State/Memory → Output. Visualize feedback and state relationships.',
      formula: 'Next State: Q(t+1) = f(Input, Q(t))  |  Output: Y = g(Input, Q(t))',
      defaultParams: { modelType: 'mealy' },
      challenge: {
        goal: 'Identify the components of a sequential circuit: combinational logic, memory elements, and feedback paths.',
        targetComponents: ['combinational logic', 'flip-flops', 'feedback']
      }
    },
    {
      id: 'de-mealy',
      unit: 4,
      unitTitle: 'Sequential Circuits',
      topic: 'Mealy Machine',
      title: 'Mealy Machine Simulator',
      icon: '🤖',
      flagship: false,
      tier: 1,
      description: 'Create a simple Mealy state machine: define states, inputs, outputs on transitions, and trace current state with input sequences.',
      formula: 'Output = f(State, Input)',
      defaultParams: { states: 3, inputSequence: '10110', currentState: 'S0' },
      challenge: {
        goal: 'Design a Mealy machine that outputs 1 whenever the input sequence "10" is detected.',
        targetOutputSequence: '01000'
      }
    },
    {
      id: 'de-moore',
      unit: 4,
      unitTitle: 'Sequential Circuits',
      topic: 'Moore Machine',
      title: 'Moore Machine Simulator',
      icon: '🤖',
      flagship: false,
      tier: 1,
      description: 'Create a Moore state machine: define states with associated outputs, transitions based on inputs, and trace state/output sequences.',
      formula: 'Output = f(State only)',
      defaultParams: { states: 3, inputSequence: '10110', currentState: 'S0' },
      challenge: {
        goal: 'Design a Moore machine equivalent to the Mealy machine that detects "10". Compare output timing.',
        targetStates: 4
      }
    },
    {
      id: 'de-excitation-table',
      unit: 4,
      unitTitle: 'Sequential Circuits',
      topic: 'Excitation Table',
      title: 'Excitation Table Simulator',
      icon: '📋',
      flagship: false,
      tier: 2,
      description: 'Select a flip-flop type (SR, D, JK, T) and display its excitation table showing required inputs for each state transition.',
      formula: 'JK: Q→Q+: 0→0: J=0,K=X | 0→1: J=1,K=X | 1→0: J=X,K=1 | 1→1: J=X,K=0',
      defaultParams: { ffType: 'JK' },
      challenge: {
        goal: 'Complete the excitation table for a T flip-flop. What T input is needed for transition Q=1→Q+=0?',
        targetT: 1
      }
    },
    {
      id: 'de-state-table',
      unit: 4,
      unitTitle: 'Sequential Circuits',
      topic: 'State Table / State Diagram',
      title: 'State Table & State Diagram Simulator',
      icon: '📊',
      flagship: false,
      tier: 1,
      description: 'Create states, define transitions, enter outputs, generate state table and interactive state diagram with animated transitions.',
      formula: 'State Table: Present State × Input → Next State, Output',
      defaultParams: { states: ['S0','S1','S2'], inputs: ['0','1'] },
      challenge: {
        goal: 'Create a state table for a sequence detector that identifies "101" in a serial bit stream.',
        targetStates: 4
      }
    },
    {
      id: 'de-sync-design',
      unit: 4,
      unitTitle: 'Sequential Circuits',
      topic: 'Synchronous Sequential Circuit Design',
      title: 'Synchronous Sequential Circuit Designer ⭐ (Flagship)',
      icon: '⚙️',
      flagship: true,
      tier: 0,
      description: 'Interactive workflow: Problem → State Definition → State Table → Excitation Table → Logic Simplification (K-Map) → Circuit → Simulation.',
      formula: 'State Assignment → Excitation → K-Map → Gate Network',
      defaultParams: { problem: 'mod-4-counter', ffType: 'JK' },
      challenge: {
        goal: 'Design a synchronous MOD-4 up counter using JK flip-flops. Follow the complete design procedure from state table to circuit.',
        targetStates: 4
      }
    },
    {
      id: 'de-sync-up',
      unit: 4,
      unitTitle: 'Sequential Circuits',
      topic: 'Synchronous Up Counter',
      title: 'Synchronous Up Counter',
      icon: '⬆️',
      flagship: false,
      tier: 1,
      description: 'Interactive counter showing clock, current state, binary count, flip-flop states, and timing sequence for synchronous up counting.',
      formula: 'Count: 0→1→2→...→2^n-1→0',
      defaultParams: { bits: 3, currentCount: 0 },
      challenge: {
        goal: 'Trace a 3-bit synchronous up counter through all 8 states. Record Q2Q1Q0 after each clock pulse.',
        targetSequence: [0,1,2,3,4,5,6,7]
      }
    },
    {
      id: 'de-sync-down',
      unit: 4,
      unitTitle: 'Sequential Circuits',
      topic: 'Synchronous Down Counter',
      title: 'Synchronous Down Counter',
      icon: '⬇️',
      flagship: false,
      tier: 2,
      description: 'Reverse counting sequence with clock, state, and timing visualization. Shows J/K inputs for down-counting logic.',
      formula: 'Count: 2^n-1→...→2→1→0→2^n-1',
      defaultParams: { bits: 3, currentCount: 7 },
      challenge: {
        goal: 'Trace a 3-bit synchronous down counter from 111 back to 000.',
        targetSequence: [7,6,5,4,3,2,1,0]
      }
    },
    {
      id: 'de-sync-updown',
      unit: 4,
      unitTitle: 'Sequential Circuits',
      topic: 'Synchronous Up/Down Counter',
      title: 'Synchronous Up/Down Counter',
      icon: '↕️',
      flagship: false,
      tier: 2,
      description: 'Up/Down control input changes counting direction immediately. Visualize mode switching and bidirectional counting.',
      formula: 'M=0: Up Count | M=1: Down Count',
      defaultParams: { bits: 3, mode: 'up', currentCount: 0 },
      challenge: {
        goal: 'Count up from 0 to 4, then switch to down mode and count back to 0. Record the sequence.',
        targetSequence: [0,1,2,3,4,3,2,1,0]
      }
    },
    {
      id: 'de-mod-counter',
      unit: 4,
      unitTitle: 'Sequential Circuits',
      topic: 'Modulus Counter',
      title: 'Modulus Counter Simulator',
      icon: '🔟',
      flagship: false,
      tier: 1,
      description: 'Select a modulus (MOD-N). Show state sequence, counter states, reset condition, and identify unused states.',
      formula: 'MOD-N: N states (0 to N-1), reset at count N',
      defaultParams: { modulus: 10, bits: 4, currentCount: 0 },
      challenge: {
        goal: 'Design a MOD-6 counter. Identify which states are used and which are unused in a 3-bit counter.',
        targetUsed: [0,1,2,3,4,5],
        targetUnused: [6,7]
      }
    },
    {
      id: 'de-async-counter',
      unit: 4,
      unitTitle: 'Sequential Circuits',
      topic: 'Asynchronous Counter',
      title: 'Asynchronous (Ripple) Counter Simulator',
      icon: '🌊',
      flagship: false,
      tier: 1,
      description: 'Visualize ripple propagation through cascaded flip-flops. Clock enters first stage, state changes ripple through subsequent stages with propagation delay.',
      formula: 'Total Delay = n × t_{pd}  |  f_{max} = 1/(n × t_{pd})',
      defaultParams: { bits: 4, currentCount: 0, propDelay: 10 },
      challenge: {
        goal: 'For a 4-bit ripple counter with 10ns propagation delay per flip-flop, what is the maximum clock frequency?',
        targetMaxFreq: 25
      }
    },
    {
      id: 'de-sequence-detector',
      unit: 4,
      unitTitle: 'Sequential Circuits',
      topic: 'Sequence Detector',
      title: 'Sequence Detector ⭐ (Flagship)',
      icon: '🔍',
      flagship: true,
      tier: 0,
      description: 'Enter a target sequence (e.g., 1011). Create the state-machine visualization with state diagram, input stream, current state, transitions, and detection output.',
      formula: 'Target: 1011 → States: S0→S1→S10→S101→S1011(detect)',
      defaultParams: { targetSequence: '1011', inputStream: '11011011010', overlap: true },
      challenge: {
        goal: 'Design an overlapping sequence detector for "1011". Apply the input stream 11011011010 and mark all detection points.',
        targetDetections: [5, 9]
      }
    },

    // ══════════════════════════════════════════════════════════
    // UNIT V — REGISTERS AND HAZARDS
    // ══════════════════════════════════════════════════════════
    {
      id: 'de-shift-register',
      unit: 5,
      unitTitle: 'Registers and Hazards',
      topic: 'Shift Registers',
      title: 'Shift Register Simulator ⭐ (Flagship)',
      icon: '➡️',
      flagship: true,
      tier: 0,
      description: 'Interactive SISO, SIPO, PISO, PIPO shift register. Visualize data movement through Q3→Q2→Q1→Q0 on every clock pulse. Support left/right shift.',
      formula: 'Q_i(t+1) = Q_{i-1}(t)  (right shift)',
      defaultParams: { type: 'SIPO', bits: 4, direction: 'right', serialInput: 1, data: '0000' },
      challenge: {
        goal: 'Load the serial data 1011 into a 4-bit SIPO shift register. Show the register state after each clock pulse.',
        targetFinal: '1011'
      }
    },
    {
      id: 'de-ring-counter',
      unit: 5,
      unitTitle: 'Registers and Hazards',
      topic: 'Ring Counter',
      title: 'Ring Counter Simulator',
      icon: '🔁',
      flagship: false,
      tier: 1,
      description: 'Circulating bit pattern (single 1 among 0s) through the register. Visualize the walking 1 with timing diagram.',
      formula: 'Q_0→Q_1→Q_2→Q_3→Q_0 (MOD-N, N states)',
      defaultParams: { bits: 4, initialState: '1000' },
      challenge: {
        goal: 'Starting with 1000, trace a 4-bit ring counter through all 4 unique states.',
        targetSequence: ['1000', '0100', '0010', '0001']
      }
    },
    {
      id: 'de-johnson-counter',
      unit: 5,
      unitTitle: 'Registers and Hazards',
      topic: 'Johnson Counter',
      title: 'Johnson Counter Simulator',
      icon: '🔄',
      flagship: false,
      tier: 1,
      description: 'Inverted feedback (Q̅_last → Q_first) mechanism with 2N unique states from N flip-flops. Show state sequence and decode logic.',
      formula: "Q_0(t+1) = Q'_{n-1}(t)  →  2N states from N FFs",
      defaultParams: { bits: 4, currentState: '0000' },
      challenge: {
        goal: 'Trace a 4-bit Johnson counter through all 8 unique states starting from 0000.',
        targetSequence: ['0000','1000','1100','1110','1111','0111','0011','0001']
      }
    },
    {
      id: 'de-hazard',
      unit: 5,
      unitTitle: 'Registers and Hazards',
      topic: 'Hazards',
      title: 'Hazard Simulator ⭐ (Flagship)',
      icon: '⚠️',
      flagship: true,
      tier: 0,
      description: 'Interactive static and dynamic hazard demonstration: input transition, propagation delay through different gate paths, temporary unwanted output glitch.',
      formula: 'Static-1 Hazard: Output should stay 1 but momentarily drops to 0',
      defaultParams: { expression: 'AB + AC\'', transitionVar: 'C', delay: 5 },
      challenge: {
        goal: 'Identify the static-1 hazard in F = AB + AC\' when A=1, B=1, and C transitions from 1→0.',
        targetHazardType: 'static-1'
      }
    },
    {
      id: 'de-essential-hazard',
      unit: 5,
      unitTitle: 'Registers and Hazards',
      topic: 'Essential Hazards',
      title: 'Essential Hazard Simulator',
      icon: '⚠️',
      flagship: false,
      tier: 2,
      description: 'Demonstrate essential hazards in asynchronous sequential circuits caused by unequal delays in feedback paths.',
      formula: 'Essential hazard: 3 consecutive changes on one input cause incorrect state transition',
      defaultParams: { circuit: 'sr-latch', unequalDelay: true },
      challenge: {
        goal: 'Show how unequal feedback delays in an SR latch can cause an essential hazard.',
        targetCause: 'unequal feedback delay'
      }
    },
    {
      id: 'de-hazard-free',
      unit: 5,
      unitTitle: 'Registers and Hazards',
      topic: 'Hazard-Free Circuits',
      title: 'Hazard-Free Circuit Designer',
      icon: '✅',
      flagship: false,
      tier: 1,
      description: 'Modify logic circuits to remove hazards: Hazardous Circuit → Identify Hazard → Add Redundant Logic (consensus term) → Hazard-Free Circuit → Verify.',
      formula: 'F = AB + AC\' + BC (consensus term BC removes hazard)',
      defaultParams: { originalExpr: 'AB + AC\'', consensusTerm: 'BC' },
      challenge: {
        goal: 'Remove the static-1 hazard from F = AB + AC\' by adding the consensus term. Verify the hazard is eliminated.',
        targetFixedExpr: 'AB + AC\' + BC'
      }
    }
  ];

  /* ═══════════════════════════════════════════════════════════
     PUBLIC API
     ═══════════════════════════════════════════════════════════ */
  return {
    UNITS: UNITS,
    SIMULATIONS: SIMULATIONS,

    getUnits: function () { return UNITS; },

    getSimulationsForUnit: function (unitNumber) {
      return SIMULATIONS.filter(function (s) { return s.unit === unitNumber; });
    },

    getSimulationById: function (id) {
      return SIMULATIONS.find(function (s) { return s.id === id; }) || null;
    },

    getFlagshipSimulations: function () {
      return SIMULATIONS.filter(function (s) { return s.flagship; });
    },

    getAllSimulations: function () { return SIMULATIONS; },

    getSimulationCount: function () { return SIMULATIONS.length; },

    getUnitTitle: function (unitNumber) {
      var u = UNITS.find(function (u) { return u.number === unitNumber; });
      return u ? u.title : '';
    }
  };
}));
