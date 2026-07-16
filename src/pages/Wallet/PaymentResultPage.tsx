import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'motion/react';
import { CheckCircle2, CircleX, Wallet } from 'lucide-react';
import { PageShell } from '../../components/ui';

const revealUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0 },
};

const PaymentResultPage = () => {
  const [searchParams] = useSearchParams();
  const isSuccess = searchParams.get('success') === 'true';
  const txnRef = searchParams.get('txnRef');
  const pointsAddedValue = Number(searchParams.get('pointsAdded'));
  const pointsAdded = Number.isFinite(pointsAddedValue)
    ? new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 }).format(pointsAddedValue)
    : undefined;
  const transactionStatus = searchParams.get('transactionStatus');
  const transactionStatusLabel = transactionStatus?.toUpperCase();
  const message = searchParams.get('message');

  return (
    <PageShell>
      <section className="mx-auto flex max-w-[960px] py-8">
        <motion.div
          className="w-full rounded-lg border border-line bg-white p-6 shadow-sm sm:p-8"
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
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-outline">Transaction ref</p>
              <p className="mt-2 break-words text-base font-bold text-on-surface">{txnRef ?? '-'}</p>
            </div>
            <div className="rounded-lg border border-outline-variant/50 bg-surface-container-lowest p-4">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-outline">Points added</p>
              <p className="mt-2 text-base font-bold text-primary">{pointsAdded ?? '-'}</p>
            </div>
            <div className="rounded-lg border border-outline-variant/50 bg-surface-container-lowest p-4">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-outline">Transaction status</p>
              <p className="mt-2 text-base font-bold text-on-surface">{transactionStatusLabel ?? '-'}</p>
            </div>
          </div>

          <div className="mt-5 rounded-lg border border-outline-variant/50 bg-surface-container-lowest px-4 py-3 text-sm font-semibold text-on-surface-variant">
            {message || 'Payment return received.'}
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              to="/wallet"
              className="inline-flex items-center justify-center rounded-lg bg-primary px-5 py-3 text-sm font-bold text-on-primary transition hover:bg-primary/90"
            >
              Back to wallet
            </Link>
            <Link
              to="/prediction"
              className="inline-flex items-center justify-center rounded-lg border border-outline-variant px-5 py-3 text-sm font-bold text-on-surface-variant transition hover:border-primary hover:text-primary"
            >
              Go to predictions
            </Link>
          </div>
        </motion.div>
      </section>
    </PageShell>
  );
};

export default PaymentResultPage;
