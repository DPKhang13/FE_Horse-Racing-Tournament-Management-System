import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowLeft, ArrowRightLeft, CheckCircle2, Eye, Loader2, RefreshCw, Send, WalletCards } from 'lucide-react';
import { getApiErrorMessage } from '../../services/apiClient';
import { walletService } from '../../services/walletService';
import { withdrawalService, type Withdrawal } from '../../services/withdrawalService';

const MIN_WITHDRAWAL_AMOUNT = 100000;
const WITHDRAWAL_TAX_RATE = 0.1;
const POINTS_PER_VND = 0.001;
const QUICK_WITHDRAWAL_AMOUNTS = [100000, 200000, 500000, 1000000];

const formatCurrency = (value: number) => new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
  maximumFractionDigits: 0,
}).format(value);

const formatDateTime = (value: unknown) => {
  if (!value) return '-';

  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return '-';

  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
};

const parseAmount = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const getWithdrawalId = (withdrawal: Withdrawal, index: number) =>
  withdrawal.withdrawalId ?? withdrawal.id ?? `#${index + 1}`;

const getOriginalAmount = (withdrawal: Withdrawal) =>
  parseAmount(withdrawal.grossCashAmount ?? withdrawal.originalAmount ?? withdrawal.amount);

const getNetAmount = (withdrawal: Withdrawal) => {
  const netAmount = parseAmount(
    withdrawal.netCashAmount ?? withdrawal.netAmount ?? withdrawal.receivedAmount ?? withdrawal.actualAmount,
  );
  if (netAmount !== undefined) return netAmount;

  const originalAmount = getOriginalAmount(withdrawal);
  const taxAmount = parseAmount(withdrawal.taxAmount);
  if (originalAmount === undefined) return undefined;

  return originalAmount - (taxAmount ?? originalAmount * WITHDRAWAL_TAX_RATE);
};

const normalizeStatus = (status: unknown) => String(status ?? 'pending').trim().toLowerCase();
const statusLabel = (status: unknown) => {
  const normalized = normalizeStatus(status);
  const labels: Record<string, string> = {
    pending: 'Pending',
    approve: 'Approved',
    approved: 'Approved',
    reject: 'Rejected',
    rejected: 'Rejected',
    paid: 'Paid',
    completed: 'Completed',
    cancelled: 'Cancelled',
    canceled: 'Canceled',
    failed: 'Failed',
  };

  return labels[normalized] ?? String(status ?? 'pending');
};

const statusClassName = (status: unknown) => {
  const normalized = normalizeStatus(status);

  if (['approve', 'approved', 'paid', 'completed'].includes(normalized)) {
    return 'border-secondary/30 bg-secondary/15 text-secondary';
  }

  if (['reject', 'rejected', 'cancelled', 'canceled', 'failed'].includes(normalized)) {
    return 'border-error/30 bg-error-container/20 text-error';
  }

  return 'border-primary/25 bg-primary/10 text-primary';
};

const WalletWithdrawalsPage = () => {
  const [amountInput, setAmountInput] = useState(String(MIN_WITHDRAWAL_AMOUNT));
  const [walletBalance, setWalletBalance] = useState<number | undefined>();
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const amount = Number(amountInput);
  const validAmount = amountInput.trim() !== '' && Number.isFinite(amount) ? amount : 0;
  const estimatedTax = validAmount > 0 ? validAmount * WITHDRAWAL_TAX_RATE : 0;
  const estimatedNetAmount = Math.max(0, validAmount - estimatedTax);
  const requestedPoints = validAmount > 0 ? validAmount * POINTS_PER_VND : 0;
  const approvedWithdrawal = useMemo(
    () => withdrawals.find((withdrawal) =>
      ['approved', 'paid'].includes(normalizeStatus(withdrawal.status)) && withdrawal.pickupCode,
    ),
    [withdrawals],
  );

  const loadWithdrawals = async () => {
    setIsLoading(true);
    setErrorMessage('');

    try {
      const [overview, myWithdrawals] = await Promise.all([
        walletService.getWalletOverview().catch(() => ({ wallet: undefined })),
        withdrawalService.getMyWithdrawals(),
      ]);

      setWalletBalance(overview.wallet?.pointBalance);
      setWithdrawals(myWithdrawals);
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, 'Unable to load withdrawal history.'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadWithdrawals();
  }, []);

  const handleCreateWithdrawal = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (amountInput.trim() === '' || !Number.isFinite(amount) || amount < MIN_WITHDRAWAL_AMOUNT) {
      setErrorMessage(`The minimum withdrawal amount is ${formatCurrency(MIN_WITHDRAWAL_AMOUNT)}.`);
      return;
    }

    if (walletBalance !== undefined && requestedPoints > walletBalance) {
      setErrorMessage('The converted points cannot exceed your current wallet balance.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      await withdrawalService.createWithdrawal({
        pointsAmount: requestedPoints,
      });
      setAmountInput(String(MIN_WITHDRAWAL_AMOUNT));
      await loadWithdrawals();
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, 'Unable to create withdrawal request.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-surface text-on-surface">
      <section className="mx-auto max-w-[1240px] px-4 py-10 md:px-8">
        <motion.div
          className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-secondary">My Wallet</p>
            <h1 className="mt-2 font-display text-3xl font-bold text-on-surface md:text-4xl">Withdrawal Request</h1>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              to="/wallet"
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-outline-variant px-4 py-3 text-sm font-bold text-on-surface-variant transition hover:border-primary hover:text-primary"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Wallet
            </Link>
            <button
              type="button"
              onClick={() => void loadWithdrawals()}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-outline-variant px-4 py-3 text-sm font-bold text-on-surface-variant transition hover:border-primary hover:text-primary"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
          </div>
        </motion.div>

        {approvedWithdrawal && (
          <motion.div
            className="mb-6 rounded-lg border border-secondary/40 bg-secondary-container/30 px-5 py-4 text-sm font-semibold text-on-secondary-container"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex gap-3">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-secondary" />
              <div>
                <p>Your withdrawal request has been approved. You can collect cash at the payout counter.</p>
                <div className="mt-3 grid gap-2 text-sm font-medium sm:grid-cols-3">
                  <p><span className="text-on-secondary-container/70">Pickup code:</span> {approvedWithdrawal.pickupCode}</p>
                  <p><span className="text-on-secondary-container/70">Location:</span> {approvedWithdrawal.payoutLocation ?? '-'}</p>
                  <p><span className="text-on-secondary-container/70">Counter:</span> {approvedWithdrawal.payoutCounter ?? '-'}</p>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {errorMessage && (
          <motion.div
            className="mb-6 rounded-lg border border-error/40 bg-error-container/20 px-4 py-3 text-sm font-semibold text-error"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {errorMessage}
          </motion.div>
        )}

        <div className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
          <motion.section
            className="rounded-lg border border-outline-variant/70 bg-surface-container-low p-6"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="mb-6 flex items-center gap-3">
              <WalletCards className="h-5 w-5 text-secondary" />
              <h2 className="font-display text-2xl font-bold text-on-surface">Create Withdrawal Request</h2>
            </div>

            <div className="mb-5 grid gap-4 sm:grid-cols-2">
              <SummaryItem
                label="Available Points"
                value={isLoading ? '...' : walletBalance === undefined ? '-' : `${walletBalance.toLocaleString('vi-VN')} points`}
                emphasized
              />
              <SummaryItem label="Minimum Withdrawal" value={formatCurrency(MIN_WITHDRAWAL_AMOUNT)} />
            </div>

            <form onSubmit={handleCreateWithdrawal} className="grid gap-5">
              <div className="grid gap-2">
                <label htmlFor="withdrawal-amount" className="text-xs font-bold uppercase tracking-[0.16em] text-outline">
                  Withdrawal Amount
                </label>
                <input
                  id="withdrawal-amount"
                  type="number"
                  min={MIN_WITHDRAWAL_AMOUNT}
                  step={10000}
                  value={amountInput}
                  onChange={(event) => setAmountInput(event.target.value)}
                  className="rounded-lg border border-outline-variant bg-surface-container-lowest px-4 py-3 text-base font-semibold text-on-surface outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
                <div
                  className="flex flex-wrap items-center justify-between gap-2 border-l-2 border-primary/50 bg-primary/5 px-3 py-2 text-sm"
                  aria-live="polite"
                >
                  <span className="inline-flex items-center gap-2 text-on-surface-variant">
                    <ArrowRightLeft className="h-4 w-4 text-primary" />
                    1 point = 1,000 VND
                  </span>
                  <strong className="text-primary">
                    {amountInput.trim() === ''
                      ? 'Enter an amount to see the required points'
                      : `${formatCurrency(validAmount)} = ${requestedPoints.toLocaleString('vi-VN')} points`}
                  </strong>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {QUICK_WITHDRAWAL_AMOUNTS.map((quickAmount) => (
                    <button
                      key={quickAmount}
                      type="button"
                      onClick={() => setAmountInput(String(quickAmount))}
                      className={`rounded-lg border px-2 py-2 text-xs font-bold transition ${
                        validAmount === quickAmount
                          ? 'border-primary bg-primary text-on-primary'
                          : 'border-outline-variant bg-surface-container-lowest text-on-surface-variant hover:border-primary hover:text-primary'
                      }`}
                    >
                      {formatCurrency(quickAmount)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid gap-3 border-y border-outline-variant/50 py-4 text-sm">
                <div className="flex items-center justify-between gap-4 text-on-surface-variant">
                  <span>Points Used</span>
                  <span className="font-semibold">{requestedPoints.toLocaleString('vi-VN')} points</span>
                </div>
                <div className="flex items-center justify-between gap-4 text-on-surface-variant">
                  <span>Tax (10%)</span>
                  <span className="font-semibold">-{formatCurrency(estimatedTax)}</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="font-bold text-on-surface">Cash Received</span>
                  <span className="text-lg font-bold text-secondary">{formatCurrency(estimatedNetAmount)}</span>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting || isLoading}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-secondary px-5 py-3 text-sm font-bold text-on-secondary transition hover:bg-secondary/90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Submit Request
              </button>
            </form>
          </motion.section>

          <motion.section
            className="rounded-lg border border-outline-variant/70 bg-surface-container-low p-6"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="mb-6 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-secondary">History</p>
                <h2 className="mt-1 font-display text-2xl font-bold text-on-surface">Your Requests</h2>
              </div>
              <span className="rounded-lg border border-outline-variant/50 px-3 py-2 text-xs font-bold text-on-surface-variant">
                {withdrawals.length} requests
              </span>
            </div>

            {isLoading ? (
              <div className="rounded-lg border border-outline-variant/40 bg-surface-container-lowest p-6 text-sm font-medium text-on-surface-variant">
                Loading withdrawal history...
              </div>
            ) : withdrawals.length === 0 ? (
              <div className="rounded-lg border border-outline-variant/40 bg-surface-container-lowest p-8 text-sm font-medium text-on-surface-variant">
                You do not have any withdrawal requests yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-outline-variant/50 text-xs uppercase tracking-[0.12em] text-outline">
                      <th className="px-3 py-3">No.</th>
                      <th className="px-3 py-3">Amount</th>
                      <th className="px-3 py-3">Cash Received</th>
                      <th className="px-3 py-3">Status</th>
                      <th className="px-3 py-3">Created At</th>
                      <th className="px-3 py-3" aria-label="Actions" />
                    </tr>
                  </thead>
                  <tbody>
                    {withdrawals.map((withdrawal, index) => {
                      const withdrawalId = getWithdrawalId(withdrawal, index);
                      const originalAmount = getOriginalAmount(withdrawal);
                      const netAmount = getNetAmount(withdrawal);

                      return (
                        <tr key={`${withdrawalId}-${index}`} className="border-b border-outline-variant/20">
                          <td className="px-3 py-4 font-semibold text-on-surface">{index + 1}</td>
                          <td className="whitespace-nowrap px-3 py-4 text-on-surface-variant">
                            {originalAmount === undefined ? '-' : formatCurrency(originalAmount)}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 font-semibold text-on-surface">
                            {netAmount === undefined ? '-' : formatCurrency(netAmount)}
                          </td>
                          <td className="px-3 py-4">
                            <span className={`inline-flex whitespace-nowrap rounded-full border px-3 py-1 text-xs font-bold ${statusClassName(withdrawal.status)}`}>
                              {statusLabel(withdrawal.status)}
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-on-surface-variant">
                            {formatDateTime(withdrawal.createdAt)}
                          </td>
                          <td className="px-3 py-4">
                            <Link
                              to={`/wallet/withdrawals/${encodeURIComponent(String(withdrawalId))}`}
                              state={{ requestNo: index + 1 }}
                              title="View details"
                              aria-label={`View request ${withdrawalId}`}
                              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary transition hover:bg-primary/15"
                            >
                              <Eye className="h-4 w-4" />
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </motion.section>
        </div>
      </section>
    </main>
  );
};

const SummaryItem = ({ label, value, emphasized = false }: { label: string; value: string; emphasized?: boolean }) => (
  <div className="rounded-lg border border-outline-variant/50 bg-surface-container-lowest p-4">
    <p className="text-xs font-bold uppercase tracking-[0.12em] text-outline">{label}</p>
    <p className={`mt-2 text-xl font-bold ${emphasized ? 'text-primary' : 'text-on-surface'}`}>{value}</p>
  </div>
);

export default WalletWithdrawalsPage;
