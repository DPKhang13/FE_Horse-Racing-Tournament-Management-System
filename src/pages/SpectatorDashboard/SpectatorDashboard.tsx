import React, { useEffect, useMemo, useState } from 'react';
import { Bell, CalendarDays, Clock3, Trophy } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getApiErrorMessage } from '../../services/apiClient';
import { betService, type BetItem } from '../../services/betService';
import { notificationService, type NotificationItem } from '../../services/notificationService';
import { raceResultService } from '../../services/raceResultService';
import { scheduleService, type RaceScheduleItem } from '../../services/scheduleService';
import type { RaceResultListItem } from '../../types/raceResult';
import { spectatorDashboardMockData } from './mockData';

const formatTime = (value: string) => new Intl.DateTimeFormat('en-US', {
  hour: '2-digit',
  minute: '2-digit',
}).format(new Date(value));

const formatPoints = (value: number) => new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 0,
}).format(value);

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

const SpectatorDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [upcomingRaces, setUpcomingRaces] = useState<RaceScheduleItem[]>([]);
  const [myPredictions, setMyPredictions] = useState<BetItem[]>([]);
  const [latestResults, setLatestResults] = useState<RaceResultListItem[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    let isMounted = true;

    const loadDashboard = async () => {
      setIsLoading(true);
      setErrorMessage('');

      try {
        const [races, bets, results, notificationList] = await Promise.allSettled([
          scheduleService.getRaceSchedule(),
          betService.getBets(),
          raceResultService.getRaceResultList(),
          notificationService.getNotifications(),
        ]);

        if (isMounted) {
          const nextUpcomingRaces = races.status === 'fulfilled'
            ? races.value.filter((race) => new Date(race.scheduledAt).getTime() >= Date.now()).slice(0, 6)
            : [];
          const nextMyPredictions = bets.status === 'fulfilled' ? bets.value.slice(0, 5) : [];
          const nextLatestResults = results.status === 'fulfilled' ? results.value.slice(0, 5) : [];
          const nextNotifications = notificationList.status === 'fulfilled' ? notificationList.value.slice(0, 5) : [];

          setUpcomingRaces(nextUpcomingRaces);
          setMyPredictions(nextMyPredictions);
          setLatestResults(nextLatestResults);
          setNotifications(nextNotifications);

          const hasAnyRealData =
            nextUpcomingRaces.length > 0 ||
            nextMyPredictions.length > 0 ||
            nextLatestResults.length > 0 ||
            nextNotifications.length > 0;

          if (!hasAnyRealData) {
            setUpcomingRaces(spectatorDashboardMockData.upcomingRaces);
            setMyPredictions(spectatorDashboardMockData.myPredictions);
            setLatestResults(spectatorDashboardMockData.latestResults);
            setNotifications(spectatorDashboardMockData.notifications);
          } else {
            setUpcomingRaces(nextUpcomingRaces);
            setMyPredictions(nextMyPredictions);
            setLatestResults(nextLatestResults);
            setNotifications(nextNotifications);
          }
        }
      } catch (error) {
        if (isMounted) {
          setErrorMessage(getApiErrorMessage(error, 'Unable to load spectator dashboard.'));
          setUpcomingRaces(spectatorDashboardMockData.upcomingRaces);
          setMyPredictions(spectatorDashboardMockData.myPredictions);
          setLatestResults(spectatorDashboardMockData.latestResults);
          setNotifications(spectatorDashboardMockData.notifications);
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
      label: 'Live Races',
      value: String(upcomingRaces.filter((race) => race.status.toLowerCase() === 'live').length).padStart(2, '0'),
      tone: 'text-secondary',
      action: () => document.getElementById('race-schedule')?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
    },
    {
      label: 'Open Predictions',
      value: String(myPredictions.filter((item) => item.status.toLowerCase() === 'pending').length).padStart(2, '0'),
      tone: 'text-primary',
      action: () => navigate('/prediction'),
    },
    {
      label: 'Notifications',
      value: String(notifications.length).padStart(2, '0'),
      tone: 'text-on-surface',
      action: () => navigate('/notifications'),
    },
  ], [myPredictions, navigate, notifications, upcomingRaces]);

  return (
    <main className="min-h-screen bg-surface text-on-surface">
      <section className="border-b border-outline-variant/40 bg-surface-container-low/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1440px] flex-col gap-8 px-4 py-10 md:px-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-3">
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-secondary">Spectator Experience</p>
              <h1 className="font-display text-4xl font-extrabold text-primary md:text-5xl">Spectator Dashboard</h1>
            </div>
          </div>

          {errorMessage && (
            <div className="rounded-lg border border-error/40 bg-error-container/25 px-4 py-3 text-sm font-semibold text-error">
              {errorMessage}
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-3">
            {metrics.map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={item.action}
                aria-label={`${item.label}: ${item.value}. Open details`}
                className="glass-panel w-full rounded-xl p-5 text-left transition hover:-translate-y-0.5 hover:border-primary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
              >
                <p className="text-sm text-on-surface-variant">{item.label}</p>
                <div className="mt-3 flex items-end justify-between gap-3">
                  <strong className={`font-display text-4xl font-extrabold ${item.tone}`}>{item.value}</strong>
                  <span className="rounded-full border border-outline-variant/50 bg-surface-container-lowest px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-on-surface-variant">
                    Today
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-[1440px] gap-8 px-4 py-8 md:px-8 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-8">
          <DashboardPanel id="race-schedule" eyebrow="Upcoming races" title="Race schedule" icon={<CalendarDays className="h-5 w-5 text-secondary" />}>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {isLoading && <EmptyState text="Loading races..." />}

              {!isLoading && upcomingRaces.map((race) => (
                <article key={race.raceId} className="rounded-xl border border-outline-variant/40 bg-surface-container-lowest/70 p-4 transition hover:border-primary/60">
                  <div className="flex items-center justify-between gap-3 text-xs text-on-surface-variant">
                    <span>{race.tournamentName}</span>
                    <span className="rounded-full bg-secondary-container/45 px-2 py-1 font-bold uppercase tracking-[0.12em] text-on-secondary-container">{race.status}</span>
                  </div>
                  <h3 className="font-display mt-3 text-xl font-bold text-on-surface">{race.raceName}</h3>
                  <p className="mt-2 text-sm text-on-surface-variant">{race.rankGroup} / {race.trackType}</p>
                  <div className="mt-4 flex items-center justify-between text-sm">
                    <span className="inline-flex items-center gap-1 text-secondary"><Clock3 className="h-4 w-4" /> {formatTime(race.scheduledAt)}</span>
                    <strong className="text-primary">{race.distanceM}m</strong>
                  </div>
                </article>
              ))}

              {!isLoading && upcomingRaces.length === 0 && <EmptyState text="No upcoming races found." />}
            </div>
          </DashboardPanel>

          <DashboardPanel eyebrow="My predictions" title="Your bets" icon={<Trophy className="h-5 w-5 text-primary" />}>
            <div className="space-y-3">
              {myPredictions.map((item) => (
                <article key={item.betId} className="rounded-xl border border-outline-variant/40 bg-surface-container-lowest/55 p-4">
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
                </article>
              ))}

              {!isLoading && myPredictions.length === 0 && <EmptyState text="No bets found." />}
            </div>
          </DashboardPanel>
        </div>

        <aside className="space-y-8">
          <DashboardPanel eyebrow="Latest results" title="Recent race results" icon={<Trophy className="h-5 w-5 text-primary" />}>
            <div className="space-y-3">
              {latestResults.map((item) => (
                <article key={item.id} className="rounded-xl border border-outline-variant/40 bg-surface-container-lowest/70 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="font-display text-lg font-bold text-on-surface">{item.raceName}</h3>
                      <p className="text-sm text-on-surface-variant">Winner: {item.topFinishers[0]?.horseName ?? '-'}</p>
                    </div>
                    <span className="rounded-full bg-secondary-container/45 px-2 py-1 text-xs font-bold uppercase tracking-[0.16em] text-on-secondary-container">{item.status}</span>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-sm text-on-surface-variant">
                    <span>Finish time: {item.topFinishers[0]?.finishTime ?? '-'}</span>
                    <strong className="text-primary">{item.totalPrizePool}</strong>
                  </div>
                  <p className="mt-2 text-xs uppercase tracking-[0.16em] text-outline">{formatDateTime(item.publishedAt ?? item.date)}</p>
                </article>
              ))}

              {!isLoading && latestResults.length === 0 && <EmptyState text="No race results found." />}
            </div>
          </DashboardPanel>

          <DashboardPanel eyebrow="Notifications" title="Updates" icon={<Bell className="h-5 w-5 text-secondary" />}>
            <div className="space-y-3">
              {notifications.map((item) => (
                <article key={item.notificationId} className="rounded-xl border border-outline-variant/40 bg-surface-container-lowest/55 p-4">
                  <h3 className="font-display text-base font-bold text-on-surface">{item.title}</h3>
                  <p className="mt-1 text-sm text-on-surface-variant">{item.message}</p>
                  <p className="mt-3 text-xs uppercase tracking-[0.16em] text-outline">{formatDateTime(item.createdAt)}</p>
                </article>
              ))}

              {!isLoading && notifications.length === 0 && <EmptyState text="No notifications found." />}
            </div>
          </DashboardPanel>
        </aside>
      </section>
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

export default SpectatorDashboard;
