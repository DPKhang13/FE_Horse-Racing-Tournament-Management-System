import React from 'react';
import { Badge, type Tone } from '../ui';

interface StatusChipProps {
  status: string;
}

const statusTone: Record<string, Tone> = {
  'To Do': 'slate',
  'In Progress': 'blue',
  'Done': 'emerald',
  'Medium': 'gold',
};

const StatusChip: React.FC<StatusChipProps> = ({ status }) => {
  return (
    <Badge tone={statusTone[status] ?? 'slate'} dot className="uppercase">
      {status}
    </Badge>
  );
};

export default StatusChip;
