import { apiClient, unwrapApiData, unwrapApiList } from './apiClient';
import type {
  ApproveWithdrawalPayload,
  MarkWithdrawalPaidPayload,
  RejectWithdrawalPayload,
  WithdrawalResponse,
  WithdrawalStatus,
} from '../types/withdrawal';

type RawObject = Record<string, unknown>;

export type WithdrawalRequest = {
  pointsAmount: number;
};

export type Withdrawal = WithdrawalResponse & {
  id?: number | string | null;
  amount?: number | string | null;
  originalAmount?: number | string | null;
  pointsAmount?: number | string | null;
  netAmount?: number | string | null;
  receivedAmount?: number | string | null;
  actualAmount?: number | string | null;
  reason?: string | null;
  note?: string | null;
  adminNote?: string | null;
  updatedAt?: string | null;
};

const asNullableNumber = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : null;
};

const asNullableString = (value: unknown): string | null => {
  if (value === null || value === undefined) {
    return null;
  }

  const text = String(value).trim();
  return text ? text : null;
};

const asNullableAmount = (value: unknown): number | string | null => {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }

  return asNullableString(value);
};

const mapWithdrawal = (raw: unknown): Withdrawal => {
  const item = raw && typeof raw === 'object' ? raw as RawObject : {};

  return {
    withdrawalId: asNullableNumber(item.withdrawalId),
    id: asNullableAmount(item.id),
    txId: asNullableNumber(item.txId),
    userId: asNullableNumber(item.userId),
    username: asNullableString(item.username),
    userFullName: asNullableString(item.userFullName),
    userEmail: asNullableString(item.userEmail),
    walletId: asNullableNumber(item.walletId),
    amount: asNullableAmount(item.amount),
    originalAmount: asNullableAmount(item.originalAmount),
    pointsAmount: asNullableAmount(item.pointsAmount),
    requestedPoints: asNullableAmount(item.requestedPoints),
    grossCashAmount: asNullableAmount(item.grossCashAmount),
    taxRate: asNullableAmount(item.taxRate),
    taxAmount: asNullableAmount(item.taxAmount),
    netAmount: asNullableAmount(item.netAmount),
    netCashAmount: asNullableAmount(item.netCashAmount),
    receivedAmount: asNullableAmount(item.receivedAmount),
    actualAmount: asNullableAmount(item.actualAmount),
    exchangeRate: asNullableAmount(item.exchangeRate),
    pickupCode: asNullableString(item.pickupCode),
    payoutLocation: asNullableString(item.payoutLocation),
    payoutCounter: asNullableString(item.payoutCounter),
    status: asNullableString(item.status),
    approvedBy: asNullableNumber(item.approvedBy),
    approvedAt: asNullableString(item.approvedAt),
    rejectedBy: asNullableNumber(item.rejectedBy),
    rejectedAt: asNullableString(item.rejectedAt),
    paidBy: asNullableNumber(item.paidBy),
    paidAt: asNullableString(item.paidAt),
    rejectReason: asNullableString(item.rejectReason),
    reason: asNullableString(item.reason),
    paymentNote: asNullableString(item.paymentNote),
    note: asNullableString(item.note),
    adminNote: asNullableString(item.adminNote),
    invoiceNumber: asNullableString(item.invoiceNumber),
    invoiceUrl: asNullableString(item.invoiceUrl),
    invoiceGeneratedAt: asNullableString(item.invoiceGeneratedAt),
    invoiceEmailedAt: asNullableString(item.invoiceEmailedAt),
    emailSentTo: asNullableString(item.emailSentTo),
    createdAt: asNullableString(item.createdAt),
    updatedAt: asNullableString(item.updatedAt),
  };
};

export const withdrawalService = {
  async createWithdrawal(data: WithdrawalRequest): Promise<Withdrawal> {
    const pointsAmount = Number(data.pointsAmount);

    if (!Number.isFinite(pointsAmount) || pointsAmount <= 0) {
      throw new Error('Withdrawal points amount must be greater than 0.');
    }

    const response = await apiClient.post('/api/withdrawals/request', {
      pointsAmount,
    });

    return mapWithdrawal(unwrapApiData<unknown>(response));
  },

  async getMyWithdrawals(): Promise<Withdrawal[]> {
    const response = await apiClient.get('/api/withdrawals/my');
    return unwrapApiList<unknown>(response).map(mapWithdrawal);
  },

  async getMyWithdrawal(withdrawalId: string | number): Promise<Withdrawal> {
    const response = await apiClient.get(`/api/withdrawals/my/${encodeURIComponent(String(withdrawalId))}`);
    return mapWithdrawal(unwrapApiData<unknown>(response));
  },

  async getAdminWithdrawals(status?: WithdrawalStatus, signal?: AbortSignal): Promise<WithdrawalResponse[]> {
    const response = await apiClient.get('/api/withdrawals/admin/get-all', {
      params: status ? { status } : undefined,
      signal,
    });

    return unwrapApiList<unknown>(response).map(mapWithdrawal);
  },

  async approveWithdrawal(withdrawalId: number, payload: ApproveWithdrawalPayload): Promise<WithdrawalResponse> {
    const response = await apiClient.patch(`/api/withdrawals/admin/${withdrawalId}/approve`, payload);
    return mapWithdrawal(unwrapApiData<unknown>(response));
  },

  async rejectWithdrawal(withdrawalId: number, payload: RejectWithdrawalPayload): Promise<WithdrawalResponse> {
    const response = await apiClient.patch(`/api/withdrawals/admin/${withdrawalId}/reject`, payload);
    return mapWithdrawal(unwrapApiData<unknown>(response));
  },

  async markWithdrawalAsPaid(withdrawalId: number, payload: MarkWithdrawalPaidPayload): Promise<WithdrawalResponse> {
    const response = await apiClient.patch(`/api/withdrawals/admin/${withdrawalId}/mark-paid`, payload);
    return mapWithdrawal(unwrapApiData<unknown>(response));
  },

  async resendWithdrawalInvoice(withdrawalId: number): Promise<WithdrawalResponse> {
    const response = await apiClient.post(`/api/withdrawals/admin/${withdrawalId}/resend-invoice`);
    return mapWithdrawal(unwrapApiData<unknown>(response));
  },
};
