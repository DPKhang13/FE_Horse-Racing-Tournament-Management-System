import type { UserRoleType } from '../types/user';

export const AUTHENTICATED_ROLES: UserRoleType[] = [
  'admin',
  'horse_owner',
  'jockey',
  'race_referee',
  'spectator',
];

export const normalizeRoleType = (roleType: unknown): UserRoleType | undefined => {
  if (!roleType) {
    return undefined;
  }

  const value = String(roleType).trim().toLowerCase();
  const normalizedValue = value.startsWith('role_') ? value.replace(/^role_/, '') : value;

  if (normalizedValue === 'admin') {
    return 'admin';
  }

  if (normalizedValue === 'horse_owner') {
    return 'horse_owner';
  }

  if (normalizedValue === 'jockey') {
    return 'jockey';
  }

  if (normalizedValue === 'race_referee') {
    return 'race_referee';
  }

  if (normalizedValue === 'spectator') {
    return 'spectator';
  }

  return undefined;
};

export const roleLabels: Record<UserRoleType, string> = {
  admin: 'Admin',
  horse_owner: 'Horse Owner',
  jockey: 'Jockey',
  race_referee: 'Race Referee',
  spectator: 'Spectator',
};
export const formatRefereeRoleLabel = (value: unknown, fallback = 'Referee') => {
  if (value === null || value === undefined || String(value).trim() === '') {
    return fallback;
  }

  return String(value).trim().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase());
};


export const canAccessRole = (roleType: UserRoleType | undefined, allowedRoles?: UserRoleType[]) => {
  if (!allowedRoles || allowedRoles.length === 0) {
    return Boolean(roleType);
  }

  return Boolean(roleType && allowedRoles.includes(roleType));
};

export const getDefaultRouteForRole = (roleType: UserRoleType | undefined) => {
  switch (roleType) {
    case 'horse_owner':
      return '/owner-dashboard';
    case 'spectator':
      return '/';
    case 'admin':
      return '/admin-ops';
    case 'race_referee':
      return '/referee-dashboard';
    case 'jockey':
      return '/jockey-dashboard';
    default:
      return '/login';
  }
};

export type NavigationItem = {
  label: string;
  to: string;
  allowedRoles?: UserRoleType[];
  requiresAuth?: boolean;
};

export const navigationItems: NavigationItem[] = [
  { label: 'Home', to: '/' },
  { label: 'Dashboard', to: '/spectator-dashboard', allowedRoles: ['spectator'], requiresAuth: true },
  { label: 'Dashboard', to: '/admin-ops', allowedRoles: ['admin'], requiresAuth: true },
  { label: 'Dashboard', to: '/referee-dashboard', allowedRoles: ['race_referee'], requiresAuth: true },
  { label: 'Users', to: '/admin/users', allowedRoles: ['admin'], requiresAuth: true },
  { label: 'Dashboard', to: '/owner-dashboard', allowedRoles: ['horse_owner'], requiresAuth: true },
  { label: 'Dashboard', to: '/jockey-dashboard', allowedRoles: ['jockey'], requiresAuth: true },
  { label: 'Tournaments', to: '/tournaments', allowedRoles: ['admin'], requiresAuth: true },
  { label: 'Schedule', to: '/admin/schedule', allowedRoles: ['admin'], requiresAuth: true },
  { label: 'Races', to: '/admin/races', allowedRoles: ['admin'], requiresAuth: true },
  { label: 'Bet Management', to: '/admin/bets', allowedRoles: ['admin'], requiresAuth: true },
  { label: 'Horses', to: '/admin/horses', allowedRoles: ['admin'], requiresAuth: true },
  { label: 'Race Registrations', to: '/admin/registrations', allowedRoles: ['admin'], requiresAuth: true },
  { label: 'Race Control', to: '/race-control', allowedRoles: ['admin', 'race_referee'], requiresAuth: true },
  { label: 'Schedule', to: '/schedule', allowedRoles: ['horse_owner'], requiresAuth: true },
  { label: 'Registrations', to: '/registrations', allowedRoles: ['horse_owner'], requiresAuth: true },
  { label: 'Invitations', to: '/owner/invitations', allowedRoles: ['horse_owner'], requiresAuth: true },
  { label: 'Schedule', to: '/jockey/schedule', allowedRoles: ['jockey'], requiresAuth: true },
  { label: 'Invitations', to: '/jockey/invitations', allowedRoles: ['jockey'], requiresAuth: true },
  { label: 'Prediction', to: '/prediction', allowedRoles: ['spectator'], requiresAuth: true },
  { label: 'Wallet', to: '/wallet', allowedRoles: ['spectator'], requiresAuth: true },
  { label: 'Results', to: '/results', allowedRoles: AUTHENTICATED_ROLES, requiresAuth: true },
  { label: 'Horses', to: '/horses', allowedRoles: ['horse_owner'], requiresAuth: true },
  { label: 'Tracking', to: '/tracking', allowedRoles: ['spectator'], requiresAuth: true },
  { label: 'Notifications', to: '/notifications', allowedRoles: AUTHENTICATED_ROLES, requiresAuth: true },
];
