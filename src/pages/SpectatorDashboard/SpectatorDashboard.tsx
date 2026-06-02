
import React from 'react';
import { Bell, CalendarDays, Trophy, Clock3, ArrowRight } from 'lucide-react';
import { latestResults, myPredictions, notifications, upcomingRaces } from '../../mocks/spectatorDashboard';

const SpectatorDashboard: React.FC = () => {
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

          <div className="grid gap-4 md:grid-cols-3">
            {[
              { label: 'Live Races', value: '08', accent: 'bg-[#85f8c4] text-[#005137]' },
              { label: 'Open Predictions', value: '12', accent: 'bg-[#ffe088] text-[#574500]' },
              { label: 'Notifications', value: '03', accent: 'bg-[#d6e3ff] text-[#0d1c32]' },
            ].map((item) => (
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
                <h2 className="mt-1 text-2xl font-semibold text-[#0d1c32]">Lịch đua hôm nay</h2>
              </div>
              <CalendarDays className="h-5 w-5 text-[#006c4a]" />
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {upcomingRaces.map((race) => (
                <article key={race.id} className="rounded-xl border border-[#e1e3e4] bg-[#f8f9fa] p-4 transition hover:border-[#006c4a] hover:bg-white">
                  <div className="flex items-center justify-between text-xs text-[#44474d]">
                    <span>{race.track}</span>
                    <span className="rounded-full bg-[#85f8c4] px-2 py-1 font-semibold text-[#005137]">{race.status}</span>
                  </div>
                  <h3 className="mt-3 text-xl font-semibold text-[#0d1c32]">{race.raceName}</h3>
                  <p className="mt-2 text-sm text-[#44474d]">Ngựa yêu thích: {race.favoriteHorse}</p>
                  <div className="mt-4 flex items-center justify-between text-sm">
                    <span className="inline-flex items-center gap-1 text-[#006c4a]"><Clock3 className="h-4 w-4" /> {race.time}</span>
                    <strong className="text-[#0d1c32]">Odds {race.odds}</strong>
                  </div>
                </article>
              ))}
            </div>
          </article>

          <article className="rounded-2xl border border-[#e1e3e4] bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#006c4a]">My predictions</p>
                <h2 className="mt-1 text-2xl font-semibold text-[#0d1c32]">Dự đoán của bạn</h2>
              </div>
              <Trophy className="h-5 w-5 text-[#735c00]" />
            </div>
            <div className="space-y-3">
              {myPredictions.map((item) => (
                <article key={item.id} className="rounded-xl border border-[#e1e3e4] p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-semibold text-[#0d1c32]">{item.raceName}</h3>
                      <p className="text-sm text-[#44474d]">{item.horse} • {item.jockey}</p>
                    </div>
                    <div className="text-right text-sm">
                      <p className="text-[#44474d]">Stake: {item.stake}</p>
                      <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${item.status === 'Open' ? 'bg-[#ffe088] text-[#574500]' : 'bg-[#d6e3ff] text-[#0d1c32]'}`}>
                        {item.status}
                      </span>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </article>
        </div>

        <aside className="space-y-8">
          <article className="rounded-2xl border border-[#e1e3e4] bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#006c4a]">Latest results</p>
                <h2 className="mt-1 text-2xl font-semibold text-[#0d1c32]">Kết quả mới</h2>
              </div>
              <Trophy className="h-5 w-5 text-[#735c00]" />
            </div>
            <div className="space-y-3">
              {latestResults.map((item) => (
                <article key={item.id} className="rounded-xl border border-[#e1e3e4] bg-[#f8f9fa] p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-semibold text-[#0d1c32]">{item.raceName}</h3>
                      <p className="text-sm text-[#44474d]">Winner: {item.winner}</p>
                    </div>
                    <span className="rounded-full bg-[#85f8c4] px-2 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#005137]">Published</span>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-sm text-[#44474d]">
                    <span>Finish time: {item.finishTime}</span>
                    <strong className="text-[#0d1c32]">{item.prize}</strong>
                  </div>
                  <p className="mt-2 text-xs uppercase tracking-[0.18em] text-[#75777e]">{item.publishedAt}</p>
                </article>
              ))}
            </div>
          </article>

          <article className="rounded-2xl border border-[#e1e3e4] bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#006c4a]">Notifications</p>
                <h2 className="mt-1 text-2xl font-semibold text-[#0d1c32]">Thông báo</h2>
              </div>
              <Bell className="h-5 w-5 text-[#006c4a]" />
            </div>
            <div className="space-y-3">
              {notifications.map((item) => (
                <article key={item.id} className="rounded-xl border border-[#e1e3e4] p-4">
                  <h3 className="text-base font-semibold text-[#0d1c32]">{item.title}</h3>
                  <p className="mt-1 text-sm text-[#44474d]">{item.detail}</p>
                  <p className="mt-3 text-xs uppercase tracking-[0.18em] text-[#75777e]">{item.time}</p>
                </article>
              ))}
            </div>
          </article>
        </aside>
      </section>
    </main>
  );
};

export default SpectatorDashboard;
