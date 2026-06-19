import { apiClient, unwrapApiData, unwrapApiList } from './apiClient';

export type RaceRegistrationItem = {
  regId?: number;
  id?: number;
  tournamentId?: number;
  raceId?: number;
  horseId?: number;
  ownerId?: number;
  jockeyId?: number;
  status?: string;
  ownerConfirmationStatus?: string;
  registeredAt?: string;
  approvedAt?: string;
  tournamentName?: string;
  raceName?: string;
  raceNumber?: number;
  horseName?: string;
  ownerFullName?: string;
  ownerStableName?: string;
  jockeyFullName?: string;
  approvedByFullName?: string;
};

export type RaceRegistrationFormData = {
  tournamentId: number;
  raceId: number;
  horseId: number;
  jockeyId?: number;
  status: string;
  ownerConfirmationStatus: string;
};

const toPayload = (data: RaceRegistrationFormData) => ({
  tournamentId: Number(data.tournamentId),
  raceId: Number(data.raceId),
  horseId: Number(data.horseId),
  jockeyId: data.jockeyId ? Number(data.jockeyId) : undefined,
  status: data.status.trim(),
  ownerConfirmationStatus: data.ownerConfirmationStatus.trim(),
});

export const raceRegistrationService = {
  async getAll(): Promise<RaceRegistrationItem[]> {
    const response = await apiClient.get('/api/race-registrations/get-all');
    return unwrapApiList<RaceRegistrationItem>(response);
  },

  async getMine(status?: string): Promise<RaceRegistrationItem[]> {
    const response = await apiClient.get('/api/race-registrations/get-my-registrations', {
      params: status ? { status } : undefined,
    });
    return unwrapApiList<RaceRegistrationItem>(response);
  },

  async create(data: RaceRegistrationFormData): Promise<RaceRegistrationItem> {
    const response = await apiClient.post('/api/race-registrations/create', toPayload(data));
    return unwrapApiData<RaceRegistrationItem>(response);
  },

  async update(id: number | string, data: RaceRegistrationFormData): Promise<RaceRegistrationItem> {
    const response = await apiClient.put(`/api/race-registrations/update/${id}`, toPayload(data));
    return unwrapApiData<RaceRegistrationItem>(response);
  },

  async approve(id: number | string, status: string): Promise<RaceRegistrationItem> {
    const response = await apiClient.put(`/api/race-registrations/approve/${id}`, {
      status,
      approvedAt: new Date().toISOString(),
    });
    return unwrapApiData<RaceRegistrationItem>(response);
  },

  async delete(id: number | string): Promise<void> {
    await apiClient.delete(`/api/race-registrations/delete/${id}`);
  },
};
