import { apiClient, unwrapApiData, unwrapApiList } from './apiClient';

export type WithdrawalStatus = 'pending' | 'approved' | 'rejected' | 'paid' | 'cancelled' | string;

export type WithdrawalRequest = {
  pointsAmount: number;
};

export type Withdrawal = {
  withdrawalId?: number | string;
  id?: number | string;
  userId?: number | string;
  walletId?: number | string;
  amount?: number | string;
  originalAmount?: number | string;
  pointsAmount?: number | string;
  requestedPoints?: number | string;
  grossCashAmount?: number | string;
  taxAmount?: number | string;
  taxRate?: number | string;
  netAmount?: number | string;
  netCashAmount?: number | string;
  receivedAmount?: number | string;
  actualAmount?: number | string;
  exchangeRate?: number | string;
  pickupCode?: string;
  payoutLocation?: string;
  payoutCounter?: string;
  rejectReason?: string;
  paymentNote?: string;
  status?: WithdrawalStatus;
  reason?: string;
  note?: string;
  adminNote?: string;
  invoiceNumber?: string;
  createdAt?: string;
  updatedAt?: string;
  approvedAt?: string;
  rejectedAt?: string;
  paidAt?: string;
  [key: string]: unknown;
};

export const withdrawalService = {
  async createWithdrawal(data: WithdrawalRequest): Promise<Withdrawal> {
    const response = await apiClient.post('/api/withdrawals/request', {
      pointsAmount: Number(data.pointsAmount),
    });

    return unwrapApiData<Withdrawal>(response);
  },

  async getMyWithdrawals(): Promise<Withdrawal[]> {
    const response = await apiClient.get('/api/withdrawals/my');
    return unwrapApiList<Withdrawal>(response);
  },

  async getMyWithdrawal(withdrawalId: string | number): Promise<Withdrawal> {
    const response = await apiClient.get(`/api/withdrawals/my/${encodeURIComponent(String(withdrawalId))}`);
    return unwrapApiData<Withdrawal>(response);
  },
};
