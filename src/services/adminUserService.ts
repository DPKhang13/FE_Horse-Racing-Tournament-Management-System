import { apiClient, unwrapApiData, unwrapApiList } from './apiClient';
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

type RawHorseOwner = Record<string, unknown> & {
  ownerProfile?: Record<string, unknown>;
};

export type HorseOwnerOption = {
  ownerId: number;
  name: string;
};

const asString = (value: unknown, fallback = '') => {
  if (value === null || value === undefined) {
    return fallback;
  }

  return String(value);
};

const asNumber = (value: unknown) => {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : null;
};

const mapHorseOwner = (raw: RawHorseOwner): HorseOwnerOption | null => {
  const ownerId = asNumber(raw.ownerId ?? raw.ownerProfile?.ownerId ?? raw.userId ?? raw.id);

  if (!ownerId) {
    return null;
  }

  return {
    ownerId,
    name: asString(raw.fullName ?? raw.name ?? raw.username, `Owner ${ownerId}`),
  };
};

export const adminUserService = {
  async getHorseOwners(): Promise<HorseOwnerOption[]> {
    const response = await apiClient.get('/api/admin/users/horse-owners');
    return unwrapApiList<RawHorseOwner>(response).map(mapHorseOwner).filter((owner): owner is HorseOwnerOption => Boolean(owner));
  },

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
