'use strict';

/* Engineering Chemistry (U21CY101) — Semester I simulation catalogue. */
(function () {
  const subject = { name: 'Engineering Chemistry', code: 'U21CY101', semester: 1, department: 'Information Technology', regulation: 'R2021 CBCS', category: 'BSC', credits: 3 };
  const units = [
    { unit: 1, title: 'Characteristics of Water and Its Treatment', subtype: 'water-treatment' },
    { unit: 2, title: 'Electrochemistry and Energy Storage Systems', subtype: 'electrochemistry' },
    { unit: 3, title: 'Corrosion and Its Control', subtype: 'corrosion' },
    { unit: 4, title: 'Fuels and Combustion', subtype: 'fuels-combustion' },
    { unit: 5, title: 'Polymers', subtype: 'polymers' },
    { unit: 6, title: 'Virtual Laboratory', subtype: 'virtual-lab' },
  ];
  const rows = [
    // Unit I
    ['chem-hardness-water',1,'Hardness of Water','Hardness of Water Simulator','💧','Explore temporary, permanent and total hardness from Ca²⁺ and Mg²⁺ ions.'],
    ['chem-edta-hardness',1,'EDTA Hardness Titration','EDTA Hardness Titration Simulator','🧪','Follow buffer, indicator, EDTA addition and endpoint to calculate hardness.'],
    ['chem-lime-soda',1,'Lime-Soda Process','Lime-Soda Water Softening Simulator','⚗️','Dose hard water with lime and soda ash and watch carbonate and hydroxide precipitation.'],
    ['chem-zeolite',1,'Zeolite Process','Zeolite Process Simulator','🪨','Visualize Ca²⁺/Mg²⁺ exchange in a zeolite bed and its NaCl regeneration cycle.'],
    ['chem-ion-exchange',1,'Ion Exchange','Ion Exchange / Demineralization Simulator','🔁','Trace cation exchange, anion exchange and H₂O formation.'],
    ['chem-reverse-osmosis',1,'Reverse Osmosis','Reverse Osmosis Simulator','🧫','Adjust pressure, salt concentration and membrane efficiency across a semipermeable membrane.'],
    ['chem-municipal-treatment',1,'Municipal Treatment','Municipal Water Treatment Plant Simulator','🏭','Step through coagulation, sedimentation, filtration and disinfection.'],
    ['chem-sedimentation',1,'Sedimentation','Sedimentation with Coagulant Simulator','⬇️','Change particles, settling time and coagulant dose to observe sludge formation.'],
    ['chem-sand-filtration',1,'Sand Filtration','Sand Filtration Simulator','🪨','Animate suspended particles being trapped by sand and gravel layers.'],
    ['chem-chlorination',1,'Disinfection','Chlorination / Disinfection Simulator','🧴','Adjust chlorine dose and contact time to reduce microorganisms.'],
    ['chem-uv-ozonation',1,'Disinfection Comparison','UV and Ozonation Comparison','☀️','Compare chlorination, UV and ozonation by mechanism and residual effect.'],
    ['chem-electrodialysis',1,'Electrodialysis','Electrodialysis Simulator','⚡','Animate cations and anions moving through alternating ion-selective membranes.'],
    // Unit II
    ['chem-electrochemical-cell',2,'Electrochemical Cells','Electrochemical Cell Simulator','🔋','Select electrodes and observe oxidation, reduction, electron flow and cell voltage.'],
    ['chem-electrochemical-series',2,'Electrochemical Series','Electrochemical Series Simulator','📋','Choose two metals and calculate E°cell, reaction direction and electron flow.'],
    ['chem-calomel-electrode',2,'Reference Electrodes','Calomel Electrode Simulator','⚙️','Explore the Hg | Hg₂Cl₂ | KCl reference electrode and its potential.'],
    ['chem-lead-acid',2,'Batteries','Lead-Acid Battery Simulator','🔋','Switch between charging and discharging while tracking Pb, PbO₂, H₂SO₄ and ions.'],
    ['chem-lithium-ion',2,'Batteries','Lithium-Ion Battery Simulator','🔋','Visualize Li⁺ movement between cathode and anode during charge and discharge.'],
    ['chem-fuel-cell',2,'Fuel Cells','Fuel Cell Simulator','⛽','Follow hydrogen oxidation, electron flow and water formation in a fuel cell.'],
    ['chem-pem-fuel-cell',2,'Fuel Cells','Polymer Membrane Fuel Cell Simulator','🧬','Separate proton movement through PEM from electron movement through the circuit.'],
    ['chem-sofc',2,'Fuel Cells','Solid Oxide Fuel Cell Simulator','🔥','Adjust temperature and trace O²⁻ movement through the solid electrolyte.'],
    ['chem-solar-cell',2,'Solar Energy','Solar Cell Simulator','☀️','Change light intensity, wavelength, temperature and load resistance to read V, I and power.'],
    ['chem-dssc',2,'Solar Energy','Dye-Sensitized Solar Cell Simulator','🌈','Explore glass, dye, TiO₂, electrolyte and counter-electrode layers.'],
    // Unit III
    ['chem-dry-corrosion',3,'Corrosion Mechanisms','Dry Corrosion Simulator','🧱','Grow an oxide layer as a metal reacts with oxygen at adjustable temperature.'],
    ['chem-galvanic-corrosion',3,'Corrosion Mechanisms','Galvanic Corrosion Simulator','🔩','Select two metals and identify the anode, cathode, electrolyte and metal loss.'],
    ['chem-differential-aeration',3,'Corrosion Mechanisms','Differential Aeration Corrosion','🌬️','Compare high-oxygen cathodic and low-oxygen anodic regions on a metal surface.'],
    ['chem-pitting',3,'Localized Corrosion','Pitting Corrosion Simulator','🕳️','Zoom from a surface defect to localized pit formation.'],
    ['chem-crevice',3,'Localized Corrosion','Crevice Corrosion Simulator','🔧','Explore the low-oxygen electrochemical cell inside a joined crevice.'],
    ['chem-corrosion-factors',3,'Corrosion Rate','Factors Affecting Corrosion Simulator','📈','Change temperature, pH, oxygen, electrolyte, metal and surface condition.'],
    ['chem-sacrificial-anode',3,'Corrosion Protection','Sacrificial Anode Protection','🛡️','Watch zinc dissolve while an iron structure remains protected.'],
    ['chem-impressed-current',3,'Corrosion Protection','Impressed Current Cathodic Protection','🔌','Adjust supplied current and protect a structure through an external anode.'],
    ['chem-electroplating',3,'Surface Protection','Electroplating Simulator','✨','Control current, time and concentration to calculate coating thickness.'],
    ['chem-nickel-plating',3,'Surface Protection','Nickel Plating Simulator','🪙','Animate nickel deposition from an electrolyte onto a metal object.'],
    ['chem-alloy-composition',3,'Materials','Alloy Composition Simulator','🧩','Compare brass, German silver and stainless-steel composition and properties.'],
    ['chem-heat-treatment',3,'Materials','Heat Treatment Simulator','🌡️','Compare heating, soaking and cooling schedules and their resulting properties.'],
    // Unit IV
    ['chem-proximate-analysis',4,'Coal Analysis','Proximate Analysis of Coal Simulator','🪨','Determine moisture, volatile matter, ash and fixed carbon step by step.'],
    ['chem-coal-analysis',4,'Coal Analysis','Coal Analysis Simulator','⚖️','Change sample mass and measurements to calculate coal composition automatically.'],
    ['chem-bergius',4,'Synthetic Fuels','Bergius Process Simulator','🏭','Follow coal hydrogenation at high pressure and temperature to synthetic petrol.'],
    ['chem-octane',4,'Fuel Quality','Octane Number Simulator','⛽','Mix iso-octane and n-heptane references to calculate octane number.'],
    ['chem-cetane',4,'Fuel Quality','Cetane Number Simulator','🚛','Compare diesel ignition delay and cetane characteristics.'],
    ['chem-knocking',4,'Engine Combustion','Knocking in Engines Simulator','💥','Compare smooth flame propagation with uncontrolled combustion and pressure waves.'],
    ['chem-antiknock',4,'Engine Combustion','Anti-Knocking Agent Simulator','🧴','Compare low-octane fuel, high-octane fuel and anti-knocking treatment.'],
    ['chem-cng-lpg',4,'Alternative Fuels','CNG vs LPG Simulator','🚌','Compare state, composition, storage, applications and combustion of CNG and LPG.'],
    ['chem-calorific-value',4,'Calorimetry','Calorific Value Simulator','🔥','Vary fuel mass and heat released to calculate higher and lower calorific values.'],
    ['chem-bomb-calorimeter',4,'Calorimetry','Bomb Calorimeter Simulator','🌡️','Run the fuel sample, bomb, water-bath temperature rise and calorific-value workflow.'],
    ['chem-orsat',4,'Flue Gas Analysis','Flue Gas Analysis — Orsat Method','🧪','Absorb CO₂, O₂ and CO sequentially and read remaining gas composition.'],
    ['chem-three-way-catalyst',4,'Emission Control','Three-Way Catalytic Converter','🚘','Convert CO, hydrocarbons and NOx into less harmful exhaust products.'],
    ['chem-scr-nox',4,'Emission Control','Selective Catalytic Reduction of NOx','🌫️','Adjust NOx, reducing agent and temperature to produce N₂ and H₂O.'],
    // Unit V
    ['chem-polymerization',5,'Polymer Science','Polymerization Simulator','🔗','Increase monomers and watch a polymer chain grow.'],
    ['chem-degree-polymerization',5,'Polymer Science','Degree of Polymerization Simulator','📏','Calculate chain length from polymer and monomer molecular masses.'],
    ['chem-classification',5,'Polymer Science','Polymer Classification Simulator','🗂️','Explore thermoplastics, thermosets, elastomers and conducting polymers.'],
    ['chem-thermoplastic-thermoset',5,'Polymer Behaviour','Thermoplastic vs Thermosetting Simulator','♨️','Compare softening and permanent cross-linking under heat.'],
    ['chem-glass-transition',5,'Polymer Behaviour','Glass Transition Temperature Simulator','🌡️','Move temperature across Tg and observe glassy-to-rubbery mobility.'],
    ['chem-abs',5,'Engineering Polymers','ABS Polymer Simulator','🧱','Combine acrylonitrile, butadiene and styrene to explore ABS properties.'],
    ['chem-pvc',5,'Engineering Polymers','PVC Simulator','🧵','Build PVC chains and connect structure with applications.'],
    ['chem-ptfe',5,'Engineering Polymers','PTFE Simulator','⚪','Polymerize tetrafluoroethylene and explore low friction and chemical resistance.'],
    ['chem-bakelite',5,'Engineering Polymers','Bakelite Simulator','🧩','Visualize thermosetting polymer formation and cross-linking.'],
    ['chem-injection-moulding',5,'Processing','Injection Moulding Simulator','🏗️','Heat pellets, inject the melt into a mould, cool and release the product.'],
    ['chem-extrusion',5,'Processing','Extrusion Moulding Simulator','➡️','Adjust screw speed and temperature through heater, screw and die stages.'],
    ['chem-compression-moulding',5,'Processing','Compression Moulding Simulator','🗜️','Apply pressure and heat, then cool a polymer inside a mould.'],
    ['chem-conducting-polymer',5,'Functional Polymers','Conducting Polymer Simulator','⚡','Compare polypyrrole, polyacetylene and polyaniline conductivity.'],
    ['chem-frp',5,'Composite Materials','Composite / FRP Simulator','🧵','Change fibre fraction and orientation to explore conceptual FRP properties.'],
    // Virtual laboratory
    ['chem-lab-edta',6,'Virtual Laboratory','Virtual Lab — EDTA Hardness','🧪','Perform a virtual burette titration for total hardness.'],
    ['chem-lab-potentiometric',6,'Virtual Laboratory','Virtual Lab — Potentiometric Titration','📉','Add titrant and read the potential-versus-volume curve.'],
    ['chem-lab-brass',6,'Virtual Laboratory','Virtual Lab — Copper in Brass by EDTA','🪙','Analyse a brass sample and calculate percentage copper.'],
    ['chem-lab-proximate',6,'Virtual Laboratory','Virtual Lab — Proximate Analysis','🪨','Run the moisture, volatile matter, ash and fixed-carbon experiment.'],
    ['chem-lab-viscometer',6,'Virtual Laboratory','Virtual Lab — Ostwald Viscometer','⏱️','Relate flow time to viscosity, molecular weight and degree of polymerization.'],
    ['chem-lab-chloride',6,'Virtual Laboratory','Virtual Lab — Chloride Estimation','🧴','Perform the titration procedure and calculate chloride concentration.'],
    ['chem-lab-ph',6,'Virtual Laboratory','Virtual Lab — pH Metric HCl Strength','🧪','Measure HCl strength and follow the live pH-versus-volume curve.'],
  ];
  const unitTitle = (u) => (units.find((x) => x.unit === u) || {}).title || '';
  const unitSubtype = (u) => (units.find((x) => x.unit === u) || {}).subtype || '';
  const simulations = rows.map(([id, unit, topic, title, icon, description]) => ({ id, unit, topic, title, icon, description, unitTitle: unitTitle(unit), subtype: unitSubtype(unit) }));
  const byId = new Map(simulations.map((s) => [s.id, s]));
  window.EduverseChemCatalog = { subject, units, simulations, simulationType: 'engineering-chemistry', get: (id) => byId.get(id) || null };
})();
