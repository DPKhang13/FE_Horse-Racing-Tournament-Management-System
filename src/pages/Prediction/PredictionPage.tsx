import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Clock3, Ticket, TrendingUp } from 'lucide-react';
import { getApiErrorMessage } from '../../services/apiClient';
import { betService, type BetItem } from '../../services/betService';

const formatPoints = (value: number) => new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 0,
}).format(value);

const statusClassName = (status: string) => {
  const normalizedStatus = status.toLowerCase();

  if (normalizedStatus === 'won') {
    return 'bg-[#85f8c4] text-[#005137]';
  }

  if (normalizedStatus === 'lost' || normalizedStatus === 'cancelled') {
    return 'bg-[#ffdad6] text-[#93000a]';
  }

  return 'bg-[#ffe088] text-[#574500]';
};

const PredictionPage = () => {
  const [bets, setBets] = useState<BetItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    let isMounted = true;

    const loadBets = async () => {
      setIsLoading(true);
      setErrorMessage('');

      try {
        const data = await betService.getBets();

        if (isMounted) {
          setBets(data);
        }
      } catch (error) {
        if (isMounted) {
          setErrorMessage(getApiErrorMessage(error, 'Unable to load predictions.'));
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void loadBets();

    return () => {
      isMounted = false;
    };
  }, []);

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
                  { label: 'Pending', value: String(stats.pending).padStart(2, '0'), color: 'bg-[#ffe088] text-[#574500]' },
                  { label: 'Settled', value: String(stats.settled).padStart(2, '0'), color: 'bg-[#d6e3ff] text-[#0d1c32]' },
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
                  <Clock3 className="w-4 h-4" /> Awaiting API
                </div>
              </div>

              <div className="rounded-2xl border border-dashed border-outline-variant bg-surface-container-low p-6 text-sm text-on-surface-variant">
                Current API documentation exposes saved bets through <span className="font-semibold text-primary">/api/bets/get-all</span>, but it does not include an open race prediction-window endpoint or bet creation endpoint in lines 1-495.
              </div>
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
