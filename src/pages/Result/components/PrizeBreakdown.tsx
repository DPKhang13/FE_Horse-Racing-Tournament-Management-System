import type { PrizeDistribution } from '../../../types/raceResult';

type PrizeBreakdownProps = {
  distributions: PrizeDistribution[];
  totalPrizePool: string;
};

const PrizeBreakdown = ({ distributions, totalPrizePool }: PrizeBreakdownProps) => {
  return (
    <section className="bg-white border border-outline-variant rounded-lg p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <p className="text-label-md text-secondary uppercase tracking-widest mb-1">Prize Structure</p>
          <h3 className="text-headline-md font-bold text-primary">Prize Breakdown</h3>
        </div>
        <div className="rounded-lg bg-secondary-container/30 border border-secondary/20 px-4 py-3">
          <p className="text-label-sm text-on-secondary-container uppercase tracking-wider">Total Pool</p>
          <p className="text-body-lg font-bold text-secondary tabular-nums">{totalPrizePool}</p>
        </div>
      </div>

      <div className="space-y-3">
        {distributions.map((item) => (
          <div
            key={item.position}
            className="flex items-center justify-between gap-4 rounded-lg border border-outline-variant bg-surface-container-lowest px-4 py-3 hover:border-secondary transition-colors"
          >
            <div className="flex items-center gap-3">
              <span
                className={`inline-flex h-8 w-8 items-center justify-center rounded text-label-md font-bold ${
                  item.position === 1
                    ? 'bg-tertiary text-on-tertiary'
                    : item.position === 2
                      ? 'bg-surface-dim text-on-surface'
                      : item.position === 3
                        ? 'bg-surface-container-highest text-on-surface'
                        : 'bg-surface-container text-on-surface-variant'
                }`}
              >
                {item.position}
              </span>
              <span className="text-body-sm font-semibold text-primary">{item.label}</span>
            </div>
            <span className="text-body-sm font-bold text-secondary tabular-nums">{item.amount}</span>
          </div>
        ))}
      </div>

      <p className="mt-4 text-body-sm text-on-surface-variant">
        Prize amounts are published for informational purposes. Actual payouts are processed outside the system.
      </p>
    </section>
  );
};

export default PrizeBreakdown;
