import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:commandglows_app/features/auth/application/auth_session_provider.dart';
import 'package:commandglows_app/features/auth/presentation/sign_in_screen.dart';

void main() {
  testWidgets('Windows sign-in offers an explicit local entry', (tester) async {
    debugDefaultTargetPlatformOverride = TargetPlatform.windows;
    final container = ProviderContainer();
    tester.view.physicalSize = const Size(1100, 1300);
    tester.view.devicePixelRatio = 1;
    await tester.pumpWidget(
      UncontrolledProviderScope(
        container: container,
        child: const MaterialApp(home: SignInScreen()),
      ),
    );

    expect(container.read(localAuthModeProvider), isFalse);
    await tester.tap(find.byKey(const Key('use-local-mode')));
    await tester.pump();
    expect(container.read(localAuthModeProvider), isTrue);

    debugDefaultTargetPlatformOverride = null;
    tester.view.resetPhysicalSize();
    tester.view.resetDevicePixelRatio();
    container.dispose();
  });
}
