/** Central query-key factory so cache invalidation stays consistent. */
export const queryKeys = {
  system: {
    all: ['system'] as const,
    liveness: () => [...queryKeys.system.all, 'liveness'] as const,
    readiness: () => [...queryKeys.system.all, 'readiness'] as const,
  },
  /** Central programme master (database is the single source of truth). */
  programmes: {
    all: ['programmes'] as const,
    active: () => [...queryKeys.programmes.all, 'active'] as const,
    manage: () => [...queryKeys.programmes.all, 'manage'] as const,
    detail: (programmeId: string) => [...queryKeys.programmes.all, 'detail', programmeId] as const,
    registration: (programmeId: string) => [...queryKeys.programmes.all, 'registration', programmeId] as const,
  },
};
