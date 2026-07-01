import { apiClient, unwrapApiData, unwrapApiList } from './apiClient';

export type JockeyAssignmentItem = {
  assignmentId?: number;
  id?: number;
  regId?: number;
  registrationId?: number;
  raceId?: number;
  jockeyId?: number;
  gateNumber?: number;
  status?: string;
  invitedAt?: string;
  respondedAt?: string;
  cancelledAt?: string;
  expiredAt?: string;
  raceName?: string;
  raceNumber?: number;
  horseId?: number;
  horseName?: string;
  ownerFullName?: string;
  ownerStableName?: string;
  jockeyFullName?: string;
};

export type JockeyInvitationFormData = {
  registrationId: number;
  raceId: number;
  jockeyId: number;
  gateNumber?: number;
  status?: string;
};

const toPayload = (data: JockeyInvitationFormData) => ({
  registrationId: Number(data.registrationId),
  raceId: Number(data.raceId),
  jockeyId: Number(data.jockeyId),
  gateNumber: data.gateNumber ? Number(data.gateNumber) : undefined,
});

const toUpdatePayload = (data: JockeyInvitationFormData) => ({
  ...toPayload(data),
  status: data.status?.trim(),
});

export const jockeyAssignmentService = {
  async getAll(): Promise<JockeyAssignmentItem[]> {
    const response = await apiClient.get('/api/jockey-assignments/get-all');
    return unwrapApiList<JockeyAssignmentItem>(response);
  },

  async getMine(status?: string): Promise<JockeyAssignmentItem[]> {
    const response = await apiClient.get('/api/jockey-assignments/get-my-invitations', {
      params: status ? { status } : undefined,
    });
    return unwrapApiList<JockeyAssignmentItem>(response);
  },

  async getSent(status?: string): Promise<JockeyAssignmentItem[]> {
    const response = await apiClient.get('/api/jockey-assignments/get-sent-invitations', {
      params: status ? { status } : undefined,
    });
    return unwrapApiList<JockeyAssignmentItem>(response);
  },

  async create(data: JockeyInvitationFormData): Promise<JockeyAssignmentItem> {
    const response = await apiClient.post('/api/jockey-assignments/create-invitation', toPayload(data));
    return unwrapApiData<JockeyAssignmentItem>(response);
  },

  async update(id: number | string, data: JockeyInvitationFormData): Promise<JockeyAssignmentItem> {
    const response = await apiClient.put(`/api/jockey-assignments/update/${id}`, toUpdatePayload(data));
    return unwrapApiData<JockeyAssignmentItem>(response);
  },

  async respond(id: number | string, status: string): Promise<JockeyAssignmentItem> {
    const response = await apiClient.put(`/api/jockey-assignments/respond/${id}`, {
      status,
    });
    return unwrapApiData<JockeyAssignmentItem>(response);
  },

  async confirm(id: number | string): Promise<JockeyAssignmentItem> {
    const response = await apiClient.patch(`/api/v1/owner/jockey-assignments/${id}/confirm`);
    return unwrapApiData<JockeyAssignmentItem>(response);
  },

  async delete(id: number | string): Promise<void> {
    await apiClient.delete(`/api/jockey-assignments/delete/${id}`);
  },
};
