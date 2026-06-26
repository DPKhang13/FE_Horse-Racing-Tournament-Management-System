import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { motion } from 'motion/react';
import { Activity, CalendarDays, Flag, Trophy, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getApiErrorMessage } from '../../services/apiClient';
import { tournamentService } from '../../services/tournamentService';
import type { Tournament } from '../../types/tournament';

// Animation variants
const revealContainer = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.12,
    },
  },
};

const revealUp = {
  hidden: { opacity: 0, y: 28 },
  visible: { opacity: 1, y: 0 },
};

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
    <div className="min-h-screen bg-surface py-8">
      <div className="mx-auto max-w-[1440px] px-4 md:px-8">
        <motion.div 
          className="glass-panel mb-6 rounded-2xl p-6"
          initial="hidden"
          animate="visible"
          variants={revealContainer}
        >
          <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <motion.div variants={revealUp}>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-secondary">Admin Dashboard</p>
              <h1 className="font-display mt-2 text-headline-lg font-extrabold text-primary">Operations overview</h1>
              <p className="mt-2 max-w-2xl text-body-sm text-on-surface-variant">
                Monitor tournament volume, race coverage, and participant activity. CRUD actions are handled in Tournament Management.
              </p>
            </motion.div>
            <motion.div variants={revealUp}>
              <Link to="/tournaments" className="gold-gradient inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-body-sm font-extrabold text-on-primary">
                <Trophy className="h-4 w-4" />
                Manage Tournaments
              </Link>
            </motion.div>
          </div>
        </motion.div>

        {errorMessage && (
          <motion.div 
            initial="hidden"
            animate="visible"
            variants={revealUp}
          >
            <StatusBanner tone="error" text={errorMessage} />
          </motion.div>
        )}

        <motion.section 
          className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-5"
          initial="hidden"
          animate="visible"
          variants={revealContainer}
        >
          <motion.div variants={revealUp}>
            <MetricCard icon={<Trophy className="h-5 w-5" />} label="Tournaments" value={isLoading ? '...' : String(tournaments.length).padStart(2, '0')} />
          </motion.div>
          <motion.div variants={revealUp}>
            <MetricCard icon={<CalendarDays className="h-5 w-5" />} label="Upcoming" value={isLoading ? '...' : String(stats.upcoming).padStart(2, '0')} />
          </motion.div>
          <motion.div variants={revealUp}>
            <MetricCard icon={<Activity className="h-5 w-5" />} label="Ongoing" value={isLoading ? '...' : String(stats.ongoing).padStart(2, '0')} />
          </motion.div>
          <motion.div variants={revealUp}>
            <MetricCard icon={<Flag className="h-5 w-5" />} label="Races" value={isLoading ? '...' : String(stats.raceCount).padStart(2, '0')} />
          </motion.div>
          <motion.div variants={revealUp}>
            <MetricCard icon={<Users className="h-5 w-5" />} label="Participants" value={isLoading ? '...' : String(stats.participantCount)} />
          </motion.div>
        </motion.section>

        <motion.section 
          className="glass-panel rounded-xl p-6"
          initial="hidden"
          animate="visible"
          variants={revealUp}
        >
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-display text-title-large font-bold text-primary">Recent tournaments</h2>
              <p className="mt-1 text-body-sm text-on-surface-variant">A read-only snapshot for quick admin scanning.</p>
            </div>
            <span className="rounded-full bg-surface-container px-4 py-2 text-label-sm font-bold uppercase tracking-[0.12em] text-on-surface-variant">
              {stats.completed} completed
            </span>
          </div>

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
                  <motion.tr 
                    variants={revealUp}
                  >
                    <td colSpan={5} className="px-4 py-8 text-center text-body-sm text-on-surface-variant">Loading dashboard...</td>
                  </motion.tr>
                ) : latestTournaments.map((tournament, index) => (
                  <motion.tr 
                    key={tournament.tournamentId}
                    variants={revealUp}
                    transition={{ delay: index * 0.05 }}
                  >
                    <td className="px-4 py-4 text-body-sm font-bold text-primary">{tournament.tournamentName}</td>
                    <td className="px-4 py-4 text-body-sm text-on-surface-variant">{tournament.location}</td>
                    <td className="px-4 py-4 text-body-sm text-on-surface-variant">{tournament.startDate} - {tournament.endDate}</td>
                    <td className="px-4 py-4 text-body-sm font-semibold text-primary">{tournament.schedule.length}</td>
                    <td className="px-4 py-4 text-body-sm text-on-surface-variant">{tournament.status}</td>
                  </motion.tr>
                ))}
                {!isLoading && latestTournaments.length === 0 && (
                  <motion.tr variants={revealUp}>
                    <td colSpan={5} className="px-4 py-8 text-center text-body-sm text-on-surface-variant">No tournaments found.</td>
                  </motion.tr>
                )}
              </tbody>
            </table>
          </div>
        </motion.section>
      </div>
    </div>
  );
};

const MetricCard = ({ icon, label, value }: { icon: ReactNode; label: string; value: string }) => (
  <div className="rounded-xl border border-outline-variant/40 bg-surface-container-lowest/70 p-5 shadow-sm">
    <div className="mb-4 flex items-center justify-between text-on-surface-variant">
      <span className="text-[10px] font-bold uppercase tracking-[0.16em]">{label}</span>
      <span className="text-primary">{icon}</span>
    </div>
    <p className="font-display truncate text-3xl font-extrabold text-on-surface">{value}</p>
  </div>
);

const StatusBanner = ({ tone, text }: { tone: 'error'; text: string }) => (
  <div className={`mb-6 rounded-md border px-4 py-3 text-body-sm font-semibold ${tone === 'error' ? 'border-error/30 bg-error-container/20 text-error' : ''}`}>
    {text}
  </div>
);

export default AdminOperationsPage;
