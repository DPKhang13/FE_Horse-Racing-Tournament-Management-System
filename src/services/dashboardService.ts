import { apiClient, unwrapApiData } from './apiClient';
import type { BetItem } from './betService';
import type { NotificationItem } from './notificationService';
import type { RaceScheduleItem } from './scheduleService';
import type { RaceResultListItem, RaceResultStatus } from '../types/raceResult';

type RawObject = Record<string, unknown>;

export type DashboardSummaryCount = {
  activeBetCount: number;
  settledBetCount: number;
  unreadNotificationCount: number;
  upcomingRaceCount: number;
  openPredictionRaceCount: number;
};

export type WalletSummary = {
  walletId: number;
  pointBalance: number;
  status: string;
  createdAt?: string;
};

export type SpectatorDashboardData = {
  wallet?: WalletSummary;
  summaryCount?: DashboardSummaryCount;
  upcomingRaces: RaceScheduleItem[];
  activeBets: BetItem[];
  latestResults: RaceResultListItem[];
  notifications: NotificationItem[];
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

const asArray = (value: unknown): RawObject[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is RawObject => Boolean(item) && typeof item === 'object');
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
    return value ? asString(value) : '-';
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

const mapUpcomingRace = (raw: RawObject): RaceScheduleItem => ({
  raceId: asNumber(raw.raceId ?? raw.id),
  tournamentId: asNumber(raw.tournamentId),
  tournamentName: asString(raw.tournamentName, 'Tournament'),
  location: asString(raw.location, '-'),
  raceName: asString(raw.raceName ?? raw.name, 'Race'),
  raceNumber: asNumber(raw.raceNumber),
  rankGroup: asString(raw.rankGroup, '-'),
  lapCount: asNumber(raw.lapCount),
  scheduledAt: asString(raw.scheduledAt, new Date().toISOString()),
  predictionClosesAt: raw.predictionClosesAt ? asString(raw.predictionClosesAt) : undefined,
  distanceM: asNumber(raw.distanceM),
  trackType: asString(raw.trackType, '-'),
  maxHorses: asNumber(raw.maxHorses),
  registeredHorseCount: asNumber(raw.registeredHorseCount),
  status: asString(raw.status, '-'),
  prizePool: raw.prizePool === undefined ? undefined : asNumber(raw.prizePool),
});

const mapBet = (raw: RawObject): BetItem => ({
  betId: asNumber(raw.betId ?? raw.id),
  raceId: raw.raceId === undefined ? undefined : asNumber(raw.raceId),
  userId: raw.userId === undefined ? undefined : asNumber(raw.userId),
  horseId: raw.horseId === undefined ? undefined : asNumber(raw.horseId),
  amount: asNumber(raw.betPoints ?? raw.amount ?? raw.stakeAmount ?? raw.stake),
  odds: asNumber(raw.betRate ?? raw.currentRate ?? raw.odds),
  potentialPayout: asNumber(raw.rewardPoints ?? raw.potentialPayout ?? raw.payout),
  status: asString(raw.status, 'pending'),
  createdAt: raw.placedAt ? asString(raw.placedAt) : raw.createdAt ? asString(raw.createdAt) : undefined,
  settledAt: raw.settledAt ? asString(raw.settledAt) : undefined,
  raceName: asString(raw.raceName ?? raw.name, 'Race'),
  tournamentName: raw.tournamentName ? asString(raw.tournamentName) : undefined,
  horseName: asString(raw.horseName ?? raw.selectionName, 'Horse'),
  jockeyName: raw.jockeyName ? asString(raw.jockeyName) : raw.jockeyFullName ? asString(raw.jockeyFullName) : undefined,
  finishPosition: raw.finishPosition === undefined ? undefined : asNumber(raw.finishPosition),
  pointsAwarded: raw.pointsAwarded === undefined ? undefined : asNumber(raw.pointsAwarded),
});

const mapNotification = (raw: RawObject): NotificationItem => ({
  notificationId: asNumber(raw.notificationId ?? raw.id),
  userId: raw.userId === undefined ? undefined : asNumber(raw.userId),
  title: asString(raw.title, 'Notification'),
  message: asString(raw.message ?? raw.content ?? raw.detail),
  type: raw.type ? asString(raw.type) : undefined,
  status: raw.status ? asString(raw.status) : raw.isRead === undefined ? undefined : raw.isRead ? 'read' : 'unread',
  createdAt: raw.createdAt ? asString(raw.createdAt) : undefined,
  readAt: raw.readAt ? asString(raw.readAt) : undefined,
});

const mapResultList = (items: RawObject[]): RaceResultListItem[] => {
  const groupedResults = new Map<string, RaceResultListItem>();

  items.forEach((raw) => {
    const raceId = asString(raw.raceId ?? raw.id);
    const key = raceId || asString(raw.resultId ?? groupedResults.size);
    const result = groupedResults.get(key) ?? {
      id: asString(raw.resultId ?? raw.id ?? key),
      raceId: key,
      raceName: asString(raw.raceName, 'Race result'),
      raceNumber: asNumber(raw.raceNumber),
      tournamentName: asString(raw.tournamentName, 'Tournament'),
      track: asString(raw.location ?? raw.track, '-'),
      date: asString(raw.scheduledAt ?? raw.recordedAt ?? raw.publishedAt, new Date().toISOString()),
      status: normalizeStatus(raw.status),
      publishedAt: raw.publishedAt ? asString(raw.publishedAt) : undefined,
      totalPrizePool: formatCurrency(raw.totalPrizePool),
      topFinishers: [],
    };

    const finishPosition = asNumber(raw.finishPosition, Number.MAX_SAFE_INTEGER);

    if (finishPosition <= 3) {
      result.topFinishers.push({
        rank: finishPosition,
        horseName: asString(raw.horseName, 'Unknown horse'),
        jockeyName: asString(raw.jockeyFullName ?? raw.jockeyName, 'Unknown jockey'),
        finishTime: formatFinishTime(raw.finishTimeSec ?? raw.finishTime),
      });
    }

    result.topFinishers.sort((a, b) => a.rank - b.rank);
    groupedResults.set(key, result);
  });

  return Array.from(groupedResults.values());
};

const mapSummaryCount = (raw: unknown): DashboardSummaryCount | undefined => {
  if (!raw || typeof raw !== 'object') {
    return undefined;
  }

  const item = raw as RawObject;

  return {
    activeBetCount: asNumber(item.activeBetCount),
    settledBetCount: asNumber(item.settledBetCount),
    unreadNotificationCount: asNumber(item.unreadNotificationCount),
    upcomingRaceCount: asNumber(item.upcomingRaceCount),
    openPredictionRaceCount: asNumber(item.openPredictionRaceCount),
  };
};

const mapWallet = (raw: unknown): WalletSummary | undefined => {
  if (!raw || typeof raw !== 'object') {
    return undefined;
  }

  const item = raw as RawObject;

  return {
    walletId: asNumber(item.walletId),
    pointBalance: asNumber(item.pointBalance),
    status: asString(item.status, '-'),
    createdAt: item.createdAt ? asString(item.createdAt) : undefined,
  };
};

export const dashboardService = {
  async getSpectatorDashboard(): Promise<SpectatorDashboardData> {
    const response = await apiClient.get('/api/bets/dashboard');
    const data = unwrapApiData<RawObject>(response);

    return {
      wallet: mapWallet(data.wallet),
      summaryCount: mapSummaryCount(data.summaryCount),
      upcomingRaces: asArray(data.upcomingRaces).map(mapUpcomingRace),
      activeBets: asArray(data.activeBets).map(mapBet),
      latestResults: mapResultList(asArray(data.latestResults)),
      notifications: asArray(data.notifications).map(mapNotification),
    };
  },
};
