import React, { useState, useEffect } from 'react';
import { 
  X, 
  ShieldCheck, 
  Check, 
  Sparkles, 
  Lock, 
  HelpCircle, 
  Layers, 
  CheckSquare, 
  Square,
  AlertCircle
} from 'lucide-react';
import { RbacRole, RbacPermission, SYSTEM_PERMISSIONS, PermissionCategory } from '../../types/rbac';
import { closeIfBackdrop } from '../../lib/modal';

interface RoleEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  roleToEdit?: RbacRole | null;
  onSaveRole: (roleData: {
    id?: string;
    name: string;
    description: string;
    color: RbacRole['color'];
    permissions: string[];
    isSystem: boolean;
  }) => void;
}

const CATEGORY_META: Record<PermissionCategory, { label: string; icon: string; description: string }> = {
  operations: {
    label: 'Trip Operations & Waybill Flow',
    icon: '📦',
    description: 'Waybill issuance, cargo tare weight, transit dispatch, and e-POD',
  },
  fleet: {
    label: 'Fleet & Driver Compliance',
    icon: '🚛',
    description: 'Vehicle registry, GVWR specifications, driver roster, and LTO licenses',
  },
  fuel: {
    label: 'Fuel Analytics & KM/L Audit',
    icon: '⛽',
    description: 'Pump receipts, odometer entries, consumption tracking, and expense auditing',
  },
  billing: {
    label: 'BIR Billing & 12% VAT Invoices',
    icon: '🧾',
    description: 'Itemized sales invoices, accessorial billing, 2307 reconciliation, and retractions',
  },
  ledger: {
    label: 'General Ledger & Financial Books',
    icon: '📚',
    description: 'Chart of accounts, debit/credit journal vouchers, and live trial balance',
  },
  tariffs: {
    label: 'Rate Cards & Luzon Zones',
    icon: '🏷️',
    description: 'Port-to-destination tariffs, drop surcharges, and client contract rates',
  },
  admin: {
    label: 'Executive & RBAC Administration',
    icon: '👑',
    description: 'Executive dashboard, company settings, and user permission management',
  },
};

const COLOR_OPTIONS: Array<{ value: RbacRole['color']; label: string; bgClass: string; borderClass: string; textClass: string }> = [
  { value: 'blue', label: 'Ocean Blue', bgClass: 'bg-blue-50', borderClass: 'border-blue-400', textClass: 'text-blue-700' },
  { value: 'indigo', label: 'Executive Indigo', bgClass: 'bg-indigo-50', borderClass: 'border-indigo-400', textClass: 'text-indigo-700' },
  { value: 'purple', label: 'Royal Purple', bgClass: 'bg-purple-50', borderClass: 'border-purple-400', textClass: 'text-purple-700' },
  { value: 'emerald', label: 'Emerald Green', bgClass: 'bg-emerald-50', borderClass: 'border-emerald-400', textClass: 'text-emerald-700' },
  { value: 'amber', label: 'Amber Gold', bgClass: 'bg-amber-50', borderClass: 'border-amber-400', textClass: 'text-amber-700' },
  { value: 'rose', label: 'Crimson Rose', bgClass: 'bg-rose-50', borderClass: 'border-rose-400', textClass: 'text-rose-700' },
  { value: 'cyan', label: 'Cyan Teal', bgClass: 'bg-cyan-50', borderClass: 'border-cyan-400', textClass: 'text-cyan-700' },
  { value: 'orange', label: 'Sunset Orange', bgClass: 'bg-orange-50', borderClass: 'border-orange-400', textClass: 'text-orange-700' },
  { value: 'slate', label: 'Steel Slate', bgClass: 'bg-slate-50', borderClass: 'border-slate-400', textClass: 'text-slate-700' },
];

export const RoleEditorModal: React.FC<RoleEditorModalProps> = ({
  isOpen,
  onClose,
  roleToEdit,
  onSaveRole,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState<RbacRole['color']>('blue');
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (roleToEdit) {
      setName(roleToEdit.name);
      setDescription(roleToEdit.description);
      setColor(roleToEdit.color);
      setSelectedPermissions([...roleToEdit.permissions]);
    } else {
      setName('');
      setDescription('');
      setColor('blue');
      setSelectedPermissions([
        'trips.view',
        'fleet.view',
        'drivers.view',
        'ratecards.view',
      ]);
    }
    setError(null);
  }, [roleToEdit, isOpen]);

  if (!isOpen) return null;

  const isEditingSystemRole = roleToEdit?.isSystem ?? false;

  const togglePermission = (permId: string) => {
    setSelectedPermissions(prev => 
      prev.includes(permId) ? prev.filter(p => p !== permId) : [...prev, permId]
    );
  };

  const toggleCategoryPermissions = (category: PermissionCategory) => {
    const catPerms = SYSTEM_PERMISSIONS.filter(p => p.category === category).map(p => p.id);
    const allSelected = catPerms.every(id => selectedPermissions.includes(id));

    if (allSelected) {
      setSelectedPermissions(prev => prev.filter(id => !catPerms.includes(id)));
    } else {
      setSelectedPermissions(prev => Array.from(new Set([...prev, ...catPerms])));
    }
  };

  const handleSelectAll = () => {
    setSelectedPermissions(SYSTEM_PERMISSIONS.map(p => p.id));
  };

  const handleClearAll = () => {
    setSelectedPermissions([]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Role title is required.');
      return;
    }

    if (selectedPermissions.length === 0) {
      setError('Please select at least one permission for this role.');
      return;
    }

    onSaveRole({
      id: roleToEdit?.id,
      name: name.trim(),
      description: description.trim() || 'Custom operational role created for Philippine freight logistics.',
      color,
      permissions: selectedPermissions,
      isSystem: isEditingSystemRole,
    });

    onClose();
  };

  const categories = Object.keys(CATEGORY_META) as PermissionCategory[];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150" onClick={closeIfBackdrop(onClose)}>
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-sm">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-900 text-base">
                  {roleToEdit ? `Edit Role: ${roleToEdit.name}` : 'Create Custom RBAC Role'}
                </h3>
                {isEditingSystemRole && (
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-indigo-100 text-indigo-700 border border-indigo-200">
                    System Core
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500">
                Configure role identity, theme badge, and granular capability matrix stored in local database.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body / Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Role Identity Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Role Title <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isEditingSystemRole}
                placeholder="e.g., Terminal Operations Lead"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:bg-slate-100 disabled:text-slate-500 font-semibold"
                required
              />
              {isEditingSystemRole && (
                <p className="text-[10px] text-slate-400 mt-1">Core system role names cannot be renamed.</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Badge Color Theme
              </label>
              <div className="flex items-center gap-1.5 flex-wrap">
                {COLOR_OPTIONS.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setColor(c.value)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all flex items-center gap-1.5 ${
                      color === c.value
                        ? `${c.bgClass} ${c.borderClass} ${c.textClass} ring-2 ring-blue-500/20 shadow-2xs`
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${c.textClass.replace('text-', 'bg-')}`}></span>
                    <span>{c.label.split(' ')[0]}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Role Scope & Description
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g., Manages North Harbor container deliveries, driver dispatching, and fuel logs."
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Granular Permissions Section */}
          <div className="pt-2 border-t border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-blue-600" />
                  <span>Granular Capabilities & Permissions Matrix</span>
                </h4>
                <p className="text-[11px] text-slate-500">
                  {selectedPermissions.length} of {SYSTEM_PERMISSIONS.length} capabilities granted to this role
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-md transition-colors"
                >
                  Grant All
                </button>
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="text-[11px] font-semibold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded-md transition-colors"
                >
                  Revoke All
                </button>
              </div>
            </div>

            {/* Categorized Permissions Grid */}
            <div className="space-y-4">
              {categories.map((cat) => {
                const meta = CATEGORY_META[cat];
                const perms = SYSTEM_PERMISSIONS.filter(p => p.category === cat);
                const allSelected = perms.every(p => selectedPermissions.includes(p.id));
                const someSelected = perms.some(p => selectedPermissions.includes(p.id)) && !allSelected;

                return (
                  <div key={cat} className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
                    {/* Category Header */}
                    <div className="bg-slate-50 px-4 py-2.5 flex items-center justify-between border-b border-slate-200">
                      <div className="flex items-center gap-2">
                        <span className="text-base">{meta.icon}</span>
                        <div>
                          <div className="font-bold text-xs text-slate-900">{meta.label}</div>
                          <div className="text-[10px] text-slate-500">{meta.description}</div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => toggleCategoryPermissions(cat)}
                        className="flex items-center gap-1 text-[11px] font-semibold text-slate-600 hover:text-blue-600 px-2 py-0.5 rounded hover:bg-slate-200/50 transition-colors"
                      >
                        {allSelected ? (
                          <CheckSquare className="w-3.5 h-3.5 text-blue-600" />
                        ) : (
                          <Square className="w-3.5 h-3.5 text-slate-400" />
                        )}
                        <span>{allSelected ? 'All Selected' : 'Toggle Category'}</span>
                      </button>
                    </div>

                    {/* Permission Items in this category */}
                    <div className="p-3 grid grid-cols-1 md:grid-cols-2 gap-2.5">
                      {perms.map((perm) => {
                        const isChecked = selectedPermissions.includes(perm.id);

                        return (
                          <label
                            key={perm.id}
                            className={`flex items-start gap-2.5 p-2 rounded-lg border transition-all cursor-pointer select-none ${
                              isChecked
                                ? 'bg-blue-50/50 border-blue-200 text-slate-900'
                                : 'bg-white border-slate-100 hover:border-slate-200 text-slate-600'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => togglePermission(perm.id)}
                              className="mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4 w-4 cursor-pointer"
                            />
                            <div className="min-w-0 flex-1">
                              <div className="text-xs font-bold tracking-tight text-slate-900">
                                {perm.name}
                              </div>
                              <div className="text-[10px] text-slate-500 leading-snug mt-0.5">
                                {perm.description}
                              </div>
                              <div className="mt-1">
                                <span className="font-mono text-[9px] px-1 py-0.2 rounded bg-slate-100 text-slate-500 border border-slate-200">
                                  {perm.id}
                                </span>
                              </div>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </form>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <div className="text-xs text-slate-500 font-medium">
            Stored locally in browser database.
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              className="px-5 py-2 rounded-lg text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 transition-all shadow-sm active:scale-95 flex items-center gap-1.5"
            >
              <Check className="w-4 h-4 stroke-[2.5]" />
              <span>{roleToEdit ? 'Save Role Changes' : 'Create Role'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
