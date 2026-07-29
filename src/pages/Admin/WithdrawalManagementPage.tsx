import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { motion } from 'motion/react';
import {
  AlertCircle,
  Ban,
  Banknote,
  CheckCircle2,
  Clock,
  Eye,
  Loader2,
  Mail,
  ReceiptText,
  RefreshCw,
  Search,
  ShieldCheck,
  WalletCards,
  X,
} from 'lucide-react';
import { getApiErrorMessage } from '../../services/apiClient';
import { withdrawalService } from '../../services/withdrawalService';
import { showToast } from '../../utils/toast';
import {
  withdrawalStatuses,
  type ApproveWithdrawalPayload,
  type MarkWithdrawalPaidPayload,
  type RejectWithdrawalPayload,
  type WithdrawalResponse,
  type WithdrawalStatus,
  type WithdrawalStatusFilter,
} from '../../types/withdrawal';

type SummaryCounts = Record<WithdrawalStatus, number | null>;
type DialogAction = 'approve' | 'reject' | 'mark-paid';
type ActiveDialog = {
  type: DialogAction;
  withdrawal: WithdrawalResponse;
} | null;

const statusTabs: { value: WithdrawalStatusFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'paid', label: 'Paid' },
  { value: 'rejected', label: 'Rejected' },
];

const defaultSummaryCounts: SummaryCounts = {
  pending: null,
  approved: null,
  paid: null,
  rejected: null,
};

const pageVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.34, ease: [0.22, 1, 0.36, 1] as const } },
};

const toFiniteNumber = (value: number | string | null | undefined): number | null => {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const numericValue = Number(String(value).replace(/,/g, '').trim());
  return Number.isFinite(numericValue) ? numericValue : null;
};

const formatInteger = (value: number | string | null | undefined, fallback = 'N/A') => {
  const numericValue = toFiniteNumber(value);

  if (numericValue === null) {
    return fallback;
  }

  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(numericValue);
};

const formatPoints = (value: number | string | null | undefined) => {
  const formatted = formatInteger(value, '-');
  return formatted === '-' ? '-' : `${formatted} pts`;
};

const formatCash = (value: number | string | null | undefined) => {
  const numericValue = toFiniteNumber(value);

  if (numericValue === null) {
    return 'N/A';
  }

  return `${new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 }).format(numericValue)} VND`;
};

const formatDecimal = (value: number | string | null | undefined) => {
  const numericValue = toFiniteNumber(value);

  if (numericValue === null) {
    return '-';
  }

  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 6,
  }).format(numericValue);
};

const formatDateTime = (value?: string | null) => {
  if (!value) {
    return '-';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const humanizeLabel = (value?: string | null, fallback = 'Unknown') => {
  const text = String(value ?? '').trim();

  if (!text) {
    return fallback;
  }

  return text
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
};

const normalizeStatus = (status?: string | null): WithdrawalStatus | 'unknown' => {
  const normalized = String(status ?? '').trim().toLowerCase();
  return withdrawalStatuses.includes(normalized as WithdrawalStatus) ? normalized as WithdrawalStatus : 'unknown';
};

const getWithdrawalLabel = (withdrawal: WithdrawalResponse) =>
  withdrawal.withdrawalId ? `WD-${String(withdrawal.withdrawalId).padStart(5, '0')}` : 'Missing ID';

const getSpectatorName = (withdrawal: WithdrawalResponse) =>
  withdrawal.userFullName || withdrawal.username || withdrawal.userEmail || (withdrawal.userId ? `Spectator #${withdrawal.userId}` : 'Unknown spectator');

const getInvoiceStatus = (withdrawal: WithdrawalResponse) => {
  if (withdrawal.invoiceEmailedAt) {
    return `Emailed to ${withdrawal.emailSentTo ?? withdrawal.userEmail ?? 'spectator'}`;
  }

  if (withdrawal.invoiceGeneratedAt) {
    return 'Generated, not emailed';
  }

  return 'Not generated';
};

const hasFinancialProcessingFields = (withdrawal: WithdrawalResponse) =>
  Boolean(withdrawal.withdrawalId && withdrawal.status && withdrawal.requestedPoints !== null && withdrawal.netCashAmount !== null);

const getMissingFields = (withdrawal: WithdrawalResponse) => {
  const missingFields: string[] = [];

  if (!withdrawal.withdrawalId) missingFields.push('withdrawalId');
  if (!withdrawal.status) missingFields.push('status');
  if (withdrawal.requestedPoints === null) missingFields.push('requestedPoints');
  if (withdrawal.netCashAmount === null) missingFields.push('netCashAmount');
  if (!withdrawal.createdAt) missingFields.push('createdAt');
  if (!withdrawal.userId && !withdrawal.userFullName && !withdrawal.username && !withdrawal.userEmail) missingFields.push('spectator');

  return missingFields;
};

const getEmptyMessage = (filter: WithdrawalStatusFilter) => {
  switch (filter) {
    case 'pending':
      return 'There are no pending withdrawal requests.';
    case 'approved':
      return 'There are no approved withdrawals awaiting cash payment.';
    case 'paid':
      return 'No paid withdrawals are available.';
    case 'rejected':
      return 'No rejected withdrawal requests are available.';
    default:
      return 'No withdrawal requests were found.';
  }
};

const WithdrawalManagementPage = () => {
  const [withdrawals, setWithdrawals] = useState<WithdrawalResponse[]>([]);
  const [activeStatus, setActiveStatus] = useState<WithdrawalStatusFilter>('all');
  const [summaryCounts, setSummaryCounts] = useState<SummaryCounts>(defaultSummaryCounts);
  const [searchText, setSearchText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [listError, setListError] = useState('');
  const [summaryError, setSummaryError] = useState('');
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null);
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<WithdrawalResponse | null>(null);
  const [activeDialog, setActiveDialog] = useState<ActiveDialog>(null);
  const [dialogError, setDialogError] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [payoutLocation, setPayoutLocation] = useState('');
  const [payoutCounter, setPayoutCounter] = useState('');
  const [pickupCode, setPickupCode] = useState('');
  const [paidNote, setPaidNote] = useState('');
  const [paidConfirmed, setPaidConfirmed] = useState(false);
  const [runningActionKey, setRunningActionKey] = useState('');
  const requestIdRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);

  const loadWithdrawals = useCallback(async (mode: 'initial' | 'refresh' = 'initial') => {
    const requestId = requestIdRef.current + 1;
    const controller = new AbortController();
    requestIdRef.current = requestId;
    abortRef.current?.abort();
    abortRef.current = controller;

    if (mode === 'initial') {
      setIsLoading(true);
    } else {
      setIsRefreshing(true);
    }

    setListError('');
    setSummaryError('');

    try {
      const currentStatus = activeStatus === 'all' ? undefined : activeStatus;
      const [currentList, summaryResults] = await Promise.all([
        withdrawalService.getAdminWithdrawals(currentStatus, controller.signal),
        Promise.allSettled(withdrawalStatuses.map((status) => withdrawalService.getAdminWithdrawals(status, controller.signal))),
      ]);

      if (requestId !== requestIdRef.current) {
        return;
      }

      const nextCounts = withdrawalStatuses.reduce<SummaryCounts>((counts, status, index) => {
        const result = summaryResults[index];
        return {
          ...counts,
          [status]: result?.status === 'fulfilled' ? result.value.length : null,
        };
      }, { ...defaultSummaryCounts });

      if (summaryResults.some((result) => result.status === 'rejected')) {
        setSummaryError('Some status totals could not be refreshed. The table is still using the selected status filter.');
      }

      setWithdrawals(currentList);
      setSummaryCounts(nextCounts);
      setLastUpdatedAt(new Date().toISOString());
    } catch (error) {
      if (controller.signal.aborted || requestId !== requestIdRef.current) {
        return;
      }

      const message = getApiErrorMessage(error, 'Unable to load withdrawal requests.');
      setListError(message);
      showToast({ tone: 'error', text: message });
    } finally {
      if (requestId === requestIdRef.current) {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    }
  }, [activeStatus]);

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      void loadWithdrawals('initial');
    }, 0);

    return () => {
      window.clearTimeout(timerId);
      abortRef.current?.abort();
    };
  }, [loadWithdrawals]);

  const visibleWithdrawals = useMemo(() => {
    const search = searchText.trim().toLowerCase();

    if (!search) {
      return withdrawals;
    }

    return withdrawals.filter((withdrawal) => [
      withdrawal.withdrawalId,
      withdrawal.userId,
      withdrawal.username,
      withdrawal.userFullName,
      withdrawal.userEmail,
      withdrawal.pickupCode,
      withdrawal.payoutLocation,
      withdrawal.payoutCounter,
    ].some((value) => String(value ?? '').toLowerCase().includes(search)));
  }, [searchText, withdrawals]);

  const missingFieldReport = useMemo(() => {
    const fields = new Set<string>();

    withdrawals.forEach((withdrawal) => {
      getMissingFields(withdrawal).forEach((field) => fields.add(field));
    });

    return Array.from(fields);
  }, [withdrawals]);

  const openDialog = (type: DialogAction, withdrawal: WithdrawalResponse) => {
    setDialogError('');
    setRejectReason('');
    setPayoutLocation('');
    setPayoutCounter('');
    setPickupCode('');
    setPaidNote('');
    setPaidConfirmed(false);
    setActiveDialog({ type, withdrawal });
  };

  const closeDialog = () => {
    if (runningActionKey) {
      return;
    }

    setActiveDialog(null);
    setDialogError('');
  };

  const runConfirmedAction = async (
    action: DialogAction,
    withdrawal: WithdrawalResponse,
    payload?: ApproveWithdrawalPayload | RejectWithdrawalPayload | MarkWithdrawalPaidPayload,
  ) => {
    if (!withdrawal.withdrawalId) {
      setDialogError('Withdrawal ID is missing. This request cannot be processed safely.');
      return;
    }

    const actionKey = `${withdrawal.withdrawalId}:${action}`;
    setRunningActionKey(actionKey);
    setDialogError('');

    try {
      if (action === 'approve') {
        await withdrawalService.approveWithdrawal(withdrawal.withdrawalId, payload as ApproveWithdrawalPayload);
        showToast({ tone: 'success', text: 'Withdrawal approved.' });
      } else if (action === 'reject') {
        await withdrawalService.rejectWithdrawal(withdrawal.withdrawalId, payload as RejectWithdrawalPayload);
        showToast({ tone: 'success', text: 'Withdrawal rejected.' });
      } else {
        await withdrawalService.markWithdrawalAsPaid(withdrawal.withdrawalId, payload as MarkWithdrawalPaidPayload);
        showToast({ tone: 'success', text: 'Withdrawal marked as paid.' });
      }

      setActiveDialog(null);
      await loadWithdrawals('refresh');
    } catch (error) {
      setDialogError(getApiErrorMessage(error, 'Unable to complete this withdrawal action.'));
    } finally {
      setRunningActionKey('');
    }
  };

  const handleApproveSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (activeDialog?.type !== 'approve') {
      return;
    }

    const location = payoutLocation.trim();
    const counter = payoutCounter.trim();

    if (!location) {
      setDialogError('Payout location is required.');
      return;
    }

    if (!counter) {
      setDialogError('Payout counter is required.');
      return;
    }

    if (location.length > 255) {
      setDialogError('Payout location must not exceed 255 characters.');
      return;
    }

    if (counter.length > 100) {
      setDialogError('Payout counter must not exceed 100 characters.');
      return;
    }

    void runConfirmedAction('approve', activeDialog.withdrawal, {
      payoutLocation: location,
      payoutCounter: counter,
    });
  };

  const handleRejectSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (activeDialog?.type !== 'reject') {
      return;
    }

    const reason = rejectReason.trim();

    if (!reason) {
      setDialogError('Reject reason is required.');
      return;
    }

    if (reason.length > 255) {
      setDialogError('Reject reason must not exceed 255 characters.');
      return;
    }

    void runConfirmedAction('reject', activeDialog.withdrawal, { rejectReason: reason });
  };

  const handleMarkPaidSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (activeDialog?.type !== 'mark-paid') {
      return;
    }

    const submittedPickupCode = pickupCode.trim();
    const paymentNote = paidNote.trim();

    if (!paidConfirmed) {
      setDialogError('Confirm that the spectator received the cash payment.');
      return;
    }

    if (!submittedPickupCode) {
      setDialogError('Pickup code is required to verify this counter payment.');
      return;
    }

    if (submittedPickupCode.length > 100) {
      setDialogError('Pickup code must not exceed 100 characters.');
      return;
    }

    if (paymentNote.length > 255) {
      setDialogError('Payment note must not exceed 255 characters.');
      return;
    }

    void runConfirmedAction('mark-paid', activeDialog.withdrawal, {
      pickupCode: submittedPickupCode,
      paymentNote: paymentNote || undefined,
    });
  };

  const handleResendInvoice = async (withdrawal: WithdrawalResponse) => {
    if (!withdrawal.withdrawalId) {
      showToast({ tone: 'error', text: 'Withdrawal ID is missing. Invoice cannot be resent.' });
      return;
    }

    const actionKey = `${withdrawal.withdrawalId}:resend`;
    setRunningActionKey(actionKey);

    try {
      const updatedWithdrawal = await withdrawalService.resendWithdrawalInvoice(withdrawal.withdrawalId);
      setWithdrawals((current) => current.map((item) =>
        item.withdrawalId === updatedWithdrawal.withdrawalId ? updatedWithdrawal : item,
      ));
      setSelectedWithdrawal((current) =>
        current?.withdrawalId === updatedWithdrawal.withdrawalId ? updatedWithdrawal : current,
      );
      showToast({ tone: 'success', text: 'Invoice resent successfully by email.' });
    } catch (error) {
      showToast({
        tone: 'error',
        text: getApiErrorMessage(error, 'Unable to resend the invoice. Please try again.'),
      });
    } finally {
      setRunningActionKey('');
    }
  };

  return (
    <motion.div
      className="min-h-screen bg-surface py-8"
      variants={pageVariants}
      initial="hidden"
      animate="visible"
    >
      <div className="mx-auto max-w-[1440px] px-4 md:px-8">
        <section className="admin-surface-panel mb-6 rounded-lg p-6">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-secondary">Admin Finance</p>
              <h1 className="font-display mt-2 text-headline-lg font-extrabold text-primary">Withdrawal Management</h1>
              <p className="mt-2 max-w-3xl text-body-sm font-medium text-on-surface-variant">
                Review spectator withdrawal requests, approve valid requests, and confirm cash payments.
              </p>
              <div className="mt-4 inline-flex items-center gap-2 rounded-md border border-primary/20 bg-surface-container-low px-3 py-2 text-label-sm font-bold text-on-surface-variant">
                <Clock className="h-4 w-4 text-primary" />
                Last updated: {lastUpdatedAt ? formatDateTime(lastUpdatedAt) : 'Not loaded yet'}
              </div>
            </div>

            <button
              type="button"
              onClick={() => void loadWithdrawals('refresh')}
              disabled={isLoading || isRefreshing}
              aria-label="Refresh withdrawal requests"
              className="gold-gradient inline-flex items-center justify-center gap-2 rounded-md px-5 py-3 text-body-sm font-extrabold text-on-primary shadow-lg shadow-primary/15 transition-all disabled:cursor-not-allowed disabled:opacity-70"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading || isRefreshing ? 'animate-spin' : ''}`} />
              {isRefreshing ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </section>

        <section className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard icon={<Clock className="h-5 w-5" />} label="Pending Requests" value={summaryCounts.pending} isLoading={isLoading && !lastUpdatedAt} />
          <SummaryCard icon={<ShieldCheck className="h-5 w-5" />} label="Approved - Awaiting Payment" value={summaryCounts.approved} isLoading={isLoading && !lastUpdatedAt} />
          <SummaryCard icon={<Banknote className="h-5 w-5" />} label="Paid Withdrawals" value={summaryCounts.paid} isLoading={isLoading && !lastUpdatedAt} />
          <SummaryCard icon={<Ban className="h-5 w-5" />} label="Rejected Requests" value={summaryCounts.rejected} isLoading={isLoading && !lastUpdatedAt} />
        </section>

        {summaryError && <StatusBanner tone="warning" text={summaryError} />}
        {missingFieldReport.length > 0 && (
          <StatusBanner
            tone="error"
            text={`Some withdrawal records are missing required processing fields: ${missingFieldReport.join(', ')}. Unsafe row actions are disabled.`}
          />
        )}
        {listError && <ErrorState message={listError} onRetry={() => void loadWithdrawals(withdrawals.length > 0 ? 'refresh' : 'initial')} />}

        <section className="admin-surface-panel overflow-hidden rounded-lg">
          <div className="border-b border-outline-variant p-5">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <p className="text-label-sm font-bold uppercase tracking-[0.18em] text-outline">Requests</p>
                <h2 className="mt-1 text-title-lg font-bold text-primary">{humanizeLabel(activeStatus === 'all' ? 'all withdrawals' : activeStatus)}</h2>
              </div>

              <label className="relative w-full xl:max-w-sm">
                <span className="sr-only">Search loaded withdrawal rows</span>
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-outline" />
                <input
                  type="search"
                  value={searchText}
                  onChange={(event) => setSearchText(event.target.value)}
                  placeholder="Search loaded rows"
                  className="w-full rounded-md border border-outline-variant bg-surface-container-low px-4 py-3 pl-10 text-body-sm font-semibold text-on-surface transition-colors focus:border-primary focus:outline-none"
                />
              </label>
            </div>

            <div className="mt-5 flex gap-2 overflow-x-auto pb-1">
              {statusTabs.map((tab) => (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() => setActiveStatus(tab.value)}
                  disabled={isLoading || isRefreshing}
                  className={`shrink-0 rounded-md border px-4 py-2 text-label-sm font-extrabold uppercase tracking-[0.12em] transition-all disabled:cursor-not-allowed disabled:opacity-60 ${
                    activeStatus === tab.value
                      ? 'border-primary bg-primary/12 text-primary'
                      : 'border-outline-variant bg-surface-container-low text-on-surface-variant hover:border-primary hover:text-primary'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="relative">
            {isRefreshing && withdrawals.length > 0 && (
              <div className="absolute right-4 top-4 z-10 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-surface-container-high px-3 py-1.5 text-label-sm font-bold text-primary shadow-lg">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Updating
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full min-w-[1060px] text-left">
                <thead className="border-b border-outline-variant bg-surface-container">
                  <tr>
                    <TableHeader>Withdrawal ID</TableHeader>
                    <TableHeader>Spectator</TableHeader>
                    <TableHeader>Points Requested</TableHeader>
                    <TableHeader>Cash Amount</TableHeader>
                    <TableHeader>Exchange Rate</TableHeader>
                    <TableHeader>Status</TableHeader>
                    <TableHeader>Requested At</TableHeader>
                    <TableHeader align="right">Actions</TableHeader>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/50">
                  {!isLoading && visibleWithdrawals.map((withdrawal) => (
                    <WithdrawalRow
                      key={`${withdrawal.withdrawalId ?? 'missing'}-${withdrawal.createdAt ?? ''}`}
                      withdrawal={withdrawal}
                      runningActionKey={runningActionKey}
                      onView={() => setSelectedWithdrawal(withdrawal)}
                      onApprove={() => openDialog('approve', withdrawal)}
                      onReject={() => openDialog('reject', withdrawal)}
                      onMarkPaid={() => openDialog('mark-paid', withdrawal)}
                      onResend={() => void handleResendInvoice(withdrawal)}
                    />
                  ))}
                </tbody>
              </table>
            </div>

            {isLoading && withdrawals.length === 0 && <WithdrawalTableSkeleton />}
            {!isLoading && visibleWithdrawals.length === 0 && (
              <EmptyState
                title={searchText.trim() ? 'No loaded rows match this search.' : getEmptyMessage(activeStatus)}
                description={searchText.trim() ? 'Clear the search box or refresh the selected status tab.' : 'Refresh the list when new requests are expected.'}
              />
            )}
          </div>
        </section>
      </div>

      {selectedWithdrawal && (
        <WithdrawalDetailsDrawer
          withdrawal={selectedWithdrawal}
          runningActionKey={runningActionKey}
          onClose={() => setSelectedWithdrawal(null)}
          onApprove={() => openDialog('approve', selectedWithdrawal)}
          onReject={() => openDialog('reject', selectedWithdrawal)}
          onMarkPaid={() => openDialog('mark-paid', selectedWithdrawal)}
          onResend={() => void handleResendInvoice(selectedWithdrawal)}
        />
      )}

      {activeDialog?.type === 'approve' && (
        <ApproveDialog
          withdrawal={activeDialog.withdrawal}
          location={payoutLocation}
          counter={payoutCounter}
          error={dialogError}
          isSubmitting={Boolean(runningActionKey)}
          onLocationChange={(value) => {
            setPayoutLocation(value);
            setDialogError('');
          }}
          onCounterChange={(value) => {
            setPayoutCounter(value);
            setDialogError('');
          }}
          onClose={closeDialog}
          onSubmit={handleApproveSubmit}
        />
      )}

      {activeDialog?.type === 'reject' && (
        <RejectDialog
          withdrawal={activeDialog.withdrawal}
          reason={rejectReason}
          error={dialogError}
          isSubmitting={Boolean(runningActionKey)}
          onReasonChange={(value) => {
            setRejectReason(value);
            setDialogError('');
          }}
          onClose={closeDialog}
          onSubmit={handleRejectSubmit}
        />
      )}

      {activeDialog?.type === 'mark-paid' && (
        <MarkPaidDialog
          withdrawal={activeDialog.withdrawal}
          pickupCode={pickupCode}
          note={paidNote}
          confirmed={paidConfirmed}
          error={dialogError}
          isSubmitting={Boolean(runningActionKey)}
          onPickupCodeChange={(value) => {
            setPickupCode(value);
            setDialogError('');
          }}
          onNoteChange={(value) => {
            setPaidNote(value);
            setDialogError('');
          }}
          onConfirmedChange={(value) => {
            setPaidConfirmed(value);
            setDialogError('');
          }}
          onClose={closeDialog}
          onSubmit={handleMarkPaidSubmit}
        />
      )}
    </motion.div>
  );
};

const SummaryCard = ({
  icon,
  label,
  value,
  isLoading,
}: {
  icon: ReactNode;
  label: string;
  value: number | null;
  isLoading: boolean;
}) => (
  <article className="admin-surface-panel rounded-lg p-5">
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <p className="text-label-sm font-extrabold uppercase tracking-[0.14em] text-on-surface-variant">{label}</p>
        {isLoading ? (
          <div className="mt-3 h-8 w-20 animate-pulse rounded-full bg-surface-container-high" />
        ) : (
          <p className="font-display mt-2 text-3xl font-extrabold text-primary">{value === null ? 'N/A' : formatInteger(value)}</p>
        )}
      </div>
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-primary/25 bg-primary/10 text-primary">
        {icon}
      </span>
    </div>
  </article>
);

const WithdrawalRow = ({
  withdrawal,
  runningActionKey,
  onView,
  onApprove,
  onReject,
  onMarkPaid,
  onResend,
}: {
  withdrawal: WithdrawalResponse;
  runningActionKey: string;
  onView: () => void;
  onApprove: () => void;
  onReject: () => void;
  onMarkPaid: () => void;
  onResend: () => void;
}) => {
  const normalizedStatus = normalizeStatus(withdrawal.status);
  const isSafeToProcess = hasFinancialProcessingFields(withdrawal);
  const id = withdrawal.withdrawalId;
  const isApproveRunning = runningActionKey === `${id}:approve`;
  const isRejectRunning = runningActionKey === `${id}:reject`;
  const isMarkPaidRunning = runningActionKey === `${id}:mark-paid`;
  const isResendRunning = runningActionKey === `${id}:resend`;

  return (
    <tr className="transition-colors hover:bg-surface-container-lowest">
      <TableCell strong>
        <span className="whitespace-nowrap">{getWithdrawalLabel(withdrawal)}</span>
        {withdrawal.pickupCode && <p className="mt-1 text-label-sm font-semibold text-secondary">{withdrawal.pickupCode}</p>}
        {withdrawal.txId && <p className="mt-1 text-label-sm font-semibold text-outline">TX #{withdrawal.txId}</p>}
      </TableCell>
      <TableCell>
        <p className="font-bold text-on-surface">{getSpectatorName(withdrawal)}</p>
        <p className="mt-1 text-label-sm text-outline">{withdrawal.userEmail ?? (withdrawal.userId ? `Spectator #${withdrawal.userId}` : '-')}</p>
      </TableCell>
      <TableCell>
        <span className="font-extrabold text-primary">{formatPoints(withdrawal.requestedPoints)}</span>
      </TableCell>
      <TableCell>
        <span className="inline-flex rounded-md border border-secondary/30 bg-secondary/10 px-3 py-1 text-body-sm font-extrabold text-secondary">
          {formatCash(withdrawal.netCashAmount)}
        </span>
      </TableCell>
      <TableCell>{formatDecimal(withdrawal.exchangeRate)}</TableCell>
      <TableCell><WithdrawalStatusBadge status={withdrawal.status} /></TableCell>
      <TableCell>{formatDateTime(withdrawal.createdAt)}</TableCell>
      <TableCell>
        <div className="flex flex-wrap justify-end gap-2">
          <ActionButton icon={<Eye className="h-4 w-4" />} label="View" onClick={onView} />
          {normalizedStatus === 'pending' && (
            <>
              <ActionButton icon={<CheckCircle2 className="h-4 w-4" />} label="Approve" onClick={onApprove} disabled={!isSafeToProcess || Boolean(runningActionKey)} isLoading={isApproveRunning} tone="success" />
              <ActionButton icon={<Ban className="h-4 w-4" />} label="Reject" onClick={onReject} disabled={!isSafeToProcess || Boolean(runningActionKey)} isLoading={isRejectRunning} tone="danger" />
            </>
          )}
          {normalizedStatus === 'approved' && (
            <ActionButton icon={<Banknote className="h-4 w-4" />} label="Mark Paid" onClick={onMarkPaid} disabled={!isSafeToProcess || Boolean(runningActionKey)} isLoading={isMarkPaidRunning} tone="success" />
          )}
          {normalizedStatus === 'paid' && (
            <ActionButton icon={<Mail className="h-4 w-4" />} label="Resend" onClick={onResend} disabled={!withdrawal.withdrawalId || Boolean(runningActionKey)} isLoading={isResendRunning} />
          )}
        </div>
      </TableCell>
    </tr>
  );
};

const WithdrawalStatusBadge = ({ status }: { status?: string | null }) => {
  const normalizedStatus = normalizeStatus(status);
  const toneClass = normalizedStatus === 'pending'
    ? 'border-primary/30 bg-primary/10 text-primary'
    : normalizedStatus === 'approved'
      ? 'border-tertiary/30 bg-tertiary/10 text-tertiary'
      : normalizedStatus === 'paid'
        ? 'border-secondary/30 bg-secondary/10 text-secondary'
        : normalizedStatus === 'rejected'
          ? 'border-error/30 bg-error-container/20 text-error'
          : 'border-outline-variant bg-surface-container text-on-surface-variant';

  return (
    <span className={`inline-flex whitespace-nowrap rounded-full border px-3 py-1 text-label-sm font-bold uppercase ${toneClass}`}>
      {normalizedStatus === 'unknown' ? humanizeLabel(status, 'Unknown') : humanizeLabel(normalizedStatus)}
    </span>
  );
};

const WithdrawalDetailsDrawer = ({
  withdrawal,
  runningActionKey,
  onClose,
  onApprove,
  onReject,
  onMarkPaid,
  onResend,
}: {
  withdrawal: WithdrawalResponse;
  runningActionKey: string;
  onClose: () => void;
  onApprove: () => void;
  onReject: () => void;
  onMarkPaid: () => void;
  onResend: () => void;
}) => {
  const normalizedStatus = normalizeStatus(withdrawal.status);
  const isSafeToProcess = hasFinancialProcessingFields(withdrawal);

  return (
    <div className="fixed inset-0 z-[60] bg-black/60" role="presentation">
      <motion.aside
        initial={{ opacity: 0, x: 42 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
        className="ml-auto flex h-full w-full max-w-2xl flex-col overflow-hidden border-l border-outline-variant bg-surface-container shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-label="Withdrawal details"
      >
        <div className="flex items-start justify-between gap-6 border-b border-outline-variant p-6">
          <div>
            <p className="mb-2 text-label-sm font-bold uppercase tracking-widest text-outline">{getWithdrawalLabel(withdrawal)}</p>
            <h2 className="text-headline-md font-bold text-primary">Withdrawal Details</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-md border border-outline-variant text-on-surface-variant transition-colors hover:border-primary hover:text-primary"
            aria-label="Close withdrawal details"
            title="Close withdrawal details"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="mb-6 grid gap-4 sm:grid-cols-2">
            <HighlightedValue label="Points exchanged" value={formatPoints(withdrawal.requestedPoints)} icon={<WalletCards className="h-5 w-5" />} />
            <HighlightedValue label="Cash to hand over" value={formatCash(withdrawal.netCashAmount)} icon={<Banknote className="h-5 w-5" />} />
          </div>

          <div className="mb-6 grid gap-4 sm:grid-cols-2">
            <DetailItem label="Status" value={<WithdrawalStatusBadge status={withdrawal.status} />} />
            <DetailItem label="Spectator" value={getSpectatorName(withdrawal)} />
            <DetailItem label="Spectator ID" value={withdrawal.userId ? `#${withdrawal.userId}` : '-'} />
            <DetailItem label="Email" value={withdrawal.userEmail ?? '-'} />
            <DetailItem label="Wallet ID" value={withdrawal.walletId ? `#${withdrawal.walletId}` : '-'} />
            <DetailItem label="Transaction ID" value={withdrawal.txId ? `#${withdrawal.txId}` : '-'} />
            <DetailItem label="Gross cash" value={formatCash(withdrawal.grossCashAmount)} />
            <DetailItem label="Tax" value={`${formatCash(withdrawal.taxAmount)} (${formatDecimal(withdrawal.taxRate)}%)`} />
            <DetailItem label="Exchange rate" value={formatDecimal(withdrawal.exchangeRate)} />
            <DetailItem label="Requested at" value={formatDateTime(withdrawal.createdAt)} />
            <DetailItem label="Approved at" value={formatDateTime(withdrawal.approvedAt)} />
            <DetailItem label="Paid at" value={formatDateTime(withdrawal.paidAt)} />
            <DetailItem label="Rejected at" value={formatDateTime(withdrawal.rejectedAt)} />
            <DetailItem label="Processed by" value={getProcessorText(withdrawal)} />
            <DetailItem label="Pickup code" value={withdrawal.pickupCode ?? '-'} />
            <DetailItem label="Payout location" value={withdrawal.payoutLocation ?? '-'} />
            <DetailItem label="Payout counter" value={withdrawal.payoutCounter ?? '-'} />
            <DetailItem label="Reject reason" value={withdrawal.rejectReason ?? '-'} />
            <DetailItem label="Payment note" value={withdrawal.paymentNote ?? '-'} />
            <DetailItem label="Invoice" value={getInvoiceStatus(withdrawal)} />
          </div>

          {withdrawal.invoiceUrl && (
            <a
              href={withdrawal.invoiceUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-md border border-outline-variant px-4 py-2.5 text-body-sm font-bold text-on-surface-variant transition-colors hover:border-primary hover:text-primary"
            >
              <ReceiptText className="h-4 w-4" />
              Open Invoice
            </a>
          )}
        </div>

        <div className="flex flex-wrap justify-end gap-2 border-t border-outline-variant p-5">
          {normalizedStatus === 'pending' && (
            <>
              <ActionButton icon={<CheckCircle2 className="h-4 w-4" />} label="Approve" onClick={onApprove} disabled={!isSafeToProcess || Boolean(runningActionKey)} tone="success" />
              <ActionButton icon={<Ban className="h-4 w-4" />} label="Reject" onClick={onReject} disabled={!isSafeToProcess || Boolean(runningActionKey)} tone="danger" />
            </>
          )}
          {normalizedStatus === 'approved' && (
            <ActionButton icon={<Banknote className="h-4 w-4" />} label="Mark as Paid" onClick={onMarkPaid} disabled={!isSafeToProcess || Boolean(runningActionKey)} tone="success" />
          )}
          {normalizedStatus === 'paid' && (
            <ActionButton icon={<Mail className="h-4 w-4" />} label="Resend Invoice" onClick={onResend} disabled={Boolean(runningActionKey)} isLoading={runningActionKey === `${withdrawal.withdrawalId}:resend`} />
          )}
        </div>
      </motion.aside>
    </div>
  );
};

const ApproveDialog = ({
  withdrawal,
  location,
  counter,
  error,
  isSubmitting,
  onLocationChange,
  onCounterChange,
  onClose,
  onSubmit,
}: {
  withdrawal: WithdrawalResponse;
  location: string;
  counter: string;
  error: string;
  isSubmitting: boolean;
  onLocationChange: (value: string) => void;
  onCounterChange: (value: string) => void;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) => (
  <ConfirmModal title="Approve Withdrawal" subtitle={getWithdrawalLabel(withdrawal)} onClose={onClose}>
    <form onSubmit={onSubmit} className="space-y-5 p-6">
      <p className="text-body-sm font-semibold text-on-surface-variant">Set the counter pickup details for this approved cash withdrawal.</p>
      <DialogSummary withdrawal={withdrawal} />
      <Field label="Payout location" error={location.length > 255 ? 'Maximum 255 characters.' : undefined}>
        <textarea
          value={location}
          onChange={(event) => onLocationChange(event.target.value)}
          maxLength={255}
          rows={3}
          disabled={isSubmitting}
          className={inputClassName}
          autoFocus
        />
      </Field>
      <Field label="Payout counter" error={counter.length > 100 ? 'Maximum 100 characters.' : undefined}>
        <input
          type="text"
          value={counter}
          onChange={(event) => onCounterChange(event.target.value)}
          maxLength={100}
          disabled={isSubmitting}
          className={inputClassName}
        />
      </Field>
      {error && <DialogError message={error} />}
      <DialogActions
        cancelLabel="Cancel"
        submitLabel="Approve Withdrawal"
        isSubmitting={isSubmitting}
        submitTone="success"
        onClose={onClose}
        disabled={!location.trim() || !counter.trim()}
      />
    </form>
  </ConfirmModal>
);
const RejectDialog = ({
  withdrawal,
  reason,
  error,
  isSubmitting,
  onReasonChange,
  onClose,
  onSubmit,
}: {
  withdrawal: WithdrawalResponse;
  reason: string;
  error: string;
  isSubmitting: boolean;
  onReasonChange: (value: string) => void;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) => (
  <ConfirmModal title="Reject Withdrawal" subtitle={getWithdrawalLabel(withdrawal)} onClose={onClose}>
    <form onSubmit={onSubmit} className="space-y-5 p-6">
      <p className="text-body-sm font-semibold text-on-surface-variant">Reject this withdrawal request?</p>
      <DialogSummary withdrawal={withdrawal} />
      <Field label="Reject reason" error={reason.length > 255 ? 'Maximum 255 characters.' : undefined}>
        <textarea
          value={reason}
          onChange={(event) => onReasonChange(event.target.value)}
          maxLength={255}
          rows={4}
          disabled={isSubmitting}
          className={inputClassName}
          autoFocus
        />
      </Field>
      {error && <DialogError message={error} />}
      <DialogActions
        cancelLabel="Cancel"
        submitLabel="Reject Withdrawal"
        isSubmitting={isSubmitting}
        submitTone="danger"
        onClose={onClose}
      />
    </form>
  </ConfirmModal>
);

const MarkPaidDialog = ({
  withdrawal,
  pickupCode,
  note,
  confirmed,
  error,
  isSubmitting,
  onPickupCodeChange,
  onNoteChange,
  onConfirmedChange,
  onClose,
  onSubmit,
}: {
  withdrawal: WithdrawalResponse;
  pickupCode: string;
  note: string;
  confirmed: boolean;
  error: string;
  isSubmitting: boolean;
  onPickupCodeChange: (value: string) => void;
  onNoteChange: (value: string) => void;
  onConfirmedChange: (value: boolean) => void;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) => (
  <ConfirmModal title="Mark as Paid" subtitle={getWithdrawalLabel(withdrawal)} onClose={onClose}>
    <form onSubmit={onSubmit} className="space-y-5 p-6">
      <div className="rounded-md border border-primary/30 bg-primary/10 px-4 py-3 text-body-sm font-semibold text-on-surface">
        Verify the spectator pickup code before confirming the counter cash payment.
      </div>
      <DialogSummary withdrawal={withdrawal} includeApprovedAt />
      <Field label="Pickup code">
        <input
          type="text"
          value={pickupCode}
          onChange={(event) => onPickupCodeChange(event.target.value)}
          maxLength={100}
          disabled={isSubmitting}
          className={inputClassName}
          autoFocus
        />
      </Field>
      <Field label="Payment note">
        <textarea
          value={note}
          onChange={(event) => onNoteChange(event.target.value)}
          maxLength={255}
          rows={3}
          disabled={isSubmitting}
          className={inputClassName}
        />
      </Field>
      <label className="flex items-start gap-3 rounded-md border border-outline-variant bg-surface-container-low p-4 text-body-sm font-semibold text-on-surface-variant">
        <input
          type="checkbox"
          checked={confirmed}
          onChange={(event) => onConfirmedChange(event.target.checked)}
          disabled={isSubmitting}
          className="mt-1 h-4 w-4 accent-primary"
        />
        <span>I confirm that the pickup code was checked and the spectator received the cash payment.</span>
      </label>
      {error && <DialogError message={error} />}
      <DialogActions
        cancelLabel="Cancel"
        submitLabel="Mark as Paid"
        isSubmitting={isSubmitting}
        submitTone="success"
        onClose={onClose}
        disabled={!confirmed || !pickupCode.trim()}
      />
    </form>
  </ConfirmModal>
);
const DialogSummary = ({ withdrawal, includeApprovedAt = false }: { withdrawal: WithdrawalResponse; includeApprovedAt?: boolean }) => (
  <div className="grid gap-3 sm:grid-cols-2">
    <DetailItem label="Spectator" value={getSpectatorName(withdrawal)} />
    <DetailItem label="Current status" value={<WithdrawalStatusBadge status={withdrawal.status} />} />
    <DetailItem label="Requested points" value={formatPoints(withdrawal.requestedPoints)} />
    <DetailItem label="Cash amount" value={formatCash(withdrawal.netCashAmount)} />
    {includeApprovedAt && <DetailItem label="Approved at" value={formatDateTime(withdrawal.approvedAt)} />}
    {includeApprovedAt && <DetailItem label="Pickup code on record" value={withdrawal.pickupCode ?? '-'} />}
    {includeApprovedAt && <DetailItem label="Payout location" value={withdrawal.payoutLocation ?? '-'} />}
    {includeApprovedAt && <DetailItem label="Payout counter" value={withdrawal.payoutCounter ?? '-'} />}
  </div>
);

const ConfirmModal = ({
  title,
  subtitle,
  onClose,
  children,
}: {
  title: string;
  subtitle: string;
  onClose: () => void;
  children: ReactNode;
}) => (
  <div className="fixed inset-0 z-[70] overflow-y-auto bg-black/60 px-4 py-8">
    <div className="mx-auto max-w-2xl rounded-lg border border-outline-variant bg-surface-container shadow-xl" role="dialog" aria-modal="true" aria-label={title}>
      <div className="flex items-start justify-between gap-6 border-b border-outline-variant p-6">
        <div>
          <p className="mb-2 text-label-sm font-bold uppercase tracking-widest text-outline">{subtitle}</p>
          <h2 className="text-headline-md font-bold text-primary">{title}</h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex h-10 w-10 items-center justify-center rounded-md border border-outline-variant text-on-surface-variant transition-colors hover:border-primary hover:text-primary"
          aria-label={`Close ${title}`}
          title={`Close ${title}`}
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      {children}
    </div>
  </div>
);

const DialogActions = ({
  cancelLabel,
  submitLabel,
  isSubmitting,
  submitTone,
  disabled = false,
  onClose,
}: {
  cancelLabel: string;
  submitLabel: string;
  isSubmitting: boolean;
  submitTone: 'success' | 'danger';
  disabled?: boolean;
  onClose: () => void;
}) => (
  <div className="flex flex-col-reverse gap-3 border-t border-outline-variant pt-5 sm:flex-row sm:justify-end">
    <button
      type="button"
      onClick={onClose}
      disabled={isSubmitting}
      className="rounded-md border border-outline-variant px-6 py-3 text-body-sm font-bold text-on-surface-variant transition-colors hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-60"
    >
      {cancelLabel}
    </button>
    <button
      type="submit"
      disabled={isSubmitting || disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-md px-6 py-3 text-body-sm font-extrabold transition-all disabled:cursor-not-allowed disabled:opacity-70 ${
        submitTone === 'success'
          ? 'bg-secondary text-on-secondary'
          : 'bg-error-container text-on-error-container'
      }`}
    >
      {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
      {submitLabel}
    </button>
  </div>
);

const getProcessorText = (withdrawal: WithdrawalResponse) => {
  if (withdrawal.paidBy) return `Paid by admin #${withdrawal.paidBy}`;
  if (withdrawal.rejectedBy) return `Rejected by admin #${withdrawal.rejectedBy}`;
  if (withdrawal.approvedBy) return `Approved by admin #${withdrawal.approvedBy}`;
  return '-';
};

const HighlightedValue = ({ label, value, icon }: { label: string; value: string; icon: ReactNode }) => (
  <div className="rounded-lg border border-primary/25 bg-primary/10 p-4">
    <div className="mb-3 flex items-center gap-2 text-primary">
      {icon}
      <span className="text-label-sm font-extrabold uppercase tracking-[0.14em]">{label}</span>
    </div>
    <p className="font-display break-words text-2xl font-extrabold text-on-surface">{value}</p>
  </div>
);

const DetailItem = ({ label, value }: { label: string; value: ReactNode }) => (
  <div className="rounded-md border border-outline-variant bg-surface-container-lowest/60 p-4">
    <p className="mb-2 text-label-sm font-bold uppercase tracking-wider text-outline">{label}</p>
    <div className="break-words text-body-sm font-semibold text-on-surface">{value}</div>
  </div>
);

const Field = ({ label, error, children }: { label: string; error?: string; children: ReactNode }) => (
  <label className="space-y-2">
    <span className="block text-label-sm font-bold uppercase tracking-wider text-outline">{label}</span>
    {children}
    {error && <span className="block text-label-md text-error">{error}</span>}
  </label>
);

const ActionButton = ({
  icon,
  label,
  onClick,
  disabled = false,
  isLoading = false,
  tone = 'neutral',
}: {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  isLoading?: boolean;
  tone?: 'neutral' | 'success' | 'danger';
}) => {
  const toneClass = tone === 'success'
    ? 'border-secondary/40 text-secondary hover:bg-secondary/10'
    : tone === 'danger'
      ? 'border-error/40 text-error hover:bg-error-container/20'
      : 'border-outline-variant text-on-surface-variant hover:border-primary hover:text-primary';

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || isLoading}
      className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-md border bg-surface-container-low px-3 py-2 text-label-sm font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${toneClass}`}
      aria-label={label}
      title={label}
    >
      {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : icon}
      {label}
    </button>
  );
};

const StatusBanner = ({ tone, text }: { tone: 'error' | 'warning'; text: string }) => (
  <section className={`mb-6 rounded-lg border px-4 py-3 text-body-sm font-semibold ${
    tone === 'error'
      ? 'border-error/30 bg-error-container/20 text-error'
      : 'border-primary/30 bg-primary/10 text-primary'
  }`}>
    {text}
  </section>
);

const DialogError = ({ message }: { message: string }) => (
  <div role="alert" className="rounded-md border border-error/30 bg-error-container/20 px-4 py-3 text-body-sm font-semibold text-error">
    {message}
  </div>
);

const ErrorState = ({ message, onRetry }: { message: string; onRetry: () => void }) => (
  <section className="mb-6 rounded-lg border border-error/30 bg-error-container/20 p-5 text-error">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
        <div>
          <h2 className="font-bold">Withdrawal requests could not be loaded.</h2>
          <p className="mt-1 text-body-sm font-semibold">{message}</p>
        </div>
      </div>
      <button
        type="button"
        onClick={onRetry}
        className="inline-flex items-center justify-center gap-2 rounded-md border border-error/40 px-4 py-2 text-body-sm font-bold transition-colors hover:bg-error-container/30"
      >
        <RefreshCw className="h-4 w-4" />
        Retry
      </button>
    </div>
  </section>
);

const EmptyState = ({ title, description }: { title: string; description: string }) => (
  <div className="px-6 py-16 text-center">
    <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-surface-container">
      <WalletCards className="h-6 w-6 text-outline" />
    </div>
    <h3 className="mb-2 text-body-lg font-bold text-primary">{title}</h3>
    <p className="text-body-sm text-on-surface-variant">{description}</p>
  </div>
);

const WithdrawalTableSkeleton = () => (
  <div className="space-y-4 p-5" role="status" aria-live="polite" aria-label="Loading withdrawal requests">
    {Array.from({ length: 6 }, (_, index) => (
      <div key={index} className="grid gap-4 rounded-md border border-outline-variant/30 bg-surface-container-low p-4 md:grid-cols-[1fr_1.3fr_1fr_1fr]">
        <span className="h-4 animate-pulse rounded-full bg-surface-container-high" />
        <span className="h-4 animate-pulse rounded-full bg-surface-container-high" />
        <span className="h-4 animate-pulse rounded-full bg-surface-container-high" />
        <span className="h-4 animate-pulse rounded-full bg-surface-container-high" />
      </div>
    ))}
    <span className="sr-only">Loading withdrawal requests</span>
  </div>
);

const TableHeader = ({ children, align = 'left' }: { children: ReactNode; align?: 'left' | 'right' }) => (
  <th className={`px-5 py-4 text-label-sm uppercase tracking-wider text-outline ${align === 'right' ? 'text-right' : 'text-left'}`}>
    {children}
  </th>
);

const TableCell = ({ children, strong = false }: { children: ReactNode; strong?: boolean }) => (
  <td className={`px-5 py-4 align-top text-body-sm ${strong ? 'font-bold text-primary' : 'font-semibold text-on-surface-variant'}`}>
    {children}
  </td>
);

const inputClassName =
  'w-full rounded-md border border-outline-variant bg-surface-container-low px-4 py-3 text-body-sm font-semibold text-on-surface transition-colors focus:border-primary focus:outline-none disabled:cursor-not-allowed disabled:opacity-70';

export default WithdrawalManagementPage;
