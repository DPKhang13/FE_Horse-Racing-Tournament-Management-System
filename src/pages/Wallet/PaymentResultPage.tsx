import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { motion } from 'motion/react';
import { CheckCircle2, CircleX, Wallet } from 'lucide-react';
import { getApiErrorMessage } from '../../services/apiClient';
import { paymentService, type VnpayReturnResponse } from '../../services/paymentService';

const revealUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0 },
};

const PaymentResultPage = () => {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [returnResult, setReturnResult] = useState<VnpayReturnResponse>();
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState('');
  const responseCode = returnResult?.responseCode ?? searchParams.get('vnp_ResponseCode');
  const transactionStatus = returnResult?.transactionStatus ?? searchParams.get('vnp_TransactionStatus');
  const txnRef = returnResult?.txnRef ?? returnResult?.transactionRef ?? searchParams.get('vnp_TxnRef') ?? searchParams.get('txnRef');
  const amountValue = Number(searchParams.get('vnp_Amount'));
  const amount = Number.isFinite(amountValue) && amountValue > 0 ? amountValue / 100 : undefined;
  const isSuccess = useMemo(() => {
    if (returnResult?.success !== undefined) {
      return returnResult.success;
    }

    return responseCode === '00' && (!transactionStatus || transactionStatus === '00');
  }, [responseCode, returnResult?.success, transactionStatus]);

  useEffect(() => {
    if (!location.search) {
      return;
    }

    let isMounted = true;

    const syncPaymentReturn = async () => {
      setIsSyncing(true);
      setSyncError('');

      try {
        const result = await paymentService.handleVnpayReturn(location.search);

        if (isMounted) {
          setReturnResult(result);
        }
      } catch (error) {
        if (isMounted) {
          setSyncError(getApiErrorMessage(error, 'Could not confirm payment with the server.'));
        }
      } finally {
        if (isMounted) {
          setIsSyncing(false);
        }
      }
    };

    void syncPaymentReturn();

    return () => {
      isMounted = false;
    };
  }, [location.search]);

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
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-outline">Transaction ref</p>
              <p className="mt-2 break-words text-base font-bold text-on-surface">{txnRef ?? '-'}</p>
            </div>
            <div className="rounded-lg border border-outline-variant/50 bg-surface-container-lowest p-4">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-outline">Response code</p>
              <p className="mt-2 text-base font-bold text-on-surface">{responseCode ?? '-'}</p>
            </div>
            <div className="rounded-lg border border-outline-variant/50 bg-surface-container-lowest p-4">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-outline">Amount</p>
              <p className="mt-2 text-base font-bold text-primary">
                {amount === undefined
                  ? '-'
                  : new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(amount)}
              </p>
            </div>
          </div>

          <div className="mt-5 rounded-lg border border-outline-variant/50 bg-surface-container-lowest px-4 py-3 text-sm font-semibold text-on-surface-variant">
            {isSyncing
              ? 'Confirming payment with server...'
              : syncError || returnResult?.message || 'Payment return confirmed.'}
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
    </main>
  );
};

export default PaymentResultPage;
