import { Trophy } from 'lucide-react';

const jockeys = [
  {
    id: 1,
    name: 'Julian Castano',
    stats: 'Assigned to Derby operations',
    earnings: '12 events',
    image: 'https://picsum.photos/200/200?random=jockey1',
  },
  {
    id: 2,
    name: 'Sarah Miller',
    stats: 'Assigned to endurance operations',
    earnings: '09 events',
    image: 'https://picsum.photos/200/200?random=jockey2',
  },
];

const horses = [
  {
    id: 1,
    name: 'Iron Vanguard',
    grade: 'G1',
    lastResults: 'Cleared for Saigon Summer Derby',
    rating: 92,
    image: 'https://picsum.photos/400/300?random=horse1',
  },
  {
    id: 2,
    name: 'Eclipse Dancer',
    grade: 'G1',
    lastResults: 'Registered for Northern Sprint Invitational',
    rating: 88,
    image: 'https://picsum.photos/400/300?random=horse2',
  },
];

const StatsSection = () => {
  return (
    <section className="bg-surface pb-section-gap">
      <div className="mx-auto grid max-w-[1440px] grid-cols-1 gap-12 px-4 md:px-8 lg:grid-cols-2">
        <div>
          <div className="mb-8 flex items-center justify-between">
            <h2 className="font-display text-headline-md font-extrabold text-primary">Operations Team</h2>
            <span className="text-label-sm font-bold uppercase tracking-[0.16em] text-outline">Season 2026</span>
          </div>
          <div className="space-y-4">
            {jockeys.map((jockey) => (
              <div key={jockey.id} className="glass-panel group flex items-center justify-between rounded-xl p-4 transition-colors hover:border-secondary">
                <div className="flex items-center gap-4">
                  <img src={jockey.image} alt={jockey.name} className="h-14 w-14 rounded-lg border border-outline-variant/50 object-cover" />
                  <div>
                    <h4 className="font-display text-body-md font-bold text-on-surface">{jockey.name}</h4>
                    <p className="text-label-md text-on-surface-variant">{jockey.stats}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-display text-body-md font-bold text-secondary">{jockey.earnings}</p>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-outline">Assignments</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="mb-8 flex items-center justify-between">
            <h2 className="font-display text-headline-md font-extrabold text-primary">Registered Horses</h2>
            <span className="text-label-sm font-bold uppercase tracking-[0.16em] text-outline">Tournament Field</span>
          </div>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            {horses.map((horse) => (
              <div key={horse.id} className="glass-panel group overflow-hidden rounded-xl">
                <img src={horse.image} alt={horse.name} className="h-44 w-full object-cover opacity-90 transition group-hover:scale-[1.02]" />
                <div className="p-4">
                  <div className="mb-2 flex items-start justify-between gap-3">
                    <h4 className="font-display text-body-md font-bold text-on-surface">{horse.name}</h4>
                    <span className="rounded bg-secondary-container/60 px-2 py-1 text-[10px] font-bold text-on-secondary-container">{horse.grade}</span>
                  </div>
                  <div className="mb-4 flex items-center gap-2">
                    <Trophy className="h-3 w-3 text-primary" />
                    <p className="text-[10px] font-medium text-on-surface-variant">{horse.lastResults}</p>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] font-bold">
                      <span className="uppercase tracking-wider text-outline">Form Rating</span>
                      <span className="text-secondary">{horse.rating}/100</span>
                    </div>
                    <div className="h-1 w-full overflow-hidden rounded-full bg-surface-container-highest">
                      <div className="h-full rounded-full bg-secondary" style={{ width: `${horse.rating}%` }} />
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
