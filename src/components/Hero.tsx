import { Activity, CalendarDays, Gauge, MapPin, Shield, Trophy, Users } from 'lucide-react';

const highlights = [
  {
    title: 'Tournament Operations',
    description: 'Create tournaments, manage race schedules, assign referees, and publish certified results.',
    icon: Trophy,
  },
  {
    title: 'Role-Based Workspace',
    description: 'Admin, horse owner, jockey, referee, and spectator each see only the tools for their role.',
    icon: Users,
  },
  {
    title: 'Secure Account Flow',
    description: 'Sign up, verify email, sign in, and continue directly to the matching dashboard.',
    icon: Shield,
  },
];

const featuredTournaments = [
  { name: 'Saigon Summer Derby', location: 'Ho Chi Minh City', date: 'Jul 10 - Jul 12', status: 'Upcoming' },
  { name: 'Central Highlands Cup', location: 'Da Lat Highland Course', date: 'Jun 20 - Jun 23', status: 'Ongoing' },
  { name: 'Northern Sprint Invitational', location: 'Ha Noi Capital Track', date: 'Aug 05 - Aug 06', status: 'Upcoming' },
];

const Hero = () => {
  return (
    <main className="relative min-h-[calc(100vh-73px)] overflow-hidden bg-surface">
      <div
        className="absolute inset-0 bg-cover bg-center opacity-45"
        style={{
          backgroundImage:
            'linear-gradient(90deg, rgba(6,14,32,0.98) 0%, rgba(11,19,38,0.84) 45%, rgba(11,19,38,0.42) 100%), url("https://images.unsplash.com/photo-1599408162165-8b753ca992aa?auto=format&fit=crop&q=80&w=2200")',
        }}
      />
      <div className="absolute inset-0 racing-grid opacity-70" />

      <section className="relative mx-auto grid min-h-[calc(100vh-73px)] max-w-[1440px] items-center gap-10 px-4 py-16 md:px-8 lg:grid-cols-[1.04fr_0.96fr]">
        <div>
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-2 text-xs font-extrabold uppercase tracking-[0.16em] text-primary">
            <span className="h-2 w-2 animate-pulse rounded-full bg-secondary" />
            Live Tournament Network
          </div>

          <h1 className="font-display max-w-4xl text-5xl font-extrabold leading-tight text-on-surface md:text-7xl">
            Horse Tournament Management System
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-on-surface-variant">
            Command-center tools for tournament management, race schedules, role dashboards, certified results, and spectator tracking.
          </p>

          <div className="mt-10 grid max-w-2xl gap-4 sm:grid-cols-3">
            {[
              { label: 'Live latency', value: '1.2ms', icon: Gauge },
              { label: 'Race feeds', value: '24/7', icon: Activity },
              { label: 'Certified results', value: '100%', icon: Trophy },
            ].map((item) => (
              <div key={item.label} className="glass-panel rounded-xl p-4">
                <item.icon className="mb-3 h-5 w-5 text-primary" />
                <p className="font-display text-2xl font-extrabold text-primary">{item.value}</p>
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-on-surface-variant">{item.label}</p>
              </div>
            ))}
          </div>
        </div>

        <aside className="glass-panel rounded-2xl p-5 md:p-7">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-secondary">Tournament Board</p>
              <h2 className="font-display mt-1 text-2xl font-bold text-on-surface">Featured Events</h2>
            </div>
            <span className="rounded-full bg-primary/15 px-3 py-1 text-xs font-extrabold uppercase tracking-[0.14em] text-primary">
              Admin Ready
            </span>
          </div>

          <div className="space-y-3">
            {featuredTournaments.map((item, index) => (
              <div key={item.name} className="rounded-xl border border-outline-variant/40 bg-surface-container-lowest/75 p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span className="gold-gradient flex h-9 w-9 items-center justify-center rounded-lg text-sm font-extrabold text-on-primary">
                      {index + 1}
                    </span>
                    <div>
                      <p className="font-bold text-on-surface">{item.name}</p>
                      <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-semibold uppercase tracking-[0.12em] text-on-surface-variant">
                        <span className="inline-flex items-center gap-1">
                          <CalendarDays className="h-3 w-3" />
                          {item.date}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {item.location}
                        </span>
                      </p>
                    </div>
                  </div>
                  <strong className="shrink-0 rounded-full bg-secondary-container/40 px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.12em] text-secondary">
                    {item.status}
                  </strong>
                </div>
              </div>
            ))}
          </div>
        </aside>
      </section>

      <section className="relative mx-auto grid max-w-[1440px] gap-5 px-4 pb-16 md:px-8 lg:grid-cols-3">
        {highlights.map((item) => (
          <article key={item.title} className="glass-panel rounded-2xl p-6">
            <item.icon className="mb-5 h-7 w-7 text-primary" />
            <h2 className="font-display text-xl font-bold text-on-surface">{item.title}</h2>
            <p className="mt-3 text-sm leading-6 text-on-surface-variant">{item.description}</p>
          </article>
        ))}
      </section>
    </main>
  );
};

export default Hero;
