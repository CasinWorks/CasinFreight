import { Fragment, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useFreight } from '../../context/FreightContext';
import { crewWeekCash, crewWeekRows, crewWeekTotals, formatPhp, manilaWeek, shiftWeek, weekLabel, weekPayment } from '../../lib/crewWeek';
import { manilaDateKey } from '../../lib/dispatchPapers';

export function CrewWeekBoard() {
  const { drivers, trips, updateDriver, currentUser, canAccess } = useFreight();
  const [weekStart, setWeekStart] = useState(() => manilaWeek(manilaDateKey()).start);
  const [openId, setOpenId] = useState<string | null>(null);
  const week = useMemo(() => manilaWeek(weekStart), [weekStart]);
  const rows = useMemo(() => crewWeekRows(drivers, trips, week.start, week.end), [drivers, trips, week.start, week.end]);
  const totals = crewWeekTotals(rows);
  const cash = crewWeekCash(rows, drivers, week.start);
  const thisWeek = manilaWeek(manilaDateKey()).start;
  const canMark = canAccess('driver_crud');

  const setPaid = (personId: string, paid: boolean, owedPhp: number, tripCount: number) => {
    const person = drivers.find((driver) => driver.id === personId);
    if (!person) return;
    const rest = (person.weekPayments || []).filter((payment) => payment.weekStart !== week.start);
    updateDriver(personId, {
      weekPayments: paid
        ? [...rest, {
            weekStart: week.start,
            paidAt: new Date().toISOString(),
            paidBy: currentUser.name || currentUser.email || 'Owner',
            owedPhp,
            trips: tripCount,
          }]
        : rest,
    });
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-2xs overflow-hidden">
      <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200">
        <div>
          <div className="text-sm font-bold text-slate-900">What you owe this week</div>
          <p className="text-[11px] text-slate-500 mt-0.5 max-w-xl leading-relaxed">
            Delivered trips from Monday to Sunday. Each person is paid their trip rate plus food, times the trips they had.
            An amount saved on a trip replaces the rate for that trip. Mark a person paid after you hand them the cash. That flag stays on this week only. It is not a payslip and it is not posted to the ledger.
          </p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => setWeekStart(shiftWeek(week.start, -1).start)}
            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50"
            aria-label="Previous week"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="px-2 text-xs font-semibold text-slate-800 min-w-[9.5rem] text-center">{weekLabel(week.start, week.end)}</div>
          <button
            type="button"
            onClick={() => setWeekStart(shiftWeek(week.start, 1).start)}
            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50"
            aria-label="Next week"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          {week.start !== thisWeek && (
            <button
              type="button"
              onClick={() => setWeekStart(thisWeek)}
              className="ml-1 px-2 py-1 rounded-lg text-[11px] font-bold text-blue-700 hover:bg-blue-50"
            >
              This week
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-slate-200 border-b border-slate-200 text-center">
        <div className="px-3 py-3">
          <div className="text-[10px] uppercase font-semibold text-slate-500">Still to pay</div>
          <div className="font-mono font-black text-slate-900 text-lg">{formatPhp(cash.stillOwedPhp)}</div>
        </div>
        <div className="px-3 py-3">
          <div className="text-[10px] uppercase font-semibold text-emerald-700">Already paid</div>
          <div className="font-mono font-black text-emerald-800 text-lg">{formatPhp(cash.paidPhp)}</div>
        </div>
        <div className="px-3 py-3">
          <div className="text-[10px] uppercase font-semibold text-slate-500">Trips</div>
          <div className="font-mono font-black text-slate-900 text-lg">{totals.trips}</div>
        </div>
        <div className="px-3 py-3">
          <div className="text-[10px] uppercase font-semibold text-slate-500">People</div>
          <div className="font-mono font-black text-slate-900 text-lg">{cash.stillPeople} open · {cash.paidPeople} paid</div>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="px-4 py-8 text-center text-xs text-slate-400">
          No delivered trips in this week yet. Set a trip pay and food allowance on each driver and helper so the total can be counted.
        </div>
      ) : (
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 text-slate-500 uppercase text-[10px]">
            <tr>
              <th className="py-2 px-4">Name</th>
              <th className="py-2 px-4">Role</th>
              <th className="py-2 px-4 text-right">Trips</th>
              <th className="py-2 px-4 text-right">Trip pay</th>
              <th className="py-2 px-4 text-right">Food</th>
              <th className="py-2 px-4 text-right">Owed</th>
              <th className="py-2 px-4 text-right">Paid</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row) => {
              const paid = weekPayment(drivers.find((driver) => driver.id === row.personId), week.start);
              const changed = paid && paid.owedPhp !== row.owedPhp;
              return (
              <Fragment key={row.personId}>
                <tr className="hover:bg-slate-50 cursor-pointer" onClick={() => setOpenId(openId === row.personId ? null : row.personId)}>
                  <td className="py-2.5 px-4 font-semibold text-slate-900">{row.name}</td>
                  <td className="py-2.5 px-4 text-slate-600">{row.role === 'helper' ? 'Helper' : 'Driver'}</td>
                  <td className="py-2.5 px-4 text-right font-mono">{row.trips}</td>
                  <td className="py-2.5 px-4 text-right font-mono">{formatPhp(row.tripPayPhp)}</td>
                  <td className="py-2.5 px-4 text-right font-mono">{formatPhp(row.foodPhp)}</td>
                  <td className="py-2.5 px-4 text-right font-mono font-bold">
                    {formatPhp(row.owedPhp)}
                    {row.missingRate > 0 && (
                      <div className="text-[10px] font-sans font-semibold text-amber-700">{row.missingRate} without a rate</div>
                    )}
                    {changed && (
                      <div className="text-[10px] font-sans font-semibold text-amber-700">Marked paid at {formatPhp(paid.owedPhp)}</div>
                    )}
                  </td>
                  <td className="py-2.5 px-4 text-right" onClick={(event) => event.stopPropagation()}>
                    {paid ? (
                      <div className="inline-flex flex-col items-end gap-1">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                          Paid {manilaDateKey(new Date(paid.paidAt))}
                        </span>
                        {canMark && (
                          <button
                            type="button"
                            onClick={() => setPaid(row.personId, false, row.owedPhp, row.trips)}
                            className="text-[10px] font-semibold text-slate-500 hover:text-slate-800"
                          >
                            Undo
                          </button>
                        )}
                      </div>
                    ) : canMark ? (
                      <button
                        type="button"
                        onClick={() => setPaid(row.personId, true, row.owedPhp, row.trips)}
                        className="px-2.5 py-1 rounded bg-slate-900 text-white text-[11px] font-bold"
                      >
                        Mark paid
                      </button>
                    ) : (
                      <span className="text-[10px] text-slate-400">Not paid</span>
                    )}
                  </td>
                </tr>
                {openId === row.personId && (
                  <tr className="bg-slate-50">
                    <td colSpan={7} className="px-4 py-2 space-y-1">
                      {row.lines.map((line) => (
                        <div key={`${line.tripId}-${line.role}`} className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-600">
                          <span className="font-mono text-slate-800">{line.serviceDate} · {line.waybillNumber}</span>
                          <span>
                            {line.role === 'helper' ? 'Helper' : 'Driver'}
                            {' · '}
                            {line.source === 'missing' ? 'No rate yet' : line.source === 'trip' ? 'Amount on the trip' : 'From their rate'}
                            {' · '}
                            <span className="font-mono font-bold text-slate-900">{formatPhp(line.totalPhp)}</span>
                          </span>
                        </div>
                      ))}
                    </td>
                  </tr>
                )}
              </Fragment>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
