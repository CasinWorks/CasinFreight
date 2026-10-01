import { useEffect, useRef, type FC } from 'react';
import { useFreight } from '../../context/FreightContext';
import {
  DETENTION_ESTIMATE_LABEL,
  estimateContainerDetention,
  formatEstimatedPeso,
  formatManilaDate,
  isOpenContainerBooking,
  manilaDateKey,
} from '../../lib/containerTracking';

/** Survives a dev remount so the same due-date notice is not posted twice. */
const postedContainerAlertKeys = new Set<string>();

/** In-app notices only. No email and no push. */
export const ContainerReturnAlerts: FC = () => {
  const { company, trips, notifications, addNotification } = useFreight();
  const posted = useRef(postedContainerAlertKeys);

  useEffect(() => {
    if (!company.containerTrackingEnabled) return;
    const today = manilaDateKey(new Date());
    if (!today) return;
    const existing = new Set(
      notifications.map((item) => item.metadata?.containerAlertKey).filter((key): key is string => Boolean(key)),
    );
    for (const trip of trips) {
      if (!isOpenContainerBooking(trip) || !trip.container?.returnBy) continue;
      const estimate = estimateContainerDetention(trip.container);
      if (estimate.daysLeft === null || estimate.daysLeft > 2) continue;
      const tone = estimate.daysOverdue > 0 ? 'overdue' : 'due';
      const key = `${trip.id}:${today}:${tone}`;
      if (existing.has(key) || posted.current.has(key)) continue;
      posted.current.add(key);
      const box = trip.container.containerNo?.trim() || trip.tripNumber;
      const due = formatManilaDate(trip.container.returnBy);
      addNotification({
        category: 'trip_update',
        title: tone === 'overdue' ? `${box} is past the return date` : `${box} is due back soon`,
        message:
          tone === 'overdue'
            ? `${trip.tripNumber} is ${estimate.daysOverdue} day${estimate.daysOverdue === 1 ? '' : 's'} past ${due}. Estimated detention so far: ${formatEstimatedPeso(estimate.detentionAccruedPhp)}. ${DETENTION_ESTIMATE_LABEL}`
            : `${trip.tripNumber} should be back by ${due} (${estimate.daysLeft === 0 ? 'today' : `${estimate.daysLeft} day${estimate.daysLeft === 1 ? '' : 's'} left`}).`,
        isRead: false,
        severity: tone === 'overdue' ? 'error' : 'warning',
        tripId: trip.id,
        actionType: 'view_trip',
        actionLabel: 'Open booking',
        metadata: {
          containerAlertKey: key,
          amountPhp: estimate.detentionAccruedPhp,
          statusBadge: tone === 'overdue' ? 'Return overdue' : 'Return due',
        },
      });
    }
  }, [company.containerTrackingEnabled, trips, notifications, addNotification]);

  return null;
};
