import { apiClient, unwrapApiData } from './apiClient';

export type VnpayPaymentRequest = {
  amount: number;
  bankCode?: string;
  locale?: string;
};

export type VnpayPaymentResponse = {
  paymentUrl?: string;
  transactionRef?: string;
  [key: string]: unknown;
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
};
