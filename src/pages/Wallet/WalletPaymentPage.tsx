import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowUpRight, CreditCard, Landmark, Loader2, QrCode, RefreshCw, Wallet } from 'lucide-react';
import { getApiErrorMessage } from '../../services/apiClient';
import { paymentProviders, paymentService, type PaymentProviderId } from '../../services/paymentService';
import { walletService } from '../../services/walletService';

const amountOptions = [10000, 20000, 50000, 100000];

const revealContainer = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const revealUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0 },
};

const formatCurrency = (value: number) => new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
  maximumFractionDigits: 0,
}).format(value);

const formatPoints = (value: number) => new Intl.NumberFormat('vi-VN', {
  maximumFractionDigits: 0,
}).format(value);

const WalletPaymentPage = () => {
  const [amount, setAmount] = useState(10000);
  const [selectedProvider, setSelectedProvider] = useState<PaymentProviderId>('zalopay');
  const [walletBalance, setWalletBalance] = useState<number | undefined>();
  const [walletStatus, setWalletStatus] = useState('');
  const [isLoadingWallet, setIsLoadingWallet] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const selectedAmountLabel = useMemo(() => formatCurrency(amount), [amount]);
  const selectedProviderInfo = useMemo(
    () => paymentProviders.find((provider) => provider.id === selectedProvider) ?? paymentProviders[0],
    [selectedProvider],
  );

  const loadWallet = async () => {
    setIsLoadingWallet(true);
    setErrorMessage('');

    try {
      const overview = await walletService.getWalletOverview();
      setWalletBalance(overview.wallet?.pointBalance);
      setWalletStatus(overview.wallet?.status ?? '');
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, 'Unable to load wallet.'));
      setWalletBalance(undefined);
      setWalletStatus('');
    } finally {
      setIsLoadingWallet(false);
    }
  };

  useEffect(() => {
    void loadWallet();
  }, []);

  const handleCreatePayment = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!Number.isFinite(amount) || amount < 10000) {
      setErrorMessage('Minimum top-up amount is 10.000 VND.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const response = await paymentService.createPayment(selectedProvider, { amount, locale: 'vn' });
      const paymentUrl = response.paymentUrl ?? response.payUrl ?? response.deeplink ?? response.qrCodeUrl;

      if (!paymentUrl || typeof paymentUrl !== 'string') {
        throw new Error('Payment URL was not returned.');
      }

      window.location.href = paymentUrl;
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, `Could not create ${selectedProviderInfo.label} payment.`));
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-surface text-on-surface">
      <section className="mx-auto max-w-[1440px] px-4 py-10 md:px-8">
        <motion.div
          className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"
          initial="hidden"
          animate="visible"
          variants={revealUp}
        >
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-secondary">Wallet</p>
            <h1 className="mt-2 font-display text-3xl font-bold text-on-surface md:text-4xl">Racing wallet</h1>
          </div>
            <div className="flex flex-wrap gap-3">
              <Link
                to="/wallet/history"
                className="inline-flex items-center justify-center rounded-lg border border-outline-variant px-4 py-3 text-sm font-bold text-on-surface-variant transition hover:border-primary hover:text-primary"
              >
                View top-up history
              </Link>
              <motion.button
                type="button"
                onClick={() => void loadWallet()}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-outline-variant px-4 py-3 text-sm font-bold text-on-surface-variant transition hover:border-primary hover:text-primary"
                whileHover={{ y: -1 }}
                whileTap={{ scale: 0.98 }}
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </motion.button>
            </div>
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

        <motion.div
          className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]"
          initial="hidden"
          animate="visible"
          variants={revealContainer}
        >
          <motion.section
            className="rounded-xl border border-outline-variant/70 bg-surface-container-low p-6"
            variants={revealUp}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-secondary">Available points</p>
                <h2 className="mt-3 font-display text-4xl font-bold text-primary tabular-nums">
                  {isLoadingWallet ? '...' : walletBalance === undefined ? '-' : formatPoints(walletBalance)}
                </h2>
              </div>
              <div className="rounded-xl bg-primary/15 p-3">
                <Wallet className="h-6 w-6 text-primary" />
              </div>
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <div className="rounded-lg border border-outline-variant/50 bg-surface-container-lowest p-4">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-outline">Wallet status</p>
                <p className="mt-2 text-lg font-bold capitalize text-secondary">{walletStatus || '-'}</p>
              </div>
              <div className="rounded-lg border border-outline-variant/50 bg-surface-container-lowest p-4">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-outline">Selected payment</p>
                <p className="mt-2 text-lg font-bold text-on-surface">{selectedAmountLabel}</p>
                <p className="mt-1 text-xs font-semibold text-on-surface-variant">{selectedProviderInfo.label}</p>
              </div>
            </div>
          </motion.section>

          <motion.section
            className="rounded-xl border border-outline-variant/70 bg-surface-container-low p-6"
            variants={revealUp}
          >
            <div className="mb-6 flex items-center gap-3">
              <CreditCard className="h-5 w-5 text-secondary" />
              <h2 className="font-display text-2xl font-bold text-on-surface">Top up wallet</h2>
            </div>

            <form onSubmit={handleCreatePayment} className="grid gap-5">
              <div className="grid gap-3">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-outline">Payment gateway</p>
                <div className="grid gap-3 md:grid-cols-2">
                  {paymentProviders.map((provider) => {
                    const isSelected = selectedProvider === provider.id;
                    const Icon = provider.id === 'zalopay' ? QrCode : Landmark;

                    return (
                      <button
                        key={provider.id}
                        type="button"
                        onClick={() => setSelectedProvider(provider.id)}
                        className={`flex min-h-[116px] flex-col items-start justify-between rounded-lg border p-4 text-left transition ${
                          isSelected
                            ? 'border-primary bg-primary/10 text-on-surface shadow-sm'
                            : 'border-outline-variant bg-surface-container-lowest text-on-surface-variant hover:border-primary hover:text-primary'
                        }`}
                      >
                        <span className={`rounded-lg p-2 ${isSelected ? 'bg-primary text-on-primary' : 'bg-surface-container-low text-secondary'}`}>
                          <Icon className="h-5 w-5" />
                        </span>
                        <span>
                          <span className="block text-sm font-bold">{provider.label}</span>
                          <span className="mt-1 block text-xs font-medium leading-5 text-on-surface-variant">{provider.description}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid gap-2">
                <label htmlFor="wallet-amount" className="text-xs font-bold uppercase tracking-[0.16em] text-outline">
                  Amount
                </label>
                <input
                  id="wallet-amount"
                  type="number"
                  min={10000}
                  step={1000}
                  value={amount}
                  onChange={(event) => setAmount(Number(event.target.value))}
                  className="rounded-lg border border-outline-variant bg-surface-container-lowest px-4 py-3 text-base font-semibold text-on-surface outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                {amountOptions.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setAmount(option)}
                    className={`rounded-lg border px-3 py-3 text-sm font-bold transition ${
                      amount === option
                        ? 'border-primary bg-primary text-on-primary'
                        : 'border-outline-variant bg-surface-container-lowest text-on-surface-variant hover:border-primary hover:text-primary'
                    }`}
                  >
                    {formatCurrency(option)}
                  </button>
                ))}
              </div>

              <motion.button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-secondary px-5 py-3 text-sm font-bold text-on-secondary transition hover:bg-secondary/90 disabled:cursor-not-allowed disabled:opacity-60"
                whileHover={{ y: isSubmitting ? 0 : -1 }}
                whileTap={{ scale: isSubmitting ? 1 : 0.98 }}
              >
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUpRight className="h-4 w-4" />}
                Continue to {selectedProviderInfo.shortLabel}
              </motion.button>
            </form>
          </motion.section>
        </motion.div>
      </section>
    </main>
  );
};

export default WalletPaymentPage;
