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

export type AdminRaceResultCreatePayload = AdminRaceResultUpdatePayload & {
  assignmentId: RaceResultId;
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
  /** Loads every race-result record for the Admin management table. */
  async getAllResults(): Promise<AdminRaceResult[]> {
    const response = await apiClient.get('/api/race-results/get-all');
    return unwrapApiList<AdminRaceResult>(response);
  },

  /** Loads all result records belonging to one race ID. */
  async getResultsByRace(raceId: RaceResultId): Promise<AdminRaceResult[]> {
    const response = await apiClient.get(`/api/race-results/get-by-id/${raceId}`);
    const results = unwrapApiList<AdminRaceResult>(response);

    if (results.length > 0) {
      return results;
    }

    const result = unwrapApiData<unknown>(response);
    return result && typeof result === 'object' && !Array.isArray(result)
      ? [result as AdminRaceResult]
      : [];
  },

  /** Finds one result record by result ID from the Admin list. */
  async getResultDetail(id: RaceResultId): Promise<AdminRaceResult> {
    const results = await this.getAllResults();
    const result = results.find((item) => String(item.resultId ?? item.id) === String(id));

    if (!result) {
      throw new Error(`Race result ${id} was not found.`);
    }

    return result;
  },

  /** Creates one race-result record. */
  async createResult(payload: AdminRaceResultCreatePayload): Promise<AdminRaceResult> {
    const response = await apiClient.post('/api/race-results/create', payload);
    return unwrapApiData<AdminRaceResult>(response);
  },

  /** Updates one race-result record by result ID. */
  async updateResult(id: RaceResultId, payload: AdminRaceResultUpdatePayload): Promise<AdminRaceResult> {
    const response = await apiClient.put(`/api/race-results/update/${id}`, payload);
    return unwrapApiData<AdminRaceResult>(response);
  },

  /** Publishes one race-result record using the current race-results API. */
  async publishResult(id: RaceResultId): Promise<AdminRaceResult | undefined> {
    const response = await apiClient.put(`/api/race-results/publish/${id}`);
    const result = unwrapApiData<unknown>(response);
    return result && typeof result === 'object' && !Array.isArray(result)
      ? result as AdminRaceResult
      : undefined;
  },

  /** Publishes the legacy race-level workflow used by Race Control. */
  async publishResults(raceId: RaceResultId): Promise<unknown> {
    const response = await apiClient.patch(`/api/v1/admin/races/${raceId}/results/publish`);
    return unwrapApiData<unknown>(response);
  },

  /** Confirms the legacy race-level workflow used by Race Control. */
  async confirmResults(raceId: RaceResultId): Promise<unknown> {
    const response = await apiClient.patch(`/api/v1/admin/races/${raceId}/results/confirm`);
    return unwrapApiData<unknown>(response);
  },

  async cancelResults(
    raceId: RaceResultId,
    payload?: AdminRaceResultCancelPayload | string,
  ): Promise<unknown> {
    const response = await apiClient.patch(
      `/api/v1/admin/races/${raceId}/results/cancel`,
      normalizeCancelPayload(payload),
    );
    return unwrapApiData<unknown>(response);
  },
};
