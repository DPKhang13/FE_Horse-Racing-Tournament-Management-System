import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Bell, CalendarDays, ChevronDown, ChevronUp, Clock3, Loader2, MapPin, Trophy, Users, X } from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { getApiErrorMessage } from '../../services/apiClient';
import { betService, type BetItem } from '../../services/betService';
import { dashboardService, type DashboardSummaryCount } from '../../services/dashboardService';
import type { NotificationItem } from '../../services/notificationService';
import { predictionService } from '../../services/predictionService';
import { raceResultService } from '../../services/raceResultService';
import { scheduleService, type RaceParticipantItem, type RaceScheduleItem } from '../../services/scheduleService';
import type { RaceResultEntry, RaceResultListItem, RaceResultSummary } from '../../types/raceResult';

// Animation variants
const revealUp = {
  hidden: { opacity: 0, y: 28 },
  visible: { opacity: 1, y: 0 },
};

const revealContainer = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.12,
    },
  },
};

const formatTime = (value: string) => new Intl.DateTimeFormat('en-US', {
  hour: '2-digit',
  minute: '2-digit',
}).format(new Date(value));

const formatScheduleDate = (value: string) => new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: '2-digit',
  year: 'numeric',
}).format(new Date(value));

const formatPoints = (value: number) => new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 0,
}).format(value);

const formatRate = (value?: number) => {
  if (value === undefined || value <= 0) {
    return '-';
  }

  return `${new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(value)}x`;
};

const formatDateTime = (value?: string) => {
  if (!value) {
    return '-';
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
};

const formatRaceStatus = (status: string) => {
  const value = status.toLowerCase();

  if (value === 'registration_open') {
    return 'Reg.';
  }

  return status.replace(/_/g, ' ');
};

const getLatestRaceResults = (results: RaceResultListItem[], limit = 3) => (
  [...results]
    .sort((first, second) => {
      const firstTime = new Date(first.publishedAt ?? first.date).getTime();
      const secondTime = new Date(second.publishedAt ?? second.date).getTime();

      return secondTime - firstTime;
    })
    .slice(0, limit)
);

const getLatestPredictions = (bets: BetItem[], limit = 5) => (
  [...bets]
    .sort((first, second) => {
      const firstPlacedAt = first.createdAt ? new Date(first.createdAt).getTime() : 0;
      const secondPlacedAt = second.createdAt ? new Date(second.createdAt).getTime() : 0;

      if (firstPlacedAt !== secondPlacedAt) {
        return secondPlacedAt - firstPlacedAt;
      }

      return second.betId - first.betId;
    })
    .slice(0, limit)
);

const getUpcomingRaces = (races: RaceScheduleItem[]) => {
  const now = Date.now();
  const inactiveStatuses = new Set(['completed', 'cancelled', 'canceled']);

  return [...races]
    .filter((race) => {
      const scheduledTime = new Date(race.scheduledAt).getTime();
      return Number.isFinite(scheduledTime)
        && scheduledTime > now
        && !inactiveStatuses.has(race.status.toLowerCase());
    })
    .sort((first, second) => (
      new Date(first.scheduledAt).getTime() - new Date(second.scheduledAt).getTime()
    ));
};

type RaceDetailState = {
  sourceRace: RaceScheduleItem;
  detailRace?: RaceScheduleItem;
  participants: RaceParticipantItem[];
  isLoading: boolean;
  errorMessage: string;
  participantErrorMessage: string;
};

type ResultDetailState = {
  sourceResult: RaceResultListItem;
  summary?: RaceResultSummary;
  isLoading: boolean;
  errorMessage: string;
};

type PredictionDetailState = {
  sourceBet: BetItem;
  detailBet?: BetItem;
  isLoading: boolean;
  errorMessage: string;
};

const SpectatorDashboard: React.FC = () => {
  const navigate = useNavigate();
  const detailRequestId = useRef(0);
  const predictionDetailRequestId = useRef(0);
  const resultDetailRequestId = useRef(0);
  const [upcomingRaces, setUpcomingRaces] = useState<RaceScheduleItem[]>([]);
  const [selectedRaceDetail, setSelectedRaceDetail] = useState<RaceDetailState | null>(null);
  const [selectedPredictionDetail, setSelectedPredictionDetail] = useState<PredictionDetailState | null>(null);
  const [selectedResultDetail, setSelectedResultDetail] = useState<ResultDetailState | null>(null);
  const [myPredictions, setMyPredictions] = useState<BetItem[]>([]);
  const [latestResults, setLatestResults] = useState<RaceResultListItem[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [summaryCount, setSummaryCount] = useState<DashboardSummaryCount>();
  const [openPredictionRaceCount, setOpenPredictionRaceCount] = useState(0);
  const [showAllUpcomingRaces, setShowAllUpcomingRaces] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    let isMounted = true;

    const loadDashboard = async () => {
      setIsLoading(true);
      setErrorMessage('');

      try {
        const [dashboard, bets, openPredictionRaces, publishedResults] = await Promise.all([
          dashboardService.getSpectatorDashboard(),
          betService.getMyBets(),
          predictionService.getOpenPredictionRaces(),
          raceResultService.getRaceResultList().catch(() => []),
        ]);

        if (isMounted) {
          setSummaryCount(dashboard.summaryCount);
          setUpcomingRaces(getUpcomingRaces(dashboard.upcomingRaces));
          setMyPredictions(getLatestPredictions(bets));
          setOpenPredictionRaceCount(openPredictionRaces.length);
          setLatestResults(getLatestRaceResults(publishedResults.length > 0 ? publishedResults : dashboard.latestResults));
          setNotifications(dashboard.notifications.slice(0, 5));
        }
      } catch (error) {
        if (isMounted) {
          setErrorMessage(getApiErrorMessage(error, 'Unable to load spectator dashboard.'));
          setSummaryCount(undefined);
          setOpenPredictionRaceCount(0);
          setUpcomingRaces([]);
          setMyPredictions([]);
          setLatestResults([]);
          setNotifications([]);
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

  const metrics = useMemo(() => [
    {
      label: 'Upcoming Races',
      value: String(upcomingRaces.length).padStart(2, '0'),
      tone: 'text-secondary',
      badge: 'Scheduled',
      action: () => document.getElementById('race-schedule')?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
    },
    {
      label: 'Open prediction races',
      value: String(openPredictionRaceCount).padStart(2, '0'),
      tone: 'text-primary',
      badge: 'Open',
      action: () => navigate('/prediction'),
    },
    {
      label: 'Unread Notifications',
      value: String(summaryCount?.unreadNotificationCount ?? notifications.length).padStart(2, '0'),
      tone: 'text-on-surface',
      badge: 'Unread',
      action: () => navigate('/notifications'),
    },
  ], [navigate, notifications.length, openPredictionRaceCount, summaryCount, upcomingRaces.length]);

  const visibleUpcomingRaces = showAllUpcomingRaces ? upcomingRaces : upcomingRaces.slice(0, 6);

  const openRaceDetail = async (race: RaceScheduleItem) => {
    const requestId = detailRequestId.current + 1;
    detailRequestId.current = requestId;
    setSelectedRaceDetail({
      sourceRace: race,
      participants: [],
      isLoading: true,
      errorMessage: '',
      participantErrorMessage: '',
    });

    const [raceResult, participantResult] = await Promise.allSettled([
      dashboardService.getUpcomingRaceDetail(race),
      scheduleService.getRaceParticipants(race.raceId),
    ]);

    if (detailRequestId.current === requestId) {
      setSelectedRaceDetail({
        sourceRace: race,
        detailRace: raceResult.status === 'fulfilled' ? raceResult.value : undefined,
        participants: participantResult.status === 'fulfilled' ? participantResult.value : [],
        isLoading: false,
        errorMessage: raceResult.status === 'rejected'
          ? getApiErrorMessage(raceResult.reason, 'Unable to load race detail.')
          : '',
        participantErrorMessage: participantResult.status === 'rejected'
          ? getApiErrorMessage(participantResult.reason, 'Unable to load race participants.')
          : '',
      });
    }
  };

  const closeRaceDetail = () => {
    detailRequestId.current += 1;
    setSelectedRaceDetail(null);
  };

  const openPredictionDetail = async (bet: BetItem) => {
    const requestId = predictionDetailRequestId.current + 1;
    predictionDetailRequestId.current = requestId;
    setSelectedPredictionDetail({ sourceBet: bet, isLoading: true, errorMessage: '' });

    try {
      const detailBet = await betService.getMyBetDetail(bet.betId);

      if (predictionDetailRequestId.current === requestId) {
        setSelectedPredictionDetail({ sourceBet: bet, detailBet, isLoading: false, errorMessage: '' });
      }
    } catch (error) {
      if (predictionDetailRequestId.current === requestId) {
        setSelectedPredictionDetail({
          sourceBet: bet,
          isLoading: false,
          errorMessage: getApiErrorMessage(error, 'Unable to load prediction detail.'),
        });
      }
    }
  };

  const closePredictionDetail = () => {
    predictionDetailRequestId.current += 1;
    setSelectedPredictionDetail(null);
  };

  const openResultDetail = async (result: RaceResultListItem) => {
    const requestId = resultDetailRequestId.current + 1;
    resultDetailRequestId.current = requestId;
    setSelectedResultDetail({ sourceResult: result, isLoading: true, errorMessage: '' });

    try {
      const summary = await raceResultService.getRaceResultById(result.raceId || result.id);

      if (resultDetailRequestId.current === requestId) {
        setSelectedResultDetail({ sourceResult: result, summary, isLoading: false, errorMessage: '' });
      }
    } catch (error) {
      if (resultDetailRequestId.current === requestId) {
        setSelectedResultDetail({
          sourceResult: result,
          isLoading: false,
          errorMessage: getApiErrorMessage(error, 'Unable to load race result detail.'),
        });
      }
    }
  };

  const closeResultDetail = () => {
    resultDetailRequestId.current += 1;
    setSelectedResultDetail(null);
  };

  return (
    <main className="min-h-screen bg-surface text-on-surface">
      <motion.section 
        className="border-b border-outline-variant/40 bg-surface-container-low/80 backdrop-blur-xl"
        initial="hidden"
        animate="visible"
        variants={revealContainer}
      >
        <div className="mx-auto flex max-w-[1440px] flex-col gap-8 px-4 py-10 md:px-8">
          <motion.div 
            className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"
            variants={revealUp}
          >
            <div className="space-y-3">
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-secondary">Spectator Experience</p>
              <h1 className="font-display text-4xl font-extrabold text-primary md:text-5xl">Spectator Dashboard</h1>
            </div>
          </motion.div>

          {errorMessage && (
            <motion.div 
              className="rounded-lg border border-error/40 bg-error-container/25 px-4 py-3 text-sm font-semibold text-error"
              initial="hidden"
              animate="visible"
              variants={revealUp}
            >
              {errorMessage}
            </motion.div>
          )}

          <motion.div 
            className="grid gap-4 md:grid-cols-3"
            variants={revealContainer}
          >
            {metrics.map((item, index) => (
              <motion.button
                key={item.label}
                type="button"
                onClick={item.action}
                aria-label={`${item.label}: ${item.value}. Open details`}
                className="glass-panel w-full rounded-xl p-5 text-left transition hover:-translate-y-0.5 hover:border-primary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
                variants={revealUp}
                whileHover={{ y: -4, scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                transition={{ delay: index * 0.1 }}
              >
                <p className="text-sm text-on-surface-variant">{item.label}</p>
                <div className="mt-3 flex items-end justify-between gap-3">
                  <strong className={`font-display text-4xl font-extrabold ${item.tone}`}>{item.value}</strong>
                  <span className="rounded-full border border-outline-variant/50 bg-surface-container-lowest px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-on-surface-variant">
                    {item.badge}
                  </span>
                </div>
              </motion.button>
            ))}
          </motion.div>
        </div>
      </motion.section>

      <motion.section 
        className="mx-auto grid max-w-[1440px] gap-8 px-4 py-8 md:px-8 lg:grid-cols-[1.1fr_0.9fr]"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.18 }}
        variants={revealContainer}
      >
        <div className="space-y-8">
          <motion.div variants={revealUp}>
            <DashboardPanel id="race-schedule" eyebrow="Upcoming races" title="Race schedule" icon={<CalendarDays className="h-5 w-5 text-secondary" />}>
              <div id="upcoming-race-list" className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {isLoading && <EmptyState text="Loading races..." />}

                {!isLoading && visibleUpcomingRaces.map((race, index) => (
                  <motion.button
                    key={race.raceId} 
                    type="button"
                    onClick={() => void openRaceDetail(race)}
                    aria-label={`View detail for ${race.raceName}`}
                    className="rounded-xl border border-outline-variant/40 bg-surface-container-lowest/70 p-4 text-left transition hover:border-primary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, amount: 0.35 }}
                    variants={revealUp}
                    whileHover={{ y: -4, scale: 1.02 }}
                    transition={{ delay: index * 0.08 }}
                  >
                    <div className="flex items-center justify-between gap-2 text-xs text-on-surface-variant">
                      <span className="max-w-full break-words leading-5">{race.tournamentName}</span>
                      <span className="shrink-0 rounded-full bg-secondary-container/45 px-2 py-1 font-bold uppercase tracking-[0.12em] text-on-secondary-container">
                        {formatRaceStatus(race.status)}
                      </span>
                    </div>
                    <h3 className="font-display mt-3 text-xl font-bold text-on-surface">{race.raceName}</h3>
                    <p className="mt-2 text-sm text-on-surface-variant">{race.rankGroup} / {race.trackType}</p>
                    <div className="mt-4 flex items-center justify-between text-sm">
                      <span className="inline-flex items-center gap-1 text-secondary"><Clock3 className="h-4 w-4" /> {formatScheduleDate(race.scheduledAt)} / {formatTime(race.scheduledAt)}</span>
                      <strong className="text-primary">{race.distanceM}m</strong>
                    </div>
                  </motion.button>
                ))}

                {!isLoading && upcomingRaces.length === 0 && <EmptyState text="No upcoming races found." />}
              </div>

              {!isLoading && upcomingRaces.length > 6 && (
                <div className="mt-5 flex justify-center">
                  <button
                    type="button"
                    onClick={() => setShowAllUpcomingRaces((current) => !current)}
                    className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-outline-variant/50 bg-surface-container-lowest px-4 py-2 text-sm font-bold text-on-surface-variant transition hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
                    aria-expanded={showAllUpcomingRaces}
                    aria-controls="upcoming-race-list"
                  >
                    {showAllUpcomingRaces ? (
                      <>
                        <ChevronUp className="h-4 w-4" />
                        Show less
                      </>
                    ) : (
                      <>
                        <ChevronDown className="h-4 w-4" />
                        View more ({upcomingRaces.length - 6})
                      </>
                    )}
                  </button>
                </div>
              )}

            </DashboardPanel>
          </motion.div>

          <motion.div variants={revealUp}>
            <DashboardPanel eyebrow="My predictions" title="Your bets" icon={<Trophy className="h-5 w-5 text-primary" />}>
              <div className="space-y-3">
                {myPredictions.map((item, index) => (
                  <motion.button
                    key={item.betId} 
                    type="button"
                    onClick={() => void openPredictionDetail(item)}
                    aria-label={`View prediction detail for ${item.raceName} and ${item.horseName}`}
                    className="w-full rounded-xl border border-outline-variant/40 bg-surface-container-lowest/55 p-4 text-left transition hover:border-primary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, amount: 0.35 }}
                    variants={revealUp}
                    whileHover={{ y: -2, scale: 1.01 }}
                    transition={{ delay: index * 0.08 }}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h3 className="font-display text-lg font-bold text-on-surface">{item.raceName}</h3>
                        <p className="text-sm text-on-surface-variant">{item.horseName}{item.jockeyName ? ` / ${item.jockeyName}` : ''}</p>
                      </div>
                      <div className="text-right text-sm">
                        <p className="text-on-surface-variant">Points placed: {formatPoints(item.amount)}</p>
                        <span className="inline-flex rounded-full bg-primary/15 px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-primary">
                          {item.status}
                        </span>
                      </div>
                    </div>
                  </motion.button>
                ))}

                {!isLoading && myPredictions.length === 0 && <EmptyState text="No bets found." />}
              </div>
            </DashboardPanel>
          </motion.div>
        </div>

        <div className="space-y-8">
          <motion.div variants={revealUp}>
            <DashboardPanel eyebrow="Latest results" title="Recent race results" icon={<Trophy className="h-5 w-5 text-primary" />}>
              <div className="space-y-3">
                {latestResults.map((item, index) => (
                  <motion.button
                    key={item.id} 
                    type="button"
                    onClick={() => void openResultDetail(item)}
                    aria-label={`View result detail for ${item.raceName}`}
                    className="w-full rounded-xl border border-outline-variant/40 bg-surface-container-lowest/70 p-4 text-left transition hover:border-primary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, amount: 0.35 }}
                    variants={revealUp}
                    whileHover={{ y: -2, scale: 1.01 }}
                    transition={{ delay: index * 0.08 }}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="font-display text-lg font-bold text-on-surface">{item.raceName}</h3>
                        <p className="text-sm text-on-surface-variant">Winner: {item.topFinishers[0]?.horseName ?? '-'}</p>
                      </div>
                      <span className="rounded-full bg-secondary-container/45 px-2 py-1 text-xs font-bold uppercase tracking-[0.16em] text-on-secondary-container">{item.status}</span>
                    </div>
                    <div className="mt-3 text-sm text-on-surface-variant">
                      <span>Finish time: {item.topFinishers[0]?.finishTime ?? '-'}</span>
                    </div>
                    <p className="mt-2 text-xs uppercase tracking-[0.16em] text-outline">{formatDateTime(item.publishedAt ?? item.date)}</p>
                  </motion.button>
                ))}

                {!isLoading && latestResults.length === 0 && <EmptyState text="No race results found." />}
              </div>
            </DashboardPanel>
          </motion.div>

          <motion.div variants={revealUp}>
            <DashboardPanel eyebrow="Notifications" title="Updates" icon={<Bell className="h-5 w-5 text-secondary" />}>
              <div className="space-y-3">
                {notifications.map((item, index) => (
                  <motion.article 
                    key={item.notificationId} 
                    className="rounded-xl border border-outline-variant/40 bg-surface-container-lowest/55 p-4"
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, amount: 0.35 }}
                    variants={revealUp}
                    whileHover={{ y: -2, scale: 1.01 }}
                    transition={{ delay: index * 0.08 }}
                  >
                    <h3 className="font-display text-base font-bold text-on-surface">{item.title}</h3>
                    <p className="mt-1 text-sm text-on-surface-variant">{item.message}</p>
                    <p className="mt-3 text-xs uppercase tracking-[0.16em] text-outline">{formatDateTime(item.createdAt)}</p>
                  </motion.article>
                ))}

                {!isLoading && notifications.length === 0 && <EmptyState text="No notifications found." />}
              </div>
            </DashboardPanel>
          </motion.div>
        </div>
      </motion.section>

      {selectedRaceDetail && (
        <RaceDetailModal detail={selectedRaceDetail} onClose={closeRaceDetail} />
      )}

      {selectedPredictionDetail && (
        <PredictionDetailModal detail={selectedPredictionDetail} onClose={closePredictionDetail} />
      )}

      {selectedResultDetail && (
        <ResultDetailModal detail={selectedResultDetail} onClose={closeResultDetail} />
      )}
    </main>
  );
};

const DashboardPanel = ({
  id,
  eyebrow,
  title,
  icon,
  children,
}: {
  id?: string;
  eyebrow: string;
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) => (
  <article id={id} className="glass-panel scroll-mt-6 rounded-2xl p-6">
    <div className="mb-4 flex items-center justify-between gap-3">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-secondary">{eyebrow}</p>
        <h2 className="font-display mt-1 text-2xl font-bold text-on-surface">{title}</h2>
      </div>
      {icon}
    </div>
    {children}
  </article>
);

const EmptyState = ({ text }: { text: string }) => (
  <div className="rounded-xl border border-outline-variant/40 bg-surface-container-lowest/60 p-4 text-sm font-semibold text-on-surface-variant">
    {text}
  </div>
);

const RaceDetailModal = ({ detail, onClose }: { detail: RaceDetailState; onClose: () => void }) => {
  const race = detail.detailRace ?? detail.sourceRace;

  return (
    <Modal title={race.raceName} subtitle={`Race ${String(race.raceNumber || race.raceId).padStart(2, '0')}`} onClose={onClose} wide>
      {detail.isLoading ? (
        <div className="flex items-center justify-center gap-3 rounded-xl border border-outline-variant/40 bg-surface-container-lowest/70 px-4 py-10 text-sm font-semibold text-on-surface-variant">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          Loading race detail
        </div>
      ) : (
        <div className="space-y-5">
          {detail.errorMessage && (
            <div className="rounded-lg border border-error/40 bg-error-container/25 px-4 py-3 text-sm font-semibold text-error">
              {detail.errorMessage}
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-3">
            <DetailMetric icon={<CalendarDays className="h-4 w-4" />} label="Schedule" value={`${formatScheduleDate(race.scheduledAt)} / ${formatTime(race.scheduledAt)}`} />
            <DetailMetric icon={<MapPin className="h-4 w-4" />} label="Location" value={race.location} />
            <DetailMetric icon={<Trophy className="h-4 w-4" />} label="Status" value={formatRaceStatus(race.status)} />
          </div>

          <section className="grid gap-3 md:grid-cols-2">
            <DetailRow label="Tournament" value={race.tournamentName} />
            <DetailRow label="Schedule day" value={race.scheduleTitle ?? (race.dayNumber ? `Day ${race.dayNumber}` : '-')} />
            <DetailRow label="Rank group" value={race.rankGroup} />
            <DetailRow label="Track type" value={race.trackType} />
            <DetailRow label="Distance" value={race.distanceM ? `${race.distanceM}m` : '-'} />
            <DetailRow label="Max horses" value={race.maxHorses ? String(race.maxHorses) : '-'} />
            <DetailRow label="Registered horses" value={String(race.registeredHorseCount ?? 0)} />
            <DetailRow label="Accepted jockeys" value={race.acceptedJockeyCount === undefined ? '-' : String(race.acceptedJockeyCount)} />
            <DetailRow label="Assigned referees" value={race.assignedRefereeCount === undefined ? '-' : String(race.assignedRefereeCount)} />
            <DetailRow label="Prediction closes" value={race.predictionClosesAt ? formatDateTime(race.predictionClosesAt) : '-'} />
          </section>

          <section>
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-secondary">
                  <Users className="h-4 w-4" /> Participants
                </p>
                <h3 className="font-display mt-1 text-xl font-bold text-on-surface">Horses and jockeys</h3>
              </div>
              <span className="shrink-0 rounded-full bg-secondary-container/45 px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-on-secondary-container">
                {detail.participants.length} entries
              </span>
            </div>

            {detail.participantErrorMessage && (
              <div className="mb-3 rounded-lg border border-error/40 bg-error-container/25 px-4 py-3 text-sm font-semibold text-error">
                {detail.participantErrorMessage}
              </div>
            )}

            {detail.participants.length > 0 ? (
              <div className="overflow-hidden rounded-xl border border-outline-variant/40">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[680px] text-left">
                    <thead className="bg-surface-container-lowest/80">
                      <tr>
                        <th className="px-4 py-3 text-xs font-bold uppercase tracking-[0.16em] text-outline">Gate</th>
                        <th className="px-4 py-3 text-xs font-bold uppercase tracking-[0.16em] text-outline">Horse</th>
                        <th className="px-4 py-3 text-xs font-bold uppercase tracking-[0.16em] text-outline">Jockey</th>
                        <th className="px-4 py-3 text-xs font-bold uppercase tracking-[0.16em] text-outline">Stable</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant/40 bg-surface-container-lowest/45">
                      {detail.participants.map((participant, index) => (
                        <tr key={participant.assignmentId || `${participant.horseId}-${participant.jockeyId}-${index}`}>
                          <td className="px-4 py-3 text-sm font-extrabold text-primary">
                            {participant.gateNumber || '-'}
                          </td>
                          <td className="px-4 py-3">
                            <ParticipantIdentity
                              imageUrl={participant.horseAvatarUrl}
                              name={participant.horseName}
                              fallbackLabel="H"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <ParticipantIdentity
                              imageUrl={participant.jockeyAvatarUrl}
                              name={participant.jockeyName}
                              fallbackLabel="J"
                            />
                          </td>
                          <td className="px-4 py-3 text-sm text-on-surface-variant">{participant.stableName}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : !detail.participantErrorMessage ? (
              <EmptyState text="No approved horses and confirmed jockeys found for this race." />
            ) : null}
          </section>
        </div>
      )}
    </Modal>
  );
};

const ParticipantIdentity = ({
  imageUrl,
  name,
  fallbackLabel,
}: {
  imageUrl?: string;
  name: string;
  fallbackLabel: string;
}) => (
  <div className="flex min-w-[160px] items-center gap-3">
    {imageUrl ? (
      <img
        src={imageUrl}
        alt=""
        className="h-9 w-9 shrink-0 rounded-full border border-outline-variant/50 object-cover"
        loading="lazy"
      />
    ) : (
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-outline-variant/50 bg-surface-container-high text-xs font-extrabold text-primary">
        {fallbackLabel}
      </span>
    )}
    <span className="text-sm font-semibold text-on-surface">{name}</span>
  </div>
);

const PredictionDetailModal = ({
  detail,
  onClose,
}: {
  detail: PredictionDetailState;
  onClose: () => void;
}) => {
  const bet = detail.detailBet ?? detail.sourceBet;
  const isPending = bet.status.toLowerCase() === 'pending';
  const rewardPoints = isPending ? bet.potentialPayout : (bet.rewardPoints ?? 0);

  return (
    <Modal title={bet.raceName} subtitle={`Prediction #${bet.betId}`} onClose={onClose}>
      {detail.isLoading ? (
        <div className="flex items-center justify-center gap-3 rounded-xl border border-outline-variant/40 bg-surface-container-lowest/70 px-4 py-10 text-sm font-semibold text-on-surface-variant">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          Loading prediction detail
        </div>
      ) : (
        <div className="space-y-5">
          {detail.errorMessage && (
            <div className="rounded-lg border border-error/40 bg-error-container/25 px-4 py-3 text-sm font-semibold text-error">
              {detail.errorMessage}
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-3">
            <DetailMetric
              icon={<Trophy className="h-4 w-4" />}
              label="Points placed"
              value={formatPoints(bet.amount)}
            />
            <DetailMetric
              icon={<Clock3 className="h-4 w-4" />}
              label="Bet rate"
              value={formatRate(bet.currentRate ?? bet.odds)}
            />
            <DetailMetric
              icon={<Trophy className="h-4 w-4" />}
              label="Status"
              value={formatRaceStatus(bet.status)}
            />
          </div>

          <section className="grid gap-3 md:grid-cols-2">
            <DetailRow label="Horse" value={bet.horseName} />
            <DetailRow label="Jockey" value={bet.jockeyName ?? '-'} />
            <DetailRow label="Placed at" value={formatDateTime(bet.createdAt)} />
            <DetailRow label="Race schedule" value={formatDateTime(bet.scheduledAt)} />
            <DetailRow label="Prediction closes" value={formatDateTime(bet.predictionClosesAt)} />
            <DetailRow label={isPending ? 'Potential reward' : 'Reward points'} value={formatPoints(rewardPoints)} />
            {!isPending && <DetailRow label="Settled at" value={formatDateTime(bet.settledAt)} />}
            {!isPending && (
              <DetailRow
                label="Finish position"
                value={bet.finishPosition === undefined ? '-' : `#${bet.finishPosition}`}
              />
            )}
          </section>
        </div>
      )}
    </Modal>
  );
};

const ResultDetailModal = ({ detail, onClose }: { detail: ResultDetailState; onClose: () => void }) => {
  const { sourceResult, summary, isLoading, errorMessage } = detail;
  const raceName = summary?.raceName ?? sourceResult.raceName;
  const entries = summary?.entries ?? sourceResult.topFinishers.map((finisher, index): RaceResultEntry => ({
    id: `${sourceResult.id}-${finisher.rank}`,
    assignmentId: '',
    horseId: '',
    horseName: finisher.horseName,
    jockeyName: finisher.jockeyName,
    gateNumber: 0,
    finishPosition: finisher.rank || index + 1,
    finishTime: finisher.finishTime,
    pointsAwarded: 0,
    isDisqualified: false,
  }));

  return (
    <Modal title={raceName} subtitle="Result detail" onClose={onClose} wide>
      {isLoading ? (
        <div className="flex items-center justify-center gap-3 rounded-xl border border-outline-variant/40 bg-surface-container-lowest/70 px-4 py-10 text-sm font-semibold text-on-surface-variant">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          Loading result detail
        </div>
      ) : (
        <div className="space-y-5">
          {errorMessage && (
            <div className="rounded-lg border border-error/40 bg-error-container/25 px-4 py-3 text-sm font-semibold text-error">
              {errorMessage}
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-3">
            <DetailMetric icon={<Trophy className="h-4 w-4" />} label="Winner" value={summary?.winnerHorse ?? sourceResult.topFinishers[0]?.horseName ?? '-'} />
            <DetailMetric icon={<Clock3 className="h-4 w-4" />} label="Finish time" value={summary?.winnerTime ?? sourceResult.topFinishers[0]?.finishTime ?? '-'} />
            <DetailMetric icon={<CalendarDays className="h-4 w-4" />} label="Published" value={formatDateTime(summary?.publishedAt ?? sourceResult.publishedAt ?? sourceResult.date)} />
          </div>

          <section className="grid gap-3 md:grid-cols-3">
            <DetailRow label="Tournament" value={summary?.tournamentName ?? sourceResult.tournamentName} />
            <DetailRow label="Track" value={summary?.track ?? sourceResult.track} />
            <DetailRow label="Distance" value={summary?.distance ?? '-'} />
          </section>

          <section>
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-secondary">Rankings</p>
                <h3 className="font-display mt-1 text-xl font-bold text-on-surface">Horse and jockey standings</h3>
              </div>
              <span className="rounded-full bg-secondary-container/45 px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-on-secondary-container">
                {entries.length} entries
              </span>
            </div>

            <div className="overflow-hidden rounded-xl border border-outline-variant/40">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-left">
                  <thead className="bg-surface-container-lowest/80">
                    <tr>
                      <th className="px-4 py-3 text-xs font-bold uppercase tracking-[0.16em] text-outline">Rank</th>
                      <th className="px-4 py-3 text-xs font-bold uppercase tracking-[0.16em] text-outline">Horse</th>
                      <th className="px-4 py-3 text-xs font-bold uppercase tracking-[0.16em] text-outline">Jockey</th>
                      <th className="px-4 py-3 text-xs font-bold uppercase tracking-[0.16em] text-outline">Gate</th>
                      <th className="px-4 py-3 text-xs font-bold uppercase tracking-[0.16em] text-outline">Time</th>
                      <th className="px-4 py-3 text-xs font-bold uppercase tracking-[0.16em] text-outline">Points</th>
                      <th className="px-4 py-3 text-xs font-bold uppercase tracking-[0.16em] text-outline">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/40 bg-surface-container-lowest/45">
                    {entries.map((entry, index) => (
                      <tr key={entry.id || `${entry.horseName}-${index}`}>
                        <td className="px-4 py-3 text-sm font-extrabold text-primary">#{entry.finishPosition ?? index + 1}</td>
                        <td className="px-4 py-3 text-sm font-semibold text-on-surface">{entry.horseName}</td>
                        <td className="px-4 py-3 text-sm text-on-surface-variant">{entry.jockeyName}</td>
                        <td className="px-4 py-3 text-sm text-on-surface-variant">{entry.gateNumber || '-'}</td>
                        <td className="px-4 py-3 text-sm font-semibold text-on-surface">{entry.finishTime ?? '-'}</td>
                        <td className="px-4 py-3 text-sm text-on-surface-variant">{entry.pointsAwarded || '-'}</td>
                        <td className="px-4 py-3">
                          <span className={`rounded-full px-2 py-1 text-xs font-bold uppercase tracking-[0.12em] ${entry.isDisqualified ? 'bg-error-container/30 text-error' : 'bg-secondary-container/45 text-on-secondary-container'}`}>
                            {entry.isDisqualified ? 'DQ' : 'Finished'}
                          </span>
                        </td>
                      </tr>
                    ))}

                    {entries.length === 0 && (
                      <tr>
                        <td className="px-4 py-6 text-center text-sm font-semibold text-on-surface-variant" colSpan={7}>
                          No ranking entries found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        </div>
      )}
    </Modal>
  );
};

const DetailMetric = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) => (
  <div className="rounded-xl border border-outline-variant/40 bg-surface-container-lowest/70 p-4">
    <div className="mb-3 flex items-center justify-between text-on-surface-variant">
      <span className="text-xs font-bold uppercase tracking-[0.16em]">{label}</span>
      <span className="text-primary">{icon}</span>
    </div>
    <p className="break-words text-sm font-bold text-on-surface">{value || '-'}</p>
  </div>
);

const DetailRow = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-xl border border-outline-variant/40 bg-surface-container-lowest/55 px-4 py-3">
    <p className="mb-1 text-xs font-bold uppercase tracking-[0.16em] text-outline">{label}</p>
    <p className="break-words text-sm font-semibold text-on-surface">{value || '-'}</p>
  </div>
);

const Modal = ({
  title,
  subtitle,
  onClose,
  wide = false,
  children,
}: {
  title: string;
  subtitle: string;
  onClose: () => void;
  wide?: boolean;
  children: React.ReactNode;
}) => {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center overflow-hidden bg-black/60 p-4 md:p-8"
      role="dialog"
      aria-modal="true"
      aria-labelledby="spectator-detail-title"
    >
      <div className={`w-full ${wide ? 'max-w-5xl' : 'max-w-3xl'}`}>
        <motion.div
          className="glass-panel flex max-h-[calc(100dvh-2rem)] w-full flex-col overflow-hidden rounded-2xl shadow-xl md:max-h-[calc(100dvh-4rem)]"
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
        >
          <div className="flex shrink-0 items-start justify-between gap-4 border-b border-outline-variant/40 p-6">
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-secondary">{subtitle}</p>
              <h2 id="spectator-detail-title" className="font-display text-2xl font-bold text-on-surface">{title}</h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-outline-variant/50 bg-surface-container-lowest p-2 text-on-surface-variant transition hover:border-primary hover:text-primary"
              aria-label="Close race detail"
              title="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="min-h-0 overflow-y-auto p-6">
            {children}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default SpectatorDashboard;
