/**
 * Programme master types — mirror of the backend /programmes API.
 * The programme list itself always comes from the API (database is the
 * single source of truth); never hardcode programme names in components.
 */
export interface IProgrammeMaster {
  /** Stable programme identifier used everywhere (e.g. "IT"). */
  programmeId: string;
  /** ObjectId of the programme record (what academic records reference as `department`). */
  id: string;
  _id: string;
  code: string;
  name: string;
  shortName: string;
  type: string;
  officialWebsite: string | null;
  icon: string | null;
  description: string | null;
  displayOrder: number;
  isActive: boolean;
  regulation: string;
  hod: { id: string; name: string; collegeEmail?: string } | null;
}

export interface IProgrammeStats {
  teachers: number;
  approvedTeachers: number;
  pendingTeacherApprovals: number;
  students: number;
  subjects: number;
  activeSemesters: number;
  semesters: number;
  pendingEnrollments: number;
  curriculumUnits: number;
  teacherAssignments: number;
  knowledgeDocuments: number;
  academicYears: string[];
}

export interface IProgrammeWithStats extends IProgrammeMaster {
  archivedAt: string | null;
  stats: IProgrammeStats;
}

export interface IProgrammeRegistrationOptions {
  programme: IProgrammeMaster;
  academicYears: string[];
  regulations: string[];
  semesters: Array<{ semesterId: string; semesterNumber: number; academicYear: string; regulation: string }>;
  semesterNumbers: number[];
  hasCurriculum: boolean;
}

export interface IProgrammeCurriculum {
  institution: string;
  programme: IProgrammeMaster;
  regulations: Array<{
    regulation: string;
    academicYears: Array<{
      academicYear: string;
      semesters: Array<{
        semesterId: string;
        semesterNumber: number;
        status: string;
        subjects: Array<{
          subjectId: string;
          subjectCode: string;
          subjectName: string;
          credits: number;
          units: Array<{ unitId: string | null; unitNumber: number; title: string; topics: Array<{ title: string }> }>;
        }>;
      }>;
    }>;
  }>;
}
