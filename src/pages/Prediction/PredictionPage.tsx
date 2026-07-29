import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Clock3, Loader2, Ticket, TrendingUp, X } from 'lucide-react';
import { getApiErrorMessage } from '../../services/apiClient';
import { betService, type BetItem } from '../../services/betService';
import { dashboardService } from '../../services/dashboardService';
import { predictionService } from '../../services/predictionService';
import type { OpenRacePrediction } from '../../types/prediction';
import ModalPortal from '../../components/ModalPortal';

const formatPoints = (value: number) => new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 0,
}).format(value);

const formatCloseTime = (value: string) => new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
}).format(new Date(value));

const isRaceBettingOpen = (race?: OpenRacePrediction) => {
  if (!race) {
    return false;
  }

  const closeTime = new Date(race.closesAt).getTime();

  return race.status === 'Open' && Number.isFinite(closeTime) && closeTime > Date.now();
};

const bettingStatusLabel = (race: OpenRacePrediction) => {
  return isRaceBettingOpen(race) ? 'Open' : 'Betting closed';
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

const payoutLabel = (status: string) => {
  return status.toLowerCase() === 'pending' ? 'potential payout' : 'payout';
};

const sortBetsByPlacedAt = (bets: BetItem[]) => (
  [...bets].sort((first, second) => {
    const firstPlacedAt = first.createdAt ? new Date(first.createdAt).getTime() : 0;
    const secondPlacedAt = second.createdAt ? new Date(second.createdAt).getTime() : 0;

    if (firstPlacedAt !== secondPlacedAt) {
      return secondPlacedAt - firstPlacedAt;
    }

    return second.betId - first.betId;
  })
);

const PredictionPage = () => {
  const betDetailRequestId = useRef(0);
  const [bets, setBets] = useState<BetItem[]>([]);
  const [predictionHistory, setPredictionHistory] = useState<BetItem[]>([]);
  const [selectedActiveBet, setSelectedActiveBet] = useState<BetItem | null>(null);
  const [isLoadingBetDetail, setIsLoadingBetDetail] = useState(false);
  const [betDetailError, setBetDetailError] = useState('');
  const [openRacePredictions, setOpenRacePredictions] = useState<OpenRacePrediction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [walletBalance, setWalletBalance] = useState(0);
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
        const [dashboard, overview, allBets] = await Promise.all([
          dashboardService.getSpectatorDashboard(),
          predictionService.getPredictionOverview(),
          betService.getCurrentUserBets(),
        ]);

        if (!isMounted) {
          return;
        }

        const nextOpenRaces = overview.openRaces;
        setOpenRacePredictions(nextOpenRaces);
        setSelectedRaceId(nextOpenRaces[0]?.id ?? 0);
        setSelectedHorseId(nextOpenRaces[0]?.options[0]?.horseId ?? 0);
        setWalletBalance(dashboard.wallet?.pointBalance ?? overview.walletBalance ?? 0);
        setBets(sortBetsByPlacedAt(allBets.filter((bet) => bet.status.toLowerCase() === 'pending')));
        setPredictionHistory(allBets);
      } catch (error) {
        if (isMounted) {
          setErrorMessage(getApiErrorMessage(error, 'Unable to load predictions.'));
          setOpenRacePredictions([]);
          setSelectedRaceId(0);
          setSelectedHorseId(0);
          setBets([]);
          setPredictionHistory([]);
          setWalletBalance(0);
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
    const settled = predictionHistory.filter((bet) => bet.status.toLowerCase() !== 'pending').length;
    const openRaces = openRacePredictions.filter(isRaceBettingOpen).length;
    const balanceProxy = predictionHistory.reduce(
      (total, bet) => total + (bet.status.toLowerCase() === 'won' ? bet.potentialPayout : 0),
      0,
    );

    return { openRaces, pending, settled, balanceProxy };
  }, [bets, openRacePredictions, predictionHistory]);

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
  const selectedRaceBettingOpen = isRaceBettingOpen(selectedRace);

  const openPredictionModal = (raceId = openRacePredictions[0]?.id ?? 0) => {
    const race = openRacePredictions.find((item) => item.id === raceId) ?? openRacePredictions[0];

    setSelectedRaceId(race?.id ?? 0);
    setSelectedHorseId(race?.options[0]?.horseId ?? 0);
    setStake('100');
    setFormError('');
    setIsPredictionModalOpen(true);
  };

  const openBetDetail = async (bet: BetItem) => {
    const requestId = betDetailRequestId.current + 1;
    betDetailRequestId.current = requestId;
    setSelectedActiveBet(bet);
    setIsLoadingBetDetail(true);
    setBetDetailError('');

    try {
      const detail = await betService.getMyBetDetail(bet.betId);

      if (betDetailRequestId.current === requestId) {
        setSelectedActiveBet(detail);
      }
    } catch (error) {
      if (betDetailRequestId.current === requestId) {
        setBetDetailError(getApiErrorMessage(error, 'Unable to load prediction detail.'));
      }
    } finally {
      if (betDetailRequestId.current === requestId) {
        setIsLoadingBetDetail(false);
      }
    }
  };

  const closeBetDetail = () => {
    betDetailRequestId.current += 1;
    setSelectedActiveBet(null);
    setIsLoadingBetDetail(false);
    setBetDetailError('');
  };

  const handleCreatePrediction = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError('');

    if (!selectedRaceBettingOpen) {
      setFormError('Betting is closed for this race.');
      return;
    }

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
      setPredictionHistory((current) => [prediction, ...current]);
      setWalletBalance((current) => Math.max(0, current - prediction.amount));
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
                  <h2 className="mt-2 text-2xl font-bold text-primary">Prediction windows</h2>
                </div>
                <div className="inline-flex items-center gap-2 rounded-full bg-surface-container px-4 py-2 text-sm font-semibold text-on-surface-variant">
                  <Clock3 className="w-4 h-4" /> {stats.openRaces} open / {openRacePredictions.length} total
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {openRacePredictions.map((race) => {
                  const raceOpen = isRaceBettingOpen(race);

                  return (
                  <article key={race.id} className={`rounded-2xl border bg-surface-container-low p-5 transition hover:border-secondary ${raceOpen ? 'border-outline-variant' : 'border-error/30 opacity-80'}`}>
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-secondary">{race.grade} / {race.surface}</p>
                        <h3 className="mt-2 text-lg font-bold text-primary">{race.raceName}</h3>
                        <p className="mt-1 text-sm text-on-surface-variant">{race.track} - {race.date}</p>
                      </div>
                      <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] ${raceOpen ? 'bg-secondary-container/50 text-on-secondary-container' : 'bg-error-container/30 text-error'}`}>
                        {bettingStatusLabel(race)}
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
                      {raceOpen ? 'Predict this race' : 'View closed race'}
                    </button>
                  </article>
                  );
                })}

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
                  <button
                    key={prediction.betId}
                    type="button"
                    onClick={() => void openBetDetail(prediction)}
                    aria-label={`View prediction detail for ${prediction.raceName} and ${prediction.horseName}`}
                    className="w-full rounded-2xl border border-outline-variant bg-surface-container-low p-4 text-left transition hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
                  >
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
                  </button>
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

      {selectedActiveBet && (
        <ActivePredictionDetailModal
          bet={selectedActiveBet}
          isLoading={isLoadingBetDetail}
          errorMessage={betDetailError}
          onClose={closeBetDetail}
        />
      )}

      {isPredictionModalOpen && selectedRace && selectedOption && (
        <ModalPortal
          className="fixed inset-0 z-[220] flex items-center justify-center bg-surface/80 p-4 backdrop-blur-sm"
          onClose={() => setIsPredictionModalOpen(false)}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="new-prediction-title"
            className="glass-panel flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl"
          >
            <div className="flex items-start justify-between gap-4 border-b border-outline-variant/60 p-6">
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

            <form onSubmit={handleCreatePrediction} className="flex min-h-0 flex-1 flex-col">
              <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-6">
                <div className="rounded-xl border border-outline-variant bg-surface-container-low p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.16em] text-on-surface-variant">Race</p>
                      <p className="mt-2 text-lg font-bold text-primary">{selectedRace.raceName}</p>
                    </div>
                    <span className={`w-fit rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] ${selectedRaceBettingOpen ? 'bg-secondary-container/50 text-on-secondary-container' : 'bg-error-container/30 text-error'}`}>
                      {bettingStatusLabel(selectedRace)}
                    </span>
                  </div>

                  <dl className="mt-4 grid gap-x-5 gap-y-4 border-t border-outline-variant/50 pt-4 sm:grid-cols-2">
                    {[
                      { label: 'Tournament', value: selectedRace.tournamentName },
                      { label: 'Location', value: selectedRace.track },
                      { label: 'Race schedule', value: selectedRace.scheduledAt ? formatCloseTime(selectedRace.scheduledAt) : '-' },
                      { label: 'Prediction closes', value: formatCloseTime(selectedRace.closesAt) },
                      { label: 'Distance', value: selectedRace.distanceM ? `${selectedRace.distanceM}m` : '-' },
                      { label: 'Track type', value: selectedRace.surface },
                    ].map((item) => (
                      <div key={item.label}>
                        <dt className="text-xs font-bold uppercase tracking-[0.14em] text-on-surface-variant">{item.label}</dt>
                        <dd className="mt-1 text-sm font-semibold text-on-surface">{item.value || '-'}</dd>
                      </div>
                    ))}
                  </dl>
                </div>

                <div className="grid gap-3">
                  <span className="text-xs font-bold uppercase tracking-[0.16em] text-on-surface-variant">Horse / Jockey</span>
                  <div className="grid gap-3">
                    {selectedRace.options.map((option) => {
                      const isSelected = selectedOption.horseId === option.horseId;

                      return (
                        <button
                          key={option.optionId ?? option.horseId}
                          type="button"
                          onClick={() => setSelectedHorseId(option.horseId)}
                          className={`rounded-xl border p-4 text-left transition ${
                            isSelected
                              ? 'border-secondary bg-secondary-container/30'
                              : 'border-outline-variant bg-surface-container-low hover:border-secondary'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-4">
                            <div>
                              <p className="font-bold text-on-surface">{option.horseName}</p>
                              <p className="mt-1 text-sm text-on-surface-variant">{option.jockeyName}</p>
                            </div>
                            <p className="text-sm font-bold text-primary">{option.odds} odds</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

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
                    disabled={walletBalance <= 0 || !selectedRaceBettingOpen}
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

                {!selectedRaceBettingOpen && (
                  <p className="rounded-md border border-error/30 bg-error-container/20 px-4 py-3 text-sm font-semibold text-error">
                    Betting is closed for this race.
                  </p>
                )}
              </div>

              <div className="flex justify-end gap-3 border-t border-outline-variant/60 p-6">
                <button
                  type="button"
                  onClick={() => setIsPredictionModalOpen(false)}
                  className="rounded-md border border-outline-variant px-5 py-3 text-sm font-bold text-on-surface"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={walletBalance <= 0 || !selectedRaceBettingOpen || isSubmitting}
                  className="rounded-md bg-secondary px-5 py-3 text-sm font-bold text-on-secondary transition hover:bg-secondary-container disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSubmitting ? 'Submitting...' : 'Confirm prediction'}
                </button>
              </div>
            </form>
          </section>
        </ModalPortal>
      )}
    </div>
  );
};

const ActivePredictionDetailModal = ({
  bet,
  isLoading,
  errorMessage,
  onClose,
}: {
  bet: BetItem;
  isLoading: boolean;
  errorMessage: string;
  onClose: () => void;
}) => {
  return (
    <ModalPortal
      className="fixed inset-0 z-[220] flex items-center justify-center overflow-hidden bg-surface/80 p-4 backdrop-blur-sm"
      onClose={onClose}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="active-prediction-detail-title"
        className="glass-panel flex max-h-[calc(100dvh-2rem)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl"
      >
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-outline-variant/60 p-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-secondary">Prediction #{bet.betId}</p>
            <h2 id="active-prediction-detail-title" className="mt-2 text-2xl font-bold text-primary">{bet.raceName}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close prediction detail"
            className="rounded-md border border-outline-variant p-2 text-on-surface-variant transition hover:border-primary hover:text-primary"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 overflow-y-auto p-6">
          {isLoading ? (
            <div className="flex items-center justify-center gap-3 rounded-xl border border-outline-variant bg-surface-container-low px-4 py-10 text-sm font-semibold text-on-surface-variant">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              Loading prediction detail
            </div>
          ) : (
            <div className="space-y-5">
              {errorMessage && (
                <p className="rounded-md border border-error/30 bg-error-container/20 px-4 py-3 text-sm font-semibold text-error">
                  {errorMessage}
                </p>
              )}

              <div className="grid gap-3 sm:grid-cols-3">
                <PredictionDetailItem label="Points placed" value={`${formatPoints(bet.amount)} pts`} emphasized />
                <PredictionDetailItem label="Bet rate" value={bet.odds > 0 ? `${bet.odds}x` : '-'} />
                <div className="rounded-xl border border-outline-variant bg-surface-container-low p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-on-surface-variant">Status</p>
                  <span className={`mt-2 inline-flex rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] ${statusClassName(bet.status)}`}>
                    {bet.status}
                  </span>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <PredictionDetailItem label="Horse" value={bet.horseName} />
                <PredictionDetailItem label="Jockey" value={bet.jockeyName ?? '-'} />
                <PredictionDetailItem label="Placed at" value={bet.createdAt ? formatCloseTime(bet.createdAt) : '-'} />
                <PredictionDetailItem label="Race schedule" value={bet.scheduledAt ? formatCloseTime(bet.scheduledAt) : '-'} />
                <PredictionDetailItem label="Prediction closes" value={bet.predictionClosesAt ? formatCloseTime(bet.predictionClosesAt) : '-'} />
                <PredictionDetailItem label="Potential payout" value={`${formatPoints(bet.potentialPayout)} pts`} emphasized />
              </div>
            </div>
          )}
        </div>
      </section>
    </ModalPortal>
  );
};

const PredictionDetailItem = ({
  label,
  value,
  emphasized = false,
}: {
  label: string;
  value: string;
  emphasized?: boolean;
}) => (
  <div className="rounded-xl border border-outline-variant bg-surface-container-low p-4">
    <p className="text-xs font-bold uppercase tracking-[0.14em] text-on-surface-variant">{label}</p>
    <p className={`mt-2 text-sm font-bold ${emphasized ? 'text-primary' : 'text-on-surface'}`}>{value}</p>
  </div>
);

export default PredictionPage;
