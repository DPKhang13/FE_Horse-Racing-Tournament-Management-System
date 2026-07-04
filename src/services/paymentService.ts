import { apiClient, unwrapApiData } from './apiClient';

export type VnpayPaymentRequest = {
  amount: number;
  locale?: string;
};

export type VnpayPaymentResponse = {
  paymentUrl?: string;
  transactionRef?: string;
  txnRef?: string;
  transaction?: unknown;
  [key: string]: unknown;
};

export const paymentService = {
  async createVnpayPayment(data: VnpayPaymentRequest): Promise<VnpayPaymentResponse> {
    const response = await apiClient.post('/api/payments/vnpay/create-payment', {
      amount: Number(data.amount),
      locale: data.locale?.trim() || 'vn',
    });
    return unwrapApiData<VnpayPaymentResponse>(response);
  },
};
