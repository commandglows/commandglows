import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:sentry_flutter/sentry_flutter.dart';

import 'app/commandglows_app.dart';
import 'core/bootstrap/app_bootstrap.dart';
import 'core/bootstrap/sentry_bootstrap.dart';
import 'core/diagnostics/app_diagnostics.dart';
import 'core/theme/app_theme.dart';
import 'features/settings/data/local_settings_store.dart';

Future<void> main() async {
  if (SentryBootstrap.isConfigured) {
    SentryWidgetsFlutterBinding.ensureInitialized();
  } else {
    WidgetsFlutterBinding.ensureInitialized();
  }
  await SentryBootstrap.init(appRunner: _runCommandGlows);
}

Future<void> _runCommandGlows() async {
  _installLocalErrorHandlers();
  await AppBootstrap.init();
  final initialSettings = await LocalSettingsStore().load();
  final initialThemeMode = AppThemeMode.fromThemeMode(
    initialSettings.themeMode,
  );
  runApp(
    ProviderScope(
      overrides: [
        initialAppThemeModeProvider.overrideWithValue(initialThemeMode),
      ],
      child: const CommandGlows(),
    ),
  );
}

void _installLocalErrorHandlers() {
  final previousFlutterError = FlutterError.onError;
  FlutterError.onError = (details) {
    final shouldPresent = AppDiagnostics.recordFlutterError(details);
    if (!shouldPresent) {
      return;
    }
    if (previousFlutterError != null) {
      previousFlutterError(details);
    } else {
      FlutterError.presentError(details);
    }
  };
  final previousPlatformError = PlatformDispatcher.instance.onError;
  PlatformDispatcher.instance.onError = (error, stack) {
    AppDiagnostics.recordUnhandledError(error, stack);
    if (previousPlatformError != null) {
      return previousPlatformError(error, stack);
    }
    return false;
  };
}
