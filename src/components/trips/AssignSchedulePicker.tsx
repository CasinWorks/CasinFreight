import React, { useMemo, useState } from 'react';
import type { Trip } from '../../types';
import {
  bookingsOnDay,
  busyBlocks,
  dayHasBooking,
  formatClock,
  formatDayLabel,
  formatHourLabel,
  formatScheduleValue,
  hourBooking,
  parseSchedule,
  sameDay,
  startOfDay,
  windowConflict,
} from '../../lib/truckSchedule';

interface AssignSchedulePickerProps {
  truckId: string;
  truckLabel: string;
  trips: Trip[];
  pickup: string;
  delivery: string;
  onPickup: (value: string) => void;
  onDelivery: (value: string) => void;
}

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function monthCells(cursor: Date): Array<Date | null> {
  const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const lead = (first.getDay() + 6) % 7;
  const days = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
  const cells: Array<Date | null> = Array.from({ length: lead }, () => null);
  for (let day = 1; day <= days; day += 1) {
    cells.push(new Date(cursor.getFullYear(), cursor.getMonth(), day));
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export const AssignSchedulePicker: React.FC<AssignSchedulePickerProps> = ({
  truckId,
  truckLabel,
  trips,
  pickup,
  delivery,
  onPickup,
  onDelivery,
}) => {
  const pickupDate = parseSchedule(pickup) || new Date();
  const deliveryDate = parseSchedule(delivery);
  const [cursor, setCursor] = useState(() => new Date(pickupDate.getFullYear(), pickupDate.getMonth(), 1));
  const [viewDay, setViewDay] = useState(() => startOfDay(pickupDate));
  const [setting, setSetting] = useState<'pickup' | 'delivery'>('pickup');

  const blocks = useMemo(() => busyBlocks(trips, truckId), [trips, truckId]);
  const conflict = truckId ? windowConflict(blocks, pickup, delivery) : null;
  const dayBookings = bookingsOnDay(blocks, viewDay);
  const cells = monthCells(cursor);

  const chooseHour = (hour: number) => {
    const next = new Date(viewDay.getFullYear(), viewDay.getMonth(), viewDay.getDate(), hour, 0, 0, 0);
    const value = formatScheduleValue(next);
    if (setting === 'pickup') onPickup(value);
    else onDelivery(value);
  };

  return (
    <div className="mt-4 rounded-xl border border-slate-200 bg-white p-3 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="text-xs font-bold text-slate-800">Schedule</div>
          <p className="text-[11px] text-slate-500">
            {truckId
              ? `Grey hours are already booked on ${truckLabel}. Pick a free time.`
              : 'Choose a truck to see which hours are already booked.'}
          </p>
        </div>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => {
              setSetting('pickup');
              setViewDay(startOfDay(pickupDate));
              setCursor(new Date(pickupDate.getFullYear(), pickupDate.getMonth(), 1));
            }}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border ${
              setting === 'pickup' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-slate-600 border-slate-200'
            }`}
          >
            Pickup {formatDayLabel(pickupDate)} {formatClock(pickupDate)}
          </button>
          <button
            type="button"
            onClick={() => {
              setSetting('delivery');
              const day = deliveryDate || pickupDate;
              setViewDay(startOfDay(day));
              setCursor(new Date(day.getFullYear(), day.getMonth(), 1));
            }}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border ${
              setting === 'delivery' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200'
            }`}
          >
            Delivery {deliveryDate ? `${formatDayLabel(deliveryDate)} ${formatClock(deliveryDate)}` : 'not set'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-3">
        <div>
          <div className="flex items-center justify-between mb-1">
            <button
              type="button"
              onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
              className="px-2 py-0.5 text-xs text-slate-500 hover:text-slate-900"
            >
              ‹
            </button>
            <span className="text-[11px] font-bold text-slate-700">
              {cursor.toLocaleDateString('en-PH', { month: 'long', year: 'numeric' })}
            </span>
            <button
              type="button"
              onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
              className="px-2 py-0.5 text-xs text-slate-500 hover:text-slate-900"
            >
              ›
            </button>
          </div>
          <div className="grid grid-cols-7 gap-0.5 text-center">
            {WEEKDAYS.map((label) => (
              <div key={label} className="text-[9px] font-bold text-slate-400 py-0.5">{label}</div>
            ))}
            {cells.map((day, index) => {
              if (!day) return <div key={`empty-${index}`} />;
              const booked = truckId && dayHasBooking(blocks, day);
              const isView = sameDay(day, viewDay);
              const isPickup = sameDay(day, pickupDate);
              const isDelivery = deliveryDate ? sameDay(day, deliveryDate) : false;
              return (
                <button
                  key={day.toISOString()}
                  type="button"
                  onClick={() => setViewDay(startOfDay(day))}
                  className={`h-7 rounded text-[11px] font-semibold relative ${
                    isView
                      ? 'bg-slate-900 text-white'
                      : booked
                        ? 'bg-slate-200 text-slate-500'
                        : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
                  } ${isPickup && !isView ? 'ring-1 ring-emerald-500' : ''} ${isDelivery && !isView ? 'ring-1 ring-blue-500' : ''}`}
                >
                  {day.getDate()}
                  {booked && <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-slate-500" />}
                </button>
              );
            })}
          </div>
          <p className="text-[10px] text-slate-400 mt-1">Days with a dot already have a booking on this truck.</p>
        </div>

        <div>
          <div className="text-[11px] font-bold text-slate-600 mb-1">
            {setting === 'pickup' ? 'Pickup time' : 'Delivery time'} · {formatDayLabel(viewDay)}
          </div>
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-1">
            {Array.from({ length: 24 }, (_, hour) => {
              const booking = truckId ? hourBooking(blocks, viewDay, hour) : null;
              const slot = new Date(viewDay.getFullYear(), viewDay.getMonth(), viewDay.getDate(), hour, 0, 0, 0);
              const isPickup = sameDay(slot, pickupDate) && pickupDate.getHours() === hour && pickupDate.getMinutes() === 0;
              const isDelivery = Boolean(deliveryDate && sameDay(slot, deliveryDate) && deliveryDate.getHours() === hour && deliveryDate.getMinutes() === 0);
              const selected = setting === 'pickup' ? isPickup : isDelivery;
              return (
                <button
                  key={hour}
                  type="button"
                  disabled={Boolean(booking)}
                  title={booking ? `${booking.tripNumber} · ${booking.route} · ${formatClock(booking.start)}–${formatClock(booking.end)}` : 'Free'}
                  onClick={() => chooseHour(hour)}
                  className={`rounded-md border px-1 py-1 text-[10px] font-bold leading-tight ${
                    booking
                      ? 'bg-slate-200 text-slate-400 border-slate-200 cursor-not-allowed'
                      : selected
                        ? setting === 'pickup'
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-slate-700 border-slate-200 hover:border-blue-400'
                  }`}
                >
                  {formatHourLabel(hour)}
                  <span className="block font-medium truncate">{booking ? 'Booked' : 'Free'}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {deliveryDate && deliveryDate <= pickupDate && (
        <p className="text-[11px] text-amber-900 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5">
          Delivery has to be after pickup.
        </p>
      )}

      {conflict && (
        <p className="text-[11px] text-rose-800 bg-rose-50 border border-rose-200 rounded-lg px-2.5 py-1.5">
          {truckLabel} is already booked {formatDayLabel(conflict.start)} {formatClock(conflict.start)}–{formatClock(conflict.end)} ({conflict.tripNumber}, {conflict.route}). Pick a window that does not overlap.
        </p>
      )}

      <div>
        <div className="text-[11px] font-bold text-slate-600 mb-1">{truckLabel} on {formatDayLabel(viewDay)}</div>
        {dayBookings.length === 0 ? (
          <p className="text-[11px] text-slate-500">No booking on this truck for this day.</p>
        ) : (
          <ul className="space-y-1">
            {dayBookings.map((block) => (
              <li key={block.tripId} className="text-[11px] text-slate-700 bg-slate-100 rounded px-2 py-1">
                <span className="font-mono font-bold">{block.tripNumber}</span>
                {' '}{formatClock(block.start)}–{formatClock(block.end)} · {block.route}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};
