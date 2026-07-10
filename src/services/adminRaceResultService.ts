import { apiClient, unwrapApiData, unwrapApiList } from './apiClient';

export type RaceResultId = number | string;

export type AdminRaceResult = {
  id?: RaceResultId;
  resultId?: RaceResultId;
  assignmentId?: RaceResultId;
  raceId?: RaceResultId;
  horseId?: RaceResultId;
  ownerId?: RaceResultId;
  reportId?: RaceResultId;
  finalRound?: number;
  finishPosition?: number | null;
  finishTimeSec?: number | null;
  pointsAwarded?: number;
  isDisqualified?: boolean;
  disqualifyReason?: string | null;
  status?: string;
  recordedAt?: string;
  publishedAt?: string | null;
  raceName?: string;
  raceNumber?: number;
  scheduledAt?: string;
  distanceM?: number;
  trackType?: string;
  tournamentId?: RaceResultId;
  tournamentName?: string;
  location?: string;
  horseName?: string;
  horseAvatarUrl?: string;
  ownerFullName?: string;
  ownerStableName?: string;
  jockeyId?: RaceResultId;
  jockeyFullName?: string;
  gateNumber?: number;
  reportVerdict?: string;
  [key: string]: unknown;
};

export type AdminRaceResultUpdatePayload = {
  assignmentId?: RaceResultId;
  reportId?: RaceResultId;
  finalRound?: number;
  finishPosition?: number | null;
  finishTimeSec?: number | null;
  pointsAwarded?: number;
  isDisqualified?: boolean;
  disqualifyReason?: string | null;
  status?: string;
  recordedAt?: string;
  publishedAt?: string | null;
  [key: string]: unknown;
};

export type AdminRaceResultCancelPayload = {
  reason?: string;
  [key: string]: unknown;
};

const normalizeCancelPayload = (
  payload?: AdminRaceResultCancelPayload | string,
): AdminRaceResultCancelPayload | undefined => {
  if (!payload) {
    return undefined;
  }

  if (typeof payload === 'string') {
    const reason = payload.trim();
    return reason ? { reason } : undefined;
  }

  const reason = typeof payload.reason === 'string' ? payload.reason.trim() : undefined;
  return reason ? { ...payload, reason } : payload;
};

export const adminRaceResultService = {
  async getAllResults(): Promise<AdminRaceResult[]> {
    const response = await apiClient.get('/api/race-results/get-all');
    return unwrapApiList<AdminRaceResult>(response);
  },

  async getResultsByRace(raceId: RaceResultId): Promise<AdminRaceResult[]> {
    const response = await apiClient.get(`/api/v1/admin/races/${raceId}/results/get`);
    return unwrapApiList<AdminRaceResult>(response);
  },

  async getResultDetail(id: RaceResultId): Promise<AdminRaceResult> {
    const response = await apiClient.get(`/api/race-results/get-by-id/${id}`);
    return unwrapApiData<AdminRaceResult>(response);
  },

  async updateResult(id: RaceResultId, payload: AdminRaceResultUpdatePayload): Promise<AdminRaceResult> {
    const response = await apiClient.put(`/api/race-results/update/${id}`, payload);
    return unwrapApiData<AdminRaceResult>(response);
  },

  async publishResults(raceId: RaceResultId): Promise<unknown> {
    const response = await apiClient.post(`/api/v1/admin/races/${raceId}/results/publish`);
    return unwrapApiData<unknown>(response);
  },

  async confirmResults(raceId: RaceResultId): Promise<unknown> {
    const response = await apiClient.post(`/api/v1/admin/races/${raceId}/results/confirm`);
    return unwrapApiData<unknown>(response);
  },

  async cancelResults(
    raceId: RaceResultId,
    payload?: AdminRaceResultCancelPayload | string,
  ): Promise<unknown> {
    const response = await apiClient.post(
      `/api/v1/admin/races/${raceId}/results/cancel`,
      normalizeCancelPayload(payload),
    );
    return unwrapApiData<unknown>(response);
  },
};
