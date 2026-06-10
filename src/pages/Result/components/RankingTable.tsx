import type { RankingEntry } from '../../../types/raceResult';
import RankBadge from './RankBadge';

type RankingTableProps = {
  entries: RankingEntry[];
  showSubtitle?: boolean;
};

const RankingTable = ({ entries, showSubtitle = true }: RankingTableProps) => {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left">
        <thead className="bg-surface-container border-b border-outline-variant">
          <tr>
            <th className="px-6 py-4 text-label-sm text-outline uppercase tracking-wider">Rank</th>
            <th className="px-6 py-4 text-label-sm text-outline uppercase tracking-wider">Name</th>
            <th className="px-6 py-4 text-label-sm text-outline uppercase tracking-wider text-right">Points</th>
            <th className="px-6 py-4 text-label-sm text-outline uppercase tracking-wider text-right">Wins</th>
            <th className="px-6 py-4 text-label-sm text-outline uppercase tracking-wider text-right">Races</th>
            <th className="px-6 py-4 text-label-sm text-outline uppercase tracking-wider text-right">Win Rate</th>
            <th className="px-6 py-4 text-label-sm text-outline uppercase tracking-wider text-right">Form</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-outline-variant">
          {entries.map((entry) => (
            <tr key={entry.entityId} className="hover:bg-surface-container-lowest transition-colors">
              <td className="px-6 py-4">
                {entry.rank <= 3 ? (
                  <RankBadge rank={entry.rank} />
                ) : (
                  <span className="text-body-sm font-bold text-on-surface-variant tabular-nums pl-2">
                    {entry.rank}
                  </span>
                )}
              </td>
              <td className="px-6 py-4">
                <div>
                  <span className="text-body-sm font-bold text-primary">{entry.name}</span>
                  {showSubtitle && entry.subtitle && (
                    <p className="text-label-sm text-on-surface-variant normal-case tracking-normal font-normal mt-0.5">
                      {entry.subtitle}
                    </p>
                  )}
                </div>
              </td>
              <td className="px-6 py-4 text-right">
                <span className="text-body-sm font-bold text-primary tabular-nums">{entry.totalPoints}</span>
              </td>
              <td className="px-6 py-4 text-right">
                <span className="text-body-sm font-semibold text-secondary tabular-nums">{entry.totalWins}</span>
              </td>
              <td className="px-6 py-4 text-right">
                <span className="text-body-sm text-on-surface-variant tabular-nums">{entry.totalRaces}</span>
              </td>
              <td className="px-6 py-4 text-right">
                <span className="text-body-sm font-medium text-on-surface-variant tabular-nums">
                  {entry.winRate}%
                </span>
              </td>
              <td className="px-6 py-4 text-right">
                <span className="text-body-sm font-mono text-on-surface-variant tabular-nums">
                  {entry.recentForm ?? '-'}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default RankingTable;
