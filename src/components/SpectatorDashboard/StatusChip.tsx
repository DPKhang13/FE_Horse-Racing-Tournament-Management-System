import React from 'react';

interface StatusChipProps {
  status: string;
}

const statusColor: Record<string, string> = {
  'To Do': 'border border-outline-variant bg-surface-container-low text-on-surface-variant',
  'In Progress': 'bg-secondary-container/50 text-on-secondary-container',
  'Done': 'bg-primary/15 text-primary',
  'Medium': 'bg-primary-container text-on-primary-container',
};

const StatusChip: React.FC<StatusChipProps> = ({ status }) => {
  return (
    <span
      className={`rounded px-2 py-1 text-xs font-bold uppercase tracking-wider ${statusColor[status] || 'bg-surface-container-high text-on-surface-variant'}`}
    >
      {status}
    </span>
  );
};

export default StatusChip;
