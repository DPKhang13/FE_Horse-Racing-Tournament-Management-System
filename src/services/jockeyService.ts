import { apiClient, unwrapApiList } from './apiClient';

export type JockeyItem = {
  jockeyId?: number;
  fullName?: string;
  username?: string;
  email?: string;
  phone?: string;
  licenseNumber?: string;
  rankingPoints?: number;
  totalWins?: number;
  experienceYears?: number;
  status?: string;
};

export const jockeyService = {
  async getJockeys(status?: string): Promise<JockeyItem[]> {
    const response = await apiClient.get('/api/jockeys/get-all', {
      params: status ? { status } : undefined,
    });
    return unwrapApiList<JockeyItem>(response);
  },
};
