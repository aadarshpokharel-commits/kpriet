import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';
import { queryKeys } from '@/lib/queryKeys';
import { ProgrammeService } from '@/services/programme.service';
import type { IProgrammeMaster } from '@/types/programme.types';

/**
 * Global academic programme state.
 *
 * Every screen that needs the programme list (registration, dashboards,
 * admin, filters, Smart Board launch) reads it through this hook. The data
 * comes from GET /programmes and is cached once for the whole app by
 * TanStack Query — there is no programme list hardcoded in the frontend.
 */
export function useProgrammes() {
  const query = useQuery({
    queryKey: queryKeys.programmes.active(),
    queryFn: () => ProgrammeService.list(),
    staleTime: 10 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  });

  const programmes = query.data ?? [];

  const byKey = useMemo(() => {
    const map = new Map<string, IProgrammeMaster>();
    for (const p of programmes) {
      map.set(p.programmeId.toUpperCase(), p);
      map.set(p.id, p);
    }
    return map;
  }, [programmes]);

  /** Resolve a programme by code ("IT"), ObjectId, or a populated department object. */
  const findProgramme = useCallback(
    (ref: unknown): IProgrammeMaster | undefined => {
      if (!ref) return undefined;
      if (typeof ref === 'string') return byKey.get(ref) ?? byKey.get(ref.toUpperCase());
      if (typeof ref === 'object') {
        const r = ref as { _id?: string; id?: string; code?: string; programmeId?: string };
        return (
          (r.programmeId && byKey.get(r.programmeId.toUpperCase())) ||
          (r.code && byKey.get(r.code.toUpperCase())) ||
          (r._id && byKey.get(String(r._id))) ||
          (r.id && byKey.get(String(r.id))) ||
          undefined
        );
      }
      return undefined;
    },
    [byKey]
  );

  return {
    programmes,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    findProgramme,
  };
}

/** Programme-specific registration options (academic years / semesters in the curriculum). */
export function useProgrammeRegistrationOptions(programmeId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.programmes.registration(programmeId || 'none'),
    queryFn: () => ProgrammeService.registrationOptions(programmeId!),
    enabled: Boolean(programmeId),
    staleTime: 5 * 60 * 1000,
  });
}

/** Invalidate every cached programme query (after admin changes). */
export function useInvalidateProgrammes() {
  const client = useQueryClient();
  return useCallback(() => client.invalidateQueries({ queryKey: queryKeys.programmes.all }), [client]);
}

/** Human label for a populated department/programme reference, resolved against the master. */
export function useProgrammeLabel(ref: unknown): string {
  const { findProgramme } = useProgrammes();
  const p = findProgramme(ref);
  if (p) return p.name;
  if (ref && typeof ref === 'object' && 'name' in (ref as any)) return String((ref as any).name);
  return '';
}
