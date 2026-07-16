import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowLeft } from 'lucide-react';
import { getApiErrorMessage } from '../../services/apiClient';
import { paymentService, type VnpayTransactionDetail } from '../../services/paymentService';

const formatCurrency = (value: number) => new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
  maximumFractionDigits: 0,
}).format(value);

const formatDate = (value: unknown) => {
  if (value === undefined || value === null || value === '') {
    return '-';
  }

  const rawValue = String(value);
  const isoDateMatch = rawValue.match(/^(\d{4})-(\d{2})-(\d{2})/);

  if (isoDateMatch) {
    const [, year, month, day] = isoDateMatch;
    return `${day}/${month}/${year}`;
  }

  const date = new Date(rawValue);

  if (Number.isNaN(date.getTime())) {
    return rawValue;
  }

  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
};

const WalletTransactionDetailPage = () => {
  const { txId } = useParams<{ txId: string }>();
  const [transaction, setTransaction] = useState<VnpayTransactionDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!txId) {
      setError('Missing transaction ID.');
      setIsLoading(false);
      return;
    }

    let isMounted = true;

    const loadTransaction = async () => {
      setIsLoading(true);
      setError('');

      try {
        const transactionDetail = await paymentService.getVnpayTransaction(txId);

        if (isMounted) {
          setTransaction(transactionDetail);
        }
      } catch (loadError) {
        if (isMounted) {
          setError(getApiErrorMessage(loadError, 'Không thể tải chi tiết giao dịch.'));
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void loadTransaction();

    return () => {
      isMounted = false;
    };
  }, [txId]);

  const amount = transaction?.cashAmount ?? transaction?.amount ?? transaction?.totalAmount ?? transaction?.value;
  const pointsAmount = transaction?.pointsAmount;

  return (
    <main className="min-h-screen bg-surface text-on-surface">
      <section className="mx-auto max-w-[1140px] px-4 py-10 md:px-8">
        <motion.div
          className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-secondary">Wallet</p>
            <h1 className="mt-2 font-display text-3xl font-bold text-on-surface md:text-4xl">Chi tiết giao dịch</h1>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              to="/wallet/history"
              className="inline-flex items-center gap-2 rounded-lg border border-outline-variant px-4 py-3 text-sm font-bold text-on-surface-variant transition hover:border-primary hover:text-primary"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to history
            </Link>
          </div>
        </motion.div>

        {error && (
          <motion.div
            className="mb-6 rounded-lg border border-error/40 bg-error-container/20 px-4 py-3 text-sm font-semibold text-error"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {error}
          </motion.div>
        )}

        <motion.div
          className="rounded-xl border border-outline-variant/70 bg-surface-container-low p-6"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {isLoading ? (
            <div className="rounded-xl border border-outline-variant/40 bg-surface-container-lowest p-6 text-sm font-medium text-on-surface-variant">
              Loading transaction details...
            </div>
          ) : transaction ? (
            <div className="grid gap-6 sm:grid-cols-[1fr_1fr]">
              <div className="rounded-xl border border-outline-variant/50 bg-surface-container-lowest p-6">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-outline">Transaction ID</p>
                <p className="mt-3 text-base font-semibold text-on-surface">{transaction.txId ?? transaction.transactionId ?? transaction.txnRef ?? transaction.transactionRef ?? '-'}</p>
              </div>
              <div className="rounded-xl border border-outline-variant/50 bg-surface-container-lowest p-6">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-outline">Status</p>
                <p className="mt-3 text-base font-semibold text-secondary">{transaction.status ?? transaction.transactionStatus ?? transaction.responseCode ?? '-'}</p>
              </div>
              <div className="rounded-xl border border-outline-variant/50 bg-surface-container-lowest p-6">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-outline">Amount</p>
                <p className="mt-3 text-base font-semibold text-primary">{amount === undefined ? '-' : formatCurrency(amount)}</p>
              </div>
              <div className="rounded-xl border border-outline-variant/50 bg-surface-container-lowest p-6">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-outline">Points</p>
                <p className="mt-3 text-base font-semibold text-primary">
                  {pointsAmount === undefined ? '-' : `${pointsAmount.toLocaleString('vi-VN')} pts`}
                </p>
              </div>
              <div className="rounded-xl border border-outline-variant/50 bg-surface-container-lowest p-6">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-outline">Payment date</p>
                <p className="mt-3 text-base font-semibold text-on-surface">{formatDate(transaction.payDate ?? transaction.createdAt ?? transaction.updatedAt)}</p>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-outline-variant/40 bg-surface-container-lowest p-6 text-sm font-medium text-on-surface-variant">
              No transaction details available.
            </div>
          )}
        </motion.div>
      </section>
    </main>
  );
};

export default WalletTransactionDetailPage;
