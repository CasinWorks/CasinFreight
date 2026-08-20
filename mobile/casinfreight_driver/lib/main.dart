import 'dart:io';

import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:signature/signature.dart';

import 'driver_session.dart';
import 'firebase_options.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Firebase.initializeApp(options: DefaultFirebaseOptions.currentPlatform);
  final session = DriverSession();
  await session.bootstrap();
  runApp(CasinFreightDriverApp(session: session));
}

const _navy = Color(0xFF0F172A);
const _blue = Color(0xFF2563EB);

class CasinFreightDriverApp extends StatelessWidget {
  const CasinFreightDriverApp({super.key, required this.session});
  final DriverSession session;

  @override
  Widget build(BuildContext context) {
    return ListenableBuilder(
      listenable: session,
      builder: (context, _) {
        return MaterialApp(
          title: 'CasinFreight Driver',
          debugShowCheckedModeBanner: false,
          theme: ThemeData(
            colorScheme: ColorScheme.fromSeed(seedColor: _blue, brightness: Brightness.light),
            useMaterial3: true,
            scaffoldBackgroundColor: const Color(0xFFF8FAFC),
          ),
          home: session.signedIn ? HomeScreen(session: session) : LoginScreen(session: session),
        );
      },
    );
  }
}

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key, required this.session});
  final DriverSession session;

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final email = TextEditingController();
  final password = TextEditingController();

  @override
  void dispose() {
    email.dispose();
    password.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final session = widget.session;
    return Scaffold(
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(24),
          children: [
            const SizedBox(height: 32),
            const Text('CasinFreight', style: TextStyle(fontSize: 28, fontWeight: FontWeight.w800, color: _navy)),
            const Text('Driver app · GPS, seals, signatures', style: TextStyle(color: Colors.blueGrey)),
            const SizedBox(height: 28),
            TextField(
              controller: email,
              keyboardType: TextInputType.emailAddress,
              autocorrect: false,
              decoration: const InputDecoration(labelText: 'Work email', border: OutlineInputBorder()),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: password,
              obscureText: true,
              decoration: const InputDecoration(labelText: 'Password', border: OutlineInputBorder()),
            ),
            if (session.error != null) ...[
              const SizedBox(height: 12),
              Text(session.error!, style: const TextStyle(color: Colors.red, fontSize: 13)),
            ],
            const SizedBox(height: 20),
            FilledButton(
              onPressed: session.busy
                  ? null
                  : () async {
                      final ok = await session.login(email.text, password.text);
                      if (!ok && context.mounted) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(content: Text(session.error ?? 'Could not sign in')),
                        );
                      }
                    },
              child: session.busy
                  ? const SizedBox(height: 18, width: 18, child: CircularProgressIndicator(strokeWidth: 2))
                  : const Text('Sign in'),
            ),
            const SizedBox(height: 16),
            const Text(
              'Ask dispatch to invite you under Company & Team as Driver, then put the same email on Driver Roster.',
              style: TextStyle(fontSize: 12, color: Colors.black54),
            ),
          ],
        ),
      ),
    );
  }
}

class HomeScreen extends StatelessWidget {
  const HomeScreen({super.key, required this.session});
  final DriverSession session;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('My trips'),
        actions: [
          IconButton(
            tooltip: 'Sign out',
            onPressed: session.logout,
            icon: const Icon(Icons.logout),
          ),
        ],
      ),
      body: Column(
        children: [
          GpsBanner(session: session),
          if (session.profile?.rosterId == null)
            const Padding(
              padding: EdgeInsets.all(12),
              child: Text(
                'Your login works, but Driver Roster has no matching email. Ask dispatch to save your email on your driver record.',
                style: TextStyle(color: Colors.orange, fontSize: 13),
              ),
            ),
          Expanded(
            child: StreamBuilder<QuerySnapshot<Map<String, dynamic>>>(
              stream: session.tripsStream(),
              builder: (context, snap) {
                if (snap.hasError) {
                  return Center(child: Text('Could not load trips: ${snap.error}'));
                }
                if (!snap.hasData) {
                  return const Center(child: CircularProgressIndicator());
                }
                final docs = snap.data!.docs.where((doc) {
                  final status = (doc.data()['status'] ?? '') as String;
                  return status != 'Cancelled' && status != 'Invoiced';
                }).toList();
                if (docs.isEmpty) {
                  return const Center(child: Text('No assigned trips yet.'));
                }
                return ListView.separated(
                  padding: const EdgeInsets.all(12),
                  itemCount: docs.length,
                  separatorBuilder: (context, index) => const SizedBox(height: 8),
                  itemBuilder: (context, i) {
                    final data = docs[i].data();
                    final id = docs[i].id;
                    return Card(
                      child: ListTile(
                        title: Text('${data['tripNumber'] ?? id} · ${data['status'] ?? ''}'),
                        subtitle: Text('${data['originZone'] ?? ''} → ${data['destinationZone'] ?? ''}'),
                        trailing: const Icon(Icons.chevron_right),
                        onTap: () {
                          Navigator.of(context).push(
                            MaterialPageRoute(
                              builder: (_) => TripScreen(session: session, tripId: id, trip: data),
                            ),
                          );
                        },
                      ),
                    );
                  },
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}

class GpsBanner extends StatelessWidget {
  const GpsBanner({super.key, required this.session});
  final DriverSession session;

  @override
  Widget build(BuildContext context) {
    final ok = session.gpsOk;
    return Material(
      color: ok ? const Color(0xFFECFDF5) : const Color(0xFFFEE2E2),
      child: ListTile(
        dense: true,
        leading: Icon(ok ? Icons.gps_fixed : Icons.gps_off, color: ok ? Colors.green : Colors.red),
        title: Text(
          ok
              ? 'GPS on · dispatch can see this truck'
              : session.gpsMocked
                  ? 'Fake GPS detected. Turn off mock location.'
                  : 'GPS is off. Turn on Location. Photos and signatures are locked.',
          style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: ok ? Colors.green.shade900 : Colors.red.shade900),
        ),
        trailing: TextButton(onPressed: session.refreshGps, child: const Text('Check')),
      ),
    );
  }
}

bool _hasInk(dynamic signoff) {
  if (signoff is! Map) return false;
  final url = signoff['signatureDataUrl']?.toString() ?? '';
  return url.startsWith('data:image') && url.length > 120;
}

class TripScreen extends StatefulWidget {
  const TripScreen({super.key, required this.session, required this.tripId, required this.trip});
  final DriverSession session;
  final String tripId;
  final Map<String, dynamic> trip;

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

  Future<void> _blocked(String message) async {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(message)));
  }

  Future<void> _requireGps(Future<void> Function() action) async {
    await widget.session.refreshGps();
    if (!widget.session.gpsOk) {
      await _blocked('Turn on GPS first. The office is notified when it is off.');
      return;
    }
    await action();
  }

  Future<void> _photo(String kind, String label) async {
    await _requireGps(() async {
      final file = await widget.session.takePhoto();
      if (file == null) return;
      final url = await widget.session.uploadPhoto(widget.tripId, File(file.path));
      await widget.session.addFieldEvent(tripId: widget.tripId, kind: kind, photoUrl: url, note: label);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$label sent to the web office')));
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return StreamBuilder<DocumentSnapshot<Map<String, dynamic>>>(
      stream: widget.session.tripStream(widget.tripId),
      builder: (context, tripSnap) {
        final trip = tripSnap.data?.data() ?? widget.trip;
        final status = (trip['status'] ?? '') as String;
        final dispatcherSigned = _hasInk(trip['dispatcherSignoff']);
        final driverSigned = _hasInk(trip['driverSignoff']);
        final podSigned = _hasInk(trip['pod']);

        return StreamBuilder<QuerySnapshot<Map<String, dynamic>>>(
          stream: widget.session.fieldEventsStream(widget.tripId),
          builder: (context, eventSnap) {
            final kinds = {
              for (final doc in eventSnap.data?.docs ?? [])
                (doc.data()['kind'] ?? '').toString(),
            };
            final sealPhoto = kinds.contains('seal_photo');
            final canSignDispatch = widget.session.gpsOk && sealPhoto && !driverSigned;
            final canMoveCargo = driverSigned && dispatcherSigned;
            final canSignPod = widget.session.gpsOk && canMoveCargo && !podSigned &&
                (status == 'In Transit' || status == 'On Hold' || status == 'Delivered');

            return Scaffold(
              appBar: AppBar(title: Text('${trip['tripNumber'] ?? 'Trip'}')),
              body: ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  GpsBanner(session: widget.session),
                  const SizedBox(height: 12),
                  Text('${trip['originZone']} → ${trip['destinationZone']}', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800)),
                  Text('Status: $status · ${trip['cargoDescription'] ?? ''}'),
                  const SizedBox(height: 12),
                  _GateRow(done: dispatcherSigned, label: '1. Dispatcher signed yard release (web)'),
                  _GateRow(done: sealPhoto, label: '2. Seal photo taken on this phone'),
                  _GateRow(done: driverSigned, label: '3. Driver signed: received sealed cargo'),
                  _GateRow(done: podSigned, label: '4. Warehouse / consignee signed POD'),
                  const SizedBox(height: 8),
                  Text(
                    'Each step stays locked until the signature or photo above it is done. Dispatch will not go In Transit until both dispatcher and driver have signed.',
                    style: TextStyle(fontSize: 12, color: Colors.grey.shade700),
                  ),
                  const SizedBox(height: 16),
                  FilledButton.icon(
                    onPressed: () => _requireGps(() => widget.session.stampGeo(widget.tripId, 'pickup_geo', 'Arrived at pickup')),
                    icon: const Icon(Icons.flag),
                    label: const Text('Stamp pickup GPS'),
                  ),
                  const SizedBox(height: 8),
                  FilledButton.icon(
                    onPressed: canMoveCargo
                        ? () => _requireGps(() => widget.session.stampGeo(widget.tripId, 'delivery_geo', 'Arrived at consignee'))
                        : () => _blocked('Dispatcher and driver must both sign before delivery GPS.'),
                    icon: const Icon(Icons.place),
                    label: const Text('Stamp delivery GPS'),
                  ),
                  const SizedBox(height: 16),
                  const Text('Photos', style: TextStyle(fontWeight: FontWeight.w700)),
                  const SizedBox(height: 8),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: [
                      OutlinedButton(onPressed: () => _photo('seal_photo', 'Seal photo'), child: Text(sealPhoto ? 'Seal ✓' : 'Seal photo *')),
                      OutlinedButton(
                        onPressed: canMoveCargo ? () => _photo('container_photo', 'Container photo') : () => _blocked('Sign dispatch first.'),
                        child: const Text('Container'),
                      ),
                      OutlinedButton(
                        onPressed: canMoveCargo ? () => _photo('parcel_photo', 'Parcel photo') : () => _blocked('Sign dispatch first.'),
                        child: const Text('Parcel'),
                      ),
                    ],
                  ),
                  const SizedBox(height: 20),
                  const Text('Signatures', style: TextStyle(fontWeight: FontWeight.w700)),
                  const SizedBox(height: 8),
                  FilledButton.tonal(
                    onPressed: canSignDispatch
                        ? () => Navigator.push(
                              context,
                              MaterialPageRoute(
                                builder: (_) => SignScreen(
                                  session: widget.session,
                                  tripId: widget.tripId,
                                  tripStatus: status,
                                  kind: 'dispatch_signature',
                                  title: 'Dispatch / hauling signature',
                                ),
                              ),
                            )
                        : () => _blocked(
                              driverSigned
                                  ? 'Driver dispatch is already signed.'
                                  : !sealPhoto
                                      ? 'Take a seal photo first.'
                                      : 'Turn on GPS, then sign.',
                            ),
                    child: Text(driverSigned ? 'Dispatch signed ✓' : 'Sign dispatch (required)'),
                  ),
                  if (driverSigned && !dispatcherSigned)
                    const Padding(
                      padding: EdgeInsets.only(top: 8),
                      child: Text(
                        'Your signature is saved. Waiting for the dispatcher to sign yard release on the web before this trip can go In Transit.',
                        style: TextStyle(fontSize: 12, color: Colors.orange),
                      ),
                    ),
                  const SizedBox(height: 8),
                  FilledButton.tonal(
                    onPressed: canSignPod
                        ? () => Navigator.push(
                              context,
                              MaterialPageRoute(
                                builder: (_) => SignScreen(
                                  session: widget.session,
                                  tripId: widget.tripId,
                                  tripStatus: status,
                                  kind: 'pod_signature',
                                  title: 'Warehouse / consignee POD',
                                  askReceiver: true,
                                ),
                              ),
                            )
                        : () => _blocked(
                              podSigned
                                  ? 'POD is already signed.'
                                  : 'Dispatcher and driver must sign, and the truck must be in transit, before warehouse POD.',
                            ),
                    child: Text(podSigned ? 'POD signed ✓' : 'Sign proof of delivery (required)'),
                  ),
                ],
              ),
            );
          },
        );
      },
    );
  }
}

class _GateRow extends StatelessWidget {
  const _GateRow({required this.done, required this.label});
  final bool done;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: Row(
        children: [
          Icon(done ? Icons.check_circle : Icons.radio_button_unchecked, size: 18, color: done ? Colors.green : Colors.grey),
          const SizedBox(width: 8),
          Expanded(child: Text(label, style: TextStyle(fontWeight: done ? FontWeight.w600 : FontWeight.w400))),
        ],
      ),
    );
  }
}

class SignScreen extends StatefulWidget {
  const SignScreen({
    super.key,
    required this.session,
    required this.tripId,
    required this.tripStatus,
    required this.kind,
    required this.title,
    this.askReceiver = false,
  });

  final DriverSession session;
  final String tripId;
  final String tripStatus;
  final String kind;
  final String title;
  final bool askReceiver;

  @override
  State<SignScreen> createState() => _SignScreenState();
}

class _SignScreenState extends State<SignScreen> {
  final pad = SignatureController(penStrokeWidth: 3, penColor: Colors.black);
  final receiver = TextEditingController();
  final role = TextEditingController(text: 'Warehouse receiving officer');
  bool saving = false;

  @override
  void dispose() {
    pad.dispose();
    receiver.dispose();
    role.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    await widget.session.refreshGps();
    if (!widget.session.gpsOk) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('GPS must stay on to sign.')));
      }
      return;
    }
    if (pad.isEmpty) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Sign on the pad first.')));
      return;
    }
    if (widget.askReceiver && receiver.text.trim().isEmpty) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Enter the receiver’s name.')));
      return;
    }
    setState(() => saving = true);
    try {
      final bytes = await pad.toPngBytes();
      if (bytes == null) return;
      await widget.session.saveSignature(
        tripId: widget.tripId,
        kind: widget.kind,
        pngBytes: bytes,
        tripStatus: widget.tripStatus,
        tripPatch: widget.askReceiver
            ? {
                'receiverName': receiver.text.trim(),
                'receiverRole': role.text.trim(),
                'conditionStatus': 'Good Condition',
              }
            : null,
        note: widget.askReceiver
            ? 'POD signed by ${receiver.text.trim()} at ${DateFormat('yyyy-MM-dd HH:mm').format(DateTime.now())}'
            : 'Driver dispatch signature',
      );
      if (mounted) Navigator.pop(context);
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(error.toString())));
      }
    } finally {
      if (mounted) setState(() => saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(widget.title)),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          GpsBanner(session: widget.session),
          if (widget.askReceiver) ...[
            const SizedBox(height: 12),
            TextField(
              controller: receiver,
              decoration: const InputDecoration(labelText: 'Receiver full name', border: OutlineInputBorder()),
            ),
            const SizedBox(height: 8),
            TextField(
              controller: role,
              decoration: const InputDecoration(labelText: 'Receiver role', border: OutlineInputBorder()),
            ),
          ],
          const SizedBox(height: 12),
          const Text('Hand the phone to the signer. GPS stays on.'),
          const SizedBox(height: 8),
          Container(
            height: 220,
            decoration: BoxDecoration(border: Border.all(color: Colors.black26), color: Colors.white),
            child: Signature(controller: pad, backgroundColor: Colors.white),
          ),
          TextButton(onPressed: pad.clear, child: const Text('Clear pad')),
          FilledButton(
            onPressed: saving ? null : _save,
            child: saving ? const CircularProgressIndicator() : const Text('Save to web office'),
          ),
        ],
      ),
    );
  }
}
