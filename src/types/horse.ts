export type HorseStatus = 'active' | 'inactive' | 'deleted' | string;

export type Horse = {
  id: number;
  horseId: number;
  ownerId?: number;
  name: string;
  breed: string;
  age: number;
  weightKg: number;
  rankGroup: string;
  rankingPoints: number;
  avatarUrl: string;
  totalWins: number;
  status: HorseStatus;
  registeredAt?: string;
  ownerFullName?: string;
  ownerEmail?: string;
  ownerPhone?: string;
  ownerStableName?: string;
  ownerLicenseNumber?: string;
};

export type RankedHorse = Horse & {
  rank: number;
};

export type HorseFormData = {
  ownerId: number | '';
  name: string;
  breed: string;
  age: number;
  weightKg: number;
  rankGroup: string;
  avatarUrl: string;
  rankingPoints?: number;
  totalWins?: number;
  status?: HorseStatus;
};

export type HorseCountResponse = {
  horseCount: number;
};
