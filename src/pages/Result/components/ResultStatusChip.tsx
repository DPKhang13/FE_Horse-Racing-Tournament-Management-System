import type { RaceResultStatus } from '../../../types/raceResult';

type ResultStatusChipProps = {
  status: RaceResultStatus;
};

const statusConfig: Record<RaceResultStatus, { label: string; className: string }> = {
  draft: {
    label: 'Draft',
    className: 'bg-surface-container text-on-surface-variant',
  },
  confirmed: {
    label: 'Confirmed',
    className: 'bg-tertiary-fixed text-on-tertiary-fixed-variant',
  },
  published: {
    label: 'Published',
    className: 'bg-secondary-container text-on-secondary-container',
  },
};

const ResultStatusChip = ({ status }: ResultStatusChipProps) => {
  const config = statusConfig[status];

  return (
    <span
      className={`inline-flex rounded px-2.5 py-1 text-label-sm uppercase tracking-wider ${config.className}`}
    >
      {config.label}
    </span>
  );
};

export default ResultStatusChip;
