import React, { useState, useMemo, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  ArrowRight, 
  Truck, 
  User, 
  Calendar, 
  Clock, 
  AlertTriangle, 
  FileCheck2, 
  Receipt, 
  RotateCw, 
  ChevronRight, 
  MapPin, 
  Weight, 
  Layers, 
  LayoutGrid, 
  List, 
  Sparkles,
  Flame,
  CheckCircle2,
  FileText,
  X,
  SlidersHorizontal,
  Building2,
  Gauge,
  Download,
  FileSpreadsheet,
  Check,
  Lock,
  ShieldAlert,
  UserCheck
} from 'lucide-react';
import { useFreight } from '../../context/FreightContext';
import { Trip, TripStatus, HOLD_EXCEPTION_KINDS, CANCEL_EXCEPTION_KINDS, TripExceptionKind } from '../../types';
import { matchingTruckBans } from '../../lib/truckBans';
import { isStatusRetraction } from '../../lib/stageGates';
import { DeliveryNoteModal } from './DeliveryNoteModal';
import { StatusPrerequisiteModal } from './StatusPrerequisiteModal';
import { TripExceptionModal } from './TripExceptionModal';
import { TripStatusRetractionModal } from './TripStatusRetractionModal';
import { resumeTarget, TripKanbanCard } from './TripKanbanCard';

interface TripBoardProps {
  onOpenNewTrip: () => void;
  onSelectTrip: (trip: Trip) => void;
  onOpenInvoice: (invoiceId: string) => void;
  onOpenExceptions?: () => void;
  searchQuery?: string;
}

const COLUMNS: { id: TripStatus; label: string; countColor: string; headerBorder: string; desc: string }[] = [
  { id: 'Pending', label: 'Pending', countColor: 'bg-slate-100 text-slate-700 border-slate-200', headerBorder: 'border-l-slate-400', desc: 'Booked & waiting for loading dock' },
  { id: 'Loaded', label: 'Loaded', countColor: 'bg-blue-50 text-blue-700 border-blue-200', headerBorder: 'border-l-blue-500', desc: 'Container mounted / seal confirmed' },
  { id: 'In Transit', label: 'In Transit', countColor: 'bg-amber-50 text-amber-700 border-amber-200', headerBorder: 'border-l-amber-500', desc: 'Linehaul moving along expressway' },
  { id: 'Delivered', label: 'Delivered', countColor: 'bg-emerald-50 text-emerald-700 border-emerald-200', headerBorder: 'border-l-emerald-500', desc: 'Consignee received / POD verified' },
  { id: 'Invoiced', label: 'Invoiced', countColor: 'bg-purple-50 text-purple-700 border-purple-200', headerBorder: 'border-l-purple-500', desc: 'Itemized billing transmitted' },
];

export const TripBoard: React.FC<TripBoardProps> = ({ 
  onOpenNewTrip, 
  onSelectTrip, 
  onOpenInvoice,
  onOpenExceptions,
  searchQuery: externalSearchQuery = ''
}) => {
  const { 
    company,
    trips, 
    trucks, 
    drivers, 
    clients, 
    updateTripStatus, 
    updateTrip,
    createInvoiceForTrip, 
    getInvoiceByTripId,
    canManipulateTripStatus,
    canApproveTripStatusRetraction,
    canCreateTrip,
    canAccess,
    currentUser,
    liveTracking,
    truckBans,
  } = useFreight();

  // Prerequisite & Delivery Note Modal states
  const [prerequisiteTrip, setPrerequisiteTrip] = useState<Trip | null>(null);
  const [prerequisiteTargetStatus, setPrerequisiteTargetStatus] = useState<TripStatus | null>(null);
  const [deliveryNoteTrip, setDeliveryNoteTrip] = useState<Trip | null>(null);
  const [exceptionTarget, setExceptionTarget] = useState<{ trip: Trip; mode: 'hold' | 'cancel' } | null>(null);
  const [retractionTarget, setRetractionTarget] = useState<{ trip: Trip; toStatus: TripStatus } | null>(null);

  // View mode
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');

  // Search & Filter States
  const [localSearch, setLocalSearch] = useState<string>(externalSearchQuery);
  const [selectedDestination, setSelectedDestination] = useState<string>('ALL');
  const [selectedTruckId, setSelectedTruckId] = useState<string>('ALL');
  const [selectedClientId, setSelectedClientId] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [overweightOnly, setOverweightOnly] = useState<boolean>(false);
  const [demurrageOnly, setDemurrageOnly] = useState<boolean>(false);

  // Derive unique destinations dynamically from all registered trips
  const uniqueDestinations = useMemo(() => {
    const destMap = new Map<string, number>();
    trips.forEach(t => {
      if (t.destinationZone) {
        destMap.set(t.destinationZone, (destMap.get(t.destinationZone) || 0) + 1);
      }
    });
    return Array.from(destMap.entries())
      .map(([zone, count]) => ({ zone, count }))
      .sort((a, b) => a.zone.localeCompare(b.zone));
  }, [trips]);

  // Sync external search query if provided from top navbar
  useEffect(() => {
    if (externalSearchQuery !== undefined && externalSearchQuery !== localSearch) {
      setLocalSearch(externalSearchQuery);
    }
  }, [externalSearchQuery]);

  // Combined search term
  const effectiveSearch = localSearch.trim().toLowerCase();

  // Dynamic filter function
  const filteredTrips = useMemo(() => {
    return trips.filter((trip) => {
      const trk = trucks.find(t => t.id === trip.truckId);
      const drv = drivers.find(d => d.id === trip.driverId);
      const clt = clients.find(c => c.id === trip.clientId);

      // Search matching across destination, customer name, truck ID/plate number, waybill, trip #, cargo, etc.
      const matchesSearch = !effectiveSearch || (
        trip.tripNumber.toLowerCase().includes(effectiveSearch) ||
        trip.waybillNumber.toLowerCase().includes(effectiveSearch) ||
        trip.originZone.toLowerCase().includes(effectiveSearch) ||
        (trip.originAddress && trip.originAddress.toLowerCase().includes(effectiveSearch)) ||
        trip.destinationZone.toLowerCase().includes(effectiveSearch) ||
        (trip.destinationAddress && trip.destinationAddress.toLowerCase().includes(effectiveSearch)) ||
        trip.cargoDescription.toLowerCase().includes(effectiveSearch) ||
        (trip.truckId && trip.truckId.toLowerCase().includes(effectiveSearch)) ||
        (trk?.plateNumber && trk.plateNumber.toLowerCase().includes(effectiveSearch)) ||
        (trk?.type && trk.type.toLowerCase().includes(effectiveSearch)) ||
        (drv?.name && drv.name.toLowerCase().includes(effectiveSearch)) ||
        (clt?.name && clt.name.toLowerCase().includes(effectiveSearch)) ||
        (clt?.industry && clt.industry.toLowerCase().includes(effectiveSearch))
      );

      const matchesDestination = selectedDestination === 'ALL' || trip.destinationZone === selectedDestination;
      const matchesTruck = selectedTruckId === 'ALL' || trip.truckId === selectedTruckId;
      const matchesClient = selectedClientId === 'ALL' || trip.clientId === selectedClientId;
      const matchesStatus = statusFilter === 'ALL' || trip.status === statusFilter;
      const matchesOverweight = !overweightOnly || trip.isOverweight;
      const matchesDemurrage = !demurrageOnly || trip.demurrageHours > 0;

      return matchesSearch && matchesDestination && matchesTruck && matchesClient && matchesStatus && matchesOverweight && matchesDemurrage;
    });
  }, [trips, trucks, drivers, clients, effectiveSearch, selectedDestination, selectedTruckId, selectedClientId, statusFilter, overweightOnly, demurrageOnly]);

  const hasActiveFilters = Boolean(
    localSearch.trim() || 
    selectedDestination !== 'ALL' ||
    selectedTruckId !== 'ALL' || 
    selectedClientId !== 'ALL' || 
    statusFilter !== 'ALL' || 
    overweightOnly || 
    demurrageOnly
  );

  const resetFilters = () => {
    setLocalSearch('');
    setSelectedDestination('ALL');
    setSelectedTruckId('ALL');
    setSelectedClientId('ALL');
    setStatusFilter('ALL');
    setOverweightOnly(false);
    setDemurrageOnly(false);
  };

  const handleDirectStatusChange = (e: React.MouseEvent, trip: Trip, targetStatus: TripStatus) => {
    e.stopPropagation();
    if (targetStatus === trip.status) return;

    if (trip.activeStatusRetraction?.status === 'Pending_Approval') {
      setRetractionTarget({ trip, toStatus: trip.activeStatusRetraction.toStatus });
      return;
    }

    if (isStatusRetraction(trip.status, targetStatus, trip.holdFromStatus)) {
      setRetractionTarget({ trip, toStatus: targetStatus });
      return;
    }

    if (targetStatus === 'On Hold' || targetStatus === 'Cancelled') {
      if (trip.status === 'Invoiced') return;
      if (targetStatus === 'On Hold' && trip.status === 'Cancelled') return;
      setExceptionTarget({ trip, mode: targetStatus === 'On Hold' ? 'hold' : 'cancel' });
      return;
    }

    if (trip.status === 'On Hold') {
      const from = resumeTarget(trip);
      const stages: TripStatus[] = ['Pending', 'Loaded', 'In Transit', 'Delivered', 'Invoiced'];
      if (stages.indexOf(targetStatus) <= stages.indexOf(from)) {
        updateTripStatus(trip.id, targetStatus, 'Resumed from hold.');
        return;
      }
    }

    if (trip.status === 'Cancelled' && targetStatus !== 'Pending') {
      return;
    }

    if (targetStatus === 'Pending') {
      updateTripStatus(trip.id, 'Pending', 'Trip reset to Pending status.');
      return;
    }

    // Open Prerequisite Clearance Modal
    setPrerequisiteTrip(trip);
    setPrerequisiteTargetStatus(targetStatus);
  };

  const handleNextStatus = (e: React.MouseEvent, trip: Trip) => {
    e.stopPropagation();
    switch (trip.status) {
      case 'Pending':
        setPrerequisiteTrip(trip);
        setPrerequisiteTargetStatus('Loaded');
        break;
      case 'Loaded':
        setPrerequisiteTrip(trip);
        setPrerequisiteTargetStatus('In Transit');
        break;
      case 'In Transit':
        setPrerequisiteTrip(trip);
        setPrerequisiteTargetStatus('Delivered');
        break;
      case 'Delivered':
        setPrerequisiteTrip(trip);
        setPrerequisiteTargetStatus('Invoiced');
        break;
      case 'Invoiced': {
        const existingInv = getInvoiceByTripId(trip.id);
        if (existingInv) {
          onOpenInvoice(existingInv.id);
        }
        break;
      }
      case 'On Hold': {
        const resumeTo = resumeTarget(trip);
        updateTripStatus(trip.id, resumeTo, 'Resumed from hold.');
        break;
      }
      case 'Cancelled':
        break;
    }
  };

  const handleExceptionConfirm = (kind: TripExceptionKind, note: string) => {
    if (!exceptionTarget) return;
    const { trip, mode } = exceptionTarget;
    if (trip.status === 'Invoiced') {
      setExceptionTarget(null);
      return;
    }
    const kinds = mode === 'hold' ? HOLD_EXCEPTION_KINDS : CANCEL_EXCEPTION_KINDS;
    const reasonLabel = kinds.find((item) => item.id === kind)?.label || kind;
    const noteText = [reasonLabel, note].filter(Boolean).join('. ');
    const previous = trip.status === 'On Hold' || trip.status === 'Cancelled'
      ? resumeTarget(trip)
      : trip.status;
    updateTripStatus(
      trip.id,
      mode === 'hold' ? 'On Hold' : 'Cancelled',
      noteText,
      undefined,
      {
        holdFromStatus: previous,
        exceptionKind: kind,
        exceptionNote: note || undefined,
      }
    );
    setExceptionTarget(null);
  };

  const handleConfirmPrerequisiteAdvance = (updates: Partial<Trip>, note?: string) => {
    if (!prerequisiteTrip || !prerequisiteTargetStatus) return;

    const dnNumber = updates.deliveryNoteNumber || prerequisiteTrip.deliveryNoteNumber;
    const sealNumber = updates.securitySealNumber || prerequisiteTrip.securitySealNumber;
    const gatePassNumber = updates.gatePassNumber || prerequisiteTrip.gatePassNumber;
    const extras: Partial<Trip> = {
      ...updates,
      deliveryNoteNumber: dnNumber,
      securitySealNumber: sealNumber,
      gatePassNumber,
    };

    updateTrip(prerequisiteTrip.id, extras);

    if (prerequisiteTargetStatus === 'Invoiced') {
      const inv = createInvoiceForTrip(prerequisiteTrip.id);
      updateTripStatus(
        prerequisiteTrip.id, 
        'Invoiced', 
        note || `Invoice #${inv.invoiceNumber} generated after prerequisite clearance.`,
        undefined,
        extras
      );
      setPrerequisiteTrip(null);
      setPrerequisiteTargetStatus(null);
      onOpenInvoice(inv.id);
    } else {
      updateTripStatus(
        prerequisiteTrip.id, 
        prerequisiteTargetStatus, 
        note || `Status updated to ${prerequisiteTargetStatus}`,
        undefined,
        extras
      );
      setPrerequisiteTrip(null);
      setPrerequisiteTargetStatus(null);
    }
  };

  const selectedClientObj = clients.find(c => c.id === selectedClientId);
  const selectedTruckObj = trucks.find(t => t.id === selectedTruckId);

  const kanbanCardProps = (trip: Trip) => ({
    trip,
    truck: trucks.find(t => t.id === trip.truckId),
    driver: drivers.find(d => d.id === trip.driverId),
    client: clients.find(c => c.id === trip.clientId),
    effectiveSearch,
    selectedTruckId,
    selectedClientId,
    onSelectTrip,
    onOpenDeliveryNote: (t: Trip) => setDeliveryNoteTrip(t),
    onDirectStatusChange: handleDirectStatusChange,
    onNextStatus: handleNextStatus,
    onHold: (e: React.MouseEvent, t: Trip) => {
      e.stopPropagation();
      if (t.status === 'Invoiced' || t.status === 'Cancelled') return;
      setExceptionTarget({ trip: t, mode: 'hold' as const });
    },
    onCancel: (e: React.MouseEvent, t: Trip) => {
      e.stopPropagation();
      if (t.status === 'Invoiced') return;
      setExceptionTarget({ trip: t, mode: 'cancel' as const });
    },
    canManipulateTripStatus,
    tracking: liveTracking.find((item) => item.tripId === trip.id || item.id === trip.id),
    hasTruckBan: matchingTruckBans({
      bans: truckBans,
      originZone: trip.originZone,
      originAddress: trip.originAddress,
      destinationZone: trip.destinationZone,
      destinationAddress: trip.destinationAddress,
      scheduledPickup: trip.scheduledPickup,
      scheduledDelivery: trip.scheduledDelivery,
      truckType: trucks.find(t => t.id === trip.truckId)?.type,
      includeNow: trip.status === 'In Transit' || trip.status === 'Loaded',
    }).length > 0,
  });

  // CSV Export state & logic
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccessMsg, setExportSuccessMsg] = useState<string | null>(null);
  const [showExportMenu, setShowExportMenu] = useState(false);

  const exportTripsToCSV = (exportOnlyFiltered: boolean = true) => {
    const dataToExport = exportOnlyFiltered ? filteredTrips : trips;
    if (dataToExport.length === 0) {
      alert('No trip records available to export.');
      return;
    }

    setIsExporting(true);
    setShowExportMenu(false);

    try {
      const headers = [
        'Trip Number',
        'Waybill Number',
        'Status',
        'Client Name',
        'Client Industry',
        'Origin Zone',
        'Origin Address / Terminal',
        'Destination Zone',
        'Destination Address / Dropoff',
        'Assigned Truck Plate',
        'Truck Model / Classification',
        'Truck Max Payload (kg)',
        'Assigned Driver Name',
        'Driver Phone Contact',
        'Driver License No',
        'Cargo Description',
        'Cargo Weight (kg)',
        'Cargo Weight (Metric Tons)',
        'Is Overweight (DPWH Flag)',
        'Demurrage Hours',
        'Demurrage Hourly Rate (PHP)',
        'Base Linehaul Rate (PHP)',
        'Total Accessorial Fees (PHP)',
        'Accessorial Items Breakdown',
        'Total Gross Freight Charge (PHP)',
        'Estimated Diesel Cost (PHP)',
        'Estimated Tollway Fees (PHP)',
        'Estimated Net Profit (PHP)',
        'Profit Margin (%)',
        'Scheduled Pickup Time',
        'Estimated Delivery Time',
        'Actual Delivery Time',
        'Proof of Delivery (POD) Received',
        'POD Signatory / Receiver',
        'Created Timestamp'
      ];

      const escapeCSV = (val: any): string => {
        if (val === null || val === undefined) return '""';
        let str = String(val).replace(/"/g, '""');
        return `"${str}"`;
      };

      const rows = dataToExport.map(trip => {
        const trk = trucks.find(t => t.id === trip.truckId);
        const drv = drivers.find(d => d.id === trip.driverId);
        const clt = clients.find(c => c.id === trip.clientId);
        const accessorialsSum = trip.accessorials ? trip.accessorials.reduce((sum, a) => sum + a.amountPhp, 0) : 0;
        const grossTotal = (trip.baseRatePhp || 0) + accessorialsSum;
        const accessorialsList = trip.accessorials && trip.accessorials.length > 0 
          ? trip.accessorials.map(a => `${a.type}: ₱${a.amountPhp.toLocaleString()}`).join(' | ') 
          : 'None';
        
        const totalOperatingCost = (trip.fuelCostEstimatePhp || 0) + (trip.tollCostEstimatePhp || 0);
        const estimatedProfit = grossTotal - totalOperatingCost;
        const profitMarginPct = grossTotal > 0 ? ((estimatedProfit / grossTotal) * 100).toFixed(1) : '0';

        return [
          escapeCSV(trip.tripNumber),
          escapeCSV(trip.waybillNumber || 'N/A'),
          escapeCSV(trip.status),
          escapeCSV(clt?.name || 'N/A'),
          escapeCSV(clt?.industry || 'N/A'),
          escapeCSV(trip.originZone),
          escapeCSV(trip.originAddress || trip.originZone),
          escapeCSV(trip.destinationZone),
          escapeCSV(trip.destinationAddress || trip.destinationZone),
          escapeCSV(trk?.plateNumber || 'Unassigned'),
          escapeCSV(trk?.type || 'N/A'),
          escapeCSV(trk?.maxPayloadKg || 'N/A'),
          escapeCSV(drv?.name || 'Unassigned'),
          escapeCSV(drv?.phone || 'N/A'),
          escapeCSV(drv?.licenseNo || 'N/A'),
          escapeCSV(trip.cargoDescription),
          escapeCSV(trip.cargoWeightKg),
          escapeCSV((trip.cargoWeightKg / 1000).toFixed(2)),
          escapeCSV(trip.isOverweight ? 'YES' : 'NO'),
          escapeCSV(trip.demurrageHours || 0),
          escapeCSV(trip.demurrageRatePhpPerHour || 0),
          escapeCSV(trip.baseRatePhp),
          escapeCSV(accessorialsSum),
          escapeCSV(accessorialsList),
          escapeCSV(grossTotal),
          escapeCSV(trip.fuelCostEstimatePhp || 0),
          escapeCSV(trip.tollCostEstimatePhp || 0),
          escapeCSV(estimatedProfit),
          escapeCSV(`${profitMarginPct}%`),
          escapeCSV(trip.scheduledPickup || 'N/A'),
          escapeCSV(trip.estimatedDelivery || 'N/A'),
          escapeCSV(trip.actualDelivery || 'N/A'),
          escapeCSV(trip.pod ? 'YES' : 'NO'),
          escapeCSV(trip.pod?.receivedBy || 'N/A'),
          escapeCSV(trip.createdAt || 'N/A')
        ].join(',');
      });

      // Add UTF-8 BOM for Microsoft Excel / Google Sheets compatibility
      const csvContent = '\uFEFF' + [headers.map(escapeCSV).join(','), ...rows].join('\r\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const todayStr = new Date().toISOString().split('T')[0];
      const countLabel = dataToExport.length;
      const fileSuffix = exportOnlyFiltered && hasActiveFilters ? `_filtered_${countLabel}_trips` : `_all_${countLabel}_trips`;
      
      link.setAttribute('href', url);
      link.setAttribute('download', `casinfreight_trips_export_${todayStr}${fileSuffix}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setExportSuccessMsg(`Exported ${countLabel} trip${countLabel !== 1 ? 's' : ''} to CSV successfully!`);
      setTimeout(() => setExportSuccessMsg(null), 4000);
    } catch (err) {
      console.error('Failed to export CSV:', err);
      alert('Failed to generate CSV export file.');
    } finally {
      setIsExporting(false);
    }
  };

  // Operations KPI Summary
  const inTransitCount = trips.filter(t => t.status === 'In Transit').length;
  const loadedCount = trips.filter(t => t.status === 'Loaded').length;
  const pendingCount = trips.filter(t => t.status === 'Pending').length;
  const deliveredCount = trips.filter(t => t.status === 'Delivered').length;
  const activeFleetCount = trucks.filter(t => t.status === 'On Trip' || t.status === 'Loading').length;
  const fleetUtilizationPct = trucks.length > 0 ? Math.round((activeFleetCount / trucks.length) * 100) : 0;
  const totalPipelineRevenue = trips
    .filter((t) => t.status !== 'Cancelled')
    .reduce((sum, t) => sum + t.baseRatePhp + t.accessorials.reduce((aSum, a) => aSum + a.amountPhp, 0), 0);
  const totalOverweightCount = trips.filter(t => t.isOverweight).length;
  const totalDemurrageCount = trips.filter(t => t.demurrageHours > 0).length;
  const exceptionCount = trips.filter((t) => t.status === 'On Hold' || t.status === 'Cancelled').length;

  return (
    <div data-tutorial="trip-board" className="flex-1 flex flex-col min-w-0 bg-[#F8FAFC] text-slate-900 overflow-hidden">
      {/* Top Banner & Action Bar */}
      <div className="p-4 md:px-6 md:pt-5 md:pb-4 border-b border-slate-200 bg-white shadow-2xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-bold tracking-tight text-slate-900">Shipment Operations & Dispatch</h1>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 font-bold border border-blue-200">
                {filteredTrips.length} of {trips.length} trips
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Live Luzon linehaul tracking, GVWR payload compliance, demurrage monitoring & POD invoicing.
            </p>
            {onOpenExceptions && (
              <button
                type="button"
                onClick={onOpenExceptions}
                className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-bold text-amber-800 hover:text-amber-950"
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                {exceptionCount > 0 ? `${exceptionCount} exception${exceptionCount === 1 ? '' : 's'} — open page` : 'Holds & cancellations'}
              </button>
            )}
          </div>

          {/* Action Bar */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* View Mode Toggle */}
            <div className="flex items-center bg-slate-100 border border-slate-200 rounded-lg p-1">
              <button
                onClick={() => setViewMode('kanban')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
                  viewMode === 'kanban' 
                    ? 'bg-white text-blue-600 shadow-2xs border border-slate-200' 
                    : 'text-slate-500 hover:text-slate-800'
                }`}
                title="Kanban Board View"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>Kanban Board</span>
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
                  viewMode === 'list' 
                    ? 'bg-white text-blue-600 shadow-2xs border border-slate-200' 
                    : 'text-slate-500 hover:text-slate-800'
                }`}
                title="Tabular List View"
              >
                <List className="w-3.5 h-3.5" />
                <span>Shipment List</span>
              </button>
            </div>

            {/* Export CSV Button & Dropdown */}
            <div className="relative">
              <button
                onClick={() => exportTripsToCSV(hasActiveFilters)}
                disabled={isExporting || trips.length === 0}
                className="flex items-center gap-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-3 py-2 rounded-lg text-xs font-semibold transition-all shadow-2xs hover:border-slate-300 disabled:opacity-50 active:scale-95"
                title="Export trip data to CSV for external spreadsheet analysis (Excel, Google Sheets)"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                <span>Export CSV</span>
                {hasActiveFilters && (
                  <span className="bg-blue-50 text-blue-700 font-bold px-1.5 py-0.2 rounded text-[10px] border border-blue-200">
                    {filteredTrips.length}
                  </span>
                )}
              </button>

              {/* Additional Export Options Toggle */}
              {trips.length > 0 && (
                <button
                  onClick={() => setShowExportMenu(!showExportMenu)}
                  className="absolute right-0 top-0 h-full px-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-r-lg border-l border-slate-200"
                  title="More export options"
                >
                  <ChevronRight className={`w-3 h-3 transition-transform ${showExportMenu ? 'rotate-90' : ''}`} />
                </button>
              )}

              {/* Export Dropdown Menu */}
              {showExportMenu && (
                <>
                  <div 
                    className="fixed inset-0 z-20" 
                    onClick={() => setShowExportMenu(false)}
                  />
                  <div className="absolute right-0 top-full mt-1.5 w-60 bg-white border border-slate-200 rounded-xl shadow-xl p-1.5 z-30 space-y-1 animate-in fade-in zoom-in-95 duration-150 text-xs">
                    <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      CSV Export Options
                    </div>

                    <button
                      onClick={() => exportTripsToCSV(true)}
                      className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg hover:bg-slate-50 text-slate-700 text-left font-medium transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <Download className="w-3.5 h-3.5 text-blue-600" />
                        <span>Export Current View</span>
                      </div>
                      <span className="font-mono font-bold text-[11px] text-slate-500">{filteredTrips.length} rows</span>
                    </button>

                    <button
                      onClick={() => exportTripsToCSV(false)}
                      className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg hover:bg-slate-50 text-slate-700 text-left font-medium transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Export All Fleet Trips</span>
                      </div>
                      <span className="font-mono font-bold text-[11px] text-slate-500">{trips.length} rows</span>
                    </button>

                    <div className="pt-1 border-t border-slate-100 px-2 py-1 text-[10px] text-slate-400">
                      Includes client billing, demurrage, tonnages, margins, diesel estimates, and POD status.
                    </div>
                  </div>
                </>
              )}
            </div>

            {canAccess('new_trip') && (
              <button
                data-tutorial="new-load-btn"
                onClick={onOpenNewTrip}
                className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-xs font-bold transition-all shadow-sm active:scale-95"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>New Dispatch Load</span>
              </button>
            )}
          </div>
        </div>

        {/* Success Toast Banner */}
        {exportSuccessMsg && (
          <div className="mt-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs px-3 py-2 rounded-lg flex items-center justify-between animate-in fade-in slide-in-from-top-1 duration-200 shadow-2xs">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600 shrink-0 stroke-[2.5]" />
              <span className="font-semibold">{exportSuccessMsg}</span>
            </div>
            <button 
              onClick={() => setExportSuccessMsg(null)}
              className="text-emerald-600 hover:text-emerald-900 p-0.5 rounded"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {trips.some((trip) => trip.activeStatusRetraction?.status === 'Pending_Approval') && (
          <div className="mt-3 bg-amber-50 border border-amber-200 text-amber-950 text-xs px-3 py-2 rounded-lg flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0" />
              <span className="font-semibold">
                {trips.filter((trip) => trip.activeStatusRetraction?.status === 'Pending_Approval').length} shipment status rollback
                {trips.filter((trip) => trip.activeStatusRetraction?.status === 'Pending_Approval').length === 1 ? '' : 's'} waiting for Owner or General Manager review.
              </span>
            </div>
            {canApproveTripStatusRetraction && (
              <button
                type="button"
                onClick={() => {
                  const next = trips.find((trip) => trip.activeStatusRetraction?.status === 'Pending_Approval');
                  if (next?.activeStatusRetraction) {
                    setRetractionTarget({ trip: next, toStatus: next.activeStatusRetraction.toStatus });
                  }
                }}
                className="shrink-0 px-2.5 py-1 rounded-lg bg-white border border-amber-300 font-bold hover:bg-amber-100"
              >
                Review
              </button>
            )}
          </div>
        )}

        {/* Operational Quick-Stats Ribbon */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-3 border-t border-slate-100">
          {/* Stat 1: Active Linehauls */}
          <div 
            onClick={() => {
              setStatusFilter('In Transit');
            }}
            className="bg-slate-50 hover:bg-blue-50/50 border border-slate-200 hover:border-blue-300 rounded-xl p-2.5 transition-all cursor-pointer shadow-2xs group"
          >
            <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium">
              <span>In Transit / Loaded</span>
              <Truck className="w-3.5 h-3.5 text-blue-600 group-hover:scale-110 transition-transform" />
            </div>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-lg font-black text-slate-900">{inTransitCount + loadedCount}</span>
              <span className="text-[10px] text-slate-500 font-medium">({inTransitCount} on road, {loadedCount} dock)</span>
            </div>
          </div>

          {/* Stat 2: Fleet Utilization */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 shadow-2xs">
            <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium">
              <span>Fleet Utilization</span>
              <Gauge className="w-3.5 h-3.5 text-indigo-600" />
            </div>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-lg font-black text-slate-900">{fleetUtilizationPct}%</span>
              <span className="text-[10px] text-slate-500 font-medium font-mono">{activeFleetCount}/{trucks.length} trucks</span>
            </div>
          </div>

          {/* Stat 3: Compliance & Demurrage Alerts */}
          <div 
            onClick={() => {
              if (totalOverweightCount > 0) setOverweightOnly(true);
              else if (totalDemurrageCount > 0) setDemurrageOnly(true);
            }}
            className={`border rounded-xl p-2.5 transition-all cursor-pointer shadow-2xs group ${
              totalOverweightCount > 0 || totalDemurrageCount > 0
                ? 'bg-amber-50/70 border-amber-200 hover:border-amber-300'
                : 'bg-slate-50 border-slate-200'
            }`}
          >
            <div className="flex items-center justify-between text-[11px] font-medium text-slate-500">
              <span>Ops Triggers</span>
              <AlertTriangle className={`w-3.5 h-3.5 ${totalOverweightCount > 0 ? 'text-rose-500' : 'text-amber-500'}`} />
            </div>
            <div className="flex items-baseline gap-2 mt-1">
              <span className={`text-lg font-black ${totalOverweightCount > 0 ? 'text-rose-600' : 'text-slate-900'}`}>
                {totalOverweightCount + totalDemurrageCount}
              </span>
              <span className="text-[10px] text-slate-600 font-medium">
                {totalOverweightCount} overweight • {totalDemurrageCount} demurrage
              </span>
            </div>
          </div>

          {/* Stat 4: Freight Pipeline Value */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 shadow-2xs">
            <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium">
              <span>Gross Freight Pipeline</span>
              <Receipt className="w-3.5 h-3.5 text-emerald-600" />
            </div>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-lg font-black text-slate-900 font-mono">
                ₱{(totalPipelineRevenue / 1000).toFixed(1)}k
              </span>
              <span className="text-[10px] text-emerald-700 font-semibold">{deliveredCount} delivered ready</span>
            </div>
          </div>
        </div>

        {/* Enhanced Dynamic Filter Bar with Destination, Customer, and Truck retrieval */}
        <div className="mt-4 pt-3 border-t border-slate-100 flex flex-col gap-2.5">
          <div className="flex flex-wrap items-center gap-2.5 text-xs">
            
            {/* Direct Search Bar for Destination, Customer Name, Truck ID / Plate */}
            <div className="relative w-full sm:w-auto sm:flex-1 sm:min-w-[220px] max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={localSearch}
                onChange={(e) => setLocalSearch(e.target.value)}
                placeholder="Search destination, customer, or truck ID / plate..."
                className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-8 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-colors shadow-2xs"
              />
              {localSearch && (
                <button
                  onClick={() => setLocalSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full hover:bg-slate-100"
                  title="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Filter by Destination Dropdown */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 shadow-2xs">
              <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <select
                value={selectedDestination}
                onChange={(e) => setSelectedDestination(e.target.value)}
                className="bg-transparent text-slate-700 text-xs focus:outline-none cursor-pointer pr-1 max-w-[170px] truncate font-medium"
              >
                <option value="ALL">All Destinations ({uniqueDestinations.length})</option>
                {uniqueDestinations.map(d => (
                  <option key={d.zone} value={d.zone}>
                    {d.zone} ({d.count})
                  </option>
                ))}
              </select>
            </div>

            {/* Filter by Client / Customer Name Dropdown */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 shadow-2xs">
              <Building2 className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
              <select
                value={selectedClientId}
                onChange={(e) => setSelectedClientId(e.target.value)}
                className="bg-transparent text-slate-700 text-xs focus:outline-none cursor-pointer pr-1 max-w-[170px] truncate font-medium"
              >
                <option value="ALL">All Customers ({clients.length})</option>
                {clients.map(c => {
                  const clientTripsCount = trips.filter(t => t.clientId === c.id).length;
                  return (
                    <option key={c.id} value={c.id}>
                      {c.name} ({clientTripsCount})
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Filter by Truck ID / Plate Number Dropdown */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 shadow-2xs">
              <Truck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <select
                value={selectedTruckId}
                onChange={(e) => setSelectedTruckId(e.target.value)}
                className="bg-transparent text-slate-700 text-xs focus:outline-none cursor-pointer pr-1 max-w-[170px] font-medium"
              >
                <option value="ALL">All Trucks ({trucks.length})</option>
                {trucks.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.plateNumber} • {t.type.split(' ')[0]} ({t.id})
                  </option>
                ))}
              </select>
            </div>

            {/* Status Filter Dropdown */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 shadow-2xs">
              <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-transparent text-slate-700 text-xs focus:outline-none cursor-pointer pr-1 font-medium"
              >
                <option value="ALL">All Stages</option>
                <option value="Pending">Pending</option>
                <option value="Loaded">Loaded</option>
                <option value="In Transit">In Transit</option>
                <option value="Delivered">Delivered</option>
                <option value="Invoiced">Invoiced</option>
                <option value="On Hold">On Hold</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>

            {/* Overweight Toggle Pill */}
            <button
              onClick={() => setOverweightOnly(!overweightOnly)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors shadow-2xs ${
                overweightOnly 
                  ? 'bg-rose-50 text-rose-700 border-rose-200 font-semibold ring-1 ring-rose-300' 
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <AlertTriangle className={`w-3.5 h-3.5 ${overweightOnly ? 'text-rose-500' : 'text-slate-400'}`} />
              <span>Overweight Only</span>
            </button>

            {/* Demurrage Toggle Pill */}
            <button
              onClick={() => setDemurrageOnly(!demurrageOnly)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors shadow-2xs ${
                demurrageOnly 
                  ? 'bg-amber-50 text-amber-700 border-amber-200 font-semibold ring-1 ring-amber-300' 
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <Clock className={`w-3.5 h-3.5 ${demurrageOnly ? 'text-amber-500' : 'text-slate-400'}`} />
              <span>Demurrage Active</span>
            </button>

            {/* Quick Export / Reset Actions */}
            <div className="flex items-center gap-2 ml-auto">
              <button
                onClick={() => exportTripsToCSV(true)}
                disabled={isExporting || filteredTrips.length === 0}
                className="text-xs font-semibold text-slate-700 hover:text-emerald-700 bg-white hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-colors shadow-2xs"
                title="Export current filtered results to CSV"
              >
                <Download className="w-3.5 h-3.5 text-emerald-600" />
                <span>Export CSV ({filteredTrips.length})</span>
              </button>

              {hasActiveFilters && (
                <button
                  onClick={resetFilters}
                  className="text-xs font-semibold text-rose-600 hover:text-rose-700 flex items-center gap-1 px-2.5 py-1.5 rounded-lg hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Reset filters</span>
                </button>
              )}
            </div>
          </div>

          {/* Active Filter Chips / Badges Row */}
          {hasActiveFilters && (
            <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[11px]">
              <span className="text-slate-400 font-medium mr-1">Active filters:</span>
              
              {localSearch && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 font-medium">
                  Search: &quot;{localSearch}&quot;
                  <button onClick={() => setLocalSearch('')} className="hover:text-blue-900 ml-0.5">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {selectedDestination !== 'ALL' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 font-medium">
                  <MapPin className="w-3 h-3" />
                  Destination: {selectedDestination}
                  <button onClick={() => setSelectedDestination('ALL')} className="hover:text-blue-900 ml-0.5">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {selectedClientId !== 'ALL' && selectedClientObj && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 font-medium">
                  <Building2 className="w-3 h-3" />
                  Customer: {selectedClientObj.name}
                  <button onClick={() => setSelectedClientId('ALL')} className="hover:text-indigo-900 ml-0.5">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {selectedTruckId !== 'ALL' && selectedTruckObj && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-300 font-mono font-medium">
                  <Truck className="w-3 h-3" />
                  Truck: {selectedTruckObj.plateNumber} ({selectedTruckObj.id})
                  <button onClick={() => setSelectedTruckId('ALL')} className="hover:text-emerald-900 ml-0.5">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {statusFilter !== 'ALL' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200 font-medium">
                  Stage: {statusFilter}
                  <button onClick={() => setStatusFilter('ALL')} className="hover:text-purple-900 ml-0.5">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {overweightOnly && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 font-medium">
                  Overweight flagged
                  <button onClick={() => setOverweightOnly(false)} className="hover:text-rose-900 ml-0.5">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {demurrageOnly && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 font-medium">
                  Demurrage active
                  <button onClick={() => setDemurrageOnly(false)} className="hover:text-amber-900 ml-0.5">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              <span className="ml-auto text-[11px] text-slate-500 font-semibold">
                Showing {filteredTrips.length} of {trips.length} trips
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Main Board Content */}
      <div className={`flex-1 min-h-0 p-3 md:p-4 flex flex-col ${viewMode === 'kanban' ? 'overflow-hidden' : 'overflow-auto'}`}>
        {viewMode === 'kanban' ? (
          <div className="flex-1 min-h-0 overflow-x-auto">
            <div className="flex gap-3 h-full min-w-[1100px] items-stretch">
              {COLUMNS.map((column) => {
                const columnTrips = filteredTrips.filter(t => t.status === column.id);
                return (
                  <div
                    key={column.id}
                    className="flex-1 min-w-[240px] max-w-[320px] bg-slate-100/70 border border-slate-200 rounded-xl flex flex-col h-full shadow-2xs overflow-hidden"
                  >
                    <div className="px-3 py-2 border-b border-slate-200 flex items-center justify-between bg-white rounded-t-xl shrink-0">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${
                          column.id === 'Pending' ? 'bg-slate-400' :
                          column.id === 'Loaded' ? 'bg-blue-500' :
                          column.id === 'In Transit' ? 'bg-amber-500 animate-pulse' :
                          column.id === 'Delivered' ? 'bg-emerald-500' : 'bg-purple-500'
                        }`} />
                        <span className="text-xs font-bold tracking-tight text-slate-800">{column.label}</span>
                      </div>
                      <span className={`text-[11px] font-mono px-2 py-0.5 rounded font-bold border ${column.countColor}`}>
                        {columnTrips.length}
                      </span>
                    </div>
                    <div className="p-2 overflow-y-auto space-y-2 flex-1 min-h-0 custom-scrollbar">
                      {columnTrips.length === 0 ? (
                        <div className="py-6 px-3 text-center border border-dashed border-slate-300 rounded-lg text-slate-400 text-xs bg-white/50 space-y-1">
                          <div>No shipments in {column.label.toLowerCase()}</div>
                          {hasActiveFilters && <div className="text-[10px] text-slate-400">matching current filter</div>}
                        </div>
                      ) : (
                        columnTrips.map((trip) => (
                          <TripKanbanCard key={trip.id} {...kanbanCardProps(trip)} />
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* Tabular List View */
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider text-[10px] border-b border-slate-200">
                  <tr>
                    <th className="py-3.5 px-4">Trip ID / Waybill</th>
                    <th className="py-3.5 px-4">Customer</th>
                    <th className="py-3.5 px-4">Origin → Destination</th>
                    <th className="py-3.5 px-4">Goods & Weight</th>
                    <th className="py-3.5 px-4">Truck & Driver</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4">Base + Acc (₱)</th>
                    <th className="py-3.5 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredTrips.length === 0 ? (
                    <tr>
                      <td colSpan={8} data-tutorial="trip-board-empty" className="py-12 text-center text-slate-400 text-xs">
                        <div className="max-w-xs mx-auto space-y-2">
                          <p>{trips.length === 0 ? 'No trips yet. Tap New Load when you are ready to book one.' : 'No shipments match the selected filters.'}</p>
                          {hasActiveFilters && (
                            <button
                              onClick={resetFilters}
                              className="px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 font-semibold text-xs border border-blue-200 hover:bg-blue-100"
                            >
                              Clear all filters
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredTrips.map((trip) => {
                      const trk = trucks.find(t => t.id === trip.truckId);
                      const drv = drivers.find(d => d.id === trip.driverId);
                      const clt = clients.find(c => c.id === trip.clientId);
                      const totalAcc = trip.accessorials.filter(a => a.approved).reduce((sum, a) => sum + a.amountPhp, 0);

                      return (
                        <tr 
                          key={trip.id}
                          onClick={() => onSelectTrip(trip)}
                          className="hover:bg-slate-50 transition-colors cursor-pointer"
                        >
                          <td className="py-3.5 px-4">
                            <div className="font-mono font-bold text-blue-600">{trip.tripNumber}</div>
                            <div className="text-[10px] text-slate-400 font-mono">{trip.waybillNumber}</div>
                          </td>
                          <td className="py-3.5 px-4 font-semibold text-slate-800 max-w-[180px] truncate">
                            {clt?.name}
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                              <span className="truncate">{trip.originZone}</span>
                              <ArrowRight className="w-3 h-3 text-slate-400 shrink-0" />
                              <span className="truncate">{trip.destinationZone}</span>
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="truncate max-w-[160px] text-slate-700 font-medium">{trip.cargoDescription}</div>
                            <div className="text-[10px] font-mono text-slate-500">
                              {(trip.cargoWeightKg / 1000).toFixed(1)} MT {trip.isOverweight && <span className="text-rose-600 font-bold ml-1">(!OVER)</span>}
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="font-mono font-semibold text-slate-800">{trk?.plateNumber}</div>
                            <div className="text-[10px] text-slate-500">{drv?.name}</div>
                          </td>
                          <td className="py-3.5 px-4" onClick={(e) => e.stopPropagation()}>
                            <select
                              value={trip.status}
                              onChange={(e) => handleDirectStatusChange(e as any, trip, e.target.value as TripStatus)}
                              className={`text-[11px] font-bold px-2 py-1 rounded-md border cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
                                trip.status === 'Pending' ? 'bg-slate-100 text-slate-700 border-slate-300' :
                                trip.status === 'Loaded' ? 'bg-blue-50 text-blue-700 border-blue-300' :
                                trip.status === 'In Transit' ? 'bg-amber-50 text-amber-800 border-amber-300' :
                                trip.status === 'Delivered' ? 'bg-emerald-50 text-emerald-800 border-emerald-300' :
                                trip.status === 'On Hold' ? 'bg-amber-50 text-amber-900 border-amber-400' :
                                trip.status === 'Cancelled' ? 'bg-rose-50 text-rose-800 border-rose-300' :
                                'bg-purple-50 text-purple-800 border-purple-300'
                              }`}
                            >
                              <option value="Pending">Pending</option>
                              <option value="Loaded">Loaded</option>
                              <option value="In Transit">In Transit</option>
                              <option value="Delivered">Delivered</option>
                              <option value="Invoiced">Invoiced</option>
                              <option value="On Hold">On Hold</option>
                              <option value="Cancelled">Cancelled</option>
                            </select>
                          </td>
                          <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                            ₱{(trip.baseRatePhp + totalAcc).toLocaleString()}
                          </td>
                          <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => setDeliveryNoteTrip(trip)}
                                className="px-2 py-1 rounded text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-100 transition-colors flex items-center gap-1 shadow-2xs"
                                title="View Delivery Note"
                              >
                                <FileText className="w-3 h-3" />
                                <span>DN</span>
                              </button>
                              {(() => {
                                const nextTarget: TripStatus =
                                  trip.status === 'Pending' ? 'Loaded' :
                                  trip.status === 'Loaded' ? 'In Transit' :
                                  trip.status === 'In Transit' ? 'Delivered' :
                                  trip.status === 'Delivered' ? 'Invoiced' :
                                  trip.status === 'On Hold' ? resumeTarget(trip) :
                                  'Invoiced';
                                const perm = trip.status === 'Cancelled'
                                  ? { allowed: false, allowedRoles: [] as string[] }
                                  : trip.status === 'On Hold'
                                  ? canManipulateTripStatus('On Hold', trip.status)
                                  : trip.status !== 'Invoiced'
                                  ? canManipulateTripStatus(nextTarget, trip.status)
                                  : { allowed: true, allowedRoles: [] as string[] };

                                return (
                                  <button
                                    onClick={(e) => handleNextStatus(e, trip)}
                                    disabled={trip.status === 'Cancelled'}
                                    className={`px-2.5 py-1 rounded text-xs font-bold transition-all shadow-2xs active:scale-95 flex items-center gap-1 disabled:opacity-50 ${
                                      trip.status === 'Cancelled'
                                        ? 'bg-slate-100 text-slate-400'
                                        : !perm.allowed && trip.status !== 'Invoiced'
                                        ? 'bg-slate-200 text-slate-500 hover:bg-slate-300'
                                        : trip.status === 'Pending' 
                                        ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                                        : trip.status === 'Loaded'
                                        ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                                        : trip.status === 'In Transit'
                                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                        : trip.status === 'Delivered'
                                        ? 'bg-purple-600 hover:bg-purple-700 text-white'
                                        : trip.status === 'On Hold'
                                        ? 'bg-amber-600 hover:bg-amber-700 text-white'
                                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                                    }`}
                                    title={!perm.allowed && trip.status !== 'Invoiced' 
                                      ? `🔒 Restricted: Requires ${perm.allowedRoles.join(', ')} role` 
                                      : "Push to next stage"}
                                  >
                                    {!perm.allowed && trip.status !== 'Invoiced' && <Lock className="w-3 h-3 text-slate-400" />}
                                    <span>
                                      {trip.status === 'Pending' && 'Load'}
                                      {trip.status === 'Loaded' && 'Dispatch'}
                                      {trip.status === 'In Transit' && 'Deliver'}
                                      {trip.status === 'Delivered' && 'Invoice'}
                                      {trip.status === 'Invoiced' && 'View'}
                                      {trip.status === 'On Hold' && 'Resume'}
                                      {trip.status === 'Cancelled' && 'Cancelled'}
                                    </span>
                                    {trip.status !== 'Cancelled' && <ChevronRight className="w-3 h-3" />}
                                  </button>
                                );
                              })()}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Status Transition Prerequisites Clearance Modal */}
      {prerequisiteTrip && prerequisiteTargetStatus && (
        <StatusPrerequisiteModal
          isOpen={Boolean(prerequisiteTrip && prerequisiteTargetStatus)}
          onClose={() => {
            setPrerequisiteTrip(null);
            setPrerequisiteTargetStatus(null);
          }}
          trip={prerequisiteTrip}
          targetStatus={prerequisiteTargetStatus}
          truck={trucks.find(t => t.id === prerequisiteTrip.truckId)}
          driver={drivers.find(d => d.id === prerequisiteTrip.driverId)}
          client={clients.find(c => c.id === prerequisiteTrip.clientId)}
          onConfirmAdvance={handleConfirmPrerequisiteAdvance}
          onOpenDeliveryNote={() => {
            const t = prerequisiteTrip;
            setDeliveryNoteTrip(t);
          }}
        />
      )}

      {exceptionTarget && (
        <TripExceptionModal
          trip={exceptionTarget.trip}
          mode={exceptionTarget.mode}
          onClose={() => setExceptionTarget(null)}
          onConfirm={handleExceptionConfirm}
        />
      )}

      {retractionTarget && (
        <TripStatusRetractionModal
          isOpen
          trip={trips.find((item) => item.id === retractionTarget.trip.id) || retractionTarget.trip}
          toStatus={retractionTarget.toStatus}
          onClose={() => setRetractionTarget(null)}
        />
      )}

      {/* Official Consignment Delivery Note Modal (Highest Priority z-70 Modal) */}
      {deliveryNoteTrip && (
        <DeliveryNoteModal
          isOpen={Boolean(deliveryNoteTrip)}
          onClose={() => setDeliveryNoteTrip(null)}
          trip={deliveryNoteTrip}
          truck={trucks.find(t => t.id === deliveryNoteTrip.truckId)}
          driver={drivers.find(d => d.id === deliveryNoteTrip.driverId)}
          client={clients.find(c => c.id === deliveryNoteTrip.clientId)}
          company={company}
        />
      )}
    </div>
  );
};

