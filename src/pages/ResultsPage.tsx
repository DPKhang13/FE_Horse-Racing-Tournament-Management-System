import { Trophy, ChevronRight, Search } from 'lucide-react';

const results = [
  {
    id: 1,
    raceName: 'Dubai World Cup',
    date: 'March 28, 2026',
    track: 'Meydan Racecourse',
    winners: [
      { rank: 1, horse: 'Mystic Guide', jockey: 'Luis Saez', odds: '3.50', time: '2:01.61' },
      { rank: 2, horse: 'Chuwa Wizard', jockey: 'Keita Tosaki', odds: '12.00', time: '2:02.15' },
      { rank: 3, horse: 'Magny Cours', jockey: 'William Buick', odds: '8.40', time: '2:02.32' }
    ]
  },
  {
    id: 2,
    raceName: 'Preakness Stakes',
    date: 'May 16, 2026',
    track: 'Pimlico Race Course',
    winners: [
      { rank: 1, horse: 'Rombauer', jockey: 'Flavien Prat', odds: '11.80', time: '1:53.62' },
      { rank: 2, horse: 'Midnight Bourbon', jockey: 'Irad Ortiz Jr.', odds: '3.10', time: '1:54.10' },
      { rank: 3, horse: 'Medina Spirit', jockey: 'John Velazquez', odds: '2.40', time: '1:54.45' }
    ]
  }
];

const ResultsPage = () => {
  return (
    <div className="bg-surface min-h-screen py-12">
      <div className="max-w-container mx-auto px-4 md:px-margin-desktop">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
          <div>
            <h1 className="text-headline-lg font-bold text-primary mb-2">Race Results</h1>
            <p className="text-body-md text-on-surface-variant">Comprehensive historical data and winners from recent tournaments.</p>
          </div>
          <div className="relative max-w-sm w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-outline" />
            <input
              type="text"
              placeholder="Search by race or horse..."
              className="w-full bg-white border border-outline-variant rounded-md py-2.5 pl-10 pr-4 text-body-sm focus:outline-none focus:border-primary"
            />
          </div>
        </div>

        {/* Results List */}
        <div className="space-y-10">
          {results.map((race) => (
            <div key={race.id} className="bg-white border border-outline-variant rounded-lg overflow-hidden shadow-sm">
              <div className="bg-primary-container p-6 text-white flex justify-between items-center">
                <div>
                  <h3 className="text-body-lg font-bold mb-1">{race.raceName}</h3>
                  <p className="text-label-md text-on-primary-container uppercase tracking-widest">{race.track} • {race.date}</p>
                </div>
                <button className="flex items-center gap-2 text-label-md font-bold text-secondary-container hover:text-white transition-colors">
                  FULL REPORT <ChevronRight className="w-4 h-4" />
                </button>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-surface-container border-b border-outline-variant">
                    <tr>
                      <th className="px-6 py-4 text-label-sm text-outline uppercase tracking-wider">Rank</th>
                      <th className="px-6 py-4 text-label-sm text-outline uppercase tracking-wider">Horse</th>
                      <th className="px-6 py-4 text-label-sm text-outline uppercase tracking-wider">Jockey</th>
                      <th className="px-6 py-4 text-label-sm text-outline uppercase tracking-wider text-right">Time</th>
                      <th className="px-6 py-4 text-label-sm text-outline uppercase tracking-wider text-right">Odds</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant">
                    {race.winners.map((winner) => (
                      <tr key={winner.horse} className="hover:bg-surface-container-lowest transition-colors">
                        <td className="px-6 py-4">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                            winner.rank === 1 ? 'bg-tertiary text-on-tertiary' : 
                            winner.rank === 2 ? 'bg-surface-dim text-on-surface' : 
                            'bg-surface-container-highest text-on-surface'
                          }`}>
                            {winner.rank === 1 ? <Trophy className="w-4 h-4" /> : winner.rank}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-body-sm font-bold text-primary">{winner.horse}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-body-sm text-on-surface-variant font-medium">{winner.jockey}</span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className="text-body-sm font-medium text-on-surface-variant font-mono">{winner.time}</span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className="text-body-sm font-bold text-secondary">{winner.odds}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ResultsPage;
