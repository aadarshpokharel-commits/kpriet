'use strict';

/* Central chemistry reference data consumed by the reusable simulation engines. */
(function () {
  window.ChemistryData = {
    electrodes: {
      Li: { symbol: 'Li', potential: -3.04 },
      Al: { symbol: 'Al', potential: -1.66 },
      Zn: { symbol: 'Zn', potential: -0.76 },
      Fe: { symbol: 'Fe', potential: -0.44 },
      H: { symbol: 'H', potential: 0.00 },
      Cu: { symbol: 'Cu', potential: 0.34 },
      Ag: { symbol: 'Ag', potential: 0.80 },
      Au: { symbol: 'Au', potential: 1.50 },
    },
    polymers: {
      ABS: { monomers: ['acrylonitrile', 'butadiene', 'styrene'], className: 'thermoplastic', properties: ['tough', 'chemical resistant', 'processable'] },
      PVC: { monomers: ['vinyl chloride'], className: 'thermoplastic', properties: ['durable', 'insulating', 'adjustable flexibility'] },
      PTFE: { monomers: ['tetrafluoroethylene'], className: 'thermoplastic', properties: ['low friction', 'chemical resistant', 'heat resistant'] },
      Bakelite: { monomers: ['phenol', 'formaldehyde'], className: 'thermosetting', properties: ['rigid', 'heat resistant', 'electrical insulating'] },
    },
    fuels: {
      CNG: { main: 'methane', state: 'compressed gas', storage: 'high pressure', carbon: 1 },
      LPG: { main: 'propane/butane', state: 'liquefied gas', storage: 'pressurized liquid', carbon: 3 },
    },
    assumptions: {
      corrosion: 'Relative educational index; not a validated field corrosion rate.',
      polymer: 'Conceptual chain and property model; not a molecular dynamics prediction.',
      solar: 'Simplified educational photovoltaic response around the selected operating point.',
    },
  };
})();
