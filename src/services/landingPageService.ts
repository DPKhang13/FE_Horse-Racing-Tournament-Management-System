import axios from 'axios';
import { API_BASE_URL, apiClient, getAccessToken, unwrapApiList } from './apiClient';

const landingApiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

type RawRecord = Record<string, unknown>;

export type LandingTournamentStatus =
  | 'Upcoming'
  | 'Registration Open'
  | 'Registration Closed'
  | 'Ongoing'
  | 'Completed'
  | 'Cancelled';

export type LandingTournament = {
  tournamentId: number;
  id: string;
  tournamentName: string;
  location: string;
  startDate: string;
  endDate: string;
  prizePool: number;
  prizePoolLabel: string;
  status: LandingTournamentStatus;
  registrationOpenAt?: string;
  registrationCloseAt?: string;
  createdByFullName?: string;
};

export type LandingHorseRanking = {
  rank: number;
  horseId: number;
  name: string;
  avatarUrl: string;
  totalWins: number;
  rankingPoints: number;
  totalRaces: number;
  ownerFullName?: string;
};

export type LandingJockeyRanking = {
  rank: number;
  jockeyId: number;
  fullName: string;
  avatarUrl: string;
  totalWins: number;
  totalRaces: number;
  winRate: number;
  rankingPoints: number;
};

const fallbackHorseImage = 'https://picsum.photos/200/200?random=landing-horse';
const fallbackJockeyImage = 'https://picsum.photos/200/200?random=landing-jockey';

const fallbackTournaments: LandingTournament[] = [
  {
    tournamentId: 1,
    id: 'T-001',
    tournamentName: 'Saigon Summer Derby',
    location: 'Ho Chi Minh City Grand Track',
    startDate: '2026-07-10',
    endDate: '2026-07-12',
    prizePool: 450000000,
    prizePoolLabel: '450.000.000 VND',
    status: 'Upcoming',
    registrationOpenAt: '2026-06-20T09:00:00.000Z',
    registrationCloseAt: '2026-07-01T09:00:00.000Z',
    createdByFullName: 'HTMS Admin',
  },
  {
    tournamentId: 2,
    id: 'T-002',
    tournamentName: 'Central Highlands Cup',
    location: 'Da Lat Highland Course',
    startDate: '2026-06-20',
    endDate: '2026-06-23',
    prizePool: 300000000,
    prizePoolLabel: '300.000.000 VND',
    status: 'Ongoing',
    registrationOpenAt: '2026-06-01T09:00:00.000Z',
    registrationCloseAt: '2026-06-12T09:00:00.000Z',
    createdByFullName: 'HTMS Admin',
  },
  {
    tournamentId: 3,
    id: 'T-003',
    tournamentName: 'Mekong Classic',
    location: 'Can Tho Riverside Arena',
    startDate: '2026-05-14',
    endDate: '2026-05-16',
    prizePool: 280000000,
    prizePoolLabel: '280.000.000 VND',
    status: 'Completed',
    registrationOpenAt: '2026-04-20T09:00:00.000Z',
    registrationCloseAt: '2026-05-01T09:00:00.000Z',
    createdByFullName: 'HTMS Admin',
  },
  {
    tournamentId: 4,
    id: 'T-004',
    tournamentName: 'Northern Sprint Invitational',
    location: 'Ha Noi Capital Track',
    startDate: '2026-08-05',
    endDate: '2026-08-06',
    prizePool: 520000000,
    prizePoolLabel: '520.000.000 VND',
    status: 'Upcoming',
    registrationOpenAt: '2026-07-10T09:00:00.000Z',
    registrationCloseAt: '2026-07-20T09:00:00.000Z',
    createdByFullName: 'HTMS Admin',
  },
];

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

const toIsoString = (value: unknown) => {
  const text = asString(value);

  if (!text) {
    return undefined;
  }

  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? text : date.toISOString();
};

const formatCurrency = (value: unknown) =>
  new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(asNumber(value));

const normalizeTournamentStatus = (value: unknown): LandingTournamentStatus => {
  const normalizedValue = asString(value, 'Upcoming').trim().toLowerCase().replace(/[_-]+/g, ' ');

  if (normalizedValue.includes('registration') && normalizedValue.includes('open')) {
    return 'Registration Open';
  }

  if (normalizedValue.includes('registration') && normalizedValue.includes('closed')) {
    return 'Registration Closed';
  }

  if (normalizedValue.includes('ongoing') || normalizedValue.includes('progress') || normalizedValue === 'active') {
    return 'Ongoing';
  }

  if (normalizedValue.includes('complete') || normalizedValue.includes('finish')) {
    return 'Completed';
  }

  if (normalizedValue.includes('cancel')) {
    return 'Cancelled';
  }

  return 'Upcoming';
};

const mapTournament = (item: RawRecord, index: number): LandingTournament => {
  const tournamentId = asNumber(item.tournamentId ?? item.id, index + 1);

  return {
    tournamentId,
    id: `T-${String(tournamentId).padStart(3, '0')}`,
    tournamentName: asString(item.name ?? item.tournamentName, `Tournament ${tournamentId}`),
    location: asString(item.location, 'To be announced'),
    startDate: asString(item.startDate),
    endDate: asString(item.endDate),
    prizePool: asNumber(item.prizePool),
    prizePoolLabel: formatCurrency(item.prizePool),
    status: normalizeTournamentStatus(item.status),
    registrationOpenAt: toIsoString(item.registrationOpenAt),
    registrationCloseAt: toIsoString(item.registrationCloseAt),
    createdByFullName: asString(item.createdByFullName) || undefined,
  };
};

const mapHorseRanking = (item: RawRecord, index: number): LandingHorseRanking => ({
  rank: asNumber(item.rank, index + 1),
  horseId: asNumber(item.horseId ?? item.id, index + 1),
  name: asString(item.name, `Horse ${index + 1}`),
  avatarUrl: asString(item.avatarUrl, fallbackHorseImage),
  totalWins: asNumber(item.totalWins),
  rankingPoints: asNumber(item.rankingPoints),
  totalRaces: asNumber(item.totalRaces),
  ownerFullName: asString(item.ownerFullName) || undefined,
});

const mapJockeyRanking = (item: RawRecord, index: number): LandingJockeyRanking => ({
  rank: asNumber(item.rank, index + 1),
  jockeyId: asNumber(item.jockeyId ?? item.id, index + 1),
  fullName: asString(item.fullName ?? item.username, `Jockey ${index + 1}`),
  avatarUrl: asString(item.avatarUrl, fallbackJockeyImage),
  totalWins: asNumber(item.totalWins),
  totalRaces: asNumber(item.totalRaces),
  winRate: asNumber(item.winRate),
  rankingPoints: asNumber(item.rankingPoints),
});

export const landingPageService = {
  async getPublicTournamentList(): Promise<LandingTournament[]> {
    if (!getAccessToken()) {
      return fallbackTournaments;
    }

    try {
      const response = await apiClient.get('/api/tournaments/get-tournament-list');
      return unwrapApiList<RawRecord>(response).map(mapTournament);
    } catch {
      return fallbackTournaments;
    }
  },

  async getHorseRanking(): Promise<LandingHorseRanking[]> {
    const response = await landingApiClient.get('/api/horses/ranking');
    return unwrapApiList<RawRecord>(response).map(mapHorseRanking);
  },

  async getJockeyRanking(): Promise<LandingJockeyRanking[]> {
    const response = await landingApiClient.get('/api/jockeys/ranking');
    return unwrapApiList<RawRecord>(response).map(mapJockeyRanking);
  },

  async getLandingPageData(): Promise<{
    tournaments: LandingTournament[];
    horses: LandingHorseRanking[];
    jockeys: LandingJockeyRanking[];
  }> {
    const [tournaments, horses, jockeys] = await Promise.all([
      this.getPublicTournamentList(),
      this.getHorseRanking(),
      this.getJockeyRanking(),
    ]);

    return {
      tournaments,
      horses,
      jockeys,
    };
  },
};
