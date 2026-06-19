import { apiClient, unwrapApiList } from './apiClient';

export type TournamentApiItem = {
  tournamentId?: number;
  id?: number;
  name?: string;
  location?: string;
  startDate?: string;
  endDate?: string;
  prizePool?: number;
  status?: string;
};

export type RaceScheduleItem = {
  raceId: number;
  tournamentId: number;
  tournamentName: string;
  location: string;
  raceName: string;
  raceNumber: number;
  rankGroup: string;
  lapCount: number;
  scheduledAt: string;
  predictionClosesAt?: string;
  distanceM: number;
  trackType: string;
  maxHorses: number;
  registeredHorseCount: number;
  status: string;
  prizePool?: number;
};

type RawRace = Record<string, unknown>;

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

const formatCurrency = (value: unknown) => {
  const amount = Number(value);

  if (!Number.isFinite(amount) || amount === 0) {
    return '-';
  }

  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(amount);
};

const mapRace = (raw: RawRace, tournament: TournamentApiItem): RaceScheduleItem => {
  const tournamentId = asNumber(raw.tournamentId ?? tournament.tournamentId ?? tournament.id);

  return {
    raceId: asNumber(raw.raceId ?? raw.id),
    tournamentId,
    tournamentName: asString(raw.tournamentName ?? tournament.name, 'Tournament'),
    location: asString(raw.location ?? tournament.location, '-'),
    raceName: asString(raw.name ?? raw.raceName, 'Race'),
    raceNumber: asNumber(raw.raceNumber),
    rankGroup: asString(raw.rankGroup, '-'),
    lapCount: asNumber(raw.lapCount),
    scheduledAt: asString(raw.scheduledAt ?? raw.raceDate ?? tournament.startDate, new Date().toISOString()),
    predictionClosesAt: raw.predictionClosesAt ? asString(raw.predictionClosesAt) : undefined,
    distanceM: asNumber(raw.distanceM),
    trackType: asString(raw.trackType, '-'),
    maxHorses: asNumber(raw.maxHorses),
    registeredHorseCount: asNumber(raw.registeredHorseCount),
    status: asString(raw.status, '-'),
    prizePool: tournament.prizePool,
  };
};

export const scheduleService = {
  async getTournaments(status?: string): Promise<TournamentApiItem[]> {
    const response = await apiClient.get('/api/tournaments/getAll', {
      params: status ? { status } : undefined,
    });
    return unwrapApiList<TournamentApiItem>(response);
  },

  async getRaceSchedule(): Promise<RaceScheduleItem[]> {
    const tournaments = await this.getTournaments();
    const raceGroups = await Promise.all(
      tournaments.map(async (tournament) => {
        const tournamentId = tournament.tournamentId ?? tournament.id;

        if (!tournamentId) {
          return [];
        }

        const response = await apiClient.get(`/api/races/get-by-tournament/${tournamentId}`);
        return unwrapApiList<RawRace>(response).map((race) => mapRace(race, tournament));
      }),
    );

    return raceGroups.flat().sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
  },

  formatCurrency,
};
