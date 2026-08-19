import React, { useState, useMemo } from 'react';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Fuel, 
  Coins, 
  Receipt, 
  Truck as TruckIcon, 
  Gauge, 
  AlertCircle, 
  CheckCircle2, 
  Plus, 
  Layers, 
  Info, 
  Sliders, 
  ArrowUpRight, 
  Sparkles,
  ExternalLink,
  ShieldCheck,
  CreditCard,
  Percent
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend, 
  PieChart, 
  Pie, 
  Cell, 
  AreaChart, 
  Area, 
  LineChart, 
  Line, 
  CartesianGrid 
} from 'recharts';
import { useFreight, getTargetKmPerLiter } from '../../context/FreightContext';
import { Trip, Truck, Driver, Client, FuelLog } from '../../types';

interface TripProfitabilityViewProps {
  trip: Trip;
  truck?: Truck;
  driver?: Driver;
  client?: Client;
  onOpenAddFuel: (tripId: string, truckId?: string) => void;
  onOpenEditFuel?: (log: FuelLog) => void;
}

// Estimated corridor roundtrip distances (km) for major Philippine freight routes
const getEstimatedCorridorKm = (origin: string, destination: string): number => {
  const routeKey = `${origin} -> ${destination}`.toLowerCase();
  if (routeKey.includes('manila') && routeKey.includes('laguna')) return 120;
  if (routeKey.includes('caloocan') && routeKey.includes('clark')) return 190;
  if (routeKey.includes('batangas') && routeKey.includes('cavite')) return 160;
  if (routeKey.includes('muntinlupa') && routeKey.includes('batangas')) return 180;
  if (routeKey.includes('pasig') && routeKey.includes('pampanga')) return 175;
  if (routeKey.includes('manila') && routeKey.includes('subic')) return 270;
  return 150; // default estimated roundtrip
};

const PIE_COLORS = ['#10b981', '#f59e0b', '#3b82f6', '#8b5cf6', '#64748b'];

export const TripProfitabilityView: React.FC<TripProfitabilityViewProps> = ({
  trip,
  truck,
  driver,
  client,
  onOpenAddFuel,
  onOpenEditFuel
}) => {
  const { fuelLogs, canLogFuel } = useFreight();

  // Interactive diesel price shock simulation slider
  const [simulatedDieselPrice, setSimulatedDieselPrice] = useState<number>(58.40);
  const [activeChartTab, setActiveChartTab] = useState<'REVENUE_VS_COST' | 'PROFIT_DISTRIBUTION' | 'DIESEL_SENSITIVITY'>('REVENUE_VS_COST');

  // Query actual fuel logs tied directly to this trip
  const tripFuelLogs = useMemo(() => {
    return fuelLogs.filter(f => f.tripId === trip.id);
  }, [fuelLogs, trip.id]);

  // Actual Fuel Aggregates
  const actualFuelCost = tripFuelLogs.reduce((sum, l) => sum + l.costPhp, 0);
  const actualFuelLiters = tripFuelLogs.reduce((sum, l) => sum + l.liters, 0);
  const hasActualFuelLogs = tripFuelLogs.length > 0;

  // Estimated Route Distance & Fuel Projections
  const estimatedRoundtripKm = getEstimatedCorridorKm(trip.originZone, trip.destinationZone);
  const targetKmPerLiter = truck ? getTargetKmPerLiter(truck.type) : 3.5;
  const projectedLiters = Number((estimatedRoundtripKm / targetKmPerLiter).toFixed(1));
  const projectedFuelCost = Number((projectedLiters * simulatedDieselPrice).toFixed(2));

  // Effective Fuel Cost for this Trip (Actual if logged, else Projected)
  const effectiveFuelCost = hasActualFuelLogs ? actualFuelCost : projectedFuelCost;
  const effectiveFuelLiters = hasActualFuelLogs ? actualFuelLiters : projectedLiters;

  // Revenue Breakdown
  const baseRate = trip.baseRatePhp;
  const fuelSurchargeAcc = trip.accessorials
    .filter(a => a.approved && a.type === 'fuel_surcharge')
    .reduce((sum, a) => sum + a.amountPhp, 0);
  
  const demurrageAcc = trip.accessorials
    .filter(a => a.approved && a.type === 'demurrage')
    .reduce((sum, a) => sum + a.amountPhp, 0);

  const tollReimbursementAcc = trip.accessorials
    .filter(a => a.approved && a.type === 'toll_reimbursement')
    .reduce((sum, a) => sum + a.amountPhp, 0);

  const otherAccessorials = trip.accessorials
    .filter(a => a.approved && !['fuel_surcharge', 'demurrage', 'toll_reimbursement'].includes(a.type))
    .reduce((sum, a) => sum + a.amountPhp, 0);

  const grossFreightRevenue = baseRate + fuelSurchargeAcc + demurrageAcc + tollReimbursementAcc + otherAccessorials;

  // Operating Direct Costs (COGS)
  const tollExpense = tollReimbursementAcc > 0 ? tollReimbursementAcc : trip.tollEstimatePhp;
  // Driver Trip Allowance & Commission (~14% of base freight)
  const driverPayEstimate = Math.round(baseRate * 0.14);
  // Sinking Fund & Maintenance Reserve (~4% of base freight or ~₱2.5/km)
  const maintenanceReserve = Math.round(Math.max(baseRate * 0.04, estimatedRoundtripKm * 2.5));
  // Helper / Stevedore Direct Payouts if helper accessorial exists
  const helperCrewPayout = trip.accessorials
    .filter(a => a.approved && a.type === 'helper_crew')
    .reduce((sum, a) => sum + a.amountPhp * 0.85, 0); // 85% passed to crew

  const totalDirectCosts = effectiveFuelCost + tollExpense + driverPayEstimate + maintenanceReserve + helperCrewPayout;
  const netTripProfit = grossFreightRevenue - totalDirectCosts;
  const operatingProfitMargin = grossFreightRevenue > 0 
    ? Number(((netTripProfit / grossFreightRevenue) * 100).toFixed(1)) 
    : 0;

  const fuelExpenseRatio = grossFreightRevenue > 0 
    ? Number(((effectiveFuelCost / grossFreightRevenue) * 100).toFixed(1)) 
    : 0;

  const fuelSurchargeCoverageRatio = effectiveFuelCost > 0 
    ? Number(((fuelSurchargeAcc / effectiveFuelCost) * 100).toFixed(1)) 
    : 0;

  // Break-Even Diesel Price: How high can diesel go before Net Profit = 0?
  const breakEvenDieselPrice = effectiveFuelLiters > 0 
    ? Number((simulatedDieselPrice + (netTripProfit / effectiveFuelLiters)).toFixed(2)) 
    : 0;

  // Revenue & Cost Per KM Metrics
  const revenuePerKm = Number((grossFreightRevenue / estimatedRoundtripKm).toFixed(2));
  const costPerKm = Number((totalDirectCosts / estimatedRoundtripKm).toFixed(2));
  const profitPerKm = Number((netTripProfit / estimatedRoundtripKm).toFixed(2));

  // Data for Chart 1: Revenue vs Cost Breakdown (BarChart)
  const revenueCostBarData = [
    {
      category: 'Invoiced Revenue',
      'Base Freight': baseRate,
      'Fuel Surcharge (FAF)': fuelSurchargeAcc,
      'Demurrage & Accessorials': demurrageAcc + tollReimbursementAcc + otherAccessorials,
      total: grossFreightRevenue
    },
    {
      category: 'Operating Costs',
      'Fuel Expense': effectiveFuelCost,
      'Tollways': tollExpense,
      'Driver & Crew Pay': driverPayEstimate + helperCrewPayout,
      'Maintenance Reserve': maintenanceReserve,
      total: totalDirectCosts
    },
    {
      category: 'Net Profit Margin',
      'Net Operating Profit': Math.max(0, netTripProfit),
      total: netTripProfit
    }
  ];

  // Data for Chart 2: Profit & Cost Allocation Distribution (Donut Pie)
  const profitPieData = [
    { name: 'Net Operating Profit', value: Math.max(0, netTripProfit), color: '#10b981' },
    { name: 'Fuel Expense', value: effectiveFuelCost, color: '#f59e0b' },
    { name: 'Tollway Fees', value: tollExpense, color: '#3b82f6' },
    { name: 'Driver & Crew Allowance', value: driverPayEstimate + helperCrewPayout, color: '#8b5cf6' },
    { name: 'Maintenance Reserve', value: maintenanceReserve, color: '#64748b' },
  ].filter(item => item.value > 0);

  // Data for Chart 3: Diesel Price Sensitivity Analysis (Area / Line Chart)
  const sensitivityData = useMemo(() => {
    const prices = [45, 50, 55, 58.40, 62, 68, 75, 82, 90];
    return prices.map(price => {
      const fuelCostAtPrice = Number((effectiveFuelLiters * price).toFixed(2));
      const directCostsAtPrice = fuelCostAtPrice + tollExpense + driverPayEstimate + maintenanceReserve + helperCrewPayout;
      const profitAtPrice = Number((grossFreightRevenue - directCostsAtPrice).toFixed(2));
      const marginAtPrice = Number(((profitAtPrice / grossFreightRevenue) * 100).toFixed(1));
      
      return {
        price: `₱${price.toFixed(price % 1 === 0 ? 0 : 2)}/L`,
        rawPrice: price,
        'Net Profit (₱)': profitAtPrice,
        'Fuel Cost (₱)': fuelCostAtPrice,
        'Fuel Surcharge Recovered (₱)': fuelSurchargeAcc,
        'Profit Margin (%)': marginAtPrice,
        isCurrent: Math.abs(price - simulatedDieselPrice) < 0.1
      };
    });
  }, [effectiveFuelLiters, tollExpense, driverPayEstimate, maintenanceReserve, helperCrewPayout, grossFreightRevenue, fuelSurchargeAcc, simulatedDieselPrice]);

  const canLog = canLogFuel().allowed;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* Top Financial Health & Profitability Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Gross Projected Revenue */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Gross Freight Revenue</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-2xl font-mono font-black text-slate-900">
              ₱{grossFreightRevenue.toLocaleString()}
            </span>
          </div>
          <div className="mt-2 text-xs text-slate-500 flex items-center justify-between">
            <span>Base: <strong className="text-slate-800">₱{baseRate.toLocaleString()}</strong></span>
            <span className="font-mono text-blue-600 font-bold">+{fuelSurchargeAcc + demurrageAcc + tollReimbursementAcc + otherAccessorials > 0 ? `₱${(fuelSurchargeAcc + demurrageAcc + tollReimbursementAcc + otherAccessorials).toLocaleString()} add-ons` : 'No add-ons'}</span>
          </div>
          <div className="absolute top-0 right-0 h-1 w-full bg-blue-500" />
        </div>

        {/* Direct Fuel Expense */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              {hasActualFuelLogs ? 'Actual Fuel Incurred' : 'Projected Fuel Expense'}
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Fuel className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-mono font-black text-amber-700">
              ₱{effectiveFuelCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="mt-2 text-xs text-slate-500 flex items-center justify-between">
            <span>
              {effectiveFuelLiters.toFixed(1)}L @ ₱{simulatedDieselPrice.toFixed(2)}/L
            </span>
            <span className={`font-mono font-bold text-[10px] px-2 py-0.5 rounded-full ${
              fuelExpenseRatio <= 28 ? 'bg-emerald-50 text-emerald-700' :
              fuelExpenseRatio <= 36 ? 'bg-amber-50 text-amber-700' : 'bg-rose-50 text-rose-700'
            }`}>
              {fuelExpenseRatio}% of rev
            </span>
          </div>
          <div className="absolute top-0 right-0 h-1 w-full bg-amber-500" />
        </div>

        {/* Net Trip Contribution Profit */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Net Trip Profit</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className={`text-2xl font-mono font-black ${netTripProfit >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
              ₱{netTripProfit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="mt-2 text-xs text-slate-500 flex items-center justify-between">
            <span className="flex items-center gap-1 font-bold text-slate-700">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
              Margin: <span className="font-mono text-emerald-700 font-black">{operatingProfitMargin}%</span>
            </span>
            <span className="font-mono text-[10px] text-slate-500">₱{profitPerKm}/km</span>
          </div>
          <div className="absolute top-0 right-0 h-1 w-full bg-emerald-500" />
        </div>

        {/* Break-Even Diesel Price */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Diesel Break-Even</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Gauge className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-2xl font-mono font-black text-indigo-900">
              ₱{breakEvenDieselPrice > 0 ? breakEvenDieselPrice.toFixed(2) : '--'}
            </span>
            <span className="text-xs font-semibold text-slate-500">/ Liter</span>
          </div>
          <div className="mt-2 text-xs text-slate-500 flex items-center justify-between">
            <span>Buffer: <strong className="text-indigo-700">+{Math.max(0, breakEvenDieselPrice - simulatedDieselPrice).toFixed(1)}/L</strong></span>
            <span className="text-emerald-600 font-bold text-[10px]">Resilient</span>
          </div>
          <div className="absolute top-0 right-0 h-1 w-full bg-indigo-500" />
        </div>
      </div>

      {/* Interactive Visual Analytics Card (Recharts) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 md:p-6 shadow-2xs space-y-4">
        
        {/* Chart Header & Sub-Tab Switcher */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-600" />
              Trip Financial Architecture & Fuel Economics
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Breakdown comparing gross invoiced freight revenue vs fuel expense, expressway tolls, and operating contribution.
            </p>
          </div>

          {/* Tab Selector */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs self-start sm:self-auto">
            <button
              onClick={() => setActiveChartTab('REVENUE_VS_COST')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                activeChartTab === 'REVENUE_VS_COST'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Revenue vs Costs
            </button>

            <button
              onClick={() => setActiveChartTab('PROFIT_DISTRIBUTION')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                activeChartTab === 'PROFIT_DISTRIBUTION'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Cost & Margin Donut
            </button>

            <button
              onClick={() => setActiveChartTab('DIESEL_SENSITIVITY')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                activeChartTab === 'DIESEL_SENSITIVITY'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Diesel Sensitivity
            </button>
          </div>
        </div>

        {/* Tab 1: Revenue vs Cost Breakdown (BarChart) */}
        {activeChartTab === 'REVENUE_VS_COST' && (
          <div className="space-y-4">
            <div className="h-72 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueCostBarData} margin={{ top: 10, right: 20, left: 10, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="category" tick={{ fill: '#475569', fontSize: 11, fontWeight: 600 }} />
                  <YAxis 
                    tick={{ fill: '#64748b', fontSize: 10 }} 
                    tickFormatter={(val) => `₱${(val / 1000).toFixed(0)}k`} 
                  />
                  <Tooltip
                    formatter={(value: any, name: any) => [`₱${Number(value).toLocaleString()}`, name]}
                    contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', color: '#fff', fontSize: '11px', border: 'none' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                  
                  {/* Revenue Stack */}
                  <Bar dataKey="Base Freight" stackId="a" fill="#3b82f6" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="Fuel Surcharge (FAF)" stackId="a" fill="#f59e0b" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="Demurrage & Accessorials" stackId="a" fill="#8b5cf6" radius={[4, 4, 0, 0]} />

                  {/* Cost Stack */}
                  <Bar dataKey="Fuel Expense" stackId="b" fill="#d97706" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="Tollways" stackId="b" fill="#6366f1" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="Driver & Crew Pay" stackId="b" fill="#ec4899" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="Maintenance Reserve" stackId="b" fill="#64748b" radius={[4, 4, 0, 0]} />

                  {/* Profit Bar */}
                  <Bar dataKey="Net Operating Profit" stackId="c" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Explanatory summary bar */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 text-xs">
              <div className="bg-blue-50/60 border border-blue-200/80 rounded-xl p-3">
                <div className="text-[10px] font-bold uppercase text-blue-700">Gross Invoiced</div>
                <div className="font-mono text-base font-black text-blue-900 mt-0.5">
                  ₱{grossFreightRevenue.toLocaleString()}
                </div>
                <div className="text-[10px] text-blue-600 mt-1">
                  Base ₱{baseRate.toLocaleString()} + ₱{(fuelSurchargeAcc + demurrageAcc + tollReimbursementAcc + otherAccessorials).toLocaleString()} add-ons
                </div>
              </div>

              <div className="bg-amber-50/60 border border-amber-200/80 rounded-xl p-3">
                <div className="text-[10px] font-bold uppercase text-amber-700">Total Direct Expenses</div>
                <div className="font-mono text-base font-black text-amber-900 mt-0.5">
                  ₱{totalDirectCosts.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </div>
                <div className="text-[10px] text-amber-600 mt-1">
                  Fuel ₱{effectiveFuelCost.toLocaleString()} ({fuelExpenseRatio}%) + Tolls ₱{tollExpense.toLocaleString()}
                </div>
              </div>

              <div className="bg-emerald-50/60 border border-emerald-200/80 rounded-xl p-3">
                <div className="text-[10px] font-bold uppercase text-emerald-700">Net Operating Margin</div>
                <div className="font-mono text-base font-black text-emerald-900 mt-0.5">
                  ₱{netTripProfit.toLocaleString(undefined, { minimumFractionDigits: 2 })} ({operatingProfitMargin}%)
                </div>
                <div className="text-[10px] text-emerald-600 mt-1">
                  Net retained cash contribution per trip
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Profit & Cost Allocation Donut (PieChart) */}
        {activeChartTab === 'PROFIT_DISTRIBUTION' && (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center pt-2">
            <div className="md:col-span-6 h-64 relative flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={profitPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={65}
                    outerRadius={95}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {profitPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(val: any) => [`₱${Number(val).toLocaleString()}`, 'Amount']}
                    contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', color: '#fff', fontSize: '11px' }}
                  />
                </PieChart>
              </ResponsiveContainer>

              {/* Center Margin Badge */}
              <div className="absolute flex flex-col items-center justify-center text-center pointer-events-none">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Net Margin</span>
                <span className="font-mono text-xl font-black text-emerald-600">{operatingProfitMargin}%</span>
                <span className="text-[9px] text-slate-500">of revenue</span>
              </div>
            </div>

            <div className="md:col-span-6 space-y-2.5">
              <div className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
                Revenue Dollar Allocation Breakdown:
              </div>

              {profitPieData.map((item, idx) => {
                const pct = ((item.value / grossFreightRevenue) * 100).toFixed(1);
                return (
                  <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-200 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                      <span className="font-semibold text-slate-700">{item.name}</span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <span className="font-mono text-slate-500 text-[11px]">{pct}%</span>
                      <span className="font-mono font-bold text-slate-900">₱{item.value.toLocaleString()}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab 3: Diesel Price Sensitivity Analysis (AreaChart) */}
        {activeChartTab === 'DIESEL_SENSITIVITY' && (
          <div className="space-y-4 pt-2">
            
            {/* Simulation Slider Control */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-blue-600 shrink-0" />
                <div>
                  <span className="font-bold text-slate-800">Diesel Price Volatility Simulation:</span>
                  <span className="text-slate-500 ml-1 text-[11px]">Adjust to test profit resilience under diesel price spikes</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="45"
                  max="85"
                  step="0.5"
                  value={simulatedDieselPrice}
                  onChange={(e) => setSimulatedDieselPrice(Number(e.target.value))}
                  className="w-36 accent-blue-600 cursor-pointer"
                />
                <span className="font-mono font-black text-blue-700 bg-white border border-blue-200 px-2.5 py-1 rounded text-xs">
                  ₱{simulatedDieselPrice.toFixed(2)}/L
                </span>
                <button
                  onClick={() => setSimulatedDieselPrice(58.40)}
                  className="text-[10px] text-slate-500 hover:text-slate-800 underline font-medium"
                >
                  Reset
                </button>
              </div>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={sensitivityData} margin={{ top: 10, right: 20, left: 10, bottom: 20 }}>
                  <defs>
                    <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0}/>
                    </linearGradient>
                    <linearGradient id="fuelGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="price" tick={{ fill: '#475569', fontSize: 10 }} />
                  <YAxis 
                    tick={{ fill: '#64748b', fontSize: 10 }} 
                    tickFormatter={(val) => `₱${(val / 1000).toFixed(0)}k`} 
                  />
                  <Tooltip 
                    formatter={(val: any, name: any) => [`₱${Number(val).toLocaleString()}`, name]}
                    contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', color: '#fff', fontSize: '11px' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '6px' }} />
                  <Area type="monotone" dataKey="Net Profit (₱)" stroke="#10b981" fillOpacity={1} fill="url(#profitGrad)" strokeWidth={2.5} />
                  <Area type="monotone" dataKey="Fuel Cost (₱)" stroke="#f59e0b" fillOpacity={1} fill="url(#fuelGrad)" strokeWidth={2} />
                  <Line type="monotone" dataKey="Fuel Surcharge Recovered (₱)" stroke="#3b82f6" strokeDasharray="4 4" strokeWidth={2} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>

      {/* Fuel Surcharge vs Actual Fuel Expense Variance Audit */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 md:p-6 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <Coins className="w-4 h-4 text-amber-600" />
              Fuel Adjustment Factor (FAF) Recovery & Surcharge Audit
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Compares billed customer fuel surcharge against direct diesel pump expenses.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {canLog && (
              <button
                onClick={() => onOpenAddFuel(trip.id, trip.truckId)}
                className="flex items-center gap-1.5 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-2xs active:scale-95"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Log Trip Fuel Fill-Up</span>
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          
          {/* Box 1: Billed Surcharge */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-1">
            <span className="text-[10px] font-bold uppercase text-slate-500">Fuel Surcharge Billed (FAF)</span>
            <div className="font-mono text-xl font-black text-blue-700">
              ₱{fuelSurchargeAcc.toLocaleString()}
            </div>
            <p className="text-[10px] text-slate-500">
              {trip.fuelSurchargePercent}% FAF indexed on base rate of ₱{baseRate.toLocaleString()}
            </p>
          </div>

          {/* Box 2: Direct Fuel Spent */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-1">
            <span className="text-[10px] font-bold uppercase text-slate-500">
              {hasActualFuelLogs ? 'Actual Fuel Cost Incurred' : 'Estimated Route Fuel Burn'}
            </span>
            <div className="font-mono text-xl font-black text-amber-800">
              ₱{effectiveFuelCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <p className="text-[10px] text-slate-500">
              {effectiveFuelLiters.toFixed(1)} Liters consumed (~{estimatedRoundtripKm} km roundtrip)
            </p>
          </div>

          {/* Box 3: Net Fuel Gap */}
          <div className={`border rounded-xl p-3.5 space-y-1 ${
            fuelSurchargeAcc >= effectiveFuelCost * 0.4
              ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
              : 'bg-amber-50/70 border-amber-200 text-amber-900'
          }`}>
            <span className="text-[10px] font-bold uppercase tracking-wider">
              FAF Recovery Coverage
            </span>
            <div className="font-mono text-xl font-black flex items-center gap-1.5">
              <span>{fuelSurchargeCoverageRatio}%</span>
              <span className="text-xs font-normal">recovered</span>
            </div>
            <p className="text-[10px] opacity-80">
              Net unrecovered fuel cost (absorbed by freight rate): ₱{Math.max(0, effectiveFuelCost - fuelSurchargeAcc).toLocaleString()}
            </p>
          </div>
        </div>

        {/* Individual Fuel Logs Table for this trip */}
        <div className="pt-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-800 mb-2">
            <span className="flex items-center gap-1.5">
              <Fuel className="w-3.5 h-3.5 text-amber-600" />
              <span>Fuel Receipts & Fill-Ups Linked to Trip {trip.tripNumber}:</span>
            </span>
            <span className="font-mono text-[10px] text-slate-500">{tripFuelLogs.length} receipts attached</span>
          </div>

          {tripFuelLogs.length === 0 ? (
            <div className="bg-slate-50 border border-dashed border-slate-300 rounded-xl p-6 text-center space-y-2 text-xs">
              <Fuel className="w-8 h-8 mx-auto text-slate-300" />
              <p className="text-slate-600 font-semibold">No direct fuel fill-up receipt recorded for this trip yet.</p>
              <p className="text-[11px] text-slate-400">
                Calculations currently use route corridor distance ({estimatedRoundtripKm} km) and vehicle benchmark ({targetKmPerLiter} km/L).
              </p>
              {canLog && (
                <button
                  onClick={() => onOpenAddFuel(trip.id, trip.truckId)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white font-bold text-xs hover:bg-blue-700 shadow-xs mt-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Log Fuel Receipt with POS / Fleet Card</span>
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Station & OR #</th>
                    <th className="py-2.5 px-3 text-right">Volume (L)</th>
                    <th className="py-2.5 px-3 text-right">Price / L</th>
                    <th className="py-2.5 px-3 text-right">Total Cost (PHP)</th>
                    <th className="py-2.5 px-3 text-center">Efficiency</th>
                    <th className="py-2.5 px-3">Payment</th>
                    <th className="py-2.5 px-3">Logged By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {tripFuelLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-2.5 px-3 font-mono text-slate-700 whitespace-nowrap">{log.date}</td>
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-slate-900">{log.fuelStation}</div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {log.receiptNumber ? `OR: ${log.receiptNumber}` : log.fuelGrade}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">{log.liters.toFixed(1)} L</td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-600">₱{log.pricePerLiterPhp.toFixed(2)}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-black text-slate-900">
                        ₱{log.costPhp.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className="font-mono font-bold text-[11px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-200">
                          {log.kmPerLiter > 0 ? `${log.kmPerLiter} km/L` : '--'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span className="text-[10px] text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                          {log.paymentMethod}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-[10px] text-slate-500 truncate max-w-[120px]">{log.loggedBy}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

    </div>
  );
};
