import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:commandglows_app/core/theme/app_theme.dart';
import 'package:commandglows_app/features/auth/domain/product_entitlement.dart';
import 'package:commandglows_app/features/auth/presentation/trial_access_screen.dart';

Widget _screen(ProductEntitlement entitlement, {String? restartError}) {
  return MaterialApp(
    theme: AppTheme.light,
    home: TrialAccessScreen(
      entitlement: entitlement,
      isRestarting: false,
      isPurchasing: false,
      onPurchase: () async {},
      onRestart: () async {},
      restartError: restartError,
    ),
  );
}

void main() {
  testWidgets('shows the restart CTA only when the server allows it', (
    tester,
  ) async {
    await tester.pumpWidget(
      _screen(
        ProductEntitlement(
          productId: ProductId.commandglowsApp,
          status: ProductEntitlementStatus.trialing,
          trialExpiresAt: DateTime.utc(2026),
          trialAttempt: 2,
          trialRestartsRemaining: 1,
          trialRestartEligible: true,
        ),
      ),
    );

    expect(find.text('Demander une relance de 30 jours'), findsOneWidget);
    expect(find.textContaining('Il vous reste 1 relance'), findsOneWidget);
  });

  testWidgets('shows purchase-only state after both restarts are exhausted', (
    tester,
  ) async {
    await tester.pumpWidget(
      _screen(
        ProductEntitlement(
          productId: ProductId.commandglowsApp,
          status: ProductEntitlementStatus.trialing,
          trialExpiresAt: DateTime.utc(2026),
          trialAttempt: 3,
          trialRestartsRemaining: 0,
          trialRestartEligible: false,
        ),
      ),
    );

    expect(find.text('Demander une relance de 30 jours'), findsNothing);
    expect(find.textContaining('deux relances d’essai'), findsOneWidget);
  });

  testWidgets('shows a restart denial visibly', (tester) async {
    await tester.pumpWidget(
      _screen(
        ProductEntitlement(
          productId: ProductId.commandglowsApp,
          status: ProductEntitlementStatus.trialing,
          trialExpiresAt: DateTime.utc(2026),
          trialAttempt: 2,
          trialRestartsRemaining: 1,
          trialRestartEligible: true,
        ),
        restartError: 'La relance a été refusée par le serveur.',
      ),
    );

    expect(find.text('Relance impossible'), findsOneWidget);
    expect(
      find.text('La relance a été refusée par le serveur.'),
      findsOneWidget,
    );
  });
}
