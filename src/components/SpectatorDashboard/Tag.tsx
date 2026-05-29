import React from 'react';

interface TagProps {
  label: string;
  colorClass?: string;
}

const Tag: React.FC<TagProps> = ({ label, colorClass }) => {
  return (
    <span className={`px-2 py-1 rounded-[4px] text-xs font-semibold uppercase tracking-wider ${colorClass || 'bg-[#e1e3e4] text-[#191c1d]'}`}>
      {label}
    </span>
  );
};

export default Tag;
