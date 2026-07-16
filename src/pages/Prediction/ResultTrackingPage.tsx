import { useEffect, useMemo, useState } from 'react';
import { BarChart3, CheckCircle2, Eye, Loader2, X } from 'lucide-react';
import { getApiErrorMessage } from '../../services/apiClient';
import { betService, type BetItem } from '../../services/betService';

type StatusFilter = 'all' | 'won' | 'lost';

const formatPoints = (value: number) => new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 0,
}).format(value);

const formatDate = (value?: string) => {
  if (!value) {
    return '-';
  }

  const isoDateMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})/);

  if (isoDateMatch) {
    const [, year, month, day] = isoDateMatch;
    return `${day}/${month}/${year}`;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
};

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

const detailValue = (value: string | number | undefined) => {
  if (value === undefined || value === '') {
    return '-';
  }

  return value;
};

const getNetResult = (item: BetItem) => {
  const status = item.status.toLowerCase();

  if (status === 'won') {
    return item.potentialPayout - item.amount;
  }

  if (status === 'lost' || status === 'cancelled') {
    return -item.amount;
  }

  return 0;
};

const ResultTrackingPage = () => {
  const [trackedResults, setTrackedResults] = useState<BetItem[]>([]);
  const [selectedBet, setSelectedBet] = useState<BetItem | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [detailError, setDetailError] = useState('');

  useEffect(() => {
    let isMounted = true;

    const loadResults = async () => {
      setIsLoading(true);
      setErrorMessage('');

      try {
        const data = await betService.getCurrentUserBets();

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
  const filteredSettledResults = useMemo(() => {
    if (statusFilter === 'all') {
      return settledResults;
    }

    if (statusFilter === 'lost') {
      return settledResults.filter((item) => ['lost', 'cancelled'].includes(item.status.toLowerCase()));
    }

    return settledResults.filter((item) => item.status.toLowerCase() === statusFilter);
  }, [settledResults, statusFilter]);

  const handleOpenDetail = async (bet: BetItem) => {
    setSelectedBet(bet);
    setDetailError('');
    setIsLoadingDetail(true);

    try {
      const detail = await betService.getMyBetDetail(bet.betId);
      setSelectedBet(detail);
    } catch (error) {
      setDetailError(getApiErrorMessage(error, 'Unable to load bet detail.'));
    } finally {
      setIsLoadingDetail(false);
    }
  };

  const closeDetail = () => {
    setSelectedBet(null);
    setDetailError('');
    setIsLoadingDetail(false);
  };

  return (
    <div className="bg-surface min-h-screen py-12">
      <div className="max-w-container mx-auto px-4 md:px-margin-desktop">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between mb-10">
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-secondary">Result Tracking</p>
            <h1 className="text-headline-lg font-bold text-primary">Track prediction results</h1>
          </div>
        </div>

        {errorMessage && (
          <div className="mb-8 rounded-md border border-error/30 bg-error-container/20 px-4 py-3 text-body-sm font-semibold text-error">
            {errorMessage}
          </div>
        )}

        <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <section className="space-y-6">
            <div className="rounded-3xl border border-outline-variant bg-white p-6 shadow-sm">
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

            <div className="rounded-3xl border border-outline-variant bg-white p-6 shadow-sm">
              <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-secondary">Tracked results</p>
                  <h2 className="mt-2 text-2xl font-bold text-primary">Recent race settlements</h2>
                </div>
                <div className="flex flex-wrap gap-2">
                  {[
                    { label: 'All', value: 'all' },
                    { label: 'Won', value: 'won' },
                    { label: 'Lost', value: 'lost' },
                  ].map((filter) => (
                    <button
                      key={filter.value}
                      type="button"
                      onClick={() => setStatusFilter(filter.value as StatusFilter)}
                      className={`rounded-lg px-4 py-2 text-xs font-bold uppercase tracking-[0.14em] transition ${
                        statusFilter === filter.value
                          ? 'bg-primary text-on-primary'
                          : 'border border-outline-variant bg-surface-container text-on-surface-variant hover:border-primary hover:text-primary'
                      }`}
                    >
                      {filter.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-4">
                {isLoading && (
                  <div className="rounded-2xl border border-outline-variant bg-surface-container p-6 text-center text-body-sm font-semibold text-on-surface-variant">
                    Loading prediction results...
                  </div>
                )}

                {!isLoading && filteredSettledResults.map((item) => {
                  const netResult = getNetResult(item);

                  return (
                    <article key={item.betId} className="rounded-2xl border border-outline-variant bg-surface-container-low p-5">
                      <div className="grid gap-5 lg:grid-cols-[1.2fr_1fr_auto] lg:items-center">
                        <div>
                          <div className="flex flex-wrap items-center gap-3">
                            <h3 className="text-lg font-bold text-primary">{item.raceName}</h3>
                            <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${statusClassName(item.status)}`}>
                              {item.status}
                            </span>
                          </div>
                          <p className="mt-2 text-base font-bold text-on-surface">{item.horseName}</p>
                          <p className="mt-1 text-sm text-on-surface-variant">{item.jockeyName ?? '-'}</p>
                          <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs font-semibold text-on-surface-variant">
                            <span>Placed {formatDate(item.createdAt)}</span>
                            <span>Settled {formatDate(item.settledAt)}</span>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-2">
                          <div className="rounded-xl bg-surface-container px-4 py-3">
                            <p className="text-xs uppercase tracking-[0.14em] text-outline">Stake</p>
                            <p className="mt-1 text-sm font-bold text-on-surface">{formatPoints(item.amount)} pts</p>
                          </div>
                          <div className="rounded-xl bg-surface-container px-4 py-3">
                            <p className="text-xs uppercase tracking-[0.14em] text-outline">Odds</p>
                            <p className="mt-1 text-sm font-bold text-on-surface">{item.odds || '-'}</p>
                          </div>
                          <div className="rounded-xl bg-surface-container px-4 py-3">
                            <p className="text-xs uppercase tracking-[0.14em] text-outline">Reward</p>
                            <p className="mt-1 text-sm font-bold text-secondary">{formatPoints(item.potentialPayout)} pts</p>
                          </div>
                          <div className="rounded-xl bg-surface-container px-4 py-3">
                            <p className="text-xs uppercase tracking-[0.14em] text-outline">Net</p>
                            <p className={`mt-1 text-sm font-bold ${netResult >= 0 ? 'text-secondary' : 'text-error'}`}>
                              {netResult >= 0 ? '+' : ''}{formatPoints(netResult)} pts
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => void handleOpenDetail(item)}
                          className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-primary/20 bg-primary/10 px-4 text-xs font-bold text-primary transition hover:bg-primary/15"
                        >
                          <Eye className="h-4 w-4" />
                          Details
                        </button>
                      </div>
                    </article>
                  );
                })}

                {!isLoading && filteredSettledResults.length === 0 && (
                  <div className="rounded-2xl border border-outline-variant bg-surface-container p-6 text-center text-body-sm font-semibold text-on-surface-variant">
                    No prediction results found.
                  </div>
                )}
              </div>
            </div>
          </section>

          <aside className="space-y-6">
            <section className="rounded-3xl border border-outline-variant bg-white p-6 shadow-sm">
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

            <section className="rounded-3xl border border-outline-variant bg-white p-6 shadow-sm">
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
      </div>

      {selectedBet && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-scrim/50 px-4 py-6">
          <section className="max-h-[90vh] w-full max-w-[760px] overflow-y-auto rounded-3xl border border-outline-variant bg-white p-6 shadow-xl">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-secondary">Bet detail</p>
                <h2 className="mt-2 text-2xl font-bold text-primary">{selectedBet.raceName}</h2>
                <p className="mt-1 text-sm font-semibold text-on-surface-variant">{selectedBet.horseName} - {selectedBet.jockeyName ?? 'Jockey'}</p>
              </div>
              <button
                type="button"
                onClick={closeDetail}
                className="rounded-full border border-outline-variant p-2 text-on-surface-variant transition hover:border-primary hover:text-primary"
                aria-label="Close bet detail"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {detailError && (
              <div className="mb-5 rounded-md border border-error/30 bg-error-container/20 px-4 py-3 text-sm font-semibold text-error">
                {detailError}
              </div>
            )}

            {isLoadingDetail ? (
              <div className="flex items-center justify-center gap-3 rounded-2xl border border-outline-variant bg-surface-container p-8 text-sm font-semibold text-on-surface-variant">
                <Loader2 className="h-5 w-5 animate-spin" />
                Loading bet detail...
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {[
                  { label: 'Ticket ID', value: selectedBet.betId },
                  { label: 'Status', value: selectedBet.status },
                  { label: 'Race name', value: selectedBet.raceName },
                  { label: 'Race number', value: detailValue(selectedBet.raceNumber) },
                  { label: 'Horse name', value: selectedBet.horseName },
                  { label: 'Jockey name', value: selectedBet.jockeyName ?? '-' },
                  { label: 'Stake', value: `${formatPoints(selectedBet.amount)} pts` },
                  { label: 'Reward points', value: `${formatPoints(selectedBet.potentialPayout)} pts` },
                  { label: 'Odds', value: selectedBet.odds || '-' },
                  { label: 'Placed at', value: formatDate(selectedBet.createdAt) },
                  { label: 'Settled at', value: formatDate(selectedBet.settledAt) },
                  { label: 'Prediction closes', value: formatDate(selectedBet.predictionClosesAt) },
                ].map((field) => (
                  <div key={field.label} className="rounded-2xl border border-outline-variant bg-surface-container p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-outline">{field.label}</p>
                    <p className="mt-2 break-words text-sm font-bold text-on-surface">{field.value}</p>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
};

export default ResultTrackingPage;
