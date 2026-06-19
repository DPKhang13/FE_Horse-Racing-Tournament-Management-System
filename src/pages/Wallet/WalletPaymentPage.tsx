import { useState, type FormEvent } from 'react';
import { CreditCard, ExternalLink } from 'lucide-react';
import { getApiErrorMessage } from '../../services/apiClient';
import { paymentService, type VnpayPaymentResponse } from '../../services/paymentService';

const WalletPaymentPage = () => {
  const [amount, setAmount] = useState(10000);
  const [bankCode, setBankCode] = useState('');
  const [locale, setLocale] = useState('vn');
  const [payment, setPayment] = useState<VnpayPaymentResponse | undefined>();
  const [errorMessage, setErrorMessage] = useState('');

  const handleCreatePayment = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage('');
    setPayment(undefined);

    try {
      const response = await paymentService.createVnpayPayment({ amount, bankCode, locale });
      setPayment(response);
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, 'Could not create VNPay payment.'));
    }
  };

  return (
    <div className="min-h-screen bg-surface py-12">
      <div className="mx-auto max-w-container px-4 md:px-margin-desktop">
        <div className="mb-10">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-secondary">Wallet</p>
          <h1 className="mt-2 text-headline-lg font-bold text-primary">VNPay top-up</h1>
        </div>

        {errorMessage && (
          <div className="mb-6 rounded-md border border-error/30 bg-error-container/20 px-4 py-3 text-body-sm font-semibold text-error">{errorMessage}</div>
        )}

        <div className="grid gap-8 xl:grid-cols-[0.75fr_1.25fr]">
          <section className="rounded-xl border border-outline-variant bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center gap-3">
              <CreditCard className="h-5 w-5 text-secondary" />
              <h2 className="text-title-large font-bold text-primary">Create payment</h2>
            </div>
            <form onSubmit={handleCreatePayment} className="grid gap-4">
              <label className="grid gap-2">
                <span className="text-label-sm font-bold uppercase tracking-wider text-outline">Amount</span>
                <input type="number" min={10000} value={amount} onChange={(event) => setAmount(Number(event.target.value))} className="rounded-md border border-outline-variant bg-surface-container-low px-4 py-3 text-body-sm focus:border-primary focus:outline-none" />
              </label>
              <label className="grid gap-2">
                <span className="text-label-sm font-bold uppercase tracking-wider text-outline">Bank code</span>
                <select value={bankCode} onChange={(event) => setBankCode(event.target.value)} className="rounded-md border border-outline-variant bg-surface-container-low px-4 py-3 text-body-sm focus:border-primary focus:outline-none">
                  <option value="">Auto select</option>
                  <option value="VNPAYQR">VNPAYQR</option>
                  <option value="VNBANK">VNBANK</option>
                  <option value="INTCARD">INTCARD</option>
                </select>
              </label>
              <label className="grid gap-2">
                <span className="text-label-sm font-bold uppercase tracking-wider text-outline">Locale</span>
                <select value={locale} onChange={(event) => setLocale(event.target.value)} className="rounded-md border border-outline-variant bg-surface-container-low px-4 py-3 text-body-sm focus:border-primary focus:outline-none">
                  <option value="vn">Vietnamese</option>
                  <option value="en">English</option>
                </select>
              </label>
              <button className="rounded-md bg-secondary px-5 py-3 text-body-sm font-bold text-white hover:bg-opacity-90">Create VNPay URL</button>
            </form>
          </section>

          <section className="rounded-xl border border-outline-variant bg-white p-6 shadow-sm">
            <h2 className="mb-5 text-title-large font-bold text-primary">Payment response</h2>
            {payment ? (
              <div className="space-y-4">
                <div className="rounded-lg border border-outline-variant bg-surface-container-low p-4">
                  <p className="text-label-sm font-bold uppercase tracking-wider text-outline">Transaction ref</p>
                  <p className="mt-2 text-body-md font-semibold text-primary">{payment.transactionRef ?? '-'}</p>
                </div>
                {payment.paymentUrl && (
                  <a href={payment.paymentUrl} className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-3 text-body-sm font-bold text-on-primary hover:bg-opacity-90">
                    Open VNPay
                    <ExternalLink className="h-4 w-4" />
                  </a>
                )}
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-outline-variant bg-surface-container-low p-8 text-body-sm text-on-surface-variant">
                Create a payment to receive the VNPay redirect URL and transaction reference.
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};

export default WalletPaymentPage;
