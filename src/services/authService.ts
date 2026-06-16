import {
  apiClient,
  clearSessionStorage,
  CURRENT_USER_KEY,
  setSessionStorage,
  unwrapApiData,
} from './apiClient';
import type { UserProfile, UserRoleType } from '../types/user';
import { normalizeRoleType } from '../utils/permissions';

export type LoginRequest = {
  usernameOrEmail: string;
  password: string;
};

export type RegisterRequest = {
  username: string;
  email: string;
  password: string;
  fullName: string;
  phone: string;
  roleType: 'horse_owner' | 'jockey' | 'race_referee' | 'spectator';
};

export type VerifyOtpRequest = {
  email: string;
  otp: string;
};

export type ResendOtpRequest = {
  email: string;
};

export type AuthUserResponse = {
  userId?: number;
  id?: number;
  username?: string;
  email?: string;
  fullName?: string;
  phone?: string;
  roleType?: UserRoleType | string;
  status?: string;
  avatarUrl?: string | null;
  createdAt?: string;
  ownerProfile?: {
    ownerId?: number;
    stableName?: string;
    licenseNumber?: string;
    address?: string;
    favoriteJockeyId?: number;
    status?: string;
    createdAt?: string;
  };
  jockeyProfile?: {
    jockeyId?: number;
    licenseNumber?: string;
    rankingPoints?: number;
    totalWins?: number;
    experienceYears?: number;
    status?: string;
  };
  refereeProfile?: {
    refereeId?: number;
    licenseNumber?: string;
    address?: string;
    status?: string;
    createdAt?: string;
  };
};

type LoginResponse = {
  accessToken?: string;
  token?: string;
  jwt?: string;
  refreshToken?: string;
  user?: AuthUserResponse;
};

const asString = (value: unknown, fallback = '') => {
  if (value === null || value === undefined) {
    return fallback;
  }

  return String(value);
};

const normalizeRoleLabel = (roleType: unknown): UserProfile['role'] => {
  const value = normalizeRoleType(roleType);

  if (value === 'admin') {
    return 'Admin';
  }

  if (value) {
    return 'User';
  }

  return 'Guest';
};

const normalizeStatus = (status: unknown): UserProfile['status'] => {
  const value = asString(status, 'active').toLowerCase();

  if (value === 'inactive' || value === 'disabled') {
    return 'Inactive';
  }

  if (value === 'pending' || value === 'unverified') {
    return 'Pending';
  }

  return 'Active';
};

export const mapAuthUserToProfile = (user: AuthUserResponse): UserProfile => ({
  id: asString(user.userId ?? user.id, 'current-user'),
  userId: user.userId ?? user.id,
  username: user.username,
  fullName: asString(user.fullName ?? user.username, 'Current User'),
  email: asString(user.email),
  phone: user.phone,
  address: user.ownerProfile?.address ?? user.refereeProfile?.address,
  avatarUrl: user.avatarUrl ?? undefined,
  role: normalizeRoleLabel(user.roleType),
  roleType: normalizeRoleType(user.roleType),
  joinedDate: asString(user.createdAt, new Date().toISOString()),
  createdAt: user.createdAt,
  status: normalizeStatus(user.status),
  ownerProfile: user.ownerProfile,
  jockeyProfile: user.jockeyProfile,
  refereeProfile: user.refereeProfile,
});

export const authService = {
  getStoredUserProfile(): UserProfile | undefined {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const storedUser = window.localStorage.getItem(CURRENT_USER_KEY);

    if (!storedUser) {
      return undefined;
    }

    try {
      return mapAuthUserToProfile(JSON.parse(storedUser) as AuthUserResponse);
    } catch {
      return undefined;
    }
  },

  async login(request: LoginRequest) {
    const response = await apiClient.post('/api/auth/login', {
      usernameOrEmail: request.usernameOrEmail.trim(),
      password: request.password,
    });
    const payload = unwrapApiData<LoginResponse>(response);
    const accessToken = payload.accessToken ?? payload.token ?? payload.jwt;

    if (!accessToken) {
      throw new Error('Login response did not include an access token.');
    }

    setSessionStorage({
      accessToken,
      refreshToken: payload.refreshToken,
      user: payload.user,
    });

    return {
      ...payload,
      userProfile: payload.user ? mapAuthUserToProfile(payload.user) : undefined,
    };
  },

  async register(request: RegisterRequest) {
    const response = await apiClient.post('/api/auth/register', {
      username: request.username.trim(),
      email: request.email.trim(),
      password: request.password,
      fullName: request.fullName.trim(),
      phone: request.phone.trim(),
      roleType: request.roleType,
    });

    return unwrapApiData<unknown>(response);
  },

  async verifyOtp(request: VerifyOtpRequest) {
    const response = await apiClient.post('/api/auth/verify-otp', {
      email: request.email.trim(),
      otp: request.otp.trim(),
    });

    return unwrapApiData<unknown>(response);
  },

  async resendOtp(request: ResendOtpRequest) {
    const response = await apiClient.post('/api/auth/resend-otp', {
      email: request.email.trim(),
    });

    return unwrapApiData<unknown>(response);
  },

  async getCurrentUser() {
    const response = await apiClient.get('/api/auth/me');
    const user = unwrapApiData<AuthUserResponse>(response);

    if (typeof window !== 'undefined') {
      window.localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
      window.dispatchEvent(new Event('auth-changed'));
    }

    return mapAuthUserToProfile(user);
  },

  async logout() {
    try {
      await apiClient.post('/api/auth/logout');
    } finally {
      clearSessionStorage();
    }
  },
};
