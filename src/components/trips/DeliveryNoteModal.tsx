import React from 'react';
import { 
  X, 
  Printer, 
  Download, 
  FileText, 
  Truck, 
  User, 
  MapPin, 
  ShieldCheck, 
  CheckCircle2, 
  Calendar, 
  Clock, 
  Package, 
  Building2,
  Copy,
  Check
} from 'lucide-react';
import { Trip, Truck as TruckType, Driver, Client, Company } from '../../types';

interface DeliveryNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  trip: Trip;
  truck?: TruckType;
  driver?: Driver;
  client?: Client;
  company: Company;
}

export const DeliveryNoteModal: React.FC<DeliveryNoteModalProps> = ({
  isOpen,
  onClose,
  trip,
  truck,
  driver,
  client,
  company
}) => {
  const [copied, setCopied] = React.useState(false);

  if (!isOpen) return null;

  const deliveryNoteNo = trip.deliveryNoteNumber || `DN-2026-${trip.tripNumber.replace(/\D/g, '') || '0811'}`;
  const sealNo = trip.securitySealNumber || 'SEAL-PH-882941';
  const gatePassNo = trip.gatePassNumber || `GP-${trip.originZone.slice(0, 3).toUpperCase()}-9402`;
  const issuedDate = new Date().toLocaleDateString('en-PH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const handleCopy = () => {
    navigator.clipboard.writeText(deliveryNoteNo);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-70 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 md:p-6 overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-4xl max-h-[94vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 text-slate-900 relative">
        
        {/* Header Action Bar */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between no-print">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center font-bold shadow-2xs">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                Official Consignment Delivery Note (DN / Delivery Receipt)
                <span className="font-mono text-xs px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                  {deliveryNoteNo}
                </span>
              </h3>
              <p className="text-[11px] text-slate-500">
                Philippine Domestic Freight & Cargo Delivery Manifest
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors shadow-2xs"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy DN #'}</span>
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors shadow-2xs"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / Save PDF</span>
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg border border-slate-200 hover:bg-slate-100 flex items-center justify-center text-slate-500 hover:text-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Document Paper */}
        <div className="overflow-y-auto p-6 md:p-8 flex-1 bg-white text-slate-900 font-sans text-xs space-y-6">
          
          {/* Letterhead & Document Meta */}
          <div className="border-b-2 border-slate-800 pb-5 flex flex-col sm:flex-row justify-between items-start gap-4">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black text-sm tracking-wider shadow-xs">
                  CF
                </div>
                <div>
                  <h1 className="text-base font-black text-slate-900 uppercase tracking-tight">
                    {company.name}
                  </h1>
                  <p className="text-[11px] text-slate-500 font-medium">{company.tagline}</p>
                </div>
              </div>
              <p className="text-[11px] text-slate-600 mt-2">
                {company.address} • BIR TIN: {company.tin}
              </p>
              <p className="text-[11px] text-slate-600">
                LTFRB CPC / Truck-for-Hire Permit No: <span className="font-semibold text-slate-800">LTFRB-NCR-TH-2024-88419</span>
              </p>
            </div>

            <div className="text-left sm:text-right bg-slate-50 p-3 rounded-xl border border-slate-200 min-w-[220px]">
              <div className="text-[10px] font-bold uppercase tracking-wider text-blue-600">
                DELIVERY NOTE / WAYBILL
              </div>
              <div className="text-sm font-black font-mono text-slate-900 mt-0.5">
                {deliveryNoteNo}
              </div>
              <div className="text-[11px] text-slate-600 mt-1 font-mono">
                Waybill: <strong className="text-slate-800">{trip.waybillNumber}</strong>
              </div>
              <div className="text-[11px] text-slate-600 font-mono">
                Trip #: <strong className="text-slate-800">{trip.tripNumber}</strong>
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                Issued Date: <span className="font-semibold text-slate-700">{issuedDate}</span>
              </div>
            </div>
          </div>

          {/* Consignor & Consignee Section */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Consignor / Shipper Origin */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-1.5">
              <div className="flex items-center gap-1.5 text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                <MapPin className="w-3 h-3 text-blue-600" />
                <span>Origin & Shipper Facility (Consignor)</span>
              </div>
              <div className="font-bold text-slate-900 text-xs">{trip.originZone}</div>
              <p className="text-slate-600 text-[11px] leading-relaxed">{trip.originAddress}</p>
              <div className="pt-1.5 mt-1 border-t border-slate-200/80 flex items-center justify-between text-[10px] text-slate-500">
                <span>Gate Pass Ref: <strong className="font-mono text-slate-700">{gatePassNo}</strong></span>
                <span>Scheduled: {new Date(trip.scheduledPickup).toLocaleDateString()}</span>
              </div>
            </div>

            {/* Consignee / Delivery Destination */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-1.5">
              <div className="flex items-center gap-1.5 text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                <Building2 className="w-3 h-3 text-emerald-600" />
                <span>Consignee & Delivery Destination</span>
              </div>
              <div className="font-bold text-slate-900 text-xs">{client ? client.name : 'Registered Client Consignee'}</div>
              <p className="text-slate-600 text-[11px] leading-relaxed">{trip.destinationAddress}</p>
              <div className="pt-1.5 mt-1 border-t border-slate-200/80 flex items-center justify-between text-[10px] text-slate-500">
                <span>Destination Zone: <strong className="text-slate-700">{trip.destinationZone}</strong></span>
                <span>TIN: {client?.tin || 'N/A'}</span>
              </div>
            </div>
          </div>

          {/* Transport Unit & Crew Details */}
          <div className="bg-blue-50/50 border border-blue-200/80 rounded-xl p-3.5 grid grid-cols-2 sm:grid-cols-4 gap-3 text-slate-700">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase">Assigned Truck</span>
              <div className="font-mono font-bold text-slate-900 text-xs mt-0.5">
                {truck ? truck.plateNumber : 'Plate Pending'}
              </div>
              <span className="text-[10px] text-slate-500">{truck?.type}</span>
            </div>

            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase">Authorized Driver</span>
              <div className="font-bold text-slate-900 text-xs mt-0.5">
                {driver ? driver.name : 'Fleet Driver'}
              </div>
              <span className="text-[10px] text-slate-500 font-mono">Lic: {driver?.licenseNo || 'PRO-LTO'}</span>
            </div>

            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase">Security Seal #</span>
              <div className="font-mono font-bold text-blue-700 text-xs mt-0.5">
                {sealNo}
              </div>
              <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" /> Intact at Origin
              </span>
            </div>

            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase">Cargo Load State</span>
              <div className="font-mono font-bold text-slate-900 text-xs mt-0.5">
                {(trip.cargoWeightKg / 1000).toFixed(2)} MT / {trip.cargoVolumeCbm} CBM
              </div>
              <span className="text-[10px] text-slate-500">
                {trip.isOverweight ? '⚠️ DPWH Special Permit' : '✓ Safe Gross Axle Load'}
              </span>
            </div>
          </div>

          {/* Cargo Manifest Table */}
          <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
            <div className="bg-slate-100/90 px-4 py-2 border-b border-slate-200 font-bold text-slate-800 uppercase tracking-wider text-[10px]">
              Itemized Cargo Manifest & Tally
            </div>
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[10px] uppercase font-bold text-slate-500">
                  <th className="py-2.5 px-4">Item Description & Commodity</th>
                  <th className="py-2.5 px-4 text-center">Gross Weight</th>
                  <th className="py-2.5 px-4 text-center">Volume</th>
                  <th className="py-2.5 px-4 text-right">Packaging & Seal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr>
                  <td className="py-3 px-4">
                    <div className="font-bold text-slate-900">{trip.cargoDescription}</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      Commercial Freight Consignment • Standard Palletized Unit Loads
                    </div>
                  </td>
                  <td className="py-3 px-4 text-center font-mono font-bold text-slate-800">
                    {trip.cargoWeightKg.toLocaleString()} kg
                    <span className="text-[10px] text-slate-400 block font-normal">
                      ({(trip.cargoWeightKg / 1000).toFixed(2)} MT)
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center font-mono text-slate-800">
                    {trip.cargoVolumeCbm} m³
                  </td>
                  <td className="py-3 px-4 text-right font-mono">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200 text-[10px] font-bold">
                      Seal: {sealNo}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Special Instructions & Declarations */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-[11px] text-slate-600 space-y-1">
            <div className="font-bold text-slate-800 text-xs">Special Instructions & Shipper Declarations:</div>
            <p>
              1. Goods are transported under Casin Freight Logistics domestic contract terms. Consignee must inspect container seals before offloading.
            </p>
            <p>
              2. Any damages, shortages, or discrepancies must be explicitly noted on this Delivery Note and signed by the receiver prior to driver departure.
            </p>
            {trip.notes && (
              <p className="text-amber-900 bg-amber-50 p-2 rounded border border-amber-200 font-medium mt-1">
                <strong>Dispatch Note:</strong> {trip.notes}
              </p>
            )}
          </div>

          {/* Formal 3-Column Sign-Off Section */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-slate-200">
            {/* 1. Shipper / Warehouse Dispatcher */}
            <div className="border border-slate-200 rounded-xl p-3.5 flex flex-col justify-between h-36 bg-slate-50/50">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                1. Dispatched / Released by
              </div>
              <div className="border-b border-dashed border-slate-400 pb-1 text-center font-bold text-slate-900 text-xs">
                Mark Lester Santos
              </div>
              <div className="text-[10px] text-slate-500 text-center">
                Shipper Dispatcher / Signature & Date
              </div>
            </div>

            {/* 2. Assigned Driver / Transporter */}
            <div className="border border-slate-200 rounded-xl p-3.5 flex flex-col justify-between h-36 bg-slate-50/50">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                2. Received for Hauling by Driver
              </div>
              <div className="border-b border-dashed border-slate-400 pb-1 text-center font-bold text-slate-900 text-xs">
                {driver?.name || 'Authorized Driver'}
              </div>
              <div className="text-[10px] text-slate-500 text-center font-mono">
                Lic: {driver?.licenseNo || 'N02-LTO'} • Signature
              </div>
            </div>

            {/* 3. Consignee Receiving Officer */}
            <div className="border border-blue-200 rounded-xl p-3.5 flex flex-col justify-between h-36 bg-blue-50/30">
              <div className="text-[10px] font-bold uppercase tracking-wider text-blue-700 flex items-center justify-between">
                <span>3. Received in Good Order</span>
                {trip.pod && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
              </div>
              <div className="border-b border-dashed border-blue-400 pb-1 text-center font-bold text-slate-900 text-xs">
                {trip.pod?.receiverName || 'Consignee Receiving Officer'}
              </div>
              <div className="text-[10px] text-slate-500 text-center">
                {trip.pod ? `Signed: ${new Date(trip.pod.signedAt).toLocaleDateString()}` : 'Printed Name, Signature & Stamp'}
              </div>
            </div>
          </div>

          {/* Footer Notice */}
          <div className="text-[10px] text-center text-slate-400 pt-2 border-t border-slate-100">
            Document generated electronically via Casin Freight Logistics Management System • Philippine Republic Act No. 8792 (E-Commerce Act Compliant)
          </div>

        </div>

      </div>
    </div>
  );
};
