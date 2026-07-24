import { useEffect, useMemo, useState, type FormEvent } from 'react';
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
import { adminScheduleRaceApi, type AdminRaceItem, type AdminTournamentOption } from './adminScheduleRaceApi';
import type {
  AdminRaceResult,
  AdminRaceResultCreatePayload,
  AdminRaceResultDraftItem,
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

type RaceResultGroup = {
  key: string;
  raceId?: RaceResultId;
  raceName?: string;
  raceNumber?: number;
  tournamentName?: string;
  scheduledAt?: string;
  results: AdminRaceResult[];
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

/** Maps a displayed result to the race-level draft update contract. */
const toDraftItem = (result: AdminRaceResult): AdminRaceResultDraftItem | null => {
  if (result.assignmentId === undefined) {
    return null;
  }

  return {
    assignmentId: result.assignmentId,
    finishPosition: result.finishPosition ?? undefined,
    finishTimeSec: result.finishTimeSec ?? undefined,
    isDisqualified: Boolean(result.isDisqualified),
    disqualifyReason: result.isDisqualified
      ? result.disqualifyReason?.trim() || undefined
      : undefined,
  };
};

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

const groupResultsByRace = (results: AdminRaceResult[]): RaceResultGroup[] => {
  const groups = new Map<string, RaceResultGroup>();

  results.forEach((result) => {
    const raceIdentity = result.raceId ?? result.raceName ?? 'unknown';
    const key = `race-${String(raceIdentity)}`;
    const currentGroup = groups.get(key);

    if (currentGroup) {
      currentGroup.results.push(result);
      return;
    }

    groups.set(key, {
      key,
      raceId: result.raceId,
      raceName: result.raceName,
      raceNumber: result.raceNumber,
      tournamentName: result.tournamentName,
      scheduledAt: result.scheduledAt,
      results: [result],
    });
  });

  return Array.from(groups.values())
    .map((group) => ({
      ...group,
      results: [...group.results].sort((first, second) => {
        const firstPosition = first.isDisqualified
          ? Number.MAX_SAFE_INTEGER
          : first.finishPosition ?? Number.MAX_SAFE_INTEGER;
        const secondPosition = second.isDisqualified
          ? Number.MAX_SAFE_INTEGER
          : second.finishPosition ?? Number.MAX_SAFE_INTEGER;

        if (firstPosition !== secondPosition) {
          return firstPosition - secondPosition;
        }

        return (first.finishTimeSec ?? Number.MAX_SAFE_INTEGER)
          - (second.finishTimeSec ?? Number.MAX_SAFE_INTEGER);
      }),
    }))
    .sort((first, second) => {
      const parsedFirstTime = first.scheduledAt ? new Date(first.scheduledAt).getTime() : 0;
      const parsedSecondTime = second.scheduledAt ? new Date(second.scheduledAt).getTime() : 0;
      const firstTime = Number.isFinite(parsedFirstTime) ? parsedFirstTime : 0;
      const secondTime = Number.isFinite(parsedSecondTime) ? parsedSecondTime : 0;

      if (firstTime !== secondTime) {
        return secondTime - firstTime;
      }

      return (second.raceNumber ?? 0) - (first.raceNumber ?? 0);
    });
};

const AdminRaceResultsPage = () => {
  const {
    resultList,
    isLoading,
    error,
    fetchRaceResults,
    handleCreate,
    handlePublish,
    handleUpdateDraft,
  } = useAdminRaceResults();
  const [tournaments, setTournaments] = useState<AdminTournamentOption[]>([]);
  const [tournamentRaces, setTournamentRaces] = useState<AdminRaceItem[]>([]);
  const [isTournamentLoading, setIsTournamentLoading] = useState(true);
  const [isTournamentRaceLoading, setIsTournamentRaceLoading] = useState(false);
  const [tournamentError, setTournamentError] = useState('');
  const [tournamentIdFilter, setTournamentIdFilter] = useState('');
  const [raceIdFilter, setRaceIdFilter] = useState('');
  const [appliedRaceIdFilter, setAppliedRaceIdFilter] = useState('');
  const [form, setForm] = useState<ResultFormState>(initialForm);
  const [editorMode, setEditorMode] = useState<'create' | 'edit' | null>(null);
  const [editingResult, setEditingResult] = useState<AdminRaceResult | null>(null);
  const [editorError, setEditorError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [publishTarget, setPublishTarget] = useState<RaceResultGroup | null>(null);

  useEffect(() => {
    let isActive = true;

    queueMicrotask(() => {
      void adminScheduleRaceApi.getTournaments()
        .then((items) => {
          if (isActive) {
            setTournaments(items);
          }
        })
        .catch(() => {
          if (isActive) {
            setTournamentError('Unable to load tournaments.');
          }
        })
        .finally(() => {
          if (isActive) {
            setIsTournamentLoading(false);
          }
        });
    });

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    if (!tournamentIdFilter) {
      return undefined;
    }

    let isActive = true;

    queueMicrotask(() => {
      void adminScheduleRaceApi.getRacesByTournament(tournamentIdFilter)
        .then((items) => {
          if (isActive) {
            setTournamentRaces(items);
          }
        })
        .catch(() => {
          if (isActive) {
            setTournamentRaces([]);
          }
        })
        .finally(() => {
          if (isActive) {
            setIsTournamentRaceLoading(false);
          }
        });
    });

    return () => {
      isActive = false;
    };
  }, [tournamentIdFilter]);

  const selectedTournamentRaceIds = useMemo(
    () => new Set(tournamentRaces.map((race) => String(race.raceId))),
    [tournamentRaces],
  );

  const filteredResults = useMemo(() => {
    const tournamentId = tournamentIdFilter.trim();
    const raceId = appliedRaceIdFilter.trim();

    return resultList.filter((result) => {
      const belongsToTournament = !tournamentId
        || (result.tournamentId !== undefined
          ? String(result.tournamentId) === tournamentId
          : selectedTournamentRaceIds.has(String(result.raceId ?? '')));
      const belongsToRace = !raceId || String(result.raceId ?? '') === raceId;

      return belongsToTournament && belongsToRace;
    });
  }, [appliedRaceIdFilter, resultList, selectedTournamentRaceIds, tournamentIdFilter]);

  const groupedResults = useMemo(() => groupResultsByRace(filteredResults), [filteredResults]);

  const raceOptions = useMemo(() => {
    const options = new Map<string, string>();

    resultList.forEach((result) => {
      if (
        result.raceId === undefined
        || (tournamentIdFilter && (
          result.tournamentId !== undefined
            ? String(result.tournamentId) !== tournamentIdFilter
            : !selectedTournamentRaceIds.has(String(result.raceId))
        ))
      ) {
        return;
      }

      const value = String(result.raceId);
      const displayNumber = result.raceNumber ?? result.raceId;
      options.set(value, `Race #${String(displayNumber)}${result.raceName ? ` - ${result.raceName}` : ''}`);
    });

    return Array.from(options, ([value, label]) => ({ value, label }))
      .sort((first, second) => first.label.localeCompare(second.label, undefined, { numeric: true }));
  }, [resultList, selectedTournamentRaceIds, tournamentIdFilter]);

  const selectedTournamentLabel = useMemo(
    () => tournaments.find((tournament) => String(tournament.tournamentId) === tournamentIdFilter)?.tournamentName,
    [tournamentIdFilter, tournaments],
  );

  const metrics = useMemo(() => ({
    total: resultList.length,
    races: new Set(resultList.map((item) => item.raceId).filter((id) => id !== undefined)).size,
    published: resultList.filter((item) => String(item.status).toLowerCase() === 'published').length,
    disqualified: resultList.filter((item) => item.isDisqualified).length,
  }), [resultList]);

  /** Applies the race filter to the already-loaded result records. */
  const handleFilterSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAppliedRaceIdFilter(raceIdFilter.trim());
  };

  /** Restores the unfiltered Admin result list. */
  const handleClearFilters = () => {
    setTournamentIdFilter('');
    setTournamentRaces([]);
    setIsTournamentRaceLoading(false);
    setRaceIdFilter('');
    setAppliedRaceIdFilter('');
  };

  const handleTournamentChange = (tournamentId: string) => {
    setTournamentIdFilter(tournamentId);
    setTournamentRaces([]);
    setIsTournamentRaceLoading(Boolean(tournamentId));
    setRaceIdFilter('');
    setAppliedRaceIdFilter('');
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
        succeeded = await handleCreate(createPayload, null);
      } else if (editingResult) {
        const raceId = editingResult.raceId;

        if (raceId === undefined) {
          setEditorError('This record does not contain a race ID.');
          return;
        }

        const editingResultId = getResultId(editingResult);
        const draftItems = resultList
          .filter((result) => String(result.raceId) === String(raceId))
          .map((result) => {
            const isEditedResult = editingResultId !== undefined
              ? String(getResultId(result)) === String(editingResultId)
              : String(result.assignmentId) === String(editingResult.assignmentId);

            return toDraftItem(isEditedResult ? { ...result, ...payload } : result);
          });

        if (draftItems.length === 0 || draftItems.some((item) => item === null)) {
          setEditorError('Every result in this race must contain an assignment ID.');
          return;
        }

        succeeded = await handleUpdateDraft(raceId, {
          reportId: form.reportId.trim() ? toResultId(form.reportId) : undefined,
          results: draftItems.filter((item): item is AdminRaceResultDraftItem => item !== null),
        }, null);
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

  /** Publishes every draft result in the selected race after confirmation. */
  const handlePublishConfirmed = async () => {
    if (!publishTarget || isSubmitting) {
      return;
    }

    const raceId = publishTarget.raceId;

    if (raceId === undefined) {
      return;
    }

    setIsSubmitting(true);

    try {
      const succeeded = await handlePublish(raceId, null);

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
        {tournamentError && (
          <div className="mb-5 rounded-lg border border-error/40 bg-error-container/25 px-4 py-3 text-sm font-semibold text-error" role="alert">
            {tournamentError}
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Metric icon={<Trophy className="h-4 w-4" />} label="Result records" value={metrics.total} />
          <Metric icon={<Flag className="h-4 w-4" />} label="Races" value={metrics.races} />
          <Metric icon={<CheckCircle2 className="h-4 w-4" />} label="Published" value={metrics.published} />
          <Metric icon={<X className="h-4 w-4" />} label="Disqualified" value={metrics.disqualified} />
        </div>

        <section className="mt-6 border-y border-outline-variant/40 bg-surface-container-low/45 py-5">
          <div>
            <form onSubmit={handleFilterSubmit} className="flex w-full flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
              <Field label="Race ID">
                <input
                  value={raceIdFilter}
                  onChange={(event) => setRaceIdFilter(event.target.value)}
                  placeholder="Filter by race ID"
                  className="w-full rounded-lg border border-outline-variant/60 bg-surface-container-lowest px-3 py-2.5 text-sm focus:border-primary focus:outline-none sm:w-56"
                />
              </Field>

              <label className="relative block w-full sm:w-72">
                <Trophy className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-outline" />
                <select
                  value={tournamentIdFilter}
                  onChange={(event) => handleTournamentChange(event.target.value)}
                  disabled={isTournamentLoading}
                  className="w-full appearance-none rounded-lg border border-outline-variant/60 bg-surface-container-lowest py-2.5 pl-10 pr-8 text-sm focus:border-primary focus:outline-none"
                  aria-label="Select tournament"
                >
                  <option value="">{isTournamentLoading ? 'Loading tournaments...' : 'All tournaments'}</option>
                  {tournamentIdFilter && !tournaments.some((tournament) => String(tournament.tournamentId) === tournamentIdFilter) && (
                    <option value={tournamentIdFilter}>Tournament #{tournamentIdFilter}</option>
                  )}
                  {tournaments.map((tournament) => (
                    <option key={tournament.tournamentId} value={tournament.tournamentId}>{tournament.tournamentName}</option>
                  ))}
                </select>
              </label>

              <label className="relative block w-full sm:w-72">
                <Flag className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-outline" />
                <select
                  value={appliedRaceIdFilter}
                  onChange={(event) => {
                    setRaceIdFilter(event.target.value);
                    setAppliedRaceIdFilter(event.target.value);
                  }}
                  disabled={isTournamentRaceLoading}
                  className="w-full appearance-none rounded-lg border border-outline-variant/60 bg-surface-container-lowest py-2.5 pl-10 pr-8 text-sm focus:border-primary focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
                  aria-label="Select race"
                >
                  <option value="">All races</option>
                  {appliedRaceIdFilter && !raceOptions.some((option) => option.value === appliedRaceIdFilter) && (
                    <option value={appliedRaceIdFilter}>Race #{appliedRaceIdFilter}</option>
                  )}
                  {raceOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>

              <button type="submit" disabled={isLoading} className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-on-primary disabled:opacity-60">
                <Search className="h-4 w-4" />
                Filter
              </button>
              {(tournamentIdFilter || appliedRaceIdFilter) && (
                <button type="button" onClick={handleClearFilters} disabled={isLoading} className="rounded-lg border border-outline-variant/60 px-4 py-2.5 text-sm font-bold text-on-surface-variant disabled:opacity-60">
                  Show all
                </button>
              )}
            </form>
          </div>
        </section>

        <section className="mt-6 min-w-0">
          <div className="flex items-center justify-between gap-3 border-y border-outline-variant/40 bg-surface-container-low/45 px-4 py-4">
            <div>
              <h2 className="font-display text-xl font-bold text-on-surface">Results by race</h2>
              <p className="mt-1 text-xs font-semibold uppercase tracking-[0.12em] text-on-surface-variant">
                {appliedRaceIdFilter
                  ? `Race #${appliedRaceIdFilter}`
                  : selectedTournamentLabel
                    ? selectedTournamentLabel
                  : `${groupedResults.length} race${groupedResults.length === 1 ? '' : 's'}`}
              </p>
            </div>
            <button type="button" onClick={() => void fetchRaceResults(null)} disabled={isLoading} className="rounded-lg border border-outline-variant/60 p-2.5 text-on-surface-variant hover:text-primary disabled:opacity-60" aria-label="Refresh race results" title="Refresh">
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {isLoading ? (
            <ResultListState isLoading title="Loading race results" description="Fetching result records from the API." />
          ) : groupedResults.length === 0 ? (
            <ResultListState title="No race results found" description="No results match the selected race filter." />
          ) : (
            <div className="mt-5 space-y-5">
              {groupedResults.map((group) => (
                <RaceResultGroupTable
                  key={group.key}
                  group={group}
                  onEdit={openEditEditor}
                  onPublish={setPublishTarget}
                />
              ))}
            </div>
          )}
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
            <h2 id="publish-result-title" className="font-display text-xl font-bold text-on-surface">Publish race results?</h2>
            <p className="mt-2 text-sm leading-6 text-on-surface-variant">
              All {publishTarget.results.length} results for Race #{String(publishTarget.raceId ?? publishTarget.raceNumber ?? '-')} will become publicly available.
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

const RaceResultGroupTable = ({
  group,
  onEdit,
  onPublish,
}: {
  group: RaceResultGroup;
  onEdit: (result: AdminRaceResult) => void;
  onPublish: (group: RaceResultGroup) => void;
}) => {
  const publishedCount = group.results.filter((result) => String(result.status).toLowerCase() === 'published').length;
  const isPublished = group.results.length > 0 && publishedCount === group.results.length;

  return (
    <section className="min-w-0 overflow-hidden rounded-lg border border-outline-variant/50 bg-surface-container-lowest/40">
      <div className="flex flex-col gap-3 border-b border-outline-variant/40 bg-surface-container-low/70 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex h-10 w-10 flex-none items-center justify-center rounded-lg border border-outline-variant/50 bg-surface-container-lowest text-primary">
            <Flag className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <h3 className="font-display truncate text-lg font-bold text-on-surface">
              Race #{String(group.raceId ?? group.raceNumber ?? '-')}
              {group.raceName ? ` - ${group.raceName}` : ''}
            </h3>
            <p className="mt-1 text-xs font-semibold text-on-surface-variant">
              {[group.tournamentName, group.scheduledAt ? formatDateTime(group.scheduledAt) : null]
                .filter(Boolean)
                .join(' / ') || 'Race information unavailable'}
            </p>
          </div>
        </div>
        <div className="flex flex-none items-center gap-3">
          <div className="flex items-center gap-3 text-xs font-bold text-on-surface-variant">
            <span>{group.results.length} result{group.results.length === 1 ? '' : 's'}</span>
            <span className="h-4 w-px bg-outline-variant" />
            <span className="text-secondary">{publishedCount} published</span>
          </div>
          <button type="button" onClick={() => onPublish(group)} disabled={group.raceId === undefined || isPublished} className="inline-flex items-center gap-2 rounded-lg border border-secondary/50 px-3 py-2 text-xs font-bold text-secondary hover:bg-secondary-container/20 disabled:opacity-40" title={isPublished ? 'Already published' : 'Publish race results'}>
            <Send className="h-4 w-4" />
            Publish
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="bg-surface-container-low/45 text-xs font-bold uppercase text-on-surface-variant">
            <tr>
              <th className="px-4 py-3">Result</th>
              <th className="px-4 py-3">Horse</th>
              <th className="px-4 py-3">Finish</th>
              <th className="px-4 py-3">Points</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Recorded</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/30">
            {group.results.map((result, index) => {
              const resultId = getResultId(result);
              const isResultPublished = String(result.status).toLowerCase() === 'published';

              return (
                <tr key={String(resultId ?? `${result.assignmentId}-${index}`)} className="hover:bg-surface-container-low/60">
                  <td className="px-4 py-4">
                    <strong className="block text-on-surface">#{String(resultId ?? '-')}</strong>
                    <span className="mt-1 block text-xs text-on-surface-variant">Assignment #{String(result.assignmentId ?? '-')}</span>
                  </td>
                  <td className="px-4 py-4">
                    <strong className="block text-on-surface">{result.horseName ?? `Assignment #${String(result.assignmentId ?? '-')}`}</strong>
                    <span className="mt-1 block text-xs text-on-surface-variant">{result.jockeyFullName ?? result.ownerFullName ?? '-'}</span>
                  </td>
                  <td className="px-4 py-4">
                    <span className="font-bold text-on-surface">P{result.finishPosition ?? '-'}</span>
                    <span className="mt-1 flex items-center gap-1 text-xs text-on-surface-variant">
                      <Timer className="h-3.5 w-3.5" />
                      {formatFinishTime(result.finishTimeSec)}
                    </span>
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
                      <button type="button" onClick={() => onEdit(result)} disabled={result.assignmentId === undefined || result.raceId === undefined || isResultPublished} className="rounded-lg border border-outline-variant/60 p-2 text-on-surface-variant hover:border-primary hover:text-primary disabled:opacity-40" aria-label="Edit draft race result" title={isResultPublished ? 'Published results cannot be edited' : 'Edit draft'}>
                        <Edit3 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
};

const ResultListState = ({
  isLoading = false,
  title,
  description,
}: {
  isLoading?: boolean;
  title: string;
  description: string;
}) => (
  <div className="mt-5 rounded-lg border border-outline-variant/50 bg-surface-container-lowest/40 px-6 py-14 text-center">
    <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-surface-container-low">
      {isLoading
        ? <RefreshCw className="h-5 w-5 animate-spin text-outline" />
        : <Search className="h-5 w-5 text-outline" />}
    </div>
    <h3 className="text-base font-bold text-on-surface">{title}</h3>
    <p className="mt-2 text-sm text-on-surface-variant">{description}</p>
  </div>
);

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
          <h2 id="result-editor-title" className="font-display mt-1 text-xl font-bold text-on-surface">{mode === 'create' ? 'Create result' : 'Edit draft result'}</h2>
        </div>
        <button type="button" onClick={onClose} disabled={isSubmitting} className="rounded-lg border border-outline-variant/60 p-2 text-on-surface-variant hover:text-primary disabled:opacity-60" aria-label="Close result editor"><X className="h-5 w-5" /></button>
      </div>

      {error && <div className="mb-4 rounded-lg border border-error/40 bg-error-container/25 px-4 py-3 text-sm font-semibold text-error">{error}</div>}

      <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
        <TextField label="Assignment ID" value={form.assignmentId} onChange={(value) => onChange({ assignmentId: value })} required readOnly={mode === 'edit'} />
        <TextField label="Report ID" value={form.reportId} onChange={(value) => onChange({ reportId: value })} />
        {mode === 'create' && <TextField label="Final round" type="number" value={form.finalRound} onChange={(value) => onChange({ finalRound: value })} min="1" />}
        <TextField label="Finish position" type="number" value={form.finishPosition} onChange={(value) => onChange({ finishPosition: value })} min="1" />
        <TextField label="Finish time (seconds)" type="number" value={form.finishTimeSec} onChange={(value) => onChange({ finishTimeSec: value })} min="0" step="0.001" />
        {mode === 'create' && <TextField label="Points awarded" type="number" value={form.pointsAwarded} onChange={(value) => onChange({ pointsAwarded: value })} min="0" />}
        {mode === 'create' && (
          <Field label="Status">
            <select value={form.status} onChange={(event) => onChange({ status: event.target.value })} className="rounded-lg border border-outline-variant/60 bg-surface-container-lowest px-3 py-2.5 text-sm normal-case tracking-normal focus:border-primary focus:outline-none">
              <option value="draft">Draft</option>
              <option value="confirmed">Confirmed</option>
              <option value="published">Published</option>
            </select>
          </Field>
        )}
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
            {isSubmitting ? 'Saving...' : mode === 'create' ? 'Create result' : 'Save draft'}
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
  readOnly,
  min,
  step,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
  readOnly?: boolean;
  min?: string;
  step?: string;
}) => (
  <Field label={label}>
    <input type={type} value={value} onChange={(event) => onChange(event.target.value)} required={required} readOnly={readOnly} min={min} step={step} className="rounded-lg border border-outline-variant/60 bg-surface-container-lowest px-3 py-2.5 text-sm font-normal normal-case tracking-normal focus:border-primary focus:outline-none read-only:cursor-not-allowed read-only:bg-surface-container" />
  </Field>
);

export default AdminRaceResultsPage;
