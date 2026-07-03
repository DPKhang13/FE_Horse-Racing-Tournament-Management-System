import { apiClient, unwrapApiData } from './apiClient';

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
};
