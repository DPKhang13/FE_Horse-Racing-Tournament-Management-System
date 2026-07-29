import { apiClient, unwrapApiData, unwrapApiList } from './apiClient';

export type GateAvailability = {
  raceId: number;
  raceName: string;
  maxHorses: number;
  gateCount: number;
  availableGates: number[];
  occupiedGates: number[];
};

export type RaceRegistrationItem = {
  regId?: number;
  id?: number;
  tournamentId?: number;
  raceId?: number;
  horseId?: number;
  ownerId?: number;
  jockeyId?: number;
  gateNumber?: number;
  status?: string;
  ownerConfirmationStatus?: string;
  registeredAt?: string;
  approvedAt?: string;
  tournamentName?: string;
  raceName?: string;
  raceNumber?: number;
  raceStatus?: string;
  scheduledAt?: string;
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
  gateNumber: number;
  status?: string;
  ownerConfirmationStatus?: string;
};

export type RaceRegistrationUpdateFormData = {
  tournamentId?: number;
  raceId?: number;
  horseId?: number;
  gateNumber?: number;
  status?: string;
  ownerConfirmationStatus?: string;
};

export type AdminRaceRegistrationApprovePayload = {
  note?: string;
};

export type AdminRaceRegistrationRejectPayload = {
  reason?: string;
};

export type RaceRegistrationCancelPayload = {
  reason?: string;
};

const toPayload = (data: RaceRegistrationFormData) => ({
  tournamentId: Number(data.tournamentId),
  raceId: Number(data.raceId),
  horseId: Number(data.horseId),
  gateNumber: Number(data.gateNumber),
});

const toUpdatePayload = (data: RaceRegistrationUpdateFormData) => {
  const payload: Record<string, unknown> = {};
  if (data.tournamentId != null) payload.tournamentId = Number(data.tournamentId);
  if (data.raceId != null) payload.raceId = Number(data.raceId);
  if (data.horseId != null) payload.horseId = Number(data.horseId);
  if (data.gateNumber != null) payload.gateNumber = Number(data.gateNumber);
  if (data.status) payload.status = data.status.trim();
  if (data.ownerConfirmationStatus) payload.ownerConfirmationStatus = data.ownerConfirmationStatus.trim();
  return payload;
};

export const raceRegistrationService = {
  async getAll(): Promise<RaceRegistrationItem[]> {
    const response = await apiClient.get('/api/race-registrations/get-all');
    return unwrapApiList<RaceRegistrationItem>(response);
  },

  async getPendingApproval(): Promise<RaceRegistrationItem[]> {
    const response = await apiClient.get('/api/v1/admin/race-registrations/pending-approval');
    return unwrapApiList<RaceRegistrationItem>(response);
  },

  async getMine(): Promise<RaceRegistrationItem[]> {
    const response = await apiClient.get('/api/race-registrations/get-my-registrations');
    return unwrapApiList<RaceRegistrationItem>(response);
  },

  async getMyRegistrationById(id: number | string): Promise<RaceRegistrationItem> {
    const response = await apiClient.get(`/api/race-registrations/get-my-registration/${id}`);
    return unwrapApiData<RaceRegistrationItem>(response);
  },

  async getAvailableGates(raceId: number | string): Promise<GateAvailability> {
    const response = await apiClient.get(`/api/races/${raceId}/available-gates`);
    return unwrapApiData<GateAvailability>(response);
  },

  async create(data: RaceRegistrationFormData): Promise<RaceRegistrationItem> {
    const response = await apiClient.post('/api/race-registrations/create', toPayload(data));
    return unwrapApiData<RaceRegistrationItem>(response);
  },

  async update(id: number | string, data: RaceRegistrationUpdateFormData): Promise<RaceRegistrationItem> {
    const response = await apiClient.put(`/api/race-registrations/update/${id}`, toUpdatePayload(data));
    return unwrapApiData<RaceRegistrationItem>(response);
  },

  async cancel(id: number | string, payload?: RaceRegistrationCancelPayload): Promise<RaceRegistrationItem> {
    const response = await apiClient.patch(`/api/race-registrations/cancel/${id}`, payload ?? {});
    return unwrapApiData<RaceRegistrationItem>(response);
  },

  async approve(id: number | string, payload: AdminRaceRegistrationApprovePayload = {}): Promise<RaceRegistrationItem> {
    const response = await apiClient.patch(`/api/v1/admin/race-registrations/${id}/approve`, payload);
    return unwrapApiData<RaceRegistrationItem>(response);
  },

  async reject(id: number | string, payload: AdminRaceRegistrationRejectPayload = {}): Promise<RaceRegistrationItem> {
    const response = await apiClient.patch(`/api/v1/admin/race-registrations/${id}/reject`, payload);
    return unwrapApiData<RaceRegistrationItem>(response);
  },
};
