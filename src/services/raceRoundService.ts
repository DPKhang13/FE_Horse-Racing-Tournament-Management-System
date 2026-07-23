import { apiClient, unwrapApiData, unwrapApiList } from './apiClient';

type RawRecord = Record<string, unknown>;

export type RaceRoundItem = {
  roundId: number;
  raceId: number;
  assignmentId: number;
  horseId?: number;
  horseName?: string;
  jockeyId?: number;
  jockeyFullName?: string;
  roundNumber: number;
  position: number;
  lapTimeSec?: number;
  recordedAt?: string;
  lapCount?: number;
};

export type RaceRoundSaveRequest = {
  assignmentId: number;
  roundNumber: number;
  position: number;
  lapTimeSec?: number;
  recordedAt?: string;
};

const asString = (value: unknown) => (
  value === null || value === undefined ? undefined : String(value)
);

const asNumber = (value: unknown, fallback = 0) => {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : fallback;
};

const asOptionalNumber = (value: unknown) => {
  if (value === null || value === undefined || value === '') {
    return undefined;
  }

  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : undefined;
};

const mapRound = (raw: RawRecord): RaceRoundItem => ({
  roundId: asNumber(raw.roundId ?? raw.id),
  raceId: asNumber(raw.raceId),
  assignmentId: asNumber(raw.assignmentId),
  horseId: asOptionalNumber(raw.horseId),
  horseName: asString(raw.horseName),
  jockeyId: asOptionalNumber(raw.jockeyId),
  jockeyFullName: asString(raw.jockeyFullName),
  roundNumber: asNumber(raw.roundNumber),
  position: asNumber(raw.position),
  lapTimeSec: asOptionalNumber(raw.lapTimeSec),
  recordedAt: asString(raw.recordedAt),
  lapCount: asOptionalNumber(raw.lapCount),
});

const toApiInstant = (value?: string) => {
  if (!value?.trim()) {
    return undefined;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toISOString();
};

const toPayload = (data: RaceRoundSaveRequest) => ({
  assignmentId: Number(data.assignmentId),
  roundNumber: Number(data.roundNumber),
  position: Number(data.position),
  lapTimeSec: data.lapTimeSec === undefined ? undefined : Number(data.lapTimeSec.toFixed(2)),
  recordedAt: toApiInstant(data.recordedAt),
});

export const raceRoundService = {
  async getRoundsByRace(raceId: number | string): Promise<RaceRoundItem[]> {
    const response = await apiClient.get('/api/race-rounds/get-all', {
      params: { raceId: Number(raceId) },
    });

    return unwrapApiList<RawRecord>(response)
      .map(mapRound)
      .sort((first, second) => (
        first.roundNumber - second.roundNumber
        || first.position - second.position
        || first.assignmentId - second.assignmentId
      ));
  },

  async getRoundById(roundId: number | string): Promise<RaceRoundItem> {
    const response = await apiClient.get(`/api/race-rounds/get-by-id/${roundId}`);
    return mapRound(unwrapApiData<RawRecord>(response));
  },

  async createRound(data: RaceRoundSaveRequest): Promise<RaceRoundItem> {
    const response = await apiClient.post('/api/race-rounds/create', toPayload(data));
    return mapRound(unwrapApiData<RawRecord>(response));
  },

  async updateRound(roundId: number | string, data: RaceRoundSaveRequest): Promise<RaceRoundItem> {
    const response = await apiClient.put(`/api/race-rounds/update/${roundId}`, toPayload(data));
    return mapRound(unwrapApiData<RawRecord>(response));
  },
};
