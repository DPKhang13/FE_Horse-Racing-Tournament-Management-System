import { apiClient, unwrapApiData, unwrapApiList } from './apiClient';
import type { OpenRacePrediction, PredictionOption } from '../types/prediction';

type RawObject = Record<string, unknown>;

export type PredictionOverview = {
  openRaces: OpenRacePrediction[];
  walletBalance?: number;
};

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

const formatDateLabel = (value: unknown) => {
  const dateValue = value ? new Date(asString(value)) : new Date();

  if (Number.isNaN(dateValue.getTime())) {
    return '-';
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  }).format(dateValue);
};

const normalizeRaceStatus = (status: unknown): OpenRacePrediction['status'] => {
  const value = asString(status).toLowerCase();

  if (value.includes('closed') || value.includes('finished')) {
    return 'Closed';
  }

  if (value.includes('live') || value.includes('progress')) {
    return 'Live';
  }

  return 'Open';
};

const getOptions = (raw: RawObject): PredictionOption[] => {
  const options = Array.isArray(raw.options) ? raw.options : [];

  return options
    .filter((item): item is RawObject => Boolean(item) && typeof item === 'object')
    .map((item) => ({
      optionId: asNumber(item.optionId),
      horseId: asNumber(item.horseId),
      horseName: asString(item.horseName, 'Horse'),
      jockeyName: asString(item.jockeyFullName ?? item.jockeyName, 'Jockey'),
      odds: asNumber(item.currentRate ?? item.odds ?? item.betRate, 1),
    }));
};

const mapOpenRace = (raw: RawObject): OpenRacePrediction => {
  const options = getOptions(raw);
  const favorite = options.reduce<PredictionOption | undefined>((best, option) => {
    if (!best || option.odds < best.odds) {
      return option;
    }

    return best;
  }, undefined);

  return {
    id: asNumber(raw.raceId ?? raw.id),
    raceName: asString(raw.raceName ?? raw.name, 'Race'),
    tournamentName: asString(raw.tournamentName, 'Tournament'),
    date: formatDateLabel(raw.scheduledAt),
    track: asString(raw.location ?? raw.track, '-'),
    closesAt: asString(raw.predictionClosesAt ?? raw.scheduledAt, new Date().toISOString()),
    grade: asString(raw.rankGroup ?? raw.raceNumber, '-'),
    surface: asString(raw.trackType, '-'),
    favoriteHorse: favorite?.horseName ?? options[0]?.horseName ?? '-',
    odds: favorite ? String(favorite.odds) : '-',
    status: normalizeRaceStatus(raw.status),
    options,
  };
};

const readWalletBalance = (raw: unknown) => {
  if (!raw || typeof raw !== 'object') {
    return undefined;
  }

  const data = raw as RawObject;
  const wallet = data.wallet;

  if (!wallet || typeof wallet !== 'object') {
    return undefined;
  }

  return asNumber((wallet as RawObject).pointBalance);
};

export const predictionService = {
  async getOpenPredictionRaces(): Promise<OpenRacePrediction[]> {
    const response = await apiClient.get('/api/bets/open-predictions');
    return unwrapApiList<RawObject>(response).map(mapOpenRace);
  },

  async getPredictionOverview(): Promise<PredictionOverview> {
    const [openRacesResult, dashboardResult] = await Promise.allSettled([
      this.getOpenPredictionRaces(),
      apiClient.get('/api/bets/dashboard'),
    ]);

    const openRaces = openRacesResult.status === 'fulfilled' ? openRacesResult.value : [];
    const walletBalance = dashboardResult.status === 'fulfilled'
      ? readWalletBalance(unwrapApiData<RawObject>(dashboardResult.value))
      : undefined;

    return {
      openRaces,
      walletBalance,
    };
  },
};
