import type { RaceResultStatus } from '../../../types/raceResult';
import { Badge, type Tone } from '../../../components/ui';

type ResultStatusChipProps = {
  status: RaceResultStatus;
};

const statusConfig: Record<RaceResultStatus, { label: string; tone: Tone }> = {
  draft: {
    label: 'Draft',
    tone: 'slate',
  },
  confirmed: {
    label: 'Confirmed',
    tone: 'blue',
  },
  published: {
    label: 'Published',
    tone: 'emerald',
  },
};

const ResultStatusChip = ({ status }: ResultStatusChipProps) => {
  const config = statusConfig[status];

  return (
    <Badge tone={config.tone} dot className="uppercase">
      {config.label}
    </Badge>
  );
};

export default ResultStatusChip;
