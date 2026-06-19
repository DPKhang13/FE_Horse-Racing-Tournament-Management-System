export type HorseStatus = 'active' | 'inactive' | 'deleted' | string;

export type Horse = {
  id: string;
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

export type HorseFormData = {
  name: string;
  breed: string;
  age: number;
  weightKg: number;
  rankGroup: string;
  rankingPoints: number;
  avatarUrl: string;
  totalWins: number;
  status: HorseStatus;
};
