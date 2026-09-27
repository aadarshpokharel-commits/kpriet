export interface IDepartment {
  _id: string;
  name: string;
  code: string;
  programmeType: string;
  description?: string;
  hod?: {
    _id: string;
    name: string;
    collegeEmail: string;
    identifier: string;
  };
  status: 'ACTIVE' | 'INACTIVE';
}

export interface IProgramme {
  _id: string;
  name: string;
  code: string;
  degree: string;
  department: string | { _id: string; name: string; code: string };
  programmeType: string;
  durationYears: number;
  totalSemesters: number;
  description?: string;
  status: 'ACTIVE' | 'INACTIVE';
}

export interface ISemester {
  _id: string;
  semesterNumber: number;
  academicYear: string;
  regulation: string;
  department: string | { _id: string; name: string; code: string };
  programme?: string | { _id: string; name: string; code: string; degree: string };
  startDate?: string;
  endDate?: string;
  status: string;
}

export interface IChapter {
  _id: string;
  unitNumber: number;
  unitCode?: string;
  title: string;
  description?: string;
  syllabusText?: string;
  topics: string[];
  subtopics?: string[];
  hours?: number;
}

export type ISyllabusUnit = IChapter;

export interface ISubject {
  _id: string;
  subjectName: string;
  subjectCode: string;
  department: string | { _id: string; name: string; code: string };
  semester: string | { _id: string; semesterNumber: number; academicYear: string; regulation: string };
  semesterNumber: number;
  credits: number;
  category?: 'HSMC' | 'BSC' | 'ESC' | 'PCC' | 'PEC' | 'OEC' | 'EEC' | 'MNC' | string;
  isElectiveSlot?: boolean;
  electiveSlotType?: 'PEC' | 'OEC';
  electiveSlotCode?: string;
  practicalInfo?: string;
  projectInfo?: string;
  syllabus: IChapter[];
  description?: string;
  icon?: string;
  color?: string;
  status: 'ACTIVE' | 'INACTIVE';
}

export interface ICurriculumUnit {
  _id: string;
  subject: string | { _id: string; subjectName: string; subjectCode: string };
  subjectCode: string;
  department: string;
  programme?: string;
  semester: string;
  semesterNumber: number;
  unitNumber: number;
  unitCode?: string;
  title: string;
  description?: string;
  syllabusText?: string;
  topics: string[];
  subtopics?: string[];
  estimatedHours?: number;
  order: number;
  status: 'ACTIVE' | 'INACTIVE';
}

export interface IProfessionalElective {
  _id: string;
  code: string;
  name: string;
  department: string;
  programme?: string;
  vertical: string;
  verticalNumber: number;
  verticalName: string;
  credits: number;
  category: string;
  sourcePage?: number;
  syllabusSummary: string;
  topics: string[];
  slots: string[];
  semesters: number[];
  status: 'ACTIVE' | 'INACTIVE';
}

export interface IOpenElective {
  _id: string;
  code: string;
  name: string;
  department: string;
  programme?: string;
  group: string;
  slot: string;
  semesterNumber: number;
  credits: number;
  category: string;
  syllabusSummary?: string;
  topics?: string[];
  status: 'ACTIVE' | 'INACTIVE';
}

export interface ICurriculumSemester {
  _id: string;
  semesterNumber: number;
  academicYear: string;
  regulation: string;
  creditTotal: number;
  subjectCount: number;
  subjects: ISubject[];
}

export interface ICurriculumTree {
  department: {
    _id: string;
    name: string;
    code: string;
    programmeType: string;
  };
  programme: {
    _id: string;
    name: string;
    code: string;
    degree: string;
    totalSemesters: number;
    durationYears: number;
  } | null;
  regulation: string;
  totalProgrammeCredits: number;
  calculatedCredits: number;
  semesters: ICurriculumSemester[];
  professionalElectives: {
    totalCount: number;
    verticalsCount: number;
    verticals: Record<string, { verticalNumber: number; verticalName: string; electives: IProfessionalElective[] }>;
    all: IProfessionalElective[];
  };
  openElectives: {
    totalCount: number;
    bySemester: Record<number, IOpenElective[]>;
    all: IOpenElective[];
  };
}

export interface ITeacherAssignment {
  _id: string;
  teacher: {
    _id: string;
    name: string;
    collegeEmail: string;
    identifier: string;
    profile?: { designation?: string; specialization?: string };
  };
  subject: {
    _id: string;
    subjectName: string;
    subjectCode: string;
    credits: number;
    icon?: string;
    color?: string;
  };
  semester: {
    _id: string;
    semesterNumber: number;
    academicYear: string;
    regulation: string;
  };
  department: {
    _id: string;
    name: string;
    code: string;
  };
  section: string;
  role?: string;
  isCoordinator: boolean;
  status: string;
}

export interface IStudentEnrollment {
  _id: string;
  student: {
    _id: string;
    name: string;
    collegeEmail: string;
    identifier: string;
  };
  department: {
    _id: string;
    name: string;
    code: string;
  };
  semester: {
    _id: string;
    semesterNumber: number;
    academicYear: string;
    regulation: string;
  };
  academicYear: string;
  enrolledSubjects: Array<{
    _id: string;
    subjectName: string;
    subjectCode: string;
    credits: number;
  }>;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'COMPLETED';
  requestedAt: string;
  approvedAt?: string;
  rejectionReason?: string;
}

export interface IDepartmentStats {
  department?: IDepartment;
  facultyCount: number;
  approvedFaculty: number;
  pendingFaculty: number;
  studentCount: number;
  activeStudentCount: number;
  activeSubjectCount: number;
  totalSubjectCount: number;
  pendingEnrollmentCount: number;
  activeSemesterCount: number;
  programmeCount: number;
  semesterDistribution: Array<{
    semesterNumber: number;
    subjectCount: number;
    studentCount: number;
  }>;
  recentActivity: Array<{
    id: string;
    action: string;
    entityType: string;
    entityId?: string;
    actorName: string;
    actorRole: string;
    description: string;
    timestamp: string;
  }>;
}

export interface IStudentHistory {
  student: {
    _id: string;
    name: string;
    collegeEmail: string;
    identifier: string;
    profile?: { batch?: string; section?: string; designation?: string };
    accountStatus: string;
    approvalStatus: string;
    createdAt: string;
  };
  enrollments: Array<{
    _id: string;
    semester: {
      _id: string;
      semesterNumber: number;
      academicYear: string;
      regulation: string;
    };
    enrolledSubjects: Array<{
      _id: string;
      subjectName: string;
      subjectCode: string;
      credits: number;
    }>;
    status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'COMPLETED';
    requestedAt: string;
    approvedAt?: string;
    rejectionReason?: string;
    approvedBy?: { name: string; role: string };
  }>;
  subjectResults: Array<any>;
  semesterResults: Array<any>;
}

// ═══════════════════════════════════════════════════════════════════════
// MODULE 06: STUDENT ACADEMIC EXPERIENCE TYPES
// ═══════════════════════════════════════════════════════════════════════

export interface IEnrolledSubjectWithFaculty {
  _id: string;
  subjectName: string;
  subjectCode: string;
  credits: number;
  semesterNumber: number;
  status: string;
  faculty: Array<{
    teacherId: string;
    name: string;
    identifier: string;
    designation: string;
    section: string;
  }>;
}

export interface IStudentDashboardOverview {
  /** The student's programme from the central programme master. */
  programme?: {
    programmeId: string;
    id: string;
    name: string;
    shortName: string;
    type: string;
    regulation: string;
    regulationLabel: string;
    academicYear: string | null;
  } | null;
  student: {
    _id: string;
    name: string;
    collegeEmail: string;
    identifier: string;
    department?: { _id: string; name: string; code: string };
    profile?: { currentSemester?: number; batch?: string };
  };
  currentSemester: {
    _id?: string;
    semesterNumber: number;
    academicYear: string;
    regulation: string;
  };
  enrolledSubjects: IEnrolledSubjectWithFaculty[];
  recentNotes: Array<{
    _id: string;
    title: string;
    description?: string;
    contentType: string;
    attachments: Array<{ name: string; url: string; sizeBytes?: number }>;
    chapterOrUnit?: number;
    subject?: { _id: string; subjectName: string; subjectCode: string };
    teacher?: { _id: string; name: string; profile?: { designation?: string } };
    createdAt: string;
  }>;
  upcomingQuizzes: Array<{
    _id: string;
    title: string;
    totalMarks: number;
    durationMinutes: number;
    instructions?: string;
    attemptStatus: string;
    score: number | null;
    isGraded: boolean;
    subject?: { _id: string; subjectName: string; subjectCode: string };
  }>;
  pendingAssignments: Array<{
    _id: string;
    title: string;
    description?: string;
    dueDate?: string;
    maxMarks: number;
    submissionStatus: string;
    submittedAt?: string;
    marksObtained?: number | null;
    feedback?: string | null;
    subject?: { _id: string; subjectName: string; subjectCode: string };
  }>;
  recentResults: {
    subjects: Array<{
      _id: string;
      subject: { _id: string; subjectName: string; subjectCode: string; credits: number };
      internalMarks?: number;
      totalMarks?: number;
      gradePoint?: number;
      letterGrade?: string;
      status?: string;
    }>;
    semesterResult?: {
      gpa?: number;
      cgpa?: number;
      totalCreditsRegistered?: number;
      totalCreditsEarned?: number;
    };
    gpa: number;
    cgpa: number;
  };
  attendanceSummary: {
    totalSessions: number;
    presentSessions: number;
    absentSessions: number;
    attendancePercentage: number;
    bySubject: Array<{
      subjectCode: string;
      subjectName: string;
      present: number;
      total: number;
      percentage: number;
    }>;
  };
  announcements: Array<{
    _id: string;
    title: string;
    description?: string;
    subject?: { _id: string; subjectName: string; subjectCode: string };
    createdAt: string;
  }>;
  academicProgress: {
    creditsEnrolled: number;
    creditsEarned: number;
    gpa: number;
    cgpa: number;
    completedSemesters: number;
  };
}

export interface ISubjectWorkspaceData {
  subject: {
    _id: string;
    subjectName: string;
    subjectCode: string;
    credits: number;
    description?: string;
    semesterNumber: number;
    department?: { _id: string; name: string; code: string };
    semester?: { _id: string; semesterNumber: number; academicYear: string; regulation: string };
  };
  faculty: Array<{
    name: string;
    identifier: string;
    designation: string;
    specialization: string;
    section: string;
    isCoordinator: boolean;
  }>;
  tabs: {
    overview: {
      subjectName: string;
      subjectCode: string;
      credits: number;
      description?: string;
      semesterNumber: number;
      syllabusUnits: IChapter[];
      faculty: Array<{
        name: string;
        identifier: string;
        designation: string;
        section: string;
      }>;
    };
    notes: any[];
    materials: any[];
    videos: any[];
    presentations: any[];
    quizzes: Array<{
      _id: string;
      title: string;
      totalMarks: number;
      durationMinutes: number;
      instructions?: string;
      attemptStatus: string;
      score: number | null;
      grade?: string;
      isGraded: boolean;
    }>;
    assignments: Array<{
      _id: string;
      title: string;
      description?: string;
      dueDate?: string;
      maxMarks: number;
      submissionStatus: string;
      marksObtained?: number | null;
      feedback?: string | null;
    }>;
    announcements: any[];
    aiDoubt: {
      indexedKnowledgeCount: number;
      sampleQuestions: string[];
    };
    simulations: Array<{
      _id: string;
      title: string;
      description?: string;
      simulationConfig?: {
        type: string;
        initialParams?: Record<string, unknown>;
        controls?: string[];
        smartboardPresetId?: string;
      };
      resourceUrls?: string[];
    }>;
    progress: {
      totalUnits: number;
      attendanceRate: number;
      totalSessions: number;
      presentSessions: number;
      quizzesAttempted: number;
      totalQuizzes: number;
      assignmentsCompleted: number;
      totalAssignments: number;
    };
    results: {
      internalMarks: number;
      assignmentScoreAvg: number;
      quizScoreAvg: number;
      endSemExamMarks: number;
      totalMarks: number;
      gradePoint: number;
      letterGrade: string;
      status: string;
    };
  };
}

export interface ISemesterArchiveItem {
  semester: {
    _id: string;
    semesterNumber: number;
    academicYear: string;
    regulation: string;
  };
  enrolledSubjects: Array<{
    _id: string;
    subjectName: string;
    subjectCode: string;
    credits: number;
    description?: string;
  }>;
  notes: any[];
  materials: any[];
  videos: any[];
  presentations: any[];
  simulations: any[];
  quizzes: Array<{
    _id: string;
    title: string;
    totalMarks: number;
    durationMinutes: number;
    score: number | null;
    grade: string;
    passed: boolean;
    subject?: { subjectName: string; subjectCode: string };
  }>;
  assignments: Array<{
    _id: string;
    title: string;
    maxMarks: number;
    marksObtained: number | null;
    feedback: string | null;
    subject?: { subjectName: string; subjectCode: string };
  }>;
  attendance: {
    totalSessions: number;
    presentCount: number;
    percentage: number;
  };
  academicRecords: {
    semesterResult?: any;
    subjectResults: any[];
    gpa: number | null;
    cgpa: number | null;
  };
}

export interface INextAvailableSemesterData {
  nextAvailable: boolean;
  message?: string;
  currentSemesterNumber?: number;
  nextSemester?: {
    _id: string;
    semesterNumber: number;
    academicYear: string;
    regulation: string;
  };
  availableSubjects?: Array<{
    _id: string;
    subjectName: string;
    subjectCode: string;
    credits: number;
    semesterNumber: number;
  }>;
  existingRequest?: {
    _id: string;
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
    requestedAt: string;
    rejectionReason?: string;
    enrolledSubjects?: any[];
  } | null;
  canRequest: boolean;
}

export interface IRagSourceReference {
  documentId: string;
  documentTitle: string;
  chapterOrUnit: string;
  sourceType: string;
}

export interface IAIDoubtResponse {
  subjectId: string;
  subjectCode: string;
  subjectName: string;
  directAnswer?: string;
  explanation?: string;
  answer: string;
  chapterOrUnit?: string;
  confidenceScore: number;
  confidencePercentage?: number;
  isSubjectBounded: boolean;
  citations: string[];
  sourceReferences?: IRagSourceReference[];
  retrievedDocumentIds?: string[];
}

export interface IAIQueryLogEntry {
  _id: string;
  user?: {
    _id: string;
    name: string;
    identifier: string;
    role: string;
    collegeEmail?: string;
  };
  subject: string;
  question: string;
  response: string;
  retrievedDocumentIds: Array<{
    _id: string;
    title: string;
    documentType: string;
    chapter?: string;
    sourceType?: string;
  }>;
  timestamp: string;
  modelUsed?: string;
  confidenceScore?: number;
  latencyMs?: number;
  responseMetadata?: Record<string, any>;
}

// ─── MODULE 07: TEACHER DASHBOARD & WORKSPACE TYPES ───

export interface ITeacherDashboardOverview {
  teacher: {
    _id: string;
    name: string;
    collegeEmail: string;
    identifier: string;
    approvalStatus: string;
    department?: any;
  };
  stats: {
    totalAssignedSubjects: number;
    totalSemesters: number;
    totalEnrolledStudents: number;
    pendingSubmissionsCount: number;
    totalAttendanceSessions: number;
    aggregateAttendancePercentage: number;
  };
  upcomingAssignments: Array<{
    _id: string;
    title: string;
    dueDate: string;
    maxMarks: number;
    subject?: { subjectName: string; subjectCode: string };
  }>;
  upcomingQuizzes: Array<{
    _id: string;
    title: string;
    durationMinutes: number;
    totalMarks: number;
    subject?: { subjectName: string; subjectCode: string };
  }>;
  recentActivity: Array<{
    type: string;
    title: string;
    subject: string;
    timestamp: string;
  }>;
  subjectWiseProgress: Array<{
    subjectId: string;
    subjectName: string;
    subjectCode: string;
    credits: number;
    semesterNumber: number;
    departmentName: string;
    section: string;
    enrolledStudentsCount: number;
    syllabusUnitsCount: number;
    contentCount: number;
    quizzesCount: number;
    assignmentsCount: number;
    attendanceRate: number;
  }>;
}

export interface ITeacherAssignedSubjectsData {
  /** Programme → Semester → Subjects grouping (teachers may teach in several programmes). */
  programmes?: Array<{
    _id: string;
    programmeId: string;
    name: string;
    code: string;
    shortName?: string;
    type?: string;
    semesters: Array<{
      semesterId?: string;
      semesterNumber: number;
      academicYear?: string;
      subjects: Array<{ _id: string; subjectName: string; subjectCode: string; section: string }>;
    }>;
  }>;
  departments: Array<{ _id: string; name: string; code: string; programmeId?: string; shortName?: string; type?: string }>;
  semesters: Array<{
    _id: string;
    semesterNumber: number;
    academicYear: string;
    departmentId?: string;
  }>;
  subjects: Array<{
    _id: string;
    subjectName: string;
    subjectCode: string;
    credits: number;
    category?: string;
    semesterNumber: number;
    semesterId?: string;
    departmentId?: string;
    section: string;
    isCoordinator?: boolean;
    syllabus?: ISyllabusUnit[];
  }>;
}

export interface ITeacherSubjectWorkspaceData {
  subject: {
    _id: string;
    subjectName: string;
    subjectCode: string;
    credits: number;
    description?: string;
    semesterNumber: number;
    department?: { name: string; code: string };
    semester?: { semesterNumber: number; academicYear: string; regulation: string };
    syllabusUnits: IChapter[];
  };
  assignmentMeta?: {
    section: string;
    isCoordinator: boolean;
  } | null;
  enrolledStudentsCount: number;
  tabs: {
    notes: any[];
    materials: any[];
    videos: any[];
    presentations: any[];
    quizzes: any[];
    assignments: Array<{
      _id: string;
      title: string;
      description?: string;
      dueDate: string;
      maxMarks: number;
      passingMarks: number;
      status: string;
      attachments: Array<{ name: string; url: string }>;
      submissionsCount: number;
      gradedSubmissionsCount: number;
    }>;
    submissions: Array<{
      _id: string;
      assignment: any;
      student: { _id: string; name: string; identifier: string; collegeEmail: string };
      submissionFiles: Array<{ name: string; url: string }>;
      notes?: string;
      submittedAt: string;
      status: string;
      isGraded: boolean;
      grade?: {
        marksObtained: number;
        maxMarks: number;
        feedback?: string;
        gradedAt: string;
      } | null;
    }>;
    announcements: any[];
    attendance: Array<{
      _id: string;
      date: string;
      period: number;
      timeSlot?: string;
      topicCovered?: string;
      section: string;
      totalStudents: number;
      presentCount: number;
      absentCount: number;
    }>;
    results: any[];
    simulations: any[];
    aiKnowledge: {
      chunkCount: number;
    };
  };
}

export interface IStudentProgressItem {
  studentId: string;
  name: string;
  rollNumber: string;
  collegeEmail: string;
  quizzesAttempted: number;
  totalQuizScore: number;
  assignmentAverage: number;
  attendancePercentage: number;
  attendedSessions: number;
  totalSessions: number;
  internalMarks: number;
  letterGrade: string;
  status: string;
}

export interface ICreateContentPayload {
  title: string;
  description?: string;
  contentType: 'NOTES' | 'MATERIALS' | 'VIDEOS' | 'PRESENTATIONS' | 'ANNOUNCEMENTS' | 'SIMULATIONS';
  chapterOrUnit?: number;
  attachments?: Array<{ name: string; url: string; sizeBytes?: number; mimeType?: string }>;
  resourceUrls?: string[];
  simulationConfig?: {
    type: string;
    initialParams?: Record<string, unknown>;
    controls?: string[];
    smartboardPresetId?: string;
  };
  tags?: string[];
  status?: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
}

export interface IRubricCriterion {
  id: string;
  title: string;
  description: string;
  maxMarks: number;
  category?: 'correctness' | 'completeness' | 'concepts' | 'formatting' | 'numerical' | 'general';
}

export interface IAutoEvaluationSettings {
  enabled: boolean;
  showCriteriaToStudents: boolean;
  criteria: {
    correctness: boolean;
    completeness: boolean;
    requiredConcepts: boolean;
    keywordCriteria: boolean;
    rubricCriteria: boolean;
    formattingCriteria: boolean;
    numericalCorrectness: boolean;
  };
  requiredKeywords: string[];
  requiredConcepts: string[];
  formattingRequirements?: string;
  numericalAnswer?: number;
  numericalTolerance?: number;
}

export interface IAssignmentAttachment {
  name: string;
  url: string;
  sizeBytes?: number;
  fileType?: string;
}

export interface IReferenceMaterial {
  title: string;
  url: string;
  notes?: string;
}

export interface IAICriterionFeedback {
  criterionId: string;
  title: string;
  score: number;
  maxMarks: number;
  feedback: string;
  status: 'MET' | 'PARTIAL' | 'NOT_MET';
}

export interface IAIEvaluationResult {
  evaluatedAt?: string;
  suggestedScore: number;
  summaryExplanation: string;
  criterionFeedback: IAICriterionFeedback[];
  conceptCheckResults?: Array<{ concept: string; found: boolean; context?: string }>;
  keywordCheckResults?: Array<{ keyword: string; found: boolean }>;
  numericalCheckResult?: { expected: number; submitted: number; isWithinTolerance: boolean };
  reviewStatus: 'PENDING_REVIEW' | 'ACCEPTED' | 'MODIFIED' | 'REJECTED';
}

export interface IAssignmentSubmissionItem {
  _id: string;
  assignment: string | any;
  student: {
    _id: string;
    name: string;
    identifier?: string;
    email?: string;
    avatar?: string;
  };
  submissionText?: string;
  submissionFiles: Array<{ name: string; url: string; sizeBytes?: number; fileType?: string }>;
  notes?: string;
  submittedAt: string;
  isLate: boolean;
  status: 'SUBMITTED' | 'LATE' | 'RESUBMITTED' | 'GRADED';
  isGraded: boolean;
  resubmissionCount?: number;
  aiEvaluation?: IAIEvaluationResult;
  grade?: IAssignmentGradeItem | null;
}

export interface IAssignmentGradeItem {
  _id?: string;
  submission: string;
  assignment: string;
  student: string;
  gradedBy: string | any;
  marksObtained: number;
  maxMarks: number;
  feedback?: string;
  rubricScores?: Record<string, number>;
  criterionFeedback?: Array<{
    criterionId: string;
    title: string;
    score: number;
    maxMarks: number;
    feedback?: string;
  }>;
  lateDeductionApplied: number;
  teacherDecision: 'MANUAL' | 'ACCEPTED_AI' | 'MODIFIED_AI' | 'REJECTED_AI';
  gradedAt: string;
}

export interface IAssignmentItem {
  _id: string;
  title: string;
  description?: string;
  instructions?: string;
  department: string | { _id: string; name: string; code: string };
  semester: string | { _id: string; semesterNumber: number };
  subject: string | { _id: string; subjectName: string; subjectCode: string };
  teacher: string | { _id: string; name: string; email?: string };
  chapterOrUnit?: number;
  chapterTitle?: string;
  dueDate: string;
  lateSubmissionPolicy: 'ALLOW_WITH_PENALTY' | 'ALLOW_NO_PENALTY' | 'REJECT';
  latePenaltyPercent: number;
  lateDeadline?: string;
  maxMarks: number;
  passingMarks: number;
  allowedFileTypes: string[];
  maxFileSizeMB: number;
  allowTextSubmission: boolean;
  allowFileSubmission: boolean;
  allowResubmission: boolean;
  attachments: IAssignmentAttachment[];
  referenceMaterials: IReferenceMaterial[];
  rubricCriteria: IRubricCriterion[];
  autoEvaluationSettings?: IAutoEvaluationSettings;
  manualGradingSetting?: {
    requireTeacherApproval: boolean;
    allowAiPreGrading: boolean;
  };
  status: 'DRAFT' | 'PUBLISHED' | 'CLOSED' | 'ARCHIVED';
  submissionsCount?: number;
  gradedSubmissionsCount?: number;
  pendingSubmissionsCount?: number;
  mySubmission?: IAssignmentSubmissionItem | null;
  myGrade?: IAssignmentGradeItem | null;
  submissionStatus?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ICreateAssignmentPayload {
  title: string;
  subjectId?: string;
  chapterOrUnit?: number;
  chapterTitle?: string;
  description?: string;
  instructions?: string;
  dueDate: string;
  lateSubmissionPolicy?: 'ALLOW_WITH_PENALTY' | 'ALLOW_NO_PENALTY' | 'REJECT';
  latePenaltyPercent?: number;
  lateDeadline?: string;
  maxMarks: number;
  passingMarks?: number;
  allowedFileTypes?: string[];
  maxFileSizeMB?: number;
  allowTextSubmission?: boolean;
  allowFileSubmission?: boolean;
  allowResubmission?: boolean;
  attachments?: IAssignmentAttachment[];
  referenceMaterials?: IReferenceMaterial[];
  rubricCriteria?: IRubricCriterion[];
  autoEvaluationSettings?: IAutoEvaluationSettings;
  status?: 'DRAFT' | 'PUBLISHED' | 'CLOSED' | 'ARCHIVED';
}

export interface IAIGenerateAssignmentPayload {
  subjectId: string;
  chapterOrUnit: number;
  assignmentType?: 'problem_set' | 'lab_report' | 'case_study' | 'programming' | 'essay' | 'numerical';
  difficulty?: 'EASY' | 'MEDIUM' | 'HARD';
  targetMarks?: number;
  customFocus?: string;
  attachedNotes?: Array<{ name: string; url?: string; content?: string }>;
}

export interface ISubmitAssignmentPayload {
  submissionText?: string;
  submissionFiles?: Array<{ name: string; url: string; sizeBytes?: number; fileType?: string }>;
  notes?: string;
}

export interface IGradeSubmissionPayload {
  submissionId: string;
  marksObtained: number;
  maxMarks?: number;
  feedback?: string;
  rubricScores?: Record<string, number>;
  criterionFeedback?: Array<{
    criterionId: string;
    title: string;
    score: number;
    maxMarks: number;
    feedback?: string;
  }>;
  lateDeductionApplied?: number;
  teacherDecision?: 'MANUAL' | 'ACCEPTED_AI' | 'MODIFIED_AI' | 'REJECTED_AI';
}

export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED' | 'OD';

export interface IRecordAttendancePayload {
  subjectId?: string;
  departmentId?: string;
  semesterId?: string;
  date: string;
  period: number;
  timeSlot?: string;
  topicCovered?: string;
  section?: string;
  records: Array<{
    studentId: string;
    status: AttendanceStatus;
    remarks?: string;
  }>;
  allowDuplicateSession?: boolean;
}

export interface IUpdateAttendanceSessionPayload {
  period?: number;
  timeSlot?: string;
  topicCovered?: string;
  section?: string;
  records?: Array<{
    studentId: string;
    status: AttendanceStatus;
    remarks?: string;
  }>;
}

export interface IAttendanceSessionItem {
  _id: string;
  department: { _id: string; name: string; code: string } | string;
  semester: { _id: string; semesterNumber: number; academicYear: string } | string;
  subject: { _id: string; subjectName: string; subjectCode: string } | string;
  teacher: { _id: string; name: string; email?: string } | string;
  date: string;
  period: number;
  timeSlot?: string;
  topicCovered?: string;
  section?: string;
  academicYear: string;
  totalStudents: number;
  presentCount: number;
  absentCount: number;
  lateCount?: number;
  excusedCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface IAttendanceRecordItem {
  _id: string;
  session: string | IAttendanceSessionItem;
  student: {
    _id: string;
    name: string;
    identifier?: string;
    rollNumber?: string;
    collegeEmail?: string;
    department?: string;
  };
  status: AttendanceStatus;
  remarks?: string;
  markedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface IEnrolledStudentForAttendance {
  studentId: string;
  name: string;
  rollNumber: string;
  collegeEmail?: string;
  status: AttendanceStatus;
  remarks: string;
}

export interface IEnrolledStudentsAttendanceResponse {
  subject: {
    _id: string;
    subjectName: string;
    subjectCode: string;
    department?: any;
    semester?: any;
  };
  enrolledStudents: IEnrolledStudentForAttendance[];
  existingSession: IAttendanceSessionItem | null;
  duplicateDetected: boolean;
  duplicateMessage: string | null;
}

export interface IAttendanceHistoryResponse {
  sessions: IAttendanceSessionItem[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  stats: {
    totalSessions: number;
    totalPresent: number;
    totalAbsent: number;
    totalLate: number;
    totalExcused: number;
    totalPossibleStudents: number;
    overallPercentage: number;
  };
}

export interface IStudentAttendanceTracking {
  totalAttendance: {
    totalSessions: number;
    present: number;
    absent: number;
    late: number;
    excused: number;
    percentage: number;
    status: 'ELIGIBLE' | 'SHORTAGE_WARNING';
  };
  subjectAttendance: Array<{
    subjectId: string;
    subjectName: string;
    subjectCode: string;
    credits: number;
    totalSessions: number;
    present: number;
    absent: number;
    late: number;
    excused: number;
    percentage: number;
  }>;
  semesterOverallAttendance: Array<{
    semesterId: string;
    semesterNumber: number;
    academicYear: string;
    totalSessions: number;
    present: number;
    absent: number;
    late: number;
    excused: number;
    percentage: number;
  }>;
  recentLogs: Array<{
    recordId: string;
    date: string;
    period: number;
    timeSlot?: string;
    topicCovered?: string;
    subjectName?: string;
    subjectCode?: string;
    teacherName?: string;
    status: AttendanceStatus;
    remarks?: string;
  }>;
}

export interface ITeacherSubjectResults {
  subject: {
    _id: string;
    subjectName: string;
    subjectCode: string;
    department?: any;
    semester?: any;
  };
  summary: {
    totalEnrolled: number;
    totalQuizzes: number;
    totalAssignments: number;
    totalAttendanceSessions: number;
    classAverageInternal: number;
    classPassRate: number;
  };
  analytics: {
    gradeDistribution: {
      excellent: number;
      good: number;
      average: number;
      atRisk: number;
    };
    attendanceDistribution: {
      above85: number;
      between75and84: number;
      below75: number;
    };
    atRiskStudentsCount: number;
  };
  quizResults: Array<{
    quizId: string;
    title: string;
    totalMarks: number;
    passingMarks: number;
    difficultyLevel: string;
    totalAttempts: number;
    passCount: number;
    failCount: number;
    passRate: number;
    averageScore: number;
    highestScore: number;
    lowestScore: number;
    studentResults: Array<{
      resultId: string;
      studentId: string;
      studentName: string;
      rollNumber: string;
      score: number;
      totalMarks: number;
      percentage: number;
      passed: boolean;
      grade?: string;
      generatedAt: string;
    }>;
  }>;
  assignmentResults: Array<{
    assignmentId: string;
    title: string;
    totalMarks: number;
    deadline?: string;
    status: string;
    totalSubmissions: number;
    gradedCount: number;
    pendingCount: number;
    averageMarks: number;
    studentSubmissions: Array<{
      submissionId: string;
      studentId: string;
      studentName: string;
      rollNumber: string;
      submittedAt: string;
      isLate: boolean;
      status: string;
      isGraded: boolean;
      marksObtained: number | null;
      maxMarks: number;
      feedback: string;
      teacherDecision: string | null;
    }>;
  }>;
  studentRoster: Array<{
    studentId: string;
    name: string;
    rollNumber: string;
    collegeEmail?: string;
    attendance: {
      attended: number;
      total: number;
      percentage: number;
    };
    quizzes: {
      attempted: number;
      totalQuizzes: number;
      averagePercentage: number;
    };
    assignments: {
      graded: number;
      totalAssignments: number;
      averagePercentage: number;
    };
    calculatedInternal: number;
    overallPercentage: number;
    standing: 'EXCELLENT' | 'GOOD' | 'AVERAGE' | 'AT_RISK';
  }>;
}

export interface IStudentResultsAndProgress {
  hasActiveEnrollment: boolean;
  message?: string;
  semesterInfo?: {
    semesterId: string;
    semesterNumber: number;
    academicYear: string;
    department?: any;
  };
  overallSemesterPerformance?: {
    gpa: number;
    cgpa: number;
    totalCreditsRegistered: number;
    totalCreditsEarned: number;
    overallAveragePercentage: number;
    status: string;
  };
  subjectWisePerformance?: Array<{
    subjectId: string;
    subjectCode: string;
    subjectName: string;
    credits: number;
    attendance: {
      totalSessions: number;
      present: number;
      absent: number;
      late: number;
      excused: number;
      percentage: number;
    };
    quizzes: {
      attempted: number;
      totalAvailable: number;
      averagePercentage: number;
      items: Array<{
        quizId: string;
        title: string;
        score: number;
        totalMarks: number;
        percentage: number;
        passed: boolean;
        grade?: string;
        date: string;
      }>;
    };
    assignments: {
      graded: number;
      totalAvailable: number;
      averagePercentage: number;
      items: Array<{
        assignmentId: string;
        title: string;
        marksObtained: number;
        maxMarks: number;
        percentage: number;
        feedback?: string;
        gradedAt?: string;
      }>;
    };
    totalInternalMarks: number;
    maxInternalMarks: number;
    subjectPercentage: number;
    letterGrade: string;
    status: 'PASS' | 'NEEDS_ATTENTION';
  }>;
  assessmentsSummary?: {
    completedCount: number;
    pendingCount: number;
    completionRate: number;
    completed: {
      quizzes: Array<{
        type: string;
        id: string;
        score: number;
        maxMarks: number;
        percentage: number;
        date: string;
      }>;
      assignments: Array<{
        type: string;
        id: string;
        submittedAt: string;
        isGraded: boolean;
        isLate: boolean;
        status: string;
      }>;
    };
    pending: {
      quizzes: Array<{
        type: string;
        id: string;
        title: string;
        subjectCode?: string;
        subjectName?: string;
        totalMarks: number;
        durationMinutes: number;
        deadline: string | null;
      }>;
      assignments: Array<{
        type: string;
        id: string;
        title: string;
        subjectCode?: string;
        subjectName?: string;
        totalMarks: number;
        deadline?: string;
        lateSubmissionPolicy?: string;
      }>;
    };
  };
}

// ═══════════════════════════════════════════════════════════════════════
// MODULE 08: QUIZ ENGINE & ASSESSMENT TYPES
// ═══════════════════════════════════════════════════════════════════════

export type QuestionType =
  | 'MCQ'
  | 'MULTIPLE_CORRECT'
  | 'FILL_IN_THE_BLANK'
  | 'ASSERTION_REASON'
  | 'NUMERICAL'
  | 'MATCH_FOLLOWING'
  | 'CASE_SCENARIO'
  | 'SHORT_ANSWER';

export type DifficultyLevel =
  | 'EASY'
  | 'MEDIUM'
  | 'HARD'
  | 'MIXED'
  | 'Easy'
  | 'Medium'
  | 'Hard'
  | 'Mixed';

export type BloomsTaxonomy =
  | 'REMEMBER'
  | 'UNDERSTAND'
  | 'APPLY'
  | 'ANALYZE'
  | 'EVALUATE'
  | 'CREATE'
  | 'Remember'
  | 'Understand'
  | 'Apply'
  | 'Analyze'
  | 'Evaluate'
  | 'Create';

export type QuizNavigationRule = 'FREE' | 'SEQUENTIAL';

export type ISubjectItem = ISubject;

export interface IOptionItem {
  id: string;
  text: string;
  matchedTo?: string;
}

export interface IQuestionItem {
  _id: string;
  quiz?: string;
  title?: string;
  questionText?: string;
  type?: QuestionType | string;
  questionType?: QuestionType | string;
  description?: string;
  options?: any[];
  assertion?: string;
  reason?: string;
  caseScenario?: string;
  caseScenarioText?: string;
  matchPairs?: Array<{ left: string; right: string }>;
  correctAnswer?: any;
  correctAnswers?: any;
  tolerance?: number;
  numericalTolerance?: number;
  marks: number;
  negativeMarks?: number;
  explanation?: string;
  curriculumUnit?: number;
  chapterOrUnit?: number;
  difficulty?: DifficultyLevel | string;
  bloomsTaxonomy?: BloomsTaxonomy | string;
  orderIndex?: number;
  myAnswer?: any;
  isCorrect?: boolean | null;
  marksAwarded?: number;
  teacherFeedback?: string;
}

export interface IQuestionBankItem {
  _id: string;
  subject: string;
  department: string;
  teacher: { _id: string; name: string; identifier?: string };
  questionText: string;
  questionType: QuestionType;
  options: IOptionItem[];
  assertion?: string;
  reason?: string;
  caseScenarioText?: string;
  correctAnswers: any;
  numericalTolerance?: number;
  marks: number;
  negativeMarks?: number;
  explanation?: string;
  chapterOrUnits: number[];
  difficulty: DifficultyLevel;
  bloomsTaxonomy: BloomsTaxonomy;
  tags: string[];
  createdAt: string;
}

export interface IQuizItem {
  _id: string;
  title: string;
  description?: string;
  subject: { _id: string; subjectName: string; subjectCode: string; credits: number };
  teacher: { _id: string; name: string; collegeEmail: string; identifier?: string };
  curriculumUnits: number[];
  difficultyLevel: DifficultyLevel;
  sourceNotes: Array<{ name: string; url: string }>;
  duration?: number;
  durationMinutes?: number;
  totalMarks: number;
  passingScore?: number;
  passingMarks?: number;
  instructions?: string;
  startTime?: string;
  endTime?: string;
  allowMultipleAttempts?: boolean;
  attemptsAllowed?: number;
  maxAttempts?: number;
  randomizeQuestions: boolean;
  randomizeOptions: boolean;
  negativeMarkingEnabled: boolean;
  negativeMarksPerQuestion: number;
  showResultImmediately: boolean;
  showAnswersAfterSubmission: boolean;
  fullscreenRequired: boolean;
  maxWarnings?: number;
  tabSwitchDetection?: boolean;
  autoSubmitOnMaxViolations?: boolean;
  blockCopyPaste?: boolean;
  navigationRule: QuizNavigationRule;
  status: 'DRAFT' | 'PUBLISHED' | 'CLOSED' | 'ARCHIVED';
  questions?: any[];
  questionsCount?: number;
  questionCount?: number;
  attemptsCount?: number;
  myAttempt?: {
    attemptId: string;
    status: string;
    totalScore: number;
    isGraded: boolean;
    submittedAt?: string;
  } | null;
  createdAt: string;
}

export interface IQuizDetails extends IQuizItem {
  questions: IQuestionItem[];
  totalQuestions: number;
}

export interface IQuizAttemptSession {
  isCompleted?: boolean;
  completedAttempt?: any;
  review?: any;
  message?: string;
  canRetake?: boolean;
  maxAttempts?: number;
  completedAttemptsCount?: number;
  remainingAttempts?: number;
  attempt: {
    _id: string;
    attemptNumber: number;
    startedAt: string;
    durationMinutes?: number;
    fullscreenRequired: boolean;
    navigationRule: QuizNavigationRule;
    answersDraft: Record<string, any>;
    timeSpentSeconds: number;
    fullscreenViolationsCount: number;
    tabSwitchCount?: number;
  };
  quiz: {
    _id: string;
    title: string;
    description?: string;
    instructions?: string;
    duration?: number;
    durationMinutes?: number;
    totalMarks: number;
    passingScore?: number;
    passingMarks?: number;
    negativeMarkingEnabled?: boolean;
    negativeMarksPerQuestion?: number;
    fullscreenRequired: boolean;
    maxWarnings?: number;
    tabSwitchDetection?: boolean;
    autoSubmitOnMaxViolations?: boolean;
    blockCopyPaste?: boolean;
    allowMultipleAttempts?: boolean;
    maxAttempts?: number;
    navigationRule: QuizNavigationRule;
    curriculumUnits: number[];
    totalQuestions?: number;
    showAnswersAfterSubmission?: boolean;
    showResultImmediately?: boolean;
  };
  questions: IQuestionItem[];
  timeRemainingSeconds: number;
}

export interface IQuizAnalyticsData {
  quiz: {
    _id: string;
    title: string;
    totalMarks: number;
    passingMarks?: number;
    passingScore?: number;
    duration?: number;
    durationMinutes?: number;
    negativeMarkingEnabled?: boolean;
    negativeMarksPerQuestion?: number;
    fullscreenRequired?: boolean;
    navigationRule?: string;
    subject?: { _id: string; subjectName: string; subjectCode: string };
  };
  summary: {
    totalAttempts: number;
    completedAttempts: number;
    averageScore: number;
    highestScore: number;
    lowestScore: number;
    passRate: number;
    averageTimeSpentSeconds: number;
  };
  stats?: {
    totalAttempts: number;
    averageScore: number;
    highestScore: number;
    lowestScore: number;
  };
  questionStats: Array<{
    questionId: string;
    title?: string;
    questionText?: string;
    type?: string;
    questionType?: string;
    marks: number;
    difficulty?: string;
    bloomsTaxonomy?: string;
    correctAttempts?: number;
    correctCount?: number;
    totalAttempts?: number;
    totalAnswers?: number;
    successRate: number;
  }>;
  studentScores: Array<{
    _id: string;
    studentId: string;
    studentName: string;
    studentEmail: string;
    studentIdentifier?: string;
    attemptNumber: number;
    score: number | null;
    totalMarks: number;
    percentage: number | null;
    status: string;
    timeSpentSeconds: number;
    fullscreenViolationsCount: number;
    isFullyGraded: boolean;
    submittedAt: string;
  }>;
  attempts?: any[];
}

export interface ICreateQuizPayload {
  title: string;
  description?: string;
  subjectId: string;
  curriculumUnits: number[];
  difficultyLevel: DifficultyLevel;
  sourceNotes?: Array<{ name: string; url: string }>;
  duration?: number;
  durationMinutes?: number;
  totalMarks?: number;
  passingMarks?: number;
  passingScore?: number;
  instructions?: string;
  startTime?: string;
  endTime?: string;
  allowMultipleAttempts?: boolean;
  attemptsAllowed?: number;
  maxAttempts?: number;
  randomizeQuestions?: boolean;
  randomizeOptions?: boolean;
  negativeMarkingEnabled?: boolean;
  negativeMarksPerQuestion?: number;
  showResultImmediately?: boolean;
  showAnswersAfterSubmission?: boolean;
  fullscreenRequired?: boolean;
  maxWarnings?: number;
  tabSwitchDetection?: boolean;
  autoSubmitOnMaxViolations?: boolean;
  blockCopyPaste?: boolean;
  navigationRule?: QuizNavigationRule;
  questions?: any[];
  status?: 'DRAFT' | 'PUBLISHED' | 'CLOSED';
}

export interface ICreateQuestionPayload {
  title?: string;
  questionText?: string;
  type?: QuestionType | string;
  questionType?: QuestionType | string;
  description?: string;
  options?: any[];
  assertion?: string;
  reason?: string;
  caseScenario?: string;
  caseScenarioText?: string;
  matchPairs?: Array<{ left: string; right: string }>;
  correctAnswer?: any;
  correctAnswers?: any;
  tolerance?: number;
  numericalTolerance?: number;
  marks?: number;
  negativeMarks?: number;
  explanation?: string;
  curriculumUnit?: number;
  chapterOrUnit?: number;
  difficulty?: DifficultyLevel | string;
  bloomsTaxonomy?: BloomsTaxonomy | string;
  tags?: string[];
}

export interface ICreateQuestionBankPayload extends ICreateQuestionPayload {
  subjectId: string;
  chapterOrUnits: number[];
  difficulty: DifficultyLevel;
  bloomsTaxonomy: BloomsTaxonomy;
  tags?: string[];
}

export interface ISmartBoardFormula {
  id: string;
  title: string;
  category: string;
  latex: string;
  renderedText: string;
  explanation: string;
  unit: number;
}

export interface ISmartBoardSimulation {
  id: string;
  simKey: string;
  title: string;
  category: string;
  description: string;
  icon?: string;
  subjectId?: string;
}

export interface ISmartBoardSessionPayload {
  sessionId: string;
  token: string;
  boardUrl: string;
  sessionData: {
    sessionId: string;
    userId: string;
    teacherId?: string;
    departmentId?: string;
    semesterId?: string;
    sectionId?: string;
    section?: string;
    userName: string;
    role: string;
    department: {
      id: string;
      code: string;
      name: string;
    };
    semester: {
      number: number;
    };
    subject: {
      id: string;
      code: string;
      name: string;
      credits: number;
      semesterNumber: number;
      departmentId: string;
    };
    syllabusUnits: Array<{
      unitNumber: number;
      title: string;
      description?: string;
      topics: string[];
    }>;
    notes: any[];
    presentations: any[];
    simulations: ISmartBoardSimulation[];
    formulas: ISmartBoardFormula[];
    initialResource?: any;
    allowedOrigins: string[];
    expiresAt: string;
  };
}

export const NotificationType = {
  // Student notifications
  NOTES_PUBLISHED: 'NOTES_PUBLISHED',
  MATERIAL_PUBLISHED: 'MATERIAL_PUBLISHED',
  VIDEO_PUBLISHED: 'VIDEO_PUBLISHED',
  QUIZ_PUBLISHED: 'QUIZ_PUBLISHED',
  ASSIGNMENT_PUBLISHED: 'ASSIGNMENT_PUBLISHED',
  DEADLINE_APPROACHING: 'DEADLINE_APPROACHING',
  RESULT_PUBLISHED: 'RESULT_PUBLISHED',
  ANNOUNCEMENT_POSTED: 'ANNOUNCEMENT_POSTED',
  ENROLLMENT_APPROVED: 'ENROLLMENT_APPROVED',
  ENROLLMENT_REJECTED: 'ENROLLMENT_REJECTED',

  // Teacher notifications
  ASSIGNMENT_SUBMITTED: 'ASSIGNMENT_SUBMITTED',
  QUIZ_COMPLETED: 'QUIZ_COMPLETED',
  ENROLLMENT_REQUESTED: 'ENROLLMENT_REQUESTED',
  DEPARTMENT_ANNOUNCEMENT: 'DEPARTMENT_ANNOUNCEMENT',

  // HOD notifications
  TEACHER_REGISTRATION_REQUESTED: 'TEACHER_REGISTRATION_REQUESTED',
  STUDENT_ENROLLMENT_REQUESTED: 'STUDENT_ENROLLMENT_REQUESTED',
  DEPARTMENT_EVENT: 'DEPARTMENT_EVENT',
} as const;

export type NotificationType = (typeof NotificationType)[keyof typeof NotificationType];

export interface INotification {
  _id: string;
  recipient: string;
  sender?: {
    _id: string;
    name: string;
    identifier?: string;
    role?: string;
    profile?: {
      designation?: string;
    };
  } | null;
  type: NotificationType;
  title: string;
  message: string;
  metadata?: Record<string, any>;
  link?: string;
  actionUrl?: string;
  isRead: boolean;
  readAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface IAuditLogItem {
  _id: string;
  user?: {
    _id: string;
    name: string;
    collegeEmail: string;
    identifier: string;
    role: string;
  } | null;
  action: string;
  entityType: string;
  entityId?: string;
  department?: {
    _id: string;
    name: string;
    code: string;
  } | null;
  ipAddress?: string;
  userAgent?: string;
  details?: Record<string, any>;
  timestamp: string;
}

export interface IInstitutionOverview {
  kpis: {
    departments: { total: number; active: number };
    faculty: { total: number; approved: number; pending: number; suspended: number };
    students: { total: number; activeEnrollments: number; pendingEnrollments: number };
    academics: {
      subjects: number;
      activeSubjects: number;
      programmes: number;
      activeSemesters: number;
      quizzes: number;
      quizAttempts: number;
      assignments: number;
      submissions: number;
      attendanceSessions: number;
    };
    content: {
      total: number;
      notes: number;
      materials: number;
      videos: number;
      announcements: number;
      simulations: number;
    };
    auditLogsTotal: number;
  };
  departments: Array<{
    _id: string;
    name: string;
    code: string;
    programmeType: string;
    description?: string;
    status: 'ACTIVE' | 'INACTIVE';
    hod?: {
      _id: string;
      name: string;
      collegeEmail: string;
      identifier: string;
    } | null;
    facultyCount: number;
    studentCount: number;
    subjectCount: number;
    programmeCount: number;
  }>;
  recentAuditLogs: IAuditLogItem[];
  systemHealth: {
    dbStatus: string;
    nodeVersion: string;
    uptimeSeconds: number;
    heapUsedMB: number;
    heapTotalMB: number;
  };
}

export interface IFacultyDirectoryResponse {
  faculty: Array<{
    _id: string;
    name: string;
    collegeEmail: string;
    identifier: string;
    role: string;
    department?: {
      _id: string;
      name: string;
      code: string;
    };
    profile?: {
      designation?: string;
      specialization?: string;
    };
    accountStatus: string;
    approvalStatus: string;
    assignmentsCount: number;
    createdAt: string;
    lastLoginAt?: string;
  }>;
  total: number;
  page: number;
  totalPages: number;
}

export interface IStudentDirectoryResponse {
  students: Array<{
    _id: string;
    name: string;
    collegeEmail: string;
    identifier: string;
    role: string;
    department?: {
      _id: string;
      name: string;
      code: string;
    };
    profile?: {
      batch?: string;
      designation?: string;
    };
    accountStatus: string;
    approvalStatus: string;
    activeEnrollment?: {
      semesterNumber?: number;
      academicYear?: string;
      enrolledSubjectsCount: number;
    } | null;
    createdAt: string;
    lastLoginAt?: string;
  }>;
  total: number;
  page: number;
  totalPages: number;
}

export interface IAcademicActivityData {
  recentContent: any[];
  recentQuizzes: any[];
  recentAssignments: any[];
  recentSubmissions: any[];
  recentAttendance: any[];
  departmentScorecard: Array<{
    departmentId: string;
    name: string;
    code: string;
    contentCount: number;
    quizCount: number;
    assignmentCount: number;
    sessionCount: number;
    totalActivityIndex: number;
  }>;
}

export interface IAuditLogsResponse {
  logs: IAuditLogItem[];
  total: number;
  page: number;
  totalPages: number;
}

export interface ITeacherTopic {
  _id?: string;
  topicId: string;
  title: string;
  order: number;
  explanation?: string;
  examples?: string[];
  formulas?: string[];
  diagrams?: string[];
  teacherNotes?: string;
  subtopics?: string[];
  attachments?: Array<{
    name: string;
    url: string;
    sizeBytes?: number;
    mimeType?: string;
  }>;
  links?: Array<{
    title: string;
    url: string;
  }>;
}

export interface ITeacherUnitContent {
  _id?: string;
  chapterTitle?: string;
  teachingNotes?: string;
  learningObjectives?: string[];
  importantPoints?: string[];
  practicalExamples?: string[];
  referenceMaterials?: string[];
  topics: ITeacherTopic[];
  updatedAt?: string;
}

export interface ITeacherCurriculumUnit {
  unitNumber: number;
  unitCode: string;
  officialTitle: string;
  officialDescription: string;
  officialSyllabusText: string;
  officialTopics: string[];
  officialHours: number;
  curriculumUnitId: string | null;
  teacherContent: ITeacherUnitContent | null;
}

export interface ITeacherCurriculumResponse {
  subject: {
    _id: string;
    subjectName: string;
    subjectCode: string;
    credits: number;
    semesterNumber: number;
  };
  units: ITeacherCurriculumUnit[];
}

export interface IAIKnowledgeStats {
  documents: number;
  processed: number;
  processing: number;
  failed: number;
  knowledgeChunks: number;
  lastUpdated: string;
  sources: Array<{
    _id: string;
    title: string;
    documentType: string;
    chapter?: string;
    chunkCount: number;
    status: 'PENDING' | 'PROCESSING' | 'INDEXED' | 'FAILED';
    updatedAt: string;
    sourceUrl?: string;
  }>;
}
