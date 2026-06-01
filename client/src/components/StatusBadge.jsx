import React from 'react';
import { STATUS_LABELS, STATUS_COLORS } from '../constants';

const StatusBadge = ({ status }) => {
  const color = STATUS_COLORS[status] || '#6b7280';
  const label = STATUS_LABELS[status] || status;

  return (
    <span
      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold text-white"
      style={{ backgroundColor: color }}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-white/60 animate-pulse" />
      {label}
    </span>
  );
};

export default StatusBadge;
