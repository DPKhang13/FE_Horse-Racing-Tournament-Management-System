import { apiClient, unwrapApiData, unwrapApiList } from './apiClient';
import { authService } from './authService';

export type VnpayPaymentRequest = {
  amount: number;
  bankCode?: string;
  locale?: string;
};

export type VnpayPaymentResponse = {
  paymentUrl?: string;
  transactionRef?: string;
  txnRef?: string;
  transaction?: unknown;
  [key: string]: unknown;
};

type VnpayTransactionBase = {
  txId?: number | string;
  walletId?: number;
  userId?: number;
  txType?: string;
  transactionId?: string;
  txnRef?: string;
  transactionRef?: string;
  amount?: number;
  totalAmount?: number;
  value?: number;
  cashAmount?: number;
  pointsAmount?: number;
  exchangeRate?: number;
  pointsBefore?: number;
  pointsAfter?: number;
  status?: string;
  responseCode?: string;
  transactionStatus?: string;
  payDate?: string;
  bankCode?: string;
  createdAt?: string;
  updatedAt?: string;
  message?: string;
  errorMessage?: string;
  detail?: string;
  [key: string]: unknown;
};

export type VnpayTransactionSummary = VnpayTransactionBase;
export type VnpayTransactionDetail = VnpayTransactionBase;

export type VnpayReturnResponse = {
  validSignature?: boolean;
  success?: boolean;
  txnRef?: string;
  amount?: string;
  responseCode?: string;
  transactionStatus?: string;
  transactionNo?: string;
  bankCode?: string;
  payDate?: string;
  message?: string;
  transactionRef?: string;
  transaction?: unknown;
};

export const paymentService = {
  async createVnpayPayment(data: VnpayPaymentRequest): Promise<VnpayPaymentResponse> {
    const response = await apiClient.post('/api/payments/vnpay/create-payment', {
      amount: Number(data.amount),
      bankCode: data.bankCode?.trim() || undefined,
      locale: data.locale?.trim() || undefined,
    });
    return unwrapApiData<VnpayPaymentResponse>(response);
  },

  async handleVnpayReturn(search: string): Promise<VnpayReturnResponse> {
    const query = search.startsWith('?') ? search : `?${search}`;
    const response = await apiClient.get(`/api/payments/vnpay/handle-payment-return${query}`);
    return unwrapApiData<VnpayReturnResponse>(response);
  },

  async getVnpayTopupHistory(): Promise<VnpayTransactionSummary[]> {
    const response = await apiClient.get('/api/payments/vnpay/topup-history');
    return unwrapApiList<VnpayTransactionSummary>(response);
  },

  async getCurrentUserVnpayTopupHistory(): Promise<VnpayTransactionSummary[]> {
    const [history, currentUser] = await Promise.all([
      this.getVnpayTopupHistory(),
      authService.getCurrentUser().catch(() => authService.getStoredUserProfile()),
    ]);
    const currentUserId = Number(currentUser?.userId ?? currentUser?.id);

    if (!Number.isFinite(currentUserId)) {
      return [];
    }

    return history.filter((transaction) => Number(transaction.userId) === currentUserId);
  },

  async getVnpayTransaction(txId: string): Promise<VnpayTransactionDetail> {
    const response = await apiClient.get(`/api/payments/vnpay/transactions/${encodeURIComponent(txId)}`);
    return unwrapApiData<VnpayTransactionDetail>(response);
  },
};
