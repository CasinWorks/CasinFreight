import React, { useState, useEffect } from 'react';
import { 
  X, 
  Truck as TruckIcon, 
  Scale, 
  MapPin, 
  User, 
  Calendar, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  Sparkles, 
  Receipt, 
  ArrowRight, 
  Info,
  ShieldAlert,
  Fuel,
  Coins,
  Plus
} from 'lucide-react';
import { useFreight } from '../../context/FreightContext';
import { TruckType } from '../../types';

interface NewTripModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTripCreated?: (tripId: string) => void;
}

export const NewTripModal: React.FC<NewTripModalProps> = ({ isOpen, onClose, onTripCreated }) => {
  const { 
    trucks, 
    drivers, 
    clients, 
    rateCards, 
    suggestRateCard, 
    addTrip, 
    canCreateBooking,
    setIsUpgradeModalOpen,
  } = useFreight();

  // Form State
  const [selectedTruckId, setSelectedTruckId] = useState<string>('');
  const [selectedDriverId, setSelectedDriverId] = useState<string>('');
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  
  // Origin & Destination Zones
  const [originZone, setOriginZone] = useState<string>('North Harbor / MICT Manila');
  const [originAddress, setOriginAddress] = useState<string>('');
  const [destinationZone, setDestinationZone] = useState<string>('Laguna Technopark (Biñan/Sta. Rosa)');
  const [destinationAddress, setDestinationAddress] = useState<string>('');
  
  // Cargo & Load Specs
  const [cargoDescription, setCargoDescription] = useState<string>('');
  const [cargoWeightKg, setCargoWeightKg] = useState<number>(8500);
  const [cargoVolumeCbm, setCargoVolumeCbm] = useState<number>(25);

  // Financial & Rates
  const [baseRatePhp, setBaseRatePhp] = useState<number>(16500);
  const [isRateAutoSuggested, setIsRateAutoSuggested] = useState<boolean>(true);
  const [tollEstimatePhp, setTollEstimatePhp] = useState<number>(1450);
  const [fuelSurchargePercent, setFuelSurchargePercent] = useState<number>(6);
  const [multiStopCount, setMultiStopCount] = useState<number>(0);
  const [demurrageRatePerHour, setDemurrageRatePerHour] = useState<number>(850);
  const [overweightSurchargePerKg, setOverweightSurchargePerKg] = useState<number>(12);

  // Dates
  const [scheduledPickup, setScheduledPickup] = useState<string>(() => {
    const now = new Date();
    now.setHours(now.getHours() + 2, 0, 0, 0);
    return now.toISOString().slice(0, 16);
  });
  const [scheduledDelivery, setScheduledDelivery] = useState<string>(() => {
    const now = new Date();
    now.setHours(now.getHours() + 10, 0, 0, 0);
    return now.toISOString().slice(0, 16);
  });
  const [notes, setNotes] = useState<string>('');

  // Pre-fill initial defaults when modal opens
  useEffect(() => {
    if (isOpen) {
      if (trucks.length > 0 && !selectedTruckId) {
        setSelectedTruckId(trucks[0].id);
        if (trucks[0].assignedDriverId) {
          setSelectedDriverId(trucks[0].assignedDriverId);
        }
      }
      if (clients.length > 0 && !selectedClientId) {
        setSelectedClientId(clients[0].id);
      }
    }
  }, [isOpen, trucks, clients]);

  // Selected Truck Object
  const currentTruck = trucks.find(t => t.id === selectedTruckId);

  // When Truck or Driver or Zone changes, auto-suggest RateCard
  useEffect(() => {
    if (currentTruck && originZone && destinationZone) {
      const match = suggestRateCard(originZone, destinationZone, currentTruck.type);
      if (match) {
        setBaseRatePhp(match.baseRatePhp);
        setTollEstimatePhp(match.tollEstimatePhp);
        setIsRateAutoSuggested(true);
      } else {
        setIsRateAutoSuggested(false);
      }
    }
  }, [selectedTruckId, originZone, destinationZone, currentTruck]);

  // When truck changes, pre-select assigned driver if available
  const handleTruckChange = (truckId: string) => {
    setSelectedTruckId(truckId);
    const trk = trucks.find(t => t.id === truckId);
    if (trk?.assignedDriverId) {
      setSelectedDriverId(trk.assignedDriverId);
    }
  };

  if (!isOpen) return null;

  // Load Calculation Values
  const gvwr = currentTruck ? currentTruck.gvwrKg : 26000;
  const tare = currentTruck ? currentTruck.tareWeightKg : 10500;
  const netPayloadCapKg = currentTruck ? currentTruck.netPayloadKg : (gvwr - tare);
  const maxVolCbm = currentTruck ? currentTruck.maxVolumeCbm : 50;

  const isOverweight = cargoWeightKg > netPayloadCapKg;
  const overweightKg = isOverweight ? (cargoWeightKg - netPayloadCapKg) : 0;
  const loadPercentage = netPayloadCapKg > 0 ? Math.round((cargoWeightKg / netPayloadCapKg) * 100) : 0;
  const volumePercentage = maxVolCbm > 0 ? Math.round((cargoVolumeCbm / maxVolCbm) * 100) : 0;

  // Estimated Totals
  const fuelAmount = (baseRatePhp * fuelSurchargePercent) / 100;
  const overweightAmount = overweightKg * overweightSurchargePerKg;
  const multiStopAmount = multiStopCount * 2500;
  const estimatedTotalPhp = baseRatePhp + fuelAmount + tollEstimatePhp + overweightAmount + multiStopAmount;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedTruckId) {
      alert('Please select an active truck.');
      return;
    }
    if (!selectedDriverId) {
      alert('Please assign a licensed driver.');
      return;
    }
    if (!selectedClientId) {
      alert('Please select a client.');
      return;
    }

    if (!canCreateBooking) {
      setIsUpgradeModalOpen(true);
      return;
    }

    const createdTrip = addTrip({
      truckId: selectedTruckId,
      driverId: selectedDriverId,
      clientId: selectedClientId,
      originZone,
      originAddress: originAddress || `${originZone} CFS Facility`,
      destinationZone,
      destinationAddress: destinationAddress || `${destinationZone} Logistics Dock`,
      cargoDescription: cargoDescription || 'General freight cargo pallets',
      cargoWeightKg: Number(cargoWeightKg),
      cargoVolumeCbm: Number(cargoVolumeCbm),
      scheduledPickup,
      scheduledDelivery,
      status: 'Pending',
      accessorials: [],
      baseRatePhp: Number(baseRatePhp),
      tollEstimatePhp: Number(tollEstimatePhp),
      fuelSurchargePercent: Number(fuelSurchargePercent),
      multiStopCount: Number(multiStopCount),
      demurrageHours: 0,
      demurrageRatePerHour: Number(demurrageRatePerHour),
      overweightSurchargePerKg: Number(overweightSurchargePerKg),
      notes,
    });

    if (!createdTrip) {
      return;
    }

    if (onTripCreated) {
      onTripCreated(createdTrip.id);
    }
    onClose();
  };

  // Preset Zones in Philippines
  const zoneOptions = [
    'North Harbor / MICT Manila',
    'South Harbor Gate 3 Manila',
    'Caloocan / Valenzuela Industrial',
    'Pasig / Taguig Food Terminal',
    'Muntinlupa / Sucat Warehouse Hub',
    'Laguna Technopark (Biñan/Sta. Rosa)',
    'Cavite Export Zone (CEPZ Rosario)',
    'Batangas Port Container Terminal',
    'Clark Freeport Zone, Pampanga',
    'Subic Bay Freeport Zone',
    'San Fernando, Pampanga',
    'Lipa City / Batangas Light Park',
    'Cabuyao Light Industry & Science Park'
  ];  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 text-slate-900">
        
        {/* Header */}
        <div className="p-4 md:px-6 md:py-4 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold shadow-xs">
              <Scale className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800 tracking-tight">Load Calculator & Dispatch</h2>
              <p className="text-xs text-slate-500">
                Philippine gross vehicle weight validation, zone rate suggestions & accessorial automation.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="overflow-y-auto p-4 md:p-6 space-y-6 text-slate-800 flex-1">
          
          {/* Section 1: Fleet & Load Calculation (Crucial Spec Requirement) */}
          <div className="bg-slate-50/60 border border-slate-200 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3 border-b border-slate-200 pb-2">
              <div className="flex items-center gap-2">
                <TruckIcon className="w-4 h-4 text-blue-600" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  1. Truck Selection & Live Load Calculator
                </span>
              </div>
              <span className="text-[11px] text-slate-500 font-mono">
                DPWH RA 8794 Anti-Overloading Verified
              </span>
            </div>

            {/* Truck Selector */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Select Truck from Fleet *
                </label>
                <select
                  value={selectedTruckId}
                  onChange={(e) => handleTruckChange(e.target.value)}
                  required
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:border-blue-500 shadow-2xs"
                >
                  <option value="">-- Choose Truck --</option>
                  {trucks.map(trk => (
                    <option key={trk.id} value={trk.id}>
                      {trk.plateNumber} — {trk.type} ({trk.brandModel}) [{trk.status}]
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Assign Licensed Driver *
                </label>
                <select
                  value={selectedDriverId}
                  onChange={(e) => setSelectedDriverId(e.target.value)}
                  required
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:border-blue-500 shadow-2xs"
                >
                  <option value="">-- Choose Driver --</option>
                  {drivers.map(drv => (
                    <option key={drv.id} value={drv.id}>
                      {drv.name} (LTO: {drv.licenseRestrictions}) [{drv.status}]
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Live Load Capacity Calculator Display Card */}
            {currentTruck && (
              <div className="bg-white border border-slate-200 rounded-xl p-3.5 space-y-3 shadow-2xs">
                {/* Truck Weight Specs Pill Row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                  <div className="bg-slate-50 p-2 rounded-lg border border-slate-200/80">
                    <div className="text-[10px] text-slate-500 uppercase font-medium">GVWR (Gross)</div>
                    <div className="font-mono font-bold text-slate-800 mt-0.5">
                      {(currentTruck.gvwrKg / 1000).toFixed(1)} MT
                    </div>
                  </div>
                  <div className="bg-slate-50 p-2 rounded-lg border border-slate-200/80">
                    <div className="text-[10px] text-slate-500 uppercase font-medium">Tare (Empty Wt)</div>
                    <div className="font-mono font-bold text-slate-800 mt-0.5">
                      {(currentTruck.tareWeightKg / 1000).toFixed(1)} MT
                    </div>
                  </div>
                  <div className="bg-blue-50 p-2 rounded-lg border border-blue-200">
                    <div className="text-[10px] text-blue-700 uppercase font-bold">Max Net Payload</div>
                    <div className="font-mono font-bold text-blue-700 mt-0.5">
                      {(netPayloadCapKg / 1000).toFixed(1)} MT ({netPayloadCapKg.toLocaleString()} kg)
                    </div>
                  </div>
                  <div className="bg-slate-50 p-2 rounded-lg border border-slate-200/80">
                    <div className="text-[10px] text-slate-500 uppercase font-medium">Max Volume</div>
                    <div className="font-mono font-bold text-slate-800 mt-0.5">
                      {currentTruck.maxVolumeCbm} CBM (m³)
                    </div>
                  </div>
                </div>

                {/* Cargo Inputs */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                  <div className="sm:col-span-1">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Cargo Weight (kg) *
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={cargoWeightKg || ''}
                        onChange={(e) => setCargoWeightKg(Number(e.target.value))}
                        required
                        className={`w-full border rounded-lg px-3 py-1.5 text-xs font-mono font-bold text-slate-900 focus:outline-none ${
                          isOverweight 
                            ? 'border-2 border-rose-500 bg-rose-50/40 text-rose-700' 
                            : 'border-slate-200 bg-slate-50 focus:bg-white focus:border-blue-500'
                        }`}
                        placeholder="e.g. 8500"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono text-slate-400">
                        kg
                      </span>
                    </div>
                  </div>

                  <div className="sm:col-span-1">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Volume (CBM / m³)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={cargoVolumeCbm || ''}
                        onChange={(e) => setCargoVolumeCbm(Number(e.target.value))}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-mono font-medium text-slate-800 focus:bg-white focus:outline-none focus:border-blue-500"
                        placeholder="e.g. 25"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono text-slate-400">
                        m³
                      </span>
                    </div>
                  </div>

                  <div className="sm:col-span-1">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Cargo Description
                    </label>
                    <input
                      type="text"
                      value={cargoDescription}
                      onChange={(e) => setCargoDescription(e.target.value)}
                      placeholder="e.g. Palletized Milo packs"
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                {/* LIVE OVERWEIGHT WARNING & GAUGE */}
                <div className="pt-2">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                      <span>Payload Gauge:</span>
                      <span className="font-mono text-slate-500">
                        {(cargoWeightKg / 1000).toFixed(2)} MT of {(netPayloadCapKg / 1000).toFixed(2)} MT
                      </span>
                    </span>
                    <span className={`font-mono font-bold text-xs ${
                      isOverweight 
                        ? 'text-rose-600' 
                        : loadPercentage > 85 
                        ? 'text-amber-600' 
                        : 'text-blue-600'
                    }`}>
                      {loadPercentage}% Capacity {isOverweight ? '(OVERWEIGHT)' : ''}
                    </span>
                  </div>

                  {/* Progress bar with color thresholds */}
                  <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden border border-slate-200">
                    <div 
                      className={`h-full rounded-full transition-all duration-300 ${
                        isOverweight 
                          ? 'bg-rose-500' 
                          : loadPercentage > 85 
                          ? 'bg-amber-500' 
                          : 'bg-blue-600'
                      }`}
                      style={{ width: `${Math.min(100, loadPercentage)}%` }}
                    />
                  </div>

                  {/* Dynamic Overweight Alert Box */}
                  {isOverweight ? (
                    <div className="mt-2.5 p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-900 flex items-start gap-2.5">
                      <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                      <div>
                        <div className="font-bold text-rose-700 flex items-center gap-2">
                          <span>CRITICAL: Cargo Exceeds Legal Net Payload Limit</span>
                          <span className="font-mono bg-rose-100 text-rose-800 px-1.5 py-0.5 rounded text-[11px] border border-rose-300 font-bold">
                            +{overweightKg.toLocaleString()} kg excess
                          </span>
                        </div>
                        <p className="text-[11px] text-rose-700/90 mt-0.5 leading-relaxed">
                          Under DPWH & LTO Anti-Overloading regulations (RA 8794), this load is subject to impoundment or fine. 
                          An automatic overweight accessorial fee of <strong>₱{overweightAmount.toLocaleString()}</strong> (@ ₱{overweightSurchargePerKg}/kg) will be appended to the trip invoice.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-1 flex items-center gap-1.5 text-[11px] text-emerald-600 font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Safe payload. Within DPWH axle load and truck manufacturer GVWR specs.</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Section 2: Client & Route Matrix */}
          <div className="bg-slate-50/60 border border-slate-200 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3 border-b border-slate-200 pb-2">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-blue-600" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  2. Client & Route Zones (Auto-Suggested Rates)
                </span>
              </div>
              {isRateAutoSuggested && (
                <span className="text-[11px] font-bold text-blue-700 flex items-center gap-1 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                  <Sparkles className="w-3 h-3 text-blue-600" />
                  Rate Card Matched
                </span>
              )}
            </div>

            {/* Client selector */}
            <div className="mb-4">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Client / Shipper *
              </label>
              <select
                value={selectedClientId}
                onChange={(e) => setSelectedClientId(e.target.value)}
                required
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:border-blue-500 shadow-2xs"
              >
                <option value="">-- Choose Client --</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name} (TIN: {c.tin}) — Terms: {c.paymentTermsDays} days
                  </option>
                ))}
              </select>
            </div>

            {/* Origin & Destination Zones */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Origin */}
              <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-2xs">
                <div className="flex items-center gap-1.5 text-emerald-700 text-xs font-bold mb-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span>ORIGIN ZONE</span>
                </div>
                <select
                  value={originZone}
                  onChange={(e) => setOriginZone(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-blue-500 mb-2"
                >
                  {zoneOptions.map(z => (
                    <option key={z} value={z}>{z}</option>
                  ))}
                </select>
                <input
                  type="text"
                  value={originAddress}
                  onChange={(e) => setOriginAddress(e.target.value)}
                  placeholder="Specific warehouse address / Gate / CFS bay..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Destination */}
              <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-2xs">
                <div className="flex items-center gap-1.5 text-blue-700 text-xs font-bold mb-2">
                  <span className="w-2 h-2 rounded-full bg-blue-500" />
                  <span>DESTINATION ZONE</span>
                </div>
                <select
                  value={destinationZone}
                  onChange={(e) => setDestinationZone(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-blue-500 mb-2"
                >
                  {zoneOptions.map(z => (
                    <option key={z} value={z}>{z}</option>
                  ))}
                </select>
                <input
                  type="text"
                  value={destinationAddress}
                  onChange={(e) => setDestinationAddress(e.target.value)}
                  placeholder="Consignee dropoff address / Plant dock..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {/* Schedule Dates */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Scheduled Loading / Pickup *
                </label>
                <input
                  type="datetime-local"
                  value={scheduledPickup}
                  onChange={(e) => setScheduledPickup(e.target.value)}
                  required
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-mono text-slate-800 focus:outline-none focus:border-blue-500 shadow-2xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Scheduled Delivery Target *
                </label>
                <input
                  type="datetime-local"
                  value={scheduledDelivery}
                  onChange={(e) => setScheduledDelivery(e.target.value)}
                  required
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-mono text-slate-800 focus:outline-none focus:border-blue-500 shadow-2xs"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Pricing & Accessorial Trigger Rules */}
          <div className="bg-slate-50/60 border border-slate-200 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3 border-b border-slate-200 pb-2">
              <div className="flex items-center gap-2">
                <Coins className="w-4 h-4 text-blue-600" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  3. Freight Rates & Accessorial Trigger Config
                </span>
              </div>
              <span className="text-[11px] text-slate-500 font-mono">
                Currency: Philippine Peso (₱ PHP)
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Base Freight Rate (₱) *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-xs">₱</span>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={baseRatePhp}
                    onChange={(e) => {
                      setBaseRatePhp(Number(e.target.value));
                      setIsRateAutoSuggested(false);
                    }}
                    required
                    className="w-full bg-white border border-slate-200 rounded-lg pl-7 pr-3 py-1.5 text-xs font-mono font-bold text-blue-600 focus:outline-none focus:border-blue-500 shadow-2xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Fuel Surcharge (FAF %)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="any"
                    value={fuelSurchargePercent}
                    onChange={(e) => setFuelSurchargePercent(Number(e.target.value))}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-mono text-slate-800 focus:outline-none focus:border-blue-500 shadow-2xs"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono text-slate-400">%</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Estimated Tollways (₱)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-xs">₱</span>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={tollEstimatePhp}
                    onChange={(e) => setTollEstimatePhp(Number(e.target.value))}
                    className="w-full bg-white border border-slate-200 rounded-lg pl-7 pr-3 py-1.5 text-xs font-mono text-slate-800 focus:outline-none focus:border-blue-500 shadow-2xs"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Multi-Stop Extra Drops (₱2,500/drop)
                </label>
                <input
                  type="number"
                  min="0"
                  max="50"
                  step="1"
                  value={multiStopCount}
                  onChange={(e) => setMultiStopCount(Number(e.target.value))}
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-mono text-slate-800 focus:outline-none focus:border-blue-500 shadow-2xs"
                  placeholder="0 (Direct delivery)"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Demurrage Rate (₱ / Hour after 2hr free)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-xs">₱</span>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={demurrageRatePerHour}
                    onChange={(e) => setDemurrageRatePerHour(Number(e.target.value))}
                    className="w-full bg-white border border-slate-200 rounded-lg pl-7 pr-3 py-1.5 text-xs font-mono text-slate-800 focus:outline-none focus:border-blue-500 shadow-2xs"
                  />
                </div>
              </div>
            </div>

            {/* Trip Estimated Total Breakdown Footer */}
            <div className="mt-4 bg-white border border-slate-200 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs shadow-2xs">
              <div className="space-y-0.5 text-slate-500">
                <div>Base: ₱{baseRatePhp.toLocaleString()} + FAF (₱{fuelAmount.toLocaleString()}) + Toll (₱{tollEstimatePhp.toLocaleString()})</div>
                {(isOverweight || multiStopCount > 0) && (
                  <div className="text-amber-600 font-medium">
                    + Overweight Surcharge (₱{overweightAmount.toLocaleString()}) + Multi-stop (₱{multiStopAmount.toLocaleString()})
                  </div>
                )}
              </div>
              <div className="text-right">
                <div className="text-[10px] text-slate-400 uppercase font-bold">Estimated Total Freight</div>
                <div className="text-lg font-mono font-black text-slate-900">
                  ₱{estimatedTotalPhp.toLocaleString()}
                </div>
              </div>
            </div>
          </div>

          {/* Trip Dispatch Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Dispatch Instructions / Security Seal / Port Gate Pass Notes
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Container seal verified #SPX-9012. Driver must enter Gate 4."
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-md bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors shadow-2xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold transition-all shadow-md active:scale-95"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Assign Driver & Dispatch</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
