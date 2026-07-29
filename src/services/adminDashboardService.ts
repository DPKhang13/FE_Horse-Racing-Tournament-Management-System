import { apiClient, unwrapApiData } from './apiClient';

export type AdminDashboardCashFlowByDay = {
  date?: string | null;
  depositAmount?: number | string | null;
  withdrawalAmount?: number | string | null;
  prizeAwardAmount?: number | string | null;
  netCashFlow?: number | string | null;
};

export type AdminDashboardRecentTransaction = {
  txId?: number | null;
  userId?: number | null;
  username?: string | null;
  userFullName?: string | null;
  txType?: string | null;
  cashAmount?: number | string | null;
  pointsAmount?: number | string | null;
  status?: string | null;
  refType?: string | null;
  refId?: number | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type AdminDashboardSummary = {
  totalUsers?: number | null;
  totalRaces?: number | null;
  activeRaces?: number | null;
  totalBets?: number | null;
  totalSuccessfulDepositAmount?: number | string | null;
  totalCompletedWithdrawalAmount?: number | string | null;
  totalAwardedPrizeAmount?: number | string | null;
  pendingWithdrawalCount?: number | null;
  netCashFlow?: number | string | null;
  cashFlowByDay?: AdminDashboardCashFlowByDay[] | null;
  recentTransactions?: AdminDashboardRecentTransaction[] | null;
};

export type AdminDashboardSummaryQuery = {
  from?: string;
  to?: string;
  period?: 'day' | 'month' | 'year';
  tournamentId?: number | string;
};

export const getAdminDashboardSummary = async (
  query: AdminDashboardSummaryQuery = {},
  signal?: AbortSignal,
): Promise<AdminDashboardSummary> => {
  const response = await apiClient.get('/api/admin/dashboard/summary', {
    params: query,
    signal,
  });
  const data = unwrapApiData<AdminDashboardSummary>(response);

  return {
    totalUsers: data.totalUsers ?? null,
    totalRaces: data.totalRaces ?? null,
    activeRaces: data.activeRaces ?? null,
    totalBets: data.totalBets ?? null,
    totalSuccessfulDepositAmount: data.totalSuccessfulDepositAmount ?? null,
    totalCompletedWithdrawalAmount: data.totalCompletedWithdrawalAmount ?? null,
    totalAwardedPrizeAmount: data.totalAwardedPrizeAmount ?? null,
    pendingWithdrawalCount: data.pendingWithdrawalCount ?? null,
    netCashFlow: data.netCashFlow ?? null,
    cashFlowByDay: Array.isArray(data.cashFlowByDay) ? data.cashFlowByDay : [],
    recentTransactions: Array.isArray(data.recentTransactions) ? data.recentTransactions : [],
  };
};

export const adminDashboardService = {
  getAdminDashboardSummary,
};
