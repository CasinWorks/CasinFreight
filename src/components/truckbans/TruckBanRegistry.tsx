import React, { useMemo, useState } from 'react';
import {
  Ban,
  Plus,
  Search,
  MapPin,
  Clock,
  Trash2,
  Edit3,
  X,
  Sparkles,
} from 'lucide-react';
import { useFreight } from '../../context/FreightContext';
import { TruckBan, TruckBanWindow, TruckType, Weekday } from '../../types';
import {
  WEEKDAYS,
  bansInEffectNow,
  formatBanDays,
  formatBanWindows,
} from '../../lib/truckBans';

const TRUCK_TYPES: TruckType[] = [
  '4-Wheeler Closed Van',
  '6-Wheeler Closed Van',
  '6-Wheeler Dropside/Wingvan',
  '10-Wheeler Wingvan',
  '10-Wheeler Dump Truck',
  '20ft Container Chassis',
  '40ft Container Chassis',
  'Tractor Head / 14-Wheeler',
];

const emptyWindow = (): TruckBanWindow => ({ startTime: '06:00', endTime: '10:00' });

export const TruckBanRegistry: React.FC = () => {
  const {
    truckBans,
    addTruckBan,
    updateTruckBan,
    deleteTruckBan,
    seedMetroManilaTruckBans,
    canAccess,
  } = useFreight();

  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [area, setArea] = useState('');
  const [cityOrLgu, setCityOrLgu] = useState('');
  const [roadsOrZone, setRoadsOrZone] = useState('');
  const [days, setDays] = useState<Weekday[]>(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']);
  const [windows, setWindows] = useState<TruckBanWindow[]>([emptyWindow(), { startTime: '17:00', endTime: '22:00' }]);
  const [appliesAll, setAppliesAll] = useState(true);
  const [selectedTypes, setSelectedTypes] = useState<TruckType[]>([]);
  const [exemptionNote, setExemptionNote] = useState('');
  const [notes, setNotes] = useState('');
  const [isActive, setIsActive] = useState(true);

  const canEdit = canAccess('new_trip');
  const liveNow = useMemo(() => bansInEffectNow(truckBans), [truckBans]);

  const filtered = truckBans.filter((ban) => {
    const q = search.toLowerCase();
    if (!q) return true;
    return (
      ban.name.toLowerCase().includes(q) ||
      ban.area.toLowerCase().includes(q) ||
      ban.cityOrLgu.toLowerCase().includes(q) ||
      ban.roadsOrZone.toLowerCase().includes(q)
    );
  });

  const resetForm = () => {
    setEditingId(null);
    setName('');
    setArea('');
    setCityOrLgu('Metro Manila');
    setRoadsOrZone('');
    setDays(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']);
    setWindows([emptyWindow(), { startTime: '17:00', endTime: '22:00' }]);
    setAppliesAll(true);
    setSelectedTypes([]);
    setExemptionNote('');
    setNotes('');
    setIsActive(true);
  };

  const handleOpenAdd = () => {
    resetForm();
    setShowModal(true);
  };

  const handleOpenEdit = (ban: TruckBan) => {
    setEditingId(ban.id);
    setName(ban.name);
    setArea(ban.area);
    setCityOrLgu(ban.cityOrLgu);
    setRoadsOrZone(ban.roadsOrZone);
    setDays(ban.days);
    setWindows(ban.windows.length ? ban.windows.map((window) => ({ ...window })) : [emptyWindow()]);
    setAppliesAll(ban.appliesToTruckTypes === 'ALL');
    setSelectedTypes(ban.appliesToTruckTypes === 'ALL' ? [] : [...ban.appliesToTruckTypes]);
    setExemptionNote(ban.exemptionNote || '');
    setNotes(ban.notes || '');
    setIsActive(ban.isActive);
    setShowModal(true);
  };

  const toggleDay = (day: Weekday) => {
    setDays((prev) => (prev.includes(day) ? prev.filter((item) => item !== day) : [...prev, day]));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanedWindows = windows.filter((window) => window.startTime && window.endTime);
    if (!name.trim() || !area.trim() || days.length === 0 || cleanedWindows.length === 0) return;

    const payload = {
      name: name.trim(),
      area: area.trim(),
      cityOrLgu: cityOrLgu.trim(),
      roadsOrZone: roadsOrZone.trim(),
      days: WEEKDAYS.filter((day) => days.includes(day)),
      windows: cleanedWindows,
      appliesToTruckTypes: appliesAll || selectedTypes.length === 0 ? 'ALL' as const : selectedTypes,
      exemptionNote: exemptionNote.trim() || undefined,
      notes: notes.trim() || undefined,
      isActive,
    };

    if (editingId) {
      updateTruckBan(editingId, payload);
    } else {
      addTruckBan(payload);
    }
    setShowModal(false);
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-slate-50 text-slate-900 overflow-y-auto">
      <div className="p-4 md:px-6 md:pt-6 md:pb-4 border-b border-slate-200 bg-white">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-slate-900">Truck Bans & Restricted Hours</h1>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 font-mono border border-slate-200">
                {truckBans.length} places
              </span>
              {liveNow.length > 0 && (
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 font-medium border border-amber-200">
                  {liveNow.length} in effect now
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Record LGU / MMDA truck-ban places, the area they cover, and the hours they apply. Dispatch sees a warning when a booking hits that corridor.
            </p>
          </div>

          {canEdit && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const added = seedMetroManilaTruckBans();
                  if (added === 0) {
                    window.alert('Metro Manila presets are already on this list.');
                  }
                }}
                className="flex items-center gap-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all"
              >
                <Sparkles className="w-4 h-4 stroke-[2.5]" />
                <span>Add MMDA presets</span>
              </button>
              <button
                type="button"
                onClick={handleOpenAdd}
                className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all shadow-xs active:scale-95"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>Add truck ban</span>
              </button>
            </div>
          )}
        </div>

        <div className="mt-4 max-w-sm">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search area, city, road..."
              className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="p-8 text-center text-sm text-slate-500">
          <Ban className="w-8 h-8 mx-auto text-slate-300 mb-2" />
          <p className="font-semibold text-slate-700">No truck bans recorded yet</p>
          <p className="text-xs mt-1 max-w-md mx-auto">
            Add the places your fleet cannot enter at certain hours — EDSA, C5, Makati CBD, or any LGU restriction.
          </p>
        </div>
      ) : (
        <div className="p-4 md:p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((ban) => {
            const live = liveNow.some((item) => item.id === ban.id);
            return (
              <div
                key={ban.id}
                className={`bg-white border rounded-xl p-4 space-y-3 hover:border-slate-300 transition-colors shadow-2xs text-xs ${
                  ban.isActive ? 'border-slate-200' : 'border-slate-200 opacity-70'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-bold text-slate-900 truncate">{ban.name}</div>
                    <div className="flex items-center gap-1 text-slate-600 mt-0.5">
                      <MapPin className="w-3 h-3 text-slate-400" />
                      <span className="truncate">{ban.area}{ban.cityOrLgu ? ` · ${ban.cityOrLgu}` : ''}</span>
                    </div>
                  </div>
                  <span className={`shrink-0 text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                    live
                      ? 'bg-amber-50 text-amber-800 border-amber-200'
                      : ban.isActive
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-slate-100 text-slate-500 border-slate-200'
                  }`}>
                    {live ? 'In effect now' : ban.isActive ? 'Active' : 'Off'}
                  </span>
                </div>

                {ban.roadsOrZone && (
                  <p className="text-slate-600 leading-relaxed">{ban.roadsOrZone}</p>
                )}

                <div className="flex items-center gap-1.5 text-slate-800 font-medium bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>{formatBanDays(ban.days)} · {formatBanWindows(ban.windows)}</span>
                </div>

                <div className="text-[11px] text-slate-500">
                  Applies to {ban.appliesToTruckTypes === 'ALL' ? 'all truck types' : ban.appliesToTruckTypes.join(', ')}
                </div>

                {ban.exemptionNote && (
                  <p className="text-[11px] text-slate-500 italic">{ban.exemptionNote}</p>
                )}

                {canEdit && (
                  <div className="pt-1 flex items-center justify-between gap-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => updateTruckBan(ban.id, { isActive: !ban.isActive })}
                      className="text-[11px] font-semibold text-slate-500 hover:text-slate-800"
                    >
                      {ban.isActive ? 'Turn off' : 'Turn on'}
                    </button>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(ban)}
                        className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded transition-colors text-xs flex items-center gap-1 font-medium"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Edit</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm('Delete this truck ban?')) {
                            deleteTruckBan(ban.id);
                          }
                        }}
                        className="p-1 text-slate-400 hover:text-rose-600 hover:bg-slate-100 rounded transition-colors text-xs"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg p-5 space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-150 text-xs text-slate-900 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h2 className="text-base font-bold text-slate-900">
                {editingId ? 'Edit truck ban' : 'Add truck ban'}
              </h2>
              <button type="button" onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Name *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. MMDA EDSA truck ban"
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-1.5 text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Place / corridor *</label>
                  <input
                    type="text"
                    value={area}
                    onChange={(e) => setArea(e.target.value)}
                    placeholder="e.g. EDSA"
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-1.5 text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">City / LGU *</label>
                  <input
                    type="text"
                    value={cityOrLgu}
                    onChange={(e) => setCityOrLgu(e.target.value)}
                    placeholder="e.g. Metro Manila"
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-1.5 text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Roads or area covered</label>
                <input
                  type="text"
                  value={roadsOrZone}
                  onChange={(e) => setRoadsOrZone(e.target.value)}
                  placeholder="e.g. EDSA, C5, Ortigas Ave"
                  className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-1.5 text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Separate names with commas. A trip warns when origin or destination contains one of these.
                </p>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Days *</label>
                <div className="flex flex-wrap gap-1.5">
                  {WEEKDAYS.map((day) => {
                    const on = days.includes(day);
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => toggleDay(day)}
                        className={`px-2 py-1 rounded-md border text-[11px] font-bold ${
                          on
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-semibold text-slate-700">Hours *</label>
                  <button
                    type="button"
                    onClick={() => setWindows((prev) => [...prev, emptyWindow()])}
                    className="text-[11px] font-bold text-blue-600 hover:text-blue-700"
                  >
                    + Add window
                  </button>
                </div>
                <div className="space-y-2">
                  {windows.map((window, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <input
                        type="time"
                        value={window.startTime}
                        onChange={(e) => {
                          const next = [...windows];
                          next[index] = { ...next[index], startTime: e.target.value };
                          setWindows(next);
                        }}
                        required
                        className="flex-1 bg-slate-50 border border-slate-200 rounded px-3 py-1.5 font-mono text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500"
                      />
                      <span className="text-slate-400">to</span>
                      <input
                        type="time"
                        value={window.endTime}
                        onChange={(e) => {
                          const next = [...windows];
                          next[index] = { ...next[index], endTime: e.target.value };
                          setWindows(next);
                        }}
                        required
                        className="flex-1 bg-slate-50 border border-slate-200 rounded px-3 py-1.5 font-mono text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500"
                      />
                      {windows.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setWindows((prev) => prev.filter((_, i) => i !== index))}
                          className="p-1 text-slate-400 hover:text-rose-600"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="flex items-center gap-2 font-semibold text-slate-700 mb-1">
                  <input
                    type="checkbox"
                    checked={appliesAll}
                    onChange={(e) => setAppliesAll(e.target.checked)}
                  />
                  Applies to all truck types
                </label>
                {!appliesAll && (
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {TRUCK_TYPES.map((type) => {
                      const on = selectedTypes.includes(type);
                      return (
                        <button
                          key={type}
                          type="button"
                          onClick={() => setSelectedTypes((prev) => (
                            on ? prev.filter((item) => item !== type) : [...prev, type]
                          ))}
                          className={`px-2 py-1 rounded-md border text-[10px] font-semibold ${
                            on
                              ? 'bg-slate-800 text-white border-slate-800'
                              : 'bg-white text-slate-600 border-slate-200'
                          }`}
                        >
                          {type}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Exemption / window-hour note</label>
                <input
                  type="text"
                  value={exemptionNote}
                  onChange={(e) => setExemptionNote(e.target.value)}
                  placeholder="e.g. Perishables and stickered trucks may pass"
                  className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-1.5 text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Internal notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-1.5 text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <label className="flex items-center gap-2 font-semibold text-slate-700">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                />
                Active — warn dispatchers on matching trips
              </label>

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
                  {editingId ? 'Update ban' : 'Save truck ban'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
