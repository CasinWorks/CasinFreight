import 'package:flutter/material.dart';

import '../driver_session.dart';

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
        leading: Icon(
          ok ? Icons.gps_fixed : Icons.gps_off,
          color: ok ? Colors.green : Colors.red,
        ),
        title: Text(
          ok
              ? 'GPS on · dispatch can see this truck'
              : session.gpsMocked
              ? 'Fake GPS detected. Turn off mock location.'
              : 'GPS is off. Turn on Location. Photos and signatures are locked.',
          style: TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.w600,
            color: ok ? Colors.green.shade900 : Colors.red.shade900,
          ),
        ),
        trailing: TextButton(
          onPressed: session.refreshGps,
          child: const Text('Check'),
        ),
      ),
    );
  }
}
