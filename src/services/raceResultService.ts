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

const betOptionsByRaceId = new Map<string, Promise<RawObject[]>>();
const prizesByTournamentId = new Map<string, Promise<RawObject[]>>();
const raceDetailsByRaceId = new Map<string, Promise<RawObject | undefined>>();

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

const formatPrizeAmount = (value: unknown) => {
  const amount = Number(value);
  return Number.isFinite(amount) && amount > 0 ? formatCurrency(amount) : undefined;
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
    totalPrizePool: formatCurrency(raw.totalPrizePool ?? raw.prizePool),
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

const getBetOptionsByRaceId = (raceId: string) => {
  const cachedOptions = betOptionsByRaceId.get(raceId);

  if (cachedOptions) {
    return cachedOptions;
  }

  const request = apiClient
    .get(`/api/bet-options/get-by-race/${raceId}`)
    .then((response) => unwrapApiList<RawObject>(response))
    .catch(() => []);

  betOptionsByRaceId.set(raceId, request);
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

const findMatchingBetOption = (result: RawObject, options: RawObject[]) => {
  const horseId = asString(result.horseId);
  const assignmentId = asString(result.assignmentId);

  return options.find((option) => {
    const optionHorseId = asString(option.horseId);
    const optionAssignmentId = asString(option.assignmentId);

    return (
      (horseId && optionHorseId === horseId) ||
      (assignmentId && optionAssignmentId === assignmentId)
    );
  });
};

const enrichResultWithDetail = async (raw: RawObject): Promise<RawObject> => {
  const resultId = asString(raw.resultId ?? raw.id);

  if (!resultId) {
    return raw;
  }

  try {
    const response = await apiClient.get(`/api/race-results/get-by-id/${resultId}`);
    const detail = unwrapApiData<RawObject>(response);
    const mergedResult: RawObject = {
      ...raw,
      ...detail,
      resultId: raw.resultId ?? detail.resultId,
    };
    const raceId = asString(mergedResult.raceId);
    const options = raceId ? await getBetOptionsByRaceId(raceId) : [];
    const matchingOption = findMatchingBetOption(mergedResult, options);
    const tournamentId = await resolveTournamentId(mergedResult);
    const prizes = tournamentId ? await getPrizesByTournamentId(tournamentId) : [];
    const matchingPrize = findMatchingPrize(mergedResult, prizes);

    return {
      ...mergedResult,
      tournamentId: mergedResult.tournamentId ?? tournamentId,
      odds: mergedResult.odds ?? matchingOption?.currentRate ?? matchingOption?.betRate,
      prizeAmount: mergedResult.prizeAmount ?? matchingPrize?.amount,
      prizeDistributions: mapPrizeDistributions(prizes),
      prizePool: mergedResult.prizePool ?? getPrizePool(prizes),
    };
  } catch {
    return raw;
  }
};

export const raceResultService = {
  async getRaceResultSummaries(): Promise<RaceResultSummary[]> {
    const response = await apiClient.get('/api/race-results/get-all');
    const results = unwrapApiList<RawObject>(response);
    const enrichedResults = await Promise.all(results.map(enrichResultWithDetail));
    return enrichedResults.map(mapSummary);
  },

  async getRaceResultList(filters: RaceResultFilters = {}): Promise<RaceResultListItem[]> {
    const summaries = await this.getRaceResultSummaries();
    return filterResults(summaries.map(toListItem), filters);
  },

  async getRaceResultById(id: string): Promise<RaceResultSummary> {
    const response = await apiClient.get(`/api/race-results/get-by-id/${id}`);
    const result = unwrapApiData<RawObject>(response);
    const raceId = asString(result.raceId);
    const options = raceId ? await getBetOptionsByRaceId(raceId) : [];
    const matchingOption = findMatchingBetOption(result, options);
    const tournamentId = await resolveTournamentId(result);
    const prizes = tournamentId ? await getPrizesByTournamentId(tournamentId) : [];
    const matchingPrize = findMatchingPrize(result, prizes);

    return mapSummary({
      ...result,
      tournamentId: result.tournamentId ?? tournamentId,
      odds: result.odds ?? matchingOption?.currentRate ?? matchingOption?.betRate,
      prizeAmount: result.prizeAmount ?? matchingPrize?.amount,
      prizeDistributions: mapPrizeDistributions(prizes),
      prizePool: result.prizePool ?? getPrizePool(prizes),
    });
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
