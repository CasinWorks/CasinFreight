import React, { useMemo, useState } from 'react';
import { useFreight } from '../../context/FreightContext';
import {
  addDays,
  bookingsOnDay,
  busyBlocks,
  formatClock,
  formatDayLabel,
  startOfWeek,
} from '../../lib/truckSchedule';

export const TruckScheduleBoard: React.FC = () => {
  const { trucks, trips } = useFreight();
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const days = useMemo(() => Array.from({ length: 7 }, (_, index) => addDays(weekStart, index)), [weekStart]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-bold text-slate-900">Truck schedule</h2>
          <p className="text-[11px] text-slate-500">Booked hours stay on the truck. Cancelled bookings are left off. Grey means that time is taken.</p>
        </div>
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => setWeekStart(addDays(weekStart, -7))} className="px-2.5 py-1 rounded-lg border border-slate-200 text-xs font-bold text-slate-600">
            Previous week
          </button>
          <button type="button" onClick={() => setWeekStart(startOfWeek(new Date()))} className="px-2.5 py-1 rounded-lg border border-slate-200 text-xs font-bold text-slate-600">
            This week
          </button>
          <button type="button" onClick={() => setWeekStart(addDays(weekStart, 7))} className="px-2.5 py-1 rounded-lg border border-slate-200 text-xs font-bold text-slate-600">
            Next week
          </button>
        </div>
      </div>

      {trucks.length === 0 ? (
        <p className="text-xs text-slate-500">Add a truck to see its schedule.</p>
      ) : (
        <div className="space-y-3">
          {trucks.map((truck) => {
            const blocks = busyBlocks(trips, truck.id);
            return (
              <div key={truck.id} className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs">
                <div className="flex items-baseline justify-between gap-2 mb-2">
                  <div className="font-mono font-black text-slate-900">{truck.plateNumber}</div>
                  <div className="text-[11px] text-slate-500 truncate">{truck.type}</div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-1.5">
                  {days.map((day) => {
                    const dayBlocks = bookingsOnDay(blocks, day);
                    const taken = dayBlocks.length > 0;
                    return (
                      <div
                        key={day.toISOString()}
                        className={`rounded-lg border p-1.5 min-h-[72px] ${taken ? 'bg-slate-200 border-slate-300' : 'bg-emerald-50/40 border-slate-200'}`}
                      >
                        <div className={`text-[10px] font-bold ${taken ? 'text-slate-500' : 'text-slate-600'}`}>{formatDayLabel(day)}</div>
                        {taken ? (
                          <ul className="mt-1 space-y-1">
                            {dayBlocks.map((block) => (
                              <li key={block.tripId} className="text-[10px] text-slate-600 leading-snug">
                                <span className="font-mono font-bold text-slate-700">{formatClock(block.start)}–{formatClock(block.end)}</span>
                                <span className="block truncate">{block.tripNumber}</span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <div className="text-[10px] text-emerald-700 mt-1">Free</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
