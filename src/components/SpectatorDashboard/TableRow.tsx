import React from 'react';
import StatusChip from './StatusChip';
import Tag from './Tag';

interface TableRowProps {
  data: any;
}

const TableRow: React.FC<TableRowProps> = ({ data }) => {
  return (
    <tr className="border-b border-[#e1e3e4] hover:bg-[#f3f4f5]">
      <td className="py-2 px-3 text-center text-sm font-medium">{data.id}</td>
      <td className="py-2 px-3 text-left text-sm font-semibold text-[#0d1c32]">{data.title}</td>
      <td className="py-2 px-3 text-left text-sm">{data.function}</td>
      <td className="py-2 px-3 text-left text-sm">{data.description}</td>
      <td className="py-2 px-3 text-center"><Tag label={data.owner} colorClass="bg-[#85f8c4] text-[#005137]" /></td>
      <td className="py-2 px-3 text-center"><StatusChip status={data.status} /></td>
      <td className="py-2 px-3 text-center"><Tag label={data.priority} colorClass="bg-[#ffe088] text-[#574500]" /></td>
    </tr>
  );
};

export default TableRow;
