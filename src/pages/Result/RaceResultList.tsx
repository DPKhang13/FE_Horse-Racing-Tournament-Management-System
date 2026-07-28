import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  Calendar,
  ChevronRight,
  Clock,
  Filter,
  Flag,
  Medal,
  Search,
  Trophy,
  Users,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { authService } from '../../services/authService';
import { useToastNotifications } from '../../hooks/useToastNotifications';
import { HorseService } from '../../services/HorseService';
import { jockeyAssignmentService, type JockeyAssignmentItem } from '../../services/jockeyAssignmentService';
import { raceResultService } from '../../services/raceResultService';
import type { Horse } from '../../types/horse';
import type { RaceResultEntry, RaceResultStatus, RaceResultSummary } from '../../types/raceResult';
import type { UserProfile } from '../../types/user';
import ResultNav from './components/ResultNav';

type StatusFilter = RaceResultStatus | 'all';

type RacePerspective = {
  entry?: RaceResultEntry;
  label: string;
  context: string;
};

const statusOptions: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'All Results' },
  { value: 'published', label: 'Published' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'draft', label: 'Draft' },
];

const normalizeText = (value?: string) => String(value ?? '').trim().toLowerCase();

const sameId = (first: unknown, second: unknown) => (
  first !== null &&
  first !== undefined &&
  second !== null &&
  second !== undefined &&
  String(first) === String(second)
);

const formatDate = (value?: string) => {
  if (!value) {
    return '-';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '-';
  }

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const formatRaceTime = (value?: string) => {
  if (!value) {
    return 'Race day pending';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'Race day pending';
  }

  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

const getResultRoute = (result: RaceResultSummary) => `/results/${result.raceId || result.id}`;

const getSortedEntries = (entries: RaceResultEntry[]) => [...entries].sort((first, second) => {
  if (first.isDisqualified && !second.isDisqualified) {
    return 1;
  }

  if (!first.isDisqualified && second.isDisqualified) {
    return -1;
  }

  return (first.finishPosition ?? 999) - (second.finishPosition ?? 999);
});

const getRankLabel = (entry?: RaceResultEntry) => {
  if (!entry) {
    return '-';
  }

  if (entry.isDisqualified) {
    return 'DQ';
  }

  return entry.finishPosition ? `#${entry.finishPosition}` : '-';
};

const getOutcomeClassName = (entry?: RaceResultEntry) => {
  if (!entry) {
    return 'border-outline-variant bg-surface-container-high text-on-surface-variant';
  }

  if (entry.isDisqualified) {
    return 'border-error/50 bg-error-container/30 text-error';
  }

  if (entry.finishPosition === 1) {
    return 'border-primary/70 bg-primary/15 text-primary';
  }

  if (entry.finishPosition && entry.finishPosition <= 3) {
    return 'border-secondary/60 bg-secondary/15 text-secondary';
  }

  return 'border-outline-variant bg-surface-container-high text-on-surface';
};

const getPersonalEntry = (
  result: RaceResultSummary,
  profile: UserProfile | undefined,
  ownerHorses: Horse[],
  jockeyAssignments: JockeyAssignmentItem[],
) => {
  if (profile?.roleType === 'horse_owner') {
    const ownerHorseIds = new Set(ownerHorses.map((horse) => String(horse.horseId)));
    return getSortedEntries(result.entries).find((entry) => ownerHorseIds.has(String(entry.horseId)));
  }

  if (profile?.roleType === 'jockey') {
    const raceAssignments = jockeyAssignments.filter((assignment) => sameId(assignment.raceId, result.raceId));

    for (const assignment of raceAssignments) {
      const byAssignment = result.entries.find((entry) => sameId(entry.assignmentId, assignment.assignmentId ?? assignment.id));
      if (byAssignment) {
        return byAssignment;
      }

      const byHorse = result.entries.find((entry) => sameId(entry.horseId, assignment.horseId));
      if (byHorse) {
        return byHorse;
      }

      const byJockeyName = result.entries.find(
        (entry) => normalizeText(entry.jockeyName) === normalizeText(assignment.jockeyFullName),
      );
      if (byJockeyName) {
        return byJockeyName;
      }
    }

    return result.entries.find((entry) => normalizeText(entry.jockeyName) === normalizeText(profile.fullName));
  }

  return undefined;
};

const getPerspective = (
  result: RaceResultSummary,
  profile: UserProfile | undefined,
  ownerHorses: Horse[],
  jockeyAssignments: JockeyAssignmentItem[],
): RacePerspective => {
  const entry = getPersonalEntry(result, profile, ownerHorses, jockeyAssignments);

  if (profile?.roleType === 'jockey') {
    return {
      entry,
      label: 'Your Finish',
      context: entry ? `${entry.horseName} / Gate ${entry.gateNumber || '-'}` : 'Public race record',
    };
  }

  if (profile?.roleType === 'horse_owner') {
    return {
      entry,
      label: 'Stable Finish',
      context: entry ? `${entry.horseName} / ${entry.jockeyName}` : 'Stable race record',
    };
  }

  return {
    entry: getSortedEntries(result.entries)[0],
    label: 'Winner',
    context: result.winnerJockey,
  };
};

const RaceResultList = () => {
  const [profile, setProfile] = useState<UserProfile | undefined>(() => authService.getStoredUserProfile());
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [tournament, setTournament] = useState('All Tournaments');
  const [results, setResults] = useState<RaceResultSummary[]>([]);
  const [ownerHorses, setOwnerHorses] = useState<Horse[]>([]);
  const [jockeyAssignments, setJockeyAssignments] = useState<JockeyAssignmentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  useToastNotifications([
    errorMessage ? { tone: 'error', text: errorMessage } : null,
  ]);

  useEffect(() => {
    let isMounted = true;

    const loadResults = async () => {
      setIsLoading(true);
      setErrorMessage('');

      try {
        const currentProfile = authService.getStoredUserProfile() ?? await authService.getCurrentUser();
        const [resultSummaries, horses, assignments] = await Promise.all([
          raceResultService.getRaceResultSummaries(),
          currentProfile.roleType === 'horse_owner'
            ? HorseService.getOwnerHorses(currentProfile)
            : Promise.resolve([]),
          currentProfile.roleType === 'jockey'
            ? jockeyAssignmentService.getMine()
            : Promise.resolve([]),
        ]);

        if (!isMounted) {
          return;
        }

        setProfile(currentProfile);
        setResults(resultSummaries);
        setOwnerHorses(horses);
        setJockeyAssignments(assignments);
      } catch (error) {
        if (isMounted) {
          setErrorMessage(error instanceof Error ? error.message : 'Unable to load race results.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void loadResults();

    return () => {
      isMounted = false;
    };
  }, []);

  const scopedResults = useMemo(() => {
    if (profile?.roleType === 'horse_owner') {
      if (ownerHorses.length === 0) {
        return [];
      }

      const ownerHorseIds = new Set(ownerHorses.map((horse) => String(horse.horseId)));
      return results.filter((result) => result.entries.some((entry) => ownerHorseIds.has(String(entry.horseId))));
    }

    if (profile?.roleType === 'jockey' && jockeyAssignments.length > 0) {
      const raceIds = new Set(jockeyAssignments.map((assignment) => String(assignment.raceId)).filter(Boolean));
      return results.filter((result) => raceIds.has(String(result.raceId)) || raceIds.has(String(result.id)));
    }

    return results;
  }, [jockeyAssignments, ownerHorses, profile?.roleType, results]);

  const tournamentOptions = useMemo(
    () => raceResultService.getTournamentFilterOptions(scopedResults.map((result) => ({
      id: result.id,
      raceId: result.raceId,
      raceName: result.raceName,
      raceNumber: result.raceNumber,
      tournamentName: result.tournamentName,
      track: result.track,
      date: result.date,
      status: result.status,
      publishedAt: result.publishedAt,
      totalPrizePool: result.totalPrizePool,
      topFinishers: [],
    }))),
    [scopedResults],
  );

  const filteredResults = useMemo(() => {
    const query = search.trim().toLowerCase();

    return scopedResults
      .filter((result) => {
        const sortedEntries = getSortedEntries(result.entries);
        const matchesSearch =
          !query ||
          result.raceName.toLowerCase().includes(query) ||
          result.tournamentName.toLowerCase().includes(query) ||
          result.track.toLowerCase().includes(query) ||
          sortedEntries.some(
            (entry) =>
              entry.horseName.toLowerCase().includes(query) ||
              entry.jockeyName.toLowerCase().includes(query),
          );
        const matchesStatus = status === 'all' || result.status === status;
        const matchesTournament = tournament === 'All Tournaments' || result.tournamentName === tournament;

        return matchesSearch && matchesStatus && matchesTournament;
      })
      .sort((first, second) => new Date(second.date).getTime() - new Date(first.date).getTime());
  }, [scopedResults, search, status, tournament]);

  const rows = useMemo(
    () => filteredResults.map((result) => ({
      result,
      perspective: getPerspective(result, profile, ownerHorses, jockeyAssignments),
      entries: getSortedEntries(result.entries),
    })),
    [filteredResults, jockeyAssignments, ownerHorses, profile],
  );

  const personalEntries = rows.map((row) => row.perspective.entry).filter((entry): entry is RaceResultEntry => Boolean(entry));
  const winCount = personalEntries.filter((entry) => entry.finishPosition === 1).length;
  const podiumCount = personalEntries.filter((entry) => entry.finishPosition !== null && entry.finishPosition <= 3).length;
  const publishedCount = filteredResults.filter((result) => result.status === 'published').length;
  const archiveLabel = profile?.roleType === 'jockey'
    ? 'Jockey Match History'
    : profile?.roleType === 'horse_owner'
      ? 'Stable Match History'
      : 'Race Match History';

  return (
    <div className="min-h-screen bg-surface py-10 text-on-surface racing-grid">
      <div className="mx-auto max-w-container px-4 md:px-margin-desktop">
        <header className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="mb-2 text-label-md font-bold uppercase tracking-[0.22em] text-secondary">Result Archive</p>
            <h1 className="font-display text-3xl font-extrabold text-primary md:text-5xl">{archiveLabel}</h1>
            <p className="mt-3 max-w-2xl text-body-md text-on-surface-variant">
              Review every finished race like a competitive match log: placement, finish time, gates,
              points, prize data, and a full post-race breakdown on demand.
            </p>
          </div>
          <ResultNav />
        </header>

        <section className="mb-6 grid gap-3 md:grid-cols-4">
          <StatTile icon={<Flag className="h-4 w-4" />} label="Race Logs" value={String(filteredResults.length)} />
          <StatTile icon={<Trophy className="h-4 w-4" />} label="Published" value={String(publishedCount)} />
          <StatTile icon={<Medal className="h-4 w-4" />} label="Wins" value={String(winCount)} />
          <StatTile icon={<Users className="h-4 w-4" />} label="Podiums" value={String(podiumCount)} />
        </section>

        <section className="mb-6 rounded-lg border border-outline-variant bg-surface-container/95 p-4 shadow-2xl shadow-black/20">
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto_auto] lg:items-center">
            <label className="relative block">
              <span className="sr-only">Search race history</span>
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-outline" />
              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search race, tournament, horse, jockey..."
                className="h-11 w-full rounded-md border border-outline-variant bg-surface-container-lowest pl-10 pr-4 text-body-sm text-on-surface placeholder:text-outline focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </label>

            <label className="flex items-center gap-2 rounded-md border border-outline-variant bg-surface-container-lowest px-3">
              <Filter className="h-4 w-4 text-outline" />
              <span className="sr-only">Filter by status</span>
              <select
                value={status}
                onChange={(event) => setStatus(event.target.value as StatusFilter)}
                className="h-11 min-w-36 bg-transparent text-body-sm text-on-surface focus:outline-none"
              >
                {statusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="rounded-md border border-outline-variant bg-surface-container-lowest px-3">
              <span className="sr-only">Filter by tournament</span>
              <select
                value={tournament}
                onChange={(event) => setTournament(event.target.value)}
                className="h-11 w-full min-w-48 bg-transparent text-body-sm text-on-surface focus:outline-none"
              >
                {tournamentOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </section>

        {isLoading ? (
          <EmptyState title="Loading match history" description="Syncing published race logs from the server." />
        ) : rows.length === 0 ? (
          <EmptyState title="No race history found" description="Try a different search or wait until a race result is published." />
        ) : (
          <section className="space-y-3" aria-label="Race history list">
            {rows.map(({ result, perspective, entries }) => (
              <RaceHistoryRow
                key={result.raceId || result.id}
                result={result}
                perspective={perspective}
                entries={entries}
              />
            ))}
          </section>
        )}
      </div>
    </div>
  );
};

const StatTile = ({ icon, label, value }: { icon: ReactNode; label: string; value: string }) => (
  <article className="rounded-lg border border-outline-variant bg-surface-container/90 p-4">
    <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-md border border-primary/30 bg-primary/10 text-primary">
      {icon}
    </div>
    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-outline">{label}</p>
    <p className="mt-1 font-display text-3xl font-extrabold text-on-surface tabular-nums">{value}</p>
  </article>
);

const EmptyState = ({ title, description }: { title: string; description: string }) => (
  <div className="rounded-lg border border-outline-variant bg-surface-container/95 p-10 text-center">
    <Trophy className="mx-auto mb-4 h-11 w-11 text-outline" />
    <h2 className="font-display text-2xl font-bold text-primary">{title}</h2>
    <p className="mx-auto mt-2 max-w-xl text-body-md text-on-surface-variant">{description}</p>
  </div>
);

const RaceHistoryRow = ({
  result,
  perspective,
  entries,
}: {
  result: RaceResultSummary;
  perspective: RacePerspective;
  entries: RaceResultEntry[];
}) => {
  const topFinishers = entries.filter((entry) => entry.finishPosition !== null).slice(0, 3);

  return (
    <Link
      to={getResultRoute(result)}
      className="group block rounded-lg border border-outline-variant bg-surface-container/95 p-4 shadow-xl shadow-black/20 transition-colors duration-200 hover:border-primary/70 hover:bg-surface-container-high focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      aria-label={`Open result detail for ${result.raceName}`}
    >
      <article className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(280px,0.75fr)_auto] xl:items-center">
        <div className="min-w-0">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="rounded border border-secondary/30 bg-secondary/10 px-2 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-secondary">
              R{result.raceNumber || '-'}
            </span>
            <span className="rounded border border-outline-variant bg-surface-container-low px-2 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-outline">
              {result.status}
            </span>
            <span className="text-label-sm uppercase tracking-[0.16em] text-outline">{result.tournamentName}</span>
          </div>
          <h2 className="truncate font-display text-2xl font-extrabold text-on-surface group-hover:text-primary">
            {result.raceName}
          </h2>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-body-sm text-on-surface-variant">
            <span className="inline-flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />
              {formatDate(result.date)}
            </span>
            <span className="inline-flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              {formatRaceTime(result.date)}
            </span>
            <span className="inline-flex items-center gap-2">
              <Flag className="h-4 w-4 text-primary" />
              {result.track}
            </span>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-[150px_minmax(0,1fr)]">
          <div className={`rounded-lg border p-3 ${getOutcomeClassName(perspective.entry)}`}>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] opacity-75">{perspective.label}</p>
            <p className="mt-1 font-display text-3xl font-extrabold tabular-nums">{getRankLabel(perspective.entry)}</p>
            <p className="mt-1 truncate text-label-sm font-semibold opacity-90">{perspective.context}</p>
          </div>

          <div className="rounded-lg border border-outline-variant bg-surface-container-low p-3">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-outline">Top finishers</p>
            <div className="space-y-2">
              {topFinishers.length === 0 ? (
                <p className="text-body-sm text-on-surface-variant">No ranked finishers yet.</p>
              ) : (
                topFinishers.map((entry) => <MiniFinisher key={entry.id || entry.horseId} entry={entry} />)
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 xl:min-w-48 xl:flex-col xl:items-end">
          <div className="grid grid-cols-2 gap-2 text-right xl:w-full">
            <InfoPill label="Time" value={perspective.entry?.finishTime ?? result.winnerTime ?? '-'} />
            <InfoPill label="Points" value={String(perspective.entry?.pointsAwarded ?? entries[0]?.pointsAwarded ?? 0)} />
          </div>
          <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-primary/40 bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-on-primary">
            <ChevronRight className="h-5 w-5" />
          </span>
        </div>
      </article>
    </Link>
  );
};

const MiniFinisher = ({ entry }: { entry: RaceResultEntry }) => (
  <div className="grid grid-cols-[38px_minmax(0,1fr)_auto] items-center gap-2 text-body-sm">
    <span className="font-display text-lg font-bold text-primary tabular-nums">#{entry.finishPosition}</span>
    <span className="truncate font-semibold text-on-surface">{entry.horseName}</span>
    <span className="truncate text-right text-on-surface-variant">{entry.finishTime ?? '-'}</span>
  </div>
);

const InfoPill = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-md border border-outline-variant bg-surface-container-low px-3 py-2">
    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-outline">{label}</p>
    <p className="mt-1 truncate text-body-sm font-bold text-on-surface tabular-nums">{value}</p>
  </div>
);

export default RaceResultList;
