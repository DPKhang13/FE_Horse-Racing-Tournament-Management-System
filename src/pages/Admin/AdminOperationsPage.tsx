import { Component, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { motion } from 'motion/react';
import {
  Activity,
  AlertCircle,
  ArrowDownToLine,
  ArrowUpFromLine,
  Banknote,
  CalendarDays,
  CircleDollarSign,
  Clock,
  Flag,
  Filter,
  Loader2,
  RefreshCw,
  Ticket,
  Trophy,
  Users,
  WalletCards,
} from 'lucide-react';
import { getApiErrorMessage } from '../../services/apiClient';
import {
  adminDashboardService,
  type AdminDashboardCashFlowByDay,
  type AdminDashboardRecentTransaction,
  type AdminDashboardSummaryQuery,
  type AdminDashboardSummary,
} from '../../services/adminDashboardService';
import { adminScheduleRaceApi, type AdminTournamentOption } from '../../services/adminScheduleRaceApi';
import { showToast } from '../../utils/toast';
import { formatVndAmountInput } from '../../utils/currency';

const metricCardVariants = {
  hidden: { opacity: 0, y: 22, scale: 0.97 },
  visible: (index: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { delay: 0.08 + index * 0.055, duration: 0.38, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

const pageVariants = {
  hidden: { opacity: 0, y: 18, scale: 0.992 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.42, ease: [0.22, 1, 0.36, 1] as const } },
};

const panelVariants = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.34, ease: [0.22, 1, 0.36, 1] as const } },
};

const formatInteger = (value: number | null | undefined) => {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) {
    return 'N/A';
  }

  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(Number(value));
};

const moneyToCents = (value: number | string | null | undefined): bigint | null => {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const text = String(value).trim().replace(/,/g, '');
  const sign = text.startsWith('-') ? -1n : 1n;
  const unsignedText = text.replace(/^[+-]/, '');
  const [unitText = '0', decimalText = ''] = unsignedText.split('.');
  const units = BigInt(unitText.replace(/\D/g, '') || '0');
  const cents = BigInt(`${decimalText.replace(/\D/g, '')}00`.slice(0, 2));

  return sign * (units * 100n + cents);
};


const formatMoneyFromCents = (cents: bigint) => {
  const sign = cents < 0n ? '-' : '';
  const absoluteCents = cents < 0n ? -cents : cents;

  return `${sign}${formatVndAmountInput((absoluteCents / 100n).toString())} VND`;
};

const sumCents = (values: bigint[]) => values.reduce((total, value) => total + value, 0n);

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

const formatShortDate = (value?: string | null) => {
  if (!value) {
    return '-';
  }

  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
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

const getTransactionAmount = (transaction: AdminDashboardRecentTransaction) => {
  const cashAmount = moneyToCents(transaction.cashAmount);

  if (cashAmount !== null && cashAmount !== 0n) {
    return formatMoneyFromCents(cashAmount);
  }

  const points = moneyToCents(transaction.pointsAmount);

  if (points === null) {
    return 'N/A';
  }

  return `${formatVndAmountInput((points / 100n).toString())} pts`;
};

type DashboardDateMode = 'all' | 'day' | 'month' | 'year';

type DashboardFilters = {
  dateMode: DashboardDateMode;
  day: string;
  month: string;
  year: string;
  tournamentId: string;
};

const toDateInputFromDate = (date: Date) => {
  const localTime = date.getTime() - date.getTimezoneOffset() * 60_000;
  return new Date(localTime).toISOString().slice(0, 10);
};

const todayInputValue = () => toDateInputFromDate(new Date());
const currentMonthInputValue = () => todayInputValue().slice(0, 7);
const currentYearInputValue = () => String(new Date().getFullYear());

const defaultFilters = (): DashboardFilters => ({
  dateMode: 'all',
  day: todayInputValue(),
  month: currentMonthInputValue(),
  year: currentYearInputValue(),
  tournamentId: '',
});

const getMonthRange = (month: string) => {
  const [yearText, monthText] = month.split('-');
  const year = Number(yearText);
  const monthIndex = Number(monthText) - 1;

  if (!Number.isFinite(year) || !Number.isFinite(monthIndex)) {
    return { from: undefined, to: undefined };
  }

  return {
    from: `${month}-01`,
    to: toDateInputFromDate(new Date(year, monthIndex + 1, 0)),
  };
};

const getDashboardSummaryQuery = (filters: DashboardFilters): AdminDashboardSummaryQuery => {
  const query: AdminDashboardSummaryQuery = {};

  if (filters.dateMode === 'day' && filters.day) {
    query.from = filters.day;
    query.to = filters.day;
    query.period = 'day';
  }

  if (filters.dateMode === 'month' && filters.month) {
    const range = getMonthRange(filters.month);
    query.from = range.from;
    query.to = range.to;
    query.period = 'day';
  }

  if (filters.dateMode === 'year' && filters.year) {
    query.from = `${filters.year}-01-01`;
    query.to = `${filters.year}-12-31`;
    query.period = 'month';
  }

  if (filters.tournamentId) {
    query.tournamentId = filters.tournamentId;
  }

  return query;
};

const AdminOperationsDashboard = () => {
  const [summary, setSummary] = useState<AdminDashboardSummary | null>(null);
  const [tournaments, setTournaments] = useState<AdminTournamentOption[]>([]);
  const [filters, setFilters] = useState<DashboardFilters>(() => defaultFilters());
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [filterErrorMessage, setFilterErrorMessage] = useState('');
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null);
  const requestIdRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);

  const loadSummary = useCallback(async (mode: 'initial' | 'refresh' = 'initial') => {
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

    setErrorMessage('');

    try {
      const data = await adminDashboardService.getAdminDashboardSummary(getDashboardSummaryQuery(filters), controller.signal);

      if (requestId !== requestIdRef.current) {
        return;
      }

      setSummary(data);
      setLastUpdatedAt(new Date().toISOString());

      if (mode === 'refresh') {
        showToast({ tone: 'success', text: 'Admin dashboard refreshed.' });
      }
    } catch (error) {
      if (controller.signal.aborted || requestId !== requestIdRef.current) {
        return;
      }

      const message = getApiErrorMessage(error, 'Unable to load admin dashboard summary.');
      setErrorMessage(message);
      showToast({ tone: 'error', text: message });
    } finally {
      if (requestId === requestIdRef.current) {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    }
  }, [filters]);

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      void loadSummary('initial');
    }, 0);

    return () => {
      window.clearTimeout(timerId);
      abortRef.current?.abort();
    };
  }, [loadSummary]);

  useEffect(() => {
    let isActive = true;

    void adminScheduleRaceApi.getTournaments()
      .then((items) => {
        if (isActive) {
          setTournaments(items);
        }
      })
      .catch((error) => {
        if (isActive) {
          setFilterErrorMessage(getApiErrorMessage(error, 'Unable to load tournaments for dashboard filter.'));
        }
      });

    return () => {
      isActive = false;
    };
  }, []);

  const cashFlowData = useMemo(() => normalizeCashFlow(summary?.cashFlowByDay), [summary?.cashFlowByDay]);
  const recentTransactions = useMemo(
    () => [...(summary?.recentTransactions ?? [])].slice(0, 10),
    [summary?.recentTransactions],
  );
  const hasDateFilter = filters.dateMode !== 'all';
  const totalDepositCents: bigint = moneyToCents(summary?.totalSuccessfulDepositAmount) ?? sumCents(cashFlowData.map((point) => point.depositCents));
  const totalWithdrawalCents: bigint = moneyToCents(summary?.totalCompletedWithdrawalAmount) ?? sumCents(cashFlowData.map((point) => point.withdrawalCents));
  const awardedPrizeCents: bigint = moneyToCents(summary?.totalAwardedPrizeAmount) ?? sumCents(cashFlowData.map((point) => point.prizeAwardCents));
  const filteredNetCashFlowCents: bigint = moneyToCents(summary?.netCashFlow) ?? (totalDepositCents - totalWithdrawalCents - awardedPrizeCents);
  const selectedTournament = useMemo(
    () => tournaments.find((tournament) => String(tournament.tournamentId) === filters.tournamentId),
    [filters.tournamentId, tournaments],
  );
  const filterScopeLabel = getFilterScopeLabel(filters, selectedTournament?.tournamentName);

  const metrics = useMemo(() => [
    {
      title: 'Total Users',
      value: formatInteger(summary?.totalUsers),
      helper: 'Registered accounts',
      icon: <Users className="h-5 w-5" />,
    },
    {
      title: 'Total Races',
      value: formatInteger(summary?.totalRaces),
      helper: 'All configured races',
      icon: <Flag className="h-5 w-5" />,
    },
    {
      title: 'Active Races',
      value: formatInteger(summary?.activeRaces),
      helper: 'Not completed or cancelled',
      icon: <Activity className="h-5 w-5" />,
    },
    {
      title: 'Total Bets',
      value: formatInteger(summary?.totalBets),
      helper: 'All betting tickets',
      icon: <Ticket className="h-5 w-5" />,
    },
    {
      title: 'Successful Deposits',
      value: formatMoneyFromCents(totalDepositCents),
      helper: hasDateFilter ? 'Completed top-ups in selected period' : 'Completed top-ups',
      icon: <ArrowDownToLine className="h-5 w-5" />,
    },
    {
      title: 'Completed Withdrawals',
      value: formatMoneyFromCents(totalWithdrawalCents),
      helper: hasDateFilter ? 'Paid withdrawals in selected period' : 'Paid withdrawal net cash',
      icon: <ArrowUpFromLine className="h-5 w-5" />,
    },
    {
      title: 'Pending Withdrawals',
      value: formatInteger(summary?.pendingWithdrawalCount),
      helper: 'Waiting admin processing',
      icon: <WalletCards className="h-5 w-5" />,
    },
    {
      title: 'Net Cash Flow',
      value: formatMoneyFromCents(filteredNetCashFlowCents),
      helper: 'Deposits - withdrawals - awarded prizes',
      icon: <CircleDollarSign className="h-5 w-5" />,
    },
  ], [filteredNetCashFlowCents, hasDateFilter, summary, totalDepositCents, totalWithdrawalCents]);

  return (
    <motion.div
      className="admin-dashboard-shell min-h-screen py-8"
      variants={pageVariants}
      initial="hidden"
      animate="visible"
    >
      <div className="admin-dashboard-content mx-auto max-w-[1440px] px-4 md:px-8">
        <section className="admin-dashboard-hero mb-6 rounded-lg p-6">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div className="min-w-0">
              <p className="admin-dashboard-eyebrow text-xs font-bold uppercase tracking-[0.2em]">Admin Dashboard</p>
              <h1 className="font-display mt-2 text-headline-lg font-extrabold text-primary drop-shadow-sm">Admin Dashboard</h1>
              <p className="mt-2 max-w-3xl text-body-sm font-medium text-on-surface">
                Overview of users, races, bets, deposits, withdrawals, and system cash flow.
              </p>
              <div className="mt-4 inline-flex items-center gap-2 rounded-md border border-primary/20 bg-surface-container-high/80 px-3 py-2 text-label-sm font-bold text-on-surface">
                <Clock className="h-4 w-4 text-primary" />
                Last updated: {lastUpdatedAt ? formatDateTime(lastUpdatedAt) : 'Not loaded yet'}
              </div>
            </div>

            <button
              type="button"
              onClick={() => void loadSummary('refresh')}
              disabled={isLoading || isRefreshing}
              aria-label="Refresh admin dashboard"
              className="gold-gradient inline-flex items-center justify-center gap-2 rounded-md px-5 py-3 text-body-sm font-extrabold text-on-primary shadow-lg shadow-primary/15 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-primary/25 disabled:cursor-not-allowed disabled:opacity-70"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading || isRefreshing ? 'animate-spin' : ''}`} />
              {isRefreshing ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </section>

        <DashboardFilterBar
          filters={filters}
          tournaments={tournaments}
          scopeLabel={filterScopeLabel}
          isLoading={isRefreshing}
          prizeAwardAmount={awardedPrizeCents}
          onChange={setFilters}
          onClear={() => setFilters(defaultFilters())}
        />


        {filterErrorMessage && (
          <section className="mb-6 rounded-lg border border-error/30 bg-error-container/20 px-4 py-3 text-body-sm font-semibold text-error">
            {filterErrorMessage}
          </section>
        )}

        {errorMessage && (
          <DashboardError message={errorMessage} onRetry={() => void loadSummary(summary ? 'refresh' : 'initial')} />
        )}

        <section className="mb-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {isLoading && !summary
            ? Array.from({ length: 8 }, (_, index) => <MetricSkeleton key={index} />)
            : metrics.map((metric, index) => (
                <DashboardMetricCard key={metric.title} metric={metric} index={index} reducedMotion={false} />
              ))}
        </section>

        <section className="mb-6 grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
          <DashboardPanel title="Cash Flow" subtitle="Deposits, withdrawals, awarded prizes, and net cash flow by day." isRefreshing={isRefreshing}>
            {isLoading && !summary ? <ChartSkeleton /> : <CashFlowChart data={cashFlowData} reducedMotion={false} />}
          </DashboardPanel>

          <DashboardPanel title="Financial Movement Overview" subtitle="Completed deposits, paid withdrawals, and awarded prizes." isRefreshing={isRefreshing}>
            {isLoading && !summary ? (
              <ChartSkeleton compact />
            ) : (
              <FinancialOverviewDonut
                depositAmount={totalDepositCents}
                withdrawalAmount={totalWithdrawalCents}
                prizeAwardAmount={awardedPrizeCents}
                reducedMotion={false}
              />
            )}
          </DashboardPanel>
        </section>

        <section className="mb-6">
          <DashboardPanel title="Recent Transactions" subtitle="Newest wallet transactions returned by the summary API." isRefreshing={isRefreshing}>
            {isLoading && !summary ? <TransactionTableSkeleton /> : <RecentTransactionsTable transactions={recentTransactions} />}
          </DashboardPanel>
        </section>
      </div>
    </motion.div>
  );
};

const getFilterScopeLabel = (filters: DashboardFilters, tournamentName?: string) => {
  const dateLabel = filters.dateMode === 'all'
    ? 'All time'
    : filters.dateMode === 'day'
      ? filters.day
      : filters.dateMode === 'month'
        ? filters.month
        : filters.year;
  const tournamentLabel = tournamentName ?? (filters.tournamentId ? `Tournament #${filters.tournamentId}` : 'All tournaments');

  return `${dateLabel} / ${tournamentLabel}`;
};

const DashboardFilterBar = ({
  filters,
  tournaments,
  scopeLabel,
  isLoading,
  prizeAwardAmount,
  onChange,
  onClear,
}: {
  filters: DashboardFilters;
  tournaments: AdminTournamentOption[];
  scopeLabel: string;
  isLoading: boolean;
  prizeAwardAmount: bigint;
  onChange: (filters: DashboardFilters) => void;
  onClear: () => void;
}) => {
  const updateFilters = (changes: Partial<DashboardFilters>) => onChange({ ...filters, ...changes });

  return (
    <section className="admin-dashboard-panel mb-6 rounded-lg p-5">
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-2 text-label-sm font-bold uppercase tracking-[0.16em] text-secondary">
            <Filter className="h-4 w-4" />
            Dashboard Filters
          </div>
          <p className="mt-2 text-body-sm font-semibold text-on-surface-variant">Current scope: <span className="text-primary">{scopeLabel}</span></p>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-body-sm font-semibold text-on-surface-variant">
          <span className="inline-flex items-center gap-2 rounded-md border border-outline-variant/50 bg-surface-container-lowest/60 px-3 py-2">
            <Trophy className="h-4 w-4 text-primary" />
            Awarded prizes: <strong className="text-primary">{formatMoneyFromCents(prizeAwardAmount)}</strong>
          </span>
          {isLoading && <Loader2 className="h-4 w-4 animate-spin text-primary" aria-label="Loading prize award data" />}
        </div>
      </div>

      <div className="grid gap-3 xl:grid-cols-[180px_minmax(180px,1fr)_minmax(180px,1fr)_auto]">
        <label className="grid gap-1.5 text-label-sm font-bold uppercase tracking-[0.12em] text-on-surface-variant">
          Period
          <select
            value={filters.dateMode}
            onChange={(event) => updateFilters({ dateMode: event.target.value as DashboardDateMode })}
            className="h-11 rounded-md border border-outline-variant bg-surface-container-low px-3 text-body-sm font-semibold text-on-surface focus:border-primary focus:outline-none"
          >
            <option value="all">All Time</option>
            <option value="day">Day</option>
            <option value="month">Month</option>
            <option value="year">Year</option>
          </select>
        </label>

        <label className="grid gap-1.5 text-label-sm font-bold uppercase tracking-[0.12em] text-on-surface-variant">
          Date Value
          {filters.dateMode === 'day' ? (
            <input
              type="date"
              value={filters.day}
              onChange={(event) => updateFilters({ day: event.target.value })}
              className="h-11 rounded-md border border-outline-variant bg-surface-container-low px-3 text-body-sm font-semibold text-on-surface focus:border-primary focus:outline-none"
            />
          ) : filters.dateMode === 'month' ? (
            <input
              type="month"
              value={filters.month}
              onChange={(event) => updateFilters({ month: event.target.value })}
              className="h-11 rounded-md border border-outline-variant bg-surface-container-low px-3 text-body-sm font-semibold text-on-surface focus:border-primary focus:outline-none"
            />
          ) : filters.dateMode === 'year' ? (
            <input
              type="number"
              min="2020"
              max="2100"
              value={filters.year}
              onChange={(event) => updateFilters({ year: event.target.value })}
              className="h-11 rounded-md border border-outline-variant bg-surface-container-low px-3 text-body-sm font-semibold text-on-surface focus:border-primary focus:outline-none"
            />
          ) : (
            <div className="flex h-11 items-center rounded-md border border-outline-variant bg-surface-container-low px-3 text-body-sm font-semibold text-on-surface-variant">
              All available dates
            </div>
          )}
        </label>

        <label className="grid gap-1.5 text-label-sm font-bold uppercase tracking-[0.12em] text-on-surface-variant">
          Tournament
          <select
            value={filters.tournamentId}
            onChange={(event) => updateFilters({ tournamentId: event.target.value })}
            className="h-11 rounded-md border border-outline-variant bg-surface-container-low px-3 text-body-sm font-semibold text-on-surface focus:border-primary focus:outline-none"
          >
            <option value="">All tournaments</option>
            {tournaments.map((tournament) => (
              <option key={tournament.tournamentId} value={String(tournament.tournamentId)}>
                {tournament.tournamentName}
              </option>
            ))}
          </select>
        </label>

        <button
          type="button"
          onClick={onClear}
          className="mt-auto inline-flex h-11 items-center justify-center gap-2 rounded-md border border-outline-variant px-4 text-body-sm font-bold text-on-surface-variant transition-colors hover:border-primary hover:text-primary"
        >
          <CalendarDays className="h-4 w-4" />
          Reset
        </button>
      </div>
    </section>
  );
};

type MetricItem = {
  title: string;
  value: string;
  helper: string;
  icon: ReactNode;
};

type CashFlowPoint = {
  date: string;
  depositCents: bigint;
  withdrawalCents: bigint;
  prizeAwardCents: bigint;
  netCashFlowCents: bigint;
};

const normalizeCashFlow = (items?: AdminDashboardCashFlowByDay[] | null): CashFlowPoint[] => {
  if (!Array.isArray(items)) {
    return [];
  }

  return items
    .map((item) => {
      const depositCents = moneyToCents(item.depositAmount) ?? 0n;
      const withdrawalCents = moneyToCents(item.withdrawalAmount) ?? 0n;
      const prizeAwardCents = moneyToCents(item.prizeAwardAmount) ?? 0n;
      const explicitNet = moneyToCents(item.netCashFlow);

      return {
        date: item.date ?? '',
        depositCents,
        withdrawalCents,
        prizeAwardCents,
        netCashFlowCents: explicitNet ?? depositCents - withdrawalCents - prizeAwardCents,
      };
    })
    .filter((item) => item.date)
    .sort((first, second) => first.date.localeCompare(second.date));
};

const DashboardMetricCard = ({ metric, index, reducedMotion }: { metric: MetricItem; index: number; reducedMotion: boolean }) => (
  <motion.article
    custom={index}
    variants={reducedMotion ? undefined : metricCardVariants}
    initial={reducedMotion ? false : 'hidden'}
    animate="visible"
    whileHover={{ y: -5, transition: { duration: 0.22 } }}
    className="admin-kpi-card group min-h-[158px] rounded-lg p-5"
  >
    <div className="mb-4 flex items-start justify-between gap-4">
      <div className="admin-kpi-icon flex h-12 w-12 shrink-0 items-center justify-center rounded-md text-primary">
        {metric.icon}
      </div>
      <span className="admin-live-chip rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em]">
        Live
      </span>
    </div>
    <h2 className="admin-kpi-title text-label-sm font-extrabold uppercase tracking-[0.14em]">{metric.title}</h2>
    <p className="admin-kpi-value font-display mt-2 break-words text-2xl font-extrabold md:text-3xl">{metric.value}</p>
    <p className="admin-kpi-helper mt-2 text-body-sm font-semibold">{metric.helper}</p>
  </motion.article>
);

const MetricSkeleton = () => (
  <div className="admin-kpi-card min-h-[158px] rounded-lg p-5">
    <div className="mb-5 h-11 w-11 animate-pulse rounded-md bg-surface-container-high" />
    <div className="mb-3 h-3 w-28 animate-pulse rounded-full bg-surface-container-high" />
    <div className="mb-3 h-8 w-36 animate-pulse rounded-full bg-surface-container-high" />
    <div className="h-3 w-44 animate-pulse rounded-full bg-surface-container-high" />
  </div>
);

const DashboardPanel = ({
  title,
  subtitle,
  isRefreshing,
  children,
}: {
  title: string;
  subtitle: string;
  isRefreshing: boolean;
  children: ReactNode;
}) => (
  <motion.section className="admin-dashboard-panel rounded-lg p-5" variants={panelVariants} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.18 }}>
    <div className="mb-5 flex items-start justify-between gap-4">
      <div>
        <h2 className="text-title-lg font-bold text-primary">{title}</h2>
        <p className="mt-1 text-body-sm text-on-surface-variant">{subtitle}</p>
      </div>
      {isRefreshing && <Loader2 className="h-4 w-4 animate-spin text-primary" aria-label="Refreshing section" />}
    </div>
    {children}
  </motion.section>
);

const ChartSkeleton = ({ compact = false }: { compact?: boolean }) => (
  <div className={`${compact ? 'min-h-[260px]' : 'min-h-[360px]'} admin-chart-surface rounded-lg p-4`}>
    <div className="mb-6 h-4 w-48 animate-pulse rounded-full bg-surface-container-high" />
    <div className="flex h-[220px] items-end gap-3">
      {Array.from({ length: 9 }, (_, index) => (
        <div key={index} className="flex flex-1 items-end">
          <div className="w-full animate-pulse rounded-t-md bg-surface-container-high" style={{ height: `${48 + (index % 5) * 24}px` }} />
        </div>
      ))}
    </div>
  </div>
);

const ChartEmptyState = ({ title, text }: { title: string; text: string }) => (
  <div className="flex min-h-[260px] flex-col items-center justify-center admin-chart-surface rounded-lg px-6 py-10 text-center">
    <Banknote className="mb-4 h-8 w-8 text-outline" />
    <h3 className="text-body-lg font-bold text-primary">{title}</h3>
    <p className="mt-2 max-w-md text-body-sm text-on-surface-variant">{text}</p>
  </div>
);

const getSeriesRange = (points: CashFlowPoint[]) => {
  const values = points.flatMap((point) => [point.depositCents, point.withdrawalCents, point.prizeAwardCents, point.netCashFlowCents, 0n]);
  const min = values.reduce((current, value) => (value < current ? value : current), values[0] ?? 0n);
  const max = values.reduce((current, value) => (value > current ? value : current), values[0] ?? 0n);

  if (min === max) {
    return { min: 0n, max: max === 0n ? 100n : max };
  }

  return { min, max };
};

const CashFlowChart = ({ data, reducedMotion }: { data: CashFlowPoint[]; reducedMotion: boolean }) => {
  if (data.length === 0) {
    return <ChartEmptyState title="No cash-flow activity is available." text="Completed deposits, paid withdrawals, and awarded prizes have not produced chartable daily data yet." />;
  }

  const width = 720;
  const height = 300;
  const padding = { top: 22, right: 24, bottom: 48, left: 54 };
  const range = getSeriesRange(data);
  const span = Number(range.max - range.min || 1n);
  const x = (index: number) => padding.left + (index / Math.max(data.length - 1, 1)) * (width - padding.left - padding.right);
  const y = (value: bigint) => padding.top + (Number(range.max - value) / span) * (height - padding.top - padding.bottom);
  const zeroY = y(0n);
  const linePath = (selector: (point: CashFlowPoint) => bigint) => data.map((point, index) => `${index === 0 ? 'M' : 'L'} ${x(index)} ${y(selector(point))}`).join(' ');
  const areaPath = (selector: (point: CashFlowPoint) => bigint) => `${linePath(selector)} L ${x(data.length - 1)} ${zeroY} L ${x(0)} ${zeroY} Z`;
  const ticks = data.filter((_, index) => index === 0 || index === data.length - 1 || index % Math.ceil(data.length / 5) === 0);

  return (
    <div className="overflow-hidden admin-chart-surface rounded-lg p-4" role="img" aria-label="Cash flow by day chart">
      <div className="mb-4 flex flex-wrap gap-4 text-label-sm font-semibold text-on-surface-variant">
        <LegendItem color="bg-secondary" label="Successful Deposit" />
        <LegendItem color="bg-tertiary" label="Completed Withdrawal" />
        <LegendItem color="bg-error" label="Awarded Prize" />
        <LegendItem color="bg-primary" label="Net Cash Flow" />
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-[320px] w-full" preserveAspectRatio="none">
        <defs>
          <linearGradient id="depositArea" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="var(--color-secondary)" stopOpacity="0.32" />
            <stop offset="100%" stopColor="var(--color-secondary)" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map((ratio) => (
          <line key={ratio} x1={padding.left} x2={width - padding.right} y1={padding.top + ratio * (height - padding.top - padding.bottom)} y2={padding.top + ratio * (height - padding.top - padding.bottom)} stroke="var(--color-outline-variant)" strokeOpacity="0.45" />
        ))}
        <line x1={padding.left} x2={width - padding.right} y1={zeroY} y2={zeroY} stroke="var(--color-outline)" strokeOpacity="0.45" />
        <path d={areaPath((point) => point.depositCents)} fill="url(#depositArea)" className={reducedMotion ? '' : 'cash-flow-draw'} />
        <path d={linePath((point) => point.depositCents)} fill="none" stroke="var(--color-secondary)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={reducedMotion ? '' : 'cash-flow-draw'} />
        <path d={linePath((point) => point.withdrawalCents)} fill="none" stroke="var(--color-tertiary)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={reducedMotion ? '' : 'cash-flow-draw'} />
        <path d={linePath((point) => point.prizeAwardCents)} fill="none" stroke="var(--color-error)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={reducedMotion ? '' : 'cash-flow-draw'} />
        <path d={linePath((point) => point.netCashFlowCents)} fill="none" stroke="var(--color-primary)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={reducedMotion ? '' : 'cash-flow-draw'} />
        {data.map((point, index) => (
          <g key={`${point.date}-${index}`}>
            <circle cx={x(index)} cy={y(point.netCashFlowCents)} r="4" fill="var(--color-primary)">
              <title>{`${formatShortDate(point.date)} net: ${formatMoneyFromCents(point.netCashFlowCents)}`}</title>
            </circle>
          </g>
        ))}
        {ticks.map((point, index) => (
          <text key={`${point.date}-${index}`} x={x(data.indexOf(point))} y={height - 14} textAnchor="middle" fill="var(--color-outline)" fontSize="12" fontWeight="700">
            {formatShortDate(point.date)}
          </text>
        ))}
      </svg>
    </div>
  );
};

const LegendItem = ({ color, label }: { color: string; label: string }) => (
  <span className="inline-flex items-center gap-2">
    <span className={`h-2.5 w-2.5 rounded-full ${color}`} />
    {label}
  </span>
);

const FinancialOverviewDonut = ({
  depositAmount,
  withdrawalAmount,
  prizeAwardAmount,
  reducedMotion,
}: {
  depositAmount?: bigint | number | string | null;
  withdrawalAmount?: bigint | number | string | null;
  prizeAwardAmount?: bigint | number | string | null;
  reducedMotion: boolean;
}) => {
  const toCents = (value: bigint | number | string | null | undefined) => (
    typeof value === 'bigint' ? value : moneyToCents(value) ?? 0n
  );
  const depositCents = toCents(depositAmount);
  const withdrawalCents = toCents(withdrawalAmount);
  const prizeCents = toCents(prizeAwardAmount);
  const total = depositCents + withdrawalCents + prizeCents;

  if (total === 0n) {
    return <ChartEmptyState title="No completed financial transactions are available yet." text="Successful deposits, paid withdrawals, and awarded prizes are all zero in this scope." />;
  }

  const depositPercent = Number((depositCents * 10000n) / total) / 100;
  const withdrawalPercent = Number((withdrawalCents * 10000n) / total) / 100;
  const prizePercent = Math.max(0, 100 - depositPercent - withdrawalPercent);
  const circumference = 2 * Math.PI * 42;
  const depositLength = (depositPercent / 100) * circumference;
  const withdrawalLength = (withdrawalPercent / 100) * circumference;

  return (
    <div className="grid min-h-[260px] place-items-center gap-5 md:grid-cols-[180px_minmax(0,1fr)] xl:grid-cols-1">
      <svg viewBox="0 0 120 120" className="h-44 w-44" role="img" aria-label="Financial movement donut chart">
        <circle cx="60" cy="60" r="42" fill="none" stroke="var(--color-surface-container-high)" strokeWidth="16" />
        <circle
          cx="60"
          cy="60"
          r="42"
          fill="none"
          stroke="var(--color-secondary)"
          strokeWidth="16"
          strokeDasharray={`${depositLength} ${circumference}`}
          strokeLinecap="round"
          transform="rotate(-90 60 60)"
          className={reducedMotion ? '' : 'donut-segment'}
        />
        <circle
          cx="60"
          cy="60"
          r="42"
          fill="none"
          stroke="var(--color-tertiary)"
          strokeWidth="16"
          strokeDasharray={`${withdrawalLength} ${circumference}`}
          strokeDashoffset={-depositLength}
          strokeLinecap="round"
          transform="rotate(-90 60 60)"
          className={reducedMotion ? '' : 'donut-segment'}
        />
        <circle
          cx="60"
          cy="60"
          r="42"
          fill="none"
          stroke="var(--color-error)"
          strokeWidth="16"
          strokeDasharray={`${(prizePercent / 100) * circumference} ${circumference}`}
          strokeDashoffset={-(depositLength + withdrawalLength)}
          strokeLinecap="round"
          transform="rotate(-90 60 60)"
          className={reducedMotion ? '' : 'donut-segment'}
        />
        <text x="60" y="54" textAnchor="middle" fill="var(--color-primary)" fontSize="15" fontWeight="800">{depositPercent.toFixed(0)}%</text>
        <text x="60" y="70" textAnchor="middle" fill="var(--color-outline)" fontSize="9" fontWeight="700">deposit</text>
      </svg>
      <div className="w-full space-y-3">
        <FinancialLegendRow label="Successful Deposits" amount={formatMoneyFromCents(depositCents)} percent={depositPercent} tone="deposit" />
        <FinancialLegendRow label="Completed Withdrawals" amount={formatMoneyFromCents(withdrawalCents)} percent={withdrawalPercent} tone="withdrawal" />
        <FinancialLegendRow label="Awarded Prizes" amount={formatMoneyFromCents(prizeCents)} percent={prizePercent} tone="prize" />
      </div>
    </div>
  );
};
const FinancialLegendRow = ({ label, amount, percent, tone }: { label: string; amount: string; percent: number; tone: 'deposit' | 'withdrawal' | 'prize' }) => (
  <div className="admin-mini-surface rounded-md p-3">
    <div className="flex items-center justify-between gap-3">
      <span className="inline-flex items-center gap-2 text-body-sm font-bold text-on-surface">
        <span className={`h-2.5 w-2.5 rounded-full ${tone === 'deposit' ? 'bg-secondary' : tone === 'withdrawal' ? 'bg-tertiary' : 'bg-error'}`} />
        {label}
      </span>
      <span className="text-label-sm font-bold text-primary">{percent.toFixed(1)}%</span>
    </div>
    <p className="mt-2 break-words text-body-sm font-semibold text-on-surface-variant">{amount}</p>
  </div>
);

const RecentTransactionsTable = ({ transactions }: { transactions: AdminDashboardRecentTransaction[] }) => {
  if (transactions.length === 0) {
    return <ChartEmptyState title="No recent transactions are available." text="The summary API returned an empty recentTransactions list." />;
  }

  return (
    <div className="overflow-x-auto admin-chart-surface rounded-lg">
      <table className="w-full min-w-[760px] text-left">
        <thead className="bg-surface-container">
          <tr>
            <TableHeader>Transaction</TableHeader>
            <TableHeader>User</TableHeader>
            <TableHeader>Type</TableHeader>
            <TableHeader>Amount</TableHeader>
            <TableHeader>Status</TableHeader>
            <TableHeader>Created</TableHeader>
          </tr>
        </thead>
        <tbody className="divide-y divide-outline-variant/40">
          {transactions.map((transaction) => (
            <tr key={`${transaction.txId ?? 'tx'}-${transaction.createdAt ?? ''}`} className="transition-all duration-200 hover:bg-surface-container-high/70">
              <TableCell strong>#{transaction.txId ?? '-'}</TableCell>
              <TableCell>
                <p className="font-bold text-on-surface">{transaction.userFullName || transaction.username || `User #${transaction.userId ?? '-'}`}</p>
                {transaction.username && <p className="mt-1 text-label-sm text-outline">@{transaction.username}</p>}
              </TableCell>
              <TableCell><TransactionTypeBadge type={transaction.txType} refType={transaction.refType} /></TableCell>
              <TableCell>{getTransactionAmount(transaction)}</TableCell>
              <TableCell><StatusBadge status={transaction.status} /></TableCell>
              <TableCell>{formatDateTime(transaction.createdAt)}</TableCell>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const TransactionTableSkeleton = () => (
  <div className="admin-chart-surface rounded-lg p-4">
    {Array.from({ length: 5 }, (_, index) => (
      <div key={index} className="grid grid-cols-[1fr_1.4fr_1fr_1fr] gap-4 border-b border-outline-variant/20 py-4 last:border-b-0">
        <span className="h-4 animate-pulse rounded-full bg-surface-container-high" />
        <span className="h-4 animate-pulse rounded-full bg-surface-container-high" />
        <span className="h-4 animate-pulse rounded-full bg-surface-container-high" />
        <span className="h-4 animate-pulse rounded-full bg-surface-container-high" />
      </div>
    ))}
  </div>
);

const TransactionTypeBadge = ({ type, refType }: { type?: string | null; refType?: string | null }) => {
  const normalizedType = String(type ?? '').toLowerCase();
  const icon = normalizedType === 'topup'
    ? <ArrowDownToLine className="h-3.5 w-3.5" />
    : normalizedType === 'withdrawal'
      ? <ArrowUpFromLine className="h-3.5 w-3.5" />
      : <Banknote className="h-3.5 w-3.5" />;

  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-outline-variant bg-surface-container-low px-3 py-1 text-label-sm font-bold text-on-surface-variant">
      {icon}
      {humanizeLabel(type)}
      {refType && <span className="text-outline">/{humanizeLabel(refType)}</span>}
    </span>
  );
};

const StatusBadge = ({ status }: { status?: string | null }) => {
  const normalizedStatus = String(status ?? '').toLowerCase();
  const toneClass = normalizedStatus === 'completed' || normalizedStatus === 'paid'
    ? 'border-secondary/30 bg-secondary/10 text-secondary'
    : normalizedStatus === 'pending'
      ? 'border-primary/30 bg-primary/10 text-primary'
      : normalizedStatus === 'failed' || normalizedStatus === 'cancelled' || normalizedStatus === 'rejected'
        ? 'border-error/30 bg-error-container/20 text-error'
        : 'border-outline-variant bg-surface-container text-on-surface-variant';

  return <span className={`inline-flex rounded-full border px-3 py-1 text-label-sm font-bold uppercase ${toneClass}`}>{humanizeLabel(status)}</span>;
};

const TableHeader = ({ children }: { children: ReactNode }) => (
  <th className="px-4 py-3 text-label-sm uppercase tracking-wider text-outline">{children}</th>
);

const TableCell = ({ children, strong = false }: { children: ReactNode; strong?: boolean }) => (
  <td className={`px-4 py-4 text-body-sm ${strong ? 'font-bold text-primary' : 'font-semibold text-on-surface-variant'}`}>{children}</td>
);

const DashboardError = ({ message, onRetry }: { message: string; onRetry: () => void }) => (
  <section className="mb-6 rounded-lg border border-error/30 bg-error-container/20 p-5 text-error">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
        <div>
          <h2 className="font-bold">Dashboard summary could not be loaded.</h2>
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

class AdminDashboardErrorBoundary extends Component<{ children: ReactNode }, { message: string }> {
  state = { message: '' };

  static getDerivedStateFromError(error: unknown) {
    return {
      message: error instanceof Error ? error.message : 'Unexpected dashboard rendering error.',
    };
  }

  render() {
    if (this.state.message) {
      return (
        <div className="min-h-screen bg-surface py-8">
          <div className="admin-dashboard-content mx-auto max-w-[1440px] px-4 md:px-8">
            <DashboardError
              message={this.state.message}
              onRetry={() => {
                this.setState({ message: '' });
                window.location.reload();
              }}
            />
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const AdminOperationsPage = () => (
  <AdminDashboardErrorBoundary>
    <AdminOperationsDashboard />
  </AdminDashboardErrorBoundary>
);

export default AdminOperationsPage;
