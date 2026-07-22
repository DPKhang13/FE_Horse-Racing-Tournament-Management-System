import { useMemo, useState, type FormEvent } from 'react';
import {
  CheckCircle2,
  Edit3,
  FilePlus2,
  Flag,
  RefreshCw,
  Search,
  Send,
  Timer,
  Trophy,
  X,
} from 'lucide-react';
import { useAdminRaceResults } from '../../hooks/useAdminRaceResults';
import type {
  AdminRaceResult,
  AdminRaceResultCreatePayload,
  AdminRaceResultUpdatePayload,
  RaceResultId,
} from '../../services/adminRaceResultService';

type ResultFormState = {
  assignmentId: string;
  reportId: string;
  finalRound: string;
  finishPosition: string;
  finishTimeSec: string;
  pointsAwarded: string;
  status: string;
  isDisqualified: boolean;
  disqualifyReason: string;
};

const initialForm: ResultFormState = {
  assignmentId: '',
  reportId: '',
  finalRound: '1',
  finishPosition: '',
  finishTimeSec: '',
  pointsAwarded: '0',
  status: 'draft',
  isDisqualified: false,
  disqualifyReason: '',
};

/** Returns the backend identifier used by update and publish endpoints. */
const getResultId = (result: AdminRaceResult): RaceResultId | undefined => result.resultId ?? result.id;

/** Converts a text input into an optional finite number. */
const toOptionalNumber = (value: string) => {
  if (!value.trim()) {
    return undefined;
  }

  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
};

/** Converts a numeric ID when possible while retaining non-numeric backend IDs. */
const toResultId = (value: string): RaceResultId => {
  const normalized = value.trim();
  const number = Number(normalized);
  return normalized && Number.isFinite(number) ? number : normalized;
};

/** Maps an API result into editable form values. */
const toFormState = (result: AdminRaceResult): ResultFormState => ({
  assignmentId: result.assignmentId === undefined ? '' : String(result.assignmentId),
  reportId: result.reportId === undefined ? '' : String(result.reportId),
  finalRound: result.finalRound === undefined ? '1' : String(result.finalRound),
  finishPosition: result.finishPosition === null || result.finishPosition === undefined
    ? ''
    : String(result.finishPosition),
  finishTimeSec: result.finishTimeSec === null || result.finishTimeSec === undefined
    ? ''
    : String(result.finishTimeSec),
  pointsAwarded: result.pointsAwarded === undefined ? '0' : String(result.pointsAwarded),
  status: result.status ?? 'draft',
  isDisqualified: Boolean(result.isDisqualified),
  disqualifyReason: result.disqualifyReason ?? '',
});

/** Builds the payload shared by create and update requests. */
const toUpdatePayload = (form: ResultFormState): AdminRaceResultUpdatePayload => ({
  assignmentId: form.assignmentId.trim() ? toResultId(form.assignmentId) : undefined,
  reportId: form.reportId.trim() ? toResultId(form.reportId) : undefined,
  finalRound: toOptionalNumber(form.finalRound),
  finishPosition: toOptionalNumber(form.finishPosition),
  finishTimeSec: toOptionalNumber(form.finishTimeSec),
  pointsAwarded: toOptionalNumber(form.pointsAwarded),
  status: form.status.trim() || undefined,
  isDisqualified: form.isDisqualified,
  disqualifyReason: form.isDisqualified ? form.disqualifyReason.trim() || undefined : undefined,
});

/** Formats finish seconds for quick comparison in the Admin table. */
const formatFinishTime = (seconds?: number | null) => {
  if (seconds === null || seconds === undefined) {
    return '-';
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return minutes > 0 ? `${minutes}:${remainingSeconds.toFixed(3).padStart(6, '0')}` : `${seconds.toFixed(3)}s`;
};

/** Formats an API timestamp without failing on an invalid date value. */
const formatDateTime = (value?: string | null) => {
  if (!value) {
    return '-';
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('en-GB');
};

/** Returns restrained status colors for the operational table. */
const getStatusClasses = (status?: string) => {
  const normalized = status?.toLowerCase() ?? '';

  if (normalized === 'published') {
    return 'border-secondary/40 bg-secondary-container/25 text-secondary';
  }

  if (normalized.includes('cancel') || normalized.includes('disqual')) {
    return 'border-error/40 bg-error-container/25 text-error';
  }

  return 'border-primary/35 bg-primary/10 text-primary';
};

const AdminRaceResultsPage = () => {
  const {
    resultList,
    selectedRaceId,
    isLoading,
    error,
    fetchRaceResults,
    handleCreate,
    handlePublishResult,
    handleUpdate,
  } = useAdminRaceResults();
  const [raceIdFilter, setRaceIdFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [form, setForm] = useState<ResultFormState>(initialForm);
  const [editorMode, setEditorMode] = useState<'create' | 'edit' | null>(null);
  const [editingResult, setEditingResult] = useState<AdminRaceResult | null>(null);
  const [editorError, setEditorError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [publishTarget, setPublishTarget] = useState<AdminRaceResult | null>(null);

  const filteredResults = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    if (!query) {
      return resultList;
    }

    return resultList.filter((result) => [
      result.resultId,
      result.raceId,
      result.raceName,
      result.horseName,
      result.ownerFullName,
      result.jockeyFullName,
      result.status,
    ].some((value) => String(value ?? '').toLowerCase().includes(query)));
  }, [resultList, searchTerm]);

  const metrics = useMemo(() => ({
    total: resultList.length,
    races: new Set(resultList.map((item) => item.raceId).filter((id) => id !== undefined)).size,
    published: resultList.filter((item) => String(item.status).toLowerCase() === 'published').length,
    disqualified: resultList.filter((item) => item.isDisqualified).length,
  }), [resultList]);

  /** Loads either all results or the records belonging to the entered race ID. */
  const handleFilterSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const raceId = raceIdFilter.trim();
    await fetchRaceResults(raceId ? toResultId(raceId) : null);
  };

  /** Restores the unfiltered Admin result list. */
  const handleClearRaceFilter = async () => {
    setRaceIdFilter('');
    await fetchRaceResults(null);
  };

  /** Opens an empty create-result modal. */
  const openCreateEditor = () => {
    setForm(initialForm);
    setEditingResult(null);
    setEditorError('');
    setEditorMode('create');
  };

  /** Opens the selected result in the update modal. */
  const openEditEditor = (result: AdminRaceResult) => {
    setForm(toFormState(result));
    setEditingResult(result);
    setEditorError('');
    setEditorMode('edit');
  };

  /** Closes and resets the create/update modal. */
  const closeEditor = () => {
    if (isSubmitting) {
      return;
    }

    setEditorMode(null);
    setEditingResult(null);
    setEditorError('');
    setForm(initialForm);
  };

  /** Sends the create or update request represented by the active modal. */
  const handleEditorSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setEditorError('');

    if (!form.assignmentId.trim()) {
      setEditorError('Assignment ID is required.');
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = toUpdatePayload(form);
      let succeeded = false;

      if (editorMode === 'create') {
        const createPayload: AdminRaceResultCreatePayload = {
          ...payload,
          assignmentId: toResultId(form.assignmentId),
        };
        succeeded = await handleCreate(createPayload, selectedRaceId);
      } else if (editingResult) {
        const resultId = getResultId(editingResult);

        if (resultId === undefined) {
          setEditorError('This record does not contain a result ID.');
          return;
        }

        succeeded = await handleUpdate(resultId, payload, selectedRaceId);
      }

      if (succeeded) {
        setEditorMode(null);
        setEditingResult(null);
        setForm(initialForm);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  /** Publishes the selected result after confirmation. */
  const handlePublishConfirmed = async () => {
    if (!publishTarget || isSubmitting) {
      return;
    }

    const resultId = getResultId(publishTarget);

    if (resultId === undefined) {
      return;
    }

    setIsSubmitting(true);

    try {
      const succeeded = await handlePublishResult(resultId, selectedRaceId);

      if (succeeded) {
        setPublishTarget(null);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-surface text-on-surface">
      <section className="border-b border-outline-variant/40 bg-surface-container-low/80">
        <div className="mx-auto max-w-[1440px] px-4 py-8 md:px-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-secondary">Admin operations</p>
              <h1 className="font-display mt-2 text-3xl font-extrabold text-primary md:text-4xl">Race Results</h1>
            </div>
            <button
              type="button"
              onClick={openCreateEditor}
              className="gold-gradient inline-flex items-center justify-center gap-2 rounded-lg px-5 py-3 text-sm font-bold text-on-primary"
            >
              <FilePlus2 className="h-4 w-4" />
              Create result
            </button>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1440px] px-4 py-6 md:px-8">
        {error && (
          <div className="mb-5 rounded-lg border border-error/40 bg-error-container/25 px-4 py-3 text-sm font-semibold text-error" role="alert">
            {error}
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Metric icon={<Trophy className="h-4 w-4" />} label="Result records" value={metrics.total} />
          <Metric icon={<Flag className="h-4 w-4" />} label="Races" value={metrics.races} />
          <Metric icon={<CheckCircle2 className="h-4 w-4" />} label="Published" value={metrics.published} />
          <Metric icon={<X className="h-4 w-4" />} label="Disqualified" value={metrics.disqualified} />
        </div>

        <section className="mt-6 border-y border-outline-variant/40 bg-surface-container-low/45 py-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <form onSubmit={handleFilterSubmit} className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <Field label="Race ID">
                <input
                  value={raceIdFilter}
                  onChange={(event) => setRaceIdFilter(event.target.value)}
                  placeholder="Filter by race ID"
                  className="w-full rounded-lg border border-outline-variant/60 bg-surface-container-lowest px-3 py-2.5 text-sm focus:border-primary focus:outline-none sm:w-56"
                />
              </Field>
              <button type="submit" disabled={isLoading} className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-on-primary disabled:opacity-60">
                <Search className="h-4 w-4" />
                Filter
              </button>
              {selectedRaceId !== null && (
                <button type="button" onClick={() => void handleClearRaceFilter()} disabled={isLoading} className="rounded-lg border border-outline-variant/60 px-4 py-2.5 text-sm font-bold text-on-surface-variant disabled:opacity-60">
                  Show all
                </button>
              )}
            </form>

            <label className="relative block w-full xl:w-80">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-outline" />
              <input
                type="search"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search loaded results"
                className="w-full rounded-lg border border-outline-variant/60 bg-surface-container-lowest py-2.5 pl-10 pr-3 text-sm focus:border-primary focus:outline-none"
              />
            </label>
          </div>
        </section>

        <section className="mt-6 min-w-0 overflow-hidden rounded-lg border border-outline-variant/50 bg-surface-container-lowest/40">
          <div className="flex items-center justify-between gap-3 border-b border-outline-variant/40 px-4 py-4">
            <div>
              <h2 className="font-display text-xl font-bold text-on-surface">Result records</h2>
              <p className="mt-1 text-xs font-semibold uppercase tracking-[0.12em] text-on-surface-variant">
                {selectedRaceId === null ? 'All races' : `Race #${selectedRaceId}`}
              </p>
            </div>
            <button type="button" onClick={() => void fetchRaceResults(selectedRaceId)} disabled={isLoading} className="rounded-lg border border-outline-variant/60 p-2.5 text-on-surface-variant hover:text-primary disabled:opacity-60" aria-label="Refresh race results" title="Refresh">
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-left text-sm">
              <thead className="bg-surface-container-low text-xs font-bold uppercase text-on-surface-variant">
                <tr>
                  <th className="px-4 py-3">Result / Race</th>
                  <th className="px-4 py-3">Horse</th>
                  <th className="px-4 py-3">Finish</th>
                  <th className="px-4 py-3">Points</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Recorded</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/30">
                {filteredResults.map((result, index) => {
                  const resultId = getResultId(result);
                  const isPublished = String(result.status).toLowerCase() === 'published';

                  return (
                    <tr key={String(resultId ?? `${result.raceId}-${result.assignmentId}-${index}`)} className="hover:bg-surface-container-low/60">
                      <td className="px-4 py-4">
                        <strong className="block text-on-surface">#{String(resultId ?? '-')}</strong>
                        <span className="mt-1 block text-xs text-on-surface-variant">Race #{String(result.raceId ?? '-')} {result.raceName ? `- ${result.raceName}` : ''}</span>
                      </td>
                      <td className="px-4 py-4">
                        <strong className="block text-on-surface">{result.horseName ?? `Assignment #${String(result.assignmentId ?? '-')}`}</strong>
                        <span className="mt-1 block text-xs text-on-surface-variant">{result.jockeyFullName ?? result.ownerFullName ?? '-'}</span>
                      </td>
                      <td className="px-4 py-4">
                        <span className="font-bold text-on-surface">P{result.finishPosition ?? '-'}</span>
                        <span className="mt-1 flex items-center gap-1 text-xs text-on-surface-variant"><Timer className="h-3.5 w-3.5" />{formatFinishTime(result.finishTimeSec)}</span>
                      </td>
                      <td className="px-4 py-4 font-bold text-primary">{result.pointsAwarded ?? 0}</td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex rounded-md border px-2 py-1 text-xs font-bold uppercase ${getStatusClasses(result.status)}`}>
                          {result.status ?? 'draft'}
                        </span>
                        {result.isDisqualified && <span className="mt-1 block text-xs font-semibold text-error">Disqualified</span>}
                      </td>
                      <td className="px-4 py-4 text-xs text-on-surface-variant">{formatDateTime(result.recordedAt)}</td>
                      <td className="px-4 py-4">
                        <div className="flex justify-end gap-2">
                          <button type="button" onClick={() => openEditEditor(result)} disabled={resultId === undefined} className="rounded-lg border border-outline-variant/60 p-2 text-on-surface-variant hover:border-primary hover:text-primary disabled:opacity-40" aria-label="Edit race result" title="Edit">
                            <Edit3 className="h-4 w-4" />
                          </button>
                          <button type="button" onClick={() => setPublishTarget(result)} disabled={resultId === undefined || isPublished} className="rounded-lg border border-secondary/50 p-2 text-secondary hover:bg-secondary-container/20 disabled:opacity-40" aria-label="Publish race result" title={isPublished ? 'Already published' : 'Publish'}>
                            <Send className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {!isLoading && filteredResults.length === 0 && (
                  <tr><td colSpan={7} className="px-4 py-12 text-center text-on-surface-variant">No race results found.</td></tr>
                )}
                {isLoading && (
                  <tr><td colSpan={7} className="px-4 py-12 text-center text-on-surface-variant">Loading race results...</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </section>

      {editorMode && (
        <ResultEditorModal
          mode={editorMode}
          form={form}
          error={editorError}
          isSubmitting={isSubmitting}
          onChange={(changes) => setForm((current) => ({ ...current, ...changes }))}
          onClose={closeEditor}
          onSubmit={handleEditorSubmit}
        />
      )}

      {publishTarget && (
        <div className="fixed inset-0 z-[180] flex items-center justify-center bg-black/60 px-4 py-8" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget && !isSubmitting) setPublishTarget(null);
        }}>
          <section className="w-full max-w-md rounded-lg border border-outline-variant/60 bg-surface-container-low p-6 shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="publish-result-title">
            <h2 id="publish-result-title" className="font-display text-xl font-bold text-on-surface">Publish race result?</h2>
            <p className="mt-2 text-sm leading-6 text-on-surface-variant">
              Result #{String(getResultId(publishTarget) ?? '-')} for {publishTarget.horseName ?? 'this assignment'} will become publicly available.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={() => setPublishTarget(null)} disabled={isSubmitting} className="rounded-lg border border-outline-variant/60 px-4 py-2.5 text-sm font-bold text-on-surface-variant disabled:opacity-60">Cancel</button>
              <button type="button" onClick={() => void handlePublishConfirmed()} disabled={isSubmitting} className="inline-flex items-center gap-2 rounded-lg bg-secondary px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60">
                <Send className="h-4 w-4" />
                {isSubmitting ? 'Publishing...' : 'Publish'}
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
};

const Metric = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) => (
  <div className="rounded-lg border border-outline-variant/40 bg-surface-container-lowest/50 p-4">
    <div className="flex items-center gap-2 text-on-surface-variant">{icon}<span className="text-xs font-bold uppercase tracking-[0.12em]">{label}</span></div>
    <strong className="font-display mt-2 block text-2xl font-extrabold text-primary">{value}</strong>
  </div>
);

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <label className="grid gap-1.5 text-xs font-bold uppercase tracking-[0.1em] text-on-surface-variant">
    {label}
    {children}
  </label>
);

const ResultEditorModal = ({
  mode,
  form,
  error,
  isSubmitting,
  onChange,
  onClose,
  onSubmit,
}: {
  mode: 'create' | 'edit';
  form: ResultFormState;
  error: string;
  isSubmitting: boolean;
  onChange: (changes: Partial<ResultFormState>) => void;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) => (
  <div className="fixed inset-0 z-[170] flex items-center justify-center overflow-y-auto bg-black/60 px-4 py-8" role="presentation" onMouseDown={(event) => {
    if (event.target === event.currentTarget) onClose();
  }}>
    <section className="max-h-[calc(100vh-4rem)] w-full max-w-2xl overflow-y-auto rounded-lg border border-outline-variant/60 bg-surface-container-low p-6 shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="result-editor-title">
      <div className="mb-5 flex items-start justify-between border-b border-outline-variant/40 pb-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-secondary">Race result editor</p>
          <h2 id="result-editor-title" className="font-display mt-1 text-xl font-bold text-on-surface">{mode === 'create' ? 'Create result' : 'Edit result'}</h2>
        </div>
        <button type="button" onClick={onClose} disabled={isSubmitting} className="rounded-lg border border-outline-variant/60 p-2 text-on-surface-variant hover:text-primary disabled:opacity-60" aria-label="Close result editor"><X className="h-5 w-5" /></button>
      </div>

      {error && <div className="mb-4 rounded-lg border border-error/40 bg-error-container/25 px-4 py-3 text-sm font-semibold text-error">{error}</div>}

      <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
        <TextField label="Assignment ID" value={form.assignmentId} onChange={(value) => onChange({ assignmentId: value })} required />
        <TextField label="Report ID" value={form.reportId} onChange={(value) => onChange({ reportId: value })} />
        <TextField label="Final round" type="number" value={form.finalRound} onChange={(value) => onChange({ finalRound: value })} min="1" />
        <TextField label="Finish position" type="number" value={form.finishPosition} onChange={(value) => onChange({ finishPosition: value })} min="1" />
        <TextField label="Finish time (seconds)" type="number" value={form.finishTimeSec} onChange={(value) => onChange({ finishTimeSec: value })} min="0" step="0.001" />
        <TextField label="Points awarded" type="number" value={form.pointsAwarded} onChange={(value) => onChange({ pointsAwarded: value })} min="0" />
        <Field label="Status">
          <select value={form.status} onChange={(event) => onChange({ status: event.target.value })} className="rounded-lg border border-outline-variant/60 bg-surface-container-lowest px-3 py-2.5 text-sm normal-case tracking-normal focus:border-primary focus:outline-none">
            <option value="draft">Draft</option>
            <option value="confirmed">Confirmed</option>
            <option value="published">Published</option>
          </select>
        </Field>
        <label className="flex items-center gap-3 self-end rounded-lg border border-outline-variant/60 bg-surface-container-lowest px-3 py-2.5 text-sm font-semibold text-on-surface">
          <input type="checkbox" checked={form.isDisqualified} onChange={(event) => onChange({ isDisqualified: event.target.checked })} className="h-4 w-4 accent-error" />
          Disqualified
        </label>
        {form.isDisqualified && (
          <label className="grid gap-1.5 text-xs font-bold uppercase tracking-[0.1em] text-on-surface-variant sm:col-span-2">
            Disqualification reason
            <textarea value={form.disqualifyReason} onChange={(event) => onChange({ disqualifyReason: event.target.value })} rows={3} required className="resize-y rounded-lg border border-outline-variant/60 bg-surface-container-lowest px-3 py-2.5 text-sm font-normal normal-case tracking-normal focus:border-primary focus:outline-none" />
          </label>
        )}
        <div className="flex justify-end gap-3 border-t border-outline-variant/40 pt-4 sm:col-span-2">
          <button type="button" onClick={onClose} disabled={isSubmitting} className="rounded-lg border border-outline-variant/60 px-4 py-2.5 text-sm font-bold text-on-surface-variant disabled:opacity-60">Cancel</button>
          <button type="submit" disabled={isSubmitting} className="gold-gradient inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-bold text-on-primary disabled:opacity-60">
            {mode === 'create' ? <FilePlus2 className="h-4 w-4" /> : <Edit3 className="h-4 w-4" />}
            {isSubmitting ? 'Saving...' : mode === 'create' ? 'Create result' : 'Save changes'}
          </button>
        </div>
      </form>
    </section>
  </div>
);

const TextField = ({
  label,
  value,
  onChange,
  type = 'text',
  required,
  min,
  step,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
  min?: string;
  step?: string;
}) => (
  <Field label={label}>
    <input type={type} value={value} onChange={(event) => onChange(event.target.value)} required={required} min={min} step={step} className="rounded-lg border border-outline-variant/60 bg-surface-container-lowest px-3 py-2.5 text-sm font-normal normal-case tracking-normal focus:border-primary focus:outline-none" />
  </Field>
);

export default AdminRaceResultsPage;
