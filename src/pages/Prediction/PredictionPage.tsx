import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { ArrowRight, Clock3, Ticket, TrendingUp } from 'lucide-react';
import { getApiErrorMessage } from '../../services/apiClient';
import { betService, type BetItem, type BetOptionItem } from '../../services/betService';

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

const PredictionPage = () => {
  const [bets, setBets] = useState<BetItem[]>([]);
  const [betOptions, setBetOptions] = useState<BetOptionItem[]>([]);
  const [selectedOptionId, setSelectedOptionId] = useState('');
  const [betPoints, setBetPoints] = useState(100);
  const [betType, setBetType] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const loadPredictionData = async () => {
    setIsLoading(true);
    setErrorMessage('');

    try {
      const [betList, optionList] = await Promise.all([
        betService.getBets(),
        betService.getBetOptions(),
      ]);

      setBets(betList);
      setBetOptions(optionList);
      setSelectedOptionId((current) => current || (optionList[0]?.optionId ? String(optionList[0].optionId) : ''));
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, 'Unable to load predictions.'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadPredictionData();
  }, []);

  const selectedOption = useMemo(
    () => betOptions.find((option) => option.optionId === Number(selectedOptionId)),
    [betOptions, selectedOptionId],
  );

  const handleCreateBet = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage('');
    setErrorMessage('');

    if (!selectedOption) {
      setErrorMessage('Please choose a betting option first.');
      return;
    }

    setIsSubmitting(true);

    try {
      await betService.createBet({
        optionId: selectedOption.optionId,
        betType,
        betPoints,
        betRate: selectedOption.currentRate,
      });
      setMessage('Prediction placed.');
      await loadPredictionData();
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, 'Could not place prediction.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const stats = useMemo(() => {
    const pending = bets.filter((bet) => bet.status.toLowerCase() === 'pending').length;
    const settled = bets.length - pending;
    const balanceProxy = bets.reduce((total, bet) => total + (bet.status.toLowerCase() === 'won' ? bet.potentialPayout : 0), 0);

    return { pending, settled, balanceProxy };
  }, [bets]);

  return (
    <div className="bg-surface min-h-screen py-12">
      <div className="max-w-container mx-auto px-4 md:px-margin-desktop">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between mb-10">
          <div className="space-y-3">
            <p className="text-headline-lg font-bold text-primary mb-2">Prediction Center</p>
          </div>
          <button className="inline-flex items-center gap-2 rounded-md bg-secondary px-6 py-3 text-sm font-semibold text-white transition hover:bg-secondary-container/90">
            New Prediction
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {errorMessage && (
          <div className="mb-8 rounded-md border border-error/30 bg-error-container/20 px-4 py-3 text-body-sm font-semibold text-error">
            {errorMessage}
          </div>
        )}
        {message && (
          <div className="mb-8 rounded-md border border-secondary/30 bg-secondary-container/30 px-4 py-3 text-body-sm font-semibold text-secondary">
            {message}
          </div>
        )}

        <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-6">
            <section className="rounded-3xl border border-outline-variant bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between gap-4 mb-6">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-secondary">Wallet</p>
                  <h2 className="mt-2 text-3xl font-bold text-primary">{formatPoints(stats.balanceProxy)} pts</h2>
                </div>
                <div className="rounded-2xl bg-secondary-container px-4 py-3 text-sm font-semibold text-secondary">Won payout total</div>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                {[
                  { label: 'Open predictions', value: String(stats.pending).padStart(2, '0'), color: 'bg-surface-container-highest text-primary' },
                  { label: 'Pending', value: String(stats.pending).padStart(2, '0'), color: 'text-primary' },
                  { label: 'Settled', value: String(stats.settled).padStart(2, '0'), color: 'text-secondary' },
                ].map((item) => (
                  <div key={item.label} className="rounded-2xl border border-outline-variant bg-surface-container p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-on-surface-variant">{item.label}</p>
                    <p className={`mt-3 text-3xl font-bold ${item.color}`}>{item.value}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-3xl border border-outline-variant bg-white p-6 shadow-sm">
              <div className="mb-6 flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-secondary">Open races</p>
                  <h2 className="mt-2 text-2xl font-bold text-primary">Prediction windows</h2>
                </div>
                <div className="inline-flex items-center gap-2 rounded-full bg-surface-container px-4 py-2 text-sm font-semibold text-on-surface-variant">
                  <Clock3 className="w-4 h-4" /> {betOptions.length} options
                </div>
              </div>

              <form onSubmit={handleCreateBet} className="grid gap-4">
                <label className="grid gap-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.18em] text-on-surface-variant">Bet option</span>
                  <select
                    value={selectedOptionId}
                    onChange={(event) => setSelectedOptionId(event.target.value)}
                    required
                    className="rounded-xl border border-outline-variant bg-surface-container-low px-4 py-3 text-sm focus:border-primary focus:outline-none"
                  >
                    <option value="">Select option</option>
                    {betOptions.map((option) => (
                      <option key={option.optionId} value={option.optionId}>
                        {option.raceName} / {option.horseName} / rate {option.currentRate}
                      </option>
                    ))}
                  </select>
                </label>

                {selectedOption && (
                  <div className="rounded-2xl border border-outline-variant bg-surface-container-low p-4 text-sm text-on-surface-variant">
                    <p className="font-semibold text-primary">{selectedOption.horseName}</p>
                    <p>{selectedOption.jockeyFullName ?? 'No jockey assigned'} / {selectedOption.raceName}</p>
                    <p className="mt-2">Current rate {selectedOption.currentRate} / {formatPoints(selectedOption.totalBetPoints)} pts / {selectedOption.totalBetCount} bets</p>
                  </div>
                )}

                <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
                  <label className="grid gap-2">
                    <span className="text-xs font-semibold uppercase tracking-[0.18em] text-on-surface-variant">Bet points</span>
                    <input
                      type="number"
                      min={1}
                      value={betPoints || ''}
                      onChange={(event) => setBetPoints(Number(event.target.value))}
                      required
                      className="rounded-xl border border-outline-variant bg-surface-container-low px-4 py-3 text-sm focus:border-primary focus:outline-none"
                    />
                  </label>
                  <label className="flex items-end gap-3 rounded-xl border border-outline-variant bg-surface-container-low px-4 py-3 text-sm font-semibold text-on-surface-variant">
                    <input type="checkbox" checked={betType} onChange={(event) => setBetType(event.target.checked)} className="mb-1 h-4 w-4" />
                    Win bet
                  </label>
                </div>

                <button disabled={isSubmitting || !selectedOption} className="inline-flex items-center justify-center gap-2 rounded-md bg-secondary px-6 py-3 text-sm font-semibold text-white transition hover:bg-secondary-container/90 disabled:cursor-not-allowed disabled:opacity-60">
                  {isSubmitting ? 'Placing...' : 'Place Prediction'}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            </section>
          </div>

          <aside className="space-y-6">
            <section className="rounded-3xl border border-outline-variant bg-white p-6 shadow-sm">
              <div className="mb-6 flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-secondary">Active predictions</p>
                  <h2 className="mt-2 text-2xl font-bold text-primary">Your current stakes</h2>
                </div>
                <Ticket className="h-5 w-5 text-secondary" />
              </div>
              <div className="space-y-4">
                {isLoading && (
                  <div className="rounded-2xl border border-outline-variant bg-surface-container-low p-4 text-sm font-semibold text-on-surface-variant">
                    Loading predictions...
                  </div>
                )}

                {!isLoading && bets.map((prediction) => (
                  <article key={prediction.betId} className="rounded-2xl border border-outline-variant bg-surface-container-low p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="text-lg font-semibold text-primary">{prediction.raceName}</h3>
                        <p className="text-sm text-on-surface-variant">
                          {prediction.horseName}{prediction.jockeyName ? ` - ${prediction.jockeyName}` : ''}
                        </p>
                      </div>
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${statusClassName(prediction.status)}`}>
                        {prediction.status}
                      </span>
                    </div>
                    <div className="mt-4 flex items-center justify-between gap-4 text-sm text-on-surface-variant">
                      <span>{formatPoints(prediction.amount)} stake</span>
                      <span>{formatPoints(prediction.potentialPayout)} potential payout</span>
                    </div>
                    <p className="mt-3 text-sm text-on-surface-variant">Odds {prediction.odds || '-'}</p>
                  </article>
                ))}

                {!isLoading && bets.length === 0 && (
                  <div className="rounded-2xl border border-outline-variant bg-surface-container-low p-4 text-sm font-semibold text-on-surface-variant">
                    No predictions found.
                  </div>
                )}
              </div>
            </section>

            <section className="rounded-3xl border border-outline-variant bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between gap-4 mb-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-secondary">Prediction tips</p>
                  <h2 className="mt-2 text-xl font-bold text-primary">Quick strategy</h2>
                </div>
                <TrendingUp className="h-5 w-5 text-tertiary" />
              </div>
              <ul className="space-y-3 text-sm text-on-surface-variant">
                <li className="rounded-2xl bg-surface-container p-4">Choose one horse with best odds and recent form.</li>
                <li className="rounded-2xl bg-surface-container p-4">Always check prediction close time before placing a stake.</li>
                <li className="rounded-2xl bg-surface-container p-4">Manage points to keep enough balance for late selections.</li>
              </ul>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
};

export default PredictionPage;
