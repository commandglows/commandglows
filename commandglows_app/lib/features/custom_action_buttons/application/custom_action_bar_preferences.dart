import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/platform/platform_capabilities.dart';
import '../../settings/application/settings_store_provider.dart';

final customActionBarEnabledProvider =
    NotifierProvider<CustomActionBarEnabledNotifier, bool>(
      CustomActionBarEnabledNotifier.new,
    );

class CustomActionBarEnabledNotifier extends Notifier<bool> {
  @override
  bool build() {
    Future<void>.microtask(_load);
    return false;
  }

  Future<void> _load() async {
    try {
      final settings = await ref.read(settingsStoreProvider).load();
      if (!ref.mounted) {
        return;
      }
      state =
          PlatformCapabilities.keyboardImeSupported &&
          settings.customActionBarEnabled;
    } catch (_) {
      if (ref.mounted) {
        state = false;
      }
    }
  }

  Future<void> setEnabled(bool value) async {
    final next = PlatformCapabilities.keyboardImeSupported && value;
    state = next;
    try {
      final store = ref.read(settingsStoreProvider);
      final current = await store.load();
      await store.save(current.copyWith(customActionBarEnabled: next));
    } catch (_) {
      // The native bridge sync remains the source of immediate runtime truth.
    }
  }

  Future<void> syncFromSettings() async {
    await _load();
  }
}
