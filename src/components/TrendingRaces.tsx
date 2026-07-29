import { CalendarDays, MapPin, Trophy } from 'lucide-react';

const tournaments = [
  {
    id: 1,
    type: 'Derby',
    name: 'Saigon Summer Derby',
    status: 'Upcoming',
    statusColor: 'bg-primary/15 text-primary',
    date: 'Jul 10 - Jul 12, 2026',
    location: 'Ho Chi Minh City Grand Track',
    participants: '18/24 participants',
  },
  {
    id: 2,
    type: 'Endurance',
    name: 'Central Highlands Cup',
    status: 'Ongoing',
    statusColor: 'bg-secondary-container/50 text-on-secondary-container',
    date: 'Jun 20 - Jun 23, 2026',
    location: 'Da Lat Highland Course',
    participants: '20/20 participants',
  },
  {
    id: 3,
    type: 'Sprint',
    name: 'Northern Sprint Invitational',
    status: 'Upcoming',
    statusColor: 'bg-primary/15 text-primary',
    date: 'Aug 05 - Aug 06, 2026',
    location: 'Ha Noi Capital Track',
    participants: '9/12 participants',
  },
];

const TrendingRaces = () => {
  return (
    <section className="bg-surface py-section-gap">
      <div className="mx-auto max-w-[1440px] px-4 md:px-8">
        <div className="mb-8">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <Trophy className="h-5 w-5 text-secondary" />
              <h2 className="font-display text-headline-md font-extrabold text-primary">Featured Tournaments</h2>
            </div>
            <p className="text-body-sm text-on-surface-variant">Current tournament windows, venues, and registration capacity.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {tournaments.map((tournament) => (
            <div key={tournament.id} className="glass-panel group rounded-xl p-6 transition-all hover:border-primary/60">
              <div className="mb-4 flex items-start justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-outline">{tournament.type}</span>
                <span className={`rounded-full px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.12em] ${tournament.statusColor}`}>
                  {tournament.status}
                </span>
              </div>
              <h3 className="font-display mb-6 text-body-lg font-bold text-on-surface">{tournament.name}</h3>

              <div className="space-y-3">
                <div className="flex items-center gap-3 rounded-lg border border-outline-variant/30 bg-surface-container-lowest/80 p-3">
                  <CalendarDays className="h-4 w-4 shrink-0 text-primary" />
                  <span className="text-body-sm font-semibold text-on-surface">{tournament.date}</span>
                </div>
                <div className="flex items-center gap-3 rounded-lg border border-outline-variant/30 bg-surface-container-lowest/80 p-3">
                  <MapPin className="h-4 w-4 shrink-0 text-primary" />
                  <span className="text-body-sm font-semibold text-on-surface">{tournament.location}</span>
                </div>
                <div className="flex items-center gap-3 rounded-lg border border-outline-variant/30 bg-surface-container-lowest/80 p-3">
                  <Trophy className="h-4 w-4 shrink-0 text-primary" />
                  <span className="text-body-sm font-semibold text-on-surface">{tournament.participants}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TrendingRaces;
