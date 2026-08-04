import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:commandglows_app/core/router/app_router.dart';
import 'package:commandglows_app/core/sync/sync_status.dart';
import 'package:commandglows_app/features/auth/application/auth_session_provider.dart';
import 'package:commandglows_app/features/auth/domain/auth_session_store.dart';
import 'package:commandglows_app/features/settings/presentation/settings_screen.dart';

const _productRoutes = {
  '/home': 'Accueil',
  '/voice': 'Capture automatique',
  '/clipboard': 'Nouvel élément',
  '/snippets': 'Nouveau snippet',
  '/actions': 'Actions',
  '/dictionary': 'Nouveau terme',
  '/settings': 'Paramètres',
};

const _signedOut = AuthSessionSnapshot(
  user: null,
  syncStatus: SyncStatus.unavailable(),
);

const _signedIn = AuthSessionSnapshot(
  user: AuthUserSnapshot(
    id: 'user-1',
    provider: AuthProviderKind.emailPassword,
  ),
  syncStatus: SyncStatus(health: SyncHealth.synced),
);

Widget _routerWidget(
  AuthSessionSnapshot session,
  void Function(GoRouter) bind,
) {
  return ProviderScope(
    overrides: [
      authSessionProvider.overrideWith((ref) => Stream.value(session)),
    ],
    child: Consumer(
      builder: (context, ref, _) {
        final router = ref.watch(appRouterProvider);
        bind(router);
        return MaterialApp.router(routerConfig: router);
      },
    ),
  );
}

Widget _streamRouterWidget(
  Stream<AuthSessionSnapshot> stream,
  void Function(GoRouter) bind,
) {
  return ProviderScope(
    overrides: [authSessionProvider.overrideWith((ref) => stream)],
    child: Consumer(
      builder: (context, ref, _) {
        final router = ref.watch(appRouterProvider);
        bind(router);
        return MaterialApp.router(routerConfig: router);
      },
    ),
  );
}

Future<void> _pumpRouter(WidgetTester tester) async {
  await tester.pump();
  await tester.pump(const Duration(milliseconds: 300));
  await tester.pump(const Duration(milliseconds: 300));
}

void _useRouterViewport(WidgetTester tester) {
  tester.view.physicalSize = const Size(1400, 2200);
  tester.view.devicePixelRatio = 1;
  addTearDown(() {
    tester.view.resetPhysicalSize();
    tester.view.resetDevicePixelRatio();
  });
}

void main() {
  testWidgets('settings route is preserved while auth state is loading', (
    tester,
  ) async {
    _useRouterViewport(tester);
    final controller = StreamController<AuthSessionSnapshot>();
    late GoRouter router;

    await tester.pumpWidget(
      _streamRouterWidget(controller.stream, (value) => router = value),
    );
    await _pumpRouter(tester);

    router.go('/settings?section=keys');
    await _pumpRouter(tester);

    expect(
      router.routeInformationProvider.value.uri.toString(),
      '/settings?section=keys',
    );
    expect(find.byType(CircularProgressIndicator), findsAtLeastNWidgets(1));

    controller.add(const AuthSessionSnapshot.localFallback());
    await _pumpRouter(tester);

    expect(
      router.routeInformationProvider.value.uri.toString(),
      '/settings?section=keys',
    );
    expect(find.byType(SettingsScreen), findsOneWidget);

    await controller.close();
  });

  testWidgets('signed-out direct product routes redirect to auth gate', (
    tester,
  ) async {
    _useRouterViewport(tester);
    for (final route in _productRoutes.keys) {
      late GoRouter router;
      await tester.pumpWidget(
        _routerWidget(_signedOut, (value) => router = value),
      );
      await _pumpRouter(tester);
      router.go(route);
      await _pumpRouter(tester);

      expect(router.routeInformationProvider.value.uri.path, '/');
      expect(find.text('Connexion'), findsOneWidget);

      await tester.pumpWidget(const SizedBox.shrink());
      await tester.pump();
    }
  });

  testWidgets('local mode can open product routes', (tester) async {
    _useRouterViewport(tester);
    for (final entry in _productRoutes.entries) {
      late GoRouter router;
      await tester.pumpWidget(
        _routerWidget(const AuthSessionSnapshot.localFallback(), (value) {
          router = value;
        }),
      );
      await _pumpRouter(tester);
      router.go(entry.key);
      await _pumpRouter(tester);

      expect(router.routeInformationProvider.value.uri.path, entry.key);
      if (entry.key == '/settings') {
        expect(find.byType(SettingsScreen), findsOneWidget);
      } else {
        expect(find.textContaining(entry.value), findsAtLeastNWidgets(1));
      }

      await tester.pumpWidget(const SizedBox.shrink());
      await tester.pump();
    }
  });

  testWidgets('signed-in session can open product routes', (tester) async {
    _useRouterViewport(tester);
    for (final entry in _productRoutes.entries) {
      late GoRouter router;
      await tester.pumpWidget(
        _routerWidget(_signedIn, (value) => router = value),
      );
      await _pumpRouter(tester);
      router.go(entry.key);
      await _pumpRouter(tester);

      expect(router.routeInformationProvider.value.uri.path, entry.key);
      if (entry.key == '/settings') {
        expect(find.byType(SettingsScreen), findsOneWidget);
      } else {
        expect(find.textContaining(entry.value), findsAtLeastNWidgets(1));
      }

      await tester.pumpWidget(const SizedBox.shrink());
      await tester.pump();
    }
  });
}
