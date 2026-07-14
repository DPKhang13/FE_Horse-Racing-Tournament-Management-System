import { apiClient, unwrapApiData } from './apiClient';
import type { UserRoleType } from '../types/user';
import { normalizeRoleType } from '../utils/permissions';

export type AdminUserStatus = 'active' | 'inactive' | 'pending';

export type AdminHorseOwnerProfile = {
  ownerId?: number;
  stableName?: string;
  licenseNumber?: string;
  address?: string;
  favoriteJockeyId?: number;
  status?: string;
  createdAt?: string;
};

export type AdminJockeyProfile = {
  jockeyId?: number;
  licenseNumber?: string;
  rankingPoints?: number;
  totalWins?: number;
  experienceYears?: number;
  status?: string;
};

export type AdminRefereeProfile = {
  refereeId?: number;
  licenseNumber?: string;
  address?: string;
  status?: string;
  createdAt?: string;
};

export type AdminUser = {
  userId: number | string;
  username: string;
  email: string;
  fullName: string;
  phone?: string;
  roleType?: UserRoleType;
  status: AdminUserStatus;
  avatarUrl?: string;
  createdAt?: string;
  updatedAt?: string;
  horseOwnerProfile?: AdminHorseOwnerProfile;
  ownerProfile?: AdminHorseOwnerProfile;
  jockeyProfile?: AdminJockeyProfile;
  refereeProfile?: AdminRefereeProfile;
};

export type AdminUserPage = {
  content: AdminUser[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
};

export type AdminRefereeOption = {
  refereeId: number;
  userId?: number | string;
  username: string;
  email?: string;
  fullName: string;
  status?: AdminUserStatus;
  licenseNumber?: string;
  address?: string;
  createdAt?: string;
  hasRefereeProfile: boolean;
};

export type AdminUserQueryParams = {
  roleType?: UserRoleType | 'All';
  status?: AdminUserStatus | 'All';
  keyword?: string;
  page?: number;
  size?: number;
  sort?: string;
};

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

export type AdminUpdateUserRequest = Omit<AdminCreateUserRequest, 'password' | 'roleType'>;

type RawRecord = Record<string, unknown>;

const asString = (value: unknown, fallback = '') => {
  if (value === null || value === undefined) {
    return fallback;
  }

  return String(value);
};

const asNumber = (value: unknown, fallback = 0) => {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : fallback;
};

const asPositiveNumber = (value: unknown): number | undefined => {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) && numericValue > 0 ? numericValue : undefined;
};

const isSameNumericValue = (first: unknown, second: unknown) => {
  const firstNumber = asPositiveNumber(first);
  const secondNumber = asPositiveNumber(second);

  return firstNumber !== undefined && secondNumber !== undefined && firstNumber === secondNumber;
};

const canUseRawIdAsRefereeId = (raw: RawRecord, userId: unknown, hasExplicitRefereeId: boolean) => {
  if (hasExplicitRefereeId || asPositiveNumber(raw.id) === undefined) {
    return false;
  }

  if (raw.roleType !== undefined || raw.role !== undefined || raw.roles !== undefined) {
    return false;
  }

  if ('refereeProfile' in raw) {
    return false;
  }

  const hasSeparateUserReference = userId !== undefined || raw.user !== undefined || raw.account !== undefined;
  const hasRefereeProfileShape =
    raw.licenseNumber !== undefined ||
    raw.refereeLicenseNumber !== undefined ||
    raw.refereeStatus !== undefined ||
    raw.address !== undefined ||
    raw.assignedRaceCount !== undefined ||
    raw.submittedReportCount !== undefined ||
    raw.pendingReportCount !== undefined;

  return (hasSeparateUserReference || hasRefereeProfileShape) && !isSameNumericValue(raw.id, userId);
};

const isUserLikeRecord = (raw: RawRecord, nestedUser?: RawRecord) =>
  Boolean(nestedUser) ||
  raw.userId !== undefined ||
  raw.refereeUserId !== undefined ||
  raw.accountId !== undefined ||
  raw.roleType !== undefined ||
  raw.role !== undefined ||
  raw.roles !== undefined ||
  raw.email !== undefined ||
  raw.phone !== undefined ||
  raw.refereeProfile !== undefined;

const getUserIdFromRecord = (raw: RawRecord, nestedUser?: RawRecord) =>
  raw.userId ??
  raw.refereeUserId ??
  nestedUser?.userId ??
  nestedUser?.id ??
  raw.accountId ??
  (isUserLikeRecord(raw, nestedUser) ? raw.id : undefined);

const normalizeStatus = (value: unknown): AdminUserStatus => {
  const normalizedValue = asString(value, 'active').trim().toLowerCase();

  if (normalizedValue === 'inactive' || normalizedValue === 'disabled' || normalizedValue === 'blocked') {
    return 'inactive';
  }

  if (normalizedValue === 'pending' || normalizedValue === 'unverified') {
    return 'pending';
  }

  return 'active';
};

const normalizeProfile = <T>(value: unknown): T | undefined => {
  if (!value || typeof value !== 'object') {
    return undefined;
  }

  return value as T;
};

const asRawRecord = (value: unknown): RawRecord | undefined => {
  if (!value || typeof value !== 'object') {
    return undefined;
  }

  return value as RawRecord;
};

const mapAdminUser = (raw: RawRecord, index = 0): AdminUser => {
  const horseOwnerProfile = normalizeProfile<AdminHorseOwnerProfile>(
    raw.horseOwnerProfile ?? raw.ownerProfile,
  );
  const rawRefereeProfile = asRawRecord(raw.refereeProfile);
  const directRefereeId = asPositiveNumber(
    raw.refereeId ??
      raw.refereeProfileId ??
      rawRefereeProfile?.refereeId ??
      rawRefereeProfile?.id,
  );
  const userId = raw.userId ?? raw.refereeUserId ?? raw.accountId;
  const inferredRefereeId = directRefereeId ??
    (canUseRawIdAsRefereeId(raw, userId, directRefereeId !== undefined) ? asPositiveNumber(raw.id) : undefined);
  const refereeProfile = normalizeProfile<AdminRefereeProfile>(raw.refereeProfile) ??
    (inferredRefereeId
      ? {
          refereeId: inferredRefereeId,
          licenseNumber: raw.licenseNumber === undefined || raw.licenseNumber === null ? undefined : asString(raw.licenseNumber),
          address: raw.address === undefined || raw.address === null ? undefined : asString(raw.address),
          status: raw.refereeStatus === undefined || raw.refereeStatus === null ? undefined : asString(raw.refereeStatus),
          createdAt: raw.createdAt === undefined || raw.createdAt === null ? undefined : asString(raw.createdAt),
        }
      : undefined);

  return {
    userId: (raw.userId ?? raw.refereeUserId ?? raw.id ?? raw.accountId ?? index + 1) as number | string,
    username: asString(raw.username ?? raw.refereeUsername, 'unknown-user'),
    email: asString(raw.email),
    fullName: asString(raw.fullName ?? raw.refereeFullName ?? raw.name ?? raw.username, 'Unknown User'),
    phone: raw.phone === undefined || raw.phone === null ? undefined : asString(raw.phone),
    roleType: normalizeRoleType(raw.roleType ?? raw.role),
    status: normalizeStatus(raw.status),
    avatarUrl: raw.avatarUrl === undefined || raw.avatarUrl === null ? undefined : asString(raw.avatarUrl),
    createdAt: raw.createdAt === undefined || raw.createdAt === null ? undefined : asString(raw.createdAt),
    updatedAt: raw.updatedAt === undefined || raw.updatedAt === null ? undefined : asString(raw.updatedAt),
    horseOwnerProfile,
    ownerProfile: horseOwnerProfile,
    jockeyProfile: normalizeProfile<AdminJockeyProfile>(raw.jockeyProfile),
    refereeProfile,
  };
};

const emptyPage = (page = 0, size = 10): AdminUserPage => ({
  content: [],
  totalElements: 0,
  totalPages: 0,
  number: page,
  size,
});

const normalizeUserPage = (data: unknown, params: AdminUserQueryParams = {}): AdminUserPage => {
  const requestedPage = params.page ?? 0;
  const requestedSize = params.size ?? 10;

  if (Array.isArray(data)) {
    return {
      content: data.map((item, index) => mapAdminUser(item as RawRecord, index)),
      totalElements: data.length,
      totalPages: data.length ? 1 : 0,
      number: requestedPage,
      size: requestedSize,
    };
  }

  if (!data || typeof data !== 'object') {
    return emptyPage(requestedPage, requestedSize);
  }

  const objectData = data as RawRecord;
  const rawContent = Array.isArray(objectData.content)
    ? objectData.content
    : Array.isArray(objectData.items)
      ? objectData.items
      : Array.isArray(objectData.data)
        ? objectData.data
        : [];
  const size = asNumber(objectData.size ?? objectData.pageSize, requestedSize);
  const totalElements = asNumber(objectData.totalElements ?? objectData.totalItems ?? objectData.total, rawContent.length);
  const totalPages = asNumber(
    objectData.totalPages ?? objectData.pages,
    size > 0 ? Math.ceil(totalElements / size) : 0,
  );

  return {
    content: rawContent.map((item, index) => mapAdminUser(item as RawRecord, index)),
    totalElements,
    totalPages,
    number: asNumber(objectData.number ?? objectData.page, requestedPage),
    size,
  };
};

const getRawList = (data: unknown): RawRecord[] => {
  if (Array.isArray(data)) {
    return data.map((item) => item as RawRecord);
  }

  if (!data || typeof data !== 'object') {
    return [];
  }

  const objectData = data as RawRecord;
  const listKeys = ['content', 'items', 'data', 'referees', 'users', 'results', 'list'];

  for (const key of listKeys) {
    if (Array.isArray(objectData[key])) {
      return (objectData[key] as unknown[]).map((item) => item as RawRecord);
    }
  }

  return [];
};

const mapRefereeOption = (raw: RawRecord): AdminRefereeOption => {
  const refereeProfile = asRawRecord(raw.refereeProfile ?? raw.profile);
  const user = asRawRecord(raw.user ?? raw.account);
  const userId = getUserIdFromRecord(raw, user);
  const explicitRefereeId = asPositiveNumber(
    raw.refereeId ??
      raw.refereeProfileId ??
      refereeProfile?.refereeId ??
      refereeProfile?.id,
  );
  const inferredRefereeId = canUseRawIdAsRefereeId(raw, userId, explicitRefereeId !== undefined)
    ? asPositiveNumber(raw.id)
    : undefined;
  const refereeId = explicitRefereeId ?? inferredRefereeId ??
    0;
  const username = asString(raw.username ?? raw.refereeUsername ?? user?.username, 'unknown-user');
  const email = asString(raw.email ?? user?.email);
  const fullName = asString(
    raw.fullName ?? raw.refereeFullName ?? raw.name ?? user?.fullName ?? user?.name ?? username,
    `Referee ${refereeId}`,
  );

  return {
    refereeId,
    userId: userId as number | string | undefined,
    username,
    email: email || undefined,
    fullName,
    status: normalizeStatus(raw.status ?? refereeProfile?.status),
    licenseNumber: asString(raw.licenseNumber ?? refereeProfile?.licenseNumber) || undefined,
    address: asString(raw.address ?? refereeProfile?.address) || undefined,
    createdAt: asString(raw.createdAt ?? refereeProfile?.createdAt) || undefined,
    hasRefereeProfile: refereeId > 0,
  };
};

const mergeRefereeProfileFromUser = (referee: AdminRefereeOption, user: AdminUser): AdminRefereeOption => {
  const refereeId = asPositiveNumber(user.refereeProfile?.refereeId) ?? referee.refereeId;

  return {
    ...referee,
    refereeId,
    userId: user.userId ?? referee.userId,
    username: user.username || referee.username,
    email: user.email || referee.email,
    fullName: user.fullName || referee.fullName,
    status: normalizeStatus(user.refereeProfile?.status ?? user.status ?? referee.status),
    licenseNumber: user.refereeProfile?.licenseNumber ?? referee.licenseNumber,
    address: user.refereeProfile?.address ?? referee.address,
    createdAt: user.refereeProfile?.createdAt ?? referee.createdAt,
    hasRefereeProfile: refereeId > 0,
  };
};

const enrichRefereeOption = async (referee: AdminRefereeOption): Promise<AdminRefereeOption> => {
  if (referee.hasRefereeProfile || !referee.userId) {
    return referee;
  }

  try {
    const response = await apiClient.get(`/api/admin/users/${referee.userId}`);
    return mergeRefereeProfileFromUser(referee, mapAdminUser(unwrapApiData<RawRecord>(response)));
  } catch {
    return referee;
  }
};

const cleanUserPayload = (data: AdminCreateUserRequest | AdminUpdateUserRequest) => ({
  username: data.username.trim(),
  email: data.email.trim(),
  ...('password' in data ? { password: data.password } : {}),
  fullName: data.fullName.trim(),
  phone: data.phone.trim(),
  ...('roleType' in data ? { roleType: data.roleType } : {}),
  licenseNumber: data.licenseNumber?.trim() || undefined,
  experienceYears: data.experienceYears === undefined || data.experienceYears === null
    ? undefined
    : Number(data.experienceYears),
  stableName: data.stableName?.trim() || undefined,
  address: data.address?.trim() || undefined,
});

export const adminUserService = {
  async getReferees(): Promise<AdminRefereeOption[]> {
    const response = await apiClient.get('/api/admin/users/referees');
    const referees = getRawList(unwrapApiData<unknown>(response)).map(mapRefereeOption);

    return Promise.all(referees.map(enrichRefereeOption));
  },

  async getUsers(params: AdminUserQueryParams = {}): Promise<AdminUserPage> {
    const response = await apiClient.get('/api/admin/users', {
      params: {
        roleType: params.roleType && params.roleType !== 'All' ? params.roleType : undefined,
        status: params.status && params.status !== 'All' ? params.status : undefined,
        keyword: params.keyword?.trim() || undefined,
        page: params.page ?? 0,
        size: params.size ?? 10,
        sort: params.sort,
      },
    });

    return normalizeUserPage(unwrapApiData<unknown>(response), params);
  },

  async getUserDetail(userId: number | string): Promise<AdminUser> {
    const response = await apiClient.get(`/api/admin/users/${userId}`);
    return mapAdminUser(unwrapApiData<RawRecord>(response));
  },

  async createUser(data: AdminCreateUserRequest): Promise<AdminUser> {
    const response = await apiClient.post('/api/admin/users/create', cleanUserPayload(data));
    return mapAdminUser(unwrapApiData<RawRecord>(response));
  },

  async updateUser(userId: number | string, data: AdminUpdateUserRequest): Promise<AdminUser> {
    const response = await apiClient.put(`/api/admin/users/${userId}`, cleanUserPayload(data));
    return mapAdminUser(unwrapApiData<RawRecord>(response));
  },

  async updateStatus(userId: number | string, status: Exclude<AdminUserStatus, 'pending'>): Promise<AdminUser> {
    const response = await apiClient.patch(`/api/admin/users/${userId}/status`, { status });
    return mapAdminUser(unwrapApiData<RawRecord>(response));
  },

  async resetPassword(userId: number | string, newPassword: string): Promise<unknown> {
    const response = await apiClient.patch(`/api/admin/users/${userId}/reset-password`, { newPassword });
    return unwrapApiData<unknown>(response);
  },
};
