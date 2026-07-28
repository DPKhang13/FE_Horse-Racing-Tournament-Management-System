import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  AlertTriangle,
  Banknote,
  CalendarClock,
  CircleDollarSign,
  Download,
  Flag,
  LineChart,
  Loader2,
  RefreshCw,
  Ticket,
  TrendingUp,
  Users,
  WalletCards,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  activeRaceStatuses,
  adminDashboardService,
  dateRangeLabels,
  getDateRangeBounds,
  isWithinDateRange,
  type AdminDashboardCashFlowPoint,
  type AdminDashboardData,
  type AdminDashboardDateRange,
} from '../../services/adminDashboardService';
import type { AdminRaceItem } from './adminScheduleRaceApi';
import type { BetItem } from '../../services/betService';

const dateRangeOptions: AdminDashboardDateRange[] = ['today', 'last7', 'last30', 'all'];

const formatInteger = (value: number | undefined) => {
  if (value === undefined) {
    return 'N/A';
  }

  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(value);
};

const formatMoneyCents = (value: bigint | undefined) => {
  if (value === undefined) {
    return 'N/A';
  }

  const sign = value < 0n ? '-' : '';
  const absoluteValue = value < 0n ? -value : value;
  const wholeUnits = absoluteValue / 100n;
  const formattedUnits = wholeUnits.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');

  return `${sign}${formattedUnits} VND`;
};

const formatDateTime = (value?: string) => {
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

const formatShortDate = (value: string) => {
  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const normalizeStatus = (value: unknown) => String(value ?? '').trim().toLowerCase().replace(/[\s-]+/g, '_');

const getDateKey = (value?: string) => {
  if (!value) {
    return undefined;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return undefined;
  }

  return date.toISOString().slice(0, 10);
};

const compareByTimeDesc = (left?: string, right?: string) => {
  const leftTime = left ? new Date(left).getTime() : 0;
  const rightTime = right ? new Date(right).getTime() : 0;

  return (Number.isNaN(rightTime) ? 0 : rightTime) - (Number.isNaN(leftTime) ? 0 : leftTime);
};

const getPeriodSubtitle = (range: AdminDashboardDateRange) => {
  if (range === 'all') {
    return 'All completed records exposed by the backend';
  }

  const bounds = getDateRangeBounds(range);
  return bounds.from ? `Filtered from ${formatDateTime(bounds.from)}` : 'Filtered by selected period';
};

const buildBettingSeries = (bets: BetItem[], range: AdminDashboardDateRange): ChartPoint[] => {
  const counts = new Map<string, number>();

  bets.forEach((bet) => {
    const dateKey = getDateKey(bet.createdAt);

    if (dateKey) {
      counts.set(dateKey, (counts.get(dateKey) ?? 0) + 1);
    }
  });

  if (range === 'all') {
    return Array.from(counts.entries())
      .sort(([leftDate], [rightDate]) => leftDate.localeCompare(rightDate))
      .slice(-14)
      .map(([date, value]) => ({ date, value }));
  }

  const bounds = getDateRangeBounds(range);
  const start = bounds.from ? new Date(bounds.from) : new Date();
  const end = bounds.to ? new Date(bounds.to) : new Date();
  const series: ChartPoint[] = [];
  const cursor = new Date(start);

  cursor.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);

  while (cursor.getTime() <= end.getTime()) {
    const date = cursor.toISOString().slice(0, 10);
    series.push({ date, value: counts.get(date) ?? 0 });
    cursor.setDate(cursor.getDate() + 1);
  }

  return series;
};

const AdminOperationsPage = () => {
  const [dateRange, setDateRange] = useState<AdminDashboardDateRange>('last30');
  const [dashboardData, setDashboardData] = useState<AdminDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const requestIdRef = useRef(0);

  const loadDashboard = async (range: AdminDashboardDateRange) => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    setIsLoading(true);

    try {
      const data = await adminDashboardService.loadDashboard(range);

      if (requestId === requestIdRef.current) {
        setDashboardData(data);
      }
    } finally {
      if (requestId === requestIdRef.current) {
        setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      void loadDashboard(dateRange);
    }, 0);

    return () => window.clearTimeout(timerId);
  }, [dateRange]);

  const periodBets = useMemo(
    () => dashboardData?.bets.filter((bet) => isWithinDateRange(bet.createdAt, dateRange)) ?? [],
    [dashboardData?.bets, dateRange],
  );

  const raceBetCounts = useMemo(() => {
    const counts = new Map<number, number>();

    dashboardData?.bets.forEach((bet) => {
      if (bet.raceId !== undefined) {
        counts.set(bet.raceId, (counts.get(bet.raceId) ?? 0) + 1);
      }
    });

    return counts;
  }, [dashboardData?.bets]);

  const activeRaceCount = useMemo(
    () => dashboardData?.races.filter((race) => activeRaceStatuses.includes(normalizeStatus(race.status) as (typeof activeRaceStatuses)[number])).length ?? 0,
    [dashboardData?.races],
  );

  const recentRaces = useMemo(
    () => [...(dashboardData?.races ?? [])]
      .sort((first, second) => compareByTimeDesc(first.scheduledAt, second.scheduledAt))
      .slice(0, 8),
    [dashboardData?.races],
  );

  const bettingSeries = useMemo(() => buildBettingSeries(periodBets, dateRange), [periodBets, dateRange]);
  const cashFlowSeries = dashboardData?.financialSummary?.cashFlowByDay ?? [];
  const hasFinancialSummary = Boolean(dashboardData?.financialSummary);
  const hasBlockingError = !dashboardData && !isLoading;

  return (
    <div className="min-h-screen bg-surface py-8">
      <div className="mx-auto max-w-[1440px] px-4 md:px-8">
        <section className="glass-panel mb-6 rounded-lg p-6">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-secondary">Admin Dashboard</p>
              <h1 className="font-display mt-2 text-headline-lg font-extrabold text-primary">Business overview</h1>
              <p className="mt-2 max-w-3xl text-body-sm text-on-surface-variant">
                Core system counts use existing list APIs. Cash-flow and withdrawal metrics stay separated from betting points and require the admin summary endpoint when backend data is not exposed.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {dateRangeOptions.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setDateRange(option)}
                  className={`rounded-md border px-4 py-2 text-label-sm font-bold transition-colors ${
                    dateRange === option
                      ? 'border-primary bg-primary text-on-primary'
                      : 'border-outline-variant bg-surface-container-low text-on-surface-variant hover:border-primary hover:text-primary'
                  }`}
                >
                  {dateRangeLabels[option]}
                </button>
              ))}
              <button
                type="button"
                onClick={() => void loadDashboard(dateRange)}
                disabled={isLoading}
                className="inline-flex items-center justify-center gap-2 rounded-md border border-outline-variant bg-surface-container-low px-4 py-2 text-label-sm font-bold text-on-surface-variant transition-colors hover:border-primary hover:text-primary disabled:opacity-60"
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                Retry
              </button>
            </div>
          </div>
        </section>

        {hasBlockingError && (
          <StatusBanner tone="error" text="Dashboard data could not be loaded. Use Retry after checking the backend service." />
        )}

        {dashboardData?.errors.length ? (
          <section className="mb-6 grid gap-3 lg:grid-cols-2">
            {dashboardData.errors.map((error) => (
              <StatusBanner key={`${error.section}-${error.message}`} tone={error.section === 'financial' ? 'warning' : 'error'} text={error.message} />
            ))}
          </section>
        ) : null}

        <section className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard icon={<Users className="h-5 w-5" />} title="Total Users" value={isLoading ? '...' : formatInteger(dashboardData?.totalUsers)} label="All-time users from admin page total" />
          <MetricCard icon={<Flag className="h-5 w-5" />} title="Total Races" value={isLoading ? '...' : formatInteger(dashboardData?.races.length)} label="All loaded tournament races" />
          <MetricCard icon={<CalendarClock className="h-5 w-5" />} title="Active Races" value={isLoading ? '...' : formatInteger(activeRaceCount)} label="registration_open, open_for_betting, ongoing, in_progress" />
          <MetricCard icon={<Ticket className="h-5 w-5" />} title="Total Bets" value={isLoading ? '...' : formatInteger(periodBets.length)} label={getPeriodSubtitle(dateRange)} />
          <MetricCard icon={<Download className="h-5 w-5" />} title="Total Deposits" value={isLoading ? '...' : formatMoneyCents(dashboardData?.financialSummary?.totalSuccessfulDepositAmountCents)} label="completed topup cash only" unavailable={!hasFinancialSummary} />
          <MetricCard icon={<WalletCards className="h-5 w-5" />} title="Total Withdrawals" value={isLoading ? '...' : formatMoneyCents(dashboardData?.financialSummary?.totalCompletedWithdrawalAmountCents)} label="completed withdrawal cash only" unavailable={!hasFinancialSummary} />
          <MetricCard icon={<AlertTriangle className="h-5 w-5" />} title="Pending Withdrawals" value={isLoading ? '...' : formatInteger(dashboardData?.financialSummary?.pendingWithdrawalCount)} label="pending withdrawal requests" unavailable={!hasFinancialSummary} />
          <MetricCard icon={<CircleDollarSign className="h-5 w-5" />} title="Net Cash Flow" value={isLoading ? '...' : formatMoneyCents(dashboardData?.financialSummary?.netCashFlowCents)} label="successful deposits - completed withdrawals" unavailable={!hasFinancialSummary} />
        </section>

        <section className="mb-6 grid gap-6 xl:grid-cols-2">
          <DashboardPanel
            title="Cash Flow"
            subtitle="Successful deposits and completed withdrawals by day"
            action={<Link className="text-label-sm font-bold text-primary hover:underline" to="/admin-ops">Backend summary</Link>}
          >
            {isLoading ? <PanelLoading /> : <CashFlowChart points={cashFlowSeries} />}
          </DashboardPanel>

          <DashboardPanel
            title="Betting Activity"
            subtitle="Bet count by placed date, filtered by selected range"
            action={<Link className="text-label-sm font-bold text-primary hover:underline" to="/admin/bets">Manage Bets</Link>}
          >
            {isLoading ? <PanelLoading /> : <BarChart points={bettingSeries} />}
          </DashboardPanel>
        </section>

        {dashboardData?.limitations.length ? <BackendLimitations limitations={dashboardData.limitations} /> : null}

        <section className="grid gap-6 xl:grid-cols-2">
          <DashboardPanel
            title="Recent Transactions"
            subtitle="Latest admin-visible wallet transactions"
            action={<span className="text-label-sm font-bold text-outline">No admin transaction page</span>}
          >
            <RecentTransactionsTable isLoading={isLoading} data={dashboardData} />
          </DashboardPanel>

          <DashboardPanel
            title="Recent Races"
            subtitle="Latest races by scheduled start time"
            action={<Link className="text-label-sm font-bold text-primary hover:underline" to="/admin/races">Manage Races</Link>}
          >
            <RecentRacesTable isLoading={isLoading} races={recentRaces} raceBetCounts={raceBetCounts} />
          </DashboardPanel>
        </section>
      </div>
    </div>
  );
};

type ChartPoint = {
  date: string;
  value: number;
};

const MetricCard = ({
  icon,
  title,
  value,
  label,
  unavailable = false,
}: {
  icon: ReactNode;
  title: string;
  value: string;
  label: string;
  unavailable?: boolean;
}) => (
  <article className={`rounded-lg border p-4 shadow-sm ${unavailable ? 'border-outline-variant/30 bg-surface-container-low/50' : 'border-outline-variant/40 bg-surface-container-lowest/70'}`}>
    <div className="mb-4 flex items-start justify-between gap-3 text-on-surface-variant">
      <div className="min-w-0">
        <h2 className="text-[10px] font-bold uppercase tracking-[0.16em] text-outline">{title}</h2>
        <p className="mt-1 text-label-sm text-on-surface-variant">{label}</p>
      </div>
      <span className={unavailable ? 'text-outline' : 'text-primary'}>{icon}</span>
    </div>
    <p className={`font-display break-words text-2xl font-extrabold ${unavailable ? 'text-outline' : 'text-on-surface'}`}>{value}</p>
  </article>
);

const DashboardPanel = ({
  title,
  subtitle,
  action,
  children,
}: {
  title: string;
  subtitle: string;
  action?: ReactNode;
  children: ReactNode;
}) => (
  <section className="glass-panel rounded-lg p-5">
    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h2 className="text-title-lg font-bold text-primary">{title}</h2>
        <p className="mt-1 text-body-sm text-on-surface-variant">{subtitle}</p>
      </div>
      {action}
    </div>
    {children}
  </section>
);

const PanelLoading = () => (
  <div className="flex min-h-[240px] items-center justify-center gap-3 text-body-sm font-semibold text-on-surface-variant">
    <Loader2 className="h-5 w-5 animate-spin text-primary" />
    Loading section...
  </div>
);

const EmptyState = ({ icon, title, text }: { icon: ReactNode; title: string; text: string }) => (
  <div className="flex min-h-[220px] flex-col items-center justify-center px-4 py-10 text-center">
    <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-surface-container text-outline">{icon}</div>
    <h3 className="text-body-lg font-bold text-primary">{title}</h3>
    <p className="mt-2 max-w-md text-body-sm text-on-surface-variant">{text}</p>
  </div>
);

const BarChart = ({ points }: { points: ChartPoint[] }) => {
  const maxValue = Math.max(0, ...points.map((point) => point.value));

  if (points.length === 0 || maxValue === 0) {
    return <EmptyState icon={<LineChart className="h-5 w-5" />} title="No betting activity" text="No bets with a placed timestamp were returned for this period." />;
  }

  return (
    <div className="h-[260px] overflow-x-auto">
      <div className="flex h-full min-w-[520px] items-end gap-2 border-b border-outline-variant px-2 pb-8">
        {points.map((point) => {
          const height = Math.max(8, (point.value / maxValue) * 190);

          return (
            <div key={point.date} className="flex h-full flex-1 flex-col justify-end gap-2">
              <div className="flex flex-1 items-end">
                <div
                  className="w-full rounded-t-md bg-secondary/80"
                  style={{ height }}
                  title={`${formatShortDate(point.date)}: ${point.value} bets`}
                />
              </div>
              <div className="h-6 truncate text-center text-[10px] font-semibold text-outline">{formatShortDate(point.date)}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const CashFlowChart = ({ points }: { points: AdminDashboardCashFlowPoint[] }) => {
  const maxValue = points.reduce((max, point) => {
    const deposit = Number(point.depositCents / 100n);
    const withdrawal = Number(point.withdrawalCents / 100n);
    return Math.max(max, deposit, withdrawal);
  }, 0);

  if (points.length === 0 || maxValue === 0) {
    return (
      <EmptyState
        icon={<Banknote className="h-5 w-5" />}
        title="Cash-flow data unavailable"
        text="The current backend does not expose admin-wide deposit and withdrawal records or daily aggregates."
      />
    );
  }

  return (
    <div className="h-[260px] overflow-x-auto">
      <div className="flex h-full min-w-[520px] items-end gap-3 border-b border-outline-variant px-2 pb-8">
        {points.map((point) => {
          const deposit = Number(point.depositCents / 100n);
          const withdrawal = Number(point.withdrawalCents / 100n);
          const depositHeight = Math.max(6, (deposit / maxValue) * 190);
          const withdrawalHeight = Math.max(6, (withdrawal / maxValue) * 190);

          return (
            <div key={point.date} className="flex h-full flex-1 flex-col justify-end gap-2">
              <div className="flex flex-1 items-end justify-center gap-1.5">
                <div className="w-1/2 rounded-t-md bg-secondary/80" style={{ height: depositHeight }} title={`Deposits: ${formatMoneyCents(point.depositCents)}`} />
                <div className="w-1/2 rounded-t-md bg-tertiary/80" style={{ height: withdrawalHeight }} title={`Withdrawals: ${formatMoneyCents(point.withdrawalCents)}`} />
              </div>
              <div className="h-6 truncate text-center text-[10px] font-semibold text-outline">{formatShortDate(point.date)}</div>
            </div>
          );
        })}
      </div>
      <div className="mt-3 flex gap-4 text-label-sm font-semibold text-on-surface-variant">
        <span className="inline-flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-secondary" />Deposits</span>
        <span className="inline-flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-tertiary" />Withdrawals</span>
      </div>
    </div>
  );
};

const RecentTransactionsTable = ({ isLoading, data }: { isLoading: boolean; data: AdminDashboardData | null }) => {
  const transactions = data?.financialSummary?.recentTransactions ?? [];

  if (isLoading) {
    return <PanelLoading />;
  }

  if (transactions.length === 0) {
    return (
      <EmptyState
        icon={<WalletCards className="h-5 w-5" />}
        title="No admin transaction data"
        text="TODO(BE-API): Missing backend capability - see Required Backend Additions report."
      />
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] text-left">
        <thead className="border-b border-outline-variant bg-surface-container">
          <tr>
            <TableHeader>Transaction ID</TableHeader>
            <TableHeader>User</TableHeader>
            <TableHeader>Type</TableHeader>
            <TableHeader>Amount</TableHeader>
            <TableHeader>Status</TableHeader>
            <TableHeader>Created</TableHeader>
          </tr>
        </thead>
        <tbody className="divide-y divide-outline-variant">
          {transactions.slice(0, 8).map((transaction) => (
            <tr key={transaction.txId} className="hover:bg-surface-container-lowest">
              <TableCell strong>{transaction.txId}</TableCell>
              <TableCell>{transaction.userName ?? (transaction.userId ? `User #${transaction.userId}` : '-')}</TableCell>
              <TableCell>{transaction.type}</TableCell>
              <TableCell>{formatMoneyCents(transaction.amountCents)}</TableCell>
              <TableCell><StatusPill status={transaction.status} /></TableCell>
              <TableCell>{formatDateTime(transaction.createdAt)}</TableCell>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const RecentRacesTable = ({
  isLoading,
  races,
  raceBetCounts,
}: {
  isLoading: boolean;
  races: AdminRaceItem[];
  raceBetCounts: Map<number, number>;
}) => {
  if (isLoading) {
    return <PanelLoading />;
  }

  if (races.length === 0) {
    return <EmptyState icon={<Flag className="h-5 w-5" />} title="No races found" text="No race records were returned by the existing tournament race APIs." />;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[820px] text-left">
        <thead className="border-b border-outline-variant bg-surface-container">
          <tr>
            <TableHeader>Race</TableHeader>
            <TableHeader>Start Time</TableHeader>
            <TableHeader>Status</TableHeader>
            <TableHeader>Participants</TableHeader>
            <TableHeader>Bets</TableHeader>
          </tr>
        </thead>
        <tbody className="divide-y divide-outline-variant">
          {races.map((race) => (
            <tr key={race.raceId} className="hover:bg-surface-container-lowest">
              <TableCell strong>
                <Link to="/admin/races" className="text-primary hover:underline">
                  {race.name}
                </Link>
                <p className="mt-1 text-label-sm font-semibold text-outline">Race #{race.raceId}</p>
              </TableCell>
              <TableCell>{formatDateTime(race.scheduledAt)}</TableCell>
              <TableCell><StatusPill status={race.status} /></TableCell>
              <TableCell>{race.registeredHorseCount ?? '-'}</TableCell>
              <TableCell>{raceBetCounts.get(race.raceId) ?? '-'}</TableCell>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const TableHeader = ({ children }: { children: ReactNode }) => (
  <th className="px-4 py-3 text-label-sm uppercase tracking-wider text-outline">{children}</th>
);

const TableCell = ({ children, strong = false }: { children: ReactNode; strong?: boolean }) => (
  <td className={`px-4 py-4 text-body-sm ${strong ? 'font-bold text-primary' : 'font-semibold text-on-surface-variant'}`}>{children}</td>
);

const StatusPill = ({ status }: { status?: string }) => {
  const normalizedStatus = normalizeStatus(status);
  const toneClass = normalizedStatus === 'completed' || normalizedStatus === 'won' || normalizedStatus === 'open_for_betting'
    ? 'border-secondary/30 bg-secondary/10 text-secondary'
    : normalizedStatus === 'pending' || normalizedStatus === 'ready' || normalizedStatus === 'registration_open'
      ? 'border-primary/30 bg-primary/10 text-primary'
      : normalizedStatus === 'failed' || normalizedStatus === 'cancelled' || normalizedStatus === 'lost'
        ? 'border-error/30 bg-error-container/20 text-error'
        : 'border-outline-variant bg-surface-container text-on-surface-variant';

  return (
    <span className={`inline-flex rounded-full border px-3 py-1 text-label-sm font-bold uppercase ${toneClass}`}>
      {status || '-'}
    </span>
  );
};

const StatusBanner = ({ tone, text }: { tone: 'error' | 'warning'; text: string }) => (
  <div className={`rounded-md border px-4 py-3 text-body-sm font-semibold ${tone === 'error' ? 'border-error/30 bg-error-container/20 text-error' : 'border-primary/30 bg-primary/10 text-primary'}`}>
    {text}
  </div>
);

const BackendLimitations = ({ limitations }: { limitations: string[] }) => (
  <section className="mb-6 rounded-lg border border-primary/30 bg-primary/10 p-5">
    <div className="flex items-start gap-3">
      <TrendingUp className="mt-1 h-5 w-5 shrink-0 text-primary" />
      <div>
        <h2 className="text-title-md font-bold text-primary">Backend data requirements</h2>
        <ul className="mt-3 space-y-2 text-body-sm font-semibold text-on-surface-variant">
          {limitations.map((limitation) => (
            <li key={limitation}>{limitation}</li>
          ))}
        </ul>
      </div>
    </div>
  </section>
);

export default AdminOperationsPage;
