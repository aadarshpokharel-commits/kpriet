import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  BookOpen,
  ExternalLink,
  GraduationCap,
  Layers,
  Loader2,
  Power,
  Search,
  Users,
  UserCheck,
  X,
} from 'lucide-react';
import { queryKeys } from '@/lib/queryKeys';
import { ProgrammeService } from '@/services/programme.service';
import { useInvalidateProgrammes } from '@/hooks/useProgrammes';
import type { IProgrammeWithStats } from '@/types/programme.types';
import { cn } from '@/utils/cn';

type DetailTab = 'overview' | 'teachers' | 'students' | 'semesters' | 'subjects' | 'curriculum';

const DETAIL_TABS: Array<{ id: DetailTab; label: string }> = [
  { id: 'overview', label: 'Overview' },
  { id: 'teachers', label: 'Teachers' },
  { id: 'students', label: 'Students' },
  { id: 'semesters', label: 'Semesters' },
  { id: 'subjects', label: 'Subjects' },
  { id: 'curriculum', label: 'Curriculum' },
];

/**
 * Admin → Programme Management.
 * Lists every programme in the central programme master with its HOD and live
 * academic statistics. Programmes are never deleted: deactivating one hides it
 * from registration and pickers while every academic record is retained.
 */
export function ProgrammeManagementPanel() {
  const invalidateProgrammes = useInvalidateProgrammes();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [selected, setSelected] = useState<IProgrammeWithStats | null>(null);
  const [confirm, setConfirm] = useState<IProgrammeWithStats | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: queryKeys.programmes.manage(),
    queryFn: () => ProgrammeService.listForAdmin(),
  });

  const toggle = useMutation({
    mutationFn: (p: IProgrammeWithStats) => ProgrammeService.setActive(p.programmeId, !p.isActive),
    onSuccess: async (updated) => {
      setFeedback({
        type: 'success',
        message: updated.isActive
          ? `${updated.name} is active again.`
          : `${updated.name} was deactivated. All of its academic records are retained.`,
      });
      setConfirm(null);
      await invalidateProgrammes();
      await refetch();
    },
    onError: (err: any) => {
      setFeedback({ type: 'error', message: err?.message || 'Could not update the programme status.' });
      setConfirm(null);
    },
  });

  const programmes = data ?? [];
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return programmes.filter((p) => {
      const matchQuery =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.programmeId.toLowerCase().includes(q) ||
        p.shortName.toLowerCase().includes(q);
      const matchStatus =
        statusFilter === 'ALL' || (statusFilter === 'ACTIVE' ? p.isActive : !p.isActive);
      return matchQuery && matchStatus;
    });
  }, [programmes, search, statusFilter]);

  const totals = useMemo(
    () =>
      programmes.reduce(
        (acc, p) => ({
          active: acc.active + (p.isActive ? 1 : 0),
          teachers: acc.teachers + p.stats.teachers,
          students: acc.students + p.stats.students,
          subjects: acc.subjects + p.stats.subjects,
        }),
        { active: 0, teachers: 0, students: 0, subjects: 0 }
      ),
    [programmes]
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-lg font-bold text-foreground">Programme Management</h2>
          <p className="mt-1 max-w-2xl text-xs text-muted-foreground">
            The official B.E. programme master. Every registration form, dashboard, curriculum, quiz,
            assignment, RAG query and Smart Board session uses these records. Names and codes are managed
            centrally; programmes with academic records are archived (deactivated), never deleted.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search programme or code…"
              aria-label="Search programmes"
              className="w-full rounded-xl border border-border bg-input py-2 pl-9 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 sm:w-72"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            aria-label="Filter by status"
            className="rounded-xl border border-border bg-input px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
          >
            <option value="ALL">All status</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { label: 'Programmes', value: `${totals.active} / ${programmes.length}`, hint: 'active / total', icon: GraduationCap },
          { label: 'Teachers', value: totals.teachers, hint: 'across programmes', icon: UserCheck },
          { label: 'Students', value: totals.students, hint: 'across programmes', icon: Users },
          { label: 'Active subjects', value: totals.subjects, hint: 'across programmes', icon: BookOpen },
        ].map((k) => (
          <div key={k.label} className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              <k.icon className="h-3.5 w-3.5" aria-hidden /> {k.label}
            </div>
            <p className="mt-1 text-2xl font-bold text-foreground">{isLoading ? '—' : k.value}</p>
            <p className="text-[11px] text-muted-foreground">{k.hint}</p>
          </div>
        ))}
      </div>

      {feedback && (
        <div
          role="status"
          className={cn(
            'flex items-start justify-between gap-3 rounded-xl border px-4 py-3 text-xs',
            feedback.type === 'success'
              ? 'border-success-border bg-success-soft text-success-text'
              : 'border-error-border bg-error-soft text-error-text'
          )}
        >
          <span>{feedback.message}</span>
          <button type="button" onClick={() => setFeedback(null)} aria-label="Dismiss">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* List */}
      {isLoading ? (
        <div className="flex items-center justify-center gap-2 rounded-2xl border border-border bg-card p-10 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading programme master…
        </div>
      ) : isError ? (
        <div className="rounded-2xl border border-error-border bg-error-soft p-6 text-sm text-error-text">
          Could not load programmes.{' '}
          <button type="button" className="font-semibold underline" onClick={() => refetch()}>
            Retry
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {filtered.map((p) => (
            <article
              key={p.programmeId}
              className={cn(
                'flex flex-col gap-4 rounded-2xl border bg-card p-5 transition-colors',
                p.isActive ? 'border-border' : 'border-dashed border-border opacity-80'
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xl" aria-hidden>
                      {p.icon || '🎓'}
                    </span>
                    <span className="rounded-md border border-border bg-muted px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-muted-foreground">
                      {p.programmeId}
                    </span>
                    <span className="text-[11px] font-semibold text-muted-foreground">{p.type}</span>
                    <span
                      className={cn(
                        'rounded-full px-2 py-0.5 text-[10px] font-bold',
                        p.isActive ? 'bg-success-soft text-success-text' : 'bg-warning-soft text-warning-text'
                      )}
                    >
                      {p.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <h3 className="mt-2 whitespace-normal break-words text-sm font-bold leading-snug text-foreground">
                    {p.name}
                  </h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    HOD: {p.hod ? `${p.hod.name}${p.hod.collegeEmail ? ` · ${p.hod.collegeEmail}` : ''}` : 'Not assigned'}
                  </p>
                </div>
              </div>

              <dl className="grid grid-cols-3 gap-2 text-center">
                {[
                  ['Teachers', p.stats.teachers],
                  ['Students', p.stats.students],
                  ['Subjects', p.stats.subjects],
                  ['Semesters', p.stats.activeSemesters],
                  ['Pending faculty', p.stats.pendingTeacherApprovals],
                  ['Pending enrolments', p.stats.pendingEnrollments],
                ].map(([label, value]) => (
                  <div key={label as string} className="rounded-xl bg-surface px-2 py-2">
                    <dt className="break-words text-[10px] font-semibold uppercase leading-tight tracking-wide text-muted-foreground">
                      {label}
                    </dt>
                    <dd className="text-sm font-bold text-foreground">{value as number}</dd>
                  </div>
                ))}
              </dl>

              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSelected(p)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-surface"
                  >
                    <Layers className="h-3.5 w-3.5" /> View programme
                  </button>
                  {p.officialWebsite && (
                    <a
                      href={p.officialWebsite}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                    >
                      Website <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setConfirm(p)}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold',
                    p.isActive
                      ? 'border border-warning-border text-warning-text hover:bg-warning-soft'
                      : 'bg-primary text-primary-foreground hover:bg-primary-hover'
                  )}
                >
                  <Power className="h-3.5 w-3.5" /> {p.isActive ? 'Deactivate' : 'Activate'}
                </button>
              </div>
            </article>
          ))}
          {filtered.length === 0 && (
            <p className="col-span-full rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
              No programme matches your filters.
            </p>
          )}
        </div>
      )}

      {/* Activate / deactivate confirmation */}
      {confirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl">
            <h3 className="text-base font-bold text-foreground">
              {confirm.isActive ? 'Deactivate programme?' : 'Activate programme?'}
            </h3>
            <p className="mt-2 whitespace-normal break-words text-sm font-semibold text-foreground">{confirm.name}</p>
            <p className="mt-2 text-xs text-muted-foreground">
              {confirm.isActive
                ? `It will no longer appear in registration or programme pickers. Its ${confirm.stats.students} students, ${confirm.stats.teachers} teachers, ${confirm.stats.subjects} subjects, curriculum and AI knowledge are kept unchanged and it can be re-activated at any time.`
                : 'It will appear again in registration and programme pickers.'}
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirm(null)}
                className="rounded-lg border border-border px-4 py-2 text-xs font-semibold text-foreground hover:bg-surface"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={toggle.isPending}
                onClick={() => toggle.mutate(confirm)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary-hover disabled:opacity-60"
              >
                {toggle.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {confirm.isActive ? 'Deactivate' : 'Activate'}
              </button>
            </div>
          </div>
        </div>
      )}

      {selected && <ProgrammeDetailDrawer programme={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

function ProgrammeDetailDrawer({ programme, onClose }: { programme: IProgrammeWithStats; onClose: () => void }) {
  const [tab, setTab] = useState<DetailTab>('overview');
  const id = programme.programmeId;

  const teachers = useQuery({
    queryKey: [...queryKeys.programmes.detail(id), 'teachers'],
    queryFn: () => ProgrammeService.teachers(id),
    enabled: tab === 'teachers',
  });
  const students = useQuery({
    queryKey: [...queryKeys.programmes.detail(id), 'students'],
    queryFn: () => ProgrammeService.students(id),
    enabled: tab === 'students',
  });
  const semesters = useQuery({
    queryKey: [...queryKeys.programmes.detail(id), 'semesters'],
    queryFn: () => ProgrammeService.semesters(id),
    enabled: tab === 'semesters',
  });
  const subjects = useQuery({
    queryKey: [...queryKeys.programmes.detail(id), 'subjects'],
    queryFn: () => ProgrammeService.subjects(id),
    enabled: tab === 'subjects',
  });
  const curriculum = useQuery({
    queryKey: [...queryKeys.programmes.detail(id), 'curriculum'],
    queryFn: () => ProgrammeService.curriculum(id),
    enabled: tab === 'curriculum',
  });

  const active = { teachers, students, semesters, subjects, curriculum }[tab as Exclude<DetailTab, 'overview'>];

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50" role="dialog" aria-modal="true" onClick={onClose}>
      <div
        className="flex h-full w-full max-w-3xl flex-col border-l border-border bg-background shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-border p-5">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {programme.type} · {programme.programmeId} · {programme.regulation}
            </p>
            <h3 className="mt-1 whitespace-normal break-words text-lg font-bold text-foreground">{programme.name}</h3>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-lg p-1.5 hover:bg-surface">
            <X className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>

        <div className="flex gap-1 overflow-x-auto border-b border-border px-3" role="tablist">
          {DETAIL_TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                'whitespace-nowrap border-b-2 px-3 py-2.5 text-xs font-semibold',
                tab === t.id ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-5 text-sm">
          {tab === 'overview' ? (
            <div className="space-y-4">
              {programme.description && <p className="text-muted-foreground">{programme.description}</p>}
              <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {Object.entries({
                  'HOD': programme.hod?.name ?? 'Not assigned',
                  'Teachers': programme.stats.teachers,
                  'Approved teachers': programme.stats.approvedTeachers,
                  'Pending approvals': programme.stats.pendingTeacherApprovals,
                  'Students': programme.stats.students,
                  'Pending enrollments': programme.stats.pendingEnrollments,
                  'Active semesters': programme.stats.activeSemesters,
                  'Subjects': programme.stats.subjects,
                  'Curriculum units': programme.stats.curriculumUnits,
                  'Teacher assignments': programme.stats.teacherAssignments,
                  'AI knowledge documents': programme.stats.knowledgeDocuments,
                  'Academic years': programme.stats.academicYears.join(', ') || '—',
                }).map(([k, v]) => (
                  <div key={k} className="rounded-xl border border-border bg-card p-3">
                    <dt className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{k}</dt>
                    <dd className="mt-0.5 break-words font-bold text-foreground">{String(v)}</dd>
                  </div>
                ))}
              </dl>
            </div>
          ) : active?.isLoading ? (
            <p className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </p>
          ) : active?.isError ? (
            <p className="text-error-text">Could not load this section.</p>
          ) : tab === 'teachers' ? (
            <SimpleTable
              rows={teachers.data ?? []}
              columns={[
                ['Name', (t: any) => t.name],
                ['Email', (t: any) => t.collegeEmail],
                ['Home programme', (t: any) => t.homeProgrammeId ?? '—'],
                ['Status', (t: any) => t.approvalStatus],
                ['Subjects here', (t: any) => (t.assignments || []).length],
              ]}
            />
          ) : tab === 'students' ? (
            <SimpleTable
              rows={students.data ?? []}
              columns={[
                ['Register no.', (s: any) => s.identifier],
                ['Name', (s: any) => s.name],
                ['Semester', (s: any) => s.currentSemester?.semesterNumber ?? '—'],
                ['Academic year', (s: any) => s.academicYear ?? '—'],
                ['Enrollment', (s: any) => s.enrollmentStatus ?? '—'],
              ]}
            />
          ) : tab === 'semesters' ? (
            <SimpleTable
              rows={semesters.data ?? []}
              columns={[
                ['Semester', (s: any) => `Semester ${s.semesterNumber}`],
                ['Academic year', (s: any) => s.academicYear],
                ['Regulation', (s: any) => s.regulation],
                ['Status', (s: any) => s.status],
              ]}
            />
          ) : tab === 'subjects' ? (
            <SimpleTable
              rows={subjects.data ?? []}
              columns={[
                ['Code', (s: any) => s.subjectCode],
                ['Subject', (s: any) => s.subjectName],
                ['Semester', (s: any) => s.semesterNumber],
                ['Credits', (s: any) => s.credits],
              ]}
            />
          ) : (
            <div className="space-y-4">
              {(curriculum.data?.regulations ?? []).length === 0 && (
                <p className="text-muted-foreground">No curriculum has been published for this programme yet.</p>
              )}
              {curriculum.data?.regulations.map((r) =>
                r.academicYears.map((y) => (
                  <section key={`${r.regulation}-${y.academicYear}`} className="space-y-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      {r.regulation} · {y.academicYear}
                    </h4>
                    {y.semesters.map((sem) => (
                      <details key={sem.semesterId} className="rounded-xl border border-border bg-card p-3">
                        <summary className="cursor-pointer text-sm font-semibold text-foreground">
                          Semester {sem.semesterNumber} · {sem.subjects.length} subjects
                        </summary>
                        <ul className="mt-2 space-y-2">
                          {sem.subjects.map((sub) => (
                            <li key={sub.subjectId} className="text-xs">
                              <span className="font-semibold text-foreground">
                                {sub.subjectCode} — {sub.subjectName}
                              </span>
                              <span className="ml-1 text-muted-foreground">({sub.units.length} units)</span>
                            </li>
                          ))}
                        </ul>
                      </details>
                    ))}
                  </section>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SimpleTable({
  rows,
  columns,
}: {
  rows: any[];
  columns: Array<[string, (row: any) => React.ReactNode]>;
}) {
  if (rows.length === 0) return <p className="text-muted-foreground">No records yet.</p>;
  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full min-w-[480px] text-left text-xs">
        <thead className="bg-surface text-[10px] uppercase tracking-wide text-muted-foreground">
          <tr>
            {columns.map(([h]) => (
              <th key={h} className="px-3 py-2 font-semibold">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((row, i) => (
            <tr key={row._id ?? i} className="text-foreground">
              {columns.map(([h, get]) => (
                <td key={h} className="px-3 py-2 align-top">
                  {get(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
