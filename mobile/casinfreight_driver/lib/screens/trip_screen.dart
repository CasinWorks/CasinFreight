import 'dart:io';

import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter/material.dart';

import '../driver_session.dart';
import '../next_step.dart';
import '../ui/gps_banner.dart';
import '../ui/section_card.dart';
import '../ui/status_chip.dart';
import 'sign_screen.dart';

class TripScreen extends StatefulWidget {
  const TripScreen({
    super.key,
    required this.session,
    required this.tripId,
    required this.initialTrip,
  });

  final DriverSession session;
  final String tripId;
  final Map<String, dynamic> initialTrip;

  @override
  State<TripScreen> createState() => _TripScreenState();
}

class _TripScreenState extends State<TripScreen> {
  @override
  void initState() {
    super.initState();
    widget.session.startTracking(widget.tripId);
  }

  @override
  void dispose() {
    widget.session.stopTracking();
    super.dispose();
  }

  void _message(String message) {
    if (!mounted) return;
    ScaffoldMessenger.of(
      context,
    ).showSnackBar(SnackBar(content: Text(message)));
  }

  Future<void> _requireGps(Future<void> Function() action) async {
    await widget.session.refreshGps();
    if (!widget.session.gpsOk) {
      _message('Turn on GPS first. The office is notified when it is off.');
      return;
    }
    try {
      await action();
    } catch (error) {
      _message(error.toString());
    }
  }

  Future<void> _photo(String kind, String label) async {
    await _requireGps(() async {
      final file = await widget.session.takePhoto();
      if (file == null) return;
      final url = await widget.session.uploadPhoto(
        widget.tripId,
        File(file.path),
      );
      await widget.session.addFieldEvent(
        tripId: widget.tripId,
        kind: kind,
        photoUrl: url,
        note: label,
      );
      _message('$label sent to the web office');
    });
  }

  void _openSignature({
    required String status,
    required String kind,
    required String title,
    bool askReceiver = false,
  }) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => SignScreen(
          session: widget.session,
          tripId: widget.tripId,
          tripStatus: status,
          kind: kind,
          title: title,
          askReceiver: askReceiver,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return StreamBuilder<DocumentSnapshot<Map<String, dynamic>>>(
      stream: widget.session.tripStream(widget.tripId),
      builder: (context, tripSnap) {
        final trip = tripSnap.data?.data() ?? widget.initialTrip;
        final status = (trip['status'] ?? 'Pending').toString();
        final dispatcherSigned = hasSignatureInk(trip['dispatcherSignoff']);
        final driverSigned = hasSignatureInk(trip['driverSignoff']);
        final podSigned = hasSignatureInk(trip['pod']);

        return StreamBuilder<QuerySnapshot<Map<String, dynamic>>>(
          stream: widget.session.fieldEventsStream(widget.tripId),
          builder: (context, eventSnap) {
            final kinds = {
              for (final doc in eventSnap.data?.docs ?? [])
                (doc.data()['kind'] ?? '').toString(),
            };
            final pickupStamped = kinds.contains('pickup_geo');
            final deliveryStamped = kinds.contains('delivery_geo');
            final sealPhoto = kinds.contains('seal_photo');
            final containerPhoto = kinds.contains('container_photo');
            final parcelPhoto = kinds.contains('parcel_photo');
            final canSignDispatch =
                widget.session.gpsOk && sealPhoto && !driverSigned;
            final canMoveCargo = driverSigned && dispatcherSigned;
            final nextStep = nextStepForTrip(trip: trip, eventKinds: kinds);

            return Scaffold(
              appBar: AppBar(
                title: Text((trip['tripNumber'] ?? 'Trip').toString()),
              ),
              body: ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  GpsBanner(session: widget.session),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          (trip['cargoDescription'] ?? 'Assigned shipment')
                              .toString(),
                          style: const TextStyle(
                            fontSize: 19,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                      ),
                      TripStatusChip(status: status),
                    ],
                  ),
                  const SizedBox(height: 12),
                  NextStepCard(step: nextStep),
                  const SizedBox(height: 12),
                  SectionCard(
                    title: 'Route',
                    icon: Icons.route_outlined,
                    child: Column(
                      children: [
                        DetailRow(
                          label: 'Pickup',
                          value: _firstValue(trip, [
                            'originAddress',
                            'originZone',
                          ]),
                        ),
                        DetailRow(
                          label: 'Delivery',
                          value: _firstValue(trip, [
                            'destinationAddress',
                            'destinationZone',
                          ]),
                        ),
                        DetailRow(
                          label: 'Schedule',
                          value: _scheduleText(trip),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 12),
                  SectionCard(
                    title: 'Vehicle & documents',
                    icon: Icons.local_shipping_outlined,
                    child: Column(
                      children: [
                        DetailRow(
                          label: 'Vehicle',
                          value: _firstValue(trip, [
                            'truckPlateNumber',
                            'plateNumber',
                            'truckId',
                          ]),
                        ),
                        DetailRow(
                          label: 'Seal',
                          value: _firstValue(trip, [
                            'securitySealNumber',
                            'sealNumber',
                          ]),
                        ),
                        DetailRow(
                          label: 'DN',
                          value: _firstValue(trip, [
                            'deliveryNoteNumber',
                            'waybillNumber',
                          ]),
                        ),
                        DetailRow(
                          label: 'Gate pass',
                          value: (trip['gatePassNumber'] ?? '').toString(),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 12),
                  SectionCard(
                    title: 'Gate checklist',
                    icon: Icons.fact_check_outlined,
                    child: Column(
                      children: [
                        _GateRow(
                          done: pickupStamped,
                          label: 'Pickup GPS stamped',
                        ),
                        _GateRow(
                          done: dispatcherSigned,
                          label: 'Dispatcher signed yard release (web)',
                        ),
                        _GateRow(done: sealPhoto, label: 'Seal photo captured'),
                        _GateRow(
                          done: driverSigned,
                          label: 'Driver received sealed cargo',
                        ),
                        _GateRow(
                          done: deliveryStamped,
                          label: 'Delivery GPS stamped',
                        ),
                        _GateRow(
                          done: podSigned,
                          label: 'Warehouse / consignee signed POD',
                        ),
                        const SizedBox(height: 4),
                        Text(
                          'Cargo cannot go In Transit until dispatcher and driver signatures are both on file.',
                          style: TextStyle(
                            fontSize: 12,
                            color: Colors.grey.shade700,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 12),
                  SectionCard(
                    title: 'Location stamps',
                    icon: Icons.pin_drop_outlined,
                    child: Column(
                      children: [
                        FilledButton.icon(
                          onPressed: () => _requireGps(() async {
                            await widget.session.stampGeo(
                              widget.tripId,
                              'pickup_geo',
                              'Arrived at pickup',
                            );
                            _message(
                              'Pickup GPS saved with time + map pin. Office can see it on the trip.',
                            );
                          }),
                          icon: Icon(
                            pickupStamped ? Icons.check : Icons.flag_outlined,
                          ),
                          label: Text(
                            pickupStamped
                                ? 'Stamp pickup GPS again'
                                : 'Stamp pickup GPS',
                          ),
                        ),
                        const SizedBox(height: 8),
                        FilledButton.tonalIcon(
                          onPressed: canMoveCargo
                              ? () => _requireGps(() async {
                                  await widget.session.stampGeo(
                                    widget.tripId,
                                    'delivery_geo',
                                    'GPS at consignee (not Inbound yet)',
                                  );
                                  _message(
                                    'Delivery GPS saved. To unlock warehouse e-POD, tap I have arrived.',
                                  );
                                })
                              : () => _message(
                                  'Dispatcher and driver must both sign before delivery GPS.',
                                ),
                          icon: Icon(
                            deliveryStamped
                                ? Icons.check
                                : Icons.place_outlined,
                          ),
                          label: Text(
                            deliveryStamped
                                ? 'Stamp delivery GPS again'
                                : 'Stamp delivery GPS',
                          ),
                        ),
                        if (status == 'In Transit' || status == 'Inbound') ...[
                          const SizedBox(height: 10),
                          FilledButton.icon(
                            style: FilledButton.styleFrom(
                              backgroundColor: status == 'Inbound'
                                  ? const Color(0xFF047857)
                                  : const Color(0xFF0891B2),
                              minimumSize: const Size.fromHeight(48),
                            ),
                            onPressed: canMoveCargo
                                ? () => _requireGps(() async {
                                      await widget.session
                                          .markArrivedAtConsignee(
                                            widget.tripId,
                                          );
                                      _message(
                                        status == 'Inbound'
                                            ? 'Arrival GPS refreshed. Warehouse can still sign e-POD.'
                                            : 'Inbound set. Hand this phone to the warehouse for e-POD.',
                                      );
                                    })
                                : () => _message(
                                    'Finish yard release signatures before marking arrival.',
                                  ),
                            icon: Icon(
                              status == 'Inbound'
                                  ? Icons.check_circle
                                  : Icons.warehouse_outlined,
                            ),
                            label: Text(
                              status == 'Inbound'
                                  ? 'Arrived (Inbound) ✓'
                                  : 'I have arrived',
                              style: const TextStyle(
                                fontWeight: FontWeight.w800,
                              ),
                            ),
                          ),
                          if (status == 'In Transit')
                            const Padding(
                              padding: EdgeInsets.only(top: 8),
                              child: Text(
                                'Stamp delivery GPS only records a pin. Tap I have arrived to change status to Inbound so the warehouse can sign.',
                                style: TextStyle(
                                  fontSize: 12,
                                  color: Colors.black54,
                                ),
                              ),
                            ),
                        ],
                      ],
                    ),
                  ),
                  const SizedBox(height: 12),
                  SectionCard(
                    title: 'Photos',
                    icon: Icons.photo_camera_outlined,
                    child: Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: [
                        OutlinedButton.icon(
                          onPressed: () => _photo('seal_photo', 'Seal photo'),
                          icon: Icon(
                            sealPhoto ? Icons.check_circle : Icons.lock_outline,
                          ),
                          label: Text(sealPhoto ? 'Seal ✓' : 'Seal photo *'),
                        ),
                        OutlinedButton.icon(
                          onPressed: canMoveCargo
                              ? () =>
                                    _photo('container_photo', 'Container photo')
                              : () => _message(
                                  'Dispatcher and driver must sign first.',
                                ),
                          icon: Icon(
                            containerPhoto
                                ? Icons.check_circle
                                : Icons.add_a_photo_outlined,
                          ),
                          label: Text(
                            containerPhoto ? 'Container ✓' : 'Container',
                          ),
                        ),
                        OutlinedButton.icon(
                          onPressed: canMoveCargo
                              ? () => _photo('parcel_photo', 'Parcel photo')
                              : () => _message(
                                  'Dispatcher and driver must sign first.',
                                ),
                          icon: Icon(
                            parcelPhoto
                                ? Icons.check_circle
                                : Icons.add_a_photo_outlined,
                          ),
                          label: Text(parcelPhoto ? 'Parcel ✓' : 'Parcel'),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 12),
                  SectionCard(
                    title: 'Signatures',
                    icon: Icons.draw_outlined,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        FilledButton.tonal(
                          onPressed: canSignDispatch
                              ? () => _openSignature(
                                  status: status,
                                  kind: 'dispatch_signature',
                                  title: 'Dispatch / hauling signature',
                                )
                              : () => _message(
                                  driverSigned
                                      ? 'Driver dispatch is already signed.'
                                      : !sealPhoto
                                      ? 'Take a seal photo first.'
                                      : 'Turn on GPS, then sign.',
                                ),
                          child: Text(
                            driverSigned
                                ? 'Driver cargo receipt signed ✓'
                                : 'Sign received sealed cargo',
                          ),
                        ),
                        if (driverSigned && !dispatcherSigned)
                          const Padding(
                            padding: EdgeInsets.only(top: 8),
                            child: Text(
                              'Waiting for dispatcher yard release on the web before this trip can go In Transit.',
                              style: TextStyle(
                                fontSize: 12,
                                color: Colors.orange,
                              ),
                            ),
                          ),
                        const SizedBox(height: 8),
                        if (!podSigned && status == 'Inbound')
                          FilledButton.icon(
                            style: FilledButton.styleFrom(
                              backgroundColor: const Color(0xFF0F766E),
                              minimumSize: const Size.fromHeight(48),
                            ),
                            onPressed: () => _openSignature(
                              status: status,
                              kind: 'pod_signature',
                              title: 'Warehouse e-POD on this phone',
                              askReceiver: true,
                            ),
                            icon: const Icon(Icons.draw_outlined),
                            label: const Text(
                              'Warehouse signs on this phone',
                            ),
                          ),
                        if (!podSigned && status == 'Inbound')
                          const Padding(
                            padding: EdgeInsets.only(top: 8, bottom: 8),
                            child: Text(
                              'Hand the phone to the warehouse officer. They sign, then type their full name and role (e.g. Receiving clerk).',
                              style: TextStyle(
                                fontSize: 12,
                                color: Color(0xFF475569),
                                height: 1.35,
                              ),
                            ),
                          ),
                        if (!podSigned && status != 'Inbound')
                          Container(
                            width: double.infinity,
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: const Color(0xFFF8FAFC),
                              borderRadius: BorderRadius.circular(10),
                              border: Border.all(
                                color: const Color(0xFFE2E8F0),
                              ),
                            ),
                            child: Text(
                              canMoveCargo
                                  ? 'After you tap I have arrived (Inbound), hand this phone to the warehouse officer to sign e-POD (name + role).'
                                  : 'Consignee / warehouse e-POD opens after yard release, then arrival (Inbound).',
                              style: const TextStyle(
                                fontSize: 12,
                                color: Color(0xFF475569),
                                height: 1.35,
                              ),
                            ),
                          ),
                        if (podSigned)
                          const Padding(
                            padding: EdgeInsets.only(top: 8),
                            child: Text(
                              'Proof of delivery signed ✓',
                              style: TextStyle(
                                fontSize: 13,
                                fontWeight: FontWeight.w700,
                                color: Color(0xFF047857),
                              ),
                            ),
                          ),
                      ],
                    ),
                  ),
                ],
              ),
            );
          },
        );
      },
    );
  }

  String _firstValue(Map<String, dynamic> data, List<String> keys) {
    for (final key in keys) {
      final value = data[key]?.toString().trim() ?? '';
      if (value.isNotEmpty) return value;
    }
    return '';
  }

  String _scheduleText(Map<String, dynamic> trip) {
    final pickup = (trip['scheduledPickup'] ?? '').toString();
    final delivery = (trip['scheduledDelivery'] ?? '').toString();
    if (pickup.isEmpty && delivery.isEmpty) return '';
    if (pickup.isEmpty) return 'Deliver $delivery';
    if (delivery.isEmpty) return 'Pickup $pickup';
    return '$pickup → $delivery';
  }
}

class _GateRow extends StatelessWidget {
  const _GateRow({required this.done, required this.label});

  final bool done;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        children: [
          Icon(
            done ? Icons.check_circle : Icons.radio_button_unchecked,
            size: 19,
            color: done ? Colors.green : Colors.grey,
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              label,
              style: TextStyle(
                fontWeight: done ? FontWeight.w600 : FontWeight.w400,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
