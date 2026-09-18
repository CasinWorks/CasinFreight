import 'package:casinfreight_driver/next_step.dart';
import 'package:flutter_test/flutter_test.dart';

Map<String, String> signed() => {
  'signatureDataUrl': 'data:image/png;base64,${List.filled(140, 'x').join()}',
};

void main() {
  test('loaded trip asks driver to sign cargo receipt', () {
    final step = nextStepForTrip(
      trip: {'status': 'Loaded'},
      eventKinds: {'seal_photo'},
    );

    expect(step.title, 'Next: Sign that you received sealed cargo');
  });

  test('driver signature waits for dispatcher release', () {
    final step = nextStepForTrip(
      trip: {'status': 'Loaded', 'driverSignoff': signed()},
      eventKinds: {'pickup_geo', 'seal_photo'},
    );

    expect(step.title, 'Next: Waiting for dispatcher yard release on web');
  });

  test('in transit asks driver to mark arrival', () {
    final step = nextStepForTrip(
      trip: {
        'status': 'In Transit',
        'driverSignoff': signed(),
        'dispatcherSignoff': signed(),
      },
      eventKinds: {'pickup_geo', 'seal_photo'},
    );

    expect(step.title, 'Next: Tap I have arrived at the warehouse');
  });

  test('inbound asks for warehouse POD on driver phone', () {
    final step = nextStepForTrip(
      trip: {
        'status': 'Inbound',
        'driverSignoff': signed(),
        'dispatcherSignoff': signed(),
      },
      eventKinds: {'pickup_geo', 'seal_photo', 'delivery_geo'},
    );

    expect(step.title, 'Next: Warehouse e-POD on this phone');
  });

  test('delivered trip reports POD complete', () {
    final step = nextStepForTrip(
      trip: {'status': 'Delivered', 'pod': signed()},
      eventKinds: const {},
    );

    expect(step.title, 'Done — POD on file');
    expect(step.done, isTrue);
  });
}
