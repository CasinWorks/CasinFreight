import 'package:firebase_core/firebase_core.dart';

/// Same Firebase project as the CasinFreight web console.
/// Add an Android app in Firebase with package `com.casinfreight.casinfreight_driver`.
class DefaultFirebaseOptions {
  static const FirebaseOptions currentPlatform = FirebaseOptions(
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
}
