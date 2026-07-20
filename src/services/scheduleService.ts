import { apiClient, unwrapApiList } from './apiClient';

export type TournamentApiItem = {
  tournamentId?: number;
  id?: number;
  name?: string;
  location?: string;
  startDate?: string;
  endDate?: string;
  registrationOpenAt?: string;
  registrationCloseAt?: string;
  prizePool?: number;
  status?: string;
};

export type RaceScheduleItem = {
  raceId: number;
  tournamentId: number;
  scheduleId?: number;
  tournamentName: string;
  location: string;
  raceName: string;
  raceNumber: number;
  rankGroup: string;
  scheduleTitle?: string;
  dayNumber?: number;
  lapCount: number;
  scheduledAt: string;
  predictionClosesAt?: string;
  distanceM: number;
  trackType: string;
  maxHorses: number;
  maxReferees?: number;
  registeredHorseCount: number;
  acceptedJockeyCount?: number;
  assignedRefereeCount?: number;
  status: string;
  prizePool?: number;
};

export type RaceParticipantItem = {
  assignmentId: number;
  registrationId: number;
  raceId: number;
  horseId: number;
  horseName: string;
  horseAvatarUrl?: string;
  jockeyId: number;
  jockeyName: string;
  jockeyAvatarUrl?: string;
  gateNumber: number;
  stableName: string;
  status: string;
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
    scheduleId: raw.scheduleId === undefined ? undefined : asNumber(raw.scheduleId),
    tournamentName: asString(raw.tournamentName ?? tournament.name, 'Tournament'),
    location: asString(raw.location ?? tournament.location, '-'),
    raceName: asString(raw.name ?? raw.raceName, 'Race'),
    raceNumber: asNumber(raw.raceNumber),
    rankGroup: asString(raw.rankGroup, '-'),
    scheduleTitle: raw.scheduleTitle ? asString(raw.scheduleTitle) : undefined,
    dayNumber: raw.dayNumber === undefined ? undefined : asNumber(raw.dayNumber),
    lapCount: asNumber(raw.lapCount),
    scheduledAt: asString(raw.scheduledAt ?? raw.raceDate ?? tournament.startDate, new Date().toISOString()),
    predictionClosesAt: raw.predictionClosesAt ? asString(raw.predictionClosesAt) : undefined,
    distanceM: asNumber(raw.distanceM),
    trackType: asString(raw.trackType, '-'),
    maxHorses: asNumber(raw.maxHorses),
    maxReferees: raw.maxReferees === undefined ? undefined : asNumber(raw.maxReferees),
    registeredHorseCount: asNumber(raw.registeredHorseCount),
    acceptedJockeyCount: raw.acceptedJockeyCount === undefined ? undefined : asNumber(raw.acceptedJockeyCount),
    assignedRefereeCount: raw.assignedRefereeCount === undefined ? undefined : asNumber(raw.assignedRefereeCount),
    status: asString(raw.status, '-'),
    prizePool: tournament.prizePool,
  };
};

const mapRaceParticipant = (raw: RawRace): RaceParticipantItem => ({
  assignmentId: asNumber(raw.assignmentId),
  registrationId: asNumber(raw.regId ?? raw.registrationId),
  raceId: asNumber(raw.raceId),
  horseId: asNumber(raw.horseId),
  horseName: asString(raw.horseName, 'Unknown horse'),
  horseAvatarUrl: raw.horseAvatarUrl ? asString(raw.horseAvatarUrl) : undefined,
  jockeyId: asNumber(raw.jockeyId),
  jockeyName: asString(raw.jockeyFullName ?? raw.jockeyName, 'Unknown jockey'),
  jockeyAvatarUrl: raw.jockeyAvatarUrl ? asString(raw.jockeyAvatarUrl) : undefined,
  gateNumber: asNumber(raw.gateNumber),
  stableName: asString(raw.ownerStableName, '-'),
  status: asString(raw.status, 'confirmed'),
});

export const scheduleService = {
  async getTournaments(status?: string): Promise<TournamentApiItem[]> {
    const response = await apiClient.get('/api/tournaments/get-tournament-list', {
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

        const response = await apiClient.get(`/api/tournaments/${tournamentId}/get-race-list`);
        return unwrapApiList<RawRace>(response).map((race) => mapRace(race, tournament));
      }),
    );

    return raceGroups.flat().sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
  },

  async getRaceParticipants(raceId: number): Promise<RaceParticipantItem[]> {
    const response = await apiClient.get(`/api/races/${raceId}/participants`);

    return unwrapApiList<RawRace>(response)
      .map(mapRaceParticipant)
      .sort((first, second) => {
        const firstGate = first.gateNumber || Number.MAX_SAFE_INTEGER;
        const secondGate = second.gateNumber || Number.MAX_SAFE_INTEGER;
        return firstGate - secondGate;
      });
  },

  formatCurrency,
};
