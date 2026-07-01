import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Clock3, Ticket, TrendingUp, X } from 'lucide-react';
import { getApiErrorMessage } from '../../services/apiClient';
import { betService, type BetItem } from '../../services/betService';
import { predictionService } from '../../services/predictionService';
import type { OpenRacePrediction } from '../../types/prediction';

const formatPoints = (value: number) => new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 0,
}).format(value);

const formatCloseTime = (value: string) => new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
}).format(new Date(value));

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

const payoutLabel = (status: string) => {
  return status.toLowerCase() === 'pending' ? 'potential payout' : 'payout';
};

const PredictionPage = () => {
  const [bets, setBets] = useState<BetItem[]>([]);
  const [openRacePredictions, setOpenRacePredictions] = useState<OpenRacePrediction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [walletBalance, setWalletBalance] = useState(0);
  const [activeBetCount, setActiveBetCount] = useState<number | undefined>();
  const [isPredictionModalOpen, setIsPredictionModalOpen] = useState(false);
  const [selectedRaceId, setSelectedRaceId] = useState(0);
  const [selectedHorseId, setSelectedHorseId] = useState(0);
  const [stake, setStake] = useState('100');
  const [formError, setFormError] = useState('');

  useEffect(() => {
    let isMounted = true;

    const loadPredictionPage = async () => {
      setIsLoading(true);
      setErrorMessage('');

      try {
        const [betsData, overview] = await Promise.all([
          betService.getBets(),
          predictionService.getPredictionOverview(),
        ]);

        if (!isMounted) {
          return;
        }

        const nextOpenRaces = overview.openRaces;
        setOpenRacePredictions(nextOpenRaces);
        setSelectedRaceId(nextOpenRaces[0]?.id ?? 0);
        setSelectedHorseId(nextOpenRaces[0]?.options[0]?.horseId ?? 0);
        setWalletBalance(overview.walletBalance ?? 0);
        setActiveBetCount(overview.activeBetCount);
        setBets(betsData);
      } catch (error) {
        if (isMounted) {
          setErrorMessage(getApiErrorMessage(error, 'Unable to load predictions.'));
          setOpenRacePredictions([]);
          setSelectedRaceId(0);
          setSelectedHorseId(0);
          setBets([]);
          setWalletBalance(0);
          setActiveBetCount(undefined);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void loadPredictionPage();

    return () => {
      isMounted = false;
    };
  }, []);

  const stats = useMemo(() => {
    const pending = bets.filter((bet) => bet.status.toLowerCase() === 'pending').length;
    const settled = bets.length - pending;
    const openRaces = activeBetCount ?? pending;
    const balanceProxy = bets.reduce(
      (total, bet) => total + (bet.status.toLowerCase() === 'won' ? bet.potentialPayout : 0),
      0,
    );

    return { openRaces, pending, settled, balanceProxy };
  }, [activeBetCount, bets]);

  const selectedRace = useMemo(
    () => openRacePredictions.find((race) => race.id === selectedRaceId) ?? openRacePredictions[0],
    [openRacePredictions, selectedRaceId],
  );

  const selectedOption = useMemo(
    () => selectedRace?.options.find((option) => option.horseId === selectedHorseId) ?? selectedRace?.options[0],
    [selectedHorseId, selectedRace],
  );

  const stakeValue = Number(stake);
  const potentialPayout = selectedOption && Number.isFinite(stakeValue)
    ? Math.round(stakeValue * selectedOption.odds)
    : 0;

  const openPredictionModal = (raceId = openRacePredictions[0]?.id ?? 0) => {
    const race = openRacePredictions.find((item) => item.id === raceId) ?? openRacePredictions[0];

    setSelectedRaceId(race?.id ?? 0);
    setSelectedHorseId(race?.options[0]?.horseId ?? 0);
    setStake('100');
    setFormError('');
    setIsPredictionModalOpen(true);
  };

  const handleRaceChange = (raceId: number) => {
    const race = openRacePredictions.find((item) => item.id === raceId);
    setSelectedRaceId(raceId);
    setSelectedHorseId(race?.options[0]?.horseId ?? 0);
  };

  const handleCreatePrediction = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError('');

    if (!selectedOption?.optionId) {
      setFormError('This prediction option is missing an API optionId.');
      return;
    }

    if (!Number.isFinite(stakeValue) || stakeValue <= 0) {
      setFormError('Prediction points must be greater than 0.');
      return;
    }

    setIsSubmitting(true);

    try {
      const prediction = await betService.createBet({
        optionId: selectedOption.optionId,
        betType: true,
        betPoints: stakeValue,
        betRate: selectedOption.odds,
        rewardPoints: potentialPayout,
        status: 'pending',
      });

      setBets((current) => [prediction, ...current]);
      setWalletBalance((current) => Math.max(0, current - prediction.amount));
      setActiveBetCount((current) => (current === undefined ? undefined : current + 1));
      setIsPredictionModalOpen(false);
    } catch (error) {
      setFormError(getApiErrorMessage(error, 'Unable to create prediction.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-surface min-h-screen py-12">
      <div className="max-w-container mx-auto px-4 md:px-margin-desktop">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between mb-10">
          <div className="space-y-3">
            <p className="text-headline-lg font-bold text-primary mb-2">Prediction Center</p>
          </div>
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
                  <h2 className="mt-2 text-3xl font-bold text-primary">{formatPoints(walletBalance)} pts</h2>
                </div>
                <div className="rounded-2xl bg-secondary-container px-4 py-3 text-sm font-semibold text-secondary">Won payout total</div>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                {[
                  { label: 'Open prediction races', value: String(stats.openRaces).padStart(2, '0'), color: 'text-primary' },
                  { label: 'Pending', value: String(stats.pending).padStart(2, '0'), color: 'text-primary' },
                  { label: 'Settled', value: String(stats.settled).padStart(2, '0'), color: 'text-secondary' },
                ].map((item) => (
                  <div key={item.label} className="rounded-2xl border border-outline-variant bg-surface-container p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-on-surface-variant">{item.label}</p>
                    <p className={`mt-3 text-3xl font-bold ${item.color}`}>{item.value}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 rounded-2xl border border-outline-variant bg-surface-container p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-on-surface-variant">Won payout total</p>
                <p className="mt-3 text-3xl font-bold text-primary">{formatPoints(stats.balanceProxy)} pts</p>
              </div>
            </section>

            <section className="rounded-3xl border border-outline-variant bg-white p-6 shadow-sm">
              <div className="mb-6 flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-secondary">Open prediction races</p>
                  <h2 className="mt-2 text-2xl font-bold text-primary">Open prediction windows</h2>
                </div>
                <div className="inline-flex items-center gap-2 rounded-full bg-surface-container px-4 py-2 text-sm font-semibold text-on-surface-variant">
                  <Clock3 className="w-4 h-4" /> {openRacePredictions.length} open
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {openRacePredictions.map((race) => (
                  <article key={race.id} className="rounded-2xl border border-outline-variant bg-surface-container-low p-5 transition hover:border-secondary">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-secondary">{race.grade} / {race.surface}</p>
                        <h3 className="mt-2 text-lg font-bold text-primary">{race.raceName}</h3>
                        <p className="mt-1 text-sm text-on-surface-variant">{race.track} - {race.date}</p>
                      </div>
                      <span className="rounded-full bg-secondary-container/50 px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-on-secondary-container">
                        {race.status}
                      </span>
                    </div>
                    <div className="mt-5 flex items-end justify-between gap-4">
                      <div>
                        <p className="text-xs text-on-surface-variant">Favorite</p>
                        <p className="mt-1 font-semibold text-on-surface">{race.favoriteHorse} - {race.odds} odds</p>
                      </div>
                      <p className="inline-flex items-center gap-1 text-sm font-semibold text-primary">
                        <Clock3 className="h-4 w-4" /> Closes {formatCloseTime(race.closesAt)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => openPredictionModal(race.id)}
                      className="mt-5 w-full rounded-md border border-secondary px-4 py-2.5 text-sm font-bold text-secondary transition hover:bg-secondary-container/30"
                    >
                      Predict this race
                    </button>
                  </article>
                ))}

                {!isLoading && openRacePredictions.length === 0 && (
                  <div className="rounded-2xl border border-outline-variant bg-surface-container-low p-4 text-sm font-semibold text-on-surface-variant">
                    No open prediction races found.
                  </div>
                )}
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
                      <span>{formatPoints(prediction.potentialPayout)} {payoutLabel(prediction.status)}</span>
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

      {isPredictionModalOpen && selectedRace && selectedOption && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-surface/80 p-4 backdrop-blur-sm"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setIsPredictionModalOpen(false);
            }
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="new-prediction-title"
            className="glass-panel w-full max-w-xl rounded-2xl p-6"
          >
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-secondary">Place prediction</p>
                <h2 id="new-prediction-title" className="mt-2 text-2xl font-bold text-primary">New Prediction</h2>
              </div>
              <button
                type="button"
                onClick={() => setIsPredictionModalOpen(false)}
                aria-label="Close prediction form"
                className="rounded-md border border-outline-variant p-2 text-on-surface-variant transition hover:text-primary"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePrediction} className="space-y-5">
              <label className="grid gap-2">
                <span className="text-xs font-bold uppercase tracking-[0.16em] text-on-surface-variant">Race</span>
                <select
                  value={selectedRace.id}
                  onChange={(event) => handleRaceChange(Number(event.target.value))}
                  className="w-full rounded-md border border-outline-variant bg-surface-container-low px-4 py-3 focus:border-primary focus:outline-none"
                >
                  {openRacePredictions.map((race) => (
                    <option key={race.id} value={race.id}>{race.raceName} - closes {formatCloseTime(race.closesAt)}</option>
                  ))}
                </select>
              </label>

              <label className="grid gap-2">
                <span className="text-xs font-bold uppercase tracking-[0.16em] text-on-surface-variant">Horse / Jockey</span>
                <select
                  value={selectedOption.horseId}
                  onChange={(event) => setSelectedHorseId(Number(event.target.value))}
                  className="w-full rounded-md border border-outline-variant bg-surface-container-low px-4 py-3 focus:border-primary focus:outline-none"
                >
                  {selectedRace.options.map((option) => (
                    <option key={option.horseId} value={option.horseId}>
                      {option.horseName} / {option.jockeyName} - {option.odds} odds
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-2">
                <span className="text-xs font-bold uppercase tracking-[0.16em] text-on-surface-variant">Prediction points</span>
                <input
                  type="number"
                  min="1"
                  max={walletBalance > 0 ? walletBalance : undefined}
                  step="1"
                  value={stake}
                  onChange={(event) => setStake(event.target.value)}
                  className="w-full rounded-md border border-outline-variant bg-surface-container-low px-4 py-3 focus:border-primary focus:outline-none"
                  disabled={walletBalance <= 0}
                  required
                />
              </label>

              <div className="grid gap-3 rounded-xl bg-surface-container p-4 sm:grid-cols-3">
                <div>
                  <p className="text-xs text-on-surface-variant">Available</p>
                  <p className="mt-1 font-bold text-primary">{formatPoints(walletBalance)} pts</p>
                </div>
                <div>
                  <p className="text-xs text-on-surface-variant">Odds</p>
                  <p className="mt-1 font-bold text-on-surface">{selectedOption.odds}</p>
                </div>
                <div>
                  <p className="text-xs text-on-surface-variant">Potential payout</p>
                  <p className="mt-1 font-bold text-secondary">{formatPoints(potentialPayout)} pts</p>
                </div>
              </div>

              {formError && (
                <p className="rounded-md border border-error/30 bg-error-container/20 px-4 py-3 text-sm font-semibold text-error">
                  {formError}
                </p>
              )}

              {walletBalance <= 0 && (
                <p className="rounded-md border border-error/30 bg-error-container/20 px-4 py-3 text-sm font-semibold text-error">
                  Your wallet has no available points. Add points before creating a prediction.
                </p>
              )}

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsPredictionModalOpen(false)}
                  className="rounded-md border border-outline-variant px-5 py-3 text-sm font-bold text-on-surface"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={walletBalance <= 0 || isSubmitting}
                  className="rounded-md bg-secondary px-5 py-3 text-sm font-bold text-on-secondary transition hover:bg-secondary-container disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSubmitting ? 'Submitting...' : 'Confirm prediction'}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
};

export default PredictionPage;
