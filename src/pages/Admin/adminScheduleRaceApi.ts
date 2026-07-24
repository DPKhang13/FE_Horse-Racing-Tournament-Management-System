import { apiClient, getApiResponseMessage, unwrapApiData, unwrapApiList } from '../../services/apiClient';

export type AdminTournamentOption = {
  tournamentId: number;
  tournamentName: string;
  location: string;
  startDate: string;
  endDate: string;
  status: string;
};

export type AdminScheduleItem = {
  scheduleId: number;
  tournamentId: number;
  tournamentName: string;
  raceDate: string;
  dayNumber: number;
  title: string;
  note: string;
  createdAt?: string;
  updatedAt?: string;
  responseMessage?: string;
};

export type AdminScheduleFormData = {
  raceDate: string;
  dayNumber: number;
  title: string;
  note: string;
};

export const rankGroupOptions = ['A', 'B', 'C', 'D', 'E'] as const;

export type RaceRankGroup = (typeof rankGroupOptions)[number];

export type AdminRaceItem = {
  raceId: number;
  tournamentId?: number;
  tournamentName?: string;
  scheduleId?: number;
  scheduleTitle?: string;
  scheduleNote?: string;
  raceDate?: string;
  dayNumber?: number;
  location?: string;
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
  registeredHorseCount?: number;
  acceptedJockeyCount?: number;
  assignedRefereeCount?: number;
  responseMessage?: string;
};

export type AdminRaceFormData = {
  name: string;
  raceNumber: number;
  rankGroup: RaceRankGroup;
  lapCount: number;
  scheduledAt: string;
  predictionClosesAt: string;
  distanceM: number;
  trackType: string;
  maxHorses: number;
  maxReferees: number;
};

type RawRecord = Record<string, unknown>;

const asString = (value: unknown, fallback = '') => {
  if (value === null || value === undefined) {
    return fallback;
  }

  const text = String(value);
  return text.trim() ? text : fallback;
};

const asNumber = (value: unknown, fallback = 0) => {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : fallback;
};

const toDateInputValue = (value: unknown, fallback = '') => {
  const text = asString(value);

  if (!text) {
    return fallback;
  }

  if (/^\d{4}-\d{2}-\d{2}/.test(text)) {
    return text.slice(0, 10);
  }

  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? fallback : date.toISOString().slice(0, 10);
};

export const toDateTimeInputValue = (value: unknown, fallback = '') => {
  const text = asString(value);

  if (!text) {
    return fallback;
  }

  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(text) && !/(Z|[+-]\d{2}:?\d{2})$/i.test(text)) {
    return text.slice(0, 16);
  }

  const date = new Date(text);
  if (Number.isNaN(date.getTime())) {
    return fallback;
  }

  const offsetMs = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
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

const toApiInstant = (value: string) => {
  const text = value.trim();

  if (!text) {
    return undefined;
  }

  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
};

const extractList = <T,>(value: unknown): T[] => {
  if (Array.isArray(value)) {
    return value as T[];
  }

  if (!value || typeof value !== 'object') {
    return [];
  }

  const objectValue = value as RawRecord;

  for (const key of ['data', 'result', 'content', 'items', 'records', 'schedules', 'races', 'tournaments']) {
    const nestedList = extractList<T>(objectValue[key]);

    if (nestedList.length > 0) {
      return nestedList;
    }
  }

  return [];
};

const unwrapListFromResponse = <T,>(response: Parameters<typeof unwrapApiList<T>>[0]) => {
  const directList = unwrapApiList<T>(response);

  if (directList.length > 0) {
    return directList;
  }

  return extractList<T>(response.data);
};

const normalizeRankGroup = (value: unknown): RaceRankGroup => {
  const text = asString(value, 'A').trim().toUpperCase().slice(0, 1);
  return rankGroupOptions.includes(text as RaceRankGroup) ? (text as RaceRankGroup) : 'A';
};

const mapTournament = (raw: RawRecord, index: number): AdminTournamentOption => {
  const tournamentId = asNumber(raw.tournamentId ?? raw.id, index + 1);
  const startDate = toDateInputValue(raw.startDate);

  return {
    tournamentId,
    tournamentName: asString(raw.tournamentName ?? raw.name, `Tournament ${tournamentId}`),
    location: asString(raw.location, '-'),
    startDate,
    endDate: toDateInputValue(raw.endDate, startDate),
    status: asString(raw.status, '-'),
  };
};

const mapSchedule = (
  raw: RawRecord,
  index: number,
  tournament?: AdminTournamentOption,
): AdminScheduleItem => {
  const scheduleId = asNumber(raw.scheduleId ?? raw.id, index + 1);
  const tournamentId = asNumber(raw.tournamentId ?? tournament?.tournamentId);
  const dayNumber = asNumber(raw.dayNumber ?? raw.day, index + 1);

  return {
    scheduleId,
    tournamentId,
    tournamentName: asString(raw.tournamentName ?? tournament?.tournamentName, tournament ? tournament.tournamentName : '-'),
    raceDate: toDateInputValue(raw.raceDate ?? raw.scheduleDate ?? raw.date, tournament?.startDate ?? ''),
    dayNumber,
    title: asString(raw.title ?? raw.scheduleTitle ?? raw.name, `Day ${dayNumber}`),
    note: asString(raw.note ?? raw.scheduleNote),
    createdAt: raw.createdAt ? asString(raw.createdAt) : undefined,
    updatedAt: raw.updatedAt ? asString(raw.updatedAt) : undefined,
  };
};

const mapRace = (raw: RawRecord, index: number): AdminRaceItem => ({
  raceId: asNumber(raw.raceId ?? raw.id, index + 1),
  tournamentId: raw.tournamentId === undefined ? undefined : asNumber(raw.tournamentId),
  tournamentName: raw.tournamentName ? asString(raw.tournamentName) : undefined,
  scheduleId: raw.scheduleId === undefined ? undefined : asNumber(raw.scheduleId),
  scheduleTitle: raw.scheduleTitle ? asString(raw.scheduleTitle) : undefined,
  scheduleNote: raw.scheduleNote ? asString(raw.scheduleNote) : undefined,
  raceDate: raw.raceDate ? toDateInputValue(raw.raceDate) : undefined,
  dayNumber: raw.dayNumber === undefined ? undefined : asNumber(raw.dayNumber),
  location: raw.location ? asString(raw.location) : undefined,
  name: asString(raw.name ?? raw.raceName, `Race ${index + 1}`),
  raceNumber: asNumber(raw.raceNumber, index + 1),
  rankGroup: asString(raw.rankGroup, 'A').slice(0, 1).toUpperCase(),
  lapCount: asNumber(raw.lapCount, 1),
  scheduledAt: toScheduledAtValue(raw.scheduledAt ?? raw.raceDate),
  predictionClosesAt: raw.predictionClosesAt ? asString(raw.predictionClosesAt) : undefined,
  distanceM: asNumber(raw.distanceM),
  trackType: asString(raw.trackType, '-'),
  maxHorses: asNumber(raw.maxHorses, 8),
  maxReferees: asNumber(raw.maxReferees, 3),
  status: asString(raw.status, 'scheduled'),
  registeredHorseCount: raw.registeredHorseCount === undefined ? undefined : asNumber(raw.registeredHorseCount),
  acceptedJockeyCount: raw.acceptedJockeyCount === undefined ? undefined : asNumber(raw.acceptedJockeyCount),
  assignedRefereeCount: raw.assignedRefereeCount === undefined ? undefined : asNumber(raw.assignedRefereeCount),
});

const getResponseObject = (value: unknown) => {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as RawRecord;
  }

  return {};
};

const toSchedulePayload = (data: AdminScheduleFormData) => ({
  raceDate: data.raceDate,
  dayNumber: Number(data.dayNumber),
  title: data.title.trim(),
  note: data.note.trim() || undefined,
});

const toRacePayload = (data: AdminRaceFormData) => ({
  name: data.name.trim(),
  raceNumber: Number(data.raceNumber),
  rankGroup: normalizeRankGroup(data.rankGroup),
  lapCount: Number(data.lapCount),
  scheduledAt: toApiInstant(data.scheduledAt),
  predictionClosesAt: data.predictionClosesAt ? toApiInstant(data.predictionClosesAt) : undefined,
  distanceM: Number(data.distanceM),
  trackType: data.trackType.trim() || undefined,
  maxHorses: Number(data.maxHorses),
  maxReferees: Number(data.maxReferees),
});

export const adminScheduleRaceApi = {
  async getTournaments(): Promise<AdminTournamentOption[]> {
    let rawItems: RawRecord[];

    try {
      const response = await apiClient.get('/api/tournaments/get-tournament-list');
      rawItems = unwrapListFromResponse<RawRecord>(response);
    } catch {
      const response = await apiClient.get('/api/tournaments/getAll');
      rawItems = unwrapListFromResponse<RawRecord>(response);
    }

    return rawItems
      .map(mapTournament)
      .filter((tournament) => tournament.tournamentId > 0)
      .sort((first, second) => first.tournamentName.localeCompare(second.tournamentName));
  },

  async getSchedules(
    tournamentId: number | string,
    tournament?: AdminTournamentOption,
  ): Promise<AdminScheduleItem[]> {
    let rawItems: RawRecord[];

    try {
      const response = await apiClient.get(`/api/v1/admin/tournaments/${tournamentId}/get-schedule-list`);
      rawItems = unwrapListFromResponse<RawRecord>(response);
    } catch {
      const response = await apiClient.get(`/api/tournament-schedules/get-by-tournament/${tournamentId}`);
      rawItems = unwrapListFromResponse<RawRecord>(response);
    }

    return rawItems
      .map((item, index) => mapSchedule(item, index, tournament))
      .filter((schedule) => schedule.scheduleId > 0)
      .sort((first, second) => first.raceDate.localeCompare(second.raceDate) || first.dayNumber - second.dayNumber);
  },

  async getSchedule(scheduleId: number | string, tournament?: AdminTournamentOption): Promise<AdminScheduleItem> {
    let rawItem: RawRecord;

    try {
      const response = await apiClient.get(`/api/v1/admin/schedules/get-schedule/${scheduleId}`);
      rawItem = getResponseObject(unwrapApiData<unknown>(response));
    } catch {
      const response = await apiClient.get(`/api/tournament-schedules/get-by-id/${scheduleId}`);
      rawItem = getResponseObject(unwrapApiData<unknown>(response));
    }

    return mapSchedule(rawItem, 0, tournament);
  },

  async createSchedule(
    tournamentId: number | string,
    data: AdminScheduleFormData,
    tournament?: AdminTournamentOption,
  ): Promise<AdminScheduleItem> {
    const payload = toSchedulePayload(data);
    const response = await apiClient.post(`/api/v1/admin/tournaments/${tournamentId}/create-schedule`, payload);
    const responseData = getResponseObject(unwrapApiData<unknown>(response));

    return {
      ...mapSchedule({ ...payload, tournamentId, ...responseData }, 0, tournament),
      responseMessage: getApiResponseMessage(response),
    };
  },

  async updateSchedule(
    scheduleId: number | string,
    data: AdminScheduleFormData,
    tournament?: AdminTournamentOption,
  ): Promise<AdminScheduleItem> {
    const payload = toSchedulePayload(data);
    const response = await apiClient.put(`/api/v1/admin/schedules/update-schedule/${scheduleId}`, payload);
    const responseData = getResponseObject(unwrapApiData<unknown>(response));

    return {
      ...mapSchedule({ ...payload, scheduleId, ...responseData }, 0, tournament),
      responseMessage: getApiResponseMessage(response),
    };
  },

  async getRacesByTournament(tournamentId: number | string): Promise<AdminRaceItem[]> {
    const response = await apiClient.get(`/api/tournaments/${tournamentId}/get-race-list`);
    const rawItems = unwrapListFromResponse<RawRecord>(response);

    return rawItems
      .map(mapRace)
      .filter((race) => race.raceId > 0)
      .sort((first, second) => new Date(first.scheduledAt).getTime() - new Date(second.scheduledAt).getTime());
  },

  async getRace(raceId: number | string): Promise<AdminRaceItem> {
    let rawItem: RawRecord;

    try {
      const response = await apiClient.get(`/api/v1/admin/races/get-race/${raceId}`);
      rawItem = getResponseObject(unwrapApiData<unknown>(response));
    } catch {
      const response = await apiClient.get(`/api/races/get-by-id/${raceId}`);
      rawItem = getResponseObject(unwrapApiData<unknown>(response));
    }

    return mapRace(rawItem, 0);
  },

  async createRace(scheduleId: number | string, data: AdminRaceFormData): Promise<AdminRaceItem> {
    const payload = toRacePayload(data);
    const response = await apiClient.post(`/api/v1/admin/schedules/${scheduleId}/create-race`, payload);
    const responseData = getResponseObject(unwrapApiData<unknown>(response));

    return {
      ...mapRace({ ...payload, scheduleId, ...responseData }, 0),
      responseMessage: getApiResponseMessage(response),
    };
  },

  async updateRace(raceId: number | string, data: AdminRaceFormData): Promise<AdminRaceItem> {
    const payload = toRacePayload(data);
    const response = await apiClient.put(`/api/v1/admin/races/update-race/${raceId}`, payload);
    const responseData = getResponseObject(unwrapApiData<unknown>(response));

    return {
      ...mapRace({ ...payload, raceId, ...responseData }, 0),
      responseMessage: getApiResponseMessage(response),
    };
  },

  async startRace(
    raceId: number | string,
    data: { forceCloseBetting?: boolean; note?: string } = {},
  ): Promise<string> {
    const response = await apiClient.patch(`/api/v1/admin/races/${raceId}/start`, {
      forceCloseBetting: data.forceCloseBetting ?? true,
      note: data.note?.trim() || undefined,
    });

    return getApiResponseMessage(response);
  },

  async openBetting(raceId: number | string): Promise<string> {
    const response = await apiClient.patch(`/api/v1/admin/races/${raceId}/open-betting`);
    return getApiResponseMessage(response);
  },

  async completeRace(raceId: number | string): Promise<string> {
    const response = await apiClient.patch(`/api/v1/admin/races/${raceId}/complete`);
    return getApiResponseMessage(response);
  },

  async cancelRace(raceId: number | string): Promise<string> {
    const response = await apiClient.patch(`/api/v1/admin/races/cancel-race/${raceId}`);
    return getApiResponseMessage(response);
  },
};
