import React from 'react';
import StatusChip from './StatusChip';
import Tag from './Tag';

interface TableRowProps {
  data: any;
}

const TableRow: React.FC<TableRowProps> = ({ data }) => {
  return (
    <tr className="border-b border-outline-variant/40 hover:bg-surface-container-high/40">
      <td className="py-2 px-3 text-center text-sm font-medium">{data.id}</td>
      <td className="py-2 px-3 text-left text-sm font-semibold text-on-surface">{data.title}</td>
      <td className="py-2 px-3 text-left text-sm">{data.function}</td>
      <td className="py-2 px-3 text-left text-sm">{data.description}</td>
      <td className="py-2 px-3 text-center"><Tag label={data.owner} colorClass="bg-secondary-container/50 text-on-secondary-container" /></td>
      <td className="py-2 px-3 text-center"><StatusChip status={data.status} /></td>
      <td className="py-2 px-3 text-center"><Tag label={data.priority} colorClass="bg-primary-container text-on-primary-container" /></td>
    </tr>
  );
};

export default TableRow;
