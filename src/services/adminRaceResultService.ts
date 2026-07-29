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

export type AdminRaceResultDraftItem = {
  assignmentId: RaceResultId;
  finishPosition?: number;
  finishTimeSec?: number;
  isDisqualified: boolean;
  disqualifyReason?: string;
};

export type AdminRaceResultDraftUpdatePayload = {
  reportId?: RaceResultId;
  results: AdminRaceResultDraftItem[];
};

export const adminRaceResultService = {
  async getAllResults(): Promise<AdminRaceResult[]> {
    const response = await apiClient.get('/api/race-results/get-all');
    return unwrapApiList<AdminRaceResult>(response);
  },

  async getResultsByRace(raceId: RaceResultId): Promise<AdminRaceResult[]> {
    const response = await apiClient.get(`/api/v1/admin/races/${raceId}/results/get`);
    const results = unwrapApiList<AdminRaceResult>(response);

    if (results.length > 0) {
      return results;
    }

    const result = unwrapApiData<unknown>(response);
    return result && typeof result === 'object' && !Array.isArray(result)
      ? [result as AdminRaceResult]
      : [];
  },

  async updateDraft(
    raceId: RaceResultId,
    payload: AdminRaceResultDraftUpdatePayload,
  ): Promise<unknown> {
    const response = await apiClient.put(
      `/api/v1/admin/races/${raceId}/results/draft/update`,
      payload,
    );
    return unwrapApiData<unknown>(response);
  },

  async publishResults(raceId: RaceResultId): Promise<unknown> {
    const response = await apiClient.patch(`/api/v1/admin/races/${raceId}/results/publish`);
    return unwrapApiData<unknown>(response);
  },
};