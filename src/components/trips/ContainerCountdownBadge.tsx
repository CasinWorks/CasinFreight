import React from 'react';
import { useFreight } from '../../context/FreightContext';
import {
  DETENTION_ESTIMATE_LABEL,
  estimateContainerDetention,
  formatEstimatedPeso,
  isContainerBooking,
} from '../../lib/containerTracking';
import type { Trip } from '../../types';

export const ContainerCountdownBadge: React.FC<{ trip: Trip }> = ({ trip }) => {
  const { company } = useFreight();
  if (!company.containerTrackingEnabled || !isContainerBooking(trip)) return null;

  if (trip.container?.returnedAt) {
    return (
      <span className="inline-flex items-center mb-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded border bg-emerald-50 text-emerald-800 border-emerald-200">
        Returned
      </span>
    );
  }

  const estimate = estimateContainerDetention(trip.container);
  if (estimate.daysLeft === null) {
    return (
      <span className="inline-flex items-center mb-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded border bg-slate-100 text-slate-600 border-slate-200">
        Container · no return date
      </span>
    );
  }

  if (estimate.daysLeft < 0) {
    const days = estimate.daysOverdue;
    return (
      <span
        title={DETENTION_ESTIMATE_LABEL}
        className="inline-flex items-center mb-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded border bg-rose-50 text-rose-800 border-rose-200"
      >
        {days} day{days === 1 ? '' : 's'} overdue · est. {formatEstimatedPeso(estimate.detentionAccruedPhp)}
      </span>
    );
  }

  const amber = estimate.daysLeft <= 2;
  const label =
    estimate.daysLeft === 0 ? 'Due today' : `${estimate.daysLeft} day${estimate.daysLeft === 1 ? '' : 's'} left`;
  return (
    <span
      className={`inline-flex items-center mb-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded border ${
        amber ? 'bg-amber-50 text-amber-900 border-amber-300' : 'bg-sky-50 text-sky-800 border-sky-200'
      }`}
    >
      {label}
    </span>
  );
};
