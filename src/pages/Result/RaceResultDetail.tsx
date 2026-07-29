import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  ArrowLeft,
  Calendar,
  Flag,
  MapPin,
  Medal,
  Timer,
  Trophy,
  User,
  Zap,
} from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { authService } from '../../services/authService';
import { jockeyAssignmentService, type JockeyAssignmentItem } from '../../services/jockeyAssignmentService';
import { raceResultService } from '../../services/raceResultService';
import { raceRoundService, type RaceRoundItem } from '../../services/raceRoundService';
import type { RaceResultEntry, RaceResultSummary } from '../../types/raceResult';
import type { UserProfile } from '../../types/user';
import PrizeBreakdown from '../../components/Result/PrizeBreakdown';
import ResultStatusChip from '../../components/Result/ResultStatusChip';
import RankBadge from '../../components/Result/RankBadge';

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
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const formatPublishedAt = (value?: string) => {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatLapTime = (value?: number) => {
  if (value === undefined || !Number.isFinite(value)) {
    return '-';
  }

  return `${value.toFixed(2)}s`;
};


const getSortedEntries = (entries: RaceResultEntry[]) => [...entries].sort((first, second) => {
  if (first.isDisqualified && !second.isDisqualified) {
    return 1;
  }

  if (!first.isDisqualified && second.isDisqualified) {
    return -1;
  }

  return (first.finishPosition ?? 999) - (second.finishPosition ?? 999);
});

const isRoundForEntry = (round: RaceRoundItem, entry: RaceResultEntry) => (
  sameId(round.assignmentId, entry.assignmentId) ||
  sameId(round.horseId, entry.horseId) ||
  normalizeText(round.jockeyFullName) === normalizeText(entry.jockeyName)
);

const getRoundsForEntry = (entry: RaceResultEntry, rounds: RaceRoundItem[]) =>
  rounds.filter((round) => isRoundForEntry(round, entry));

const getBestLap = (entry: RaceResultEntry, rounds: RaceRoundItem[]) => {
  const lapTimes = getRoundsForEntry(entry, rounds)
    .map((round) => round.lapTimeSec)
    .filter((time): time is number => time !== undefined && Number.isFinite(time));

  if (lapTimes.length === 0) {
    return undefined;
  }

  return Math.min(...lapTimes);
};

const getCurrentJockeyEntry = (
  result: RaceResultSummary | undefined,
  profile: UserProfile | undefined,
  assignments: JockeyAssignmentItem[],
) => {
  if (!result || profile?.roleType !== 'jockey') {
    return undefined;
  }

  const raceAssignments = assignments.filter((assignment) => sameId(assignment.raceId, result.raceId));

  for (const assignment of raceAssignments) {
    const byAssignment = result.entries.find((entry) => sameId(entry.assignmentId, assignment.assignmentId ?? assignment.id));
    if (byAssignment) {
      return byAssignment;
    }

    const byHorse = result.entries.find((entry) => sameId(entry.horseId, assignment.horseId));
    if (byHorse) {
      return byHorse;
    }
  }

  return result.entries.find((entry) => normalizeText(entry.jockeyName) === normalizeText(profile.fullName));
};

const groupRoundsByLap = (rounds: RaceRoundItem[]) => {
  const groups = new Map<number, RaceRoundItem[]>();

  rounds.forEach((round) => {
    const lapNumber = round.roundNumber || 1;
    groups.set(lapNumber, [...(groups.get(lapNumber) ?? []), round]);
  });

  return Array.from(groups.entries())
    .map(([lapNumber, lapRounds]) => ({
      lapNumber,
      rounds: lapRounds.sort((first, second) => first.position - second.position),
    }))
    .sort((first, second) => first.lapNumber - second.lapNumber);
};

const RaceResultDetail = () => {
  const { resultId } = useParams<{ resultId: string }>();
  const [profile, setProfile] = useState<UserProfile | undefined>(() => authService.getStoredUserProfile());
  const [result, setResult] = useState<RaceResultSummary | undefined>();
  const [rounds, setRounds] = useState<RaceRoundItem[]>([]);
  const [jockeyAssignments, setJockeyAssignments] = useState<JockeyAssignmentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [lapMessage, setLapMessage] = useState('');

  useEffect(() => {
    let isMounted = true;

    const loadResult = async () => {
      if (!resultId) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setErrorMessage('');
      setLapMessage('');

      try {
        const currentProfile = authService.getStoredUserProfile();
        const resultDetail = await raceResultService.getRaceResultById(resultId);
        const [roundItems, assignmentItems] = await Promise.all([
          raceRoundService.getRoundsByRace(resultDetail.raceId || resultId).catch(() => {
            if (isMounted) {
              setLapMessage('Lap telemetry is not available for this race yet.');
            }
            return [];
          }),
          currentProfile?.roleType === 'jockey'
            ? jockeyAssignmentService.getMine().catch(() => [])
            : Promise.resolve([]),
        ]);

        if (!isMounted) {
          return;
        }

        setProfile(currentProfile);
        setResult(resultDetail);
        setRounds(roundItems);
        setJockeyAssignments(assignmentItems);
      } catch (error) {
        if (isMounted) {
          setResult(undefined);
          setRounds([]);
          setErrorMessage(error instanceof Error ? error.message : 'Unable to load race result.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void loadResult();

    return () => {
      isMounted = false;
    };
  }, [resultId]);

  const standings = useMemo(() => getSortedEntries(result?.entries ?? []), [result?.entries]);
  const lapGroups = useMemo(() => groupRoundsByLap(rounds), [rounds]);
  const currentEntry = useMemo(
    () => getCurrentJockeyEntry(result, profile, jockeyAssignments),
    [jockeyAssignments, profile, result],
  );
  const currentRounds = useMemo(
    () => (currentEntry ? getRoundsForEntry(currentEntry, rounds) : []),
    [currentEntry, rounds],
  );
  const podium = standings.filter((entry) => entry.finishPosition !== null && entry.finishPosition <= 3);
  const hasPrizeData = result
    ? result.totalPrizePool !== '-' || result.prizeDistributions.some((prize) => prize.amount !== '-')
    : false;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-surface py-12 text-on-surface racing-grid">
        <div className="mx-auto max-w-container px-4 text-center md:px-margin-desktop">
          <Trophy className="mx-auto mb-4 h-12 w-12 text-outline" />
          <h1 className="font-display text-3xl font-bold text-primary">Loading post-race report</h1>
          <p className="mt-2 text-body-md text-on-surface-variant">Fetching standings and lap telemetry.</p>
        </div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="min-h-screen bg-surface py-12 text-on-surface racing-grid">
        <div className="mx-auto max-w-container px-4 text-center md:px-margin-desktop">
          <Trophy className="mx-auto mb-4 h-12 w-12 text-outline" />
          <h1 className="font-display text-3xl font-bold text-primary">Result not found</h1>
          <p className="mx-auto mt-2 max-w-xl text-body-md text-on-surface-variant">
            {errorMessage || 'The race result you are looking for does not exist or has been removed.'}
          </p>
          <Link
            to="/results"
            className="mt-6 inline-flex items-center gap-2 rounded-md bg-primary px-5 py-3 text-body-sm font-bold text-on-primary transition-colors hover:bg-primary-container"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Results
          </Link>
        </div>
      </div>
    );
  }

  const publishedLabel = formatPublishedAt(result.publishedAt);

  return (
    <div className="min-h-screen bg-surface py-10 text-on-surface racing-grid">
      <div className="mx-auto max-w-container px-4 md:px-margin-desktop">
        <Link
          to="/results"
          className="mb-6 inline-flex items-center gap-2 text-body-sm font-bold text-on-surface-variant transition-colors hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Match History
        </Link>

        <section className="mb-6 overflow-hidden rounded-lg border border-outline-variant bg-surface-container/95 shadow-2xl shadow-black/30">
          <div className="border-b border-outline-variant bg-surface-container-lowest px-5 py-4">
            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded border border-secondary/30 bg-secondary/10 px-2 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-secondary">
                Post-Race Report
              </span>
              <ResultStatusChip status={result.status} />
              {publishedLabel && (
                <span className="text-label-sm uppercase tracking-[0.16em] text-outline">Published {publishedLabel}</span>
              )}
            </div>
          </div>

          <div className="grid gap-6 p-5 lg:grid-cols-[minmax(0,1fr)_320px] lg:p-7">
            <div className="min-w-0">
              <p className="mb-2 text-label-md font-bold uppercase tracking-[0.2em] text-primary">
                R{result.raceNumber || '-'} / {result.grade}
              </p>
              <h1 className="font-display text-3xl font-extrabold text-on-surface md:text-5xl">{result.raceName}</h1>
              <p className="mt-3 max-w-2xl text-body-md text-on-surface-variant">{result.tournamentName}</p>
              <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-body-sm text-on-surface-variant">
                <span className="inline-flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-primary" />
                  {formatDate(result.date)}
                </span>
                <span className="inline-flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-primary" />
                  {result.track}, {result.location}
                </span>
                <span className="inline-flex items-center gap-2">
                  <Flag className="h-4 w-4 text-primary" />
                  {result.distance} / {result.trackType}
                </span>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              <MatchPanel
                icon={<Trophy className="h-4 w-4" />}
                label="Winner"
                title={result.winnerHorse}
                detail={`${result.winnerJockey} / ${result.winnerTime}`}
                tone="gold"
              />
              <MatchPanel
                icon={<Medal className="h-4 w-4" />}
                label={currentEntry ? 'Your Finish' : 'Field Size'}
                title={currentEntry ? getRankText(currentEntry) : `${result.entries.length} runners`}
                detail={currentEntry ? `${currentEntry.horseName} / ${currentEntry.finishTime ?? '-'}` : result.totalPrizePool}
                tone={currentEntry?.finishPosition === 1 ? 'gold' : 'green'}
              />
            </div>
          </div>
        </section>

        <section className="mb-6 grid gap-3 md:grid-cols-4">
          <MetricTile icon={<Flag className="h-4 w-4" />} label="Distance" value={result.distance} />
          <MetricTile icon={<Timer className="h-4 w-4" />} label="Winning Time" value={result.winnerTime} />
          <MetricTile icon={<User className="h-4 w-4" />} label="Runners" value={String(result.entries.length)} />
          <MetricTile icon={<Zap className="h-4 w-4" />} label="Lap Records" value={String(rounds.length)} />
        </section>

        {currentEntry && (
          <section className="mb-6 rounded-lg border border-primary/40 bg-primary/10 p-5">
            <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-label-sm font-bold uppercase tracking-[0.18em] text-primary">Jockey Focus</p>
                <h2 className="mt-1 font-display text-2xl font-bold text-on-surface">Your race line</h2>
              </div>
              <p className="text-body-sm text-on-surface-variant">
                {currentEntry.horseName} with gate {currentEntry.gateNumber || '-'}
              </p>
            </div>
            <div className="grid gap-3 md:grid-cols-4">
              <MetricTile label="Finish" value={getRankText(currentEntry)} />
              <MetricTile label="Finish Time" value={currentEntry.finishTime ?? '-'} />
              <MetricTile label="Points" value={String(currentEntry.pointsAwarded)} />
              <MetricTile label="Best Lap" value={formatLapTime(getBestLap(currentEntry, rounds))} />
            </div>
            {currentRounds.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {currentRounds
                  .sort((first, second) => first.roundNumber - second.roundNumber)
                  .map((round) => (
                    <span
                      key={round.roundId}
                      className="rounded-md border border-primary/30 bg-surface-container px-3 py-2 text-label-sm font-bold text-on-surface"
                    >
                      Lap {round.roundNumber}: #{round.position} / {formatLapTime(round.lapTimeSec)}
                    </span>
                  ))}
              </div>
            )}
          </section>
        )}

        {podium.length > 0 && (
          <section className="mb-6 grid gap-3 md:grid-cols-3">
            {podium.map((entry) => (
              <article
                key={entry.id || entry.horseId}
                className="rounded-lg border border-outline-variant bg-surface-container/95 p-4 transition-colors hover:border-primary/60"
              >
                <div className="mb-3 flex items-center gap-3">
                  <RankBadge rank={entry.finishPosition as number} />
                  <div className="min-w-0">
                    <h3 className="truncate font-display text-lg font-bold text-on-surface">{entry.horseName}</h3>
                    <p className="truncate text-body-sm text-on-surface-variant">{entry.jockeyName}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <MetricPill label="Time" value={entry.finishTime ?? '-'} />
                  <MetricPill label="Point" value={String(entry.pointsAwarded)} />
                </div>
              </article>
            ))}
          </section>
        )}

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <section className="overflow-hidden rounded-lg border border-outline-variant bg-surface-container/95">
            <div className="border-b border-outline-variant px-5 py-4">
              <p className="text-label-sm font-bold uppercase tracking-[0.18em] text-secondary">Final Standings</p>
              <h2 className="mt-1 font-display text-2xl font-bold text-on-surface">Scoreboard</h2>
            </div>
            <StandingsTable
              entries={standings}
              currentEntry={currentEntry}
            />
          </section>

          <div className="space-y-6">
            <LapBreakdown
              lapGroups={lapGroups}
              currentEntry={currentEntry}
              lapMessage={lapMessage}
            />
            {hasPrizeData && (
              <PrizeBreakdown distributions={result.prizeDistributions} totalPrizePool={result.totalPrizePool} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const getRankText = (entry: RaceResultEntry) => {
  if (entry.isDisqualified) {
    return 'DQ';
  }

  return entry.finishPosition ? `#${entry.finishPosition}` : '-';
};

const isSameEntry = (first?: RaceResultEntry, second?: RaceResultEntry) => {
  if (!first || !second) {
    return false;
  }

  return sameId(first.assignmentId, second.assignmentId) || sameId(first.horseId, second.horseId);
};

const MatchPanel = ({
  icon,
  label,
  title,
  detail,
  tone,
}: {
  icon: ReactNode;
  label: string;
  title: string;
  detail: string;
  tone: 'gold' | 'green';
}) => (
  <article className={`rounded-lg border p-4 ${tone === 'gold' ? 'border-primary/50 bg-primary/10' : 'border-secondary/40 bg-secondary/10'}`}>
    <div className={`mb-3 inline-flex h-9 w-9 items-center justify-center rounded-md ${tone === 'gold' ? 'bg-primary text-on-primary' : 'bg-secondary text-on-secondary'}`}>
      {icon}
    </div>
    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-outline">{label}</p>
    <p className="mt-1 truncate font-display text-2xl font-extrabold text-on-surface">{title}</p>
    <p className="mt-1 truncate text-body-sm text-on-surface-variant">{detail}</p>
  </article>
);

const MetricTile = ({ icon, label, value }: { icon?: ReactNode; label: string; value: string }) => (
  <article className="rounded-lg border border-outline-variant bg-surface-container/95 p-4">
    {icon && <div className="mb-3 text-primary">{icon}</div>}
    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-outline">{label}</p>
    <p className="mt-1 truncate font-display text-2xl font-bold text-on-surface tabular-nums">{value}</p>
  </article>
);

const MetricPill = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-md border border-outline-variant bg-surface-container-low px-3 py-2">
    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-outline">{label}</p>
    <p className="mt-1 truncate text-body-sm font-bold text-on-surface tabular-nums">{value}</p>
  </div>
);

const StandingsTable = ({
  entries,
  currentEntry,
}: {
  entries: RaceResultEntry[];
  currentEntry?: RaceResultEntry;
}) => (
  <div className="w-full">
    <div className="hidden border-b border-outline-variant bg-surface-container-lowest px-4 py-3 md:grid md:grid-cols-[96px_minmax(0,1.6fr)_160px_96px] md:gap-3">
      <span className="text-label-sm uppercase tracking-[0.16em] text-outline">Finish</span>
      <span className="text-label-sm uppercase tracking-[0.16em] text-outline">Runner</span>
      <span className="text-right text-label-sm uppercase tracking-[0.16em] text-outline">Time</span>
      <span className="text-right text-label-sm uppercase tracking-[0.16em] text-outline">Point</span>
    </div>

    <div className="divide-y divide-outline-variant">
      {entries.map((entry) => {
        const isCurrent = isSameEntry(entry, currentEntry);

        return (
          <article
            key={entry.id || entry.horseId}
            className={`grid gap-3 px-4 py-4 transition-colors hover:bg-surface-container-high md:grid-cols-[96px_minmax(0,1.6fr)_160px_96px] md:items-center ${entry.isDisqualified ? 'bg-error-container/20' : ''} ${isCurrent ? 'bg-primary/10' : ''}`}
          >
            <div className="flex items-center justify-between gap-3 md:block">
              <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-outline md:hidden">Finish</span>
              <FinishBadge entry={entry} />
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="min-w-0 truncate text-body-sm font-bold text-on-surface">{entry.horseName}</p>
                <span className="rounded border border-outline-variant bg-surface-container-low px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-outline">
                  Gate {entry.gateNumber || '-'}
                </span>
                {isCurrent && (
                  <span className="rounded border border-primary/40 bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-primary">
                    You
                  </span>
                )}
              </div>
              <p className="mt-1 truncate text-label-sm text-on-surface-variant">{entry.jockeyName}</p>
              {entry.isDisqualified && entry.disqualificationReason && (
                <p className="mt-1 text-label-sm text-error">{entry.disqualificationReason}</p>
              )}
            </div>

            <div className="flex items-center justify-between gap-3 rounded-md border border-outline-variant bg-surface-container-low px-3 py-2 md:block md:border-0 md:bg-transparent md:px-0 md:py-0 md:text-right">
              <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-outline md:hidden">Time</span>
              <span className="whitespace-nowrap text-body-sm font-bold text-on-surface tabular-nums">{entry.finishTime ?? '-'}</span>
            </div>

            <div className="flex items-center justify-between gap-3 rounded-md border border-outline-variant bg-surface-container-low px-3 py-2 md:block md:border-0 md:bg-transparent md:px-0 md:py-0 md:text-right">
              <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-outline md:hidden">Point</span>
              <span className="whitespace-nowrap text-body-sm font-bold text-primary tabular-nums">{entry.pointsAwarded}</span>
            </div>
          </article>
        );
      })}
    </div>
  </div>
);

const FinishBadge = ({ entry }: { entry: RaceResultEntry }) => {
  const label = entry.isDisqualified ? 'DQ' : `#${entry.finishPosition ?? '-'}`;
  const rank = entry.finishPosition ?? 999;
  const className = entry.isDisqualified
    ? 'border-error/50 bg-error-container/30 text-error'
    : rank === 1
      ? 'border-primary/60 bg-primary/15 text-primary'
      : rank <= 3
        ? 'border-secondary/50 bg-secondary/15 text-secondary'
        : 'border-outline-variant bg-surface-container-low text-on-surface-variant';

  return (
    <span className={`inline-flex h-9 min-w-11 items-center justify-center rounded-md border px-3 font-display text-base font-extrabold tabular-nums ${className}`}>
      {label}
    </span>
  );
};
const LapBreakdown = ({
  lapGroups,
  currentEntry,
  lapMessage,
}: {
  lapGroups: Array<{ lapNumber: number; rounds: RaceRoundItem[] }>;
  currentEntry?: RaceResultEntry;
  lapMessage: string;
}) => (
  <section className="rounded-lg border border-outline-variant bg-surface-container/95">
    <div className="border-b border-outline-variant px-5 py-4">
      <p className="text-label-sm font-bold uppercase tracking-[0.18em] text-secondary">Lap Breakdown</p>
      <h2 className="mt-1 font-display text-2xl font-bold text-on-surface">Race timeline</h2>
    </div>
    <div className="space-y-3 p-4">
      {lapGroups.length === 0 ? (
        <div className="rounded-lg border border-dashed border-outline-variant bg-surface-container-low p-5 text-body-sm text-on-surface-variant">
          {lapMessage || 'No lap records were returned for this race.'}
        </div>
      ) : (
        lapGroups.map((group) => (
          <article key={group.lapNumber} className="rounded-lg border border-outline-variant bg-surface-container-low p-3">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 className="font-display text-lg font-bold text-primary">Lap {group.lapNumber}</h3>
              <span className="text-label-sm font-bold uppercase tracking-[0.14em] text-outline">
                {group.rounds.length} runners
              </span>
            </div>
            <div className="space-y-2">
              {group.rounds.map((round) => {
                const isCurrent = currentEntry
                  ? sameId(round.assignmentId, currentEntry.assignmentId) || sameId(round.horseId, currentEntry.horseId)
                  : false;

                return (
                  <div
                    key={round.roundId}
                    className={`grid grid-cols-[44px_minmax(0,1fr)_72px] items-center gap-2 rounded-md border px-3 py-2 text-body-sm ${isCurrent ? 'border-primary/50 bg-primary/10' : 'border-outline-variant bg-surface-container'}`}
                  >
                    <span className="font-display text-lg font-bold text-primary tabular-nums">#{round.position}</span>
                    <span className="min-w-0 truncate font-semibold text-on-surface">
                      {round.horseName ?? round.jockeyFullName ?? `Assignment ${round.assignmentId}`}
                    </span>
                    <span className="text-right font-bold text-secondary tabular-nums">{formatLapTime(round.lapTimeSec)}</span>
                  </div>
                );
              })}
            </div>
          </article>
        ))
      )}
    </div>
  </section>
);

export default RaceResultDetail;
