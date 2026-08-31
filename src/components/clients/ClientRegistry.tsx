import React, { useState } from 'react';
import {
  Building2,
  Plus,
  Search,
  Phone,
  Mail,
  FileText,
  Edit3,
  Trash2,
  X,
  User,
  MapPin,
} from 'lucide-react';
import { useFreight } from '../../context/FreightContext';
import { closeIfBackdrop } from '../../lib/modal';
import { Client } from '../../types';
import { FeatureHowTo } from '../help/FeatureHowTo';

const EMPTY_FORM = {
  name: '',
  tin: '',
  contactPerson: '',
  phone: '+63 9',
  email: '',
  billingAddress: '',
  paymentTermsDays: 30,
};

export const ClientRegistry: React.FC = () => {
  const { clients, addClient, updateClient, deleteClient, canAccess } = useFreight();
  const canManage = canAccess('new_trip') || canAccess('ratecard_crud');

  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const handleOpenAdd = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowModal(true);
  };

  const handleOpenEdit = (client: Client) => {
    setEditingId(client.id);
    setForm({
      name: client.name,
      tin: client.tin,
      contactPerson: client.contactPerson,
      phone: client.phone,
      email: client.email,
      billingAddress: client.billingAddress,
      paymentTermsDays: client.paymentTermsDays,
    });
    setShowModal(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      window.alert('Enter the shipper / client company name.');
      return;
    }
    const payload = {
      name: form.name.trim(),
      tin: form.tin.trim(),
      contactPerson: form.contactPerson.trim(),
      phone: form.phone.trim(),
      email: form.email.trim(),
      billingAddress: form.billingAddress.trim(),
      paymentTermsDays: Number(form.paymentTermsDays) || 30,
    };
    if (editingId) {
      updateClient(editingId, payload);
    } else {
      addClient(payload);
    }
    setShowModal(false);
  };

  const filtered = clients.filter((client) => {
    const q = search.toLowerCase();
    if (!q) return true;
    return [client.name, client.tin, client.contactPerson, client.email, client.phone]
      .join(' ')
      .toLowerCase()
      .includes(q);
  });

  return (
    <div data-tutorial="clients-page" className="flex-1 flex flex-col min-w-0 bg-slate-50 text-slate-900 overflow-y-auto">
      <div className="p-4 md:px-6 md:pt-6 md:pb-4 border-b border-slate-200 bg-white">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-slate-900">Shippers & Clients</h1>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 font-mono border border-slate-200">
                {clients.length} accounts
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Billing names, TIN, payment terms, and contacts used when you book a trip and create a freight bill.
            </p>
            <div className="mt-3 max-w-xl">
              <FeatureHowTo feature="clients" />
            </div>
          </div>

          {canManage && (
            <button
              type="button"
              onClick={handleOpenAdd}
              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all shadow-xs active:scale-95"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Add Client</span>
            </button>
          )}
        </div>

        <div className="mt-4 max-w-sm">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search company, TIN, contact..."
              className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="max-w-sm text-center space-y-3">
            <div className="w-12 h-12 mx-auto rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center">
              <Building2 className="w-6 h-6 text-blue-600" />
            </div>
            <h2 className="text-sm font-bold text-slate-900">No shippers yet</h2>
            <p className="text-xs text-slate-500">
              Add the companies you haul for. A trip cannot be booked until at least one client is on file.
            </p>
            {canManage && (
              <button
                type="button"
                onClick={handleOpenAdd}
                className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-1.5 rounded-lg text-xs font-bold"
              >
                <Plus className="w-4 h-4" />
                Add first client
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="p-4 md:p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((client) => (
            <div
              key={client.id}
              className="bg-white border border-slate-200 rounded-xl p-4 space-y-3 hover:border-slate-300 transition-colors shadow-2xs"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center font-bold text-blue-600 text-sm shrink-0">
                    {client.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-slate-900 text-sm truncate">{client.name}</h3>
                    <div className="text-[11px] text-slate-500 font-mono truncate">
                      TIN {client.tin || '—'}
                    </div>
                  </div>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-slate-50 text-slate-600 border-slate-200 shrink-0">
                  {client.paymentTermsDays}d terms
                </span>
              </div>

              <div className="space-y-1.5 text-[11px] text-slate-600">
                <div className="flex items-center gap-1.5">
                  <User className="w-3 h-3 text-slate-400" />
                  <span className="truncate">{client.contactPerson || 'No contact person'}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Phone className="w-3 h-3 text-slate-400" />
                  <span className="font-mono">{client.phone || '—'}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Mail className="w-3 h-3 text-slate-400" />
                  <span className="truncate">{client.email || '—'}</span>
                </div>
                <div className="flex items-start gap-1.5">
                  <MapPin className="w-3 h-3 text-slate-400 mt-0.5" />
                  <span className="line-clamp-2">{client.billingAddress || 'No billing address'}</span>
                </div>
              </div>

              {canManage && (
                <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(client)}
                    className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded text-xs flex items-center gap-1 font-medium"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm(`Remove ${client.name} from the client list? Existing trips keep the name already saved on the waybill.`)) {
                        deleteClient(client.id);
                      }
                    }}
                    className="p-1 text-slate-400 hover:text-rose-600 hover:bg-slate-100 rounded"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4" onClick={closeIfBackdrop(() => setShowModal(false))}>
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md p-5 space-y-4 shadow-2xl text-xs text-slate-900">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h2 className="text-base font-bold text-slate-900">
                {editingId ? 'Edit client' : 'Add shipper / client'}
              </h2>
              <button type="button" onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3">
              <label className="block">
                <span className="font-semibold text-slate-700">Company / shipper name *</span>
                <input
                  required
                  value={form.name}
                  onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g. Universal Robina Corp."
                  className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:bg-white focus:outline-none focus:border-blue-500"
                />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="font-semibold text-slate-700">TIN</span>
                  <input
                    value={form.tin}
                    onChange={(e) => setForm((prev) => ({ ...prev, tin: e.target.value }))}
                    placeholder="000-000-000-000"
                    className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:bg-white focus:outline-none focus:border-blue-500"
                  />
                </label>
                <label className="block">
                  <span className="font-semibold text-slate-700">Payment terms</span>
                  <select
                    value={form.paymentTermsDays}
                    onChange={(e) => setForm((prev) => ({ ...prev, paymentTermsDays: Number(e.target.value) }))}
                    className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:bg-white focus:outline-none focus:border-blue-500"
                  >
                    <option value={7}>7 days</option>
                    <option value={15}>15 days</option>
                    <option value={30}>30 days</option>
                    <option value={45}>45 days</option>
                    <option value={60}>60 days</option>
                  </select>
                </label>
              </div>
              <label className="block">
                <span className="font-semibold text-slate-700">Contact person</span>
                <input
                  value={form.contactPerson}
                  onChange={(e) => setForm((prev) => ({ ...prev, contactPerson: e.target.value }))}
                  placeholder="Logistics lead / AP"
                  className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:bg-white focus:outline-none focus:border-blue-500"
                />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="font-semibold text-slate-700">Phone</span>
                  <input
                    value={form.phone}
                    onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
                    className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:bg-white focus:outline-none focus:border-blue-500"
                  />
                </label>
                <label className="block">
                  <span className="font-semibold text-slate-700">Email</span>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                    placeholder="billing@client.ph"
                    className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:bg-white focus:outline-none focus:border-blue-500"
                  />
                </label>
              </div>
              <label className="block">
                <span className="font-semibold text-slate-700">Billing address</span>
                <textarea
                  value={form.billingAddress}
                  onChange={(e) => setForm((prev) => ({ ...prev, billingAddress: e.target.value }))}
                  rows={2}
                  placeholder="Plant, warehouse, or billing office"
                  className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:bg-white focus:outline-none focus:border-blue-500"
                />
              </label>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-3 py-1.5 rounded-lg text-slate-600 hover:bg-slate-100 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold"
                >
                  <FileText className="w-3.5 h-3.5" />
                  {editingId ? 'Save client' : 'Add client'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
