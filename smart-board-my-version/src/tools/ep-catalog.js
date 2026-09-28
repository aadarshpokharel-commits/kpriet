'use strict';

/*
 * Engineering Physics (U21PH101) — simulation catalogue.
 * Organised Semester I → Engineering Physics → Unit → Topic → Simulation.
 * Keep in sync with dashboard/frontend/src/simulations/registry.ts (EP_BOARD_SIMULATIONS)
 * and dashboard/backend/src/constants/simulations.catalog.ts.
 */
(function () {
  const subject = { name: 'Engineering Physics', code: 'U21PH101', semester: 1, department: 'Information Technology', regulation: 'R2021 CBCS', category: 'BSC', credits: 3 };
  const units = [
    { unit: 1, title: 'LASER', subtype: 'laser' },
    { unit: 2, title: 'Fiber Optics', subtype: 'fiber-optics' },
    { unit: 3, title: 'Ultrasonics', subtype: 'ultrasonics' },
    { unit: 4, title: 'Thermal Physics and Fluids', subtype: 'thermal-fluids' },
    { unit: 5, title: 'Crystal Physics', subtype: 'crystal-physics' },
  ];
  // [id, unit, topic, title, icon, description]
  const rows = [
    ['ep-absorption', 1, 'Absorption', 'Absorption and Energy Level Simulator', '⬆️', 'A photon whose energy matches E₂ − E₁ lifts an atom to the excited level; other photons pass through.'],
    ['ep-spontaneous-emission', 1, 'Spontaneous Emission', 'Spontaneous Emission Simulator', '✨', 'Excited atoms decay on their own after a random time and emit photons in random directions and phases.'],
    ['ep-stimulated-emission', 1, 'Stimulated Emission', 'Stimulated Emission Simulator', '🔆', 'An incoming photon triggers an excited atom to emit an identical photon — same energy, direction and phase.'],
    ['ep-population-inversion', 1, 'Population Inversion', 'Population Inversion Visualizer', '📊', 'Compare level populations in thermal equilibrium (Boltzmann) with an inverted, pumped medium.'],
    ['ep-pumping', 1, 'Pumping', 'Laser Pumping Simulator', '⚡', 'Optical, electrical and chemical pumping in a three-level and four-level scheme, with pump rate against threshold.'],
    ['ep-laser-cavity', 1, 'Laser Cavity', 'Laser Cavity Simulator', '🪞', 'Light bounces between two mirrors, is amplified on every pass and part of it leaves through the output coupler.'],
    ['ep-co2-laser', 1, 'CO₂ Laser', 'CO₂ Laser Conceptual Simulator', '🟥', 'N₂ is excited by the discharge and transfers energy to CO₂; the 10.6 µm transition produces the infrared beam.'],
    ['ep-semiconductor-laser', 1, 'Semiconductor Laser', 'Semiconductor Laser Simulator', '🔴', 'Forward-biased p–n junction: electron–hole recombination, threshold current and the emitted wavelength λ = hc/Eg.'],
    ['ep-material-processing', 1, 'Laser Material Processing', 'Laser Material Processing Simulator', '🛠️', 'Cutting, welding and drilling — how power, spot size and scan speed set the intensity and the heat delivered.'],
    ['ep-sls', 1, 'Selective Laser Sintering', 'Selective Laser Sintering Simulator', '🧱', 'Layer by layer: spread powder, scan the cross-section with the laser, lower the platform and repeat.'],
    ['ep-holography', 1, 'Holography', 'Holography Simulator', '🌈', 'Recording object and reference beams as an interference pattern, then reconstructing the image.'],
    ['ep-laser-medical', 1, 'Medical Applications of Laser', 'Laser Medical Applications Visualizer', '🩺', 'Eye surgery, tissue cutting and coagulation — wavelength, absorption depth and pulse choice.'],

    ['ep-tir', 2, 'Total Internal Reflection', 'Total Internal Reflection Simulator', '💡', 'Change the incident angle and refractive indices: see refraction, the critical angle and total internal reflection.'],
    ['ep-acceptance-angle', 2, 'Acceptance Angle', 'Acceptance Angle Simulator', '🔺', 'Rays entering inside the acceptance cone are guided; rays outside it leak into the cladding.'],
    ['ep-numerical-aperture', 2, 'Numerical Aperture', 'Numerical Aperture Simulator', '📐', 'NA = √(n₁² − n₂²): how core and cladding indices set the light-gathering ability of a fibre.'],
    ['ep-single-multi-mode', 2, 'Single Mode and Multimode Fiber', 'Single Mode vs Multimode Fiber', '🧵', 'Core diameter, V-number and number of modes — one path versus many paths and modal dispersion.'],
    ['ep-step-graded-index', 2, 'Step Index and Graded Index Fiber', 'Step Index vs Graded Index Fiber', '📈', 'Zig-zag rays in a step-index fibre versus curved rays in a graded-index fibre, and the refractive index profile.'],
    ['ep-fiber-communication', 2, 'Optical Fiber Communication', 'Optical Fiber Communication Simulator', '📡', 'Transmitter → fibre → receiver: attenuation in dB/km, power budget and the received power.'],
    ['ep-bending-loss', 2, 'Fiber Bending Loss', 'Fiber Bending Loss Simulator', '➰', 'Tighten the bend radius and watch rays fall below the critical angle and leak out of the core.'],
    ['ep-endoscopy', 2, 'Fiber Optic Endoscopy', 'Fiber Optic Endoscopy Visualizer', '🔬', 'Illuminating fibres carry light in; a coherent fibre bundle carries the image back to the eyepiece.'],

    ['ep-piezo-effect', 3, 'Piezoelectric Effect', 'Piezoelectric Effect Simulator', '💎', 'Direct effect: stress produces voltage. Inverse effect: voltage produces strain. Switch between the two.'],
    ['ep-piezo-generator', 3, 'Piezoelectric Generator', 'Piezoelectric Generator Simulator', '📻', 'An oscillator drives a quartz crystal; resonance occurs when f = (1/2t)·√(Y/ρ).'],
    ['ep-acoustic-grating', 3, 'Acoustic Grating', 'Acoustic Grating Visualizer', '〰️', 'Standing ultrasonic waves in a liquid act as a diffraction grating: d sinθ = nλ gives the sound velocity.'],
    ['ep-sonar', 3, 'SONAR', 'SONAR Simulator', '🚢', 'Send an ultrasonic pulse, time the echo and calculate the distance d = v·t/2.'],
    ['ep-ndt', 3, 'Ultrasonic NDT', 'Ultrasonic NDT Simulator', '🔍', 'Pulse-echo testing of a metal block: the flaw echo appears on the A-scan before the back-wall echo.'],
    ['ep-ultrasonic-scanning', 3, 'Ultrasonic Scanning', 'Ultrasonic Scanning Simulator', '🖥️', 'A-scan, B-scan and T-M scan modes: how echoes from tissue boundaries are turned into a picture.'],
    ['ep-fetal-doppler', 3, 'Fetal Heartbeat Detection', 'Doppler/Fetal Heartbeat Concept Visualizer', '💓', 'The Doppler shift Δf = 2f·v·cosθ/c from the moving heart wall reveals the heartbeat.'],

    ['ep-heat-conduction', 4, 'Heat Conduction', 'Heat Conduction Simulator', '🌡️', "Fourier's law Q/t = kA·ΔT/L — temperature distribution and heat flow along a rod."],
    ['ep-heat-convection', 4, 'Heat Convection', 'Heat Convection Simulator', '♨️', 'Hot fluid rises, cool fluid sinks — the convection current and Newton’s law of cooling.'],
    ['ep-thermal-radiation', 4, 'Thermal Radiation', 'Thermal Radiation Visualizer', '☀️', 'Stefan–Boltzmann law P = εσAT⁴ and Wien’s displacement law λmax·T = 2.898×10⁻³ m·K.'],
    ['ep-thermal-conductivity', 4, 'Thermal Conductivity', 'Thermal Conductivity Comparison', '⚖️', 'Identical rods of copper, aluminium, steel, glass and wood — which conducts heat fastest?'],
    ['ep-solar-thermal', 4, 'Solar Thermal Power', 'Solar Thermal Power Simulator', '🔆', 'Collectors concentrate sunlight → heat transfer fluid → steam → turbine → electricity.'],
    ['ep-microwave', 4, 'Microwave Heating', 'Microwave Heating Simulator', '📶', 'Water molecules rotate with the 2.45 GHz field; the absorbed energy heats the food: Q = mcΔT.'],
    ['ep-surface-tension', 4, 'Surface Tension', 'Surface Tension Simulator', '💧', 'Molecular forces at the surface and capillary rise h = 2T·cosθ/(ρgr).'],
    ['ep-viscosity', 4, 'Viscosity', 'Viscosity Simulator', '🍯', 'Compare low- and high-viscosity liquids: layer velocities and Stokes’ terminal velocity of a falling ball.'],
    ['ep-fluid-flow', 4, 'Fluid Flow', 'Fluid Flow Visualizer', '🌊', 'Reynolds number Re = ρvD/η decides laminar or turbulent flow; continuity A₁v₁ = A₂v₂.'],

    ['ep-unit-cell', 5, 'Unit Cell', 'Unit Cell 3D Visualizer', '🧊', 'Lattice parameters a, b, c and angles α, β, γ — repeat the unit cell to build the crystal.'],
    ['ep-simple-cubic', 5, 'Simple Cubic', 'Simple Cubic Structure', '⬛', 'Atoms at the 8 corners: 1 atom per cell, coordination number 6, packing factor 0.52.'],
    ['ep-bcc', 5, 'Body-Centered Cubic', 'BCC Structure', '🔲', 'Corner atoms plus one at the body centre: 2 atoms per cell, CN 8, APF 0.68.'],
    ['ep-fcc', 5, 'Face-Centered Cubic', 'FCC Structure', '🟦', 'Corner atoms plus face centres: 4 atoms per cell, CN 12, APF 0.74.'],
    ['ep-bravais', 5, 'Bravais Lattices', 'Bravais Lattice Visualizer', '🔷', 'The 7 crystal systems and 14 Bravais lattices with their axial lengths and angles.'],
    ['ep-miller', 5, 'Miller Indices', 'Miller Indices 3D Visualizer', '📏', 'Choose (h k l) and see the plane cut the X, Y and Z axes, with interplanar spacing d = a/√(h²+k²+l²).'],
    ['ep-bragg', 5, "Bragg's Law", "Bragg's Law Simulator", '🎯', '2d sinθ = nλ — change wavelength, spacing and angle to find constructive interference.'],
    ['ep-xrd', 5, 'X-Ray Diffraction', 'X-Ray Diffraction Simulator', '📉', 'Diffraction pattern of SC, BCC and FCC crystals: allowed (h k l) peaks at 2θ from Bragg’s law.'],
    ['ep-czochralski', 5, 'Czochralski Process', 'Czochralski Crystal Growth Simulator', '🧪', 'Molten silicon → seed crystal → rotation and pulling → single crystal → silicon ingot.'],
    ['ep-wafer', 5, 'Silicon Wafer Formation', 'Silicon Wafer Formation Simulator', '💿', 'Ingot → grinding → slicing → lapping → etching → polishing → cleaned wafers, with the wafer count per ingot.'],
  ];
  const unitTitle = (u) => (units.find((x) => x.unit === u) || {}).title || '';
  const unitSubtype = (u) => (units.find((x) => x.unit === u) || {}).subtype || '';
  const simulations = rows.map(([id, unit, topic, title, icon, description]) => ({ id, unit, topic, title, icon, description, unitTitle: unitTitle(unit), subtype: unitSubtype(unit) }));
  const byId = new Map(simulations.map((s) => [s.id, s]));
  window.EduverseEPCatalog = { subject, units, simulations, simulationType: 'engineering-physics', get: (id) => byId.get(id) || null };
})();
