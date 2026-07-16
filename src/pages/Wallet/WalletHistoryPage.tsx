import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowLeft, Wallet } from 'lucide-react';
import { getApiErrorMessage } from '../../services/apiClient';
import { paymentService, type VnpayTransactionSummary } from '../../services/paymentService';

const formatCurrency = (value: number) => new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
  maximumFractionDigits: 0,
}).format(value);

const parseAmount = (value: unknown) => {
  if (typeof value === 'number') {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  return undefined;
};

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

const WalletHistoryPage = () => {
  const [transactions, setTransactions] = useState<VnpayTransactionSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;

    const loadHistory = async () => {
      setIsLoading(true);
      setError('');

      try {
        const history = await paymentService.getCurrentUserVnpayTopupHistory();

        if (isMounted) {
          setTransactions(history);
        }
      } catch (loadError) {
        if (isMounted) {
          setError(getApiErrorMessage(loadError, 'Không thể tải lịch sử nạp tiền.'));
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void loadHistory();

    return () => {
      isMounted = false;
    };
  }, []);

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
            <h1 className="mt-2 font-display text-3xl font-bold text-on-surface md:text-4xl">Lịch sử nạp tiền</h1>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              to="/wallet"
              className="inline-flex items-center gap-2 rounded-lg border border-outline-variant px-4 py-3 text-sm font-bold text-on-surface-variant transition hover:border-primary hover:text-primary"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to wallet
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
          <div className="mb-6 flex items-center gap-3">
            <Wallet className="h-5 w-5 text-secondary" />
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-secondary">VNPay top-up history</p>
          </div>

          {isLoading ? (
            <div className="rounded-xl border border-outline-variant/40 bg-surface-container-lowest p-6 text-sm font-medium text-on-surface-variant">
              Loading history...
            </div>
          ) : transactions.length === 0 ? (
            <div className="rounded-xl border border-outline-variant/40 bg-surface-container-lowest p-8 text-sm font-medium text-on-surface-variant">
              Chưa có giao dịch nạp tiền nào.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-outline-variant/50 text-xs uppercase tracking-[0.18em] text-outline">
                    <th className="px-4 py-3">Transaction</th>
                    <th className="px-4 py-3">Amount</th>
                    <th className="px-4 py-3">Points</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((transaction, index) => {
                    const transactionId =
                      transaction.txId ?? transaction.transactionId ?? transaction.txnRef ?? transaction.transactionRef ?? `#${index + 1}`;
                    const amount = parseAmount(transaction.cashAmount ?? transaction.amount ?? transaction.totalAmount ?? transaction.value);
                    const points = parseAmount(transaction.pointsAmount);
                    const status = (transaction.status ?? transaction.responseCode ?? transaction.transactionStatus ?? 'Unknown') as string;
                    const date = formatDate(transaction.payDate ?? transaction.createdAt ?? transaction.updatedAt);
                    const txLink = encodeURIComponent(String(transactionId));

                    return (
                      <tr key={`${transactionId}-${index}`} className="border-b border-outline-variant/20">
                        <td className="px-4 py-4 font-semibold text-on-surface">{transactionId}</td>
                        <td className="px-4 py-4 text-on-surface-variant">
                          {amount === undefined ? '-' : formatCurrency(amount)}
                        </td>
                        <td className="px-4 py-4 text-on-surface-variant">
                          {points === undefined ? '-' : `${points.toLocaleString('vi-VN')} pts`}
                        </td>
                        <td className="px-4 py-4 text-on-surface-variant capitalize">{status}</td>
                        <td className="px-4 py-4 text-on-surface-variant">{date}</td>
                        <td className="px-4 py-4">
                          <Link
                            to={`/wallet/transactions/${txLink}`}
                            className="rounded-lg border border-primary/20 bg-primary/10 px-3 py-2 text-xs font-semibold text-primary transition hover:bg-primary/15"
                          >
                            View
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>
      </section>
    </main>
  );
};

export default WalletHistoryPage;
