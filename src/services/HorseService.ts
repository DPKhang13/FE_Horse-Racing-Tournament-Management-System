import { apiClient, unwrapApiData, unwrapApiList } from './apiClient';
import type { Horse, HorseCountResponse, HorseFormData, RankedHorse } from '../types/horse';

type RawHorse = Record<string, unknown>;
type RawHorseCount = Partial<HorseCountResponse> & {
  count?: number;
  total?: number;
};
type HorseUpdateData = Partial<Omit<HorseFormData, 'ownerId'>>;

const fallbackHorseImage =
  'https://picsum.photos/300/300?random=horse';

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

const mapHorse = (raw: RawHorse, index = 0): Horse => {
  const horseId = asNumber(raw.horseId ?? raw.id, index + 1);

  return {
    id: asNumber(raw.id ?? raw.horseId, horseId),
    horseId,
    ownerId: raw.ownerId === undefined ? undefined : asNumber(raw.ownerId),
    name: asString(raw.name ?? raw.horseName, 'Unnamed Horse'),
    breed: asString(raw.breed, '-'),
    age: asNumber(raw.age),
    weightKg: asNumber(raw.weightKg),
    rankGroup: asString(raw.rankGroup, '-'),
    rankingPoints: asNumber(raw.rankingPoints ?? raw.totalPoints),
    avatarUrl: asString(raw.avatarUrl, fallbackHorseImage),
    totalWins: asNumber(raw.totalWins),
    status: asString(raw.status, 'active'),
    registeredAt: raw.registeredAt ? asString(raw.registeredAt) : undefined,
    ownerFullName: raw.ownerFullName ? asString(raw.ownerFullName) : undefined,
    ownerEmail: raw.ownerEmail ? asString(raw.ownerEmail) : undefined,
    ownerPhone: raw.ownerPhone ? asString(raw.ownerPhone) : undefined,
    ownerStableName: raw.ownerStableName ? asString(raw.ownerStableName) : undefined,
    ownerLicenseNumber: raw.ownerLicenseNumber ? asString(raw.ownerLicenseNumber) : undefined,
  };
};

const mapRankedHorse = (raw: RawHorse, index: number): RankedHorse => ({
  ...mapHorse(raw, index),
  rank: asNumber(raw.rank, index + 1),
});

const toCreateHorsePayload = (horse: HorseFormData) => ({
  name: horse.name.trim(),
  breed: horse.breed.trim(),
  age: Number(horse.age),
  weightKg: Number(horse.weightKg),
  rankGroup: horse.rankGroup.trim(),
  avatarUrl: horse.avatarUrl.trim(),
});

const toUpdateHorsePayload = (horse: HorseUpdateData) => {
  const payload: Record<string, string | number> = {};

  if (horse.name !== undefined) {
    payload.name = horse.name.trim();
  }

  if (horse.breed !== undefined) {
    payload.breed = horse.breed.trim();
  }

  if (horse.age !== undefined) {
    payload.age = Number(horse.age);
  }

  if (horse.weightKg !== undefined) {
    payload.weightKg = Number(horse.weightKg);
  }

  if (horse.rankGroup !== undefined) {
    payload.rankGroup = horse.rankGroup.trim();
  }

  if (horse.avatarUrl !== undefined) {
    payload.avatarUrl = horse.avatarUrl.trim();
  }

  if (horse.rankingPoints !== undefined) {
    payload.rankingPoints = Number(horse.rankingPoints);
  }

  if (horse.totalWins !== undefined) {
    payload.totalWins = Number(horse.totalWins);
  }

  if (horse.status !== undefined) {
    payload.status = horse.status;
  }

  return payload;
};

export const horseService = {
  async getHorses(): Promise<Horse[]> {
    const response = await apiClient.get('/api/horses/get-all');
    return unwrapApiList<RawHorse>(response).map(mapHorse);
  },

  async getHorseCount(): Promise<number> {
    const response = await apiClient.get('/api/horses/get-horse-count');
    const data = unwrapApiData<RawHorseCount | number>(response);

    if (typeof data === 'number') {
      return asNumber(data);
    }

    return asNumber(data.horseCount ?? data.count ?? data.total);
  },

  async getRanking(): Promise<RankedHorse[]> {
    const response = await apiClient.get('/api/horses/ranking');
    return unwrapApiList<RawHorse>(response).map(mapRankedHorse);
  },

  async getHorseById(id: number | string): Promise<Horse> {
    const response = await apiClient.get(`/api/horses/get-by-id/${id}`);
    return mapHorse(unwrapApiData<RawHorse>(response));
  },

  async createHorse(horse: HorseFormData): Promise<Horse> {
    const response = await apiClient.post('/api/horses/create', toCreateHorsePayload(horse));
    return mapHorse(unwrapApiData<RawHorse>(response));
  },

  async createHorseForOwner(ownerId: number | string, horse: HorseFormData): Promise<Horse> {
    const response = await apiClient.post(`/api/horses/admin/owners/${ownerId}/create`, toCreateHorsePayload(horse));
    return mapHorse(unwrapApiData<RawHorse>(response));
  },

  async updateHorse(id: number | string, horse: HorseUpdateData): Promise<Horse> {
    const response = await apiClient.put(`/api/horses/update/${id}`, toUpdateHorsePayload(horse));
    return mapHorse(unwrapApiData<RawHorse>(response));
  },

  async deleteHorse(id: number | string): Promise<Horse> {
    return this.updateHorse(id, { status: 'deleted' });
  },
};

export const HorseService = horseService;
