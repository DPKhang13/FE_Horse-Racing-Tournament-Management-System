import { Trophy } from 'lucide-react';

const jockeys = [
  {
    id: 1,
    name: 'Julian Castano',
    stats: 'Win Rate: 24.5% • 142 Wins',
    earnings: '$4.2M',
    rank: 1,
    image: 'https://images.unsplash.com/photo-1552058544-f2b08422138a?auto=format&fit=crop&q=80&w=200'
  },
  {
    id: 2,
    name: 'Sarah Miller',
    stats: 'Win Rate: 21.8% • 128 Wins',
    earnings: '$3.8M',
    rank: 2,
    image: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=200'
  }
];

const horses = [
  {
    id: 1,
    name: 'Iron Vanguard',
    grade: 'G1',
    lastResults: '1-1-2-1-1',
    rating: 92,
    image: 'https://images.unsplash.com/photo-1553284965-83fd3e82fa5a?auto=format&fit=crop&q=80&w=400'
  },
  {
    id: 2,
    name: 'Eclipse Dancer',
    grade: 'G1',
    lastResults: '1-2-1-3-1',
    rating: 88,
    image: 'https://images.unsplash.com/photo-1598974357801-cbca100e65d3?auto=format&fit=crop&q=80&w=400'
  }
];

const StatsSection = () => {
  return (
    <section className="py-section-gap">
      <div className="max-w-container mx-auto px-4 md:px-margin-desktop grid grid-cols-1 lg:grid-cols-2 gap-12">
        
        {/* Top Jockeys */}
        <div>
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-headline-md font-bold text-primary">Top Jockeys</h2>
            <span className="text-label-sm text-outline uppercase tracking-widest">Season 2026</span>
          </div>
          <div className="space-y-4">
            {jockeys.map((jockey) => (
              <div key={jockey.id} className="flex items-center justify-between p-4 bg-white border border-outline-variant rounded-lg hover:border-secondary transition-colors group">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <img src={jockey.image} alt={jockey.name} className="w-14 h-14 rounded-md object-cover" />
                    <span className="absolute -bottom-1 -right-1 w-5 h-5 bg-primary text-white text-[10px] font-bold flex items-center justify-center rounded-full border-2 border-white">
                      {jockey.rank}
                    </span>
                  </div>
                  <div>
                    <h4 className="text-body-md font-bold text-primary">{jockey.name}</h4>
                    <p className="text-label-md text-on-surface-variant">{jockey.stats}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-body-md font-bold text-secondary">{jockey.earnings}</p>
                  <p className="text-[10px] font-bold text-outline uppercase tracking-wider">Earnings</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Champion Horses */}
        <div>
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-headline-md font-bold text-primary">Champion Horses</h2>
            <span className="text-label-sm text-outline uppercase tracking-widest">Power Rankings</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {horses.map((horse) => (
              <div key={horse.id} className="bg-white border border-outline-variant rounded-lg overflow-hidden group">
                <img src={horse.image} alt={horse.name} className="w-full h-40 object-cover" />
                <div className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="text-body-md font-bold text-primary">{horse.name}</h4>
                    <span className="text-[10px] font-bold text-secondary bg-secondary/10 px-1.5 py-0.5 rounded">{horse.grade}</span>
                  </div>
                  <div className="flex items-center gap-2 mb-4">
                    <Trophy className="w-3 h-3 text-tertiary-container" />
                    <p className="text-[10px] text-on-surface-variant font-medium">Last 5: {horse.lastResults}</p>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] font-bold">
                      <span className="text-outline uppercase tracking-wider">Form Rating</span>
                      <span className="text-secondary">{horse.rating}/100</span>
                    </div>
                    <div className="w-full h-1 bg-surface-container rounded-full overflow-hidden">
                      <div className="h-full bg-secondary rounded-full" style={{ width: `${horse.rating}%` }} />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </section>
  );
};

export default StatsSection;
