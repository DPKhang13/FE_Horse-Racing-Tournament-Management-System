import { useEffect, useMemo } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { motion } from 'motion/react';
import { CheckCircle2, CircleX, Wallet } from 'lucide-react';
import { API_BASE_URL } from '../../services/apiClient';

const revealUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0 },
};

const VND_PER_POINT = 1000;

const PaymentResultPage = () => {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const hasRawVnpayReturn = searchParams.has('vnp_ResponseCode') || searchParams.has('vnp_TxnRef');
  const responseCode = searchParams.get('responseCode') ?? searchParams.get('vnp_ResponseCode');
  const transactionStatus =
    searchParams.get('transactionStatus') ??
    searchParams.get('vnpayTransactionStatus') ??
    searchParams.get('vnp_TransactionStatus');
  const txnRef = searchParams.get('txnRef') ?? searchParams.get('transactionRef') ?? searchParams.get('vnp_TxnRef');
  const amountParam = searchParams.get('amount') ?? searchParams.get('vnp_Amount');
  const amountValue = Number(amountParam);
  const pointsAdded = searchParams.get('pointsAdded');
  const message = searchParams.get('message');
  const pointsAddedNumber = pointsAdded === null ? Number.NaN : Number(pointsAdded);
  const amount = Number.isFinite(amountValue) && amountValue > 0
    ? searchParams.has('vnp_Amount') ? amountValue / 100 : amountValue
    : Number.isFinite(pointsAddedNumber) && pointsAddedNumber > 0
      ? pointsAddedNumber * VND_PER_POINT
      : undefined;
  const pointsAddedLabel = pointsAdded === null
    ? '-'
    : Number.isFinite(pointsAddedNumber)
      ? `${new Intl.NumberFormat('vi-VN').format(pointsAddedNumber)} pts`
      : `${pointsAdded} pts`;
  const isSuccess = useMemo(() => {
    const normalizedStatus = transactionStatus?.toLowerCase();

    if (searchParams.get('success') === 'true') {
      return true;
    }

    if (normalizedStatus === 'completed' || normalizedStatus === 'success') {
      return true;
    }

    return responseCode === '00' && (!transactionStatus || transactionStatus === '00');
  }, [responseCode, searchParams, transactionStatus]);

  useEffect(() => {
    if (!location.search || !hasRawVnpayReturn) {
      return;
    }

    window.location.replace(`${API_BASE_URL}/api/payments/vnpay/handle-payment-return${location.search}`);
  }, [hasRawVnpayReturn, location.search]);

  const statusMessage = hasRawVnpayReturn
    ? 'Confirming payment with server...'
    : isSuccess
      ? pointsAdded
        ? `Payment confirmed. ${pointsAddedLabel} added to your wallet.`
        : 'Payment confirmed. Your wallet will update shortly.'
      : message || 'Payment could not be completed.';

  return (
    <main className="min-h-screen bg-surface text-on-surface">
      <section className="mx-auto flex max-w-[960px] px-4 py-16 md:px-8">
        <motion.div
          className="w-full rounded-xl border border-outline-variant/70 bg-surface-container-low p-8"
          initial="hidden"
          animate="visible"
          variants={revealUp}
        >
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-4">
              <div className={`rounded-xl p-3 ${isSuccess ? 'bg-secondary-container/40' : 'bg-error-container/30'}`}>
                {isSuccess ? <CheckCircle2 className="h-7 w-7 text-secondary" /> : <CircleX className="h-7 w-7 text-error" />}
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-secondary">Payment result</p>
                <h1 className="mt-2 font-display text-3xl font-bold text-on-surface">
                  {isSuccess ? 'Payment successful' : 'Payment failed'}
                </h1>
              </div>
            </div>
            <Wallet className="h-7 w-7 text-primary" />
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <div className="rounded-lg border border-outline-variant/50 bg-surface-container-lowest p-4">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-outline">Amount</p>
              <p className="mt-2 text-base font-bold text-primary">
                {amount === undefined
                  ? '-'
                  : new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(amount)}
              </p>
            </div>
            <div className="rounded-lg border border-outline-variant/50 bg-surface-container-lowest p-4">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-outline">Transaction ref</p>
              <p className="mt-2 break-words text-base font-bold text-on-surface">{txnRef ?? '-'}</p>
            </div>
            <div className="rounded-lg border border-outline-variant/50 bg-surface-container-lowest p-4">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-outline">Points added</p>
              <p className="mt-2 text-base font-bold text-secondary">{pointsAddedLabel}</p>
            </div>
          </div>

          <div className="mt-5 rounded-lg border border-outline-variant/50 bg-surface-container-lowest px-4 py-3 text-sm font-semibold text-on-surface-variant">
            {statusMessage}
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              to="/wallet"
              className="inline-flex items-center justify-center rounded-lg bg-primary px-5 py-3 text-sm font-bold text-on-primary transition hover:bg-primary/90"
            >
              Back to wallet
            </Link>
            <Link
              to="/wallet/history"
              className="inline-flex items-center justify-center rounded-lg border border-outline-variant px-5 py-3 text-sm font-bold text-on-surface-variant transition hover:border-primary hover:text-primary"
            >
              View history
            </Link>
          </div>
        </motion.div>
      </section>
    </main>
  );
};

export default PaymentResultPage;
