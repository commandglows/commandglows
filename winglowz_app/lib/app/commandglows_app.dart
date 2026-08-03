import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/scheduler.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../core/platform/android_keyboard_bridge.dart';
import '../core/platform/platform_capabilities.dart';
import '../core/router/app_router.dart';
import '../core/theme/app_theme.dart';
import '../features/settings/application/settings_store_provider.dart';
import '../features/settings/data/local_settings_store.dart';
import '../features/settings/domain/settings_store.dart';
import '../features/sync/application/local_cloud_sync_provider.dart';
import '../features/keyboard/application/keyboard_sync_providers.dart';

final initialAppThemeModeProvider = Provider<AppThemeMode>(
  (ref) => AppThemeMode.system,
);

class AppThemeModeController extends Notifier<AppThemeMode> {
  @override
  AppThemeMode build() {
    final initialMode = ref.watch(initialAppThemeModeProvider);
    ref.listen<SettingsStore>(settingsStoreProvider, (_, _) {
      Future<void>.microtask(_load);
    });
    Future<void>.microtask(_load);
    return initialMode;
  }

  void setMode(AppThemeMode value) {
    state = value;
    _syncKeyboardThemeMode(value);
    Future<void>.microtask(() async {
      if (!ref.mounted) {
        return;
      }
      await _saveThemeModeToConfiguredStores(value);
    });
  }

  void previewMode(AppThemeMode value) {
    state = value;
    _syncKeyboardThemeMode(value);
  }

  Future<void> syncFromKeyboardThemeMode() async {
    final keyboardThemeMode = await _readThemeModeFromKeyboard();
    if (!ref.mounted) {
      return;
    }
    if (keyboardThemeMode == null) {
      return;
    }
    await _syncThemeModeFromKeyboard(keyboardThemeMode);
  }

  Future<void> syncFromKeyboardThemeModeValue(String themeModeValue) async {
    final keyboardThemeMode = _parseKeyboardThemeMode(themeModeValue);
    if (!ref.mounted) {
      return;
    }
    if (keyboardThemeMode == null) {
      return;
    }
    await _syncThemeModeFromKeyboard(keyboardThemeMode);
  }

  Future<void> _saveThemeMode(SettingsStore store, AppThemeMode value) async {
    var settings = const UserSettingsSnapshot.defaults();
    try {
      settings = await store.load();
    } catch (_) {
      // Keep theme persistence best-effort if a store cannot hydrate first.
    }
    await store.save(settings.copyWith(themeMode: value.materialMode));
  }

  Future<void> _load() async {
    if (!ref.mounted) {
      return;
    }
    final settings = await ref.read(settingsStoreProvider).load();
    if (!ref.mounted) {
      return;
    }
    final loadedMode = AppThemeMode.fromThemeMode(settings.themeMode);
    final keyboardThemeMode = await _readThemeModeFromKeyboard();
    if (!ref.mounted) {
      return;
    }
    final effectiveMode = keyboardThemeMode ?? loadedMode;
    if (state != effectiveMode) {
      state = effectiveMode;
    }
    if (keyboardThemeMode != null && keyboardThemeMode != loadedMode) {
      if (!ref.mounted) {
        return;
      }
      await _saveThemeModeToConfiguredStores(keyboardThemeMode);
      if (!ref.mounted) {
        return;
      }
    }
    _syncKeyboardThemeMode(effectiveMode);
  }

  Future<void> _saveThemeModeToConfiguredStores(AppThemeMode value) async {
    if (!ref.mounted) {
      return;
    }
    final localStore = ref.read(localSettingsStoreProvider);
    final activeStore = ref.read(settingsStoreProvider);
    final stores = <SettingsStore>[localStore];
    if (activeStore is! LocalSettingsStore) {
      stores.add(activeStore);
    }
    for (final store in stores) {
      if (!ref.mounted) {
        return;
      }
      try {
        await _saveThemeMode(store, value);
      } catch (_) {
        // Appearance changes apply immediately; persistence failures are
        // surfaced by the Settings sync/status work rather than blocking UI.
      }
    }
  }

  Future<AppThemeMode?> _readThemeModeFromKeyboard() async {
    if (!PlatformCapabilities.keyboardImeSupported) {
      return null;
    }
    try {
      final status = await AndroidKeyboardBridge.getStatus();
      return _parseKeyboardThemeMode(status.themeMode);
    } catch (_) {
      return null;
    }
  }

  void _syncKeyboardThemeMode(AppThemeMode value) {
    if (!PlatformCapabilities.keyboardImeSupported) {
      return;
    }
    Future<void>.microtask(() async {
      try {
        await AndroidKeyboardBridge.setThemeMode(value.name);
      } catch (_) {
        // The app theme must remain usable even if the Android IME is disabled
        // or not reachable yet. Settings status refresh will surface failures.
      }
    });
  }

  AppThemeMode? _parseKeyboardThemeMode(String? rawThemeMode) {
    if (rawThemeMode == null) {
      return null;
    }
    final normalized = rawThemeMode.toLowerCase();
    return AppThemeMode.values.firstWhere(
      (mode) => mode.name == normalized,
      orElse: () => AppThemeMode.system,
    );
  }

  Future<void> _syncThemeModeFromKeyboard(AppThemeMode themeMode) async {
    if (themeMode == state) {
      return;
    }
    state = themeMode;
    await _saveThemeModeToConfiguredStores(themeMode);
  }
}

final appThemeModeProvider =
    NotifierProvider<AppThemeModeController, AppThemeMode>(
      AppThemeModeController.new,
    );

class CommandGlows extends ConsumerStatefulWidget {
  const CommandGlows({super.key});

  @override
  ConsumerState<CommandGlows> createState() => _CommandGlowsState();
}

class _CommandGlowsState extends ConsumerState<CommandGlows> {
  @override
  void initState() {
    super.initState();
    ref.listenManual(localCloudSyncAuthContextProvider, (_, _) {
      Future<void>.microtask(
        () => ref
            .read(localCloudSyncStateProvider.notifier)
            .synchronizeIfNeeded(),
      );
    });
    ref.listenManual(keyboardSyncAuthContextProvider, (_, _) {
      Future<void>.microtask(
        () => ref
            .read(keyboardSyncControllerStateProvider.notifier)
            .synchronizeIfNeeded(),
      );
    });
    ref.listenManual(keyboardSyncChangeNotifierProvider, (_, _) {
      Future<void>.microtask(
        () => ref
            .read(keyboardSyncControllerStateProvider.notifier)
            .forceSynchronize(),
      );
    });
    Future<void>.microtask(
      () =>
          ref.read(localCloudSyncStateProvider.notifier).synchronizeIfNeeded(),
    );
    Future<void>.microtask(
      () => ref
          .read(keyboardSyncControllerStateProvider.notifier)
          .synchronizeIfNeeded(),
    );
  }

  @override
  Widget build(BuildContext context) {
    final router = ref.watch(appRouterProvider);
    final themeMode = ref.watch(appThemeModeProvider);
    final disableAnimations = SchedulerBinding
        .instance
        .platformDispatcher
        .accessibilityFeatures
        .disableAnimations;
    return MaterialApp.router(
      title: 'CommandGlows',
      theme: AppTheme.light,
      darkTheme: AppTheme.dark,
      themeMode: themeMode.materialMode,
      themeAnimationDuration: disableAnimations
          ? Duration.zero
          : AppMotion.base,
      routerConfig: router,
      builder: (context, child) {
        if (!kIsWeb) {
          return child ?? const SizedBox.shrink();
        }
        final mediaQuery = MediaQuery.of(context);
        return MediaQuery(
          data: mediaQuery.copyWith(textScaler: const TextScaler.linear(1.5)),
          child: child ?? const SizedBox.shrink(),
        );
      },
    );
  }
}
