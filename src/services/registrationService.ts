import { apiClient, unwrapApiData, unwrapApiList } from './apiClient';
import type {
  ApproveRegistrationRequest,
  RegistrationResponse,
  RejectRegistrationRequest,
} from '../types/registration';

export const registrationService = {
  async getAllRegistrations(): Promise<RegistrationResponse[]> {
    const response = await apiClient.get('/api/race-registrations/get-all');
    return unwrapApiList<RegistrationResponse>(response);
  },

  async getMyRegistrations(): Promise<RegistrationResponse[]> {
    const response = await apiClient.get('/api/race-registrations/get-my-registrations');
    return unwrapApiList<RegistrationResponse>(response);
  },

  async getRegistrationById(id: number | string): Promise<RegistrationResponse> {
    const response = await apiClient.get(`/api/race-registrations/get-by-id/${id}`);
    return unwrapApiData<RegistrationResponse>(response);
  },

  async approveRegistration(
    registrationId: number | string,
    payload: ApproveRegistrationRequest,
  ): Promise<RegistrationResponse> {
    const response = await apiClient.patch(
      `/api/v1/admin/race-registrations/${registrationId}/approve`,
      payload,
    );
    return unwrapApiData<RegistrationResponse>(response);
  },

  async rejectRegistration(
    registrationId: number | string,
    payload: RejectRegistrationRequest,
  ): Promise<RegistrationResponse> {
    const response = await apiClient.patch(
      `/api/v1/admin/race-registrations/${registrationId}/reject`,
      payload,
    );
    return unwrapApiData<RegistrationResponse>(response);
  },
};
