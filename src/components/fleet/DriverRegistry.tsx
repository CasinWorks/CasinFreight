import React, { useState } from 'react';
import { 
  Users, 
  Plus, 
  Search, 
  Phone, 
  CreditCard, 
  Truck, 
  Star, 
  CheckCircle2, 
  Edit3, 
  Trash2, 
  X,
  ShieldCheck,
  AlertTriangle
} from 'lucide-react';
import { useFreight } from '../../context/FreightContext';
import { Driver, DriverStatus } from '../../types';

export const DriverRegistry: React.FC = () => {
  const { drivers, trucks, addDriver, updateDriver, deleteDriver, approveDriver, canAccess } = useFreight();

  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingDriverId, setEditingDriverId] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [licenseNo, setLicenseNo] = useState('');
  const [licenseRestrictions, setLicenseRestrictions] = useState('1, 2, 3 (Heavy Commercial)');
  const [licenseExpiry, setLicenseExpiry] = useState('2028-12-31');
  const [assignedTruckId, setAssignedTruckId] = useState('');
  const [status, setStatus] = useState<DriverStatus>('Available');
  const [emergencyContact, setEmergencyContact] = useState('');

  const handleOpenAdd = () => {
    setEditingDriverId(null);
    setName('');
    setPhone('+63 9');
    setLicenseNo('N01-');
    setLicenseRestrictions('1, 2, 3 (Heavy Trucks)');
    setLicenseExpiry('2028-12-31');
    setAssignedTruckId('');
    setStatus('Available');
    setEmergencyContact('');
    setShowModal(true);
  };

  const handleOpenEdit = (drv: Driver) => {
    setEditingDriverId(drv.id);
    setName(drv.name);
    setPhone(drv.phone);
    setLicenseNo(drv.licenseNo);
    setLicenseRestrictions(drv.licenseRestrictions);
    setLicenseExpiry(drv.licenseExpiry);
    setAssignedTruckId(drv.assignedTruckId || '');
    setStatus(drv.status);
    setEmergencyContact(drv.emergencyContact);
    setShowModal(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !licenseNo.trim()) {
      alert('Please fill out the driver name and license number.');
      return;
    }

    if (editingDriverId) {
      updateDriver(editingDriverId, {
        name,
        phone,
        licenseNo,
        licenseRestrictions,
        licenseExpiry,
        assignedTruckId: assignedTruckId || undefined,
        status,
        emergencyContact,
      });
    } else {
      addDriver({
        name,
        phone,
        licenseNo,
        licenseRestrictions,
        licenseExpiry,
        assignedTruckId: assignedTruckId || undefined,
        status,
        emergencyContact,
      });
    }
    setShowModal(false);
  };

  const filteredDrivers = drivers.filter(drv => {
    const q = search.toLowerCase();
    return !q || (
      drv.name.toLowerCase().includes(q) ||
      drv.licenseNo.toLowerCase().includes(q) ||
      drv.phone.toLowerCase().includes(q)
    );
  });

  return (
    <div data-tutorial="drivers-page" className="flex-1 flex flex-col min-w-0 bg-slate-50 text-slate-900 overflow-y-auto">
      {/* Header */}
      <div className="p-4 md:px-6 md:pt-6 md:pb-4 border-b border-slate-200 bg-white">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-slate-900">Driver Roster & Licensing</h1>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 font-mono border border-slate-200">
                {drivers.length} drivers
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Philippine Land Transportation Office (LTO) professional licenses, restriction codes & truck assignments.
            </p>
          </div>

          {canAccess('driver_crud') && (
            <button
              onClick={handleOpenAdd}
              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all shadow-xs active:scale-95"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Add Driver</span>
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
              placeholder="Search driver name, license, contact..."
              className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="p-4 md:p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredDrivers.map((drv) => {
          const assignedTruck = trucks.find(t => t.id === drv.assignedTruckId);

          return (
            <div
              key={drv.id}
              className="bg-white border border-slate-200 rounded-xl p-4 space-y-3 hover:border-slate-300 transition-colors shadow-2xs"
            >
              {/* Card Top */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center font-bold text-blue-600 text-sm shadow-2xs">
                    {drv.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">{drv.name}</h3>
                    <div className="flex items-center gap-1 text-[11px] text-slate-500">
                      <Phone className="w-3 h-3 text-slate-400" />
                      <span className="font-mono">{drv.phone}</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-1">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    drv.status === 'Available' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                    drv.status === 'On Duty' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                    'bg-slate-100 text-slate-600 border-slate-200'
                  }`}>
                    {drv.status}
                  </span>

                  {drv.approvalStatus === 'Pending' ? (
                    <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-50 text-amber-700 border border-amber-200">
                      Pending Approval
                    </span>
                  ) : (
                    <span className="text-[9px] font-medium px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                      ✓ Approved
                    </span>
                  )}
                </div>
              </div>

              {/* LTO License Specs */}
              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 space-y-1.5 text-xs">
                <div className="flex items-center justify-between text-slate-600">
                  <span>LTO License No:</span>
                  <span className="font-mono font-bold text-slate-900">{drv.licenseNo}</span>
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span>Restrictions:</span>
                  <span className="font-medium text-blue-700">{drv.licenseRestrictions}</span>
                </div>
                <div className="flex items-center justify-between text-slate-400 text-[10px]">
                  <span>Expiry Date:</span>
                  <span className="font-mono text-slate-600">{drv.licenseExpiry}</span>
                </div>
              </div>

              {/* Assigned Truck */}
              <div className="flex items-center justify-between text-xs text-slate-700 bg-slate-50 p-2 rounded border border-slate-200">
                <div className="flex items-center gap-1.5">
                  <Truck className="w-3.5 h-3.5 text-slate-400" />
                  <span>Assigned Truck:</span>
                </div>
                <span className="font-mono font-bold text-slate-900">
                  {assignedTruck ? `${assignedTruck.plateNumber} (${assignedTruck.type.split(' ')[0]})` : 'Rotating Pool'}
                </span>
              </div>

              {/* Stats & Actions */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                <div className="flex items-center gap-1 text-amber-500">
                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  <span className="font-bold text-[11px] text-slate-800">{drv.rating}</span>
                  <span className="text-slate-400 text-[10px]">({drv.totalTripsCompleted} trips)</span>
                </div>

                {canAccess('driver_crud') && (
                  <div className="flex items-center gap-1.5">
                    {drv.approvalStatus === 'Pending' && (
                      <button
                        onClick={() => approveDriver(drv.id)}
                        className="px-2 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded text-[11px] font-bold transition-colors shadow-2xs flex items-center gap-1"
                        title="Approve driver application"
                      >
                        <ShieldCheck className="w-3 h-3" />
                        <span>Approve</span>
                      </button>
                    )}
                    <button
                      onClick={() => handleOpenEdit(drv)}
                      className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded transition-colors text-xs flex items-center gap-1 font-medium"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>
                    <button
                      onClick={() => {
                        if (window.confirm(`Remove driver ${drv.name}?`)) {
                          deleteDriver(drv.id);
                        }
                      }}
                      className="p-1 text-slate-400 hover:text-rose-600 hover:bg-slate-100 rounded transition-colors text-xs"
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

      {/* Add / Edit Driver Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md p-5 space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-150 text-xs text-slate-900">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h2 className="text-base font-bold text-slate-900">
                {editingDriverId ? 'Edit Driver Details' : 'Add New Driver to Roster'}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Driver Full Name *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Edgardo Ramos"
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-1.5 text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Mobile Phone *</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+63 9..."
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-1.5 text-slate-900 font-mono focus:bg-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">LTO License No. *</label>
                  <input
                    type="text"
                    value={licenseNo}
                    onChange={(e) => setLicenseNo(e.target.value)}
                    placeholder="e.g. N02-14-089421"
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-1.5 text-slate-900 font-mono focus:bg-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Restriction Codes</label>
                  <input
                    type="text"
                    value={licenseRestrictions}
                    onChange={(e) => setLicenseRestrictions(e.target.value)}
                    placeholder="1, 2, 3, 8"
                    className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-1.5 text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">License Expiry</label>
                  <input
                    type="date"
                    value={licenseExpiry}
                    onChange={(e) => setLicenseExpiry(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-1.5 text-slate-900 font-mono focus:bg-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Assigned Truck</label>
                  <select
                    value={assignedTruckId}
                    onChange={(e) => setAssignedTruckId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-1.5 text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="">-- Rotating Pool --</option>
                    {trucks.map(t => (
                      <option key={t.id} value={t.id}>{t.plateNumber} ({t.type.split(' ')[0]})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Duty Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as DriverStatus)}
                    className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-1.5 text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="Available">Available</option>
                    <option value="On Duty">On Duty</option>
                    <option value="Off Duty">Off Duty</option>
                    <option value="Leave">On Leave</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Emergency Contact & Relationship</label>
                <input
                  type="text"
                  value={emergencyContact}
                  onChange={(e) => setEmergencyContact(e.target.value)}
                  placeholder="e.g. Maria Ramos (Wife) - 0917-888-0000"
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
                  {editingDriverId ? 'Update Driver' : 'Save Driver'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
