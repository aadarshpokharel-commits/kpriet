export type UserRole = 'STUDENT' | 'TEACHER' | 'HOD' | 'ADMIN' | 'PRINCIPAL';

export interface IUserProfile {
  avatar?: string;
  phone?: string;
  bio?: string;
  designation?: string;
  batch?: string;
  section?: string;
  specialization?: string;
}

export interface IDepartmentSummary {
  _id: string;
  name: string;
  /** Stable programme identifier (e.g. "IT"). */
  code: string;
  shortName?: string;
  /** Degree label, e.g. "B.E." */
  type?: string;
  programmeType?: string;
}

export interface IAuthUser {
  _id: string;
  id?: string;
  name: string;
  collegeEmail: string;
  role: UserRole;
  department?: string | IDepartmentSummary | null;
  identifier: string;
  profile?: IUserProfile;
  accountStatus: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'PENDING';
  approvalStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
  approvedAt?: string;
  lastLoginAt?: string;
}

export interface AuthSuccessData {
  user: IAuthUser;
  accessToken?: string;
}

export interface StudentRegisterInput {
  name: string;
  collegeEmail: string;
  password: string;
  /** Stable programme id from the programme master (e.g. "IT"). */
  programmeId: string;
  /** @deprecated legacy ObjectId form — prefer programmeId. */
  departmentId?: string;
  studentIdentifier: string;
  currentSemesterNumber?: number;
  academicYear?: string;
}

export interface TeacherRegisterInput {
  name: string;
  collegeEmail: string;
  password: string;
  /** Stable programme id from the programme master (e.g. "IT"). */
  programmeId: string;
  /** @deprecated legacy ObjectId form — prefer programmeId. */
  departmentId?: string;
  employeeIdentifier: string;
  designation?: string;
}

export interface LoginInput {
  collegeEmail: string;
  password: string;
}
