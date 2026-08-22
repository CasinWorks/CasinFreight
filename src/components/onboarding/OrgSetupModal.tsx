import React, { useState } from 'react';
import { 
  Building2, 
  Users, 
  Truck, 
  Tag, 
  CheckCircle2, 
  ArrowRight, 
  X, 
  Mail, 
  ShieldCheck,
  Plus,
  Trash2,
  Sparkles,
  Award,
  HardDrive
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useFreight } from '../../context/FreightContext';
import { UserRole, TruckType } from '../../types';
import { DeleteCompanyModal } from './DeleteCompanyModal';
import { WorkspaceBackupModal } from './WorkspaceBackupModal';
import { closeIfBackdrop } from '../../lib/modal';

interface OrgSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const OrgSetupModal: React.FC<OrgSetupModalProps> = ({ isOpen, onClose }) => {
  const { 
    company, 
    updateCompany, 
    users, 
    addUser,
    addTruck, 
    addRateCard,
    trucks,
    rateCards,
    roles,
    canAddAccount,
    canAddTruck,
    setIsUpgradeModalOpen,
    currentUser,
  } = useFreight();

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isBackupOpen, setIsBackupOpen] = useState(false);

  // Step 1: Company details
  const [compName, setCompName] = useState(company.name);
  const [compTin, setCompTin] = useState(company.tin);
  const [compAddress, setCompAddress] = useState(company.address);
  const [compContact, setCompContact] = useState(company.contactNumber);
  const [compEmail, setCompEmail] = useState(company.email);

  // Step 2: Team invite
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<UserRole>('Dispatcher');

  // Step 3: Fast Truck setup
  const [firstPlate, setFirstPlate] = useState('NCP 5912');
  const [firstTruckType, setFirstTruckType] = useState<TruckType>('6-Wheeler Closed Van');
  const [firstGvwr, setFirstGvwr] = useState(8500);
  const [firstTare, setFirstTare] = useState(3800);

  // Step 4: Fast Rate card setup
  const [firstOrigin, setFirstOrigin] = useState('North Harbor / MICT Manila');
  const [firstDest, setFirstDest] = useState('Cavite Export Zone (CEPZ Rosario)');
  const [firstRate, setFirstRate] = useState(14500);
  const [firstToll, setFirstToll] = useState(1200);

  if (!isOpen) return null;

  const handleSaveCompany = () => {
    updateCompany({
      name: compName,
      tin: compTin,
      address: compAddress,
      contactNumber: compContact,
      email: compEmail,
    });
    setStep(2);
  };

  const handleInviteUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteName.trim() || !inviteEmail.trim()) return;
    if (!canAddAccount) {
      setIsUpgradeModalOpen(true);
      return;
    }

    const result = await addUser({
      name: inviteName,
      email: inviteEmail,
      role: inviteRole,
    });
    if (!result.success) return;

    if (result.inviteUrl) {
      try {
        await navigator.clipboard.writeText(result.inviteUrl);
        window.alert(`Invite saved. Join link copied. Send it to ${inviteEmail} — they choose a password on that page and join this company.`);
      } catch {
        window.alert(`Invite saved. Send this join link:\n${result.inviteUrl}`);
      }
    }

    setInviteName('');
    setInviteEmail('');
  };

  const handleAddFirstTruck = () => {
    if (!canAddTruck) {
      sessionStorage.setItem('casinfreight_extra_truck', '1');
      setIsUpgradeModalOpen(true);
      return;
    }
    addTruck({
      plateNumber: firstPlate,
      type: firstTruckType,
      brandModel: 'Isuzu Forward FTR',
      gvwrKg: Number(firstGvwr),
      tareWeightKg: Number(firstTare),
      maxVolumeCbm: 26,
      status: 'Available',
      fuelType: 'Diesel',
      yearModel: 2023,
      lastOdometerKm: 45000,
    });
    setStep(4);
  };

  const handleAddFirstRate = () => {
    addRateCard({
      originZone: firstOrigin,
      destinationZone: firstDest,
      truckType: firstTruckType,
      baseRatePhp: Number(firstRate),
      tollEstimatePhp: Number(firstToll),
      standardLeadHours: 3.5,
      effectiveDate: new Date().toISOString().split('T')[0],
    });
    
    confetti({ particleCount: 90, spread: 80, origin: { y: 0.6 } });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto" onClick={closeIfBackdrop(onClose)}>
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-4 md:px-6 md:py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold shadow-2xs">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 tracking-tight">Organization Setup & Team Provisioning</h2>
              <p className="text-xs text-slate-500">
                Step {step} of 4: {
                  step === 1 ? 'Company Profile & Tax ID' :
                  step === 2 ? 'Team Members & Roles' :
                  step === 3 ? 'Fleet Baseline Truck' : 'Default Route Rate Card'
                }
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

        {/* Step Progress Bar */}
        <div className="flex border-b border-slate-200 bg-slate-50/50">
          {[
            { num: 1, label: 'Company' },
            { num: 2, label: 'Team Roles' },
            { num: 3, label: 'First Truck' },
            { num: 4, label: 'Rate Card' }
          ].map(s => (
            <button
              key={s.num}
              onClick={() => setStep(s.num as any)}
              className={`flex-1 py-2.5 text-center text-xs font-semibold border-b-2 transition-colors ${
                step === s.num 
                  ? 'border-blue-600 text-blue-600 bg-blue-50/50' 
                  : step > s.num
                  ? 'border-emerald-600 text-emerald-600'
                  : 'border-transparent text-slate-400'
              }`}
            >
              {s.num}. {s.label}
            </button>
          ))}
        </div>

        {/* Body based on step */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1 text-xs text-slate-800">
          
          {/* STEP 1: Company Profile */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Company Registered Name *</label>
                <input
                  type="text"
                  value={compName}
                  onChange={(e) => setCompName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 font-medium focus:bg-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">BIR Taxpayer ID (TIN) *</label>
                  <input
                    type="text"
                    value={compTin}
                    onChange={(e) => setCompTin(e.target.value)}
                    placeholder="000-000-000-000"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 font-mono focus:bg-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Official Contact Phone</label>
                  <input
                    type="text"
                    value={compContact}
                    onChange={(e) => setCompContact(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Principal Garage / Office Address</label>
                <textarea
                  rows={2}
                  value={compAddress}
                  onChange={(e) => setCompAddress(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex justify-end pt-3">
                <button
                  type="button"
                  onClick={handleSaveCompany}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold transition-all shadow-xs"
                >
                  <span>Save & Continue to Team</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

              {(currentUser.role === 'Owner' || currentUser.role.toLowerCase().includes('owner')) && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 space-y-2">
                  <div className="font-bold text-slate-900">Backup & restore</div>
                  <p className="text-slate-600">
                    Download a CSV copy of this company. Restore is a merge by ID, not a wipe — newer live trips stay. Weekly snapshots stay in this browser only; keep the CSV off this computer as well.
                  </p>
                  <button
                    type="button"
                    onClick={() => setIsBackupOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-800 font-bold hover:bg-slate-100"
                  >
                    <HardDrive className="w-3.5 h-3.5" />
                    Open backup…
                  </button>
                </div>
              )}

              {(currentUser.role === 'Owner' || currentUser.role.toLowerCase().includes('owner')) && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-3.5 space-y-2">
                  <div className="font-bold text-rose-900">Danger zone</div>
                  <p className="text-rose-800">
                    Deleting this company removes trips, invoices, trucks, and team access. You will be asked to type the company name and DELETE so it cannot happen by accident.
                  </p>
                  <button
                    type="button"
                    onClick={() => setIsDeleteOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-rose-300 text-rose-700 font-bold hover:bg-rose-100"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete company…
                  </button>
                </div>
              )}
            </div>
          )}

          {/* STEP 2: Team Members & Roles */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-3">
                <div className="font-bold text-slate-900 text-xs">Invite Team Member & Assign Access Level</div>
                
                <form onSubmit={handleInviteUser} className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <input
                      type="text"
                      placeholder="Colleague Full Name"
                      value={inviteName}
                      onChange={(e) => setInviteName(e.target.value)}
                      required
                      className="bg-white border border-slate-200 rounded px-2.5 py-1.5 text-slate-900 focus:outline-none focus:border-blue-500"
                    />
                    <input
                      type="email"
                      placeholder="work.email@casinfreight.ph"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      required
                      className="bg-white border border-slate-200 rounded px-2.5 py-1.5 text-slate-900 focus:outline-none focus:border-blue-500"
                    />
                    <select
                      value={inviteRole}
                      onChange={(e) => setInviteRole(e.target.value as UserRole)}
                      className="bg-white border border-slate-200 rounded px-2.5 py-1.5 text-slate-900 font-medium focus:outline-none focus:border-blue-500"
                    >
                      {roles.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name} {r.isSystem ? '(System)' : '(Custom)'}
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    type="submit"
                    className="px-3.5 py-1.5 rounded bg-white hover:bg-slate-50 text-slate-700 font-bold flex items-center gap-1.5 border border-slate-200 shadow-2xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Member</span>
                  </button>
                </form>
              </div>

              {/* Roster of Users */}
              <div className="space-y-2">
                <div className="font-semibold text-slate-500 uppercase text-[10px]">Active Company Staff</div>
                {users.map(u => (
                  <div key={u.id} className="flex items-center justify-between bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-slate-200 font-bold flex items-center justify-center text-slate-700">
                        {u.name.charAt(0)}
                      </div>
                      <div>
                        <div className="font-bold text-slate-900">{u.name}</div>
                        <div className="text-[10px] text-slate-500">{u.email}</div>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white text-blue-700 border border-slate-200 font-semibold">
                      {u.role}
                    </span>
                  </div>
                ))}
              </div>

              <div className="flex justify-between pt-3">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-4 py-2 rounded-lg bg-white border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold transition-all shadow-xs"
                >
                  <span>Continue to First Truck</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: First Truck Prompt */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                <div className="font-bold text-slate-900">Configure Initial Fleet Vehicle</div>
                <p className="text-[11px] text-slate-500">
                  CasinFreight calculates legal net payloads by deducting vehicle empty tare weight from Gross Vehicle Weight Rating (GVWR).
                </p>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Plate Number</label>
                    <input
                      type="text"
                      value={firstPlate}
                      onChange={(e) => setFirstPlate(e.target.value.toUpperCase())}
                      className="w-full bg-white border border-slate-200 rounded px-2.5 py-1.5 text-slate-900 font-mono font-bold focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Configuration</label>
                    <select
                      value={firstTruckType}
                      onChange={(e) => setFirstTruckType(e.target.value as TruckType)}
                      className="w-full bg-white border border-slate-200 rounded px-2.5 py-1.5 text-slate-900 focus:outline-none focus:border-blue-500"
                    >
                      <option value="6-Wheeler Closed Van">6-Wheeler Closed Van</option>
                      <option value="10-Wheeler Wingvan">10-Wheeler Wingvan</option>
                      <option value="40ft Container Chassis">40ft Container Chassis</option>
                      <option value="4-Wheeler Closed Van">4-Wheeler Closed Van</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">GVWR (kg)</label>
                    <input
                      type="number"
                      value={firstGvwr}
                      onChange={(e) => setFirstGvwr(Number(e.target.value))}
                      className="w-full bg-white border border-slate-200 rounded px-2.5 py-1.5 text-slate-900 font-mono focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Tare (kg)</label>
                    <input
                      type="number"
                      value={firstTare}
                      onChange={(e) => setFirstTare(Number(e.target.value))}
                      className="w-full bg-white border border-slate-200 rounded px-2.5 py-1.5 text-slate-900 font-mono focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="bg-white p-2.5 rounded-lg border border-blue-200 flex items-center justify-between text-xs">
                  <span className="text-slate-700 font-medium">Calculated Net Payload:</span>
                  <span className="font-mono font-black text-blue-600 text-sm">
                    {(firstGvwr - firstTare).toLocaleString()} kg ({((firstGvwr - firstTare) / 1000).toFixed(1)} MT)
                  </span>
                </div>
              </div>

              <div className="flex justify-between pt-3">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="px-4 py-2 rounded-lg bg-white border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleAddFirstTruck}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold transition-all shadow-xs"
                >
                  <span>Add Truck & Continue</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: First Rate Card */}
          {step === 4 && (
            <div className="space-y-4">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                <div className="font-bold text-slate-900">Default Zone Rate Card</div>
                <p className="text-[11px] text-slate-500">
                  Set baseline freight tariffs between industrial clusters (e.g. Manila Port to Cavite or Laguna).
                </p>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Origin Zone</label>
                    <input
                      type="text"
                      value={firstOrigin}
                      onChange={(e) => setFirstOrigin(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded px-2.5 py-1.5 text-slate-900 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Destination Zone</label>
                    <input
                      type="text"
                      value={firstDest}
                      onChange={(e) => setFirstDest(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded px-2.5 py-1.5 text-slate-900 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Base Rate (PHP ₱)</label>
                    <input
                      type="number"
                      value={firstRate}
                      onChange={(e) => setFirstRate(Number(e.target.value))}
                      className="w-full bg-white border border-slate-200 rounded px-2.5 py-1.5 text-blue-600 font-mono font-bold focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Estimated Tollway (₱)</label>
                    <input
                      type="number"
                      value={firstToll}
                      onChange={(e) => setFirstToll(Number(e.target.value))}
                      className="w-full bg-white border border-slate-200 rounded px-2.5 py-1.5 text-slate-900 font-mono focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-between pt-3">
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="px-4 py-2 rounded-lg bg-white border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleAddFirstRate}
                  className="flex items-center gap-1.5 px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold transition-all shadow-md active:scale-95"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Complete Setup & Launch Ops</span>
                </button>
              </div>
            </div>
          )}

        </div>

      </div>
      <DeleteCompanyModal isOpen={isDeleteOpen} onClose={() => setIsDeleteOpen(false)} />
      <WorkspaceBackupModal isOpen={isBackupOpen} onClose={() => setIsBackupOpen(false)} />
    </div>
  );
};
