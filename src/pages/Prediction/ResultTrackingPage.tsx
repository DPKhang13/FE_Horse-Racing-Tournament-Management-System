import { useEffect, useMemo, useState } from 'react';
import { BarChart3, CheckCircle2, Clock3 } from 'lucide-react';
import { getApiErrorMessage } from '../../services/apiClient';
import { betService, type BetItem } from '../../services/betService';
import { PageHeader, PageShell } from '../../components/ui';

const formatPoints = (value: number) => new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 0,
}).format(value);

const statusClassName = (status: string) => {
  const normalizedStatus = status.toLowerCase();

  if (normalizedStatus === 'won') {
    return 'bg-secondary-container/50 text-on-secondary-container';
  }

  if (normalizedStatus === 'lost' || normalizedStatus === 'cancelled') {
    return 'bg-error-container/30 text-error';
  }

  return 'bg-primary/15 text-primary';
};

const ResultTrackingPage = () => {
  const [trackedResults, setTrackedResults] = useState<BetItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    let isMounted = true;

    const loadResults = async () => {
      setIsLoading(true);
      setErrorMessage('');

      try {
        const data = await betService.getBets();

        if (isMounted) {
          setTrackedResults(data);
        }
      } catch (error) {
        if (isMounted) {
          setErrorMessage(getApiErrorMessage(error, 'Unable to load prediction results.'));
          setTrackedResults([]);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void loadResults();

    return () => {
      isMounted = false;
    };
  }, []);

  const stats = useMemo(() => {
    const settled = trackedResults.filter((item) => item.status.toLowerCase() !== 'pending').length;
    const won = trackedResults.filter((item) => item.status.toLowerCase() === 'won').length;
    const lost = trackedResults.filter((item) => ['lost', 'cancelled'].includes(item.status.toLowerCase())).length;
    const netGain = trackedResults.reduce((total, item) => {
      if (item.status.toLowerCase() === 'won') {
        return total + item.potentialPayout - item.amount;
      }

      if (['lost', 'cancelled'].includes(item.status.toLowerCase())) {
        return total - item.amount;
      }

      return total;
    }, 0);

    return { settled, won, lost, netGain };
  }, [trackedResults]);

  const winRatio = stats.settled ? Math.round((stats.won / stats.settled) * 100) : 0;
  const settledResults = useMemo(
    () => trackedResults.filter((item) => item.status.toLowerCase() !== 'pending'),
    [trackedResults],
  );

  return (
    <PageShell>
      <PageHeader eyebrow="Result Tracking" title="Track prediction results" icon={BarChart3} />

        {errorMessage && (
          <div className="mb-8 rounded-md border border-error/30 bg-error-container/20 px-4 py-3 text-body-sm font-semibold text-error">
            {errorMessage}
          </div>
        )}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
          <section className="space-y-4">
            <div className="rounded-lg border border-outline-variant bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-secondary">Performance</p>
                  <h2 className="mt-2 text-2xl font-bold text-primary">Prediction earnings</h2>
                </div>
                <div className="flex items-center gap-4">
                  <div className="rounded-2xl bg-secondary-container px-4 py-3 text-sm font-semibold text-secondary">Win ratio {winRatio}%</div>
                  <div className="rounded-2xl bg-surface-container px-4 py-3 text-sm font-semibold text-on-surface-variant">
                    Net gain {stats.netGain >= 0 ? '+' : ''}{formatPoints(stats.netGain)} pts
                  </div>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-3 mt-6">
                {[
                  { label: 'Settled', value: stats.settled, accent: 'text-primary' },
                  { label: 'Won', value: stats.won, accent: 'text-secondary' },
                  { label: 'Lost', value: stats.lost, accent: 'text-error' },
                ].map((stat) => (
                  <div key={stat.label} className="rounded-2xl border border-outline-variant bg-surface-container p-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-on-surface-variant">{stat.label}</p>
                    <p className={`mt-3 text-3xl font-bold ${stat.accent}`}>{stat.value}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-lg border border-outline-variant bg-white p-5 shadow-sm">
              <div className="mb-6 flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-secondary">Tracked results</p>
                  <h2 className="mt-2 text-2xl font-bold text-primary">Recent race settlements</h2>
                </div>
                <div className="inline-flex items-center gap-2 rounded-full bg-surface-container px-4 py-2 text-sm font-semibold text-on-surface-variant">
                  <Clock3 className="w-4 h-4" /> Updated now
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-surface-container border-b border-outline-variant">
                    <tr>
                      <th className="px-6 py-4 text-label-sm text-outline uppercase tracking-wider">Race</th>
                      <th className="px-6 py-4 text-label-sm text-outline uppercase tracking-wider">Selection</th>
                      <th className="px-6 py-4 text-label-sm text-outline uppercase tracking-wider text-right">Odds</th>
                      <th className="px-6 py-4 text-label-sm text-outline uppercase tracking-wider text-right">Payout</th>
                      <th className="px-6 py-4 text-label-sm text-outline uppercase tracking-wider text-right">Prediction</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant">
                    {isLoading && (
                      <tr>
                        <td colSpan={5} className="px-6 py-8 text-center text-body-sm font-semibold text-on-surface-variant">
                          Loading prediction results...
                        </td>
                      </tr>
                    )}

                    {!isLoading && settledResults.map((item) => (
                      <tr key={item.betId} className="hover:bg-surface-container-lowest transition-colors">
                        <td className="px-6 py-4 text-body-sm font-semibold text-primary">{item.raceName}</td>
                        <td className="px-6 py-4 text-body-sm text-on-surface-variant">{item.horseName}</td>
                        <td className="px-6 py-4 text-right text-body-sm font-mono text-on-surface-variant">{item.odds || '-'}</td>
                        <td className="px-6 py-4 text-right text-body-sm font-semibold text-secondary">{formatPoints(item.potentialPayout)} pts</td>
                        <td className="px-6 py-4 text-right">
                          <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${statusClassName(item.status)}`}>
                            {item.status}
                          </span>
                        </td>
                      </tr>
                    ))}

                    {!isLoading && settledResults.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-6 py-8 text-center text-body-sm font-semibold text-on-surface-variant">
                          No prediction results found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          <aside className="space-y-4">
            <section className="rounded-lg border border-outline-variant bg-white p-5 shadow-sm">
              <div className="mb-6 flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-secondary">Insights</p>
                  <h2 className="mt-2 text-2xl font-bold text-primary">Prediction health</h2>
                </div>
                <BarChart3 className="h-5 w-5 text-secondary" />
              </div>
              <div className="space-y-5">
                <div className="rounded-2xl bg-surface-container p-4">
                  <p className="text-sm text-on-surface-variant">Settled predictions</p>
                  <p className="mt-2 text-2xl font-bold text-primary">{stats.settled}</p>
                </div>
                <div className="rounded-2xl bg-surface-container p-4">
                  <p className="text-sm text-on-surface-variant">Win ratio</p>
                  <p className="mt-2 text-2xl font-bold text-primary">{winRatio}%</p>
                </div>
                <div className="rounded-2xl bg-surface-container p-4">
                  <p className="text-sm text-on-surface-variant">Latest settled prediction</p>
                  <p className="mt-2 text-body-lg font-semibold text-primary">
                    {settledResults[0]?.horseName ?? 'No settled prediction yet'}
                  </p>
                </div>
              </div>
            </section>

            <section className="rounded-lg border border-outline-variant bg-white p-5 shadow-sm">
              <div className="mb-5 flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-secondary" />
                <h3 className="text-lg font-bold text-primary">Settlement rules</h3>
              </div>
              <ul className="space-y-3 text-sm text-on-surface-variant">
                <li className="rounded-2xl bg-surface-container p-4">Only predictions placed before prediction closes at are eligible.</li>
                <li className="rounded-2xl bg-surface-container p-4">Points are updated once RaceResults are published.</li>
                <li className="rounded-2xl bg-surface-container p-4">Lost predictions are still recorded for performance tracking.</li>
              </ul>
            </section>
          </aside>
        </div>
    </PageShell>
  );
};

export default ResultTrackingPage;
