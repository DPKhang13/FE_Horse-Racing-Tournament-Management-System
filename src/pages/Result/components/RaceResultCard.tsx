import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { RaceResultListItem } from '../../../types/raceResult';
import ResultStatusChip from './ResultStatusChip';
import RankBadge from './RankBadge';

type RaceResultCardProps = {
  result: RaceResultListItem;
};

const formatDate = (dateString: string) => {
  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return '-';
  }

  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
};

const RaceResultCard = ({ result }: RaceResultCardProps) => {
  return (
    <article className="bg-white border border-outline-variant rounded-lg overflow-hidden shadow-sm hover:border-secondary transition-all group">
      <div className="bg-primary-container p-6 text-white flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-3 mb-2">
            <h3 className="text-body-lg font-bold">{result.raceName}</h3>
            <ResultStatusChip status={result.status} />
          </div>
          <p className="text-label-md text-on-primary-container uppercase tracking-widest">
            R{result.raceNumber} • {result.track} • {formatDate(result.date)}
          </p>
          <p className="text-body-sm text-on-primary-container/80 mt-1">{result.tournamentName}</p>
        </div>
        <div className="flex flex-col items-start sm:items-end gap-2 shrink-0">
          <p className="text-label-sm text-on-primary-container uppercase tracking-wider">Prize Pool</p>
          <p className="text-body-lg font-bold text-secondary-container">{result.totalPrizePool}</p>
          <Link
            to={`/results/${result.id}`}
            className="flex items-center gap-2 text-label-md font-bold text-secondary-container hover:text-white transition-colors mt-1"
          >
            FULL REPORT <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-surface-container border-b border-outline-variant">
            <tr>
              <th className="px-6 py-4 text-label-sm text-outline uppercase tracking-wider">Rank</th>
              <th className="px-6 py-4 text-label-sm text-outline uppercase tracking-wider">Horse</th>
              <th className="px-6 py-4 text-label-sm text-outline uppercase tracking-wider">Jockey</th>
              <th className="px-6 py-4 text-label-sm text-outline uppercase tracking-wider text-right">Time</th>
              <th className="px-6 py-4 text-label-sm text-outline uppercase tracking-wider text-right">Odds</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant">
            {result.topFinishers.map((finisher) => (
              <tr key={finisher.rank} className="hover:bg-surface-container-lowest transition-colors">
                <td className="px-6 py-4">
                  <RankBadge rank={finisher.rank} />
                </td>
                <td className="px-6 py-4">
                  <span className="text-body-sm font-bold text-primary">{finisher.horseName}</span>
                </td>
                <td className="px-6 py-4">
                  <span className="text-body-sm text-on-surface-variant font-medium">{finisher.jockeyName}</span>
                </td>
                <td className="px-6 py-4 text-right">
                  <span className="text-body-sm font-medium text-on-surface-variant tabular-nums">
                    {finisher.finishTime}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <span className="text-body-sm font-bold text-secondary tabular-nums">
                    {finisher.odds ?? '-'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </article>
  );
};

export default RaceResultCard;
