import { apiClient, unwrapApiData, unwrapApiList } from './apiClient';
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

const prizesByTournamentId = new Map<string, Promise<RawObject[]>>();
const raceDetailsByRaceId = new Map<string, Promise<RawObject | undefined>>();
const publicResultsByRaceId = new Map<string, Promise<RawObject[]>>();

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

const formatPrizeDisplay = (value: unknown) => {
  const amount = Number(value);

  if (Number.isFinite(amount)) {
    return formatCurrency(amount);
  }

  return value ? asString(value) : '-';
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

const formatPrizeAmount = (value: unknown) => {
  const amount = Number(value);
  return Number.isFinite(amount) && amount > 0 ? formatCurrency(amount) : undefined;
};

const normalizeWinRate = (value: unknown, totalWins: number, totalRaces: number) => {
  const apiRate = Number(value);

  if (Number.isFinite(apiRate) && apiRate > 0) {
    const percentage = apiRate <= 1 ? apiRate * 100 : apiRate;
    return Math.round(percentage * 10) / 10;
  }

  if (totalRaces <= 0) {
    return 0;
  }

  return Math.round((totalWins / totalRaces) * 1000) / 10;
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
  prizeAmount: formatPrizeAmount(raw.prizeAmount),
});

const mapSummary = (raw: RawObject): RaceResultSummary => {
  const entriesSource = Array.isArray(raw.entries) ? raw.entries : [raw];
  const entries = entriesSource
    .map((entry) => mapEntry(entry as RawObject))
    .sort((a, b) => (a.finishPosition ?? 999) - (b.finishPosition ?? 999));
  const winner = entries.find((entry) => entry.finishPosition === 1) ?? entries[0];
  const prizePool = raw.totalPrizePool ?? raw.prizePool;
  const prizeDistributions = Array.isArray(raw.prizeDistributions)
    ? raw.prizeDistributions.map((prize) => {
        const item = prize as RawObject;
        const position = asNumber(item.finishPosition ?? item.position);

        return {
          position,
          amount: formatPrizeDisplay(item.amount),
          label: asString(item.prizeName ?? item.label, `Rank ${position}`),
        };
      })
      .filter((prize) => prize.position > 0)
      .sort((a, b) => a.position - b.position)
    : [];

  return {
    id: asString(raw.resultId ?? raw.id ?? raw.raceId),
    raceId: asString(raw.raceId),
    raceName: asString(raw.raceName, 'Race result'),
    raceNumber: asNumber(raw.raceNumber),
    tournamentName: asString(raw.tournamentName, 'Tournament'),
    track: asString(raw.location ?? raw.track, '-'),
    location: asString(raw.location ?? raw.track, '-'),
    date: asString(raw.scheduledAt ?? raw.raceDate ?? raw.recordedAt ?? raw.publishedAt, ''),
    distance: raw.distanceM ? `${raw.distanceM}m` : '-',
    trackType: normalizeTrackType(raw.trackType),
    grade: asString(raw.rankGroup, '-'),
    status: normalizeStatus(raw.status),
    publishedAt: raw.publishedAt ? asString(raw.publishedAt) : undefined,
    winnerHorse: winner?.horseName ?? '-',
    winnerJockey: winner?.jockeyName ?? '-',
    winnerTime: winner?.finishTime ?? '-',
    totalPrizePool: formatCurrency(prizePool),
    entries,
    prizeDistributions,
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
    .filter((entry) => entry.finishPosition !== null)
    .map((entry) => ({
      rank: entry.finishPosition as number,
      horseName: entry.horseName,
      jockeyName: entry.jockeyName,
      finishTime: entry.finishTime ?? '-',
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

const mapRankingEntry = (raw: RawObject, index: number, category: RankingCategory): RankingEntry => {
  const totalWins = asNumber(raw.totalWins);
  const totalRaces = asNumber(raw.totalRaces);

  return {
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
    totalWins,
    totalRaces,
    winRate: normalizeWinRate(raw.winRate, totalWins, totalRaces),
    recentForm: category === 'jockey'
      ? raw.experienceYears === undefined
        ? undefined
        : `${asNumber(raw.experienceYears)} năm`
      : raw.rankGroup
        ? asString(raw.rankGroup)
        : undefined,
  };
};

const getPublicResultsByRaceId = (raceId: string) => {
  const cachedResults = publicResultsByRaceId.get(raceId);

  if (cachedResults) {
    return cachedResults;
  }

  const request = apiClient
    .get(`/api/v1/races/${raceId}/results/public/get`)
    .then((response) => unwrapApiList<RawObject>(response))
    .catch(() => []);

  publicResultsByRaceId.set(raceId, request);
  return request;
};

const getPrizesByTournamentId = (tournamentId: string) => {
  const cachedPrizes = prizesByTournamentId.get(tournamentId);

  if (cachedPrizes) {
    return cachedPrizes;
  }

  const request = apiClient
    .get(`/api/v1/admin/tournaments/${tournamentId}/get-prizes`)
    .then((response) => unwrapApiList<RawObject>(response))
    .catch(() => []);

  prizesByTournamentId.set(tournamentId, request);
  return request;
};

const getRaceByRaceId = (raceId: string) => {
  const cachedRace = raceDetailsByRaceId.get(raceId);

  if (cachedRace) {
    return cachedRace;
  }

  const request = apiClient
    .get(`/api/v1/admin/races/get-race/${raceId}`)
    .then((response) => unwrapApiData<RawObject>(response))
    .catch(() => undefined);

  raceDetailsByRaceId.set(raceId, request);
  return request;
};

const resolveTournamentId = async (result: RawObject) => {
  const directTournamentId = asString(result.tournamentId);

  if (directTournamentId) {
    return directTournamentId;
  }

  const raceId = asString(result.raceId);

  if (!raceId) {
    return '';
  }

  const race = await getRaceByRaceId(raceId);
  return race ? asString(race.tournamentId) : '';
};

const getPrizePool = (prizes: RawObject[]) => {
  const explicitPool = prizes
    .map((prize) => Number(prize.prizePool))
    .find((value) => Number.isFinite(value) && value > 0);

  if (explicitPool !== undefined) {
    return explicitPool;
  }

  const totalAmount = prizes.reduce((total, prize) => {
    const amount = Number(prize.amount);
    return Number.isFinite(amount) ? total + amount : total;
  }, 0);

  return totalAmount > 0 ? totalAmount : undefined;
};

const mapPrizeDistributions = (prizes: RawObject[]) =>
  prizes
    .map((prize) => ({
      position: asNumber(prize.finishPosition),
      amount: formatCurrency(prize.amount),
      label: asString(prize.prizeName, `${prize.finishPosition}`),
    }))
    .filter((prize) => prize.position > 0)
    .sort((a, b) => a.position - b.position);

const findMatchingPrize = (result: RawObject, prizes: RawObject[]) => {
  const finishPosition = asNumber(result.finishPosition);

  return prizes.find((prize) => asNumber(prize.finishPosition) === finishPosition);
};

const buildPublishedSummary = async (raceId: string, results: RawObject[]): Promise<RaceResultSummary | null> => {
  if (results.length === 0) {
    return null;
  }

  const tournamentId = await resolveTournamentId(results[0]);
  const prizes = tournamentId ? await getPrizesByTournamentId(tournamentId) : [];
  const enrichedEntries = results.map((result) => {
    const matchingPrize = findMatchingPrize(result, prizes);

    return {
      ...result,
      prizeAmount: result.prizeAmount ?? matchingPrize?.amount,
    };
  });

  return mapSummary({
    ...results[0],
    id: raceId,
    raceId,
    tournamentId: results[0].tournamentId ?? tournamentId,
    entries: enrichedEntries,
    prizeDistributions: mapPrizeDistributions(prizes),
    prizePool: results[0].prizePool ?? getPrizePool(prizes),
  });
};

export const raceResultService = {
  async getRaceResultSummaries(): Promise<RaceResultSummary[]> {
    const response = await apiClient.get('/api/race-results/get-all');
    const raceIds = Array.from(
      new Set(
        unwrapApiList<RawObject>(response)
          .filter((result) => normalizeStatus(result.status) === 'published')
          .map((result) => asString(result.raceId))
          .filter(Boolean),
      ),
    );

    const summaries = await Promise.all(
      raceIds.map(async (raceId) => {
        try {
          const results = await getPublicResultsByRaceId(raceId);
          return await buildPublishedSummary(raceId, results);
        } catch {
          return null;
        }
      }),
    );

    return summaries.filter((summary): summary is RaceResultSummary => Boolean(summary));
  },

  async getRaceResultList(filters: RaceResultFilters = {}): Promise<RaceResultListItem[]> {
    const summaries = await this.getRaceResultSummaries();
    return filterResults(summaries.map(toListItem), filters);
  },

  async getRaceResultById(id: string): Promise<RaceResultSummary> {
    const results = await getPublicResultsByRaceId(id);
    const summary = await buildPublishedSummary(id, results);

    if (!summary) {
      throw new Error('Published results are not available for this race');
    }

    return summary;
  },

  async getRankingBoard(category: RankingCategory): Promise<RankingBoard | undefined> {
    const endpoint = category === 'horse' ? '/api/horses/ranking' : '/api/jockeys/ranking';
    const response = await apiClient.get(endpoint);
    const entries = unwrapApiList<RawObject>(response).map((entry, index) =>
      mapRankingEntry(entry, index, category),
    );

    if (entries.length === 0) {
      return undefined;
    }

    return {
      category,
      tournamentName: 'Overall',
      season: String(new Date().getFullYear()),
      lastUpdated: new Date().toISOString(),
      entries,
    };
  },

  getTournamentFilterOptions(results: RaceResultListItem[] = []): string[] {
    return ['All Tournaments', ...Array.from(new Set(results.map((result) => result.tournamentName)))];
  },
};
