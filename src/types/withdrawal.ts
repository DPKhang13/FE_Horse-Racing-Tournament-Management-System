export const withdrawalStatuses = ['pending', 'approved', 'paid', 'rejected'] as const;

export type WithdrawalStatus = (typeof withdrawalStatuses)[number];
export type WithdrawalStatusFilter = 'all' | WithdrawalStatus;

export type WithdrawalResponse = {
  withdrawalId: number | null;
  txId: number | null;
  userId: number | null;
  username: string | null;
  userFullName: string | null;
  userEmail: string | null;
  walletId: number | null;
  requestedPoints: number | string | null;
  grossCashAmount: number | string | null;
  taxRate: number | string | null;
  taxAmount: number | string | null;
  netCashAmount: number | string | null;
  exchangeRate: number | string | null;
  pickupCode: string | null;
  payoutLocation: string | null;
  payoutCounter: string | null;
  status: string | null;
  approvedBy: number | null;
  approvedAt: string | null;
  rejectedBy: number | null;
  rejectedAt: string | null;
  paidBy: number | null;
  paidAt: string | null;
  rejectReason: string | null;
  paymentNote: string | null;
  invoiceNumber: string | null;
  invoiceUrl: string | null;
  invoiceGeneratedAt: string | null;
  invoiceEmailedAt: string | null;
  emailSentTo: string | null;
  createdAt: string | null;
};

export type RejectWithdrawalPayload = {
  rejectReason: string;
};

export type ApproveWithdrawalPayload = {
  payoutLocation: string;
  payoutCounter: string;
};

export type MarkWithdrawalPaidPayload = {
  pickupCode: string;
  paymentNote?: string;
};
