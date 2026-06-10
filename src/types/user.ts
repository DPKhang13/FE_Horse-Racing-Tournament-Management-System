export interface UserWallet {
  balance: number;
  currency: string;
  lastTransactionDate?: string;
}

export interface UserProfile {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  address?: string;
  avatarUrl?: string;
  role: 'Guest' | 'User' | 'Admin';
  wallet?: UserWallet;
  joinedDate: string;
  status: 'Active' | 'Inactive' | 'Pending';
}
