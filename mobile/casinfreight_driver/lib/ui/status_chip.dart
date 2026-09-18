import 'package:flutter/material.dart';

class TripStatusChip extends StatelessWidget {
  const TripStatusChip({super.key, required this.status});

  final String status;

  @override
  Widget build(BuildContext context) {
    final colors = _colorsFor(status);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: colors.$1,
        border: Border.all(color: colors.$2),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        status.isEmpty ? 'Pending' : status,
        style: TextStyle(
          color: colors.$3,
          fontSize: 12,
          fontWeight: FontWeight.w700,
        ),
      ),
    );
  }

  (Color, Color, Color) _colorsFor(String value) {
    switch (value.toLowerCase()) {
      case 'loaded':
        return (
          const Color(0xFFEFF6FF),
          const Color(0xFFBFDBFE),
          const Color(0xFF1D4ED8),
        );
      case 'in transit':
        return (
          const Color(0xFFFFFBEB),
          const Color(0xFFFDE68A),
          const Color(0xFFB45309),
        );
      case 'inbound':
        return (
          const Color(0xFFECFEFF),
          const Color(0xFFA5F3FC),
          const Color(0xFF0E7490),
        );
      case 'delivered':
        return (
          const Color(0xFFECFDF5),
          const Color(0xFFA7F3D0),
          const Color(0xFF047857),
        );
      case 'on hold':
        return (
          const Color(0xFFFFF7ED),
          const Color(0xFFFED7AA),
          const Color(0xFFC2410C),
        );
      case 'cancelled':
        return (
          const Color(0xFFFEF2F2),
          const Color(0xFFFECACA),
          const Color(0xFFB91C1C),
        );
      case 'invoiced':
        return (
          const Color(0xFFFAF5FF),
          const Color(0xFFE9D5FF),
          const Color(0xFF7E22CE),
        );
      default:
        return (
          const Color(0xFFF1F5F9),
          const Color(0xFFCBD5E1),
          const Color(0xFF475569),
        );
    }
  }
}
