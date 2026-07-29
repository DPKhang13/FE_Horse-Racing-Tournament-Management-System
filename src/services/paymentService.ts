import { apiClient, unwrapApiData, unwrapApiList } from './apiClient';
import { authService } from './authService';

export type PaymentProviderId = 'vnpay' | 'zalopay';

export type PaymentProvider = {
  id: PaymentProviderId;
  label: string;
  shortLabel: string;
  description: string;
};

export const paymentProviders: PaymentProvider[] = [
  {
    id: 'vnpay',
    label: 'VNPay',
    shortLabel: 'VNPay',
    description: 'ATM, thẻ ngân hàng và QR VNPay.',
  },
  {
    id: 'zalopay',
    label: 'ZaloPay',
    shortLabel: 'ZaloPay',
    description: 'Ví ZaloPay, QR hoặc ứng dụng ZaloPay.',
  },
];

export const getPaymentProvider = (provider: string | null | undefined): PaymentProvider => {
  const normalizedProvider = provider?.toLowerCase();
  return paymentProviders.find((item) => item.id === normalizedProvider) ?? paymentProviders[0];
};

export type PaymentRequest = {
  amount: number;
  locale?: string;
};

export type PaymentResponse = {
  paymentUrl?: string;
  payUrl?: string;
  deeplink?: string;
  qrCodeUrl?: string;
  provider?: PaymentProviderId | string;
  transactionRef?: string;
  txnRef?: string;
  orderId?: string;
  appTransId?: string;
  transaction?: unknown;
  [key: string]: unknown;
};

type PaymentTransactionBase = {
  txId?: number | string;
  walletId?: number;
  userId?: number;
  provider?: PaymentProviderId | string;
  refType?: PaymentProviderId | string;
  txType?: string;
  transactionId?: string;
  txnRef?: string;
  transactionRef?: string;
  orderId?: string;
  appTransId?: string;
  transId?: string;
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

export type PaymentTransactionSummary = PaymentTransactionBase;
export type PaymentTransactionDetail = PaymentTransactionBase;
export type VnpayPaymentRequest = PaymentRequest;
export type VnpayPaymentResponse = PaymentResponse;
export type VnpayTransactionSummary = PaymentTransactionSummary;
export type VnpayTransactionDetail = PaymentTransactionDetail;

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

const providerPath = (provider: PaymentProviderId) => `/api/payments/${provider}`;

export const paymentService = {
  async createPayment(provider: PaymentProviderId, data: PaymentRequest): Promise<PaymentResponse> {
    const response = await apiClient.post(`${providerPath(provider)}/create-payment`, {
      amount: Number(data.amount),
      locale: data.locale?.trim() || 'vn',
    });
    const payment = unwrapApiData<PaymentResponse>(response);
    return { ...payment, provider: payment.provider ?? provider };
  },

  async createVnpayPayment(data: VnpayPaymentRequest): Promise<VnpayPaymentResponse> {
    return this.createPayment('vnpay', data);
  },

  async handleVnpayReturn(search: string): Promise<VnpayReturnResponse> {
    const query = search.startsWith('?') ? search : `?${search}`;
    const response = await apiClient.get(`/api/payments/vnpay/handle-payment-return${query}`);
    return unwrapApiData<VnpayReturnResponse>(response);
  },

  async getTopupHistory(provider: PaymentProviderId): Promise<PaymentTransactionSummary[]> {
    const response = await apiClient.get(`${providerPath(provider)}/topup-history`);
    return unwrapApiList<PaymentTransactionSummary>(response).map((transaction) => ({
      ...transaction,
      provider: transaction.provider ?? transaction.refType ?? provider,
    }));
  },

  async getVnpayTopupHistory(): Promise<VnpayTransactionSummary[]> {
    return this.getTopupHistory('vnpay');
  },

  async getCurrentUserTopupHistory(): Promise<PaymentTransactionSummary[]> {
    const [providerResults, currentUser] = await Promise.all([
      Promise.allSettled(paymentProviders.map((provider) => this.getTopupHistory(provider.id))),
      authService.getCurrentUser().catch(() => authService.getStoredUserProfile()),
    ]);
    const history = providerResults.flatMap((result) => (result.status === 'fulfilled' ? result.value : []));
    const currentUserId = Number(currentUser?.userId ?? currentUser?.id);

    if (!Number.isFinite(currentUserId)) {
      return [];
    }

    return history.filter((transaction) => Number(transaction.userId) === currentUserId);
  },

  async getCurrentUserVnpayTopupHistory(): Promise<VnpayTransactionSummary[]> {
    return this.getCurrentUserTopupHistory();
  },

  async getTransaction(provider: PaymentProviderId, txId: string): Promise<PaymentTransactionDetail> {
    const response = await apiClient.get(`/api/payments/transactions/${encodeURIComponent(txId)}`);
    const transaction = unwrapApiData<PaymentTransactionDetail>(response);
    return { ...transaction, provider: transaction.provider ?? transaction.refType ?? provider };
  },

  async getVnpayTransaction(txId: string): Promise<VnpayTransactionDetail> {
    return this.getTransaction('vnpay', txId);
  },
};
