import { apiClient, unwrapApiData } from './apiClient';

export type RaceResultMutationData = {
  assignmentId: number;
  reportId?: number;
  finalRound?: number;
  finishPosition?: number;
  finishTimeSec?: number;
  pointsAwarded?: number;
  isDisqualified: boolean;
  disqualifyReason?: string;
  status: string;
};

const toPayload = (data: RaceResultMutationData) => ({
  assignmentId: Number(data.assignmentId),
  reportId: data.reportId ? Number(data.reportId) : undefined,
  finalRound: data.finalRound ? Number(data.finalRound) : undefined,
  finishPosition: data.finishPosition ? Number(data.finishPosition) : undefined,
  finishTimeSec: data.finishTimeSec ? Number(data.finishTimeSec) : undefined,
  pointsAwarded: data.pointsAwarded === undefined ? undefined : Number(data.pointsAwarded),
  isDisqualified: data.isDisqualified,
  disqualifyReason: data.disqualifyReason?.trim() || undefined,
  status: data.status.trim(),
  recordedAt: new Date().toISOString(),
});

export const raceOperationsService = {
  async createResult(data: RaceResultMutationData): Promise<Record<string, unknown>> {
    const response = await apiClient.post('/api/race-results/create', toPayload(data));
    return unwrapApiData<Record<string, unknown>>(response);
  },

  async updateResult(id: number | string, data: RaceResultMutationData): Promise<Record<string, unknown>> {
    const response = await apiClient.put(`/api/race-results/update/${id}`, toPayload(data));
    return unwrapApiData<Record<string, unknown>>(response);
  },

  async publishResult(id: number | string, status = 'published'): Promise<Record<string, unknown>> {
    const response = await apiClient.put(`/api/race-results/publish/${id}`, {
      status,
      publishedAt: new Date().toISOString(),
    });
    return unwrapApiData<Record<string, unknown>>(response);
  },

  async deleteResult(id: number | string): Promise<void> {
    await apiClient.delete(`/api/race-results/delete/${id}`);
  },

  async calculateReward(betId: number | string, status: string, rewardPoints?: number): Promise<Record<string, unknown>> {
    const response = await apiClient.put(`/api/rewards/calculate/${betId}`, {
      status,
      rewardPoints: rewardPoints === undefined ? undefined : Number(rewardPoints),
      settledAt: new Date().toISOString(),
    });
    return unwrapApiData<Record<string, unknown>>(response);
  },
};
