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
const publicResultsByRaceId = new Map<string, Promise<RawObject[]>>();
let allBetOptionsRequest: Promise<RawObject[]> | undefined;

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
  odds: raw.odds ? asString(raw.odds) : undefined,
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

const getResultSortId = (raw: RawObject) => asNumber(raw.resultId ?? raw.id, Number.MAX_SAFE_INTEGER);

const groupResultsByRace = (results: RawObject[]) => {
  const groupedResults = new Map<string, RawObject>();

  results.forEach((result) => {
    const raceKey = asString(result.raceId || result.resultId || result.id);
    const currentGroup = groupedResults.get(raceKey);

    if (!currentGroup) {
      groupedResults.set(raceKey, {
        ...result,
        entries: [result],
      });
      return;
    }

    const currentEntries = Array.isArray(currentGroup.entries)
      ? currentGroup.entries.filter((entry): entry is RawObject => Boolean(entry) && typeof entry === 'object')
      : [];
    const nextEntries = [...currentEntries, result].sort((a, b) => {
      const positionDiff = asNumber(a.finishPosition, 999) - asNumber(b.finishPosition, 999);
      return positionDiff || getResultSortId(a) - getResultSortId(b);
    });
    const representativeResult = nextEntries.reduce((best, entry) =>
      getResultSortId(entry) < getResultSortId(best) ? entry : best,
    nextEntries[0]);

    groupedResults.set(raceKey, {
      ...currentGroup,
      ...representativeResult,
      raceId: currentGroup.raceId ?? representativeResult.raceId,
      raceName: currentGroup.raceName ?? representativeResult.raceName,
      raceNumber: currentGroup.raceNumber ?? representativeResult.raceNumber,
      tournamentName: currentGroup.tournamentName ?? representativeResult.tournamentName,
      location: currentGroup.location ?? representativeResult.location,
      scheduledAt: currentGroup.scheduledAt ?? representativeResult.scheduledAt,
      publishedAt: currentGroup.publishedAt ?? representativeResult.publishedAt,
      prizeDistributions: currentGroup.prizeDistributions ?? representativeResult.prizeDistributions,
      prizePool: currentGroup.prizePool ?? representativeResult.prizePool,
      entries: nextEntries,
    });
  });

  return Array.from(groupedResults.values()).sort((a, b) => {
    const dateDiff = new Date(asString(b.scheduledAt ?? b.recordedAt ?? b.publishedAt)).getTime()
      - new Date(asString(a.scheduledAt ?? a.recordedAt ?? a.publishedAt)).getTime();

    return dateDiff || asNumber(b.raceNumber) - asNumber(a.raceNumber);
  });
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

const getAllBetOptions = () => {
  if (allBetOptionsRequest) {
    return allBetOptionsRequest;
  }

  allBetOptionsRequest = apiClient
    .get('/api/bet-options/get-all')
    .then((response) => unwrapApiList<RawObject>(response))
    .catch(() => []);

  return allBetOptionsRequest;
};

const getBetOptionsByRaceId = (raceId: string) => {
  const cachedOptions = betOptionsByRaceId.get(raceId);

  if (cachedOptions) {
    return cachedOptions;
  }

  const request = getAllBetOptions().then((options) =>
    options.filter((option) => asString(option.raceId) === raceId),
  );

  betOptionsByRaceId.set(raceId, request);
  return request;
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

const getResultsByRaceId = (raceId: string) =>
  getPublicResultsByRaceId(raceId).then((publicResults) => {
    if (publicResults.length > 0) {
      return publicResults;
    }

    return apiClient
      .get(`/api/race-results/get-by-id/${raceId}`)
      .then((response) => unwrapApiList<RawObject>(response))
      .catch(() => []);
  });

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

const findMatchingRaceResult = (result: RawObject, results: RawObject[]) => {
  const resultId = asString(result.resultId ?? result.id);
  const assignmentId = asString(result.assignmentId);
  const horseId = asString(result.horseId);

  return results.find((item) => {
    const itemResultId = asString(item.resultId ?? item.id);
    const itemAssignmentId = asString(item.assignmentId);
    const itemHorseId = asString(item.horseId);

    return (
      (resultId && itemResultId === resultId) ||
      (assignmentId && itemAssignmentId === assignmentId) ||
      (horseId && itemHorseId === horseId)
    );
  });
};

const enrichResultWithDetail = async (raw: RawObject): Promise<RawObject> => {
  const resultId = asString(raw.resultId ?? raw.id);

  if (!resultId) {
    return raw;
  }

  try {
    const raceIdFromList = asString(raw.raceId);
    const raceResults = raceIdFromList ? await getResultsByRaceId(raceIdFromList) : [];
    const detail: RawObject = findMatchingRaceResult(raw, raceResults) ?? raw;
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
    return groupResultsByRace(enrichedResults).map(mapSummary);
  },

  async getRaceResultList(filters: RaceResultFilters = {}): Promise<RaceResultListItem[]> {
    const summaries = await this.getRaceResultSummaries();
    return filterResults(summaries.map(toListItem), filters);
  },

  async getRaceResultById(id: string): Promise<RaceResultSummary> {
    const detailEntries = await getResultsByRaceId(id);
    const result = detailEntries[0];

    if (!result) {
      throw new Error('Unable to load race result.');
    }

    const enrichedEntries = await Promise.all(detailEntries.map(enrichResultWithDetail));
    const groupedResult = groupResultsByRace(enrichedEntries)[0] ?? result;
    const raceId = asString(groupedResult.raceId ?? id);
    const options = raceId ? await getBetOptionsByRaceId(raceId) : [];
    const matchingOption = findMatchingBetOption(result, options);
    const tournamentId = await resolveTournamentId(groupedResult);
    const prizes = tournamentId ? await getPrizesByTournamentId(tournamentId) : [];
    const matchingPrize = findMatchingPrize(result, prizes);

    return mapSummary({
      ...groupedResult,
      tournamentId: groupedResult.tournamentId ?? tournamentId,
      odds: groupedResult.odds ?? matchingOption?.currentRate ?? matchingOption?.betRate,
      prizeAmount: groupedResult.prizeAmount ?? matchingPrize?.amount,
      prizeDistributions: mapPrizeDistributions(prizes),
      prizePool: groupedResult.prizePool ?? getPrizePool(prizes),
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
