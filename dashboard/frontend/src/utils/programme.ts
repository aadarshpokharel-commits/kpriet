/**
 * Helpers for programme references on the client.
 * A user's / record's `department` may arrive as an ObjectId string or as a
 * populated `{ _id, name, code }` object depending on the endpoint.
 */
export function getProgrammeObjectId(ref: unknown): string | undefined {
  if (!ref) return undefined;
  if (typeof ref === 'string') return ref;
  if (typeof ref === 'object') {
    const r = ref as { _id?: unknown; id?: unknown };
    if (r._id) return String(r._id);
    if (r.id) return String(r.id);
  }
  return undefined;
}

/** Stable programme code (e.g. "IT") from a populated reference, when available. */
export function getProgrammeCode(ref: unknown): string | undefined {
  if (ref && typeof ref === 'object') {
    const r = ref as { programmeId?: string; code?: string };
    return r.programmeId || r.code || undefined;
  }
  return undefined;
}
