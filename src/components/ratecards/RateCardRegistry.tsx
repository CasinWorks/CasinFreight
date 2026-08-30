import React, { useState } from 'react';
import { 
  Tag, 
  Plus, 
  Search, 
  MapPin, 
  Truck, 
  Clock, 
  Trash2, 
  Edit3, 
  X, 
  Coins,
  ArrowRight,
  ShieldCheck
} from 'lucide-react';
import { useFreight } from '../../context/FreightContext';
import { RateCard, TruckType } from '../../types';
import { closeIfBackdrop } from '../../lib/modal';
import { FeatureHowTo } from '../help/FeatureHowTo';

export const RateCardRegistry: React.FC = () => {
  const { rateCards, addRateCard, updateRateCard, deleteRateCard, canAccess } = useFreight();

  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingCardId, setEditingCardId] = useState<string | null>(null);

  // Form State
  const [originZone, setOriginZone] = useState('North Harbor / MICT Manila');
  const [destinationZone, setDestinationZone] = useState('Laguna Technopark (Biñan/Sta. Rosa)');
  const [truckType, setTruckType] = useState<TruckType>('10-Wheeler Wingvan');
  const [baseRatePhp, setBaseRatePhp] = useState<number>(16500);
  const [tollEstimatePhp, setTollEstimatePhp] = useState<number>(1450);
  const [standardLeadHours, setStandardLeadHours] = useState<number>(4.0);

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

  const handleOpenAdd = () => {
    setEditingCardId(null);
    setOriginZone('North Harbor / MICT Manila');
    setDestinationZone('Batangas Port Container Terminal');
    setTruckType('10-Wheeler Wingvan');
    setBaseRatePhp(18000);
    setTollEstimatePhp(1650);
    setStandardLeadHours(4.5);
    setShowModal(true);
  };

  const handleOpenEdit = (rc: RateCard) => {
    setEditingCardId(rc.id);
    setOriginZone(rc.originZone);
    setDestinationZone(rc.destinationZone);
    setTruckType(rc.truckType);
    setBaseRatePhp(rc.baseRatePhp);
    setTollEstimatePhp(rc.tollEstimatePhp);
    setStandardLeadHours(rc.standardLeadHours);
    setShowModal(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingCardId) {
      updateRateCard(editingCardId, {
        originZone,
        destinationZone,
        truckType,
        baseRatePhp: Number(baseRatePhp),
        tollEstimatePhp: Number(tollEstimatePhp),
        standardLeadHours: Number(standardLeadHours),
      });
    } else {
      addRateCard({
        originZone,
        destinationZone,
        truckType,
        baseRatePhp: Number(baseRatePhp),
        tollEstimatePhp: Number(tollEstimatePhp),
        standardLeadHours: Number(standardLeadHours),
        effectiveDate: new Date().toISOString().split('T')[0],
      });
    }
    setShowModal(false);
  };

  const filteredRateCards = rateCards.filter(rc => {
    const q = search.toLowerCase();
    return !q || (
      rc.originZone.toLowerCase().includes(q) ||
      rc.destinationZone.toLowerCase().includes(q) ||
      rc.truckType.toLowerCase().includes(q)
    );
  });

  return (
    <div data-tutorial="rates-page" className="flex-1 flex flex-col min-w-0 bg-slate-50 text-slate-900 overflow-y-auto">
      {/* Header */}
      <div className="p-4 md:px-6 md:pt-6 md:pb-4 border-b border-slate-200 bg-white">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-slate-900">Zone Rate Cards & Tariffs</h1>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 font-mono border border-slate-200">
                {rateCards.length} routes
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Standardized freight lane rates by truck type. Auto-suggested when creating new trips in the load calculator.
            </p>
            <div className="mt-3 max-w-xl">
              <FeatureHowTo feature="ratecards" />
            </div>
          </div>

          {canAccess('ratecard_crud') && (
            <button
              onClick={handleOpenAdd}
              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all shadow-xs active:scale-95"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Add Rate Card</span>
            </button>
          )}
        </div>

        {/* Search */}
        <div className="mt-4 max-w-sm">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search origin, destination, vehicle type..."
              className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="p-4 md:p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredRateCards.map((rc) => (
          <div
            key={rc.id}
            className="bg-white border border-slate-200 rounded-xl p-4 space-y-3 hover:border-slate-300 transition-colors shadow-2xs text-xs"
          >
            {/* Route Lane */}
            <div className="space-y-1 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
              <div className="flex items-center gap-1.5 text-emerald-700 font-semibold truncate">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 shrink-0" />
                <span className="truncate">{rc.originZone}</span>
              </div>
              <div className="w-0.5 h-2 bg-slate-300 ml-1" />
              <div className="flex items-center gap-1.5 text-blue-700 font-semibold truncate">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0" />
                <span className="truncate">{rc.destinationZone}</span>
              </div>
            </div>

            {/* Truck Type & Lead Time */}
            <div className="flex items-center justify-between text-slate-700">
              <div className="flex items-center gap-1.5 text-slate-800 font-medium">
                <Truck className="w-3.5 h-3.5 text-slate-400" />
                <span>{rc.truckType}</span>
              </div>
              <div className="flex items-center gap-1 text-[11px] text-slate-500">
                <Clock className="w-3 h-3 text-slate-400" />
                <span>{rc.standardLeadHours}h transit</span>
              </div>
            </div>

            {/* Rates & Tolls */}
            <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2 rounded border border-slate-200 text-center">
              <div>
                <div className="text-[10px] text-slate-500 uppercase font-semibold">Base Rate</div>
                <div className="font-mono font-bold text-slate-900 text-sm mt-0.5">
                  ₱{rc.baseRatePhp.toLocaleString()}
                </div>
              </div>
              <div>
                <div className="text-[10px] text-slate-500 uppercase font-semibold">Est. Tollway Pass</div>
                <div className="font-mono font-bold text-slate-600 text-sm mt-0.5">
                  ₱{rc.tollEstimatePhp.toLocaleString()}
                </div>
              </div>
            </div>

            {/* Actions */}
            {canAccess('ratecard_crud') && (
              <div className="pt-1 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  onClick={() => handleOpenEdit(rc)}
                  className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded transition-colors text-xs flex items-center gap-1 font-medium"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit Rate</span>
                </button>
                <button
                  onClick={() => {
                    if (window.confirm('Delete this rate card?')) {
                      deleteRateCard(rc.id);
                    }
                  }}
                  className="p-1 text-slate-400 hover:text-rose-600 hover:bg-slate-100 rounded transition-colors text-xs"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Add / Edit Rate Card Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4" onClick={closeIfBackdrop(() => setShowModal(false))}>
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md p-5 space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-150 text-xs text-slate-900">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h2 className="text-base font-bold text-slate-900">
                {editingCardId ? 'Edit Rate Card' : 'Create Route Rate Card'}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Origin Zone / Hub *</label>
                <input
                  type="text"
                  value={originZone}
                  onChange={(e) => setOriginZone(e.target.value)}
                  placeholder="e.g. North Harbor / MICT Manila"
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-1.5 text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Destination Zone *</label>
                <input
                  type="text"
                  value={destinationZone}
                  onChange={(e) => setDestinationZone(e.target.value)}
                  placeholder="e.g. Laguna Technopark (Biñan/Sta. Rosa)"
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-1.5 text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Truck Configuration *</label>
                <select
                  value={truckType}
                  onChange={(e) => setTruckType(e.target.value as TruckType)}
                  className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-1.5 text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500"
                >
                  {TRUCK_TYPES.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Base Freight Rate (₱) *</label>
                  <input
                    type="number"
                    step="100"
                    value={baseRatePhp}
                    onChange={(e) => setBaseRatePhp(Number(e.target.value))}
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-1.5 text-slate-900 font-mono font-bold focus:bg-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Estimated Tollway (₱)</label>
                  <input
                    type="number"
                    step="50"
                    value={tollEstimatePhp}
                    onChange={(e) => setTollEstimatePhp(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-1.5 text-slate-900 font-mono focus:bg-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Standard Transit Lead Hours</label>
                <input
                  type="number"
                  step="0.5"
                  value={standardLeadHours}
                  onChange={(e) => setStandardLeadHours(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-1.5 text-slate-900 font-mono focus:bg-white focus:outline-none focus:border-blue-500"
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
                  {editingCardId ? 'Update Rate' : 'Save Rate Card'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
