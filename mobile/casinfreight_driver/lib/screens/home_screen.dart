import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter/material.dart';

import '../driver_session.dart';
import '../ui/gps_banner.dart';
import '../ui/status_chip.dart';
import 'trip_screen.dart';

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
                  return Center(
                    child: Text('Could not load trips: ${snap.error}'),
                  );
                }
                if (!snap.hasData) {
                  return const Center(child: CircularProgressIndicator());
                }
                final docs = snap.data!.docs.where((doc) {
                  final status = (doc.data()['status'] ?? '').toString();
                  return status != 'Cancelled' && status != 'Invoiced';
                }).toList();
                if (docs.isEmpty) {
                  return const Center(child: Text('No assigned trips yet.'));
                }
                return ListView.separated(
                  padding: const EdgeInsets.all(16),
                  itemCount: docs.length,
                  separatorBuilder: (_, _) => const SizedBox(height: 10),
                  itemBuilder: (context, i) {
                    final data = docs[i].data();
                    final id = docs[i].id;
                    final status = (data['status'] ?? 'Pending').toString();
                    return Card(
                      child: InkWell(
                        borderRadius: BorderRadius.circular(16),
                        onTap: () {
                          Navigator.of(context).push(
                            MaterialPageRoute(
                              builder: (_) => TripScreen(
                                session: session,
                                tripId: id,
                                initialTrip: data,
                              ),
                            ),
                          );
                        },
                        child: Padding(
                          padding: const EdgeInsets.all(16),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: [
                                  Expanded(
                                    child: Text(
                                      (data['tripNumber'] ?? id).toString(),
                                      style: const TextStyle(
                                        fontSize: 16,
                                        fontWeight: FontWeight.w800,
                                      ),
                                    ),
                                  ),
                                  TripStatusChip(status: status),
                                  const SizedBox(width: 4),
                                  const Icon(Icons.chevron_right),
                                ],
                              ),
                              const SizedBox(height: 10),
                              Row(
                                children: [
                                  const Icon(
                                    Icons.route_outlined,
                                    size: 18,
                                    color: Colors.black54,
                                  ),
                                  const SizedBox(width: 8),
                                  Expanded(
                                    child: Text(
                                      '${data['originZone'] ?? 'Origin'} → ${data['destinationZone'] ?? 'Destination'}',
                                      style: const TextStyle(
                                        color: Colors.black87,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                              if ((data['cargoDescription'] ?? '')
                                  .toString()
                                  .isNotEmpty) ...[
                                const SizedBox(height: 6),
                                Text(
                                  data['cargoDescription'].toString(),
                                  style: const TextStyle(
                                    color: Colors.black54,
                                    fontSize: 13,
                                  ),
                                ),
                              ],
                            ],
                          ),
                        ),
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
