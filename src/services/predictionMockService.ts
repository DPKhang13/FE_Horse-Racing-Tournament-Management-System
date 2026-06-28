import { mockPredictionBets, mockPredictionWallet } from '../mocks/predictionMockData';
import type { OpenRacePrediction, PredictionOption } from '../types/prediction';
import type { BetItem } from './betService';

const STORED_BETS_KEY = 'htms_mock_prediction_bets';
const WALLET_BALANCE_KEY = 'htms_mock_prediction_wallet_balance';

const readStoredBets = (): BetItem[] => {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const value = window.localStorage.getItem(STORED_BETS_KEY);
    return value ? JSON.parse(value) as BetItem[] : [];
  } catch {
    return [];
  }
};

const readWalletBalance = () => {
  if (typeof window === 'undefined') {
    return mockPredictionWallet.balance;
  }

  const storedValue = window.localStorage.getItem(WALLET_BALANCE_KEY);

  if (storedValue === null) {
    return mockPredictionWallet.balance;
  }

  const value = Number(storedValue);

  // Recover the stale zero value produced by the previous mock-wallet initializer.
  if (value === 0 && readStoredBets().length === 0) {
    window.localStorage.removeItem(WALLET_BALANCE_KEY);
    return mockPredictionWallet.balance;
  }

  return Number.isFinite(value) && value >= 0 ? value : mockPredictionWallet.balance;
};

export const predictionMockService = {
  getBets(): BetItem[] {
    return [...readStoredBets(), ...mockPredictionBets];
  },

  getWalletBalance(): number {
    return readWalletBalance();
  },

  createPrediction({
    race,
    option,
    amount,
  }: {
    race: OpenRacePrediction;
    option: PredictionOption;
    amount: number;
  }): BetItem {
    if (new Date(race.closesAt).getTime() <= Date.now()) {
      throw new Error('The prediction window for this race has closed.');
    }

    const balance = readWalletBalance();

    if (!Number.isFinite(amount) || amount <= 0) {
      throw new Error('Prediction points must be greater than zero.');
    }

    if (amount > balance) {
      throw new Error('Your wallet does not have enough points.');
    }

    const prediction: BetItem = {
      betId: Date.now(),
      raceId: race.id,
      userId: 501,
      horseId: option.horseId,
      amount,
      odds: option.odds,
      potentialPayout: Math.round(amount * option.odds),
      status: 'pending',
      createdAt: new Date().toISOString(),
      raceName: race.raceName,
      tournamentName: race.tournamentName,
      horseName: option.horseName,
      jockeyName: option.jockeyName,
    };

    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORED_BETS_KEY, JSON.stringify([prediction, ...readStoredBets()]));
      window.localStorage.setItem(WALLET_BALANCE_KEY, String(balance - amount));
    }

    return prediction;
  },
};
