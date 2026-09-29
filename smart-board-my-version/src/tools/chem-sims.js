'use strict';

/* Engineering Chemistry models. Each catalogue id is explicitly mapped to a
   model; the shared EP shell supplies controls, playback, AI context and save. */
(function () {
  const CAT = window.EduverseChemCatalog;
  const D = window.EPDraw;
  const S = {};
  const profile = {};
  const assign = (kind, ids) => ids.forEach((id) => { profile[id] = kind; });

  assign('hardness', ['chem-hardness-water']);
  assign('edta', ['chem-edta-hardness', 'chem-lab-edta']);
  assign('limeSoda', ['chem-lime-soda']); assign('zeolite', ['chem-zeolite']);
  assign('ionExchange', ['chem-ion-exchange']); assign('ro', ['chem-reverse-osmosis']);
  assign('municipal', ['chem-municipal-treatment']); assign('sedimentation', ['chem-sedimentation']);
  assign('filtration', ['chem-sand-filtration']); assign('disinfection', ['chem-chlorination', 'chem-uv-ozonation']);
  assign('electrodialysis', ['chem-electrodialysis']);
  assign('cell', ['chem-electrochemical-cell', 'chem-electrochemical-series']);
  assign('calomel', ['chem-calomel-electrode']); assign('leadAcid', ['chem-lead-acid']);
  assign('lithium', ['chem-lithium-ion']); assign('fuelCell', ['chem-fuel-cell', 'chem-pem-fuel-cell', 'chem-sofc']);
  assign('solar', ['chem-solar-cell', 'chem-dssc']);
  assign('corrosion', ['chem-dry-corrosion', 'chem-galvanic-corrosion', 'chem-differential-aeration', 'chem-pitting', 'chem-crevice', 'chem-corrosion-factors']);
  assign('protection', ['chem-sacrificial-anode', 'chem-impressed-current']); assign('plating', ['chem-electroplating', 'chem-nickel-plating']);
  assign('alloy', ['chem-alloy-composition']); assign('heatTreatment', ['chem-heat-treatment']);
  assign('proximate', ['chem-proximate-analysis', 'chem-lab-proximate']); assign('coal', ['chem-coal-analysis']);
  assign('bergius', ['chem-bergius']); assign('octane', ['chem-octane']); assign('cetane', ['chem-cetane']);
  assign('knocking', ['chem-knocking']); assign('antiKnock', ['chem-antiknock']); assign('cngLpg', ['chem-cng-lpg']);
  assign('calorific', ['chem-calorific-value']); assign('bomb', ['chem-bomb-calorimeter']); assign('orsat', ['chem-orsat']);
  assign('catalyst', ['chem-three-way-catalyst']); assign('scr', ['chem-scr-nox']);
  assign('polymerization', ['chem-polymerization']); assign('dp', ['chem-degree-polymerization']); assign('classification', ['chem-classification']);
  assign('thermo', ['chem-thermoplastic-thermoset']); assign('tg', ['chem-glass-transition']);
  assign('abs', ['chem-abs']); assign('pvc', ['chem-pvc']); assign('ptfe', ['chem-ptfe']); assign('bakelite', ['chem-bakelite']);
  assign('injection', ['chem-injection-moulding']); assign('extrusion', ['chem-extrusion']); assign('compression', ['chem-compression-moulding']);
  assign('conducting', ['chem-conducting-polymer']); assign('frp', ['chem-frp']);
  assign('potentiometric', ['chem-lab-potentiometric']); assign('brass', ['chem-lab-brass']); assign('viscometer', ['chem-lab-viscometer']);
  assign('chloride', ['chem-lab-chloride']); assign('ph', ['chem-lab-ph']);

  const r = (key, label, min, max, step, value, unit) => ({ key, label, type: 'range', min, max, step, default: value, unit: unit || '' });
  const select = (key, label, value, options) => ({ key, label, type: 'select', default: value, options: options.map((x) => ({ label: x, value: x })) });
  const params = {
    hardness: [r('ca', 'Calcium hardness', 0, 300, 1, 90, 'mg/L'), r('mg', 'Magnesium hardness', 0, 300, 1, 60, 'mg/L'), r('temperature', 'Temperature', 10, 80, 1, 25, '°C')],
    edta: [r('edtaVolume', 'EDTA titre', 1, 50, .1, 12.5, 'mL'), r('edtaMolarity', 'EDTA molarity', .005, .1, .005, .01, 'M'), r('sampleVolume', 'Sample volume', 10, 100, 1, 50, 'mL'), r('pH', 'Buffer pH', 8, 12, .1, 10, '')],
    limeSoda: [r('hardness', 'Raw hardness', 50, 500, 1, 260, 'mg/L'), r('limeDose', 'Lime dose', 0, 400, 1, 180, 'mg/L'), r('sodaDose', 'Soda ash dose', 0, 400, 1, 140, 'mg/L')],
    zeolite: [r('hardness', 'Influent hardness', 50, 500, 1, 250, 'mg/L'), r('capacity', 'Bed capacity', 100, 1000, 5, 600, 'meq'), r('regeneration', 'NaCl regeneration', 0, 100, 1, 70, '%')],
    ionExchange: [r('tds', 'Feed TDS', 100, 2000, 10, 850, 'mg/L'), r('cationRemoval', 'Cation resin efficiency', 0, 100, 1, 92, '%'), r('anionRemoval', 'Anion resin efficiency', 0, 100, 1, 88, '%')],
    ro: [r('pressure', 'Applied pressure', 1, 80, 1, 35, 'bar'), r('salt', 'Feed salinity', 100, 5000, 10, 1200, 'mg/L'), r('membrane', 'Membrane rejection', 40, 99, 1, 92, '%')],
    municipal: [r('turbidity', 'Raw turbidity', 5, 200, 1, 90, 'NTU'), r('alum', 'Alum dose', 0, 80, 1, 35, 'mg/L'), r('chlorine', 'Chlorine dose', 0, 10, .1, 2, 'mg/L')],
    sedimentation: [r('particle', 'Particle size', 1, 100, 1, 25, 'µm'), r('settling', 'Settling time', 1, 60, 1, 20, 'min'), r('coagulant', 'Coagulant dose', 0, 80, 1, 30, 'mg/L')],
    filtration: [r('turbidity', 'Influent turbidity', 5, 200, 1, 75, 'NTU'), r('depth', 'Sand depth', 10, 100, 1, 55, 'cm'), r('flow', 'Flow rate', 1, 30, 1, 12, 'm³/h')],
    disinfection: [r('dose', 'Disinfectant dose', 0, 10, .1, 2, 'mg/L'), r('contact', 'Contact / exposure time', 1, 60, 1, 20, 'min'), r('microbes', 'Microbial load', 1, 100, 1, 60, '%')],
    electrodialysis: [r('voltage', 'Stack voltage', 1, 100, 1, 40, 'V'), r('pairs', 'Membrane pairs', 1, 30, 1, 12, ''), r('salt', 'Feed salt', 100, 3000, 10, 900, 'mg/L')],
    cell: [select('cathode', 'Cathode electrode', 'Cu', ['Ag', 'Cu', 'Fe', 'Zn', 'Al']), select('anode', 'Anode electrode', 'Zn', ['Li', 'Al', 'Zn', 'Fe', 'Cu']), r('concentration', 'Ion concentration', .01, 2, .01, 1, 'M')],
    calomel: [r('chloride', 'KCl activity', .1, 4, .1, 1, 'M'), r('temperature', 'Temperature', 10, 80, 1, 25, '°C'), r('reference', 'Reference E°', .20, .30, .001, .241, 'V')],
    leadAcid: [r('soc', 'State of charge', 0, 100, 1, 75, '%'), r('current', 'Charge/discharge current', -20, 20, .5, 5, 'A'), r('acidDensity', 'Electrolyte density', 1.10, 1.30, .001, 1.24, 'g/mL')],
    lithium: [r('soc', 'State of charge', 0, 100, 1, 65, '%'), r('current', 'Current', -10, 10, .2, 2, 'A'), r('resistance', 'Internal resistance', .01, .50, .01, .08, 'Ω')],
    fuelCell: [r('hydrogen', 'Hydrogen supply', 0, 100, 1, 70, '%'), r('oxygen', 'Oxidant supply', 0, 100, 1, 75, '%'), r('temperature', 'Operating temperature', 20, 1000, 10, 650, '°C')],
    solar: [r('irradiance', 'Light intensity', 0, 1200, 10, 800, 'W/m²'), r('temperature', 'Cell temperature', 10, 90, 1, 30, '°C'), r('load', 'Load resistance', .1, 20, .1, 6, 'Ω')],
    corrosion: [r('temperature', 'Temperature', 20, 900, 10, 450, '°C'), r('oxygen', 'Oxygen / electrolyte', 0, 100, 1, 45, '%'), r('time', 'Exposure time', 1, 100, 1, 30, 'h')],
    protection: [r('current', 'Protection current', 0, 20, .1, 5, 'A'), r('potential', 'Structure potential', -2, 1, .01, -.85, 'V'), r('area', 'Protected area', 1, 100, 1, 20, 'cm²')],
    plating: [r('current', 'Plating current', .1, 20, .1, 4, 'A'), r('time', 'Plating time', 1, 120, 1, 45, 'min'), r('area', 'Cathode area', 1, 200, 1, 50, 'cm²')],
    alloy: [r('copper', 'Copper fraction', 0, 100, 1, 70, '%'), r('zinc', 'Zinc fraction', 0, 100, 1, 25, '%'), r('nickel', 'Nickel fraction', 0, 100, 1, 5, '%')],
    heatTreatment: [r('temperature', 'Treatment temperature', 20, 1200, 10, 700, '°C'), r('soak', 'Soak time', 1, 120, 1, 40, 'min'), r('cooling', 'Cooling rate', 1, 100, 1, 35, '°C/min')],
    proximate: [r('mass', 'Coal sample mass', 1, 100, 1, 20, 'g'), r('moisture', 'Moisture', 0, 40, .1, 8, '%'), r('ash', 'Ash residue', 0, 50, .1, 18, '%')],
    coal: [r('mass', 'Coal sample mass', 1, 100, 1, 25, 'g'), r('carbon', 'Carbon fraction', 20, 95, .1, 72, '%'), r('sulfur', 'Sulfur fraction', 0, 10, .1, 2, '%')],
    bergius: [r('pressure', 'Hydrogen pressure', 50, 700, 5, 300, 'bar'), r('temperature', 'Reaction temperature', 250, 500, 5, 420, '°C'), r('hydrogen', 'Hydrogen ratio', 0, 100, 1, 60, '%')],
    octane: [r('isoOctane', 'Iso-octane fraction', 0, 100, 1, 90, '%'), r('heptane', 'n-Heptane fraction', 0, 100, 1, 10, '%'), r('compression', 'Compression ratio', 4, 16, .1, 10, ':1')],
    cetane: [r('cetane', 'Cetane fraction', 0, 100, 1, 55, '%'), r('ignitionDelay', 'Ignition delay', 1, 50, .1, 12, 'ms'), r('temperature', 'Injection temperature', 20, 500, 5, 220, '°C')],
    knocking: [r('compression', 'Compression ratio', 4, 20, .1, 12, ':1'), r('octane', 'Fuel octane', 50, 110, 1, 85, ''), r('temperature', 'End-gas temperature', 300, 1000, 5, 720, 'K')],
    antiKnock: [r('baseOctane', 'Base fuel octane', 50, 100, 1, 78, ''), r('additive', 'Anti-knock additive', 0, 20, .1, 5, '%'), r('compression', 'Compression ratio', 4, 20, .1, 10, ':1')],
    cngLpg: [r('methane', 'CNG methane fraction', 0, 100, 1, 90, '%'), r('propane', 'LPG propane fraction', 0, 100, 1, 60, '%'), r('pressure', 'Storage pressure', 1, 250, 1, 120, 'bar')],
    calorific: [r('mass', 'Fuel mass', .1, 100, .1, 2, 'g'), r('heat', 'Heat released', 1, 1000, 1, 160, 'kJ'), r('water', 'Water equivalent', .1, 20, .1, 2.5, 'kJ/K')],
    bomb: [r('mass', 'Fuel mass', .1, 10, .1, 1, 'g'), r('deltaT', 'Water temperature rise', .1, 10, .1, 2.8, '°C'), r('corrections', 'Corrections', 0, 20, .1, 1.2, 'kJ')],
    orsAt: [r('co2', 'CO₂ absorbed', 0, 30, .1, 12, '%'), r('oxygenGas', 'O₂ absorbed', 0, 30, .1, 6, '%'), r('co', 'CO absorbed', 0, 10, .1, 1, '%')],
    catalyst: [r('co', 'CO in exhaust', 0, 20, .1, 4, '%'), r('hc', 'Hydrocarbons', 0, 10, .1, 1.5, '%'), r('nox', 'NOx', 0, 10, .1, 1.2, '%')],
    scr: [r('nox', 'NOx concentration', 0, 2000, 10, 700, 'ppm'), r('reductant', 'NH₃ / urea ratio', 0, 150, 1, 90, '%'), r('temperature', 'Catalyst temperature', 150, 600, 5, 320, '°C')],
    polymerization: [r('monomers', 'Monomer molecules', 2, 60, 1, 18, ''), r('conversion', 'Conversion', 0, 100, 1, 75, '%'), r('initiator', 'Initiator level', 0, 20, .1, 4, '%')],
    dp: [r('polymerMass', 'Polymer molecular mass', 1000, 500000, 1000, 56000, 'g/mol'), r('repeatMass', 'Repeat-unit mass', 20, 300, 1, 56, 'g/mol'), r('polydispersity', 'Polydispersity', 1, 5, .01, 1.8, '')],
    classification: [r('linear', 'Linear fraction', 0, 100, 1, 60, '%'), r('crosslink', 'Cross-link fraction', 0, 100, 1, 20, '%'), r('temperature', 'Use temperature', 0, 250, 1, 80, '°C')],
    thermo: [r('temperature', 'Processing temperature', 20, 350, 1, 180, '°C'), r('crosslink', 'Cross-link density', 0, 100, 1, 15, '%'), r('cycles', 'Heating cycles', 1, 10, 1, 3, '')],
    tg: [r('temperature', 'Polymer temperature', -80, 250, 1, 90, '°C'), r('tg', 'Glass transition Tg', -80, 200, 1, 75, '°C'), r('plasticizer', 'Plasticizer', 0, 30, 1, 5, '%')],
    abs: [r('acrylonitrile', 'Acrylonitrile fraction', 0, 50, 1, 25, '%'), r('butadiene', 'Butadiene fraction', 0, 50, 1, 25, '%'), r('styrene', 'Styrene fraction', 0, 80, 1, 50, '%')],
    pvc: [r('vinylChloride', 'Vinyl chloride units', 2, 60, 1, 20, ''), r('conversion', 'Conversion', 0, 100, 1, 80, '%'), r('plasticizer', 'Plasticizer', 0, 40, 1, 8, '%')],
    ptfe: [r('tetrafluoroethylene', 'TFE units', 2, 60, 1, 24, ''), r('conversion', 'Conversion', 0, 100, 1, 85, '%'), r('temperature', 'Polymerization temperature', 0, 350, 1, 80, '°C')],
    bakelite: [r('phenol', 'Phenol fraction', 0, 100, 1, 50, '%'), r('formaldehyde', 'Formaldehyde fraction', 0, 100, 1, 50, '%'), r('crosslink', 'Cure / cross-link level', 0, 100, 1, 70, '%')],
    injection: [r('temperature', 'Melt temperature', 100, 350, 1, 220, '°C'), r('pressure', 'Injection pressure', 10, 200, 1, 90, 'bar'), r('cooling', 'Cooling time', 1, 60, 1, 18, 's')],
    extrusion: [r('temperature', 'Barrel temperature', 100, 350, 1, 190, '°C'), r('speed', 'Screw speed', 1, 200, 1, 80, 'rpm'), r('die', 'Die opening', 1, 50, 1, 12, 'mm')],
    compression: [r('temperature', 'Mould temperature', 80, 300, 1, 165, '°C'), r('pressure', 'Compression pressure', 1, 100, 1, 40, 'MPa'), r('time', 'Cure time', 1, 60, 1, 20, 'min')],
    conducting: [r('doping', 'Doping level', 0, 20, .1, 4, '%'), r('chainLength', 'Conjugated chain length', 2, 100, 1, 24, 'units'), r('temperature', 'Temperature', 0, 120, 1, 30, '°C')],
    frp: [r('fiber', 'Fibre fraction', 0, 80, 1, 45, '%'), r('orientation', 'Fibre orientation', 0, 90, 1, 10, '°'), r('load', 'Applied load', 0, 100, 1, 40, 'kN')],
    potentiometric: [r('titrant', 'Titrant volume', 0, 50, .1, 22, 'mL'), r('potential', 'Measured potential', 0, 1000, 1, 485, 'mV'), r('slope', 'Endpoint slope', 0, 100, 1, 70, 'mV/mL')],
    brass: [r('sampleMass', 'Brass sample mass', .1, 20, .1, 2, 'g'), r('edtaVolume', 'EDTA titre', 1, 50, .1, 18, 'mL'), r('edtaMolarity', 'EDTA molarity', .005, .1, .005, .01, 'M')],
    viscometer: [r('flowTime', 'Flow time', 1, 300, 1, 85, 's'), r('waterTime', 'Water reference time', 1, 200, 1, 60, 's'), r('density', 'Sample density', .5, 2, .01, .95, 'g/mL')],
    chloride: [r('silverNitrate', 'AgNO₃ titre', 1, 50, .1, 16, 'mL'), r('molarity', 'AgNO₃ molarity', .005, .2, .005, .01, 'M'), r('sampleVolume', 'Sample volume', 10, 100, 1, 50, 'mL')],
    ph: [r('acidVolume', 'HCl sample volume', 1, 50, .1, 10, 'mL'), r('baseVolume', 'NaOH endpoint volume', 1, 50, .1, 9.5, 'mL'), r('baseMolarity', 'NaOH molarity', .01, 1, .01, .1, 'M')],
  };
  const calculate = window.ChemistryEngines.calculate;


  const steps = {
    hardness: ['Prepare water sample', 'Separate Ca²⁺/Mg²⁺ ions', 'Convert to CaCO₃ equivalent', 'Classify hardness'], edta: ['Buffer sample', 'Add EDTA and indicator', 'Detect colour endpoint', 'Calculate hardness'], limeSoda: ['Dose lime', 'Dose soda ash', 'Form precipitate', 'Collect softened water'], zeolite: ['Load zeolite bed', 'Exchange hardness ions', 'Track exhaustion', 'Regenerate with brine'], ionExchange: ['Feed cation resin', 'Exchange H⁺', 'Exchange anions', 'Collect demineralized water'], ro: ['Pressurize feed', 'Cross membrane', 'Reject salts', 'Measure permeate'], municipal: ['Coagulate raw water', 'Settle flocs', 'Filter water', 'Disinfect product'], sedimentation: ['Disperse particles', 'Add coagulant', 'Allow settling', 'Read sludge removal'], filtration: ['Load sand bed', 'Trap suspended solids', 'Build head loss', 'Read filtrate'], disinfection: ['Add disinfectant', 'Expose microbes', 'Break cell structures', 'Check residual load'], electrodialysis: ['Apply electric field', 'Move cations', 'Move anions', 'Read salt removal'], cell: ['Select electrodes', 'Start oxidation', 'Move electrons', 'Measure cell potential'], calomel: ['Prepare KCl reference', 'Set Hg/Hg₂Cl₂ equilibrium', 'Apply Nernst correction', 'Read potential'], leadAcid: ['Set SOC', 'Charge or discharge', 'Move sulfate ions', 'Read voltage'], lithium: ['Set SOC', 'Move Li⁺ between hosts', 'Apply load', 'Read voltage'], fuelCell: ['Feed hydrogen', 'Move protons', 'Move electrons', 'Collect water and power'], solar: ['Illuminate cell', 'Generate carriers', 'Set load point', 'Read I–V power'], corrosion: ['Set metal environment', 'Create anodic site', 'Create cathodic site', 'Measure attack'], protection: ['Connect protection system', 'Drive protective current', 'Shift potential', 'Verify structure'], plating: ['Prepare cathode', 'Pass current', 'Reduce metal ions', 'Measure coating'], alloy: ['Select composition', 'Mix phases', 'Apply property model', 'Compare alloy'], heatTreatment: ['Heat specimen', 'Soak', 'Select cooling rate', 'Read property'], proximate: ['Weigh coal', 'Remove moisture', 'Burn volatiles', 'Read ash and carbon'], coal: ['Prepare analysis', 'Measure carbon and sulfur', 'Estimate heating value', 'Assess quality'], bergius: ['Prepare coal slurry', 'Pressurize hydrogen', 'Heat with catalyst', 'Collect synthetic petrol'], octane: ['Blend references', 'Set compression', 'Run knock test', 'Read octane'], cetane: ['Inject diesel', 'Measure ignition delay', 'Compare reference', 'Read quality'], knocking: ['Compress mixture', 'Heat end gas', 'Auto-ignite', 'Read pressure risk'], antiKnock: ['Set base fuel', 'Add agent', 'Raise compression', 'Compare risk'], cngLpg: ['Select fuel', 'Store fuel', 'Burn mixture', 'Compare energy'], calorific: ['Weigh fuel', 'Burn sample', 'Measure heat', 'Calculate CV'], bomb: ['Seal oxygen bomb', 'Ignite pellet', 'Measure water rise', 'Apply corrections'], orsAt: ['Fill Orsat', 'Absorb CO₂', 'Absorb O₂ and CO', 'Read nitrogen'], catalyst: ['Mix exhaust', 'Oxidize CO/HC', 'Reduce NOx', 'Read cleaned gas'], scr: ['Heat SCR catalyst', 'Dose NH₃/urea', 'Convert NOx', 'Read outlet'], polymerization: ['Feed monomers', 'Initiate reaction', 'Grow chain', 'Read conversion'], dp: ['Enter molecular masses', 'Divide by repeat mass', 'Apply dispersity', 'Read DP'], classification: ['Build chain architecture', 'Change cross-links', 'Heat polymer', 'Classify material'], thermo: ['Heat sample', 'Soften chains', 'Cool and reshape', 'Compare remeltability'], tg: ['Set Tg', 'Change temperature', 'Cross Tg', 'Read mobility'], abs: ['Mix monomers', 'Grow graft chains', 'Set composition', 'Read ABS properties'], pvc: ['Feed vinyl chloride', 'Polymerize units', 'Add plasticizer', 'Read PVC chain'], ptfe: ['Feed TFE', 'Polymerize fluorinated chain', 'Set temperature', 'Read PTFE properties'], bakelite: ['Mix reactants', 'Condense resin', 'Cross-link network', 'Read cure'], injection: ['Heat pellets', 'Inject melt', 'Cool mould', 'Eject product'], extrusion: ['Feed pellets', 'Shear and melt', 'Push through die', 'Read profile'], compression: ['Charge mould', 'Apply pressure', 'Cure network', 'Cool product'], conducting: ['Build conjugated chain', 'Dope polymer', 'Release carriers', 'Read conductivity'], frp: ['Wet fibres', 'Set orientation', 'Apply load', 'Read reinforcement'], potentiometric: ['Fill burette', 'Add aliquots', 'Track potential', 'Locate endpoint'], brass: ['Dissolve brass', 'Complex Cu²⁺', 'Detect endpoint', 'Calculate copper'], viscometer: ['Fill viscometer', 'Set temperature', 'Measure flow', 'Calculate viscosity'], chloride: ['Add indicator', 'Titrate AgNO₃', 'Detect endpoint', 'Calculate chloride'], ph: ['Fill acid sample', 'Add NaOH', 'Reach neutralisation', 'Calculate HCl']
  };

  function draw(g, sim, kind, st) {
    D.clear(g, '#f8fafc'); D.text(g, sim.title, 500, 36, { align: 'center', size: 23, weight: 800 }); D.text(g, 'Unit ' + sim.unit + ' · ' + sim.topic, 500, 62, { align: 'center', size: 13, weight: 700, color: '#15803d' });
    const ss = steps[kind] || [sim.topic, 'Inputs', 'Reaction', 'Measured result']; const active = Math.min(3, Math.max(0, st.step));
    ss.forEach((label, i) => { const x = 55 + i * 235, y = 120, on = i <= active; D.rect(g, x, y, 190, 72, { fill: on ? '#dcfce7' : '#fff', stroke: on ? '#15803d' : '#cbd5e1', r: 12, width: 2 }); D.circle(g, x + 24, y + 36, 11, { fill: on ? '#22c55e' : '#cbd5e1' }); D.text(g, String(i + 1), x + 24, y + 40, { align: 'center', size: 12, weight: 800, color: '#fff' }); D.text(g, label, x + 45, y + 31, { size: 12, weight: 750, color: on ? '#14532d' : '#475569' }); if (i < 3) D.arrow(g, x + 192, y + 36, x + 227, y + 36, { color: on ? '#22c55e' : '#cbd5e1', width: 2, head: 8 }); });
    const val = Number(st.c && st.c.values && st.c.values[0] && parseFloat(st.c.values[0][1])) || 0, level = Math.max(0, Math.min(1, Math.abs(val) / 100));
    if (['solar', 'potentiometric', 'ph', 'octane', 'cetane', 'knocking', 'antiKnock', 'scr'].includes(kind)) { const pts = (st.c && st.c.graph && st.c.graph.length) ? st.c.graph : Array.from({ length: 21 }, (_, i) => [i, Math.max(0, val * .5 + Math.sin(i / 3 + st.t) * val * .12)]); const xmax = Math.max(20, ...pts.map((x) => x[0])); const ymax = Math.max(10, ...pts.map((x) => x[1])) * 1.2; D.chart(g, 90, 250, 820, 220, { xmin: 0, xmax: xmax, ymin: 0, ymax: ymax, series: [{ points: pts, color: '#2563eb', width: 3, dots: true }], xlabel: kind === 'ph' ? 'Titrant volume (mL)' : kind === 'potentiometric' ? 'Titrant volume (mL)' : kind === 'solar' ? 'Load resistance (Ω)' : 'Experiment progress', ylabel: kind === 'ph' ? 'pH' : kind === 'potentiometric' ? 'Potential (mV)' : 'Measured response', title: 'Dynamic result graph' }); }
    else if (['corrosion', 'protection', 'plating', 'alloy', 'heatTreatment'].includes(kind)) { D.rect(g, 110, 270, 780, 150, { fill: '#cbd5e1', stroke: '#64748b', r: 16, width: 3 }); for (let i = 0; i < 12; i++) D.circle(g, 145 + i * 62, 350 + level * (i % 3 === 0 ? 22 : 8), 5 + level * 4, { fill: kind === 'protection' ? '#f59e0b' : '#dc2626', alpha: .75 }); D.text(g, kind === 'protection' ? 'protected metal structure' : 'metal surface / coating', 500, 345, { align: 'center', size: 19, weight: 800, color: '#334155' }); }
    else if (['polymerization', 'dp', 'classification', 'thermo', 'tg', 'abs', 'pvc', 'ptfe', 'bakelite', 'injection', 'extrusion', 'compression', 'conducting', 'frp'].includes(kind)) { let x = 130; for (let i = 0; i < 24; i++) { const y = 350 + Math.sin(i * .8 + st.t) * 30; D.circle(g, x, y, 13, { fill: i % 3 === 0 ? '#f59e0b' : i % 3 === 1 ? '#2563eb' : '#16a34a', stroke: '#fff', width: 2 }); if (i) D.line(g, x - 25, y, x - 1, y, { color: '#64748b', width: 4 }); x += 28; } D.text(g, kind === 'conducting' ? 'delocalised charge on conjugated chain' : 'repeat units and cross-links', 500, 465, { align: 'center', size: 17, weight: 750, color: '#475569' }); }
    else if (['cell', 'calomel', 'leadAcid', 'lithium', 'fuelCell', 'electrodialysis'].includes(kind)) { D.rect(g, 160, 255, 230, 180, { fill: '#dbeafe', stroke: '#2563eb', r: 14, width: 3 }); D.rect(g, 610, 255, 230, 180, { fill: '#fee2e2', stroke: '#dc2626', r: 14, width: 3 }); D.text(g, 'CATHODE / PRODUCT', 275, 290, { align: 'center', size: 14, weight: 800, color: '#1d4ed8' }); D.text(g, 'ANODE / FEED', 725, 290, { align: 'center', size: 14, weight: 800, color: '#b91c1c' }); for (let i = 0; i < 5; i++) { const y = 330 + i * 22; D.circle(g, 430 + ((i * 31 + st.t * 24) % 100), y, 7, { fill: i % 2 ? '#f59e0b' : '#16a34a' }); D.arrow(g, 570, y, 430, y, { color: '#475569', width: 2, head: 7 }); } D.text(g, 'ion / electron transfer', 500, 465, { align: 'center', size: 17, weight: 750, color: '#334155' }); }
    else { D.rect(g, 120, 270, 760, 150, { fill: '#ecfeff', stroke: '#0891b2', r: 18, width: 3 }); D.text(g, 'controlled laboratory process', 500, 330, { align: 'center', size: 23, weight: 800, color: '#155e75' }); D.text(g, 'inputs → reaction → measured result', 500, 375, { align: 'center', size: 17, weight: 700, color: '#0e7490' }); }
    D.text(g, 'Change the inputs to update this simulation immediately', 500, 525, { align: 'center', size: 14, weight: 700, color: '#475569' });
  }

  CAT.simulations.forEach((sim) => { const kind = profile[sim.id]; const p = params[kind] || params.hardness; const ss = steps[kind] || [sim.topic, 'Inputs', 'Reaction', 'Measured result']; S[sim.id] = { params: p, conceptual: false, live: true, stepDuration: 3.5, validate: (values) => window.ChemistryEngines.validate(kind, values), steps: () => ss.map((title) => ({ title: title, text: 'Follow the ' + title.toLowerCase() + ' stage and observe the measured change.' })), compute: (values) => { const c = calculate(kind, values); return { formulas: [c.formula], readouts: c.values.map((x, i) => ({ label: x[0], value: x[1], tone: i === 0 ? 'blue' : i === 1 ? 'green' : 'amber' })), state: { subject: 'Engineering Chemistry', simulation: sim.id, model: kind, visualizationState: { stage: ss[0], progress: 0, calculated: c.values, graph: c.graph || null } }, explain: { what: sim.title + ' uses an explicit chemistry model.', why: sim.description, param: p[0].label, effect: c.explain } }; }, draw: (g, st) => draw(g, sim, kind, st) }; });
  window.ChemSims = S;
})();
