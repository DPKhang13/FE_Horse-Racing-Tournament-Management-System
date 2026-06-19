export interface UserWallet {
  balance: number;
  currency: string;
  lastTransactionDate?: string;
}

export type UserRoleType = 'admin' | 'horse_owner' | 'jockey' | 'race_referee' | 'spectator';

export interface UserProfile {
  id: string;
  userId?: number;
  username?: string;
  fullName: string;
  email: string;
  phone?: string;
  address?: string;
  avatarUrl?: string;
  role: 'Guest' | 'User' | 'Admin';
  roleType?: UserRoleType;
  wallet?: UserWallet;
  joinedDate: string;
  createdAt?: string;
  status: 'Active' | 'Inactive' | 'Pending';
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
}
