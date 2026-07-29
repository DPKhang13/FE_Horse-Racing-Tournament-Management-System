import React from 'react';

interface TagProps {
  label: string;
  colorClass?: string;
}

const Tag: React.FC<TagProps> = ({ label, colorClass }) => {
  return (
    <span className={`rounded px-2 py-1 text-xs font-semibold uppercase tracking-wider ${colorClass || 'bg-surface-container-high text-on-surface'}`}>
      {label}
    </span>
  );
};

export default Tag;
