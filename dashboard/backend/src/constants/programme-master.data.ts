/**
 * Official B.E. Programme Master — SEED SOURCE ONLY.
 *
 * This file is read exclusively by the idempotent programme seeder
 * (services/programme.service.ts → ProgrammeService.seedProgrammeMaster).
 * The application never reads this list at runtime: every API, dashboard,
 * registration form, RAG query and Smart Board session reads the programme
 * master from the `departments` collection (the database is the single source
 * of truth). To change a programme's display name, website or status, update
 * the database (Admin → Programme Management) — not a React component.
 *
 * `code` is the stable programmeId used across the platform (e.g. "IT").
 * `legacyCodes` / `legacyNames` let the seeder migrate records created by
 * earlier seeds (e.g. code "AD", "MECH", "CIVIL", "CHEM") IN PLACE, keeping
 * their MongoDB _id so existing subjects, curriculum, enrollments, teacher
 * assignments and RAG knowledge stay linked.
 */

export interface IProgrammeMasterSeed {
  code: string;
  name: string;
  shortName: string;
  type: 'B.E.';
  displayOrder: number;
  officialWebsite: string;
  icon: string;
  description: string;
  legacyCodes: string[];
  legacyNames: string[];
}

export const INSTITUTION_WEBSITE = 'https://kpriet.ac.in';

export const PROGRAMME_MASTER_SEED: readonly IProgrammeMasterSeed[] = [
  {
    code: 'AIDS',
    name: 'Artificial Intelligence and Data Science',
    shortName: 'AI & DS',
    type: 'B.E.',
    displayOrder: 1,
    officialWebsite: INSTITUTION_WEBSITE,
    icon: '🤖',
    description:
      'Intelligent autonomous systems, machine learning engineering, statistical computing and predictive data science.',
    legacyCodes: ['AD', 'AI&DS', 'AI-DS', 'AIDS'],
    legacyNames: ['Artificial Intelligence & Data Science', 'AI & DS', 'AI and DS'],
  },
  {
    code: 'BME',
    name: 'Biomedical Engineering',
    shortName: 'BME',
    type: 'B.E.',
    displayOrder: 2,
    officialWebsite: INSTITUTION_WEBSITE,
    icon: '🩺',
    description:
      'Healthcare instrumentation, medical imaging, prosthetics and physiological sensing at the intersection of life sciences and engineering.',
    legacyCodes: ['BM', 'BIO', 'BIOMED'],
    legacyNames: ['Bio Medical Engineering', 'Bio-Medical Engineering'],
  },
  {
    code: 'CHE',
    name: 'Chemical Engineering',
    shortName: 'Chemical',
    type: 'B.E.',
    displayOrder: 3,
    officialWebsite: INSTITUTION_WEBSITE,
    icon: '🧪',
    description:
      'Transforming raw materials into sustainable fuels, pharmaceuticals, polymers and advanced process technologies.',
    legacyCodes: ['CHEM', 'CH'],
    legacyNames: [],
  },
  {
    code: 'CIV',
    name: 'Civil Engineering',
    shortName: 'Civil',
    type: 'B.E.',
    displayOrder: 4,
    officialWebsite: INSTITUTION_WEBSITE,
    icon: '🏗',
    description:
      'Resilient infrastructure, sustainable smart cities, earthquake-resistant structures and environmental hydraulics.',
    legacyCodes: ['CIVIL', 'CE'],
    legacyNames: [],
  },
  {
    code: 'CSBS',
    name: 'Computer Science and Business Systems',
    shortName: 'CSBS',
    type: 'B.E.',
    displayOrder: 5,
    officialWebsite: INSTITUTION_WEBSITE,
    icon: '📊',
    description:
      'Enterprise computing, financial modelling, agile delivery and business analytics in one multidisciplinary programme.',
    legacyCodes: ['CB'],
    legacyNames: ['Computer Science & Business Systems'],
  },
  {
    code: 'CSE',
    name: 'Computer Science and Engineering',
    shortName: 'CSE',
    type: 'B.E.',
    displayOrder: 6,
    officialWebsite: INSTITUTION_WEBSITE,
    icon: '💻',
    description:
      'Core computing theory, high-performance software systems, algorithms, enterprise architecture and cloud computing.',
    legacyCodes: ['CS'],
    legacyNames: ['Computer Science & Engineering'],
  },
  {
    code: 'AIML',
    name: 'Computer Science Engineering (AI & ML)',
    shortName: 'CSE (AI & ML)',
    type: 'B.E.',
    displayOrder: 7,
    officialWebsite: INSTITUTION_WEBSITE,
    icon: '🧠',
    description:
      'Computer science systems engineering combined with machine learning, machine perception and applied artificial intelligence.',
    legacyCodes: ['AM', 'CSE-AIML', 'CSEAIML'],
    legacyNames: [
      'Computer Science and Engineering (AIML)',
      'Computer Science and Engineering (AI & ML)',
      'Computer Science and Engineering (Artificial Intelligence and Machine Learning)',
      'CSE (AI & ML)',
      'CSE (AIML)',
    ],
  },
  {
    code: 'CYBER',
    name: 'CSE (Cyber Security)',
    shortName: 'CSE (Cyber Security)',
    type: 'B.E.',
    displayOrder: 8,
    officialWebsite: INSTITUTION_WEBSITE,
    icon: '🛡',
    description:
      'Defensive architecture, cryptography, malware analysis, digital forensics and zero-trust security engineering.',
    legacyCodes: ['CY', 'CSE-CS', 'CSECS'],
    legacyNames: [
      'Computer Science and Engineering (Cyber Security)',
      'Computer Science Engineering (Cyber Security)',
    ],
  },
  {
    code: 'EEE',
    name: 'Electrical & Electronics Engineering',
    shortName: 'EEE',
    type: 'B.E.',
    displayOrder: 9,
    officialWebsite: INSTITUTION_WEBSITE,
    icon: '⚡',
    description:
      'Electric mobility, renewable generation, high-voltage systems and power electronics.',
    legacyCodes: ['EE'],
    legacyNames: ['Electrical and Electronics Engineering'],
  },
  {
    code: 'ECE',
    name: 'Electronics & Communication Engineering',
    shortName: 'ECE',
    type: 'B.E.',
    displayOrder: 10,
    officialWebsite: INSTITUTION_WEBSITE,
    icon: '📡',
    description:
      'Semiconductor devices, communication systems, antenna design and embedded systems.',
    legacyCodes: ['EC'],
    legacyNames: ['Electronics and Communication Engineering'],
  },
  {
    code: 'VLSI',
    name: 'Electronics Engineering (VLSI Design and Technology)',
    shortName: 'ECE (VLSI)',
    type: 'B.E.',
    displayOrder: 11,
    officialWebsite: INSTITUTION_WEBSITE,
    icon: '🔲',
    description:
      'Integrated circuit design, semiconductor fabrication technology, digital and analog VLSI and chip verification.',
    legacyCodes: ['EVLSI', 'EE-VLSI'],
    legacyNames: [
      'Electronics Engineering (VLSI Design & Technology)',
      'VLSI Design and Technology',
    ],
  },
  {
    code: 'IT',
    name: 'Information Technology',
    shortName: 'IT',
    type: 'B.E.',
    displayOrder: 12,
    officialWebsite: INSTITUTION_WEBSITE,
    icon: '🌐',
    description:
      'Full-stack software development, distributed systems, IoT architectures and smart computing.',
    legacyCodes: [],
    legacyNames: [],
  },
  {
    code: 'ME',
    name: 'Mechanical Engineering',
    shortName: 'Mechanical',
    type: 'B.E.',
    displayOrder: 13,
    officialWebsite: INSTITUTION_WEBSITE,
    icon: '⚙',
    description:
      'Thermodynamics, CAD/CAM manufacturing, propulsion, FEA simulation and advanced materials.',
    legacyCodes: ['MECH', 'MEC'],
    legacyNames: [],
  },
  {
    code: 'MTR',
    name: 'Mechatronics Engineering',
    shortName: 'Mechatronics',
    type: 'B.E.',
    displayOrder: 14,
    officialWebsite: INSTITUTION_WEBSITE,
    icon: '🦾',
    description:
      'Mechanical mechanisms, precision electronics, embedded controllers and industrial robotics.',
    legacyCodes: ['MC', 'MCT', 'MECHATRONICS'],
    legacyNames: [],
  },
] as const;

/** Default regulation label shown with a programme (e.g. "B.E. – R2021 CBCS"). */
export const DEFAULT_REGULATION_LABEL = 'R2021 CBCS';
