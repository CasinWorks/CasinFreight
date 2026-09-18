import 'package:firebase_core/firebase_core.dart' show FirebaseOptions;
import 'package:flutter/foundation.dart'
    show TargetPlatform, defaultTargetPlatform, kIsWeb;

/// Same Firebase project as the CasinFreight web console.
///
/// iOS must use an `:ios:` GOOGLE_APP_ID. Passing the web app ID crashes native
/// FIRApp on launch (TestFlight SIGABRT in `+[FIRApp addAppToAppDictionary:]`).
class DefaultFirebaseOptions {
  static FirebaseOptions get currentPlatform {
    if (kIsWeb) {
      return web;
    }
    switch (defaultTargetPlatform) {
      case TargetPlatform.iOS:
        return ios;
      case TargetPlatform.android:
        return android;
      default:
        return web;
    }
  }

  static const FirebaseOptions web = FirebaseOptions(
    apiKey: String.fromEnvironment(
      'FIREBASE_API_KEY',
      defaultValue: 'AIzaSyAfJU53Ahy00BCX0F2HJaxIJ0cX7ZKUzn8',
    ),
    appId: String.fromEnvironment(
      'FIREBASE_APP_ID',
      defaultValue: '1:274237796581:web:2b7471f8fef07c57af640c',
    ),
    messagingSenderId: String.fromEnvironment(
      'FIREBASE_MESSAGING_SENDER_ID',
      defaultValue: '274237796581',
    ),
    projectId: String.fromEnvironment(
      'FIREBASE_PROJECT_ID',
      defaultValue: 'casinfreight',
    ),
    authDomain: String.fromEnvironment(
      'FIREBASE_AUTH_DOMAIN',
      defaultValue: 'casinfreight.firebaseapp.com',
    ),
    storageBucket: String.fromEnvironment(
      'FIREBASE_STORAGE_BUCKET',
      defaultValue: 'casinfreight.firebasestorage.app',
    ),
  );

  /// iOS app for bundle `com.casinfreight.casinfreightDriver`.
  /// Prefer replacing [appId] with the value from Firebase Console → Project
  /// settings → Your apps → iOS (GoogleService-Info.plist GOOGLE_APP_ID) once
  /// that app is registered. Format must stay `1:<project>:ios:<hex>`.
  static const FirebaseOptions ios = FirebaseOptions(
    apiKey: String.fromEnvironment(
      'FIREBASE_IOS_API_KEY',
      defaultValue: 'AIzaSyAfJU53Ahy00BCX0F2HJaxIJ0cX7ZKUzn8',
    ),
    appId: String.fromEnvironment(
      'FIREBASE_IOS_APP_ID',
      defaultValue: '1:274237796581:ios:2b7471f8fef07c57af640c',
    ),
    messagingSenderId: String.fromEnvironment(
      'FIREBASE_MESSAGING_SENDER_ID',
      defaultValue: '274237796581',
    ),
    projectId: String.fromEnvironment(
      'FIREBASE_PROJECT_ID',
      defaultValue: 'casinfreight',
    ),
    authDomain: String.fromEnvironment(
      'FIREBASE_AUTH_DOMAIN',
      defaultValue: 'casinfreight.firebaseapp.com',
    ),
    storageBucket: String.fromEnvironment(
      'FIREBASE_STORAGE_BUCKET',
      defaultValue: 'casinfreight.firebasestorage.app',
    ),
    iosBundleId: 'com.casinfreight.casinfreightDriver',
  );

  static const FirebaseOptions android = FirebaseOptions(
    apiKey: String.fromEnvironment(
      'FIREBASE_ANDROID_API_KEY',
      defaultValue: 'AIzaSyAfJU53Ahy00BCX0F2HJaxIJ0cX7ZKUzn8',
    ),
    appId: String.fromEnvironment(
      'FIREBASE_ANDROID_APP_ID',
      defaultValue: '1:274237796581:android:2b7471f8fef07c57af640c',
    ),
    messagingSenderId: String.fromEnvironment(
      'FIREBASE_MESSAGING_SENDER_ID',
      defaultValue: '274237796581',
    ),
    projectId: String.fromEnvironment(
      'FIREBASE_PROJECT_ID',
      defaultValue: 'casinfreight',
    ),
    storageBucket: String.fromEnvironment(
      'FIREBASE_STORAGE_BUCKET',
      defaultValue: 'casinfreight.firebasestorage.app',
    ),
  );
}
