/**
 * Authoritative Curriculum Dataset for B.Tech Information Technology (R2021 CBCS)
 * Extracted directly from IT_R2021_CBCS_Complete_Curriculum_Extraction (1).xlsx
 */

export interface ISeedUnit {
  unitNumber: number;
  unitCode: string;
  title: string;
  description: string;
  syllabusText: string;
  topics: string[];
  hours?: number;
}

export interface ISeedSubject {
  semesterNumber: number;
  subjectCode: string;
  subjectName: string;
  category: string;
  credits: number;
  isElectiveSlot: boolean;
  electiveSlotType?: 'PEC' | 'OEC' | null;
  electiveSlotCode?: string | null;
  practicalInfo?: string;
  syllabus: ISeedUnit[];
}

export interface ISeedPEC {
  code: string;
  name: string;
  vertical: string;
  verticalNumber: number;
  verticalName: string;
  credits: number;
  category: string;
  sourcePage?: number | null;
  syllabusSummary: string;
  topics: string[];
  slots: string[];
  semesters: number[];
}

export interface ISeedOEC {
  code: string;
  name: string;
  group: string;
  slot: string;
  semesterNumber: number;
  credits: number;
  category: string;
  syllabusSummary: string;
  topics: string[];
}

export const IT_DEPARTMENT_SEED = {
  name: 'Information Technology',
  code: 'IT',
  programmeType: 'UG',
  description: 'Department of Information Technology, offering B.Tech Information Technology under R2021 CBCS regulation with 165 total credits.',
};

export const IT_PROGRAMME_SEED = {
  name: 'B.E. Information Technology',
  code: 'IT',
  degree: 'B.E.',
  programmeType: 'UG',
  durationYears: 4,
  totalSemesters: 8,
  description: 'Four-year undergraduate B.E. Programme in Information Technology under R2021 CBCS regulation.',
};

export const IT_SEMESTERS_SEED = [
  { semesterNumber: 1, credits: 21, academicYear: '2024-2025', regulation: 'R2021' },
  { semesterNumber: 2, credits: 20, academicYear: '2024-2025', regulation: 'R2021' },
  { semesterNumber: 3, credits: 22, academicYear: '2024-2025', regulation: 'R2021' },
  { semesterNumber: 4, credits: 23, academicYear: '2024-2025', regulation: 'R2021' },
  { semesterNumber: 5, credits: 25, academicYear: '2024-2025', regulation: 'R2021' },
  { semesterNumber: 6, credits: 21, academicYear: '2024-2025', regulation: 'R2021' },
  { semesterNumber: 7, credits: 23, academicYear: '2024-2025', regulation: 'R2021' },
  { semesterNumber: 8, credits: 10, academicYear: '2024-2025', regulation: 'R2021' },
];

export const IT_SUBJECTS_SEED: ISeedSubject[] = [
  {
    "semesterNumber": 1,
    "subjectCode": "U21GEG01",
    "subjectName": "Heritage of Tamils",
    "category": "HSMC",
    "credits": 1,
    "isElectiveSlot": false,
    "electiveSlotType": null,
    "electiveSlotCode": null,
    "practicalInfo": "",
    "syllabus": [
      {
        "unitNumber": 1,
        "unitCode": "UNIT 1",
        "title": "Language and literature",
        "description": "Dravidian language family; Tamil classical language; Sangam literature; epics; medieval/Bhakti; modern literature.",
        "syllabusText": "Language and literature — Dravidian language family; Tamil classical language; Sangam literature; epics; medieval/Bhakti; modern literature.",
        "topics": [
          "Dravidian language family",
          "Tamil classical language",
          "Sangam literature",
          "epics",
          "medieval/Bhakti",
          "modern literature"
        ],
        "hours": 9
      },
      {
        "unitNumber": 2,
        "unitCode": "UNIT 2",
        "title": "Heritage from rock art to sculpture",
        "description": "bronze, terracotta, temple art, village deities and archaeological traditions.",
        "syllabusText": "Heritage from rock art to sculpture — bronze, terracotta, temple art, village deities and archaeological traditions.",
        "topics": [
          "bronze, terracotta, temple art, village deities and archaeological traditions"
        ],
        "hours": 9
      },
      {
        "unitNumber": 3,
        "unitCode": "UNIT 3",
        "title": "Folk and fine arts",
        "description": "Therukoothu, Karagattam, Villu Pattu, Kaniyan Koothu, Oyilattam, leather puppetry, Silambattam, Valari.",
        "syllabusText": "Folk and fine arts — Therukoothu, Karagattam, Villu Pattu, Kaniyan Koothu, Oyilattam, leather puppetry, Silambattam, Valari.",
        "topics": [
          "Therukoothu, Karagattam, Villu Pattu, Kaniyan Koothu, Oyilattam, leather puppetry, Silambattam, Valari"
        ],
        "hours": 9
      },
      {
        "unitNumber": 4,
        "unitCode": "UNIT 4",
        "title": "Thinai concept",
        "description": "flora/fauna; Aham/Puram; Sangam literature; five landscapes; cultural meaning.",
        "syllabusText": "Thinai concept — flora/fauna; Aham/Puram; Sangam literature; five landscapes; cultural meaning.",
        "topics": [
          "flora/fauna",
          "Aham/Puram",
          "Sangam literature",
          "five landscapes",
          "cultural meaning"
        ],
        "hours": 9
      },
      {
        "unitNumber": 5,
        "unitCode": "UNIT 5",
        "title": "Contribution to national movement and Indian culture",
        "description": "freedom movement; Self-Respect Movement; inscriptions/manuscripts; traditional medicine; cultural contributions.",
        "syllabusText": "Contribution to national movement and Indian culture — freedom movement; Self-Respect Movement; inscriptions/manuscripts; traditional medicine; cultural contributions.",
        "topics": [
          "freedom movement",
          "Self-Respect Movement",
          "inscriptions/manuscripts",
          "traditional medicine",
          "cultural contributions"
        ],
        "hours": 9
      }
    ]
  },
  {
    "semesterNumber": 1,
    "subjectCode": "U25RMA101",
    "subjectName": "Multivariable Calculus and Applications",
    "category": "BSC",
    "credits": 4,
    "isElectiveSlot": false,
    "electiveSlotType": null,
    "electiveSlotCode": null,
    "practicalInfo": "L-T-P-J-C: 3-1-0-0-4 | Total Contact Periods: 60",
    "syllabus": [
      {
        "unitNumber": 1,
        "unitCode": "UNIT I",
        "title": "DIFFERENTIAL CALCULUS",
        "description": "Functions of two variables; Partial derivatives; Total derivatives; Taylor's formula for functions of two variables; Extreme Values.",
        "syllabusText": "DIFFERENTIAL CALCULUS — Functions of two variables; Partial derivatives; Total derivatives; Taylor's formula for functions of two variables; Extreme Values.",
        "topics": [
          "Functions of two variables",
          "Partial derivatives",
          "Total derivatives",
          "Taylor's formula for functions of two variables",
          "Extreme Values"
        ],
        "hours": 12
      },
      {
        "unitNumber": 2,
        "unitCode": "UNIT II",
        "title": "INTEGRAL CALCULUS",
        "description": "Double integrals; Double integrals over rectangles; Double integrals over general regions; Fubini's theorem (statement only); Area and Volume by double integration; Reversing the order of integration.",
        "syllabusText": "INTEGRAL CALCULUS — Double integrals; Double integrals over rectangles; Double integrals over general regions; Fubini's theorem (statement only); Area and Volume by double integration; Reversing the order of integration.",
        "topics": [
          "Double integrals",
          "Double integrals over rectangles",
          "Double integrals over general regions",
          "Fubini's theorem (statement only)",
          "Area and Volume by double integration",
          "Reversing the order of integration"
        ],
        "hours": 12
      },
      {
        "unitNumber": 3,
        "unitCode": "UNIT III",
        "title": "VECTOR CALCULUS",
        "description": "Differentiation in vector field; Gradient of a scalar field; Directional derivative; Divergence of a vector field; Curl of a vector field; Integration in vector field; Line integrals; Work; Circulation and flux; Path independence; Conservative fields; Green's theorem; Gauss divergence theorem; Stokes' theorem.",
        "syllabusText": "VECTOR CALCULUS — Differentiation in vector field; Gradient of a scalar field; Directional derivative; Divergence of a vector field; Curl of a vector field; Integration in vector field; Line integrals; Work; Circulation and flux; Path independence; Conservative fields; Green's theorem; Gauss divergence theorem; Stokes' theorem.",
        "topics": [
          "Differentiation in vector field",
          "Gradient of a scalar field",
          "Directional derivative",
          "Divergence of a vector field",
          "Curl of a vector field",
          "Integration in vector field",
          "Line integrals",
          "Work",
          "Circulation and flux",
          "Path independence",
          "Conservative fields",
          "Green's theorem",
          "Gauss divergence theorem",
          "Stokes' theorem"
        ],
        "hours": 12
      },
      {
        "unitNumber": 4,
        "unitCode": "UNIT IV",
        "title": "FIRST ORDER LINEAR ORDINARY DIFFERENTIAL EQUATIONS",
        "description": "Basic concepts of ordinary differential equations; Separable and exact differential equations; Integrating factors and first-order linear differential equations; Mathematical modelling of real-world problems.",
        "syllabusText": "FIRST ORDER LINEAR ORDINARY DIFFERENTIAL EQUATIONS — Basic concepts of ordinary differential equations; Separable and exact differential equations; Integrating factors and first-order linear differential equations; Mathematical modelling of real-world problems.",
        "topics": [
          "Basic concepts of ordinary differential equations",
          "Separable and exact differential equations",
          "Integrating factors and first-order linear differential equations",
          "Mathematical modelling of real-world problems"
        ],
        "hours": 12
      },
      {
        "unitNumber": 5,
        "unitCode": "UNIT V",
        "title": "SECOND ORDER LINEAR DIFFERENTIAL EQUATIONS",
        "description": "Homogeneous linear equations of second order; Linearity principle; Second order homogeneous equations with constant coefficients; Euler–Cauchy equation; Non-homogeneous linear second-order solution by variation of parameters.",
        "syllabusText": "SECOND ORDER LINEAR DIFFERENTIAL EQUATIONS — Homogeneous linear equations of second order; Linearity principle; Second order homogeneous equations with constant coefficients; Euler–Cauchy equation; Non-homogeneous linear second-order solution by variation of parameters.",
        "topics": [
          "Homogeneous linear equations of second order",
          "Linearity principle",
          "Second order homogeneous equations with constant coefficients",
          "Euler–Cauchy equation",
          "Non-homogeneous linear second-order solution by variation of parameters"
        ],
        "hours": 12
      }
    ]
  },
  {
    "semesterNumber": 1,
    "subjectCode": "U21MA101",
    "subjectName": "Calculus and Differential Equations",
    "category": "BSC",
    "credits": 4,
    "isElectiveSlot": false,
    "electiveSlotType": null,
    "electiveSlotCode": null,
    "practicalInfo": "",
    "syllabus": [
      {
        "unitNumber": 1,
        "unitCode": "UNIT 1",
        "title": "Matrices",
        "description": "eigenvalues/eigenvectors; Cayley-Hamilton; diagonalization; orthogonal transformation; applications.",
        "syllabusText": "Matrices — eigenvalues/eigenvectors; Cayley-Hamilton; diagonalization; orthogonal transformation; applications.",
        "topics": [
          "eigenvalues/eigenvectors",
          "Cayley-Hamilton",
          "diagonalization",
          "orthogonal transformation",
          "applications"
        ],
        "hours": 9
      },
      {
        "unitNumber": 2,
        "unitCode": "UNIT 2",
        "title": "Several variables",
        "description": "partial/total derivatives; Taylor series; extrema; Lagrange multipliers.",
        "syllabusText": "Several variables — partial/total derivatives; Taylor series; extrema; Lagrange multipliers.",
        "topics": [
          "partial/total derivatives",
          "Taylor series",
          "extrema",
          "Lagrange multipliers"
        ],
        "hours": 9
      },
      {
        "unitNumber": 3,
        "unitCode": "UNIT 3",
        "title": "Multiple integrals",
        "description": "double/triple integrals; change of order; area/volume applications.",
        "syllabusText": "Multiple integrals — double/triple integrals; change of order; area/volume applications.",
        "topics": [
          "double/triple integrals",
          "change of order",
          "area/volume applications"
        ],
        "hours": 9
      },
      {
        "unitNumber": 4,
        "unitCode": "UNIT 4",
        "title": "Line/surface integrals",
        "description": "Green, Gauss divergence and Stokes theorems.",
        "syllabusText": "Line/surface integrals — Green, Gauss divergence and Stokes theorems.",
        "topics": [
          "Green, Gauss divergence and Stokes theorems"
        ],
        "hours": 9
      },
      {
        "unitNumber": 5,
        "unitCode": "UNIT 5",
        "title": "ODEs",
        "description": "second/higher-order linear equations; variable coefficients; coupled systems; applications.",
        "syllabusText": "ODEs — second/higher-order linear equations; variable coefficients; coupled systems; applications.",
        "topics": [
          "second/higher-order linear equations",
          "variable coefficients",
          "coupled systems",
          "applications"
        ],
        "hours": 9
      }
    ]
  },
  {
    "semesterNumber": 1,
    "subjectCode": "U21EEG01",
    "subjectName": "Basics of Electrical and Electronics Engineering",
    "category": "ESC",
    "credits": 3,
    "isElectiveSlot": false,
    "electiveSlotType": null,
    "electiveSlotCode": null,
    "practicalInfo": "",
    "syllabus": [
      {
        "unitNumber": 1,
        "unitCode": "UNIT 1",
        "title": "Electric circuits",
        "description": "active/passive elements; series/parallel; star-delta; Ohm; KCL/KVL; DC networks.",
        "syllabusText": "Electric circuits — active/passive elements; series/parallel; star-delta; Ohm; KCL/KVL; DC networks.",
        "topics": [
          "active/passive elements",
          "series/parallel",
          "star-delta",
          "Ohm",
          "KCL/KVL",
          "DC networks"
        ],
        "hours": 9
      },
      {
        "unitNumber": 2,
        "unitCode": "UNIT 2",
        "title": "DC motors",
        "description": "construction, operation, types, torque, characteristics and speed control.",
        "syllabusText": "DC motors — construction, operation, types, torque, characteristics and speed control.",
        "topics": [
          "construction, operation, types, torque, characteristics and speed control"
        ],
        "hours": 9
      },
      {
        "unitNumber": 3,
        "unitCode": "UNIT 3",
        "title": "Transformers/AC motors",
        "description": "single/three-phase transformer; induction motor construction, characteristics and speed control.",
        "syllabusText": "Transformers/AC motors — single/three-phase transformer; induction motor construction, characteristics and speed control.",
        "topics": [
          "single/three-phase transformer",
          "induction motor construction, characteristics and speed control"
        ],
        "hours": 9
      },
      {
        "unitNumber": 4,
        "unitCode": "UNIT 4",
        "title": "Semiconductors",
        "description": "PN junction, Zener, BJT, FET.",
        "syllabusText": "Semiconductors — PN junction, Zener, BJT, FET.",
        "topics": [
          "PN junction, Zener, BJT, FET"
        ],
        "hours": 9
      },
      {
        "unitNumber": 5,
        "unitCode": "UNIT 5",
        "title": "Semiconductor applications",
        "description": "rectifiers, filters, voltage regulators and CE/CB/CC configurations.",
        "syllabusText": "Semiconductor applications — rectifiers, filters, voltage regulators and CE/CB/CC configurations.",
        "topics": [
          "rectifiers, filters, voltage regulators and CE/CB/CC configurations"
        ],
        "hours": 9
      }
    ]
  },
  {
    "semesterNumber": 1,
    "subjectCode": "U21EN101",
    "subjectName": "English for Technologists",
    "category": "HSMC",
    "credits": 2,
    "isElectiveSlot": false,
    "electiveSlotType": null,
    "electiveSlotCode": null,
    "practicalInfo": "",
    "syllabus": [
      {
        "unitNumber": 1,
        "unitCode": "UNIT 1",
        "title": "Subjective introspection",
        "description": "vocabulary, word puzzles, word sleuthing, introduction, opinion paragraph.",
        "syllabusText": "Subjective introspection — vocabulary, word puzzles, word sleuthing, introduction, opinion paragraph.",
        "topics": [
          "vocabulary, word puzzles, word sleuthing, introduction, opinion paragraph"
        ],
        "hours": 9
      },
      {
        "unitNumber": 2,
        "unitCode": "UNIT 2",
        "title": "Career enhancement",
        "description": "reading comprehension, email, career profile, resume/digital profile, rephrasing and pronunciation.",
        "syllabusText": "Career enhancement — reading comprehension, email, career profile, resume/digital profile, rephrasing and pronunciation.",
        "topics": [
          "reading comprehension, email, career profile, resume/digital profile, rephrasing and pronunciation"
        ],
        "hours": 9
      },
      {
        "unitNumber": 3,
        "unitCode": "UNIT 3",
        "title": "Technical writing",
        "description": "error spotting, sentence rewriting, data interpretation, reports/graphs/charts, expository writing, captions.",
        "syllabusText": "Technical writing — error spotting, sentence rewriting, data interpretation, reports/graphs/charts, expository writing, captions.",
        "topics": [
          "error spotting, sentence rewriting, data interpretation, reports/graphs/charts, expository writing, captions"
        ],
        "hours": 9
      },
      {
        "unitNumber": 4,
        "unitCode": "UNIT 4",
        "title": "Language upskilling",
        "description": "listening, TED talks/announcements, presentation, extempore/persuasive speech, team communication.",
        "syllabusText": "Language upskilling — listening, TED talks/announcements, presentation, extempore/persuasive speech, team communication.",
        "topics": [
          "listening, TED talks/announcements, presentation, extempore/persuasive speech, team communication"
        ],
        "hours": 9
      },
      {
        "unitNumber": 5,
        "unitCode": "UNIT 5",
        "title": "Practical communication",
        "description": "listening, role play, presentation and group discussion.",
        "syllabusText": "Practical communication — listening, role play, presentation and group discussion.",
        "topics": [
          "listening, role play, presentation and group discussion"
        ],
        "hours": 9
      }
    ]
  },
  {
    "semesterNumber": 1,
    "subjectCode": "U21PH101",
    "subjectName": "Engineering Physics",
    "category": "BSC",
    "credits": 3,
    "isElectiveSlot": false,
    "electiveSlotType": null,
    "electiveSlotCode": null,
    "practicalInfo": "",
    "syllabus": [
      {
        "unitNumber": 1,
        "unitCode": "UNIT 1",
        "title": "Laser",
        "description": "emission, pumping, CO2/semiconductor lasers, material processing, holography and medical applications.",
        "syllabusText": "Laser — emission, pumping, CO2/semiconductor lasers, material processing, holography and medical applications.",
        "topics": [
          "emission, pumping, CO2/semiconductor lasers, material processing, holography and medical applications"
        ],
        "hours": 9
      },
      {
        "unitNumber": 2,
        "unitCode": "UNIT 2",
        "title": "Fiber optics",
        "description": "TIR, numerical aperture, classification, dispersion, communication and endoscopy.",
        "syllabusText": "Fiber optics — TIR, numerical aperture, classification, dispersion, communication and endoscopy.",
        "topics": [
          "TIR, numerical aperture, classification, dispersion, communication and endoscopy"
        ],
        "hours": 9
      },
      {
        "unitNumber": 3,
        "unitCode": "UNIT 3",
        "title": "Ultrasonics",
        "description": "properties, piezoelectric generator, acoustic grating, SONAR/NDT/scanning and fetal heartbeat.",
        "syllabusText": "Ultrasonics — properties, piezoelectric generator, acoustic grating, SONAR/NDT/scanning and fetal heartbeat.",
        "topics": [
          "properties, piezoelectric generator, acoustic grating, SONAR/NDT/scanning and fetal heartbeat"
        ],
        "hours": 9
      },
      {
        "unitNumber": 4,
        "unitCode": "UNIT 4",
        "title": "Thermal/fluid properties",
        "description": "heat transfer, thermal conductivity, solar thermal systems, hybrid vehicles, microwave, surface tension/viscosity.",
        "syllabusText": "Thermal/fluid properties — heat transfer, thermal conductivity, solar thermal systems, hybrid vehicles, microwave, surface tension/viscosity.",
        "topics": [
          "heat transfer, thermal conductivity, solar thermal systems, hybrid vehicles, microwave, surface tension/viscosity"
        ],
        "hours": 9
      },
      {
        "unitNumber": 5,
        "unitCode": "UNIT 5",
        "title": "Crystal physics",
        "description": "unit cells, Bravais lattices, SC/BCC/FCC, Miller indices, Bragg law, Czochralski and silicon wafers.",
        "syllabusText": "Crystal physics — unit cells, Bravais lattices, SC/BCC/FCC, Miller indices, Bragg law, Czochralski and silicon wafers.",
        "topics": [
          "unit cells, Bravais lattices, SC/BCC/FCC, Miller indices, Bragg law, Czochralski and silicon wafers"
        ],
        "hours": 9
      }
    ]
  },
  {
    "semesterNumber": 1,
    "subjectCode": "U21CY101",
    "subjectName": "Engineering Chemistry",
    "category": "BSC",
    "credits": 3,
    "isElectiveSlot": false,
    "electiveSlotType": null,
    "electiveSlotCode": null,
    "practicalInfo": "",
    "syllabus": [
      {
        "unitNumber": 1,
        "unitCode": "UNIT 1",
        "title": "Water treatment",
        "description": "hardness, DO/TDS, desalination, softening, coagulation/flocculation, chlorination, UV/ozone/electrodialysis.",
        "syllabusText": "Water treatment — hardness, DO/TDS, desalination, softening, coagulation/flocculation, chlorination, UV/ozone/electrodialysis.",
        "topics": [
          "hardness, DO/TDS, desalination, softening, coagulation/flocculation, chlorination, UV/ozone/electrodialysis"
        ],
        "hours": 9
      },
      {
        "unitNumber": 2,
        "unitCode": "UNIT 2",
        "title": "Electrochemistry/energy storage",
        "description": "electrodes, cells, fuel cells, polymer-membrane/solid-oxide cells and solar cells.",
        "syllabusText": "Electrochemistry/energy storage — electrodes, cells, fuel cells, polymer-membrane/solid-oxide cells and solar cells.",
        "topics": [
          "electrodes, cells, fuel cells, polymer-membrane/solid-oxide cells and solar cells"
        ],
        "hours": 9
      },
      {
        "unitNumber": 3,
        "unitCode": "UNIT 3",
        "title": "Corrosion",
        "description": "dry/wet, galvanic/differential aeration, pitting/crevice, protection methods and alloys.",
        "syllabusText": "Corrosion — dry/wet, galvanic/differential aeration, pitting/crevice, protection methods and alloys.",
        "topics": [
          "dry/wet, galvanic/differential aeration, pitting/crevice, protection methods and alloys"
        ],
        "hours": 9
      },
      {
        "unitNumber": 4,
        "unitCode": "UNIT 4",
        "title": "Fuels/combustion",
        "description": "solid/liquid/gas fuels, proximate/ultimate analysis, calorific value, bomb calorimeter, Orsat, LPG/CNG, pollution.",
        "syllabusText": "Fuels/combustion — solid/liquid/gas fuels, proximate/ultimate analysis, calorific value, bomb calorimeter, Orsat, LPG/CNG, pollution.",
        "topics": [
          "solid/liquid/gas fuels, proximate/ultimate analysis, calorific value, bomb calorimeter, Orsat, LPG/CNG, pollution"
        ],
        "hours": 9
      },
      {
        "unitNumber": 5,
        "unitCode": "UNIT 5",
        "title": "Polymers",
        "description": "monomers, polymerization, thermoplastics/thermosets/elastomers, compounding, molding/extrusion, conducting polymers.",
        "syllabusText": "Polymers — monomers, polymerization, thermoplastics/thermosets/elastomers, compounding, molding/extrusion, conducting polymers.",
        "topics": [
          "monomers, polymerization, thermoplastics/thermosets/elastomers, compounding, molding/extrusion, conducting polymers"
        ],
        "hours": 9
      }
    ]
  },
  {
    "semesterNumber": 1,
    "subjectCode": "U21CSG01",
    "subjectName": "Problem Solving and C Programming",
    "category": "ESC",
    "credits": 3,
    "isElectiveSlot": false,
    "electiveSlotType": null,
    "electiveSlotCode": null,
    "practicalInfo": "",
    "syllabus": [
      {
        "unitNumber": 1,
        "unitCode": "UNIT 1",
        "title": "Computational thinking",
        "description": "computers, problem solving, data types, number systems, C programming basics.",
        "syllabusText": "Computational thinking — computers, problem solving, data types, number systems, C programming basics.",
        "topics": [
          "computers, problem solving, data types, number systems, C programming basics"
        ],
        "hours": 9
      },
      {
        "unitNumber": 2,
        "unitCode": "UNIT 2",
        "title": "Algorithmic approach",
        "description": "Boolean/propositional logic, reasoning, sequence/selection/repetition and algorithm design.",
        "syllabusText": "Algorithmic approach — Boolean/propositional logic, reasoning, sequence/selection/repetition and algorithm design.",
        "topics": [
          "Boolean/propositional logic, reasoning, sequence/selection/repetition and algorithm design"
        ],
        "hours": 9
      },
      {
        "unitNumber": 3,
        "unitCode": "UNIT 3",
        "title": "Searching/sorting/modularization",
        "description": "arrays, pointers, strings, functions, searching and sorting.",
        "syllabusText": "Searching/sorting/modularization — arrays, pointers, strings, functions, searching and sorting.",
        "topics": [
          "arrays, pointers, strings, functions, searching and sorting"
        ],
        "hours": 9
      },
      {
        "unitNumber": 4,
        "unitCode": "UNIT 4",
        "title": "Structures/pointers",
        "description": "pointer arithmetic, pass-by-value/reference, structures, nested structures and unions.",
        "syllabusText": "Structures/pointers — pointer arithmetic, pass-by-value/reference, structures, nested structures and unions.",
        "topics": [
          "pointer arithmetic, pass-by-value/reference, structures, nested structures and unions"
        ],
        "hours": 9
      },
      {
        "unitNumber": 5,
        "unitCode": "UNIT 5",
        "title": "Files",
        "description": "sequential/random access, file operations and command-line arguments.",
        "syllabusText": "Files — sequential/random access, file operations and command-line arguments.",
        "topics": [
          "sequential/random access, file operations and command-line arguments"
        ],
        "hours": 9
      }
    ]
  },
  {
    "semesterNumber": 1,
    "subjectCode": "U21MEG01",
    "subjectName": "Engineering Graphics",
    "category": "ESC",
    "credits": 2,
    "isElectiveSlot": false,
    "electiveSlotType": null,
    "electiveSlotCode": null,
    "practicalInfo": "Engineering drawing/CAD exercises and orthographic/isometric work",
    "syllabus": [
      {
        "unitNumber": 1,
        "unitCode": "UNIT 1",
        "title": "CAD/drawing basics",
        "description": "instruments, BIS, lines, lettering, dimensions, polygons, circles/ellipse and editing commands.",
        "syllabusText": "CAD/drawing basics — instruments, BIS, lines, lettering, dimensions, polygons, circles/ellipse and editing commands.",
        "topics": [
          "instruments, BIS, lines, lettering, dimensions, polygons, circles/ellipse and editing commands"
        ],
        "hours": 9
      },
      {
        "unitNumber": 2,
        "unitCode": "UNIT 2",
        "title": "Conics/special curves",
        "description": "ellipse, parabola, hyperbola, involute, cycloid and point projection.",
        "syllabusText": "Conics/special curves — ellipse, parabola, hyperbola, involute, cycloid and point projection.",
        "topics": [
          "ellipse, parabola, hyperbola, involute, cycloid and point projection"
        ],
        "hours": 9
      },
      {
        "unitNumber": 3,
        "unitCode": "UNIT 3",
        "title": "Straight",
        "description": "line/surface projection — HP/VP, inclined lines/planes, auxiliary planes and polygons.",
        "syllabusText": "Straight-line/surface projection — HP/VP, inclined lines/planes, auxiliary planes and polygons.",
        "topics": [
          "line/surface projection — HP/VP, inclined lines/planes, auxiliary planes and polygons"
        ],
        "hours": 9
      },
      {
        "unitNumber": 4,
        "unitCode": "UNIT 4",
        "title": "Solids/sections/development",
        "description": "prisms, pyramids, cylinders, cones, sections and lateral development.",
        "syllabusText": "Solids/sections/development — prisms, pyramids, cylinders, cones, sections and lateral development.",
        "topics": [
          "prisms, pyramids, cylinders, cones, sections and lateral development"
        ],
        "hours": 9
      },
      {
        "unitNumber": 5,
        "unitCode": "UNIT 5",
        "title": "Orthographic/isometric projection",
        "description": "machine components, freehand sketching and isometric exercises.",
        "syllabusText": "Orthographic/isometric projection — machine components, freehand sketching and isometric exercises.",
        "topics": [
          "machine components, freehand sketching and isometric exercises"
        ],
        "hours": 9
      }
    ]
  },
  {
    "semesterNumber": 1,
    "subjectCode": "U21MYC01",
    "subjectName": "Induction Program",
    "category": "MNC",
    "credits": 0,
    "isElectiveSlot": false,
    "electiveSlotType": null,
    "electiveSlotCode": null,
    "practicalInfo": "",
    "syllabus": []
  },
  {
    "semesterNumber": 2,
    "subjectCode": "U21GEG02",
    "subjectName": "Tamils and Technology",
    "category": "HSMC",
    "credits": 1,
    "isElectiveSlot": false,
    "electiveSlotType": null,
    "electiveSlotCode": null,
    "practicalInfo": "",
    "syllabus": [
      {
        "unitNumber": 1,
        "unitCode": "UNIT 1",
        "title": "Weaving/ceramic technology",
        "description": "Sangam ceramic technology; Black and Red Ware.",
        "syllabusText": "Weaving/ceramic technology — Sangam ceramic technology; Black and Red Ware.",
        "topics": [
          "Sangam ceramic technology",
          "Black and Red Ware"
        ],
        "hours": 9
      },
      {
        "unitNumber": 2,
        "unitCode": "UNIT 2",
        "title": "Design/construction",
        "description": "building materials, houses, Sangam architecture, temples and structural traditions.",
        "syllabusText": "Design/construction — building materials, houses, Sangam architecture, temples and structural traditions.",
        "topics": [
          "building materials, houses, Sangam architecture, temples and structural traditions"
        ],
        "hours": 9
      },
      {
        "unitNumber": 3,
        "unitCode": "UNIT 3",
        "title": "Manufacturing",
        "description": "iron smelting, copper/gold metallurgy, steel/glass/beads and craft technology.",
        "syllabusText": "Manufacturing — iron smelting, copper/gold metallurgy, steel/glass/beads and craft technology.",
        "topics": [
          "iron smelting, copper/gold metallurgy, steel/glass/beads and craft technology"
        ],
        "hours": 9
      },
      {
        "unitNumber": 4,
        "unitCode": "UNIT 4",
        "title": "Agriculture/irrigation",
        "description": "dams, tanks, sluices, irrigation, animal husbandry, fisheries and ocean knowledge.",
        "syllabusText": "Agriculture/irrigation — dams, tanks, sluices, irrigation, animal husbandry, fisheries and ocean knowledge.",
        "topics": [
          "dams, tanks, sluices, irrigation, animal husbandry, fisheries and ocean knowledge"
        ],
        "hours": 9
      },
      {
        "unitNumber": 5,
        "unitCode": "UNIT 5",
        "title": "Scientific Tamil/computing",
        "description": "scientific Tamil, digitization, Tamil books/software, virtual academy, digital library/dictionaries.",
        "syllabusText": "Scientific Tamil/computing — scientific Tamil, digitization, Tamil books/software, virtual academy, digital library/dictionaries.",
        "topics": [
          "scientific Tamil, digitization, Tamil books/software, virtual academy, digital library/dictionaries"
        ],
        "hours": 9
      }
    ]
  },
  {
    "semesterNumber": 2,
    "subjectCode": "U21MA208",
    "subjectName": "Linear Algebra",
    "category": "BSC",
    "credits": 4,
    "isElectiveSlot": false,
    "electiveSlotType": null,
    "electiveSlotCode": null,
    "practicalInfo": "",
    "syllabus": [
      {
        "unitNumber": 1,
        "unitCode": "UNIT 1",
        "title": "Matrices",
        "description": "rank, linear systems, Gaussian elimination, Jordan/LU decomposition.",
        "syllabusText": "Matrices — rank, linear systems, Gaussian elimination, Jordan/LU decomposition.",
        "topics": [
          "rank, linear systems, Gaussian elimination, Jordan/LU decomposition"
        ],
        "hours": 9
      },
      {
        "unitNumber": 2,
        "unitCode": "UNIT 2",
        "title": "Vector spaces",
        "description": "linear combinations, dependence/independence, bases and dimensions.",
        "syllabusText": "Vector spaces — linear combinations, dependence/independence, bases and dimensions.",
        "topics": [
          "linear combinations, dependence/independence, bases and dimensions"
        ],
        "hours": 9
      },
      {
        "unitNumber": 3,
        "unitCode": "UNIT 3",
        "title": "Inner",
        "description": "product spaces — norm/angle, orthogonality, Gram-Schmidt and QR decomposition.",
        "syllabusText": "Inner-product spaces — norm/angle, orthogonality, Gram-Schmidt and QR decomposition.",
        "topics": [
          "product spaces — norm/angle, orthogonality, Gram-Schmidt and QR decomposition"
        ],
        "hours": 9
      },
      {
        "unitNumber": 4,
        "unitCode": "UNIT 4",
        "title": "Eigenvalue problems",
        "description": "transformations, eigenvalues/eigenvectors, Hermitian/unitary matrices.",
        "syllabusText": "Eigenvalue problems — transformations, eigenvalues/eigenvectors, Hermitian/unitary matrices.",
        "topics": [
          "transformations, eigenvalues/eigenvectors, Hermitian/unitary matrices"
        ],
        "hours": 9
      },
      {
        "unitNumber": 5,
        "unitCode": "UNIT 5",
        "title": "Principal component analysis",
        "description": "positive-definite matrices, Cayley-Hamilton, SVD and PCA applications.",
        "syllabusText": "Principal component analysis — positive-definite matrices, Cayley-Hamilton, SVD and PCA applications.",
        "topics": [
          "positive-definite matrices, Cayley-Hamilton, SVD and PCA applications"
        ],
        "hours": 9
      }
    ]
  },
  {
    "semesterNumber": 2,
    "subjectCode": "U21PH201",
    "subjectName": "Materials Science",
    "category": "BSC",
    "credits": 3,
    "isElectiveSlot": false,
    "electiveSlotType": null,
    "electiveSlotCode": null,
    "practicalInfo": "",
    "syllabus": [
      {
        "unitNumber": 1,
        "unitCode": "UNIT 1",
        "title": "Conducting materials",
        "description": "electron theory, conductivity, Wiedemann-Franz, Drude and Fermi models.",
        "syllabusText": "Conducting materials — electron theory, conductivity, Wiedemann-Franz, Drude and Fermi models.",
        "topics": [
          "electron theory, conductivity, Wiedemann-Franz, Drude and Fermi models"
        ],
        "hours": 9
      },
      {
        "unitNumber": 2,
        "unitCode": "UNIT 2",
        "title": "Semiconductors",
        "description": "intrinsic/extrinsic, carrier concentration, n/p type, solar/Hall applications.",
        "syllabusText": "Semiconductors — intrinsic/extrinsic, carrier concentration, n/p type, solar/Hall applications.",
        "topics": [
          "intrinsic/extrinsic, carrier concentration, n/p type, solar/Hall applications"
        ],
        "hours": 9
      },
      {
        "unitNumber": 3,
        "unitCode": "UNIT 3",
        "title": "Magnetic materials",
        "description": "dia/para/ferromagnetic; domains; soft/hard materials; magnetic bubble/GMR.",
        "syllabusText": "Magnetic materials — dia/para/ferromagnetic; domains; soft/hard materials; magnetic bubble/GMR.",
        "topics": [
          "dia/para/ferromagnetic",
          "domains",
          "soft/hard materials",
          "magnetic bubble/GMR"
        ],
        "hours": 9
      },
      {
        "unitNumber": 4,
        "unitCode": "UNIT 4",
        "title": "Dielectric/optical materials",
        "description": "polarization, breakdown, ferroelectrics, electro-optics, photonics and nonlinear optics.",
        "syllabusText": "Dielectric/optical materials — polarization, breakdown, ferroelectrics, electro-optics, photonics and nonlinear optics.",
        "topics": [
          "polarization, breakdown, ferroelectrics, electro-optics, photonics and nonlinear optics"
        ],
        "hours": 9
      },
      {
        "unitNumber": 5,
        "unitCode": "UNIT 5",
        "title": "Engineering/nano materials",
        "description": "smart/SMA/rheological materials; nanomaterials; synthesis; characterization; XRD.",
        "syllabusText": "Engineering/nano materials — smart/SMA/rheological materials; nanomaterials; synthesis; characterization; XRD.",
        "topics": [
          "smart/SMA/rheological materials",
          "nanomaterials",
          "synthesis",
          "characterization",
          "XRD"
        ],
        "hours": 9
      }
    ]
  },
  {
    "semesterNumber": 2,
    "subjectCode": "U21IT201",
    "subjectName": "Principles of Data Communication",
    "category": "PCC",
    "credits": 3,
    "isElectiveSlot": false,
    "electiveSlotType": null,
    "electiveSlotCode": null,
    "practicalInfo": "",
    "syllabus": [
      {
        "unitNumber": 1,
        "unitCode": "UNIT 1",
        "title": "Communication basics",
        "description": "elements, bandwidth, channels, guided/unguided media, modulation and multiplexing.",
        "syllabusText": "Communication basics — elements, bandwidth, channels, guided/unguided media, modulation and multiplexing.",
        "topics": [
          "elements, bandwidth, channels, guided/unguided media, modulation and multiplexing"
        ],
        "hours": 9
      },
      {
        "unitNumber": 2,
        "unitCode": "UNIT 2",
        "title": "AM",
        "description": "multiplexing, frequency/time division, spectrum, modulation index, power, transmitter/receiver.",
        "syllabusText": "AM — multiplexing, frequency/time division, spectrum, modulation index, power, transmitter/receiver.",
        "topics": [
          "multiplexing, frequency/time division, spectrum, modulation index, power, transmitter/receiver"
        ],
        "hours": 9
      },
      {
        "unitNumber": 3,
        "unitCode": "UNIT 3",
        "title": "FM/PM",
        "description": "angle modulation, relationship, types, modulation index, pre/de-emphasis.",
        "syllabusText": "FM/PM — angle modulation, relationship, types, modulation index, pre/de-emphasis.",
        "topics": [
          "angle modulation, relationship, types, modulation index, pre/de-emphasis"
        ],
        "hours": 9
      },
      {
        "unitNumber": 4,
        "unitCode": "UNIT 4",
        "title": "Digital modulation",
        "description": "bit rate/baud, ASK/FSK/PSK, QPSK/QAM and error probability.",
        "syllabusText": "Digital modulation — bit rate/baud, ASK/FSK/PSK, QPSK/QAM and error probability.",
        "topics": [
          "bit rate/baud, ASK/FSK/PSK, QPSK/QAM and error probability"
        ],
        "hours": 9
      },
      {
        "unitNumber": 5,
        "unitCode": "UNIT 5",
        "title": "Data communication",
        "description": "ASCII, CRC, error detection/correction, RS-232, circuits and modems.",
        "syllabusText": "Data communication — ASCII, CRC, error detection/correction, RS-232, circuits and modems.",
        "topics": [
          "ASCII, CRC, error detection/correction, RS-232, circuits and modems"
        ],
        "hours": 9
      }
    ]
  },
  {
    "semesterNumber": 2,
    "subjectCode": "U21EN201",
    "subjectName": "Personality Enhancement",
    "category": "HSMC",
    "credits": 2,
    "isElectiveSlot": false,
    "electiveSlotType": null,
    "electiveSlotCode": null,
    "practicalInfo": "",
    "syllabus": [
      {
        "unitNumber": 1,
        "unitCode": "UNIT 1",
        "title": "Lexical reasoning",
        "description": "verbal analogy, logical reasoning, assertions and sentence completion.",
        "syllabusText": "Lexical reasoning — verbal analogy, logical reasoning, assertions and sentence completion.",
        "topics": [
          "verbal analogy, logical reasoning, assertions and sentence completion"
        ],
        "hours": 9
      },
      {
        "unitNumber": 2,
        "unitCode": "UNIT 2",
        "title": "Social correspondence",
        "description": "etiquette, brainstorming, SWOT, co-verbal and non-verbal cues.",
        "syllabusText": "Social correspondence — etiquette, brainstorming, SWOT, co-verbal and non-verbal cues.",
        "topics": [
          "etiquette, brainstorming, SWOT, co-verbal and non-verbal cues"
        ],
        "hours": 9
      },
      {
        "unitNumber": 3,
        "unitCode": "UNIT 3",
        "title": "Art of networking",
        "description": "attitude, verbalization, public speaking, career communication, interview.",
        "syllabusText": "Art of networking — attitude, verbalization, public speaking, career communication, interview.",
        "topics": [
          "attitude, verbalization, public speaking, career communication, interview"
        ],
        "hours": 9
      },
      {
        "unitNumber": 4,
        "unitCode": "UNIT 4",
        "title": "Critical thinking",
        "description": "organizing ideas, problem solving, book/movie review, comparative analysis.",
        "syllabusText": "Critical thinking — organizing ideas, problem solving, book/movie review, comparative analysis.",
        "topics": [
          "organizing ideas, problem solving, book/movie review, comparative analysis"
        ],
        "hours": 9
      },
      {
        "unitNumber": 5,
        "unitCode": "UNIT 5",
        "title": "Content writing",
        "description": "reports, digital platforms, posts, product descriptions and proposals.",
        "syllabusText": "Content writing — reports, digital platforms, posts, product descriptions and proposals.",
        "topics": [
          "reports, digital platforms, posts, product descriptions and proposals"
        ],
        "hours": 9
      }
    ]
  },
  {
    "semesterNumber": 2,
    "subjectCode": "U21CSG02",
    "subjectName": "Python Programming",
    "category": "ESC",
    "credits": 3,
    "isElectiveSlot": false,
    "electiveSlotType": null,
    "electiveSlotCode": null,
    "practicalInfo": "",
    "syllabus": [
      {
        "unitNumber": 1,
        "unitCode": "UNIT 1",
        "title": "Python basics",
        "description": "interpreter, tokens, types, numbers/math, I/O, comments, indentation, operators and expressions.",
        "syllabusText": "Python basics — interpreter, tokens, types, numbers/math, I/O, comments, indentation, operators and expressions.",
        "topics": [
          "interpreter, tokens, types, numbers/math, I/O, comments, indentation, operators and expressions"
        ],
        "hours": 9
      },
      {
        "unitNumber": 2,
        "unitCode": "UNIT 2",
        "title": "Control/functions/modules",
        "description": "conditions, loops, break/continue/pass, functions, scope, lambda, recursion, modules/packages.",
        "syllabusText": "Control/functions/modules — conditions, loops, break/continue/pass, functions, scope, lambda, recursion, modules/packages.",
        "topics": [
          "conditions, loops, break/continue/pass, functions, scope, lambda, recursion, modules/packages"
        ],
        "hours": 9
      },
      {
        "unitNumber": 3,
        "unitCode": "UNIT 3",
        "title": "Data structures",
        "description": "strings, lists, tuples, sets, dictionaries, slicing and common operations.",
        "syllabusText": "Data structures — strings, lists, tuples, sets, dictionaries, slicing and common operations.",
        "topics": [
          "strings, lists, tuples, sets, dictionaries, slicing and common operations"
        ],
        "hours": 9
      },
      {
        "unitNumber": 4,
        "unitCode": "UNIT 4",
        "title": "Exceptions/files",
        "description": "built-in/user exceptions; open/read/write/close and file operations.",
        "syllabusText": "Exceptions/files — built-in/user exceptions; open/read/write/close and file operations.",
        "topics": [
          "built-in/user exceptions",
          "open/read/write/close and file operations"
        ],
        "hours": 9
      },
      {
        "unitNumber": 5,
        "unitCode": "UNIT 5",
        "title": "NumPy/Pandas",
        "description": "arrays, indexing/sorting, Series/DataFrames, operations and data handling.",
        "syllabusText": "NumPy/Pandas — arrays, indexing/sorting, Series/DataFrames, operations and data handling.",
        "topics": [
          "arrays, indexing/sorting, Series/DataFrames, operations and data handling"
        ],
        "hours": 9
      }
    ]
  },
  {
    "semesterNumber": 2,
    "subjectCode": "U21ECG01",
    "subjectName": "Digital Electronics",
    "category": "ESC",
    "credits": 3,
    "isElectiveSlot": false,
    "electiveSlotType": null,
    "electiveSlotCode": null,
    "practicalInfo": "",
    "syllabus": [
      {
        "unitNumber": 1,
        "unitCode": "UNIT 1",
        "title": "Boolean logic",
        "description": "number systems, complements, Boolean theorems, K-maps, NAND/NOR.",
        "syllabusText": "Boolean logic — number systems, complements, Boolean theorems, K-maps, NAND/NOR.",
        "topics": [
          "number systems, complements, Boolean theorems, K-maps, NAND/NOR"
        ],
        "hours": 9
      },
      {
        "unitNumber": 2,
        "unitCode": "UNIT 2",
        "title": "Combinational circuits",
        "description": "adders/subtractors, comparators, multiplexers, decoders, converters, parity/error control.",
        "syllabusText": "Combinational circuits — adders/subtractors, comparators, multiplexers, decoders, converters, parity/error control.",
        "topics": [
          "adders/subtractors, comparators, multiplexers, decoders, converters, parity/error control"
        ],
        "hours": 9
      },
      {
        "unitNumber": 3,
        "unitCode": "UNIT 3",
        "title": "Latches/flip",
        "description": "flops — clocked, master-slave and asynchronous inputs.",
        "syllabusText": "Latches/flip-flops — clocked, master-slave and asynchronous inputs.",
        "topics": [
          "flops — clocked, master-slave and asynchronous inputs"
        ],
        "hours": 9
      },
      {
        "unitNumber": 4,
        "unitCode": "UNIT 4",
        "title": "Sequential circuits",
        "description": "Mealy/Moore, excitation/state tables, counters.",
        "syllabusText": "Sequential circuits — Mealy/Moore, excitation/state tables, counters.",
        "topics": [
          "Mealy/Moore, excitation/state tables, counters"
        ],
        "hours": 9
      },
      {
        "unitNumber": 5,
        "unitCode": "UNIT 5",
        "title": "Registers/hazards",
        "description": "shift/ring/Johnson registers/counters and hazard-free design.",
        "syllabusText": "Registers/hazards — shift/ring/Johnson registers/counters and hazard-free design.",
        "topics": [
          "shift/ring/Johnson registers/counters and hazard-free design"
        ],
        "hours": 9
      }
    ]
  },
  {
    "semesterNumber": 2,
    "subjectCode": "U21ECG03",
    "subjectName": "Engineering Studio",
    "category": "ESC",
    "credits": 2,
    "isElectiveSlot": false,
    "electiveSlotType": null,
    "electiveSlotCode": null,
    "practicalInfo": "Basic electronics and Arduino/IoT experiments including LED, sensors, LDR, ultrasonic, PIR, servo and Bluetooth",
    "syllabus": [
      {
        "unitNumber": 1,
        "unitCode": "EXPT 1-3",
        "title": "Foundational Experiments",
        "description": "Basic electronics and Arduino/IoT experiments including LED, sensors, LDR, ultrasonic, PIR, servo and Bluetooth",
        "syllabusText": "Basic electronics and Arduino/IoT experiments including LED, sensors, LDR, ultrasonic, PIR, servo and Bluetooth",
        "topics": [
          "Basic Setup & Environment",
          "Core Practical Implementation"
        ],
        "hours": 12
      },
      {
        "unitNumber": 2,
        "unitCode": "EXPT 4-6",
        "title": "Intermediate Implementations",
        "description": "Intermediate hands-on experiments for Engineering Studio",
        "syllabusText": "Intermediate hands-on experiments for Engineering Studio",
        "topics": [
          "Module Design",
          "Testing & Verification"
        ],
        "hours": 12
      },
      {
        "unitNumber": 3,
        "unitCode": "EXPT 7-9",
        "title": "Advanced Applied Experiments",
        "description": "Advanced problem solving and application development for Engineering Studio",
        "syllabusText": "Advanced problem solving for Engineering Studio",
        "topics": [
          "System Integration",
          "Optimization"
        ],
        "hours": 12
      },
      {
        "unitNumber": 4,
        "unitCode": "EXPT 10-12",
        "title": "Mini-Project / Case Study",
        "description": "End-to-end practical project implementation for Engineering Studio",
        "syllabusText": "Mini project for Engineering Studio",
        "topics": [
          "Mini-Project Development",
          "Demonstration"
        ],
        "hours": 12
      },
      {
        "unitNumber": 5,
        "unitCode": "EXPT 13-15",
        "title": "Comprehensive Practical Viva",
        "description": "Model practical exam, viva-voce and record evaluation for Engineering Studio",
        "syllabusText": "Model exam and viva for Engineering Studio",
        "topics": [
          "Model Practical Examination",
          "Record Evaluation"
        ],
        "hours": 12
      }
    ]
  },
  {
    "semesterNumber": 2,
    "subjectCode": "U21MYC02",
    "subjectName": "Environmental Science",
    "category": "MNC",
    "credits": 0,
    "isElectiveSlot": false,
    "electiveSlotType": null,
    "electiveSlotCode": null,
    "practicalInfo": "",
    "syllabus": []
  },
  {
    "semesterNumber": 3,
    "subjectCode": "U21AD301",
    "subjectName": "Ethics and Human Life",
    "category": "HSMC",
    "credits": 3,
    "isElectiveSlot": false,
    "electiveSlotType": null,
    "electiveSlotCode": null,
    "practicalInfo": "",
    "syllabus": [
      {
        "unitNumber": 1,
        "unitCode": "UNIT 1",
        "title": "Human values and meaningful life; ethical decisions; dilemmas; self",
        "description": "management.",
        "syllabusText": "Human values and meaningful life; ethical decisions; dilemmas; self-management.",
        "topics": [
          "management"
        ],
        "hours": 9
      },
      {
        "unitNumber": 2,
        "unitCode": "UNIT 2",
        "title": "Creative/leadership development",
        "description": "intellectual, emotional, creative, spiritual, aesthetic and positive attitude.",
        "syllabusText": "Creative/leadership development — intellectual, emotional, creative, spiritual, aesthetic and positive attitude.",
        "topics": [
          "intellectual, emotional, creative, spiritual, aesthetic and positive attitude"
        ],
        "hours": 9
      },
      {
        "unitNumber": 3,
        "unitCode": "UNIT 3",
        "title": "Harmony",
        "description": "rights/duties, welfare, interpersonal skills, value-based work culture and mutual respect.",
        "syllabusText": "Harmony — rights/duties, welfare, interpersonal skills, value-based work culture and mutual respect.",
        "topics": [
          "rights/duties, welfare, interpersonal skills, value-based work culture and mutual respect"
        ],
        "hours": 9
      },
      {
        "unitNumber": 4,
        "unitCode": "UNIT 4",
        "title": "Character/virtues",
        "description": "humility, righteousness, truthfulness, integrity, responsibility, empathy, love, compassion.",
        "syllabusText": "Character/virtues — humility, righteousness, truthfulness, integrity, responsibility, empathy, love, compassion.",
        "topics": [
          "humility, righteousness, truthfulness, integrity, responsibility, empathy, love, compassion"
        ],
        "hours": 9
      },
      {
        "unitNumber": 5,
        "unitCode": "UNIT 5",
        "title": "Material development vs human welfare",
        "description": "science/technology, consumerism, nature, global harmony, democracy, equality, social justice.",
        "syllabusText": "Material development vs human welfare — science/technology, consumerism, nature, global harmony, democracy, equality, social justice.",
        "topics": [
          "science/technology, consumerism, nature, global harmony, democracy, equality, social justice"
        ],
        "hours": 9
      }
    ]
  },
  {
    "semesterNumber": 3,
    "subjectCode": "U21MAG02",
    "subjectName": "Discrete Mathematics",
    "category": "BSC",
    "credits": 4,
    "isElectiveSlot": false,
    "electiveSlotType": null,
    "electiveSlotCode": null,
    "practicalInfo": "",
    "syllabus": [
      {
        "unitNumber": 1,
        "unitCode": "UNIT 1",
        "title": "Boolean algebra and logic gates; truth t",
        "description": "Boolean algebra and logic gates; truth tables; canonical forms; Karnaugh maps.",
        "syllabusText": "Boolean algebra and logic gates; truth tables; canonical forms; Karnaugh maps.",
        "topics": [
          "Boolean algebra and logic gates",
          "truth tables",
          "canonical forms",
          "Karnaugh maps"
        ],
        "hours": 9
      },
      {
        "unitNumber": 2,
        "unitCode": "UNIT 2",
        "title": "Sets, relations, functions; groups, subg",
        "description": "Sets, relations, functions; groups, subgroups, rings and fields.",
        "syllabusText": "Sets, relations, functions; groups, subgroups, rings and fields.",
        "topics": [
          "Sets, relations, functions",
          "groups, subgroups, rings and fields"
        ],
        "hours": 9
      },
      {
        "unitNumber": 3,
        "unitCode": "UNIT 3",
        "title": "Counting; pigeonhole; permutations/combi",
        "description": "Counting; pigeonhole; permutations/combinations; recurrence; generating functions; induction.",
        "syllabusText": "Counting; pigeonhole; permutations/combinations; recurrence; generating functions; induction.",
        "topics": [
          "Counting",
          "pigeonhole",
          "permutations/combinations",
          "recurrence",
          "generating functions",
          "induction"
        ],
        "hours": 9
      },
      {
        "unitNumber": 4,
        "unitCode": "UNIT 4",
        "title": "Graphs; representations; isomorphism; co",
        "description": "Graphs; representations; isomorphism; connectivity; Euler/Hamilton; shortest path; coloring.",
        "syllabusText": "Graphs; representations; isomorphism; connectivity; Euler/Hamilton; shortest path; coloring.",
        "topics": [
          "Graphs",
          "representations",
          "isomorphism",
          "connectivity",
          "Euler/Hamilton",
          "shortest path",
          "coloring"
        ],
        "hours": 9
      },
      {
        "unitNumber": 5,
        "unitCode": "UNIT 5",
        "title": "Propositional logic; predicates; quantif",
        "description": "Propositional logic; predicates; quantifiers; inference and proofs.",
        "syllabusText": "Propositional logic; predicates; quantifiers; inference and proofs.",
        "topics": [
          "Propositional logic",
          "predicates",
          "quantifiers",
          "inference and proofs"
        ],
        "hours": 9
      }
    ]
  },
  {
    "semesterNumber": 3,
    "subjectCode": "U21IT301",
    "subjectName": "Computer Graphics and Visualization",
    "category": "PCC",
    "credits": 4,
    "isElectiveSlot": false,
    "electiveSlotType": null,
    "electiveSlotCode": null,
    "practicalInfo": "",
    "syllabus": [
      {
        "unitNumber": 1,
        "unitCode": "UNIT 1",
        "title": "Raster graphics; pixels/frame buffer; sc",
        "description": "Raster graphics; pixels/frame buffer; scan conversion; DDA/Bresenham; circles; polygon filling.",
        "syllabusText": "Raster graphics; pixels/frame buffer; scan conversion; DDA/Bresenham; circles; polygon filling.",
        "topics": [
          "Raster graphics",
          "pixels/frame buffer",
          "scan conversion",
          "DDA/Bresenham",
          "circles",
          "polygon filling"
        ],
        "hours": 9
      },
      {
        "unitNumber": 2,
        "unitCode": "UNIT 2",
        "title": "2",
        "description": "D transformations; homogeneous/composite transforms; windowing/clipping algorithms.",
        "syllabusText": "2-D transformations; homogeneous/composite transforms; windowing/clipping algorithms.",
        "topics": [
          "D transformations",
          "homogeneous/composite transforms",
          "windowing/clipping algorithms"
        ],
        "hours": 9
      },
      {
        "unitNumber": 3,
        "unitCode": "UNIT 3",
        "title": "3",
        "description": "D transformations; parallel/perspective projection; viewing; hidden-surface methods.",
        "syllabusText": "3-D transformations; parallel/perspective projection; viewing; hidden-surface methods.",
        "topics": [
          "D transformations",
          "parallel/perspective projection",
          "viewing",
          "hidden-surface methods"
        ],
        "hours": 9
      },
      {
        "unitNumber": 4,
        "unitCode": "UNIT 4",
        "title": "Raster rendering; visibility; depth buff",
        "description": "Raster rendering; visibility; depth buffering; Painter/ray tracing; shading.",
        "syllabusText": "Raster rendering; visibility; depth buffering; Painter/ray tracing; shading.",
        "topics": [
          "Raster rendering",
          "visibility",
          "depth buffering",
          "Painter/ray tracing",
          "shading"
        ],
        "hours": 9
      },
      {
        "unitNumber": 5,
        "unitCode": "UNIT 5",
        "title": "2D/3D visualization; color mapping; isos",
        "description": "2D/3D visualization; color mapping; isosurfaces; volume/time data; dimensionality reduction; visualization techniques.",
        "syllabusText": "2D/3D visualization; color mapping; isosurfaces; volume/time data; dimensionality reduction; visualization techniques.",
        "topics": [
          "2D/3D visualization",
          "color mapping",
          "isosurfaces",
          "volume/time data",
          "dimensionality reduction",
          "visualization techniques"
        ],
        "hours": 9
      }
    ]
  },
  {
    "semesterNumber": 3,
    "subjectCode": "U21CS301",
    "subjectName": "Computer Organization and Architecture",
    "category": "PCC",
    "credits": 3,
    "isElectiveSlot": false,
    "electiveSlotType": null,
    "electiveSlotCode": null,
    "practicalInfo": "",
    "syllabus": [
      {
        "unitNumber": 1,
        "unitCode": "UNIT 1",
        "title": "Computer structure; buses; instruction e",
        "description": "Computer structure; buses; instruction execution; performance; memory organization.",
        "syllabusText": "Computer structure; buses; instruction execution; performance; memory organization.",
        "topics": [
          "Computer structure",
          "buses",
          "instruction execution",
          "performance",
          "memory organization"
        ],
        "hours": 9
      },
      {
        "unitNumber": 2,
        "unitCode": "UNIT 2",
        "title": "Data path/control; instruction cycle; ha",
        "description": "Data path/control; instruction cycle; hardwired/microprogrammed control.",
        "syllabusText": "Data path/control; instruction cycle; hardwired/microprogrammed control.",
        "topics": [
          "Data path/control",
          "instruction cycle",
          "hardwired/microprogrammed control"
        ],
        "hours": 9
      },
      {
        "unitNumber": 3,
        "unitCode": "UNIT 3",
        "title": "Pipelining; hazards; RISC/CISC; pipeline",
        "description": "Pipelining; hazards; RISC/CISC; pipeline performance.",
        "syllabusText": "Pipelining; hazards; RISC/CISC; pipeline performance.",
        "topics": [
          "Pipelining",
          "hazards",
          "RISC/CISC",
          "pipeline performance"
        ],
        "hours": 9
      },
      {
        "unitNumber": 4,
        "unitCode": "UNIT 4",
        "title": "Memory hierarchy; cache; main/virtual me",
        "description": "Memory hierarchy; cache; main/virtual memory; secondary storage.",
        "syllabusText": "Memory hierarchy; cache; main/virtual memory; secondary storage.",
        "topics": [
          "Memory hierarchy",
          "cache",
          "main/virtual memory",
          "secondary storage"
        ],
        "hours": 9
      },
      {
        "unitNumber": 5,
        "unitCode": "UNIT 5",
        "title": "I/O organization; interrupts; DMA; contr",
        "description": "I/O organization; interrupts; DMA; controllers; PCI/SCSI and bus arbitration.",
        "syllabusText": "I/O organization; interrupts; DMA; controllers; PCI/SCSI and bus arbitration.",
        "topics": [
          "I/O organization",
          "interrupts",
          "DMA",
          "controllers",
          "PCI/SCSI and bus arbitration"
        ],
        "hours": 9
      }
    ]
  },
  {
    "semesterNumber": 3,
    "subjectCode": "U21AD303",
    "subjectName": "Programming Using Java",
    "category": "PCC",
    "credits": 3,
    "isElectiveSlot": false,
    "electiveSlotType": null,
    "electiveSlotCode": null,
    "practicalInfo": "",
    "syllabus": [
      {
        "unitNumber": 1,
        "unitCode": "UNIT 1",
        "title": "Java OOP basics; classes/objects; constr",
        "description": "Java OOP basics; classes/objects; constructors; methods; static members; packages/control flow.",
        "syllabusText": "Java OOP basics; classes/objects; constructors; methods; static members; packages/control flow.",
        "topics": [
          "Java OOP basics",
          "classes/objects",
          "constructors",
          "methods",
          "static members",
          "packages/control flow"
        ],
        "hours": 9
      },
      {
        "unitNumber": 2,
        "unitCode": "UNIT 2",
        "title": "Inheritance/interfaces; overriding/overl",
        "description": "Inheritance/interfaces; overriding/overloading; abstract/inner classes; access modifiers.",
        "syllabusText": "Inheritance/interfaces; overriding/overloading; abstract/inner classes; access modifiers.",
        "topics": [
          "Inheritance/interfaces",
          "overriding/overloading",
          "abstract/inner classes",
          "access modifiers"
        ],
        "hours": 9
      },
      {
        "unitNumber": 3,
        "unitCode": "UNIT 3",
        "title": "Exceptions and multithreading; synchronization and inter",
        "description": "thread communication.",
        "syllabusText": "Exceptions and multithreading; synchronization and inter-thread communication.",
        "topics": [
          "thread communication"
        ],
        "hours": 9
      },
      {
        "unitNumber": 4,
        "unitCode": "UNIT 4",
        "title": "Packages; streams; files; serialization;",
        "description": "Packages; streams; files; serialization; collections/generics.",
        "syllabusText": "Packages; streams; files; serialization; collections/generics.",
        "topics": [
          "Packages",
          "streams",
          "files",
          "serialization",
          "collections/generics"
        ],
        "hours": 9
      },
      {
        "unitNumber": 5,
        "unitCode": "UNIT 5",
        "title": "Collections and JDBC; database connectiv",
        "description": "Collections and JDBC; database connectivity and applications.",
        "syllabusText": "Collections and JDBC; database connectivity and applications.",
        "topics": [
          "Collections and JDBC",
          "database connectivity and applications"
        ],
        "hours": 9
      }
    ]
  },
  {
    "semesterNumber": 3,
    "subjectCode": "U21CSG03",
    "subjectName": "Data Structures",
    "category": "PCC",
    "credits": 3,
    "isElectiveSlot": false,
    "electiveSlotType": null,
    "electiveSlotCode": null,
    "practicalInfo": "",
    "syllabus": [
      {
        "unitNumber": 1,
        "unitCode": "UNIT 1",
        "title": "ADTs and linked lists; singly/doubly/cir",
        "description": "ADTs and linked lists; singly/doubly/circular lists.",
        "syllabusText": "ADTs and linked lists; singly/doubly/circular lists.",
        "topics": [
          "ADTs and linked lists",
          "singly/doubly/circular lists"
        ],
        "hours": 9
      },
      {
        "unitNumber": 2,
        "unitCode": "UNIT 2",
        "title": "Stacks/queues; expression conversion/eva",
        "description": "Stacks/queues; expression conversion/evaluation; circular queue/deque.",
        "syllabusText": "Stacks/queues; expression conversion/evaluation; circular queue/deque.",
        "topics": [
          "Stacks/queues",
          "expression conversion/evaluation",
          "circular queue/deque"
        ],
        "hours": 9
      },
      {
        "unitNumber": 3,
        "unitCode": "UNIT 3",
        "title": "Searching, sorting and hashing; collisio",
        "description": "Searching, sorting and hashing; collision handling.",
        "syllabusText": "Searching, sorting and hashing; collision handling.",
        "topics": [
          "Searching, sorting and hashing",
          "collision handling"
        ],
        "hours": 9
      },
      {
        "unitNumber": 4,
        "unitCode": "UNIT 4",
        "title": "Trees/BST/AVL/B",
        "description": "tree/B+; graph representations; BFS/DFS.",
        "syllabusText": "Trees/BST/AVL/B-tree/B+; graph representations; BFS/DFS.",
        "topics": [
          "tree/B+",
          "graph representations",
          "BFS/DFS"
        ],
        "hours": 9
      },
      {
        "unitNumber": 5,
        "unitCode": "UNIT 5",
        "title": "Topological sorting; minimum spanning tr",
        "description": "Topological sorting; minimum spanning trees; shortest path; Dijkstra.",
        "syllabusText": "Topological sorting; minimum spanning trees; shortest path; Dijkstra.",
        "topics": [
          "Topological sorting",
          "minimum spanning trees",
          "shortest path",
          "Dijkstra"
        ],
        "hours": 9
      }
    ]
  },
  {
    "semesterNumber": 3,
    "subjectCode": "U21AD307",
    "subjectName": "Java Laboratory",
    "category": "PCC",
    "credits": 1,
    "isElectiveSlot": false,
    "electiveSlotType": null,
    "electiveSlotCode": null,
    "practicalInfo": "Java classes/objects, inheritance/interfaces, exceptions, collections, file handling, JDBC and applications",
    "syllabus": [
      {
        "unitNumber": 1,
        "unitCode": "EXPT 1-3",
        "title": "Foundational Experiments",
        "description": "Java classes/objects, inheritance/interfaces, exceptions, collections, file handling, JDBC and applications",
        "syllabusText": "Java classes/objects, inheritance/interfaces, exceptions, collections, file handling, JDBC and applications",
        "topics": [
          "Basic Setup & Environment",
          "Core Practical Implementation"
        ],
        "hours": 12
      },
      {
        "unitNumber": 2,
        "unitCode": "EXPT 4-6",
        "title": "Intermediate Implementations",
        "description": "Intermediate hands-on experiments for Java Laboratory",
        "syllabusText": "Intermediate hands-on experiments for Java Laboratory",
        "topics": [
          "Module Design",
          "Testing & Verification"
        ],
        "hours": 12
      },
      {
        "unitNumber": 3,
        "unitCode": "EXPT 7-9",
        "title": "Advanced Applied Experiments",
        "description": "Advanced problem solving and application development for Java Laboratory",
        "syllabusText": "Advanced problem solving for Java Laboratory",
        "topics": [
          "System Integration",
          "Optimization"
        ],
        "hours": 12
      },
      {
        "unitNumber": 4,
        "unitCode": "EXPT 10-12",
        "title": "Mini-Project / Case Study",
        "description": "End-to-end practical project implementation for Java Laboratory",
        "syllabusText": "Mini project for Java Laboratory",
        "topics": [
          "Mini-Project Development",
          "Demonstration"
        ],
        "hours": 12
      },
      {
        "unitNumber": 5,
        "unitCode": "EXPT 13-15",
        "title": "Comprehensive Practical Viva",
        "description": "Model practical exam, viva-voce and record evaluation for Java Laboratory",
        "syllabusText": "Model exam and viva for Java Laboratory",
        "topics": [
          "Model Practical Examination",
          "Record Evaluation"
        ],
        "hours": 12
      }
    ]
  },
  {
    "semesterNumber": 3,
    "subjectCode": "U21IT302",
    "subjectName": "Design Studio I",
    "category": "EEC",
    "credits": 1,
    "isElectiveSlot": false,
    "electiveSlotType": null,
    "electiveSlotCode": null,
    "practicalInfo": "Team design-thinking project: problem definition, prototyping, testing, documentation and presentation",
    "syllabus": [
      {
        "unitNumber": 1,
        "unitCode": "EXPT 1-3",
        "title": "Foundational Experiments",
        "description": "Team design-thinking project: problem definition, prototyping, testing, documentation and presentation",
        "syllabusText": "Team design-thinking project: problem definition, prototyping, testing, documentation and presentation",
        "topics": [
          "Basic Setup & Environment",
          "Core Practical Implementation"
        ],
        "hours": 12
      },
      {
        "unitNumber": 2,
        "unitCode": "EXPT 4-6",
        "title": "Intermediate Implementations",
        "description": "Intermediate hands-on experiments for Design Studio I",
        "syllabusText": "Intermediate hands-on experiments for Design Studio I",
        "topics": [
          "Module Design",
          "Testing & Verification"
        ],
        "hours": 12
      },
      {
        "unitNumber": 3,
        "unitCode": "EXPT 7-9",
        "title": "Advanced Applied Experiments",
        "description": "Advanced problem solving and application development for Design Studio I",
        "syllabusText": "Advanced problem solving for Design Studio I",
        "topics": [
          "System Integration",
          "Optimization"
        ],
        "hours": 12
      },
      {
        "unitNumber": 4,
        "unitCode": "EXPT 10-12",
        "title": "Mini-Project / Case Study",
        "description": "End-to-end practical project implementation for Design Studio I",
        "syllabusText": "Mini project for Design Studio I",
        "topics": [
          "Mini-Project Development",
          "Demonstration"
        ],
        "hours": 12
      },
      {
        "unitNumber": 5,
        "unitCode": "EXPT 13-15",
        "title": "Comprehensive Practical Viva",
        "description": "Model practical exam, viva-voce and record evaluation for Design Studio I",
        "syllabusText": "Model exam and viva for Design Studio I",
        "topics": [
          "Model Practical Examination",
          "Record Evaluation"
        ],
        "hours": 12
      }
    ]
  },
  {
    "semesterNumber": 3,
    "subjectCode": "U21MYC03",
    "subjectName": "Knowledge/mandatory non-credit course",
    "category": "MNC",
    "credits": 0,
    "isElectiveSlot": false,
    "electiveSlotType": null,
    "electiveSlotCode": null,
    "practicalInfo": "",
    "syllabus": []
  },
  {
    "semesterNumber": 4,
    "subjectCode": "U21MA403",
    "subjectName": "Probability and Queuing Theory",
    "category": "BSC",
    "credits": 3,
    "isElectiveSlot": false,
    "electiveSlotType": null,
    "electiveSlotCode": null,
    "practicalInfo": "",
    "syllabus": [
      {
        "unitNumber": 1,
        "unitCode": "UNIT 1",
        "title": "Probability axioms; conditional probabil",
        "description": "Probability axioms; conditional probability; Bayes; random variables; moments.",
        "syllabusText": "Probability axioms; conditional probability; Bayes; random variables; moments.",
        "topics": [
          "Probability axioms",
          "conditional probability",
          "Bayes",
          "random variables",
          "moments"
        ],
        "hours": 9
      },
      {
        "unitNumber": 2,
        "unitCode": "UNIT 2",
        "title": "Binomial, Poisson, exponential, uniform",
        "description": "Binomial, Poisson, exponential, uniform and normal distributions.",
        "syllabusText": "Binomial, Poisson, exponential, uniform and normal distributions.",
        "topics": [
          "Binomial, Poisson, exponential, uniform and normal distributions"
        ],
        "hours": 9
      },
      {
        "unitNumber": 3,
        "unitCode": "UNIT 3",
        "title": "Two",
        "description": "dimensional distributions; covariance/correlation; regression.",
        "syllabusText": "Two-dimensional distributions; covariance/correlation; regression.",
        "topics": [
          "dimensional distributions",
          "covariance/correlation",
          "regression"
        ],
        "hours": 9
      },
      {
        "unitNumber": 4,
        "unitCode": "UNIT 4",
        "title": "Random processes; Markov, Bernoulli and",
        "description": "Random processes; Markov, Bernoulli and Poisson processes.",
        "syllabusText": "Random processes; Markov, Bernoulli and Poisson processes.",
        "topics": [
          "Random processes",
          "Markov, Bernoulli and Poisson processes"
        ],
        "hours": 9
      },
      {
        "unitNumber": 5,
        "unitCode": "UNIT 5",
        "title": "Queueing models; birth/death; single/mul",
        "description": "Queueing models; birth/death; single/multiple server; Little's formula.",
        "syllabusText": "Queueing models; birth/death; single/multiple server; Little's formula.",
        "topics": [
          "Queueing models",
          "birth/death",
          "single/multiple server",
          "Little's formula"
        ],
        "hours": 9
      }
    ]
  },
  {
    "semesterNumber": 4,
    "subjectCode": "U21CS401",
    "subjectName": "Design and Analysis of Algorithms",
    "category": "PCC",
    "credits": 3,
    "isElectiveSlot": false,
    "electiveSlotType": null,
    "electiveSlotCode": null,
    "practicalInfo": "",
    "syllabus": [
      {
        "unitNumber": 1,
        "unitCode": "UNIT 1",
        "title": "Problem solving; sorting/searching; comb",
        "description": "Problem solving; sorting/searching; combinatorial problems; data structures; trees/graphs.",
        "syllabusText": "Problem solving; sorting/searching; combinatorial problems; data structures; trees/graphs.",
        "topics": [
          "Problem solving",
          "sorting/searching",
          "combinatorial problems",
          "data structures",
          "trees/graphs"
        ],
        "hours": 9
      },
      {
        "unitNumber": 2,
        "unitCode": "UNIT 2",
        "title": "Asymptotic notation; efficiency analysis; recursive/non",
        "description": "recursive and empirical analysis.",
        "syllabusText": "Asymptotic notation; efficiency analysis; recursive/non-recursive and empirical analysis.",
        "topics": [
          "recursive and empirical analysis"
        ],
        "hours": 9
      },
      {
        "unitNumber": 3,
        "unitCode": "UNIT 3",
        "title": "Sorting/searching analysis; divide",
        "description": "and-conquer and randomized methods.",
        "syllabusText": "Sorting/searching analysis; divide-and-conquer and randomized methods.",
        "topics": [
          "and-conquer and randomized methods"
        ],
        "hours": 9
      },
      {
        "unitNumber": 4,
        "unitCode": "UNIT 4",
        "title": "Graph algorithms; BFS/DFS; topological;",
        "description": "Graph algorithms; BFS/DFS; topological; Warshall/Floyd; MST; Dijkstra.",
        "syllabusText": "Graph algorithms; BFS/DFS; topological; Warshall/Floyd; MST; Dijkstra.",
        "topics": [
          "Graph algorithms",
          "BFS/DFS",
          "topological",
          "Warshall/Floyd",
          "MST",
          "Dijkstra"
        ],
        "hours": 9
      },
      {
        "unitNumber": 5,
        "unitCode": "UNIT 5",
        "title": "P/NP; backtracking; N",
        "description": "Queens; Hamiltonian circuit; branch-and-bound; knapsack.",
        "syllabusText": "P/NP; backtracking; N-Queens; Hamiltonian circuit; branch-and-bound; knapsack.",
        "topics": [
          "Queens",
          "Hamiltonian circuit",
          "branch-and-bound",
          "knapsack"
        ],
        "hours": 9
      }
    ]
  },
  {
    "semesterNumber": 4,
    "subjectCode": "U21AD402",
    "subjectName": "Database Design and Management",
    "category": "PCC",
    "credits": 3,
    "isElectiveSlot": false,
    "electiveSlotType": null,
    "electiveSlotCode": null,
    "practicalInfo": "",
    "syllabus": [
      {
        "unitNumber": 1,
        "unitCode": "UNIT 1",
        "title": "DBMS purpose/architecture; data models;",
        "description": "DBMS purpose/architecture; data models; relational model; keys; ER/EER.",
        "syllabusText": "DBMS purpose/architecture; data models; relational model; keys; ER/EER.",
        "topics": [
          "DBMS purpose/architecture",
          "data models",
          "relational model",
          "keys",
          "ER/EER"
        ],
        "hours": 9
      },
      {
        "unitNumber": 2,
        "unitCode": "UNIT 2",
        "title": "ER/EER design; anomalies; functional dep",
        "description": "ER/EER design; anomalies; functional dependencies; normalization/decomposition.",
        "syllabusText": "ER/EER design; anomalies; functional dependencies; normalization/decomposition.",
        "topics": [
          "ER/EER design",
          "anomalies",
          "functional dependencies",
          "normalization/decomposition"
        ],
        "hours": 9
      },
      {
        "unitNumber": 3,
        "unitCode": "UNIT 3",
        "title": "SQL/PLSQL; DDL/DML/DCL; joins; subquerie",
        "description": "SQL/PLSQL; DDL/DML/DCL; joins; subqueries; procedures/functions/triggers.",
        "syllabusText": "SQL/PLSQL; DDL/DML/DCL; joins; subqueries; procedures/functions/triggers.",
        "topics": [
          "SQL/PLSQL",
          "DDL/DML/DCL",
          "joins",
          "subqueries",
          "procedures/functions/triggers"
        ],
        "hours": 9
      },
      {
        "unitNumber": 4,
        "unitCode": "UNIT 4",
        "title": "Transactions; serializability; locks; co",
        "description": "Transactions; serializability; locks; concurrency; timestamp/recovery.",
        "syllabusText": "Transactions; serializability; locks; concurrency; timestamp/recovery.",
        "topics": [
          "Transactions",
          "serializability",
          "locks",
          "concurrency",
          "timestamp/recovery"
        ],
        "hours": 9
      },
      {
        "unitNumber": 5,
        "unitCode": "UNIT 5",
        "title": "NoSQL; graph/key",
        "description": "value/document stores; MongoDB model and CRUD.",
        "syllabusText": "NoSQL; graph/key-value/document stores; MongoDB model and CRUD.",
        "topics": [
          "value/document stores",
          "MongoDB model and CRUD"
        ],
        "hours": 9
      }
    ]
  },
  {
    "semesterNumber": 4,
    "subjectCode": "U21CS403",
    "subjectName": "Operating Systems",
    "category": "PCC",
    "credits": 3,
    "isElectiveSlot": false,
    "electiveSlotType": null,
    "electiveSlotCode": null,
    "practicalInfo": "",
    "syllabus": [
      {
        "unitNumber": 1,
        "unitCode": "UNIT 1",
        "title": "OS overview; memory/cache; interrupts; s",
        "description": "OS overview; memory/cache; interrupts; services/system calls.",
        "syllabusText": "OS overview; memory/cache; interrupts; services/system calls.",
        "topics": [
          "OS overview",
          "memory/cache",
          "interrupts",
          "services/system calls"
        ],
        "hours": 9
      },
      {
        "unitNumber": 2,
        "unitCode": "UNIT 2",
        "title": "Processes/threads; scheduling; IPC; crit",
        "description": "Processes/threads; scheduling; IPC; critical section; synchronization; semaphores/monitors.",
        "syllabusText": "Processes/threads; scheduling; IPC; critical section; synchronization; semaphores/monitors.",
        "topics": [
          "Processes/threads",
          "scheduling",
          "IPC",
          "critical section",
          "synchronization",
          "semaphores/monitors"
        ],
        "hours": 9
      },
      {
        "unitNumber": 3,
        "unitCode": "UNIT 3",
        "title": "Deadlock conditions; detection; Banker;",
        "description": "Deadlock conditions; detection; Banker; prevention/recovery.",
        "syllabusText": "Deadlock conditions; detection; Banker; prevention/recovery.",
        "topics": [
          "Deadlock conditions",
          "detection",
          "Banker",
          "prevention/recovery"
        ],
        "hours": 9
      },
      {
        "unitNumber": 4,
        "unitCode": "UNIT 4",
        "title": "Memory allocation; paging; segmentation;",
        "description": "Memory allocation; paging; segmentation; virtual memory; swapping/demand paging.",
        "syllabusText": "Memory allocation; paging; segmentation; virtual memory; swapping/demand paging.",
        "topics": [
          "Memory allocation",
          "paging",
          "segmentation",
          "virtual memory",
          "swapping/demand paging"
        ],
        "hours": 9
      },
      {
        "unitNumber": 5,
        "unitCode": "UNIT 5",
        "title": "File systems; directories; disk scheduli",
        "description": "File systems; directories; disk scheduling; swap; Linux case study.",
        "syllabusText": "File systems; directories; disk scheduling; swap; Linux case study.",
        "topics": [
          "File systems",
          "directories",
          "disk scheduling",
          "swap",
          "Linux case study"
        ],
        "hours": 9
      }
    ]
  },
  {
    "semesterNumber": 4,
    "subjectCode": "OEC-I",
    "subjectName": "Open Elective - I",
    "category": "OEC",
    "credits": 3,
    "isElectiveSlot": true,
    "electiveSlotType": "OEC",
    "electiveSlotCode": "OEC-I",
    "practicalInfo": "",
    "syllabus": []
  },
  {
    "semesterNumber": 4,
    "subjectCode": "U21IT401",
    "subjectName": "Internet Programming",
    "category": "PCC",
    "credits": 3,
    "isElectiveSlot": false,
    "electiveSlotType": null,
    "electiveSlotCode": null,
    "practicalInfo": "",
    "syllabus": [
      {
        "unitNumber": 1,
        "unitCode": "UNIT 1",
        "title": "HTML structure/elements; links; lists; i",
        "description": "HTML structure/elements; links; lists; images; tables; forms; URLs.",
        "syllabusText": "HTML structure/elements; links; lists; images; tables; forms; URLs.",
        "topics": [
          "HTML structure/elements",
          "links",
          "lists",
          "images",
          "tables",
          "forms",
          "URLs"
        ],
        "hours": 9
      },
      {
        "unitNumber": 2,
        "unitCode": "UNIT 2",
        "title": "CSS selectors; backgrounds/colors; fonts",
        "description": "CSS selectors; backgrounds/colors; fonts/text; positioning; boxes/columns.",
        "syllabusText": "CSS selectors; backgrounds/colors; fonts/text; positioning; boxes/columns.",
        "topics": [
          "CSS selectors",
          "backgrounds/colors",
          "fonts/text",
          "positioning",
          "boxes/columns"
        ],
        "hours": 9
      },
      {
        "unitNumber": 3,
        "unitCode": "UNIT 3",
        "title": "JavaScript; events; DOM; forms/validatio",
        "description": "JavaScript; events; DOM; forms/validation; dynamic HTML.",
        "syllabusText": "JavaScript; events; DOM; forms/validation; dynamic HTML.",
        "topics": [
          "JavaScript",
          "events",
          "DOM",
          "forms/validation",
          "dynamic HTML"
        ],
        "hours": 9
      },
      {
        "unitNumber": 4,
        "unitCode": "UNIT 4",
        "title": "PHP syntax/types/control; forms; session",
        "description": "PHP syntax/types/control; forms; sessions/cookies; MySQL integration.",
        "syllabusText": "PHP syntax/types/control; forms; sessions/cookies; MySQL integration.",
        "topics": [
          "PHP syntax/types/control",
          "forms",
          "sessions/cookies",
          "MySQL integration"
        ],
        "hours": 9
      },
      {
        "unitNumber": 5,
        "unitCode": "UNIT 5",
        "title": "MySQL databases/tables/queries; mappings",
        "description": "MySQL databases/tables/queries; mappings; sample web application.",
        "syllabusText": "MySQL databases/tables/queries; mappings; sample web application.",
        "topics": [
          "MySQL databases/tables/queries",
          "mappings",
          "sample web application"
        ],
        "hours": 9
      }
    ]
  },
  {
    "semesterNumber": 4,
    "subjectCode": "U21SSG01",
    "subjectName": "Soft Skills - I",
    "category": "HSMC",
    "credits": 1,
    "isElectiveSlot": false,
    "electiveSlotType": null,
    "electiveSlotCode": null,
    "practicalInfo": "",
    "syllabus": [
      {
        "unitNumber": 1,
        "unitCode": "UNIT 1",
        "title": "Verbal competence",
        "description": "analogy, error spotting, sentence ordering, listening.",
        "syllabusText": "Verbal competence — analogy, error spotting, sentence ordering, listening.",
        "topics": [
          "analogy, error spotting, sentence ordering, listening"
        ],
        "hours": 9
      },
      {
        "unitNumber": 2,
        "unitCode": "UNIT 2",
        "title": "Effective communication",
        "description": "barriers, body language, etiquette, 7 Cs.",
        "syllabusText": "Effective communication — barriers, body language, etiquette, 7 Cs.",
        "topics": [
          "barriers, body language, etiquette, 7 Cs"
        ],
        "hours": 9
      },
      {
        "unitNumber": 3,
        "unitCode": "UNIT 3",
        "title": "Interpersonal skills",
        "description": "group decisions, negotiation, planning, problem solving.",
        "syllabusText": "Interpersonal skills — group decisions, negotiation, planning, problem solving.",
        "topics": [
          "group decisions, negotiation, planning, problem solving"
        ],
        "hours": 9
      },
      {
        "unitNumber": 4,
        "unitCode": "UNIT 4",
        "title": "Communication practice",
        "description": "role play, listening, presentation and speaking.",
        "syllabusText": "Communication practice — role play, listening, presentation and speaking.",
        "topics": [
          "role play, listening, presentation and speaking"
        ],
        "hours": 9
      },
      {
        "unitNumber": 5,
        "unitCode": "UNIT 5",
        "title": "Career/workplace communication.",
        "description": "Career/workplace communication.",
        "syllabusText": "Career/workplace communication.",
        "topics": [
          "Career/workplace communication"
        ],
        "hours": 9
      }
    ]
  },
  {
    "semesterNumber": 4,
    "subjectCode": "U21CS404",
    "subjectName": "Operating Systems Laboratory",
    "category": "PCC",
    "credits": 1,
    "isElectiveSlot": false,
    "electiveSlotType": null,
    "electiveSlotCode": null,
    "practicalInfo": "Unix/shell, process management, CPU scheduling, IPC, synchronization, deadlock, memory and disk scheduling",
    "syllabus": [
      {
        "unitNumber": 1,
        "unitCode": "EXPT 1-3",
        "title": "Foundational Experiments",
        "description": "Unix/shell, process management, CPU scheduling, IPC, synchronization, deadlock, memory and disk scheduling",
        "syllabusText": "Unix/shell, process management, CPU scheduling, IPC, synchronization, deadlock, memory and disk scheduling",
        "topics": [
          "Basic Setup & Environment",
          "Core Practical Implementation"
        ],
        "hours": 12
      },
      {
        "unitNumber": 2,
        "unitCode": "EXPT 4-6",
        "title": "Intermediate Implementations",
        "description": "Intermediate hands-on experiments for Operating Systems Laboratory",
        "syllabusText": "Intermediate hands-on experiments for Operating Systems Laboratory",
        "topics": [
          "Module Design",
          "Testing & Verification"
        ],
        "hours": 12
      },
      {
        "unitNumber": 3,
        "unitCode": "EXPT 7-9",
        "title": "Advanced Applied Experiments",
        "description": "Advanced problem solving and application development for Operating Systems Laboratory",
        "syllabusText": "Advanced problem solving for Operating Systems Laboratory",
        "topics": [
          "System Integration",
          "Optimization"
        ],
        "hours": 12
      },
      {
        "unitNumber": 4,
        "unitCode": "EXPT 10-12",
        "title": "Mini-Project / Case Study",
        "description": "End-to-end practical project implementation for Operating Systems Laboratory",
        "syllabusText": "Mini project for Operating Systems Laboratory",
        "topics": [
          "Mini-Project Development",
          "Demonstration"
        ],
        "hours": 12
      },
      {
        "unitNumber": 5,
        "unitCode": "EXPT 13-15",
        "title": "Comprehensive Practical Viva",
        "description": "Model practical exam, viva-voce and record evaluation for Operating Systems Laboratory",
        "syllabusText": "Model exam and viva for Operating Systems Laboratory",
        "topics": [
          "Model Practical Examination",
          "Record Evaluation"
        ],
        "hours": 12
      }
    ]
  },
  {
    "semesterNumber": 4,
    "subjectCode": "U21AD406",
    "subjectName": "Database Laboratory",
    "category": "PCC",
    "credits": 2,
    "isElectiveSlot": false,
    "electiveSlotType": null,
    "electiveSlotCode": null,
    "practicalInfo": "ER/normalization, SQL, joins, PL/SQL, procedures/functions/triggers and MongoDB",
    "syllabus": [
      {
        "unitNumber": 1,
        "unitCode": "EXPT 1-3",
        "title": "Foundational Experiments",
        "description": "ER/normalization, SQL, joins, PL/SQL, procedures/functions/triggers and MongoDB",
        "syllabusText": "ER/normalization, SQL, joins, PL/SQL, procedures/functions/triggers and MongoDB",
        "topics": [
          "Basic Setup & Environment",
          "Core Practical Implementation"
        ],
        "hours": 12
      },
      {
        "unitNumber": 2,
        "unitCode": "EXPT 4-6",
        "title": "Intermediate Implementations",
        "description": "Intermediate hands-on experiments for Database Laboratory",
        "syllabusText": "Intermediate hands-on experiments for Database Laboratory",
        "topics": [
          "Module Design",
          "Testing & Verification"
        ],
        "hours": 12
      },
      {
        "unitNumber": 3,
        "unitCode": "EXPT 7-9",
        "title": "Advanced Applied Experiments",
        "description": "Advanced problem solving and application development for Database Laboratory",
        "syllabusText": "Advanced problem solving for Database Laboratory",
        "topics": [
          "System Integration",
          "Optimization"
        ],
        "hours": 12
      },
      {
        "unitNumber": 4,
        "unitCode": "EXPT 10-12",
        "title": "Mini-Project / Case Study",
        "description": "End-to-end practical project implementation for Database Laboratory",
        "syllabusText": "Mini project for Database Laboratory",
        "topics": [
          "Mini-Project Development",
          "Demonstration"
        ],
        "hours": 12
      },
      {
        "unitNumber": 5,
        "unitCode": "EXPT 13-15",
        "title": "Comprehensive Practical Viva",
        "description": "Model practical exam, viva-voce and record evaluation for Database Laboratory",
        "syllabusText": "Model exam and viva for Database Laboratory",
        "topics": [
          "Model Practical Examination",
          "Record Evaluation"
        ],
        "hours": 12
      }
    ]
  },
  {
    "semesterNumber": 4,
    "subjectCode": "U21IT402",
    "subjectName": "Design Studio - II",
    "category": "EEC",
    "credits": 1,
    "isElectiveSlot": false,
    "electiveSlotType": null,
    "electiveSlotCode": null,
    "practicalInfo": "Team design project with prototype, testing, project management and presentation",
    "syllabus": [
      {
        "unitNumber": 1,
        "unitCode": "EXPT 1-3",
        "title": "Foundational Experiments",
        "description": "Team design project with prototype, testing, project management and presentation",
        "syllabusText": "Team design project with prototype, testing, project management and presentation",
        "topics": [
          "Basic Setup & Environment",
          "Core Practical Implementation"
        ],
        "hours": 12
      },
      {
        "unitNumber": 2,
        "unitCode": "EXPT 4-6",
        "title": "Intermediate Implementations",
        "description": "Intermediate hands-on experiments for Design Studio - II",
        "syllabusText": "Intermediate hands-on experiments for Design Studio - II",
        "topics": [
          "Module Design",
          "Testing & Verification"
        ],
        "hours": 12
      },
      {
        "unitNumber": 3,
        "unitCode": "EXPT 7-9",
        "title": "Advanced Applied Experiments",
        "description": "Advanced problem solving and application development for Design Studio - II",
        "syllabusText": "Advanced problem solving for Design Studio - II",
        "topics": [
          "System Integration",
          "Optimization"
        ],
        "hours": 12
      },
      {
        "unitNumber": 4,
        "unitCode": "EXPT 10-12",
        "title": "Mini-Project / Case Study",
        "description": "End-to-end practical project implementation for Design Studio - II",
        "syllabusText": "Mini project for Design Studio - II",
        "topics": [
          "Mini-Project Development",
          "Demonstration"
        ],
        "hours": 12
      },
      {
        "unitNumber": 5,
        "unitCode": "EXPT 13-15",
        "title": "Comprehensive Practical Viva",
        "description": "Model practical exam, viva-voce and record evaluation for Design Studio - II",
        "syllabusText": "Model exam and viva for Design Studio - II",
        "topics": [
          "Model Practical Examination",
          "Record Evaluation"
        ],
        "hours": 12
      }
    ]
  },
  {
    "semesterNumber": 4,
    "subjectCode": "U21MYC04",
    "subjectName": "Indian Constitution",
    "category": "MNC",
    "credits": 0,
    "isElectiveSlot": false,
    "electiveSlotType": null,
    "electiveSlotCode": null,
    "practicalInfo": "",
    "syllabus": []
  },
  {
    "semesterNumber": 5,
    "subjectCode": "U21ITG01",
    "subjectName": "Software Engineering",
    "category": "PCC",
    "credits": 3,
    "isElectiveSlot": false,
    "electiveSlotType": null,
    "electiveSlotCode": null,
    "practicalInfo": "",
    "syllabus": [
      {
        "unitNumber": 1,
        "unitCode": "UNIT 1",
        "title": "Software process models",
        "description": "waterfall, prototyping, RAD, agile.",
        "syllabusText": "Software process models — waterfall, prototyping, RAD, agile.",
        "topics": [
          "waterfall, prototyping, RAD, agile"
        ],
        "hours": 9
      },
      {
        "unitNumber": 2,
        "unitCode": "UNIT 2",
        "title": "Requirements",
        "description": "functional/non-functional; feasibility; elicitation; management.",
        "syllabusText": "Requirements — functional/non-functional; feasibility; elicitation; management.",
        "topics": [
          "functional/non-functional",
          "feasibility",
          "elicitation",
          "management"
        ],
        "hours": 9
      },
      {
        "unitNumber": 3,
        "unitCode": "UNIT 3",
        "title": "Design",
        "description": "principles; behavioral modeling; modularity; architecture; coupling/cohesion; documentation.",
        "syllabusText": "Design — principles; behavioral modeling; modularity; architecture; coupling/cohesion; documentation.",
        "topics": [
          "principles",
          "behavioral modeling",
          "modularity",
          "architecture",
          "coupling/cohesion",
          "documentation"
        ],
        "hours": 9
      },
      {
        "unitNumber": 4,
        "unitCode": "UNIT 4",
        "title": "Testing",
        "description": "strategies; system testing; debugging; white/black-box; model-based; OO/web/configuration.",
        "syllabusText": "Testing — strategies; system testing; debugging; white/black-box; model-based; OO/web/configuration.",
        "topics": [
          "strategies",
          "system testing",
          "debugging",
          "white/black-box",
          "model-based",
          "OO/web/configuration"
        ],
        "hours": 9
      },
      {
        "unitNumber": 5,
        "unitCode": "UNIT 5",
        "title": "CASE tools",
        "description": "scope, life-cycle support, software-process improvement and CASE environment.",
        "syllabusText": "CASE tools — scope, life-cycle support, software-process improvement and CASE environment.",
        "topics": [
          "scope, life-cycle support, software-process improvement and CASE environment"
        ],
        "hours": 9
      }
    ]
  },
  {
    "semesterNumber": 5,
    "subjectCode": "U21ITG02",
    "subjectName": "Information Security",
    "category": "PCC",
    "credits": 3,
    "isElectiveSlot": false,
    "electiveSlotType": null,
    "electiveSlotCode": null,
    "practicalInfo": "",
    "syllabus": [
      {
        "unitNumber": 1,
        "unitCode": "UNIT 1",
        "title": "Classical cryptography; attacks/services",
        "description": "Classical cryptography; attacks/services; symmetric ciphers; DES.",
        "syllabusText": "Classical cryptography; attacks/services; symmetric ciphers; DES.",
        "topics": [
          "Classical cryptography",
          "attacks/services",
          "symmetric ciphers",
          "DES"
        ],
        "hours": 9
      },
      {
        "unitNumber": 2,
        "unitCode": "UNIT 2",
        "title": "Block ciphers; DES modes; RSA; Diffie",
        "description": "Hellman; ElGamal.",
        "syllabusText": "Block ciphers; DES modes; RSA; Diffie-Hellman; ElGamal.",
        "topics": [
          "Hellman",
          "ElGamal"
        ],
        "hours": 9
      },
      {
        "unitNumber": 3,
        "unitCode": "UNIT 3",
        "title": "Number theory; modular arithmetic; prime",
        "description": "Number theory; modular arithmetic; primes; Fermat/Euler; asymmetric algorithms.",
        "syllabusText": "Number theory; modular arithmetic; primes; Fermat/Euler; asymmetric algorithms.",
        "topics": [
          "Number theory",
          "modular arithmetic",
          "primes",
          "Fermat/Euler",
          "asymmetric algorithms"
        ],
        "hours": 9
      },
      {
        "unitNumber": 4,
        "unitCode": "UNIT 4",
        "title": "SHA/hash; message authentication; random",
        "description": "SHA/hash; message authentication; random numbers; digital signatures.",
        "syllabusText": "SHA/hash; message authentication; random numbers; digital signatures.",
        "topics": [
          "SHA/hash",
          "message authentication",
          "random numbers",
          "digital signatures"
        ],
        "hours": 9
      },
      {
        "unitNumber": 5,
        "unitCode": "UNIT 5",
        "title": "X.509; PKI; user authentication; Kerbero",
        "description": "X.509; PKI; user authentication; Kerberos.",
        "syllabusText": "X.509; PKI; user authentication; Kerberos.",
        "topics": [
          "X.509",
          "PKI",
          "user authentication",
          "Kerberos"
        ],
        "hours": 9
      }
    ]
  },
  {
    "semesterNumber": 5,
    "subjectCode": "PEC-I",
    "subjectName": "Professional Elective - I",
    "category": "PEC",
    "credits": 3,
    "isElectiveSlot": true,
    "electiveSlotType": "PEC",
    "electiveSlotCode": "PEC-I",
    "practicalInfo": "",
    "syllabus": []
  },
  {
    "semesterNumber": 5,
    "subjectCode": "PEC-II",
    "subjectName": "Professional Elective - II",
    "category": "PEC",
    "credits": 3,
    "isElectiveSlot": true,
    "electiveSlotType": "PEC",
    "electiveSlotCode": "PEC-II",
    "practicalInfo": "",
    "syllabus": []
  },
  {
    "semesterNumber": 5,
    "subjectCode": "OEC-II",
    "subjectName": "Open Elective - II",
    "category": "OEC",
    "credits": 3,
    "isElectiveSlot": true,
    "electiveSlotType": "OEC",
    "electiveSlotCode": "OEC-II",
    "practicalInfo": "",
    "syllabus": []
  },
  {
    "semesterNumber": 5,
    "subjectCode": "U21CSG05",
    "subjectName": "Computer Networks",
    "category": "PCC",
    "credits": 3,
    "isElectiveSlot": false,
    "electiveSlotType": null,
    "electiveSlotCode": null,
    "practicalInfo": "Network commands/configuration, packet analysis, routing and client/server experiments",
    "syllabus": [
      {
        "unitNumber": 1,
        "unitCode": "UNIT 1",
        "title": "Network basics; OSI/TCP",
        "description": "IP; switching and physical layer.",
        "syllabusText": "Network basics; OSI/TCP-IP; switching and physical layer.",
        "topics": [
          "IP",
          "switching and physical layer"
        ],
        "hours": 9
      },
      {
        "unitNumber": 2,
        "unitCode": "UNIT 2",
        "title": "Framing; error/flow control; HDLC/PPP; E",
        "description": "Framing; error/flow control; HDLC/PPP; Ethernet; LAN/WLAN; bridges.",
        "syllabusText": "Framing; error/flow control; HDLC/PPP; Ethernet; LAN/WLAN; bridges.",
        "topics": [
          "Framing",
          "error/flow control",
          "HDLC/PPP",
          "Ethernet",
          "LAN/WLAN",
          "bridges"
        ],
        "hours": 9
      },
      {
        "unitNumber": 3,
        "unitCode": "UNIT 3",
        "title": "IP/subnetting; routing; OSPF/BGP; ARP/RA",
        "description": "IP/subnetting; routing; OSPF/BGP; ARP/RARP/DHCP/ICMP.",
        "syllabusText": "IP/subnetting; routing; OSPF/BGP; ARP/RARP/DHCP/ICMP.",
        "topics": [
          "IP/subnetting",
          "routing",
          "OSPF/BGP",
          "ARP/RARP/DHCP/ICMP"
        ],
        "hours": 9
      },
      {
        "unitNumber": 4,
        "unitCode": "UNIT 4",
        "title": "UDP/TCP; congestion and reliable transpo",
        "description": "UDP/TCP; congestion and reliable transport.",
        "syllabusText": "UDP/TCP; congestion and reliable transport.",
        "topics": [
          "UDP/TCP",
          "congestion and reliable transport"
        ],
        "hours": 9
      },
      {
        "unitNumber": 5,
        "unitCode": "UNIT 5",
        "title": "DNS; SMTP/IMAP; Telnet; FTP; REST; HTTP/",
        "description": "DNS; SMTP/IMAP; Telnet; FTP; REST; HTTP/HTTPS; multimedia.",
        "syllabusText": "DNS; SMTP/IMAP; Telnet; FTP; REST; HTTP/HTTPS; multimedia.",
        "topics": [
          "DNS",
          "SMTP/IMAP",
          "Telnet",
          "FTP",
          "REST",
          "HTTP/HTTPS",
          "multimedia"
        ],
        "hours": 9
      }
    ]
  },
  {
    "semesterNumber": 5,
    "subjectCode": "U21SSG02",
    "subjectName": "Soft Skills - II",
    "category": "HSMC",
    "credits": 1,
    "isElectiveSlot": false,
    "electiveSlotType": null,
    "electiveSlotCode": null,
    "practicalInfo": "",
    "syllabus": [
      {
        "unitNumber": 1,
        "unitCode": "UNIT 1",
        "title": "Presentation techniques; time management",
        "description": "Presentation techniques; time management; body language; managerial skills.",
        "syllabusText": "Presentation techniques; time management; body language; managerial skills.",
        "topics": [
          "Presentation techniques",
          "time management",
          "body language",
          "managerial skills"
        ],
        "hours": 9
      },
      {
        "unitNumber": 2,
        "unitCode": "UNIT 2",
        "title": "Group discussion/public speaking; dynami",
        "description": "Group discussion/public speaking; dynamics; strategies; active listening.",
        "syllabusText": "Group discussion/public speaking; dynamics; strategies; active listening.",
        "topics": [
          "Group discussion/public speaking",
          "dynamics",
          "strategies",
          "active listening"
        ],
        "hours": 9
      },
      {
        "unitNumber": 3,
        "unitCode": "UNIT 3",
        "title": "Interview preparation; techniques/etique",
        "description": "Interview preparation; techniques/etiquette; stress handling; online interviews.",
        "syllabusText": "Interview preparation; techniques/etiquette; stress handling; online interviews.",
        "topics": [
          "Interview preparation",
          "techniques/etiquette",
          "stress handling",
          "online interviews"
        ],
        "hours": 9
      },
      {
        "unitNumber": 4,
        "unitCode": "UNIT 4",
        "title": "Practical presentation/GD/interview acti",
        "description": "Practical presentation/GD/interview activities.",
        "syllabusText": "Practical presentation/GD/interview activities.",
        "topics": [
          "Practical presentation/GD/interview activities"
        ],
        "hours": 9
      },
      {
        "unitNumber": 5,
        "unitCode": "UNIT 5",
        "title": "Employability communication.",
        "description": "Employability communication.",
        "syllabusText": "Employability communication.",
        "topics": [
          "Employability communication"
        ],
        "hours": 9
      }
    ]
  },
  {
    "semesterNumber": 5,
    "subjectCode": "U21ITG03",
    "subjectName": "Information Security Laboratory",
    "category": "PCC",
    "credits": 2,
    "isElectiveSlot": false,
    "electiveSlotType": null,
    "electiveSlotCode": null,
    "practicalInfo": "Classical ciphers, DES/AES, RSA/Diffie-Hellman, hash/MAC, digital signatures and authentication",
    "syllabus": [
      {
        "unitNumber": 1,
        "unitCode": "EXPT 1-3",
        "title": "Foundational Experiments",
        "description": "Classical ciphers, DES/AES, RSA/Diffie-Hellman, hash/MAC, digital signatures and authentication",
        "syllabusText": "Classical ciphers, DES/AES, RSA/Diffie-Hellman, hash/MAC, digital signatures and authentication",
        "topics": [
          "Basic Setup & Environment",
          "Core Practical Implementation"
        ],
        "hours": 12
      },
      {
        "unitNumber": 2,
        "unitCode": "EXPT 4-6",
        "title": "Intermediate Implementations",
        "description": "Intermediate hands-on experiments for Information Security Laboratory",
        "syllabusText": "Intermediate hands-on experiments for Information Security Laboratory",
        "topics": [
          "Module Design",
          "Testing & Verification"
        ],
        "hours": 12
      },
      {
        "unitNumber": 3,
        "unitCode": "EXPT 7-9",
        "title": "Advanced Applied Experiments",
        "description": "Advanced problem solving and application development for Information Security Laboratory",
        "syllabusText": "Advanced problem solving for Information Security Laboratory",
        "topics": [
          "System Integration",
          "Optimization"
        ],
        "hours": 12
      },
      {
        "unitNumber": 4,
        "unitCode": "EXPT 10-12",
        "title": "Mini-Project / Case Study",
        "description": "End-to-end practical project implementation for Information Security Laboratory",
        "syllabusText": "Mini project for Information Security Laboratory",
        "topics": [
          "Mini-Project Development",
          "Demonstration"
        ],
        "hours": 12
      },
      {
        "unitNumber": 5,
        "unitCode": "EXPT 13-15",
        "title": "Comprehensive Practical Viva",
        "description": "Model practical exam, viva-voce and record evaluation for Information Security Laboratory",
        "syllabusText": "Model exam and viva for Information Security Laboratory",
        "topics": [
          "Model Practical Examination",
          "Record Evaluation"
        ],
        "hours": 12
      }
    ]
  },
  {
    "semesterNumber": 5,
    "subjectCode": "U21IT501",
    "subjectName": "Proto Studio - I",
    "category": "EEC",
    "credits": 1,
    "isElectiveSlot": false,
    "electiveSlotType": null,
    "electiveSlotCode": null,
    "practicalInfo": "Prototype/product development, validation, market/product thinking and presentation",
    "syllabus": [
      {
        "unitNumber": 1,
        "unitCode": "EXPT 1-3",
        "title": "Foundational Experiments",
        "description": "Prototype/product development, validation, market/product thinking and presentation",
        "syllabusText": "Prototype/product development, validation, market/product thinking and presentation",
        "topics": [
          "Basic Setup & Environment",
          "Core Practical Implementation"
        ],
        "hours": 12
      },
      {
        "unitNumber": 2,
        "unitCode": "EXPT 4-6",
        "title": "Intermediate Implementations",
        "description": "Intermediate hands-on experiments for Proto Studio - I",
        "syllabusText": "Intermediate hands-on experiments for Proto Studio - I",
        "topics": [
          "Module Design",
          "Testing & Verification"
        ],
        "hours": 12
      },
      {
        "unitNumber": 3,
        "unitCode": "EXPT 7-9",
        "title": "Advanced Applied Experiments",
        "description": "Advanced problem solving and application development for Proto Studio - I",
        "syllabusText": "Advanced problem solving for Proto Studio - I",
        "topics": [
          "System Integration",
          "Optimization"
        ],
        "hours": 12
      },
      {
        "unitNumber": 4,
        "unitCode": "EXPT 10-12",
        "title": "Mini-Project / Case Study",
        "description": "End-to-end practical project implementation for Proto Studio - I",
        "syllabusText": "Mini project for Proto Studio - I",
        "topics": [
          "Mini-Project Development",
          "Demonstration"
        ],
        "hours": 12
      },
      {
        "unitNumber": 5,
        "unitCode": "EXPT 13-15",
        "title": "Comprehensive Practical Viva",
        "description": "Model practical exam, viva-voce and record evaluation for Proto Studio - I",
        "syllabusText": "Model exam and viva for Proto Studio - I",
        "topics": [
          "Model Practical Examination",
          "Record Evaluation"
        ],
        "hours": 12
      }
    ]
  },
  {
    "semesterNumber": 5,
    "subjectCode": "U21MYC05",
    "subjectName": "Cyber Security Essentials",
    "category": "MNC",
    "credits": 0,
    "isElectiveSlot": false,
    "electiveSlotType": null,
    "electiveSlotCode": null,
    "practicalInfo": "",
    "syllabus": []
  },
  {
    "semesterNumber": 6,
    "subjectCode": "U21IT601",
    "subjectName": "Machine Learning Techniques",
    "category": "PCC",
    "credits": 3,
    "isElectiveSlot": false,
    "electiveSlotType": null,
    "electiveSlotCode": null,
    "practicalInfo": "",
    "syllabus": [
      {
        "unitNumber": 1,
        "unitCode": "UNIT 1",
        "title": "ML types/challenges/applications; descri",
        "description": "ML types/challenges/applications; descriptive statistics; feature engineering; dimensionality reduction.",
        "syllabusText": "ML types/challenges/applications; descriptive statistics; feature engineering; dimensionality reduction.",
        "topics": [
          "ML types/challenges/applications",
          "descriptive statistics",
          "feature engineering",
          "dimensionality reduction"
        ],
        "hours": 9
      },
      {
        "unitNumber": 2,
        "unitCode": "UNIT 2",
        "title": "KNN/similarity learning; linear regressi",
        "description": "KNN/similarity learning; linear regression.",
        "syllabusText": "KNN/similarity learning; linear regression.",
        "topics": [
          "KNN/similarity learning",
          "linear regression"
        ],
        "hours": 9
      },
      {
        "unitNumber": 3,
        "unitCode": "UNIT 3",
        "title": "Decision trees; ID3/C4.5; regression tre",
        "description": "Decision trees; ID3/C4.5; regression trees; validation/pruning.",
        "syllabusText": "Decision trees; ID3/C4.5; regression trees; validation/pruning.",
        "topics": [
          "Decision trees",
          "ID3/C4.5",
          "regression trees",
          "validation/pruning"
        ],
        "hours": 9
      },
      {
        "unitNumber": 4,
        "unitCode": "UNIT 4",
        "title": "Bayes/Naive Bayes; support",
        "description": "vector machines.",
        "syllabusText": "Bayes/Naive Bayes; support-vector machines.",
        "topics": [
          "vector machines"
        ],
        "hours": 9
      },
      {
        "unitNumber": 5,
        "unitCode": "UNIT 5",
        "title": "Ensemble learning; clustering; reinforcement",
        "description": "learning concepts.",
        "syllabusText": "Ensemble learning; clustering; reinforcement-learning concepts.",
        "topics": [
          "learning concepts"
        ],
        "hours": 9
      }
    ]
  },
  {
    "semesterNumber": 6,
    "subjectCode": "U21ECG05",
    "subjectName": "Embedded Systems and IoT",
    "category": "PCC",
    "credits": 3,
    "isElectiveSlot": false,
    "electiveSlotType": null,
    "electiveSlotCode": null,
    "practicalInfo": "",
    "syllabus": [
      {
        "unitNumber": 1,
        "unitCode": "UNIT 1",
        "title": "Embedded systems architecture/types; har",
        "description": "Embedded systems architecture/types; hardware/software; SoC; microcontrollers.",
        "syllabusText": "Embedded systems architecture/types; hardware/software; SoC; microcontrollers.",
        "topics": [
          "Embedded systems architecture/types",
          "hardware/software",
          "SoC",
          "microcontrollers"
        ],
        "hours": 9
      },
      {
        "unitNumber": 2,
        "unitCode": "UNIT 2",
        "title": "ARM",
        "description": "style microcontroller architecture; registers; timers; interrupts; ADC/DAC; serial communication; GPIO.",
        "syllabusText": "ARM-style microcontroller architecture; registers; timers; interrupts; ADC/DAC; serial communication; GPIO.",
        "topics": [
          "style microcontroller architecture",
          "registers",
          "timers",
          "interrupts",
          "ADC/DAC",
          "serial communication",
          "GPIO"
        ],
        "hours": 9
      },
      {
        "unitNumber": 3,
        "unitCode": "UNIT 3",
        "title": "IoT architecture; M2M; MQTT/CoAP/AMQP; B",
        "description": "IoT architecture; M2M; MQTT/CoAP/AMQP; BLE/Zigbee.",
        "syllabusText": "IoT architecture; M2M; MQTT/CoAP/AMQP; BLE/Zigbee.",
        "topics": [
          "IoT architecture",
          "M2M",
          "MQTT/CoAP/AMQP",
          "BLE/Zigbee"
        ],
        "hours": 9
      },
      {
        "unitNumber": 4,
        "unitCode": "UNIT 4",
        "title": "Sensor/device programming; NodeMCU/Arduino",
        "description": "style development; cloud connectivity.",
        "syllabusText": "Sensor/device programming; NodeMCU/Arduino-style development; cloud connectivity.",
        "topics": [
          "style development",
          "cloud connectivity"
        ],
        "hours": 9
      },
      {
        "unitNumber": 5,
        "unitCode": "UNIT 5",
        "title": "IoT/cloud integration; home automation a",
        "description": "IoT/cloud integration; home automation and monitoring case studies.",
        "syllabusText": "IoT/cloud integration; home automation and monitoring case studies.",
        "topics": [
          "IoT/cloud integration",
          "home automation and monitoring case studies"
        ],
        "hours": 9
      }
    ]
  },
  {
    "semesterNumber": 6,
    "subjectCode": "PEC-III",
    "subjectName": "Professional Elective - III",
    "category": "PEC",
    "credits": 3,
    "isElectiveSlot": true,
    "electiveSlotType": "PEC",
    "electiveSlotCode": "PEC-III",
    "practicalInfo": "",
    "syllabus": []
  },
  {
    "semesterNumber": 6,
    "subjectCode": "PEC-IV",
    "subjectName": "Professional Elective - IV",
    "category": "PEC",
    "credits": 3,
    "isElectiveSlot": true,
    "electiveSlotType": "PEC",
    "electiveSlotCode": "PEC-IV",
    "practicalInfo": "",
    "syllabus": []
  },
  {
    "semesterNumber": 6,
    "subjectCode": "OEC-III",
    "subjectName": "Open Elective - III",
    "category": "OEC",
    "credits": 3,
    "isElectiveSlot": true,
    "electiveSlotType": "OEC",
    "electiveSlotCode": "OEC-III",
    "practicalInfo": "",
    "syllabus": []
  },
  {
    "semesterNumber": 6,
    "subjectCode": "U21SSG03",
    "subjectName": "Soft Skills - III",
    "category": "HSMC",
    "credits": 1,
    "isElectiveSlot": false,
    "electiveSlotType": null,
    "electiveSlotCode": null,
    "practicalInfo": "",
    "syllabus": [
      {
        "unitNumber": 1,
        "unitCode": "UNIT 1",
        "title": "Sentence completion; error spotting; logical reasoning; cause/effect; assertion/reasoning; para",
        "description": "jumbles.",
        "syllabusText": "Sentence completion; error spotting; logical reasoning; cause/effect; assertion/reasoning; para-jumbles.",
        "topics": [
          "jumbles"
        ],
        "hours": 9
      },
      {
        "unitNumber": 2,
        "unitCode": "UNIT 2",
        "title": "Stress factors; positive/negative stress",
        "description": "Stress factors; positive/negative stress; effects; coping techniques.",
        "syllabusText": "Stress factors; positive/negative stress; effects; coping techniques.",
        "topics": [
          "Stress factors",
          "positive/negative stress",
          "effects",
          "coping techniques"
        ],
        "hours": 9
      },
      {
        "unitNumber": 3,
        "unitCode": "UNIT 3",
        "title": "Emotional intelligence; self",
        "description": "awareness/self-management; motivation; empathy/social skills.",
        "syllabusText": "Emotional intelligence; self-awareness/self-management; motivation; empathy/social skills.",
        "topics": [
          "awareness/self-management",
          "motivation",
          "empathy/social skills"
        ],
        "hours": 9
      },
      {
        "unitNumber": 4,
        "unitCode": "UNIT 4",
        "title": "Professional application of language/str",
        "description": "Professional application of language/stress/EI.",
        "syllabusText": "Professional application of language/stress/EI.",
        "topics": [
          "Professional application of language/stress/EI"
        ],
        "hours": 9
      },
      {
        "unitNumber": 5,
        "unitCode": "UNIT 5",
        "title": "Workplace readiness and integrated commu",
        "description": "Workplace readiness and integrated communication.",
        "syllabusText": "Workplace readiness and integrated communication.",
        "topics": [
          "Workplace readiness and integrated communication"
        ],
        "hours": 9
      }
    ]
  },
  {
    "semesterNumber": 6,
    "subjectCode": "U21IT602",
    "subjectName": "Machine Learning Techniques Laboratory",
    "category": "PCC",
    "credits": 1,
    "isElectiveSlot": false,
    "electiveSlotType": null,
    "electiveSlotCode": null,
    "practicalInfo": "Python ML: datasets, KNN, regression, logistic regression, trees, Naive Bayes, random forest, boosting, K-means and mini-project",
    "syllabus": [
      {
        "unitNumber": 1,
        "unitCode": "EXPT 1-3",
        "title": "Foundational Experiments",
        "description": "Python ML: datasets, KNN, regression, logistic regression, trees, Naive Bayes, random forest, boosting, K-means and mini-project",
        "syllabusText": "Python ML: datasets, KNN, regression, logistic regression, trees, Naive Bayes, random forest, boosting, K-means and mini-project",
        "topics": [
          "Basic Setup & Environment",
          "Core Practical Implementation"
        ],
        "hours": 12
      },
      {
        "unitNumber": 2,
        "unitCode": "EXPT 4-6",
        "title": "Intermediate Implementations",
        "description": "Intermediate hands-on experiments for Machine Learning Techniques Laboratory",
        "syllabusText": "Intermediate hands-on experiments for Machine Learning Techniques Laboratory",
        "topics": [
          "Module Design",
          "Testing & Verification"
        ],
        "hours": 12
      },
      {
        "unitNumber": 3,
        "unitCode": "EXPT 7-9",
        "title": "Advanced Applied Experiments",
        "description": "Advanced problem solving and application development for Machine Learning Techniques Laboratory",
        "syllabusText": "Advanced problem solving for Machine Learning Techniques Laboratory",
        "topics": [
          "System Integration",
          "Optimization"
        ],
        "hours": 12
      },
      {
        "unitNumber": 4,
        "unitCode": "EXPT 10-12",
        "title": "Mini-Project / Case Study",
        "description": "End-to-end practical project implementation for Machine Learning Techniques Laboratory",
        "syllabusText": "Mini project for Machine Learning Techniques Laboratory",
        "topics": [
          "Mini-Project Development",
          "Demonstration"
        ],
        "hours": 12
      },
      {
        "unitNumber": 5,
        "unitCode": "EXPT 13-15",
        "title": "Comprehensive Practical Viva",
        "description": "Model practical exam, viva-voce and record evaluation for Machine Learning Techniques Laboratory",
        "syllabusText": "Model exam and viva for Machine Learning Techniques Laboratory",
        "topics": [
          "Model Practical Examination",
          "Record Evaluation"
        ],
        "hours": 12
      }
    ]
  },
  {
    "semesterNumber": 6,
    "subjectCode": "U21ECG06",
    "subjectName": "Embedded Systems and IoT Laboratory",
    "category": "PCC",
    "credits": 2,
    "isElectiveSlot": false,
    "electiveSlotType": null,
    "electiveSlotCode": null,
    "practicalInfo": "Arduino/embedded experiments: LED, switches, LCD, motor, PIR, gas monitoring, smart lock and IoT prototypes",
    "syllabus": [
      {
        "unitNumber": 1,
        "unitCode": "EXPT 1-3",
        "title": "Foundational Experiments",
        "description": "Arduino/embedded experiments: LED, switches, LCD, motor, PIR, gas monitoring, smart lock and IoT prototypes",
        "syllabusText": "Arduino/embedded experiments: LED, switches, LCD, motor, PIR, gas monitoring, smart lock and IoT prototypes",
        "topics": [
          "Basic Setup & Environment",
          "Core Practical Implementation"
        ],
        "hours": 12
      },
      {
        "unitNumber": 2,
        "unitCode": "EXPT 4-6",
        "title": "Intermediate Implementations",
        "description": "Intermediate hands-on experiments for Embedded Systems and IoT Laboratory",
        "syllabusText": "Intermediate hands-on experiments for Embedded Systems and IoT Laboratory",
        "topics": [
          "Module Design",
          "Testing & Verification"
        ],
        "hours": 12
      },
      {
        "unitNumber": 3,
        "unitCode": "EXPT 7-9",
        "title": "Advanced Applied Experiments",
        "description": "Advanced problem solving and application development for Embedded Systems and IoT Laboratory",
        "syllabusText": "Advanced problem solving for Embedded Systems and IoT Laboratory",
        "topics": [
          "System Integration",
          "Optimization"
        ],
        "hours": 12
      },
      {
        "unitNumber": 4,
        "unitCode": "EXPT 10-12",
        "title": "Mini-Project / Case Study",
        "description": "End-to-end practical project implementation for Embedded Systems and IoT Laboratory",
        "syllabusText": "Mini project for Embedded Systems and IoT Laboratory",
        "topics": [
          "Mini-Project Development",
          "Demonstration"
        ],
        "hours": 12
      },
      {
        "unitNumber": 5,
        "unitCode": "EXPT 13-15",
        "title": "Comprehensive Practical Viva",
        "description": "Model practical exam, viva-voce and record evaluation for Embedded Systems and IoT Laboratory",
        "syllabusText": "Model exam and viva for Embedded Systems and IoT Laboratory",
        "topics": [
          "Model Practical Examination",
          "Record Evaluation"
        ],
        "hours": 12
      }
    ]
  },
  {
    "semesterNumber": 6,
    "subjectCode": "U21IT603",
    "subjectName": "Proto Studio - II",
    "category": "EEC",
    "credits": 1,
    "isElectiveSlot": false,
    "electiveSlotType": null,
    "electiveSlotCode": null,
    "practicalInfo": "Second prototype/product-development studio with validation and presentation",
    "syllabus": [
      {
        "unitNumber": 1,
        "unitCode": "EXPT 1-3",
        "title": "Foundational Experiments",
        "description": "Second prototype/product-development studio with validation and presentation",
        "syllabusText": "Second prototype/product-development studio with validation and presentation",
        "topics": [
          "Basic Setup & Environment",
          "Core Practical Implementation"
        ],
        "hours": 12
      },
      {
        "unitNumber": 2,
        "unitCode": "EXPT 4-6",
        "title": "Intermediate Implementations",
        "description": "Intermediate hands-on experiments for Proto Studio - II",
        "syllabusText": "Intermediate hands-on experiments for Proto Studio - II",
        "topics": [
          "Module Design",
          "Testing & Verification"
        ],
        "hours": 12
      },
      {
        "unitNumber": 3,
        "unitCode": "EXPT 7-9",
        "title": "Advanced Applied Experiments",
        "description": "Advanced problem solving and application development for Proto Studio - II",
        "syllabusText": "Advanced problem solving for Proto Studio - II",
        "topics": [
          "System Integration",
          "Optimization"
        ],
        "hours": 12
      },
      {
        "unitNumber": 4,
        "unitCode": "EXPT 10-12",
        "title": "Mini-Project / Case Study",
        "description": "End-to-end practical project implementation for Proto Studio - II",
        "syllabusText": "Mini project for Proto Studio - II",
        "topics": [
          "Mini-Project Development",
          "Demonstration"
        ],
        "hours": 12
      },
      {
        "unitNumber": 5,
        "unitCode": "EXPT 13-15",
        "title": "Comprehensive Practical Viva",
        "description": "Model practical exam, viva-voce and record evaluation for Proto Studio - II",
        "syllabusText": "Model exam and viva for Proto Studio - II",
        "topics": [
          "Model Practical Examination",
          "Record Evaluation"
        ],
        "hours": 12
      }
    ]
  },
  {
    "semesterNumber": 6,
    "subjectCode": "U21MYC06",
    "subjectName": "Introduction to UN SDGs: An Integrative Approach",
    "category": "MNC",
    "credits": 0,
    "isElectiveSlot": false,
    "electiveSlotType": null,
    "electiveSlotCode": null,
    "practicalInfo": "",
    "syllabus": []
  },
  {
    "semesterNumber": 7,
    "subjectCode": "U21IT701",
    "subjectName": "Software Project Management",
    "category": "PCC",
    "credits": 3,
    "isElectiveSlot": false,
    "electiveSlotType": null,
    "electiveSlotCode": null,
    "practicalInfo": "",
    "syllabus": [
      {
        "unitNumber": 1,
        "unitCode": "UNIT 1",
        "title": "Project evaluation/planning; feasibility",
        "description": "Project evaluation/planning; feasibility; methodology; monitoring; risk; strategic management.",
        "syllabusText": "Project evaluation/planning; feasibility; methodology; monitoring; risk; strategic management.",
        "topics": [
          "Project evaluation/planning",
          "feasibility",
          "methodology",
          "monitoring",
          "risk",
          "strategic management"
        ],
        "hours": 9
      },
      {
        "unitNumber": 2,
        "unitCode": "UNIT 2",
        "title": "Life cycle/effort estimation; process ch",
        "description": "Life cycle/effort estimation; process choice; agile/RAD; function points; COCOMO; risk.",
        "syllabusText": "Life cycle/effort estimation; process choice; agile/RAD; function points; COCOMO; risk.",
        "topics": [
          "Life cycle/effort estimation",
          "process choice",
          "agile/RAD",
          "function points",
          "COCOMO",
          "risk"
        ],
        "hours": 9
      },
      {
        "unitNumber": 3,
        "unitCode": "UNIT 3",
        "title": "Activity planning; schedules; sequencing",
        "description": "Activity planning; schedules; sequencing; resource allocation; PERT/CPM; critical path.",
        "syllabusText": "Activity planning; schedules; sequencing; resource allocation; PERT/CPM; critical path.",
        "topics": [
          "Activity planning",
          "schedules",
          "sequencing",
          "resource allocation",
          "PERT/CPM",
          "critical path"
        ],
        "hours": 9
      },
      {
        "unitNumber": 4,
        "unitCode": "UNIT 4",
        "title": "Project control; progress/cost monitorin",
        "description": "Project control; progress/cost monitoring; earned value; contracts/procurement.",
        "syllabusText": "Project control; progress/cost monitoring; earned value; contracts/procurement.",
        "topics": [
          "Project control",
          "progress/cost monitoring",
          "earned value",
          "contracts/procurement"
        ],
        "hours": 9
      },
      {
        "unitNumber": 5,
        "unitCode": "UNIT 5",
        "title": "Staffing; selection; motivation; trainin",
        "description": "Staffing; selection; motivation; training; appraisal; reward; team/virtual team.",
        "syllabusText": "Staffing; selection; motivation; training; appraisal; reward; team/virtual team.",
        "topics": [
          "Staffing",
          "selection",
          "motivation",
          "training",
          "appraisal",
          "reward",
          "team/virtual team"
        ],
        "hours": 9
      }
    ]
  },
  {
    "semesterNumber": 7,
    "subjectCode": "U21IT702",
    "subjectName": "Cloud Computing",
    "category": "PCC",
    "credits": 3,
    "isElectiveSlot": false,
    "electiveSlotType": null,
    "electiveSlotCode": null,
    "practicalInfo": "",
    "syllabus": [
      {
        "unitNumber": 1,
        "unitCode": "UNIT 1",
        "title": "Cloud architecture; NIST; deployment/ser",
        "description": "Cloud architecture; NIST; deployment/service models; cloud economics.",
        "syllabusText": "Cloud architecture; NIST; deployment/service models; cloud economics.",
        "topics": [
          "Cloud architecture",
          "NIST",
          "deployment/service models",
          "cloud economics"
        ],
        "hours": 9
      },
      {
        "unitNumber": 2,
        "unitCode": "UNIT 2",
        "title": "Virtualization; hypervisor; full/para; C",
        "description": "Virtualization; hypervisor; full/para; CPU/memory/I/O.",
        "syllabusText": "Virtualization; hypervisor; full/para; CPU/memory/I/O.",
        "topics": [
          "Virtualization",
          "hypervisor",
          "full/para",
          "CPU/memory/I/O"
        ],
        "hours": 9
      },
      {
        "unitNumber": 3,
        "unitCode": "UNIT 3",
        "title": "VMs/containers; Docker engine; images/re",
        "description": "VMs/containers; Docker engine; images/repositories.",
        "syllabusText": "VMs/containers; Docker engine; images/repositories.",
        "topics": [
          "VMs/containers",
          "Docker engine",
          "images/repositories"
        ],
        "hours": 9
      },
      {
        "unitNumber": 4,
        "unitCode": "UNIT 4",
        "title": "Cloud deployment; AWS/Azure/Google App Engine/OpenStack",
        "description": "style platforms.",
        "syllabusText": "Cloud deployment; AWS/Azure/Google App Engine/OpenStack-style platforms.",
        "topics": [
          "style platforms"
        ],
        "hours": 9
      },
      {
        "unitNumber": 5,
        "unitCode": "UNIT 5",
        "title": "Cloud security; data/storage; IAM; ident",
        "description": "Cloud security; data/storage; IAM; identity/access; architecture/practice.",
        "syllabusText": "Cloud security; data/storage; IAM; identity/access; architecture/practice.",
        "topics": [
          "Cloud security",
          "data/storage",
          "IAM",
          "identity/access",
          "architecture/practice"
        ],
        "hours": 9
      }
    ]
  },
  {
    "semesterNumber": 7,
    "subjectCode": "U21IT703",
    "subjectName": "Design Patterns",
    "category": "PCC",
    "credits": 4,
    "isElectiveSlot": false,
    "electiveSlotType": null,
    "electiveSlotCode": null,
    "practicalInfo": "",
    "syllabus": [
      {
        "unitNumber": 1,
        "unitCode": "UNIT 1",
        "title": "Design patterns; catalog; organization;",
        "description": "Design patterns; catalog; organization; selection and use.",
        "syllabusText": "Design patterns; catalog; organization; selection and use.",
        "topics": [
          "Design patterns",
          "catalog",
          "organization",
          "selection and use"
        ],
        "hours": 9
      },
      {
        "unitNumber": 2,
        "unitCode": "UNIT 2",
        "title": "Design problems/case studies; decorator/",
        "description": "Design problems/case studies; decorator/command and UI design issues.",
        "syllabusText": "Design problems/case studies; decorator/command and UI design issues.",
        "topics": [
          "Design problems/case studies",
          "decorator/command and UI design issues"
        ],
        "hours": 9
      },
      {
        "unitNumber": 3,
        "unitCode": "UNIT 3",
        "title": "Structural patterns",
        "description": "Adapter, Bridge, Composite, Decorator, Facade, Flyweight, Proxy.",
        "syllabusText": "Structural patterns — Adapter, Bridge, Composite, Decorator, Facade, Flyweight, Proxy.",
        "topics": [
          "Adapter, Bridge, Composite, Decorator, Facade, Flyweight, Proxy"
        ],
        "hours": 9
      },
      {
        "unitNumber": 4,
        "unitCode": "UNIT 4",
        "title": "Behavioral patterns",
        "description": "Chain of Responsibility, Interpreter, Iterator, Mediator, Memento, Observer, State, Strategy, Template Method, Visitor.",
        "syllabusText": "Behavioral patterns — Chain of Responsibility, Interpreter, Iterator, Mediator, Memento, Observer, State, Strategy, Template Method, Visitor.",
        "topics": [
          "Chain of Responsibility, Interpreter, Iterator, Mediator, Memento, Observer, State, Strategy, Template Method, Visitor"
        ],
        "hours": 9
      },
      {
        "unitNumber": 5,
        "unitCode": "UNIT 5",
        "title": "Pattern conclusion; design process/commu",
        "description": "Pattern conclusion; design process/community and reuse.",
        "syllabusText": "Pattern conclusion; design process/community and reuse.",
        "topics": [
          "Pattern conclusion",
          "design process/community and reuse"
        ],
        "hours": 9
      }
    ]
  },
  {
    "semesterNumber": 7,
    "subjectCode": "PEC-V",
    "subjectName": "Professional Elective - V",
    "category": "PEC",
    "credits": 3,
    "isElectiveSlot": true,
    "electiveSlotType": "PEC",
    "electiveSlotCode": "PEC-V",
    "practicalInfo": "",
    "syllabus": []
  },
  {
    "semesterNumber": 7,
    "subjectCode": "PEC-VI",
    "subjectName": "Professional Elective - VI",
    "category": "PEC",
    "credits": 3,
    "isElectiveSlot": true,
    "electiveSlotType": "PEC",
    "electiveSlotCode": "PEC-VI",
    "practicalInfo": "",
    "syllabus": []
  },
  {
    "semesterNumber": 7,
    "subjectCode": "OEC-IV",
    "subjectName": "Open Elective - IV",
    "category": "OEC",
    "credits": 3,
    "isElectiveSlot": true,
    "electiveSlotType": "OEC",
    "electiveSlotCode": "OEC-IV",
    "practicalInfo": "",
    "syllabus": []
  },
  {
    "semesterNumber": 7,
    "subjectCode": "U21IT704",
    "subjectName": "Cloud Computing Laboratory",
    "category": "PCC",
    "credits": 1,
    "isElectiveSlot": false,
    "electiveSlotType": null,
    "electiveSlotCode": null,
    "practicalInfo": "Virtual machines, AWS console, web applications, CloudSim, file transfer, Docker/containers and security/data storage exercises",
    "syllabus": [
      {
        "unitNumber": 1,
        "unitCode": "EXPT 1-3",
        "title": "Foundational Experiments",
        "description": "Virtual machines, AWS console, web applications, CloudSim, file transfer, Docker/containers and security/data storage exercises",
        "syllabusText": "Virtual machines, AWS console, web applications, CloudSim, file transfer, Docker/containers and security/data storage exercises",
        "topics": [
          "Basic Setup & Environment",
          "Core Practical Implementation"
        ],
        "hours": 12
      },
      {
        "unitNumber": 2,
        "unitCode": "EXPT 4-6",
        "title": "Intermediate Implementations",
        "description": "Intermediate hands-on experiments for Cloud Computing Laboratory",
        "syllabusText": "Intermediate hands-on experiments for Cloud Computing Laboratory",
        "topics": [
          "Module Design",
          "Testing & Verification"
        ],
        "hours": 12
      },
      {
        "unitNumber": 3,
        "unitCode": "EXPT 7-9",
        "title": "Advanced Applied Experiments",
        "description": "Advanced problem solving and application development for Cloud Computing Laboratory",
        "syllabusText": "Advanced problem solving for Cloud Computing Laboratory",
        "topics": [
          "System Integration",
          "Optimization"
        ],
        "hours": 12
      },
      {
        "unitNumber": 4,
        "unitCode": "EXPT 10-12",
        "title": "Mini-Project / Case Study",
        "description": "End-to-end practical project implementation for Cloud Computing Laboratory",
        "syllabusText": "Mini project for Cloud Computing Laboratory",
        "topics": [
          "Mini-Project Development",
          "Demonstration"
        ],
        "hours": 12
      },
      {
        "unitNumber": 5,
        "unitCode": "EXPT 13-15",
        "title": "Comprehensive Practical Viva",
        "description": "Model practical exam, viva-voce and record evaluation for Cloud Computing Laboratory",
        "syllabusText": "Model exam and viva for Cloud Computing Laboratory",
        "topics": [
          "Model Practical Examination",
          "Record Evaluation"
        ],
        "hours": 12
      }
    ]
  },
  {
    "semesterNumber": 7,
    "subjectCode": "U21IT705",
    "subjectName": "Project Work Phase - I",
    "category": "EEC",
    "credits": 2,
    "isElectiveSlot": false,
    "electiveSlotType": null,
    "electiveSlotCode": null,
    "practicalInfo": "Problem identification, literature/market review, methodology, prototype/design, initial implementation and presentation",
    "syllabus": [
      {
        "unitNumber": 1,
        "unitCode": "PHASE I",
        "title": "Problem Identification & Literature Review",
        "description": "Identify problem statement, literature survey, objectives and project scope.",
        "syllabusText": "Problem Identification & Literature Review",
        "topics": [
          "Problem Formulation",
          "Literature Survey",
          "Feasibility Study"
        ],
        "hours": 30
      },
      {
        "unitNumber": 2,
        "unitCode": "PHASE II",
        "title": "Design & Methodology",
        "description": "System architecture, design specifications, modules and technology stack.",
        "syllabusText": "Design & Methodology",
        "topics": [
          "System Architecture",
          "Modular Design",
          "Algorithm Selection"
        ],
        "hours": 30
      },
      {
        "unitNumber": 3,
        "unitCode": "PHASE III",
        "title": "Implementation & Verification",
        "description": "Development, coding, prototyping and unit testing.",
        "syllabusText": "Implementation & Verification",
        "topics": [
          "Coding / Development",
          "Integration",
          "Testing"
        ],
        "hours": 30
      },
      {
        "unitNumber": 4,
        "unitCode": "PHASE IV",
        "title": "Performance Evaluation & Results",
        "description": "Experimental evaluation, metrics, benchmarking and comparative analysis.",
        "syllabusText": "Performance Evaluation & Results",
        "topics": [
          "Benchmarking",
          "Result Analysis",
          "Discussion"
        ],
        "hours": 30
      },
      {
        "unitNumber": 5,
        "unitCode": "PHASE V",
        "title": "Documentation & Viva-Voce",
        "description": "Report preparation according to institutional format, presentation and defense.",
        "syllabusText": "Documentation & Viva-Voce",
        "topics": [
          "Thesis / Report Writing",
          "Plagiarism Check",
          "Viva Defense"
        ],
        "hours": 30
      }
    ]
  },
  {
    "semesterNumber": 8,
    "subjectCode": "U21IT801",
    "subjectName": "Project Work Phase - II",
    "category": "EEC",
    "credits": 8,
    "isElectiveSlot": false,
    "electiveSlotType": null,
    "electiveSlotCode": null,
    "practicalInfo": "Complete implementation, testing/validation, final report, demonstration, presentation and viva",
    "syllabus": [
      {
        "unitNumber": 1,
        "unitCode": "PHASE I",
        "title": "Problem Identification & Literature Review",
        "description": "Identify problem statement, literature survey, objectives and project scope.",
        "syllabusText": "Problem Identification & Literature Review",
        "topics": [
          "Problem Formulation",
          "Literature Survey",
          "Feasibility Study"
        ],
        "hours": 30
      },
      {
        "unitNumber": 2,
        "unitCode": "PHASE II",
        "title": "Design & Methodology",
        "description": "System architecture, design specifications, modules and technology stack.",
        "syllabusText": "Design & Methodology",
        "topics": [
          "System Architecture",
          "Modular Design",
          "Algorithm Selection"
        ],
        "hours": 30
      },
      {
        "unitNumber": 3,
        "unitCode": "PHASE III",
        "title": "Implementation & Verification",
        "description": "Development, coding, prototyping and unit testing.",
        "syllabusText": "Implementation & Verification",
        "topics": [
          "Coding / Development",
          "Integration",
          "Testing"
        ],
        "hours": 30
      },
      {
        "unitNumber": 4,
        "unitCode": "PHASE IV",
        "title": "Performance Evaluation & Results",
        "description": "Experimental evaluation, metrics, benchmarking and comparative analysis.",
        "syllabusText": "Performance Evaluation & Results",
        "topics": [
          "Benchmarking",
          "Result Analysis",
          "Discussion"
        ],
        "hours": 30
      },
      {
        "unitNumber": 5,
        "unitCode": "PHASE V",
        "title": "Documentation & Viva-Voce",
        "description": "Report preparation according to institutional format, presentation and defense.",
        "syllabusText": "Documentation & Viva-Voce",
        "topics": [
          "Thesis / Report Writing",
          "Plagiarism Check",
          "Viva Defense"
        ],
        "hours": 30
      }
    ]
  },
  {
    "semesterNumber": 8,
    "subjectCode": "U21ITI01",
    "subjectName": "Industrial Training / Internship",
    "category": "EEC",
    "credits": 2,
    "isElectiveSlot": false,
    "electiveSlotType": null,
    "electiveSlotCode": null,
    "practicalInfo": "Four-week industrial training/internship during semester vacation from III to VI semester",
    "syllabus": [
      {
        "unitNumber": 1,
        "unitCode": "UNIT 1",
        "title": "Industrial Environment & Orientation",
        "description": "Company orientation, workflow understanding and domain introduction.",
        "syllabusText": "Industrial Environment & Orientation",
        "topics": [
          "Company Orientation",
          "Workflow & Compliance"
        ],
        "hours": 15
      },
      {
        "unitNumber": 2,
        "unitCode": "UNIT 2",
        "title": "Technical Skill Acquisition",
        "description": "Hands-on training on enterprise tools, frameworks and industrial practices.",
        "syllabusText": "Technical Skill Acquisition",
        "topics": [
          "Industry Tooling",
          "Enterprise Frameworks"
        ],
        "hours": 15
      },
      {
        "unitNumber": 3,
        "unitCode": "UNIT 3",
        "title": "Live Task & Problem Solving",
        "description": "Assigned industrial task, implementation and team collaboration.",
        "syllabusText": "Live Task & Problem Solving",
        "topics": [
          "Task Execution",
          "Code Review & Deliverables"
        ],
        "hours": 15
      },
      {
        "unitNumber": 4,
        "unitCode": "UNIT 4",
        "title": "Outcome Analysis & Industry Feedback",
        "description": "Assessment of industrial output, mentor evaluation and feedback.",
        "syllabusText": "Outcome Analysis & Industry Feedback",
        "topics": [
          "Evaluation Matrix",
          "Mentor Assessment"
        ],
        "hours": 15
      },
      {
        "unitNumber": 5,
        "unitCode": "UNIT 5",
        "title": "Internship Report & Presentation",
        "description": "Detailed industrial training report and presentation.",
        "syllabusText": "Internship Report & Presentation",
        "topics": [
          "Final Report Submission",
          "Presentation"
        ],
        "hours": 15
      }
    ]
  }
];

export const IT_PROFESSIONAL_ELECTIVES_SEED: ISeedPEC[] = [
  {
    "code": "U21ADP01",
    "name": "Mathematical Foundation for Data Science",
    "vertical": "I – Computational Analytics",
    "verticalNumber": 1,
    "verticalName": "Computational Analytics",
    "credits": 3,
    "category": "PEC",
    "sourcePage": 139,
    "syllabusSummary": "Basics of data science; Linear algebra; Probability; Non-parametric techniques; Clustering",
    "topics": [
      "Basics of data science",
      "Linear algebra",
      "Probability",
      "Non-parametric techniques",
      "Clustering"
    ],
    "slots": [
      "PEC-I",
      "PEC-II",
      "PEC-III",
      "PEC-IV",
      "PEC-V",
      "PEC-VI"
    ],
    "semesters": [
      5,
      6,
      7
    ]
  },
  {
    "code": "U21ADP02",
    "name": "Pattern Recognition",
    "vertical": "I – Computational Analytics",
    "verticalNumber": 1,
    "verticalName": "Computational Analytics",
    "credits": 3,
    "category": "PEC",
    "sourcePage": 141,
    "syllabusSummary": "Pattern-recognition foundations; Bayesian decision theory; Statistical models; Non-parametric techniques; Clustering",
    "topics": [
      "Pattern-recognition foundations",
      "Bayesian decision theory",
      "Statistical models",
      "Non-parametric techniques",
      "Clustering"
    ],
    "slots": [
      "PEC-I",
      "PEC-II",
      "PEC-III",
      "PEC-IV",
      "PEC-V",
      "PEC-VI"
    ],
    "semesters": [
      5,
      6,
      7
    ]
  },
  {
    "code": "U21ADP03",
    "name": "Speech Processing and Analytics",
    "vertical": "I – Computational Analytics",
    "verticalNumber": 1,
    "verticalName": "Computational Analytics",
    "credits": 3,
    "category": "PEC",
    "sourcePage": 143,
    "syllabusSummary": "Speech processing/phonetics; Speech analysis/features; Speech recognition; Speech coding; Speech synthesis",
    "topics": [
      "Speech processing/phonetics",
      "Speech analysis/features",
      "Speech recognition",
      "Speech coding",
      "Speech synthesis"
    ],
    "slots": [
      "PEC-I",
      "PEC-II",
      "PEC-III",
      "PEC-IV",
      "PEC-V",
      "PEC-VI"
    ],
    "semesters": [
      5,
      6,
      7
    ]
  },
  {
    "code": "U21ADP04",
    "name": "Web Mining",
    "vertical": "I – Computational Analytics",
    "verticalNumber": 1,
    "verticalName": "Computational Analytics",
    "credits": 3,
    "category": "PEC",
    "sourcePage": 145,
    "syllabusSummary": "Web data mining; Supervised learning; Unsupervised learning; Web crawling; Web-based applications",
    "topics": [
      "Web data mining",
      "Supervised learning",
      "Unsupervised learning",
      "Web crawling",
      "Web-based applications"
    ],
    "slots": [
      "PEC-I",
      "PEC-II",
      "PEC-III",
      "PEC-IV",
      "PEC-V",
      "PEC-VI"
    ],
    "semesters": [
      5,
      6,
      7
    ]
  },
  {
    "code": "U21ADP05",
    "name": "Exploratory Data Analysis and Visualization",
    "vertical": "I – Computational Analytics",
    "verticalNumber": 1,
    "verticalName": "Computational Analytics",
    "credits": 3,
    "category": "PEC",
    "sourcePage": 147,
    "syllabusSummary": "EDA foundations; Two-variable analysis; Visualization basics; Visualization methods; Applications",
    "topics": [
      "EDA foundations",
      "Two-variable analysis",
      "Visualization basics",
      "Visualization methods",
      "Applications"
    ],
    "slots": [
      "PEC-I",
      "PEC-II",
      "PEC-III",
      "PEC-IV",
      "PEC-V",
      "PEC-VI"
    ],
    "semesters": [
      5,
      6,
      7
    ]
  },
  {
    "code": "U21ADP06",
    "name": "Predictive Analytics",
    "vertical": "I – Computational Analytics",
    "verticalNumber": 1,
    "verticalName": "Computational Analytics",
    "credits": 3,
    "category": "PEC",
    "sourcePage": 149,
    "syllabusSummary": "Predictive analytics; Data preparation/association; Modeling; Predictive modeling; Text mining",
    "topics": [
      "Predictive analytics",
      "Data preparation/association",
      "Modeling",
      "Predictive modeling",
      "Text mining"
    ],
    "slots": [
      "PEC-I",
      "PEC-II",
      "PEC-III",
      "PEC-IV",
      "PEC-V",
      "PEC-VI"
    ],
    "semesters": [
      5,
      6,
      7
    ]
  },
  {
    "code": "U21ADP07",
    "name": "Time Series Analysis and Forecasting",
    "vertical": "I – Computational Analytics",
    "verticalNumber": 1,
    "verticalName": "Computational Analytics",
    "credits": 3,
    "category": "PEC",
    "sourcePage": 151,
    "syllabusSummary": "Forecasting; Multiple linear regression; Time-series regression; Non-seasonal Box-Jenkins; Box-Jenkins methods",
    "topics": [
      "Forecasting",
      "Multiple linear regression",
      "Time-series regression",
      "Non-seasonal Box-Jenkins",
      "Box-Jenkins methods"
    ],
    "slots": [
      "PEC-I",
      "PEC-II",
      "PEC-III",
      "PEC-IV",
      "PEC-V",
      "PEC-VI"
    ],
    "semesters": [
      5,
      6,
      7
    ]
  },
  {
    "code": "U21ADP08",
    "name": "Healthcare Analytics",
    "vertical": "I – Computational Analytics",
    "verticalNumber": 1,
    "verticalName": "Computational Analytics",
    "credits": 3,
    "category": "PEC",
    "sourcePage": 153,
    "syllabusSummary": "Healthcare analytics; Machine learning; Healthcare management; Deep learning; Genomics/medical analytics",
    "topics": [
      "Healthcare analytics",
      "Machine learning",
      "Healthcare management",
      "Deep learning",
      "Genomics/medical analytics"
    ],
    "slots": [
      "PEC-I",
      "PEC-II",
      "PEC-III",
      "PEC-IV",
      "PEC-V",
      "PEC-VI"
    ],
    "semesters": [
      5,
      6,
      7
    ]
  },
  {
    "code": "U21AMP01",
    "name": "Knowledge Engineering",
    "vertical": "II – Artificial Intelligence and Machine Learning",
    "verticalNumber": 2,
    "verticalName": "Artificial Intelligence and Machine Learning",
    "credits": 3,
    "category": "PEC",
    "sourcePage": 155,
    "syllabusSummary": "Reasoning under uncertainty; Methodology/modeling; Ontology design; Ontology reasoning/rules; Learning/rule learning",
    "topics": [
      "Reasoning under uncertainty",
      "Methodology/modeling",
      "Ontology design",
      "Ontology reasoning/rules",
      "Learning/rule learning"
    ],
    "slots": [
      "PEC-I",
      "PEC-II",
      "PEC-III",
      "PEC-IV",
      "PEC-V",
      "PEC-VI"
    ],
    "semesters": [
      5,
      6,
      7
    ]
  },
  {
    "code": "U21AMP02",
    "name": "Soft Computing",
    "vertical": "II – Artificial Intelligence and Machine Learning",
    "verticalNumber": 2,
    "verticalName": "Artificial Intelligence and Machine Learning",
    "credits": 3,
    "category": "PEC",
    "sourcePage": 157,
    "syllabusSummary": "ANN; Advanced neural networks; Fuzzy sets/relations; Genetic algorithms; Hybrid systems",
    "topics": [
      "ANN",
      "Advanced neural networks",
      "Fuzzy sets/relations",
      "Genetic algorithms",
      "Hybrid systems"
    ],
    "slots": [
      "PEC-I",
      "PEC-II",
      "PEC-III",
      "PEC-IV",
      "PEC-V",
      "PEC-VI"
    ],
    "semesters": [
      5,
      6,
      7
    ]
  },
  {
    "code": "U21AMP03",
    "name": "Deep Neural Networks",
    "vertical": "II – Artificial Intelligence and Machine Learning",
    "verticalNumber": 2,
    "verticalName": "Artificial Intelligence and Machine Learning",
    "credits": 3,
    "category": "PEC",
    "sourcePage": 159,
    "syllabusSummary": "Neural networks; CNN architectures; Training/fine-tuning; Deep-learning applications; Advanced CNNs",
    "topics": [
      "Neural networks",
      "CNN architectures",
      "Training/fine-tuning",
      "Deep-learning applications",
      "Advanced CNNs"
    ],
    "slots": [
      "PEC-I",
      "PEC-II",
      "PEC-III",
      "PEC-IV",
      "PEC-V",
      "PEC-VI"
    ],
    "semesters": [
      5,
      6,
      7
    ]
  },
  {
    "code": "U21AMP04",
    "name": "Reinforcement Learning",
    "vertical": "II – Artificial Intelligence and Machine Learning",
    "verticalNumber": 2,
    "verticalName": "Artificial Intelligence and Machine Learning",
    "credits": 3,
    "category": "PEC",
    "sourcePage": 161,
    "syllabusSummary": "RL foundations; MDP models; Function approximation; Deep reinforcement learning; Hierarchical RL",
    "topics": [
      "RL foundations",
      "MDP models",
      "Function approximation",
      "Deep reinforcement learning",
      "Hierarchical RL"
    ],
    "slots": [
      "PEC-I",
      "PEC-II",
      "PEC-III",
      "PEC-IV",
      "PEC-V",
      "PEC-VI"
    ],
    "semesters": [
      5,
      6,
      7
    ]
  },
  {
    "code": "U21AMP05",
    "name": "Computer Vision",
    "vertical": "II – Artificial Intelligence and Machine Learning",
    "verticalNumber": 2,
    "verticalName": "Artificial Intelligence and Machine Learning",
    "credits": 3,
    "category": "PEC",
    "sourcePage": 163,
    "syllabusSummary": "CV foundations; Image enhancement/filtering; Segmentation/detection; Feature extraction; Deep learning for CV",
    "topics": [
      "CV foundations",
      "Image enhancement/filtering",
      "Segmentation/detection",
      "Feature extraction",
      "Deep learning for CV"
    ],
    "slots": [
      "PEC-I",
      "PEC-II",
      "PEC-III",
      "PEC-IV",
      "PEC-V",
      "PEC-VI"
    ],
    "semesters": [
      5,
      6,
      7
    ]
  },
  {
    "code": "U21AMP06",
    "name": "Feature Engineering",
    "vertical": "II – Artificial Intelligence and Machine Learning",
    "verticalNumber": 2,
    "verticalName": "Artificial Intelligence and Machine Learning",
    "credits": 3,
    "category": "PEC",
    "sourcePage": 165,
    "syllabusSummary": "Feature foundations; Preprocessing/missing data; Feature creation/transformation; Anomaly detection; Feature selection/dimensionality reduction",
    "topics": [
      "Feature foundations",
      "Preprocessing/missing data",
      "Feature creation/transformation",
      "Anomaly detection",
      "Feature selection/dimensionality reduction"
    ],
    "slots": [
      "PEC-I",
      "PEC-II",
      "PEC-III",
      "PEC-IV",
      "PEC-V",
      "PEC-VI"
    ],
    "semesters": [
      5,
      6,
      7
    ]
  },
  {
    "code": "U21AMP07",
    "name": "Object Detection & Face Recognition",
    "vertical": "II – Artificial Intelligence and Machine Learning",
    "verticalNumber": 2,
    "verticalName": "Artificial Intelligence and Machine Learning",
    "credits": 3,
    "category": "PEC",
    "sourcePage": 167,
    "syllabusSummary": "Object detection; One/two-stage detectors; Face recognition; Biometric recognition; Advanced recognition applications",
    "topics": [
      "Object detection",
      "One/two-stage detectors",
      "Face recognition",
      "Biometric recognition",
      "Advanced recognition applications"
    ],
    "slots": [
      "PEC-I",
      "PEC-II",
      "PEC-III",
      "PEC-IV",
      "PEC-V",
      "PEC-VI"
    ],
    "semesters": [
      5,
      6,
      7
    ]
  },
  {
    "code": "U21AMP08",
    "name": "Text and Visual Analytics",
    "vertical": "II – Artificial Intelligence and Machine Learning",
    "verticalNumber": 2,
    "verticalName": "Artificial Intelligence and Machine Learning",
    "credits": 3,
    "category": "PEC",
    "sourcePage": 169,
    "syllabusSummary": "NLP basics; Text classification; Text clustering/topic modeling; QA/dialogue; Visual analytics/sentiment",
    "topics": [
      "NLP basics",
      "Text classification",
      "Text clustering/topic modeling",
      "QA/dialogue",
      "Visual analytics/sentiment"
    ],
    "slots": [
      "PEC-I",
      "PEC-II",
      "PEC-III",
      "PEC-IV",
      "PEC-V",
      "PEC-VI"
    ],
    "semesters": [
      5,
      6,
      7
    ]
  },
  {
    "code": "U21CSP01",
    "name": "Foundations of Cloud Computing",
    "vertical": "III – Cloud Computing and Data Storage Technologies",
    "verticalNumber": 3,
    "verticalName": "Cloud Computing and Data Storage Technologies",
    "credits": 3,
    "category": "PEC",
    "sourcePage": 171,
    "syllabusSummary": "Cloud basics; Virtualization/platforms; Storage/containers; Cloud security; Federation/interoperability",
    "topics": [
      "Cloud basics",
      "Virtualization/platforms",
      "Storage/containers",
      "Cloud security",
      "Federation/interoperability"
    ],
    "slots": [
      "PEC-I",
      "PEC-II",
      "PEC-III",
      "PEC-IV",
      "PEC-V",
      "PEC-VI"
    ],
    "semesters": [
      5,
      6,
      7
    ]
  },
  {
    "code": "U21CSP02",
    "name": "Data Storage and Management in Cloud",
    "vertical": "III – Cloud Computing and Data Storage Technologies",
    "verticalNumber": 3,
    "verticalName": "Cloud Computing and Data Storage Technologies",
    "credits": 3,
    "category": "PEC",
    "sourcePage": 173,
    "syllabusSummary": "Storage systems; Storage services/network connectivity; Storage security; Data management; Storage infrastructure security",
    "topics": [
      "Storage systems",
      "Storage services/network connectivity",
      "Storage security",
      "Data management",
      "Storage infrastructure security"
    ],
    "slots": [
      "PEC-I",
      "PEC-II",
      "PEC-III",
      "PEC-IV",
      "PEC-V",
      "PEC-VI"
    ],
    "semesters": [
      5,
      6,
      7
    ]
  },
  {
    "code": "U21CSP03",
    "name": "Virtualization Techniques",
    "vertical": "III – Cloud Computing and Data Storage Technologies",
    "verticalNumber": 3,
    "verticalName": "Cloud Computing and Data Storage Technologies",
    "credits": 3,
    "category": "PEC",
    "sourcePage": 175,
    "syllabusSummary": "Virtualization concepts; Server virtualization; Network virtualization; Storage virtualization; Applying virtualization",
    "topics": [
      "Virtualization concepts",
      "Server virtualization",
      "Network virtualization",
      "Storage virtualization",
      "Applying virtualization"
    ],
    "slots": [
      "PEC-I",
      "PEC-II",
      "PEC-III",
      "PEC-IV",
      "PEC-V",
      "PEC-VI"
    ],
    "semesters": [
      5,
      6,
      7
    ]
  },
  {
    "code": "U21CSP04",
    "name": "Security and Privacy in Cloud",
    "vertical": "III – Cloud Computing and Data Storage Technologies",
    "verticalNumber": 3,
    "verticalName": "Cloud Computing and Data Storage Technologies",
    "credits": 3,
    "category": "PEC",
    "sourcePage": 177,
    "syllabusSummary": "Cloud security/privacy; Threat models; Infrastructure security; Vulnerability/network security; Strategies/practices",
    "topics": [
      "Cloud security/privacy",
      "Threat models",
      "Infrastructure security",
      "Vulnerability/network security",
      "Strategies/practices"
    ],
    "slots": [
      "PEC-I",
      "PEC-II",
      "PEC-III",
      "PEC-IV",
      "PEC-V",
      "PEC-VI"
    ],
    "semesters": [
      5,
      6,
      7
    ]
  },
  {
    "code": "U21CSP05",
    "name": "Data Analysis in Cloud Computing",
    "vertical": "III – Cloud Computing and Data Storage Technologies",
    "verticalNumber": 3,
    "verticalName": "Cloud Computing and Data Storage Technologies",
    "credits": 3,
    "category": "PEC",
    "sourcePage": 179,
    "syllabusSummary": "Data mining; Cloud data analysis; Scalable analytics; Sensitive-data security; Research trends",
    "topics": [
      "Data mining",
      "Cloud data analysis",
      "Scalable analytics",
      "Sensitive-data security",
      "Research trends"
    ],
    "slots": [
      "PEC-I",
      "PEC-II",
      "PEC-III",
      "PEC-IV",
      "PEC-V",
      "PEC-VI"
    ],
    "semesters": [
      5,
      6,
      7
    ]
  },
  {
    "code": "U21CSP06",
    "name": "Edge Computing",
    "vertical": "III – Cloud Computing and Data Storage Technologies",
    "verticalNumber": 3,
    "verticalName": "Cloud Computing and Data Storage Technologies",
    "credits": 3,
    "category": "PEC",
    "sourcePage": 181,
    "syllabusSummary": "Edge paradigms; Resource management; Network management; Edge middleware; Applications",
    "topics": [
      "Edge paradigms",
      "Resource management",
      "Network management",
      "Edge middleware",
      "Applications"
    ],
    "slots": [
      "PEC-I",
      "PEC-II",
      "PEC-III",
      "PEC-IV",
      "PEC-V",
      "PEC-VI"
    ],
    "semesters": [
      5,
      6,
      7
    ]
  },
  {
    "code": "U21CSP07",
    "name": "Cloud Service Management",
    "vertical": "III – Cloud Computing and Data Storage Technologies",
    "verticalNumber": 3,
    "verticalName": "Cloud Computing and Data Storage Technologies",
    "credits": 3,
    "category": "PEC",
    "sourcePage": 183,
    "syllabusSummary": "Cloud enabling technology/architecture; IaaS; PaaS; SaaS; Cloud security management",
    "topics": [
      "Cloud enabling technology/architecture",
      "IaaS",
      "PaaS",
      "SaaS",
      "Cloud security management"
    ],
    "slots": [
      "PEC-I",
      "PEC-II",
      "PEC-III",
      "PEC-IV",
      "PEC-V",
      "PEC-VI"
    ],
    "semesters": [
      5,
      6,
      7
    ]
  },
  {
    "code": "U21CSP08",
    "name": "Big Data Integration and Processing",
    "vertical": "III – Cloud Computing and Data Storage Technologies",
    "verticalNumber": 3,
    "verticalName": "Cloud Computing and Data Storage Technologies",
    "credits": 3,
    "category": "PEC",
    "sourcePage": 185,
    "syllabusSummary": "Big-data storage; Retrieval; Integration; Processing pipelines; Analytics",
    "topics": [
      "Big-data storage",
      "Retrieval",
      "Integration",
      "Processing pipelines",
      "Analytics"
    ],
    "slots": [
      "PEC-I",
      "PEC-II",
      "PEC-III",
      "PEC-IV",
      "PEC-V",
      "PEC-VI"
    ],
    "semesters": [
      5,
      6,
      7
    ]
  },
  {
    "code": "U21ITP01",
    "name": "Parallel and Distributed Computing",
    "vertical": "IV – Networking and Cyber Security",
    "verticalNumber": 4,
    "verticalName": "Networking and Cyber Security",
    "credits": 3,
    "category": "PEC",
    "sourcePage": 187,
    "syllabusSummary": "Message passing; Parallel algorithm design; Communication/synchronizers; Distributed systems; Communication/consistency",
    "topics": [
      "Message passing",
      "Parallel algorithm design",
      "Communication/synchronizers",
      "Distributed systems",
      "Communication/consistency"
    ],
    "slots": [
      "PEC-I",
      "PEC-II",
      "PEC-III",
      "PEC-IV",
      "PEC-V",
      "PEC-VI"
    ],
    "semesters": [
      5,
      6,
      7
    ]
  },
  {
    "code": "U21ITP02",
    "name": "Mobile Computing",
    "vertical": "IV – Networking and Cyber Security",
    "verticalNumber": 4,
    "verticalName": "Networking and Cyber Security",
    "credits": 3,
    "category": "PEC",
    "sourcePage": 189,
    "syllabusSummary": "Mobile communication; MAC/Mobile IP; Mobile transport; Mobile data networks; Applications/e-commerce",
    "topics": [
      "Mobile communication",
      "MAC/Mobile IP",
      "Mobile transport",
      "Mobile data networks",
      "Applications/e-commerce"
    ],
    "slots": [
      "PEC-I",
      "PEC-II",
      "PEC-III",
      "PEC-IV",
      "PEC-V",
      "PEC-VI"
    ],
    "semesters": [
      5,
      6,
      7
    ]
  },
  {
    "code": "U21ITP03",
    "name": "Wireless Sensor Networks",
    "vertical": "IV – Networking and Cyber Security",
    "verticalNumber": 4,
    "verticalName": "Networking and Cyber Security",
    "credits": 3,
    "category": "PEC",
    "sourcePage": 191,
    "syllabusSummary": "WSN architecture; MAC; Routing/data gathering; Network management; Applications",
    "topics": [
      "WSN architecture",
      "MAC",
      "Routing/data gathering",
      "Network management",
      "Applications"
    ],
    "slots": [
      "PEC-I",
      "PEC-II",
      "PEC-III",
      "PEC-IV",
      "PEC-V",
      "PEC-VI"
    ],
    "semesters": [
      5,
      6,
      7
    ]
  },
  {
    "code": "U21ITP04",
    "name": "Software Defined Networks",
    "vertical": "IV – Networking and Cyber Security",
    "verticalNumber": 4,
    "verticalName": "Networking and Cyber Security",
    "credits": 3,
    "category": "PEC",
    "sourcePage": 193,
    "syllabusSummary": "SDN introduction; OpenFlow/controllers; Data centers; SDN framework; Applications/open source",
    "topics": [
      "SDN introduction",
      "OpenFlow/controllers",
      "Data centers",
      "SDN framework",
      "Applications/open source"
    ],
    "slots": [
      "PEC-I",
      "PEC-II",
      "PEC-III",
      "PEC-IV",
      "PEC-V",
      "PEC-VI"
    ],
    "semesters": [
      5,
      6,
      7
    ]
  },
  {
    "code": "U21ITP05",
    "name": "Cyber Security",
    "vertical": "IV – Networking and Cyber Security",
    "verticalNumber": 4,
    "verticalName": "Networking and Cyber Security",
    "credits": 3,
    "category": "PEC",
    "sourcePage": 195,
    "syllabusSummary": "Cyber-security foundations; Objectives/guidance; Cyber-security issues; Attacks/exploitation; Malicious code/defense",
    "topics": [
      "Cyber-security foundations",
      "Objectives/guidance",
      "Cyber-security issues",
      "Attacks/exploitation",
      "Malicious code/defense"
    ],
    "slots": [
      "PEC-I",
      "PEC-II",
      "PEC-III",
      "PEC-IV",
      "PEC-V",
      "PEC-VI"
    ],
    "semesters": [
      5,
      6,
      7
    ]
  },
  {
    "code": "U21ITP06",
    "name": "Internet Security",
    "vertical": "IV – Networking and Cyber Security",
    "verticalNumber": 4,
    "verticalName": "Networking and Cyber Security",
    "credits": 3,
    "category": "PEC",
    "sourcePage": 197,
    "syllabusSummary": "Intrusion detection/prevention; IP/web security; Email security; Wireless security; Cloud security",
    "topics": [
      "Intrusion detection/prevention",
      "IP/web security",
      "Email security",
      "Wireless security",
      "Cloud security"
    ],
    "slots": [
      "PEC-I",
      "PEC-II",
      "PEC-III",
      "PEC-IV",
      "PEC-V",
      "PEC-VI"
    ],
    "semesters": [
      5,
      6,
      7
    ]
  },
  {
    "code": "U21ITP07",
    "name": "Ethical Hacking",
    "vertical": "IV – Networking and Cyber Security",
    "verticalNumber": 4,
    "verticalName": "Networking and Cyber Security",
    "credits": 3,
    "category": "PEC",
    "sourcePage": 199,
    "syllabusSummary": "Penetration testing; Port scanning; Vulnerability assessment/sniffing; Remote exploitation; Web/wireless hacking",
    "topics": [
      "Penetration testing",
      "Port scanning",
      "Vulnerability assessment/sniffing",
      "Remote exploitation",
      "Web/wireless hacking"
    ],
    "slots": [
      "PEC-I",
      "PEC-II",
      "PEC-III",
      "PEC-IV",
      "PEC-V",
      "PEC-VI"
    ],
    "semesters": [
      5,
      6,
      7
    ]
  },
  {
    "code": "U21ITP08",
    "name": "Digital Forensics",
    "vertical": "IV – Networking and Cyber Security",
    "verticalNumber": 4,
    "verticalName": "Networking and Cyber Security",
    "credits": 3,
    "category": "PEC",
    "sourcePage": 201,
    "syllabusSummary": "Computer forensics; Evidence acquisition/documentation; Online investigations; Network/mobile forensics; MAC/mobile forensics",
    "topics": [
      "Computer forensics",
      "Evidence acquisition/documentation",
      "Online investigations",
      "Network/mobile forensics",
      "MAC/mobile forensics"
    ],
    "slots": [
      "PEC-I",
      "PEC-II",
      "PEC-III",
      "PEC-IV",
      "PEC-V",
      "PEC-VI"
    ],
    "semesters": [
      5,
      6,
      7
    ]
  },
  {
    "code": "U21CSP09",
    "name": "UI/UX Design",
    "vertical": "V – Full Stack Development",
    "verticalNumber": 5,
    "verticalName": "Full Stack Development",
    "credits": 3,
    "category": "PEC",
    "sourcePage": 203,
    "syllabusSummary": "UI/UX foundations; Information organization; Heuristics/interaction; Prototyping/testing; Product design",
    "topics": [
      "UI/UX foundations",
      "Information organization",
      "Heuristics/interaction",
      "Prototyping/testing",
      "Product design"
    ],
    "slots": [
      "PEC-I",
      "PEC-II",
      "PEC-III",
      "PEC-IV",
      "PEC-V",
      "PEC-VI"
    ],
    "semesters": [
      5,
      6,
      7
    ]
  },
  {
    "code": "U21CSP10",
    "name": "Python Web Development",
    "vertical": "V – Full Stack Development",
    "verticalNumber": 5,
    "verticalName": "Full Stack Development",
    "credits": 3,
    "category": "PEC",
    "sourcePage": 205,
    "syllabusSummary": "Python OOP; Python UI; Flask; Real-time web apps; Deployment/version control",
    "topics": [
      "Python OOP",
      "Python UI",
      "Flask",
      "Real-time web apps",
      "Deployment/version control"
    ],
    "slots": [
      "PEC-I",
      "PEC-II",
      "PEC-III",
      "PEC-IV",
      "PEC-V",
      "PEC-VI"
    ],
    "semesters": [
      5,
      6,
      7
    ]
  },
  {
    "code": "U21CSP11",
    "name": "App Development",
    "vertical": "V – Full Stack Development",
    "verticalNumber": 5,
    "verticalName": "Full Stack Development",
    "credits": 3,
    "category": "PEC",
    "sourcePage": 207,
    "syllabusSummary": "Mobile/web app foundations; Native Android/Java; Hybrid apps; React Native; Cross-platform characteristics",
    "topics": [
      "Mobile/web app foundations",
      "Native Android/Java",
      "Hybrid apps",
      "React Native",
      "Cross-platform characteristics"
    ],
    "slots": [
      "PEC-I",
      "PEC-II",
      "PEC-III",
      "PEC-IV",
      "PEC-V",
      "PEC-VI"
    ],
    "semesters": [
      5,
      6,
      7
    ]
  },
  {
    "code": "U21CSP12",
    "name": "JavaScript Frameworks",
    "vertical": "V – Full Stack Development",
    "verticalNumber": 5,
    "verticalName": "Full Stack Development",
    "credits": 3,
    "category": "PEC",
    "sourcePage": 209,
    "syllabusSummary": "Full-stack basics; Node.js; MongoDB; Express/Angular; React/MERN",
    "topics": [
      "Full-stack basics",
      "Node.js",
      "MongoDB",
      "Express/Angular",
      "React/MERN"
    ],
    "slots": [
      "PEC-I",
      "PEC-II",
      "PEC-III",
      "PEC-IV",
      "PEC-V",
      "PEC-VI"
    ],
    "semesters": [
      5,
      6,
      7
    ]
  },
  {
    "code": "U21CSP13",
    "name": "Web Services and API Design",
    "vertical": "V – Full Stack Development",
    "verticalNumber": 5,
    "verticalName": "Full Stack Development",
    "credits": 3,
    "category": "PEC",
    "sourcePage": 211,
    "syllabusSummary": "Web-service foundations; Resource/design patterns; REST APIs; Development/deployment; Performance/security",
    "topics": [
      "Web-service foundations",
      "Resource/design patterns",
      "REST APIs",
      "Development/deployment",
      "Performance/security"
    ],
    "slots": [
      "PEC-I",
      "PEC-II",
      "PEC-III",
      "PEC-IV",
      "PEC-V",
      "PEC-VI"
    ],
    "semesters": [
      5,
      6,
      7
    ]
  },
  {
    "code": "U21CSP14",
    "name": "SOA & Microservices",
    "vertical": "V – Full Stack Development",
    "verticalNumber": 5,
    "verticalName": "Full Stack Development",
    "credits": 3,
    "category": "PEC",
    "sourcePage": 213,
    "syllabusSummary": "SOA/microservices; Microservice development; Service-oriented architecture; Cloud/DevOps; APIs",
    "topics": [
      "SOA/microservices",
      "Microservice development",
      "Service-oriented architecture",
      "Cloud/DevOps",
      "APIs"
    ],
    "slots": [
      "PEC-I",
      "PEC-II",
      "PEC-III",
      "PEC-IV",
      "PEC-V",
      "PEC-VI"
    ],
    "semesters": [
      5,
      6,
      7
    ]
  },
  {
    "code": "U21CSP15",
    "name": "Cloud Native Applications Development",
    "vertical": "V – Full Stack Development",
    "verticalNumber": 5,
    "verticalName": "Full Stack Development",
    "credits": 3,
    "category": "PEC",
    "sourcePage": 215,
    "syllabusSummary": "Cloud environments; Cloud-native function/CNCF; Jenkins CI; Docker; Orchestration",
    "topics": [
      "Cloud environments",
      "Cloud-native function/CNCF",
      "Jenkins CI",
      "Docker",
      "Orchestration"
    ],
    "slots": [
      "PEC-I",
      "PEC-II",
      "PEC-III",
      "PEC-IV",
      "PEC-V",
      "PEC-VI"
    ],
    "semesters": [
      5,
      6,
      7
    ]
  },
  {
    "code": "U21CSP16",
    "name": "DevOps",
    "vertical": "V – Full Stack Development",
    "verticalNumber": 5,
    "verticalName": "Full Stack Development",
    "credits": 3,
    "category": "PEC",
    "sourcePage": 217,
    "syllabusSummary": "DevOps foundations; Build/compile; Jenkins CI; Ansible configuration management; Continuous deployment/automation",
    "topics": [
      "DevOps foundations",
      "Build/compile",
      "Jenkins CI",
      "Ansible configuration management",
      "Continuous deployment/automation"
    ],
    "slots": [
      "PEC-I",
      "PEC-II",
      "PEC-III",
      "PEC-IV",
      "PEC-V",
      "PEC-VI"
    ],
    "semesters": [
      5,
      6,
      7
    ]
  },
  {
    "code": "U21ITP09",
    "name": "Next Generation Networks",
    "vertical": "VI – IT and IT Enabled Services (ITES)",
    "verticalNumber": 6,
    "verticalName": "IT and IT Enabled Services (ITES)",
    "credits": 3,
    "category": "PEC",
    "sourcePage": 219,
    "syllabusSummary": "5G/connected world; Small cells; Cooperative wireless; Cognitive radio; Security/self-organizing networks",
    "topics": [
      "5G/connected world",
      "Small cells",
      "Cooperative wireless",
      "Cognitive radio",
      "Security/self-organizing networks"
    ],
    "slots": [
      "PEC-I",
      "PEC-II",
      "PEC-III",
      "PEC-IV",
      "PEC-V",
      "PEC-VI"
    ],
    "semesters": [
      5,
      6,
      7
    ]
  },
  {
    "code": "U21ITP10",
    "name": "Game Development",
    "vertical": "VI – IT and IT Enabled Services (ITES)",
    "verticalNumber": 6,
    "verticalName": "IT and IT Enabled Services (ITES)",
    "credits": 3,
    "category": "PEC",
    "sourcePage": 221,
    "syllabusSummary": "Game foundations; Perfect-information games; Imperfect-information games; Non-cooperative game theory; Mechanism design",
    "topics": [
      "Game foundations",
      "Perfect-information games",
      "Imperfect-information games",
      "Non-cooperative game theory",
      "Mechanism design"
    ],
    "slots": [
      "PEC-I",
      "PEC-II",
      "PEC-III",
      "PEC-IV",
      "PEC-V",
      "PEC-VI"
    ],
    "semesters": [
      5,
      6,
      7
    ]
  },
  {
    "code": "U21ITP11",
    "name": "Blockchain Technologies",
    "vertical": "VI – IT and IT Enabled Services (ITES)",
    "verticalNumber": 6,
    "verticalName": "IT and IT Enabled Services (ITES)",
    "credits": 3,
    "category": "PEC",
    "sourcePage": 223,
    "syllabusSummary": "Blockchain foundations; Cryptocurrency/smart contracts; Ethereum; Web3/Hyperledger; Alternatives/challenges",
    "topics": [
      "Blockchain foundations",
      "Cryptocurrency/smart contracts",
      "Ethereum",
      "Web3/Hyperledger",
      "Alternatives/challenges"
    ],
    "slots": [
      "PEC-I",
      "PEC-II",
      "PEC-III",
      "PEC-IV",
      "PEC-V",
      "PEC-VI"
    ],
    "semesters": [
      5,
      6,
      7
    ]
  },
  {
    "code": "U21ITP12",
    "name": "Augmented Reality / Virtual Reality",
    "vertical": "VI – IT and IT Enabled Services (ITES)",
    "verticalNumber": 6,
    "verticalName": "IT and IT Enabled Services (ITES)",
    "credits": 3,
    "category": "PEC",
    "sourcePage": 225,
    "syllabusSummary": "XR overview; VR modeling; VR applications; AR principles; AR application development",
    "topics": [
      "XR overview",
      "VR modeling",
      "VR applications",
      "AR principles",
      "AR application development"
    ],
    "slots": [
      "PEC-I",
      "PEC-II",
      "PEC-III",
      "PEC-IV",
      "PEC-V",
      "PEC-VI"
    ],
    "semesters": [
      5,
      6,
      7
    ]
  },
  {
    "code": "U21ITP13",
    "name": "Quantum Computing",
    "vertical": "VI – IT and IT Enabled Services (ITES)",
    "verticalNumber": 6,
    "verticalName": "IT and IT Enabled Services (ITES)",
    "credits": 3,
    "category": "PEC",
    "sourcePage": 227,
    "syllabusSummary": "Qubits; Measurement/state transformations; Quantum algorithms; Shor; Error correction/tools",
    "topics": [
      "Qubits",
      "Measurement/state transformations",
      "Quantum algorithms",
      "Shor",
      "Error correction/tools"
    ],
    "slots": [
      "PEC-I",
      "PEC-II",
      "PEC-III",
      "PEC-IV",
      "PEC-V",
      "PEC-VI"
    ],
    "semesters": [
      5,
      6,
      7
    ]
  },
  {
    "code": "U21ITP14",
    "name": "Graphics Processing Unit",
    "vertical": "VI – IT and IT Enabled Services (ITES)",
    "verticalNumber": 6,
    "verticalName": "IT and IT Enabled Services (ITES)",
    "credits": 3,
    "category": "PEC",
    "sourcePage": 229,
    "syllabusSummary": "GPU architecture; Memory; Synchronization/functions; Streams; Parallel/heterogeneous processing",
    "topics": [
      "GPU architecture",
      "Memory",
      "Synchronization/functions",
      "Streams",
      "Parallel/heterogeneous processing"
    ],
    "slots": [
      "PEC-I",
      "PEC-II",
      "PEC-III",
      "PEC-IV",
      "PEC-V",
      "PEC-VI"
    ],
    "semesters": [
      5,
      6,
      7
    ]
  },
  {
    "code": "U21ITP15",
    "name": "Agile Methodologies",
    "vertical": "VI – IT and IT Enabled Services (ITES)",
    "verticalNumber": 6,
    "verticalName": "IT and IT Enabled Services (ITES)",
    "credits": 3,
    "category": "PEC",
    "sourcePage": 231,
    "syllabusSummary": "Agile foundations; Agile processes; Agility/knowledge management; Quality assurance; PDF shows four main units",
    "topics": [
      "Agile foundations",
      "Agile processes",
      "Agility/knowledge management",
      "Quality assurance",
      "PDF shows four main units"
    ],
    "slots": [
      "PEC-I",
      "PEC-II",
      "PEC-III",
      "PEC-IV",
      "PEC-V",
      "PEC-VI"
    ],
    "semesters": [
      5,
      6,
      7
    ]
  },
  {
    "code": "U21ITP16",
    "name": "Software Testing Tools and Techniques",
    "vertical": "VI – IT and IT Enabled Services (ITES)",
    "verticalNumber": 6,
    "verticalName": "IT and IT Enabled Services (ITES)",
    "credits": 3,
    "category": "PEC",
    "sourcePage": 233,
    "syllabusSummary": "Testing foundations; Unit testing; Integration strategies; Automation testing; Web-testing enhancements",
    "topics": [
      "Testing foundations",
      "Unit testing",
      "Integration strategies",
      "Automation testing",
      "Web-testing enhancements"
    ],
    "slots": [
      "PEC-I",
      "PEC-II",
      "PEC-III",
      "PEC-IV",
      "PEC-V",
      "PEC-VI"
    ],
    "semesters": [
      5,
      6,
      7
    ]
  }
];

export const IT_OPEN_ELECTIVES_SEED: ISeedOEC[] = [
  {
    "code": "U21ITX01",
    "name": "Information Technology Essentials",
    "group": "Open Elective – I",
    "slot": "OEC-I",
    "semesterNumber": 4,
    "credits": 3,
    "category": "OEC",
    "syllabusSummary": "Interdisciplinary Open Elective option offered by IT Department for Semester 4.",
    "topics": [
      "Information Technology Essentials",
      "Fundamentals & Practical Applications",
      "Case Studies & Emerging Trends"
    ]
  },
  {
    "code": "U21ITX02",
    "name": "Introduction to Cyber Security",
    "group": "Open Elective – I",
    "slot": "OEC-I",
    "semesterNumber": 4,
    "credits": 3,
    "category": "OEC",
    "syllabusSummary": "Interdisciplinary Open Elective option offered by IT Department for Semester 4.",
    "topics": [
      "Introduction to Cyber Security",
      "Fundamentals & Practical Applications",
      "Case Studies & Emerging Trends"
    ]
  },
  {
    "code": "U21ITX03",
    "name": "Digital Transformation",
    "group": "Open Elective – II",
    "slot": "OEC-II",
    "semesterNumber": 5,
    "credits": 3,
    "category": "OEC",
    "syllabusSummary": "Interdisciplinary Open Elective option offered by IT Department for Semester 5.",
    "topics": [
      "Digital Transformation",
      "Fundamentals & Practical Applications",
      "Case Studies & Emerging Trends"
    ]
  },
  {
    "code": "U21ITX04",
    "name": "Human Resource Management",
    "group": "Open Elective – II",
    "slot": "OEC-II",
    "semesterNumber": 5,
    "credits": 3,
    "category": "OEC",
    "syllabusSummary": "Interdisciplinary Open Elective option offered by IT Department for Semester 5.",
    "topics": [
      "Human Resource Management",
      "Fundamentals & Practical Applications",
      "Case Studies & Emerging Trends"
    ]
  },
  {
    "code": "U21ITX05",
    "name": "Social Media Security",
    "group": "Open Elective – III",
    "slot": "OEC-III",
    "semesterNumber": 6,
    "credits": 3,
    "category": "OEC",
    "syllabusSummary": "Interdisciplinary Open Elective option offered by IT Department for Semester 6.",
    "topics": [
      "Social Media Security",
      "Fundamentals & Practical Applications",
      "Case Studies & Emerging Trends"
    ]
  },
  {
    "code": "U21ITX06",
    "name": "Enterprise Resource Planning",
    "group": "Open Elective – III",
    "slot": "OEC-III",
    "semesterNumber": 6,
    "credits": 3,
    "category": "OEC",
    "syllabusSummary": "Interdisciplinary Open Elective option offered by IT Department for Semester 6.",
    "topics": [
      "Enterprise Resource Planning",
      "Fundamentals & Practical Applications",
      "Case Studies & Emerging Trends"
    ]
  },
  {
    "code": "U21ITX07",
    "name": "Introduction to Computer Forensics",
    "group": "Open Elective – IV",
    "slot": "OEC-IV",
    "semesterNumber": 7,
    "credits": 3,
    "category": "OEC",
    "syllabusSummary": "Interdisciplinary Open Elective option offered by IT Department for Semester 7.",
    "topics": [
      "Introduction to Computer Forensics",
      "Fundamentals & Practical Applications",
      "Case Studies & Emerging Trends"
    ]
  },
  {
    "code": "U21ITX08",
    "name": "User Interface Design",
    "group": "Open Elective – IV",
    "slot": "OEC-IV",
    "semesterNumber": 7,
    "credits": 3,
    "category": "OEC",
    "syllabusSummary": "Interdisciplinary Open Elective option offered by IT Department for Semester 7.",
    "topics": [
      "User Interface Design",
      "Fundamentals & Practical Applications",
      "Case Studies & Emerging Trends"
    ]
  }
];
