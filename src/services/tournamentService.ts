import { apiClient, getApiResponseMessage, unwrapApiData, unwrapApiList } from './apiClient';
import type { TournamentApiItem } from './scheduleService';
import { parseVndAmount } from '../utils/currency';
import type {
  CreatePrizeRequest,
  MatchStatus,
  PrizeAwardResponse,
  PrizeAwardStatus,
  PrizeResponse,
  Tournament,
  TournamentMatch,
  TournamentMutationData,
  TournamentParticipant,
  TournamentStatus,
  UpdatePrizeRequest,
} from '../types/tournament';

export type TournamentFormData = {
  name: string;
  location: string;
  startDate: string;
  endDate: string;
  prizePool: number;
  status: string;
};

export type PrizeItem = PrizeResponse;

export type RefereeAssignmentItem = {
  id?: number;
  refAssignId?: number;
  assignmentId?: number;
  raceId?: number;
  raceName?: string;
  refereeId?: number;
  refereeRole?: string;
  refereeFullName?: string;
  refereeUsername?: string;
  refereeUserId?: number;
  assignedAt?: string;
  status?: string;
  responseMessage?: string;
};

type TournamentPayloadData = TournamentFormData | TournamentMutationData;
type RawTournament = TournamentApiItem & { [key: string]: unknown };
type RawRecord = { [key: string]: unknown };
type TournamentCountResponse = {
  globalTournamentCount?: number;
  count?: number;
  total?: number;
};

export type CloseRegistrationRequest = {
  autoRejectPending?: boolean;
  autoCancelUnconfirmed?: boolean;
  allowCloseWithoutEligibleRaces?: boolean;
};

const isManagementTournamentData = (data: TournamentPayloadData): data is TournamentMutationData =>
  'tournamentName' in data;

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

const toDateString = (value: unknown, fallback = '2026-07-01') => {
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

const toTimeString = (value: unknown, fallback = '09:00') => {
  const text = asString(value);

  if (!text) {
    return fallback;
  }

  if (/^\d{2}:\d{2}/.test(text)) {
    return text.slice(0, 5);
  }

  const date = new Date(text);

  if (Number.isNaN(date.getTime())) {
    return fallback;
  }

  return date.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
};

const addMinutesToTime = (time: string, minutes: number) => {
  const [hourText, minuteText] = time.split(':');
  const totalMinutes = asNumber(hourText) * 60 + asNumber(minuteText) + minutes;
  const normalizedMinutes = ((totalMinutes % 1440) + 1440) % 1440;
  const hours = Math.floor(normalizedMinutes / 60);
  const mins = normalizedMinutes % 60;

  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
};

const formatCurrency = (value: unknown) => {
  const amount = asNumber(value);

  if (!amount) {
    return '-';
  }

  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(amount);
};

const normalizeTournamentStatus = (value: unknown): TournamentStatus => {
  const normalizedValue = asString(value, 'Upcoming').trim().toLowerCase().replace(/[_-]+/g, ' ');

  if (normalizedValue.includes('registration') && normalizedValue.includes('open')) {
    return 'Registration Open';
  }

  if (normalizedValue.includes('registration') && normalizedValue.includes('closed')) {
    return 'Registration Closed';
  }

  if (
    normalizedValue.includes('ongoing')
    || normalizedValue.includes('progress')
    || normalizedValue.includes('running')
    || normalizedValue === 'active'
    || normalizedValue === 'live'
  ) {
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

const normalizeMatchStatus = (value: unknown): MatchStatus => {
  const normalizedValue = asString(value, 'Scheduled').trim().toLowerCase();

  if (normalizedValue.includes('ongoing') || normalizedValue === 'live') {
    return 'Ongoing';
  }

  if (normalizedValue.includes('finish') || normalizedValue.includes('complete')) {
    return 'Finished';
  }

  if (normalizedValue.includes('cancel')) {
    return 'Cancelled';
  }

  return 'Scheduled';
};

const normalizeRaceWorkflowStatus = (value: unknown) =>
  asString(value).trim().toLowerCase().replace(/[_\s-]+/g, '_');

const isTournamentTerminalStatus = (status: TournamentStatus) =>
  status === 'Completed' || status === 'Cancelled';

const isTournamentActiveRaceStatus = (value: unknown) => {
  const normalizedValue = normalizeRaceWorkflowStatus(value);

  return normalizedValue === 'open_for_betting'
    || normalizedValue === 'betting_open'
    || normalizedValue === 'in_progress'
    || normalizedValue === 'ongoing'
    || normalizedValue === 'running'
    || normalizedValue === 'live'
    || (normalizedValue.includes('open') && normalizedValue.includes('betting'))
    || normalizedValue.includes('progress');
};

const toRawRecordList = (value: unknown): RawRecord[] =>
  Array.isArray(value)
    ? value.filter((item): item is RawRecord => Boolean(item) && typeof item === 'object' && !Array.isArray(item))
    : [];

const getEmbeddedRaceRecords = (raw: RawRecord) => [
  ...toRawRecordList(raw.races),
  ...toRawRecordList(raw.raceList),
  ...toRawRecordList(raw.schedule),
  ...toRawRecordList(raw.schedules),
  ...toRawRecordList(raw.matches),
];

const applyRaceWorkflowStatus = (tournament: Tournament, raceRecords: RawRecord[]) => {
  if (isTournamentTerminalStatus(tournament.status) || tournament.status === 'Ongoing') {
    return tournament;
  }

  const hasActiveRace = raceRecords.some((race) =>
    isTournamentActiveRaceStatus(race.raceStatus ?? race.status ?? race.matchStatus),
  );

  return hasActiveRace ? { ...tournament, status: 'Ongoing' as TournamentStatus } : tournament;
};

const cleanTournamentPayload = (data: TournamentPayloadData) => ({
  name: (isManagementTournamentData(data) ? data.tournamentName : data.name).trim(),
  location: data.location.trim(),
  startDate: data.startDate,
  endDate: data.endDate,
  prizePool: isManagementTournamentData(data) ? parseVndAmount(data.prize) : Number(data.prizePool),
  status: data.status.trim(),
});

const cleanTournamentUpdatePayload = (data: TournamentPayloadData) => ({
  name: (isManagementTournamentData(data) ? data.tournamentName : data.name).trim(),
  location: data.location.trim(),
  startDate: data.startDate,
  endDate: data.endDate,
  prizePool: isManagementTournamentData(data) ? parseVndAmount(data.prize) : Number(data.prizePool),
  status: data.status.trim(),
});

const mapParticipants = (value: unknown): TournamentParticipant[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((item, index) => {
    const raw = item as RawRecord;

    return {
      participantId: asString(raw.participantId ?? raw.regId ?? raw.id, `P-${index + 1}`),
      horseName: asString(raw.horseName ?? raw.name, `Horse ${index + 1}`),
      ownerName: asString(raw.ownerName ?? raw.ownerFullName, '-'),
      jockeyName: asString(raw.jockeyName ?? raw.jockeyFullName, '-'),
      stableName: asString(raw.stableName ?? raw.ownerStableName, '-'),
      status: asString(raw.status, 'Registered'),
    };
  });
};

const mapApiMatch = (item: unknown, index: number, fallbackDate = '2026-07-01'): TournamentMatch => {
  const raw = item as RawRecord;
  const scheduledAt = raw.scheduledAt ?? raw.raceDate ?? raw.matchDate;
  const startTime = toTimeString(raw.startTime ?? scheduledAt, '09:00');
  const matchNumber = asNumber(raw.matchId ?? raw.raceId ?? raw.scheduleId ?? raw.id, index + 1);

  return {
    matchId: asString(raw.matchId ?? raw.raceId ?? raw.scheduleId ?? raw.id, `M-${matchNumber}`),
    matchName: asString(raw.matchName ?? raw.raceName ?? raw.name ?? raw.title, `Match ${index + 1}`),
    round: asString(raw.round ?? raw.rankGroup ?? raw.scheduleTitle ?? raw.title, `Round ${index + 1}`),
    matchDate: toDateString(scheduledAt, fallbackDate),
    startTime,
    endTime: toTimeString(raw.endTime, addMinutesToTime(startTime, 75)),
    arenaLocation: asString(raw.arenaLocation ?? raw.arena ?? raw.location ?? raw.trackType, '-'),
    participant1: asString(raw.participant1 ?? raw.horseOneName ?? raw.favoriteHorseName, 'TBD'),
    participant2: asString(raw.participant2 ?? raw.horseTwoName ?? raw.opponentHorseName, 'TBD'),
    matchStatus: normalizeMatchStatus(raw.matchStatus ?? raw.status),
  };
};

const mapApiMatches = (value: unknown, fallbackDate = '2026-07-01') => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((item, index) => mapApiMatch(item, index, fallbackDate));
};

const mapApiPrize = (item: unknown, index = 0): PrizeResponse => {
  const raw = item as RawRecord;
  const id = asNumber(raw.id ?? raw.prizeId, index + 1);
  const prizeId = asNumber(raw.prizeId ?? raw.id, id);

  return {
    id,
    prizeId,
    tournamentId: asNumber(raw.tournamentId),
    tournamentName: asString(raw.tournamentName),
    tournamentStatus: asString(raw.tournamentStatus),
    prizePool: asNumber(raw.prizePool),
    finishPosition: asNumber(raw.finishPosition, index + 1),
    prizeName: asString(raw.prizeName),
    amount: asNumber(raw.amount),
    note: asString(raw.note),
  };
};

const mapApiPrizeAward = (item: unknown, index = 0): PrizeAwardResponse => {
  const raw = item as RawRecord;
  const status = asString(raw.status, 'announced').trim().toLowerCase();

  return {
    awardId: asNumber(raw.awardId ?? raw.id, index + 1),
    prizeId: asNumber(raw.prizeId),
    tournamentId: asNumber(raw.tournamentId),
    raceId: asNumber(raw.raceId),
    resultId: asNumber(raw.resultId),
    horseId: asNumber(raw.horseId),
    ownerId: asNumber(raw.ownerId),
    finishPosition: asNumber(raw.finishPosition, index + 1),
    amount: asNumber(raw.amount),
    status: (status === 'awarded' ? 'awarded' : 'announced') as PrizeAwardStatus,
    awardedAt: raw.awardedAt ? asString(raw.awardedAt) : undefined,
    horseName: asString(raw.horseName, '-'),
    ownerFullName: asString(raw.ownerFullName, '-'),
    tournamentName: asString(raw.tournamentName),
    prizeName: asString(raw.prizeName, `Position ${index + 1} Prize`),
  };
};

const cleanPrizePayload = (prize: CreatePrizeRequest | UpdatePrizeRequest): UpdatePrizeRequest => ({
  finishPosition: Number(prize.finishPosition),
  prizeName: prize.prizeName.trim(),
  amount: Number(prize.amount),
  note: prize.note.trim(),
});

const mapApiTournament = (raw: RawTournament, index: number): Tournament => {
  const tournamentId = asNumber(raw.tournamentId ?? raw.id, index + 1);
  const startDate = toDateString(raw.startDate, '2026-07-01');
  const participants = mapParticipants(raw.participants ?? raw.registrations);
  const currentParticipants = asNumber(
    raw.currentParticipants ?? raw.participantCount ?? raw.registeredHorseCount,
    participants.length,
  );
  const prizePool = asNumber(raw.prizePool);

  return applyRaceWorkflowStatus({
    tournamentId,
    id: asString(raw.code ?? raw.displayId, `T-${String(tournamentId).padStart(3, '0')}`),
    tournamentName: asString(raw.tournamentName ?? raw.name, 'Tournament'),
    tournamentType: asString(raw.tournamentType ?? raw.type ?? raw.rankGroup, 'Standard'),
    description: asString(raw.description, 'Tournament details are pending from the tournament API.'),
    startDate,
    endDate: toDateString(raw.endDate, startDate),
    location: asString(raw.location, '-'),
    registrationDeadline: toDateString(raw.registrationDeadline, startDate),
    maximumParticipants: asNumber(raw.maximumParticipants ?? raw.maxParticipants, Math.max(currentParticipants, 16)),
    currentParticipants,
    entryFee: asNumber(raw.entryFee),
    prize: asString(raw.prize ?? raw.prizeName, formatCurrency(prizePool)),
    status: normalizeTournamentStatus(raw.status),
    registrationOpenAt: raw.registrationOpenAt ? asString(raw.registrationOpenAt) : undefined,
    registrationCloseAt: raw.registrationCloseAt ? asString(raw.registrationCloseAt) : undefined,
    rulesNotes: asString(raw.rulesNotes ?? raw.note, '-'),
    participants,
    schedule: mapApiMatches(raw.schedule ?? raw.schedules ?? raw.matches, startDate),
    createdAt: raw.createdAt ? asString(raw.createdAt) : undefined,
    updatedAt: raw.updatedAt ? asString(raw.updatedAt) : undefined,
  }, getEmbeddedRaceRecords(raw));
};

const buildTournamentFromData = (
  data: TournamentPayloadData,
  tournamentId: number,
  existingTournament?: Tournament,
): Tournament => {
  const tournamentName = isManagementTournamentData(data) ? data.tournamentName : data.name;
  const prizePool = isManagementTournamentData(data) ? parseVndAmount(data.prize) : data.prizePool;

  return {
    tournamentId,
    id: existingTournament?.id ?? `T-${String(tournamentId).padStart(3, '0')}`,
    tournamentName: tournamentName.trim(),
    tournamentType: isManagementTournamentData(data) ? data.tournamentType.trim() : existingTournament?.tournamentType ?? 'Standard',
    description: isManagementTournamentData(data) ? data.description.trim() : existingTournament?.description ?? '',
    startDate: data.startDate,
    endDate: data.endDate,
    location: data.location.trim(),
    registrationDeadline: isManagementTournamentData(data)
      ? data.registrationDeadline
      : existingTournament?.registrationDeadline ?? data.startDate,
    maximumParticipants: isManagementTournamentData(data)
      ? Number(data.maximumParticipants)
      : existingTournament?.maximumParticipants ?? 16,
    currentParticipants: existingTournament?.currentParticipants ?? 0,
    entryFee: isManagementTournamentData(data) ? Number(data.entryFee) : existingTournament?.entryFee ?? 0,
    prize: formatCurrency(prizePool),
    status: normalizeTournamentStatus(data.status),
    registrationOpenAt: isManagementTournamentData(data) ? data.registrationOpenAt : existingTournament?.registrationOpenAt,
    registrationCloseAt: isManagementTournamentData(data) ? data.registrationCloseAt : existingTournament?.registrationCloseAt,
    rulesNotes: isManagementTournamentData(data) ? data.rulesNotes.trim() : existingTournament?.rulesNotes ?? '',
    participants: existingTournament?.participants.map((participant) => ({ ...participant })) ?? [],
    schedule: existingTournament?.schedule.map((match) => ({ ...match })) ?? [],
    createdAt: existingTournament?.createdAt ?? new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
};

const getTournamentRaceRecords = async (tournamentId: number | string): Promise<RawRecord[]> => {
  const response = await apiClient.get(`/api/tournaments/${tournamentId}/get-race-list`);
  return unwrapApiList<RawRecord>(response);
};

const withInferredRaceWorkflowStatus = async (tournament: Tournament): Promise<Tournament> => {
  if (!tournament.tournamentId || isTournamentTerminalStatus(tournament.status) || tournament.status === 'Ongoing') {
    return tournament;
  }

  try {
    return applyRaceWorkflowStatus(tournament, await getTournamentRaceRecords(tournament.tournamentId));
  } catch {
    return tournament;
  }
};

export const tournamentService = {
  async getTournaments(status?: string): Promise<TournamentApiItem[]> {
    const response = await apiClient.get('/api/tournaments/get-tournament-list', {
      params: status ? { status } : undefined,
    });
    return unwrapApiList<TournamentApiItem>(response);
  },

  async getGlobalTournamentCount(_useFallback = false): Promise<number> {
    void _useFallback;
    const response = await apiClient.get('/api/tournaments/get-global-tournament-count');
    const data = unwrapApiData<TournamentCountResponse | number>(response);

    if (typeof data === 'number') {
      return asNumber(data);
    }

    return asNumber(data.globalTournamentCount ?? data.count ?? data.total);
  },
  async getAllTournaments(_useFallback = true): Promise<Tournament[]> {
    void _useFallback;
    const response = await apiClient.get('/api/tournaments/get-tournament-list');
    const tournaments = unwrapApiList<RawTournament>(response);

    return Promise.all(
      tournaments.map(async (item, index) => {
        const tournamentId = item.tournamentId ?? item.id;

        let tournament: Tournament;

        if (!tournamentId) {
          tournament = mapApiTournament(item, index);
        } else {
          try {
            const detailResponse = await apiClient.get(`/api/tournaments/get-tournament/${tournamentId}`);
            tournament = mapApiTournament({
              ...item,
              ...unwrapApiData<RawTournament>(detailResponse),
            }, index);
          } catch {
            tournament = mapApiTournament(item, index);
          }
        }

        return withInferredRaceWorkflowStatus(tournament);
      }),
    );
  },
  async getTournamentById(tournamentId: number | string): Promise<Tournament> {
    const response = await apiClient.get(`/api/tournaments/get-tournament/${tournamentId}`);
    return withInferredRaceWorkflowStatus(mapApiTournament(unwrapApiData<RawTournament>(response), 0));
  },
  async createTournament(data: TournamentPayloadData, _useFallback = false): Promise<Tournament> {
    void _useFallback;
    const response = await apiClient.post('/api/tournaments/create-tournament', cleanTournamentPayload(data));
    const apiTournament = mapApiTournament(unwrapApiData<RawTournament>(response), 0);
    return {
      ...buildTournamentFromData(data, apiTournament.tournamentId, apiTournament),
      responseMessage: getApiResponseMessage(response),
    };
  },
  async updateTournament(tournamentId: number | string, data: TournamentPayloadData, _useFallback = false): Promise<Tournament> {
    void _useFallback;
    const response = await apiClient.put(`/api/tournaments/update-tournament/${tournamentId}`, cleanTournamentUpdatePayload(data));
    const apiTournament = mapApiTournament(unwrapApiData<RawTournament>(response), 0);
    const tournament = await withInferredRaceWorkflowStatus(buildTournamentFromData(data, apiTournament.tournamentId, apiTournament));
    return {
      ...tournament,
      responseMessage: getApiResponseMessage(response),
    };
  },
  async deleteTournament(_tournamentId: number | string): Promise<void> {
    void _tournamentId;
    throw new Error('Delete tournament API is not available in the backend.');
  },
  async cancelTournament(tournamentId: number | string, _useFallback = false): Promise<Tournament> {
    void _useFallback;
    const response = await apiClient.patch(`/api/tournaments/cancel-tournament/${tournamentId}`);
    return mapApiTournament(unwrapApiData<RawTournament>(response), 0);
  },
  async openRegistration(
    tournamentId: number | string,
    data: { registrationOpenAt?: string; registrationCloseAt: string },
  ): Promise<Tournament> {
    const response = await apiClient.patch(`/api/v1/admin/tournaments/${tournamentId}/open-registration`, {
      registrationOpenAt: data.registrationOpenAt || undefined,
      registrationCloseAt: data.registrationCloseAt,
    });
    return {
      ...await this.getTournamentById(tournamentId),
      responseMessage: getApiResponseMessage(response),
    };
  },

  async closeRegistration(
    tournamentId: number | string,
    data: CloseRegistrationRequest = {},
  ): Promise<Tournament> {
    const response = await apiClient.patch(`/api/v1/admin/tournaments/${tournamentId}/close-registration`, {
      autoRejectPending: data.autoRejectPending ?? false,
      autoCancelUnconfirmed: data.autoCancelUnconfirmed ?? false,
      allowCloseWithoutEligibleRaces: data.allowCloseWithoutEligibleRaces ?? false,
    });
    const responseData = response.data && typeof response.data === 'object' && !Array.isArray(response.data)
      ? response.data as RawRecord
      : {};
    const closeData = unwrapApiData<unknown>(response);
    const closeRecord = closeData && typeof closeData === 'object' && !Array.isArray(closeData)
      ? closeData as RawRecord
      : {};

    return {
      ...await this.getTournamentById(tournamentId),
      responseMessage: getApiResponseMessage(response),
      closeRegistrationSummary: {
        rejectedPendingRegistrations: asNumber(closeRecord.rejectedPendingRegistrations ?? responseData.rejectedPendingRegistrations),
        cancelledUnconfirmedRegistrations: asNumber(closeRecord.cancelledUnconfirmedRegistrations ?? responseData.cancelledUnconfirmedRegistrations),
      },
    };
  },

  async startTournament(tournamentId: number | string): Promise<Tournament> {
    const response = await apiClient.patch(`/api/v1/admin/tournaments/${tournamentId}/start`);
    return {
      ...await this.getTournamentById(tournamentId),
      responseMessage: getApiResponseMessage(response),
    };
  },

  async completeTournament(tournamentId: number | string): Promise<Tournament> {
    const response = await apiClient.patch(`/api/v1/admin/tournaments/${tournamentId}/complete`);
    return {
      ...await this.getTournamentById(tournamentId),
      responseMessage: getApiResponseMessage(response),
    };
  },

  async getTournamentSchedule(tournamentId: number | string): Promise<TournamentMatch[]> {
    const response = await apiClient.get(`/api/v1/admin/tournaments/${tournamentId}/get-schedule-list`);
    return unwrapApiList<RawRecord>(response).map((item, index) => mapApiMatch(item, index));
  },
  async getPrizes(tournamentId: number | string): Promise<PrizeResponse[]> {
    const response = await apiClient.get(`/api/v1/admin/tournaments/${tournamentId}/get-prizes`);
    return unwrapApiList<RawRecord>(response).map((item, index) => mapApiPrize(item, index));
  },

  async getPrize(tournamentId: number | string, prizeId: number | string): Promise<PrizeResponse> {
    const response = await apiClient.get(`/api/v1/admin/tournaments/${tournamentId}/get-prize/${prizeId}`);
    return mapApiPrize(unwrapApiData<RawRecord>(response));
  },

  async createPrizes(tournamentId: number | string, prizes: CreatePrizeRequest[]): Promise<{ items: PrizeResponse[]; responseMessage: string }> {
    const response = await apiClient.post(`/api/v1/admin/tournaments/${tournamentId}/create-prizes`, {
      prizes: prizes.map(cleanPrizePayload),
    });
    return {
      items: unwrapApiList<RawRecord>(response).map((item, index) => mapApiPrize(item, index)),
      responseMessage: getApiResponseMessage(response),
    };
  },

  async updatePrize(
    tournamentId: number | string,
    prizeId: number | string,
    prize: UpdatePrizeRequest,
  ): Promise<PrizeResponse> {
    const response = await apiClient.put(
      `/api/v1/admin/tournaments/${tournamentId}/update-prize/${prizeId}`,
      cleanPrizePayload(prize),
    );
    return mapApiPrize(unwrapApiData<RawRecord>(response));
  },

  async awardPrizes(tournamentId: number | string): Promise<PrizeAwardResponse[]> {
    const response = await apiClient.patch(`/api/v1/admin/tournaments/${tournamentId}/award-prizes`);
    return unwrapApiList<RawRecord>(response).map((item, index) => mapApiPrizeAward(item, index));
  },

  async getPrizeAwards(tournamentId: number | string): Promise<PrizeAwardResponse[]> {
    const response = await apiClient.get(`/api/v1/admin/tournaments/${tournamentId}/prize-awards`);
    return unwrapApiList<RawRecord>(response).map((item, index) => mapApiPrizeAward(item, index));
  },

  async markPrizeAwarded(tournamentId: number | string, awardId: number | string): Promise<PrizeAwardResponse> {
    const response = await apiClient.patch(`/api/v1/admin/tournaments/${tournamentId}/prize-awards/${awardId}/mark-awarded`);
    return mapApiPrizeAward(unwrapApiData<RawRecord>(response));
  },

  async getRaceReferees(raceId: number | string): Promise<RefereeAssignmentItem[]> {
    const response = await apiClient.get(`/api/v1/admin/races/${raceId}/get-referee-assignment-list`);
    return unwrapApiList<RefereeAssignmentItem>(response);
  },

  async assignReferee(raceId: number | string, refereeId: number, refereeRole: string): Promise<RefereeAssignmentItem> {
    const response = await apiClient.post(`/api/v1/admin/races/${raceId}/create-referee-assignment`, {
      refereeId: Number(refereeId),
      refereeRole: refereeRole.trim(),
    });
    return {
      ...unwrapApiData<RefereeAssignmentItem>(response),
      responseMessage: getApiResponseMessage(response),
    };
  },
};
