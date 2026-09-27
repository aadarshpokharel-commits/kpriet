import { useEffect, useState, useCallback } from 'react';
import { AcademicService } from '@/services/academic.service';
import type {
  IDepartmentStats,
  ISemester,
  ISubject,
  ITeacherAssignment,
  IStudentEnrollment,
} from '@/types/academic.types';

export function useDepartmentStats(departmentId?: string) {
  const [stats, setStats] = useState<IDepartmentStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await AcademicService.getDepartmentStats(departmentId);
      setStats(data);
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch department statistics');
    } finally {
      setLoading(false);
    }
  }, [departmentId]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return { stats, loading, error, refetch: fetchStats };
}

export function useSemesters(departmentId?: string) {
  const [semesters, setSemesters] = useState<ISemester[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSemesters = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await AcademicService.getSemesters({ departmentId });
      setSemesters(data);
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch semesters');
    } finally {
      setLoading(false);
    }
  }, [departmentId]);

  useEffect(() => {
    fetchSemesters();
  }, [fetchSemesters]);

  return { semesters, loading, error, refetch: fetchSemesters };
}

export function useSubjects(filters?: { departmentId?: string; semesterId?: string; semesterNumber?: number }) {
  const [subjects, setSubjects] = useState<ISubject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSubjects = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await AcademicService.getSubjects(filters);
      setSubjects(data);
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch subjects');
    } finally {
      setLoading(false);
    }
  }, [filters?.departmentId, filters?.semesterId, filters?.semesterNumber]);

  useEffect(() => {
    fetchSubjects();
  }, [fetchSubjects]);

  return { subjects, loading, error, refetch: fetchSubjects };
}

export function useTeacherAssignments(filters?: { teacherId?: string; departmentId?: string; semesterId?: string }) {
  const [assignments, setAssignments] = useState<ITeacherAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAssignments = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await AcademicService.getTeacherAssignments(filters);
      setAssignments(data);
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch teacher assignments');
    } finally {
      setLoading(false);
    }
  }, [filters?.teacherId, filters?.departmentId, filters?.semesterId]);

  useEffect(() => {
    fetchAssignments();
  }, [fetchAssignments]);

  return { assignments, loading, error, refetch: fetchAssignments };
}

export function useStudentEnrollments(filters?: { departmentId?: string; status?: string; studentId?: string }) {
  const [enrollments, setEnrollments] = useState<IStudentEnrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEnrollments = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await AcademicService.getEnrollments(filters);
      setEnrollments(data);
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch enrollment requests');
    } finally {
      setLoading(false);
    }
  }, [filters?.departmentId, filters?.status, filters?.studentId]);

  useEffect(() => {
    fetchEnrollments();
  }, [fetchEnrollments]);

  return { enrollments, loading, error, refetch: fetchEnrollments };
}

export function useDepartmentFaculty(departmentId?: string) {
  const [faculty, setFaculty] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFaculty = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await AcademicService.getDepartmentFaculty(departmentId);
      setFaculty(data);
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch faculty list');
    } finally {
      setLoading(false);
    }
  }, [departmentId]);

  useEffect(() => {
    fetchFaculty();
  }, [fetchFaculty]);

  return { faculty, loading, error, refetch: fetchFaculty };
}

export function useDepartmentStudents(departmentId?: string, semesterNumber?: number) {
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStudents = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await AcademicService.getDepartmentStudents(departmentId, semesterNumber);
      setStudents(data);
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch students list');
    } finally {
      setLoading(false);
    }
  }, [departmentId, semesterNumber]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  return { students, loading, error, refetch: fetchStudents };
}
