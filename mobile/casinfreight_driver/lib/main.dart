import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/material.dart';

import 'driver_session.dart';
import 'firebase_options.dart';
import 'screens/home_screen.dart';
import 'screens/login_screen.dart';
import 'ui/app_theme.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  if (Firebase.apps.isEmpty) {
    await Firebase.initializeApp(
      options: DefaultFirebaseOptions.currentPlatform,
    );
  }
  final session = DriverSession();
  await session.bootstrap();
  runApp(CasinFreightDriverApp(session: session));
}

class CasinFreightDriverApp extends StatelessWidget {
  const CasinFreightDriverApp({super.key, required this.session});

  final DriverSession session;

  @override
  Widget build(BuildContext context) {
    return ListenableBuilder(
      listenable: session,
      builder: (context, _) {
        return MaterialApp(
          title: 'CasinFreight',
          debugShowCheckedModeBanner: false,
          theme: buildAppTheme(),
          home: !session.signedIn
              ? LoginScreen(session: session)
              : HomeScreen(session: session),
        );
      },
    );
  }
}
