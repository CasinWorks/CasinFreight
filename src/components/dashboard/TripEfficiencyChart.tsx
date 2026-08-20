import React, { useState, useMemo } from 'react';
import { 
  BarChart, 
  Bar, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  ComposedChart,
  Area
} from 'recharts';
import { 
  TrendingUp, 
  Truck, 
  Calendar, 
  Activity, 
  Zap, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  HelpCircle
} from 'lucide-react';
import { Trip, Truck as TruckType } from '../../types';

interface TripEfficiencyChartProps {
  trips: Trip[];
  trucks: TruckType[];
}

interface DailyMetrics {
  dayLabel: string;
  fullDate: string;
  tripVolume: number;
  completedTrips: number;
  activeTrucks: number;
  totalFleet: number;
  utilizationRate: number; // percentage 0 - 100
  onTimeDeliveries: number;
  onTimeRate: number;
  totalTonnage: number;
}

export const TripEfficiencyChart: React.FC<TripEfficiencyChartProps> = ({ trips, trucks }) => {
  const [viewMetric, setViewMetric] = useState<'both' | 'volume' | 'utilization'>('both');
  const [daysSpan, setDaysSpan] = useState<7 | 14 | 30>(7);

  // Generate continuous timeline data for the past N days up to today
  const chartData = useMemo<DailyMetrics[]>(() => {
    const totalFleetCount = trucks.length;
    const data: DailyMetrics[] = [];
    const today = new Date();

    for (let i = daysSpan - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateString = d.toISOString().split('T')[0];
      
      const dayLabel = d.toLocaleDateString('en-US', { 
        weekday: daysSpan > 14 ? undefined : 'short', 
        month: 'numeric', 
        day: 'numeric' 
      });

      const matchedTrips = trips.filter(t => {
        const tripDate = (t.scheduledPickup || t.createdAt || '').split('T')[0];
        return tripDate === dateString;
      });

      const volume = matchedTrips.length;
      const activeTrucksSet = new Set<string>(matchedTrips.map(t => t.truckId).filter(Boolean));
      const completedCount = matchedTrips.filter(t => t.status === 'Delivered' || t.status === 'Invoiced').length;
      const activeTrucks = totalFleetCount > 0 ? Math.min(activeTrucksSet.size, totalFleetCount) : 0;
      const utilizationRate = totalFleetCount > 0 ? Math.min(100, Math.round((activeTrucks / totalFleetCount) * 100)) : 0;
      const onTimeDeliveries = matchedTrips.filter(t =>
        (t.status === 'Delivered' || t.status === 'Invoiced') && t.demurrageHours === 0
      ).length;
      const onTimeRate = completedCount > 0 ? Math.round((onTimeDeliveries / completedCount) * 100) : 0;
      const totalTonnage = matchedTrips.reduce((acc, t) => acc + (t.cargoWeightKg || 0), 0) / 1000;

      data.push({
        dayLabel,
        fullDate: dateString,
        tripVolume: volume,
        completedTrips: completedCount,
        activeTrucks,
        totalFleet: totalFleetCount,
        utilizationRate,
        onTimeDeliveries,
        onTimeRate,
        totalTonnage: Math.round(totalTonnage * 10) / 10
      });
    }

    return data;
  }, [trips, trucks, daysSpan]);

  // Aggregate stats across the displayed range
  const averageUtilization = useMemo(() => {
    if (chartData.length === 0) return 0;
    const sum = chartData.reduce((acc, curr) => acc + curr.utilizationRate, 0);
    return Math.round(sum / chartData.length);
  }, [chartData]);

  const totalTripsInRange = useMemo(() => {
    return chartData.reduce((acc, curr) => acc + curr.tripVolume, 0);
  }, [chartData]);

  const peakUtilizationDay = useMemo(() => {
    if (chartData.length === 0) return null;
    return [...chartData].sort((a, b) => b.utilizationRate - a.utilizationRate)[0];
  }, [chartData]);

  // Custom rich Tooltip for Recharts
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data: DailyMetrics = payload[0].payload;
      return (
        <div className="bg-slate-900/95 text-white p-3.5 rounded-xl shadow-xl border border-slate-700/60 backdrop-blur-md text-xs space-y-2.5 min-w-[210px] z-50">
          <div className="flex items-center justify-between border-b border-slate-700 pb-2">
            <span className="font-bold text-slate-200 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-blue-400" />
              {data.fullDate} ({data.dayLabel})
            </span>
            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
              data.utilizationRate >= 80 ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
              data.utilizationRate >= 60 ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' :
              'bg-amber-500/20 text-amber-300 border border-amber-500/30'
            }`}>
              {data.utilizationRate}% Utilized
            </span>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-blue-500 inline-block"></span>
                Dispatched Trips:
              </span>
              <span className="font-bold text-white font-mono">{data.tripVolume} loads</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-400 flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block"></span>
                Active Trucks in Field:
              </span>
              <span className="font-bold text-emerald-400 font-mono">{data.activeTrucks} / {data.totalFleet} units</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-400 flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-purple-400 inline-block"></span>
                Tonnage Hauled:
              </span>
              <span className="font-bold text-purple-300 font-mono">{data.totalTonnage} MT</span>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-800 text-[10px] text-slate-400 flex items-center justify-between">
            <span>On-Time Dispatch Rate:</span>
            <span className="font-bold text-slate-200">{data.onTimeRate}%</span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-2xs">
      
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3.5">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Trip Efficiency & Fleet Utilization</h3>
              <p className="text-[11px] text-slate-500">
                Daily freight dispatch volume correlated with active truck unit capacity utilization rate (%).
              </p>
            </div>
          </div>
        </div>

        {/* Chart View Toggle & Range Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Metric Selector */}
          <div className="flex items-center bg-slate-100 border border-slate-200 rounded-lg p-0.5 text-xs">
            <button
              onClick={() => setViewMetric('both')}
              className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors ${
                viewMetric === 'both' ? 'bg-white text-blue-600 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Combined
            </button>
            <button
              onClick={() => setViewMetric('volume')}
              className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors ${
                viewMetric === 'volume' ? 'bg-white text-blue-600 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Trip Volume
            </button>
            <button
              onClick={() => setViewMetric('utilization')}
              className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors ${
                viewMetric === 'utilization' ? 'bg-white text-emerald-600 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Fleet %
            </button>
          </div>

          {/* Time Span */}
          <div className="flex items-center bg-slate-100 border border-slate-200 rounded-lg p-0.5 text-xs">
            <button
              onClick={() => setDaysSpan(7)}
              className={`px-2 py-1 rounded text-[11px] font-medium transition-colors ${
                daysSpan === 7 ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              7D
            </button>
            <button
              onClick={() => setDaysSpan(14)}
              className={`px-2 py-1 rounded text-[11px] font-medium transition-colors ${
                daysSpan === 14 ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              14D
            </button>
            <button
              onClick={() => setDaysSpan(30)}
              className={`px-2 py-1 rounded text-[11px] font-medium transition-colors ${
                daysSpan === 30 ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              30D
            </button>
          </div>
        </div>
      </div>

      {/* Mini KPI Pill Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
        <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-2.5">
          <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Avg Fleet Utilization</div>
          <div className="flex items-baseline gap-1.5 mt-0.5">
            <span className="text-lg font-black text-slate-900 font-mono">{averageUtilization}%</span>
            <span className={`text-[10px] font-semibold ${averageUtilization >= 75 ? 'text-emerald-600' : 'text-amber-600'}`}>
              {averageUtilization >= 75 ? '✓ On Target' : '⚠️ Below 75%'}
            </span>
          </div>
        </div>

        <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-2.5">
          <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Total Dispatches</div>
          <div className="flex items-baseline gap-1.5 mt-0.5">
            <span className="text-lg font-black text-blue-600 font-mono">{totalTripsInRange}</span>
            <span className="text-[10px] text-slate-500">loads in {daysSpan}d</span>
          </div>
        </div>

        <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-2.5">
          <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Peak Operating Day</div>
          <div className="flex items-baseline gap-1.5 mt-0.5">
            <span className="text-lg font-black text-purple-600 font-mono">{peakUtilizationDay?.utilizationRate || 0}%</span>
            <span className="text-[10px] text-slate-500 truncate max-w-[80px]">{peakUtilizationDay?.dayLabel}</span>
          </div>
        </div>

        <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-2.5">
          <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Active Fleet Count</div>
          <div className="flex items-baseline gap-1.5 mt-0.5">
            <span className="text-lg font-black text-slate-900 font-mono">{trucks.length}</span>
            <span className="text-[10px] text-slate-500">authorized trucks</span>
          </div>
        </div>
      </div>

      {/* Recharts Chart Container */}
      <div className="w-full h-72 sm:h-80 pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={chartData}
            margin={{ top: 10, right: 10, left: -15, bottom: 0 }}
          >
            <defs>
              {/* Gradient for Trip Volume Bar */}
              <linearGradient id="tripVolumeGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.9} />
                <stop offset="100%" stopColor="#2563EB" stopOpacity={0.65} />
              </linearGradient>

              {/* Gradient for Fleet Utilization Area */}
              <linearGradient id="utilizationAreaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10B981" stopOpacity={0.25} />
                <stop offset="100%" stopColor="#10B981" stopOpacity={0.0} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
            
            <XAxis 
              dataKey="dayLabel" 
              tickLine={false} 
              axisLine={{ stroke: '#CBD5E1' }}
              tick={{ fill: '#64748B', fontSize: 11, fontWeight: 500 }}
            />

            {/* Left Y Axis: Trip Volume (Count) */}
            <YAxis 
              yAxisId="left"
              orientation="left"
              allowDecimals={false}
              tickLine={false}
              axisLine={false}
              tick={{ fill: '#3B82F6', fontSize: 11, fontWeight: 600 }}
              domain={[0, (dataMax: number) => Math.max(8, dataMax + 2)]}
              unit=" loads"
              hide={viewMetric === 'utilization'}
            />

            {/* Right Y Axis: Fleet Utilization (Percentage) */}
            <YAxis 
              yAxisId="right"
              orientation="right"
              tickLine={false}
              axisLine={false}
              tick={{ fill: '#10B981', fontSize: 11, fontWeight: 600 }}
              domain={[0, 100]}
              unit="%"
              hide={viewMetric === 'volume'}
            />

            <Tooltip content={<CustomTooltip />} />

            <Legend 
              verticalAlign="top" 
              align="right"
              wrapperStyle={{ paddingBottom: '12px', fontSize: '11px', fontWeight: 600 }}
            />

            {/* Bar: Daily Dispatched Trips */}
            {(viewMetric === 'both' || viewMetric === 'volume') && (
              <Bar 
                yAxisId="left"
                dataKey="tripVolume" 
                name="Daily Trip Volume (Loads)" 
                fill="url(#tripVolumeGrad)" 
                radius={[4, 4, 0, 0]}
                barSize={daysSpan === 7 ? 28 : daysSpan === 14 ? 16 : 8}
              />
            )}

            {/* Area/Line: Fleet Utilization Rate (%) */}
            {(viewMetric === 'both' || viewMetric === 'utilization') && (
              <>
                <Area
                  yAxisId="right"
                  type="monotone"
                  dataKey="utilizationRate"
                  fill="url(#utilizationAreaGrad)"
                  stroke="none"
                />
                <Line 
                  yAxisId="right"
                  type="monotone" 
                  dataKey="utilizationRate" 
                  name="Fleet Utilization Rate (%)" 
                  stroke="#10B981" 
                  strokeWidth={3}
                  dot={{ r: daysSpan === 7 ? 4 : 3, fill: '#10B981', stroke: '#FFFFFF', strokeWidth: 2 }}
                  activeDot={{ r: 6, fill: '#059669', stroke: '#FFFFFF', strokeWidth: 2 }}
                />
              </>
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Chart Footer Guide */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-slate-100 text-[11px] text-slate-500">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-xs bg-blue-600 inline-block" />
            <span>Dispatched Loads</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
            <span>Truck Utilization (%)</span>
          </div>
        </div>
        <div className="flex items-center gap-1 text-slate-400">
          <HelpCircle className="w-3.5 h-3.5" />
          <span>Calculated against {trucks.length} registered fleet units on linehaul routes.</span>
        </div>
      </div>

    </div>
  );
};
