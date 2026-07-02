import type { PrizeDistribution, RaceResultEntry } from '../../../types/raceResult';
import RankBadge from './RankBadge';

type RaceResultTableProps = {
  entries: RaceResultEntry[];
  prizeDistributions?: PrizeDistribution[];
  showPrize?: boolean;
  showPoints?: boolean;
};

const getEntryPrize = (entry: RaceResultEntry, prizeDistributions: PrizeDistribution[]) =>
  entry.prizeAmount ??
  prizeDistributions.find((prize) => prize.position === entry.finishPosition)?.amount ??
  '-';

const RaceResultTable = ({
  entries,
  prizeDistributions = [],
  showPrize = true,
  showPoints = true,
}: RaceResultTableProps) => {
  const sortedEntries = [...entries].sort((a, b) => {
    if (a.isDisqualified && !b.isDisqualified) {
      return 1;
    }

    if (!a.isDisqualified && b.isDisqualified) {
      return -1;
    }

    return (a.finishPosition ?? 999) - (b.finishPosition ?? 999);
  });

  return (
    <div className="w-full overflow-hidden">
      <table className="w-full table-fixed text-left">
        <thead className="bg-surface-container border-b border-outline-variant">
          <tr>
            <th className="w-[9%] px-3 py-4 text-label-sm text-outline uppercase tracking-wider">Rank</th>
            <th className="w-[8%] px-3 py-4 text-label-sm text-outline uppercase tracking-wider">Gate</th>
            <th className="w-[24%] px-3 py-4 text-label-sm text-outline uppercase tracking-wider">Horse</th>
            <th className="w-[22%] px-3 py-4 text-label-sm text-outline uppercase tracking-wider">Jockey</th>
            <th className="w-[15%] px-3 py-4 text-label-sm text-outline uppercase tracking-wider text-right">Time</th>
            {showPoints && (
              <th className="w-[10%] px-3 py-4 text-label-sm text-outline uppercase tracking-wider text-right">Points</th>
            )}
            {showPrize && (
              <th className="w-[12%] px-3 py-4 text-label-sm text-outline uppercase tracking-wider text-right">Prize</th>
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-outline-variant">
          {sortedEntries.map((entry) => (
            <tr
              key={entry.id}
              className={`hover:bg-surface-container-lowest transition-colors ${entry.isDisqualified ? 'bg-error-container/30' : ''}`}
            >
              <td className="px-3 py-4">
                {entry.isDisqualified ? (
                  <span className="inline-flex rounded px-2 py-1 text-label-sm uppercase tracking-wider bg-error-container text-on-error-container">
                    DQ
                  </span>
                ) : entry.finishPosition !== null && entry.finishPosition <= 3 ? (
                  <RankBadge rank={entry.finishPosition} />
                ) : (
                  <span className="text-body-sm font-bold text-on-surface-variant tabular-nums pl-2">
                    {entry.finishPosition ?? '-'}
                  </span>
                )}
              </td>
              <td className="px-3 py-4">
                <span className="text-body-sm font-medium text-on-surface-variant tabular-nums">
                  {entry.gateNumber}
                </span>
              </td>
              <td className="px-3 py-4">
                <div>
                  <span className="break-words text-body-sm font-bold text-primary">{entry.horseName}</span>
                  {entry.isDisqualified && entry.disqualificationReason && (
                    <p className="text-label-sm text-on-error-container mt-1 normal-case tracking-normal font-normal">
                      {entry.disqualificationReason}
                    </p>
                  )}
                </div>
              </td>
              <td className="px-3 py-4">
                <span className="break-words text-body-sm text-on-surface-variant font-medium">{entry.jockeyName}</span>
              </td>
              <td className="px-3 py-4 text-right">
                <span className="text-body-sm font-medium text-on-surface-variant tabular-nums">
                  {entry.finishTime ?? '-'}
                </span>
              </td>
              {showPoints && (
                <td className="px-3 py-4 text-right">
                  <span className="text-body-sm font-semibold text-primary tabular-nums">
                    {entry.pointsAwarded}
                  </span>
                </td>
              )}
              {showPrize && (
                <td className="px-3 py-4 text-right">
                  <span className="text-body-sm font-bold text-secondary tabular-nums">
                    {getEntryPrize(entry, prizeDistributions)}
                  </span>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default RaceResultTable;
