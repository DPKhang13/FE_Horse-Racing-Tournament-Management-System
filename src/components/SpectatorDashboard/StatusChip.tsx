import React from 'react';

interface StatusChipProps {
  status: string;
}

const statusColor: Record<string, string> = {
  'To Do': 'bg-[#F8F9FA] text-[#191c1d] border border-[#75777e]',
  'In Progress': 'bg-[#85f8c4] text-[#002114]',
  'Done': 'bg-[#b9c7e4] text-[#0d1c32]',
  'Medium': 'bg-[#ffe088] text-[#574500]',
};

const StatusChip: React.FC<StatusChipProps> = ({ status }) => {
  return (
    <span
      className={`px-2 py-1 rounded-[4px] text-xs font-bold uppercase tracking-wider ${statusColor[status] || 'bg-gray-200 text-gray-700'}`}
    >
      {status}
    </span>
  );
};

export default StatusChip;
