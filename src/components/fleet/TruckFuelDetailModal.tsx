import React, { useState } from 'react';
import { 
  X, 
  Fuel, 
  Gauge, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  MapPin, 
  Calendar, 
  CreditCard, 
  FileText, 
  Plus, 
  Trash2, 
  Edit3, 
  Download, 
  AlertCircle, 
  CheckCircle2, 
  Truck as TruckIcon,
  Layers,
  ArrowUpRight,
  ShieldAlert
} from 'lucide-react';
import { useFreight, getTargetKmPerLiter } from '../../context/FreightContext';
import { Truck, FuelLog } from '../../types';
import { closeIfBackdrop } from '../../lib/modal';

interface TruckFuelDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  truck: Truck;
  onOpenAddFuel: (truckId: string) => void;
  onOpenEditFuel: (log: FuelLog) => void;
}

export const TruckFuelDetailModal: React.FC<TruckFuelDetailModalProps> = ({
  isOpen,
  onClose,
  truck,
  onOpenAddFuel,
  onOpenEditFuel
}) => {
  const { 
    getFuelLogsByTruckId, 
    getTruckFuelSummary, 
    deleteFuelLog, 
    canLogFuel, 
    canDeleteFuelLog,
    drivers 
  } = useFreight();

  const [filterPeriod, setFilterPeriod] = useState<'ALL' | '30DAYS' | '90DAYS'>('ALL');

  if (!isOpen) return null;

  const summary = getTruckFuelSummary(truck.id);
  const rawLogs = getFuelLogsByTruckId(truck.id);
  const targetKmPerLiter = getTargetKmPerLiter(truck.type);

  // Filter logs based on selection
  const now = new Date().getTime();
  const logs = rawLogs.filter(log => {
    if (filterPeriod === 'ALL') return true;
    const logTime = new Date(log.date).getTime();
    const daysDiff = (now - logTime) / (1000 * 3600 * 24);
    if (filterPeriod === '30DAYS') return daysDiff <= 30;
    if (filterPeriod === '90DAYS') return daysDiff <= 90;
    return true;
  });

  // Calculate efficiency variance
  const variancePercent = summary.targetKmPerLiter > 0 && summary.avgKmPerLiter > 0
    ? Number((((summary.avgKmPerLiter - summary.targetKmPerLiter) / summary.targetKmPerLiter) * 100).toFixed(1))
    : 0;

  // Export to CSV
  const handleExportCSV = () => {
    if (logs.length === 0) {
      alert('No fuel records available to export.');
      return;
    }

    const headers = ['Log ID', 'Date', 'Plate Number', 'Odometer (km)', 'Distance (km)', 'Fuel (L)', 'Cost (PHP)', 'Price/L (PHP)', 'KM/L', 'Cost/KM (PHP)', 'Station', 'Payment Method', 'Receipt #', 'Logged By'];
    const rows = logs.map(l => [
      l.id,
      l.date,
      truck.plateNumber,
      l.odometerKm,
      l.distanceKm,
      l.liters,
      l.costPhp,
      l.pricePerLiterPhp,
      l.kmPerLiter,
      l.costPerKmPhp,
      `"${l.fuelStation}"`,
      l.paymentMethod,
      l.receiptNumber || '',
      `"${l.loggedBy}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Fuel_Log_${truck.plateNumber.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const assignedDriver = drivers.find(d => d.id === truck.assignedDriverId);
  const canLog = canLogFuel().allowed;
  const canDelete = canDeleteFuelLog().allowed;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto" onClick={closeIfBackdrop(onClose)}>
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-4xl shadow-2xl animate-in fade-in zoom-in-95 duration-150 text-xs text-slate-900 my-auto overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="bg-slate-900 text-white p-4 sm:p-5 border-b border-slate-800 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center font-bold text-blue-400 shadow-inner">
              <Fuel className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-lg font-black text-white tracking-wider">
                  {truck.plateNumber}
                </span>
                <span className="bg-slate-800 text-slate-300 border border-slate-700 text-[11px] font-semibold px-2.5 py-0.5 rounded-full">
                  {truck.brandModel} ({truck.yearModel})
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                  summary.efficiencyRating === 'Optimal' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' :
                  summary.efficiencyRating === 'Normal' ? 'bg-blue-500/20 text-blue-300 border-blue-500/40' :
                  summary.efficiencyRating === 'High Consumption' ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' :
                  'bg-rose-500/20 text-rose-300 border-rose-500/40'
                }`}>
                  {summary.efficiencyRating === 'Optimal' ? '⚡ Optimal Efficiency' :
                   summary.efficiencyRating === 'Normal' ? '✓ Standard Fuel Economy' :
                   summary.efficiencyRating === 'High Consumption' ? '⚠️ High Consumption' : '🚨 Service Inspection Required'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                {truck.type} • Driver: <strong className="text-slate-200">{assignedDriver ? assignedDriver.name : 'Unassigned'}</strong> • Last Odo: <span className="font-mono text-slate-200">{truck.lastOdometerKm.toLocaleString()} km</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {canLog && (
              <button
                onClick={() => {
                  onClose();
                  onOpenAddFuel(truck.id);
                }}
                className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg font-bold text-xs shadow-xs transition-all active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>Log Fuel</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-5 flex-1 bg-slate-50">
          
          {/* Top KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* Avg KM/L */}
            <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-[10px] font-bold uppercase tracking-wider">Average KM / Liter</span>
                <Gauge className="w-4 h-4 text-blue-600" />
              </div>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-xl sm:text-2xl font-mono font-black text-slate-900">
                  {summary.avgKmPerLiter > 0 ? summary.avgKmPerLiter : '--'}
                </span>
                <span className="text-xs text-slate-500 font-semibold">km/L</span>
              </div>
              <div className="mt-2 flex items-center justify-between text-[10px]">
                <span className="text-slate-500">Benchmark: {summary.targetKmPerLiter} km/L</span>
                <span className={`font-bold flex items-center ${
                  variancePercent >= 0 ? 'text-emerald-600' : 'text-rose-600'
                }`}>
                  {variancePercent >= 0 ? <TrendingUp className="w-3 h-3 mr-0.5" /> : <TrendingDown className="w-3 h-3 mr-0.5" />}
                  {variancePercent >= 0 ? `+${variancePercent}%` : `${variancePercent}%`}
                </span>
              </div>
            </div>

            {/* Avg Cost per KM */}
            <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-[10px] font-bold uppercase tracking-wider">Avg Cost / KM</span>
                <DollarSign className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="text-xl sm:text-2xl font-mono font-black text-emerald-700">
                  ₱{summary.avgCostPerKmPhp > 0 ? summary.avgCostPerKmPhp : '--'}
                </span>
                <span className="text-xs text-slate-500 font-semibold">/ km</span>
              </div>
              <div className="mt-2 text-[10px] text-slate-500">
                Avg Fuel: <strong className="text-slate-700">₱{summary.avgPricePerLiterPhp.toFixed(2)}/L</strong>
              </div>
            </div>

            {/* Total Fuel Spend */}
            <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-[10px] font-bold uppercase tracking-wider">Total Fuel Spend</span>
                <CreditCard className="w-4 h-4 text-indigo-600" />
              </div>
              <div className="mt-1">
                <span className="text-xl sm:text-2xl font-mono font-black text-slate-900">
                  ₱{summary.totalCostPhp.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="mt-2 text-[10px] text-slate-500">
                Across <strong className="text-slate-700">{summary.totalLogs}</strong> recorded fill-ups
              </div>
            </div>

            {/* Total Distance & Liters */}
            <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-[10px] font-bold uppercase tracking-wider">Distance & Volume</span>
                <Layers className="w-4 h-4 text-purple-600" />
              </div>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-lg font-mono font-bold text-slate-900">
                  {summary.totalDistanceKm.toLocaleString()} km
                </span>
              </div>
              <div className="mt-2 text-[10px] text-slate-500">
                Total Fuel: <strong className="text-slate-700">{summary.totalLiters.toLocaleString()} L</strong>
              </div>
            </div>
          </div>

          {/* Efficiency Progress Bar Benchmark Visualizer */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Gauge className="w-4 h-4 text-blue-600" />
                <span className="font-bold text-slate-800 text-xs">Vehicle Fuel Economy Meter</span>
              </div>
              <span className="text-[11px] font-semibold text-slate-500">
                Current: <strong className="text-slate-900 font-mono">{summary.avgKmPerLiter} km/L</strong> (Target: <span className="font-mono">{targetKmPerLiter} km/L</span>)
              </span>
            </div>

            <div className="relative pt-1">
              <div className="overflow-hidden h-3 text-xs flex rounded-full bg-slate-100 border border-slate-200">
                {/* Progress fill */}
                <div
                  style={{ width: `${Math.min(100, Math.max(10, (summary.avgKmPerLiter / (targetKmPerLiter * 1.4)) * 100))}%` }}
                  className={`shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center transition-all duration-500 ${
                    summary.efficiencyRating === 'Optimal' ? 'bg-emerald-500' :
                    summary.efficiencyRating === 'Normal' ? 'bg-blue-500' :
                    summary.efficiencyRating === 'High Consumption' ? 'bg-amber-500' :
                    'bg-rose-500'
                  }`}
                />
              </div>

              {/* Reference markers */}
              <div className="flex justify-between text-[9px] text-slate-400 font-mono mt-1">
                <span>0 km/L (Poor)</span>
                <span className="text-slate-600 font-bold">Standard Target: {targetKmPerLiter} km/L</span>
                <span>{(targetKmPerLiter * 1.4).toFixed(1)} km/L (Exceptional)</span>
              </div>
            </div>
          </div>

          {/* Fill-Up Logs Table Section */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-2xs overflow-hidden">
            {/* Table Toolbar */}
            <div className="p-3 sm:px-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900 text-xs">Fuel Log Ledger</span>
                <span className="text-[10px] bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full font-mono font-bold">
                  {logs.length} entries
                </span>
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={filterPeriod}
                  onChange={(e) => setFilterPeriod(e.target.value as any)}
                  className="bg-white border border-slate-200 text-xs rounded-lg px-2.5 py-1 text-slate-700 focus:outline-none focus:border-blue-500"
                >
                  <option value="ALL">All Records</option>
                  <option value="30DAYS">Last 30 Days</option>
                  <option value="90DAYS">Last 90 Days</option>
                </select>

                <button
                  onClick={handleExportCSV}
                  className="flex items-center gap-1 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 px-2.5 py-1 rounded-lg text-xs font-semibold shadow-2xs transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export CSV</span>
                </button>
              </div>
            </div>

            {/* Table */}
            {logs.length === 0 ? (
              <div className="p-8 text-center text-slate-500 space-y-2">
                <Fuel className="w-8 h-8 mx-auto text-slate-300" />
                <p className="text-xs font-medium">No fuel fill-ups recorded for this vehicle.</p>
                {canLog && (
                  <button
                    onClick={() => {
                      onClose();
                      onOpenAddFuel(truck.id);
                    }}
                    className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline font-bold"
                  >
                    + Record First Fuel Fill-up
                  </button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-200 text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Station & OR Receipt</th>
                      <th className="py-2.5 px-3 text-right">Odometer & Delta</th>
                      <th className="py-2.5 px-3 text-right">Fuel Volume</th>
                      <th className="py-2.5 px-3 text-right">Cost (PHP)</th>
                      <th className="py-2.5 px-3 text-center">KM / L</th>
                      <th className="py-2.5 px-3 text-right">₱ / KM</th>
                      <th className="py-2.5 px-3">Payment</th>
                      <th className="py-2.5 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {logs.map((log) => {
                      const isLogOptimal = log.kmPerLiter >= targetKmPerLiter * 0.95;
                      const isLogNormal = log.kmPerLiter >= targetKmPerLiter * 0.80 && !isLogOptimal;

                      return (
                        <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                          {/* Date */}
                          <td className="py-2.5 px-3 font-mono font-medium text-slate-700 whitespace-nowrap">
                            {log.date}
                          </td>

                          {/* Station */}
                          <td className="py-2.5 px-3">
                            <div className="font-semibold text-slate-900 max-w-[200px] truncate" title={log.fuelStation}>
                              {log.fuelStation}
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono">
                              {log.receiptNumber ? `OR: ${log.receiptNumber}` : log.fuelGrade}
                            </div>
                          </td>

                          {/* Odometer */}
                          <td className="py-2.5 px-3 text-right whitespace-nowrap">
                            <div className="font-mono font-bold text-slate-900">
                              {log.odometerKm.toLocaleString()} km
                            </div>
                            <div className="text-[10px] font-mono text-slate-500">
                              +{log.distanceKm.toLocaleString()} km run
                            </div>
                          </td>

                          {/* Volume */}
                          <td className="py-2.5 px-3 text-right whitespace-nowrap">
                            <div className="font-mono font-bold text-slate-900">
                              {log.liters.toFixed(1)} L
                            </div>
                            <div className="text-[10px] font-mono text-slate-400">
                              ₱{log.pricePerLiterPhp.toFixed(2)}/L
                            </div>
                          </td>

                          {/* Cost */}
                          <td className="py-2.5 px-3 text-right whitespace-nowrap">
                            <div className="font-mono font-black text-slate-900">
                              ₱{log.costPhp.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </div>
                          </td>

                          {/* KM/L */}
                          <td className="py-2.5 px-3 text-center whitespace-nowrap">
                            <span className={`inline-block font-mono font-bold px-2 py-0.5 rounded text-[11px] ${
                              isLogOptimal ? 'bg-emerald-100 text-emerald-800' :
                              isLogNormal ? 'bg-blue-100 text-blue-800' :
                              'bg-rose-100 text-rose-800'
                            }`}>
                              {log.kmPerLiter > 0 ? `${log.kmPerLiter} km/L` : '--'}
                            </span>
                          </td>

                          {/* Cost/km */}
                          <td className="py-2.5 px-3 text-right whitespace-nowrap font-mono text-slate-700">
                            {log.costPerKmPhp > 0 ? `₱${log.costPerKmPhp}` : '--'}
                          </td>

                          {/* Payment */}
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <span className="text-[10px] text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                              {log.paymentMethod}
                            </span>
                          </td>

                          {/* Actions */}
                          <td className="py-2.5 px-3 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1">
                              {canLog && (
                                <button
                                  onClick={() => onOpenEditFuel(log)}
                                  className="p-1 text-slate-400 hover:text-blue-600 hover:bg-slate-100 rounded transition-colors"
                                  title="Edit Log"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                              )}
                              {canDelete && (
                                <button
                                  onClick={() => {
                                    if (confirm(`Delete fuel log on ${log.date} for ₱${log.costPhp.toLocaleString()}?`)) {
                                      deleteFuelLog(log.id);
                                    }
                                  }}
                                  className="p-1 text-slate-400 hover:text-rose-600 hover:bg-slate-100 rounded transition-colors"
                                  title="Delete Log"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-white border-t border-slate-200 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            Official logistics compliance & fuel audit module.
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
