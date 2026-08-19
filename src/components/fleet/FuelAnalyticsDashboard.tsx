import React, { useState } from 'react';
import { 
  Fuel, 
  Gauge, 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle2, 
  Search, 
  Filter, 
  Download, 
  Plus, 
  Truck as TruckIcon, 
  Layers, 
  ArrowUpRight, 
  FileText, 
  Calendar, 
  CreditCard, 
  MapPin, 
  Trash2, 
  Edit3,
  ShieldCheck
} from 'lucide-react';
import { useFreight, getTargetKmPerLiter } from '../../context/FreightContext';
import { Truck, FuelLog, TruckType } from '../../types';

interface FuelAnalyticsDashboardProps {
  onOpenAddFuel: (truckId?: string) => void;
  onOpenTruckFuelDetail: (truck: Truck) => void;
  onOpenEditFuel: (log: FuelLog) => void;
}

export const FuelAnalyticsDashboard: React.FC<FuelAnalyticsDashboardProps> = ({
  onOpenAddFuel,
  onOpenTruckFuelDetail,
  onOpenEditFuel
}) => {
  const { 
    trucks, 
    fuelLogs, 
    getTruckFuelSummary, 
    getFleetFuelAnalytics, 
    deleteFuelLog, 
    canLogFuel, 
    canDeleteFuelLog,
    drivers 
  } = useFreight();

  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedTruckFilter, setSelectedTruckFilter] = useState<string>('ALL');
  const [selectedPaymentFilter, setSelectedPaymentFilter] = useState<string>('ALL');
  const [selectedEfficiencyFilter, setSelectedEfficiencyFilter] = useState<string>('ALL');

  const fleetAnalytics = getFleetFuelAnalytics();
  const canLog = canLogFuel().allowed;
  const canDelete = canDeleteFuelLog().allowed;

  // Summaries for all trucks
  const truckSummaries = trucks.map(truck => {
    const summary = getTruckFuelSummary(truck.id);
    return {
      truck,
      summary,
    };
  });

  // Filtered transactions ledger
  const filteredLogs = fuelLogs.filter(log => {
    const truck = trucks.find(t => t.id === log.truckId);
    const driver = drivers.find(d => d.id === log.driverId);
    const matchesSearch = 
      (truck?.plateNumber.toLowerCase().includes(searchTerm.toLowerCase()) ?? false) ||
      log.fuelStation.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.receiptNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false) ||
      (driver?.name.toLowerCase().includes(searchTerm.toLowerCase()) ?? false);

    const matchesTruck = selectedTruckFilter === 'ALL' || log.truckId === selectedTruckFilter;
    const matchesPayment = selectedPaymentFilter === 'ALL' || log.paymentMethod === selectedPaymentFilter;
    
    return matchesSearch && matchesTruck && matchesPayment;
  });

  // Filtered truck summaries
  const filteredTruckSummaries = truckSummaries.filter(({ truck, summary }) => {
    const matchesEfficiency = selectedEfficiencyFilter === 'ALL' || summary.efficiencyRating === selectedEfficiencyFilter;
    const matchesSearch = 
      truck.plateNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      truck.brandModel.toLowerCase().includes(searchTerm.toLowerCase()) ||
      truck.type.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesEfficiency && matchesSearch;
  });

  // Export Full Fleet CSV
  const handleExportFleetCSV = () => {
    if (filteredLogs.length === 0) {
      alert('No fuel records to export.');
      return;
    }

    const headers = ['Log ID', 'Date', 'Plate Number', 'Truck Type', 'Odometer (km)', 'Distance (km)', 'Fuel Volume (L)', 'Cost (PHP)', 'Price/L (PHP)', 'KM/L', 'Cost/KM (PHP)', 'Station', 'Payment Method', 'Receipt #', 'Logged By'];
    const rows = filteredLogs.map(l => {
      const trk = trucks.find(t => t.id === l.truckId);
      return [
        l.id,
        l.date,
        trk ? trk.plateNumber : 'Unknown',
        trk ? `"${trk.type}"` : 'Unknown',
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
      ];
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Fleet_Fuel_Master_Audit_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      
      {/* Fleet Fuel Top KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Fleet Fuel Spend */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Fleet Fuel Spend</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-2xl font-mono font-black text-slate-900">
              ₱{fleetAnalytics.totalCostPhp.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="mt-2 text-xs text-slate-500 flex items-center justify-between">
            <span>Avg Price: <strong className="text-slate-800">₱{fleetAnalytics.avgPricePerLiterPhp.toFixed(2)}/L</strong></span>
            <span className="font-mono font-semibold">{fleetAnalytics.totalLogsCount} fill-ups</span>
          </div>
          <div className="absolute top-0 right-0 h-1 w-full bg-emerald-500" />
        </div>

        {/* Fleet Average KM/L */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Fleet Average KM / Liter</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Gauge className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-mono font-black text-blue-700">
              {fleetAnalytics.avgKmPerLiter > 0 ? fleetAnalytics.avgKmPerLiter : '--'}
            </span>
            <span className="text-xs font-semibold text-slate-500">km / L</span>
          </div>
          <div className="mt-2 text-xs text-slate-500 flex items-center justify-between">
            <span>Standard target: ~3.5 km/L</span>
            <span className="text-emerald-600 font-bold flex items-center">
              <TrendingUp className="w-3.5 h-3.5 mr-0.5" /> Fleet benchmark
            </span>
          </div>
          <div className="absolute top-0 right-0 h-1 w-full bg-blue-500" />
        </div>

        {/* Fleet Cost per KM */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Average Cost per KM</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-2xl font-mono font-black text-indigo-900">
              ₱{fleetAnalytics.avgCostPerKmPhp > 0 ? fleetAnalytics.avgCostPerKmPhp : '--'}
            </span>
            <span className="text-xs font-semibold text-slate-500">/ km run</span>
          </div>
          <div className="mt-2 text-xs text-slate-500 flex items-center justify-between">
            <span>Distance: <strong className="text-slate-800">{fleetAnalytics.totalDistanceKm.toLocaleString()} km</strong></span>
          </div>
          <div className="absolute top-0 right-0 h-1 w-full bg-indigo-500" />
        </div>

        {/* Total Liters Consumed */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Total Fuel Consumed</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Fuel className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-2xl font-mono font-black text-slate-900">
              {fleetAnalytics.totalLiters.toLocaleString()}
            </span>
            <span className="text-xs font-semibold text-slate-500">Liters (Diesel)</span>
          </div>
          <div className="mt-2 text-xs text-slate-500 flex items-center justify-between">
            <span>Across <strong className="text-slate-800">{trucks.length}</strong> fleet units</span>
          </div>
          <div className="absolute top-0 right-0 h-1 w-full bg-amber-500" />
        </div>
      </div>

      {/* Spotlights: Highest vs Lowest Efficiency Vehicles */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {fleetAnalytics.highestEfficiencyTruck && (
          <div className="bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-transparent border border-emerald-200/80 rounded-2xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center shadow-md">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Top Fuel Saver</span>
                  <span className="bg-emerald-100 text-emerald-800 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full">
                    ⚡ {fleetAnalytics.highestEfficiencyTruck.kmPerLiter} km/L
                  </span>
                </div>
                <div className="font-mono font-black text-slate-900 text-base mt-0.5">
                  {fleetAnalytics.highestEfficiencyTruck.plateNumber}
                </div>
                <p className="text-xs text-slate-500">
                  {fleetAnalytics.highestEfficiencyTruck.type} — Consistently achieving maximum fuel efficiency.
                </p>
              </div>
            </div>

            {trucks.find(t => t.plateNumber === fleetAnalytics.highestEfficiencyTruck?.plateNumber) && (
              <button
                onClick={() => {
                  const trk = trucks.find(t => t.plateNumber === fleetAnalytics.highestEfficiencyTruck?.plateNumber);
                  if (trk) onOpenTruckFuelDetail(trk);
                }}
                className="text-xs font-bold text-emerald-700 hover:text-emerald-800 bg-white border border-emerald-200 px-3 py-1.5 rounded-lg shadow-2xs transition-colors"
              >
                View History
              </button>
            )}
          </div>
        )}

        {fleetAnalytics.lowestEfficiencyTruck && (
          <div className="bg-gradient-to-r from-amber-500/10 via-rose-500/5 to-transparent border border-amber-200/80 rounded-2xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-md">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-amber-800 uppercase tracking-wider">High Consumption Alert</span>
                  <span className="bg-amber-100 text-amber-800 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full">
                    ⚠️ {fleetAnalytics.lowestEfficiencyTruck.kmPerLiter} km/L
                  </span>
                </div>
                <div className="font-mono font-black text-slate-900 text-base mt-0.5">
                  {fleetAnalytics.lowestEfficiencyTruck.plateNumber}
                </div>
                <p className="text-xs text-slate-500">
                  {fleetAnalytics.lowestEfficiencyTruck.type} — Fuel consumption higher than optimal baseline.
                </p>
              </div>
            </div>

            {trucks.find(t => t.plateNumber === fleetAnalytics.lowestEfficiencyTruck?.plateNumber) && (
              <button
                onClick={() => {
                  const trk = trucks.find(t => t.plateNumber === fleetAnalytics.lowestEfficiencyTruck?.plateNumber);
                  if (trk) onOpenTruckFuelDetail(trk);
                }}
                className="text-xs font-bold text-amber-700 hover:text-amber-800 bg-white border border-amber-200 px-3 py-1.5 rounded-lg shadow-2xs transition-colors"
              >
                Inspect Logs
              </button>
            )}
          </div>
        )}
      </div>

      {/* Section: Truck Fuel Economy Ranking & Summary Grid */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-2xs overflow-hidden">
        <div className="p-4 sm:px-6 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/50">
          <div>
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <Gauge className="w-4 h-4 text-blue-600" />
              Vehicle-by-Vehicle Fuel Consumption & KM/L Ratings
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Calculates average kilometers per liter and cost per kilometer benchmarked against Philippine logistics standards.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={selectedEfficiencyFilter}
              onChange={(e) => setSelectedEfficiencyFilter(e.target.value)}
              className="bg-white border border-slate-200 text-xs rounded-lg px-3 py-1.5 text-slate-700 font-semibold focus:outline-none focus:border-blue-500"
            >
              <option value="ALL">All Efficiency Statuses</option>
              <option value="Optimal">⚡ Optimal Only</option>
              <option value="Normal">✓ Normal Economy</option>
              <option value="High Consumption">⚠️ High Consumption</option>
              <option value="Needs Service">🚨 Service Required</option>
            </select>

            {canLog && (
              <button
                onClick={() => onOpenAddFuel()}
                className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-1.5 rounded-lg text-xs font-bold shadow-xs transition-all active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>Log Fuel Fill-Up</span>
              </button>
            )}
          </div>
        </div>

        {/* Table of Trucks */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                <th className="py-3 px-4">Vehicle Details</th>
                <th className="py-3 px-4 text-center">Avg KM / L</th>
                <th className="py-3 px-4 text-center">Target Benchmark</th>
                <th className="py-3 px-4 text-center">Economy Status</th>
                <th className="py-3 px-4 text-right">Cost / KM (PHP)</th>
                <th className="py-3 px-4 text-right">Total Fuel Spend</th>
                <th className="py-3 px-4 text-right">Total Liters</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTruckSummaries.map(({ truck, summary }) => {
                const isOptimal = summary.efficiencyRating === 'Optimal';
                const isNormal = summary.efficiencyRating === 'Normal';
                const isHigh = summary.efficiencyRating === 'High Consumption';

                return (
                  <tr key={truck.id} className="hover:bg-slate-50/70 transition-colors">
                    {/* Vehicle */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center font-bold text-blue-700">
                          <TruckIcon className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-mono font-bold text-slate-900 text-xs">
                            {truck.plateNumber}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {truck.brandModel} • {truck.type}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Avg KM/L */}
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <span className="font-mono font-black text-sm text-slate-900">
                        {summary.avgKmPerLiter > 0 ? `${summary.avgKmPerLiter} km/L` : '--'}
                      </span>
                    </td>

                    {/* Target Benchmark */}
                    <td className="py-3 px-4 text-center whitespace-nowrap font-mono text-slate-500 text-xs">
                      {summary.targetKmPerLiter} km/L
                    </td>

                    {/* Economy Status */}
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <span className={`inline-block text-[10px] font-bold px-2.5 py-1 rounded-full border ${
                        isOptimal ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                        isNormal ? 'bg-blue-50 text-blue-700 border-blue-200' :
                        isHigh ? 'bg-amber-50 text-amber-700 border-amber-200' :
                        'bg-rose-50 text-rose-700 border-rose-200'
                      }`}>
                        {isOptimal ? '⚡ Optimal' :
                         isNormal ? '✓ Normal' :
                         isHigh ? '⚠️ High Consumption' : '🚨 Needs Service'}
                      </span>
                    </td>

                    {/* Cost / KM */}
                    <td className="py-3 px-4 text-right whitespace-nowrap font-mono font-bold text-slate-800">
                      {summary.avgCostPerKmPhp > 0 ? `₱${summary.avgCostPerKmPhp}/km` : '--'}
                    </td>

                    {/* Total Fuel Spend */}
                    <td className="py-3 px-4 text-right whitespace-nowrap font-mono font-bold text-emerald-700">
                      ₱{summary.totalCostPhp.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>

                    {/* Total Liters */}
                    <td className="py-3 px-4 text-right whitespace-nowrap font-mono text-slate-600">
                      {summary.totalLiters.toLocaleString()} L
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => onOpenTruckFuelDetail(truck)}
                          className="px-2.5 py-1 rounded-lg bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-semibold text-xs transition-colors"
                        >
                          View Logs
                        </button>
                        {canLog && (
                          <button
                            onClick={() => onOpenAddFuel(truck.id)}
                            className="p-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 transition-colors"
                            title="Log Fuel for this truck"
                          >
                            <Plus className="w-3.5 h-3.5" />
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
      </div>

      {/* Section: Master Fleet Fuel Transaction Ledger */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-2xs overflow-hidden">
        <div className="p-4 sm:px-6 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/50">
          <div>
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <FileText className="w-4 h-4 text-emerald-600" />
              Master Fleet Fuel Expense & Audit Ledger
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Complete transaction log with station names, POS receipts, payment instruments, and calculated efficiency metrics.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search plate, station, OR #..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-white border border-slate-200 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 w-48 sm:w-60"
              />
            </div>

            {/* Filter Truck */}
            <select
              value={selectedTruckFilter}
              onChange={(e) => setSelectedTruckFilter(e.target.value)}
              className="bg-white border border-slate-200 text-xs rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-none focus:border-blue-500"
            >
              <option value="ALL">All Trucks</option>
              {trucks.map(t => (
                <option key={t.id} value={t.id}>{t.plateNumber}</option>
              ))}
            </select>

            {/* Export CSV */}
            <button
              onClick={handleExportFleetCSV}
              className="flex items-center gap-1 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 px-3 py-1.5 rounded-lg text-xs font-semibold shadow-2xs transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Ledger Table */}
        {filteredLogs.length === 0 ? (
          <div className="p-12 text-center text-slate-500 space-y-3">
            <Fuel className="w-10 h-10 mx-auto text-slate-300" />
            <p className="text-xs font-semibold">No fuel fill-up records matching your current filter.</p>
            {canLog && (
              <button
                onClick={() => onOpenAddFuel()}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 text-white font-bold text-xs hover:bg-blue-700 shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>Log New Fuel Fill-Up</span>
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Truck Plate</th>
                  <th className="py-2.5 px-3">Station & Receipt</th>
                  <th className="py-2.5 px-3 text-right">Odometer & Run</th>
                  <th className="py-2.5 px-3 text-right">Liters</th>
                  <th className="py-2.5 px-3 text-right">Total Cost (₱)</th>
                  <th className="py-2.5 px-3 text-center">KM / L</th>
                  <th className="py-2.5 px-3 text-right">₱ / KM</th>
                  <th className="py-2.5 px-3">Payment</th>
                  <th className="py-2.5 px-3">Logged By</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLogs.map(log => {
                  const trk = trucks.find(t => t.id === log.truckId);
                  const targetKml = trk ? getTargetKmPerLiter(trk.type) : 3.5;
                  const isLogOptimal = log.kmPerLiter >= targetKml * 0.95;
                  const isLogNormal = log.kmPerLiter >= targetKml * 0.80 && !isLogOptimal;

                  return (
                    <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Date */}
                      <td className="py-2.5 px-3 font-mono text-slate-700 whitespace-nowrap">
                        {log.date}
                      </td>

                      {/* Truck */}
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span 
                          onClick={() => trk && onOpenTruckFuelDetail(trk)}
                          className="font-mono font-bold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                        >
                          {trk?.plateNumber || 'Unknown'}
                        </span>
                        <div className="text-[10px] text-slate-400 truncate max-w-[120px]">
                          {trk?.brandModel}
                        </div>
                      </td>

                      {/* Station */}
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-slate-900 max-w-[180px] truncate" title={log.fuelStation}>
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
                          +{log.distanceKm.toLocaleString()} km
                        </div>
                      </td>

                      {/* Liters */}
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
                        <span className="font-mono font-black text-slate-900">
                          ₱{log.costPhp.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
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

                      {/* ₱/KM */}
                      <td className="py-2.5 px-3 text-right whitespace-nowrap font-mono text-slate-700">
                        {log.costPerKmPhp > 0 ? `₱${log.costPerKmPhp}` : '--'}
                      </td>

                      {/* Payment */}
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span className="text-[10px] text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                          {log.paymentMethod}
                        </span>
                      </td>

                      {/* Logged By */}
                      <td className="py-2.5 px-3 whitespace-nowrap text-slate-500 text-[10px]">
                        {log.loggedBy}
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
  );
};
