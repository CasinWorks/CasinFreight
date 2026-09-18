import 'package:flutter/material.dart';

import '../driver_session.dart';
import '../ui/app_theme.dart';

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
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 440),
            child: ListView(
              padding: const EdgeInsets.all(24),
              shrinkWrap: true,
              children: [
                Center(
                  child: Image.asset(
                    'assets/CASINFREIGHT.png',
                    width: 128,
                    height: 128,
                    fit: BoxFit.contain,
                  ),
                ),
                const SizedBox(height: 20),
                const Text(
                  'CasinFreight',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 30,
                    fontWeight: FontWeight.w900,
                    color: AppColors.navy,
                  ),
                ),
                const Text(
                  'Philippine trucking operations, on the road',
                  textAlign: TextAlign.center,
                  style: TextStyle(color: AppColors.slate),
                ),
                const SizedBox(height: 32),
                TextField(
                  controller: email,
                  keyboardType: TextInputType.emailAddress,
                  autocorrect: false,
                  decoration: const InputDecoration(
                    labelText: 'Work email',
                    prefixIcon: Icon(Icons.mail_outline),
                  ),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: password,
                  obscureText: true,
                  decoration: const InputDecoration(
                    labelText: 'Password',
                    prefixIcon: Icon(Icons.lock_outline),
                  ),
                ),
                if (session.error != null) ...[
                  const SizedBox(height: 12),
                  Text(
                    session.error!,
                    style: const TextStyle(color: Colors.red, fontSize: 13),
                  ),
                ],
                const SizedBox(height: 20),
                FilledButton(
                  onPressed: session.busy
                      ? null
                      : () async {
                          final ok = await session.login(
                            email.text,
                            password.text,
                          );
                          if (!ok && context.mounted) {
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(
                                content: Text(
                                  session.error ?? 'Could not sign in',
                                ),
                              ),
                            );
                          }
                        },
                  child: session.busy
                      ? const SizedBox(
                          height: 18,
                          width: 18,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Text('Sign in'),
                ),
                const SizedBox(height: 16),
                const Text(
                  'Drivers: ask dispatch to invite you under Company & Team, then use the same email saved on Driver Roster.',
                  style: TextStyle(fontSize: 12, color: Colors.black54),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
