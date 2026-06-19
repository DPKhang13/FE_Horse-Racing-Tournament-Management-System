import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { ArrowLeft, CalendarDays, Clock, Filter, MapPin, Search, Trophy, Users } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { getApiErrorMessage } from '../../services/apiClient';
import { tournamentService } from '../../services/tournamentService';
import type { MatchStatus, Tournament, TournamentMatch } from '../../types/tournament';

const matchStatusOptions: MatchStatus[] = ['Scheduled', 'Ongoing', 'Finished', 'Cancelled'];

const formatDate = (value: string) => {
  if (!value) {
    return '-';
  }

  return new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const getMatchStatusClassName = (status: MatchStatus) => {
  if (status === 'Ongoing') {
    return 'bg-secondary/10 text-secondary';
  }

  if (status === 'Scheduled') {
    return 'bg-primary/10 text-primary';
  }

  if (status === 'Cancelled') {
    return 'bg-error-container/30 text-error';
  }

  return 'bg-surface-container-highest text-on-surface-variant';
};

const TournamentSchedulePage = () => {
  const { tournamentId } = useParams<{ tournamentId: string }>();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [matches, setMatches] = useState<TournamentMatch[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [roundFilter, setRoundFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [dateFilter, setDateFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    let isMounted = true;

    const loadSchedule = async () => {
      if (!tournamentId) {
        setErrorMessage('Tournament ID is required.');
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setErrorMessage('');

      try {
        const tournamentData = await tournamentService.getTournamentById(tournamentId);
        let scheduleData: TournamentMatch[] = [];

        try {
          scheduleData = await tournamentService.getTournamentSchedule(tournamentId);
        } catch {
          scheduleData = tournamentData.schedule;
        }

        if (isMounted) {
          setTournament(tournamentData);
          setMatches(scheduleData.length > 0 ? scheduleData : tournamentData.schedule);
        }
      } catch (error) {
        if (isMounted) {
          setErrorMessage(getApiErrorMessage(error, 'Unable to load tournament schedule.'));
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void loadSchedule();

    return () => {
      isMounted = false;
    };
  }, [tournamentId]);

  const roundOptions = useMemo(() => {
    const rounds = matches.map((match) => match.round).filter(Boolean);
    return Array.from(new Set(rounds));
  }, [matches]);

  const filteredMatches = useMemo(() => {
    const query = searchTerm.toLowerCase().trim();

    return matches.filter((match) => {
      const searchableValues = [
        match.matchId,
        match.matchName,
        match.round,
        match.arenaLocation,
        match.participant1,
        match.participant2,
        match.matchStatus,
      ];
      const matchesSearch = !query || searchableValues.some((value) => value.toLowerCase().includes(query));
      const matchesRound = roundFilter === 'All' || match.round === roundFilter;
      const matchesStatus = statusFilter === 'All' || match.matchStatus === statusFilter;
      const matchesDate = !dateFilter || match.matchDate === dateFilter;

      return matchesSearch && matchesRound && matchesStatus && matchesDate;
    });
  }, [dateFilter, matches, roundFilter, searchTerm, statusFilter]);

  const scheduledCount = matches.filter((match) => match.matchStatus === 'Scheduled').length;
  const ongoingCount = matches.filter((match) => match.matchStatus === 'Ongoing').length;
  const finishedCount = matches.filter((match) => match.matchStatus === 'Finished').length;

  return (
    <div className="min-h-screen bg-surface py-8">
      <div className="mx-auto max-w-[1440px] px-4 md:px-8">
        <div className="glass-panel mb-6 rounded-2xl p-6">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <Link
                to="/tournaments"
                className="mb-4 inline-flex items-center gap-2 text-label-sm font-bold uppercase tracking-[0.14em] text-on-surface-variant transition-colors hover:text-primary"
              >
                <ArrowLeft className="h-4 w-4" />
                Tournament Management
              </Link>
              <p className="mb-3 text-label-sm font-bold uppercase tracking-[0.18em] text-secondary">Tournament Schedule</p>
              <h1 className="font-display mb-2 text-headline-lg font-extrabold text-primary">
                {tournament?.tournamentName ?? 'Tournament Schedule'}
              </h1>
              <div className="flex flex-wrap gap-x-6 gap-y-2 text-body-sm text-on-surface-variant">
                <span className="inline-flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-outline" />
                  {tournament ? `${formatDate(tournament.startDate)} - ${formatDate(tournament.endDate)}` : 'Schedule dates'}
                </span>
                <span className="inline-flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-outline" />
                  {tournament?.location ?? 'Tournament location'}
                </span>
              </div>
            </div>

            <div className="grid min-w-full gap-3 sm:grid-cols-2 xl:min-w-[560px] xl:grid-cols-4">
              <MetricCard icon={<Trophy className="h-4 w-4" />} label="Matches" value={String(matches.length).padStart(2, '0')} />
              <MetricCard icon={<CalendarDays className="h-4 w-4" />} label="Scheduled" value={String(scheduledCount).padStart(2, '0')} />
              <MetricCard icon={<Clock className="h-4 w-4" />} label="Ongoing" value={String(ongoingCount).padStart(2, '0')} />
              <MetricCard icon={<Users className="h-4 w-4" />} label="Finished" value={String(finishedCount).padStart(2, '0')} />
            </div>
          </div>
        </div>

        <div className="glass-panel mb-6 rounded-xl p-4">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(220px,1fr)_180px_180px_180px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-outline" />
              <input
                type="text"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search matches..."
                className={filterInputClassName}
              />
            </div>

            <div className="relative">
              <Filter className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-outline" />
              <select value={roundFilter} onChange={(event) => setRoundFilter(event.target.value)} className={filterInputClassName}>
                <option value="All">All rounds</option>
                {roundOptions.map((round) => (
                  <option key={round} value={round}>{round}</option>
                ))}
              </select>
            </div>

            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className={plainFilterInputClassName}>
              <option value="All">All statuses</option>
              {matchStatusOptions.map((status) => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>

            <input
              type="date"
              aria-label="Match date"
              value={dateFilter}
              onChange={(event) => setDateFilter(event.target.value)}
              className={plainFilterInputClassName}
            />
          </div>
        </div>

        {errorMessage && <StatusBanner tone="error" text={errorMessage} />}

        {isLoading ? (
          <EmptyScheduleState title="Loading schedule" description="Fetching tournament matches." />
        ) : filteredMatches.length === 0 ? (
          <EmptyScheduleState title="No matches found" description="No matches exist for the current schedule view." />
        ) : (
          <>
            <div className="glass-panel hidden overflow-hidden rounded-xl lg:block">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1180px] text-left">
                  <thead className="border-b border-outline-variant bg-surface-container">
                    <tr>
                      <th className="px-5 py-4 text-label-sm uppercase tracking-wider text-outline">Match ID</th>
                      <th className="px-5 py-4 text-label-sm uppercase tracking-wider text-outline">Match Name</th>
                      <th className="px-5 py-4 text-label-sm uppercase tracking-wider text-outline">Round</th>
                      <th className="px-5 py-4 text-label-sm uppercase tracking-wider text-outline">Match Date</th>
                      <th className="px-5 py-4 text-label-sm uppercase tracking-wider text-outline">Start Time</th>
                      <th className="px-5 py-4 text-label-sm uppercase tracking-wider text-outline">End Time</th>
                      <th className="px-5 py-4 text-label-sm uppercase tracking-wider text-outline">Arena / Location</th>
                      <th className="px-5 py-4 text-label-sm uppercase tracking-wider text-outline">Participant 1</th>
                      <th className="px-5 py-4 text-label-sm uppercase tracking-wider text-outline">Participant 2</th>
                      <th className="px-5 py-4 text-label-sm uppercase tracking-wider text-outline">Match Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant">
                    {filteredMatches.map((match) => (
                      <tr key={match.matchId} className="transition-colors hover:bg-surface-container-lowest">
                        <td className="px-5 py-4 text-body-sm font-bold text-primary">{match.matchId}</td>
                        <td className="px-5 py-4 text-body-sm font-bold text-primary">{match.matchName}</td>
                        <td className="px-5 py-4 text-body-sm font-medium text-on-surface-variant">{match.round}</td>
                        <td className="px-5 py-4 text-body-sm font-medium text-on-surface-variant">{formatDate(match.matchDate)}</td>
                        <td className="px-5 py-4 text-body-sm font-medium text-on-surface-variant">{match.startTime}</td>
                        <td className="px-5 py-4 text-body-sm font-medium text-on-surface-variant">{match.endTime}</td>
                        <td className="px-5 py-4 text-body-sm font-medium text-on-surface-variant">{match.arenaLocation}</td>
                        <td className="px-5 py-4 text-body-sm font-medium text-on-surface-variant">{match.participant1}</td>
                        <td className="px-5 py-4 text-body-sm font-medium text-on-surface-variant">{match.participant2}</td>
                        <td className="px-5 py-4">
                          <MatchStatusBadge status={match.matchStatus} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="grid gap-4 lg:hidden">
              {filteredMatches.map((match) => (
                <ScheduleCard key={match.matchId} match={match} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

const filterInputClassName =
  'w-full appearance-none rounded-lg border border-outline-variant bg-surface-container-low px-4 py-3 pl-10 text-body-sm transition-colors focus:border-primary focus:outline-none';

const plainFilterInputClassName =
  'w-full rounded-lg border border-outline-variant bg-surface-container-low px-4 py-3 text-body-sm transition-colors focus:border-primary focus:outline-none';

const MetricCard = ({ icon, label, value }: { icon: ReactNode; label: string; value: string }) => (
  <div className="rounded-xl border border-outline-variant/40 bg-surface-container-lowest/70 p-4">
    <div className="mb-3 flex items-center justify-between text-on-surface-variant">
      <span className="text-[10px] font-bold uppercase tracking-[0.16em]">{label}</span>
      <span className="text-primary">{icon}</span>
    </div>
    <p className="font-display truncate text-2xl font-extrabold text-on-surface">{value}</p>
  </div>
);

const StatusBanner = ({ tone, text }: { tone: 'error'; text: string }) => (
  <div className={`mb-6 rounded-md border px-4 py-3 text-body-sm font-semibold ${tone === 'error' ? 'border-error/30 bg-error-container/20 text-error' : ''}`}>
    {text}
  </div>
);

const MatchStatusBadge = ({ status }: { status: MatchStatus }) => (
  <span className={`inline-flex rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${getMatchStatusClassName(status)}`}>
    {status}
  </span>
);

const EmptyScheduleState = ({ title, description }: { title: string; description: string }) => (
  <div className="glass-panel rounded-xl px-6 py-16 text-center">
    <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-surface-container">
      <Search className="h-6 w-6 text-outline" />
    </div>
    <h3 className="mb-2 text-body-lg font-bold text-primary">{title}</h3>
    <p className="text-body-sm text-on-surface-variant">{description}</p>
  </div>
);

const ScheduleCard = ({ match }: { match: TournamentMatch }) => (
  <article className="glass-panel rounded-xl p-5">
    <div className="mb-4 flex items-start justify-between gap-4">
      <div>
        <p className="mb-1 text-label-sm font-bold uppercase tracking-wider text-outline">{match.matchId}</p>
        <h2 className="text-body-lg font-bold text-primary">{match.matchName}</h2>
      </div>
      <MatchStatusBadge status={match.matchStatus} />
    </div>
    <div className="grid gap-3 text-body-sm text-on-surface-variant">
      <div className="flex items-center justify-between gap-3">
        <span className="font-bold uppercase tracking-wider text-outline">Round</span>
        <span className="font-semibold text-primary">{match.round}</span>
      </div>
      <div className="flex items-center justify-between gap-3">
        <span className="font-bold uppercase tracking-wider text-outline">Date</span>
        <span>{formatDate(match.matchDate)}</span>
      </div>
      <div className="flex items-center justify-between gap-3">
        <span className="font-bold uppercase tracking-wider text-outline">Time</span>
        <span>{match.startTime} - {match.endTime}</span>
      </div>
      <div className="flex items-center justify-between gap-3">
        <span className="font-bold uppercase tracking-wider text-outline">Arena</span>
        <span className="text-right">{match.arenaLocation}</span>
      </div>
      <div className="rounded-md border border-outline-variant bg-surface-container-low p-3">
        <p className="mb-2 text-label-sm font-bold uppercase tracking-wider text-outline">Participants</p>
        <p className="text-body-sm font-semibold text-primary">{match.participant1} vs {match.participant2}</p>
      </div>
    </div>
  </article>
);

export default TournamentSchedulePage;
