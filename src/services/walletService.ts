import { apiClient, unwrapApiData } from './apiClient';

type RawObject = Record<string, unknown>;

export type WalletSummary = {
  walletId: number;
  pointBalance: number;
  status: string;
  createdAt?: string;
};

export type WalletOverview = {
  wallet?: WalletSummary;
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

const mapWallet = (raw: unknown): WalletSummary | undefined => {
  if (!raw || typeof raw !== 'object') {
    return undefined;
  }

  const item = raw as RawObject;

  return {
    walletId: asNumber(item.walletId),
    pointBalance: asNumber(item.pointBalance),
    status: asString(item.status),
    createdAt: item.createdAt ? asString(item.createdAt) : undefined,
  };
};

export const walletService = {
  async getWalletOverview(): Promise<WalletOverview> {
    const response = await apiClient.get('/api/bets/dashboard');
    const data = unwrapApiData<RawObject>(response);

    return {
      wallet: mapWallet(data.wallet),
    };
  },
};
