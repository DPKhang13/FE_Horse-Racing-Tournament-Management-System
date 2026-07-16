import { useEffect, useMemo, useState } from 'react';
import { Activity, CalendarDays, Flag, Trophy, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge, DataPanel, MetricCard, MetricGrid, PageHeader, PageShell } from '../../components/ui';
import { getApiErrorMessage } from '../../services/apiClient';
import { tournamentService } from '../../services/tournamentService';
import type { Tournament } from '../../types/tournament';

const AdminOperationsPage = () => {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [globalTournamentCount, setGlobalTournamentCount] = useState<number | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadDashboard = async () => {
      setIsLoading(true);
      setErrorMessage('');

      try {
        const [data, count] = await Promise.all([
          tournamentService.getAllTournaments(false),
          tournamentService.getGlobalTournamentCount().catch(() => null),
        ]);

        if (isMounted) {
          setTournaments(data);
          setGlobalTournamentCount(count ?? data.length);
        }
      } catch (error) {
        if (isMounted) {
          setErrorMessage(getApiErrorMessage(error, 'Unable to load admin dashboard.'));
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void loadDashboard();

    return () => {
      isMounted = false;
    };
  }, []);

  const stats = useMemo(() => {
    const upcoming = tournaments.filter((item) => item.status === 'Upcoming').length;
    const ongoing = tournaments.filter((item) => item.status === 'Ongoing').length;
    const completed = tournaments.filter((item) => item.status === 'Completed').length;
    const raceCount = tournaments.reduce((total, item) => total + item.schedule.length, 0);
    const participantCount = tournaments.reduce((total, item) => total + item.currentParticipants, 0);

    return { upcoming, ongoing, completed, raceCount, participantCount };
  }, [tournaments]);

  const latestTournaments = tournaments.slice(0, 6);
  const totalTournamentCount = globalTournamentCount ?? tournaments.length;

  return (
    <PageShell>
      <PageHeader
        eyebrow="Admin Dashboard"
        title="Operations overview"
        description="Monitor tournament volume, race coverage, and participant activity. CRUD actions are handled in Tournament Management."
        icon={Activity}
        actions={(
          <Link to="/tournaments" className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-emerald-600 px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700">
            <Trophy className="h-4 w-4" />
            Manage Tournaments
          </Link>
        )}
      />

      {errorMessage && <StatusBanner tone="error" text={errorMessage} />}

      <MetricGrid columns={5}>
        <MetricCard icon={Trophy} tone="violet" label="Tournaments" value={isLoading ? '...' : String(totalTournamentCount).padStart(2, '0')} />
        <MetricCard icon={CalendarDays} tone="blue" label="Upcoming" value={isLoading ? '...' : String(stats.upcoming).padStart(2, '0')} />
        <MetricCard icon={Activity} tone="emerald" label="Ongoing" value={isLoading ? '...' : String(stats.ongoing).padStart(2, '0')} detail="Live operations" />
        <MetricCard icon={Flag} tone="gold" label="Races" value={isLoading ? '...' : String(stats.raceCount).padStart(2, '0')} />
        <MetricCard icon={Users} label="Participants" value={isLoading ? '...' : String(stats.participantCount)} />
      </MetricGrid>

      <DataPanel
        title="Recent tournaments"
        description="A read-only snapshot for quick admin scanning."
        icon={Trophy}
        action={<Badge tone="slate">{stats.completed} completed</Badge>}
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-left">
              <thead className="border-b border-outline-variant bg-surface-container">
                <tr>
                  <th className="px-4 py-3 text-label-sm uppercase tracking-wider text-outline">Tournament</th>
                  <th className="px-4 py-3 text-label-sm uppercase tracking-wider text-outline">Location</th>
                  <th className="px-4 py-3 text-label-sm uppercase tracking-wider text-outline">Dates</th>
                  <th className="px-4 py-3 text-label-sm uppercase tracking-wider text-outline">Races</th>
                  <th className="px-4 py-3 text-label-sm uppercase tracking-wider text-outline">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-body-sm text-on-surface-variant">Loading dashboard...</td>
                  </tr>
                ) : latestTournaments.map((tournament) => (
                  <tr
                    key={tournament.tournamentId}
                    className="hover:bg-slate-50"
                  >
                    <td className="px-4 py-4 text-body-sm font-bold text-primary">{tournament.tournamentName}</td>
                    <td className="px-4 py-4 text-body-sm text-on-surface-variant">{tournament.location}</td>
                    <td className="px-4 py-4 text-body-sm text-on-surface-variant">{tournament.startDate} - {tournament.endDate}</td>
                    <td className="px-4 py-4 text-body-sm font-semibold text-primary">{tournament.schedule.length}</td>
                    <td className="px-4 py-4 text-body-sm text-on-surface-variant">{tournament.status}</td>
                  </tr>
                ))}
                {!isLoading && latestTournaments.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-body-sm text-on-surface-variant">No tournaments found.</td>
                  </tr>
                )}
              </tbody>
            </table>
        </div>
      </DataPanel>
    </PageShell>
  );
};

const StatusBanner = ({ tone, text }: { tone: 'error'; text: string }) => (
  <div className={`mb-6 rounded-md border px-4 py-3 text-body-sm font-semibold ${tone === 'error' ? 'border-error/30 bg-error-container/20 text-error' : ''}`}>
    {text}
  </div>
);

export default AdminOperationsPage;
