import { useEffect, useMemo, useState } from 'react';
import { ChevronRight, Filter, Search, Trophy } from 'lucide-react';
import { Link } from 'react-router-dom';
import { authService } from '../../services/authService';
import { HorseService } from '../../services/HorseService';
import { raceResultService } from '../../services/raceResultService';
import type { Horse } from '../../types/horse';
import type { RaceResultListItem, RaceResultStatus, RaceResultSummary } from '../../types/raceResult';
import type { UserProfile } from '../../types/user';
import RaceResultCard from './components/RaceResultCard';
import ResultNav from './components/ResultNav';

type StatusFilter = RaceResultStatus | 'all';

const statusOptions: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'All Status' },
  { value: 'published', label: 'Published' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'draft', label: 'Draft' },
];

const formatDateTime = (value?: string) => {
  if (!value) {
    return '-';
  }

  return new Date(value).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const statusClassName = (status?: string) => {
  const value = String(status ?? '').toLowerCase();

  if (value === 'published' || value === 'confirmed') {
    return 'bg-secondary/15 text-secondary';
  }

  if (value === 'draft') {
    return 'bg-surface-container-high text-on-surface-variant';
  }

  return 'bg-surface-container-high text-on-surface-variant';
};

const RaceResultList = () => {
  const [profile, setProfile] = useState<UserProfile | undefined>(() => authService.getStoredUserProfile());
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [tournament, setTournament] = useState('All Tournaments');
  const [allResults, setAllResults] = useState<RaceResultListItem[]>([]);
  const [ownerHorses, setOwnerHorses] = useState<Horse[]>([]);
  const [ownerResultSummaries, setOwnerResultSummaries] = useState<RaceResultSummary[]>([]);
  const [selectedHorseId, setSelectedHorseId] = useState<number | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  const isOwner = profile?.roleType === 'horse_owner';

  useEffect(() => {
    let isMounted = true;

    const loadResults = async () => {
      setIsLoading(true);
      setErrorMessage('');

      try {
        const currentProfile = profile ?? await authService.getCurrentUser();

        if (!isMounted) {
          return;
        }

        setProfile(currentProfile);

        if (currentProfile.roleType === 'horse_owner') {
          const [horses, summaries] = await Promise.all([
            HorseService.getOwnerHorses(currentProfile),
            raceResultService.getRaceResultSummaries(),
          ]);

          if (isMounted) {
            setOwnerHorses(horses);
            setOwnerResultSummaries(summaries);
            setSelectedHorseId((current) => current ?? horses[0]?.horseId ?? null);
          }
        } else {
          const resultList = await raceResultService.getRaceResultList();

          if (isMounted) {
            setAllResults(resultList);
          }
        }
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

  const tournamentOptions = useMemo(
    () => raceResultService.getTournamentFilterOptions(allResults),
    [allResults],
  );

  const results = useMemo(() => {
    const query = search.trim().toLowerCase();

    return allResults.filter((item) => {
      const matchesSearch =
        !query ||
        item.raceName.toLowerCase().includes(query) ||
        item.tournamentName.toLowerCase().includes(query) ||
        item.track.toLowerCase().includes(query) ||
        item.topFinishers.some(
          (finisher) =>
            finisher.horseName.toLowerCase().includes(query) ||
            finisher.jockeyName.toLowerCase().includes(query),
        );
      const matchesStatus = status === 'all' || item.status === status;
      const matchesTournament = tournament === 'All Tournaments' || item.tournamentName === tournament;

      return matchesSearch && matchesStatus && matchesTournament;
    });
  }, [allResults, search, status, tournament]);

  const publishedCount = results.filter((item) => item.status === 'published').length;

  const selectedHorse = useMemo(
    () => ownerHorses.find((horse) => horse.horseId === selectedHorseId) ?? null,
    [ownerHorses, selectedHorseId],
  );

  const selectedHorseHistory = useMemo(() => {
    if (!selectedHorse) {
      return [];
    }

    return ownerResultSummaries
      .filter((summary) => summary.entries.some((entry) => Number(entry.horseId) === selectedHorse.horseId))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [ownerResultSummaries, selectedHorse]);

  const selectedHorseEntries = useMemo(
    () =>
      selectedHorseHistory.map((summary) => ({
        summary,
        entry: summary.entries.find((entry) => Number(entry.horseId) === selectedHorse?.horseId),
      })),
    [selectedHorse?.horseId, selectedHorseHistory],
  );

  if (isOwner) {
    return (
      <div className="bg-surface min-h-screen py-12">
        <div className="max-w-container mx-auto px-4 md:px-margin-desktop">
          <div className="flex flex-col gap-8 mb-10">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div>
                <p className="text-label-md text-secondary uppercase tracking-widest mb-2">Owner Result Screen</p>
                <h1 className="text-headline-lg font-bold text-primary mb-2">Horse Results</h1>
              </div>
              <ResultNav />
            </div>
          </div>

          {errorMessage && (
            <div className="mb-6 rounded-md border border-error/30 bg-error-container/20 px-4 py-3 text-body-sm font-semibold text-error">
              {errorMessage}
            </div>
          )}

          <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
            <section className="rounded-lg border border-outline-variant bg-white p-5">
              <div className="mb-4">
                <p className="text-label-sm text-secondary uppercase tracking-wider mb-1">Horse Menu</p>
                <h2 className="text-title-large font-bold text-primary">My Horses</h2>
              </div>

              {isLoading ? (
                <EmptyState title="Loading horses" description="Fetching your horse list." />
              ) : ownerHorses.length === 0 ? (
                <EmptyState title="No horses found" description="Your horses will appear here." />
              ) : (
                <div className="space-y-3">
                  {ownerHorses.map((horse) => (
                    <button
                      key={horse.horseId}
                      type="button"
                      onClick={() => {
                        setSelectedHorseId(horse.horseId);
                        setShowHistory(false);
                      }}
                      className={`flex w-full items-center gap-3 rounded-lg border px-4 py-3 text-left transition-colors ${
                        selectedHorseId === horse.horseId
                          ? 'border-primary bg-primary-container/10'
                          : 'border-outline-variant bg-surface-container-low hover:border-primary'
                      }`}
                    >
                      <img src={horse.avatarUrl} alt={horse.name} className="h-12 w-12 rounded-md border border-outline-variant object-cover" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-body-md font-bold text-primary">{horse.name}</p>
                        <p className="mt-1 text-body-sm text-on-surface-variant">{horse.breed} • Group {horse.rankGroup}</p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-outline" />
                    </button>
                  ))}
                </div>
              )}
            </section>

            <section className="rounded-lg border border-outline-variant bg-white p-6">
              {isLoading ? (
                <EmptyState title="Loading horse results" description="Fetching horse detail and race history." />
              ) : !selectedHorse ? (
                <EmptyState title="Select a horse" description="Choose a horse from the menu to see its info." />
              ) : (
                <div className="space-y-6">
                  <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                    <div className="flex items-start gap-4">
                      <img src={selectedHorse.avatarUrl} alt={selectedHorse.name} className="h-24 w-24 rounded-lg border border-outline-variant object-cover" />
                      <div>
                        <p className="text-label-md text-secondary uppercase tracking-wider">{selectedHorse.id}</p>
                        <h2 className="mt-2 text-headline-md font-bold text-primary">{selectedHorse.name}</h2>
                        <p className="mt-2 text-body-md text-on-surface-variant">
                          {selectedHorse.breed} • Group {selectedHorse.rankGroup} • {selectedHorse.totalWins} wins
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowHistory((current) => !current)}
                      className="rounded-md bg-primary px-5 py-3 text-body-sm font-bold text-on-primary transition-opacity hover:bg-opacity-90"
                    >
                      {showHistory ? 'Hide Race History' : 'View Race History'}
                    </button>
                  </div>

                  <div className="grid gap-4 md:grid-cols-4">
                    <InfoCard label="Status" value={selectedHorse.status} />
                    <InfoCard label="Points" value={String(selectedHorse.rankingPoints)} />
                    <InfoCard label="Age" value={String(selectedHorse.age)} />
                    <InfoCard label="Weight" value={`${selectedHorse.weightKg} kg`} />
                  </div>

                  {showHistory && (
                    <div className="space-y-4">
                      <div>
                        <p className="text-label-md text-secondary uppercase tracking-widest mb-1">Race History</p>
                        <h3 className="text-title-large font-bold text-primary">Past performances</h3>
                      </div>

                      {selectedHorseEntries.length === 0 ? (
                        <EmptyState title="No race history yet" description="This horse does not have any result history yet." />
                      ) : (
                        <div className="space-y-4">
                          {selectedHorseEntries.map(({ summary, entry }) => (
                            <article key={summary.id} className="rounded-lg border border-outline-variant bg-surface-container-low p-5">
                              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                                <div>
                                  <p className="text-label-sm text-secondary uppercase tracking-wider">{summary.tournamentName}</p>
                                  <h4 className="mt-2 text-body-lg font-bold text-primary">{summary.raceName}</h4>
                                  <p className="mt-2 text-body-sm text-on-surface-variant">
                                    {summary.track} • {formatDateTime(summary.date)}
                                  </p>
                                </div>

                                <div className="flex flex-wrap items-center gap-3">
                                  <span className={`inline-flex rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wider ${statusClassName(summary.status)}`}>
                                    {summary.status}
                                  </span>
                                  <Link
                                    to={`/results/${summary.id}`}
                                    className="rounded-md border border-outline-variant px-4 py-2 text-body-sm font-semibold text-primary transition-colors hover:border-primary"
                                  >
                                    Open Result
                                  </Link>
                                </div>
                              </div>

                              <div className="mt-4 grid gap-3 md:grid-cols-4">
                                <InfoCard label="Position" value={entry?.finishPosition ? `#${entry.finishPosition}` : 'DQ'} />
                                <InfoCard label="Jockey" value={entry?.jockeyName ?? '-'} />
                                <InfoCard label="Finish Time" value={entry?.finishTime ?? '-'} />
                                <InfoCard label="Points" value={String(entry?.pointsAwarded ?? 0)} />
                              </div>
                            </article>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </section>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-surface min-h-screen py-12">
      <div className="max-w-container mx-auto px-4 md:px-margin-desktop">
        <div className="flex flex-col gap-8 mb-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <p className="text-label-md text-secondary uppercase tracking-widest mb-2">Result Screen</p>
              <h1 className="text-headline-lg font-bold text-primary mb-2">Race Results</h1>
            </div>
            <ResultNav />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { label: 'Total Races', value: results.length.toString(), accent: 'text-primary' },
              { label: 'Published', value: publishedCount.toString(), accent: 'text-secondary' },
              { label: 'Tournaments', value: (tournamentOptions.length - 1).toString(), accent: 'text-tertiary' },
            ].map((stat) => (
              <article
                key={stat.label}
                className="rounded-lg border border-outline-variant bg-white p-5"
              >
                <p className="text-label-sm text-outline uppercase tracking-wider">{stat.label}</p>
                <p className={`mt-2 text-headline-md font-bold tabular-nums ${stat.accent}`}>{stat.value}</p>
              </article>
            ))}
          </div>
        </div>

        {errorMessage && (
          <div className="mb-6 rounded-md border border-error/30 bg-error-container/20 px-4 py-3 text-body-sm font-semibold text-error">
            {errorMessage}
          </div>
        )}

        <div className="flex flex-col lg:flex-row lg:items-center gap-4 mb-8">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-outline" />
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by race, horse, or jockey..."
              className="w-full bg-white border border-outline-variant rounded-md py-2.5 pl-10 pr-4 text-body-sm focus:outline-none focus:border-primary transition-colors"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-outline" />
              <select
                value={status}
                onChange={(event) => setStatus(event.target.value as StatusFilter)}
                className="bg-white border border-outline-variant rounded-md py-2.5 px-4 text-body-sm focus:outline-none focus:border-primary"
              >
                {statusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <select
              value={tournament}
              onChange={(event) => setTournament(event.target.value)}
              className="bg-white border border-outline-variant rounded-md py-2.5 px-4 text-body-sm focus:outline-none focus:border-primary"
            >
              {tournamentOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
        </div>

        {isLoading ? (
          <EmptyState title="Loading results" description="Fetching race results from the server." />
        ) : results.length === 0 ? (
          <EmptyState title="No results found" description="Try adjusting your search or filter criteria." />
        ) : (
          <div className="space-y-10">
            {results.map((result) => (
              <RaceResultCard key={result.id} result={result} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const InfoCard = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-lg border border-outline-variant bg-white p-4">
    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-outline">{label}</p>
    <p className="mt-1 text-body-md font-semibold text-primary">{value}</p>
  </div>
);

const EmptyState = ({ title, description }: { title: string; description: string }) => (
  <div className="rounded-lg border border-outline-variant bg-white p-12 text-center">
    <Trophy className="w-10 h-10 text-outline mx-auto mb-4" />
    <h2 className="text-headline-md font-bold text-primary mb-2">{title}</h2>
    <p className="text-body-md text-on-surface-variant">{description}</p>
  </div>
);

export default RaceResultList;
