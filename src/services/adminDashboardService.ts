import { adminScheduleRaceApi, type AdminRaceItem } from '../pages/Admin/adminScheduleRaceApi';
import { adminUserService } from './adminUserService';
import { apiClient, getApiErrorMessage, unwrapApiData } from './apiClient';
import { betService, type BetItem } from './betService';

export type AdminDashboardDateRange = 'today' | 'last7' | 'last30' | 'all';

export type DashboardSectionError = {
  section: 'users' | 'races' | 'bets' | 'financial';
  message: string;
};

export type AdminDashboardMoneySummary = {
  totalSuccessfulDepositAmountCents: bigint;
  totalCompletedWithdrawalAmountCents: bigint;
  pendingWithdrawalCount: number;
  netCashFlowCents: bigint;
  recentTransactions: AdminDashboardTransaction[];
  cashFlowByDay: AdminDashboardCashFlowPoint[];
};

export type AdminDashboardTransaction = {
  txId: number | string;
  userName?: string;
  userId?: number | string;
  type: string;
  amountCents: bigint;
  status: string;
  createdAt?: string;
};

export type AdminDashboardCashFlowPoint = {
  date: string;
  depositCents: bigint;
  withdrawalCents: bigint;
};

export type AdminDashboardData = {
  totalUsers?: number;
  races: AdminRaceItem[];
  bets: BetItem[];
  financialSummary?: AdminDashboardMoneySummary;
  errors: DashboardSectionError[];
  limitations: string[];
};

type RawRecord = Record<string, unknown>;

export const successfulDepositStatuses = ['completed'] as const;
export const completedWithdrawalStatuses = ['completed'] as const;
export const pendingWithdrawalStatuses = ['pending'] as const;
export const depositTransactionTypes = ['topup'] as const;
export const activeRaceStatuses = ['registration_open', 'open_for_betting', 'ongoing', 'in_progress'] as const;

export const dateRangeLabels: Record<AdminDashboardDateRange, string> = {
  today: 'Today',
  last7: 'Last 7 Days',
  last30: 'Last 30 Days',
  all: 'All Time',
};

export const getDateRangeBounds = (range: AdminDashboardDateRange) => {
  if (range === 'all') {
    return {};
  }

  const now = new Date();
  const start = new Date(now);

  if (range === 'today') {
    start.setHours(0, 0, 0, 0);
  } else {
    start.setDate(start.getDate() - (range === 'last7' ? 6 : 29));
    start.setHours(0, 0, 0, 0);
  }

  return {
    from: start.toISOString(),
    to: now.toISOString(),
  };
};

export const isWithinDateRange = (value: string | undefined, range: AdminDashboardDateRange) => {
  if (range === 'all') {
    return true;
  }

  if (!value) {
    return false;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return false;
  }

  const bounds = getDateRangeBounds(range);
  const from = bounds.from ? new Date(bounds.from).getTime() : Number.NEGATIVE_INFINITY;
  const to = bounds.to ? new Date(bounds.to).getTime() : Number.POSITIVE_INFINITY;
  const time = date.getTime();

  return time >= from && time <= to;
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

export const moneyToCents = (value: unknown): bigint => {
  if (typeof value === 'bigint') {
    return value;
  }

  const normalizedValue = String(value ?? '0')
    .trim()
    .replace(/[,\s]/g, '');
  const sign = normalizedValue.startsWith('-') ? -1n : 1n;
  const unsignedValue = normalizedValue.replace(/^[+-]/, '');
  const [unitsText = '0', decimalsText = ''] = unsignedValue.split('.');
  const units = BigInt(unitsText.replace(/\D/g, '') || '0');
  const centsText = `${decimalsText.replace(/\D/g, '')}00`.slice(0, 2);
  const cents = BigInt(centsText || '0');

  return sign * (units * 100n + cents);
};

const mapTransaction = (raw: RawRecord, index = 0): AdminDashboardTransaction => {
  const amount = raw.amount ?? raw.cashAmount ?? raw.totalAmount ?? raw.value ?? 0;
  const user = raw.user && typeof raw.user === 'object' ? raw.user as RawRecord : undefined;

  return {
    txId: asString(raw.txId ?? raw.transactionId ?? raw.id, `TX-${index + 1}`),
    userName: asString(raw.userFullName ?? raw.fullName ?? raw.username ?? user?.fullName ?? user?.username) || undefined,
    userId: raw.userId === undefined ? undefined : asString(raw.userId),
    type: asString(raw.txType ?? raw.type, '-'),
    amountCents: moneyToCents(amount),
    status: asString(raw.status, '-'),
    createdAt: raw.createdAt ? asString(raw.createdAt) : undefined,
  };
};

const mapCashFlowPoint = (raw: RawRecord): AdminDashboardCashFlowPoint => ({
  date: asString(raw.date ?? raw.day),
  depositCents: moneyToCents(raw.depositAmount ?? raw.successfulDepositAmount ?? raw.deposits ?? 0),
  withdrawalCents: moneyToCents(raw.withdrawalAmount ?? raw.completedWithdrawalAmount ?? raw.withdrawals ?? 0),
});

const mapFinancialSummary = (value: unknown): AdminDashboardMoneySummary => {
  const raw = value && typeof value === 'object' ? value as RawRecord : {};
  const depositCents = moneyToCents(raw.totalSuccessfulDepositAmount ?? raw.totalDepositAmount ?? raw.successfulDepositAmount ?? 0);
  const withdrawalCents = moneyToCents(raw.totalCompletedWithdrawalAmount ?? raw.totalWithdrawalAmount ?? raw.completedWithdrawalAmount ?? 0);
  const netCashFlowCents = raw.netCashFlow === undefined
    ? depositCents - withdrawalCents
    : moneyToCents(raw.netCashFlow);
  const transactionList = Array.isArray(raw.recentTransactions) ? raw.recentTransactions : [];
  const cashFlowList = Array.isArray(raw.cashFlowByDay) ? raw.cashFlowByDay : Array.isArray(raw.cashFlow) ? raw.cashFlow : [];

  return {
    totalSuccessfulDepositAmountCents: depositCents,
    totalCompletedWithdrawalAmountCents: withdrawalCents,
    pendingWithdrawalCount: asNumber(raw.pendingWithdrawalCount),
    netCashFlowCents,
    recentTransactions: transactionList
      .filter((item): item is RawRecord => Boolean(item) && typeof item === 'object')
      .map(mapTransaction),
    cashFlowByDay: cashFlowList
      .filter((item): item is RawRecord => Boolean(item) && typeof item === 'object')
      .map(mapCashFlowPoint),
  };
};

const loadFinancialSummary = async (range: AdminDashboardDateRange) => {
  const response = await apiClient.get('/api/admin/dashboard/summary', {
    params: getDateRangeBounds(range),
  });

  return mapFinancialSummary(unwrapApiData<unknown>(response));
};

const loadRaces = async () => {
  const tournaments = await adminScheduleRaceApi.getTournaments();
  const raceResults = await Promise.allSettled(
    tournaments.map((tournament) => adminScheduleRaceApi.getRacesByTournament(tournament.tournamentId)),
  );
  const races = raceResults.flatMap((result) => (result.status === 'fulfilled' ? result.value : []));
  const failedRaceLists = raceResults.filter((result) => result.status === 'rejected').length;

  return {
    races,
    failedRaceLists,
  };
};

export const adminDashboardService = {
  async loadDashboard(range: AdminDashboardDateRange): Promise<AdminDashboardData> {
    const [userResult, raceResult, betResult, financialResult] = await Promise.allSettled([
      adminUserService.getUsers({ page: 0, size: 1, sort: 'createdAt,desc' }),
      loadRaces(),
      betService.getBets(),
      loadFinancialSummary(range),
    ]);

    const errors: DashboardSectionError[] = [];
    const limitations: string[] = [];

    if (userResult.status === 'rejected') {
      errors.push({ section: 'users', message: getApiErrorMessage(userResult.reason, 'Unable to load users.') });
    }

    if (raceResult.status === 'rejected') {
      errors.push({ section: 'races', message: getApiErrorMessage(raceResult.reason, 'Unable to load races.') });
    } else if (raceResult.value.failedRaceLists > 0) {
      errors.push({
        section: 'races',
        message: `${raceResult.value.failedRaceLists} tournament race list request${raceResult.value.failedRaceLists === 1 ? '' : 's'} failed.`,
      });
    }

    if (betResult.status === 'rejected') {
      errors.push({ section: 'bets', message: getApiErrorMessage(betResult.reason, 'Unable to load bets.') });
    }

    if (financialResult.status === 'rejected') {
      errors.push({
        section: 'financial',
        message: getApiErrorMessage(financialResult.reason, 'Admin cash-flow summary API is not available.'),
      });
      limitations.push(
        'TODO(BE-API): Missing backend capability - see Required Backend Additions report. Admin-wide deposits, withdrawals, transaction history, and cash-flow chart require GET /api/admin/dashboard/summary.',
      );
    }

    return {
      totalUsers: userResult.status === 'fulfilled' ? userResult.value.totalElements : undefined,
      races: raceResult.status === 'fulfilled' ? raceResult.value.races : [],
      bets: betResult.status === 'fulfilled' ? betResult.value : [],
      financialSummary: financialResult.status === 'fulfilled' ? financialResult.value : undefined,
      errors,
      limitations,
    };
  },
};
