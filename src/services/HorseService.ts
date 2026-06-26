import { apiClient, unwrapApiData, unwrapApiList } from './apiClient';
import type { Horse, HorseFormData } from '../types/horse';

type RawHorse = Partial<Horse> & {
  id?: number;
};

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

const mapHorse = (raw: RawHorse): Horse => {
  const horseId = asNumber(raw.horseId ?? raw.id);

  return {
    id: horseId ? `HRS-${horseId}` : asString(raw.name, 'HRS-NEW'),
    horseId,
    ownerId: raw.ownerId,
    name: asString(raw.name, 'Unnamed Horse'),
    breed: asString(raw.breed, '-'),
    age: asNumber(raw.age),
    weightKg: asNumber(raw.weightKg),
    rankGroup: asString(raw.rankGroup, '-'),
    rankingPoints: asNumber(raw.rankingPoints),
    avatarUrl: asString(raw.avatarUrl, fallbackHorseImage),
    totalWins: asNumber(raw.totalWins),
    status: asString(raw.status, 'active'),
    registeredAt: raw.registeredAt,
    ownerFullName: raw.ownerFullName,
    ownerEmail: raw.ownerEmail,
    ownerPhone: raw.ownerPhone,
    ownerStableName: raw.ownerStableName,
    ownerLicenseNumber: raw.ownerLicenseNumber,
  };
};

const toPayload = (horse: HorseFormData) => ({
  name: horse.name.trim(),
  breed: horse.breed.trim(),
  age: Number(horse.age),
  weightKg: Number(horse.weightKg),
  rankGroup: horse.rankGroup.trim(),
  avatarUrl: horse.avatarUrl.trim(),
});

const toUpdatePayload = (horse: HorseFormData) => ({
  name: horse.name.trim(),
  breed: horse.breed.trim(),
  age: Number(horse.age),
  weightKg: Number(horse.weightKg),
  rankGroup: horse.rankGroup.trim(),
  rankingPoints: Number(horse.rankingPoints),
  avatarUrl: horse.avatarUrl.trim(),
  totalWins: Number(horse.totalWins),
  status: horse.status,
});

export const HorseService = {
  async getHorses(): Promise<Horse[]> {
    const response = await apiClient.get('/api/horses/get-all');
    return unwrapApiList<RawHorse>(response).map(mapHorse);
  },

  async getHorseById(id: number): Promise<Horse> {
    const response = await apiClient.get(`/api/horses/get-by-id/${id}`);
    return mapHorse(unwrapApiData<RawHorse>(response));
  },

  async createHorse(horse: HorseFormData): Promise<Horse> {
    const response = await apiClient.post('/api/horses/create', toPayload(horse));
    return mapHorse(unwrapApiData<RawHorse>(response));
  },

  async updateHorse(id: number, horse: HorseFormData): Promise<Horse> {
    const response = await apiClient.put(`/api/horses/update/${id}`, toUpdatePayload(horse));
    return mapHorse(unwrapApiData<RawHorse>(response));
  },

  async deleteHorse(id: number): Promise<void> {
    await apiClient.delete(`/api/horses/delete/${id}`);
  },
};
