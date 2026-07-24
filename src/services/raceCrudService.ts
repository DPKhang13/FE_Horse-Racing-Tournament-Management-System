import { apiClient, unwrapApiData, unwrapApiList } from './apiClient';
import { tournamentService } from './tournamentService';
import type { MatchStatus, TournamentMatch } from '../types/tournament';

export type RaceCrudItem = {
  raceId: number;
  tournamentId?: number;
  tournamentName?: string;
  scheduleId?: number;
  scheduleTitle?: string;
  dayNumber?: number;
  name: string;
  raceNumber: number;
  rankGroup: string;
  lapCount: number;
  scheduledAt: string;
  predictionClosesAt?: string;
  distanceM: number;
  trackType: string;
  maxHorses: number;
  maxReferees: number;
  status: string;
  location?: string;
  registeredHorseCount?: number;
  acceptedJockeyCount?: number;
  assignedRefereeCount?: number;
};

export type RaceFormData = {
  scheduleId?: number;
  name: string;
  raceNumber: number;
  rankGroup: string;
  lapCount: number;
  scheduledAt: string;
  predictionClosesAt?: string;
  distanceM: number;
  trackType: string;
  maxHorses: number;
  maxReferees: number;
  status: string;
};

export type RaceScheduleOption = {
  scheduleId: number;
  raceDate: string;
  dayNumber: number;
  title: string;
};

export type RaceRoundItem = {
  roundId: number;
  raceId: number;
  assignmentId?: number;
  horseId?: number;
  horseName?: string;
  jockeyFullName?: string;
  roundNumber: number;
  position?: number;
  lapTimeSec: number;
  recordedAt?: string;
};


type RawRecord = Record<string, unknown>;

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

const toDateTimeLocal = (date: string, time: string) => {
  if (!date) {
    return '';
  }

  return `${date}T${time || '09:00'}`;
};

const toScheduledAtValue = (value: unknown) => {
  const text = asString(value);

  if (!text) {
    return '';
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    return `${text}T09:00`;
  }

  return text;
};

const toApiInstant = (value?: string) => {
  const text = value?.trim();

  if (!text) {
    return undefined;
  }

  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
};

const normalizeRaceStatus = (value: unknown): MatchStatus => {
  const text = asString(value, 'Scheduled').toLowerCase();

  if (text.includes('ongoing') || text === 'live') {
    return 'Ongoing';
  }

  if (text.includes('finish') || text.includes('complete')) {
    return 'Finished';
  }

  if (text.includes('cancel')) {
    return 'Cancelled';
  }

  return 'Scheduled';
};

const mapRace = (raw: RawRecord, index = 0): RaceCrudItem => ({
  raceId: asNumber(raw.raceId ?? raw.id, index + 1),
  tournamentId: raw.tournamentId === undefined ? undefined : asNumber(raw.tournamentId),
  tournamentName: raw.tournamentName ? asString(raw.tournamentName) : undefined,
  scheduleId: raw.scheduleId === undefined ? undefined : asNumber(raw.scheduleId),
  scheduleTitle: raw.scheduleTitle || raw.scheduleName ? asString(raw.scheduleTitle ?? raw.scheduleName) : undefined,
  dayNumber: raw.dayNumber === undefined && raw.day === undefined ? undefined : asNumber(raw.dayNumber ?? raw.day),
  name: asString(raw.name ?? raw.raceName ?? raw.matchName, `Race ${index + 1}`),
  raceNumber: asNumber(raw.raceNumber ?? raw.matchNumber, index + 1),
  rankGroup: asString(raw.rankGroup ?? raw.round, '-'),
  lapCount: asNumber(raw.lapCount, 1),
  scheduledAt: toScheduledAtValue(raw.scheduledAt ?? raw.raceDate ?? raw.matchDate),
  predictionClosesAt: raw.predictionClosesAt ? asString(raw.predictionClosesAt) : undefined,
  distanceM: asNumber(raw.distanceM),
  trackType: asString(raw.trackType ?? raw.arenaLocation ?? raw.location, '-'),
  maxHorses: asNumber(raw.maxHorses, 8),
  maxReferees: asNumber(raw.maxReferees, 3),
  status: asString(raw.status ?? raw.matchStatus, 'scheduled'),
  location: raw.location ? asString(raw.location) : undefined,
  registeredHorseCount: raw.registeredHorseCount === undefined ? undefined : asNumber(raw.registeredHorseCount),
  acceptedJockeyCount: raw.acceptedJockeyCount === undefined ? undefined : asNumber(raw.acceptedJockeyCount),
  assignedRefereeCount: raw.assignedRefereeCount === undefined ? undefined : asNumber(raw.assignedRefereeCount),
});


const mapScheduleOption = (raw: RawRecord, index = 0): RaceScheduleOption => ({
  scheduleId: asNumber(raw.scheduleId ?? raw.id, index + 1),
  raceDate: asString(raw.raceDate ?? raw.scheduleDate ?? raw.date),
  dayNumber: asNumber(raw.dayNumber ?? raw.day, index + 1),
  title: asString(raw.title ?? raw.scheduleTitle ?? raw.name, `Day ${index + 1}`),
});

const toRacePayload = (data: RaceFormData) => ({
  name: data.name.trim(),
  raceNumber: Number(data.raceNumber),
  rankGroup: data.rankGroup.trim(),
  lapCount: Number(data.lapCount),
  scheduledAt: toApiInstant(data.scheduledAt),
  predictionClosesAt: toApiInstant(data.predictionClosesAt),
  distanceM: Number(data.distanceM),
  trackType: data.trackType.trim(),
  maxHorses: Number(data.maxHorses),
  maxReferees: Number(data.maxReferees),
  status: data.status.trim(),
});


const mockRacesByTournament = new Map<string, RaceCrudItem[]>();

const resolveScheduleId = async (tournamentId: number | string, scheduleId?: number) => {
  if (scheduleId) {
    return scheduleId;
  }

  const response = await apiClient.get(`/api/v1/admin/tournaments/${tournamentId}/get-schedule-list`);
  const schedules = unwrapApiList<RawRecord>(response);
  const resolvedScheduleId = asNumber(schedules[0]?.scheduleId ?? schedules[0]?.id);

  if (!resolvedScheduleId) {
    throw new Error('No schedule found for this tournament. Create a schedule before adding races.');
  }

  return resolvedScheduleId;
};

const getScheduleOptions = async (tournamentId: number | string): Promise<RaceScheduleOption[]> => {
  try {
    const response = await apiClient.get(`/api/v1/admin/tournaments/${tournamentId}/get-schedule-list`);
    return unwrapApiList<RawRecord>(response)
      .map(mapScheduleOption)
      .filter((schedule) => schedule.scheduleId > 0)
      .sort((first, second) => first.raceDate.localeCompare(second.raceDate) || first.dayNumber - second.dayNumber);
  } catch {
    const tournament = await tournamentService.getTournamentById(tournamentId);
    return tournament.schedule
      .map((schedule, index) => mapScheduleOption({
        scheduleId: schedule.matchId.replace(/\D/g, ''),
        raceDate: schedule.matchDate,
        dayNumber: index + 1,
        title: schedule.round || schedule.matchName,
      }, index))
      .filter((schedule) => schedule.scheduleId > 0);
  }
};

const raceFromMatch = (match: TournamentMatch, tournamentId: number | string, index: number): RaceCrudItem => ({
  raceId: asNumber(match.matchId.replace(/\D/g, ''), index + 1),
  tournamentId: Number(tournamentId),
  name: match.matchName,
  raceNumber: index + 1,
  rankGroup: match.round,
  lapCount: 1,
  scheduledAt: toDateTimeLocal(match.matchDate, match.startTime),
  distanceM: 0,
  trackType: match.arenaLocation,
  maxHorses: 8,
  maxReferees: 3,
  status: normalizeRaceStatus(match.matchStatus).toLowerCase(),
});

const ensureMockRaces = async (tournamentId: number | string) => {
  const key = String(tournamentId);

  if (!mockRacesByTournament.has(key)) {
    const tournament = await tournamentService.getTournamentById(tournamentId);
    mockRacesByTournament.set(key, tournament.schedule.map((match, index) => raceFromMatch(match, tournamentId, index)));
  }

  return mockRacesByTournament.get(key) ?? [];
};

export const raceCrudService = {
  getScheduleOptions,
  async getRaceById(raceId: number | string): Promise<RaceCrudItem> {
    const response = await apiClient.get(`/api/v1/admin/races/get-race/${raceId}`);
    return mapRace(unwrapApiData<RawRecord>(response));
  },


  async getRacesByTournament(tournamentId: number | string): Promise<RaceCrudItem[]> {
    try {
      const response = await apiClient.get(`/api/tournaments/${tournamentId}/get-race-list`);
      return unwrapApiList<RawRecord>(response).map(mapRace);
    } catch {
      return ensureMockRaces(tournamentId);
    }
  },

  async createRace(tournamentId: number | string, data: RaceFormData): Promise<RaceCrudItem> {
    const scheduleId = await resolveScheduleId(tournamentId, data.scheduleId);
    const response = await apiClient.post(`/api/v1/admin/schedules/${scheduleId}/create-race`, toRacePayload(data));
    return mapRace(unwrapApiData<RawRecord>(response));
  },

  async updateRace(raceId: number | string, data: RaceFormData): Promise<RaceCrudItem> {
    const response = await apiClient.put(`/api/v1/admin/races/update-race/${raceId}`, toRacePayload(data));
    return mapRace(unwrapApiData<RawRecord>(response));
  },

  async deleteRace(raceId: number | string, tournamentId: number | string): Promise<void> {
    try {
      await apiClient.patch(`/api/v1/admin/races/cancel-race/${raceId}`);
    } catch {
      const races = await ensureMockRaces(tournamentId);
      mockRacesByTournament.set(
        String(tournamentId),
        races.map((race) =>
          String(race.raceId) === String(raceId)
            ? { ...race, status: 'cancelled' }
            : race,
        ),
      );
    }
  },

};
