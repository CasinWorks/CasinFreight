import React, { useState } from 'react';
import { 
  Truck as TruckIcon, 
  Plus, 
  Search, 
  Scale, 
  Wrench, 
  CheckCircle2, 
  AlertCircle, 
  Trash2, 
  Edit3, 
  X, 
  Fuel, 
  Calendar,
  Layers,
  Gauge,
  BarChart3,
  TrendingUp,
  DollarSign
} from 'lucide-react';
import { useFreight, getTargetKmPerLiter } from '../../context/FreightContext';
import { Truck, TruckType, TruckStatus, FuelLog } from '../../types';
import { FuelLogModal } from './FuelLogModal';
import { TruckFuelDetailModal } from './TruckFuelDetailModal';
import { FuelAnalyticsDashboard } from './FuelAnalyticsDashboard';

export const TruckRegistry: React.FC = () => {
  const { 
    trucks, 
    drivers, 
    addTruck, 
    updateTruck, 
    deleteTruck, 
    canAccess, 
    canLogFuel,
    getTruckFuelSummary,
    canAddTruck,
    setIsUpgradeModalOpen,
  } = useFreight();

  // Tab View Switch: Fleet Overview vs Fuel Analytics
  const [viewMode, setViewMode] = useState<'FLEET' | 'FUEL'>('FLEET');

  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [showModal, setShowModal] = useState(false);
  const [editingTruckId, setEditingTruckId] = useState<string | null>(null);

  // Fuel Modals State
  const [isFuelLogModalOpen, setIsFuelLogModalOpen] = useState<boolean>(false);
  const [isTruckFuelDetailModalOpen, setIsTruckFuelDetailModalOpen] = useState<boolean>(false);
  const [selectedTruckForDetail, setSelectedTruckForDetail] = useState<Truck | null>(null);
  const [selectedTruckIdForFuel, setSelectedTruckIdForFuel] = useState<string | undefined>(undefined);
  const [editingFuelLog, setEditingFuelLog] = useState<FuelLog | null>(null);

  // Form State
  const [plateNumber, setPlateNumber] = useState('');
  const [type, setType] = useState<TruckType>('10-Wheeler Wingvan');
  const [brandModel, setBrandModel] = useState('Isuzu Giga CYZ52');
  const [gvwrKg, setGvwrKg] = useState<number>(26000);
  const [tareWeightKg, setTareWeightKg] = useState<number>(10500);
  const [maxVolumeCbm, setMaxVolumeCbm] = useState<number>(55);
  const [status, setStatus] = useState<TruckStatus>('Available');
  const [assignedDriverId, setAssignedDriverId] = useState<string>('');
  const [yearModel, setYearModel] = useState<number>(2022);
  const [fuelType, setFuelType] = useState<'Diesel' | 'Euro 4 Diesel'>('Euro 4 Diesel');
  const [lastOdometerKm, setLastOdometerKm] = useState<number>(95000);
  const [maintenanceNote, setMaintenanceNote] = useState<string>('');

  const TRUCK_TYPES: TruckType[] = [
    '4-Wheeler Closed Van',
    '6-Wheeler Closed Van',
    '6-Wheeler Dropside/Wingvan',
    '10-Wheeler Wingvan',
    '10-Wheeler Dump Truck',
    '20ft Container Chassis',
    '40ft Container Chassis',
    'Tractor Head / 14-Wheeler'
  ];

  // Auto preset weights when type changes
  const handleTypeChange = (newType: TruckType) => {
    setType(newType);
    switch (newType) {
      case '4-Wheeler Closed Van':
        setGvwrKg(4400);
        setTareWeightKg(2100);
        setMaxVolumeCbm(14);
        break;
      case '6-Wheeler Closed Van':
        setGvwrKg(8500);
        setTareWeightKg(3800);
        setMaxVolumeCbm(26);
        break;
      case '6-Wheeler Dropside/Wingvan':
        setGvwrKg(11000);
        setTareWeightKg(4400);
        setMaxVolumeCbm(32);
        break;
      case '10-Wheeler Wingvan':
        setGvwrKg(26000);
        setTareWeightKg(10500);
        setMaxVolumeCbm(58);
        break;
      case '10-Wheeler Dump Truck':
        setGvwrKg(28000);
        setTareWeightKg(12000);
        setMaxVolumeCbm(20);
        break;
      case '20ft Container Chassis':
        setGvwrKg(32000);
        setTareWeightKg(11000);
        setMaxVolumeCbm(33);
        break;
      case '40ft Container Chassis':
        setGvwrKg(42000);
        setTareWeightKg(14200);
        setMaxVolumeCbm(67);
        break;
      case 'Tractor Head / 14-Wheeler':
        setGvwrKg(48000);
        setTareWeightKg(15500);
        setMaxVolumeCbm(72);
        break;
    }
  };

  const handleOpenAdd = () => {
    if (!canAddTruck) {
      setIsUpgradeModalOpen(true);
      return;
    }
    setEditingTruckId(null);
    setPlateNumber('');
    handleTypeChange('10-Wheeler Wingvan');
    setBrandModel('Isuzu Giga CYZ52');
    setStatus('Available');
    setAssignedDriverId('');
    setYearModel(2022);
    setMaintenanceNote('');
    setShowModal(true);
  };

  const handleOpenEdit = (trk: Truck) => {
    setEditingTruckId(trk.id);
    setPlateNumber(trk.plateNumber);
    setType(trk.type);
    setBrandModel(trk.brandModel);
    setGvwrKg(trk.gvwrKg);
    setTareWeightKg(trk.tareWeightKg);
    setMaxVolumeCbm(trk.maxVolumeCbm);
    setStatus(trk.status);
    setAssignedDriverId(trk.assignedDriverId || '');
    setYearModel(trk.yearModel);
    setFuelType(trk.fuelType);
    setLastOdometerKm(trk.lastOdometerKm);
    setMaintenanceNote(trk.maintenanceNote || '');
    setShowModal(true);
  };

  // Fuel modal handlers
  const handleOpenAddFuel = (truckId?: string) => {
    setSelectedTruckIdForFuel(truckId);
    setEditingFuelLog(null);
    setIsFuelLogModalOpen(true);
  };

  const handleOpenEditFuel = (log: FuelLog) => {
    setEditingFuelLog(log);
    setSelectedTruckIdForFuel(log.truckId);
    setIsFuelLogModalOpen(true);
  };

  const handleOpenTruckFuelDetail = (trk: Truck) => {
    setSelectedTruckForDetail(trk);
    setIsTruckFuelDetailModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!plateNumber.trim()) {
      alert('Please enter a valid LTO Plate Number.');
      return;
    }

    if (editingTruckId) {
      updateTruck(editingTruckId, {
        plateNumber,
        type,
        brandModel,
        gvwrKg: Number(gvwrKg),
        tareWeightKg: Number(tareWeightKg),
        maxVolumeCbm: Number(maxVolumeCbm),
        status,
        assignedDriverId: assignedDriverId || undefined,
        yearModel: Number(yearModel),
        fuelType,
        lastOdometerKm: Number(lastOdometerKm),
        maintenanceNote: maintenanceNote || undefined,
      });
    } else {
      addTruck({
        plateNumber,
        type,
        brandModel,
        gvwrKg: Number(gvwrKg),
        tareWeightKg: Number(tareWeightKg),
        maxVolumeCbm: Number(maxVolumeCbm),
        status,
        assignedDriverId: assignedDriverId || undefined,
        yearModel: Number(yearModel),
        fuelType,
        lastOdometerKm: Number(lastOdometerKm),
        maintenanceNote: maintenanceNote || undefined,
      });
    }
    setShowModal(false);
  };

  const filteredTrucks = trucks.filter(trk => {
    const matchesSearch = !search || (
      trk.plateNumber.toLowerCase().includes(search.toLowerCase()) ||
      trk.brandModel.toLowerCase().includes(search.toLowerCase())
    );
    const matchesType = selectedType === 'ALL' || trk.type === selectedType;
    return matchesSearch && matchesType;
  });

  const netPayloadCalculated = Math.max(0, gvwrKg - tareWeightKg);
  const canLog = canLogFuel().allowed;

  return (
    <div data-tutorial="trucks-page" className="flex-1 flex flex-col min-w-0 bg-slate-50 text-slate-900 overflow-y-auto">
      
      {/* Header */}
      <div className="p-4 md:px-6 md:pt-6 md:pb-4 border-b border-slate-200 bg-white">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-slate-900">
                Truck & Fleet Registry
              </h1>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 font-mono border border-slate-200">
                {trucks.length} vehicles
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Manage tare weights, GVWR capacities, fuel expenses, and calculate average kilometers-per-liter (km/L).
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {canLog && (
              <button
                onClick={() => handleOpenAddFuel()}
                className="flex items-center gap-1.5 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all shadow-xs active:scale-95"
              >
                <Fuel className="w-4 h-4 stroke-[2.5]" />
                <span>Log Fuel Fill-Up</span>
              </button>
            )}

            {canAccess('truck_crud') && (
              <button
                data-tutorial="add-truck-btn"
                onClick={handleOpenAdd}
                className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all shadow-xs active:scale-95"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>Add New Truck</span>
              </button>
            )}
          </div>
        </div>

        {/* View Switcher Tabs & Filters */}
        <div className="mt-4 flex flex-col md:flex-row md:items-center justify-between gap-3 border-t border-slate-100 pt-3">
          
          {/* Tab buttons */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 w-fit">
            <button
              onClick={() => setViewMode('FLEET')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'FLEET'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <TruckIcon className="w-3.5 h-3.5 text-blue-600" />
              <span>Fleet & Weight Specs</span>
            </button>

            <button
              onClick={() => setViewMode('FUEL')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'FUEL'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Fuel className="w-3.5 h-3.5 text-amber-600" />
              <span>Fuel Consumption & KM/L Tracking</span>
              <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-1.5 py-0.2 rounded-full">
                New
              </span>
            </button>
          </div>

          {/* Search & Config Filter (Only in Fleet Mode) */}
          {viewMode === 'FLEET' && (
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative min-w-[200px] max-w-sm">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search plate number, model..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-700 focus:bg-white focus:outline-none focus:border-blue-500"
              >
                <option value="ALL">All Configurations ({trucks.length})</option>
                {TRUCK_TYPES.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="p-4 md:p-6">
        {viewMode === 'FUEL' ? (
          <FuelAnalyticsDashboard 
            onOpenAddFuel={handleOpenAddFuel}
            onOpenTruckFuelDetail={handleOpenTruckFuelDetail}
            onOpenEditFuel={handleOpenEditFuel}
          />
        ) : (
          /* Fleet Cards Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredTrucks.map((trk) => {
              const assignedDriver = drivers.find(d => d.id === trk.assignedDriverId);
              const fuelSummary = getTruckFuelSummary(trk.id);
              const isOptimal = fuelSummary.efficiencyRating === 'Optimal';
              const isNormal = fuelSummary.efficiencyRating === 'Normal';

              return (
                <div
                  key={trk.id}
                  className="bg-white border border-slate-200 rounded-xl p-4 space-y-3 hover:border-slate-300 transition-colors shadow-2xs flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    {/* Card Top */}
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center font-bold text-blue-600 shadow-2xs">
                          <TruckIcon className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="font-mono text-base font-black text-slate-900 tracking-wide">
                            {trk.plateNumber}
                          </div>
                          <div className="text-xs text-slate-500 font-medium">
                            {trk.brandModel} ({trk.yearModel})
                          </div>
                        </div>
                      </div>

                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        trk.status === 'Available' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                        trk.status === 'On Trip' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                        trk.status === 'Loading' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                        'bg-rose-50 text-rose-700 border-rose-200'
                      }`}>
                        {trk.status}
                      </span>
                    </div>

                    {/* Truck Configuration Pill */}
                    <div className="text-xs font-semibold text-slate-700 bg-slate-50 p-2 rounded-lg border border-slate-200 flex items-center justify-between">
                      <span>{trk.type}</span>
                      <span className="text-[10px] font-mono text-slate-400">{trk.fuelType}</span>
                    </div>

                    {/* Weight Breakdown Box (Spec Net Payload = GVWR - Tare) */}
                    <div className="grid grid-cols-3 gap-2 text-center text-xs">
                      <div className="bg-slate-50 p-2 rounded border border-slate-200">
                        <div className="text-[9px] uppercase text-slate-400 font-bold">GVWR</div>
                        <div className="font-mono font-semibold text-slate-800 mt-0.5">
                          {(trk.gvwrKg / 1000).toFixed(1)} MT
                        </div>
                      </div>
                      <div className="bg-slate-50 p-2 rounded border border-slate-200">
                        <div className="text-[9px] uppercase text-slate-400 font-bold">Tare</div>
                        <div className="font-mono font-semibold text-slate-800 mt-0.5">
                          {(trk.tareWeightKg / 1000).toFixed(1)} MT
                        </div>
                      </div>
                      <div className="bg-blue-50/60 p-2 rounded border border-blue-200">
                        <div className="text-[9px] uppercase text-blue-700 font-bold">Net Payload</div>
                        <div className="font-mono font-black text-blue-700 mt-0.5">
                          {(trk.netPayloadKg / 1000).toFixed(1)} MT
                        </div>
                      </div>
                    </div>

                    {/* Fuel Consumption & Efficiency Summary Widget */}
                    <div className="bg-gradient-to-r from-amber-50/60 via-slate-50 to-blue-50/40 p-2.5 rounded-lg border border-amber-200/80 space-y-1.5">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-bold text-slate-800 flex items-center gap-1">
                          <Fuel className="w-3.5 h-3.5 text-amber-600" />
                          Fuel Economy
                        </span>
                        <button
                          onClick={() => handleOpenTruckFuelDetail(trk)}
                          className="text-[10px] font-bold text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-0.5"
                        >
                          <span>{fuelSummary.totalLogs} logs</span>
                          <span>→</span>
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="bg-white/80 border border-slate-200/80 rounded p-1.5 flex items-baseline justify-between">
                          <span className="text-[10px] text-slate-500 font-medium">Avg KM/L:</span>
                          <span className="font-mono font-bold text-slate-900">
                            {fuelSummary.avgKmPerLiter > 0 ? `${fuelSummary.avgKmPerLiter} km/L` : 'No data'}
                          </span>
                        </div>
                        <div className="bg-white/80 border border-slate-200/80 rounded p-1.5 flex items-baseline justify-between">
                          <span className="text-[10px] text-slate-500 font-medium">Cost / KM:</span>
                          <span className="font-mono font-bold text-emerald-700">
                            {fuelSummary.avgCostPerKmPhp > 0 ? `₱${fuelSummary.avgCostPerKmPhp}` : '--'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[10px] pt-1">
                        <span className={`font-semibold px-2 py-0.5 rounded-full border ${
                          isOptimal ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                          isNormal ? 'bg-blue-50 text-blue-700 border-blue-200' :
                          'bg-amber-50 text-amber-700 border-amber-200'
                        }`}>
                          {isOptimal ? '⚡ Optimal' : isNormal ? '✓ Normal' : '⚠️ Low Efficiency'} (Target: {fuelSummary.targetKmPerLiter} km/L)
                        </span>

                        {canLog && (
                          <button
                            onClick={() => handleOpenAddFuel(trk.id)}
                            className="text-amber-700 hover:text-amber-900 font-bold flex items-center gap-0.5 hover:underline"
                          >
                            + Log Fuel
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Driver & Odometer */}
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                      <div>
                        Driver: <strong className="text-slate-800">{assignedDriver ? assignedDriver.name.split(' ')[0] : 'Unassigned'}</strong>
                      </div>
                      <div className="font-mono text-[11px]">
                        {trk.lastOdometerKm.toLocaleString()} km
                      </div>
                    </div>

                    {trk.maintenanceNote && (
                      <div className="text-[10px] text-amber-800 bg-amber-50 border border-amber-200 p-1.5 rounded">
                        ⚠️ {trk.maintenanceNote}
                      </div>
                    )}
                  </div>

                  {/* Edit / Delete / Fuel History actions */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                    <button
                      onClick={() => handleOpenTruckFuelDetail(trk)}
                      className="text-xs text-slate-600 hover:text-blue-700 font-semibold flex items-center gap-1"
                    >
                      <BarChart3 className="w-3.5 h-3.5 text-blue-600" />
                      <span>Fuel Details</span>
                    </button>

                    {canAccess('truck_crud') && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleOpenEdit(trk)}
                          className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded transition-colors text-xs flex items-center gap-1 font-medium"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Edit Specs</span>
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm(`Delete truck ${trk.plateNumber}?`)) {
                              deleteTruck(trk.id);
                            }
                          }}
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-slate-100 rounded transition-colors text-xs"
                          title="Delete truck"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add / Edit Truck Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg p-5 space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-150 text-xs text-slate-900">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h2 className="text-base font-bold text-slate-900">
                {editingTruckId ? 'Edit Truck Specifications' : 'Register New Fleet Truck'}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">LTO Plate Number *</label>
                  <input
                    type="text"
                    value={plateNumber}
                    onChange={(e) => setPlateNumber(e.target.value.toUpperCase())}
                    placeholder="e.g. CBC 4821"
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-1.5 text-slate-900 font-mono font-bold focus:bg-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Vehicle Type / Configuration *</label>
                  <select
                    value={type}
                    onChange={(e) => handleTypeChange(e.target.value as TruckType)}
                    className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-1.5 text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500"
                  >
                    {TRUCK_TYPES.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Make & Model</label>
                  <input
                    type="text"
                    value={brandModel}
                    onChange={(e) => setBrandModel(e.target.value)}
                    placeholder="e.g. Isuzu Giga 6UZ1"
                    className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-1.5 text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Year Model</label>
                  <input
                    type="number"
                    value={yearModel}
                    onChange={(e) => setYearModel(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-1.5 text-slate-900 font-mono focus:bg-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Weight Inputs (GVWR, Tare, Net Payload) */}
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-3">
                <div className="text-[10px] font-bold text-slate-500 uppercase">
                  Weight Ratings & Legal Payload (kg)
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[10px] text-slate-500 mb-1">GVWR (Gross kg)</label>
                    <input
                      type="number"
                      step="100"
                      value={gvwrKg}
                      onChange={(e) => setGvwrKg(Number(e.target.value))}
                      required
                      className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-slate-900 font-mono focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 mb-1">Tare (Empty kg)</label>
                    <input
                      type="number"
                      step="100"
                      value={tareWeightKg}
                      onChange={(e) => setTareWeightKg(Number(e.target.value))}
                      required
                      className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-slate-900 font-mono focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-blue-700 mb-1 font-bold">Net Payload</label>
                    <div className="bg-white border border-blue-200 rounded px-2 py-1 text-blue-700 font-mono font-bold">
                      {netPayloadCalculated.toLocaleString()} kg
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Assigned Driver</label>
                  <select
                    value={assignedDriverId}
                    onChange={(e) => setAssignedDriverId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-1.5 text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="">-- None (Rotate) --</option>
                    {drivers.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as TruckStatus)}
                    className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-1.5 text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="Available">Available</option>
                    <option value="On Trip">On Trip</option>
                    <option value="Loading">Loading</option>
                    <option value="Maintenance">Maintenance</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Maintenance / Repair Note</label>
                <input
                  type="text"
                  value={maintenanceNote}
                  onChange={(e) => setMaintenanceNote(e.target.value)}
                  placeholder="e.g. Brake pad check due next week"
                  className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-1.5 text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-3 py-1.5 rounded bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded bg-blue-600 hover:bg-blue-700 text-white font-bold"
                >
                  {editingTruckId ? 'Update Specs' : 'Save Truck'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Fuel Log Modal (Add / Edit) */}
      <FuelLogModal
        isOpen={isFuelLogModalOpen}
        onClose={() => {
          setIsFuelLogModalOpen(false);
          setEditingFuelLog(null);
        }}
        initialTruckId={selectedTruckIdForFuel}
        editingLog={editingFuelLog}
      />

      {/* Truck Fuel Detail & History Modal */}
      {selectedTruckForDetail && (
        <TruckFuelDetailModal
          isOpen={isTruckFuelDetailModalOpen}
          onClose={() => {
            setIsTruckFuelDetailModalOpen(false);
            setSelectedTruckForDetail(null);
          }}
          truck={selectedTruckForDetail}
          onOpenAddFuel={(trkId) => {
            setIsTruckFuelDetailModalOpen(false);
            handleOpenAddFuel(trkId);
          }}
          onOpenEditFuel={(log) => {
            setIsTruckFuelDetailModalOpen(false);
            handleOpenEditFuel(log);
          }}
        />
      )}

    </div>
  );
};
