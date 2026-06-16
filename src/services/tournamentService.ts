import { apiClient, unwrapApiData, unwrapApiList } from './apiClient';
import type { TournamentApiItem } from './scheduleService';

export type TournamentFormData = {
  name: string;
  location: string;
  startDate: string;
  endDate: string;
  prizePool: number;
  status: string;
};

export type PrizeItem = {
  prizeId?: number;
  finishPosition: number;
  prizeName: string;
  amount: number;
  note?: string;
  tournamentName?: string;
};

export type RefereeAssignmentItem = {
  assignmentId?: number;
  raceId?: number;
  refereeId?: number;
  refereeRole?: string;
  refereeFullName?: string;
  status?: string;
};

const cleanTournamentPayload = (data: TournamentFormData) => ({
  name: data.name.trim(),
  location: data.location.trim(),
  startDate: data.startDate,
  endDate: data.endDate,
  prizePool: Number(data.prizePool),
  status: data.status.trim(),
});

export const tournamentService = {
  async getTournaments(status?: string): Promise<TournamentApiItem[]> {
    const response = await apiClient.get('/api/tournaments/getAll', {
      params: status ? { status } : undefined,
    });
    return unwrapApiList<TournamentApiItem>(response);
  },

  async getTournamentById(tournamentId: number | string): Promise<Record<string, unknown>> {
    const response = await apiClient.get(`/api/tournaments/getId/${tournamentId}`);
    return unwrapApiData<Record<string, unknown>>(response);
  },

  async createTournament(data: TournamentFormData): Promise<TournamentApiItem> {
    const response = await apiClient.post('/api/tournaments/create', cleanTournamentPayload(data));
    return unwrapApiData<TournamentApiItem>(response);
  },

  async updateTournament(tournamentId: number | string, data: TournamentFormData): Promise<TournamentApiItem> {
    const response = await apiClient.put(`/api/tournaments/update/${tournamentId}`, cleanTournamentPayload(data));
    return unwrapApiData<TournamentApiItem>(response);
  },

  async cancelTournament(tournamentId: number | string): Promise<TournamentApiItem> {
    const response = await apiClient.patch(`/api/tournaments/cancel/${tournamentId}`);
    return unwrapApiData<TournamentApiItem>(response);
  },

  async getPrizes(tournamentId: number | string): Promise<PrizeItem[]> {
    const response = await apiClient.get(`/api/v1/admin/tournaments/getId/${tournamentId}`);
    return unwrapApiList<PrizeItem>(response);
  },

  async createPrizes(tournamentId: number | string, prizes: PrizeItem[]): Promise<PrizeItem[]> {
    const response = await apiClient.post(`/api/v1/admin/tournaments/create/${tournamentId}`, {
      prizes: prizes.map((prize) => ({
        finishPosition: Number(prize.finishPosition),
        prizeName: prize.prizeName.trim(),
        amount: Number(prize.amount),
        note: prize.note?.trim() || undefined,
      })),
    });
    return unwrapApiList<PrizeItem>(response);
  },

  async getRaceReferees(raceId: number | string): Promise<RefereeAssignmentItem[]> {
    const response = await apiClient.get(`/api/v1/admin/races/${raceId}/referees`);
    return unwrapApiList<RefereeAssignmentItem>(response);
  },

  async assignReferee(raceId: number | string, refereeId: number, refereeRole: string): Promise<RefereeAssignmentItem> {
    const response = await apiClient.post(`/api/v1/admin/races/${raceId}/referees`, {
      refereeId: Number(refereeId),
      refereeRole: refereeRole.trim(),
    });
    return unwrapApiData<RefereeAssignmentItem>(response);
  },
};
