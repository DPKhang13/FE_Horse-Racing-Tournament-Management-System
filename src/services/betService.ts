import { apiClient, unwrapApiData, unwrapApiList } from './apiClient';

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
  status?: string;
};

export type BetOptionItem = {
  optionId: number;
  raceId?: number;
  assignmentId?: number;
  raceName: string;
  horseId?: number;
  horseName: string;
  horseAvatarUrl?: string;
  jockeyId?: number;
  jockeyName?: string;
  jockeyFullName?: string;
  jockeyAvatarUrl?: string;
  gateNumber?: number;
  currentRate: number;
  totalBetPoints: number;
  totalBetCount: number;
  updatedAt?: string;
};

type RawBet = Record<string, unknown>;
type RawBetOption = Record<string, unknown>;

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

const mapBet = (raw: RawBet): BetItem => {
  const amount = asNumber(raw.betPoints ?? raw.amount ?? raw.stakeAmount ?? raw.stake);
  const odds = asNumber(raw.betRate ?? raw.currentRate ?? raw.odds);
  const status = asString(raw.status, 'pending');
  const rewardPoints = asNumber(raw.rewardPoints);
  const explicitPayout = raw.potentialPayout ?? raw.payout;
  const potentialPayout = explicitPayout === undefined
    ? status.toLowerCase() === 'pending'
      ? Math.round(amount * odds)
      : rewardPoints
    : asNumber(explicitPayout);

  return {
    betId: asNumber(raw.betId ?? raw.id),
    raceId: raw.raceId === undefined ? undefined : asNumber(raw.raceId),
    userId: raw.userId === undefined ? undefined : asNumber(raw.userId),
    horseId: raw.horseId === undefined ? undefined : asNumber(raw.horseId),
    amount,
    odds,
    potentialPayout,
    status,
    createdAt: raw.placedAt ? asString(raw.placedAt) : raw.createdAt ? asString(raw.createdAt) : undefined,
    settledAt: raw.settledAt ? asString(raw.settledAt) : undefined,
    raceName: asString(raw.raceName ?? raw.name, 'Race'),
    tournamentName: raw.tournamentName ? asString(raw.tournamentName) : undefined,
    horseName: asString(raw.horseName ?? raw.selectionName, 'Horse'),
    jockeyName: raw.jockeyName ? asString(raw.jockeyName) : raw.jockeyFullName ? asString(raw.jockeyFullName) : undefined,
    finishPosition: raw.finishPosition === undefined ? undefined : asNumber(raw.finishPosition),
    pointsAwarded: raw.pointsAwarded === undefined ? undefined : asNumber(raw.pointsAwarded),
  };
};

const mapBetOption = (raw: RawBetOption): BetOptionItem => ({
  optionId: asNumber(raw.optionId ?? raw.id),
  raceId: raw.raceId === undefined ? undefined : asNumber(raw.raceId),
  assignmentId: raw.assignmentId === undefined ? undefined : asNumber(raw.assignmentId),
  raceName: asString(raw.raceName, 'Race'),
  horseId: raw.horseId === undefined ? undefined : asNumber(raw.horseId),
  horseName: asString(raw.horseName, 'Horse'),
  horseAvatarUrl: raw.horseAvatarUrl ? asString(raw.horseAvatarUrl) : undefined,
  jockeyId: raw.jockeyId === undefined ? undefined : asNumber(raw.jockeyId),
  jockeyName: raw.jockeyName ? asString(raw.jockeyName) : undefined,
  jockeyFullName: raw.jockeyFullName ? asString(raw.jockeyFullName) : undefined,
  jockeyAvatarUrl: raw.jockeyAvatarUrl ? asString(raw.jockeyAvatarUrl) : undefined,
  gateNumber: raw.gateNumber === undefined ? undefined : asNumber(raw.gateNumber),
  currentRate: asNumber(raw.currentRate ?? raw.betRate ?? raw.odds),
  totalBetPoints: asNumber(raw.totalBetPoints),
  totalBetCount: asNumber(raw.totalBetCount),
  updatedAt: raw.updatedAt ? asString(raw.updatedAt) : undefined,
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
      betRate: Number(data.betRate),
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
    throw new Error(`Backend does not provide delete API for bet ${id}.`);
  },

  async getBetOptions(raceId?: number | string): Promise<BetOptionItem[]> {
    const response = raceId
      ? await apiClient.get(`/api/bet-options/get-by-race/${raceId}`)
      : await apiClient.get('/api/bet-options/get-all');

    return unwrapApiList<RawBetOption>(response).map(mapBetOption);
  },

  async getBetOptionById(id: number | string): Promise<BetOptionItem> {
    const response = await apiClient.get(`/api/bet-options/get-by-id/${id}`);
    return mapBetOption(unwrapApiData<RawBetOption>(response));
  },

  async generateBetOptionsForRace(raceId: number | string): Promise<BetOptionItem[]> {
    const response = await apiClient.post(`/api/admin/bet-options/generate-by-race/${raceId}`);
    return unwrapApiList<RawBetOption>(response).map(mapBetOption);
  },

  async updateBetOptionRate(optionId: number | string, currentRate: number): Promise<BetOptionItem> {
    const response = await apiClient.put(`/api/admin/bet-options/${optionId}/rate`, {
      currentRate: Number(currentRate),
    });
    return mapBetOption(unwrapApiData<RawBetOption>(response));
  },
};
