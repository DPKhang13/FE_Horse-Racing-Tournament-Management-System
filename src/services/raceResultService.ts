import { apiClient, unwrapApiData, unwrapApiList } from './apiClient';
import { mockRaceResults, mockRankingBoards } from '../mocks/raceResultMockData';
import type {
  RaceResultEntry,
  RaceResultFilters,
  RaceResultListItem,
  RaceResultStatus,
  RaceResultSummary,
  RankingBoard,
  RankingCategory,
  RankingEntry,
  TrackType,
} from '../types/raceResult';

type RawObject = Record<string, unknown>;

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

const formatFinishTime = (value: unknown) => {
  const seconds = Number(value);

  if (!Number.isFinite(seconds)) {
    return value ? asString(value) : null;
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds - minutes * 60;
  return `${minutes}:${remainingSeconds.toFixed(2).padStart(5, '0')}`;
};

const normalizeStatus = (status: unknown): RaceResultStatus => {
  const value = asString(status).toLowerCase();

  if (value === 'published') {
    return 'published';
  }

  if (value === 'confirmed' || value === 'approved') {
    return 'confirmed';
  }

  return 'draft';
};

const normalizeTrackType = (trackType: unknown): TrackType => {
  const value = asString(trackType).toLowerCase();

  if (value.includes('turf')) {
    return 'Turf';
  }

  if (value.includes('synthetic')) {
    return 'Synthetic';
  }

  return 'Dirt';
};

const mapEntry = (raw: RawObject): RaceResultEntry => ({
  id: asString(raw.resultId ?? raw.id),
  assignmentId: asString(raw.assignmentId),
  horseId: asString(raw.horseId),
  horseName: asString(raw.horseName, 'Unknown horse'),
  jockeyName: asString(raw.jockeyFullName ?? raw.jockeyName, 'Unknown jockey'),
  gateNumber: asNumber(raw.gateNumber),
  finishPosition:
    raw.finishPosition === null || raw.finishPosition === undefined
      ? null
      : asNumber(raw.finishPosition),
  finishTime: formatFinishTime(raw.finishTimeSec),
  pointsAwarded: asNumber(raw.pointsAwarded),
  isDisqualified: Boolean(raw.isDisqualified),
  disqualificationReason: raw.disqualifyReason ? asString(raw.disqualifyReason) : undefined,
  prizeAmount: raw.prizeAmount ? formatCurrency(raw.prizeAmount) : undefined,
  odds: raw.odds ? asString(raw.odds) : undefined,
});

const mapSummary = (raw: RawObject): RaceResultSummary => {
  const entriesSource = Array.isArray(raw.entries) ? raw.entries : [raw];
  const entries = entriesSource
    .map((entry) => mapEntry(entry as RawObject))
    .sort((a, b) => (a.finishPosition ?? 999) - (b.finishPosition ?? 999));
  const winner = entries.find((entry) => entry.finishPosition === 1) ?? entries[0];

  return {
    id: asString(raw.resultId ?? raw.id ?? raw.raceId),
    raceId: asString(raw.raceId),
    raceName: asString(raw.raceName, 'Race result'),
    raceNumber: asNumber(raw.raceNumber),
    tournamentName: asString(raw.tournamentName, 'Tournament'),
    track: asString(raw.location, '-'),
    location: asString(raw.location, '-'),
    date: asString(raw.scheduledAt ?? raw.recordedAt ?? raw.publishedAt, new Date().toISOString()),
    distance: raw.distanceM ? `${raw.distanceM}m` : '-',
    trackType: normalizeTrackType(raw.trackType),
    grade: asString(raw.rankGroup, '-'),
    status: normalizeStatus(raw.status),
    publishedAt: raw.publishedAt ? asString(raw.publishedAt) : undefined,
    winnerHorse: winner?.horseName ?? '-',
    winnerJockey: winner?.jockeyName ?? '-',
    winnerTime: winner?.finishTime ?? '-',
    totalPrizePool: formatCurrency(raw.totalPrizePool),
    entries,
    prizeDistributions: Array.isArray(raw.prizeDistributions)
      ? raw.prizeDistributions.map((prize) => {
          const item = prize as RawObject;
          return {
            position: asNumber(item.finishPosition),
            amount: formatCurrency(item.amount),
            label: asString(item.prizeName, `${item.finishPosition}`),
          };
        })
      : [],
  };
};

const toListItem = (summary: RaceResultSummary): RaceResultListItem => ({
  id: summary.id,
  raceId: summary.raceId,
  raceName: summary.raceName,
  raceNumber: summary.raceNumber,
  tournamentName: summary.tournamentName,
  track: summary.track,
  date: summary.date,
  status: summary.status,
  publishedAt: summary.publishedAt,
  totalPrizePool: summary.totalPrizePool,
  topFinishers: summary.entries
    .filter((entry) => entry.finishPosition !== null && entry.finishPosition <= 3)
    .map((entry) => ({
      rank: entry.finishPosition as number,
      horseName: entry.horseName,
      jockeyName: entry.jockeyName,
      finishTime: entry.finishTime ?? '-',
      odds: entry.odds,
    })),
});

const filterResults = (items: RaceResultListItem[], filters: RaceResultFilters = {}) => {
  const { search = '', status = 'all', tournament = 'All Tournaments' } = filters;
  const query = search.trim().toLowerCase();

  return items.filter((item) => {
    const matchesSearch =
      !query ||
      item.raceName.toLowerCase().includes(query) ||
      item.tournamentName.toLowerCase().includes(query) ||
      item.track.toLowerCase().includes(query) ||
      item.topFinishers.some(
        (finisher) =>
          finisher.horseName.toLowerCase().includes(query) ||
          finisher.jockeyName.toLowerCase().includes(query),
      );
    const matchesStatus = status === 'all' || item.status === status;
    const matchesTournament = tournament === 'All Tournaments' || item.tournamentName === tournament;

    return matchesSearch && matchesStatus && matchesTournament;
  });
};

const mapRankingEntry = (raw: RawObject, index: number, category: RankingCategory): RankingEntry => ({
  rank: asNumber(raw.rank, index + 1),
  entityId: asString(raw.horseId ?? raw.jockeyId ?? raw.ownerId ?? raw.id),
  name: asString(raw.horseName ?? raw.jockeyFullName ?? raw.ownerFullName ?? raw.name ?? raw.fullName, '-'),
  subtitle:
    category === 'horse'
      ? asString(raw.ownerStableName ?? raw.ownerFullName)
      : raw.licenseNumber
        ? asString(raw.licenseNumber)
        : undefined,
  totalPoints: asNumber(raw.rankingPoints ?? raw.totalPoints),
  totalWins: asNumber(raw.totalWins),
  totalRaces: asNumber(raw.totalRaces),
  winRate: asNumber(raw.winRate),
  recentForm: raw.rankGroup ? asString(raw.rankGroup) : undefined,
});

export const raceResultService = {
  async getRaceResultList(filters: RaceResultFilters = {}): Promise<RaceResultListItem[]> {
    if (import.meta.env.DEV) {
      return filterResults(mockRaceResults.map(toListItem), filters);
    }

    try {
      const response = await apiClient.get('/api/race-results/get-all');
      const items = unwrapApiList<RawObject>(response).map(mapSummary).map(toListItem);
      return filterResults(items.length > 0 ? items : mockRaceResults.map(toListItem), filters);
    } catch {
      return filterResults(mockRaceResults.map(toListItem), filters);
    }
  },

  async getRaceResultById(id: string): Promise<RaceResultSummary> {
    const mockResult = mockRaceResults.find((result) => result.id === id);

    if (import.meta.env.DEV && mockResult) {
      return mockResult;
    }

    try {
      const response = await apiClient.get(`/api/race-results/get-by-id/${id}`);
      return mapSummary(unwrapApiData<RawObject>(response));
    } catch (error) {
      if (mockResult) {
        return mockResult;
      }

      throw error;
    }
  },

  async getRankingBoard(category: RankingCategory): Promise<RankingBoard | undefined> {
    if (import.meta.env.DEV) {
      return mockRankingBoards[category];
    }

    try {
      if (category === 'owner') {
        return mockRankingBoards.owner;
      }

      const endpoint = category === 'horse' ? '/api/horses/ranking' : '/api/jockeys/ranking';
      const response = await apiClient.get(endpoint);
      const entries = unwrapApiList<RawObject>(response).map((entry, index) =>
        mapRankingEntry(entry, index, category),
      );

      return entries.length > 0
        ? {
            category,
            tournamentName: 'Overall',
            season: String(new Date().getFullYear()),
            lastUpdated: new Date().toISOString(),
            entries,
          }
        : mockRankingBoards[category];
    } catch {
      return mockRankingBoards[category];
    }
  },

  getTournamentFilterOptions(results: RaceResultListItem[] = []): string[] {
    return ['All Tournaments', ...Array.from(new Set(results.map((result) => result.tournamentName)))];
  },
};
