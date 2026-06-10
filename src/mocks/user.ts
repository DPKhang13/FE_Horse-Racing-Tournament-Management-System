import type { UserProfile } from '../types/user';

export const mockUser: UserProfile = {
  id: 'usr_123456',
  fullName: 'Alexander Sterling',
  email: 'a.sterling@equine-elite.com',
  phone: '+1 (555) 012-3456',
  address: '123 Racing Way, Lexington, KY 40502',
  avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=200',
  role: 'User',
  wallet: {
    balance: 12550.75,
    currency: 'USD',
    lastTransactionDate: '2026-06-09T14:30:00Z',
  },
  joinedDate: '2025-01-15',
  status: 'Active',
};

export const guestUser: UserProfile = {
  id: 'guest',
  fullName: 'Guest',
  email: '',
  role: 'Guest',
  joinedDate: new Date().toISOString(),
  status: 'Active',
};
