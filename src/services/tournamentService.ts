import { apiClient, unwrapApiData, unwrapApiList } from './apiClient';
import type { TournamentApiItem } from './scheduleService';
import type {
  MatchStatus,
  Tournament,
  TournamentMatch,
  TournamentMutationData,
  TournamentParticipant,
  TournamentStatus,
} from '../types/tournament';

export type TournamentFormData = {
  name: string;
  location: string;
  startDate: string;
  endDate: string;
  prizePool: number;
  status: string;
};

export type PrizeItem = {
  prizeId?: number;
  finishPosition: number;
  prizeName: string;
  amount: number;
  note?: string;
  tournamentName?: string;
};

export type RefereeAssignmentItem = {
  assignmentId?: number;
  raceId?: number;
  refereeId?: number;
  refereeRole?: string;
  refereeFullName?: string;
  status?: string;
};

type TournamentPayloadData = TournamentFormData | TournamentMutationData;
type RawTournament = TournamentApiItem & { [key: string]: unknown };
type RawRecord = { [key: string]: unknown };
type TournamentCountResponse = {
  globalTournamentCount?: number;
  count?: number;
  total?: number;
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

const parseCurrencyAmount = (value: unknown) => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }

  const numericValue = Number(asString(value).replace(/[^\d.-]/g, ''));
  return Number.isFinite(numericValue) ? numericValue : 0;
};

const normalizeTournamentStatus = (value: unknown): TournamentStatus => {
  const normalizedValue = asString(value, 'Upcoming').trim().toLowerCase();

  if (normalizedValue.includes('ongoing') || normalizedValue === 'active') {
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

const cleanTournamentPayload = (data: TournamentPayloadData) => ({
  name: (isManagementTournamentData(data) ? data.tournamentName : data.name).trim(),
  location: data.location.trim(),
  startDate: data.startDate,
  endDate: data.endDate,
  prizePool: isManagementTournamentData(data) ? parseCurrencyAmount(data.prize) : Number(data.prizePool),
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

const mapApiTournament = (raw: RawTournament, index: number): Tournament => {
  const tournamentId = asNumber(raw.tournamentId ?? raw.id, index + 1);
  const startDate = toDateString(raw.startDate, '2026-07-01');
  const participants = mapParticipants(raw.participants ?? raw.registrations);
  const currentParticipants = asNumber(
    raw.currentParticipants ?? raw.participantCount ?? raw.registeredHorseCount,
    participants.length,
  );
  const prizePool = asNumber(raw.prizePool);

  return {
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
    rulesNotes: asString(raw.rulesNotes ?? raw.note, '-'),
    participants,
    schedule: mapApiMatches(raw.schedule ?? raw.schedules ?? raw.matches, startDate),
    createdAt: raw.createdAt ? asString(raw.createdAt) : undefined,
    updatedAt: raw.updatedAt ? asString(raw.updatedAt) : undefined,
  };
};

const createMatch = (
  tournamentCode: string,
  index: number,
  matchName: string,
  round: string,
  matchDate: string,
  startTime: string,
  arenaLocation: string,
  participant1: string,
  participant2: string,
  matchStatus: MatchStatus,
): TournamentMatch => ({
  matchId: `${tournamentCode}-M${index}`,
  matchName,
  round,
  matchDate,
  startTime,
  endTime: addMinutesToTime(startTime, 75),
  arenaLocation,
  participant1,
  participant2,
  matchStatus,
});

const createParticipants = (tournamentCode: string, names: string[]): TournamentParticipant[] =>
  names.map((horseName, index) => ({
    participantId: `${tournamentCode}-P${index + 1}`,
    horseName,
    ownerName: ['Avery Stone', 'Maya Tran', 'Lucas Reid', 'Nora Vale', 'Ethan Park', 'Iris Moon'][index] ?? 'Stable Owner',
    jockeyName: ['Kai Bennett', 'Linh Pham', 'Theo Miles', 'Sara Kim', 'Noah Blake', 'Mina Chen'][index] ?? 'Assigned Jockey',
    stableName: ['Golden Spur', 'Rivergate', 'Northwind', 'Silverline', 'Cedar Track', 'Blue Ribbon'][index] ?? 'Independent',
    status: 'Registered',
  }));

const cloneTournament = (tournament: Tournament): Tournament => ({
  ...tournament,
  participants: tournament.participants.map((participant) => ({ ...participant })),
  schedule: tournament.schedule.map((match) => ({ ...match })),
});

let mockTournaments: Tournament[] = [
  {
    tournamentId: 1,
    id: 'T-001',
    tournamentName: 'Saigon Summer Derby',
    tournamentType: 'Derby',
    description: 'Premier summer derby for elite sprinters and tactical race teams.',
    startDate: '2026-07-10',
    endDate: '2026-07-12',
    location: 'Ho Chi Minh City Grand Track',
    registrationDeadline: '2026-07-01',
    maximumParticipants: 24,
    currentParticipants: 18,
    entryFee: 2500000,
    prize: 'VND 450,000,000',
    status: 'Upcoming',
    rulesNotes: 'Participants must complete veterinary clearance 48 hours before the first match.',
    participants: createParticipants('T-001', ['Solar Comet', 'River Monarch', 'Ivory Dash', 'Midnight Vale', 'Cobalt Arrow', 'Lucky Meridian']),
    schedule: [
      createMatch('T-001', 1, 'Opening Sprint', 'Qualifiers', '2026-07-10', '09:00', 'Arena A', 'Solar Comet', 'River Monarch', 'Scheduled'),
      createMatch('T-001', 2, 'Derby Heat', 'Semi Final', '2026-07-11', '14:30', 'Arena A', 'Ivory Dash', 'Midnight Vale', 'Scheduled'),
      createMatch('T-001', 3, 'Summer Derby Final', 'Final', '2026-07-12', '16:00', 'Main Arena', 'TBD', 'TBD', 'Scheduled'),
    ],
  },
  {
    tournamentId: 2,
    id: 'T-002',
    tournamentName: 'Central Highlands Cup',
    tournamentType: 'Endurance',
    description: 'Multi-day endurance tournament designed for consistent pacing and recovery control.',
    startDate: '2026-06-20',
    endDate: '2026-06-23',
    location: 'Da Lat Highland Course',
    registrationDeadline: '2026-06-12',
    maximumParticipants: 20,
    currentParticipants: 20,
    entryFee: 1800000,
    prize: 'VND 300,000,000',
    status: 'Ongoing',
    rulesNotes: 'Hydration checkpoints are mandatory after every completed lap.',
    participants: createParticipants('T-002', ['Highland Echo', 'Pine Runner', 'Morning Flint', 'Amber Ridge', 'Cloud Harbor', 'Velvet Hill']),
    schedule: [
      createMatch('T-002', 1, 'Highland Opening Run', 'Round 1', '2026-06-20', '08:30', 'North Course', 'Highland Echo', 'Pine Runner', 'Finished'),
      createMatch('T-002', 2, 'Ridge Distance Trial', 'Round 2', '2026-06-21', '10:00', 'East Course', 'Morning Flint', 'Amber Ridge', 'Ongoing'),
      createMatch('T-002', 3, 'Cup Championship Run', 'Final', '2026-06-23', '15:00', 'Main Course', 'TBD', 'TBD', 'Scheduled'),
    ],
  },
  {
    tournamentId: 3,
    id: 'T-003',
    tournamentName: 'Mekong Classic',
    tournamentType: 'Classic',
    description: 'Traditional classic format with balanced speed, stamina, and point accumulation.',
    startDate: '2026-05-14',
    endDate: '2026-05-16',
    location: 'Can Tho Riverside Arena',
    registrationDeadline: '2026-05-01',
    maximumParticipants: 16,
    currentParticipants: 16,
    entryFee: 2000000,
    prize: 'VND 280,000,000',
    status: 'Completed',
    rulesNotes: 'Final standings are calculated from official finish times and referee reports.',
    participants: createParticipants('T-003', ['Delta Queen', 'Copper Stream', 'Eastern Nova', 'Royal Current', 'Meadow Signal', 'Pearl Voltage']),
    schedule: [
      createMatch('T-003', 1, 'Riverside Qualifier', 'Qualifiers', '2026-05-14', '09:45', 'Riverside A', 'Delta Queen', 'Copper Stream', 'Finished'),
      createMatch('T-003', 2, 'Mekong Classic Heat', 'Semi Final', '2026-05-15', '13:30', 'Riverside B', 'Eastern Nova', 'Royal Current', 'Finished'),
      createMatch('T-003', 3, 'Mekong Classic Final', 'Final', '2026-05-16', '17:00', 'Main Arena', 'Delta Queen', 'Eastern Nova', 'Finished'),
    ],
  },
  {
    tournamentId: 4,
    id: 'T-004',
    tournamentName: 'Northern Sprint Invitational',
    tournamentType: 'Sprint',
    description: 'Invitation-only sprint event for top-ranked horses in short-distance groups.',
    startDate: '2026-08-05',
    endDate: '2026-08-06',
    location: 'Ha Noi Capital Track',
    registrationDeadline: '2026-07-20',
    maximumParticipants: 12,
    currentParticipants: 9,
    entryFee: 3200000,
    prize: 'VND 520,000,000',
    status: 'Upcoming',
    rulesNotes: 'Late substitutions require referee approval and owner confirmation.',
    participants: createParticipants('T-004', ['Northern Pulse', 'Scarlet Bolt', 'Iron Lantern', 'White Ember', 'Metro Crown', 'Fast Orchard']),
    schedule: [
      createMatch('T-004', 1, 'Invitational Heat A', 'Heat A', '2026-08-05', '10:15', 'Sprint Lane 1', 'Northern Pulse', 'Scarlet Bolt', 'Scheduled'),
      createMatch('T-004', 2, 'Invitational Heat B', 'Heat B', '2026-08-05', '11:30', 'Sprint Lane 2', 'Iron Lantern', 'White Ember', 'Scheduled'),
      createMatch('T-004', 3, 'Northern Sprint Final', 'Final', '2026-08-06', '15:45', 'Main Sprint Track', 'TBD', 'TBD', 'Scheduled'),
    ],
  },
  {
    tournamentId: 5,
    id: 'T-005',
    tournamentName: 'Coastal Championship',
    tournamentType: 'Championship',
    description: 'Coastal championship event with alternating sprint and distance race formats.',
    startDate: '2026-04-18',
    endDate: '2026-04-20',
    location: 'Da Nang Coastal Arena',
    registrationDeadline: '2026-04-05',
    maximumParticipants: 18,
    currentParticipants: 12,
    entryFee: 1500000,
    prize: 'VND 220,000,000',
    status: 'Cancelled',
    rulesNotes: 'Event cancelled due to venue maintenance window.',
    participants: createParticipants('T-005', ['Coastal Ray', 'Marble Gale', 'Sapphire Road', 'Coral Knight', 'Golden Wave', 'Ocean Trace']),
    schedule: [
      createMatch('T-005', 1, 'Coastal Trial', 'Qualifiers', '2026-04-18', '09:00', 'Coastal Track A', 'Coastal Ray', 'Marble Gale', 'Cancelled'),
      createMatch('T-005', 2, 'Championship Heat', 'Semi Final', '2026-04-19', '14:00', 'Coastal Track B', 'Sapphire Road', 'Coral Knight', 'Cancelled'),
      createMatch('T-005', 3, 'Coastal Championship Final', 'Final', '2026-04-20', '16:30', 'Main Arena', 'TBD', 'TBD', 'Cancelled'),
    ],
  },
];

const findMockTournamentIndex = (tournamentId: number | string) =>
  mockTournaments.findIndex((tournament) =>
    String(tournament.tournamentId) === String(tournamentId) || tournament.id === String(tournamentId),
  );

const getMockTournamentById = (tournamentId: number | string) => {
  const tournament = mockTournaments.find((item) =>
    String(item.tournamentId) === String(tournamentId) || item.id === String(tournamentId),
  );

  if (!tournament) {
    throw new Error('Tournament not found.');
  }

  return cloneTournament(tournament);
};

const getMockTournaments = () => mockTournaments.map(cloneTournament);

const buildTournamentFromData = (
  data: TournamentPayloadData,
  tournamentId: number,
  existingTournament?: Tournament,
): Tournament => {
  const tournamentName = isManagementTournamentData(data) ? data.tournamentName : data.name;
  const prizePool = isManagementTournamentData(data) ? parseCurrencyAmount(data.prize) : data.prizePool;

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
    prize: isManagementTournamentData(data) ? data.prize.trim() : formatCurrency(prizePool),
    status: normalizeTournamentStatus(data.status),
    rulesNotes: isManagementTournamentData(data) ? data.rulesNotes.trim() : existingTournament?.rulesNotes ?? '',
    participants: existingTournament?.participants.map((participant) => ({ ...participant })) ?? [],
    schedule: existingTournament?.schedule.map((match) => ({ ...match })) ?? [],
    createdAt: existingTournament?.createdAt ?? new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
};

const createMockTournament = (data: TournamentPayloadData) => {
  const nextTournamentId = Math.max(0, ...mockTournaments.map((tournament) => tournament.tournamentId)) + 1;
  const tournament = buildTournamentFromData(data, nextTournamentId);
  mockTournaments = [tournament, ...mockTournaments];

  return cloneTournament(tournament);
};

const updateMockTournament = (tournamentId: number | string, data: TournamentPayloadData) => {
  const index = findMockTournamentIndex(tournamentId);

  if (index === -1) {
    throw new Error('Tournament not found.');
  }

  const tournament = buildTournamentFromData(data, mockTournaments[index].tournamentId, mockTournaments[index]);
  mockTournaments = mockTournaments.map((item, itemIndex) => (itemIndex === index ? tournament : item));

  return cloneTournament(tournament);
};

const cancelMockTournament = (tournamentId: number | string): Tournament => {
  const index = findMockTournamentIndex(tournamentId);

  if (index === -1) {
    throw new Error('Tournament not found.');
  }

  const tournament = {
    ...mockTournaments[index],
    status: 'Cancelled' as TournamentStatus,
    updatedAt: new Date().toISOString(),
  };
  mockTournaments = mockTournaments.map((item, itemIndex) => (itemIndex === index ? tournament : item));

  return cloneTournament(tournament);
};

export const tournamentService = {
  async getTournaments(status?: string): Promise<TournamentApiItem[]> {
    const response = await apiClient.get('/api/tournaments/get-tournament-list', {
      params: status ? { status } : undefined,
    });
    return unwrapApiList<TournamentApiItem>(response);
  },

  async getGlobalTournamentCount(useMockFallback = false): Promise<number> {
    try {
      const response = await apiClient.get('/api/tournaments/get-global-tournament-count');
      const data = unwrapApiData<TournamentCountResponse | number>(response);

      if (typeof data === 'number') {
        return asNumber(data);
      }

      return asNumber(data.globalTournamentCount ?? data.count ?? data.total);
    } catch (error) {
      if (useMockFallback) {
        return mockTournaments.length;
      }

      throw error;
    }
  },

  async getAllTournaments(useMockFallback = true): Promise<Tournament[]> {
    try {
      const response = await apiClient.get('/api/tournaments/get-tournament-list');
      const tournaments = unwrapApiList<RawTournament>(response);

      return Promise.all(
        tournaments.map(async (item, index) => {
          const tournamentId = item.tournamentId ?? item.id;

          if (!tournamentId) {
            return mapApiTournament(item, index);
          }

          try {
            const detailResponse = await apiClient.get(`/api/tournaments/get-tournament/${tournamentId}`);
            return mapApiTournament({
              ...item,
              ...unwrapApiData<RawTournament>(detailResponse),
            }, index);
          } catch {
            return mapApiTournament(item, index);
          }
        }),
      );
    } catch (error) {
      if (!useMockFallback) {
        throw error;
      }

      return getMockTournaments();
    }
  },

  async getTournamentById(tournamentId: number | string): Promise<Tournament> {
    try {
      const response = await apiClient.get(`/api/tournaments/get-tournament/${tournamentId}`);
      return mapApiTournament(unwrapApiData<RawTournament>(response), 0);
    } catch {
      return getMockTournamentById(tournamentId);
    }
  },

  async createTournament(data: TournamentPayloadData, useMockFallback = false): Promise<Tournament> {
    try {
      const response = await apiClient.post('/api/tournaments/create-tournament', cleanTournamentPayload(data));
      const apiTournament = mapApiTournament(unwrapApiData<RawTournament>(response), 0);
      return buildTournamentFromData(data, apiTournament.tournamentId, apiTournament);
    } catch (error) {
      if (!useMockFallback) {
        throw error;
      }

      return createMockTournament(data);
    }
  },

  async updateTournament(tournamentId: number | string, data: TournamentPayloadData, useMockFallback = false): Promise<Tournament> {
    try {
      const response = await apiClient.put(`/api/tournaments/update-tournament/${tournamentId}`, cleanTournamentPayload(data));
      const apiTournament = mapApiTournament(unwrapApiData<RawTournament>(response), 0);
      return buildTournamentFromData(data, apiTournament.tournamentId, apiTournament);
    } catch (error) {
      if (!useMockFallback) {
        throw error;
      }

      return updateMockTournament(tournamentId, data);
    }
  },

  async deleteTournament(tournamentId: number | string): Promise<void> {
    const index = findMockTournamentIndex(tournamentId);

    if (index !== -1) {
      mockTournaments = mockTournaments.filter((_, itemIndex) => itemIndex !== index);
      return;
    }

    throw new Error('Delete tournament API is not available in the backend.');
  },

  async cancelTournament(tournamentId: number | string, useMockFallback = false): Promise<Tournament> {
    try {
      const response = await apiClient.patch(`/api/tournaments/cancel-tournament/${tournamentId}`);
      return mapApiTournament(unwrapApiData<RawTournament>(response), 0);
    } catch (error) {
      if (!useMockFallback) {
        throw error;
      }

      return cancelMockTournament(tournamentId);
    }
  },

  async getTournamentSchedule(tournamentId: number | string): Promise<TournamentMatch[]> {
    try {
      const response = await apiClient.get(`/api/v1/admin/tournaments/${tournamentId}/get-schedule-list`);
      return unwrapApiList<RawRecord>(response).map((item, index) => mapApiMatch(item, index));
    } catch {
      return getMockTournamentById(tournamentId).schedule;
    }
  },

  async getPrizes(tournamentId: number | string): Promise<PrizeItem[]> {
    const response = await apiClient.get(`/api/v1/admin/tournaments/getId/${tournamentId}`);
    return unwrapApiList<PrizeItem>(response);
  },

  async createPrizes(tournamentId: number | string, prizes: PrizeItem[]): Promise<PrizeItem[]> {
    const response = await apiClient.post(`/api/v1/admin/tournaments/create/${tournamentId}`, {
      prizes: prizes.map((prize) => ({
        finishPosition: Number(prize.finishPosition),
        prizeName: prize.prizeName.trim(),
        amount: Number(prize.amount),
        note: prize.note?.trim() || undefined,
      })),
    });
    return unwrapApiList<PrizeItem>(response);
  },

  async getRaceReferees(raceId: number | string): Promise<RefereeAssignmentItem[]> {
    const response = await apiClient.get(`/api/v1/admin/races/${raceId}/referees`);
    return unwrapApiList<RefereeAssignmentItem>(response);
  },

  async assignReferee(raceId: number | string, refereeId: number, refereeRole: string): Promise<RefereeAssignmentItem> {
    const response = await apiClient.post(`/api/v1/admin/races/${raceId}/referees`, {
      refereeId: Number(refereeId),
      refereeRole: refereeRole.trim(),
    });
    return unwrapApiData<RefereeAssignmentItem>(response);
  },
};
