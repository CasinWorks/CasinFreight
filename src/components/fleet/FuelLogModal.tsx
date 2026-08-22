import React, { useState, useEffect } from 'react';
import { 
  X, 
  Fuel, 
  Gauge, 
  Calendar, 
  DollarSign, 
  CreditCard, 
  MapPin, 
  FileText, 
  CheckCircle2, 
  AlertTriangle,
  Info,
  Truck as TruckIcon,
  User as UserIcon,
  Clock
} from 'lucide-react';
import { useFreight, getTargetKmPerLiter } from '../../context/FreightContext';
import { Truck, FuelLog, FuelPaymentMethod } from '../../types';
import { closeIfBackdrop } from '../../lib/modal';

interface FuelLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTruckId?: string;
  initialTripId?: string;
  editingLog?: FuelLog | null;
}

const POPULAR_PH_STATIONS = [
  'Petron SLEX Mamplasan Southbound',
  'Shell NLEX Marilao Northbound',
  'Caltex Star Tollway Lipa City',
  'Petron Manila North Harbor Port Area',
  'Shell SLEX San Pedro Southbound',
  'Seaoil C6 Bicutan Terminal',
  'Caltex CAVITEX Zapote Tollgate',
  'Petron Batangas Port Access Road',
  'Shell Alabang Zapote Road Las Piñas',
  'Petron Cupang West Service Road',
  'Total Balintawak QC Tollgate',
  'Unioil Mindanao Avenue QC',
  'Petron Subic Freeport Tipo Gate',
  'Shell SCTEX Floridablanca Interchange'
];

const PAYMENT_METHODS: FuelPaymentMethod[] = [
  'Petron Fleet Card',
  'Shell Fleet Card',
  'Caltex StarCard',
  'Cash Advance',
  'Corporate GCash',
  'Company Credit Card'
];

export const FuelLogModal: React.FC<FuelLogModalProps> = ({
  isOpen,
  onClose,
  initialTruckId,
  initialTripId,
  editingLog
}) => {
  const { 
    trucks, 
    drivers, 
    trips, 
    addFuelLog, 
    updateFuelLog, 
    fuelLogs, 
    canLogFuel 
  } = useFreight();

  const [truckId, setTruckId] = useState<string>('');
  const [driverId, setDriverId] = useState<string>('');
  const [tripId, setTripId] = useState<string>('');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [odometerKm, setOdometerKm] = useState<number>(0);
  const [previousOdometerKm, setPreviousOdometerKm] = useState<number>(0);
  const [liters, setLiters] = useState<number>(100);
  const [costPhp, setCostPhp] = useState<number>(5800);
  const [pricePerLiter, setPricePerLiter] = useState<number>(58.00);
  const [fuelStation, setFuelStation] = useState<string>(POPULAR_PH_STATIONS[0]);
  const [customStation, setCustomStation] = useState<string>('');
  const [isCustomStation, setIsCustomStation] = useState<boolean>(false);
  const [fuelGrade, setFuelGrade] = useState<string>('Euro 4 Diesel');
  const [fullTank, setFullTank] = useState<boolean>(true);
  const [paymentMethod, setPaymentMethod] = useState<FuelPaymentMethod>('Petron Fleet Card');
  const [receiptNumber, setReceiptNumber] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  // Selected truck lookup
  const selectedTruck = trucks.find(t => t.id === truckId);
  const targetKmPerLiter = selectedTruck ? getTargetKmPerLiter(selectedTruck.type) : 3.5;

  // Initialize or reset form
  useEffect(() => {
    if (editingLog) {
      setTruckId(editingLog.truckId);
      setDriverId(editingLog.driverId || '');
      setTripId(editingLog.tripId || '');
      setDate(editingLog.date);
      setOdometerKm(editingLog.odometerKm);
      setPreviousOdometerKm(editingLog.previousOdometerKm);
      setLiters(editingLog.liters);
      setCostPhp(editingLog.costPhp);
      setPricePerLiter(editingLog.pricePerLiterPhp);
      if (POPULAR_PH_STATIONS.includes(editingLog.fuelStation)) {
        setFuelStation(editingLog.fuelStation);
        setIsCustomStation(false);
      } else {
        setIsCustomStation(true);
        setCustomStation(editingLog.fuelStation);
      }
      setFuelGrade(editingLog.fuelGrade);
      setFullTank(editingLog.fullTank);
      setPaymentMethod(editingLog.paymentMethod);
      setReceiptNumber(editingLog.receiptNumber || '');
      setNotes(editingLog.notes || '');
    } else {
      const targetTrip = initialTripId ? trips.find(t => t.id === initialTripId) : undefined;
      const effectiveTruckId = initialTruckId || targetTrip?.truckId;
      const activeTruck = trucks.find(t => t.id === effectiveTruckId) || trucks[0];

      if (activeTruck) {
        setTruckId(activeTruck.id);
        setDriverId(targetTrip?.driverId || activeTruck.assignedDriverId || '');
        setTripId(initialTripId || activeTruck.currentTripId || '');
        
        // Find previous odometer
        const truckLogs = fuelLogs
          .filter(l => l.truckId === activeTruck.id)
          .sort((a, b) => b.odometerKm - a.odometerKm);
        
        const prevOdo = truckLogs.length > 0 
          ? truckLogs[0].odometerKm 
          : Math.max(0, activeTruck.lastOdometerKm - 350);
        
        setPreviousOdometerKm(prevOdo);
        setOdometerKm(activeTruck.lastOdometerKm || prevOdo + 350);
        setFuelGrade(activeTruck.fuelType || 'Euro 4 Diesel');
      }
      setDate(new Date().toISOString().split('T')[0]);
      setLiters(100);
      setCostPhp(5800);
      setPricePerLiter(58.00);
      setReceiptNumber(`OR-${Math.floor(100000 + Math.random() * 900000)}`);
      setNotes(targetTrip ? `Fuel fill-up for Trip ${targetTrip.tripNumber} (${targetTrip.originZone} to ${targetTrip.destinationZone})` : '');
    }
  }, [editingLog, initialTruckId, initialTripId, trucks, trips, isOpen]);

  // When truck changes in Add mode, update related fields
  const handleTruckChange = (newTruckId: string) => {
    setTruckId(newTruckId);
    const trk = trucks.find(t => t.id === newTruckId);
    if (trk) {
      if (trk.assignedDriverId) setDriverId(trk.assignedDriverId);
      if (trk.currentTripId) setTripId(trk.currentTripId);
      setFuelGrade(trk.fuelType || 'Euro 4 Diesel');

      const truckLogs = fuelLogs
        .filter(l => l.truckId === trk.id)
        .sort((a, b) => b.odometerKm - a.odometerKm);
      
      const prevOdo = truckLogs.length > 0 
        ? truckLogs[0].odometerKm 
        : Math.max(0, trk.lastOdometerKm - 350);

      setPreviousOdometerKm(prevOdo);
      setOdometerKm(trk.lastOdometerKm || prevOdo + 350);
    }
  };

  // Synchronize cost and price per liter
  const handleLitersChange = (val: number) => {
    setLiters(val);
    if (pricePerLiter > 0) {
      setCostPhp(Number((val * pricePerLiter).toFixed(2)));
    }
  };

  const handlePricePerLiterChange = (val: number) => {
    setPricePerLiter(val);
    if (liters > 0) {
      setCostPhp(Number((liters * val).toFixed(2)));
    }
  };

  const handleCostChange = (val: number) => {
    setCostPhp(val);
    if (liters > 0) {
      setPricePerLiter(Number((val / liters).toFixed(2)));
    }
  };

  // Real-time calculations
  const distanceTraveled = Math.max(0, odometerKm - previousOdometerKm);
  const calculatedKmPerLiter = distanceTraveled > 0 && liters > 0 
    ? Number((distanceTraveled / liters).toFixed(2)) 
    : 0;
  const calculatedCostPerKm = distanceTraveled > 0 
    ? Number((costPhp / distanceTraveled).toFixed(2)) 
    : 0;

  // Efficiency badge logic
  const isOptimal = calculatedKmPerLiter >= targetKmPerLiter * 0.95;
  const isNormal = calculatedKmPerLiter >= targetKmPerLiter * 0.80 && !isOptimal;
  const isLow = calculatedKmPerLiter > 0 && calculatedKmPerLiter < targetKmPerLiter * 0.80;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!truckId) {
      alert('Please select a truck.');
      return;
    }
    if (odometerKm <= previousOdometerKm && previousOdometerKm > 0) {
      if (!confirm(`Warning: The entered odometer (${odometerKm} km) is not greater than the previous odometer (${previousOdometerKm} km). Do you still want to proceed?`)) {
        return;
      }
    }

    const stationToSave = isCustomStation ? (customStation.trim() || 'Unspecified Station') : fuelStation;

    if (editingLog) {
      updateFuelLog(editingLog.id, {
        truckId,
        driverId: driverId || undefined,
        tripId: tripId || undefined,
        date,
        odometerKm: Number(odometerKm),
        previousOdometerKm: Number(previousOdometerKm),
        liters: Number(liters),
        costPhp: Number(costPhp),
        pricePerLiterPhp: Number(pricePerLiter),
        fuelStation: stationToSave,
        fuelGrade,
        fullTank,
        paymentMethod,
        receiptNumber: receiptNumber || undefined,
        notes: notes || undefined,
      });
    } else {
      addFuelLog({
        truckId,
        driverId: driverId || undefined,
        tripId: tripId || undefined,
        date,
        odometerKm: Number(odometerKm),
        previousOdometerKm: Number(previousOdometerKm),
        liters: Number(liters),
        costPhp: Number(costPhp),
        pricePerLiterPhp: Number(pricePerLiter),
        fuelStation: stationToSave,
        fuelGrade,
        fullTank,
        paymentMethod,
        receiptNumber: receiptNumber || undefined,
        notes: notes || undefined,
      });
    }

    onClose();
  };

  const permission = canLogFuel();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto" onClick={closeIfBackdrop(onClose)}>
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-2xl shadow-2xl animate-in fade-in zoom-in-95 duration-150 text-xs text-slate-900 my-auto overflow-hidden">
        
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-slate-900 text-white p-4 sm:p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center font-bold text-amber-300 shadow-inner">
              <Fuel className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  {editingLog ? 'Edit Fuel Expense Log' : 'Log Fuel Fill-Up & Calculate KM/L'}
                </h2>
                <span className="bg-amber-400/20 text-amber-200 border border-amber-300/30 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full">
                  ₱ Fuel Audit
                </span>
              </div>
              <p className="text-xs text-blue-100/80 mt-0.5">
                Record official fuel disbursements, track distance deltas, and compute vehicle consumption efficiency.
              </p>
            </div>
          </div>

          <button 
            onClick={onClose} 
            className="text-white/70 hover:text-white hover:bg-white/10 p-1.5 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Access Warning if not permitted */}
        {!permission.allowed && (
          <div className="bg-amber-50 border-b border-amber-200 p-3 text-amber-900 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>{permission.reason}</span>
          </div>
        )}

        {/* Live Calculation Preview Banner */}
        <div className="bg-slate-900 text-white p-3.5 border-b border-slate-800">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <div className="bg-slate-800/80 border border-slate-700/80 rounded-lg p-2">
              <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Distance Run</div>
              <div className="text-sm sm:text-base font-mono font-bold text-amber-400 mt-0.5">
                {distanceTraveled.toLocaleString()} km
              </div>
            </div>

            <div className="bg-slate-800/80 border border-slate-700/80 rounded-lg p-2">
              <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Computed KM/L</div>
              <div className="text-sm sm:text-base font-mono font-black text-emerald-400 mt-0.5 flex items-center justify-center gap-1">
                <span>{calculatedKmPerLiter > 0 ? `${calculatedKmPerLiter} km/L` : '--'}</span>
              </div>
            </div>

            <div className="bg-slate-800/80 border border-slate-700/80 rounded-lg p-2">
              <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Cost per Km</div>
              <div className="text-sm sm:text-base font-mono font-bold text-blue-300 mt-0.5">
                {calculatedCostPerKm > 0 ? `₱${calculatedCostPerKm}/km` : '--'}
              </div>
            </div>

            <div className="bg-slate-800/80 border border-slate-700/80 rounded-lg p-2 flex flex-col justify-center items-center">
              <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Target vs Actual</div>
              <div className="mt-0.5">
                {calculatedKmPerLiter > 0 ? (
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                    isOptimal ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' :
                    isNormal ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40' :
                    'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                  }`}>
                    {isOptimal ? '⚡ Optimal' : isNormal ? '✓ Normal' : '⚠️ Low Efficiency'}
                  </span>
                ) : (
                  <span className="text-[11px] text-slate-400 font-mono">Target: {targetKmPerLiter} km/L</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Main Form */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4 max-h-[68vh] overflow-y-auto">
          
          {/* Section 1: Vehicle & Odometer Readings */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <span className="font-bold text-slate-800 flex items-center gap-1.5">
                <TruckIcon className="w-4 h-4 text-blue-600" />
                Vehicle & Odometer Traveled
              </span>
              {selectedTruck && (
                <span className="text-[11px] font-semibold text-slate-500">
                  {selectedTruck.type} • Target: <strong className="text-slate-700">{targetKmPerLiter} km/L</strong>
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Select Truck *</label>
                <select
                  value={truckId}
                  onChange={(e) => handleTruckChange(e.target.value)}
                  required
                  className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-900 focus:outline-none focus:border-blue-500 shadow-2xs"
                >
                  {trucks.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.plateNumber} — {t.brandModel}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Previous Fill-up Odometer (km)
                </label>
                <input
                  type="number"
                  value={previousOdometerKm}
                  onChange={(e) => setPreviousOdometerKm(Number(e.target.value))}
                  required
                  min="0"
                  className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 font-mono font-semibold text-slate-700 focus:outline-none focus:border-blue-500 shadow-2xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-blue-700 mb-1 flex items-center justify-between">
                  <span>Current Fill-up Odometer (km) *</span>
                  <Gauge className="w-3 h-3 text-blue-600" />
                </label>
                <input
                  type="number"
                  value={odometerKm}
                  onChange={(e) => setOdometerKm(Number(e.target.value))}
                  required
                  min={previousOdometerKm || 0}
                  className="w-full bg-blue-50/50 border border-blue-300 rounded-lg px-2.5 py-1.5 font-mono font-bold text-blue-900 focus:bg-white focus:outline-none focus:border-blue-600 shadow-2xs"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Liters, Cost, Price / Liter */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <span className="font-bold text-slate-800 flex items-center gap-1.5">
                <DollarSign className="w-4 h-4 text-emerald-600" />
                Fuel Quantity & Cost Breakdown (PHP)
              </span>
              <label className="flex items-center gap-1.5 cursor-pointer text-[11px] font-semibold text-slate-600">
                <input
                  type="checkbox"
                  checked={fullTank}
                  onChange={(e) => setFullTank(e.target.checked)}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span>Full Tank Top-up (Recommended for KM/L)</span>
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Fuel Pumped (Liters) *</label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    min="0.1"
                    value={liters}
                    onChange={(e) => handleLitersChange(Number(e.target.value))}
                    required
                    className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 pr-8 font-mono font-bold text-slate-900 focus:outline-none focus:border-blue-500 shadow-2xs"
                  />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-[10px]">
                    L
                  </span>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Price per Liter (₱/L)</label>
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-mono">₱</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0.1"
                    value={pricePerLiter}
                    onChange={(e) => handlePricePerLiterChange(Number(e.target.value))}
                    required
                    className="w-full bg-white border border-slate-200 rounded-lg pl-6 pr-2.5 py-1.5 font-mono text-slate-900 focus:outline-none focus:border-blue-500 shadow-2xs"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-emerald-800 mb-1">Total Fuel Cost (₱) *</label>
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-emerald-600 font-bold font-mono">₱</span>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    value={costPhp}
                    onChange={(e) => handleCostChange(Number(e.target.value))}
                    required
                    className="w-full bg-emerald-50/60 border border-emerald-300 rounded-lg pl-6 pr-2.5 py-1.5 font-mono font-black text-emerald-900 focus:bg-white focus:outline-none focus:border-emerald-600 shadow-2xs"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Station, Date, Fuel Grade */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1 flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  Gas / Fuel Station *
                </span>
                <button
                  type="button"
                  onClick={() => setIsCustomStation(!isCustomStation)}
                  className="text-[10px] text-blue-600 hover:underline font-normal"
                >
                  {isCustomStation ? 'Choose from list' : '+ Enter custom station'}
                </button>
              </label>
              {isCustomStation ? (
                <input
                  type="text"
                  value={customStation}
                  onChange={(e) => setCustomStation(e.target.value)}
                  placeholder="e.g. Petron Tagaytay Bypass Rd"
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500"
                />
              ) : (
                <select
                  value={fuelStation}
                  onChange={(e) => setFuelStation(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500"
                >
                  {POPULAR_PH_STATIONS.map(st => (
                    <option key={st} value={st}>{st}</option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                Fill-up Date *
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-slate-900 font-mono focus:bg-white focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Section 4: Payment, Driver, Receipt # */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1 flex items-center gap-1">
                <CreditCard className="w-3.5 h-3.5 text-slate-400" />
                Payment Method
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as FuelPaymentMethod)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500"
              >
                {PAYMENT_METHODS.map(pm => (
                  <option key={pm} value={pm}>{pm}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1 flex items-center gap-1">
                <UserIcon className="w-3.5 h-3.5 text-slate-400" />
                Driver on Duty
              </label>
              <select
                value={driverId}
                onChange={(e) => setDriverId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500"
              >
                <option value="">-- Unspecified Driver --</option>
                {drivers.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1 flex items-center gap-1">
                <FileText className="w-3.5 h-3.5 text-slate-400" />
                OR / POS Receipt #
              </label>
              <input
                type="text"
                value={receiptNumber}
                onChange={(e) => setReceiptNumber(e.target.value.toUpperCase())}
                placeholder="e.g. PET-2026-901"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 font-mono text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Section 5: Associated Trip & Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Associated Shipment / Trip</label>
              <select
                value={tripId}
                onChange={(e) => setTripId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500"
              >
                <option value="">-- None / Yard Top-Up --</option>
                {trips
                  .filter(t => t.truckId === truckId || !truckId)
                  .map(t => (
                    <option key={t.id} value={t.id}>
                      {t.tripNumber} ({t.originZone} ➔ {t.destinationZone}) [{t.status}]
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Remarks / Fuel Notes</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Pre-trip top-up for Clark run"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-200">
            <div className="text-[11px] text-slate-500 flex items-center gap-1">
              <Info className="w-3.5 h-3.5 text-blue-500" />
              <span>Auto-updates truck's odometer to {odometerKm.toLocaleString()} km</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-2 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold text-xs transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!permission.allowed}
                className="px-5 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs transition-all shadow-md active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{editingLog ? 'Update Fuel Log' : 'Save Fuel Log & KM/L'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
