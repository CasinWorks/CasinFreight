import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'dart:ui' as ui;

import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:firebase_storage/firebase_storage.dart';
import 'package:flutter/foundation.dart';
import 'package:geolocator/geolocator.dart';
import 'package:image_picker/image_picker.dart';

class DriverProfile {
  DriverProfile({
    required this.id,
    required this.companyId,
    required this.name,
    required this.email,
    this.role = 'Driver',
    this.kind,
    this.clientId,
    this.rosterId,
  });

  final String id;
  final String companyId;
  final String name;
  final String email;
  final String role;
  final String? kind;
  final String? clientId;
  final String? rosterId;

  bool get isClientPortal =>
      kind?.toLowerCase() == 'client_portal' || role.toLowerCase() == 'client';
}

class DriverSession extends ChangeNotifier {
  final _auth = FirebaseAuth.instance;
  final _db = FirebaseFirestore.instance;
  final _storage = FirebaseStorage.instance;

  DriverProfile? profile;
  String? error;
  bool busy = false;
  bool gpsEnabled = true;
  bool gpsMocked = false;
  bool _lastGpsOk = true;
  Position? lastFix;
  StreamSubscription<Position>? _positionSub;
  Timer? _gpsWatch;
  String? trackingTripId;
  DateTime? _lastPingAt;

  bool get signedIn => _auth.currentUser != null && profile != null;
  bool get isClientPortal => profile?.isClientPortal ?? false;
  bool get gpsOk => gpsEnabled && !gpsMocked;

  Future<void> bootstrap() async {
    final user = _auth.currentUser;
    if (user == null) return;
    await _loadProfile(user);
    if (!isClientPortal) await _startGpsWatch();
  }

  Future<bool> login(String email, String password) async {
    busy = true;
    error = null;
    notifyListeners();
    try {
      final cred = await _auth.signInWithEmailAndPassword(
        email: email.trim(),
        password: password,
      );
      await _loadProfile(cred.user!);
      if (!isClientPortal) await _startGpsWatch();
      return profile != null;
    } on FirebaseAuthException catch (e) {
      error = e.message ?? 'Sign-in failed.';
      return false;
    } catch (e) {
      error = e.toString();
      return false;
    } finally {
      busy = false;
      notifyListeners();
    }
  }

  Future<void> logout() async {
    await stopTracking();
    _gpsWatch?.cancel();
    _gpsWatch = null;
    await _auth.signOut();
    profile = null;
    notifyListeners();
  }

  Future<void> _loadProfile(User user) async {
    final userSnap = await _db.collection('users').doc(user.uid).get();
    if (!userSnap.exists) {
      error =
          'This login is not on a CasinFreight company. Ask the owner to invite you under Company & Team as Driver.';
      profile = null;
      notifyListeners();
      return;
    }
    final data = userSnap.data()!;
    final companyId = (data['companyId'] ?? '') as String;
    final email = (user.email ?? data['email'] ?? '').toString().toLowerCase();
    final role = (data['role'] ?? 'Driver').toString();
    final kind = data['kind']?.toString();
    final isClient =
        kind?.toLowerCase() == 'client_portal' ||
        role.toLowerCase() == 'client';

    String? rosterId;
    if (!isClient) {
      final drivers = await _db
          .collection('companies')
          .doc(companyId)
          .collection('drivers')
          .get();
      for (final doc in drivers.docs) {
        final row = doc.data();
        final rowEmail = (row['email'] ?? '').toString().toLowerCase();
        final rowUid = (row['userId'] ?? '').toString();
        if (rowEmail == email || rowUid == user.uid) {
          rosterId = doc.id;
          break;
        }
      }
    }

    profile = DriverProfile(
      id: user.uid,
      companyId: companyId,
      name: (data['name'] ?? user.email ?? 'Driver').toString(),
      email: email,
      role: role,
      kind: kind,
      clientId: data['clientId']?.toString(),
      rosterId: rosterId,
    );
    if (profile!.isClientPortal) {
      error =
          'Warehouse portal logins are discontinued. e-POD is signed on the driver’s phone at delivery. Ask the fleet office for a Driver invite if you drive for them.';
      profile = null;
      await _auth.signOut();
      notifyListeners();
      return;
    }
    notifyListeners();
  }

  DocumentReference<Map<String, dynamic>> get _companyDoc =>
      _db.collection('companies').doc(profile!.companyId);

  Stream<DocumentSnapshot<Map<String, dynamic>>> tripStream(String tripId) {
    return _companyDoc.collection('trips').doc(tripId).snapshots();
  }

  Stream<QuerySnapshot<Map<String, dynamic>>> fieldEventsStream(String tripId) {
    final query = _companyDoc
        .collection('fieldEvents')
        .where('tripId', isEqualTo: tripId);
    final clientId = profile?.clientId;
    if (isClientPortal && clientId != null && clientId.isNotEmpty) {
      return query.where('clientId', isEqualTo: clientId).snapshots();
    }
    return query.snapshots();
  }

  Stream<QuerySnapshot<Map<String, dynamic>>> tripsStream() {
    final rosterId = profile?.rosterId;
    final query = _companyDoc.collection('trips');
    if (rosterId == null || rosterId.isEmpty) {
      return query.where('driverId', isEqualTo: '__none__').snapshots();
    }
    return query.where('driverId', isEqualTo: rosterId).snapshots();
  }

  Stream<QuerySnapshot<Map<String, dynamic>>> clientTripsStream() {
    final clientId = profile?.clientId;
    final query = _companyDoc.collection('trips');
    if (clientId == null || clientId.isEmpty) {
      return query.where('clientId', isEqualTo: '__none__').snapshots();
    }
    return query.where('clientId', isEqualTo: clientId).snapshots();
  }

  Stream<DocumentSnapshot<Map<String, dynamic>>> liveTrackingStream(String tripId) {
    return _companyDoc.collection('liveTracking').doc(tripId).snapshots();
  }

  Future<void> _startGpsWatch() async {
    _gpsWatch?.cancel();
    _gpsWatch = Timer.periodic(const Duration(seconds: 4), (_) => refreshGps());
    await refreshGps();
  }

  Future<void> refreshGps() async {
    final service = await Geolocator.isLocationServiceEnabled();
    var permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
    }
    gpsEnabled =
        service &&
        permission != LocationPermission.denied &&
        permission != LocationPermission.deniedForever;
    if (!gpsEnabled) {
      gpsMocked = false;
      await _pushPing(force: true);
      notifyListeners();
      return;
    }
    try {
      lastFix = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(
          accuracy: LocationAccuracy.high,
        ),
      );
      gpsMocked = lastFix?.isMocked ?? false;
    } catch (_) {
      gpsEnabled = false;
      await _pushPing(force: true);
      notifyListeners();
      return;
    }
    await _pushPing();
    notifyListeners();
  }

  Future<void> startTracking(String tripId) async {
    trackingTripId = tripId;
    await refreshGps();
    await _positionSub?.cancel();
    _positionSub =
        Geolocator.getPositionStream(
          locationSettings: const LocationSettings(
            accuracy: LocationAccuracy.high,
            distanceFilter: 40,
          ),
        ).listen((pos) {
          lastFix = pos;
          gpsMocked = pos.isMocked;
          gpsEnabled = true;
          notifyListeners();
          _pushPing();
        });
    notifyListeners();
  }

  Future<void> stopTracking() async {
    await _positionSub?.cancel();
    _positionSub = null;
    trackingTripId = null;
    notifyListeners();
  }

  Future<void> _assertAssignedTrip(String tripId) async {
    final rosterId = profile?.rosterId;
    if (rosterId == null || rosterId.isEmpty) {
      throw StateError('This login is not on the driver roster.');
    }
    final snap = await _companyDoc.collection('trips').doc(tripId).get();
    final driverId = (snap.data()?['driverId'] ?? '').toString();
    if (driverId != rosterId) {
      throw StateError('This trip is not assigned to you.');
    }
  }

  Future<void> _pushPing({bool force = false}) async {
    final p = profile;
    final tripId = trackingTripId;
    if (p == null || tripId == null) return;
    final now = DateTime.now();
    if (!force &&
        _lastPingAt != null &&
        now.difference(_lastPingAt!) < const Duration(seconds: 8)) {
      return;
    }
    _lastPingAt = now;
    final pos = lastFix;
    await _assertAssignedTrip(tripId);
    await _companyDoc.collection('liveTracking').doc(tripId).set({
      'id': tripId,
      'tripId': tripId,
      'companyId': p.companyId,
      'driverId': p.rosterId ?? p.id,
      if (pos != null) 'lat': pos.latitude,
      if (pos != null) 'lng': pos.longitude,
      if (pos != null) 'heading': pos.heading,
      if (pos != null) 'speedKmh': pos.speed * 3.6,
      if (pos != null) 'accuracyM': pos.accuracy,
      'updatedAt': DateTime.now().toUtc().toIso8601String(),
      'gpsEnabled': gpsEnabled,
      'isMocked': gpsMocked,
      if (!gpsEnabled)
        'gpsDisabledAt': DateTime.now().toUtc().toIso8601String(),
    }, SetOptions(merge: true));
    if (!gpsEnabled || gpsMocked) {
      if (_lastGpsOk) {
        await addFieldEvent(
          tripId: tripId,
          kind: gpsMocked ? 'gps_mocked' : 'gps_disabled',
          note: gpsMocked
              ? 'Mock location detected on the driver phone.'
              : 'Location services were turned off on the driver phone.',
        );
      }
    }
    _lastGpsOk = gpsEnabled && !gpsMocked;
  }

  Future<void> _assertClientTrip(String tripId) async {
    final clientId = profile?.clientId;
    if (clientId == null || clientId.isEmpty) {
      throw StateError('This login is not linked to a client account.');
    }
    final snap = await _companyDoc.collection('trips').doc(tripId).get();
    final rowClient = (snap.data()?['clientId'] ?? '').toString();
    if (rowClient != clientId) {
      throw StateError('This shipment is not for your company.');
    }
  }

  Future<void> _assertWorkspaceActive() async {
    final snap = await _companyDoc.get();
    final sub = snap.data()?['subscription'];
    if (sub is! Map) return;
    final planId = (sub['plan_id'] ?? '').toString();
    if (planId != 'plan_free') return;
    final endRaw = (sub['current_period_end'] ?? sub['created_at'] ?? '')
        .toString();
    final end = DateTime.tryParse(endRaw);
    if (end != null && end.isBefore(DateTime.now())) {
      throw Exception(
        'This company\'s 1-month Free trial has ended. Ask the owner to subscribe to Founding.',
      );
    }
  }

  Future<void> addFieldEvent({
    required String tripId,
    required String kind,
    String? note,
    String? photoUrl,
    String? signatureDataUrl,
  }) async {
    final p = profile;
    if (p == null) return;
    if (isClientPortal) {
      await _assertClientTrip(tripId);
    } else {
      await _assertAssignedTrip(tripId);
    }
    final pos = lastFix;
    final id = 'fe-${DateTime.now().millisecondsSinceEpoch}';
    String? clientId = p.clientId;
    if (clientId == null || clientId.isEmpty) {
      final tripSnap = await _companyDoc.collection('trips').doc(tripId).get();
      final fromTrip = (tripSnap.data()?['clientId'] ?? '').toString();
      if (fromTrip.isNotEmpty) clientId = fromTrip;
    }
    await _companyDoc.collection('fieldEvents').doc(id).set({
      'id': id,
      'companyId': p.companyId,
      'tripId': tripId,
      if (clientId != null && clientId.isNotEmpty) 'clientId': clientId,
      'kind': kind,
      'createdAt': DateTime.now().toUtc().toIso8601String(),
      'actorUid': p.id,
      'actorName': p.name,
      'lat': pos?.latitude,
      'lng': pos?.longitude,
      'accuracyM': pos?.accuracy,
      'photoUrl': photoUrl,
      'signatureDataUrl': signatureDataUrl,
      'note': note,
      'gpsEnabled': gpsEnabled,
      'isMocked': gpsMocked,
    });
  }

  Future<String> uploadPhoto(String tripId, File file) async {
    final p = profile!;
    final companySnap = await _companyDoc.get();
    final companyData = companySnap.data() ?? {};
    final used = (companyData['storageUsedBytes'] is num)
        ? (companyData['storageUsedBytes'] as num).toInt()
        : 0;
    final size = await file.length();
    final cap = _storageLimitBytes(companyData);
    if (used + size > cap) {
      throw StateError(
        'Photo storage is full for this plan. Ask the owner to subscribe (5 GB) or buy extra GB.',
      );
    }
    final path =
        'companies/${p.companyId}/field-events/$tripId/${DateTime.now().millisecondsSinceEpoch}.jpg';
    final ref = _storage.ref(path);
    await ref.putFile(file, SettableMetadata(contentType: 'image/jpeg'));
    try {
      await _companyDoc.update({
        'storageUsedBytes': FieldValue.increment(size),
      });
    } catch (_) {
      // Photo is already stored; quota still blocks later uploads once usage is readable.
    }
    return ref.getDownloadURL();
  }

  int _storageLimitBytes(Map<String, dynamic> companyData) {
    const bytesPerGb = 1024 * 1024 * 1024;
    final sub = companyData['subscription'];
    var planId = 'plan_free';
    var addon = 0;
    if (sub is Map) {
      planId = (sub['plan_id'] ?? 'plan_free').toString();
      final rawAddon = sub['storage_addon_gb'];
      if (rawAddon is num) addon = rawAddon.toInt();
      if (addon < 0) addon = 0;
    }
    final base = (planId == 'plan_founding' || planId == 'plan_promo') ? 5 : 2;
    return (base + addon) * bytesPerGb;
  }

  Future<XFile?> takePhoto() {
    return ImagePicker().pickImage(
      source: ImageSource.camera,
      imageQuality: 62,
      maxWidth: 1280,
    );
  }

  Future<Uint8List> _shrinkSignaturePng(Uint8List pngBytes) async {
    const maxWidth = 900;
    final codec = await ui.instantiateImageCodec(
      pngBytes,
      targetWidth: maxWidth,
    );
    final frame = await codec.getNextFrame();
    final data = await frame.image.toByteData(format: ui.ImageByteFormat.png);
    frame.image.dispose();
    if (data == null) return pngBytes;
    final shrunk = data.buffer.asUint8List();
    return shrunk.length < pngBytes.length ? shrunk : pngBytes;
  }

  Future<void> saveSignature({
    required String tripId,
    required String kind,
    required Uint8List pngBytes,
    required String tripStatus,
    Map<String, dynamic>? tripPatch,
    String? note,
  }) async {
    if (isClientPortal) {
      await saveClientPod(
        tripId: tripId,
        pngBytes: pngBytes,
        tripPatch: tripPatch,
        note: note,
      );
      return;
    }
    await _assertAssignedTrip(tripId);
    final current =
        (await _companyDoc.collection('trips').doc(tripId).get()).data() ?? {};
    final status = (current['status'] ?? tripStatus).toString();
    final dispatcherSigned = _hasInk(current['dispatcherSignoff']);
    final driverSigned = _hasInk(current['driverSignoff']);

    if (kind == 'pod_signature') {
      if (status != 'Inbound') {
        throw StateError(
          'Mark I have arrived (Inbound) before the warehouse signs e-POD on this phone.',
        );
      }
      if (!driverSigned) {
        throw StateError(
          'Sign dispatch first. The driver must accept the cargo before warehouse POD.',
        );
      }
    }

    final compact = await _shrinkSignaturePng(pngBytes);
    final dataUrl = 'data:image/png;base64,${base64Encode(compact)}';
    await addFieldEvent(
      tripId: tripId,
      kind: kind,
      signatureDataUrl: dataUrl,
      note: note,
    );
    final signedAt = DateTime.now().toUtc().toIso8601String();
    final signoff = {
      'name': profile!.name,
      'role': 'Driver',
      'signedAt': signedAt,
      'signatureDataUrl': dataUrl,
    };
    final patch = <String, dynamic>{
      ...?tripPatch,
      if (kind == 'dispatch_signature') 'driverSignoff': signoff,
      if (kind == 'pod_signature')
        'pod': {
          'id': 'pod-$tripId',
          'tripId': tripId,
          'receiverName': tripPatch?['receiverName'] ?? 'Consignee',
          'receiverRole': tripPatch?['receiverRole'] ?? 'Receiving officer',
          'signedAt': signedAt,
          'signatureDataUrl': dataUrl,
          'photoUrls': tripPatch?['photoUrls'] ?? [],
          'conditionStatus': tripPatch?['conditionStatus'] ?? 'Good Condition',
          'collectedByDriver': true,
        },
    };
    if (kind == 'dispatch_signature' && dispatcherSigned) {
      patch['status'] = 'In Transit';
    }
    if (kind == 'pod_signature') {
      final timeline = <Map<String, dynamic>>[];
      final rawTimeline = current['timeline'];
      if (rawTimeline is List) {
        for (final item in rawTimeline) {
          if (item is Map) {
            timeline.add(Map<String, dynamic>.from(item));
          }
        }
      }
      final receiverName = (tripPatch?['receiverName'] ?? 'Consignee').toString();
      final receiverRole =
          (tripPatch?['receiverRole'] ?? 'Receiving officer').toString();
      timeline.add({
        'id': 'tl-$signedAt',
        'tripId': tripId,
        'status': 'Delivered',
        'timestamp': signedAt,
        'note':
            'e-POD signed on driver phone by $receiverName ($receiverRole).',
        'updatedBy': '${profile!.name} (Driver phone)',
      });
      patch['status'] = 'Delivered';
      patch['actualDelivery'] = signedAt;
      patch['timeline'] = timeline;
      // tripPatch may carry receiver fields that are not trip columns
      patch.remove('receiverName');
      patch.remove('receiverRole');
      patch.remove('conditionStatus');
      patch.remove('photoUrls');
    }
    await _assertWorkspaceActive();
    await _companyDoc
        .collection('trips')
        .doc(tripId)
        .set(patch, SetOptions(merge: true));
    await addFieldEvent(
      tripId: tripId,
      kind: kind == 'pod_signature' ? 'delivery_geo' : 'pickup_geo',
      note: kind == 'pod_signature'
          ? 'GPS stamp at consignee (warehouse signed on driver phone)'
          : 'GPS stamp at origin',
    );
  }

  Future<void> saveClientPod({
    required String tripId,
    required Uint8List pngBytes,
    Map<String, dynamic>? tripPatch,
    String? note,
  }) async {
    await _assertClientTrip(tripId);
    await refreshGps();
    final snap = await _companyDoc.collection('trips').doc(tripId).get();
    final current = snap.data() ?? {};
    final status = (current['status'] ?? '').toString();
    if (status != 'Inbound') {
      throw StateError(
        'Waiting for the driver to tap “I have arrived” (Inbound) before you can sign e-POD. Current status: $status',
      );
    }
    final compact = await _shrinkSignaturePng(pngBytes);
    final dataUrl = 'data:image/png;base64,${base64Encode(compact)}';
    final signedAt = DateTime.now().toUtc().toIso8601String();
    await addFieldEvent(
      tripId: tripId,
      kind: 'pod_signature',
      signatureDataUrl: dataUrl,
      note: note ?? 'POD signed by client portal',
    );
    final timeline = <Map<String, dynamic>>[];
    final rawTimeline = current['timeline'];
    if (rawTimeline is List) {
      for (final item in rawTimeline) {
        if (item is Map) {
          timeline.add(Map<String, dynamic>.from(item));
        }
      }
    }
    timeline.add({
      'id': 'tl-$signedAt',
      'tripId': tripId,
      'status': 'Delivered',
      'timestamp': signedAt,
      'note':
          'e-POD signed by warehouse portal (${tripPatch?['receiverName'] ?? profile!.name}).',
      'updatedBy': '${profile!.name} (Client portal)',
    });
    await _assertWorkspaceActive();
    await _companyDoc.collection('trips').doc(tripId).set({
      'pod': {
        'id': 'pod-$tripId',
        'tripId': tripId,
        'receiverName': tripPatch?['receiverName'] ?? profile!.name,
        'receiverRole': tripPatch?['receiverRole'] ?? 'Receiving officer',
        'signedAt': signedAt,
        'signatureDataUrl': dataUrl,
        'photoUrls': tripPatch?['photoUrls'] ?? [],
        'conditionStatus': tripPatch?['conditionStatus'] ?? 'Good Condition',
      },
      'status': 'Delivered',
      'actualDelivery': signedAt,
      'timeline': timeline,
    }, SetOptions(merge: true));
    await addFieldEvent(
      tripId: tripId,
      kind: 'delivery_geo',
      note: 'GPS stamp at consignee (client portal)',
    );
  }

  static bool _hasInk(dynamic signoff) {
    if (signoff is! Map) return false;
    final url = signoff['signatureDataUrl']?.toString() ?? '';
    return url.startsWith('data:image') && url.length > 120;
  }

  Future<void> stampGeo(String tripId, String kind, String note) async {
    await _assertAssignedTrip(tripId);
    await refreshGps();
    if (!gpsOk) {
      throw StateError('Turn on GPS before stamping this location.');
    }
    await addFieldEvent(tripId: tripId, kind: kind, note: note);
    await _appendTripTimeline(
      tripId: tripId,
      status: null,
      note: note,
      location: lastFix == null
          ? null
          : '${lastFix!.latitude.toStringAsFixed(5)}, ${lastFix!.longitude.toStringAsFixed(5)}',
    );
  }

  Future<void> _appendTripTimeline({
    required String tripId,
    required String? status,
    required String note,
    String? location,
  }) async {
    final snap = await _companyDoc.collection('trips').doc(tripId).get();
    final current = snap.data() ?? {};
    final when = DateTime.now().toUtc().toIso8601String();
    final timeline = <Map<String, dynamic>>[];
    final rawTimeline = current['timeline'];
    if (rawTimeline is List) {
      for (final item in rawTimeline) {
        if (item is Map) {
          timeline.add(Map<String, dynamic>.from(item));
        }
      }
    }
    timeline.add({
      'id': 'tl-$when',
      'tripId': tripId,
      'status': status ?? (current['status'] ?? 'Pending').toString(),
      'timestamp': when,
      'note': note,
      'updatedBy': '${profile!.name} (Driver)',
      if (location != null && location.isNotEmpty) 'location': location,
    });
    await _companyDoc.collection('trips').doc(tripId).set({
      'timeline': timeline,
    }, SetOptions(merge: true));
  }

  /// Driver arrives at warehouse / consignee — unlocks warehouse e-POD on this phone.
  Future<void> markArrivedAtConsignee(String tripId) async {
    await _assertAssignedTrip(tripId);
    await refreshGps();
    if (!gpsOk) {
      throw StateError('Turn on GPS before tapping I have arrived.');
    }
    final snap = await _companyDoc.collection('trips').doc(tripId).get();
    final current = snap.data() ?? {};
    final status = (current['status'] ?? '').toString();
    if (status == 'Inbound') {
      await addFieldEvent(
        tripId: tripId,
        kind: 'delivery_geo',
        note: 'Arrived at consignee (Inbound confirmed again)',
      );
      return;
    }
    if (status != 'In Transit') {
      throw StateError(
        'Trip must be In Transit before you can mark arrival. Current status: $status',
      );
    }
    final when = DateTime.now().toUtc().toIso8601String();
    final timeline = <Map<String, dynamic>>[];
    final rawTimeline = current['timeline'];
    if (rawTimeline is List) {
      for (final item in rawTimeline) {
        if (item is Map) {
          timeline.add(Map<String, dynamic>.from(item));
        }
      }
    }
    timeline.add({
      'id': 'tl-$when',
      'tripId': tripId,
      'status': 'Inbound',
      'timestamp': when,
      'note':
          'Driver tapped I have arrived at the warehouse / consignee gate.',
      'updatedBy': '${profile!.name} (Driver)',
      if (lastFix != null)
        'location':
            '${lastFix!.latitude.toStringAsFixed(5)}, ${lastFix!.longitude.toStringAsFixed(5)}',
    });
    await _assertWorkspaceActive();
    await _companyDoc.collection('trips').doc(tripId).set({
      'status': 'Inbound',
      'timeline': timeline,
    }, SetOptions(merge: true));
    await addFieldEvent(
      tripId: tripId,
      kind: 'delivery_geo',
      note: 'Driver arrived at consignee — status Inbound',
    );
  }
}
