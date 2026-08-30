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
    this.rosterId,
  });

  final String id;
  final String companyId;
  final String name;
  final String email;
  final String role;
  final String? rosterId;
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
  bool get gpsOk => gpsEnabled && !gpsMocked;

  Future<void> bootstrap() async {
    final user = _auth.currentUser;
    if (user == null) return;
    await _loadProfile(user);
    await _startGpsWatch();
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
      await _startGpsWatch();
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
      error = 'This login is not on a CasinFreight company. Ask the owner to invite you under Company & Team as Driver.';
      profile = null;
      notifyListeners();
      return;
    }
    final data = userSnap.data()!;
    final companyId = (data['companyId'] ?? '') as String;
    final email = (user.email ?? data['email'] ?? '').toString().toLowerCase();

    String? rosterId;
    final drivers = await _db.collection('companies').doc(companyId).collection('drivers').get();
    for (final doc in drivers.docs) {
      final row = doc.data();
      final rowEmail = (row['email'] ?? '').toString().toLowerCase();
      final rowUid = (row['userId'] ?? '').toString();
      if (rowEmail == email || rowUid == user.uid) {
        rosterId = doc.id;
        break;
      }
    }

    profile = DriverProfile(
      id: user.uid,
      companyId: companyId,
      name: (data['name'] ?? user.email ?? 'Driver').toString(),
      email: email,
      role: (data['role'] ?? 'Driver').toString(),
      rosterId: rosterId,
    );
    notifyListeners();
  }

  DocumentReference<Map<String, dynamic>> get _companyDoc =>
      _db.collection('companies').doc(profile!.companyId);

  Stream<DocumentSnapshot<Map<String, dynamic>>> tripStream(String tripId) {
    return _companyDoc.collection('trips').doc(tripId).snapshots();
  }

  Stream<QuerySnapshot<Map<String, dynamic>>> fieldEventsStream(String tripId) {
    return _companyDoc.collection('fieldEvents').where('tripId', isEqualTo: tripId).snapshots();
  }

  Stream<QuerySnapshot<Map<String, dynamic>>> tripsStream() {
    final rosterId = profile?.rosterId;
    final query = _companyDoc.collection('trips');
    if (rosterId == null || rosterId.isEmpty) {
      return query.where('driverId', isEqualTo: '__none__').snapshots();
    }
    return query.where('driverId', isEqualTo: rosterId).snapshots();
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
    gpsEnabled = service &&
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
        locationSettings: const LocationSettings(accuracy: LocationAccuracy.high),
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
    _positionSub = Geolocator.getPositionStream(
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
      if (!gpsEnabled) 'gpsDisabledAt': DateTime.now().toUtc().toIso8601String(),
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

  Future<void> _assertWorkspaceActive() async {
    final snap = await _companyDoc.get();
    final sub = snap.data()?['subscription'];
    if (sub is! Map) return;
    final planId = (sub['plan_id'] ?? '').toString();
    if (planId != 'plan_free') return;
    final endRaw = (sub['current_period_end'] ?? sub['created_at'] ?? '').toString();
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
    await _assertAssignedTrip(tripId);
    final pos = lastFix;
    final id = 'fe-${DateTime.now().millisecondsSinceEpoch}';
    await _companyDoc.collection('fieldEvents').doc(id).set({
      'id': id,
      'companyId': p.companyId,
      'tripId': tripId,
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
    final codec = await ui.instantiateImageCodec(pngBytes, targetWidth: maxWidth);
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
    await _assertAssignedTrip(tripId);
    final current = (await _companyDoc.collection('trips').doc(tripId).get()).data() ?? {};
    final dispatcherSigned = _hasInk(current['dispatcherSignoff']);
    final driverSigned = _hasInk(current['driverSignoff']);

    if (kind == 'pod_signature' && !driverSigned) {
      throw StateError('Sign dispatch first. The driver must accept the cargo before warehouse POD.');
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
        },
    };
    if (kind == 'dispatch_signature' && dispatcherSigned) {
      patch['status'] = 'In Transit';
    }
    if (kind == 'pod_signature') {
      patch['status'] = 'Delivered';
      patch['actualDelivery'] = signedAt;
    }
    await _assertWorkspaceActive();
    await _companyDoc.collection('trips').doc(tripId).set(patch, SetOptions(merge: true));
    await addFieldEvent(
      tripId: tripId,
      kind: kind == 'pod_signature' ? 'delivery_geo' : 'pickup_geo',
      note: kind == 'pod_signature' ? 'GPS stamp at consignee' : 'GPS stamp at origin',
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
  }
}
