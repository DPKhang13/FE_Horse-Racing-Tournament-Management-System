import { Activity } from 'lucide-react';

const races = [
  {
    id: 1,
    track: 'Epsom Downs / R4',
    name: 'Starlight Sprint',
    status: '2M LEFT',
    statusColor: 'bg-secondary-container/50 text-on-secondary-container',
    horses: [
      { id: 1, name: 'Thunder Bolt', rank: 7, odds: '2.40' },
      { id: 2, name: 'Golden Mane', rank: 2, odds: '5.50' },
    ],
  },
  {
    id: 2,
    track: 'Santa Anita / R7',
    name: 'Pacific Classic',
    status: 'LIVE',
    statusColor: 'bg-error-container/35 text-error',
    horses: [
      { id: 1, name: 'Desert Wind', rank: 4, odds: '1.85' },
      { id: 2, name: 'Royal Guard', rank: 1, odds: '4.20' },
    ],
  },
  {
    id: 3,
    track: 'Meydan / R2',
    name: 'Dubai Gold Cup',
    status: '15M',
    statusColor: 'bg-primary/15 text-primary',
    horses: [
      { id: 1, name: 'Oasis Dream', rank: 9, odds: '3.10' },
      { id: 2, name: 'Night Fury', rank: 5, odds: '6.80' },
    ],
  },
];

const TrendingRaces = () => {
  return (
    <section className="bg-surface py-section-gap">
      <div className="mx-auto max-w-[1440px] px-4 md:px-8">
        <div className="mb-8">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <Activity className="h-5 w-5 text-secondary" />
              <h2 className="font-display text-headline-md font-extrabold text-primary">Trending Races</h2>
            </div>
            <p className="text-body-sm text-on-surface-variant">Real-time updates from active tracks.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {races.map((race) => (
            <div key={race.id} className="glass-panel group rounded-xl p-6 transition-all hover:border-primary/60">
              <div className="mb-4 flex items-start justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-outline">{race.track}</span>
                <span className={`rounded-full px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.12em] ${race.statusColor}`}>
                  {race.status}
                </span>
              </div>
              <h3 className="font-display mb-6 text-body-lg font-bold text-on-surface">{race.name}</h3>

              <div className="space-y-4">
                {race.horses.map((horse) => (
                  <div key={horse.id} className="flex items-center justify-between rounded-lg border border-outline-variant/30 bg-surface-container-lowest/80 p-3">
                    <div className="flex items-center gap-3">
                      <span className="gold-gradient flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold text-on-primary">
                        {horse.rank}
                      </span>
                      <span className="text-body-sm font-semibold text-on-surface">{horse.name}</span>
                    </div>
                    <span className="font-display text-body-sm font-bold text-primary">{horse.odds}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TrendingRaces;
