import type { RaceResultEntry } from '../../../types/raceResult';
import RankBadge from './RankBadge';

type RaceResultTableProps = {
  entries: RaceResultEntry[];
  showPrize?: boolean;
  showPoints?: boolean;
};

const RaceResultTable = ({ entries, showPrize = true, showPoints = true }: RaceResultTableProps) => {
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
    <div className="overflow-x-auto">
      <table className="w-full text-left">
        <thead className="bg-surface-container border-b border-outline-variant">
          <tr>
            <th className="px-6 py-4 text-label-sm text-outline uppercase tracking-wider">Rank</th>
            <th className="px-6 py-4 text-label-sm text-outline uppercase tracking-wider">Gate</th>
            <th className="px-6 py-4 text-label-sm text-outline uppercase tracking-wider">Horse</th>
            <th className="px-6 py-4 text-label-sm text-outline uppercase tracking-wider">Jockey</th>
            <th className="px-6 py-4 text-label-sm text-outline uppercase tracking-wider text-right">Time</th>
            {showPoints && (
              <th className="px-6 py-4 text-label-sm text-outline uppercase tracking-wider text-right">Points</th>
            )}
            {showPrize && (
              <th className="px-6 py-4 text-label-sm text-outline uppercase tracking-wider text-right">Prize</th>
            )}
            <th className="px-6 py-4 text-label-sm text-outline uppercase tracking-wider text-right">Odds</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-outline-variant">
          {sortedEntries.map((entry) => (
            <tr
              key={entry.id}
              className={`hover:bg-surface-container-lowest transition-colors ${entry.isDisqualified ? 'bg-error-container/30' : ''}`}
            >
              <td className="px-6 py-4">
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
              <td className="px-6 py-4">
                <span className="text-body-sm font-medium text-on-surface-variant tabular-nums">
                  {entry.gateNumber}
                </span>
              </td>
              <td className="px-6 py-4">
                <div>
                  <span className="text-body-sm font-bold text-primary">{entry.horseName}</span>
                  {entry.isDisqualified && entry.disqualificationReason && (
                    <p className="text-label-sm text-on-error-container mt-1 normal-case tracking-normal font-normal">
                      {entry.disqualificationReason}
                    </p>
                  )}
                </div>
              </td>
              <td className="px-6 py-4">
                <span className="text-body-sm text-on-surface-variant font-medium">{entry.jockeyName}</span>
              </td>
              <td className="px-6 py-4 text-right">
                <span className="text-body-sm font-medium text-on-surface-variant tabular-nums">
                  {entry.finishTime ?? '-'}
                </span>
              </td>
              {showPoints && (
                <td className="px-6 py-4 text-right">
                  <span className="text-body-sm font-semibold text-primary tabular-nums">
                    {entry.pointsAwarded}
                  </span>
                </td>
              )}
              {showPrize && (
                <td className="px-6 py-4 text-right">
                  <span className="text-body-sm font-bold text-secondary tabular-nums">
                    {entry.prizeAmount ?? '-'}
                  </span>
                </td>
              )}
              <td className="px-6 py-4 text-right">
                <span className="text-body-sm font-bold text-secondary tabular-nums">
                  {entry.odds ?? '-'}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default RaceResultTable;
