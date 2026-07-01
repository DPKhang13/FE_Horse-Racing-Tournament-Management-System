import { apiClient, unwrapApiData } from './apiClient';
import type { AuthUserResponse } from './authService';
import type { UserRoleType } from '../types/user';

export type AdminCreateUserRequest = {
  username: string;
  email: string;
  password: string;
  fullName: string;
  phone: string;
  roleType: UserRoleType;
  licenseNumber?: string;
  experienceYears?: number;
  stableName?: string;
  address?: string;
};

export const adminUserService = {
  async createUser(data: AdminCreateUserRequest): Promise<AuthUserResponse> {
    const response = await apiClient.post('/api/admin/users/create', {
      username: data.username.trim(),
      email: data.email.trim(),
      password: data.password,
      fullName: data.fullName.trim(),
      phone: data.phone.trim(),
      roleType: data.roleType,
      licenseNumber: data.licenseNumber?.trim(),
      experienceYears: data.experienceYears === undefined ? undefined : Number(data.experienceYears),
      stableName: data.stableName?.trim(),
      address: data.address?.trim(),
    });

    return unwrapApiData<AuthUserResponse>(response);
  },
};
