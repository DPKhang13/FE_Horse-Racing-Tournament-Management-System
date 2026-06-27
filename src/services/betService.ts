import { apiClient, unwrapApiList } from './apiClient';

export type BetStatus = 'pending' | 'won' | 'lost' | 'cancelled' | string;

export type BetItem = {
  betId: number;
  raceId?: number;
  userId?: number;
  horseId?: number;
  amount: number;
  odds: number;
  potentialPayout: number;
  status: BetStatus;
  createdAt?: string;
  settledAt?: string;
  raceName: string;
  tournamentName?: string;
  horseName: string;
  jockeyName?: string;
  finishPosition?: number;
  pointsAwarded?: number;
};

export type BetFormData = {
  optionId: number;
  betType: boolean;
  betPoints: number;
  betRate: number;
  rewardPoints?: number;
  status: string;
};

type RawBet = Record<string, unknown>;

const asString = (value: unknown, fallback = '') => {
  if (value === null || value === undefined) {
    return fallback;
  }

  return String(value);
};

const asNumber = (value: unknown, fallback = 0) => {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : fallback;
};

const mapBet = (raw: RawBet): BetItem => ({
  betId: asNumber(raw.betId ?? raw.id),
  raceId: raw.raceId === undefined ? undefined : asNumber(raw.raceId),
  userId: raw.userId === undefined ? undefined : asNumber(raw.userId),
  horseId: raw.horseId === undefined ? undefined : asNumber(raw.horseId),
  amount: asNumber(raw.betPoints ?? raw.amount ?? raw.stakeAmount ?? raw.stake),
  odds: asNumber(raw.betRate ?? raw.currentRate ?? raw.odds),
  potentialPayout: asNumber(raw.rewardPoints ?? raw.potentialPayout ?? raw.payout),
  status: asString(raw.status, 'pending'),
  createdAt: raw.placedAt ? asString(raw.placedAt) : raw.createdAt ? asString(raw.createdAt) : undefined,
  settledAt: raw.settledAt ? asString(raw.settledAt) : undefined,
  raceName: asString(raw.raceName ?? raw.name, 'Race'),
  tournamentName: raw.tournamentName ? asString(raw.tournamentName) : undefined,
  horseName: asString(raw.horseName ?? raw.selectionName, 'Horse'),
  jockeyName: raw.jockeyName ? asString(raw.jockeyName) : raw.jockeyFullName ? asString(raw.jockeyFullName) : undefined,
  finishPosition: raw.finishPosition === undefined ? undefined : asNumber(raw.finishPosition),
  pointsAwarded: raw.pointsAwarded === undefined ? undefined : asNumber(raw.pointsAwarded),
});

export const betService = {
  async getBets(): Promise<BetItem[]> {
    const response = await apiClient.get('/api/bets/get-all');
    return unwrapApiList<RawBet>(response).map(mapBet);
  },

  async getBetById(id: number | string): Promise<BetItem> {
    const response = await apiClient.get(`/api/bets/get-by-id/${id}`);
    return mapBet(response.data?.data ?? response.data);
  },

  async createBet(data: BetFormData): Promise<BetItem> {
    const response = await apiClient.post('/api/bets/create', {
      optionId: Number(data.optionId),
      betType: data.betType,
      betPoints: Number(data.betPoints),
    });
    return mapBet(response.data?.data ?? response.data);
  },

  async updateBet(id: number | string, data: BetFormData): Promise<BetItem> {
    const response = await apiClient.put(`/api/bets/update/${id}`, {
      optionId: Number(data.optionId),
      betType: data.betType,
      betPoints: Number(data.betPoints),
      betRate: Number(data.betRate),
      rewardPoints: data.rewardPoints ? Number(data.rewardPoints) : undefined,
      status: data.status,
    });
    return mapBet(response.data?.data ?? response.data);
  },

  async checkBet(id: number | string, status: string, rewardPoints?: number): Promise<BetItem> {
    const response = await apiClient.put(`/api/bets/check/${id}`, {
      status,
      rewardPoints: rewardPoints === undefined ? undefined : Number(rewardPoints),
      settledAt: new Date().toISOString(),
    });
    return mapBet(response.data?.data ?? response.data);
  },

  async deleteBet(id: number | string): Promise<void> {
    await apiClient.delete(`/api/bets/delete/${id}`);
  },
};
