import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/scheduler.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../core/platform/android_keyboard_bridge.dart';
import '../core/platform/desktop_control_bridge.dart';
import '../core/platform/desktop_control_bindings.dart';
import '../core/platform/platform_capabilities.dart';
import '../core/platform/shortcut_cheatsheet_bridge.dart';
import '../core/router/app_router.dart';
import '../core/theme/app_theme.dart';
import '../features/settings/application/settings_store_provider.dart';
import '../features/settings/data/local_settings_store.dart';
import '../features/settings/domain/settings_store.dart';
import '../features/auth/application/auth_session_provider.dart';
import '../features/auth/application/suite_identity_provider.dart';
import '../features/auth/domain/product_entitlement.dart';
import '../features/auth/domain/suite_identity.dart';
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
  Timer? _shortcutCheatsheetPoller;
  bool _shortcutCheatsheetPolling = false;

  @override
  void initState() {
    super.initState();
    unawaited(_restoreDesktopControlOptIn());
    if (PlatformCapabilities.isWindows) {
      _shortcutCheatsheetPoller = Timer.periodic(
        const Duration(milliseconds: 500),
        (_) => unawaited(_drainShortcutCheatsheetEvents()),
      );
      Future<void>.microtask(_drainShortcutCheatsheetEvents);
    }
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
  void dispose() {
    _shortcutCheatsheetPoller?.cancel();
    super.dispose();
  }

  Future<void> _drainShortcutCheatsheetEvents() async {
    if (!mounted || _shortcutCheatsheetPolling) {
      return;
    }
    _shortcutCheatsheetPolling = true;
    try {
      final events = await ShortcutCheatsheetBridge.drainEvents();
      if (mounted && events.isNotEmpty && _canOpenShortcutCheatsheet()) {
        final router = ref.read(appRouterProvider);
        if (router.routeInformationProvider.value.uri.path != '/shortcuts') {
          router.push('/shortcuts');
        }
      }
    } catch (_) {
      // The native channel may not be ready during the first Flutter frame.
    } finally {
      _shortcutCheatsheetPolling = false;
    }
  }

  bool _canOpenShortcutCheatsheet() {
    final session = ref
        .read(authSessionProvider)
        .maybeWhen(data: (value) => value, orElse: () => null);
    if (session == null) return false;
    if (ref.read(localAuthModeProvider) && session.isLocalFallback) {
      return true;
    }
    final entitled = ref
        .read(suiteIdentityProvider)
        .maybeWhen(
          data: (identity) =>
              identity.statusFor(ProductId.commandglowsApp) ==
              SuiteAccountStatus.accessActive,
          orElse: () => false,
        );
    return session.isSignedIn && !session.isLocalFallback && entitled;
  }

  Future<void> _restoreDesktopControlOptIn() async {
    if (!PlatformCapabilities.isWindows) return;
    try {
      final preferences = DesktopControlPreferenceStore();
      var bindings = await preferences.getBindings();
      final bindingStatus = await DesktopControlBridge.setBindings(bindings);
      if (bindings.recoveredInvalidData ||
          bindingStatus.errorCode == 'INVALID_BINDINGS') {
        bindings = DesktopControlBindings.defaults();
        await DesktopControlBridge.setBindings(bindings);
      }
      await DesktopControlBridge.setPreferredScope(
        await preferences.getPreferredScope(),
      );
      if (await preferences.isEnabled()) {
        await DesktopControlBridge.setEnabled(true);
      }
    } catch (_) {
      // The settings page surfaces native registration and host errors.
    }
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
      title: 'CMDglows',
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
