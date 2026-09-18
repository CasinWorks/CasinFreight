import 'package:flutter/material.dart';

class TripNextStep {
  const TripNextStep({
    required this.title,
    required this.detail,
    required this.icon,
    this.done = false,
  });

  final String title;
  final String detail;
  final IconData icon;
  final bool done;
}

bool hasSignatureInk(dynamic signoff) {
  if (signoff is! Map) return false;
  final url = signoff['signatureDataUrl']?.toString() ?? '';
  return url.startsWith('data:image') && url.length > 120;
}

TripNextStep nextStepForTrip({
  required Map<String, dynamic> trip,
  required Set<String> eventKinds,
}) {
  final status = (trip['status'] ?? 'Pending').toString();
  final driverSigned = hasSignatureInk(trip['driverSignoff']);
  final dispatcherSigned = hasSignatureInk(trip['dispatcherSignoff']);
  final podSigned = hasSignatureInk(trip['pod']);
  final pickupStamped = eventKinds.contains('pickup_geo');
  final sealPhoto = eventKinds.contains('seal_photo');

  if (status == 'Delivered' || podSigned) {
    return const TripNextStep(
      title: 'Done — POD on file',
      detail: 'Delivery proof is saved and available to the web office.',
      icon: Icons.task_alt,
      done: true,
    );
  }

  if (status == 'Inbound') {
    return const TripNextStep(
      title: 'Next: Warehouse e-POD on this phone',
      detail:
          'Hand the phone to the warehouse officer. They sign, type their name and role, then you get Delivered.',
      icon: Icons.draw_outlined,
    );
  }

  if (status == 'In Transit' || (driverSigned && dispatcherSigned)) {
    return const TripNextStep(
      title: 'Next: Tap I have arrived at the warehouse',
      detail:
          'When you reach the consignee gate, tap I have arrived (GPS on). That sets Inbound so you can collect warehouse e-POD on this phone.',
      icon: Icons.place_outlined,
    );
  }

  if (driverSigned && !dispatcherSigned) {
    return const TripNextStep(
      title: 'Next: Waiting for dispatcher yard release on web',
      detail:
          'Your signature is saved. Dispatch must sign before the cargo moves.',
      icon: Icons.hourglass_top,
    );
  }

  if (status == 'Loaded') {
    return const TripNextStep(
      title: 'Next: Sign that you received sealed cargo',
      detail: 'Confirm the seal photo first, then sign the cargo handoff.',
      icon: Icons.draw_outlined,
    );
  }

  if (!pickupStamped) {
    return const TripNextStep(
      title: 'Next: Stamp pickup GPS',
      detail: 'Record arrival at the pickup yard before documenting the cargo.',
      icon: Icons.flag_outlined,
    );
  }

  if (!sealPhoto) {
    return const TripNextStep(
      title: 'Next: Take the seal photo',
      detail: 'Capture a clear photo of the security seal before signing.',
      icon: Icons.photo_camera_outlined,
    );
  }

  if (!dispatcherSigned) {
    return const TripNextStep(
      title: 'Next: Waiting for dispatcher yard release on web',
      detail: 'The dispatcher must sign before the trip can be marked Loaded.',
      icon: Icons.hourglass_top,
    );
  }

  return const TripNextStep(
    title: 'Next: Sign that you received sealed cargo',
    detail: 'Confirm you received the sealed cargo before departure.',
    icon: Icons.draw_outlined,
  );
}

class NextStepCard extends StatelessWidget {
  const NextStepCard({super.key, required this.step});

  final TripNextStep step;

  @override
  Widget build(BuildContext context) {
    final background = step.done
        ? const Color(0xFFECFDF5)
        : const Color(0xFFEFF6FF);
    final border = step.done
        ? const Color(0xFFA7F3D0)
        : const Color(0xFFBFDBFE);
    final foreground = step.done
        ? const Color(0xFF047857)
        : const Color(0xFF1D4ED8);

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: background,
        border: Border.all(color: border),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(step.icon, color: foreground),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  step.title,
                  style: TextStyle(
                    color: foreground,
                    fontSize: 15,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                const SizedBox(height: 4),
                Text(step.detail, style: const TextStyle(fontSize: 13)),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
