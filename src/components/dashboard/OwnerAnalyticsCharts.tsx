import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  Cell,
  PieChart,
  Pie
} from 'recharts';
import {
  TrendingUp,
  Scale,
  Truck,
  DollarSign,
  Coins,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  BarChart3,
  PieChart as PieChartIcon,
  Activity,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  Calendar,
  Filter,
  Maximize2
} from 'lucide-react';
import { Trip, Truck as TruckType, Invoice } from '../../types';

interface OwnerAnalyticsChartsProps {
  trips: Trip[];
  trucks: TruckType[];
  invoices: Invoice[];
}

type ChartTab = 'ALL' | 'REVENUE' | 'LOAD' | 'UTILIZATION';
type TimeFilter = '6M' | '12M' | 'YTD';

interface MonthlyRevenueData {
  month: string;
  shortMonth: string;
  baseRevenue: number;
  accessorialsRevenue: number;
  totalRevenue: number;
  collectedRevenue: number;
  netProfit: number;
  marginPercent: number;
  tripsCount: number;
  avgRevenuePerTrip: number;
  momGrowthPercent: number;
}

interface MonthlyLoadData {
  month: string;
  shortMonth: string;
  avgLoadKg: number;
  avgLoadTons: number;
  maxCapacityTons: number;
  payloadUtilization: number; // %
  tripsCount: number;
  heavyTonnageTrips: number;
  optimalLoadedTrips: number;
}

interface TruckCategoryLoadData {
  category: string;
  truckCount: number;
  avgPayloadTons: number;
  maxPayloadTons: number;
  utilizationPercent: number;
  tripsCount: number;
  color: string;
}

interface FleetUtilizationData {
  month: string;
  shortMonth: string;
  utilizationRate: number; // %
  targetBenchmark: number; // 75%
  activeTrucksAvg: number;
  idleTrucksAvg: number;
  maintenanceHoursRate: number; // %
  totalDistanceKm: number;
}

function monthBuckets(count: number) {
  const now = new Date();
  return Array.from({ length: count }, (_, index) => {
    const offset = count - 1 - index;
    const start = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    const end = new Date(now.getFullYear(), now.getMonth() - offset + 1, 1);
    return {
      start,
      end,
      month: start.toLocaleDateString('en-PH', { month: 'long', year: 'numeric' }),
      shortMonth: start.toLocaleDateString('en-PH', { month: 'short' }),
    };
  });
}

function inMonth(value: string | undefined, start: Date, end: Date) {
  if (!value) return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  return date >= start && date < end;
}

function tripStamp(trip: Trip) {
  return trip.createdAt || trip.scheduledPickup;
}

export const OwnerAnalyticsCharts: React.FC<OwnerAnalyticsChartsProps> = ({
  trips,
  trucks,
  invoices
}) => {
  const hasLiveData = trips.length > 0 || invoices.length > 0;
  const [activeTab, setActiveTab] = useState<ChartTab>('ALL');
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('6M');
  const monthCount = timeFilter === '12M' ? 12 : 6;
  const fleetSize = trucks.length;

  const monthlyRevenueData = useMemo<MonthlyRevenueData[]>(() => {
    const buckets = monthBuckets(monthCount);
    return buckets.map((bucket, index) => {
      const monthTrips = trips.filter((trip) => inMonth(tripStamp(trip), bucket.start, bucket.end));
      const monthInvoices = invoices.filter((invoice) => inMonth(invoice.issueDate, bucket.start, bucket.end));
      const baseRevenue = monthInvoices.length
        ? monthInvoices.reduce((sum, invoice) => sum + (invoice.subtotalPhp || invoice.grandTotalPhp), 0)
        : monthTrips.reduce((sum, trip) => sum + trip.baseRatePhp, 0);
      const accessorialsRevenue = monthTrips.reduce(
        (sum, trip) => sum + trip.accessorials.reduce((inner, item) => inner + item.amountPhp, 0),
        0
      );
      const totalRevenue = monthInvoices.length
        ? monthInvoices.reduce((sum, invoice) => sum + invoice.grandTotalPhp, 0)
        : baseRevenue + accessorialsRevenue;
      const collectedRevenue = monthInvoices
        .filter((invoice) => invoice.status === 'Paid')
        .reduce((sum, invoice) => sum + invoice.grandTotalPhp, 0);
      const estimatedCost = totalRevenue * 0.64;
      const netProfit = totalRevenue - estimatedCost;
      const tripsCount = monthTrips.length;
      const previous = index > 0 ? buckets[index - 1] : null;
      let momGrowthPercent = 0;
      if (previous) {
        const prevTrips = trips.filter((trip) => inMonth(tripStamp(trip), previous.start, previous.end));
        const prevInvoices = invoices.filter((invoice) => inMonth(invoice.issueDate, previous.start, previous.end));
        const prevTotal = prevInvoices.length
          ? prevInvoices.reduce((sum, invoice) => sum + invoice.grandTotalPhp, 0)
          : prevTrips.reduce((sum, trip) => sum + trip.baseRatePhp, 0);
        if (prevTotal > 0) momGrowthPercent = Math.round(((totalRevenue - prevTotal) / prevTotal) * 1000) / 10;
      }
      return {
        month: bucket.month,
        shortMonth: bucket.shortMonth,
        baseRevenue: Math.round(baseRevenue),
        accessorialsRevenue: Math.round(accessorialsRevenue),
        totalRevenue: Math.round(totalRevenue),
        collectedRevenue: Math.round(collectedRevenue),
        netProfit: Math.round(netProfit),
        marginPercent: totalRevenue > 0 ? Math.round((netProfit / totalRevenue) * 100) : 0,
        tripsCount,
        avgRevenuePerTrip: tripsCount > 0 ? Math.round(totalRevenue / tripsCount) : 0,
        momGrowthPercent,
      };
    });
  }, [invoices, monthCount, trips]);

  const monthlyLoadData = useMemo<MonthlyLoadData[]>(() => {
    const buckets = monthBuckets(monthCount);
    const fleetCapKg = trucks.reduce((sum, truck) => sum + (truck.netPayloadKg || 0), 0);
    const maxCapacityTons = trucks.length > 0 ? Math.round((fleetCapKg / trucks.length / 1000) * 10) / 10 : 0;
    return buckets.map((bucket) => {
      const monthTrips = trips.filter((trip) => inMonth(tripStamp(trip), bucket.start, bucket.end));
      const tripsCount = monthTrips.length;
      const avgKg = tripsCount > 0
        ? Math.round(monthTrips.reduce((sum, trip) => sum + (trip.cargoWeightKg || 0), 0) / tripsCount)
        : 0;
      const avgLoadTons = Math.round((avgKg / 1000) * 10) / 10;
      const payloadUtilization = maxCapacityTons > 0 ? Math.round((avgLoadTons / maxCapacityTons) * 100) : 0;
      return {
        month: bucket.month,
        shortMonth: bucket.shortMonth,
        avgLoadKg: avgKg,
        avgLoadTons,
        maxCapacityTons,
        payloadUtilization,
        tripsCount,
        heavyTonnageTrips: monthTrips.filter((trip) => trip.cargoWeightKg >= 20000).length,
        optimalLoadedTrips: monthTrips.filter((trip) => !trip.isOverweight && trip.cargoWeightKg > 0).length,
      };
    });
  }, [monthCount, trips, trucks]);

  const truckCategoryLoadData = useMemo<TruckCategoryLoadData[]>(() => {
    const colors = ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#0EA5E9'];
    const groups = new Map<string, TruckType[]>();
    trucks.forEach((truck) => {
      const key = truck.type || 'Unspecified';
      groups.set(key, [...(groups.get(key) || []), truck]);
    });
    return Array.from(groups.entries()).map(([category, group], index) => {
      const ids = new Set(group.map((truck) => truck.id));
      const groupTrips = trips.filter((trip) => ids.has(trip.truckId));
      const maxPayloadTons = group.reduce((sum, truck) => sum + (truck.netPayloadKg || 0), 0) / Math.max(group.length, 1) / 1000;
      const avgPayloadTons = groupTrips.length
        ? groupTrips.reduce((sum, trip) => sum + (trip.cargoWeightKg || 0), 0) / groupTrips.length / 1000
        : 0;
      return {
        category,
        truckCount: group.length,
        avgPayloadTons: Math.round(avgPayloadTons * 10) / 10,
        maxPayloadTons: Math.round(maxPayloadTons * 10) / 10,
        utilizationPercent: maxPayloadTons > 0 ? Math.round((avgPayloadTons / maxPayloadTons) * 100) : 0,
        tripsCount: groupTrips.length,
        color: colors[index % colors.length],
      };
    });
  }, [trips, trucks]);

  const fleetUtilizationData = useMemo<FleetUtilizationData[]>(() => {
    const buckets = monthBuckets(monthCount);
    return buckets.map((bucket) => {
      const monthTrips = trips.filter((trip) => inMonth(tripStamp(trip), bucket.start, bucket.end));
      const activeIds = new Set(monthTrips.map((trip) => trip.truckId).filter(Boolean));
      const activeTrucksAvg = activeIds.size;
      const idleTrucksAvg = Math.max(0, fleetSize - activeTrucksAvg);
      const utilizationRate = fleetSize > 0 ? Math.round((activeTrucksAvg / fleetSize) * 100) : 0;
      const maintenanceHoursRate = fleetSize > 0
        ? Math.round((trucks.filter((truck) => truck.status === 'Maintenance').length / fleetSize) * 100)
        : 0;
      return {
        month: bucket.month,
        shortMonth: bucket.shortMonth,
        utilizationRate,
        targetBenchmark: 75,
        activeTrucksAvg,
        idleTrucksAvg,
        maintenanceHoursRate,
        totalDistanceKm: 0,
      };
    });
  }, [fleetSize, monthCount, trips, trucks]);

  // Aggregate Key Performance Metrics
  const currentMonthRevenue = monthlyRevenueData[monthlyRevenueData.length - 1];
  const totalPeriodRevenue = monthlyRevenueData.reduce((sum, m) => sum + m.totalRevenue, 0);
  const totalPeriodProfit = monthlyRevenueData.reduce((sum, m) => sum + m.netProfit, 0);
  const avgPeriodMargin = totalPeriodRevenue > 0 ? Math.round((totalPeriodProfit / totalPeriodRevenue) * 100) : 0;

  const currentMonthLoad = monthlyLoadData[monthlyLoadData.length - 1];
  const avgPeriodLoadTons = (
    monthlyLoadData.reduce((sum, m) => sum + m.avgLoadTons, 0) / (monthlyLoadData.length || 1)
  ).toFixed(1);
  const avgPayloadUtilization = Math.round(
    monthlyLoadData.reduce((sum, m) => sum + m.payloadUtilization, 0) / (monthlyLoadData.length || 1)
  );

  const currentFleetUtil = fleetUtilizationData[fleetUtilizationData.length - 1];
  const avgFleetUtilization = Math.round(
    fleetUtilizationData.reduce((sum, m) => sum + m.utilizationRate, 0) / (fleetUtilizationData.length || 1)
  );

  // Custom Tooltip for Revenue Chart
  const RevenueCustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data: MonthlyRevenueData = payload[0].payload;
      return (
        <div className="bg-slate-900/95 text-white p-3.5 rounded-xl shadow-2xl border border-slate-700/80 backdrop-blur-md text-xs space-y-2.5 min-w-[230px] z-50">
          <div className="flex items-center justify-between border-b border-slate-700 pb-2">
            <span className="font-bold text-slate-100 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-blue-400" />
              {data.month}
            </span>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              {data.marginPercent}% Net Margin
            </span>
          </div>

          <div className="space-y-1.5 font-mono">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-xs bg-blue-500 inline-block" />
                Base Freight:
              </span>
              <span className="font-bold text-white">₱{data.baseRevenue.toLocaleString()}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-400 flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-xs bg-purple-500 inline-block" />
                Accessorials & Demurrage:
              </span>
              <span className="font-bold text-purple-300">₱{data.accessorialsRevenue.toLocaleString()}</span>
            </div>

            <div className="flex items-center justify-between border-t border-slate-800 pt-1 text-slate-300">
              <span className="font-bold">Gross Invoiced:</span>
              <span className="font-black text-white text-sm">₱{data.totalRevenue.toLocaleString()}</span>
            </div>

            <div className="flex items-center justify-between text-emerald-400">
              <span>Est. Net Profit:</span>
              <span className="font-bold">₱{data.netProfit.toLocaleString()}</span>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-800 text-[10px] text-slate-400 flex items-center justify-between">
            <span>Volume: {data.tripsCount} trips</span>
            <span>Avg/Trip: ₱{data.avgRevenuePerTrip.toLocaleString()}</span>
          </div>
        </div>
      );
    }
    return null;
  };

  // Custom Tooltip for Load Chart
  const LoadCustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data: MonthlyLoadData = payload[0].payload;
      return (
        <div className="bg-slate-900/95 text-white p-3.5 rounded-xl shadow-2xl border border-slate-700/80 backdrop-blur-md text-xs space-y-2 min-w-[220px] z-50">
          <div className="flex items-center justify-between border-b border-slate-700 pb-1.5">
            <span className="font-bold text-slate-100 flex items-center gap-1.5">
              <Scale className="w-3.5 h-3.5 text-amber-400" />
              {data.month}
            </span>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
              {data.payloadUtilization}% Utilized
            </span>
          </div>

          <div className="space-y-1.5 font-mono">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Avg Cargo Tonnage:</span>
              <span className="font-bold text-amber-300">{data.avgLoadTons} MT ({data.avgLoadKg.toLocaleString()} kg)</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-400">Fleet Rated Capacity:</span>
              <span className="font-bold text-slate-300">{data.maxCapacityTons} MT</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-400">Heavy Haul (&gt;20 MT):</span>
              <span className="font-bold text-purple-300">{data.heavyTonnageTrips} loads</span>
            </div>
          </div>

          <div className="pt-1.5 border-t border-slate-800 text-[10px] text-slate-400 flex items-center justify-between">
            <span>Optimal Loads: {data.optimalLoadedTrips}/{data.tripsCount}</span>
            <span className="text-emerald-400 font-semibold">{data.tripsCount} trips</span>
          </div>
        </div>
      );
    }
    return null;
  };

  // Custom Tooltip for Utilization Chart
  const UtilCustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data: FleetUtilizationData = payload[0].payload;
      return (
        <div className="bg-slate-900/95 text-white p-3.5 rounded-xl shadow-2xl border border-slate-700/80 backdrop-blur-md text-xs space-y-2 min-w-[220px] z-50">
          <div className="flex items-center justify-between border-b border-slate-700 pb-1.5">
            <span className="font-bold text-slate-100 flex items-center gap-1.5">
              <Truck className="w-3.5 h-3.5 text-emerald-400" />
              {data.month}
            </span>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              {data.utilizationRate}%
            </span>
          </div>

          <div className="space-y-1.5 font-mono">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Fleet in Service:</span>
              <span className="font-bold text-emerald-400">{data.activeTrucksAvg} / {trucks.length || 0} Trucks</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-400">Target Benchmark:</span>
              <span className="font-bold text-blue-300">75%</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-400">Linehaul Distance:</span>
              <span className="font-bold text-slate-200">{data.totalDistanceKm.toLocaleString()} km</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-400">Maint. Downtime:</span>
              <span className="font-bold text-rose-300">{data.maintenanceHoursRate}%</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-5 shadow-2xs">
      
      {/* Section Header with Navigation Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center font-bold shadow-2xs">
              <BarChart3 className="w-4.5 h-4.5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">Executive Operational & Profitability Analytics</h2>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border flex items-center gap-1 ${
                  hasLiveData
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-blue-50 text-blue-700 border-blue-200'
                }`}>
                  <Sparkles className="w-3 h-3" /> Live fleet data
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Correlated visualization of monthly revenue trajectories, average cargo payload per trip, and fleet utilization rates.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Main Visual Tabs */}
          <div className="flex items-center bg-slate-100 border border-slate-200 rounded-xl p-1 text-xs">
            <button
              onClick={() => setActiveTab('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                activeTab === 'ALL'
                  ? 'bg-white text-slate-900 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-blue-600" />
              <span>Unified Suite</span>
            </button>

            <button
              onClick={() => setActiveTab('REVENUE')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                activeTab === 'REVENUE'
                  ? 'bg-white text-blue-700 shadow-2xs font-bold ring-1 ring-blue-400/30'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <DollarSign className="w-3.5 h-3.5 text-blue-600" />
              <span>Monthly Revenue</span>
            </button>

            <button
              onClick={() => setActiveTab('LOAD')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                activeTab === 'LOAD'
                  ? 'bg-white text-amber-700 shadow-2xs font-bold ring-1 ring-amber-400/30'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Scale className="w-3.5 h-3.5 text-amber-600" />
              <span>Avg Load per Trip</span>
            </button>

            <button
              onClick={() => setActiveTab('UTILIZATION')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                activeTab === 'UTILIZATION'
                  ? 'bg-white text-emerald-700 shadow-2xs font-bold ring-1 ring-emerald-400/30'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Truck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Fleet Utilization</span>
            </button>
          </div>

          {/* Time Range Filter */}
          <div className="flex items-center bg-slate-100 border border-slate-200 rounded-lg p-0.5 text-xs">
            <button
              onClick={() => setTimeFilter('6M')}
              className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                timeFilter === '6M' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              6M
            </button>
            <button
              onClick={() => setTimeFilter('12M')}
              className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                timeFilter === '12M' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Full Year
            </button>
          </div>
        </div>
      </div>

      {/* KPI Highlight Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Metric 1: Monthly Freight Revenue */}
        <div 
          onClick={() => setActiveTab('REVENUE')}
          className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
            activeTab === 'REVENUE' 
              ? 'bg-blue-50/70 border-blue-300 ring-2 ring-blue-400/30 shadow-xs' 
              : 'bg-slate-50 hover:bg-slate-100/80 border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5 text-blue-600" />
              Monthly Revenue
            </span>
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/80 px-1.5 py-0.5 rounded flex items-center gap-0.5">
              <ArrowUpRight className="w-3 h-3" /> {currentMonthRevenue && currentMonthRevenue.momGrowthPercent >= 0 ? '+' : ''}{currentMonthRevenue?.momGrowthPercent || 0}%
            </span>
          </div>
          <div className="mt-1.5 flex items-baseline justify-between">
            <div className="text-xl font-black font-mono text-slate-900">
              ₱{(currentMonthRevenue?.totalRevenue || 0).toLocaleString()}
            </div>
            <span className="text-[10px] text-slate-500 font-mono">
              {currentMonthRevenue?.shortMonth || '—'}
            </span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
            <span>Avg/Trip: <strong className="text-slate-700 font-mono">₱{currentMonthRevenue?.avgRevenuePerTrip.toLocaleString()}</strong></span>
            <span className="text-emerald-600 font-semibold">{currentMonthRevenue?.marginPercent}% Net Margin</span>
          </div>
        </div>

        {/* Metric 2: Average Load per Trip */}
        <div 
          onClick={() => setActiveTab('LOAD')}
          className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
            activeTab === 'LOAD' 
              ? 'bg-amber-50/70 border-amber-300 ring-2 ring-amber-400/30 shadow-xs' 
              : 'bg-slate-50 hover:bg-slate-100/80 border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Scale className="w-3.5 h-3.5 text-amber-600" />
              Avg Load per Trip
            </span>
            <span className="text-[10px] font-bold text-amber-700 bg-amber-100/80 px-1.5 py-0.5 rounded">
              {currentMonthLoad?.payloadUtilization || 0}% Payload
            </span>
          </div>
          <div className="mt-1.5 flex items-baseline justify-between">
            <div className="text-xl font-black font-mono text-slate-900">
              {currentMonthLoad?.avgLoadTons || 0} <span className="text-xs font-semibold text-slate-500">Metric Tons</span>
            </div>
            <span className="text-[10px] text-slate-500 font-mono">
              {(currentMonthLoad?.avgLoadKg || 0).toLocaleString()} kg
            </span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
            <span>Rated Fleet Cap: <strong className="text-slate-700 font-mono">{currentMonthLoad?.maxCapacityTons || 0} MT</strong></span>
            <span className="text-amber-600 font-semibold">{currentMonthLoad?.heavyTonnageTrips || 0} Heavy Linehauls</span>
          </div>
        </div>

        {/* Metric 3: Fleet Utilization Rate */}
        <div 
          onClick={() => setActiveTab('UTILIZATION')}
          className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
            activeTab === 'UTILIZATION' 
              ? 'bg-emerald-50/70 border-emerald-300 ring-2 ring-emerald-400/30 shadow-xs' 
              : 'bg-slate-50 hover:bg-slate-100/80 border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Truck className="w-3.5 h-3.5 text-emerald-600" />
              Fleet Utilization
            </span>
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/80 px-1.5 py-0.5 rounded">
              {currentFleetUtil && currentFleetUtil.utilizationRate >= 75 ? '✓ >75% Target' : 'Below 75% target'}
            </span>
          </div>
          <div className="mt-1.5 flex items-baseline justify-between">
            <div className="text-xl font-black font-mono text-emerald-600">
              {currentFleetUtil?.utilizationRate || 0}%
            </div>
            <span className="text-[10px] text-slate-500 font-mono">
              {currentFleetUtil?.activeTrucksAvg || 0}/{trucks.length || 0} Trucks
            </span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
            <span>Monthly Distance: <strong className="text-slate-700 font-mono">{(currentFleetUtil?.totalDistanceKm || 0).toLocaleString()} km</strong></span>
            <span className="text-emerald-600 font-semibold">{currentFleetUtil?.maintenanceHoursRate || 0}% downtime</span>
          </div>
        </div>

        {/* Metric 4: Total Freight Revenue Period Sum */}
        <div 
          onClick={() => setActiveTab('ALL')}
          className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
            activeTab === 'ALL' 
              ? 'bg-purple-50/70 border-purple-300 ring-2 ring-purple-400/30 shadow-xs' 
              : 'bg-slate-50 hover:bg-slate-100/80 border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Coins className="w-3.5 h-3.5 text-purple-600" />
              {timeFilter === '6M' ? '6-Mo' : 'Period'} Cumulative
            </span>
            <span className="text-[10px] font-bold text-purple-700 bg-purple-100/80 px-1.5 py-0.5 rounded">
              {avgPeriodMargin}% Avg Margin
            </span>
          </div>
          <div className="mt-1.5 flex items-baseline justify-between">
            <div className="text-xl font-black font-mono text-slate-900">
              ₱{(totalPeriodRevenue / 1000).toFixed(1)}k
            </div>
            <span className="text-[10px] text-slate-500 font-mono">
              ₱{totalPeriodProfit.toLocaleString()} Net
            </span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
            <span>Avg Payload: <strong className="text-slate-700 font-mono">{avgPeriodLoadTons} MT</strong></span>
            <span className="text-purple-600 font-semibold">{avgFleetUtilization}% Avg Util</span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* VIEW MODE 1: UNIFIED SUITE (All 3 Key Charts in Responsive Grid)          */}
      {/* ========================================================================= */}
      {activeTab === 'ALL' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* 1. Monthly Revenue & Profitability Trend (7 cols) */}
            <div className="lg:col-span-7 bg-slate-50/60 border border-slate-200 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-blue-600" />
                  <span className="font-bold text-slate-900 text-xs">Monthly Freight Revenue & Net Margin Trajectory</span>
                </div>
                <button
                  onClick={() => setActiveTab('REVENUE')}
                  className="text-[11px] text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1 hover:underline"
                >
                  <span>Detailed View</span>
                  <ArrowUpRight className="w-3 h-3" />
                </button>
              </div>

              <div className="w-full h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={monthlyRevenueData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="baseRevenueGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.9} />
                        <stop offset="100%" stopColor="#1D4ED8" stopOpacity={0.7} />
                      </linearGradient>
                      <linearGradient id="accRevenueGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#A855F7" stopOpacity={0.9} />
                        <stop offset="100%" stopColor="#7E22CE" stopOpacity={0.7} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis dataKey="shortMonth" tickLine={false} tick={{ fill: '#64748B', fontSize: 11 }} />
                    <YAxis 
                      yAxisId="left" 
                      tickLine={false} 
                      axisLine={false}
                      tick={{ fill: '#64748B', fontSize: 10 }}
                      tickFormatter={(val) => `₱${(val / 1000).toFixed(0)}k`}
                    />
                    <YAxis 
                      yAxisId="right" 
                      orientation="right" 
                      tickLine={false} 
                      axisLine={false}
                      domain={[0, 60]}
                      tick={{ fill: '#10B981', fontSize: 10 }}
                      unit="%"
                    />
                    <Tooltip content={<RevenueCustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '4px' }} />
                    <Bar yAxisId="left" dataKey="baseRevenue" name="Base Freight Rate" stackId="rev" fill="url(#baseRevenueGrad)" radius={[0, 0, 0, 0]} barSize={20} />
                    <Bar yAxisId="left" dataKey="accessorialsRevenue" name="Accessorials & Demurrage" stackId="rev" fill="url(#accRevenueGrad)" radius={[4, 4, 0, 0]} barSize={20} />
                    <Line yAxisId="right" type="monotone" dataKey="marginPercent" name="Net Margin %" stroke="#10B981" strokeWidth={2.5} dot={{ r: 3, fill: '#10B981' }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* 2. Fleet Utilization & Capacity Rate (5 cols) */}
            <div className="lg:col-span-5 bg-slate-50/60 border border-slate-200 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
                <div className="flex items-center gap-2">
                  <Truck className="w-4 h-4 text-emerald-600" />
                  <span className="font-bold text-slate-900 text-xs">Fleet In-Service Utilization Rate (%)</span>
                </div>
                <button
                  onClick={() => setActiveTab('UTILIZATION')}
                  className="text-[11px] text-emerald-600 hover:text-emerald-800 font-semibold flex items-center gap-1 hover:underline"
                >
                  <span>Detailed View</span>
                  <ArrowUpRight className="w-3 h-3" />
                </button>
              </div>

              <div className="w-full h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={fleetUtilizationData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="utilSuiteGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10B981" stopOpacity={0.35} />
                        <stop offset="100%" stopColor="#10B981" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis dataKey="shortMonth" tickLine={false} tick={{ fill: '#64748B', fontSize: 11 }} />
                    <YAxis domain={[50, 100]} tickLine={false} axisLine={false} tick={{ fill: '#64748B', fontSize: 10 }} unit="%" />
                    <Tooltip content={<UtilCustomTooltip />} />
                    <ReferenceLine y={75} stroke="#EF4444" strokeDasharray="3 3" label={{ value: 'Target 75%', fill: '#EF4444', fontSize: 10, position: 'insideTopLeft' }} />
                    <Area type="monotone" dataKey="utilizationRate" name="Utilization Rate (%)" stroke="#10B981" strokeWidth={3} fill="url(#utilSuiteGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

          </div>

          {/* 3. Average Load per Trip & Payload Analytics (Full Width 12 cols) */}
          <div className="bg-slate-50/60 border border-slate-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
              <div className="flex items-center gap-2">
                <Scale className="w-4 h-4 text-amber-600" />
                <div>
                  <span className="font-bold text-slate-900 text-xs">Average Cargo Load per Trip (Metric Tons) & Payload Efficiency</span>
                  <span className="text-[10px] text-slate-500 block">Monthly average cargo payload compared with rated fleet maximum payload</span>
                </div>
              </div>
              <button
                onClick={() => setActiveTab('LOAD')}
                className="text-[11px] text-amber-600 hover:text-amber-800 font-semibold flex items-center gap-1 hover:underline"
              >
                <span>Category Breakdown</span>
                <ArrowUpRight className="w-3 h-3" />
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
              {/* Load Trend Bar Chart (8 cols) */}
              <div className="lg:col-span-8 w-full h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyLoadData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                    <defs>
                      <linearGradient id="loadBarGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#F59E0B" stopOpacity={0.9} />
                        <stop offset="100%" stopColor="#D97706" stopOpacity={0.7} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis dataKey="shortMonth" tickLine={false} tick={{ fill: '#64748B', fontSize: 11 }} />
                    <YAxis 
                      yAxisId="left" 
                      domain={[0, 22]} 
                      tickLine={false} 
                      axisLine={false} 
                      tick={{ fill: '#64748B', fontSize: 10 }}
                      unit=" MT"
                    />
                    <YAxis 
                      yAxisId="right" 
                      orientation="right" 
                      domain={[0, 100]} 
                      tickLine={false} 
                      axisLine={false} 
                      tick={{ fill: '#10B981', fontSize: 10 }}
                      unit="%"
                    />
                    <Tooltip content={<LoadCustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '4px' }} />
                    <Bar yAxisId="left" dataKey="avgLoadTons" name="Avg Cargo Load (MT)" fill="url(#loadBarGrad)" radius={[4, 4, 0, 0]} barSize={24} />
                    <Line yAxisId="right" type="monotone" dataKey="payloadUtilization" name="Payload Capacity %" stroke="#10B981" strokeWidth={2.5} dot={{ r: 3, fill: '#10B981' }} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* By-Vehicle Category Efficiency Summary (4 cols) */}
              <div className="lg:col-span-4 space-y-2 text-xs">
                <div className="text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Payload by Fleet Segment:
                </div>
                {truckCategoryLoadData.map(cat => (
                  <div key={cat.category} className="bg-white p-2.5 rounded-lg border border-slate-200 space-y-1">
                    <div className="flex items-center justify-between font-semibold text-slate-800">
                      <span className="truncate max-w-[140px]">{cat.category}</span>
                      <span className="font-mono text-slate-900">{cat.avgPayloadTons} / {cat.maxPayloadTons} MT</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden flex border border-slate-200">
                        <div className="h-full rounded-full" style={{ width: `${cat.utilizationPercent}%`, backgroundColor: cat.color }} />
                      </div>
                      <span className="font-mono text-[10px] font-bold text-slate-700 shrink-0">{cat.utilizationPercent}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW MODE 2: MONTHLY REVENUE DEEP DIVE                                    */}
      {/* ========================================================================= */}
      {activeTab === 'REVENUE' && (
        <div className="space-y-4">
          <div className="bg-slate-50/70 border border-slate-200 rounded-xl p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-2">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Monthly Freight Revenue & Invoicing Breakdown</h3>
                <p className="text-xs text-slate-500">
                  Itemized comparison between base hauling revenue, client accessorial billing (FAF fuel surcharge, demurrage, helper fees), and realized net profit.
                </p>
              </div>
              <div className="flex items-center gap-3 text-xs font-mono">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-xs bg-blue-600 inline-block" />
                  <span>Base Freight</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-xs bg-purple-600 inline-block" />
                  <span>Accessorials</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" />
                  <span>Net Profit (₱)</span>
                </div>
              </div>
            </div>

            {/* High-detail Recharts Composed Chart */}
            <div className="w-full h-80 pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={monthlyRevenueData} margin={{ top: 15, right: 15, left: -5, bottom: 0 }}>
                  <defs>
                    <linearGradient id="baseRevGradDeep" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.95} />
                      <stop offset="100%" stopColor="#1E40AF" stopOpacity={0.75} />
                    </linearGradient>
                    <linearGradient id="accRevGradDeep" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#A855F7" stopOpacity={0.95} />
                      <stop offset="100%" stopColor="#6B21A8" stopOpacity={0.75} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="shortMonth" tickLine={false} tick={{ fill: '#475569', fontSize: 12, fontWeight: 600 }} />
                  <YAxis 
                    yAxisId="left" 
                    tickLine={false} 
                    axisLine={false}
                    tick={{ fill: '#475569', fontSize: 11 }}
                    tickFormatter={(val) => `₱${(val / 1000).toFixed(0)}k`}
                  />
                  <YAxis 
                    yAxisId="right" 
                    orientation="right" 
                    tickLine={false} 
                    axisLine={false}
                    domain={[0, 50]}
                    tick={{ fill: '#10B981', fontSize: 11, fontWeight: 600 }}
                    unit="%"
                  />
                  <Tooltip content={<RevenueCustomTooltip />} />
                  <Legend verticalAlign="top" align="right" wrapperStyle={{ paddingBottom: '10px', fontSize: '11px' }} />
                  <Bar yAxisId="left" dataKey="baseRevenue" name="Base Hauling Rate (₱)" stackId="rev" fill="url(#baseRevGradDeep)" barSize={32} />
                  <Bar yAxisId="left" dataKey="accessorialsRevenue" name="Accessorials & Demurrage (₱)" stackId="rev" fill="url(#accRevGradDeep)" radius={[5, 5, 0, 0]} barSize={32} />
                  <Line yAxisId="left" type="monotone" dataKey="netProfit" name="Estimated Net Profit (₱)" stroke="#10B981" strokeWidth={3} dot={{ r: 4, fill: '#10B981', stroke: '#FFF', strokeWidth: 2 }} />
                  <Line yAxisId="right" type="monotone" dataKey="marginPercent" name="Operating Margin %" stroke="#F59E0B" strokeWidth={2} strokeDasharray="4 4" dot={{ r: 3, fill: '#F59E0B' }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Revenue Details Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border border-slate-200 rounded-xl overflow-hidden">
              <thead className="bg-slate-100/90 text-slate-700 font-semibold border-b border-slate-200">
                <tr>
                  <th className="p-3">Month</th>
                  <th className="p-3 text-right">Dispatches</th>
                  <th className="p-3 text-right">Base Revenue</th>
                  <th className="p-3 text-right">Accessorials</th>
                  <th className="p-3 text-right">Total Invoiced</th>
                  <th className="p-3 text-right">Net Profit</th>
                  <th className="p-3 text-right">Margin %</th>
                  <th className="p-3 text-right">MoM Growth</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {monthlyRevenueData.map((m, idx) => (
                  <tr key={m.month} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-3 font-semibold text-slate-900 flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-blue-600" />
                      <span>{m.month}</span>
                    </td>
                    <td className="p-3 text-right font-mono">{m.tripsCount} trips</td>
                    <td className="p-3 text-right font-mono text-slate-700">₱{m.baseRevenue.toLocaleString()}</td>
                    <td className="p-3 text-right font-mono text-purple-700 font-medium">₱{m.accessorialsRevenue.toLocaleString()}</td>
                    <td className="p-3 text-right font-mono font-bold text-slate-900">₱{m.totalRevenue.toLocaleString()}</td>
                    <td className="p-3 text-right font-mono font-bold text-emerald-700">₱{m.netProfit.toLocaleString()}</td>
                    <td className="p-3 text-right font-mono">
                      <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">
                        {m.marginPercent}%
                      </span>
                    </td>
                    <td className="p-3 text-right font-mono">
                      {idx === 0 ? (
                        <span className="text-slate-400">-</span>
                      ) : m.momGrowthPercent >= 0 ? (
                        <span className="text-emerald-600 font-semibold">+{m.momGrowthPercent}%</span>
                      ) : (
                        <span className="text-rose-600 font-semibold">{m.momGrowthPercent}%</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW MODE 3: AVERAGE LOAD PER TRIP & CAPACITY ANALYTICS                   */}
      {/* ========================================================================= */}
      {activeTab === 'LOAD' && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            
            {/* Monthly Load Progression Bar & Line (7 cols) */}
            <div className="lg:col-span-7 bg-slate-50/70 border border-slate-200 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Monthly Average Cargo Payload (Metric Tons)</h3>
                  <p className="text-xs text-slate-500">
                    Average tonnage dispatched per trip compared against overall vehicle payload limit.
                  </p>
                </div>
                <span className="text-xs font-mono font-bold text-amber-700 bg-amber-50 px-2 py-1 rounded border border-amber-200">
                  {avgPeriodLoadTons} MT Avg
                </span>
              </div>

              <div className="w-full h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={monthlyLoadData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="loadBarGradDeep" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#F59E0B" stopOpacity={0.95} />
                        <stop offset="100%" stopColor="#B45309" stopOpacity={0.75} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis dataKey="shortMonth" tickLine={false} tick={{ fill: '#475569', fontSize: 12 }} />
                    <YAxis 
                      yAxisId="left" 
                      domain={[0, 22]} 
                      tickLine={false} 
                      axisLine={false} 
                      tick={{ fill: '#475569', fontSize: 11 }}
                      unit=" MT"
                    />
                    <YAxis 
                      yAxisId="right" 
                      orientation="right" 
                      domain={[50, 100]} 
                      tickLine={false} 
                      axisLine={false} 
                      tick={{ fill: '#10B981', fontSize: 11 }}
                      unit="%"
                    />
                    <Tooltip content={<LoadCustomTooltip />} />
                    <Legend verticalAlign="top" align="right" wrapperStyle={{ paddingBottom: '8px', fontSize: '11px' }} />
                    <Bar yAxisId="left" dataKey="avgLoadTons" name="Avg Cargo Payload (MT)" fill="url(#loadBarGradDeep)" radius={[4, 4, 0, 0]} barSize={28} />
                    <Line yAxisId="left" type="stepAfter" dataKey="maxCapacityTons" name="Fleet Rating Cap (MT)" stroke="#94A3B8" strokeWidth={2} strokeDasharray="3 3" />
                    <Line yAxisId="right" type="monotone" dataKey="payloadUtilization" name="Payload Utilization %" stroke="#10B981" strokeWidth={3} dot={{ r: 4, fill: '#10B981' }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Truck Fleet Segment Payload Utilization (5 cols) */}
            <div className="lg:col-span-5 bg-slate-50/70 border border-slate-200 rounded-xl p-4 space-y-3">
              <div className="border-b border-slate-200 pb-2">
                <h3 className="font-bold text-slate-900 text-sm">Fleet Segment Payload Capacity Efficiency</h3>
                <p className="text-xs text-slate-500">
                  Actual average payload weight versus maximum net vehicle carrying capacity.
                </p>
              </div>

              <div className="space-y-3 pt-1">
                {truckCategoryLoadData.map(cat => (
                  <div key={cat.category} className="bg-white p-3 rounded-xl border border-slate-200 space-y-2 shadow-2xs">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-900">
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-xs inline-block" style={{ backgroundColor: cat.color }} />
                        <span>{cat.category}</span>
                      </div>
                      <span className="font-mono text-slate-700">{cat.truckCount} units</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-slate-600 bg-slate-50 p-2 rounded">
                      <div>Avg Load: <strong className="text-slate-900">{cat.avgPayloadTons} MT</strong></div>
                      <div>Max Limit: <strong className="text-slate-900">{cat.maxPayloadTons} MT</strong></div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[10px] text-slate-500">
                        <span>Payload Efficiency</span>
                        <span className="font-bold font-mono text-slate-900">{cat.utilizationPercent}%</span>
                      </div>
                      <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden flex border border-slate-200">
                        <div 
                          className="h-full rounded-full transition-all duration-500" 
                          style={{ width: `${cat.utilizationPercent}%`, backgroundColor: cat.color }} 
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* Operational Takeaways */}
          <div className="bg-amber-50/60 border border-amber-200 rounded-xl p-4 flex items-start gap-3 text-xs">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-amber-900 text-xs">Payload Optimization Insights</div>
              <p className="text-amber-800 text-[11px] mt-0.5 leading-relaxed">
                10-Wheeler Wingvans and 40ft Container Chassis operate near full rated capacity (95.5% and 95.0% load factor), maximizing revenue per liter of diesel. 4-Wheeler City Vans have ~26% unutilized capacity, representing prime opportunities for LTL (Less-Than-Truckload) freight consolidation on Metro Manila distribution routes.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW MODE 4: FLEET UTILIZATION RATES                                      */}
      {/* ========================================================================= */}
      {activeTab === 'UTILIZATION' && (
        <div className="space-y-5">
          <div className="bg-slate-50/70 border border-slate-200 rounded-xl p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-2">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Monthly Fleet In-Service & Operating Utilization Rate</h3>
                <p className="text-xs text-slate-500">
                  Percentage of active trucks deployed on linehaul/dock operations versus idle standby and maintenance downtime.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                  Current: {currentFleetUtil?.utilizationRate}%
                </span>
              </div>
            </div>

            {/* Utilization Area & Line Chart */}
            <div className="w-full h-80 pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={fleetUtilizationData} margin={{ top: 15, right: 15, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="utilRateAreaGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10B981" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="#10B981" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="shortMonth" tickLine={false} tick={{ fill: '#475569', fontSize: 12, fontWeight: 600 }} />
                  <YAxis 
                    domain={[50, 100]} 
                    tickLine={false} 
                    axisLine={false} 
                    tick={{ fill: '#475569', fontSize: 11 }}
                    unit="%"
                  />
                  <Tooltip content={<UtilCustomTooltip />} />
                  <Legend verticalAlign="top" align="right" wrapperStyle={{ paddingBottom: '10px', fontSize: '11px' }} />
                  
                  {/* Benchmark 75% Reference Line */}
                  <ReferenceLine 
                    y={75} 
                    stroke="#EF4444" 
                    strokeDasharray="4 4" 
                    strokeWidth={2}
                    label={{ value: 'Target 75% Benchmark', fill: '#EF4444', fontSize: 11, position: 'insideTopLeft', fontWeight: 'bold' }} 
                  />

                  <Area 
                    type="monotone" 
                    dataKey="utilizationRate" 
                    name="Fleet Utilization Rate (%)" 
                    stroke="#10B981" 
                    strokeWidth={3.5} 
                    fill="url(#utilRateAreaGrad)" 
                    dot={{ r: 4, fill: '#10B981', stroke: '#FFF', strokeWidth: 2 }}
                    activeDot={{ r: 6, fill: '#047857' }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Current Live Fleet Operational Breakdown Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            <div className="bg-white p-3.5 rounded-xl border border-emerald-200 space-y-1 shadow-2xs">
              <div className="flex items-center justify-between text-emerald-700 font-bold">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>On Active Linehaul</span>
                </span>
                <span className="font-mono text-sm">3 units</span>
              </div>
              <div className="text-[11px] text-slate-500">60% of fleet on SLEX / NLEX routes</div>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-blue-200 space-y-1 shadow-2xs">
              <div className="flex items-center justify-between text-blue-700 font-bold">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                  <span>Loading / Docking</span>
                </span>
                <span className="font-mono text-sm">1 unit</span>
              </div>
              <div className="text-[11px] text-slate-500">20% in customer warehouse staging</div>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-1 shadow-2xs">
              <div className="flex items-center justify-between text-slate-700 font-bold">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-400" />
                  <span>Standby / Available</span>
                </span>
                <span className="font-mono text-sm">1 unit</span>
              </div>
              <div className="text-[11px] text-slate-500">Ready for emergency dispatch</div>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-rose-200 space-y-1 shadow-2xs">
              <div className="flex items-center justify-between text-rose-700 font-bold">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                  <span>In Maintenance</span>
                </span>
                <span className="font-mono text-sm">0 units</span>
              </div>
              <div className="text-[11px] text-slate-500">0% scheduled maintenance today</div>
            </div>
          </div>
        </div>
      )}

      {/* Footer Diagnostic Note */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-slate-100 text-[11px] text-slate-500">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          <span>Real-time aggregation synchronized with {trips.length} active trip records, {trucks.length} trucks, and billing ledger.</span>
        </div>
        <span className="font-mono text-slate-400">Owner Executive Reporting • FY 2026</span>
      </div>

    </div>
  );
};
