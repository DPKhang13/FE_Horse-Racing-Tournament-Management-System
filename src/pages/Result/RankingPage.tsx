import { useEffect, useState } from 'react';
import { BarChart3, Trophy } from 'lucide-react';
import { useToastNotifications } from '../../hooks/useToastNotifications';
import { raceResultService } from '../../services/raceResultService';
import type { RankingBoard, RankingCategory } from '../../types/raceResult';
import RankingTable from './components/RankingTable';
import ResultNav from './components/ResultNav';
import { PageHeader, PageShell, Toolbar } from '../../components/ui';

const categoryOptions: { value: RankingCategory; label: string }[] = [
  { value: 'horse', label: 'Horses' },
  { value: 'jockey', label: 'Jockeys' },
];

const formatLastUpdated = (dateString: string) => {
  return new Date(dateString).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const RankingPage = () => {
  const [category, setCategory] = useState<RankingCategory>('horse');
  const [rankingBoard, setRankingBoard] = useState<RankingBoard | undefined>();
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  useToastNotifications([
    errorMessage ? { tone: 'error', text: errorMessage } : null,
  ]);

  useEffect(() => {
    let isMounted = true;

    const loadRanking = async () => {
      setIsLoading(true);
      setErrorMessage('');

      try {
        const board = await raceResultService.getRankingBoard(category);

        if (isMounted) {
          setRankingBoard(board);
        }
      } catch (error) {
        if (isMounted) {
          setRankingBoard(undefined);
          setErrorMessage(error instanceof Error ? error.message : 'Unable to load ranking data.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void loadRanking();

    return () => {
      isMounted = false;
    };
  }, [category]);

  const topEntry = rankingBoard?.entries[0];

  return (
    <PageShell>
      <PageHeader eyebrow="Result Screen" title="Rankings" icon={BarChart3} actions={<ResultNav />} />

          {topEntry && (
            <article className="rounded-lg border border-outline-variant bg-white p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-tertiary text-on-tertiary">
                    <Trophy className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-label-sm text-outline uppercase tracking-wider">Current Leader</p>
                    <h2 className="text-headline-md font-bold text-primary">{topEntry.name}</h2>
                    {topEntry.subtitle && (
                      <p className="text-body-sm text-on-surface-variant">{topEntry.subtitle}</p>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap gap-4">
                  <div className="rounded-lg bg-secondary-container/30 px-4 py-3">
                    <p className="text-label-sm text-on-secondary-container uppercase tracking-wider">Points</p>
                    <p className="text-body-lg font-bold text-secondary tabular-nums">{topEntry.totalPoints}</p>
                  </div>
                  <div className="rounded-lg bg-surface-container px-4 py-3">
                    <p className="text-label-sm text-outline uppercase tracking-wider">Wins</p>
                    <p className="text-body-lg font-bold text-primary tabular-nums">{topEntry.totalWins}</p>
                  </div>
                  <div className="rounded-lg bg-surface-container px-4 py-3">
                    <p className="text-label-sm text-outline uppercase tracking-wider">Win Rate</p>
                    <p className="text-body-lg font-bold text-primary tabular-nums">{topEntry.winRate}%</p>
                  </div>
                </div>
              </div>
            </article>
          )}

      <Toolbar className="sm:justify-between">
          <div className="flex flex-wrap gap-2">
            {categoryOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setCategory(option.value)}
                className={`px-4 py-2 rounded-md text-body-sm font-semibold transition-colors ${
                  category === option.value
                    ? 'bg-primary text-on-primary'
                    : 'bg-white border border-outline-variant text-on-surface-variant hover:text-primary hover:border-primary'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          {rankingBoard && (
            <div className="inline-flex items-center gap-2 text-body-sm text-on-surface-variant">
              <BarChart3 className="w-4 h-4 text-secondary" />
              <span>
                {rankingBoard.tournamentName} - Season {rankingBoard.season} - Updated {formatLastUpdated(rankingBoard.lastUpdated)}
              </span>
            </div>
          )}
      </Toolbar>

        {isLoading ? (
          <div className="rounded-lg border border-outline-variant bg-white p-12 text-center">
            <BarChart3 className="w-10 h-10 text-outline mx-auto mb-4" />
            <h2 className="text-headline-md font-bold text-primary mb-2">Loading rankings</h2>
            <p className="text-body-md text-on-surface-variant">Fetching leaderboard data from the server.</p>
          </div>
        ) : rankingBoard ? (
          <section className="bg-white border border-outline-variant rounded-lg overflow-hidden">
            <div className="p-6 border-b border-outline-variant">
              <p className="text-label-md text-secondary uppercase tracking-widest mb-1">Leaderboard</p>
              <h2 className="text-headline-md font-bold text-primary">
                {categoryOptions.find((option) => option.value === category)?.label} Rankings
              </h2>
            </div>
            <RankingTable
              entries={rankingBoard.entries}
              formLabel={category === 'jockey' ? 'Kinh nghiệm' : 'Form'}
              showSubtitle={category !== 'jockey'}
            />
          </section>
        ) : (
          <div className="rounded-lg border border-outline-variant bg-white p-12 text-center">
            <BarChart3 className="w-10 h-10 text-outline mx-auto mb-4" />
            <h2 className="text-headline-md font-bold text-primary mb-2">No ranking data</h2>
            <p className="text-body-md text-on-surface-variant">
              Rankings for this category are not available yet.
            </p>
          </div>
        )}
    </PageShell>
  );
};

export default RankingPage;
