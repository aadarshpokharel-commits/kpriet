import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { systemService } from '@/services/system.service';

const REFRESH_MS = 30_000;

export function useLiveness() {
  return useQuery({
    queryKey: queryKeys.system.liveness(),
    queryFn: systemService.getLiveness,
    refetchInterval: REFRESH_MS,
    retry: false,
  });
}

export function useReadiness() {
  return useQuery({
    queryKey: queryKeys.system.readiness(),
    queryFn: systemService.getReadiness,
    refetchInterval: REFRESH_MS,
    retry: false,
  });
}
