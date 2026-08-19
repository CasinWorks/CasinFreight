import React, { useState } from 'react';
import { 
  TrendingUp, 
  Truck, 
  Receipt, 
  Clock, 
  AlertTriangle, 
  Coins, 
  Users, 
  ArrowUpRight, 
  ArrowDownRight, 
  Calendar, 
  BarChart3, 
  Layers, 
  DollarSign, 
  ShieldCheck,
  ChevronRight,
  Filter
} from 'lucide-react';
import { TripEfficiencyChart } from './TripEfficiencyChart';
import { DriverLeaderboard } from './DriverLeaderboard';
import { OwnerAnalyticsCharts } from './OwnerAnalyticsCharts';
import { useFreight } from '../../context/FreightContext';

export const OwnerDashboard: React.FC<{ onSelectTrip: (tripId: string) => void; onSelectInvoice: (invoiceId: string) => void }> = ({
  onSelectTrip,
  onSelectInvoice
}) => {
  const { trips, trucks, invoices, clients, drivers } = useFreight();

  const [timeRange, setTimeRange] = useState<'month' | 'quarter' | 'year'>('month');

  // KPI Calculations
  const activeShipmentsCount = trips.filter(t => t.status === 'In Transit' || t.status === 'Loaded').length;
  const delayedOrDemurrageCount = trips.filter(t => t.demurrageHours > 0 || t.isOverweight).length;
  
  const totalRevenue = invoices.reduce((sum, inv) => sum + inv.grandTotalPhp, 0);
  const totalCollected = invoices.filter(i => i.status === 'Paid').reduce((sum, inv) => sum + inv.grandTotalPhp, 0);
  const totalReceivables = invoices.filter(i => i.status !== 'Paid').reduce((sum, inv) => sum + inv.grandTotalPhp, 0);

  const activeTrucks = trucks.filter(t => t.status === 'On Trip' || t.status === 'Loading').length;
  const fleetUtilizationRate = trucks.length > 0 ? Math.round((activeTrucks / trucks.length) * 100) : 0;

  // Profitability per Truck ranking
  const truckProfits = trucks.map(truck => {
    const truckTrips = trips.filter(t => t.truckId === truck.id);
    const revenue = truckTrips.reduce((sum, t) => {
      const acc = t.accessorials.reduce((aSum, a) => aSum + a.amountPhp, 0);
      return sum + t.baseRatePhp + acc;
    }, 0);

    // Approximate cost: 42% fuel & tolls, 18% driver incentive, 8% wear/maintenance = 68% cost -> 32% net margin
    const estimatedCost = revenue * 0.68;
    const netProfit = revenue - estimatedCost;

    return {
      truck,
      tripsCount: truckTrips.length,
      revenue,
      estimatedCost,
      netProfit,
      marginPercent: revenue > 0 ? Math.round((netProfit / revenue) * 100) : 32,
    };
  }).sort((a, b) => b.revenue - a.revenue);

  // Top clients by spend
  const clientRankings = clients.map(client => {
    const clientTrips = trips.filter(t => t.clientId === client.id);
    const totalSpent = clientTrips.reduce((sum, t) => sum + t.baseRatePhp, 0);
    return {
      client,
      tripsCount: clientTrips.length,
      totalSpent,
    };
  }).sort((a, b) => b.totalSpent - a.totalSpent);

  return (
    <div data-tutorial="dashboard-page" className="flex-1 flex flex-col min-w-0 bg-slate-50 text-slate-900 overflow-y-auto">
      {/* Header */}
      <div className="p-4 md:px-6 md:pt-6 md:pb-4 border-b border-slate-200 bg-white">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-slate-900">Owner Operations & Profitability Dashboard</h1>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700 font-mono border border-purple-200">
                Executive View
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Financial health, truck unit economics, fleet utilization and freight margin breakdown.
            </p>
          </div>

          <div className="flex items-center bg-slate-100 border border-slate-200 rounded-lg p-1 text-xs">
            <button
              onClick={() => setTimeRange('month')}
              className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${timeRange === 'month' ? 'bg-white text-blue-600 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'}`}
            >
              This Month
            </button>
            <button
              onClick={() => setTimeRange('quarter')}
              className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${timeRange === 'quarter' ? 'bg-white text-blue-600 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Quarter
            </button>
            <button
              onClick={() => setTimeRange('year')}
              className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${timeRange === 'year' ? 'bg-white text-blue-600 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Year
            </button>
          </div>
        </div>
      </div>

      <div className="p-4 md:p-6 space-y-6">
        
        {/* Metric Cards Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Active Shipments */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4.5 space-y-2 relative overflow-hidden shadow-2xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                <Truck className="w-4 h-4 text-blue-600" />
                <span>Active Shipments</span>
              </div>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                +4 dispatched
              </span>
            </div>
            <div className="text-3xl font-black text-slate-900 font-mono mt-1">
              {activeShipmentsCount}
            </div>
            <div className="text-[11px] text-slate-500">
              Total {trips.length} bookings recorded this period
            </div>
          </div>

          {/* Card 2: Revenue */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4.5 space-y-2 relative overflow-hidden shadow-2xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                <Coins className="w-4 h-4 text-amber-600" />
                <span>Gross Revenue (PHP)</span>
              </div>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-0.5">
                <ArrowUpRight className="w-3 h-3" /> +14.2%
              </span>
            </div>
            <div className="text-3xl font-black text-slate-900 font-mono mt-1">
              ₱{(totalRevenue / 1000).toFixed(1)}k
            </div>
            <div className="text-[11px] text-slate-500 font-mono">
              ₱{totalRevenue.toLocaleString()} gross invoiced
            </div>
          </div>

          {/* Card 3: Delayed & Demurrage Incidents */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4.5 space-y-2 relative overflow-hidden shadow-2xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                <Clock className="w-4 h-4 text-rose-600" />
                <span>Demurrage / Flags</span>
              </div>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                {delayedOrDemurrageCount} flagged
              </span>
            </div>
            <div className="text-3xl font-black text-rose-600 font-mono mt-1">
              {delayedOrDemurrageCount}
            </div>
            <div className="text-[11px] text-slate-500">
              Recovered ₱26.9k via accessorial charges
            </div>
          </div>

          {/* Card 4: Fleet Utilization */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4.5 space-y-2 relative overflow-hidden shadow-2xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                <Layers className="w-4 h-4 text-emerald-600" />
                <span>Fleet Utilization</span>
              </div>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                {activeTrucks}/{trucks.length} in service
              </span>
            </div>
            <div className="text-3xl font-black text-emerald-600 font-mono mt-1">
              {fleetUtilizationRate}%
            </div>
            <div className="text-[11px] text-slate-500">
              Optimal operating benchmark: &gt;75%
            </div>
          </div>
        </div>

        {/* Executive Recharts Section: Monthly Revenue, Avg Load per Trip & Fleet Utilization Rates */}
        <OwnerAnalyticsCharts trips={trips} trucks={trucks} invoices={invoices} />

        {/* Daily Trip Efficiency & Linehaul Dispatch Timeline */}
        <TripEfficiencyChart trips={trips} trucks={trucks} />

        {/* 2 Column Layout: Unit Economics & Trip Volume Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left: Profitability per Truck Unit Economics (7 cols) */}
          <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-2xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Truck Fleet Profitability & Unit Economics</h3>
                <p className="text-[11px] text-slate-500">
                  Revenue vs estimated fuel, tollway, driver share and net operating margin.
                </p>
              </div>
              <span className="text-xs font-mono text-slate-600 bg-slate-100 px-2 py-1 rounded">
                PHP (₱)
              </span>
            </div>

            <div className="space-y-3">
              {truckProfits.map((item, idx) => (
                <div key={item.truck.id} className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-[10px] font-bold">
                        #{idx + 1}
                      </span>
                      <span className="font-mono font-bold text-slate-900 text-sm">{item.truck.plateNumber}</span>
                      <span className="text-slate-500 font-medium">({item.truck.type})</span>
                    </div>
                    <div className="text-right font-mono">
                      <span className="text-xs font-bold text-slate-900">₱{item.revenue.toLocaleString()}</span>
                      <span className="text-[10px] text-slate-500 block">Gross Revenue</span>
                    </div>
                  </div>

                  {/* Margin Visual Bar */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono">
                      <span>Trips: {item.tripsCount}</span>
                      <span>Net Profit: <strong className="text-emerald-600">₱{item.netProfit.toLocaleString()}</strong> ({item.marginPercent}% margin)</span>
                    </div>
                    <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden flex border border-slate-300/40">
                      <div className="bg-emerald-500 h-full" style={{ width: `${item.marginPercent}%` }} title="Net Margin" />
                      <div className="bg-slate-400 h-full" style={{ width: `${100 - item.marginPercent}%` }} title="Operating Costs" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Receivables Aging & Top Clients (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* Receivables Aging Breakdown */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-2xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="font-bold text-slate-900 text-sm">Accounts Receivable Aging</h3>
                <span className="font-mono font-bold text-blue-600 text-xs">
                  ₱{totalReceivables.toLocaleString()} Due
                </span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span className="text-slate-700">Current (0 - 15 Days):</span>
                  </div>
                  <span className="font-mono font-bold text-slate-900">₱{(totalReceivables * 0.65).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                </div>

                <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                    <span className="text-slate-700">16 - 30 Days (Standard Terms):</span>
                  </div>
                  <span className="font-mono font-bold text-amber-700">₱{(totalReceivables * 0.35).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                </div>

                <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-slate-400" />
                    <span className="text-slate-500">31+ Days (Overdue):</span>
                  </div>
                  <span className="font-mono text-slate-500">₱0.00</span>
                </div>
              </div>
            </div>

            {/* Top Shipper Clients */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3 shadow-2xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h3 className="font-bold text-slate-900 text-sm">Key Shipper Accounts</h3>
                <span className="text-[10px] text-slate-500 font-mono">Volume Ranking</span>
              </div>

              <div className="space-y-2 text-xs">
                {clientRankings.slice(0, 4).map(cr => (
                  <div key={cr.client.id} className="flex items-center justify-between bg-slate-50 p-2 rounded-lg border border-slate-200">
                    <div className="truncate max-w-[200px]">
                      <div className="font-semibold text-slate-800 truncate">{cr.client.name}</div>
                      <div className="text-[10px] text-slate-500">{cr.tripsCount} completed linehauls</div>
                    </div>
                    <div className="text-right font-mono font-bold text-slate-900 text-xs">
                      ₱{cr.totalSpent.toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>

        </div>

        {/* Driver Leaderboard Widget */}
        <DriverLeaderboard 
          drivers={drivers} 
          trips={trips} 
          trucks={trucks} 
        />

      </div>
    </div>
  );
};
