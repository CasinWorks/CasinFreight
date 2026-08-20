import React, { useState, useRef, useEffect } from 'react';
import { 
  X, 
  Truck as TruckIcon, 
  User, 
  MapPin, 
  Calendar, 
  Clock, 
  Scale, 
  AlertTriangle, 
  FileCheck2, 
  Receipt, 
  CheckCircle2, 
  Camera, 
  PenTool, 
  Plus, 
  Trash2, 
  ExternalLink,
  ShieldCheck, 
  Fuel, 
  Coins, 
  ArrowRight, 
  Sparkles, 
  Layers, 
  FileSignature, 
  FileText,
  Printer,
  Lock,
  ShieldAlert,
  UserCheck,
  Ban,
  PauseCircle,
  Play
} from 'lucide-react';
import { useFreight } from '../../context/FreightContext';
import { canvasPointFromEvent, isPlaceholderSignatory, readSignatureDataUrl } from '../../lib/podSignoff';
import { uploadCompanyFile } from '../../lib/uploads';
import { Trip, TripStatus, AccessorialType, POD, HOLD_EXCEPTION_KINDS, CANCEL_EXCEPTION_KINDS, TripExceptionKind } from '../../types';
import { matchingTruckBans } from '../../lib/truckBans';
import { TruckBanAlert } from '../truckbans/TruckBanAlert';
import { DeliveryNoteModal } from './DeliveryNoteModal';
import { StatusPrerequisiteModal } from './StatusPrerequisiteModal';
import { TripExceptionModal } from './TripExceptionModal';
import { LiveTrackingPanel } from './LiveTrackingPanel';
import { exceptionKindLabel, resumeTarget } from './TripKanbanCard';
import { TripProfitabilityView } from './TripProfitabilityView';
import { FuelLogModal } from '../fleet/FuelLogModal';

interface TripDetailModalProps {
  tripId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenInvoice: (invoiceId: string) => void;
}

export const TripDetailModal: React.FC<TripDetailModalProps> = ({ 
  tripId, 
  isOpen, 
  onClose, 
  onOpenInvoice 
}) => {
  const { 
    company,
    trips, 
    trucks, 
    drivers, 
    clients, 
    updateTripStatus, 
    updateTrip, 
    addAccessorialToTrip, 
    removeAccessorialFromTrip, 
    submitPOD, 
    createInvoiceForTrip, 
    getInvoiceByTripId,
    canManipulateTripStatus,
    canManageFinancials,
    canReassignFleet,
    canDeleteTrip,
    canAccess,
    currentUser,
    liveTracking,
    fieldEvents,
    truckBans,
  } = useFreight();

  // Modal sub-dialog states
  const [showDeliveryNoteModal, setShowDeliveryNoteModal] = useState(false);
  const [prerequisiteTargetStatus, setPrerequisiteTargetStatus] = useState<TripStatus | null>(null);
  const [activeTab, setActiveTab] = useState<'OPERATIONS' | 'PROFITABILITY' | 'DOCUMENTS'>('OPERATIONS');
  const [showFuelLogModal, setShowFuelLogModal] = useState(false);
  const [fuelModalTripId, setFuelModalTripId] = useState<string | undefined>(undefined);
  const [fuelModalTruckId, setFuelModalTruckId] = useState<string | undefined>(undefined);

  // Signature Canvas state
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);

  // POD Form state
  const [receiverName, setReceiverName] = useState('');
  const [receiverRole, setReceiverRole] = useState('');
  const [receiverIdNumber, setReceiverIdNumber] = useState('');
  const [podNotes, setPodNotes] = useState('Received all items in clean, undamaged condition. Seals intact.');
  const [conditionStatus, setConditionStatus] = useState<'Good Condition' | 'Partial Damage' | 'Packaging Discrepancy'>('Good Condition');
  const [podPhotos, setPodPhotos] = useState<string[]>([]);
  const [isUploadingPodPhoto, setIsUploadingPodPhoto] = useState(false);
  const podFileInputRef = useRef<HTMLInputElement | null>(null);

  // Accessorial quick-add modal state
  const [showAddAccModal, setShowAddAccModal] = useState(false);
  const [newAccType, setNewAccType] = useState<AccessorialType>('helper_crew');
  const [newAccName, setNewAccName] = useState('Loading & Unloading Helper Crew (2 Pax)');
  const [newAccDetail, setNewAccDetail] = useState('Assisted container pallet restacking');
  const [newAccAmount, setNewAccAmount] = useState<number>(1800);

  // Live Demurrage Editor
  const [editingDemurrage, setEditingDemurrage] = useState(false);
  const [tempDemurrageHours, setTempDemurrageHours] = useState(0);

  // Status transition note
  const [statusUpdateNote, setStatusUpdateNote] = useState('');
  const [statusUpdateLocation, setStatusUpdateLocation] = useState('');
  const [exceptionMode, setExceptionMode] = useState<'hold' | 'cancel' | null>(null);

  const trip = trips.find(t => t.id === tripId);

  useEffect(() => {
    if (trip) {
      setTempDemurrageHours(trip.demurrageHours);
      if (trip.pod) {
        setReceiverName(isPlaceholderSignatory(trip.pod.receiverName) ? '' : trip.pod.receiverName);
        setReceiverRole(isPlaceholderSignatory(trip.pod.receiverRole) ? '' : trip.pod.receiverRole);
        setReceiverIdNumber(trip.pod.receiverIdNumber || '');
        setPodNotes(trip.pod.notes || '');
        setConditionStatus(trip.pod.conditionStatus);
        setPodPhotos(trip.pod.photoUrls || []);
      }
    }
  }, [trip]);

  if (!isOpen || !trip) return null;

  const trk = trucks.find(t => t.id === trip.truckId);
  const drv = drivers.find(d => d.id === trip.driverId);
  const clt = clients.find(c => c.id === trip.clientId);
  const existingInvoice = getInvoiceByTripId(trip.id);
  const banHits = matchingTruckBans({
    bans: truckBans,
    originZone: trip.originZone,
    originAddress: trip.originAddress,
    destinationZone: trip.destinationZone,
    destinationAddress: trip.destinationAddress,
    scheduledPickup: trip.scheduledPickup,
    scheduledDelivery: trip.scheduledDelivery,
    truckType: trk?.type,
    includeNow: trip.status === 'In Transit' || trip.status === 'Loaded',
  });

  const netCap = trk ? trk.netPayloadKg : 10000;
  const loadPercentage = Math.round((trip.cargoWeightKg / netCap) * 100);
  const totalApprovedAccessorials = trip.accessorials.filter(a => a.approved).reduce((sum, a) => sum + a.amountPhp, 0);
  const grossTripTotal = trip.baseRatePhp + totalApprovedAccessorials;

  const dnNumber = trip.deliveryNoteNumber || 'Not recorded';
  const sealNumber = trip.securitySealNumber || 'Not recorded';
  const gatePassNumber = trip.gatePassNumber || 'Not recorded';
  const opsStatus = trip.status === 'On Hold' || trip.status === 'Cancelled' ? resumeTarget(trip) : trip.status;

  // Signature canvas handlers
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);
    const { x, y } = canvasPointFromEvent(canvas, e);

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = canvasPointFromEvent(canvas, e);

    ctx.lineTo(x, y);
    ctx.stroke();
    setHasSignature(true);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  };

  const handleSavePOD = () => {
    if (isPlaceholderSignatory(receiverName)) {
      alert('Enter the consignee’s real full name.');
      return;
    }

    const sigDataUrl = readSignatureDataUrl(canvasRef.current, trip.pod?.signatureDataUrl);
    if (!sigDataUrl) {
      alert('The receiving officer must sign the pad.');
      return;
    }

    submitPOD(trip.id, {
      receiverName: receiverName.trim(),
      receiverRole: receiverRole.trim() || 'Consignee receiving officer',
      receiverIdNumber,
      notes: podNotes,
      conditionStatus,
      signatureDataUrl: sigDataUrl,
      photoUrls: podPhotos,
    });
  };

  const handleAddAccessorial = (e: React.FormEvent) => {
    e.preventDefault();
    addAccessorialToTrip(trip.id, {
      type: newAccType,
      name: newAccName,
      calculationDetail: newAccDetail,
      amountPhp: Number(newAccAmount),
      isAutoTriggered: false,
      approved: true,
    });
    setShowAddAccModal(false);
  };

  const handleUpdateDemurrage = () => {
    const hours = Number(tempDemurrageHours);
    const demurrageAmount = hours * trip.demurrageRatePerHour;

    // Remove any existing auto demurrage accessorials
    const filtered = trip.accessorials.filter(a => a.type !== 'demurrage');
    
    if (hours > 0) {
      filtered.push({
        id: `acc-dem-${Date.now()}`,
        tripId: trip.id,
        type: 'demurrage',
        name: `Holding Yard & Dock Demurrage (${hours}h)`,
        calculationDetail: `${hours} hours excess holding time @ ₱${trip.demurrageRatePerHour.toLocaleString()}/hr`,
        amountPhp: demurrageAmount,
        isAutoTriggered: true,
        approved: true,
      });
    }

    updateTrip(trip.id, {
      demurrageHours: hours,
      accessorials: filtered,
    });
    setEditingDemurrage(false);
  };

  // Open Prerequisite Clearance Modal before advancing
  const handleInitiateAdvance = (nextStatus: TripStatus) => {
    if (nextStatus === trip.status) return;

    if (nextStatus === 'On Hold' || nextStatus === 'Cancelled') {
      if (trip.status === 'Invoiced') return;
      if (nextStatus === 'On Hold' && trip.status === 'Cancelled') return;
      setExceptionMode(nextStatus === 'On Hold' ? 'hold' : 'cancel');
      return;
    }

    if (trip.status === 'Cancelled' && nextStatus !== 'Pending') return;

    if (trip.status === 'On Hold') {
      const from = resumeTarget(trip);
      const stages: TripStatus[] = ['Pending', 'Loaded', 'In Transit', 'Delivered', 'Invoiced'];
      if (stages.indexOf(nextStatus) <= stages.indexOf(from)) {
        updateTripStatus(trip.id, nextStatus, 'Resumed from hold.', statusUpdateLocation || undefined);
        return;
      }
    }

    if (nextStatus === 'Pending') {
      updateTripStatus(trip.id, 'Pending', 'Trip reset to Pending status.');
      return;
    }

    setPrerequisiteTargetStatus(nextStatus);
  };

  const handleExceptionConfirm = (kind: TripExceptionKind, note: string) => {
    if (!exceptionMode) return;
    if (trip.status === 'Invoiced') {
      setExceptionMode(null);
      return;
    }
    const kinds = exceptionMode === 'hold' ? HOLD_EXCEPTION_KINDS : CANCEL_EXCEPTION_KINDS;
    const reasonLabel = kinds.find((item) => item.id === kind)?.label || kind;
    const noteText = [reasonLabel, note].filter(Boolean).join('. ');
    const previous = trip.status === 'On Hold' || trip.status === 'Cancelled'
      ? resumeTarget(trip)
      : trip.status;
    updateTripStatus(
      trip.id,
      exceptionMode === 'hold' ? 'On Hold' : 'Cancelled',
      noteText,
      statusUpdateLocation || undefined,
      {
        holdFromStatus: previous,
        exceptionKind: kind,
        exceptionNote: note || undefined,
      }
    );
    setExceptionMode(null);
  };

  const handleConfirmPrerequisiteAdvance = (updates: Partial<Trip>, note?: string) => {
    if (!prerequisiteTargetStatus) return;

    // Update prerequisite fields first
    updateTrip(trip.id, {
      ...updates,
      deliveryNoteNumber: updates.deliveryNoteNumber || trip.deliveryNoteNumber,
      securitySealNumber: updates.securitySealNumber || trip.securitySealNumber,
      gatePassNumber: updates.gatePassNumber || trip.gatePassNumber,
    });

    if (prerequisiteTargetStatus === 'Invoiced') {
      const inv = createInvoiceForTrip(trip.id);
      updateTripStatus(
        trip.id, 
        'Invoiced', 
        note || `Invoice #${inv.invoiceNumber} generated after prerequisite clearance.`,
        statusUpdateLocation || undefined,
        updates
      );
      setPrerequisiteTargetStatus(null);
      onOpenInvoice(inv.id);
    } else {
      updateTripStatus(
        trip.id, 
        prerequisiteTargetStatus, 
        note || statusUpdateNote || `Trip advanced to ${prerequisiteTargetStatus}`, 
        statusUpdateLocation || undefined,
        updates
      );
      setPrerequisiteTargetStatus(null);
    }

    setStatusUpdateNote('');
    setStatusUpdateLocation('');
  };

  const handleGenerateInvoice = () => {
    handleInitiateAdvance('Invoiced');
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 md:p-6 overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-5xl max-h-[94vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 text-slate-900">
        
        {/* Header */}
        <div className="p-4 md:px-6 md:py-4 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center font-bold shadow-2xs">
              <TruckIcon className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900 font-mono">{trip.tripNumber}</h2>
                <span className="text-xs px-2.5 py-0.5 rounded-full font-medium border bg-slate-100 text-slate-600 border-slate-200">
                  {trip.waybillNumber}
                </span>
                <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold border ${
                  trip.status === 'Pending' ? 'bg-slate-100 text-slate-700 border-slate-200' :
                  trip.status === 'Loaded' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                  trip.status === 'In Transit' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                  trip.status === 'Delivered' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                  trip.status === 'On Hold' ? 'bg-amber-50 text-amber-900 border-amber-300' :
                  trip.status === 'Cancelled' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                  'bg-purple-50 text-purple-700 border-purple-200'
                }`}>
                  {trip.status}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Client: <span className="text-slate-800 font-semibold">{clt?.name}</span> • Truck: <span className="font-mono text-slate-800">{trk?.plateNumber}</span> ({trk?.type})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* View Delivery Note Button */}
            <button
              onClick={() => setShowDeliveryNoteModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all shadow-2xs"
              title="View and print official Consignment Delivery Note (DR)"
            >
              <FileText className="w-3.5 h-3.5 text-blue-600" />
              <span>Delivery Note</span>
            </button>

            {trip.status === 'On Hold' && (
              <button
                onClick={() => updateTripStatus(trip.id, resumeTarget(trip), 'Resumed from hold.', statusUpdateLocation || undefined)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-all shadow-xs"
              >
                <Play className="w-3.5 h-3.5" />
                <span>Resume</span>
              </button>
            )}

            {trip.status !== 'Invoiced' && trip.status !== 'Cancelled' && trip.status !== 'On Hold' && (
              <button
                onClick={() => setExceptionMode('hold')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-bold"
              >
                <PauseCircle className="w-3.5 h-3.5" />
                <span>Hold</span>
              </button>
            )}

            {trip.status !== 'Invoiced' && trip.status !== 'Cancelled' && (
              <button
                onClick={() => setExceptionMode('cancel')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold"
              >
                <Ban className="w-3.5 h-3.5" />
                <span>Cancel</span>
              </button>
            )}

            {trip.status === 'Delivered' && (
              <button
                onClick={handleGenerateInvoice}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs active:scale-95"
              >
                <Receipt className="w-3.5 h-3.5" />
                <span>Generate Invoice</span>
              </button>
            )}

            {existingInvoice && (
              <button
                onClick={() => onOpenInvoice(existingInvoice.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition-all shadow-xs"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>View Invoice ({existingInvoice.invoiceNumber})</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {(trip.status === 'On Hold' || trip.status === 'Cancelled') && (
          <div className={`px-4 md:px-6 py-2.5 border-b text-xs flex items-start gap-2 ${
            trip.status === 'Cancelled' ? 'bg-rose-50 border-rose-200 text-rose-900' : 'bg-amber-50 border-amber-200 text-amber-950'
          }`}>
            {trip.status === 'Cancelled' ? <Ban className="w-4 h-4 mt-0.5 shrink-0" /> : <PauseCircle className="w-4 h-4 mt-0.5 shrink-0" />}
            <div>
              <p className="font-bold">
                {trip.status === 'Cancelled' ? 'This booking will not run.' : `On hold from ${resumeTarget(trip)}.`}
                {exceptionKindLabel(trip.exceptionKind) ? ` ${exceptionKindLabel(trip.exceptionKind)}.` : ''}
              </p>
              {trip.exceptionNote && <p className="mt-0.5 text-[11px] opacity-80">{trip.exceptionNote}</p>}
              {trip.status === 'On Hold' && (
                <p className="mt-0.5 text-[11px] opacity-80">Resume returns the card to {resumeTarget(trip)} without asking for load or driver signatures again.</p>
              )}
            </div>
          </div>
        )}

        {/* Interactive 5-Stage Status Stepper Banner */}
        <div className="bg-slate-100/90 px-4 md:px-6 py-2.5 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-2.5">
          <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 no-scrollbar">
            {(['Pending', 'Loaded', 'In Transit', 'Delivered', 'Invoiced'] as TripStatus[]).map((stage, idx) => {
              const stages: TripStatus[] = ['Pending', 'Loaded', 'In Transit', 'Delivered', 'Invoiced'];
              const pipelineStatus = trip.status === 'On Hold' || trip.status === 'Cancelled'
                ? resumeTarget(trip)
                : trip.status;
              const currentIdx = stages.indexOf(pipelineStatus);
              const isPast = idx < currentIdx || ((trip.status === 'On Hold' || trip.status === 'Cancelled') && idx === currentIdx);
              const isCurrent = trip.status === stage;
              const perm = canManipulateTripStatus(stage, trip.status);
              
              return (
                <React.Fragment key={stage}>
                  {idx > 0 && (
                    <ArrowRight className={`w-3.5 h-3.5 shrink-0 transition-colors ${
                      isPast ? 'text-blue-500' : isCurrent ? 'text-slate-500' : 'text-slate-300'
                    }`} />
                  )}
                  <button
                    onClick={() => handleInitiateAdvance(stage)}
                    title={perm.allowed 
                      ? `Click to switch status to ${stage} (validates required prerequisites)` 
                      : `🔒 Restricted: Requires ${perm.allowedRoles.join(', ')} role (Active: ${currentUser.role})`}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                      isCurrent
                        ? stage === 'Pending' ? 'bg-slate-800 text-white shadow-xs ring-2 ring-slate-400'
                        : stage === 'Loaded' ? 'bg-blue-600 text-white shadow-xs ring-2 ring-blue-300'
                        : stage === 'In Transit' ? 'bg-amber-500 text-white shadow-xs ring-2 ring-amber-300'
                        : stage === 'Delivered' ? 'bg-emerald-600 text-white shadow-xs ring-2 ring-emerald-300'
                        : 'bg-purple-700 text-white shadow-xs ring-2 ring-purple-300'
                        : isPast
                        ? 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200'
                        : !perm.allowed
                        ? 'bg-slate-100 text-slate-400 hover:bg-slate-200/80 border border-dashed border-slate-300 cursor-pointer'
                        : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 border border-slate-200'
                    }`}
                  >
                    <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${
                      isCurrent ? 'bg-white/20 text-white' : isPast ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {isPast ? '✓' : idx + 1}
                    </span>
                    <span>{stage}</span>
                    {!perm.allowed && !isCurrent && (
                      <Lock className="w-2.5 h-2.5 text-slate-400 opacity-80" />
                    )}
                  </button>
                </React.Fragment>
              );
            })}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {trip.status !== 'Invoiced' && trip.status !== 'On Hold' && trip.status !== 'Cancelled' && (() => {
              const invoicePerm = canManipulateTripStatus('Invoiced', trip.status);
              return (
                <button
                  onClick={() => handleInitiateAdvance('Invoiced')}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-white font-bold text-xs shadow-2xs transition-all active:scale-95 ${
                    invoicePerm.allowed
                      ? 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700'
                      : 'bg-slate-400 hover:bg-slate-500 opacity-90'
                  }`}
                  title={invoicePerm.allowed ? "Verify all documents & generate invoice" : invoicePerm.reason}
                >
                  {invoicePerm.allowed ? <Sparkles className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                  <span>Advance to Invoiced</span>
                  {!invoicePerm.allowed && <span className="text-[9px] bg-black/20 px-1 rounded font-normal">Billing/Owner</span>}
                </button>
              );
            })()}
          </div>
        </div>

        {/* Prerequisites & Shipment Documents Ribbon */}
        <div className="bg-slate-50 border-b border-slate-200 px-4 md:px-6 py-2 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3 flex-wrap">
            {/* Active User Role Indicator */}
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-200/80 text-slate-800 text-[11px] font-semibold border border-slate-300">
              <UserCheck className="w-3 h-3 text-blue-600" />
              <span>Role: <strong className="font-bold">{currentUser.role}</strong></span>
            </div>

            <div className="text-[11px] font-bold uppercase text-slate-500 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
              <span>Prerequisites:</span>
            </div>

            {/* Delivery Note Badge */}
            <button
              onClick={() => setShowDeliveryNoteModal(true)}
              className="flex items-center gap-1 px-2 py-0.5 rounded bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 font-mono font-semibold transition-colors"
              title="Click to view full Delivery Note document"
            >
              <FileText className="w-3 h-3 text-blue-600" />
              <span>{dnNumber}</span>
              <ExternalLink className="w-2.5 h-2.5 opacity-60" />
            </button>

            {/* Security Seal Badge */}
            <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-mono text-[11px]">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              <span>Seal: {sealNumber}</span>
            </span>

            {/* Gate Pass Badge */}
            <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 font-mono text-[11px]">
              <span>GP: {gatePassNumber}</span>
            </span>

            {/* POD Status Badge */}
            <span className={`flex items-center gap-1 px-2 py-0.5 rounded border text-[11px] font-semibold ${
              trip.pod 
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                : opsStatus === 'Pending' || opsStatus === 'Loaded'
                ? 'bg-slate-100 text-slate-600 border-slate-200'
                : 'bg-amber-50 text-amber-700 border-amber-200'
            }`}>
              <FileSignature className="w-3 h-3" />
              <span>
                {trip.pod 
                  ? `POD Verified (${trip.pod.receiverName})` 
                  : opsStatus === 'Pending' || opsStatus === 'Loaded'
                  ? 'POD Locked (Pre-Transit)'
                  : 'POD Pending at Destination'}
              </span>
            </span>
          </div>

          {trip.status !== 'On Hold' && trip.status !== 'Cancelled' && (
            <button
              onClick={() => setPrerequisiteTargetStatus(trip.status === 'Delivered' ? 'Invoiced' : trip.status === 'In Transit' ? 'Delivered' : trip.status === 'Loaded' ? 'In Transit' : 'Loaded')}
              className="text-[11px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 hover:underline"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Manage Stage Prerequisites</span>
            </button>
          )}
        </div>

        {/* Navigation Tabs Header */}
        <div className="bg-white border-b border-slate-200 px-4 md:px-6 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-2">
            <button
              onClick={() => setActiveTab('OPERATIONS')}
              className={`px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'OPERATIONS'
                  ? 'bg-blue-50 text-blue-700 border border-blue-200 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <TruckIcon className="w-3.5 h-3.5" />
              <span>Shipment & Execution</span>
            </button>

            <button
              onClick={() => setActiveTab('PROFITABILITY')}
              className={`px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'PROFITABILITY'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-300 shadow-2xs ring-1 ring-emerald-400/30'
                  : 'text-slate-600 hover:text-emerald-700 hover:bg-emerald-50/50'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              <span>Profitability & Fuel Analytics (Recharts)</span>
              <span className="px-1.5 py-0.2 rounded-full bg-emerald-600 text-white text-[9px] font-mono font-black">
                PROFIT
              </span>
            </button>

            <button
              onClick={() => setActiveTab('DOCUMENTS')}
              className={`px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'DOCUMENTS'
                  ? 'bg-purple-50 text-purple-700 border border-purple-200 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Consignment & Clearances</span>
            </button>
          </div>

          {/* Quick Gross Freight Tag */}
          <div className="hidden sm:flex items-center gap-2 text-xs">
            <span className="text-slate-400 font-medium">Trip Total:</span>
            <span className="font-mono font-black text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
              ₱{grossTripTotal.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Modal Body */}
        {activeTab === 'PROFITABILITY' ? (
          <div className="overflow-y-auto p-4 md:p-6 flex-1 text-xs bg-slate-50/50">
            <TripProfitabilityView
              trip={trip}
              truck={trk}
              driver={drv}
              client={clt}
              onOpenAddFuel={(tId, trkId) => {
                setFuelModalTripId(tId);
                setFuelModalTruckId(trkId);
                setShowFuelLogModal(true);
              }}
            />
          </div>
        ) : activeTab === 'DOCUMENTS' ? (
          <div className="overflow-y-auto p-4 md:p-6 flex-1 text-xs space-y-4 bg-slate-50/50">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Delivery Note DR Card */}
              <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3 shadow-2xs">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <div className="font-bold text-slate-800 flex items-center gap-1.5 text-xs">
                    <FileText className="w-4 h-4 text-blue-600" />
                    <span>Consignment Delivery Note (DR)</span>
                  </div>
                  <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                    {dnNumber}
                  </span>
                </div>
                <p className="text-slate-600 text-xs leading-relaxed">
                  Official commercial freight delivery document containing cargo descriptions, net weights, carrier details, and dual-party signatures.
                </p>
                <div className="pt-2">
                  <button
                    onClick={() => setShowDeliveryNoteModal(true)}
                    className="w-full py-2 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-2xs transition-all"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Open & Print Official Delivery Note</span>
                  </button>
                </div>
              </div>

              <LiveTrackingPanel
                tripId={trip.id}
                tracking={liveTracking.find((item) => item.tripId === trip.id || item.id === trip.id)}
                events={fieldEvents}
              />

              {/* Security Seal & Gate Pass Card */}
              <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3 shadow-2xs">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <div className="font-bold text-slate-800 flex items-center gap-1.5 text-xs">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>Physical Security Clearances</span>
                  </div>
                  <span className="text-emerald-700 bg-emerald-50 text-[10px] font-bold px-2 py-0.5 rounded border border-emerald-200">
                    Verified
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                    <div className="text-[10px] text-slate-400 uppercase font-semibold">Security Seal</div>
                    <div className="font-mono font-bold text-slate-900 mt-0.5">{sealNumber}</div>
                  </div>
                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                    <div className="text-[10px] text-slate-400 uppercase font-semibold">Port / Gate Pass</div>
                    <div className="font-mono font-bold text-slate-900 mt-0.5">{gatePassNumber}</div>
                  </div>
                </div>
                <div className="pt-1">
                  <button
                    onClick={() => setPrerequisiteTargetStatus(trip.status === 'Delivered' ? 'Invoiced' : trip.status === 'In Transit' ? 'Delivered' : 'Loaded')}
                    className="w-full py-2 px-3 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                    <span>Review All Stage Clearances</span>
                  </button>
                </div>
              </div>

              {/* Invoice Status Card */}
              <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3 shadow-2xs md:col-span-2">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <div className="font-bold text-slate-800 flex items-center gap-1.5 text-xs">
                    <Receipt className="w-4 h-4 text-purple-600" />
                    <span>Commercial Invoice Status</span>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                    existingInvoice ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-slate-100 text-slate-600 border-slate-200'
                  }`}>
                    {existingInvoice ? `Invoiced (${existingInvoice.invoiceNumber})` : 'Pending Invoice Generation'}
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <div>
                    <div className="font-semibold text-slate-900">
                      Total Billable Freight: <span className="font-mono font-black text-purple-700">₱{grossTripTotal.toLocaleString()}</span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      Client: {clt?.name} • Payment Terms: {clt?.paymentTermsDays || 30} Days
                    </div>
                  </div>

                  {existingInvoice ? (
                    <button
                      onClick={() => onOpenInvoice(existingInvoice.id)}
                      className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-2xs transition-all"
                    >
                      Open Invoice {existingInvoice.invoiceNumber}
                    </button>
                  ) : (
                    <button
                      onClick={handleGenerateInvoice}
                      className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-2xs transition-all"
                    >
                      Generate Commercial Invoice
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Modal Body: 2 Column Layout (Operations) */
          <div className="overflow-y-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 text-xs">
          
          {/* Left Column: Route, Load, Timeline (7 cols) */}
          <div className="lg:col-span-7 space-y-5">

            <TruckBanAlert hits={banHits} />
            
            {/* Route & Cargo Card */}
            <div className="bg-slate-50/60 border border-slate-200 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between text-slate-500 font-semibold uppercase text-[10px] tracking-wider border-b border-slate-200 pb-2">
                <span>Shipment Route & Schedule</span>
                <span className="font-mono text-slate-600">Created: {new Date(trip.createdAt).toLocaleDateString()}</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs">
                  <div className="text-[10px] font-bold text-emerald-700 uppercase flex items-center gap-1 mb-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span>Origin / Loading</span>
                  </div>
                  <div className="font-semibold text-slate-800">{trip.originZone}</div>
                  <div className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">{trip.originAddress}</div>
                  <div className="text-[10px] text-slate-400 font-mono mt-1">
                    Pickup: {new Date(trip.scheduledPickup).toLocaleString()}
                  </div>
                </div>

                <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs">
                  <div className="text-[10px] font-bold text-blue-700 uppercase flex items-center gap-1 mb-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                    <span>Destination / Dropoff</span>
                  </div>
                  <div className="font-semibold text-slate-800">{trip.destinationZone}</div>
                  <div className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">{trip.destinationAddress}</div>
                  <div className="text-[10px] text-slate-400 font-mono mt-1">
                    Target: {new Date(trip.scheduledDelivery).toLocaleString()}
                  </div>
                </div>
              </div>

              {/* Cargo & Weight Spec */}
              <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-slate-800 font-semibold">{trip.cargoDescription}</span>
                  <span className="font-mono text-slate-500 font-medium">{trip.cargoVolumeCbm} CBM</span>
                </div>

                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-500">
                    Net Weight: <strong className="text-slate-900 font-mono">{(trip.cargoWeightKg / 1000).toFixed(2)} MT</strong> / Capacity: <span className="font-mono">{(netCap / 1000).toFixed(2)} MT</span>
                  </span>
                  <span className={`font-mono font-bold ${trip.isOverweight ? 'text-rose-600' : 'text-emerald-700'}`}>
                    {loadPercentage}% Utilized {trip.isOverweight ? `(+${trip.overweightKg.toLocaleString()}kg OVER)` : ''}
                  </span>
                </div>

                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden border border-slate-200">
                  <div 
                    className={`h-full rounded-full ${trip.isOverweight ? 'bg-rose-500' : loadPercentage > 85 ? 'bg-amber-500' : 'bg-blue-600'}`}
                    style={{ width: `${Math.min(100, loadPercentage)}%` }}
                  />
                </div>
              </div>

              {/* Driver & Truck Specs */}
              <div className="grid grid-cols-2 gap-3 text-[11px] pt-1">
                <div className="flex items-center gap-2 text-slate-700 bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs">
                  <User className="w-4 h-4 text-slate-400 shrink-0" />
                  <div className="truncate">
                    <div className="font-semibold text-slate-900 truncate">{drv?.name}</div>
                    <div className="text-[10px] text-slate-400 font-mono">{drv?.phone}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-slate-700 bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs">
                  <TruckIcon className="w-4 h-4 text-slate-400 shrink-0" />
                  <div className="truncate">
                    <div className="font-semibold text-slate-900 font-mono">{trk?.plateNumber}</div>
                    <div className="text-[10px] text-slate-400 truncate">{trk?.brandModel}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Status Timeline History */}
            <div className="bg-slate-50/60 border border-slate-200 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-700">
                  <Clock className="w-4 h-4 text-blue-600" />
                  <span>Trip Audit & Status Timeline</span>
                </div>
                <span className="text-[10px] font-mono text-slate-400">{trip.timeline.length} events logged</span>
              </div>

              <div className="space-y-3 relative pl-4 before:content-[''] before:absolute before:left-1.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                {trip.timeline.map((event, idx) => (
                  <div key={event.id || idx} className="relative pl-3 space-y-0.5">
                    <div className={`w-3 h-3 rounded-full absolute -left-4 top-1 border-2 border-white ${
                      event.status === 'Pending' ? 'bg-slate-400' :
                      event.status === 'Loaded' ? 'bg-blue-500' :
                      event.status === 'In Transit' ? 'bg-amber-500' :
                      event.status === 'Delivered' ? 'bg-emerald-500' : 'bg-purple-500'
                    }`} />
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-slate-800">{event.status}</span>
                      <span className="font-mono text-slate-400 text-[10px]">
                        {new Date(event.timestamp).toLocaleString()}
                      </span>
                    </div>
                    {event.location && (
                      <div className="text-[10px] text-slate-500 flex items-center gap-1">
                        <MapPin className="w-2.5 h-2.5 text-slate-400" />
                        <span>{event.location}</span>
                      </div>
                    )}
                    <p className="text-[11px] text-slate-600 leading-relaxed bg-white p-2 rounded border border-slate-200 shadow-2xs mt-1">
                      {event.note}
                    </p>
                    <div className="text-[9px] text-slate-400">By: {event.updatedBy}</div>
                  </div>
                ))}
              </div>

              {/* Status Transition Action Box */}
              {canAccess('trip_edit') && (
                <div className="mt-3 pt-3 border-t border-slate-200 space-y-2.5 bg-white p-3 rounded-lg border border-slate-200 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-slate-700">Quick Stage Switcher:</span>
                    <span className="text-[10px] text-slate-400 font-mono">Current: {trip.status}</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={statusUpdateLocation}
                      onChange={(e) => setStatusUpdateLocation(e.target.value)}
                      placeholder="Optional location / checkpoint (e.g. SLEX Calamba Plaza)..."
                      className="bg-slate-50 border border-slate-200 rounded px-2.5 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-blue-500"
                    />
                    <input
                      type="text"
                      value={statusUpdateNote}
                      onChange={(e) => setStatusUpdateNote(e.target.value)}
                      placeholder="Optional log note / inspection summary..."
                      className="bg-slate-50 border border-slate-200 rounded px-2.5 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  {/* Direct status buttons for quick testing / switching */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    {(['Pending', 'Loaded', 'In Transit', 'Delivered', 'Invoiced'] as TripStatus[]).map((stage) => {
                      const isCurrent = trip.status === stage;
                      const perm = canManipulateTripStatus(stage, trip.status);
                      return (
                        <button
                          key={stage}
                          onClick={() => handleInitiateAdvance(stage)}
                          title={perm.allowed ? `Advance to ${stage}` : `🔒 ${perm.reason}`}
                          className={`px-2.5 py-1 rounded text-xs font-semibold transition-all shadow-2xs active:scale-95 flex items-center gap-1 ${
                            isCurrent
                              ? 'bg-slate-800 text-white ring-2 ring-slate-400 font-bold'
                              : !perm.allowed
                              ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-pointer'
                              : stage === 'Pending'
                              ? 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                              : stage === 'Loaded'
                              ? 'bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200'
                              : stage === 'In Transit'
                              ? 'bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200'
                              : stage === 'Delivered'
                              ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : 'bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200'
                          }`}
                        >
                          <span>{isCurrent ? `● ${stage}` : `→ ${stage}`}</span>
                          {!perm.allowed && !isCurrent && <Lock className="w-2.5 h-2.5 text-slate-400" />}
                        </button>
                      );
                    })}
                    {trip.status !== 'Invoiced' && trip.status !== 'Cancelled' && trip.status !== 'On Hold' && (
                      <button
                        onClick={() => setExceptionMode('hold')}
                        className="px-2.5 py-1 rounded text-xs font-semibold bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200"
                      >
                        Hold
                      </button>
                    )}
                    {trip.status !== 'Invoiced' && trip.status !== 'Cancelled' && (
                      <button
                        onClick={() => setExceptionMode('cancel')}
                        className="px-2.5 py-1 rounded text-xs font-semibold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200"
                      >
                        Cancel
                      </button>
                    )}
                    {trip.status === 'On Hold' && (
                      <button
                        onClick={() => updateTripStatus(trip.id, resumeTarget(trip), 'Resumed from hold.', statusUpdateLocation || undefined)}
                        className="px-2.5 py-1 rounded text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white"
                      >
                        Resume
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Accessorials, Demurrage & Digital POD (5 cols) */}
          <div className="lg:col-span-5 space-y-5">
            
            {/* Live Demurrage & Accessorials Box */}
            <div className="bg-slate-50/60 border border-slate-200 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-700">
                  <Coins className="w-4 h-4 text-blue-600" />
                  <span>Accessorials & Billing Add-ons</span>
                </div>
                {canManageFinancials().allowed ? (
                  <button
                    onClick={() => setShowAddAccModal(true)}
                    className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Accessorial</span>
                  </button>
                ) : (
                  <span className="text-[10px] text-slate-400 flex items-center gap-1" title="Financial modification requires Dispatcher, Billing, or Owner role">
                    <Lock className="w-3 h-3" />
                    <span>Read Only</span>
                  </span>
                )}
              </div>

              {/* Demurrage Clock Widget */}
              <div className="bg-white border border-slate-200 rounded-lg p-3 space-y-2 shadow-2xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                    <Clock className="w-4 h-4 text-blue-600" />
                    <span>Demurrage / Holding Clock</span>
                  </div>
                  {canManageFinancials().allowed ? (
                    !editingDemurrage ? (
                      <button
                        onClick={() => setEditingDemurrage(true)}
                        className="text-[10px] text-blue-600 hover:text-blue-700 font-medium underline"
                      >
                        Adjust Hours
                      </button>
                    ) : (
                      <button
                        onClick={handleUpdateDemurrage}
                        className="text-[10px] text-blue-600 font-bold hover:underline"
                      >
                        Save Hours
                      </button>
                    )
                  ) : null}
                </div>

                <div className="text-[11px] text-slate-500">
                  Standard free dock grace period: <strong>2.0 hours</strong>. Billable rate: <span className="font-mono text-slate-800">₱{trip.demurrageRatePerHour}/hr</span>
                </div>

                {editingDemurrage ? (
                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={tempDemurrageHours}
                      onChange={(e) => setTempDemurrageHours(Number(e.target.value))}
                      className="w-24 bg-slate-50 border border-slate-200 rounded px-2 py-1 text-xs font-mono text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500"
                    />
                    <span className="text-xs text-slate-500">billable hours</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-between pt-1">
                    <span className="font-mono font-bold text-slate-800 text-xs">
                      {trip.demurrageHours > 0 ? `${trip.demurrageHours} Hours Incurred` : '0 Hours (No demurrage)'}
                    </span>
                    <span className="font-mono font-bold text-blue-600">
                      ₱{(trip.demurrageHours * trip.demurrageRatePerHour).toLocaleString()}
                    </span>
                  </div>
                )}
              </div>

              {/* Itemized Accessorials List */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px] text-slate-600 bg-white p-2.5 rounded border border-slate-200 shadow-2xs">
                  <span className="font-medium">Base Freight Rate</span>
                  <span className="font-mono font-bold text-slate-900">₱{trip.baseRatePhp.toLocaleString()}</span>
                </div>

                {trip.accessorials.map((acc) => (
                  <div 
                    key={acc.id}
                    className="flex items-start justify-between bg-white p-2.5 rounded border border-slate-200 text-[11px] shadow-2xs"
                  >
                    <div>
                      <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                        <span>{acc.name}</span>
                        {acc.isAutoTriggered && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200 font-medium">
                            Auto
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-500">{acc.calculationDetail}</div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      <span className="font-mono font-bold text-blue-600">₱{acc.amountPhp.toLocaleString()}</span>
                      <button
                        onClick={() => removeAccessorialFromTrip(trip.id, acc.id)}
                        className="text-slate-400 hover:text-rose-600 transition-colors"
                        title="Remove Accessorial"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Total Trip Estimated Sum */}
              <div className="pt-2 border-t border-slate-200 flex items-center justify-between font-bold">
                <span className="text-slate-700">Total Freight & Accessorials:</span>
                <span className="font-mono text-base text-slate-900 font-black">₱{grossTripTotal.toLocaleString()}</span>
              </div>

              {/* Direct Link to Recharts Profitability View */}
              <button
                type="button"
                onClick={() => setActiveTab('PROFITABILITY')}
                className="w-full mt-2 py-2 px-3 rounded-lg bg-gradient-to-r from-emerald-50 to-blue-50 hover:from-emerald-100 hover:to-blue-100 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center justify-between transition-all group"
              >
                <span className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600 group-hover:scale-110 transition-transform" />
                  <span>View Trip Profitability & Fuel Breakdown (Recharts)</span>
                </span>
                <ArrowRight className="w-3.5 h-3.5 text-emerald-600 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>

            {/* Proof of Delivery (POD) Interactive Section */}
            <div className="bg-slate-50/60 border border-slate-200 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-700">
                  <FileSignature className="w-4 h-4 text-emerald-600" />
                  <span>Digital Proof of Delivery (POD)</span>
                </div>
                {trip.pod && (
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    POD Verified
                  </span>
                )}
              </div>

              {trip.pod ? (
                /* Already Signed POD Preview */
                <div className="space-y-3 bg-white p-3.5 rounded-lg border border-slate-200 shadow-2xs">
                  <div className="flex items-center justify-between bg-emerald-50/70 p-2.5 rounded-lg border border-emerald-200 text-xs">
                    <div className="flex items-center gap-2 text-emerald-900 font-bold">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Certified Consignee Delivery Receipt on File</span>
                    </div>
                    <span className="text-[10px] font-mono text-emerald-700 bg-white px-2 py-0.5 rounded border border-emerald-300 font-bold">
                      {trip.pod.conditionStatus}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div>
                      <div className="text-[10px] text-slate-400 uppercase font-medium">Received By</div>
                      <div className="font-bold text-slate-900">{trip.pod.receiverName}</div>
                      <div className="text-[10px] text-slate-500">{trip.pod.receiverRole}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400 uppercase font-medium">Timestamp / ID</div>
                      <div className="font-mono text-slate-700">{new Date(trip.pod.signedAt).toLocaleString()}</div>
                      <div className="text-[10px] text-slate-500 font-mono">{trip.pod.receiverIdNumber || 'ID Verified'}</div>
                    </div>
                  </div>

                  {trip.pod.signatureDataUrl && (
                    <div>
                      <div className="text-[10px] text-slate-400 uppercase font-medium mb-1">Consignee Signature</div>
                      <div className="bg-slate-50 p-2 rounded border border-slate-200 flex justify-center">
                        <img 
                          src={trip.pod.signatureDataUrl} 
                          alt="Signature" 
                          className="h-16 object-contain"
                        />
                      </div>
                    </div>
                  )}

                  {trip.pod.photoUrls && trip.pod.photoUrls.length > 0 && (
                    <div>
                      <div className="text-[10px] text-slate-400 uppercase font-medium mb-1">Unloading Inspection Photos</div>
                      <div className="flex gap-2 overflow-x-auto">
                        {trip.pod.photoUrls.map((url, i) => (
                          <img 
                            key={i} 
                            src={url} 
                            alt={`POD ${i}`} 
                            className="w-24 h-16 object-cover rounded border border-slate-200 shadow-2xs" 
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="text-[11px] text-slate-700 bg-slate-50 p-2 rounded border border-slate-200">
                    <span className="font-semibold text-slate-500">Notes:</span> {trip.pod.notes}
                  </div>
                </div>
              ) : opsStatus === 'Pending' || opsStatus === 'Loaded' ? (
                /* Pre-Transit Locked State: Explains why POD isn't available yet at Origin Yard */
                <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3.5 shadow-2xs">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 text-slate-500 flex items-center justify-center shrink-0 mt-0.5">
                      <Lock className="w-4 h-4 text-slate-500" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-slate-900 text-xs">Proof of Delivery Locked</h4>
                        <span className="text-[10px] font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-slate-200">
                          {opsStatus === 'Pending' ? 'Pending Loading' : 'Loaded at Origin Yard'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 leading-relaxed">
                        Proof of Delivery (e-POD) is executed upon cargo arrival and physical unloading at the destination ({trip.destinationZone}). This capture pad unlocks once the shipment is in transit and arriving at the consignee site.
                      </p>
                    </div>
                  </div>

                  {/* Stage Workflow Tracker */}
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-2 text-xs">
                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      Shipment Delivery Lifecycle:
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-[10px] font-medium text-center">
                      <div className={`p-2 rounded border ${trip.status === 'Loaded' ? 'bg-blue-50 border-blue-200 text-blue-700 font-bold' : 'bg-slate-100 border-slate-200 text-slate-600'}`}>
                        1. Loading & Seal ✓
                      </div>
                      <div className="p-2 rounded border bg-amber-50/50 border-amber-200 text-amber-800">
                        2. Linehaul In Transit 🚚
                      </div>
                      <div className="p-2 rounded border bg-slate-100 border-slate-200 text-slate-400">
                        3. Consignee POD 🔒
                      </div>
                    </div>
                  </div>

                  {/* Quick Action Button to Advance to In Transit */}
                  {trip.status !== 'On Hold' && trip.status !== 'Cancelled' && canManipulateTripStatus('In Transit', trip.status).allowed && (
                    <button
                      type="button"
                      onClick={() => setPrerequisiteTargetStatus('In Transit')}
                      className="w-full py-2 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 active:scale-95"
                    >
                      <ArrowRight className="w-3.5 h-3.5" />
                      <span>Advance Shipment to In Transit</span>
                    </button>
                  )}
                </div>
              ) : (
                /* Interactive POD Form (Active during In Transit, Delivered, or Invoiced) */
                <div className="space-y-3">
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5 flex items-center gap-2 text-xs text-amber-900">
                    <MapPin className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>
                      <strong>Destination Arrival Sign-off:</strong> Draw consignee signature below upon receiver inspection at {trip.destinationZone}.
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-700 uppercase mb-1">
                        Receiver Full Name *
                      </label>
                      <input
                        type="text"
                        value={receiverName}
                        onChange={(e) => setReceiverName(e.target.value)}
                        placeholder="e.g. Juan De La Cruz"
                        className="w-full bg-white border border-slate-200 rounded px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-blue-500 shadow-2xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-700 uppercase mb-1">
                        Receiver Role / Title
                      </label>
                      <input
                        type="text"
                        value={receiverRole}
                        onChange={(e) => setReceiverRole(e.target.value)}
                        placeholder="e.g. Inbound Dock Lead"
                        className="w-full bg-white border border-slate-200 rounded px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-blue-500 shadow-2xs"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-slate-700 uppercase mb-1">
                      Cargo Condition on Arrival
                    </label>
                    <select
                      value={conditionStatus}
                      onChange={(e) => setConditionStatus(e.target.value as any)}
                      className="w-full bg-white border border-slate-200 rounded px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-blue-500 shadow-2xs"
                    >
                      <option value="Good Condition">Good Condition (No Damaged Boxes/Pallets)</option>
                      <option value="Partial Damage">Partial Packaging Damage (Logged)</option>
                      <option value="Packaging Discrepancy">Packaging Discrepancy</option>
                    </select>
                  </div>

                  {/* Interactive Digital Signature Pad */}
                  <div>
                    <div className="flex items-center justify-between text-[10px] text-slate-500 uppercase mb-1">
                      <span className="font-semibold flex items-center gap-1">
                        <PenTool className="w-3 h-3 text-slate-400" />
                        <span>Draw Digital Signature below:</span>
                      </span>
                      <button
                        type="button"
                        onClick={clearSignature}
                        className="text-slate-500 hover:text-slate-800 underline font-medium"
                      >
                        Clear
                      </button>
                    </div>
                    <div className="bg-white border border-slate-200 rounded-lg overflow-hidden touch-none shadow-2xs">
                      <canvas
                        ref={canvasRef}
                        width={400}
                        height={100}
                        onMouseDown={startDrawing}
                        onMouseMove={draw}
                        onMouseUp={stopDrawing}
                        onMouseLeave={stopDrawing}
                        onTouchStart={startDrawing}
                        onTouchMove={draw}
                        onTouchEnd={stopDrawing}
                        className="w-full h-24 cursor-crosshair bg-white"
                      />
                    </div>
                    <div className="text-[9px] text-slate-400 text-center mt-0.5">
                      Sign using mouse or touchscreen
                    </div>
                  </div>

                  {/* Attach Inspection Photos */}
                  <div>
                    <div className="flex items-center justify-between text-[10px] text-slate-500 uppercase mb-1">
                      <span>Inspection Photos (Container/Seal)</span>
                      <button
                        type="button"
                        disabled={isUploadingPodPhoto}
                        onClick={() => podFileInputRef.current?.click()}
                        className="text-blue-600 hover:underline flex items-center gap-1 text-[10px] font-medium disabled:opacity-50"
                      >
                        <Camera className="w-3 h-3" />
                        <span>{isUploadingPodPhoto ? 'Uploading…' : '+ Add Photo'}</span>
                      </button>
                      <input
                        ref={podFileInputRef}
                        type="file"
                        accept="image/*"
                        capture="environment"
                        className="hidden"
                        onChange={async (event) => {
                          const file = event.target.files?.[0];
                          event.target.value = '';
                          if (!file) return;
                          setIsUploadingPodPhoto(true);
                          try {
                            const uploaded = await uploadCompanyFile({
                              companyId: company.id,
                              folder: `pods/${trip.id}`,
                              file,
                            });
                            setPodPhotos((prev) => [...prev, uploaded.url]);
                          } catch (error) {
                            window.alert(error instanceof Error ? error.message : 'Could not upload the photo.');
                          } finally {
                            setIsUploadingPodPhoto(false);
                          }
                        }}
                      />
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      {podPhotos.length === 0 && (
                        <p className="text-[10px] text-slate-400">No photos yet. Use the camera or choose a file.</p>
                      )}
                      {podPhotos.map((p, idx) => (
                        <div key={idx} className="relative group">
                          <img src={p} alt="Inspection" className="w-20 h-14 object-cover rounded border border-slate-200 shadow-2xs" />
                          <button
                            type="button"
                            onClick={() => setPodPhotos(prev => prev.filter((_, i) => i !== idx))}
                            className="absolute -top-1 -right-1 bg-rose-600 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleSavePOD}
                    className="w-full py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 active:scale-95"
                  >
                    <FileCheck2 className="w-4 h-4" />
                    <span>Submit & Stamp Proof of Delivery (POD)</span>
                  </button>
                </div>
              )}
            </div>

          </div>
        </div>
      )}

        {/* Modal Footer */}
        <div className="p-4 md:px-6 md:py-3 bg-slate-50/80 border-t border-slate-200 flex items-center justify-between">
          <div className="text-slate-500 text-xs">
            Trip ID: <span className="font-mono text-slate-800">{trip.id}</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-md bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors shadow-2xs"
          >
            Close Window
          </button>
        </div>
      </div>

      {/* Quick Add Custom Accessorial Sub-Modal */}
      {showAddAccModal && (
        <div className="fixed inset-0 z-60 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl max-w-md w-full p-5 space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-150 text-xs text-slate-900">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <h3 className="font-bold text-slate-900 text-sm">Add Custom Accessorial Charge</h3>
              <button onClick={() => setShowAddAccModal(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddAccessorial} className="space-y-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Accessorial Type</label>
                <select
                  value={newAccType}
                  onChange={(e) => {
                    const val = e.target.value as AccessorialType;
                    setNewAccType(val);
                    if (val === 'helper_crew') {
                      setNewAccName('Helper & Stevedoring Crew');
                      setNewAccAmount(1800);
                    } else if (val === 'port_wharfage') {
                      setNewAccName('Port Pier / Wharfage Gate Fee');
                      setNewAccAmount(2500);
                    } else if (val === 'overnight_parking') {
                      setNewAccName('Holding Yard Overnight Parking');
                      setNewAccAmount(1200);
                    }
                  }}
                  className="w-full bg-slate-50 border border-slate-200 rounded px-2.5 py-1.5 text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500"
                >
                  <option value="helper_crew">Helper / Stevedore Crew</option>
                  <option value="port_wharfage">Port / Pier Wharfage Tariff</option>
                  <option value="overnight_parking">Holding Yard Overnight Parking</option>
                  <option value="toll_reimbursement">Tollway Pass-through Reimbursement</option>
                  <option value="fuel_surcharge">Custom Fuel Adjustment</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Charge Title / Description</label>
                <input
                  type="text"
                  value={newAccName}
                  onChange={(e) => setNewAccName(e.target.value)}
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded px-2.5 py-1.5 text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Calculation Details / Receipt Reference</label>
                <input
                  type="text"
                  value={newAccDetail}
                  onChange={(e) => setNewAccDetail(e.target.value)}
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded px-2.5 py-1.5 text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Amount in PHP (₱)</label>
                <input
                  type="number"
                  min="0"
                  step="50"
                  value={newAccAmount}
                  onChange={(e) => setNewAccAmount(Number(e.target.value))}
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded px-2.5 py-1.5 text-blue-600 font-mono font-bold focus:bg-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowAddAccModal(false)}
                  className="px-3 py-1.5 rounded bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded bg-slate-800 text-white font-bold hover:bg-slate-900"
                >
                  Add Charge
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {exceptionMode && (
        <TripExceptionModal
          trip={trip}
          mode={exceptionMode}
          onClose={() => setExceptionMode(null)}
          onConfirm={handleExceptionConfirm}
        />
      )}

      {/* Status Transition Prerequisites Clearance Modal */}
      {prerequisiteTargetStatus && (
        <StatusPrerequisiteModal
          isOpen={Boolean(prerequisiteTargetStatus)}
          onClose={() => setPrerequisiteTargetStatus(null)}
          trip={trip}
          targetStatus={prerequisiteTargetStatus}
          truck={trk}
          driver={drv}
          client={clt}
          onConfirmAdvance={handleConfirmPrerequisiteAdvance}
          onOpenDeliveryNote={() => {
            setShowDeliveryNoteModal(true);
          }}
        />
      )}

      {/* Official Consignment Delivery Note Modal (Highest Priority z-70 Modal) */}
      {showDeliveryNoteModal && (
        <DeliveryNoteModal
          isOpen={showDeliveryNoteModal}
          onClose={() => setShowDeliveryNoteModal(false)}
          trip={trip}
          truck={trk}
          driver={drv}
          client={clt}
          company={company}
        />
      )}

      {/* Fuel Log Modal for Direct Fill-Up Logging */}
      {showFuelLogModal && (
        <FuelLogModal
          isOpen={showFuelLogModal}
          onClose={() => setShowFuelLogModal(false)}
          initialTripId={fuelModalTripId || trip.id}
          initialTruckId={fuelModalTruckId || trip.truckId}
        />
      )}
    </div>
  );
};
