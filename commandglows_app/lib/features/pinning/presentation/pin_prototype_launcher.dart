import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';

import '../../../core/platform/windows_pin_window_host.dart';
import '../domain/pin_window_contract.dart';

/// Debug-only entry point for the Windows detached-window proof.
class PinPrototypeLauncher extends StatefulWidget {
  const PinPrototypeLauncher({super.key});

  static bool get isAvailable =>
      kDebugMode && WindowsPinWindowHost.isWindowsDesktop;

  @override
  State<PinPrototypeLauncher> createState() => _PinPrototypeLauncherState();
}

class _PinPrototypeLauncherState extends State<PinPrototypeLauncher> {
  StreamSubscription<PinWindowEvent>? _eventsSubscription;

  @override
  void initState() {
    super.initState();
    if (PinPrototypeLauncher.isAvailable) {
      _eventsSubscription = WindowsPinWindowHost.instance.events.listen((_) {});
    }
  }

  @override
  void dispose() {
    unawaited(_eventsSubscription?.cancel());
    super.dispose();
  }

  Future<void> _openDemo() async {
    final result = await WindowsPinWindowHost.instance.open(
      pinId: 'pin-demo-snippet',
      position: const PinWindowPosition(x: 64, y: 80),
    );
    if (!mounted || result.status == PinWindowOperationStatus.succeeded) {
      return;
    }

    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Le post-it de démonstration n’a pas pu s’ouvrir.'),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    if (!PinPrototypeLauncher.isAvailable) {
      return const SizedBox.shrink();
    }

    return OutlinedButton(
      onPressed: _openDemo,
      child: const Text('Ouvrir le post-it de démonstration'),
    );
  }
}
