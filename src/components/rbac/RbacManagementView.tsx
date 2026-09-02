import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Plus, 
  Users, 
  Database, 
  Check, 
  X, 
  Copy, 
  Download, 
  Upload, 
  RotateCcw, 
  Edit3, 
  Trash2, 
  Layers, 
  Key, 
  UserCheck, 
  AlertTriangle, 
  Sparkles, 
  ExternalLink,
  ChevronRight,
  Search,
  CheckCircle2,
  FileCode,
  Shield,
  SlidersHorizontal,
  Lock,
  Eye,
  Mail,
  Phone
} from 'lucide-react';
import { useFreight } from '../../context/FreightContext';
import { RbacRole, SYSTEM_PERMISSIONS, PermissionCategory } from '../../types/rbac';
import { RoleEditorModal } from './RoleEditorModal';
import { FeatureHowTo } from '../help/FeatureHowTo';
import { closeIfBackdrop } from '../../lib/modal';

const ROLE_COLOR_MAP: Record<RbacRole['color'], { bg: string; border: string; text: string; badge: string; ring: string }> = {
  blue: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', badge: 'bg-blue-100 text-blue-800 border-blue-200', ring: 'ring-blue-400' },
  indigo: { bg: 'bg-indigo-50', border: 'border-indigo-200', text: 'text-indigo-700', badge: 'bg-indigo-100 text-indigo-800 border-indigo-200', ring: 'ring-indigo-400' },
  purple: { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700', badge: 'bg-purple-100 text-purple-800 border-purple-200', ring: 'ring-purple-400' },
  emerald: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', badge: 'bg-emerald-100 text-emerald-800 border-emerald-200', ring: 'ring-emerald-400' },
  amber: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', badge: 'bg-amber-100 text-amber-800 border-amber-200', ring: 'ring-amber-400' },
  rose: { bg: 'bg-rose-50', border: 'border-rose-200', text: 'text-rose-700', badge: 'bg-rose-100 text-rose-800 border-rose-200', ring: 'ring-rose-400' },
  cyan: { bg: 'bg-cyan-50', border: 'border-cyan-200', text: 'text-cyan-700', badge: 'bg-cyan-100 text-cyan-800 border-cyan-200', ring: 'ring-cyan-400' },
  orange: { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700', badge: 'bg-orange-100 text-orange-800 border-orange-200', ring: 'ring-orange-400' },
  slate: { bg: 'bg-slate-50', border: 'border-slate-200', text: 'text-slate-700', badge: 'bg-slate-100 text-slate-800 border-slate-200', ring: 'ring-slate-400' },
};

type ActiveSubTab = 'roles' | 'matrix' | 'users' | 'db_inspector';

export const RbacManagementView: React.FC = () => {
  const { 
    roles, 
    createRole, 
    updateRole, 
    deleteRole, 
    resetRolesToDefault,
    users, 
    addUser,
    removeUserFromCompany,
    updateUserRole, 
    currentUser, 
    rbacAuditLogs,
    exportRbacDb,
    importRbacDb,
    canAddAccount,
    canAddRole,
    setIsUpgradeModalOpen,
    firebaseProjectId,
    subscriptionUsage,
  } = useFreight();

  const [activeSubTab, setActiveSubTab] = useState<ActiveSubTab>('roles');
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<RbacRole | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importJsonText, setImportJsonText] = useState('');
  const [importFeedback, setImportFeedback] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // New user form state
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPhone, setNewUserPhone] = useState('');
  const [newUserRole, setNewUserRole] = useState<string>('Dispatcher');
  const [memberToRemove, setMemberToRemove] = useState<typeof users[number] | null>(null);
  const [isRemovingMember, setIsRemovingMember] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleOpenCreateRole = () => {
    if (!canAddRole) {
      setIsUpgradeModalOpen(true);
      return;
    }
    setEditingRole(null);
    setIsEditorOpen(true);
  };

  const handleOpenEditRole = (role: RbacRole) => {
    setEditingRole(role);
    setIsEditorOpen(true);
  };

  const handleDuplicateRole = (role: RbacRole) => {
    const newRole = createRole({
      name: `${role.name} (Copy)`,
      description: `Custom copy of ${role.name}. ${role.description}`,
      color: role.color,
      isSystem: false,
      permissions: [...role.permissions],
    });
    if (!newRole) return;
    showToast(`Created duplicate role: "${newRole.name}"`);
  };

  const handleDeleteRole = (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to delete role "${name}"? Any users assigned to this role will be reassigned to Dispatcher.`)) {
      const ok = deleteRole(id);
      if (ok) {
        showToast(`Role "${name}" deleted from local database.`);
      }
    }
  };

  const handleResetDefaults = () => {
    if (window.confirm('Reset all roles to the standard Philippine logistics default schema? Custom roles will be replaced with standard templates.')) {
      resetRolesToDefault();
      showToast('RBAC schema reset to Philippine logistics defaults.');
    }
  };

  const handleSaveRole = (roleData: {
    id?: string;
    name: string;
    description: string;
    color: RbacRole['color'];
    permissions: string[];
    isSystem: boolean;
  }) => {
    if (roleData.id) {
      updateRole(roleData.id, {
        name: roleData.name,
        description: roleData.description,
        color: roleData.color,
        permissions: roleData.permissions,
      });
      showToast(`Updated role: "${roleData.name}"`);
    } else {
      const newRole = createRole({
        name: roleData.name,
        description: roleData.description,
        color: roleData.color,
        permissions: roleData.permissions,
        isSystem: false,
      });
      if (!newRole) return;
      showToast(`Created custom role: "${newRole.name}"`);
    }
  };

  const handleExportJson = () => {
    const json = exportRbacDb();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `casinfreight_rbac_database_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Exported RBAC database snapshot as JSON file.');
  };

  const handleImportJson = () => {
    if (!importJsonText.trim()) return;
    const res = importRbacDb(importJsonText);
    if (res.success) {
      setIsImportModalOpen(false);
      setImportJsonText('');
      setImportFeedback(null);
      showToast(res.message);
    } else {
      setImportFeedback(res.message);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim() || !newUserEmail.trim()) return;
    if (!canAddAccount) {
      setIsUpgradeModalOpen(true);
      return;
    }

    const result = await addUser({
      name: newUserName.trim(),
      email: newUserEmail.trim(),
      phone: newUserPhone.trim() || '+63 917 000 0000',
      role: newUserRole,
    });

    if (!result.success) {
      showToast(result.error || 'Could not invite this teammate.');
      return;
    }

    const invitedEmail = newUserEmail.trim();
    const invitedName = newUserName.trim();
    setNewUserName('');
    setNewUserEmail('');
    setNewUserPhone('');
    setIsAddUserOpen(false);
    try {
      if (result.inviteUrl) await navigator.clipboard.writeText(result.inviteUrl);
    } catch {
      /* clipboard may be blocked */
    }
    showToast(`Invite saved for ${invitedName}. Send them this join link (copied): they choose a password and join your company — they must not Create company.`);
  };

  const canRemoveTeammates =
    currentUser.role === 'Owner' || currentUser.role.toLowerCase().includes('owner');

  const handleConfirmRemoveMember = async () => {
    if (!memberToRemove) return;
    setIsRemovingMember(true);
    const result = await removeUserFromCompany(memberToRemove.id);
    setIsRemovingMember(false);
    if (!result.success) {
      showToast(result.error || 'Could not remove this teammate.');
      return;
    }
    const name = memberToRemove.name;
    const pending = memberToRemove.status === 'invited';
    setMemberToRemove(null);
    showToast(pending ? `Cancelled invite for ${name}.` : `${name} was removed from this company.`);
  };

  const customRolesCount = roles.filter(r => !r.isSystem).length;

  const filteredRoles = roles.filter(r => 
    r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div data-tutorial="rbac-page" className="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-[#F8FAFC]">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-2.5 text-xs font-semibold animate-in slide-in-from-bottom-3 duration-200 border border-slate-700">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Header Banner */}
      <div className="bg-white border-b border-slate-200 px-6 py-5 shrink-0 shadow-2xs">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                    Role-Based Access Control (RBAC) & Team Permissions
                  </h1>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    Firebase Live
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Roles and team seats synced to Firestore {firebaseProjectId ? `• ${firebaseProjectId}` : ''}
                </p>
                <div className="mt-3 max-w-xl">
                  <FeatureHowTo feature="rbac" />
                </div>
              </div>
            </div>
          </div>

          {/* Header Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleOpenCreateRole}
              className="bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95 flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Add Custom Role</span>
            </button>

            <button
              onClick={handleExportJson}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 border border-slate-200"
              title="Download local RBAC JSON snapshot"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export JSON</span>
            </button>

            <button
              onClick={() => setIsImportModalOpen(true)}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 border border-slate-200"
              title="Import local RBAC JSON backup"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Import JSON</span>
            </button>

            <button
              onClick={handleResetDefaults}
              className="bg-slate-100 hover:bg-rose-50 hover:text-rose-700 text-slate-600 px-3 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 border border-slate-200"
              title="Reset RBAC to Philippine logistics system seeds"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Defaults</span>
            </button>
          </div>
        </div>

        {/* Quick RBAC Metrics Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-slate-100">
          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3">
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Defined Roles</div>
            <div className="text-lg font-extrabold text-slate-900 mt-0.5 flex items-baseline gap-1.5">
              <span>{roles.length} Roles</span>
              <span className="text-[10px] font-semibold text-slate-400">({customRolesCount} custom)</span>
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3">
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Team Staff Members</div>
            <div className="text-lg font-extrabold text-blue-700 mt-0.5">
              {users.length} Users Assigned
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3">
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Granular Capabilities</div>
            <div className="text-lg font-extrabold text-purple-700 mt-0.5">
              {SYSTEM_PERMISSIONS.length} Permissions
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3">
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Firebase Project</div>
            <div className="text-lg font-extrabold text-emerald-700 mt-0.5 flex items-center gap-1.5">
              <Database className="w-4 h-4 text-emerald-600" />
              <span className="text-xs font-bold text-slate-800">{firebaseProjectId || 'Not connected'}</span>
            </div>
          </div>
        </div>

        {/* Sub-Tab Navigation Bar */}
        <div className="flex items-center gap-2 mt-4">
          <button
            onClick={() => setActiveSubTab('roles')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeSubTab === 'roles'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Role Profiles & Roster ({roles.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('matrix')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeSubTab === 'matrix'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Visual Permission Matrix</span>
          </button>

          <button
            onClick={() => setActiveSubTab('users')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeSubTab === 'users'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Team Role Assignments ({users.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('db_inspector')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeSubTab === 'db_inspector'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>Audit Trail</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-6">
        
        {/* SUBTAB 1: ROLES OVERVIEW & CARDS */}
        {activeSubTab === 'roles' && (
          <div className="space-y-6">
            {/* Search and Filters */}
            <div className="flex items-center justify-between gap-4">
              <div className="relative max-w-sm w-full">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter roles by name or scope..."
                  className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 shadow-2xs"
                />
              </div>

              <div className="text-xs text-slate-500 font-medium">
                Showing {filteredRoles.length} of {roles.length} roles
              </div>
            </div>

            {/* Grid of Role Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredRoles.map((role) => {
                const colorConfig = ROLE_COLOR_MAP[role.color] || ROLE_COLOR_MAP.blue;
                const assignedUsers = users.filter(u => u.role.toLowerCase() === role.id.toLowerCase() || u.role.toLowerCase() === role.name.toLowerCase());
                const isCurrentActive = currentUser.role.toLowerCase() === role.id.toLowerCase() || currentUser.role.toLowerCase() === role.name.toLowerCase();

                return (
                  <div 
                    key={role.id}
                    className={`bg-white rounded-2xl border transition-all duration-200 flex flex-col justify-between shadow-2xs hover:shadow-md ${
                      isCurrentActive ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-slate-200'
                    }`}
                  >
                    <div>
                      {/* Card Header */}
                      <div className={`p-4 rounded-t-2xl border-b flex items-start justify-between gap-3 ${colorConfig.bg} ${colorConfig.border}`}>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-slate-900 text-sm">{role.name}</h3>
                            {role.isSystem ? (
                              <span className="px-1.5 py-0.2 text-[9px] font-bold rounded bg-slate-200/80 text-slate-700 border border-slate-300">
                                System
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.2 text-[9px] font-bold rounded bg-amber-100 text-amber-800 border border-amber-300">
                                Custom
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] font-mono text-slate-500 mt-0.5">
                            ID: {role.id}
                          </div>
                        </div>

                        {/* Active Indicator Badge */}
                        {isCurrentActive ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-600 text-white shadow-2xs flex items-center gap-1">
                            <Check className="w-3 h-3 stroke-[3]" />
                            <span>Your Role</span>
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white text-slate-500 border border-slate-200">
                            {assignedUsers.length} assigned
                          </span>
                        )}
                      </div>

                      {/* Card Body */}
                      <div className="p-4 space-y-3 text-xs">
                        <p className="text-slate-600 text-xs leading-relaxed min-h-[36px]">
                          {role.description}
                        </p>

                        {/* Capabilities Summary */}
                        <div className="space-y-1.5 pt-2 border-t border-slate-100">
                          <div className="flex items-center justify-between text-[11px] font-bold text-slate-700">
                            <span className="flex items-center gap-1">
                              <Key className="w-3.5 h-3.5 text-slate-500" />
                              <span>Granted Permissions</span>
                            </span>
                            <span className="font-mono text-blue-600 bg-blue-50 px-1.5 py-0.2 rounded border border-blue-100">
                              {role.permissions.length} / {SYSTEM_PERMISSIONS.length}
                            </span>
                          </div>

                          {/* Quick Badges Preview */}
                          <div className="flex flex-wrap gap-1 pt-1">
                            {role.permissions.slice(0, 4).map((pId) => {
                              const permObj = SYSTEM_PERMISSIONS.find(p => p.id === pId);
                              return (
                                <span 
                                  key={pId}
                                  className="text-[9px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-mono border border-slate-200 truncate max-w-[140px]"
                                  title={permObj?.name || pId}
                                >
                                  {permObj?.name.split(' ')[0] || pId}
                                </span>
                              );
                            })}
                            {role.permissions.length > 4 && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 font-semibold border border-slate-200">
                                +{role.permissions.length - 4} more
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Assigned Team Members */}
                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                          <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-600">
                            <Users className="w-3.5 h-3.5 text-slate-400" />
                            <span>{assignedUsers.length} user{assignedUsers.length === 1 ? '' : 's'} assigned</span>
                          </div>

                          <div className="flex -space-x-1.5">
                            {assignedUsers.slice(0, 3).map((u) => (
                              <img
                                key={u.id}
                                src={u.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                                alt={u.name}
                                className="w-5 h-5 rounded-full border border-white object-cover"
                                title={u.name}
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Card Actions Footer */}
                    <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 rounded-b-2xl flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleOpenEditRole(role)}
                          className="px-2.5 py-1 rounded-lg text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 transition-colors flex items-center gap-1 shadow-2xs"
                        >
                          <Edit3 className="w-3 h-3 text-slate-500" />
                          <span>Configure</span>
                        </button>

                        <button
                          onClick={() => handleDuplicateRole(role)}
                          className="px-2.5 py-1 rounded-lg text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 transition-colors flex items-center gap-1 shadow-2xs"
                          title="Clone this role into a new custom template"
                        >
                          <Copy className="w-3 h-3 text-slate-500" />
                          <span>Clone</span>
                        </button>
                      </div>

                      {!role.isSystem && (
                        <button
                          onClick={() => handleDeleteRole(role.id, role.name)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          title="Delete custom role"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* SUBTAB 2: VISUAL PERMISSION MATRIX TABLE */}
        {activeSubTab === 'matrix' && (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3 text-xs text-blue-900">
              <SlidersHorizontal className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <div className="font-bold">Interactive Dynamic Permissions Matrix</div>
                <p className="text-blue-700 text-[11px] mt-0.5">
                  Click any checkbox for custom roles to toggle permissions live in the local database. Core system roles maintain predefined security baselines.
                </p>
              </div>
            </div>

            {/* Matrix Table Container */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-2xs overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold">
                    <th className="p-3.5 min-w-[260px] sticky left-0 bg-slate-100 z-10">
                      Capability & Module
                    </th>
                    {roles.map((r) => (
                      <th key={r.id} className="p-3.5 text-center min-w-[120px]">
                        <div className="font-bold text-xs text-slate-900 truncate">{r.name.split('/')[0]}</div>
                        <span className="text-[9px] font-mono font-medium text-slate-500">
                          {r.isSystem ? 'System' : 'Custom'}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {SYSTEM_PERMISSIONS.map((perm) => (
                    <tr key={perm.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3.5 sticky left-0 bg-white group-hover:bg-slate-50 z-10">
                        <div className="font-bold text-slate-900 text-xs">{perm.name}</div>
                        <div className="text-[10px] text-slate-500 leading-snug">{perm.description}</div>
                        <div className="mt-0.5">
                          <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-slate-100 text-slate-500">
                            {perm.id}
                          </span>
                        </div>
                      </td>

                      {roles.map((r) => {
                        const hasPerm = r.id.toLowerCase() === 'owner' || r.permissions.includes(perm.id);

                        return (
                          <td key={r.id} className="p-3.5 text-center align-middle">
                            {r.id.toLowerCase() === 'owner' ? (
                              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 font-bold" title="Owner Master Access">
                                <Check className="w-3.5 h-3.5 stroke-[3]" />
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  if (r.isSystem) {
                                    showToast(`System core role permissions are fixed. Duplicate to customize!`);
                                    return;
                                  }
                                  const updatedPerms = hasPerm
                                    ? r.permissions.filter(p => p !== perm.id)
                                    : [...r.permissions, perm.id];
                                  updateRole(r.id, { permissions: updatedPerms });
                                  showToast(`Updated ${perm.name} for ${r.name}`);
                                }}
                                className={`w-6 h-6 rounded-md inline-flex items-center justify-center transition-all ${
                                  hasPerm
                                    ? 'bg-blue-600 text-white shadow-2xs hover:bg-blue-700'
                                    : 'bg-slate-100 text-slate-300 hover:bg-slate-200'
                                } ${r.isSystem ? 'cursor-default opacity-85' : 'cursor-pointer active:scale-95'}`}
                                title={hasPerm ? `Granted to ${r.name}` : `Restricted for ${r.name}`}
                              >
                                {hasPerm ? (
                                  <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                                ) : (
                                  <X className="w-3 h-3 text-slate-300" />
                                )}
                              </button>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* SUBTAB 3: TEAM MEMBERS & ROLE ASSIGNMENTS */}
        {activeSubTab === 'users' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Registered Team Members & Operators</h3>
                <p className="text-xs text-slate-500">
                  Invite teammates by email. Free plans include 1 account — subscribe to add seats. Owner can remove a person from this company; they lose access but their login is not deleted.
                </p>
              </div>

              <button
                onClick={() => {
                  if (!canAddAccount) {
                    setIsUpgradeModalOpen(true);
                    return;
                  }
                  setIsAddUserOpen(true);
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95 flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>Add Team Member</span>
              </button>
            </div>

            {/* User List Table */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-2xs overflow-hidden">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold">
                    <th className="p-3.5">Operator Name & Profile</th>
                    <th className="p-3.5">Email & Contact</th>
                    <th className="p-3.5">Assigned RBAC Role</th>
                    <th className="p-3.5 text-right">Simulation & Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {users.map((u) => {
                    const matchedRole = roles.find(r => r.id.toLowerCase() === u.role.toLowerCase() || r.name.toLowerCase() === u.role.toLowerCase());
                    const isCurrentUser = currentUser.id === u.id;

                    return (
                      <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-3.5">
                          <div className="flex items-center gap-3">
                            <img
                              src={u.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                              alt={u.name}
                              className="w-9 h-9 rounded-xl object-cover border border-slate-200"
                            />
                            <div>
                              <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                                <span>{u.name}</span>
                                {isCurrentUser && (
                                  <span className="px-1.5 py-0.2 text-[9px] font-bold rounded bg-blue-100 text-blue-700">
                                    You
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] font-mono text-slate-400">ID: {u.id}</div>
                            </div>
                          </div>
                        </td>

                        <td className="p-3.5">
                          <div className="text-xs text-slate-700 font-medium">{u.email}</div>
                          <div className="text-[10px] text-slate-400">{u.phone || '+63 (02) 8842-9102'}</div>
                        </td>

                        <td className="p-3.5">
                          <div className="flex items-center gap-2">
                            <select
                              value={u.role}
                              onChange={(e) => {
                                updateUserRole(u.id, e.target.value);
                                showToast(`Reassigned ${u.name} to "${e.target.value}" role.`);
                              }}
                              className="bg-white border border-slate-200 text-xs font-bold text-slate-800 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 cursor-pointer shadow-2xs"
                            >
                              {roles.map((r) => (
                                <option key={r.id} value={r.id}>
                                  {r.name} {r.isSystem ? '(System)' : '(Custom)'}
                                </option>
                              ))}
                            </select>
                          </div>
                        </td>

                        <td className="p-3.5 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {u.status === 'invited' && u.email && (
                              <button
                                type="button"
                                onClick={async () => {
                                  const link = `${window.location.origin}/?join=1&email=${encodeURIComponent(u.email)}`;
                                  try {
                                    await navigator.clipboard.writeText(link);
                                    showToast(`Join link copied for ${u.email}. They open it, choose a password, and join this company.`);
                                  } catch {
                                    showToast(link);
                                  }
                                }}
                                className="px-2.5 py-1.5 rounded-lg text-xs font-bold border border-slate-200 text-slate-700 hover:bg-slate-50"
                              >
                                Copy join link
                              </button>
                            )}
                            {canRemoveTeammates && !isCurrentUser && (
                              <button
                                type="button"
                                onClick={() => setMemberToRemove(u)}
                                className="px-2.5 py-1.5 rounded-lg text-xs font-bold border border-rose-200 bg-white text-rose-700 hover:bg-rose-50 shrink-0"
                              >
                                {u.status === 'invited' ? 'Cancel invite' : 'Remove'}
                              </button>
                            )}
                            <span className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                            isCurrentUser
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : u.status === 'invited'
                              ? 'bg-amber-50 text-amber-800 border border-amber-200'
                              : 'bg-slate-100 text-slate-600 border border-slate-200'
                          }`}>
                            {isCurrentUser ? 'Signed in' : u.status === 'invited' ? 'Invite pending' : 'Active'}
                          </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* SUBTAB 4: LOCAL DB INSPECTOR & AUDIT TRAIL */}
        {activeSubTab === 'db_inspector' && (
          <div className="space-y-6">
            {/* Storage Health Card */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center">
                    <Database className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">Firebase RBAC Inspector</h3>
                    <p className="text-xs text-slate-500">Roles, seats, and audit trail stored in Cloud Firestore</p>
                  </div>
                </div>

                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span>Firestore Connected</span>
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="text-[10px] font-bold text-slate-500 uppercase">Plan usage</div>
                  <div className="text-base font-extrabold text-slate-900 mt-0.5">
                    {subscriptionUsage.accountsUsed}/{subscriptionUsage.maxAccounts ?? '∞'} seats
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    {subscriptionUsage.rolesUsed}/{subscriptionUsage.maxRoles ?? '∞'} roles
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="text-[10px] font-bold text-slate-500 uppercase">Active RBAC records</div>
                  <div className="text-base font-extrabold text-blue-600 mt-0.5">{roles.length} Roles Defined</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Collection: companies/{'{id}'}/roles</div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="text-[10px] font-bold text-slate-500 uppercase">Audit Trail Events</div>
                  <div className="text-base font-extrabold text-purple-600 mt-0.5">{rbacAuditLogs.length} Logged Events</div>
                  <span className="text-[10px] text-slate-400 mt-0.5">Collection: companies/{'{id}'}/auditLogs</span>
                </div>
              </div>
            </div>

            {/* Audit Trail Table */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-2xs overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">RBAC Security & Role Change Audit Trail</h4>
                  <p className="text-xs text-slate-500">Immutable chronological log of role creations, updates, and permission grants.</p>
                </div>
              </div>

              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold">
                    <th className="p-3.5">Timestamp</th>
                    <th className="p-3.5">Actor</th>
                    <th className="p-3.5">Action</th>
                    <th className="p-3.5">Details & Target</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rbacAuditLogs.slice(0, 15).map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3.5 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                      <td className="p-3.5">
                        <div className="font-bold text-slate-900 text-xs">{log.actorName}</div>
                        <div className="text-[10px] text-slate-500">{log.actorRole}</div>
                      </td>
                      <td className="p-3.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          log.action === 'ROLE_CREATED' ? 'bg-emerald-100 text-emerald-800' :
                          log.action === 'ROLE_UPDATED' ? 'bg-blue-100 text-blue-800' :
                          log.action === 'ROLE_DELETED' ? 'bg-rose-100 text-rose-800' :
                          log.action === 'USER_ROLE_ASSIGNED' ? 'bg-purple-100 text-purple-800' :
                          log.action === 'USER_REMOVED' ? 'bg-rose-100 text-rose-800' :
                          'bg-slate-100 text-slate-800'
                        }`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="p-3.5 text-slate-700">
                        <div>{log.details}</div>
                        {log.targetRole && (
                          <span className="text-[10px] font-mono text-slate-400">Target Role: {log.targetRole}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>

      {/* Role Editor Modal */}
      <RoleEditorModal
        isOpen={isEditorOpen}
        onClose={() => setIsEditorOpen(false)}
        roleToEdit={editingRole}
        onSaveRole={handleSaveRole}
      />

      {/* Add Team Member Modal */}
      {isAddUserOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in" onClick={closeIfBackdrop(() => setIsAddUserOpen(false))}>
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold">
                  <Users className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-slate-900 text-sm">Add New Team Member</h3>
              </div>
              <button
                onClick={() => setIsAddUserOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  placeholder="e.g. Juan De La Cruz"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Email Address *</label>
                <input
                  type="email"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  placeholder="juan.dispatch@casinfreight.ph"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Contact Phone</label>
                <input
                  type="text"
                  value={newUserPhone}
                  onChange={(e) => setNewUserPhone(e.target.value)}
                  placeholder="+63 917 554 9911"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Assign RBAC Role</label>
                <select
                  value={newUserRole}
                  onChange={(e) => setNewUserRole(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-bold focus:outline-none focus:border-blue-500"
                >
                  {roles.filter((r) => r.id.toLowerCase() !== 'owner').map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} {r.isSystem ? '(System)' : '(Custom)'}
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddUserOpen(false)}
                  className="px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm"
                >
                  Add Operator
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {memberToRemove && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in"
          onClick={closeIfBackdrop(() => !isRemovingMember && setMemberToRemove(null))}
        >
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-rose-600 text-white flex items-center justify-center">
                  <Trash2 className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-slate-900 text-sm">
                  {memberToRemove.status === 'invited' ? 'Cancel invite' : 'Remove from company'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setMemberToRemove(null)}
                disabled={isRemovingMember}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              {memberToRemove.status === 'invited'
                ? `${memberToRemove.name} (${memberToRemove.email}) will not be able to join with the current link. You can invite them again later.`
                : `${memberToRemove.name} (${memberToRemove.email}) will lose access to this company immediately. Their login is not deleted — they just cannot open this workspace. You can invite them again later.`}
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setMemberToRemove(null)}
                disabled={isRemovingMember}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Keep
              </button>
              <button
                type="button"
                onClick={handleConfirmRemoveMember}
                disabled={isRemovingMember}
                className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold disabled:opacity-60"
              >
                {isRemovingMember
                  ? 'Removing…'
                  : memberToRemove.status === 'invited'
                    ? 'Cancel invite'
                    : 'Remove from company'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import Database JSON Modal */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in" onClick={closeIfBackdrop(() => setIsImportModalOpen(false))}>
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold">
                  <Upload className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-slate-900 text-sm">Import Local RBAC Database JSON</h3>
              </div>
              <button
                onClick={() => setIsImportModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {importFeedback && (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 px-3 py-2 rounded-xl text-xs">
                {importFeedback}
              </div>
            )}

            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700">Paste JSON Snapshot Content</label>
              <textarea
                value={importJsonText}
                onChange={(e) => setImportJsonText(e.target.value)}
                placeholder='{"version": "2.0.0", "roles": [...]}'
                rows={8}
                className="w-full p-3 font-mono text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsImportModalOpen(false)}
                className="px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleImportJson}
                className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm"
              >
                Import & Sync
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
