import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:signature/signature.dart';

import '../driver_session.dart';
import '../ui/gps_banner.dart';

class SignScreen extends StatefulWidget {
  const SignScreen({
    super.key,
    required this.session,
    required this.tripId,
    required this.tripStatus,
    required this.kind,
    required this.title,
    this.askReceiver = false,
  });

  final DriverSession session;
  final String tripId;
  final String tripStatus;
  final String kind;
  final String title;
  final bool askReceiver;

  @override
  State<SignScreen> createState() => _SignScreenState();
}

class _SignScreenState extends State<SignScreen> {
  final pad = SignatureController(penStrokeWidth: 3, penColor: Colors.black);
  final receiver = TextEditingController();
  final role = TextEditingController(text: 'Warehouse receiving officer');
  bool saving = false;

  @override
  void dispose() {
    pad.dispose();
    receiver.dispose();
    role.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    await widget.session.refreshGps();
    if (!widget.session.gpsOk) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('GPS must stay on to sign.')),
        );
      }
      return;
    }
    if (pad.isEmpty) {
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('Sign on the pad first.')));
      return;
    }
    if (widget.askReceiver && receiver.text.trim().isEmpty) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Enter the warehouse signer’s name.')),
      );
      return;
    }
    if (widget.askReceiver && role.text.trim().isEmpty) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Enter the signer’s role.')),
      );
      return;
    }
    setState(() => saving = true);
    try {
      final bytes = await pad.toPngBytes();
      if (bytes == null) return;
      await widget.session.saveSignature(
        tripId: widget.tripId,
        kind: widget.kind,
        pngBytes: bytes,
        tripStatus: widget.tripStatus,
        tripPatch: widget.askReceiver
            ? {
                'receiverName': receiver.text.trim(),
                'receiverRole': role.text.trim(),
                'conditionStatus': 'Good Condition',
              }
            : null,
        note: widget.askReceiver
            ? 'POD signed by ${receiver.text.trim()} at ${DateFormat('yyyy-MM-dd HH:mm').format(DateTime.now())}'
            : 'Driver dispatch signature',
      );
      if (mounted) Navigator.pop(context);
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(error.toString())));
      }
    } finally {
      if (mounted) setState(() => saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(widget.title)),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          GpsBanner(session: widget.session),
          if (widget.askReceiver) ...[
            const SizedBox(height: 16),
            TextField(
              controller: receiver,
              decoration: const InputDecoration(
                labelText: 'Warehouse signer full name',
              ),
            ),
            const SizedBox(height: 8),
            TextField(
              controller: role,
              decoration: const InputDecoration(
                labelText: 'Role (e.g. Receiving clerk)',
              ),
            ),
          ],
          const SizedBox(height: 16),
          const Text('Hand the phone to the signer. GPS stays on.'),
          const SizedBox(height: 8),
          Container(
            height: 220,
            decoration: BoxDecoration(
              border: Border.all(color: Colors.black26),
              borderRadius: BorderRadius.circular(12),
              color: Colors.white,
            ),
            clipBehavior: Clip.antiAlias,
            child: Signature(controller: pad, backgroundColor: Colors.white),
          ),
          TextButton(onPressed: pad.clear, child: const Text('Clear pad')),
          FilledButton(
            onPressed: saving ? null : _save,
            child: saving
                ? const SizedBox(
                    height: 20,
                    width: 20,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : const Text('Save to web office'),
          ),
        ],
      ),
    );
  }
}
