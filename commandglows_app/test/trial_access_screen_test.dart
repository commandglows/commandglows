import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:commandglows_app/core/theme/app_theme.dart';
import 'package:commandglows_app/features/auth/domain/product_entitlement.dart';
import 'package:commandglows_app/features/auth/presentation/trial_access_screen.dart';

Widget _screen(
  ProductEntitlement? entitlement, {
  String? restartError,
  String? trialStartError,
  Future<void> Function()? onStartTrial,
  VoidCallback? onViewOffers,
  bool noCheckout = false,
}) {
  return MaterialApp(
    theme: AppTheme.light,
    home: TrialAccessScreen(
      entitlement: entitlement,
      isRestarting: false,
      isPurchasing: false,
      onPurchase: noCheckout ? null : () async {},
      purchaseActionLabel: noCheckout
          ? 'Voir les offres et acheter'
          : 'Acheter CommandGlows',
      onRestart: () async {},
      onStartTrial: onStartTrial ?? () async {},
      onViewOffers: onViewOffers,
      isStartingTrial: false,
      trialStartError: trialStartError,
      restartError: restartError,
    ),
  );
}

void main() {
  testWidgets('keeps the access card compact and vertically centered', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(800, 1000);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    await tester.pumpWidget(_screen(null));

    final card = tester.getRect(find.byType(Card).first);
    expect(card.height, lessThan(320));
    expect((card.center.dy - 500).abs(), lessThan(8));
  });

  testWidgets('lets the access card scroll on a short screen', (tester) async {
    tester.view.physicalSize = const Size(360, 220);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    await tester.pumpWidget(_screen(null));

    expect(find.byType(SingleChildScrollView), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets(
    'offers a first trial and purchase options without an entitlement',
    (tester) async {
      var startCalls = 0;
      var offerCalls = 0;
      await tester.pumpWidget(
        _screen(
          null,
          onStartTrial: () async => startCalls += 1,
          onViewOffers: () => offerCalls += 1,
        ),
      );

      expect(find.text('Démarrer mon essai gratuit'), findsOneWidget);
      expect(find.text('Acheter CommandGlows'), findsOneWidget);
      expect(find.text('Voir toutes les offres'), findsOneWidget);
      expect(
        find.textContaining('Démarrez votre essai gratuit'),
        findsOneWidget,
      );

      await tester.tap(find.text('Démarrer mon essai gratuit'));
      await tester.pump();
      expect(startCalls, 1);

      await tester.tap(find.text('Voir toutes les offres'));
      expect(offerCalls, 1);
    },
  );

  testWidgets('shows a clear first-trial denial while retaining offers', (
    tester,
  ) async {
    await tester.pumpWidget(
      _screen(
        null,
        trialStartError: 'Cet essai n’est pas disponible pour ce compte.',
      ),
    );

    expect(find.text('Demande d’essai non confirmée'), findsOneWidget);
    expect(
      find.text('Cet essai n’est pas disponible pour ce compte.'),
      findsOneWidget,
    );
    expect(find.text('Démarrer mon essai gratuit'), findsOneWidget);
    expect(find.text('Acheter CommandGlows'), findsOneWidget);
  });

  testWidgets('opens offers when the direct checkout handoff is absent', (
    tester,
  ) async {
    var offerCalls = 0;
    await tester.pumpWidget(
      _screen(null, noCheckout: true, onViewOffers: () => offerCalls += 1),
    );

    expect(find.text('Voir les offres et acheter'), findsOneWidget);
    expect(find.text('Voir toutes les offres'), findsNothing);
    await tester.tap(find.text('Voir les offres et acheter'));
    expect(offerCalls, 1);
  });

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
    expect(find.text('Démarrer mon essai gratuit'), findsNothing);
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
    expect(find.text('Démarrer mon essai gratuit'), findsNothing);
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
