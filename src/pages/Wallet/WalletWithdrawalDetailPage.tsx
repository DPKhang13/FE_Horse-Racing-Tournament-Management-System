import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowLeft, CheckCircle2, Loader2, WalletCards } from 'lucide-react';
import { getApiErrorMessage } from '../../services/apiClient';
import { withdrawalService, type Withdrawal } from '../../services/withdrawalService';

const WITHDRAWAL_TAX_RATE = 0.1;

const formatCurrency = (value: number) => new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
  maximumFractionDigits: 0,
}).format(value);

const parseAmount = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

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

const normalizeStatus = (status: unknown) => String(status ?? 'pending').trim().toLowerCase();
const isPendingStatus = (status: unknown) => normalizeStatus(status) === 'pending';
const isApprovedStatus = (status: unknown) => ['approve', 'approved'].includes(normalizeStatus(status));
const isPickupReadyStatus = (status: unknown) => ['approve', 'approved', 'paid', 'completed'].includes(normalizeStatus(status));
const isPaidStatus = (status: unknown) => ['paid', 'completed'].includes(normalizeStatus(status));
const isRejectedStatus = (status: unknown) =>
  ['reject', 'rejected', 'cancelled', 'canceled', 'failed'].includes(normalizeStatus(status));

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

const WalletWithdrawalDetailPage = () => {
  const { withdrawalId } = useParams();
  const [withdrawal, setWithdrawal] = useState<Withdrawal | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  const amounts = useMemo(() => {
    const original = parseAmount(withdrawal?.grossCashAmount ?? withdrawal?.originalAmount ?? withdrawal?.amount);
    const tax = parseAmount(withdrawal?.taxAmount) ?? (original === undefined ? undefined : original * WITHDRAWAL_TAX_RATE);
    const netFromApi = parseAmount(
      withdrawal?.netCashAmount ?? withdrawal?.netAmount ?? withdrawal?.receivedAmount ?? withdrawal?.actualAmount,
    );
    const net = netFromApi ?? (original === undefined ? undefined : original - (tax ?? 0));

    return { original, tax, net };
  }, [withdrawal]);

  const lastUpdatedAt = withdrawal?.paidAt ?? withdrawal?.approvedAt ?? withdrawal?.rejectedAt ?? withdrawal?.updatedAt;
  const rejectionReason = withdrawal?.rejectReason ?? withdrawal?.reason;
  const paymentNote = withdrawal?.paymentNote ?? withdrawal?.adminNote ?? withdrawal?.note;

  useEffect(() => {
    let isMounted = true;

    const loadWithdrawal = async () => {
      if (!withdrawalId) {
        setErrorMessage('Missing withdrawal request ID.');
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setErrorMessage('');

      try {
        const detail = await withdrawalService.getMyWithdrawal(withdrawalId);
        if (isMounted) setWithdrawal(detail);
      } catch (error) {
        if (isMounted) {
          setErrorMessage(getApiErrorMessage(error, 'Unable to load withdrawal request details.'));
          setWithdrawal(null);
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    void loadWithdrawal();
    return () => {
      isMounted = false;
    };
  }, [withdrawalId]);

  return (
    <main className="min-h-screen bg-surface text-on-surface">
      <section className="mx-auto max-w-[960px] px-4 py-10 md:px-8">
        <motion.div
          className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-secondary">My Wallet</p>
            <h1 className="mt-2 font-display text-3xl font-bold text-on-surface md:text-4xl">Withdrawal Details</h1>
          </div>

          <Link
            to="/wallet/withdrawals"
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-outline-variant px-4 py-3 text-sm font-bold text-on-surface-variant transition hover:border-primary hover:text-primary"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to History
          </Link>
        </motion.div>

        {errorMessage && (
          <motion.div
            className="mb-6 rounded-lg border border-error/40 bg-error-container/20 px-4 py-3 text-sm font-semibold text-error"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {errorMessage}
          </motion.div>
        )}

        {withdrawal && isApprovedStatus(withdrawal.status) && withdrawal.pickupCode && (
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
                  <p><span className="text-on-secondary-container/70">Pickup code:</span> {withdrawal.pickupCode ?? '-'}</p>
                  <p><span className="text-on-secondary-container/70">Location:</span> {withdrawal.payoutLocation ?? '-'}</p>
                  <p><span className="text-on-secondary-container/70">Counter:</span> {withdrawal.payoutCounter ?? '-'}</p>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        <motion.section
          className="rounded-lg border border-outline-variant/70 bg-surface-container-low p-6"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {isLoading ? (
            <div className="flex items-center gap-3 rounded-lg border border-outline-variant/40 bg-surface-container-lowest p-6 text-sm font-medium text-on-surface-variant">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              Loading details...
            </div>
          ) : withdrawal ? (
            <>
              <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="rounded-lg bg-primary/15 p-3">
                    <WalletCards className="h-6 w-6 text-primary" />
                  </span>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-outline">Request ID</p>
                    <p className="mt-1 text-xl font-bold text-on-surface">
                      {withdrawal.withdrawalId ?? withdrawal.id ?? withdrawalId}
                    </p>
                  </div>
                </div>
                <span className={`inline-flex rounded-full border px-4 py-2 text-sm font-bold ${statusClassName(withdrawal.status)}`}>
                  {statusLabel(withdrawal.status)}
                </span>
              </div>

              {isPendingStatus(withdrawal.status) && (
                <div className="mb-6 rounded-lg border border-primary/25 bg-primary/10 px-4 py-3 text-sm font-semibold text-primary">
                  Waiting for admin approval. Your points are locked until this request is approved or rejected.
                </div>
              )}

              {isApprovedStatus(withdrawal.status) && withdrawal.pickupCode && (
                <div className="mb-6 rounded-lg border border-secondary/30 bg-secondary/10 px-4 py-3 text-sm font-semibold text-secondary">
                  Bring this pickup code to the payout counter to collect your cash.
                </div>
              )}

              {isPaidStatus(withdrawal.status) && (
                <div className="mb-6 rounded-lg border border-secondary/30 bg-secondary/10 px-4 py-3 text-sm font-semibold text-secondary">
                  Cash payment has been completed for this withdrawal request.
                </div>
              )}

              {isRejectedStatus(withdrawal.status) && (
                <div className="mb-6 rounded-lg border border-error/30 bg-error-container/20 px-4 py-3 text-sm font-semibold text-error">
                  This withdrawal request was not approved. Any locked points should be returned to your wallet.
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <DetailItem
                  label="Points Used"
                  value={withdrawal.requestedPoints === undefined ? '-' : `${Number(withdrawal.requestedPoints).toLocaleString('vi-VN')} points`}
                />
                <DetailItem label="Requested Amount" value={amounts.original === undefined ? '-' : formatCurrency(amounts.original)} />
                <DetailItem label="Tax (10%)" value={amounts.tax === undefined ? '-' : formatCurrency(amounts.tax)} />
                <DetailItem label="Cash Received" value={amounts.net === undefined ? '-' : formatCurrency(amounts.net)} emphasized />
                <DetailItem label="Created At" value={formatDateTime(withdrawal.createdAt)} />
                {lastUpdatedAt && <DetailItem label="Last Updated" value={formatDateTime(lastUpdatedAt)} />}
                {isPickupReadyStatus(withdrawal.status) && (
                  <>
                    <DetailItem
                      label="Pickup Code"
                      value={withdrawal.pickupCode ?? '-'}
                      emphasized={Boolean(withdrawal.pickupCode)}
                    />
                    <DetailItem label="Pickup Location" value={withdrawal.payoutLocation ?? '-'} />
                    <DetailItem label="Payout Counter" value={withdrawal.payoutCounter ?? '-'} />
                  </>
                )}
                {isPaidStatus(withdrawal.status) && <DetailItem label="Invoice Number" value={withdrawal.invoiceNumber ?? '-'} />}
                {isPaidStatus(withdrawal.status) && paymentNote && <DetailItem label="Payment Note" value={paymentNote} />}
                {isRejectedStatus(withdrawal.status) && <DetailItem label="Rejection Reason" value={rejectionReason ?? '-'} />}
              </div>
            </>
          ) : (
            <div className="rounded-lg border border-outline-variant/40 bg-surface-container-lowest p-8 text-sm font-medium text-on-surface-variant">
              Withdrawal request information was not found.
            </div>
          )}
        </motion.section>
      </section>
    </main>
  );
};

const DetailItem = ({ label, value, emphasized = false }: { label: string; value: unknown; emphasized?: boolean }) => (
  <div className="rounded-lg border border-outline-variant/50 bg-surface-container-lowest p-4">
    <p className="text-xs font-bold uppercase tracking-[0.12em] text-outline">{label}</p>
    <p className={`mt-2 break-words text-base font-semibold ${emphasized ? 'text-secondary' : 'text-on-surface'}`}>
      {String(value)}
    </p>
  </div>
);

export default WalletWithdrawalDetailPage;
