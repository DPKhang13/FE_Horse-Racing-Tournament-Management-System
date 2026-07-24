import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { CalendarDays, CircleDollarSign, MapPin, Medal, RefreshCw, Search, Trophy } from 'lucide-react';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { getApiErrorMessage } from '../../services/apiClient';
import { tournamentService } from '../../services/tournamentService';
import { useToastNotifications } from '../../hooks/useToastNotifications';
import type { Tournament } from '../../types/tournament';

type Notice = {
  tone: 'error';
  text: string;
};

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

const formatDate = (value: string) => {
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

const AdminPrizeAwardsPage = () => {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [notice, setNotice] = useState<Notice | null>(null);

  useToastNotifications([notice]);

  const loadTournaments = useCallback(async () => {
    setIsLoading(true);
    setNotice(null);

    try {
      const items = await tournamentService.getAllTournaments(false);
      setTournaments(items.filter((tournament) => tournament.status === 'Completed'));
    } catch (error) {
      setNotice({ tone: 'error', text: getApiErrorMessage(error, 'Unable to load completed tournaments.') });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const loadTimeout = window.setTimeout(() => {
      void loadTournaments();
    }, 0);

    return () => {
      window.clearTimeout(loadTimeout);
    };
  }, [loadTournaments]);

  const filteredTournaments = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    if (!query) {
      return tournaments;
    }

    return tournaments.filter((tournament) => [
      tournament.id,
      tournament.tournamentName,
      tournament.location,
    ].some((value) => value.toLowerCase().includes(query)));
  }, [searchTerm, tournaments]);

  return (
    <div className="min-h-screen bg-surface py-8">
      <div className="mx-auto max-w-[1440px] px-4 md:px-8">
        <motion.div
          className="glass-panel mb-6 rounded-2xl p-6"
          initial="hidden"
          animate="visible"
          variants={revealContainer}
        >
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(440px,560px)] xl:items-end">
            <motion.div variants={revealUp}>
              <p className="mb-3 text-label-sm font-bold uppercase tracking-[0.18em] text-secondary">Tournament Administration</p>
              <h1 className="font-display text-headline-lg font-extrabold text-primary">Prize Awards</h1>
            </motion.div>

            <motion.div className="grid gap-3 sm:grid-cols-2" variants={revealContainer}>
              <motion.div variants={revealUp}>
                <MetricCard icon={<Trophy className="h-4 w-4" />} label="Completed" value={String(tournaments.length).padStart(2, '0')} />
              </motion.div>
              <motion.div variants={revealUp}>
                <MetricCard icon={<Medal className="h-4 w-4" />} label="Ready for review" value={String(filteredTournaments.length).padStart(2, '0')} />
              </motion.div>
            </motion.div>
          </div>
        </motion.div>

        {notice && <StatusBanner text={notice.text} />}

        <motion.div className="glass-panel mb-6 rounded-xl p-4" initial="hidden" animate="visible" variants={revealUp}>
          <div className="relative max-w-xl">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-outline" />
            <input
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search completed tournaments..."
              className="w-full rounded-lg border border-outline-variant bg-surface-container-low px-4 py-3 pl-10 text-body-sm transition-colors focus:border-primary focus:outline-none"
            />
          </div>
        </motion.div>

        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-label-sm font-bold uppercase tracking-[0.18em] text-secondary">Completed Tournaments</p>
            <h2 className="font-display mt-1 text-title-large font-bold text-primary">Award Management</h2>
          </div>
          <button
            type="button"
            onClick={() => void loadTournaments()}
            disabled={isLoading}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-outline-variant text-on-surface-variant transition-colors hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Refresh completed tournaments"
            title="Refresh completed tournaments"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {isLoading ? (
          <EmptyState title="Loading completed tournaments" description="Fetching tournament records." />
        ) : filteredTournaments.length === 0 ? (
          <EmptyState
            title={tournaments.length === 0 ? 'No completed tournaments' : 'No tournaments found'}
            description={tournaments.length === 0 ? 'Completed tournaments will appear here.' : 'No completed tournaments match the current search.'}
          />
        ) : (
          <>
            <div className="glass-panel hidden overflow-hidden rounded-xl lg:block">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px] text-left">
                  <thead className="border-b border-outline-variant bg-surface-container">
                    <tr>
                      <th className="px-5 py-4 text-label-sm uppercase tracking-wider text-outline">Tournament</th>
                      <th className="px-5 py-4 text-label-sm uppercase tracking-wider text-outline">End Date</th>
                      <th className="px-5 py-4 text-label-sm uppercase tracking-wider text-outline">Location</th>
                      <th className="px-5 py-4 text-label-sm uppercase tracking-wider text-outline">Prize Pool</th>
                      <th className="px-5 py-4 text-right text-label-sm uppercase tracking-wider text-outline">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant">
                    {filteredTournaments.map((tournament, index) => (
                      <motion.tr
                        key={tournament.tournamentId}
                        className="transition-colors hover:bg-surface-container-lowest"
                        initial="hidden"
                        animate="visible"
                        variants={revealUp}
                        transition={{ delay: index * 0.05 }}
                      >
                        <td className="px-5 py-4">
                          <p className="text-body-sm font-bold text-primary">{tournament.tournamentName}</p>
                          <p className="mt-1 text-label-sm text-on-surface-variant">{tournament.id}</p>
                        </td>
                        <td className="px-5 py-4 text-body-sm text-on-surface-variant">{formatDate(tournament.endDate)}</td>
                        <td className="px-5 py-4 text-body-sm text-on-surface-variant">{tournament.location}</td>
                        <td className="px-5 py-4 text-body-sm font-bold text-primary">{tournament.prize || '-'}</td>
                        <td className="px-5 py-4 text-right">
                          <Link
                            to={`/tournaments/${tournament.tournamentId}/prize-awards`}
                            className="inline-flex items-center gap-2 rounded-md border border-secondary/50 px-3 py-2 text-label-sm font-bold text-secondary transition-colors hover:bg-secondary/10"
                          >
                            <Medal className="h-4 w-4" />
                            Manage Awards
                          </Link>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="grid gap-4 lg:hidden">
              {filteredTournaments.map((tournament, index) => (
                <motion.div key={tournament.tournamentId} initial="hidden" animate="visible" variants={revealUp} transition={{ delay: index * 0.05 }}>
                  <TournamentCard tournament={tournament} />
                </motion.div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

const MetricCard = ({ icon, label, value }: { icon: ReactNode; label: string; value: string }) => (
  <div className="rounded-xl border border-outline-variant/40 bg-surface-container-lowest/70 p-4">
    <div className="mb-3 flex items-center justify-between text-on-surface-variant">
      <span className="text-[10px] font-bold uppercase tracking-[0.16em]">{label}</span>
      <span className="text-primary">{icon}</span>
    </div>
    <p className="font-display truncate text-2xl font-extrabold text-on-surface">{value}</p>
  </div>
);

const StatusBanner = ({ text }: { text: string }) => (
  <div className="mb-6 rounded-md border border-error/30 bg-error-container/20 px-4 py-3 text-body-sm font-semibold text-error">
    {text}
  </div>
);

const EmptyState = ({ title, description }: { title: string; description: string }) => (
  <div className="glass-panel rounded-xl px-6 py-16 text-center">
    <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-surface-container">
      <CircleDollarSign className="h-6 w-6 text-outline" />
    </div>
    <h3 className="mb-2 text-body-lg font-bold text-primary">{title}</h3>
    <p className="text-body-sm text-on-surface-variant">{description}</p>
  </div>
);

const TournamentCard = ({ tournament }: { tournament: Tournament }) => (
  <article className="glass-panel rounded-xl p-5">
    <div className="mb-5 flex items-start justify-between gap-4">
      <div className="min-w-0">
        <p className="truncate text-body-lg font-bold text-primary">{tournament.tournamentName}</p>
        <p className="mt-1 text-label-sm text-on-surface-variant">{tournament.id}</p>
      </div>
      <span className="inline-flex shrink-0 rounded-full bg-secondary/15 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-secondary">Completed</span>
    </div>
    <div className="grid gap-3 text-body-sm text-on-surface-variant">
      <TournamentDetail icon={<CalendarDays className="h-4 w-4" />} label="End Date" value={formatDate(tournament.endDate)} />
      <TournamentDetail icon={<MapPin className="h-4 w-4" />} label="Location" value={tournament.location} />
      <TournamentDetail icon={<CircleDollarSign className="h-4 w-4" />} label="Prize Pool" value={tournament.prize || '-'} valueClassName="font-bold text-primary" />
    </div>
    <Link
      to={`/tournaments/${tournament.tournamentId}/prize-awards`}
      className="mt-5 inline-flex items-center gap-2 rounded-md border border-secondary/50 px-3 py-2 text-label-sm font-bold text-secondary transition-colors hover:bg-secondary/10"
    >
      <Medal className="h-4 w-4" />
      Manage Awards
    </Link>
  </article>
);

const TournamentDetail = ({
  icon,
  label,
  value,
  valueClassName = '',
}: {
  icon: ReactNode;
  label: string;
  value: string;
  valueClassName?: string;
}) => (
  <div className="flex items-start justify-between gap-4">
    <span className="inline-flex shrink-0 items-center gap-2 font-bold uppercase tracking-wider text-outline">{icon}{label}</span>
    <span className={`min-w-0 text-right ${valueClassName}`}>{value}</span>
  </div>
);

export default AdminPrizeAwardsPage;
