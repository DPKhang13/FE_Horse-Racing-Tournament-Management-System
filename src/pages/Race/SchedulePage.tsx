import { useEffect, useMemo, useState } from 'react';
import { Calendar, ChevronRight, Clock, MapPin, Search, Trophy, X } from 'lucide-react';
import { getApiErrorMessage, apiClient, unwrapApiList } from '../../services/apiClient';
import { authService } from '../../services/authService';
import { useToastNotifications } from '../../hooks/useToastNotifications';
import { scheduleService, type TournamentApiItem } from '../../services/scheduleService';
import { raceCrudService, type RaceCrudItem, type RaceRoundItem } from '../../services/raceCrudService';
import type { UserProfile } from '../../types/user';

const formatDate = (value?: string) => {
  if (!value) return '-';
  const d = new Date(value);
  if (isNaN(d.getTime())) return '-';
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: '2-digit', year: 'numeric' }).format(d);
};

const formatDateTime = (value?: string) => {
  if (!value) return '-';
  const d = new Date(value);
  if (isNaN(d.getTime())) return '-';
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const formatCurrency = (value?: number) => {
  if (!value) return '-';
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(value);
};

const loadRoundsForRace = async (raceId: number): Promise<RaceRoundItem[]> => {
  try {
    const response = await apiClient.get('/api/race-rounds/get-all', { params: { raceId } });
    const rawList = unwrapApiList<Record<string, unknown>>(response);
    return rawList.map((raw, index) => ({
      roundId: Number(raw.roundId ?? raw.id ?? index + 1),
      raceId: Number(raw.raceId ?? raceId),
      assignmentId: raw.assignmentId ? Number(raw.assignmentId) : undefined,
      horseId: raw.horseId ? Number(raw.horseId) : undefined,
      horseName: raw.horseName ? String(raw.horseName) : undefined,
      jockeyFullName: raw.jockeyFullName ? String(raw.jockeyFullName) : undefined,
      roundNumber: Number(raw.roundNumber ?? index + 1),
      position: raw.position !== undefined && raw.position !== null ? Number(raw.position) : undefined,
      lapTimeSec: Number(raw.lapTimeSec ?? 0),
      recordedAt: raw.recordedAt ? String(raw.recordedAt) : undefined,
    }));
  } catch {
    return [];
  }
};

const SchedulePage = () => {
  const [profile, setProfile] = useState<UserProfile | undefined>(() => authService.getStoredUserProfile());
  const [tournaments, setTournaments] = useState<TournamentApiItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Detail view state
  const [selectedTournamentId, setSelectedTournamentId] = useState<number | null>(null);
  const [tournamentRaces, setTournamentRaces] = useState<RaceCrudItem[]>([]);
  const [raceRounds, setRaceRounds] = useState<Map<number, RaceRoundItem[]>>(new Map());
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [selectedRaceId, setSelectedRaceId] = useState<number | null>(null);

  const isOwner = profile?.roleType === 'horse_owner';
  const isJockey = profile?.roleType === 'jockey';

  useToastNotifications([errorMessage ? { tone: 'error', text: errorMessage } : null]);

  useEffect(() => {
    const syncAuth = () => setProfile(authService.getStoredUserProfile());
    window.addEventListener('auth-changed', syncAuth);
    window.addEventListener('storage', syncAuth);
    return () => {
      window.removeEventListener('auth-changed', syncAuth);
      window.removeEventListener('storage', syncAuth);
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setIsLoading(true);
      setErrorMessage('');
      try {
        const data = await scheduleService.getTournaments();
        if (mounted) setTournaments(data);
      } catch (err) {
        if (mounted) setErrorMessage(getApiErrorMessage(err, 'Unable to load tournaments.'));
      } finally {
        if (mounted) setIsLoading(false);
      }
    };
    void load();
    return () => { mounted = false; };
  }, []);

  const filteredTournaments = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return tournaments;
    return tournaments.filter((t) =>
      [t.name, t.location, t.status].some((v) => v?.toLowerCase().includes(q)),
    );
  }, [tournaments, searchQuery]);

  const openDetail = async (tournamentId: number) => {
    setSelectedTournamentId(tournamentId);
    setIsDetailLoading(true);
    try {
      const races = await raceCrudService.getRacesByTournament(tournamentId);
      setTournamentRaces(races);
      const roundsMap = new Map<number, RaceRoundItem[]>();
      for (const race of races) {
        const rounds = await loadRoundsForRace(race.raceId);
        if (rounds.length > 0) roundsMap.set(race.raceId, rounds);
      }
      setRaceRounds(roundsMap);
    } catch {
      setErrorMessage('Failed to load tournament details.');
    } finally {
      setIsDetailLoading(false);
    }
  };

  const closeDetail = () => {
    setSelectedTournamentId(null);
    setTournamentRaces([]);
    setRaceRounds(new Map());
    setSelectedRaceId(null);
  };

  const selectedTournament = tournaments.find(
    (t) => (t.tournamentId ?? t.id) === selectedTournamentId,
  );

  const getStatusColor = (status?: string) => {
    const s = status?.toLowerCase() ?? '';
    if (s.includes('open') || s.includes('registration')) return 'bg-secondary/10 text-secondary';
    if (s.includes('ongoing') || s.includes('progress')) return 'bg-tertiary/10 text-tertiary';
    if (s.includes('complete')) return 'bg-primary/10 text-primary';
    if (s.includes('cancel')) return 'bg-error/10 text-error';
    return 'bg-surface-container-high text-on-surface-variant';
  };

  return (
    <div className="bg-surface min-h-screen py-12">
      <div className="max-w-container mx-auto px-4 md:px-margin-desktop">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
          <div>
            <p className="text-label-md text-secondary uppercase tracking-widest mb-2">
              {isOwner ? 'Horse Owner' : isJockey ? 'Jockey' : 'Spectator'} Schedule
            </p>
            <h1 className="text-headline-lg font-bold text-primary mb-2">Tournament Schedule</h1>
            <p className="text-body-md text-on-surface-variant">Browse all tournaments and their race details.</p>
          </div>
          <div className="relative w-full max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-outline" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tournaments..."
              className="w-full bg-white border border-outline-variant rounded-md py-2.5 pl-10 pr-4 text-body-sm focus:outline-none focus:border-primary"
            />
          </div>
        </div>

        {isLoading ? (
          <LoadingState />
        ) : filteredTournaments.length === 0 ? (
          <EmptyState title="No tournaments found" description="Check back later for upcoming events." />
        ) : (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {filteredTournaments.map((t) => {
              const tid = t.tournamentId ?? t.id ?? 0;
              return (
                <button
                  key={tid}
                  type="button"
                  onClick={() => openDetail(tid)}
                  className="bg-white border border-outline-variant rounded-lg p-6 text-left hover:border-secondary transition-all group"
                >
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <h3 className="text-body-lg font-bold text-primary group-hover:text-secondary transition-colors">
                      {t.name ?? `Tournament ${tid}`}
                    </h3>
                    <ChevronRight className="h-5 w-5 text-outline shrink-0 mt-0.5" />
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-body-sm text-on-surface-variant">
                      <MapPin className="w-4 h-4 shrink-0" />
                      <span>{t.location ?? '-'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-body-sm text-on-surface-variant">
                      <Calendar className="w-4 h-4 shrink-0" />
                      <span>{formatDate(t.startDate)} — {formatDate(t.endDate)}</span>
                    </div>
                    {t.prizePool ? (
                      <div className="flex items-center gap-2 text-body-sm font-semibold text-secondary">
                        <Trophy className="w-4 h-4 shrink-0" />
                        <span>{formatCurrency(t.prizePool)}</span>
                      </div>
                    ) : null}
                  </div>
                  <div className="mt-4">
                    <span className={`inline-flex rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${getStatusColor(t.status)}`}>
                      {t.status ?? '-'}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {selectedTournament && (
        <div className="fixed inset-0 z-[70] overflow-y-auto bg-black/55 px-4 py-8">
          <div className="mx-auto max-w-6xl rounded-lg border border-outline-variant bg-white shadow-xl">
            <div className="flex items-start justify-between gap-6 border-b border-outline-variant p-6">
              <div>
                <p className="mb-2 text-label-sm font-bold uppercase tracking-widest text-outline">
                  {selectedTournament.location ?? '-'}
                </p>
                <h2 className="text-headline-md font-bold text-primary">
                  {selectedTournament.name ?? `Tournament ${selectedTournamentId}`}
                </h2>
                <div className="flex flex-wrap gap-4 mt-3">
                  <span className="text-body-sm text-on-surface-variant">
                    <Calendar className="inline w-3.5 h-3.5 mr-1" />
                    {formatDate(selectedTournament.startDate)} — {formatDate(selectedTournament.endDate)}
                  </span>
                  {selectedTournament.prizePool ? (
                    <span className="text-body-sm font-semibold text-secondary">
                      <Trophy className="inline w-3.5 h-3.5 mr-1" />
                      {formatCurrency(selectedTournament.prizePool)}
                    </span>
                  ) : null}
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${getStatusColor(selectedTournament.status)}`}>
                    {selectedTournament.status ?? '-'}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={closeDetail}
                className="flex h-10 w-10 items-center justify-center rounded-md border border-outline-variant text-on-surface-variant hover:border-primary hover:text-primary shrink-0"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6">
              {isDetailLoading ? (
                <LoadingState />
              ) : tournamentRaces.length === 0 ? (
                <EmptyState title="No races" description="This tournament does not have any races yet." />
              ) : (
                <div className="space-y-6">
                  {tournamentRaces.map((race) => {
                    const rounds = raceRounds.get(race.raceId) ?? [];
                    const isExpanded = selectedRaceId === race.raceId;
                    return (
                      <div key={race.raceId} className="border border-outline-variant rounded-lg overflow-hidden">
                        <button
                          type="button"
                          onClick={() => setSelectedRaceId(isExpanded ? null : race.raceId)}
                          className="w-full flex items-center justify-between gap-4 p-5 bg-surface-container-low hover:bg-surface-container transition-colors text-left"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="text-body-lg font-bold text-primary">{race.name}</h4>
                              <span className="text-[10px] font-bold text-secondary bg-secondary/10 px-2 py-0.5 rounded uppercase">{race.rankGroup}</span>
                            </div>
                            <div className="flex flex-wrap gap-x-4 gap-y-1 text-body-sm text-on-surface-variant">
                              <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{formatDateTime(race.scheduledAt)}</span>
                              <span>{race.distanceM}m • {race.trackType}</span>
                              <span>{race.lapCount} lap(s)</span>
                              {rounds.length > 0 && <span className="text-secondary font-semibold">{rounds.length} round(s)</span>}
                            </div>
                          </div>
                          <ChevronRight className={`h-5 w-5 text-outline shrink-0 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                        </button>

                        {isExpanded && (
                          <div className="border-t border-outline-variant p-5 bg-white">
                            <p className="text-label-sm font-bold uppercase tracking-wider text-outline mb-3">Race Details</p>
                            <div className="grid gap-3 sm:grid-cols-3 mb-4">
                              <InfoPill label="Status" value={race.status} />
                              <InfoPill label="Max Horses" value={String(race.maxHorses)} />
                              <InfoPill label="Race Number" value={String(race.raceNumber)} />
                            </div>

                            {rounds.length > 0 && (
                              <>
                                <p className="text-label-sm font-bold uppercase tracking-wider text-outline mb-3">Laps / Rounds</p>
                                <div className="overflow-x-auto">
                                  <table className="w-full min-w-[500px] text-left text-body-sm">
                                    <thead>
                                      <tr className="border-b border-outline-variant">
                                        <th className="px-3 py-2 text-label-sm text-outline uppercase tracking-wider">Round</th>
                                        <th className="px-3 py-2 text-label-sm text-outline uppercase tracking-wider">Horse</th>
                                        <th className="px-3 py-2 text-label-sm text-outline uppercase tracking-wider">Jockey</th>
                                        <th className="px-3 py-2 text-label-sm text-outline uppercase tracking-wider">Position</th>
                                        <th className="px-3 py-2 text-label-sm text-outline uppercase tracking-wider">Lap Time</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-outline-variant">
                                      {rounds.map((round) => (
                                        <tr key={round.roundId} className="hover:bg-surface-container-low">
                                          <td className="px-3 py-2 font-semibold text-primary">{round.roundNumber}</td>
                                          <td className="px-3 py-2 text-on-surface-variant">{round.horseName ?? '-'}</td>
                                          <td className="px-3 py-2 text-on-surface-variant">{round.jockeyFullName ?? '-'}</td>
                                          <td className="px-3 py-2">{round.position != null ? `#${round.position}` : '-'}</td>
                                          <td className="px-3 py-2">{round.lapTimeSec > 0 ? `${round.lapTimeSec.toFixed(2)}s` : '-'}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const InfoPill = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-md border border-outline-variant bg-surface-container-low px-3 py-3">
    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-outline">{label}</p>
    <p className="mt-1 text-body-sm font-semibold text-primary">{value}</p>
  </div>
);

const LoadingState = () => (
  <div className="rounded-lg border border-outline-variant bg-white p-8 text-center">
    <p className="text-body-sm font-semibold text-on-surface-variant">Loading...</p>
  </div>
);

const EmptyState = ({ title, description }: { title: string; description: string }) => (
  <div className="rounded-lg border border-outline-variant bg-white p-12 text-center">
    <Trophy className="w-10 h-10 text-outline mx-auto mb-4" />
    <h2 className="text-headline-md font-bold text-primary mb-2">{title}</h2>
    <p className="text-body-md text-on-surface-variant">{description}</p>
  </div>
);

export default SchedulePage;
