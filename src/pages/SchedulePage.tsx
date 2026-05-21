import { Calendar, MapPin, Filter } from 'lucide-react';

const schedules = [
  {
    id: 1,
    date: 'May 25, 2026',
    time: '14:30',
    track: 'Churchill Downs',
    location: 'Louisville, KY',
    raceName: 'Spring Invitational Stakes',
    grade: 'Grade 1',
    distance: '1 1/4 Miles',
    surface: 'Dirt',
    prize: '$1,500,000'
  },
  {
    id: 2,
    date: 'May 26, 2026',
    time: '16:00',
    track: 'Royal Ascot',
    location: 'Ascot, Berkshire',
    raceName: 'Queen Anne Stakes',
    grade: 'Grade 1',
    distance: '1 Mile',
    surface: 'Turf',
    prize: '£600,000'
  },
  {
    id: 3,
    date: 'May 28, 2026',
    time: '13:15',
    track: 'Meydan Racecourse',
    location: 'Dubai, UAE',
    raceName: 'Desert Classic',
    grade: 'Grade 2',
    distance: '2,000m',
    surface: 'Dirt',
    prize: '$750,000'
  }
];

const SchedulePage = () => {
  return (
    <div className="bg-surface min-h-screen py-12">
      <div className="max-w-container mx-auto px-4 md:px-margin-desktop">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div>
            <h1 className="text-headline-lg font-bold text-primary mb-2">Race Schedule</h1>
            <p className="text-body-md text-on-surface-variant">Stay updated with the upcoming elite horse racing events worldwide.</p>
          </div>
          <div className="flex items-center gap-4">
            <button className="flex items-center gap-2 bg-white border border-outline-variant px-4 py-2 rounded-md text-body-sm font-medium hover:bg-surface-container transition-colors">
              <Filter className="w-4 h-4" />
              Filter
            </button>
            <button className="bg-primary text-on-primary px-6 py-2 rounded-md text-body-sm font-semibold hover:bg-opacity-90 transition-all">
              Today's Races
            </button>
          </div>
        </div>

        {/* Schedule List */}
        <div className="space-y-6">
          {schedules.map((race) => (
            <div key={race.id} className="bg-white border border-outline-variant rounded-lg p-6 hover:border-secondary transition-all group">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
                {/* Time & Date */}
                <div className="flex items-center gap-6 shrink-0">
                  <div className="text-center min-w-[80px]">
                    <p className="text-label-sm text-outline uppercase tracking-widest mb-1">Time</p>
                    <p className="text-headline-md font-bold text-primary">{race.time}</p>
                  </div>
                  <div className="w-px h-12 bg-outline-variant hidden md:block" />
                  <div>
                    <div className="flex items-center gap-2 text-on-surface-variant mb-1">
                      <Calendar className="w-4 h-4" />
                      <span className="text-body-sm font-medium">{race.date}</span>
                    </div>
                    <div className="flex items-center gap-2 text-on-surface-variant">
                      <MapPin className="w-4 h-4" />
                      <span className="text-body-sm font-medium">{race.track}, {race.location}</span>
                    </div>
                  </div>
                </div>

                {/* Race Info */}
                <div className="flex-grow">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-body-lg font-bold text-primary">{race.raceName}</h3>
                    <span className="text-[10px] font-bold text-secondary bg-secondary/10 px-2 py-0.5 rounded uppercase tracking-wider">
                      {race.grade}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-x-6 gap-y-2">
                    <div className="flex items-center gap-2 text-label-md text-outline">
                      <span className="font-bold uppercase tracking-wider">Distance:</span>
                      <span className="text-on-surface-variant font-semibold">{race.distance}</span>
                    </div>
                    <div className="flex items-center gap-2 text-label-md text-outline">
                      <span className="font-bold uppercase tracking-wider">Surface:</span>
                      <span className="text-on-surface-variant font-semibold">{race.surface}</span>
                    </div>
                    <div className="flex items-center gap-2 text-label-md text-outline">
                      <span className="font-bold uppercase tracking-wider">Prize:</span>
                      <span className="text-secondary font-bold">{race.prize}</span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-4 shrink-0">
                  <button className="flex-1 lg:flex-none bg-white border border-primary text-primary px-6 py-2.5 rounded-md text-body-sm font-bold hover:bg-surface-container transition-all">
                    Race Details
                  </button>
                  <button className="flex-1 lg:flex-none bg-secondary text-white px-6 py-2.5 rounded-md text-body-sm font-bold hover:bg-opacity-90 transition-all">
                    Place Bet
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SchedulePage;
