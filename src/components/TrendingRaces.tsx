import { Activity, ChevronRight } from 'lucide-react';

const races = [
  {
    id: 1,
    track: 'Epsom Downs • R4',
    name: 'Starlight Sprint',
    status: '2M LEFT',
    statusColor: 'bg-secondary/10 text-secondary',
    horses: [
      { id: 1, name: 'Thunder Bolt', rank: 7, odds: '2.40' },
      { id: 2, name: 'Golden Mane', rank: 2, odds: '5.50' },
    ]
  },
  {
    id: 2,
    track: 'Santa Anita • R7',
    name: 'Pacific Classic',
    status: 'LIVE',
    statusColor: 'bg-secondary/10 text-secondary',
    horses: [
      { id: 1, name: 'Desert Wind', rank: 4, odds: '1.85' },
      { id: 2, name: 'Royal Guard', rank: 1, odds: '4.20' },
    ]
  },
  {
    id: 3,
    track: 'Meydan • R2',
    name: 'Dubai Gold Cup',
    status: '15M',
    statusColor: 'bg-tertiary/10 text-tertiary-container',
    horses: [
      { id: 1, name: 'Oasis Dream', rank: 9, odds: '3.10' },
      { id: 2, name: 'Night Fury', rank: 5, odds: '6.80' },
    ]
  }
];

const TrendingRaces = () => {
  return (
    <section className="py-section-gap bg-surface">
      <div className="max-w-container mx-auto px-4 md:px-margin-desktop">
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Activity className="w-5 h-5 text-secondary" />
              <h2 className="text-headline-md font-bold text-primary">Trending Races</h2>
            </div>
            <p className="text-body-sm text-on-surface-variant">Real-time updates from tracks worldwide</p>
          </div>
          <a href="#" className="flex items-center gap-1 text-secondary text-label-md font-bold hover:underline">
            View All <ChevronRight className="w-4 h-4" />
          </a>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {races.map((race) => (
            <div key={race.id} className="bg-white rounded-lg border border-outline-variant p-6 hover:shadow-lg transition-all group">
              <div className="flex justify-between items-start mb-4">
                <span className="text-[10px] font-bold text-outline uppercase tracking-wider">{race.track}</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${race.statusColor}`}>{race.status}</span>
              </div>
              <h3 className="text-body-lg font-bold text-primary mb-6">{race.name}</h3>
              
              <div className="space-y-4">
                {race.horses.map((horse) => (
                  <div key={horse.id} className="flex items-center justify-between p-3 bg-surface-container-lowest rounded-md border border-outline-variant/30">
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 flex items-center justify-center bg-primary-container text-on-primary-container text-[10px] font-bold rounded-full">
                        {horse.rank}
                      </span>
                      <span className="text-body-sm font-medium text-primary">{horse.name}</span>
                    </div>
                    <span className="text-body-sm font-bold text-primary">{horse.odds}</span>
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
