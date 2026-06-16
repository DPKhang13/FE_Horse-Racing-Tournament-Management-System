import React, { useEffect, useMemo, useState } from 'react';
import { Bell, CalendarDays, Trophy, Clock3, ArrowRight } from 'lucide-react';
import { getApiErrorMessage } from '../../services/apiClient';
import { betService, type BetItem } from '../../services/betService';
import { notificationService, type NotificationItem } from '../../services/notificationService';
import { raceResultService } from '../../services/raceResultService';
import { scheduleService, type RaceScheduleItem } from '../../services/scheduleService';
import type { RaceResultListItem } from '../../types/raceResult';

const formatTime = (value: string) => new Intl.DateTimeFormat('en-US', {
  hour: '2-digit',
  minute: '2-digit',
}).format(new Date(value));

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
          setUpcomingRaces(races.status === 'fulfilled' ? races.value.filter((race) => new Date(race.scheduledAt).getTime() >= Date.now()).slice(0, 6) : []);
          setMyPredictions(bets.status === 'fulfilled' ? bets.value.slice(0, 5) : []);
          setLatestResults(results.status === 'fulfilled' ? results.value.slice(0, 5) : []);
          setNotifications(notificationList.status === 'fulfilled' ? notificationList.value.slice(0, 5) : []);
        }
      } catch (error) {
        if (isMounted) {
          setErrorMessage(getApiErrorMessage(error, 'Unable to load spectator dashboard.'));
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
    { label: 'Live Races', value: String(upcomingRaces.filter((race) => race.status.toLowerCase() === 'live').length).padStart(2, '0'), accent: 'bg-[#85f8c4] text-[#005137]' },
    { label: 'Open Predictions', value: String(myPredictions.filter((item) => item.status.toLowerCase() === 'pending').length).padStart(2, '0'), accent: 'bg-[#ffe088] text-[#574500]' },
    { label: 'Notifications', value: String(notifications.length).padStart(2, '0'), accent: 'bg-[#d6e3ff] text-[#0d1c32]' },
  ], [myPredictions, notifications, upcomingRaces]);

  return (
    <main className="min-h-screen bg-[#f8f9fa] text-[#191c1d]">
      <section className="border-b border-[#e1e3e4] bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-10 md:px-8 lg:px-12">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#006c4a]">Spectator Experience</p>
              <h1 className="text-4xl font-bold tracking-tight text-[#0d1c32] md:text-5xl">Spectator Dashboard</h1>
            </div>
            <button className="inline-flex items-center gap-2 rounded-md bg-[#006c4a] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#005137]">
              View live races
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>

          {errorMessage && (
            <div className="rounded-md border border-[#ba1a1a]/30 bg-[#ffdad6]/40 px-4 py-3 text-sm font-semibold text-[#93000a]">
              {errorMessage}
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-3">
            {metrics.map((item) => (
              <article key={item.label} className="rounded-xl border border-[#e1e3e4] bg-white p-5 shadow-sm">
                <p className="text-sm text-[#44474d]">{item.label}</p>
                <div className="mt-3 flex items-end justify-between gap-3">
                  <strong className="text-3xl font-bold text-[#0d1c32]">{item.value}</strong>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] ${item.accent}`}>Today</span>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-8 px-4 py-8 md:px-8 lg:grid-cols-[1.1fr_0.9fr] lg:px-12">
        <div className="space-y-8">
          <article className="rounded-2xl border border-[#e1e3e4] bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#006c4a]">Upcoming races</p>
                <h2 className="mt-1 text-2xl font-semibold text-[#0d1c32]">Race schedule</h2>
              </div>
              <CalendarDays className="h-5 w-5 text-[#006c4a]" />
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {isLoading && (
                <div className="rounded-xl border border-[#e1e3e4] bg-[#f8f9fa] p-4 text-sm font-semibold text-[#44474d]">
                  Loading races...
                </div>
              )}

              {!isLoading && upcomingRaces.map((race) => (
                <article key={race.raceId} className="rounded-xl border border-[#e1e3e4] bg-[#f8f9fa] p-4 transition hover:border-[#006c4a] hover:bg-white">
                  <div className="flex items-center justify-between text-xs text-[#44474d]">
                    <span>{race.tournamentName}</span>
                    <span className="rounded-full bg-[#85f8c4] px-2 py-1 font-semibold text-[#005137]">{race.status}</span>
                  </div>
                  <h3 className="mt-3 text-xl font-semibold text-[#0d1c32]">{race.raceName}</h3>
                  <p className="mt-2 text-sm text-[#44474d]">{race.rankGroup} - {race.trackType}</p>
                  <div className="mt-4 flex items-center justify-between text-sm">
                    <span className="inline-flex items-center gap-1 text-[#006c4a]"><Clock3 className="h-4 w-4" /> {formatTime(race.scheduledAt)}</span>
                    <strong className="text-[#0d1c32]">{race.distanceM}m</strong>
                  </div>
                </article>
              ))}

              {!isLoading && upcomingRaces.length === 0 && (
                <div className="rounded-xl border border-[#e1e3e4] bg-[#f8f9fa] p-4 text-sm font-semibold text-[#44474d]">
                  No upcoming races found.
                </div>
              )}
            </div>
          </article>

          <article className="rounded-2xl border border-[#e1e3e4] bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#006c4a]">My predictions</p>
                <h2 className="mt-1 text-2xl font-semibold text-[#0d1c32]">Your bets</h2>
              </div>
              <Trophy className="h-5 w-5 text-[#735c00]" />
            </div>
            <div className="space-y-3">
              {myPredictions.map((item) => (
                <article key={item.betId} className="rounded-xl border border-[#e1e3e4] p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-semibold text-[#0d1c32]">{item.raceName}</h3>
                      <p className="text-sm text-[#44474d]">{item.horseName}{item.jockeyName ? ` - ${item.jockeyName}` : ''}</p>
                    </div>
                    <div className="text-right text-sm">
                      <p className="text-[#44474d]">Stake: {item.amount}</p>
                      <span className="inline-flex rounded-full bg-[#d6e3ff] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#0d1c32]">
                        {item.status}
                      </span>
                    </div>
                  </div>
                </article>
              ))}

              {!isLoading && myPredictions.length === 0 && (
                <div className="rounded-xl border border-[#e1e3e4] p-4 text-sm font-semibold text-[#44474d]">
                  No bets found.
                </div>
              )}
            </div>
          </article>
        </div>

        <aside className="space-y-8">
          <article className="rounded-2xl border border-[#e1e3e4] bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#006c4a]">Latest results</p>
                <h2 className="mt-1 text-2xl font-semibold text-[#0d1c32]">Recent race results</h2>
              </div>
              <Trophy className="h-5 w-5 text-[#735c00]" />
            </div>
            <div className="space-y-3">
              {latestResults.map((item) => (
                <article key={item.id} className="rounded-xl border border-[#e1e3e4] bg-[#f8f9fa] p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-semibold text-[#0d1c32]">{item.raceName}</h3>
                      <p className="text-sm text-[#44474d]">Winner: {item.topFinishers[0]?.horseName ?? '-'}</p>
                    </div>
                    <span className="rounded-full bg-[#85f8c4] px-2 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#005137]">{item.status}</span>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-sm text-[#44474d]">
                    <span>Finish time: {item.topFinishers[0]?.finishTime ?? '-'}</span>
                    <strong className="text-[#0d1c32]">{item.totalPrizePool}</strong>
                  </div>
                  <p className="mt-2 text-xs uppercase tracking-[0.18em] text-[#75777e]">{formatDateTime(item.publishedAt ?? item.date)}</p>
                </article>
              ))}

              {!isLoading && latestResults.length === 0 && (
                <div className="rounded-xl border border-[#e1e3e4] bg-[#f8f9fa] p-4 text-sm font-semibold text-[#44474d]">
                  No race results found.
                </div>
              )}
            </div>
          </article>

          <article className="rounded-2xl border border-[#e1e3e4] bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#006c4a]">Notifications</p>
                <h2 className="mt-1 text-2xl font-semibold text-[#0d1c32]">Updates</h2>
              </div>
              <Bell className="h-5 w-5 text-[#006c4a]" />
            </div>
            <div className="space-y-3">
              {notifications.map((item) => (
                <article key={item.notificationId} className="rounded-xl border border-[#e1e3e4] p-4">
                  <h3 className="text-base font-semibold text-[#0d1c32]">{item.title}</h3>
                  <p className="mt-1 text-sm text-[#44474d]">{item.message}</p>
                  <p className="mt-3 text-xs uppercase tracking-[0.18em] text-[#75777e]">{formatDateTime(item.createdAt)}</p>
                </article>
              ))}

              {!isLoading && notifications.length === 0 && (
                <div className="rounded-xl border border-[#e1e3e4] p-4 text-sm font-semibold text-[#44474d]">
                  No notifications found.
                </div>
              )}
            </div>
          </article>
        </aside>
      </section>
    </main>
  );
};

export default SpectatorDashboard;
