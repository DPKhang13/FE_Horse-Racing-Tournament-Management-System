import { Trophy } from 'lucide-react';

type RankBadgeProps = {
  rank: number;
  size?: 'sm' | 'md';
};

const RankBadge = ({ rank, size = 'md' }: RankBadgeProps) => {
  const sizeClasses = size === 'sm' ? 'w-7 h-7 text-xs' : 'w-8 h-8 text-sm';

  const getRankStyles = () => {
    if (rank === 1) {
      return 'bg-tertiary text-on-tertiary';
    }

    if (rank === 2) {
      return 'bg-surface-dim text-on-surface';
    }

    if (rank === 3) {
      return 'bg-surface-container-highest text-on-surface';
    }

    return 'bg-surface-container text-on-surface-variant';
  };

  return (
    <div
      className={`${sizeClasses} rounded-full flex items-center justify-center font-bold shrink-0 ${getRankStyles()}`}
      aria-label={`Rank ${rank}`}
    >
      {rank === 1 ? <Trophy className={size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4'} /> : rank}
    </div>
  );
};

export default RankBadge;
